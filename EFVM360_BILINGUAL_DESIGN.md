# EFVM360 — Bilingual + Design Premium

**Data:** 2026-03-05  
**Objetivo:** Internacionalização PT-BR/EN + Design System Enterprise  
**Pré-requisito:** Backend Activation completa (Fase 1.5)  

---

## PART 1 — Internacionalização (i18n)

### 1.1 Stack de i18n

Para React + Vite (sem Next.js), a melhor opção é `react-i18next`:

```bash
cd frontend
pnpm add react-i18next i18next i18next-browser-languagedetector i18next-http-backend
```

### 1.2 Configuração Base

```typescript
// frontend/src/i18n/index.ts
import i18n from 'i18next';
import { initReactI18next } from 'react-i18next';
import LanguageDetector from 'i18next-browser-languagedetector';

import ptBR from './locales/pt-BR.json';
import en from './locales/en.json';

i18n
  .use(LanguageDetector)
  .use(initReactI18next)
  .init({
    resources: {
      'pt-BR': { translation: ptBR },
      en: { translation: en },
    },
    fallbackLng: 'pt-BR',
    interpolation: {
      escapeValue: false,
    },
    detection: {
      order: ['localStorage', 'navigator', 'htmlTag'],
      caches: ['localStorage'],
    },
  });

export default i18n;
```

### 1.3 Namespace Structure

```
frontend/src/i18n/
├── index.ts                    # Config
├── locales/
│   ├── pt-BR.json             # Portuguese (primary)
│   └── en.json                # English
└── types.ts                   # Translation key types
```

### 1.4 Translation Keys (PT-BR → EN)

```json
// pt-BR.json (excerpt)
{
  "common": {
    "save": "Salvar",
    "cancel": "Cancelar",
    "edit": "Editar",
    "delete": "Excluir",
    "confirm": "Confirmar",
    "loading": "Carregando...",
    "error": "Erro",
    "success": "Sucesso",
    "search": "Buscar",
    "filter": "Filtrar",
    "logout": "Sair",
    "back": "Voltar"
  },
  "auth": {
    "login": "Entrar",
    "matricula": "Matrícula",
    "password": "Senha",
    "forgotPassword": "Esqueceu a senha?",
    "loginWithAzure": "Entrar com Azure AD",
    "invalidCredentials": "Matrícula ou senha inválidos",
    "sessionExpired": "Sessão expirada. Faça login novamente."
  },
  "nav": {
    "dashboard": "Painel",
    "handover": "Passagem de Serviço",
    "yardLayout": "Layout do Pátio",
    "riskAssessment": "Avaliação de Riscos",
    "equipment": "Equipamentos",
    "analytics": "BI+ Analytics",
    "management": "Gestão",
    "history": "Histórico",
    "profile": "Perfil",
    "settings": "Configurações",
    "support": "Suporte"
  },
  "handover": {
    "title": "Passagem de Serviço",
    "newHandover": "Nova Passagem",
    "sections": {
      "header": "Cabeçalho",
      "upperYard": "Pátio Superior",
      "lowerYard": "Pátio Inferior",
      "layout": "Layout / AMV",
      "attentionPoints": "Pontos de Atenção",
      "vpInterventions": "Intervenções VP",
      "equipment": "Equipamentos",
      "fiveS": "5S",
      "safetyProtocols": "Protocolos de Segurança",
      "previousNotes": "Observações Turno Anterior",
      "auditTrail": "Trilha de Auditoria",
      "signatures": "Assinaturas"
    },
    "sign": "Assinar Passagem",
    "signedBy": "Assinado por {{name}}",
    "pending": "Pendente de assinatura"
  },
  "yard": {
    "title": "Layout do Pátio",
    "line": "Linha",
    "category": "Categoria",
    "status": {
      "available": "Disponível",
      "occupied": "Ocupada",
      "maintenance": "Manutenção",
      "blocked": "Bloqueada"
    },
    "amv": "AMV",
    "position": {
      "normal": "Normal",
      "reverse": "Reversa"
    }
  },
  "risk": {
    "title": "Avaliação de Riscos",
    "probability": "Probabilidade",
    "impact": "Impacto",
    "grade": {
      "critical": "Crítico",
      "high": "Alto",
      "medium": "Médio",
      "low": "Baixo",
      "negligible": "Insignificante"
    },
    "mitigation": "Medida de Mitigação",
    "nrReference": "Referência NR"
  },
  "equipment": {
    "title": "Equipamentos",
    "category": {
      "comunicacao": "Comunicação",
      "sinalizacao": "Sinalização",
      "seguranca": "Segurança",
      "medicao": "Medição",
      "ferramentas": "Ferramentas",
      "epi": "EPI"
    },
    "criticality": {
      "high": "Alta",
      "medium": "Média",
      "low": "Baixa"
    },
    "minPerShift": "Mínimo por turno"
  },
  "dashboard": {
    "title": "Painel Operacional",
    "kpi": {
      "yardOccupancy": "Ocupação do Pátio",
      "openIncidents": "Ocorrências Abertas",
      "equipmentStatus": "Status Equipamentos",
      "riskScore": "Score de Risco"
    },
    "trend": "Tendência",
    "lastUpdate": "Última atualização"
  },
  "adambot": {
    "greeting": "Olá! Sou o AdamBot, seu assistente operacional.",
    "placeholder": "Digite sua pergunta...",
    "voiceStart": "Iniciar comando de voz",
    "voiceStop": "Parar gravação",
    "offline": "Modo offline — funcionalidade limitada"
  },
  "offline": {
    "indicator": "Sem conexão",
    "syncing": "Sincronizando...",
    "syncComplete": "Sincronização completa",
    "syncFailed": "Falha na sincronização",
    "pendingChanges": "{{count}} alteração(ões) pendente(s)"
  },
  "roles": {
    "gestor": "Gestor",
    "inspetor": "Inspetor",
    "maquinista": "Maquinista",
    "oficial": "Oficial"
  }
}
```

```json
// en.json (excerpt)
{
  "common": {
    "save": "Save",
    "cancel": "Cancel",
    "edit": "Edit",
    "delete": "Delete",
    "confirm": "Confirm",
    "loading": "Loading...",
    "error": "Error",
    "success": "Success",
    "search": "Search",
    "filter": "Filter",
    "logout": "Logout",
    "back": "Back"
  },
  "auth": {
    "login": "Sign In",
    "matricula": "Employee ID",
    "password": "Password",
    "forgotPassword": "Forgot password?",
    "loginWithAzure": "Sign in with Azure AD",
    "invalidCredentials": "Invalid employee ID or password",
    "sessionExpired": "Session expired. Please sign in again."
  },
  "nav": {
    "dashboard": "Dashboard",
    "handover": "Shift Handover",
    "yardLayout": "Yard Layout",
    "riskAssessment": "Risk Assessment",
    "equipment": "Equipment",
    "analytics": "BI+ Analytics",
    "management": "Management",
    "history": "History",
    "profile": "Profile",
    "settings": "Settings",
    "support": "Support"
  },
  "handover": {
    "title": "Shift Handover",
    "newHandover": "New Handover",
    "sections": {
      "header": "Header",
      "upperYard": "Upper Yard",
      "lowerYard": "Lower Yard",
      "layout": "Layout / Switches",
      "attentionPoints": "Attention Points",
      "vpInterventions": "VP Interventions",
      "equipment": "Equipment",
      "fiveS": "5S",
      "safetyProtocols": "Safety Protocols",
      "previousNotes": "Previous Shift Notes",
      "auditTrail": "Audit Trail",
      "signatures": "Signatures"
    },
    "sign": "Sign Handover",
    "signedBy": "Signed by {{name}}",
    "pending": "Pending signature"
  },
  "yard": {
    "title": "Yard Layout",
    "line": "Track",
    "category": "Category",
    "status": {
      "available": "Available",
      "occupied": "Occupied",
      "maintenance": "Maintenance",
      "blocked": "Blocked"
    },
    "amv": "Switch",
    "position": {
      "normal": "Normal",
      "reverse": "Reverse"
    }
  },
  "risk": {
    "title": "Risk Assessment",
    "probability": "Probability",
    "impact": "Impact",
    "grade": {
      "critical": "Critical",
      "high": "High",
      "medium": "Medium",
      "low": "Low",
      "negligible": "Negligible"
    },
    "mitigation": "Mitigation Measure",
    "nrReference": "NR Reference"
  },
  "equipment": {
    "title": "Equipment",
    "category": {
      "comunicacao": "Communication",
      "sinalizacao": "Signaling",
      "seguranca": "Safety",
      "medicao": "Measurement",
      "ferramentas": "Tools",
      "epi": "PPE"
    },
    "criticality": {
      "high": "High",
      "medium": "Medium",
      "low": "Low"
    },
    "minPerShift": "Minimum per shift"
  },
  "dashboard": {
    "title": "Operational Dashboard",
    "kpi": {
      "yardOccupancy": "Yard Occupancy",
      "openIncidents": "Open Incidents",
      "equipmentStatus": "Equipment Status",
      "riskScore": "Risk Score"
    },
    "trend": "Trend",
    "lastUpdate": "Last update"
  },
  "adambot": {
    "greeting": "Hello! I'm AdamBot, your operational assistant.",
    "placeholder": "Type your question...",
    "voiceStart": "Start voice command",
    "voiceStop": "Stop recording",
    "offline": "Offline mode — limited functionality"
  },
  "offline": {
    "indicator": "No connection",
    "syncing": "Syncing...",
    "syncComplete": "Sync complete",
    "syncFailed": "Sync failed",
    "pendingChanges": "{{count}} pending change(s)"
  },
  "roles": {
    "gestor": "Manager",
    "inspetor": "Inspector",
    "maquinista": "Operator",
    "oficial": "Officer"
  }
}
```

### 1.5 Migration Strategy

**Prioridade de migração (por impacto):**

1. **Navigation** — TopNavbar, BottomNav, menus
2. **Auth** — Login, erros, sessão
3. **Core Forms** — Passagem (12 seções), Layout, Riscos, Equipamentos
4. **Dashboard** — KPIs, labels, tooltips
5. **AdamBot** — Greeting, commands, responses
6. **System** — Error messages, offline indicators, toasts

**Pattern de migração em componentes:**

```tsx
// ANTES (hardcoded PT-BR)
<h1>Passagem de Serviço</h1>

// DEPOIS (i18n)
import { useTranslation } from 'react-i18next';

function HandoverPage() {
  const { t } = useTranslation();
  return <h1>{t('handover.title')}</h1>;
}
```

### 1.6 Language Switcher

```tsx
// frontend/src/components/LanguageSwitcher.tsx
import { useTranslation } from 'react-i18next';

export function LanguageSwitcher() {
  const { i18n } = useTranslation();

  return (
    <select
      value={i18n.language}
      onChange={(e) => i18n.changeLanguage(e.target.value)}
      className="bg-transparent border border-white/20 rounded px-2 py-1 text-sm"
    >
      <option value="pt-BR">🇧🇷 PT-BR</option>
      <option value="en">🇺🇸 English</option>
    </select>
  );
}
```

---

## PART 2 — Design System Premium

### 2.1 Design Tokens

```typescript
// frontend/src/styles/tokens.ts
export const tokens = {
  colors: {
    // Vale Corporate
    primary: {
      50: '#e8f5e9',
      100: '#c8e6c9',
      200: '#a5d6a7',
      300: '#81c784',
      400: '#66bb6a',
      500: '#00843D', // Vale Green (primary)
      600: '#007035',
      700: '#005c2d',
      800: '#004825',
      900: '#00341d',
    },
    accent: {
      50: '#fffde7',
      100: '#fff9c4',
      200: '#fff59d',
      300: '#fff176',
      400: '#ffee58',
      500: '#FFD100', // Vale Yellow (accent)
      600: '#e6bc00',
      700: '#cca700',
      800: '#b39200',
      900: '#997d00',
    },
    semantic: {
      success: '#00843D',
      warning: '#FFD100',
      danger: '#D32F2F',
      info: '#1976D2',
    },
    surface: {
      light: {
        background: '#F5F7FA',
        card: 'rgba(255, 255, 255, 0.72)',
        cardHover: 'rgba(255, 255, 255, 0.85)',
        border: 'rgba(0, 0, 0, 0.08)',
      },
      dark: {
        background: '#0A1628',
        card: 'rgba(255, 255, 255, 0.06)',
        cardHover: 'rgba(255, 255, 255, 0.10)',
        border: 'rgba(255, 255, 255, 0.08)',
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
    md: '12px',
    lg: '16px',
    xl: '24px',
    full: '9999px',
  },
  shadow: {
    sm: '0 2px 8px rgba(0, 0, 0, 0.04)',
    md: '0 4px 16px rgba(0, 0, 0, 0.08)',
    lg: '0 8px 32px rgba(0, 0, 0, 0.12)',
    glass: '0 8px 32px rgba(0, 132, 61, 0.08)',
  },
  glassmorphism: {
    light: {
      background: 'rgba(255, 255, 255, 0.72)',
      backdropFilter: 'blur(20px) saturate(180%)',
      border: '1px solid rgba(255, 255, 255, 0.3)',
    },
    dark: {
      background: 'rgba(10, 22, 40, 0.72)',
      backdropFilter: 'blur(20px) saturate(180%)',
      border: '1px solid rgba(255, 255, 255, 0.06)',
    },
  },
  typography: {
    fontFamily: "'Inter', -apple-system, BlinkMacSystemFont, sans-serif",
    fontSize: {
      xs: '0.75rem',   // 12px
      sm: '0.875rem',  // 14px
      base: '1rem',    // 16px
      lg: '1.125rem',  // 18px
      xl: '1.25rem',   // 20px
      '2xl': '1.5rem', // 24px
      '3xl': '2rem',   // 32px
    },
    fontWeight: {
      regular: 400,
      medium: 500,
      semibold: 600,
      bold: 700,
    },
  },
  transition: {
    fast: '150ms cubic-bezier(0.4, 0, 0.2, 1)',
    normal: '250ms cubic-bezier(0.4, 0, 0.2, 1)',
    slow: '400ms cubic-bezier(0.4, 0, 0.2, 1)',
    spring: '500ms cubic-bezier(0.34, 1.56, 0.64, 1)',
  },
  breakpoints: {
    mobile: '480px',
    tablet: '768px',
    desktop: '1024px',
    wide: '1280px',
  },
  contrast: {
    // WCAG 2.1 AA: minimum 4.5:1 for normal text, 3:1 for large text
    // Safety-critical: minimum 7:1 (WCAG AAA)
    safetyText: {
      onGreen: '#FFFFFF',  // 7.8:1 ratio
      onYellow: '#1A1A1A', // 14.2:1 ratio
      onRed: '#FFFFFF',    // 5.9:1 ratio (AA large)
    },
  },
} as const;
```

### 2.2 Component Library Updates

**Componentes a polir/criar:**

| Component | Status | Priority |
|-----------|--------|----------|
| GlassCard | Exists, polish | 🟠 HIGH |
| Button (variants) | Exists, add variants | 🟠 HIGH |
| Input (with validation) | Exists, polish | 🟠 HIGH |
| Select / Dropdown | Exists, polish | 🟡 MEDIUM |
| StatusBadge | Exists, polish | 🟡 MEDIUM |
| Modal / Dialog | Exists, polish | 🟡 MEDIUM |
| Toast / Notification | Exists, polish | 🟡 MEDIUM |
| Skeleton Loader | Create | 🟡 MEDIUM |
| DataTable | Exists, polish | 🟡 MEDIUM |
| Chart components | Exists, polish | 🟢 LOW |
| Timeline | Create | 🟢 LOW |
| Stepper (for form sections) | Create | 🟢 LOW |

### 2.3 Dark/Light Theme Polish

```typescript
// frontend/src/styles/theme.ts
import { tokens } from './tokens';

export const lightTheme = {
  ...tokens.colors.surface.light,
  glass: tokens.glassmorphism.light,
  text: {
    primary: '#1A1A2E',
    secondary: '#4A4A68',
    muted: '#8A8AA0',
  },
};

export const darkTheme = {
  ...tokens.colors.surface.dark,
  glass: tokens.glassmorphism.dark,
  text: {
    primary: '#F0F0F5',
    secondary: '#B0B0C8',
    muted: '#707088',
  },
};
```

### 2.4 Transitions & Animations

```css
/* Page transition */
.page-enter {
  opacity: 0;
  transform: translateY(8px);
}
.page-enter-active {
  opacity: 1;
  transform: translateY(0);
  transition: opacity 250ms ease, transform 250ms ease;
}

/* Card hover (glassmorphism) */
.glass-card {
  transition: all 250ms cubic-bezier(0.4, 0, 0.2, 1);
}
.glass-card:hover {
  transform: translateY(-2px);
  box-shadow: 0 8px 32px rgba(0, 132, 61, 0.12);
}

/* Status badge pulse (for live data) */
@keyframes pulse-green {
  0%, 100% { box-shadow: 0 0 0 0 rgba(0, 132, 61, 0.4); }
  50% { box-shadow: 0 0 0 8px rgba(0, 132, 61, 0); }
}
.status-live {
  animation: pulse-green 2s infinite;
}
```

### 2.5 Mobile-First Responsiveness

**Breakpoints:**
- `< 480px` — Mobile (portrait) — Single column, bottom nav
- `480-768px` — Mobile (landscape) / Small tablet — Adjusted grid
- `768-1024px` — Tablet — Sidebar + content
- `> 1024px` — Desktop — Full layout

**Mobile-specific requirements:**
- Touch targets ≥ 44×44px (WCAG 2.5.5)
- Bottom navigation (not top hamburger) for thumb reach
- Swipeable sections on handover form
- Pull-to-refresh on dashboard
- Offline indicator always visible

---

## Acceptance Criteria

- [ ] react-i18next configured with PT-BR (default) + EN
- [ ] All 11 pages translated (both languages)
- [ ] Language switcher in settings/navbar
- [ ] Design tokens documented and applied consistently
- [ ] Dark/light theme seamless switch
- [ ] Glassmorphism effects consistent across all cards
- [ ] Transitions smooth (no jank > 16ms frame budget)
- [ ] Mobile responsive on all 11 pages (test at 375px, 768px, 1024px)
- [ ] Touch targets ≥ 44×44px on mobile
- [ ] WCAG contrast ratios pass (7:1 for safety-critical)
- [ ] Skeleton loaders on all async data pages

---

*Este documento é executado via run-master.sh Fase 2*
