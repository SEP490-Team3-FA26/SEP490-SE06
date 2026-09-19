// medicineReminder.service.ts - Offline Medicine Reminder Scheduling Engine
import * as Notifications from 'expo-notifications';
import { Platform } from 'react-native';
import { MedicineReminder, MealTiming } from '../types/reminder.types';
import { ReminderStorageService } from './reminderStorage.service';

const CHANNEL_ID = 'medicine-reminder-channel';
const CATEGORY_ID = 'MEDICINE_REMINDER';

export const MedicineReminderService = {
  /**
   * Khởi tạo kênh thông báo và các nút tương tác (Action Buttons)
   */
  async init(): Promise<boolean> {
    try {
      // 1. Cấu hình hành vi hiển thị khi app đang mở (Foreground)
      Notifications.setNotificationHandler({
        handleNotification: async () => ({
          shouldShowBanner: true,
          shouldShowList: true,
          shouldPlaySound: true,
          shouldSetBadge: true,
        }),
      });

      // 2. Tạo notification channel trên Android với độ ưu tiên cao nhất
      if (Platform.OS === 'android') {
        await Notifications.setNotificationChannelAsync(CHANNEL_ID, {
          name: 'Lịch Nhắc Uống Thuốc',
          description: 'Thông báo báo thức uống thuốc đúng giờ ngay cả khi khóa màn hình',
          importance: Notifications.AndroidImportance.MAX,
          vibrationPattern: [0, 500, 250, 500],
          lightColor: '#0284C7',
          sound: 'default',
          enableVibrate: true,
          enableLights: true,
          lockscreenVisibility: Notifications.AndroidNotificationVisibility.PUBLIC,
          bypassDnd: true,
        });
      }

      // 3. Đăng ký category với các action buttons trực tiếp trên banner thông báo
      await Notifications.setNotificationCategoryAsync(CATEGORY_ID, [
        {
          identifier: 'TAKEN',
          buttonTitle: '✅ Đã uống',
          options: {
            opensAppToForeground: false,
          },
        },
        {
          identifier: 'SNOOZE',
          buttonTitle: '⏰ Nhắc lại sau 10p',
          options: {
            opensAppToForeground: false,
          },
        },
      ]);

      // 4. Xin quyền thông báo nếu chưa được cấp
      const { status: existingStatus } = await Notifications.getPermissionsAsync();
      let finalStatus = existingStatus;
      if (existingStatus !== 'granted') {
        const { status } = await Notifications.requestPermissionsAsync({
          ios: {
            allowAlert: true,
            allowBadge: true,
            allowSound: true,
            allowCriticalAlerts: true,
          },
        });
        finalStatus = status;
      }

      return finalStatus === 'granted';
    } catch (e) {
      console.warn('Init notifications failed:', e);
      return false;
    }
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
   * Hủy tất cả các thông báo đã lên lịch của một reminder cụ thể
   */
  async cancelReminderNotifications(reminderId: string): Promise<void> {
    try {
      const scheduled = await Notifications.getAllScheduledNotificationsAsync();
      const toCancel = scheduled.filter(
        (n) =>
          n.identifier.startsWith(`${reminderId}_`) ||
          (n.content.data && n.content.data.reminderId === reminderId)
      );

      await Promise.all(
        toCancel.map((n) => Notifications.cancelScheduledNotificationAsync(n.identifier))
      );
      console.log(`[Reminder] Đã hủy ${toCancel.length} thông báo của reminder: ${reminderId}`);
    } catch (e) {
      console.warn('Failed to cancel notifications for reminder:', reminderId, e);
    }
  },

  /**
   * Lên lịch theo cửa sổ trượt (Sliding Window) 7 ngày tới
   */
  async scheduleReminderSlidingWindow(
    reminder: MedicineReminder,
    daysAhead: number = 7
  ): Promise<number> {
    // Luôn hủy các thông báo cũ của reminder này trước để tránh trùng lặp
    await this.cancelReminderNotifications(reminder.id);

    if (!reminder.isEnabled || !reminder.times || reminder.times.length === 0) {
      return 0;
    }

    const now = new Date();
    let scheduledCount = 0;
    const mealDesc = this.getMealDescription(reminder.mealTiming);

    // Chuẩn hóa ngày bắt đầu và kết thúc
    const startBoundary = new Date(reminder.startDate);
    startBoundary.setHours(0, 0, 0, 0);

    const endBoundary = reminder.endDate ? new Date(reminder.endDate) : null;
    if (endBoundary) {
      endBoundary.setHours(23, 59, 59, 999);
    }

    for (let dayOffset = 0; dayOffset < daysAhead; dayOffset++) {
      const targetDate = new Date();
      targetDate.setDate(now.getDate() + dayOffset);

      // Kiểm tra ngày trong tuần (0: CN, 1: T2, ..., 6: T7)
      const dayOfWeek = targetDate.getDay();
      if (reminder.daysOfWeek && !reminder.daysOfWeek.includes(dayOfWeek)) {
        continue;
      }

      // Kiểm tra khoảng thời gian hiệu lực
      const targetDayStart = new Date(targetDate);
      targetDayStart.setHours(0, 0, 0, 0);

      if (targetDayStart < startBoundary) continue;
      if (endBoundary && targetDayStart > endBoundary) continue;

      for (const timeStr of reminder.times) {
        const [hStr, mStr] = timeStr.split(':');
        const hour = parseInt(hStr, 10);
        const minute = parseInt(mStr, 10);

        if (isNaN(hour) || isNaN(minute)) continue;

        const triggerDate = new Date(targetDate);
        triggerDate.setHours(hour, minute, 0, 0);

        // Bỏ qua mốc giờ đã trôi qua ở hiện tại
        if (triggerDate.getTime() <= now.getTime()) {
          continue;
        }

        // Tạo định danh duy nhất ổn định: reminderId_YYYYMMDD_HHmm
        const yyyy = triggerDate.getFullYear();
        const mm = String(triggerDate.getMonth() + 1).padStart(2, '0');
        const dd = String(triggerDate.getDate()).padStart(2, '0');
        const hh = String(hour).padStart(2, '0');
        const min = String(minute).padStart(2, '0');
        const identifier = `${reminder.id}_${yyyy}${mm}${dd}_${hh}${min}`;

        const bodyParts = [`Liều: ${reminder.dosage}`];
        if (mealDesc) bodyParts.push(mealDesc);
        if (reminder.note) bodyParts.push(`Lưu ý: ${reminder.note}`);

        await Notifications.scheduleNotificationAsync({
          identifier,
          content: {
            title: `💊 Nhắc uống thuốc: ${reminder.medicineName}`,
            body: bodyParts.join(' • '),
            data: {
              reminderId: reminder.id,
              medicineName: reminder.medicineName,
              dosage: reminder.dosage,
              scheduledTime: triggerDate.toISOString(),
            },
            categoryIdentifier: CATEGORY_ID,
            sound: 'default',
            priority: Notifications.AndroidNotificationPriority.MAX,
          },
          trigger: {
            type: Notifications.SchedulableTriggerInputTypes.DATE,
            date: triggerDate,
            channelId: CHANNEL_ID,
          },
        });

        scheduledCount++;
      }
    }

    console.log(`[Reminder] Đã lên lịch ${scheduledCount} thông báo cho thuốc: ${reminder.medicineName}`);
    return scheduledCount;
  },

  /**
   * Làm mới và gia hạn cửa sổ trượt cho toàn bộ các nhắc nhở đang bật
   * Được gọi khi mở app, chuyển từ nền lên foreground (AppState.active)
   */
  async rescheduleAllActiveReminders(): Promise<void> {
    try {
      const reminders = await ReminderStorageService.getReminders();
      const activeList = reminders.filter((r) => r.isEnabled);
      console.log(`[Reminder] Đang gia hạn cửa sổ 7 ngày cho ${activeList.length} lịch nhắc...`);

      for (const r of activeList) {
        await this.scheduleReminderSlidingWindow(r, 7);
      }
    } catch (e) {
      console.warn('Failed to reschedule active reminders:', e);
    }
  },

  /**
   * Bắn thông báo thử nghiệm sau X giây (dùng để kiểm thử tức thì)
   */
  async testTriggerNotification(seconds: number = 5): Promise<string> {
    const testId = `test_reminder_${Date.now()}`;
    const testTime = new Date(Date.now() + seconds * 1000);

    return await Notifications.scheduleNotificationAsync({
      identifier: testId,
      content: {
        title: '💊 [Kiểm Thử] Nhắc uống thuốc Panadol Extra',
        body: 'Liều: 1 viên 500mg • Uống sau khi ăn no • Nhấn nút bên dưới để phản hồi',
        data: {
          reminderId: 'test_demo',
          medicineName: 'Panadol Extra (Demo)',
          dosage: '1 viên 500mg',
          scheduledTime: testTime.toISOString(),
        },
        categoryIdentifier: CATEGORY_ID,
        sound: 'default',
        priority: Notifications.AndroidNotificationPriority.MAX,
      },
      trigger: {
        type: Notifications.SchedulableTriggerInputTypes.TIME_INTERVAL,
        seconds: Math.max(1, seconds),
        repeats: false,
        channelId: CHANNEL_ID,
      },
    });
  },

  /**
   * Xử lý khi người dùng tương tác với thông báo (bấm nút hoặc chạm vào thông báo)
   */
  async handleNotificationResponse(response: Notifications.NotificationResponse): Promise<void> {
    try {
      const actionId = response.actionIdentifier;
      const rawData = (response.notification.request.content.data || {}) as Record<string, any>;
      const reminderId = String(rawData.reminderId || 'unknown');
      const medicineName = String(rawData.medicineName || '');
      const dosage = String(rawData.dosage || '1 liều');
      const scheduledTime = String(rawData.scheduledTime || new Date().toISOString());

      if (!medicineName) return;

      if (actionId === 'TAKEN') {
        // Ghi nhận log đã uống
        await ReminderStorageService.addLog({
          reminderId,
          medicineName,
          dosage,
          scheduledTime,
          status: 'TAKEN',
          synced: false,
        });
        console.log(`[Reminder Response] Người dùng bấm: ĐÃ UỐNG (${medicineName})`);
      } else if (actionId === 'SNOOZE') {
        // Ghi nhận log hoãn lại và lên lịch bắn lại sau 10 phút (600s)
        await ReminderStorageService.addLog({
          reminderId,
          medicineName,
          dosage,
          scheduledTime,
          status: 'SNOOZED',
          synced: false,
        });

        // Bắn lại sau 10 phút (600 giây)
        const snoozeDate = new Date(Date.now() + 600 * 1000);
        await Notifications.scheduleNotificationAsync({
          identifier: `snooze_${Date.now()}`,
          content: {
            title: `⏰ [Nhắc Lại] ${medicineName}`,
            body: `Đã qua 10 phút hoãn lại. Hãy uống thuốc ngay nhé! • Liều: ${dosage}`,
            data: {
              ...rawData,
              scheduledTime: snoozeDate.toISOString(),
            },
            categoryIdentifier: CATEGORY_ID,
            sound: 'default',
            priority: Notifications.AndroidNotificationPriority.MAX,
          },
          trigger: {
            type: Notifications.SchedulableTriggerInputTypes.TIME_INTERVAL,
            seconds: 600,
            repeats: false,
            channelId: CHANNEL_ID,
          },
        });
        console.log(`[Reminder Response] Đã hẹn nhắc lại sau 10 phút cho ${medicineName}`);
      }
    } catch (e) {
      console.warn('Failed to handle notification response:', e);
    }
  },

  /**
   * Lấy danh sách toàn bộ các thông báo đang chờ bắn trên máy
   */
  async getScheduledNotifications() {
    return await Notifications.getAllScheduledNotificationsAsync();
  },
};
