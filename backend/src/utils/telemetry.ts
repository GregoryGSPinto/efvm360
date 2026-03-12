// ============================================================================
// EFVM360 Backend — Telemetry Helper (Azure Application Insights)
// No-op em dev local se App Insights não configurado
// ============================================================================

interface TelemetryClient {
  trackEvent: (t: { name: string; properties?: Record<string, string> }) => void;
  trackMetric: (t: { name: string; value: number }) => void;
  trackException: (t: { exception: Error; properties?: Record<string, string> }) => void;
  trackDependency: (t: { target: string; name: string; duration: number; resultCode: string; success: boolean; dependencyTypeName: string }) => void;
}

let client: TelemetryClient | null = null;

async function resolveClientModule(): Promise<TelemetryClient | null> {
  const importAppInsights = new Function('return import("applicationinsights")') as () => Promise<{ defaultClient: TelemetryClient }>;
  const appInsights = await importAppInsights();
  return appInsights.defaultClient;
}

function getClient() {
  if (client) return client;
  return client;
}

const withClient = async (callback: (currentClient: TelemetryClient) => void): Promise<void> => {
  const currentClient = getClient();
  if (currentClient) {
    callback(currentClient);
    return;
  }

  if (!process.env.APPLICATIONINSIGHTS_CONNECTION_STRING) {
    return;
  }

  try {
    client = await resolveClientModule();
    if (client) {
      callback(client);
    }
  } catch {
    client = null;
  }
};

export const trackEvent = (name: string, properties?: Record<string, string>) => {
  void withClient((currentClient) => {
    currentClient.trackEvent({ name, properties });
  });
};

export const trackMetric = (name: string, value: number) => {
  void withClient((currentClient) => {
    currentClient.trackMetric({ name, value });
  });
};

export const trackException = (error: Error, properties?: Record<string, string>) => {
  void withClient((currentClient) => {
    currentClient.trackException({ exception: error, properties });
  });
};

export const trackDependency = (name: string, duration: number, success: boolean) => {
  getClient()?.trackDependency({ target: name, name, duration, resultCode: success ? '200' : '500', success, dependencyTypeName: 'MySQL' });
};
