/**
 * fireEmergencyNotifee.service.spec.ts - Bộ Kiểm Thử Đơn Vị cho FireEmergencyNotifeeService
 * 
 * Tuân thủ Quy tắc Kẹp Bài Test Bắt Buộc (Test-Coupled Mandate):
 * 1. [Normal Values]: Kích hoạt còi báo động hỏa hoạn, rung phần cứng, đăng ký listener nhận payload, tắt còi.
 * 2. [Boundary Values]: Tắt còi khi chưa bật, kích hoạt liên tiếp khi đang bật, đăng ký listener khi còi đang reo.
 * 3. [Abnormal Values]: Payload rỗng, listener ném lỗi ngoại lệ, kiểm tra an toàn khi Vibration bị lỗi.
 * 
 * Chú thích mã nguồn: Tiếng Việt 100% theo quy chuẩn dự án WDP301/SEP490.
 */

jest.mock('react-native', () => ({
  Platform: { OS: 'android' },
  Vibration: {
    vibrate: jest.fn(),
    cancel: jest.fn(),
  },
}));

import { FireEmergencyNotifeeService, FireAlertPayload } from './fireEmergencyNotifee.service';
import { Vibration } from 'react-native';

describe('FireEmergencyNotifeeService (Cảnh Báo Hỏa Hoạn In-App Chuẩn Rule 6)', () => {
  beforeEach(async () => {
    jest.clearAllMocks();
    await FireEmergencyNotifeeService.stopAlarm();
  });

  // =========================================================================
  // 1. [Normal Values] Luồng chuẩn thành công
  // =========================================================================
  describe('[Normal Values] - Kích hoạt và dập tắt báo động khẩn cấp', () => {
    it('Kích hoạt còi báo động thành công và gọi rung dồn dập phần cứng', async () => {
      const payload: FireAlertPayload = {
        title: 'CẢNH BÁO CHÁY KHO GSP',
        body: 'Nhiệt độ cảm biến vượt ngưỡng 60°C',
        deviceId: 'ESP32_ZONE_A',
        temp: '62.5',
      };

      await FireEmergencyNotifeeService.triggerFireEmergencyAlarm(payload);

      expect(FireEmergencyNotifeeService.getIsAlarmActive()).toBe(true);
      expect(FireEmergencyNotifeeService.getCurrentPayload()).toEqual(payload);
      expect(Vibration.vibrate).toHaveBeenCalledWith([0, 1000, 500, 1000, 500, 1000], true);
    });

    it('Đăng ký listener nhận đúng payload khi có sự kiện báo cháy kích hoạt', async () => {
      const receivedPayloads: (FireAlertPayload | null)[] = [];
      const unsubscribe = FireEmergencyNotifeeService.subscribe((data) => {
        receivedPayloads.push(data);
      });

      const payload: FireAlertPayload = {
        title: 'HỎA HOẠN KHẨN CẤP',
        body: 'Phát hiện khói tại kho tầng 2',
      };

      await FireEmergencyNotifeeService.triggerFireEmergencyAlarm(payload);

      expect(receivedPayloads).toHaveLength(1);
      expect(receivedPayloads[0]?.title).toBe('HỎA HOẠN KHẨN CẤP');

      unsubscribe();
    });

    it('Dập tắt báo động (stopAlarm) thành công, hủy rung và chuyển trạng thái về inactive', async () => {
      await FireEmergencyNotifeeService.triggerFireEmergencyAlarm({ title: 'Cháy' });
      expect(FireEmergencyNotifeeService.getIsAlarmActive()).toBe(true);

      await FireEmergencyNotifeeService.stopAlarm();

      expect(FireEmergencyNotifeeService.getIsAlarmActive()).toBe(false);
      expect(FireEmergencyNotifeeService.getCurrentPayload()).toBeNull();
      expect(Vibration.cancel).toHaveBeenCalled();
    });
  });

  // =========================================================================
  // 2. [Boundary Values] Giá trị biên và trạng thái chuyển tiếp
  // =========================================================================
  describe('[Boundary Values] - Chống trùng lặp và các trường hợp biên', () => {
    it('Dập tắt báo động khi chưa kích hoạt không phát sinh lỗi ngoại lệ', async () => {
      expect(FireEmergencyNotifeeService.getIsAlarmActive()).toBe(false);

      await expect(FireEmergencyNotifeeService.stopAlarm()).resolves.not.toThrow();
      expect(Vibration.cancel).toHaveBeenCalled();
    });

    it('Kích hoạt báo động lần 2 khi còi đang kêu chỉ cập nhật payload mà không gọi rung đè', async () => {
      const payload1: FireAlertPayload = { title: 'Báo động 1', temp: '50' };
      const payload2: FireAlertPayload = { title: 'Báo động 2 khẩn cấp hơn', temp: '75' };

      await FireEmergencyNotifeeService.triggerFireEmergencyAlarm(payload1);
      expect(Vibration.vibrate).toHaveBeenCalledTimes(1);

      // Kích hoạt lần 2 khi isAlarmActive = true
      await FireEmergencyNotifeeService.triggerFireEmergencyAlarm(payload2);
      expect(FireEmergencyNotifeeService.getCurrentPayload()?.temp).toBe('75');
      // Không gọi vibrate thêm lần thứ 2
      expect(Vibration.vibrate).toHaveBeenCalledTimes(1);
    });

    it('Khi còi đang reo, một listener mới subscribe lập tức nhận ngay payload hiện tại', async () => {
      const payload: FireAlertPayload = { title: 'Đang cháy!', deviceId: 'ESP_01' };
      await FireEmergencyNotifeeService.triggerFireEmergencyAlarm(payload);

      let immediatePayload: FireAlertPayload | null = null;
      const unsub = FireEmergencyNotifeeService.subscribe((p) => {
        immediatePayload = p;
      });

      expect(immediatePayload).toEqual(payload);
      unsub();
    });
  });

  // =========================================================================
  // 3. [Abnormal Values] Dữ liệu dị thường và phòng vệ
  // =========================================================================
  describe('[Abnormal Values] - Khả năng chịu lỗi và an toàn', () => {
    it('Kích hoạt với payload rỗng {} không gây lỗi và vẫn bật trạng thái báo động', async () => {
      await expect(FireEmergencyNotifeeService.triggerFireEmergencyAlarm({})).resolves.not.toThrow();

      expect(FireEmergencyNotifeeService.getIsAlarmActive()).toBe(true);
      expect(FireEmergencyNotifeeService.getCurrentPayload()).toEqual({});
    });

    it('Listener ném lỗi ngoại lệ không làm gián đoạn các listener khác trong danh sách', async () => {
      let listener2Called = false;

      FireEmergencyNotifeeService.subscribe(() => {
        throw new Error('Cố ý ném lỗi trong listener 1');
      });

      FireEmergencyNotifeeService.subscribe(() => {
        listener2Called = true;
      });

      await expect(
        FireEmergencyNotifeeService.triggerFireEmergencyAlarm({ title: 'Test' })
      ).resolves.not.toThrow();

      expect(listener2Called).toBe(true);
    });
  });
});

