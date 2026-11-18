import { Injectable, Logger, OnModuleDestroy, OnModuleInit } from '@nestjs/common';
import * as cron from 'node-cron';
import { DispatchService } from './dispatch.service';

/**
 * Cronjob định kỳ mỗi 60 phút kiểm tra và gắn cờ isStale = true
 * cho các phiếu xuất PICKING không có hoạt động quá 4 giờ, sau đó phát cảnh báo cho Thủ kho.
 */
@Injectable()
export class DispatchCronService implements OnModuleInit, OnModuleDestroy {
  private readonly logger = new Logger(DispatchCronService.name);
  private cronTask: cron.ScheduledTask | null = null;

  constructor(private readonly dispatchService: DispatchService) {}

  onModuleInit(): void {
    // Chạy vào phút 0 mỗi giờ (mỗi 60 phút)
    this.cronTask = cron.schedule('0 * * * *', () => {
      void this.handleStaleOrdersSweep();
    });
    this.logger.log('⏰ [DispatchCron] Đã kích hoạt lịch kiểm tra phiếu xuất treo mỗi 60 phút.');
  }

  onModuleDestroy(): void {
    if (this.cronTask) {
      this.cronTask.stop();
      this.cronTask = null;
    }
  }

  /**
   * Thực thi 1 lượt rà soát phiếu xuất đang PICKING bị treo quá 4 giờ
   */
  async handleStaleOrdersSweep(now: Date = new Date()) {
    try {
      const result = await this.dispatchService.markStalePickingOrders(now);
      if (result.updatedCount > 0) {
        this.logger.warn(
          `⚠️ [DispatchCron] Phát hiện ${result.updatedCount} phiếu treo quá 4h: ${result.dispatchCodes.join(', ')}`,
        );
      }
      return result;
    } catch (error: any) {
      this.logger.error(`[DispatchCron] Lỗi rà soát phiếu treo: ${error?.message}`);
      return { updatedCount: 0, dispatchCodes: [] };
    }
  }
}
