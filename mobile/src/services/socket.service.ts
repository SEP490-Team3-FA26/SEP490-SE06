// socket.service.ts - WebSocket Realtime Connection via Socket.IO
// Tuân thủ Quy chuẩn Bounded Context, quản lý vòng đời AppState và dọn dẹp listeners
import { io, Socket } from 'socket.io-client';
import { AppState, AppStateStatus } from 'react-native';
import { ApiService } from './api.service';

export type SocketNotificationHandler = (notification: any) => void;

class SocketServiceClass {
  private socket: Socket | null = null;
  private isConnected: boolean = false;
  private listeners: SocketNotificationHandler[] = [];
  private currentToken: string = '';
  private appStateSubscription: any = null;
  private hasLoggedSocketError: boolean = false;

  constructor() {
    this.setupAppStateListener();
  }

  public get connected(): boolean {
    return this.isConnected;
  }

  private setupAppStateListener(): void {
    this.appStateSubscription = AppState.addEventListener('change', (nextState: AppStateStatus) => {
      if (nextState === 'active') {
        if (this.currentToken && (!this.socket || !this.isConnected)) {
          console.log('📱 App quay lại Foreground: Tái kết nối Socket.IO...');
          this.initSocket(this.currentToken);
        }
      } else if (nextState === 'background') {
        console.log('📱 App vào Background: Giữ socket ở trạng thái chờ tiết kiệm pin');
      }
    });
  }

  public initSocket(token: string): void {
    if (!token) {
      console.warn('⚠️ Cannot init Socket: Token is empty');
      return;
    }

    this.currentToken = token;

    if (this.socket) {
      this.socket.disconnect();
      this.socket.removeAllListeners();
      this.socket = null;
    }

    const baseUrl = ApiService.baseUrl;
    console.log(`🔌 Initializing Socket.IO connection to ${baseUrl} ...`);

    try {
      this.socket = io(baseUrl, {
        path: '/socket.io',
        transports: ['websocket', 'polling'],
        reconnection: true,
        reconnectionDelay: 2000,
        reconnectionDelayMax: 10000,
        reconnectionAttempts: Infinity,
        timeout: 10000,
        auth: { token },
      });

      this.setupListeners();
      this.socket.connect();
    } catch (e) {
      console.error('❌ Error during socket initialization:', e);
    }
  }

  private setupListeners(): void {
    if (!this.socket) return;

    this.socket.on('connect', () => {
      this.isConnected = true;
      this.hasLoggedSocketError = false;
      console.log('✅ Socket connected successfully to gateway');
    });

    this.socket.on('disconnect', (reason) => {
      this.isConnected = false;
      console.log(`❌ Socket disconnected from gateway (${reason})`);
    });

    this.socket.on('connect_error', (_err) => {
      if (!this.hasLoggedSocketError) {
        console.log('ℹ️ Socket gateway offline/unreachable from mobile client. Realtime fallback enabled.');
        this.hasLoggedSocketError = true;
      }
    });

    // Các sự kiện chuẩn Bounded Context theo Playbook v2.0
    this.socket.on('new_pr_notification', (data) => this.handleIncomingNotification('NEW_PR', data));
    this.socket.on('pr_updated', (data) => this.handleIncomingNotification('PR_UPDATED', data));
    this.socket.on('pr_approved_notification', (data) => this.handleIncomingNotification('PR_APPROVED', data));
    this.socket.on('pr_rejected_notification', (data) => this.handleIncomingNotification('PR_REJECTED', data));
    this.socket.on('new_po_notification', (data) => this.handleIncomingNotification('NEW_PO', data));
    this.socket.on('grn_completed_notification', (data) => this.handleIncomingNotification('GRN_COMPLETED', data));
    this.socket.on('order:paid', (data) => this.handleIncomingNotification('ORDER_PAID', data));
    this.socket.on('notification', (data) => this.handleIncomingNotification('GENERAL', data));
    this.socket.on('sensor:alert', (data) => this.handleIncomingNotification('SENSOR_ALERT', data));
  }

  private handleIncomingNotification(type: string, data: any): void {
    console.log(`🔔 Received event [${type}] from Socket:`, data);
    let notification: any = {};
    if (typeof data === 'object' && data !== null) {
      notification = { ...data, type, timestamp: data.timestamp || data.createdAt || new Date().toISOString() };
    } else {
      notification = { type, message: String(data), timestamp: new Date().toISOString() };
    }

    this.listeners.forEach((listener) => {
      try {
        listener(notification);
      } catch (err) {
        console.error('Error executing notification listener:', err);
      }
    });
  }

  public subscribe(handler: SocketNotificationHandler): () => void {
    this.listeners.push(handler);
    return () => {
      this.listeners = this.listeners.filter((l) => l !== handler);
    };
  }

  public disconnect(): void {
    if (this.socket) {
      console.log('🔌 Disconnecting socket and cleaning all listeners...');
      this.socket.disconnect();
      this.socket.removeAllListeners();
      this.socket = null;
    }
    this.listeners = [];
    this.currentToken = '';
    this.isConnected = false;
  }
}

export const SocketService = new SocketServiceClass();
export default SocketService;
