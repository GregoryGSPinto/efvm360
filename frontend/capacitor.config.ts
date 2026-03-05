import type { CapacitorConfig } from '@capacitor/cli';

const config: CapacitorConfig = {
  appId: 'com.efvm360.app',
  appName: 'EFVM360',
  webDir: 'dist',
  server: {
    // Allow mixed content for dev; in production the app is fully HTTPS
    androidScheme: 'https',
  },
  plugins: {
    Network: {
      // No additional config needed — uses defaults
    },
  },
};

export default config;
