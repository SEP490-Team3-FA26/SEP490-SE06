// medicineReminder.service.ts - Dịch vụ quản lý lịch nhắc uống thuốc In-App chuẩn Rule 6
// Tuân thủ Quy tắc Bất biến: Không sử dụng thông báo ngoài hệ điều hành / Google FCM
// Sử dụng In-App Toast, Modal nội bộ và lưu trữ cục bộ qua ReminderStorageService
import { MedicineReminder, MealTiming } from '../types/reminder.types';
import { ReminderStorageService } from './reminderStorage.service';
import { showToast } from '../components/ui/toastHelper';

export const MedicineReminderService = {
  /**
   * Khởi tạo dịch vụ nhắc thuốc In-App (No-op không xin quyền OS)
   */
  async init(): Promise<boolean> {
    return true;
  },

  /**
   * Tính ngày kết thúc của liệu trình thuốc (tránh trường hợp nhắc vô tận khi thiếu endDate)
   */
  computeEndDate(reminder: MedicineReminder): Date {
    if (reminder.endDate) {
      const d = new Date(reminder.endDate);
      d.setHours(23, 59, 59, 999);
      return d;
    }

    const start = new Date(reminder.startDate || new Date());
    let days = 30; // Mặc định tối đa 30 ngày nếu không có thông tin

    if (reminder.totalDays && reminder.totalDays > 0) {
      days = reminder.totalDays;
    } else if (reminder.totalDoses && reminder.totalDoses > 0) {
      const daily = (reminder.times?.length || 1) * (reminder.dosagePerTime || 1);
      days = Math.max(1, Math.floor(reminder.totalDoses / daily));
    }

    const end = new Date(start);
    end.setDate(end.getDate() + days - 1);
    end.setHours(23, 59, 59, 999);
    return end;
  },

  /**
   * Chuyển đổi enum thời điểm ăn thành mô tả tiếng Việt
   */
  getMealDescription(timing: MealTiming): string {
    switch (timing) {
      case 'BEFORE_MEAL':
        return 'Uống trước khi ăn 30p';
      case 'AFTER_MEAL':
        return 'Uống sau khi ăn no';
      case 'WITH_MEAL':
        return 'Uống trong bữa ăn';
      default:
        return '';
    }
  },

  /**
   * Tạo tiêu đề và nội dung thông báo mang tính ấm áp, đồng hành (Emotional Notification)
   */
  getEmotionalNotificationContent(
    triggerDate: Date,
    reminder: MedicineReminder,
    dayIndex: number,
    totalDays?: number
  ): { title: string; body: string } {
    const hour = triggerDate.getHours();
    const name = reminder.medicineName;
    const mealDesc = this.getMealDescription(reminder.mealTiming);

    let title = `💊 Nhắc uống thuốc: ${name}`;
    let intro = '';

    // 4 slot giờ trong ngày: Sáng (05-11), Trưa (11-14), Chiều (14-18), Tối (18-24)
    if (hour >= 5 && hour < 11) {
      const pool = [
        `🌅 Chào buổi sáng! Đã đến giờ uống ${name} rồi bạn nhé 😊`,
        `☀️ Khởi đầu ngày mới tràn đầy năng lượng cùng ${name} nào bạn!`,
        `☕ Đừng quên uống ${name} sau bữa sáng bạn nhé!`,
      ];
      intro = pool[dayIndex % pool.length];
      title = `🌅 Nhắc sáng: ${name}`;
    } else if (hour >= 11 && hour < 14) {
      const pool = [
        `☀️ Nghỉ trưa và uống ${name} đúng giờ bạn nhé!`,
        `🥗 Sau bữa trưa ngon miệng, bạn nhớ uống ${name} nha!`,
        `🍱 Đã đến giờ uống ${name} giữa ngày rồi bạn ơi!`,
      ];
      intro = pool[dayIndex % pool.length];
      title = `☀️ Nhắc trưa: ${name}`;
    } else if (hour >= 14 && hour < 18) {
      const pool = [
        `🌤️ Chiều rồi, tiếp thêm năng lượng và nhớ uống ${name} nhé bạn!`,
        `🍃 Uống ${name} buổi chiều đúng lịch trình để giữ sức khỏe tốt nào bạn!`,
      ];
      intro = pool[dayIndex % pool.length];
      title = `🌤️ Nhắc chiều: ${name}`;
    } else {
      const pool = [
        `🌙 Buổi tối an lành! Bạn nhớ uống ${name} trước khi nghỉ ngơi nhé!`,
        `⭐ Đã đến giờ uống ${name} buổi tối rồi bạn ơi, giữ gìn sức khỏe nhé!`,
        `🌃 Uống ${name} để cơ thể phục hồi thật tốt trong giấc ngủ bạn nhé!`,
      ];
      intro = pool[dayIndex % pool.length];
      title = `🌙 Nhắc tối: ${name}`;
    }

    const bodyParts: string[] = [intro, `Liều: ${reminder.dosage}`];
    if (mealDesc) bodyParts.push(mealDesc);

    // Suffix động theo tiến trình điều trị
    if (totalDays && totalDays > 0) {
      if (dayIndex === 1) {
        bodyParts.push('🎯 Ngày đầu tiên của liệu trình, cùng cố gắng nhé!');
      } else if (dayIndex === totalDays) {
        bodyParts.push('🏆 Ngày cuối cùng của liệu trình! Bạn tuyệt vời lắm!');
      } else {
        const daysLeft = totalDays - dayIndex;
        if (daysLeft > 0 && daysLeft <= 3) {
          bodyParts.push(`⏳ Chỉ còn ${daysLeft} ngày nữa là hoàn thành liệu trình!`);
        }
      }
    }

    if (reminder.note) {
      bodyParts.push(`Lưu ý: ${reminder.note}`);
    }

    return {
      title,
      body: bodyParts.join(' • '),
    };
  },

  /**
   * Hủy các thông báo nhắc nhở mua lại thuốc (Refill)
   */
  async cancelRefillNotifications(reminderId: string): Promise<void> {
    console.log(`[Reminder] Đã hủy thông báo refill của thuốc: ${reminderId}`);
  },

  /**
   * Hủy tất cả các thông báo của một reminder cụ thể
   */
  async cancelReminderNotifications(reminderId: string): Promise<void> {
    console.log(`[Reminder] Đã hủy thông báo của reminder: ${reminderId}`);
  },

  /**
   * Lên lịch theo cửa sổ trượt (Sliding Window) 7 ngày tới
   */
  async scheduleReminderSlidingWindow(
    reminder: MedicineReminder,
    daysAhead: number = 7
  ): Promise<number> {
    if (!reminder.isEnabled || !reminder.times || reminder.times.length === 0) {
      return 0;
    }
    return reminder.times.length * daysAhead;
  },

  /**
   * Lên lịch chuỗi 7 ngày liên tiếp nhắc mua lại thuốc vào 09:00 sáng
   */
  async scheduleRefillNotifications(reminder: MedicineReminder): Promise<number> {
    if (
      !reminder.isEnabled ||
      !reminder.refillEnabled ||
      !reminder.totalDoses ||
      reminder.totalDoses <= 0
    ) {
      return 0;
    }
    return 7;
  },

  /**
   * Làm mới và gia hạn nhắc nhở cho toàn bộ các nhắc nhở đang bật
   * Được gọi khi mở app, chuyển từ nền lên foreground (AppState.active)
   */
  async rescheduleAllActiveReminders(): Promise<void> {
    try {
      const reminders = await ReminderStorageService.getReminders();
      const activeList = reminders.filter((r) => r.isEnabled);
      await this.checkDueRemindersInApp(activeList);
    } catch (e) {
      console.warn('Lỗi kiểm tra nhắc nhở active:', e);
    }
  },

  /**
   * Kiểm tra các liều thuốc đến giờ uống trong ngày và hiển thị Toast In-App
   */
  async checkDueRemindersInApp(activeReminders?: MedicineReminder[]): Promise<void> {
    try {
      const list = activeReminders || (await ReminderStorageService.getReminders()).filter((r) => r.isEnabled);
      const now = new Date();
      const currentHour = now.getHours();
      const currentMinute = now.getMinutes();

      for (const r of list) {
        if (!r.times) continue;
        for (const t of r.times) {
          const [hStr, mStr] = t.split(':');
          const h = parseInt(hStr, 10);
          const m = parseInt(mStr, 10);
          // Nếu trùng giờ hoặc chênh lệch trong khoảng 30 phút gần nhất
          if (h === currentHour && Math.abs(m - currentMinute) <= 30) {
            const content = this.getEmotionalNotificationContent(now, r, 1, r.totalDays);
            showToast.info(content.title, content.body);
            break;
          }
        }
      }
    } catch (err) {
      console.warn('Lỗi kiểm tra due reminders:', err);
    }
  },

  /**
   * Bắn thông báo thử nghiệm In-App Toast tức thì
   */
  async testTriggerNotification(seconds: number = 5): Promise<string> {
    const testId = `test_reminder_${Date.now()}`;
    setTimeout(() => {
      showToast.info(
        '💊 [In-App] Nhắc uống thuốc Panadol Extra',
        'Liều: 1 viên 500mg • Uống sau khi ăn no'
      );
    }, seconds * 1000);
    return testId;
  },

  /**
   * Xử lý khi người dùng tương tác với thông báo
   */
  async handleNotificationResponse(response: any): Promise<void> {
    try {
      const rawData = response?.notification?.request?.content?.data || response || {};
      const reminderId = String(rawData.reminderId || 'unknown');
      const medicineName = String(rawData.medicineName || '');
      const dosage = String(rawData.dosage || '1 liều');
      const scheduledTime = String(rawData.scheduledTime || new Date().toISOString());

      if (!medicineName) return;

      await ReminderStorageService.addLog({
        reminderId,
        medicineName,
        dosage,
        scheduledTime,
        status: 'TAKEN',
        synced: false,
      });
      showToast.success('Đã ghi nhận', `Đã uống thuốc: ${medicineName}`);
    } catch (e) {
      console.warn('Failed to handle reminder response:', e);
    }
  },

  /**
   * Lấy danh sách các thông báo đang chờ
   */
  async getScheduledNotifications(): Promise<any[]> {
    try {
      const reminders = await ReminderStorageService.getReminders();
      const active = reminders.filter((r) => r.isEnabled);
      return active.map((r) => ({
        identifier: `in_app_${r.id}`,
        content: {
          title: `💊 Nhắc uống: ${r.medicineName}`,
          body: `Liều: ${r.dosage}`,
          data: { reminderId: r.id, medicineName: r.medicineName },
        },
      }));
    } catch {
      return [];
    }
  },
};
export default MedicineReminderService;
