# EFVM Pátio 360 — Plataforma Enterprise de Gestão de Troca de Turno Ferroviário

## Visão Geral

Sistema enterprise de gestão de troca de turno para o corredor ferroviário Vitória-Minas (Vale S.A.).
Digitaliza o handover operacional entre turnos em pátios ferroviários, com:
- **DDD** (Domain-Driven Design) com 5 aggregates
- **Event Sourcing** com 16 domain events
- **CQRS** com EventProjector e projeções materializadas
- **Offline-first** (IndexedDB + SyncEngine)
- **IntegrityService** com cadeia SHA-256 blockchain-like
- **RBAC** com 4 níveis hierárquicos

## Stack

- **Frontend:** React 18 + TypeScript + Vite
- **State:** localStorage + IndexedDB (offline-first, sem backend ativo)
- **Styling:** Inline styles + CSS (glassmorphism, Vale corporate green/yellow)
- **Tests:** Vitest (387/387 passando)

## Comandos

```bash
pnpm dev           # Inicia dev server (porta 3000)
pnpm fresh         # Limpa cache Vite + inicia (rm -rf node_modules/.vite dist && vite)
pnpm build         # Build produção (tsc && vite build)
pnpm type-check    # Verificação de tipos
pnpm test          # Roda test suite
```

## Estrutura do Projeto

```
src/
├── domain/              # 🏛️ 100% puro — ZERO deps de infra/UI
│   ├── aggregates/      #   LocomotiveInspection, YardConfig, YardRegistry, UserAggregate
│   ├── contracts.ts     #   5 aggregates, enums, semantic versioning, anti-corruption layer
│   ├── events/          #   ServicePassEvents (6) + UserEvents (10)
│   ├── policies/        #   OperationalPolicies (9 regras ferroviárias) + RBACPolicy
│   ├── ports/           #   IEventStore, ISnapshotStore, ISyncQueue (DIP)
│   ├── services/        #   IntegrityService (SHA-256 chain, selamento write-once)
│   └── value-objects/   #   TrainStatus, AlertLevel, Turno
├── application/         # 📋 Use Cases (framework-free)
│   └── use-cases/       #   ServicePassUseCases (create, sign, inspect, weigh, alert)
├── infrastructure/      # ⚙️ Adapters
│   ├── cqrs/            #   EventProjector (projections + rebuild)
│   ├── observability/   #   ObservabilityEngine (metrics, health)
│   └── persistence/     #   IndexedDBEventStore, SyncEngine, ConflictResolution
├── hooks/               # 🎣 React adapters (useAuth, usePermissions, useDSS, etc.)
├── pages/               # 📄 Páginas (passagem, dss, gestao, historico, config, etc.)
├── components/          # 🧩 UI (TopNavbar, BottomNav, DashboardBI, AdamBot, etc.)
│   └── AdamBot/         #   AdamBotBriefing (briefing automático), AdamBotCopilot (validação por seção),
│                        #   useBriefingData (hook coletor), AdamBotContext (addBotMessage)
├── services/            # 🔧 Auth, security, validation, sync, seedCredentials
├── types/               # 📝 TypeScript types
└── _deprecated/         # 🗄️ Código morto em quarentena
```

## Credenciais de Teste

**Senha padrão:** `123456` (todos os usuários)

### Usuários por Nível de Acesso

| Matrícula | Senha | Função | Pátio | Acesso |
|-----------|-------|--------|-------|--------|
| VFZ1001 | 123456 | Maquinista | Flexal | Boa Jornada, DSS, BI+, Layout |
| VFZ2001 | 123456 | Inspetor | Flexal | Tudo + Gestão (equipes, ranking) |
| VFZ3001 | 123456 | Gestor | Flexal | Tudo + Aprovações |
| ADM9001 | 123456 | Gestor | Global | Acesso total a todos os pátios |

### 5 Pátios (7 usuários cada)

- **VFZ** — Flexal (Tubarão): VFZ1001-VFZ3001
- **VBR** — Barão de Cocais: VBR1001-VBR3001
- **VCS** — Costa Lacerda: VCS1001-VCS3001
- **P6** — Pedro Nolasco: P61001-P63001
- **VTO** — Tubarão Outbound: VTO1001-VTO3001

### Estrutura por Pátio

- XXX1001-1002: Maquinistas Turno A (07-19)
- XXX1003-1004: Maquinistas Turno B (19-07)
- XXX1005: Oficial Turno A
- XXX2001: Inspetor
- XXX3001: Gestor

## Seed de Credenciais

O seed roda automaticamente via `useAuth` → `seedCredentials()` no primeiro load.
Se o login falhar, limpar o storage:

```js
// No console do browser (F12):
localStorage.clear(); sessionStorage.clear(); location.reload();
```

## Arquitetura — Regras Críticas

1. **Domain é SAGRADO:** Nunca importar infrastructure, components, pages, hooks ou services dentro de `domain/`.
2. **Troca de turno selada é WRITE-ONCE:** IntegrityService gera hash SHA-256 encadeado. Edição pós-selamento é bloqueada.
3. **Events em past tense:** `ServicePassCreated`, `WeighingRecorded`, `AlertGenerated`.
4. **Conflict Resolution por tipo:** APPEND-ONLY→auto_merge, WRITE-ONCE→first_writer_wins, STATE→version_check, CONFIG→server_wins.
5. **Offline-first:** Toda operação deve funcionar sem rede. SyncEngine sincroniza quando online.
6. **BI é suporte, não vigilância:** Métricas devem responder "qual trilho dá mais problema?" e não "quem trabalhou menos?".

## Vite Config

O projeto usa `optimizeDeps.force: true` e `resolve.dedupe: ['react', 'react-dom']` para evitar erros de cache stale (React null dispatcher). Se aparecer `TypeError: Cannot read properties of null (reading 'useState')`, rodar `pnpm fresh`.

## Testes

```bash
pnpm test                              # 387 testes (domain + services + components + hooks + stress)
pnpm exec vitest run --reporter=verbose  # Output detalhado
```

### Arquivos de teste

| Arquivo | Testes | Descrição |
|---------|--------|-----------|
| `__tests__/domain/domain.test.ts` | 63 | Aggregates, value objects, events |
| `__tests__/domain/policies.test.ts` | 52 | OperationalPolicies + RBACPolicy |
| `__tests__/components/AdamBotCopilot.test.ts` | 47 | Validação por seção + resumo executivo |
| `__tests__/services/validacao.test.ts` | 42 | Validação de formulário |
| `__tests__/components/AdamBotBriefing.test.ts` | 30 | Briefing automático + detectarTurnoAtual |
| `__tests__/services/logging.test.ts` | 28 | ObservabilityEngine |
| `__tests__/services/security.test.ts` | 24 | Sessão assinada, HMAC |
| `__tests__/infrastructure/conflictResolution.test.ts` | 19 | Estratégias de conflito |
| `__tests__/services/permissions.test.ts` | 16 | RBAC por nível |
| `__tests__/stress/stress.test.ts` | 13 | 10K seals, 50K events |
| `__tests__/components/AdamBotTendencias.test.ts` | 15 | Análise de tendências + carregarHistorico |
| `__tests__/hooks/useFormulario.test.ts` | 10 | Hook de formulário |
| `__tests__/hooks/useEquipe.test.ts` | 12 | Equipe por pátio + agrupamento hierárquico |
| `__tests__/hooks/useAuth.test.ts` | 10 | Autenticação + seed |
| `__tests__/components/AdamBotVoice.test.ts` | 6 | TTS masculina + seleção de voz |
| `__tests__/fixtures/dadosFormulario.ts` | — | Fixtures compartilhadas (criarDadosVazios, criarDadosCompletos) |

### Nota técnica

`vi.useFakeTimers()` é incompatível com jsdom no Vitest 2.1.9 (causa `TypeError: Object prototype may only be an Object or null`). Usar mock manual de `Date` via `Object.defineProperty` — ver `AdamBotBriefing.test.ts` para o pattern.

## Idioma

- **Código:** Inglês (nomes de funções, types, interfaces, events)
- **UI/Labels:** Português BR (textos visíveis ao operador)
- **Terminologia ferroviária:** AMV, interdição, manobra, pátio, locomotiva, vagão, composição
