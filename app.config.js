// Extends app.json. EXPO_BASE_URL lets the web build be served from a subpath
// (e.g. GitHub Pages at /subTrackingApp) without affecting local dev or native builds.
module.exports = ({ config }) => {
  const baseUrl = process.env.EXPO_BASE_URL;
  if (!baseUrl) return config;
  return {
    ...config,
    experiments: { ...config.experiments, baseUrl },
  };
};
