// reminderStorage.service.ts - Offline Local Storage using AsyncStorage
import AsyncStorage from '@react-native-async-storage/async-storage';
import { MedicineReminder, MedicineReminderLog } from '../types/reminder.types';

const STORAGE_KEYS = {
  REMINDERS: '@vinapharmacy_medicine_reminders',
  LOGS: '@vinapharmacy_medicine_reminder_logs',
};

export const ReminderStorageService = {
  /**
   * Lấy toàn bộ danh sách nhắc nhở từ local storage
   */
  async getReminders(): Promise<MedicineReminder[]> {
    try {
      const raw = await AsyncStorage.getItem(STORAGE_KEYS.REMINDERS);
      if (!raw) return [];
      return JSON.parse(raw) as MedicineReminder[];
    } catch (e) {
      console.warn('Failed to load reminders from storage:', e);
      return [];
    }
  },

  /**
   * Lưu đè toàn bộ danh sách nhắc nhở vào storage
   */
  async saveReminders(reminders: MedicineReminder[]): Promise<void> {
    try {
      await AsyncStorage.setItem(STORAGE_KEYS.REMINDERS, JSON.stringify(reminders));
    } catch (e) {
      console.error('Failed to save reminders to storage:', e);
      throw e;
    }
  },

  /**
   * Thêm hoặc cập nhật một nhắc nhở
   */
  async upsertReminder(reminder: MedicineReminder): Promise<MedicineReminder[]> {
    const list = await this.getReminders();
    const index = list.findIndex((r) => r.id === reminder.id);
    if (index >= 0) {
      list[index] = { ...reminder, updatedAt: new Date().toISOString() };
    } else {
      list.unshift({
        ...reminder,
        createdAt: reminder.createdAt || new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      });
    }
    await this.saveReminders(list);
    return list;
  },

  /**
   * Xóa một nhắc nhở theo ID
   */
  async deleteReminder(id: string): Promise<MedicineReminder[]> {
    const list = await this.getReminders();
    const filtered = list.filter((r) => r.id !== id);
    await this.saveReminders(filtered);
    return filtered;
  },

  /**
   * Bật hoặc tắt trạng thái nhắc nhở
   */
  async toggleReminder(id: string, isEnabled: boolean): Promise<MedicineReminder[]> {
    const list = await this.getReminders();
    const updated = list.map((r) =>
      r.id === id ? { ...r, isEnabled, updatedAt: new Date().toISOString() } : r
    );
    await this.saveReminders(updated);
    return updated;
  },

  /**
   * Lấy toàn bộ nhật ký phản hồi uống thuốc
   */
  async getLogs(): Promise<MedicineReminderLog[]> {
    try {
      const raw = await AsyncStorage.getItem(STORAGE_KEYS.LOGS);
      if (!raw) return [];
      return JSON.parse(raw) as MedicineReminderLog[];
    } catch (e) {
      console.warn('Failed to load reminder logs from storage:', e);
      return [];
    }
  },

  /**
   * Thêm một bản ghi nhật ký mới (ví dụ: đã uống, hoãn lại)
   */
  async addLog(log: Omit<MedicineReminderLog, 'id' | 'recordedAt'>): Promise<MedicineReminderLog[]> {
    try {
      const logs = await this.getLogs();
      const newLog: MedicineReminderLog = {
        ...log,
        id: `log_${Date.now()}_${Math.random().toString(36).substr(2, 6)}`,
        recordedAt: new Date().toISOString(),
      };
      // Lưu tối đa 200 logs gần nhất để tối ưu bộ nhớ
      const updatedLogs = [newLog, ...logs].slice(0, 200);
      await AsyncStorage.setItem(STORAGE_KEYS.LOGS, JSON.stringify(updatedLogs));
      return updatedLogs;
    } catch (e) {
      console.error('Failed to append reminder log:', e);
      return [];
    }
  },

  /**
   * Xóa toàn bộ lịch sử nhật ký (cho trường hợp reset)
   */
  async clearLogs(): Promise<void> {
    try {
      await AsyncStorage.removeItem(STORAGE_KEYS.LOGS);
    } catch (e) {
      console.warn('Failed to clear reminder logs:', e);
    }
  },
};

/**
 * Helper: Phân tích hướng dẫn sử dụng từ đơn hàng thành dữ liệu MedicineReminder chuẩn
 */
export function parseOrderToReminder(
  item: {
    medicineId?: string;
    name: string;
    quantity: number;
    unit?: string;
    cach_dung?: string;
    so_ngay_dung?: number;
    so_vien_hop?: number;
    dosage_form?: string;
  },
  orderId?: string
): Partial<MedicineReminder> {
  const cd = (item.cach_dung || '').toLowerCase();

  // 1. Phân tích các mốc giờ uống trong ngày
  const times: string[] = [];
  if (cd.includes('sáng') || cd.includes('sang')) {
    times.push('07:30');
  }
  if (cd.includes('trưa') || cd.includes('trua')) {
    times.push('12:00');
  }
  if (cd.includes('chiều') || cd.includes('chieu')) {
    times.push('16:00');
  }
  if (cd.includes('tối') || cd.includes('toi')) {
    times.push('20:00');
  }

  // Fallback nếu không xác định được buổi cụ thể
  if (times.length === 0) {
    const timesMatch = cd.match(/(\d+)\s*lần/);
    const count = timesMatch ? parseInt(timesMatch[1], 10) : 2;
    if (count === 1) times.push('08:00');
    else if (count === 2) times.push('08:00', '20:00');
    else if (count === 3) times.push('07:30', '13:00', '20:00');
    else if (count >= 4) times.push('07:00', '12:00', '17:00', '21:00');
    else times.push('08:00', '20:00');
  }

  // 2. Phân tích liều mỗi lần (dosagePerTime)
  let dosagePerTime = 1;
  const doseMatch = cd.match(/(\d+)\s*(viên|gói|v|ml|ống)/);
  if (doseMatch) {
    dosagePerTime = parseInt(doseMatch[1], 10) || 1;
  }

  // 3. Phân tích thời điểm so với bữa ăn (MealTiming)
  let mealTiming: 'BEFORE_MEAL' | 'AFTER_MEAL' | 'WITH_MEAL' | 'NONE' = 'AFTER_MEAL';
  if (cd.includes('trước ăn') || cd.includes('truoc an')) {
    mealTiming = 'BEFORE_MEAL';
  } else if (cd.includes('trong bữa') || cd.includes('trong bua') || cd.includes('cùng bữa')) {
    mealTiming = 'WITH_MEAL';
  } else if (cd.includes('sau ăn') || cd.includes('sau an')) {
    mealTiming = 'AFTER_MEAL';
  }

  // 4. Tính toán tổng số lượng thuốc (totalDoses)
  let totalDoses = 0;
  if (item.so_vien_hop && item.so_vien_hop > 0) {
    totalDoses = item.so_vien_hop * item.quantity;
  } else if (item.quantity > 5) {
    totalDoses = item.quantity; // Thường là đơn vị tính bằng viên nếu số lượng lớn
  } else {
    // Nếu mua 1 vỉ hoặc 1 hộp thông thường (mặc định 20 viên/vỉ)
    totalDoses = item.quantity * 20;
  }

  // 5. Phân tích số ngày sử dụng (totalDays)
  let totalDays = 7; // Mặc định 7 ngày
  if (item.so_ngay_dung && item.so_ngay_dung > 0) {
    totalDays = item.so_ngay_dung;
  } else {
    const daysMatch = cd.match(/(?:dùng trong|uống trong|trong)\s*(\d+)\s*ngày/);
    if (daysMatch) {
      totalDays = parseInt(daysMatch[1], 10) || 7;
    } else {
      const dailyConsumption = times.length * dosagePerTime;
      if (dailyConsumption > 0 && totalDoses > 0) {
        totalDays = Math.max(1, Math.floor(totalDoses / dailyConsumption));
      }
    }
  }

  // 6. Tính ngày bắt đầu và kết thúc
  const now = new Date();
  const pad = (n: number) => n.toString().padStart(2, '0');
  const startDate = `${now.getFullYear()}-${pad(now.getMonth() + 1)}-${pad(now.getDate())}`;

  const endD = new Date(now);
  endD.setDate(endD.getDate() + totalDays - 1);
  const endDate = `${endD.getFullYear()}-${pad(endD.getMonth() + 1)}-${pad(endD.getDate())}`;

  // Đơn dài ngày (tối thiểu 8 ngày) đủ điều kiện bật chuỗi 7 ngày nhắc mua lại trước
  const refillEnabled = totalDays >= 8;

  return {
    medicineName: item.name,
    dosage: `${dosagePerTime} ${item.unit || 'viên'}`,
    times,
    startDate,
    endDate,
    daysOfWeek: [0, 1, 2, 3, 4, 5, 6], // Uống mỗi ngày trong tuần
    mealTiming,
    note: item.cach_dung || 'Theo chỉ dẫn của dược sĩ',
    isEnabled: true,
    totalDoses,
    timesPerDay: times.length,
    dosagePerTime,
    totalDays,
    refillEnabled,
    refillThresholdPct: 20,
    sourceType: 'FROM_ORDER',
    orderId,
    orderItemId: item.medicineId,
  };
}

