import { useEffect, useRef, useState, useCallback } from 'react';
import { AUTH_TOKEN_CHANGED_EVENT } from '../utils/authEvents';

const getApiGatewayUrl = () => {
  // @ts-ignore
  const envUrl = import.meta.env.VITE_API_URL;
  if (envUrl && typeof envUrl === 'string' && envUrl.trim() !== '') return envUrl;

  if (typeof window !== 'undefined') {
    const hostname = window.location.hostname;
    if (hostname !== 'localhost' && hostname !== '127.0.0.1') {
      return 'https://api.abcpharmacy.store';
    }
  }
  return 'http://localhost:4000';
};

const API_GATEWAY_URL = getApiGatewayUrl();

// Global SSE Connection Singleton & Event Emitter
class SSEManager {
  private eventSource: EventSource | null = null;
  private token: string = '';
  private listeners: Map<string, Set<(data: any) => void>> = new Map();
  private statusListeners: Set<(connected: boolean, error: any) => void> = new Set();
  private isConnected = false;
  private reconnectTimer: any = null;

  connect(token: string) {
    if (this.token === token && this.eventSource && this.eventSource.readyState !== EventSource.CLOSED) {
      return;
    }

    this.disconnect();
    this.token = token;

    if (!token) {
      this.updateStatus(false, null);
      return;
    }

    try {
      const url = `${API_GATEWAY_URL}/api/events/sse?token=${encodeURIComponent(token)}`;
      this.eventSource = new EventSource(url);

      this.eventSource.onopen = () => {
        this.isConnected = true;
        this.updateStatus(true, null);
      };

      this.eventSource.onerror = (err) => {
        this.isConnected = false;
        this.updateStatus(false, err);
      };

      // Lắng nghe tất cả các sự kiện custom từ Server
      const standardEvents = [
        'inventory_updated',
        'dashboard_updated',
        'new_pr_notification',
        'pr_approved_notification',
        'pr_rejected_notification',
        'new_po_notification',
        'grn_completed_notification',
        'pr_updated',
        'ping',
      ];

      standardEvents.forEach((eventName) => {
        this.eventSource?.addEventListener(eventName, (event: MessageEvent) => {
          try {
            const data = typeof event.data === 'string' ? JSON.parse(event.data) : event.data;
            this.dispatchEvent(eventName, data);
          } catch (e) {
            this.dispatchEvent(eventName, event.data);
          }
        });
      });

      // Bắt thêm generic onmessage
      this.eventSource.onmessage = (event: MessageEvent) => {
        try {
          const data = typeof event.data === 'string' ? JSON.parse(event.data) : event.data;
          const type = data.type || 'message';
          this.dispatchEvent(type, data);
        } catch (e) {
          // ignore parsing error for raw strings
        }
      };
    } catch (error) {
      this.updateStatus(false, error);
    }
  }

  disconnect() {
    if (this.eventSource) {
      this.eventSource.close();
      this.eventSource = null;
    }
    this.token = '';
    this.isConnected = false;
    this.updateStatus(false, null);
    if (this.reconnectTimer) clearTimeout(this.reconnectTimer);
  }

  subscribeStatus(listener: (connected: boolean, error: any) => void) {
    this.statusListeners.add(listener);
    listener(this.isConnected, null);
    return () => this.statusListeners.delete(listener);
  }

  private updateStatus(connected: boolean, error: any) {
    this.statusListeners.forEach((l) => l(connected, error));
  }

  addEventListener(event: string, callback: (data: any) => void) {
    if (!this.listeners.has(event)) {
      this.listeners.set(event, new Set());
      // Nếu là event mới chưa đăng ký với EventSource
      if (this.eventSource) {
        this.eventSource.addEventListener(event, (e: MessageEvent) => {
          try {
            const data = typeof e.data === 'string' ? JSON.parse(e.data) : e.data;
            this.dispatchEvent(event, data);
          } catch {
            this.dispatchEvent(event, e.data);
          }
        });
      }
    }
    this.listeners.get(event)?.add(callback);
  }

  removeEventListener(event: string, callback?: (data: any) => void) {
    if (!callback) {
      this.listeners.delete(event);
    } else {
      this.listeners.get(event)?.delete(callback);
    }
  }

  private dispatchEvent(event: string, data: any) {
    const handlers = this.listeners.get(event);
    if (handlers) {
      handlers.forEach((cb) => {
        try {
          cb(data);
        } catch (e) {
          console.error(`Error in SSE event handler for ${event}:`, e);
        }
      });
    }
  }
}

const sseManager = new SSEManager();

export function useSocket(namespace: string = '') {
  const [isConnected, setIsConnected] = useState(false);
  const [connectionError, setConnectionError] = useState<any>(null);
  const [authToken, setAuthToken] = useState(() => localStorage.getItem('token') || '');

  useEffect(() => {
    const syncToken = () => setAuthToken(localStorage.getItem('token') || '');
    const handleStorage = (event: StorageEvent) => {
      if (event.key === 'token') syncToken();
    };

    window.addEventListener(AUTH_TOKEN_CHANGED_EVENT, syncToken);
    window.addEventListener('storage', handleStorage);
    window.addEventListener('focus', syncToken);

    return () => {
      window.removeEventListener(AUTH_TOKEN_CHANGED_EVENT, syncToken);
      window.removeEventListener('storage', handleStorage);
      window.removeEventListener('focus', syncToken);
    };
  }, []);

  useEffect(() => {
    const unsubscribe = sseManager.subscribeStatus((connected, error) => {
      setIsConnected(connected);
      setConnectionError(error);
    });

    sseManager.connect(authToken);

    return () => {
      unsubscribe();
    };
  }, [authToken]);

  const onEvent = useCallback((event: string, callback: (data: any) => void) => {
    sseManager.addEventListener(event, callback);
  }, []);

  const offEvent = useCallback((event: string, callback?: (data: any) => void) => {
    sseManager.removeEventListener(event, callback);
  }, []);

  // Mock socket object để tương thích 100% với NotificationContext & các components
  const mockSocket = {
    connected: isConnected,
    on: onEvent,
    off: offEvent,
  };

  return {
    isConnected,
    socket: mockSocket,
    onEvent,
    offEvent,
    connectionError,
  };
}

