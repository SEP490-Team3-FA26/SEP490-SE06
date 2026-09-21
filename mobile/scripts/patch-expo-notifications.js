// scripts/patch-expo-notifications.js
// Fixes runtime crash on Expo Go (Android SDK 53+) where push modules were removed from Expo Go client

const fs = require('fs');
const path = require('path');

const expoNotificationsDir = path.join(__dirname, '..', 'node_modules', 'expo-notifications');

function patchFile(relPath, replacer) {
  const fullPath = path.join(expoNotificationsDir, relPath);
  if (fs.existsSync(fullPath)) {
    const original = fs.readFileSync(fullPath, 'utf8');
    const patched = replacer(original);
    if (original !== patched) {
      fs.writeFileSync(fullPath, patched, 'utf8');
      console.log(`[Patch] Successfully patched: ${relPath}`);
    } else {
      console.log(`[Patch] Already up-to-date: ${relPath}`);
    }
  }
}

// 1. Patch warnOfExpoGoPushUsage
const patchWarnUsage = (content) => {
  return content.replace(
    /if\s*\(Platform\.OS\s*===\s*'android'\)\s*\{\s*throw\s+new\s+Error\(message\);\s*\}/g,
    'if (Platform.OS === \'android\') { didWarn = true; console.warn(message); }'
  ).replace('throw new Error(message);', 'didWarn = true; console.warn(message);');
};

patchFile('build/warnOfExpoGoPushUsage.js', patchWarnUsage);
patchFile('src/warnOfExpoGoPushUsage.ts', patchWarnUsage);

// 2. Patch TopicSubscriptionModule.android
const patchTopicSubscription = () => `import { requireNativeModule } from 'expo-modules-core';
let mod = null;
try {
  mod = requireNativeModule('ExpoTopicSubscriptionModule');
} catch (e) {
  mod = {
    subscribeToTopicAsync: async () => {},
    unsubscribeFromTopicAsync: async () => {},
  };
}
export default mod;
`;
patchFile('build/TopicSubscriptionModule.android.js', patchTopicSubscription);
patchFile('src/TopicSubscriptionModule.android.ts', patchTopicSubscription);

// 3. Patch ServerRegistrationModule.native
const patchServerRegistration = () => `import { requireNativeModule } from 'expo-modules-core';
let mod = null;
try {
  mod = requireNativeModule('NotificationsServerRegistrationModule');
} catch (e) {
  mod = {
    getRegistrationInfoAsync: async () => null,
    setRegistrationInfoAsync: async () => {},
  };
}
export default mod;
`;
patchFile('build/ServerRegistrationModule.native.js', patchServerRegistration);
patchFile('src/ServerRegistrationModule.native.ts', patchServerRegistration);

// 4. Patch PushTokenManager.native
const patchPushTokenManager = () => `import { requireNativeModule } from 'expo-modules-core';
let mod = null;
try {
  mod = requireNativeModule('ExpoPushTokenManager');
} catch (e) {
  mod = {
    addListener: () => ({ remove: () => {} }),
    removeListeners: () => {},
    getDevicePushTokenAsync: async () => 'EXPO_GO_SIMULATED_TOKEN',
  };
}
export default mod;
`;
patchFile('build/PushTokenManager.native.js', patchPushTokenManager);
patchFile('src/PushTokenManager.native.ts', patchPushTokenManager);

// 5. Patch BackgroundNotificationTasksModule.native
const patchBgTasks = () => `import { requireNativeModule } from 'expo-modules-core';
let mod = null;
try {
  mod = requireNativeModule('ExpoBackgroundNotificationTasksModule');
} catch (e) {
  mod = {
    registerTaskAsync: async () => {},
    unregisterTaskAsync: async () => {},
  };
}
export default mod;
`;
patchFile('build/BackgroundNotificationTasksModule.native.js', patchBgTasks);
patchFile('src/BackgroundNotificationTasksModule.native.ts', patchBgTasks);

// 6. Patch BadgeModule.native
const patchBadge = () => `import { requireNativeModule } from 'expo-modules-core';
let nativeModule = null;
try {
  nativeModule = requireNativeModule('ExpoBadgeModule');
} catch (e) {
  nativeModule = {
    getBadgeCountAsync: async () => 0,
    setBadgeCountAsync: async () => false,
  };
}
export default {
  ...nativeModule,
  setBadgeCountAsync: async (badgeCount, options) => {
    return await nativeModule?.setBadgeCountAsync?.(badgeCount);
  },
};
`;
patchFile('build/BadgeModule.native.js', patchBadge);
patchFile('src/BadgeModule.native.ts', patchBadge);

console.log('[Patch] All expo-notifications patches applied successfully!');
