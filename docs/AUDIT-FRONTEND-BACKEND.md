# EFVM360 -- Auditoria de Integracao Frontend <-> Backend

**Data:** 2026-03-01
**Versao do frontend:** v3.2 (React 18 + Vite + TypeScript)
**Versao do backend:** v1.0.0 (Express + Sequelize + MySQL 8.0)
**Auditor:** Claude Code (analise automatizada de codigo-fonte)

---

## Sumario Executivo

O EFVM360 e uma aplicacao **offline-first** para gestao de troca de turno ferroviario. O frontend opera de forma autonoma usando **localStorage** (27 chaves) e **IndexedDB** (event store + sync queue). O backend existe com uma API REST completa (34 endpoints), modelos Sequelize, migraces MySQL, autenticacao JWT, RBAC hierarquico, rate limiting, CORS e Helmet.

**Estado atual:** O frontend roda 100% em modo local (localStorage + IndexedDB). A integracao HTTP com o backend esta **implementada mas inativa** em desenvolvimento -- o `api/client.ts` e os dois `SyncEngine` estao prontos, porem o frontend nao os utiliza nos fluxos CRUD principais. Ao rodar sem `VITE_API_URL` configurado, todo o CRUD usa localStorage. O backend tem as tabelas e endpoints prontos para receber dados, mas falta conectar os hooks do frontend aos endpoints via servico de API unificado.

---

## Secao 1: Matriz de Funcionalidades -- Frontend vs Backend

| # | Funcionalidade | Frontend (hook/pagina) | localStorage Key | Backend Endpoint | Status |
|---|---------------|----------------------|-----------------|-----------------|--------|
| 1 | **Autenticacao (login/logout)** | `useAuth.ts` + `LoginScreenPremium.tsx` | `efvm360-usuario`, `efvm360-usuarios` | `POST /auth/login`, `POST /auth/logout`, `GET /auth/me` | :warning: Frontend faz auth local (bcrypt no browser via seed). Backend tem JWT completo mas nao e chamado. |
| 2 | **Refresh Token** | `api/client.ts` (implementado, nao usado) | `sessionStorage: efvm360-access-token` | `POST /auth/refresh` | :warning: Client HTTP tem auto-refresh. Inativo porque login e local. |
| 3 | **Alterar Senha** | `useAuth.ts` + `pages/perfil` | `efvm360-usuarios` (atualiza array) | `POST /auth/alterar-senha` | :warning: Frontend altera hash no localStorage. Backend tem endpoint, nao e chamado. |
| 4 | **Registro/Cadastro (solicitacao)** | `approvalService.ts` | `efvm360-registration-requests` | `POST /gestao/cadastros/:uuid/aprovar` | :warning: Frontend gera solicitacao em localStorage. Backend tem tabela `cadastros_pendentes` e endpoints. Nao conectados. |
| 5 | **Reset de Senha** | `approvalService.ts` | `efvm360-password-requests` | `POST /gestao/senha-resets/:uuid/aprovar` | :warning: Frontend local. Backend tem tabela `senha_resets` e endpoint. Nao conectados. |
| 6 | **Passagem de Servico (formulario)** | `useFormulario.ts` + `pages/passagem` | `efvm360-historico`, `efvm360-rascunho` | `POST /passagens`, `GET /passagens`, `GET /passagens/:uuid` | :warning: Frontend salva em localStorage. Backend tem tabela `passagens` com JSON columns. `SyncEngine` esta pronto para enviar batch. Falta ativar. |
| 7 | **Assinatura de Passagem** | `usePassagemHandlers.ts` | `efvm360-usuarios` (valida senha local) | `POST /passagens/:uuid/assinar` | :warning: Frontend valida senha no browser. Backend faz bcrypt server-side. Nao conectados. |
| 8 | **Sync Offline (passagens)** | `syncEngine.ts` + `SyncEngine.ts` + `offlineSync.ts` | `vfz_sync_queue`, `vfz_sync_status`, IndexedDB | `POST /sync/passagens`, `GET /sync/status`, `GET /sync/conflicts` | :warning: Tres implementacoes de sync existem. IndexedDB store esta funcional. Backend tem controller completo. Falta ativacao do circuito. |
| 9 | **DSS (Dialogo de Seguranca)** | `useDSS.ts` + `pages/dss` | `efvm360-dss-historico`, `efvm360-dss-atual` | `POST /dss`, `GET /dss`, `GET /dss/:uuid` | :warning: Frontend faz CRUD local. Backend tem tabela `dss` e controller. Nao conectados. |
| 10 | **Patios (CRUD)** | `usePatio.ts` + `pages/gestao` | `efvm360-patios` | `GET /patios`, `POST /patios`, `PATCH /patios/:codigo` | :warning: Frontend faz CRUD local com linhas, AMVs, categorias. Backend tem tabela simplificada (sem linhas/AMVs como sub-recursos). |
| 11 | **Equipamentos** | `useEquipamentos.ts` | `efvm360-equipamentos-config` | Nenhum | :x: Nenhum endpoint para equipamentos. Frontend faz CRUD local. |
| 12 | **Graus de Risco** | `useGrausRisco.ts` | `efvm360-graus-risco` | Nenhum | :x: Nenhum endpoint. Frontend faz CRUD local. |
| 13 | **Configuracoes do Usuario** | `useConfig.ts` | `efvm360-config` | `GET /config`, `PATCH /config` | :warning: Frontend salva em localStorage. Backend tem tabela `usuario_config` e endpoints. Nao conectados. |
| 14 | **Gestao de Usuarios** | `pages/gestao` | `efvm360-usuarios` | `GET /usuarios`, `POST /usuarios`, `PATCH /usuarios/:uuid` | :warning: Frontend le/escreve array de usuarios em localStorage. Backend tem CRUD completo. Nao conectados. |
| 15 | **Auditoria (Trail)** | `permissions.ts` (frontend audit) | `efvm360-auditoria` | `GET /audit`, `POST /audit/sync`, `GET /audit/integridade` | :warning: Frontend gera log local. Backend tem tabela `audit_trail` append-only com triggers. `POST /audit/sync` pode receber batch. Nao conectados. |
| 16 | **Sessao** | `useSession.ts` | `efvm360-sessao` | Gerenciado via JWT no backend | :warning: Frontend tem timeout/heartbeat local. Backend usa JWT com TTL. Logicas independentes. |
| 17 | **AdamBoot (IA Assistente)** | `AdamBootService.ts` + componentes | `adamboot-perfil-*`, `adamboot-*` | `GET /adamboot/perfil/:mat`, `POST /adamboot/acesso` | :warning: Frontend salva perfil local. Backend tem tabela `adamboot_perfis` e `adamboot_conversas`. Nao conectados. |
| 18 | **BI+ (Dashboard KPIs)** | `DashboardBI.tsx` | `adamboot-dashboard-state`, `efvm360-export-history` | `GET /bi/kpis`, `GET /bi/resumo-yard` | :warning: Frontend calcula KPIs a partir de localStorage. Backend tem endpoints. Nao conectados. |
| 19 | **LGPD (Direitos do Titular)** | -- | -- | `GET /lgpd/meus-dados`, `POST /lgpd/exportar`, `POST /lgpd/anonimizar` | :warning: Backend tem endpoints completos. Frontend nao tem UI/servico que chame. |
| 20 | **Teams/Performance** | `teamPerformanceService.ts` | `efvm360-teams`, `efvm360-performance` | Nenhum | :x: Nenhum endpoint. Frontend faz CRUD local. |
| 21 | **Notificacoes** | -- | -- | Tabela `notificacoes` na migration 005 | :x: Tabela existe no schema. Nenhum controller/endpoint implementado. Frontend nao tem sistema de notificacoes server-side. |
| 22 | **Error Reports** | `ErrorReportService.ts` | `efvm360-error-reports` | Tabela `error_reports` na migration 005 | :x: Tabela existe. Nenhum endpoint. Frontend grava erros em localStorage. |
| 23 | **Feature Flags** | `featureFlags.ts` | `efvm360-feature-overrides` | `config/featureFlags.ts` (server-side static) | :warning: Frontend tem override local. Backend define flags mas nao expoe via API. |
| 24 | **i18n (Idioma)** | `i18n/index.ts` | `efvm360-idioma` | Campo `idioma` em `usuario_config` | :warning: Frontend salva local. Backend tem coluna. Nao sincronizados. |
| 25 | **Avatar** | `pages/perfil` | `efvm360-avatar-{matricula}` | Nenhum | :x: Base64 salvo em localStorage. Nenhum storage server-side. |
| 26 | **Intensificacao** | `pages/perfil` | `efvm360-intensificacao-{mat}` | Nenhum | :x: Texto salvo em localStorage. Sem endpoint. |
| 27 | **Confirmacoes de Entendimento** | `DashboardBI.tsx` | `efvm360-confirmacoes-entendimento` | Nenhum | :x: Registros locais. Sem persistencia server-side. |
| 28 | **Health Check** | `syncEngine.ts` (checa `/health`) | -- | `GET /health` | :white_check_mark: Backend tem health check funcional. SyncEngine o utiliza. |
| 29 | **Azure AD SSO** | `services/azure/azureAuth.ts` | -- | `POST /auth/azure` (feature flag) | :warning: Ambos lados tem codigo. Condicionado a feature flag `SSO_AZURE_AD`. |
| 30 | **Seed de Credenciais** | `seedCredentials.ts` | `efvm360-usuarios` + flags | Migration 005 (37 usuarios) | :warning: Seed duplicado: frontend gera via JS, backend via SQL. Podem divergir. |

**Legenda:** :white_check_mark: Funcional | :warning: Implementado mas desconectado | :x: Falta no backend | :black_square_button: Planejado

---

## Secao 2: Lacunas Criticas para Escalabilidade

### :x: 2.1 Equipamentos -- Sem endpoint

**O que o frontend faz:** `useEquipamentos.ts` gerencia CRUD completo (criar, editar, excluir, toggle ativo) de configuracoes de equipamentos ferroviarios (locomotivas, vagoes, etc.) em `efvm360-equipamentos-config`.

**O que o backend precisa:** Tabela `equipamentos` e endpoints REST `GET /equipamentos`, `POST /equipamentos`, `PATCH /equipamentos/:id`, `DELETE /equipamentos/:id`.

**Risco se nao implementado:** Cada dispositivo tem sua propria lista de equipamentos. Novo dispositivo comeca vazio. Impossivel gerar relatorios consolidados de equipamentos por patio.

---

### :x: 2.2 Graus de Risco -- Sem endpoint

**O que o frontend faz:** `useGrausRisco.ts` gerencia classificacoes de risco (criar, editar, excluir, toggle, score calculado) em `efvm360-graus-risco`.

**O que o backend precisa:** Tabela `graus_risco` e endpoints CRUD.

**Risco se nao implementado:** Classificacoes inconsistentes entre dispositivos. Inspecao feita com graus desatualizados.

---

### :x: 2.3 Teams/Performance -- Sem endpoint

**O que o frontend faz:** `teamPerformanceService.ts` armazena times e metricas de performance em `efvm360-teams` e `efvm360-performance`.

**O que o backend precisa:** Tabelas `equipes` e `desempenho_equipe` com endpoints CRUD + aggregation.

**Risco se nao implementado:** Dados de performance isolados por dispositivo. Gestor nao consegue comparar equipes cross-patio.

---

### :x: 2.4 Notificacoes -- Tabela existe, sem endpoint

**O que o frontend faz:** Nao tem sistema de notificacoes server-side.

**O que o backend precisa:** Controller com endpoints `GET /notificacoes`, `PATCH /notificacoes/:id/lida`, `POST /notificacoes` (admin broadcast).

**Risco se nao implementado:** Sem forma de avisar operadores sobre alertas criticos, mudancas de turno, aprovacoes pendentes.

---

### :x: 2.5 Error Reports -- Tabela existe, sem endpoint

**O que o frontend faz:** `ErrorReportService.ts` grava erros em `efvm360-error-reports` com tipo, stack trace, pagina, user-agent.

**O que o backend precisa:** Endpoint `POST /error-reports` para envio em batch quando online.

**Risco se nao implementado:** Erros em producao sao invisiveis para a equipe de desenvolvimento. Nenhuma observabilidade real.

---

### :x: 2.6 Avatar/Fotos -- Sem storage server-side

**O que o frontend faz:** Salva fotos de perfil como base64 em `efvm360-avatar-{matricula}`.

**O que o backend precisa:** Endpoint `POST /usuarios/:uuid/avatar` com upload para Azure Blob Storage ou S3. Base64 em localStorage ocupa ~500KB-2MB por usuario.

**Risco se nao implementado:** localStorage tem limite de ~5-10MB. Muitos avatares = storage esgotado, app quebra.

---

### :warning: 2.7 Patios -- Schema simplificado demais

**O que o frontend faz:** `usePatio.ts` gerencia patios com sub-entidades: linhas (`LinhaPatioInfo[]`), categorias (`CategoriaPatio[]`), AMVs (`AMV[]`), status ativo/inativo.

**O que o backend faz:** Tabela `patios` com apenas `codigo`, `nome`, `ativo`, `padrao`, `criado_por`. Sem colunas para linhas, categorias ou AMVs.

**O que precisa:** Ou colunas JSON para `linhas`, `categorias`, `amvs` na tabela `patios`, ou tabelas filhas normalizadas.

**Risco:** Sync de patios perderia toda a configuracao de linhas e AMVs.

---

### :warning: 2.8 Passagem -- Assinatura client-side vs server-side

**O que o frontend faz:** `usePassagemHandlers.ts` valida senha do operador no browser comparando hash em localStorage.

**O que o backend faz:** `POST /passagens/:uuid/assinar` faz `bcrypt.compare` server-side.

**Risco:** Enquanto a validacao for client-side, um usuario com acesso ao DevTools pode forjar assinatura editando localStorage.

---

## Secao 3: Analise de Escalabilidade

| # | Dimensao | Status | Detalhes |
|---|---------|--------|---------|
| 1 | **Multi-usuario** | :x: | Cada dispositivo tem copia independente dos dados. Sem sincronizacao real-time entre dispositivos. Dois operadores no mesmo patio verao dados diferentes. |
| 2 | **Persistencia duravel** | :x: | localStorage pode ser limpo pelo navegador, pelo usuario (limpar cache), ou por exceder quota. Nenhum backup automatico server-side. |
| 3 | **Sync offline** | :warning: | Tres implementacoes de SyncEngine existem (`services/syncEngine.ts`, `services/offlineSync.ts`, `infrastructure/persistence/SyncEngine.ts`). Nenhuma esta ativa nos fluxos de CRUD do usuario. A infraestrutura esta pronta mas desconectada. |
| 4 | **Seguranca da autenticacao** | :x: | Senhas sao hasheadas com bcrypt no frontend mas armazenadas em localStorage (legivel via DevTools). Backend tem JWT + bcrypt server-side mas nao e usado. Token JWT nunca e emitido em desenvolvimento. |
| 5 | **RBAC (Controle de Acesso)** | :warning: | Frontend implementa RBAC com 5 niveis (operador, oficial, inspetor, gestor, administrador). Backend tem `authorize()` middleware identico. Ambos funcionam, mas frontend depende de `efvm360-usuario` em localStorage (falsificavel). |
| 6 | **Trilha de auditoria** | :warning: | Frontend gera audit trail com hash chain em localStorage (`efvm360-auditoria`). Backend tem tabela `audit_trail` append-only com triggers MySQL que impedem UPDATE/DELETE. Frontend nao envia audit para backend. |
| 7 | **Rate limiting** | :white_check_mark: | Backend tem rate limiting global (100 req/15min) e login-especifico (5 tentativas/15min com key por IP+matricula). Frontend tem rate limiting local para login. |
| 8 | **CORS** | :white_check_mark: | Backend configura CORS com whitelist via `CORS_ORIGIN` env var. Padrao: `http://localhost:5173`. Credentials habilitado. Preflight cache 24h. |
| 9 | **HTTPS** | :warning: | Backend suporta SSL na conexao MySQL (`DB_SSL=true`). HSTS configurado (1 ano, includeSubDomains, preload). Porem em desenvolvimento tudo roda HTTP. Em producao depende do deploy (Azure App Service forca HTTPS). |
| 10 | **Backup** | :x: | Nenhum mecanismo de backup automatico. localStorage nao tem backup. Backend MySQL dependeria de Azure Backup ou pg_dump. Frontend tem "exportar/importar dados" manual na pagina de configuracoes. |
| 11 | **Migracoes** | :white_check_mark: | Backend tem 5 migracoes sequenciais com Sequelize (`001_initial` ate `005_missing_tables`). Criam 14 tabelas. Seed com 37 usuarios demo. Indexes e triggers bem definidos. |
| 12 | **Health check** | :white_check_mark: | `GET /health` testa conexao MySQL e retorna status, versao, uptime, environment. SyncEngine do frontend o utiliza para detectar disponibilidade do server. |
| 13 | **Tratamento de erros** | :warning: | Backend tem global error handler. Frontend tem `ErrorBoundary` e `ErrorReportService`. Porem erros de frontend nao sao enviados ao backend. |
| 14 | **Logging** | :warning: | Backend usa Morgan (combined em prod, dev em dev). Frontend tem `services/logging.ts` que grava em localStorage. Nenhum envio para servico externo (Sentry DSN configuravel mas vazio). |
| 15 | **Graceful shutdown** | :x: | Backend nao implementa `SIGTERM`/`SIGINT` handlers para fechar conexoes MySQL e requests em andamento antes de desligar. |

---

## Secao 4: Plano de Acao Priorizado

### P0 -- Bloqueante (Requisitos para producao)

| # | Acao | Justificativa | Esforco |
|---|------|--------------|---------|
| P0-1 | **Ativar fluxo de autenticacao JWT** | Toda seguranca depende disso. Frontend deve chamar `POST /auth/login` e armazenar tokens em memoria (nao localStorage). `useAuth.ts` deve ter modo "backend" vs "local". | 3-5 dias |
| P0-2 | **Conectar `useFormulario.salvarPassagem()` ao SyncEngine ativo** | Passagem de servico e o core business. Deve salvar local E enfileirar para sync. `usePassagemSync.ts` ja existe mas nao e usado pela UI. | 2-3 dias |
| P0-3 | **Ativar validacao de assinatura server-side** | Assinatura com verificacao de senha client-side e vulneravel. `POST /passagens/:uuid/assinar` ja faz bcrypt compare. | 1-2 dias |
| P0-4 | **Remover senhas do localStorage** | `efvm360-usuarios` contem `senha_hash` de TODOS os usuarios em localStorage. Qualquer usuario pode ver hashes de outros. Mover auth para backend. | 2-3 dias |
| P0-5 | **Implementar graceful shutdown no backend** | Requests em andamento podem corromper dados se o processo for morto durante sync batch. | 0.5 dia |

### P1 -- Importante (Primeira release multi-usuario)

| # | Acao | Justificativa | Esforco |
|---|------|--------------|---------|
| P1-1 | **Conectar `useDSS` ao backend** | DSS e obrigatorio por norma PRO-041945. Deve ser persistido de forma duravel. Endpoint ja existe. | 1-2 dias |
| P1-2 | **Conectar `usePatio` ao backend + expandir schema** | Adicionar colunas JSON `linhas`, `categorias`, `amvs` na tabela `patios`. Endpoints ja existem. | 2-3 dias |
| P1-3 | **Conectar `useConfig` ao backend** | Preferencias do usuario devem persistir entre dispositivos. Endpoint ja existe. | 1 dia |
| P1-4 | **Conectar aprovacao de cadastro/senha ao backend** | `approvalService.ts` deve chamar endpoints de `/gestao/*`. Backend tem controller completo. | 1-2 dias |
| P1-5 | **Unificar SyncEngine (3 implementacoes -> 1)** | `services/syncEngine.ts`, `services/offlineSync.ts`, `infrastructure/persistence/SyncEngine.ts` fazem a mesma coisa com contratos diferentes. Consolidar em um unico motor. | 3-5 dias |
| P1-6 | **Conectar audit trail ao backend** | `POST /audit/sync` ja aceita batch. Frontend deve enviar periodicamente. | 1-2 dias |

### P2 -- Desejavel (Qualidade e observabilidade)

| # | Acao | Justificativa | Esforco |
|---|------|--------------|---------|
| P2-1 | **Criar endpoints para equipamentos** | Tabela + controller + rotas. | 2 dias |
| P2-2 | **Criar endpoints para graus de risco** | Tabela + controller + rotas. | 1-2 dias |
| P2-3 | **Criar controller de notificacoes** | Tabela ja existe. Criar endpoints CRUD + websocket/SSE para push. | 2-3 dias |
| P2-4 | **Criar endpoint de error reports** | Tabela ja existe. Endpoint batch para envio periodico. | 1 dia |
| P2-5 | **Mover avatares para Azure Blob Storage** | Eliminar base64 de localStorage. Criar endpoint de upload com resize server-side. | 2-3 dias |
| P2-6 | **Configurar Sentry** | `VITE_SENTRY_DSN` ja e lido pelo config. Falta ativar e distribuir DSN. | 0.5 dia |
| P2-7 | **Criar docker-compose.yml** | Facilitar setup local com MySQL + backend + frontend. | 1 dia |

### P3 -- Futuro (Escalabilidade a longo prazo)

| # | Acao | Justificativa | Esforco |
|---|------|--------------|---------|
| P3-1 | **Ativar Azure AD SSO** | Codigo existe em ambos lados. Feature flag `SSO_AZURE_AD`. Precisa de tenant configurado. | 3-5 dias |
| P3-2 | **Criar endpoints para teams/performance** | Relatorios cross-patio para gestores. | 3 dias |
| P3-3 | **Expor feature flags via API** | Backend tem `config/featureFlags.ts` estatico. Criar endpoint para frontend consultar. | 1 dia |
| P3-4 | **Implementar WebSocket para sync real-time** | Substituir polling de 30s por push. Relevante com >50 usuarios simultaneos. | 5-8 dias |
| P3-5 | **Adicionar backup automatico** | Azure Backup para MySQL. Exportacao JSON periodica para Blob Storage. | 2-3 dias |
| P3-6 | **Implementar versionamento de API** | Prefixo `/api/v1` ja esta em uso. Criar `/api/v2` quando houver breaking changes. | Ongoing |

---

## Secao 5: Schema de Banco Sugerido (MySQL 8.0)

As tabelas abaixo sao as que **faltam** ou **precisam ser expandidas** para cobrir todas as funcionalidades do frontend. As tabelas que ja existem nas migracoes 001-005 (usuarios, passagens, audit_trail, refresh_tokens, alertas_operacionais, avaliacoes_5s, dss, cadastros_pendentes, senha_resets, usuario_config, adamboot_perfis, adamboot_conversas, notificacoes, error_reports, patios) nao sao repetidas aqui.

```sql
-- ============================================================================
-- EFVM360 -- Tabelas Faltantes para Alinhamento Completo Frontend<->Backend
-- MySQL 8.0 Compatible
-- ============================================================================

-- ============================================================================
-- 1. EQUIPAMENTOS (frontend: useEquipamentos.ts)
-- ============================================================================
CREATE TABLE IF NOT EXISTS `equipamentos` (
  `id`              INT UNSIGNED       NOT NULL AUTO_INCREMENT,
  `uuid`            CHAR(36)           NOT NULL,
  `codigo`          VARCHAR(20)        NOT NULL,
  `nome`            VARCHAR(120)       NOT NULL,
  `tipo`            ENUM('locomotiva', 'vagao', 'guindaste', 'balanca', 'outro')
                                       NOT NULL DEFAULT 'outro',
  `patio_codigo`    VARCHAR(5)         NULL     COMMENT 'Patio onde o equipamento esta alocado',
  `ativo`           TINYINT(1)         NOT NULL DEFAULT 1,
  `observacoes`     TEXT               NULL,
  `criado_por`      VARCHAR(20)        NULL     COMMENT 'Matricula de quem cadastrou',
  `created_at`      DATETIME           NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at`      DATETIME           NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  UNIQUE KEY `uk_equipamentos_uuid` (`uuid`),
  UNIQUE KEY `uk_equipamentos_codigo` (`codigo`),
  INDEX `idx_equipamentos_patio` (`patio_codigo`),
  INDEX `idx_equipamentos_tipo` (`tipo`),
  INDEX `idx_equipamentos_ativo` (`ativo`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
  COMMENT='Equipamentos ferroviarios gerenciados pelo frontend useEquipamentos.ts';


-- ============================================================================
-- 2. GRAUS DE RISCO (frontend: useGrausRisco.ts)
-- ============================================================================
CREATE TABLE IF NOT EXISTS `graus_risco` (
  `id`              INT UNSIGNED       NOT NULL AUTO_INCREMENT,
  `uuid`            CHAR(36)           NOT NULL,
  `nome`            VARCHAR(120)       NOT NULL,
  `descricao`       TEXT               NULL,
  `nivel`           ENUM('baixo', 'medio', 'alto', 'critico')
                                       NOT NULL DEFAULT 'medio',
  `score_risco`     DECIMAL(5,2)       NOT NULL DEFAULT 0.00
                                       COMMENT 'Score calculado baseado em criterios',
  `cor`             VARCHAR(7)         NULL     COMMENT 'Hex color code para UI',
  `criterios`       JSON               NULL     COMMENT 'Array de criterios [{nome, peso, valor}]',
  `ativo`           TINYINT(1)         NOT NULL DEFAULT 1,
  `criado_por`      VARCHAR(20)        NULL,
  `created_at`      DATETIME           NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at`      DATETIME           NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  UNIQUE KEY `uk_graus_risco_uuid` (`uuid`),
  INDEX `idx_graus_risco_nivel` (`nivel`),
  INDEX `idx_graus_risco_ativo` (`ativo`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
  COMMENT='Classificacoes de risco operacional';


-- ============================================================================
-- 3. EQUIPES (frontend: teamPerformanceService.ts)
-- ============================================================================
CREATE TABLE IF NOT EXISTS `equipes` (
  `id`              INT UNSIGNED       NOT NULL AUTO_INCREMENT,
  `uuid`            CHAR(36)           NOT NULL,
  `nome`            VARCHAR(120)       NOT NULL,
  `patio_codigo`    VARCHAR(5)         NULL,
  `turno`           ENUM('A', 'B', 'C', 'D') NULL,
  `lider_id`        INT UNSIGNED       NULL,
  `ativo`           TINYINT(1)         NOT NULL DEFAULT 1,
  `created_at`      DATETIME           NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at`      DATETIME           NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  UNIQUE KEY `uk_equipes_uuid` (`uuid`),
  INDEX `idx_equipes_patio` (`patio_codigo`),
  INDEX `idx_equipes_turno` (`turno`),
  CONSTRAINT `fk_equipes_lider` FOREIGN KEY (`lider_id`)
    REFERENCES `usuarios` (`id`) ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
  COMMENT='Equipes operacionais por patio/turno';


-- ============================================================================
-- 4. MEMBROS DE EQUIPE
-- ============================================================================
CREATE TABLE IF NOT EXISTS `equipe_membros` (
  `id`              INT UNSIGNED       NOT NULL AUTO_INCREMENT,
  `equipe_id`       INT UNSIGNED       NOT NULL,
  `usuario_id`      INT UNSIGNED       NOT NULL,
  `funcao_equipe`   VARCHAR(30)        NULL     COMMENT 'Funcao dentro da equipe',
  `ativo`           TINYINT(1)         NOT NULL DEFAULT 1,
  `created_at`      DATETIME           NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  UNIQUE KEY `uk_equipe_membro` (`equipe_id`, `usuario_id`),
  CONSTRAINT `fk_em_equipe` FOREIGN KEY (`equipe_id`)
    REFERENCES `equipes` (`id`) ON DELETE CASCADE,
  CONSTRAINT `fk_em_usuario` FOREIGN KEY (`usuario_id`)
    REFERENCES `usuarios` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;


-- ============================================================================
-- 5. DESEMPENHO DE EQUIPE
-- ============================================================================
CREATE TABLE IF NOT EXISTS `desempenho_equipe` (
  `id`              INT UNSIGNED       NOT NULL AUTO_INCREMENT,
  `equipe_id`       INT UNSIGNED       NOT NULL,
  `periodo_inicio`  DATE               NOT NULL,
  `periodo_fim`     DATE               NOT NULL,
  `metricas`        JSON               NOT NULL COMMENT 'KPIs calculados para o periodo',
  `passagens_total` INT UNSIGNED       NOT NULL DEFAULT 0,
  `dss_total`       INT UNSIGNED       NOT NULL DEFAULT 0,
  `score_geral`     DECIMAL(5,2)       NULL,
  `created_at`      DATETIME           NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  INDEX `idx_desemp_equipe` (`equipe_id`),
  INDEX `idx_desemp_periodo` (`periodo_inicio`, `periodo_fim`),
  CONSTRAINT `fk_desemp_equipe` FOREIGN KEY (`equipe_id`)
    REFERENCES `equipes` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;


-- ============================================================================
-- 6. CONFIRMACOES DE ENTENDIMENTO (frontend: DashboardBI.tsx)
-- ============================================================================
CREATE TABLE IF NOT EXISTS `confirmacoes_entendimento` (
  `id`              INT UNSIGNED       NOT NULL AUTO_INCREMENT,
  `uuid`            CHAR(36)           NOT NULL,
  `usuario_id`      INT UNSIGNED       NOT NULL,
  `passagem_uuid`   CHAR(36)           NULL     COMMENT 'Passagem associada',
  `tipo`            VARCHAR(50)        NOT NULL COMMENT 'Tipo de confirmacao (briefing, dss, alerta)',
  `confirmado`      TINYINT(1)         NOT NULL DEFAULT 0,
  `observacoes`     TEXT               NULL,
  `created_at`      DATETIME           NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  UNIQUE KEY `uk_conf_uuid` (`uuid`),
  INDEX `idx_conf_usuario` (`usuario_id`),
  CONSTRAINT `fk_conf_usuario` FOREIGN KEY (`usuario_id`)
    REFERENCES `usuarios` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;


-- ============================================================================
-- 7. AVATARES (frontend: pages/perfil)
-- ============================================================================
CREATE TABLE IF NOT EXISTS `avatares` (
  `id`              INT UNSIGNED       NOT NULL AUTO_INCREMENT,
  `usuario_id`      INT UNSIGNED       NOT NULL,
  `url`             VARCHAR(500)       NOT NULL COMMENT 'URL no Blob Storage (Azure/S3)',
  `content_type`    VARCHAR(50)        NOT NULL DEFAULT 'image/jpeg',
  `tamanho_bytes`   INT UNSIGNED       NULL,
  `created_at`      DATETIME           NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at`      DATETIME           NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  UNIQUE KEY `uk_avatar_usuario` (`usuario_id`),
  CONSTRAINT `fk_avatar_usuario` FOREIGN KEY (`usuario_id`)
    REFERENCES `usuarios` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
  COMMENT='Referencias a avatares armazenados em Blob Storage';


-- ============================================================================
-- 8. AUDITORIA DE EQUIPAMENTOS (frontend: tables/index.tsx)
-- ============================================================================
CREATE TABLE IF NOT EXISTS `equip_audit` (
  `id`              BIGINT UNSIGNED    NOT NULL AUTO_INCREMENT,
  `uuid`            CHAR(36)           NOT NULL,
  `equipamento_id`  INT UNSIGNED       NULL,
  `usuario_id`      INT UNSIGNED       NULL,
  `matricula`       VARCHAR(20)        NOT NULL,
  `acao`            VARCHAR(50)        NOT NULL COMMENT 'CRIADO, EDITADO, EXCLUIDO, TOGGLE_ATIVO',
  `dados_anteriores` JSON              NULL,
  `dados_novos`     JSON               NULL,
  `created_at`      DATETIME(3)        NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  PRIMARY KEY (`id`),
  UNIQUE KEY `uk_eaudit_uuid` (`uuid`),
  INDEX `idx_eaudit_equip` (`equipamento_id`),
  INDEX `idx_eaudit_data` (`created_at`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
  COMMENT='Auditoria de alteracoes em equipamentos';


-- ============================================================================
-- 9. EXPANSAO DA TABELA PATIOS (adicionar colunas JSON)
-- Execute via ALTER TABLE se a tabela ja existir
-- ============================================================================
ALTER TABLE `patios`
  ADD COLUMN IF NOT EXISTS `linhas`     JSON NULL COMMENT 'Array de LinhaPatioInfo [{numero, nome, status, ocupacao}]' AFTER `criado_por`,
  ADD COLUMN IF NOT EXISTS `categorias` JSON NULL COMMENT 'Array de CategoriaPatio [{nome, linhas}]' AFTER `linhas`,
  ADD COLUMN IF NOT EXISTS `amvs`       JSON NULL COMMENT 'Array de AMV [{id, posicao, observacao}]' AFTER `categorias`;


-- ============================================================================
-- 10. FEATURE FLAGS (exposicao via API)
-- ============================================================================
CREATE TABLE IF NOT EXISTS `feature_flags` (
  `id`              INT UNSIGNED       NOT NULL AUTO_INCREMENT,
  `chave`           VARCHAR(100)       NOT NULL,
  `valor`           TINYINT(1)         NOT NULL DEFAULT 0,
  `descricao`       VARCHAR(500)       NULL,
  `ambiente`        ENUM('all', 'development', 'staging', 'production')
                                       NOT NULL DEFAULT 'all',
  `updated_at`      DATETIME           NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  UNIQUE KEY `uk_ff_chave_ambiente` (`chave`, `ambiente`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

INSERT IGNORE INTO `feature_flags` (`chave`, `valor`, `descricao`, `ambiente`) VALUES
  ('SSO_AZURE_AD',           0, 'Habilita login via Azure AD/Entra ID', 'all'),
  ('LGPD_ANONIMIZAR',        1, 'Permite anonimizacao de dados (LGPD)', 'all'),
  ('AUDIT_BLOCKCHAIN',       1, 'Habilita cadeia de hash blockchain-like no audit trail', 'all'),
  ('SYNC_ENGINE',            0, 'Habilita motor de sincronizacao offline-first', 'all'),
  ('ADAMBOOT_AI',            0, 'Habilita chamadas para Anthropic API no AdamBoot', 'all'),
  ('NOTIFICATIONS_PUSH',     0, 'Habilita notificacoes push via WebSocket/SSE', 'all');
```

---

## Apendice A: Mapa Completo de Storage Keys

| Chave localStorage | Descricao | Escrito por | Sensivel? |
|--------------------|-----------|-------------|-----------|
| `efvm360-config` | Configuracoes do sistema (tema, idioma, preferencias) | `useConfig.ts` | Nao |
| `efvm360-usuario` | Dados do usuario logado (sem senha) | `useAuth.ts` | Sim (dados pessoais) |
| `efvm360-usuarios` | **Array de TODOS os usuarios com senha_hash** | `useAuth.ts`, `seedCredentials.ts` | **CRITICO** |
| `efvm360-historico` | Array de passagens de turno concluidas | `useFormulario.ts` | Sim (dados operacionais) |
| `efvm360-rascunho` | Rascunho da passagem em andamento | `useFormulario.ts` | Nao |
| `efvm360-dss-historico` | Array de DSS concluidos | `useDSS.ts` | Sim |
| `efvm360-dss-atual` | Rascunho do DSS em andamento | `useDSS.ts` | Nao |
| `efvm360-confirmacoes-entendimento` | Confirmacoes de briefing | `DashboardBI.tsx` | Nao |
| `efvm360-sessao` | Dados da sessao ativa | `useSession.ts` | Sim (token local) |
| `efvm360-session-auth` | Blob assinado da sessao | `useAuth.ts` | Sim |
| `efvm360-seed-v6` | Flag de seed executado | `useAuth.ts` | Nao |
| `efvm360-auditoria` | Log de auditoria local | `permissions.ts` | Sim |
| `efvm360-sessao-data` | Dados da sessao de permissoes | `permissions.ts` | Sim |
| `efvm360-logs` | Logs operacionais | `logging.ts` | Nao |
| `efvm360-offline-pending` | Items pendentes offline | `useOnlineStatus.ts` | Nao |
| `efvm360-offline-last-sync` | Timestamp do ultimo sync | `useOnlineStatus.ts` | Nao |
| `efvm360-export-history` | Historico de exportacoes BI | `DashboardBI.tsx` | Nao |
| `efvm360-registration-requests` | Solicitacoes de cadastro pendentes | `approvalService.ts` | Sim |
| `efvm360-password-requests` | Solicitacoes de reset de senha | `approvalService.ts` | **CRITICO** |
| `efvm360-teams` | Equipes operacionais | `teamPerformanceService.ts` | Nao |
| `efvm360-performance` | Dados de desempenho | `teamPerformanceService.ts` | Nao |
| `efvm360-patios` | Configuracao de patios | `usePatio.ts` | Nao |
| `efvm360-graus-risco` | Classificacoes de risco | `useGrausRisco.ts` | Nao |
| `efvm360-equipamentos-config` | Equipamentos ferroviarios | `useEquipamentos.ts` | Nao |
| `efvm360-idioma` | Locale do usuario | `i18n/index.ts` | Nao |
| `efvm360-avatar-{mat}` | Base64 do avatar do usuario | `pages/perfil` | Sim (imagem pessoal) |
| `efvm360-equip-audit` | Auditoria de equipamentos | `tables/index.tsx` | Nao |

---

## Apendice B: Mapa de Endpoints do Backend

| Metodo | Rota | Auth | Authz | Controller | Validators |
|--------|------|------|-------|------------|------------|
| GET | `/health` | -- | -- | inline | -- |
| POST | `/auth/login` | -- | -- | `authController.login` | loginRateLimit, loginValidator |
| POST | `/auth/refresh` | -- | -- | `authController.refresh` | refreshValidator |
| POST | `/auth/logout` | JWT | -- | `authController.logout` | -- |
| POST | `/auth/alterar-senha` | JWT | -- | `authController.alterarSenha` | alterarSenhaValidator |
| GET | `/auth/me` | JWT | -- | `authController.me` | -- |
| GET | `/passagens` | JWT | -- | `passagensController.listar` | listarPassagensValidator |
| GET | `/passagens/:uuid` | JWT | -- | `passagensController.obter` | uuidParamValidator |
| POST | `/passagens` | JWT | -- | `passagensController.salvar` | salvarPassagemValidator |
| POST | `/passagens/:uuid/assinar` | JWT | -- | `passagensController.assinar` | assinarPassagemValidator |
| GET | `/audit` | JWT | inspetor+ | `auditController.listar` | listarAuditValidator |
| GET | `/audit/integridade` | JWT | admin | `auditController.verificarIntegridade` | -- |
| POST | `/audit/sync` | JWT | -- | `auditController.sincronizar` | sincronizarAuditValidator |
| GET | `/usuarios` | JWT | gestor+ | `usersController.listar` | -- |
| POST | `/usuarios` | JWT | admin | `usersController.criar` | criarUsuarioValidator |
| PATCH | `/usuarios/:uuid` | JWT | admin | `usersController.atualizar` | uuidParam + atualizarUsuarioValidator |
| GET | `/lgpd/meus-dados` | JWT | -- | `lgpdController.meusDados` | -- |
| POST | `/lgpd/exportar` | JWT | -- | `lgpdController.exportar` | lgpdExportRateLimit |
| POST | `/lgpd/anonimizar` | JWT | admin | `lgpdController.anonimizar` | anonimizarValidator |
| GET | `/patios` | JWT | -- | `patiosController.listarAtivos` | -- |
| GET | `/patios/todos` | JWT | inspetor+ | `patiosController.listar` | -- |
| POST | `/patios` | JWT | inspetor+ | `patiosController.criar` | criarPatioValidator |
| PATCH | `/patios/:codigo` | JWT | inspetor+ | `patiosController.atualizar` | atualizarPatioValidator |
| GET | `/dss` | JWT | -- | `dssController.listar` | -- |
| GET | `/dss/:uuid` | JWT | -- | `dssController.obter` | uuidParamValidator |
| POST | `/dss` | JWT | -- | `dssController.salvar` | -- |
| GET | `/bi/kpis` | JWT | -- | `biController.kpis` | -- |
| GET | `/bi/resumo-yard` | JWT | inspetor+ | `biController.resumoYard` | -- |
| GET | `/gestao/cadastros` | JWT | gestor+ | `gestaoController.listarCadastros` | -- |
| POST | `/gestao/cadastros/:uuid/aprovar` | JWT | gestor+ | `gestaoController.aprovarCadastro` | uuidParamValidator |
| POST | `/gestao/cadastros/:uuid/rejeitar` | JWT | gestor+ | `gestaoController.rejeitarCadastro` | uuidParamValidator |
| GET | `/gestao/senha-resets` | JWT | gestor+ | `gestaoController.listarSenhaResets` | -- |
| POST | `/gestao/senha-resets/:uuid/aprovar` | JWT | gestor+ | `gestaoController.aprovarSenhaReset` | uuidParamValidator |
| GET | `/adamboot/perfil/:mat?` | JWT | -- | `adambootController.obterPerfil` | -- |
| POST | `/adamboot/acesso` | JWT | -- | `adambootController.registrarAcesso` | -- |
| GET | `/config` | JWT | -- | `configController.obter` | -- |
| PATCH | `/config` | JWT | -- | `configController.atualizar` | -- |
| POST | `/sync/passagens` | JWT | -- | `syncController.sincronizarBatch` | sincronizarBatchValidator |
| GET | `/sync/status` | JWT | -- | `syncController.statusSync` | -- |
| GET | `/sync/conflicts` | JWT | -- | `syncController.listarConflitos` | -- |
| POST | `/auth/azure` | Azure | -- | `authController.login` | validateAzureToken (conditional) |

---

## Apendice C: Tabelas Existentes no Backend (Migracoes 001-005)

| # | Tabela | Migration | Modelo Sequelize | Observacoes |
|---|--------|-----------|-----------------|-------------|
| 1 | `usuarios` | 001 | `Usuario` | 13 colunas, bcrypt, Azure AD OID |
| 2 | `refresh_tokens` | 001 | -- (raw query) | Token rotation |
| 3 | `passagens` | 001 | `Passagem` | 18 colunas, 6 JSON fields |
| 4 | `audit_trail` | 001 | `AuditTrail` | Append-only, triggers block UPDATE/DELETE |
| 5 | `alertas_operacionais` | 001 | -- | Alertas criticos/atencao/info |
| 6 | `avaliacoes_5s` | 001 | -- | Historico 5S por passagem |
| 7 | `patios` | 004 | `Patio` | Simplificado (sem linhas/AMVs) |
| 8 | `dss` | 005 | `DSS` | Dialogo de Seguranca |
| 9 | `cadastros_pendentes` | 005 | `CadastroPendente` | Fluxo de aprovacao |
| 10 | `senha_resets` | 005 | `SenhaReset` | Fluxo de reset |
| 11 | `usuario_config` | 005 | `UsuarioConfig` | Tema, idioma, preferencias |
| 12 | `adamboot_perfis` | 005 | `AdamBootPerfil` | Proficiencia do usuario |
| 13 | `adamboot_conversas` | 005 | -- | Historico de chat |
| 14 | `notificacoes` | 005 | -- | **Sem controller** |
| 15 | `error_reports` | 005 | -- | **Sem controller** |

---

*Documento gerado automaticamente por analise de codigo-fonte em 2026-03-01.*
*Fontes: frontend/src/ (hooks, services, pages, components, infrastructure) + backend/src/ (routes, controllers, models, migrations, middleware).*
