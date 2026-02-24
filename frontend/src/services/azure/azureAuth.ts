// ============================================================================
// EFVM360 Frontend — Azure AD / MSAL Integration
// ============================================================================
import { secureLog } from '../security';

const AZURE_CLIENT_ID = import.meta.env.VITE_AZURE_CLIENT_ID || '';
const AZURE_TENANT_ID = import.meta.env.VITE_AZURE_TENANT_ID || '';
const AZURE_REDIRECT_URI = import.meta.env.VITE_AZURE_REDIRECT_URI || window.location.origin;

export const msalConfig = {
  auth: { clientId: AZURE_CLIENT_ID, authority: `https://login.microsoftonline.com/${AZURE_TENANT_ID}`, redirectUri: AZURE_REDIRECT_URI },
  cache: { cacheLocation: 'sessionStorage' as const, storeAuthStateInCookie: false },
};

export const loginWithAzure = async (): Promise<{ accessToken: string } | null> => {
  try {
    // @ts-expect-error optional dependency - @azure/msal-browser may not be installed
    const { PublicClientApplication } = await import('@azure/msal-browser');
    const msalInstance = new PublicClientApplication(msalConfig);
    await msalInstance.initialize();
    const result = await msalInstance.loginPopup({ scopes: ['openid', 'profile', 'email'] });
    return { accessToken: result.accessToken };
  } catch (err) {
    secureLog.error('[EFVM360-Azure] Login failed:', err);
    return null;
  }
};
