// src/lib/websocket.ts
import { MessageData, SendMessagePayload } from './api';

export type WSMessageReceivePayload = MessageData;

type MessageListener = (msg: WSMessageReceivePayload) => void;

class WebSocketManager {
  private ws: WebSocket | null = null;
  private listeners: Set<MessageListener> = new Set();
  private isConnecting: boolean = false;
  private reconnectTimer: NodeJS.Timeout | null = null;
  private isIntentionalDisconnect: boolean = false;
  private readonly RECONNECT_INTERVAL = 3000; // Retry every 3 seconds
  
  public connect() {
    this.isIntentionalDisconnect = false;
    
    if (this.ws && (this.ws.readyState === WebSocket.OPEN || this.ws.readyState === WebSocket.CONNECTING)) {
      return; // Already connected or connecting
    }
    if (this.isConnecting) return; // Already attempting to connect

    const token = localStorage.getItem('whisper_access_token');
    if (!token) {
      console.log('⏳ WebSocket waiting for auth token...');
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
        this.ws = null;
        this.isConnecting = false;
        
        if (!this.isIntentionalDisconnect) {
          console.log('❌ WebSocket Disconnected - will attempt to reconnect');
          this.scheduleReconnect();
        } else {
          console.log('🔌 WebSocket Closed (Intentional)');
        }
      };

      this.ws.onerror = (error) => {
        console.error('WebSocket Error:', error);
        if (this.ws) {
          this.ws.close();
        }
      };
    } catch (e) {
      console.error('Failed to create WebSocket', e);
      this.isConnecting = false;
      if (!this.isIntentionalDisconnect) {
        this.scheduleReconnect();
      }
    }
  }

  private scheduleReconnect() {
    if (this.reconnectTimer) return;
    
    this.reconnectTimer = setTimeout(() => {
      this.reconnectTimer = null;
      console.log('🔄 WebSocket reconnect attempt...');
      this.connect();
    }, this.RECONNECT_INTERVAL);
  }

  public disconnect() {
    console.log('🔌 WebSocket disconnect requested');
    this.isIntentionalDisconnect = true;
    
    if (this.reconnectTimer) {
      clearTimeout(this.reconnectTimer);
      this.reconnectTimer = null;
    }
    
    if (this.ws) {
      this.ws.close();
      this.ws = null;
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
