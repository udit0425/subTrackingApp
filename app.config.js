// Extends app.json with values that only CI sets, so local dev and EAS builds are unaffected.
// - EXPO_BASE_URL: serve the web build from a subpath (e.g. GitHub Pages at /subTrackingApp).
// - ANDROID_VERSION_CODE: increasing build number for APKs built by GitHub Actions,
//   so a new APK installs over the previous one.
module.exports = ({ config }) => {
  const baseUrl = process.env.EXPO_BASE_URL;
  const versionCode = Number(process.env.ANDROID_VERSION_CODE);
  return {
    ...config,
    ...(baseUrl && { experiments: { ...config.experiments, baseUrl } }),
    ...(versionCode > 0 && { android: { ...config.android, versionCode } }),
  };
};
