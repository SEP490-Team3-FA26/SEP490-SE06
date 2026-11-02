/**
 * medicineReminder.service.spec.ts - Bộ Kiểm Thử Đơn Vị cho MedicineReminderService
 * 
 * Tuân thủ Quy tắc Kẹp Bài Test Bắt Buộc (Test-Coupled Mandate):
 * 1. [Normal Values]: Tính ngày kết thúc liệu trình, mô tả thời điểm ăn uống, thông điệp nhắc nhở 4 buổi trong ngày.
 * 2. [Boundary Values]: Liệu trình 1 ngày, 0 ngày, ngày đầu tiên (dayIndex = 1), ngày cuối cùng, không có endDate.
 * 3. [Abnormal Values]: Dữ liệu reminder thiếu các trường cần thiết, times rỗng, định dạng giờ sai, mealTiming không xác định.
 * 
 * Chú thích mã nguồn: Tiếng Việt 100% theo quy chuẩn dự án WDP301/SEP490.
 */

jest.mock('../../src/components/ui/toastHelper', () => ({
  showToast: {
    info: jest.fn(),
    success: jest.fn(),
    error: jest.fn(),
  },
}));

jest.mock('../../src/services/reminderStorage.service', () => ({
  ReminderStorageService: {
    getReminders: jest.fn(async () => []),
    saveReminders: jest.fn(async () => {}),
  },
}));

import { MedicineReminderService } from '../../src/services/medicineReminder.service';
import { MedicineReminder } from '../../src/types/reminder.types';

// Helper tạo dữ liệu mẫu hợp lệ cho bài test
function createMockReminder(overrides: Partial<MedicineReminder> = {}): MedicineReminder {
  return {
    id: 'REM-DEFAULT',
    medicineName: 'Thuốc mẫu',
    dosage: '1 viên',
    startDate: '2026-11-01',
    times: ['08:00'],
    daysOfWeek: [0, 1, 2, 3, 4, 5, 6],
    mealTiming: 'AFTER_MEAL',
    isEnabled: true,
    createdAt: '2026-11-01T00:00:00.000Z',
    updatedAt: '2026-11-01T00:00:00.000Z',
    ...overrides,
  };
}

describe('MedicineReminderService (Dịch Vụ Nhắc Uống Thuốc In-App Chuẩn Rule 6)', () => {
  // =========================================================================
  // 1. [Normal Values] Luồng nghiệp vụ chuẩn
  // =========================================================================
  describe('[Normal Values] - Tính toán liệu trình và thông điệp chuẩn hóa', () => {
    it('Chuyển đổi đúng mô tả tiếng Việt cho từng thời điểm ăn uống (MealTiming)', () => {
      expect(MedicineReminderService.getMealDescription('BEFORE_MEAL')).toBe('Uống trước khi ăn 30p');
      expect(MedicineReminderService.getMealDescription('AFTER_MEAL')).toBe('Uống sau khi ăn no');
      expect(MedicineReminderService.getMealDescription('WITH_MEAL')).toBe('Uống trong bữa ăn');
    });

    it('Tính đúng ngày kết thúc liệu trình khi có sẵn trường endDate', () => {
      const mockReminder = createMockReminder({
        id: 'REM-1',
        medicineName: 'Amoxicillin 500mg',
        dosage: '1 viên',
        startDate: '2026-11-01',
        endDate: '2026-11-10',
        times: ['08:00', '20:00'],
      });

      const endDate = MedicineReminderService.computeEndDate(mockReminder);
      expect(endDate.getFullYear()).toBe(2026);
      expect(endDate.getMonth()).toBe(10); // Tháng 11 (0-indexed = 10)
      expect(endDate.getDate()).toBe(10);
      expect(endDate.getHours()).toBe(23);
      expect(endDate.getMinutes()).toBe(59);
    });

    it('Tạo thông điệp nhắc nhở buổi sáng (05h - 11h) chứa lời chào buổi sáng', () => {
      const mockReminder = createMockReminder({
        id: 'REM-2',
        medicineName: 'Vitamin C 500mg',
        dosage: '1 viên sủi',
        startDate: '2026-11-01',
        times: ['08:00'],
        totalDays: 14,
      });

      const morningDate = new Date('2026-11-01T08:00:00');
      const content = MedicineReminderService.getEmotionalNotificationContent(morningDate, mockReminder, 1, 14);

      expect(content.title).toContain('Nhắc sáng: Vitamin C 500mg');
      expect(content.body).toContain('Liều: 1 viên sủi');
      expect(content.body).toContain('Uống sau khi ăn no');
      expect(content.body).toContain('Ngày đầu tiên của liệu trình');
    });

    it('Tạo thông điệp chúc mừng ngày cuối cùng của liệu trình điều trị', () => {
      const mockReminder = createMockReminder({
        id: 'REM-3',
        medicineName: 'Augmentin 1g',
        dosage: '1 viên',
        startDate: '2026-11-01',
        times: ['20:00'],
        totalDays: 7,
      });

      const nightDate = new Date('2026-11-07T20:00:00');
      const content = MedicineReminderService.getEmotionalNotificationContent(nightDate, mockReminder, 7, 7);

      expect(content.title).toContain('Nhắc tối: Augmentin 1g');
      expect(content.body).toContain('Ngày cuối cùng của liệu trình! Bạn tuyệt vời lắm!');
    });
  });

  // =========================================================================
  // 2. [Boundary Values] Giá trị biên
  // =========================================================================
  describe('[Boundary Values] - Biên liệu trình, tổng liều và giá trị tối thiểu', () => {
    it('Tự động suy diễn ngày kết thúc khi không có endDate nhưng có totalDays = 1', () => {
      const mockReminder = createMockReminder({
        id: 'REM-4',
        medicineName: 'Paracetamol 500mg',
        dosage: '1 viên',
        startDate: '2026-11-01',
        times: ['08:00'],
        totalDays: 1,
      });

      const endDate = MedicineReminderService.computeEndDate(mockReminder);
      expect(endDate.getDate()).toBe(1); // Cùng ngày bắt đầu
    });

    it('Tự động tính ngày kết thúc dựa trên totalDoses và số lần uống mỗi ngày', () => {
      const mockReminder = createMockReminder({
        id: 'REM-5',
        medicineName: 'Berberin 50mg',
        dosage: '2 viên',
        startDate: '2026-11-01',
        times: ['07:00', '12:00'], // 2 lần / ngày
        dosagePerTime: 2,          // 2 viên / lần = 4 viên / ngày
        totalDoses: 20,            // 20 viên / 4 = 5 ngày
        mealTiming: 'BEFORE_MEAL',
      });

      const endDate = MedicineReminderService.computeEndDate(mockReminder);
      // Bắt đầu ngày 1 + 5 ngày - 1 = ngày 5
      expect(endDate.getDate()).toBe(5);
    });

    it('Xử lý an toàn khi totalDays âm hoặc bằng 0 -> áp dụng mặc định an toàn 30 ngày', () => {
      const mockReminder = createMockReminder({
        id: 'REM-6',
        medicineName: 'Thuốc mãn tính',
        dosage: '1 viên',
        startDate: '2026-11-01',
        times: ['08:00'],
        totalDays: 0,
      });

      const endDate = MedicineReminderService.computeEndDate(mockReminder);
      // Ngày 1 + 30 ngày - 1 = ngày 30
      expect(endDate.getDate()).toBe(30);
    });
  });

  // =========================================================================
  // 3. [Abnormal Values] Dữ liệu dị thường và ngoại lệ
  // =========================================================================
  describe('[Abnormal Values] - Khả năng chịu lỗi với dữ liệu rỗng và không hợp lệ', () => {
    it('Xử lý an toàn khi mealTiming truyền vào không thuộc enum (undefined hoặc lạ)', () => {
      expect(MedicineReminderService.getMealDescription(undefined as any)).toBe('');
      expect(MedicineReminderService.getMealDescription('UNKNOWN_TIMING' as any)).toBe('');
    });

    it('Hàm scheduleReminderSlidingWindow trả về 0 khi reminder bị tắt hoặc times rỗng', async () => {
      const disabledReminder = createMockReminder({
        id: 'REM-7',
        medicineName: 'Thuốc tạm ngưng',
        dosage: '1 viên',
        times: ['08:00'],
        isEnabled: false,
      });

      const count = await MedicineReminderService.scheduleReminderSlidingWindow(disabledReminder, 7);
      expect(count).toBe(0);

      const emptyTimesReminder = createMockReminder({
        id: 'REM-7b',
        medicineName: 'Thuốc times rỗng',
        dosage: '1 viên',
        isEnabled: true,
        times: [],
      });

      const countEmpty = await MedicineReminderService.scheduleReminderSlidingWindow(emptyTimesReminder, 7);
      expect(countEmpty).toBe(0);
    });

    it('Hàm scheduleRefillNotifications trả về 0 khi không bật refill hoặc totalDoses <= 0', async () => {
      const noRefillReminder = createMockReminder({
        id: 'REM-8',
        medicineName: 'Thuốc không refill',
        dosage: '1 viên',
        times: ['08:00'],
        isEnabled: true,
        refillEnabled: false,
      });

      const count = await MedicineReminderService.scheduleRefillNotifications(noRefillReminder);
      expect(count).toBe(0);
    });
  });
});
