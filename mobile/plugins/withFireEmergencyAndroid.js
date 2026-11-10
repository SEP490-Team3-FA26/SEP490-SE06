const {
  withAndroidManifest,
  withProjectBuildGradle,
  withGradleProperties,
  withMainActivity,
} = require('@expo/config-plugins');

/**
 * Expo Config Plugin cấu hình Android Manifest, MainActivity và Gradle cho tính năng Báo động Khẩn cấp:
 * - Bật sáng màn hình và hiển thị đè lên màn hình khóa (showWhenLocked, turnScreenOn, FLAG_KEEP_SCREEN_ON, requestDismissKeyguard)
 * - Đảm bảo quyền USE_FULL_SCREEN_INTENT và Foreground Service Media Playback + ShortService (Android 14/15) cho Notifee
 * - Rút ngắn CMake staging directory trên Windows để tránh lỗi Ninja MAX_PATH 260 ký tự
 * - Cấu hình chỉ build chip ARM64 (arm64-v8a) cho máy thật để giảm dung lượng file APK và tăng tốc độ build
 */
const withFireEmergencyAndroid = (config) => {
  // Cấu hình chỉ build riêng kiến trúc arm64-v8a (máy thật) để giảm dung lượng file APK từ ~100MB xuống ~35-45MB
  config = withGradleProperties(config, (config) => {
    const existing = config.modResults.find(
      (item) => item.type === 'property' && item.key === 'reactNativeArchitectures'
    );
    if (existing) {
      existing.value = 'arm64-v8a';
    } else {
      config.modResults.push({
        type: 'property',
        key: 'reactNativeArchitectures',
        value: 'arm64-v8a',
      });
    }
    return config;
  });

  // Tiêm cờ bật sáng màn hình và vượt màn hình khóa trực tiếp vào MainActivity.onCreate
  config = withMainActivity(config, (config) => {
    const isKotlin = config.modResults.language === 'kt';
    const contents = config.modResults.contents;

    if (isKotlin && !contents.includes('FLAG_SHOW_WHEN_LOCKED')) {
      const ktSnippet = `    if (android.os.Build.VERSION.SDK_INT >= android.os.Build.VERSION_CODES.O_MR1) {
      setShowWhenLocked(true)
      setTurnScreenOn(true)
    }
    window.addFlags(
      android.view.WindowManager.LayoutParams.FLAG_SHOW_WHEN_LOCKED or
      android.view.WindowManager.LayoutParams.FLAG_TURN_SCREEN_ON or
      android.view.WindowManager.LayoutParams.FLAG_KEEP_SCREEN_ON or
      android.view.WindowManager.LayoutParams.FLAG_DISMISS_KEYGUARD
    )`;
      config.modResults.contents = contents.replace(
        /super\.onCreate\([^\)]*\)/,
        (match) => `${match}\n${ktSnippet}`
      );
    } else if (!isKotlin && !contents.includes('FLAG_SHOW_WHEN_LOCKED')) {
      const javaSnippet = `    if (android.os.Build.VERSION.SDK_INT >= android.os.Build.VERSION_CODES.O_MR1) {
      setShowWhenLocked(true);
      setTurnScreenOn(true);
    }
    getWindow().addFlags(
      android.view.WindowManager.LayoutParams.FLAG_SHOW_WHEN_LOCKED |
      android.view.WindowManager.LayoutParams.FLAG_TURN_SCREEN_ON |
      android.view.WindowManager.LayoutParams.FLAG_KEEP_SCREEN_ON |
      android.view.WindowManager.LayoutParams.FLAG_DISMISS_KEYGUARD
    );`;
      config.modResults.contents = contents.replace(
        /super\.onCreate\([^\)]*\);/,
        (match) => `${match}\n${javaSnippet}`
      );
    }
    return config;
  });
  config = withProjectBuildGradle(config, (config) => {
    if (config.modResults.language === 'groovy') {
      const snippet = `
subprojects { subproject ->
  if (subproject.name != 'app' && System.getProperty("os.name").toLowerCase().contains("windows")) {
    subproject.plugins.withId('com.android.library') {
      subproject.android.externalNativeBuild.cmake.buildStagingDirectory = file("C:/cxx/\${subproject.name}")
    }
  }
}`;
      if (!config.modResults.contents.includes('C:/cxx/')) {
        config.modResults.contents += `\n${snippet}\n`;
      }
    }
    return config;
  });

  return withAndroidManifest(config, async (config) => {
    const manifest = config.modResults.manifest;

    if (!manifest['uses-permission']) {
      manifest['uses-permission'] = [];
    }

    const requiredPermissions = [
      'android.permission.USE_FULL_SCREEN_INTENT',
      'android.permission.WAKE_LOCK',
      'android.permission.DISABLE_KEYGUARD',
      'android.permission.FOREGROUND_SERVICE',
      'android.permission.FOREGROUND_SERVICE_MEDIA_PLAYBACK',
      'android.permission.POST_NOTIFICATIONS',
      'android.permission.VIBRATE',
      'android.permission.RECEIVE_BOOT_COMPLETED',
      'android.permission.SYSTEM_ALERT_WINDOW',
    ];

    for (const perm of requiredPermissions) {
      const exists = manifest['uses-permission'].some(
        (p) => p.$ && p.$['android:name'] === perm
      );
      if (!exists) {
        manifest['uses-permission'].push({
          $: { 'android:name': perm },
        });
      }
    }

    const application = manifest.application?.[0];
    if (application) {
      // Cho phép HTTP cleartext khi test APK với Backend local (LAN IP)
      if (!application.$) {
        application.$ = {};
      }
      application.$['android:usesCleartextTraffic'] = 'true';

      // Cấu hình MainActivity bật sáng màn hình và hiển thị khi khóa máy
      const activities = application.activity || [];
      for (const activity of activities) {
        if (activity.$ && activity.$['android:name'] === '.MainActivity') {
          activity.$['android:showWhenLocked'] = 'true';
          activity.$['android:turnScreenOn'] = 'true';
        }
      }

      // Đảm bảo Notifee ForegroundService khai báo cả mediaPlayback và shortService (vượt rào cản Android 14/15 khi nhận FCM từ nền)
      if (!application.service) {
        application.service = [];
      }
      const existingService = application.service.find(
        (s) => s.$ && s.$['android:name'] === 'app.notifee.core.ForegroundService'
      );
      if (existingService) {
        existingService.$['android:foregroundServiceType'] = 'mediaPlayback|shortService';
        existingService.$['android:exported'] = 'false';
      } else {
        application.service.push({
          $: {
            'android:name': 'app.notifee.core.ForegroundService',
            'android:exported': 'false',
            'android:foregroundServiceType': 'mediaPlayback|shortService',
          },
        });
      }
    }

    return config;
  });
};

module.exports = withFireEmergencyAndroid;

