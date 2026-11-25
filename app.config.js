// Extends app.json with values that only CI sets, so local dev and EAS builds are unaffected.
// ANDROID_VERSION_CODE: increasing build number for APKs built by GitHub Actions,
// so a new APK installs over the previous one.
module.exports = ({ config }) => {
  const versionCode = Number(process.env.ANDROID_VERSION_CODE);
  if (!(versionCode > 0)) return config;
  return { ...config, android: { ...config.android, versionCode } };
};
