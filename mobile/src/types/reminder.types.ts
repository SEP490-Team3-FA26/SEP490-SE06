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
