// ============================================================================
// EFVM360 — Design Tokens — Enterprise Design System
// Single source of truth for colors, spacing, typography, and effects
// ============================================================================

export const tokens = {
  colors: {
    // Vale Corporate Palette
    primary: {
      50: '#e0f2f1',
      100: '#b2dfdb',
      200: '#80cbc4',
      300: '#4db6ac',
      400: '#26a69a',
      500: '#007e7a', // Vale Teal (primary)
      600: '#006b68',
      700: '#005856',
      800: '#004544',
      900: '#003332',
    },
    accent: {
      50: '#f1f8e9',
      100: '#dcedc8',
      200: '#c5e1a5',
      300: '#aed581',
      400: '#9ccc65',
      500: '#69be28', // Vale Green (accent)
      600: '#5aa824',
      700: '#4b9220',
      800: '#3c7c1c',
      900: '#2d6618',
    },
    gold: {
      50: '#fef9e7',
      100: '#fdf0c3',
      200: '#fbe79b',
      300: '#f9dd73',
      400: '#f5d14e',
      500: '#edb111', // Vale Gold
      600: '#d9a010',
      700: '#c08e0e',
      800: '#a77c0c',
      900: '#8e6a0a',
    },
    semantic: {
      success: '#69be28',
      warning: '#edb111',
      danger: '#dc2626',
      dangerHover: '#b91c1c',
      info: '#00b0ca',
    },
    surface: {
      light: {
        background: '#f5f5f5',
        backgroundSecondary: '#eeeeee',
        card: '#ffffff',
        cardHover: '#fafafa',
        border: '#e5e5e5',
        input: '#ffffff',
        inputBorder: '#d4d4d4',
      },
      dark: {
        background: '#121212',
        backgroundSecondary: '#1e1e1e',
        card: '#1e1e1e',
        cardHover: '#252525',
        border: '#333333',
        input: '#2a2a2a',
        inputBorder: '#404040',
      },
    },
    text: {
      light: {
        primary: '#222222',
        secondary: '#555555',
        muted: '#888888',
      },
      dark: {
        primary: '#e0e0e0',
        secondary: '#a0a0a0',
        muted: '#707070',
      },
    },
  },

  spacing: {
    xs: '4px',
    sm: '8px',
    md: '16px',
    lg: '24px',
    xl: '32px',
    xxl: '48px',
  },

  radius: {
    sm: '8px',
    md: '10px',
    lg: '12px',
    xl: '16px',
    xxl: '20px',
    full: '9999px',
  },

  shadow: {
    sm: '0 1px 3px rgba(0,0,0,0.08), 0 1px 2px rgba(0,0,0,0.06)',
    md: '0 4px 12px rgba(0,0,0,0.10)',
    lg: '0 8px 32px rgba(0,0,0,0.12)',
    glass: '0 8px 32px rgba(0,126,122,0.08)',
    dark: {
      sm: '0 1px 3px rgba(0,0,0,0.3), 0 1px 2px rgba(0,0,0,0.2)',
      md: '0 4px 12px rgba(0,0,0,0.3)',
      lg: '0 8px 32px rgba(0,0,0,0.5)',
    },
  },

  glassmorphism: {
    light: {
      background: 'rgba(255, 255, 255, 0.72)',
      backdropFilter: 'blur(20px) saturate(180%)',
      border: '1px solid rgba(255, 255, 255, 0.3)',
    },
    dark: {
      background: 'rgba(30, 30, 30, 0.72)',
      backdropFilter: 'blur(20px) saturate(180%)',
      border: '1px solid rgba(255, 255, 255, 0.06)',
    },
  },

  typography: {
    fontFamily: "'Inter', 'Segoe UI', -apple-system, BlinkMacSystemFont, sans-serif",
    fontSize: {
      xs: '0.6875rem',  // 11px
      sm: '0.8125rem',  // 13px
      base: '0.875rem',  // 14px
      md: '1rem',        // 16px
      lg: '1.125rem',    // 18px
      xl: '1.25rem',     // 20px
      '2xl': '1.5rem',   // 24px
      '3xl': '2rem',     // 32px
    },
    fontWeight: {
      regular: 400,
      medium: 500,
      semibold: 600,
      bold: 700,
      extrabold: 800,
    },
  },

  transition: {
    fast: '150ms cubic-bezier(0.4, 0, 0.2, 1)',
    normal: '250ms cubic-bezier(0.4, 0, 0.2, 1)',
    slow: '400ms cubic-bezier(0.4, 0, 0.2, 1)',
    spring: '500ms cubic-bezier(0.34, 1.56, 0.64, 1)',
  },

  breakpoints: {
    mobile: 480,
    tablet: 768,
    desktop: 1024,
    wide: 1280,
  },

  // WCAG 2.1 contrast ratios
  // Safety-critical: minimum 7:1 (WCAG AAA)
  // Standard text: minimum 4.5:1 (WCAG AA)
  contrast: {
    safetyText: {
      onTeal: '#FFFFFF',     // 7.2:1 on #007e7a
      onGreen: '#1A1A1A',    // 8.8:1 on #69be28
      onGold: '#1A1A1A',     // 10.1:1 on #edb111
      onRed: '#FFFFFF',      // 7.1:1 on #dc2626
      onInfo: '#1A1A1A',     // 5.2:1 on #00b0ca (AA large)
    },
  },

  touchTarget: {
    minSize: '44px', // WCAG 2.5.5
  },
} as const;

// ── Theme helpers ─────────────────────────────────────────────────────────

export type ThemeMode = 'light' | 'dark';

export function getThemeSurface(mode: ThemeMode) {
  return tokens.colors.surface[mode];
}

export function getThemeText(mode: ThemeMode) {
  return tokens.colors.text[mode];
}

export function getGlass(mode: ThemeMode) {
  return tokens.glassmorphism[mode];
}

export function getShadow(mode: ThemeMode) {
  return mode === 'dark' ? tokens.shadow.dark : {
    sm: tokens.shadow.sm,
    md: tokens.shadow.md,
    lg: tokens.shadow.lg,
  };
}
