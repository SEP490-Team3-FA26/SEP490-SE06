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

export interface OrderItemReminderInput {
  medicineId?: string;
  name: string;
  quantity?: number;
  unit?: string;
  cach_dung?: string;
  dosageInstructions?: string;
  instructions?: string;
  so_ngay_dung?: number;
  durationDays?: number;
  dosePerTime?: number;
  timesPerDay?: number;
  dailyDose?: number;
  baseQuantity?: number;
  so_vien_hop?: number;
  dosage_form?: string;
  price?: number;
}

/**
 * Helper: Phân tích hướng dẫn sử dụng và liều dùng từ đơn hàng thành dữ liệu MedicineReminder chuẩn
 * Xử lý hoàn hảo cả đơn POS bán lẻ (Efferalgan 500mg, SĐT 0705248921) và đơn thuốc trực tuyến
 */
export function parseOrderToReminder(
  item: OrderItemReminderInput,
  orderId?: string
): Partial<MedicineReminder> {
  const rawInstruction = (
    item.dosageInstructions ||
    item.cach_dung ||
    item.instructions ||
    ''
  ).trim();
  const cd = rawInstruction.toLowerCase();

  // 1. Phân tích liều mỗi lần (dosagePerTime)
  let dosagePerTime = 1;
  if (item.dosePerTime && item.dosePerTime > 0) {
    dosagePerTime = item.dosePerTime;
  } else {
    // Tìm các mẫu: "uống 1 viên", "1 vỉ", "2 gói", "1/2 viên"...
    const doseMatch = cd.match(/(?:uống|dùng)?\s*(\d+(?:\.\d+)?)\s*(viên|vỉ|gói|v|ml|ống|giọt|viên sủi)/i);
    if (doseMatch) {
      dosagePerTime = parseFloat(doseMatch[1]) || 1;
    }
  }

  // 2. Phân tích số lần uống trong ngày (timesPerDay) & các mốc giờ uống (times)
  const times: string[] = [];
  const hasSang = cd.includes('sáng') || cd.includes('sang');
  const hasTrua = cd.includes('trưa') || cd.includes('trua');
  const hasChieu = cd.includes('chiều') || cd.includes('chieu');
  const hasToi = cd.includes('tối') || cd.includes('toi');

  if (hasSang) times.push('07:30');
  if (hasTrua) times.push('12:00');
  if (hasChieu) times.push('16:00');
  if (hasToi) times.push('20:00');

  // Nếu không ghi rõ các buổi, phân tích theo timesPerDay hoặc số lần/ngày
  if (times.length === 0) {
    let count = item.timesPerDay || 0;
    if (!count) {
      const timesMatch = cd.match(/(\d+)\s*lần\s*(?:\/|\s*mỗi\s*|\s*trong\s*)?ngày/i) || cd.match(/(\d+)\s*lần/i);
      count = timesMatch ? parseInt(timesMatch[1], 10) : 2;
    }

    if (count === 1) {
      // Nếu có nhắc "tối" thì xếp vào 20:00, mặc định buổi sáng 08:00
      times.push(hasToi ? '20:00' : '08:00');
    } else if (count === 2) {
      // 2 lần/ngày: sáng 08:00 và tối 20:00
      times.push('08:00', '20:00');
    } else if (count === 3) {
      // 3 lần/ngày: sáng 07:30, trưa 12:30, tối 20:00
      times.push('07:30', '12:30', '20:00');
    } else if (count >= 4) {
      // 4 lần/ngày: sáng 07:00, trưa 11:30, chiều 16:30, tối 21:00
      times.push('07:00', '11:30', '16:30', '21:00');
    } else {
      times.push('08:00', '20:00');
    }
  }

  // 3. Phân tích thời điểm so với bữa ăn (mealTiming)
  let mealTiming: 'BEFORE_MEAL' | 'AFTER_MEAL' | 'WITH_MEAL' | 'NONE' = 'AFTER_MEAL';
  if (cd.includes('trước ăn') || cd.includes('truoc an') || cd.includes('trước khi ăn')) {
    mealTiming = 'BEFORE_MEAL';
  } else if (cd.includes('trong bữa') || cd.includes('trong bua') || cd.includes('cùng bữa') || cd.includes('khi ăn')) {
    mealTiming = 'WITH_MEAL';
  } else if (cd.includes('sau ăn') || cd.includes('sau an') || cd.includes('sau khi ăn')) {
    mealTiming = 'AFTER_MEAL';
  }

  // 4. Phân tích số ngày sử dụng (totalDays)
  let totalDays = 7;
  if (item.durationDays && item.durationDays > 0) {
    totalDays = item.durationDays;
  } else if (item.so_ngay_dung && item.so_ngay_dung > 0) {
    totalDays = item.so_ngay_dung;
  } else {
    // Regex tìm: "dùng trong 4 ngày", "uống trong 5 ngày", "trong 7 ngày", "4 ngày"
    const daysMatch = cd.match(/(?:dùng trong|uống trong|trong|điều trị|liệu trình)\s*(\d+)\s*ngày/i) || cd.match(/(\d+)\s*ngày/i);
    if (daysMatch) {
      totalDays = parseInt(daysMatch[1], 10) || 7;
    }
  }

  // 5. Tính toán tổng số liều / số viên cần uống (totalDoses)
  let totalDoses = 0;
  if (item.baseQuantity && item.baseQuantity > 0) {
    totalDoses = item.baseQuantity;
  } else if (item.dailyDose && item.dailyDose > 0 && totalDays > 0) {
    totalDoses = item.dailyDose * totalDays;
  } else if (item.so_vien_hop && item.so_vien_hop > 0 && item.quantity) {
    totalDoses = item.so_vien_hop * item.quantity;
  } else {
    const dailyConsumption = times.length * dosagePerTime;
    if (dailyConsumption > 0 && totalDays > 0) {
      totalDoses = dailyConsumption * totalDays;
    } else {
      totalDoses = Math.max(1, (item.quantity || 1) * 10);
    }
  }

  // 6. Tính ngày bắt đầu và kết thúc lộ trình điều trị
  const now = new Date();
  const pad = (n: number) => n.toString().padStart(2, '0');
  const startDate = `${now.getFullYear()}-${pad(now.getMonth() + 1)}-${pad(now.getDate())}`;

  const endD = new Date(now);
  endD.setDate(endD.getDate() + Math.max(1, totalDays) - 1);
  const endDate = `${endD.getFullYear()}-${pad(endD.getMonth() + 1)}-${pad(endD.getDate())}`;

  // Chuỗi mô tả liều dùng rõ ràng
  const unitStr = item.unit || 'viên';
  const dosageDisplay = `${dosagePerTime} ${unitStr}`;

  // Đơn dài ngày (tối thiểu 8 ngày) đủ điều kiện bật chuỗi 7 ngày nhắc mua lại trước
  const refillEnabled = totalDays >= 8;

  return {
    medicineName: item.name,
    dosage: dosageDisplay,
    times,
    startDate,
    endDate,
    daysOfWeek: [0, 1, 2, 3, 4, 5, 6], // Uống mỗi ngày trong tuần theo liệu trình
    mealTiming,
    note: rawInstruction || 'Uống theo chỉ dẫn của dược sĩ',
    isEnabled: true,
    totalDoses,
    timesPerDay: times.length,
    dosagePerTime,
    totalDays,
    refillEnabled,
    refillThresholdPct: 20,
    sourceType: 'FROM_ORDER',
    orderId: orderId ? String(orderId) : undefined,
    orderItemId: item.medicineId,
  };
}

/**
 * Tự động tạo danh sách nhắc thuốc và lưu trực tiếp từ đơn hàng
 */
export async function createRemindersFromOrder(
  order: {
    id?: string;
    _id?: string;
    orderCode?: any;
    items?: OrderItemReminderInput[];
  }
): Promise<MedicineReminder[]> {
  const items = order.items || [];
  if (items.length === 0) return [];

  const orderId = String(order.orderCode || order.id || order._id || '');
  const createdList: MedicineReminder[] = [];

  for (let i = 0; i < items.length; i++) {
    const it = items[i];
    const parsed = parseOrderToReminder(it, orderId);

    const newReminder: MedicineReminder = {
      id: `rem_ord_${orderId}_${it.medicineId || i}_${Date.now()}`,
      medicineName: parsed.medicineName || it.name,
      dosage: parsed.dosage || '1 viên',
      times: parsed.times && parsed.times.length > 0 ? parsed.times : ['08:00', '20:00'],
      startDate: parsed.startDate || new Date().toISOString().split('T')[0],
      endDate: parsed.endDate,
      daysOfWeek: parsed.daysOfWeek || [0, 1, 2, 3, 4, 5, 6],
      mealTiming: parsed.mealTiming || 'AFTER_MEAL',
      note: parsed.note || it.dosageInstructions || it.cach_dung || 'Theo hướng dẫn đơn thuốc',
      isEnabled: true,
      totalDoses: parsed.totalDoses || 20,
      timesPerDay: parsed.timesPerDay || 2,
      dosagePerTime: parsed.dosagePerTime || 1,
      totalDays: parsed.totalDays || 7,
      refillEnabled: parsed.refillEnabled ?? false,
      refillThresholdPct: parsed.refillThresholdPct || 20,
      sourceType: 'FROM_ORDER',
      orderId: orderId,
      orderItemId: it.medicineId,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };

    await ReminderStorageService.upsertReminder(newReminder);
    createdList.push(newReminder);
  }

  return createdList;
}


