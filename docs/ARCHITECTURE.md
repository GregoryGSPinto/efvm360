# VFZ — Documentação de Arquitetura (Modelo C4)

## Diagrama 1: Context

```mermaid
graph TB
  subgraph "Usuários"
    OP[Operador de Pátio]
    SUP[Supervisor]
    ADM[Administrador]
  end
  VFZ[VFZ - Gestão de Troca de Turno]
  AAD[Azure AD / Entra ID]
  ERP[Vale ERP/SAP - futuro]
  AI[Azure App Insights]

  OP -->|Registra trocas de turno| VFZ
  SUP -->|Consulta BI + histórico| VFZ
  ADM -->|Gestão de usuários| VFZ
  VFZ -->|SSO| AAD
  VFZ -.->|Integração futura| ERP
  VFZ -->|Telemetria| AI
```

## Diagrama 2: Container

```mermaid
graph TB
  subgraph "Frontend - Azure Static Web Apps"
    SPA[React SPA<br>TypeScript + Vite]
  end
  subgraph "Backend - Azure App Service"
    API[Express API<br>TypeScript + Node.js]
  end
  subgraph "Dados - Azure"
    DB[(MySQL Flexible Server)]
    KV[Azure Key Vault]
  end
  subgraph "Observabilidade"
    AI[Application Insights]
  end

  SPA -->|HTTPS REST| API
  API -->|Sequelize ORM| DB
  API -->|Secrets| KV
  API -->|Telemetria| AI
  SPA -->|Page views| AI
```

## Diagrama 3: Component — Backend

```mermaid
graph TB
  subgraph "Routes"
    R1[/auth/*]
    R2[/passagens/*]
    R3[/audit/*]
    R4[/usuarios/*]
    R5[/lgpd/*]
  end
  subgraph "Middleware"
    M1[authenticate]
    M2[authorize]
    M3[security - rate limit, CORS, helmet]
    M4[azureAuth - SSO]
  end
  subgraph "Controllers"
    C1[authController]
    C2[passagensController]
    C3[auditController]
    C4[usersController]
    C5[lgpdController]
  end
  subgraph "Services"
    S1[authService - bcrypt, JWT, refresh rotation]
    S2[auditService - append-only chain]
  end
  subgraph "Models - Sequelize"
    MO1[Usuario]
    MO2[Passagem]
    MO3[AuditTrail]
  end

  R1 --> M3 --> M1 --> C1 --> S1
  R2 --> M1 --> M2 --> C2
  R3 --> M1 --> M2 --> C3 --> S2
  C1 --> MO1
  C2 --> MO2
  S2 --> MO3
```

## Diagrama 4: Component — Frontend

```mermaid
graph TB
  subgraph "Pages"
    P1[App.tsx - Orquestrador]
    P2[LoginScreen]
    P3[CadastroPremium]
    P4[PaginaDSS]
  end
  subgraph "Hooks"
    H1[useAuth - login, sessão HMAC]
    H2[useFormulario - 9 seções]
    H3[useConfig - tema, preferências]
    H4[useSession - timeout, renovação]
    H5[useAlertas - IA operacional]
    H6[useBlindagem - anti-tampering]
    H7[useOnlineStatus - offline/sync]
    H8[useDSS - diálogo segurança]
  end
  subgraph "Services"
    SV1[security.ts - SHA-256, HMAC, sanitização]
    SV2[permissions.ts - RBAC hierárquico]
    SV3[backendAdapter.ts - bridge pattern]
    SV4[logging.ts - audit trail local]
  end
  subgraph "Components"
    CO1[DashboardBI - ECharts]
    CO2[TabelaPatio]
    CO3[ChecklistSeguranca]
    CO4[TopNavbar + BottomNavigation]
  end

  P1 --> H1 & H2 & H3 & H4
  H1 --> SV1 & SV2
  P1 --> CO1 & CO2 & CO3 & CO4
  H2 --> SV3
```

## Diagrama 5: Deployment

```mermaid
graph TB
  subgraph "Azure — Brazil South"
    subgraph "Resource Group: rg-vfz-prod"
      SWA[Azure Static Web Apps<br>vfz-frontend-production<br>React build dist/]
      ASP[Azure App Service<br>vfz-api-production<br>Node.js 20 LTS]
      ASP_STG[Staging Slot<br>vfz-api-production/staging]
      MySQL[(Azure MySQL Flexible Server<br>vfz-mysql-prod<br>MySQL 8.0)]
      KV[Azure Key Vault<br>kv-vfz-prod<br>JWT + DB secrets]
      AI[Application Insights<br>vfz-appinsights]
    end
  end
  subgraph "Azure Entra ID"
    AAD[Entra ID / Azure AD<br>SSO + Groups]
  end
  subgraph "GitHub"
    GH[GitHub Actions<br>CI/CD Pipeline]
  end

  GH -->|Deploy frontend| SWA
  GH -->|Deploy staging slot| ASP_STG
  ASP_STG -.->|Swap after smoke test| ASP
  ASP -->|Managed Identity| KV
  ASP -->|Sequelize| MySQL
  ASP -->|Telemetry| AI
  SWA -->|HTTPS| ASP
  ASP -->|JWKS validate| AAD
```

## Diagrama 6: Data Flow — Gestão de Troca de Turno

```mermaid
sequenceDiagram
  participant OP as Operador
  participant SPA as React SPA
  participant SW as Service Worker
  participant API as Express API
  participant DB as MySQL
  participant AI as App Insights

  OP->>SPA: Login (matrícula + senha)
  SPA->>API: POST /auth/login
  API->>DB: Validate credentials
  DB-->>API: User + bcrypt hash
  API-->>SPA: JWT (access + refresh)
  API->>AI: trackLogin()

  OP->>SPA: Preenche formulário (9 seções)
  SPA->>SW: Cache form data (offline-first)

  OP->>SPA: Assinar troca de turno
  SPA->>API: POST /passagens (+ assinatura HMAC)
  API->>DB: INSERT passagem + audit trail
  API->>AI: trackPassagemCriada()
  API-->>SPA: 201 Created

  Note over SPA,SW: Se offline: queue em IndexedDB, sync quando online
```

## Decisões Arquiteturais (ADRs)

| # | Decisão | Motivo |
|---|---------|--------|
| ADR-001 | Monorepo (vfz + backend) | Equipe pequena, deploy coordenado |
| ADR-002 | MySQL (não PostgreSQL) | Compatibilidade com stack Vale |
| ADR-003 | JWT + Refresh Token rotation | Sessões 8h sem reautenticação |
| ADR-004 | Dual Auth (Azure AD + local) | SSO corporativo + fallback offline |
| ADR-005 | HMAC em assinaturas | Integridade da troca de turno sem PKI |
| ADR-006 | Audit trail append-only com hash chain | Evidência forense imutável |
| ADR-007 | React SPA (não SSR) | Operação offline-first |
| ADR-008 | Blue/Green deploy com slot swap | Zero downtime em produção |
| ADR-009 | Service Worker cache-first | Resiliência operacional 24/7 |

## NFRs (Non-Functional Requirements)

| Requisito | Target | Medição |
|-----------|--------|---------|
| Disponibilidade | 99.5% | Azure SLA composite |
| Latência API p95 | < 1s | App Insights |
| Latência API p99 | < 2s | App Insights |
| Login burst (20 concurrent) | p95 < 500ms | k6 login-burst |
| Recovery Time (RTO) | < 30 min | Runbook |
| Recovery Point (RPO) | < 1h | MySQL PITR |
| Concurrent users | 40+ | k6 shift-change |
| Bundle size | < 15MB | CI check |
