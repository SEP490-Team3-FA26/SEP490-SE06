import { Injectable, Logger } from '@nestjs/common';
import { Subject, Observable } from 'rxjs';
import { filter, map } from 'rxjs/operators';

export interface SseEventMessage {
  event?: string;
  data: any;
  targetRoom?: string; // 'all' | 'admin' | 'warehouse' | 'branch-{id}' | 'user-{id}'
}

export interface ConnectedSseUser {
  userId: string;
  email: string;
  role: string;
  branchId?: string;
  rooms: Set<string>;
}

@Injectable()
export class SseService {
  private readonly logger = new Logger(SseService.name);
  private eventSubject = new Subject<SseEventMessage>();
  private activeClientsCount = 0;

  /**
   * Đăng ký một client kết nối SSE và trả về Observable stream tương ứng
   */
  registerClient(user: { userId: string; email: string; role: string; branchId?: string }): Observable<MessageEvent> {
    const userRooms = new Set<string>(['all']);

    if (user.role === 'admin' || user.role === 'head_branch') {
      userRooms.add('admin');
    }
    if (user.role === 'warehouse') {
      userRooms.add('warehouse');
    }
    if (user.branchId) {
      userRooms.add(`branch-${user.branchId}`);
    }
    if (user.userId) {
      userRooms.add(`user-${user.userId}`);
    }

    this.activeClientsCount++;
    this.logger.log(`🔌 [SSE] Client connected: ${user.email} (${user.role}) → Rooms: ${Array.from(userRooms).join(', ')} (Total active: ${this.activeClientsCount})`);

    return this.eventSubject.asObservable().pipe(
      filter((msg: SseEventMessage) => {
        if (!msg.targetRoom || msg.targetRoom === 'all') return true;
        return userRooms.has(msg.targetRoom);
      }),
      map((msg: SseEventMessage) => {
        return {
          type: msg.event || 'message',
          data: msg.data,
        } as unknown as MessageEvent;
      }),
    );
  }

  clientDisconnected(email: string) {
    this.activeClientsCount = Math.max(0, this.activeClientsCount - 1);
    this.logger.log(`👋 [SSE] Client disconnected: ${email} (Remaining active: ${this.activeClientsCount})`);
  }

  /**
   * Phát sự kiện tới toàn bộ client
   */
  emit(event: string, data: any) {
    this.eventSubject.next({
      event,
      data,
      targetRoom: 'all',
    });
  }

  /**
   * Phát sự kiện tới một Room cụ thể (admin, warehouse, branch-xxx, user-xxx)
   */
  emitTo(targetRoom: string, event: string, data: any) {
    this.eventSubject.next({
      event,
      data,
      targetRoom,
    });
  }
}
