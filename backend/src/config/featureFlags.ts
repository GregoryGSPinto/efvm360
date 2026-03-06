// ============================================================================
// EFVM360 Backend — Feature Flags
// ============================================================================
export const FEATURES = {
  SSO_AZURE_AD: process.env.FEATURE_SSO_AZURE_AD === 'true',
  OFFLINE_MODE: process.env.FEATURE_OFFLINE_MODE !== 'false',
  DASHBOARD_BI: process.env.FEATURE_DASHBOARD_BI !== 'false',
  AUDIT_SYNC: process.env.FEATURE_AUDIT_SYNC === 'true',
};

export const isEnabled = (flag: keyof typeof FEATURES): boolean => FEATURES[flag] ?? false;
