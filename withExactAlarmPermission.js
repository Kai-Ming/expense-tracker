const { withAndroidManifest } = require("@expo/config-plugins");

module.exports = function withExactAlarmPermission(config) {
  return withAndroidManifest(config, async (config) => {
    const androidManifest = config.modResults;

    // Find the permission entry
    const permissions = androidManifest.manifest["uses-permission"] || [];
    const exactAlarmPermission = permissions.find(
      (p) => p.$["android:name"] === "android.permission.SCHEDULE_EXACT_ALARM",
    );

    if (exactAlarmPermission) {
      // Remove the maxSdkVersion attribute that is blocking it
      delete exactAlarmPermission.$["android:maxSdkVersion"];
    }

    return config;
  });
};
