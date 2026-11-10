/**
 * Script tự động patch Native Android cho tính năng Báo Động Cháy Cuộc Gọi Đến (Messenger/Zalo CallStyle):
 * 1. Nâng cấp androidx.core:core lên 1.17.0 trong react-native-notify-kit để hỗ trợ NotificationCompat.CallStyle.
 * 2. Đổi AudioAttributes sang USAGE_NOTIFICATION_RINGTONE trong ChannelManager.java để phát qua luồng Nhạc chuông cuộc gọi.
 * 3. Tích hợp NotificationCompat.CallStyle.forIncomingCall (2 nút viên thuốc Đỏ DECLINE / Xanh ANSWER + Avatar) vào NotificationManager.java.
 * 4. Sửa lỗi FullScreenIntent khi không truyền mainComponent và bổ sung hàm triggerNativeFireEmergencyCall chạy trực tiếp từ Native.
 * 5. Bổ sung fallback NotificationManagerCompat.notify trong ForegroundService.java khi Android 14/15 chặn FGS từ nền.
 * 6. Dừng còi, ngắt rung và hủy ForegroundService ngay lập tức ở tầng Native trong ReceiverService.java & NotificationReceiverHandler.java.
 * 7. Hook trực tiếp FirebaseMessagingDelegate.kt của expo-notifications để kích hoạt cuộc gọi báo cháy ngay ở tầng Native (<10ms) khi app ở nền hoặc bị Kill.
 */

const fs = require('fs');
const path = require('path');

function patchFile(relativePath, patchName, transformFn) {
  const fullPath = path.resolve(__dirname, relativePath);
  if (!fs.existsSync(fullPath)) {
    console.log(`[patch-notify-kit] Bo qua ${patchName} (file chua ton tai): ${relativePath}`);
    return;
  }
  const original = fs.readFileSync(fullPath, 'utf8');
  const updated = transformFn(original);
  if (updated !== original) {
    fs.writeFileSync(fullPath, updated, 'utf8');
    console.log(`[patch-notify-kit] DA PATCH THANH CONG: ${patchName}`);
  } else {
    console.log(`[patch-notify-kit] Da duoc patch tu truoc: ${patchName}`);
  }
}

// 1. Patch build.gradle của react-native-notify-kit để dùng androidx.core:core:1.17.0 (hỗ trợ NotificationCompat.CallStyle)
patchFile(
  '../node_modules/react-native-notify-kit/android/build.gradle',
  'react-native-notify-kit/android/build.gradle (androidx.core:1.17.0)',
  (content) => {
    return content.replace(
      /implementation\s+['"]androidx\.core:core:1\.6\.0['"]/g,
      "implementation 'androidx.core:core:1.17.0'"
    );
  }
);

// 2. Patch ChannelManager.java sang USAGE_NOTIFICATION_RINGTONE
patchFile(
  '../node_modules/react-native-notify-kit/android/src/main/java/app/notifee/core/ChannelManager.java',
  'ChannelManager.java (USAGE_NOTIFICATION_RINGTONE)',
  (content) => {
    return content.replace(
      /AudioAttributes\.USAGE_NOTIFICATION\b/g,
      'AudioAttributes.USAGE_NOTIFICATION_RINGTONE'
    );
  }
);

// 3. Patch NotificationManager.java:
// - public class NotificationManager
// - Luôn đính kèm notification bundle & fullScreenLaunchId cho FullScreenIntent
// - Hỗ trợ NotificationCompat.CallStyle.forIncomingCall (2 nút Đỏ/Xanh kiểu Messenger/Zalo)
// - Fallback notify() nếu ForegroundService.start ném lỗi
// - Thêm hàm tĩnh triggerNativeFireEmergencyCall & quản lý Vibrator native
patchFile(
  '../node_modules/react-native-notify-kit/android/src/main/java/app/notifee/core/NotificationManager.java',
  'NotificationManager.java (CallStyle.forIncomingCall + Native Trigger + FullScreenIntent fix)',
  (content) => {
    let next = content;

    // 3.1. Chuyển class NotificationManager thành public class để gọi qua Reflection từ expo-notifications
    next = next.replace(
      /^class NotificationManager \{/m,
      'public class NotificationManager {'
    );

    // 3.2. Sửa lỗi FullScreenIntent luôn đi qua FullScreenNotificationActivity kể cả khi mainComponent == null
    const oldFullScreenBlock = `                        if (fullScreenActionBundle.getMainComponent() != null) {
                          launchIntent.putExtra(
                              "mainComponent", fullScreenActionBundle.getMainComponent());
                          launchIntent.putExtra("notification", notificationModel.toBundle());
                          launchIntent.putExtra(
                              NotificationPendingIntent.PENDING_INTENT_ID_INTENT_KEY,
                              InitialNotificationLedger.issueFullScreenLaunchId());
                          EventBus.postSticky(
                              new MainComponentEvent(fullScreenActionBundle.getMainComponent()));
                        }`;

    const newFullScreenBlock = `                        launchIntent.putExtra("notification", notificationModel.toBundle());
                        launchIntent.putExtra(
                            NotificationPendingIntent.PENDING_INTENT_ID_INTENT_KEY,
                            InitialNotificationLedger.issueFullScreenLaunchId());
                        if (fullScreenActionBundle.getMainComponent() != null) {
                          launchIntent.putExtra(
                              "mainComponent", fullScreenActionBundle.getMainComponent());
                          EventBus.postSticky(
                              new MainComponentEvent(fullScreenActionBundle.getMainComponent()));
                        }`;

    if (next.includes(oldFullScreenBlock)) {
      next = next.replace(oldFullScreenBlock, newFullScreenBlock);
    }

    // 3.2b. Nếu thiết bị đã cấp quyền SYSTEM_ALERT_WINDOW (Display over other apps), chủ động bung FullScreen ngay cả khi màn hình đang sáng
    const oldSetFullScreenLine = `                        builder.setFullScreenIntent(fullScreenPendingIntent, true);`;
    const newSetFullScreenLine = `                        builder.setFullScreenIntent(fullScreenPendingIntent, true);
                        if ("call".equals(androidModel.getCategory())
                            && Build.VERSION.SDK_INT >= Build.VERSION_CODES.M
                            && android.provider.Settings.canDrawOverlays(getApplicationContext())) {
                          try {
                            fullScreenPendingIntent.send();
                          } catch (Exception ignored) {
                          }
                        }`;
    if (next.includes(oldSetFullScreenLine) && !next.includes('canDrawOverlays(getApplicationContext())')) {
      next = next.replace(oldSetFullScreenLine, newSetFullScreenLine);
    }

    // 3.3. Nâng cấp actionsContinuation để hiển thị NotificationCompat.CallStyle.forIncomingCall
    const oldActionsBlock = `                  for (NotificationAndroidActionModel actionBundle : actionBundles) {
                    PendingIntent pendingIntent = null;
                    int targetSdkVersion =
                        ContextHolder.getApplicationContext().getApplicationInfo().targetSdkVersion;
                    NotificationAndroidPressActionModel pressAction = actionBundle.getPressAction();
                    boolean shouldCreateLaunchActivityIntent =
                        NotificationPendingIntent.shouldCreateLaunchActivityIntent(pressAction);
                    if (targetSdkVersion >= Build.VERSION_CODES.S
                        && Build.VERSION.SDK_INT >= Build.VERSION_CODES.S
                        && shouldCreateLaunchActivityIntent) {
                      pendingIntent =
                          NotificationPendingIntent.createIntent(
                              notificationModel.getHashCode(),
                              pressAction.toBundle(),
                              TYPE_ACTION_PRESS,
                              new String[] {"notification", "pressAction"},
                              notificationModel.toBundle(),
                              pressAction.toBundle());
                    } else {
                      pendingIntent =
                          ReceiverService.createIntent(
                              ACTION_PRESS_INTENT,
                              new String[] {"notification", "pressAction"},
                              notificationModel.toBundle(),
                              pressAction.toBundle());
                    }

                    String icon = actionBundle.getIcon();
                    Bitmap iconBitmap = null;

                    if (icon != null) {
                      try {
                        iconBitmap =
                            ResourceUtils.getImageBitmapFromUrl(actionBundle.getIcon())
                                .get(10, TimeUnit.SECONDS);
                      } catch (TimeoutException e) {
                        Logger.e(
                            TAG,
                            "Timeout occurred whilst trying to retrieve an action icon: " + icon,
                            e);
                      } catch (Exception e) {
                        Logger.e(
                            TAG,
                            "An error occurred whilst trying to retrieve an action icon: " + icon,
                            e);
                      }
                    }

                    IconCompat iconCompat = null;
                    if (iconBitmap != null) {
                      iconCompat = IconCompat.createWithAdaptiveBitmap(iconBitmap);
                    }

                    NotificationCompat.Action.Builder actionBuilder =
                        new NotificationCompat.Action.Builder(
                            iconCompat, TextUtils.fromHtml(actionBundle.getTitle()), pendingIntent);

                    RemoteInput remoteInput = actionBundle.getRemoteInput(actionBuilder);
                    if (remoteInput != null) {
                      actionBuilder.addRemoteInput(remoteInput);
                    }

                    builder.addAction(actionBuilder.build());
                  }`;

    const newActionsBlock = `                  ArrayList<PendingIntent> actionPendingIntents = new ArrayList<>();
                  ArrayList<NotificationCompat.Action> builtActions = new ArrayList<>();

                  for (NotificationAndroidActionModel actionBundle : actionBundles) {
                    PendingIntent pendingIntent = null;
                    int targetSdkVersion =
                        ContextHolder.getApplicationContext().getApplicationInfo().targetSdkVersion;
                    NotificationAndroidPressActionModel pressAction = actionBundle.getPressAction();
                    boolean shouldCreateLaunchActivityIntent =
                        NotificationPendingIntent.shouldCreateLaunchActivityIntent(pressAction);
                    if (targetSdkVersion >= Build.VERSION_CODES.S
                        && Build.VERSION.SDK_INT >= Build.VERSION_CODES.S
                        && shouldCreateLaunchActivityIntent) {
                      pendingIntent =
                          NotificationPendingIntent.createIntent(
                              notificationModel.getHashCode(),
                              pressAction.toBundle(),
                              TYPE_ACTION_PRESS,
                              new String[] {"notification", "pressAction"},
                              notificationModel.toBundle(),
                              pressAction.toBundle());
                    } else {
                      pendingIntent =
                          ReceiverService.createIntent(
                              ACTION_PRESS_INTENT,
                              new String[] {"notification", "pressAction"},
                              notificationModel.toBundle(),
                              pressAction.toBundle());
                    }

                    actionPendingIntents.add(pendingIntent);

                    String icon = actionBundle.getIcon();
                    Bitmap iconBitmap = null;

                    if (icon != null) {
                      try {
                        iconBitmap =
                            ResourceUtils.getImageBitmapFromUrl(actionBundle.getIcon())
                                .get(10, TimeUnit.SECONDS);
                      } catch (TimeoutException e) {
                        Logger.e(
                            TAG,
                            "Timeout occurred whilst trying to retrieve an action icon: " + icon,
                            e);
                      } catch (Exception e) {
                        Logger.e(
                            TAG,
                            "An error occurred whilst trying to retrieve an action icon: " + icon,
                            e);
                      }
                    }

                    IconCompat iconCompat = null;
                    if (iconBitmap != null) {
                      iconCompat = IconCompat.createWithAdaptiveBitmap(iconBitmap);
                    }

                    NotificationCompat.Action.Builder actionBuilder =
                        new NotificationCompat.Action.Builder(
                            iconCompat, TextUtils.fromHtml(actionBundle.getTitle()), pendingIntent);

                    RemoteInput remoteInput = actionBundle.getRemoteInput(actionBuilder);
                    if (remoteInput != null) {
                      actionBuilder.addRemoteInput(remoteInput);
                    }

                    builtActions.add(actionBuilder.build());
                  }

                  if ("call".equals(androidModel.getCategory()) && actionPendingIntents.size() >= 2) {
                    try {
                      String callerName = notificationModel.getTitle();
                      if (callerName == null || callerName.trim().isEmpty()) {
                        callerName = "Kho Tổng GSP • ABC Pharmacy";
                      } else {
                        callerName = TextUtils.fromHtml(callerName).toString();
                      }
                      androidx.core.app.Person.Builder personBuilder =
                          new androidx.core.app.Person.Builder()
                              .setName(callerName)
                              .setImportant(true);
                      int appIconId = getApplicationContext().getApplicationInfo().icon;
                      if (appIconId != 0) {
                        personBuilder.setIcon(
                            IconCompat.createWithResource(getApplicationContext(), appIconId));
                      }
                      NotificationCompat.CallStyle callStyle =
                          NotificationCompat.CallStyle.forIncomingCall(
                              personBuilder.build(),
                              actionPendingIntents.get(0),
                              actionPendingIntents.get(1));
                      callStyle.setDeclineButtonColorHint(0xFFEF4444);
                      callStyle.setAnswerButtonColorHint(0xFF22C55E);
                      builder.setStyle(callStyle);
                    } catch (Exception e) {
                      Logger.e(TAG, "Failed to apply CallStyle, falling back to standard actions", e);
                      for (NotificationCompat.Action action : builtActions) {
                        builder.addAction(action);
                      }
                    }
                  } else {
                    for (NotificationCompat.Action action : builtActions) {
                      builder.addAction(action);
                    }
                  }`;

    if (next.includes(oldActionsBlock)) {
      next = next.replace(oldActionsBlock, newActionsBlock);
    }

    // 3.4. Fallback notify() nếu ForegroundService.start bị từ chối hoặc CallStyle bị OS từ chối
    const oldFgsStartBlock = `                if (androidBundle.getAsForegroundService()) {
                  Trace.beginSection("notifee:startForegroundService");
                  try {
                    ForegroundService.start(hashCode, notification, notificationModel.toBundle());
                  } finally {
                    Trace.endSection();
                  }
                }`;

    const prevFgsStartBlock = `                if (androidBundle.getAsForegroundService()) {
                  Trace.beginSection("notifee:startForegroundService");
                  try {
                    ForegroundService.start(hashCode, notification, notificationModel.toBundle());
                  } catch (RuntimeException fgsStartErr) {
                    Logger.w(TAG, "ForegroundService.start denied, falling back to notify()", fgsStartErr);
                    NotificationManagerCompat.from(getApplicationContext())
                        .notify(androidBundle.getTag(), hashCode, notification);
                  } finally {
                    Trace.endSection();
                  }
                }`;

    const newFgsStartBlock = `                if (androidBundle.getAsForegroundService()) {
                  Trace.beginSection("notifee:startForegroundService");
                  try {
                    ForegroundService.start(hashCode, notification, notificationModel.toBundle());
                  } catch (RuntimeException fgsStartErr) {
                    Logger.w(TAG, "ForegroundService.start denied, falling back to notify()", fgsStartErr);
                    notifyWithCallStyleFallback(
                        getApplicationContext(), androidBundle.getTag(), hashCode, notification);
                  } finally {
                    Trace.endSection();
                  }
                }`;

    if (next.includes(oldFgsStartBlock)) {
      next = next.replace(oldFgsStartBlock, newFgsStartBlock);
    } else if (next.includes(prevFgsStartBlock)) {
      next = next.replace(prevFgsStartBlock, newFgsStartBlock);
    }

    const oldDirectNotifyBlock = `                  NotificationManagerCompat.from(context)
                      .notify(androidBundle.getTag(), hashCode, notification);`;
    const newDirectNotifyBlock = `                  notifyWithCallStyleFallback(
                      context, androidBundle.getTag(), hashCode, notification);`;
    if (next.includes(oldDirectNotifyBlock)) {
      next = next.replace(oldDirectNotifyBlock, newDirectNotifyBlock);
    }

    // 3.5. Dừng rung phần cứng khi cancel notification fire_emergency_active_alert
    const oldCancelLine = `                      // Cancel a notification created with notifee
                      notificationManagerCompat.cancel(tag, id.hashCode());`;

    const newCancelLine = `                      // Cancel a notification created with notifee
                      notificationManagerCompat.cancel(tag, id.hashCode());
                      if ("fire_emergency_active_alert".equals(id)) {
                        stopNativeEmergencyVibration(getApplicationContext());
                      }`;

    if (next.includes(oldCancelLine) && !next.includes('stopNativeEmergencyVibration(getApplicationContext())')) {
      next = next.replace(oldCancelLine, newCancelLine);
    }

    // 3.6. Bổ sung các hàm tĩnh notifyWithCallStyleFallback, startNativeEmergencyVibration, stopNativeEmergencyVibration, triggerNativeFireEmergencyCall
    if (!next.includes('notifyWithCallStyleFallback')) {
      const fallbackHelper = `
  public static void notifyWithCallStyleFallback(
      Context context, String tag, int id, Notification notification) {
    try {
      NotificationManagerCompat.from(context).notify(tag, id, notification);
    } catch (RuntimeException e) {
      Logger.w(TAG, "CallStyle notify() rejected by OS, retrying with standard high-priority template", e);
      if (notification != null && notification.extras != null) {
        notification.extras.remove("android.template");
        notification.extras.remove("android.callType");
      }
      NotificationManagerCompat.from(context).notify(tag, id, notification);
    }
  }
`;
      if (next.includes('public static void startNativeEmergencyVibration')) {
        next = next.replace(
          '  public static void startNativeEmergencyVibration',
          fallbackHelper + '\n  public static void startNativeEmergencyVibration'
        );
      }
    }

    if (!next.includes('triggerNativeFireEmergencyCall')) {
      const helperMethods = `
  public static void notifyWithCallStyleFallback(
      Context context, String tag, int id, Notification notification) {
    try {
      NotificationManagerCompat.from(context).notify(tag, id, notification);
    } catch (RuntimeException e) {
      Logger.w(TAG, "CallStyle notify() rejected by OS, retrying with standard high-priority template", e);
      if (notification != null && notification.extras != null) {
        notification.extras.remove("android.template");
        notification.extras.remove("android.callType");
      }
      NotificationManagerCompat.from(context).notify(tag, id, notification);
    }
  }

  public static void startNativeEmergencyVibration(Context context) {
    try {
      if (context == null) return;
      android.os.Vibrator vibrator =
          (android.os.Vibrator) context.getSystemService(Context.VIBRATOR_SERVICE);
      if (vibrator != null && vibrator.hasVibrator()) {
        long[] pattern = new long[] {0, 1000, 500, 1000, 500, 1000};
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O) {
          vibrator.vibrate(android.os.VibrationEffect.createWaveform(pattern, 0));
        } else {
          vibrator.vibrate(pattern, 0);
        }
      }
    } catch (Exception e) {
      Logger.w(TAG, "Unable to start native emergency vibration", e);
    }
  }

  public static void stopNativeEmergencyVibration(Context context) {
    try {
      if (context == null) return;
      android.os.Vibrator vibrator =
          (android.os.Vibrator) context.getSystemService(Context.VIBRATOR_SERVICE);
      if (vibrator != null) {
        vibrator.cancel();
      }
    } catch (Exception e) {
      Logger.w(TAG, "Unable to stop native emergency vibration", e);
    }
  }

  public static void triggerNativeFireEmergencyCall(
      Context context, java.util.Map<String, String> data) {
    try {
      if (context != null && ContextHolder.getApplicationContext() == null) {
        ContextHolder.setApplicationContext(context.getApplicationContext());
      }
      Context appContext =
          ContextHolder.getApplicationContext() != null
              ? ContextHolder.getApplicationContext()
              : context;
      if (appContext == null || data == null) return;

      String channelId = "fire_emergency_ring_v8";
      String title = data.get("alertTitle");
      if (title == null || title.isEmpty()) {
        title = data.get("title");
      }
      if (title == null || title.isEmpty()) {
        title = "BÁO ĐỘNG HỎA HOẠN KHO TỔNG";
      }

      String body = data.get("alertBody");
      if (body == null || body.isEmpty()) {
        body = data.get("body");
      }
      String deviceId =
          data.get("deviceId") != null ? data.get("deviceId") : "ESP32S3_404CCA44C814";
      String temp = data.get("temp") != null ? data.get("temp") : "65.0";
      String isTest = data.get("isTest") != null ? data.get("isTest") : "false";
      if (body == null || body.isEmpty()) {
        body = "Nhiệt độ " + temp + "°C • Trạm " + deviceId;
      }

      Bundle channelBundle = new Bundle();
      channelBundle.putString("id", channelId);
      channelBundle.putString("name", "Báo Động Hỏa Hoạn Khẩn Cấp (Đổ Chuông)");
      channelBundle.putInt("importance", 4);
      channelBundle.putString("sound", "content://settings/system/ringtone");
      channelBundle.putBoolean("vibration", true);
      channelBundle.putBoolean("bypassDnd", true);
      channelBundle.putBoolean("lights", true);
      channelBundle.putString("lightColor", "#DC2626");
      channelBundle.putInt("visibility", 1);
      try {
        ChannelManager.createChannel(app.notifee.core.model.ChannelModel.fromBundle(channelBundle))
            .get(2, TimeUnit.SECONDS);
      } catch (Exception ignored) {
      }

      startNativeEmergencyVibration(appContext);

      Bundle notificationBundle = new Bundle();
      notificationBundle.putString("id", "fire_emergency_active_alert");
      notificationBundle.putString("title", title);
      notificationBundle.putString("subtitle", "Kho Tổng GSP • ABC Pharmacy");
      notificationBundle.putString("body", "Nhiệt độ " + temp + "°C • Trạm " + deviceId);

      Bundle dataBundle = new Bundle();
      dataBundle.putString("type", "FIRE_EMERGENCY");
      dataBundle.putString("title", title);
      dataBundle.putString("body", body);
      dataBundle.putString("deviceId", deviceId);
      dataBundle.putString("temp", temp);
      dataBundle.putString("isTest", isTest);
      notificationBundle.putBundle("data", dataBundle);

      Bundle androidBundle = new Bundle();
      androidBundle.putString("channelId", channelId);
      androidBundle.putBoolean("lightUpScreen", true);
      androidBundle.putString("category", "call");
      androidBundle.putInt("importance", 4);
      androidBundle.putInt("visibility", 1);
      androidBundle.putBoolean("loopSound", true);
      androidBundle.putString("sound", "content://settings/system/ringtone");
      androidBundle.putBoolean("ongoing", true);
      androidBundle.putBoolean("autoCancel", false);
      androidBundle.putString("color", "#DC2626");
      androidBundle.putBoolean("asForegroundService", true);

      Bundle fullScreenAction = new Bundle();
      fullScreenAction.putString("id", "default");
      fullScreenAction.putString("launchActivity", "default");
      androidBundle.putBundle("fullScreenAction", fullScreenAction);

      Bundle pressAction = new Bundle();
      pressAction.putString("id", "default");
      pressAction.putString("launchActivity", "default");
      androidBundle.putBundle("pressAction", pressAction);

      ArrayList<Bundle> actions = new ArrayList<>();
      Bundle declineAction = new Bundle();
      declineAction.putString("title", "TẮT CÒI");
      Bundle declinePress = new Bundle();
      declinePress.putString("id", "stop_alarm");
      declineAction.putBundle("pressAction", declinePress);
      actions.add(declineAction);

      Bundle answerAction = new Bundle();
      answerAction.putString("title", "TIẾP NHẬN");
      Bundle answerPress = new Bundle();
      answerPress.putString("id", "answer_alarm");
      answerPress.putString("launchActivity", "default");
      answerAction.putBundle("pressAction", answerPress);
      actions.add(answerAction);

      androidBundle.putParcelableArrayList("actions", actions);
      notificationBundle.putBundle("android", androidBundle);

      app.notifee.core.utility.PowerManagerUtils.lightUpScreenIfNeeded(appContext);
      displayNotification(NotificationModel.fromBundle(notificationBundle), null)
          .get(5, TimeUnit.SECONDS);
    } catch (Exception e) {
      Logger.e(TAG, "Failed to triggerNativeFireEmergencyCall", e);
    }
  }
}
`;
      next = next.replace(/\}\s*$/, helperMethods);
    } else if (next.includes('displayNotification(NotificationModel.fromBundle(notificationBundle), null);')) {
      next = next.replace(
        'displayNotification(NotificationModel.fromBundle(notificationBundle), null);',
        `app.notifee.core.utility.PowerManagerUtils.lightUpScreenIfNeeded(appContext);\n      displayNotification(NotificationModel.fromBundle(notificationBundle), null)\n          .get(5, TimeUnit.SECONDS);`
      );
    }

    return next;
  }
);

// 4. Patch ForegroundService.java để fallback shortService (2048) + notify() và bảo vệ CallStyle trên Android 14/15
patchFile(
  '../node_modules/react-native-notify-kit/android/src/main/java/app/notifee/core/ForegroundService.java',
  'ForegroundService.java (Fallback shortService 2048 & notify on deniedInitialPromotion & CallStyle guard)',
  (content) => {
    let next = content;

    const oldStartFgTry = `                  try {
                    startForeground(hashCode, notification, foregroundServiceType);
                  } catch (RuntimeException e) {`;
    const prevStartFgTry = `                  try {
                    try {
                      startForeground(hashCode, notification, foregroundServiceType);
                    } catch (IllegalArgumentException callStyleErr) {
                      if (notification.extras != null) {
                        notification.extras.remove("android.template");
                        notification.extras.remove("android.callType");
                      }
                      startForeground(hashCode, notification, foregroundServiceType);
                    }
                  } catch (RuntimeException e) {`;
    const newStartFgTry = `                  try {
                    try {
                      try {
                        startForeground(hashCode, notification, foregroundServiceType);
                      } catch (RuntimeException fgsTypeErr) {
                        if (Build.VERSION.SDK_INT >= 34 && foregroundServiceType != 2048) {
                          foregroundServiceType = 2048; // ServiceInfo.FOREGROUND_SERVICE_TYPE_SHORT_SERVICE
                          startForeground(hashCode, notification, foregroundServiceType);
                        } else {
                          throw fgsTypeErr;
                        }
                      }
                    } catch (IllegalArgumentException callStyleErr) {
                      if (notification.extras != null) {
                        notification.extras.remove("android.template");
                        notification.extras.remove("android.callType");
                      }
                      startForeground(hashCode, notification, foregroundServiceType);
                    }
                  } catch (RuntimeException e) {`;
    if (next.includes(prevStartFgTry)) {
      next = next.replace(prevStartFgTry, newStartFgTry);
    } else if (next.includes(oldStartFgTry) && !next.includes('callStyleErr')) {
      next = next.replace(oldStartFgTry, newStartFgTry);
    }

    const oldUpdateNotify = `                } else {
                  NotificationManagerCompat.from(ContextHolder.getApplicationContext())
                      .notify(mCurrentHashCode, notification);
                }`;
    const newUpdateNotify = `                } else {
                  app.notifee.core.NotificationManager.notifyWithCallStyleFallback(
                      ContextHolder.getApplicationContext(), null, mCurrentHashCode, notification);
                }`;
    if (next.includes(oldUpdateNotify)) {
      next = next.replace(oldUpdateNotify, newUpdateNotify);
    }

    const prevDeniedBlock = `          if (deniedInitialPromotion != null) {
            try {
              NotificationManagerCompat.from(this)
                  .notify(notificationModel.getAndroid().getTag(), hashCode, notification);
            } catch (Exception ignored) {}`;
    const target = `          if (deniedInitialPromotion != null) {`;
    const replacement = `          if (deniedInitialPromotion != null) {
            try {
              app.notifee.core.NotificationManager.notifyWithCallStyleFallback(
                  this, notificationModel.getAndroid().getTag(), hashCode, notification);
            } catch (Exception ignored) {}`;
    if (next.includes(prevDeniedBlock)) {
      next = next.replace(prevDeniedBlock, replacement);
    } else if (next.includes(target) && !next.includes('notifyWithCallStyleFallback')) {
      next = next.replace(target, replacement);
    }
    return next;
  }
);

// 5. Patch ReceiverService.java để tắt còi + hủy rung + dừng ForegroundService ngay ở tầng Native khi bấm nút DECLINE / ANSWER
patchFile(
  '../node_modules/react-native-notify-kit/android/src/main/java/app/notifee/core/ReceiverService.java',
  'ReceiverService.java (Immediate native stop on stop_alarm / answer_alarm)',
  (content) => {
    const target = `    EventBus.post(new NotificationEvent(TYPE_ACTION_PRESS, notificationModel, extras));`;
    const replacement = `    EventBus.post(new NotificationEvent(TYPE_ACTION_PRESS, notificationModel, extras));

    if ("stop_alarm".equals(pressActionBundle.getId())
        || "decline_alarm".equals(pressActionBundle.getId())
        || "answer_alarm".equals(pressActionBundle.getId())) {
      NotificationManager.stopNativeEmergencyVibration(getApplicationContext());
      ForegroundService.stop();
      NotificationManagerCompat.from(getApplicationContext())
          .cancel(notificationAndroidModel.getTag(), notificationModel.getId().hashCode());
    }`;
    if (content.includes(target) && !content.includes('NotificationManager.stopNativeEmergencyVibration')) {
      return content.replace(target, replacement);
    }
    return content;
  }
);

// 6. Patch NotificationReceiverHandler.java (Android 12+ Activity PendingIntent cho nút ANSWER)
patchFile(
  '../node_modules/react-native-notify-kit/android/src/main/java/app/notifee/core/NotificationReceiverHandler.java',
  'NotificationReceiverHandler.java (Immediate native stop on answer_alarm)',
  (content) => {
    const target = `    if (notificationModel.getAndroid().getAutoCancel()) {`;
    const replacement = `    if ("stop_alarm".equals(pressActionBundle.getId())
        || "decline_alarm".equals(pressActionBundle.getId())
        || "answer_alarm".equals(pressActionBundle.getId())) {
      NotificationManager.stopNativeEmergencyVibration(context);
      ForegroundService.stop();
      NotificationManagerCompat.from(context)
          .cancel(notificationModel.getAndroid().getTag(), notificationModel.getId().hashCode());
    }

    if (notificationModel.getAndroid().getAutoCancel()) {`;
    if (content.includes(target) && !content.includes('NotificationManager.stopNativeEmergencyVibration')) {
      return content.replace(target, replacement);
    }
    return content;
  }
);

// 7. Patch FirebaseMessagingDelegate.kt của expo-notifications để kích hoạt trực tiếp CallStyle từ tầng Native khi nhận FCM
patchFile(
  '../node_modules/expo-notifications/android/src/main/java/expo/modules/notifications/service/delegates/FirebaseMessagingDelegate.kt',
  'FirebaseMessagingDelegate.kt (Native FCM Fire Emergency Call trigger + early return)',
  (content) => {
    const prevPatched = `  override fun onMessageReceived(remoteMessage: RemoteMessage) {
    if (remoteMessage.data["type"] == "FIRE_EMERGENCY" && !ExpoHandlingDelegate(context).isAppInForeground()) {
      try {
        val clazz = Class.forName("app.notifee.core.NotificationManager")
        val method = clazz.getMethod("triggerNativeFireEmergencyCall", Context::class.java, java.util.Map::class.java)
        method.invoke(null, context.applicationContext, remoteMessage.data)
      } catch (e: Throwable) {
        android.util.Log.e("FireEmergencyFCM", "Failed to trigger native fire emergency call", e)
      }
    }`;
    const target = `  override fun onMessageReceived(remoteMessage: RemoteMessage) {`;
    const replacement = `  override fun onMessageReceived(remoteMessage: RemoteMessage) {
    if (remoteMessage.data["type"] == "FIRE_EMERGENCY" && !ExpoHandlingDelegate(context).isAppInForeground()) {
      try {
        val clazz = Class.forName("app.notifee.core.NotificationManager")
        val method = clazz.getMethod("triggerNativeFireEmergencyCall", Context::class.java, java.util.Map::class.java)
        method.invoke(null, context.applicationContext, remoteMessage.data)
        return
      } catch (e: Throwable) {
        android.util.Log.e("FireEmergencyFCM", "Failed to trigger native fire emergency call", e)
      }
    }`;
    if (content.includes(prevPatched)) {
      return content.replace(prevPatched, replacement);
    }
    if (content.includes(target) && !content.includes('triggerNativeFireEmergencyCall')) {
      return content.replace(target, replacement);
    }
    return content;
  }
);

// 8. Patch PowerManagerUtils.java để giữ WakeLock sáng màn hình 15s (đủ thời gian cho React Native cold-boot từ trạng thái Killed)
patchFile(
  '../node_modules/react-native-notify-kit/android/src/main/java/app/notifee/core/utility/PowerManagerUtils.java',
  'PowerManagerUtils.java (15s WakeLock for cold-boot FullScreen)',
  (content) => {
    return content
      .replace(/wl\.acquire\(3000L\);/g, 'wl.acquire(15000L);')
      .replace(/wl_cpu\.acquire\(3000L\);/g, 'wl_cpu.acquire(15000L);');
  }
);

// 9. Patch FullScreenNotificationActivity.java để đảm bảo bật sáng và vượt màn hình khóa trên Android 8.1 -> 15
patchFile(
  '../node_modules/react-native-notify-kit/android/src/main/java/app/notifee/core/FullScreenNotificationActivity.java',
  'FullScreenNotificationActivity.java (setShowWhenLocked + setTurnScreenOn + requestDismissKeyguard)',
  (content) => {
    const target = `    getWindow()
        .addFlags(
            WindowManager.LayoutParams.FLAG_SHOW_WHEN_LOCKED
                | WindowManager.LayoutParams.FLAG_TURN_SCREEN_ON);`;
    const replacement = `    if (android.os.Build.VERSION.SDK_INT >= android.os.Build.VERSION_CODES.O_MR1) {
      setShowWhenLocked(true);
      setTurnScreenOn(true);
    }
    if (android.os.Build.VERSION.SDK_INT >= android.os.Build.VERSION_CODES.O) {
      android.app.KeyguardManager km =
          (android.app.KeyguardManager) getSystemService(android.content.Context.KEYGUARD_SERVICE);
      if (km != null) {
        km.requestDismissKeyguard(this, null);
      }
    }
    getWindow()
        .addFlags(
            WindowManager.LayoutParams.FLAG_SHOW_WHEN_LOCKED
                | WindowManager.LayoutParams.FLAG_TURN_SCREEN_ON
                | WindowManager.LayoutParams.FLAG_KEEP_SCREEN_ON
                | WindowManager.LayoutParams.FLAG_DISMISS_KEYGUARD);`;
    if (content.includes(target) && !content.includes('requestDismissKeyguard')) {
      return content.replace(target, replacement);
    }
    return content;
  }
);
