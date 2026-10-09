// scripts/patch-callkeep.js
// Fixes Gradle 8+ compilation error: "Namespace not specified" on Android

const fs = require('fs');
const path = require('path');

const gradlePath = path.join(
  __dirname,
  '..',
  'node_modules',
  'react-native-callkeep',
  'android',
  'build.gradle'
);

if (fs.existsSync(gradlePath)) {
  let content = fs.readFileSync(gradlePath, 'utf8');

  // 1. Thêm namespace cho Android Gradle Plugin 8+
  if (!content.includes('namespace')) {
    content = content.replace(
      /android\s*\{/,
      'android {\n    namespace "io.wazo.callkeep"'
    );
    fs.writeFileSync(gradlePath, content, 'utf8');
    console.log('[Patch CallKeep] Added namespace "io.wazo.callkeep" to build.gradle');
  } else {
    console.log('[Patch CallKeep] Namespace already exists in build.gradle');
  }
} else {
  console.log('[Patch CallKeep] react-native-callkeep build.gradle not found, skipping.');
}
