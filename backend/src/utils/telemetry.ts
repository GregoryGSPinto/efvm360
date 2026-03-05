// ============================================================================
// VFZ Backend — Telemetry Helper (Azure Application Insights)
// No-op em dev local se App Insights não configurado
// ============================================================================

interface TelemetryClient {
  trackEvent: (t: { name: string; properties?: Record<string, string> }) => void;
  trackMetric: (t: { name: string; value: number }) => void;
  trackException: (t: { exception: Error; properties?: Record<string, string> }) => void;
  trackDependency: (t: { target: string; name: string; duration: number; resultCode: string; success: boolean; dependencyTypeName: string }) => void;
}

let client: TelemetryClient | null = null;

function getClient() {
  if (client) return client;
  try {
    if (process.env.APPLICATIONINSIGHTS_CONNECTION_STRING) {
      const appInsights = require('applicationinsights');
      client = appInsights.defaultClient;
    }
  } catch { /* no-op */ }
  return client;
}

export const trackEvent = (name: string, properties?: Record<string, string>) => {
  getClient()?.trackEvent({ name, properties });
};

export const trackMetric = (name: string, value: number) => {
  getClient()?.trackMetric({ name, value });
};

export const trackException = (error: Error, properties?: Record<string, string>) => {
  getClient()?.trackException({ exception: error, properties });
};

export const trackDependency = (name: string, duration: number, success: boolean) => {
  getClient()?.trackDependency({ target: name, name, duration, resultCode: success ? '200' : '500', success, dependencyTypeName: 'MySQL' });
};
