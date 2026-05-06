// src/lib/websocket.ts
import { MessageData, SendMessagePayload } from './api';

export type WSMessageReceivePayload = MessageData;

type MessageListener = (msg: WSMessageReceivePayload) => void;

class WebSocketManager {
  private ws: WebSocket | null = null;
  private listeners: Set<MessageListener> = new Set();
  private isConnecting: boolean = false;
  private reconnectTimer: NodeJS.Timeout | null = null;
  private readonly RECONNECT_INTERVAL = 3000; // Retry every 3 seconds
  
  public connect() {
    if (this.ws && (this.ws.readyState === WebSocket.OPEN || this.ws.readyState === WebSocket.CONNECTING)) {
      return; // Already connected or connecting
    }
    if (this.isConnecting) return; // Already attempting to connect

    const token = localStorage.getItem('whisper_access_token');
    if (!token) {
      // No token available yet, but keep trying - user might log in soon
      console.log('⏳ WebSocket waiting for auth token...');
      this.scheduleReconnect();
      return;
    }

    // Token is available, attempt connection
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
        console.log('❌ WebSocket Disconnected - will attempt to reconnect');
        this.ws = null;
        this.isConnecting = false;
        // Always schedule reconnect - connection is essential
        this.scheduleReconnect();
      };

      this.ws.onerror = (error) => {
        console.error('WebSocket Error:', error);
        this.ws?.close();
      };
    } catch (e) {
      console.error('Failed to create WebSocket', e);
      this.isConnecting = false;
      // Retry connection
      this.scheduleReconnect();
    }
  }

  private scheduleReconnect() {
    if (!this.reconnectTimer) {
      this.reconnectTimer = setTimeout(() => {
        console.log('🔄 WebSocket reconnect attempt...');
        this.connect();
      }, this.RECONNECT_INTERVAL);
    }
  }

  public disconnect() {
    // This method is kept for compatibility but WebSocket is never truly disconnected
    // It will continue to attempt reconnection in the background
    console.log('⚠️ WebSocket disconnect requested, but will continue reconnecting');
    if (this.ws) {
      this.ws.close();
      this.ws = null;
    }
    this.isConnecting = false;
    // Do NOT clear the reconnect timer - keep it running
    // The WebSocket will keep attempting to reconnect
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
