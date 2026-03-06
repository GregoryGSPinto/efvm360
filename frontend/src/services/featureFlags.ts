// ============================================================================
// EFVM360 v3.2 — Feature Flags Service
// Env-based with localStorage overrides for testing
// Ready for migration to Unleash/LaunchDarkly when needed
// ============================================================================

export interface FeatureFlags {
  // Authentication
  FEATURE_SSO_AZURE_AD: boolean;     // Azure AD / Entra ID SSO login
  FEATURE_DUAL_AUTH: boolean;         // Allow both SSO + local auth

  // Operational
  FEATURE_OFFLINE_MODE: boolean;      // Service Worker + offline queue
  FEATURE_DASHBOARD_BI: boolean;      // BI+ analytics dashboard
  FEATURE_5S_EVALUATION: boolean;     // 5S perception tool
  FEATURE_DSS_SUGGESTIONS: boolean;   // AI DSS topic suggestions

  // Sync & Audit
  FEATURE_AUDIT_SYNC: boolean;        // Backend audit trail sync
  FEATURE_REAL_TIME_SYNC: boolean;    // WebSocket real-time updates

  // UX
  FEATURE_DARK_MODE_AUTO: boolean;    // Auto dark mode by shift
  FEATURE_ADAMBOOT_CHAT: boolean;     // AdamBoot AI assistant
  FEATURE_PUSH_NOTIFICATIONS: boolean; // Push notification support

  // Compliance
  FEATURE_LGPD_PORTAL: boolean;       // LGPD self-service portal
  FEATURE_SHIFT_UNDERSTANDING: boolean; // Shift understanding confirmation
}

// ── Default Values (env-based) ──────────────────────────────────────────

const ENV_FLAGS: FeatureFlags = {
  FEATURE_SSO_AZURE_AD: import.meta.env.VITE_FEATURE_SSO_AZURE_AD === 'true',
  FEATURE_DUAL_AUTH: import.meta.env.VITE_FEATURE_DUAL_AUTH !== 'false',
  FEATURE_OFFLINE_MODE: import.meta.env.VITE_FEATURE_OFFLINE_MODE !== 'false',
  FEATURE_DASHBOARD_BI: import.meta.env.VITE_FEATURE_DASHBOARD_BI !== 'false',
  FEATURE_5S_EVALUATION: import.meta.env.VITE_FEATURE_5S_EVALUATION !== 'false',
  FEATURE_DSS_SUGGESTIONS: import.meta.env.VITE_FEATURE_DSS_SUGGESTIONS !== 'false',
  FEATURE_AUDIT_SYNC: import.meta.env.VITE_FEATURE_AUDIT_SYNC === 'true',
  FEATURE_REAL_TIME_SYNC: import.meta.env.VITE_FEATURE_REAL_TIME_SYNC === 'true',
  FEATURE_DARK_MODE_AUTO: import.meta.env.VITE_FEATURE_DARK_MODE_AUTO !== 'false',
  FEATURE_ADAMBOOT_CHAT: import.meta.env.VITE_FEATURE_ADAMBOOT_CHAT !== 'false',
  FEATURE_PUSH_NOTIFICATIONS: import.meta.env.VITE_FEATURE_PUSH_NOTIFICATIONS === 'true',
  FEATURE_LGPD_PORTAL: import.meta.env.VITE_FEATURE_LGPD_PORTAL !== 'false',
  FEATURE_SHIFT_UNDERSTANDING: import.meta.env.VITE_FEATURE_SHIFT_UNDERSTANDING !== 'false',
};

// ── Local Overrides (for testing/admin) ─────────────────────────────────

const OVERRIDE_KEY = 'efvm360_feature_overrides';

function getOverrides(): Partial<FeatureFlags> {
  try {
    const raw = localStorage.getItem(OVERRIDE_KEY);
    return raw ? JSON.parse(raw) : {};
  } catch {
    return {};
  }
}

function getResolvedFlags(): FeatureFlags {
  const overrides = getOverrides();
  return { ...ENV_FLAGS, ...overrides };
}

// ── Public API ──────────────────────────────────────────────────────────

export function isFeatureEnabled(flag: keyof FeatureFlags): boolean {
  return getResolvedFlags()[flag] ?? false;
}

export function useFeatureFlag(flag: keyof FeatureFlags): boolean {
  return isFeatureEnabled(flag);
}

export function getAllFlags(): FeatureFlags {
  return getResolvedFlags();
}

// ── Admin Override Functions ─────────────────────────────────────────────

export function setFlagOverride(flag: keyof FeatureFlags, value: boolean): void {
  const overrides = getOverrides();
  overrides[flag] = value;
  localStorage.setItem(OVERRIDE_KEY, JSON.stringify(overrides));
  // [DEBUG] console.log(`[FeatureFlags] Override: ${flag} = ${value}`);
}

export function clearFlagOverride(flag: keyof FeatureFlags): void {
  const overrides = getOverrides();
  delete overrides[flag];
  localStorage.setItem(OVERRIDE_KEY, JSON.stringify(overrides));
  // [DEBUG] console.log(`[FeatureFlags] Cleared override: ${flag}`);
}

export function clearAllOverrides(): void {
  localStorage.removeItem(OVERRIDE_KEY);
  // [DEBUG] console.log('[FeatureFlags] All overrides cleared');
}

export function getFlagSource(flag: keyof FeatureFlags): 'env' | 'override' {
  const overrides = getOverrides();
  return flag in overrides ? 'override' : 'env';
}

// ── Debug (accessible via browser console) ──────────────────────────────

if (import.meta.env.DEV) {
  (window as unknown as Record<string, unknown>).efvm360Flags = {
    getAll: getAllFlags,
    isEnabled: isFeatureEnabled,
    set: setFlagOverride,
    clear: clearFlagOverride,
    clearAll: clearAllOverrides,
  };
}

export default ENV_FLAGS;
