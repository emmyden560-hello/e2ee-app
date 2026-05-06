// src/lib/websocket.ts
import { MessageData, SendMessagePayload } from './api';

export type WSMessageReceivePayload = MessageData;

type MessageListener = (msg: WSMessageReceivePayload) => void;

class WebSocketManager {
  private ws: WebSocket | null = null;
  private listeners: Set<MessageListener> = new Set();
  private isConnecting: boolean = false;
  private reconnectTimer: NodeJS.Timeout | null = null;
  private isManuallyDisconnected: boolean = false;
  
  public connect() {
    if (this.ws && (this.ws.readyState === WebSocket.OPEN || this.ws.readyState === WebSocket.CONNECTING)) {
      return;
    }
    if (this.isConnecting) return;

    const token = localStorage.getItem('whisper_access_token');
    if (!token) {
      console.warn('Cannot connect WebSocket: No access token found');
      this.isConnecting = false; // Reset flag so we can try again when token is available
      return;
    }

    // User has logged back in, so no longer manually disconnected
    this.isManuallyDisconnected = false;
    this.isConnecting = true;
    
    try {
      this.ws = new WebSocket(`wss://whisperbox.koyeb.app/ws?token=${token}`);
      
      this.ws.onopen = () => {
        console.log('✅ WebSocket Connected');
        this.isConnecting = false;
        if (this.reconnectTimer) {
          clearTimeout(this.reconnectTimer);
          this.reconnectTimer = null;
        }
      };

      this.ws.onmessage = (event) => {
        try {
          const data = JSON.parse(event.data);
          if (data.type === 'message.receive' && data.payload) {
            this.notifyListeners(data.payload as WSMessageReceivePayload);
          }
        } catch (e) {
          console.error('Failed to parse WebSocket message', e);
        }
      };

      this.ws.onclose = () => {
        console.log('❌ WebSocket Disconnected');
        this.ws = null;
        this.isConnecting = false;
        // Only schedule reconnect if this wasn't a manual disconnect
        if (!this.isManuallyDisconnected) {
          this.scheduleReconnect();
        }
      };

      this.ws.onerror = (error) => {
        console.error('WebSocket Error:', error);
        this.ws?.close();
      };
    } catch (e) {
      console.error('Failed to create WebSocket', e);
      this.isConnecting = false;
      if (!this.isManuallyDisconnected) {
        this.scheduleReconnect();
      }
    }
  }

  private scheduleReconnect() {
    if (!this.reconnectTimer) {
      this.reconnectTimer = setTimeout(() => {
        console.log('🔄 Attempting to reconnect WebSocket...');
        this.connect();
      }, 5000);
    }
  }

  public disconnect() {
    this.isManuallyDisconnected = true;
    if (this.ws) {
      this.ws.close();
      this.ws = null;
    }
    if (this.reconnectTimer) {
      clearTimeout(this.reconnectTimer);
      this.reconnectTimer = null;
    }
    this.isConnecting = false;
  }

  public send(payload: SendMessagePayload): boolean {
    if (this.ws && this.ws.readyState === WebSocket.OPEN) {
      this.ws.send(JSON.stringify({
        type: 'message.send',
        to: payload.to,
        payload: payload.payload
      }));
      return true;
    }
    return false;
  }

  public subscribe(listener: MessageListener) {
    this.listeners.add(listener);
    return () => {
      this.listeners.delete(listener);
    };
  }

  private notifyListeners(msg: WSMessageReceivePayload) {
    this.listeners.forEach(listener => listener(msg));
  }
}

export const wsManager = new WebSocketManager();
