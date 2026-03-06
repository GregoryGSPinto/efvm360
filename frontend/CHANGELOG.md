# Changelog — EFVM360 Gestão de Troca de Turno

Todas as mudanças notáveis no projeto estão documentadas neste arquivo.
Formato baseado em [Keep a Changelog](https://keepachangelog.com/pt-BR/1.1.0/).

---

## [3.2.0] — 2026-02-21

### Enterprise Evolution Release

#### Adicionado
- **App.tsx decomposto:** 6.662 → 394 linhas (−94%) — orchestrator puro
- **7 páginas isoladas:** Inicial, Passagem (6 seções), Layout Pátio, Histórico, Configurações, DSS, Cadastro
- **12 custom hooks:** Incluindo novos `useTurnoTimer` e `usePassagemHandlers`
- **API abstraction layer:** `api/client.ts` com token management, refresh automático, retry
- **DTOs/contracts:** Interfaces de contrato para todas as entidades (auth, passagem, audit, LGPD)
- **Error boundaries segmentados:** Crash em módulo não derruba o sistema
- **Security guards:** Validação pré-ação para assinatura, login, exportação
- **Data consistency validators:** Validação de formulário, sessão e storage
- **Environment config:** Separação clara dev/staging/production com settings por ambiente
- **13 feature flags:** Com localStorage overrides e debug console

#### Backend
- **74 testes unitários** (Jest + SQLite in-memory)
- **5 controllers:** Auth, Passagens, Audit, Users, LGPD
- **4 middlewares:** Auth JWT, Azure AD JWKS, Security (Helmet, CORS, rate limit), RBAC
- **Migrations + Seed:** Schema completo + 5 usuários iniciais
- **Monitoring service:** Application Insights com custom events operacionais
- **Key Vault service:** Integração Azure com fallback .env

#### Testes
- **130 testes frontend** (Vitest + jsdom)
- **25 testes E2E** (Playwright — login, navegação, passagem, responsividade, segurança)
- **5 cenários de carga** (k6 — login burst, shift change, stress 300 VUs, endurance 30min)

#### CI/CD
- **4 workflows GitHub Actions:** CI, deploy staging, deploy production (blue/green), security scan
- **Dependabot** configurado para npm e GitHub Actions
- **CODEOWNERS** + PR template + branch protection

#### Infraestrutura
- **6 módulos Azure Bicep:** App Service + staging slot, MySQL HA, Key Vault, App Insights, Static Web App
- **Docker Compose:** MySQL + Backend + Frontend para desenvolvimento local
- **Dockerfiles:** Backend (Node 20 Alpine) + Frontend (Vite dev server)

#### Documentação
- ARCHITECTURE.md (6 diagramas C4 + ADRs + NFRs)
- MANUAL_USUARIO.md (7 capítulos)
- RUNBOOK.md (procedimentos operacionais TI)
- MONITORING.md (KQL dashboards + alertas)
- LGPD_COMPLIANCE.md + PRIVACY_NOTICE.md
- AZURE_AD_SETUP.md + KEYVAULT_SETUP.md
- WCAG_CHECKLIST.md (WCAG 2.1 AA)
- ENTERPRISE_EVOLUTION_REPORT.md (relatório técnico completo)

#### Segurança
- HMAC local para integridade de sessão
- Sanitização profunda de inputs (XSS, SQL injection patterns)
- Strip automático de campos sensíveis
- Audit trail append-only com hash chain SHA-256
- RBAC hierárquico com 5 níveis
- Console protection em produção
- LGPD: API de direitos do titular + aviso de privacidade

---

## [3.1.0] — 2026-01-xx

### Hardened Frontend Release

#### Adicionado
- Sistema completo de troca de turno com 9 seções operacionais
- Dashboard BI+ com KPIs operacionais (ECharts)
- Avaliação 5S alinhada ao PGS-007091 Vale
- DSS (Diálogo de Segurança e Saúde) com histórico
- Sistema de alertas inteligentes (IA operacional)
- AdamBoot chat assistente
- Tema claro/escuro/automático com glassmorphism
- PWA com Service Worker (offline-first)
- Login com SHA-256 hash + salt
- Blindagem anti-tampering

---

## [3.0.0] — 2025-xx-xx

### Initial Release
- Formulário digital de troca de turno
- Login local com matrícula/senha
- Persistência via localStorage
