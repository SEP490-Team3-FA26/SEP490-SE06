// socket.service.ts - WebSocket Connection via Socket.IO
import { io, Socket } from 'socket.io-client';
import { ApiService } from './api.service';

export type SocketNotificationHandler = (notification: any) => void;

class SocketServiceClass {
  private socket: Socket | null = null;
  private isConnected: boolean = false;
  private listeners: SocketNotificationHandler[] = [];

  public get connected(): boolean {
    return this.isConnected;
  }

  public initSocket(token: string): void {
    if (!token) {
      console.warn('⚠️ Cannot init Socket: Token is empty');
      return;
    }

    this.disconnect();

    const baseUrl = ApiService.baseUrl;
    console.log(`🔌 Initializing Socket.IO connection to ${baseUrl} ...`);

    try {
      this.socket = io(baseUrl, {
        transports: ['websocket'],
        reconnection: true,
        reconnectionDelay: 5000,
        reconnectionAttempts: 10,
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
      console.log('✅ Socket connected successfully to gateway');
    });

    this.socket.on('disconnect', () => {
      this.isConnected = false;
      console.log('❌ Socket disconnected from gateway');
    });

    this.socket.on('connect_error', (data) => {
      console.warn('⚠️ Socket Connection Error:', data);
    });

    // Custom notification events from NestJS gateway
    this.socket.on('new_pr_notification', (data) => this.handleIncomingNotification('NEW_PR', data));
    this.socket.on('pr_approved_notification', (data) => this.handleIncomingNotification('PR_APPROVED', data));
    this.socket.on('pr_rejected_notification', (data) => this.handleIncomingNotification('PR_REJECTED', data));
    this.socket.on('new_po_notification', (data) => this.handleIncomingNotification('NEW_PO', data));
    this.socket.on('grn_completed_notification', (data) => this.handleIncomingNotification('GRN_COMPLETED', data));
    this.socket.on('notification', (data) => this.handleIncomingNotification('GENERAL', data));
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
      console.log('🔌 Disconnecting socket...');
      this.socket.disconnect();
      this.socket = null;
    }
    this.isConnected = false;
  }
}

export const SocketService = new SocketServiceClass();
