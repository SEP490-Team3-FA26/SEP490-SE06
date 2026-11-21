// socket.service.ts - WebSocket Realtime Connection via Socket.IO
// Tuân thủ Quy chuẩn Bounded Context, quản lý vòng đời AppState và dọn dẹp listeners
import { io, Socket } from 'socket.io-client';
import { AppState, AppStateStatus } from 'react-native';
import { ApiService } from './api.service';
import { FireEmergencyNotifeeService } from './fireEmergencyNotifee.service';

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
          this.initSocket(this.currentToken);
        }
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
    });

    this.socket.on('disconnect', () => {
      this.isConnected = false;
    });

    this.socket.on('connect_error', () => {
      if (!this.hasLoggedSocketError) {
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

    // Sự kiện realtime luồng Xuất Kho Tổng (In-App Socket.IO Only)
    this.socket.on('dispatch_order_created', (data) => this.handleIncomingNotification('DISPATCH_CREATED', data));
    this.socket.on('dispatch_order_approved', (data) => this.handleIncomingNotification('DISPATCH_APPROVED', data));
    this.socket.on('dispatch_order_updated', (data) => this.handleIncomingNotification('DISPATCH_UPDATED', data));
    this.socket.on('dispatch_order_dispatched', (data) => this.handleIncomingNotification('DISPATCH_COMPLETED', data));
    this.socket.on('dispatch_order_stale_alert', (data) => this.handleIncomingNotification('DISPATCH_STALE', data));
    this.socket.on('dispatch_action_rejected', (data) => this.handleIncomingNotification('DISPATCH_ACTION_REJECTED', data));
    this.socket.on('transfer_shipped', (data) => this.handleIncomingNotification('TRANSFER_SHIPPED', data));

    // Cảnh báo cảm biến IoT và Báo cháy kho tổng
    this.socket.on('sensor:telemetry', (data) => this.handleIncomingNotification('SENSOR_TELEMETRY', data));
    this.socket.on('sensor:alert', (data) => {
      this.handleIncomingNotification('SENSOR_ALERT', data);
      FireEmergencyNotifeeService.triggerFireEmergencyAlarm({
        title: data?.title || 'CẢNH BÁO QUÁ NHIỆT KHO GSP',
        body: data?.body || `Nhiệt độ cảm biến: ${data?.temp || 'N/A'}°C`,
        deviceId: data?.deviceId || 'ESP32',
        temp: String(data?.temp || ''),
      });
    });
    this.socket.on('fire:emergency', (data) => {
      this.handleIncomingNotification('FIRE_EMERGENCY', data);
      FireEmergencyNotifeeService.triggerFireEmergencyAlarm({
        title: data?.title || 'BÁO ĐỘNG HỎA HOẠN KHO TỔNG',
        body: data?.body || 'KÍCH HOẠT CHUÔNG BÁO ĐỘNG HỎA HOẠN KHẨN CẤP!',
        deviceId: data?.deviceId || 'ESP32',
        temp: String(data?.temp || '65.0'),
        isTest: data?.isTest ?? false,
      });
    });
  }

  private handleIncomingNotification(type: string, data: any): void {
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
