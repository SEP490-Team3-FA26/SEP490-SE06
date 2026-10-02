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
      try {
        Notifications.setNotificationHandler({
          handleNotification: async () => ({
            shouldShowBanner: true,
            shouldShowList: true,
            shouldPlaySound: true,
            shouldSetBadge: true,
          }),
        });
      } catch (e) {
        // Ignored on Expo Go
      }

      // 2. Tạo notification channel trên Android với độ ưu tiên cao nhất
      if (Platform.OS === 'android') {
        try {
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
        } catch (e) {
          // Expo Go Android doesn't always provide ChannelsProvider
        }
      }

      // 3. Đăng ký category với các action buttons trực tiếp trên banner thông báo
      try {
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
      } catch (e) {
        // Ignored on Expo Go
      }

      // 4. Xin quyền thông báo nếu chưa được cấp
      try {
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
        return false;
      }
    } catch (e) {
      return false;
    }
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
    try {
      const scheduled = await Notifications.getAllScheduledNotificationsAsync();
      const toCancel = scheduled.filter(
        (n) =>
          n.identifier.startsWith(`refill_${reminderId}_`) ||
          (n.content.data && n.content.data.refillReminderId === reminderId)
      );

      await Promise.all(
        toCancel.map((n) => Notifications.cancelScheduledNotificationAsync(n.identifier))
      );
      if (toCancel.length > 0) {
        console.log(`[Reminder] Đã hủy ${toCancel.length} thông báo refill của thuốc: ${reminderId}`);
      }
    } catch (e) {
      console.warn('Failed to cancel refill notifications:', reminderId, e);
    }
  },

  /**
   * Hủy tất cả các thông báo đã lên lịch của một reminder cụ thể (bao gồm cả uống và refill)
   */
  async cancelReminderNotifications(reminderId: string): Promise<void> {
    try {
      const scheduled = await Notifications.getAllScheduledNotificationsAsync();
      const toCancel = scheduled.filter(
        (n) =>
          n.identifier.startsWith(`${reminderId}_`) ||
          n.identifier.startsWith(`refill_${reminderId}_`) ||
          (n.content.data && n.content.data.reminderId === reminderId) ||
          (n.content.data && n.content.data.refillReminderId === reminderId)
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
   * Đã sửa lỗi: Bắt buộc tuân thủ endDate để không bị lặp vô tận
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

    // Chuẩn hóa ngày bắt đầu và kết thúc bắt buộc
    const startBoundary = new Date(reminder.startDate);
    startBoundary.setHours(0, 0, 0, 0);

    const endBoundary = this.computeEndDate(reminder);

    const totalDays = reminder.totalDays || Math.max(1, Math.round((endBoundary.getTime() - startBoundary.getTime()) / (1000 * 60 * 60 * 24)) + 1);

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
      // Khóa cứng: Không bao giờ lên lịch vượt quá ngày kết thúc đã tính
      if (targetDayStart > endBoundary) continue;

      const dayIndex = Math.max(1, Math.round((targetDayStart.getTime() - startBoundary.getTime()) / (1000 * 60 * 60 * 24)) + 1);

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

        // Lấy thông điệp cảm xúc theo buổi trong ngày và tiến trình
        const content = this.getEmotionalNotificationContent(triggerDate, reminder, dayIndex, totalDays);

        await Notifications.scheduleNotificationAsync({
          identifier,
          content: {
            title: content.title,
            body: content.body,
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
   * Lên lịch chuỗi 7 ngày liên tiếp nhắc mua lại thuốc vào 09:00 sáng
   * khi số lượng thuốc chạm ngưỡng 20% còn lại
   */
  async scheduleRefillNotifications(reminder: MedicineReminder): Promise<number> {
    await this.cancelRefillNotifications(reminder.id);

    if (
      !reminder.isEnabled ||
      !reminder.refillEnabled ||
      !reminder.totalDoses ||
      reminder.totalDoses <= 0
    ) {
      return 0;
    }

    const dailyConsumption =
      (reminder.times?.length || 1) * (reminder.dosagePerTime || 1);
    if (dailyConsumption <= 0) return 0;

    const thresholdPct = reminder.refillThresholdPct || 20;
    const thresholdDoses = Math.floor(reminder.totalDoses * (thresholdPct / 100));

    // Số ngày dùng trước khi số thuốc chạm mốc 20% còn lại
    const dosesConsumedBeforeThreshold = reminder.totalDoses - thresholdDoses;
    const daysUntilThreshold = Math.max(0, Math.floor(dosesConsumedBeforeThreshold / dailyConsumption));

    const startDate = new Date(reminder.startDate || new Date());
    startDate.setHours(9, 0, 0, 0); // 09:00 sáng

    const refillStartDate = new Date(startDate);
    refillStartDate.setDate(refillStartDate.getDate() + daysUntilThreshold);

    const endBoundary = this.computeEndDate(reminder);
    const now = new Date();
    let scheduledCount = 0;

    // Lên lịch 7 ngày liên tiếp vào lúc 09:00 sáng
    for (let dayOffset = 0; dayOffset < 7; dayOffset++) {
      const triggerDate = new Date(refillStartDate);
      triggerDate.setDate(triggerDate.getDate() + dayOffset);
      triggerDate.setHours(9, 0, 0, 0);

      // Nếu mốc 09:00 của ngày đó đã trôi qua so với hiện tại thì bỏ qua
      if (triggerDate.getTime() <= now.getTime()) {
        continue;
      }

      // Không lên lịch quá 2 ngày sau khi hết thuốc
      const maxDate = new Date(endBoundary);
      maxDate.setDate(maxDate.getDate() + 2);
      if (triggerDate > maxDate) {
        break;
      }

      const identifier = `refill_${reminder.id}_day${dayOffset}`;
      const dayRemaining = Math.max(1, 7 - dayOffset);

      const refillMessages = [
        `Thuốc ${reminder.medicineName} chỉ còn khoảng 20% liều dùng. Bạn nhớ đặt mua bổ sung để duy trì điều trị liên tục nhé 💙`,
        `Sắp hết ${reminder.medicineName} rồi bạn ơi! Đặt mua ngay hôm nay để nhận thuốc kịp thời nhé 😊`,
        `Duy trì phác đồ uống ${reminder.medicineName} không bị gián đoạn bằng cách đặt mua thuốc mới bạn nhé!`,
      ];
      const selectedMsg = refillMessages[dayOffset % refillMessages.length];

      await Notifications.scheduleNotificationAsync({
        identifier,
        content: {
          title: `🔔 Nhắc mua lại: ${reminder.medicineName}`,
          body: `${selectedMsg} (Còn khoảng ${dayRemaining} ngày nữa là hết)`,
          data: {
            refillReminderId: reminder.id,
            medicineName: reminder.medicineName,
            isRefillReminder: true,
            dayIndex: dayOffset,
          },
          sound: 'default',
          priority: Notifications.AndroidNotificationPriority.HIGH,
        },
        trigger: {
          type: Notifications.SchedulableTriggerInputTypes.DATE,
          date: triggerDate,
          channelId: CHANNEL_ID,
        },
      });

      scheduledCount++;
    }

    console.log(`[Refill] Đã lên lịch ${scheduledCount} thông báo nhắc mua lại thuốc ${reminder.medicineName} lúc 09:00 sáng`);
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
        await this.scheduleRefillNotifications(r);
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
