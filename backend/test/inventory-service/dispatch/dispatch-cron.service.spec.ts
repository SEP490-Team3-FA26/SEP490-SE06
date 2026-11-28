/// <reference types="jest" />
/**
 * Bộ kiểm thử đơn vị cho DispatchCronService (Rà soát phiếu treo > 4 giờ mỗi 60 phút)
 * Đủ 3 nhóm giá trị: [Normal Values], [Boundary Values], [Abnormal Values]
 */

import { DispatchCronService } from '../../../apps/inventory-service/src/dispatch/dispatch-cron.service';

describe('DispatchCronService (Cronjob Quét Phiếu Xuất Treo)', () => {
  describe('1. [Normal Values] Quét và đánh dấu phiếu treo thành công', () => {
    it('Gọi markStalePickingOrders và trả về danh sách mã phiếu bị đánh dấu isStale', async () => {
      const mockDispatchService: any = {
        markStalePickingOrders: jest.fn(async () => ({
          updatedCount: 2,
          dispatchCodes: ['DO-01', 'DO-02'],
        })),
      };
      const cronService = new DispatchCronService(mockDispatchService);
      const res = await cronService.handleStaleOrdersSweep(new Date());

      expect(res.updatedCount).toBe(2);
      expect(res.dispatchCodes).toEqual(['DO-01', 'DO-02']);
    });
  });

  describe('2. [Boundary Values] Không có phiếu nào vượt quá ngưỡng 4 giờ & Vòng đời module', () => {
    it('Trả về updatedCount = 0 và dọn lịch cron an toàn khi onModuleDestroy', async () => {
      const mockDispatchService: any = {
        markStalePickingOrders: jest.fn(async () => ({ updatedCount: 0, dispatchCodes: [] })),
      };
      const cronService = new DispatchCronService(mockDispatchService);
      cronService.onModuleInit();
      const res = await cronService.handleStaleOrdersSweep();
      cronService.onModuleDestroy();

      expect(res.updatedCount).toBe(0);
    });
  });

  describe('3. [Abnormal Values] DB gặp sự cố khi chạy cron', () => {
    it('Bắt ngoại lệ an toàn không làm sập tiến trình Microservice khi DB timeout', async () => {
      const mockDispatchService: any = {
        markStalePickingOrders: jest.fn(async () => {
          throw new Error('MongoDB timeout');
        }),
      };
      const cronService = new DispatchCronService(mockDispatchService);
      const res = await cronService.handleStaleOrdersSweep();

      expect(res).toEqual({ updatedCount: 0, dispatchCodes: [] });
    });
  });
});
