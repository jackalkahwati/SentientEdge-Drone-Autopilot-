// Real-time WebSocket connection handler

type MessageCallback = (data: any) => void;
type StatusCallback = (status: 'connected' | 'disconnected' | 'reconnecting') => void;

class WebSocketService {
  private socket: WebSocket | null = null;
  private url: string;
  private messageCallbacks: Record<string, MessageCallback[]> = {};
  private statusCallbacks: StatusCallback[] = [];
  private reconnectTimer: NodeJS.Timeout | null = null;
  private reconnectAttempts = 0;
  private maxReconnectAttempts = 5;
  private reconnectInterval = 3000; // 3 seconds

  constructor(url: string) {
    this.url = url;
  }

  connect(): void {
    if (this.socket && (this.socket.readyState === WebSocket.OPEN || this.socket.readyState === WebSocket.CONNECTING)) {
      return; // already connected or connecting
    }

    try {
      // Add auth token if available
      const token = typeof window !== 'undefined' ? localStorage.getItem('auth-token') : null;
      const connectionUrl = token ? `${this.url}?token=${token}` : this.url;
      
      this.socket = new WebSocket(connectionUrl);

      this.socket.onopen = () => {
        console.log('WebSocket connected');
        this.reconnectAttempts = 0;
        this.notifyStatusChange('connected');
      };

      this.socket.onclose = () => {
        console.log('WebSocket disconnected');
        this.notifyStatusChange('disconnected');
        this.attemptReconnect();
      };

      this.socket.onerror = (error) => {
        console.error('WebSocket error:', error);
      };

      this.socket.onmessage = (event) => {
        try {
          const data = JSON.parse(event.data);
          const { type, payload } = data;
          
          if (type && this.messageCallbacks[type]) {
            this.messageCallbacks[type].forEach(callback => callback(payload));
          }
        } catch (e) {
          console.error('Error parsing WebSocket message:', e);
        }
      };
    } catch (error) {
      console.error('WebSocket connection error:', error);
      this.attemptReconnect();
    }
  }

  disconnect(): void {
    if (this.socket) {
      this.socket.close();
      this.socket = null;
      this.reconnectAttempts = 0;
    }
    
    if (this.reconnectTimer) {
      clearTimeout(this.reconnectTimer);
      this.reconnectTimer = null;
    }
  }

  send(type: string, data: any): void {
    if (this.socket?.readyState === WebSocket.OPEN) {
      this.socket.send(JSON.stringify({ type, payload: data }));
    } else {
      console.warn('WebSocket not connected, unable to send message');
    }
  }

  subscribe(type: string, callback: MessageCallback): () => void {
    if (!this.messageCallbacks[type]) {
      this.messageCallbacks[type] = [];
    }
    
    this.messageCallbacks[type].push(callback);
    
    // Return unsubscribe function
    return () => {
      this.messageCallbacks[type] = this.messageCallbacks[type].filter(cb => cb !== callback);
    };
  }

  onStatusChange(callback: StatusCallback): () => void {
    this.statusCallbacks.push(callback);
    
    // Return unsubscribe function
    return () => {
      this.statusCallbacks = this.statusCallbacks.filter(cb => cb !== callback);
    };
  }

  private notifyStatusChange(status: 'connected' | 'disconnected' | 'reconnecting'): void {
    this.statusCallbacks.forEach(callback => callback(status));
  }

  private attemptReconnect(): void {
    if (this.reconnectAttempts >= this.maxReconnectAttempts) {
      console.log('Max reconnect attempts reached');
      return;
    }

    this.reconnectAttempts += 1;
    this.notifyStatusChange('reconnecting');
    
    this.reconnectTimer = setTimeout(() => {
      console.log(`Attempting to reconnect (${this.reconnectAttempts}/${this.maxReconnectAttempts})`);
      this.connect();
    }, this.reconnectInterval);
  }
}

// Create a singleton instance
const WEBSOCKET_URL = process.env.NEXT_PUBLIC_WEBSOCKET_URL || 'ws://localhost:4000/ws';
export const webSocketService = typeof window !== 'undefined' ? new WebSocketService(WEBSOCKET_URL) : null;

// Hook for components to use WebSocket
export function useWebSocket() {
  // Expose the methods from the service
  return {
    connect: () => webSocketService?.connect(),
    disconnect: () => webSocketService?.disconnect(),
    send: (type: string, data: any) => webSocketService?.send(type, data),
    subscribe: (type: string, callback: MessageCallback) => 
      webSocketService?.subscribe(type, callback) || (() => {}),
    onStatusChange: (callback: StatusCallback) => 
      webSocketService?.onStatusChange(callback) || (() => {}),
  };
}
