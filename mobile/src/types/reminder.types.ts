// reminder.types.ts - Offline Medicine Reminder Data Models

export type MealTiming = 'BEFORE_MEAL' | 'AFTER_MEAL' | 'WITH_MEAL' | 'NONE';

export interface MedicineReminder {
  id: string; // UUID v4 or timestamp-based ID
  medicineName: string; // Tên thuốc
  dosage: string; // Liều lượng (vd: "1 viên", "500mg", "1 gói")
  times: string[]; // Danh sách các mốc giờ uống trong ngày ['07:30', '12:00', '19:30']
  startDate: string; // Ngày bắt đầu format YYYY-MM-DD
  endDate?: string; // Ngày kết thúc format YYYY-MM-DD (nếu có)
  daysOfWeek: number[]; // Các ngày trong tuần (0: CN, 1: T2, 2: T3, ..., 6: T7)
  mealTiming: MealTiming; // Thời điểm uống thuốc đối với bữa ăn
  note?: string; // Ghi chú thêm
  isEnabled: boolean; // Trạng thái bật/tắt nhắc nhở
  createdAt: string;
  updatedAt: string;

  // Medicine Reminder v2.0 - Refill & Dosing specifications
  totalDoses?: number; // Tổng số lượng viên/gói ban đầu (vd: 20 viên)
  timesPerDay?: number; // Số lần uống trong ngày (mặc định lấy theo times.length)
  dosagePerTime?: number; // Số lượng viên uống mỗi lần (vd: 1 viên)
  totalDays?: number; // Tổng số ngày điều trị dự kiến
  refillEnabled?: boolean; // Bật/tắt nhắc nhở mua lại
  refillThresholdPct?: number; // Ngưỡng kích hoạt nhắc mua lại (% còn lại, mặc định 20)
  refillScheduled?: boolean; // Cờ đánh dấu đã lên lịch chuông nhắc mua lại hay chưa
  orderId?: string; // Mã đơn hàng xuất phát (nếu tạo từ đơn mua)
  orderItemId?: string; // Mã thuốc trong đơn hàng
  sourceType?: 'MANUAL' | 'FROM_ORDER'; // Nguồn gốc nhắc nhở
}

export type ReminderActionStatus = 'TAKEN' | 'SKIPPED' | 'SNOOZED' | 'MISSED';

export interface MedicineReminderLog {
  id: string;
  reminderId: string;
  medicineName: string;
  dosage: string;
  scheduledTime: string; // ISO string thời điểm hẹn
  status: ReminderActionStatus;
  recordedAt: string; // ISO string lúc người dùng bấm nút
  synced: boolean;
}

export interface RefillLog {
  id: string;
  reminderId: string;
  medicineName: string;
  scheduledTime: string; // ISO string 09:00 hàng ngày
  triggerDay: number; // Ngày thứ mấy trong chuỗi 7 ngày nhắc
  notifiedAt?: string;
  acknowledged: boolean;
}
