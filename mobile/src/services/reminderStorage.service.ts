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
