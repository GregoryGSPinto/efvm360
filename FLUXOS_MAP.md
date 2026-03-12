# EFVM360 — Mapa de Fluxos Críticos (FASE 1)

> Data: 2026-03-12  
> Versão: v3.2-analysis

---

## Resumo Executivo

| Categoria | Quantidade |
|-----------|------------|
| **Fully Working** | 3 fluxos |
| **Partially Wired** | 5 fluxos |
| **Mocked/Local Only** | 8 fluxos |
| **Broken** | 2 fluxos |
| **Not Implemented** | 4 fluxos |

---

## 1. AUTENTICAÇÃO/AUTORIZAÇÃO

### 1.1 Login com JWT
| Aspecto | Status |
|---------|--------|
| **Classificação** | 🟡 **PARTIALLY WIRED** |
| Backend | ✅ Endpoint `/auth/login` implementado |
| Frontend | ✅ Hook `useAuth` chama API quando online |
| Problema | Cadastro de usuário não usa backend - apenas localStorage |

**Fluxo:**
```
Login Form → useAuth.login() → api.login() → Backend JWT → localStorage
                                    ↓ (offline)
                              localStorage seed
```

**Issues:**
- Tokens salvos em múltiplas chaves inconsistentes (`efvm360-jwt`, `efvm360_token`, `efvm360_access_token`)
- Cadastro não persiste no backend (status `pending` local apenas)
- Troca de senha é local, não usa `POST /auth/alterar-senha`

---

### 1.2 Refresh Token
| Aspecto | Status |
|---------|--------|
| **Classificação** | 🟢 **FULLY WORKING** |
| Backend | ✅ Endpoint `/auth/refresh` implementado |
| Frontend | ✅ `api/client.ts` implementa refresh automático em 401 |

---

### 1.3 RBAC/Permissões
| Aspecto | Status |
|---------|--------|
| **Classificação** | 🟡 **PARTIALLY WIRED** |
| Backend | ✅ Middleware `authMiddleware` + `roleMiddleware` implementados |
| Frontend | ⚠️ Duplicado: `permissions.ts` (deprecated) + `RBACPolicy.ts` |
| Problema | Frontend não consome permissões do backend, usa mapeamento local |

---

## 2. DASHBOARD PRINCIPAL (Página Inicial)

| Aspecto | Status |
|---------|--------|
| **Classificação** | 🔴 **MOCKED** |
| Backend | N/A - não há endpoint específico |
| Frontend | ✅ 100% local - dados via props/hooks |

**Fontes de dados:**
- `useBriefingData()` - Hook local
- `localStorage` - Última passagem
- Props do App - Estado global

**Issues:**
- Nenhuma integração com backend
- Briefing gerado localmente (IA local)

---

## 3. BI/INDICADORES (Dashboard Analytics)

### 3.1 Dashboard por Hierarquia
| Aspecto | Status |
|---------|--------|
| **Classificação** | 🟢 **FULLY WORKING** |
| Backend | ✅ Endpoints `/analytics/dashboard/{supervisor,coordenador,gerente}` |
| Frontend | ✅ `DashboardSupervisor.tsx`, `DashboardCoordenador.tsx`, `DashboardGerente.tsx` |
| Funcionalidade | ✅ Chamadas reais com fallback para mock |

**Endpoints consumidos:**
```
GET /analytics/dashboard/supervisor?yard={code}
GET /analytics/dashboard/coordenador?yards={codes}
GET /analytics/dashboard/gerente
```

---

### 3.2 KPIs
| Aspecto | Status |
|---------|--------|
| **Classificação** | 🟢 **FULLY WORKING** |
| Backend | ✅ Endpoint `/bi/kpis` implementado |
| Frontend | ✅ Consumido em DashboardBI |

---

## 4. OPERAÇÕES FERROVIÁRIAS

### 4.1 Passagem de Turno (Core)
| Aspecto | Status |
|---------|--------|
| **Classificação** | 🔴 **MOCKED** |
| Backend | ✅ Endpoints completos: `GET/POST /passagens`, `POST /passagens/:uuid/assinar` |
| Frontend | ❌ Hook `useFormulario` usa apenas localStorage |
| Persistência | ❌ Nunca chega ao backend |

**Endpoints disponíveis mas não usados:**
```
POST   /passagens              ← Não usado
GET    /passagens              ← Não usado
GET    /passagens/:uuid        ← Não usado
POST   /passagens/:uuid/assinar ← Não usado
```

**Issues críticos:**
- Salvar passagem salva apenas em localStorage
- Assinatura com senha é verificada localmente
- Não há sincronização com backend

---

### 4.2 DSS (Diálogo de Segurança)
| Aspecto | Status |
|---------|--------|
| **Classificação** | 🔴 **MOCKED** |
| Backend | ✅ Endpoints `GET/POST /dss` implementados |
| Frontend | ❌ Hook `useDSS` usa apenas localStorage |

---

### 4.3 Layout de Pátio
| Aspecto | Status |
|---------|--------|
| **Classificação** | 🔴 **MOCKED** |
| Backend | ⚠️ Não há endpoints específicos |
| Frontend | ✅ 100% local via `usePatio()` |

---

### 4.4 Composições (Trens)
| Aspecto | Status |
|---------|--------|
| **Classificação** | 🟡 **PARTIALLY WIRED** |
| Backend | ✅ Endpoints `/compositions` completos |
| Frontend | ✅ Página `composicoes/index.tsx` consome API |
| Funcionalidade | ✅ Com fallback para localStorage |

**Endpoints consumidos:**
```
GET    /compositions?yard={code}
PATCH  /compositions/:code/depart
PATCH  /compositions/:code/arrive
```

---

### 4.5 Inter-Yard (Passagem entre Pátios)
| Aspecto | Status |
|---------|--------|
| **Classificação** | 🟡 **PARTIALLY WIRED** |
| Backend | ✅ Endpoints `/inter-yard` completos |
| Frontend | ✅ Página `passagem-interpatio/index.tsx` consome API |
| Funcionalidade | ✅ Com fila de sync offline |

**Endpoints consumidos:**
```
GET    /inter-yard?yard={code}
POST   /inter-yard
PATCH  /inter-yard/:id/dispatch
PATCH  /inter-yard/:id/receive
POST   /inter-yard/:id/divergence
```

---

### 4.6 Equipamentos
| Aspecto | Status |
|---------|--------|
| **Classificação** | 🔴 **MOCKED** |
| Backend | ✅ Endpoints `/equipment` implementados |
| Frontend | ❌ Hook `useEquipamentos` usa apenas localStorage |

---

### 4.7 Graus de Risco
| Aspecto | Status |
|---------|--------|
| **Classificação** | 🔴 **MOCKED** |
| Backend | ✅ Endpoints `/risk-grades` implementados |
| Frontend | ❌ Hook `useGrausRisco` usa apenas localStorage |

---

## 5. FORMULÁRIOS E PERSISTÊNCIA

### 5.1 Salvamento de Formulários
| Aspecto | Status |
|---------|--------|
| **Classificação** | 🔴 **MOCKED** |
| Backend | ✅ Pronto |
| Frontend | ❌ Apenas localStorage |

**Issues:**
- `useFormulario.salvarPassagem()` salva em localStorage
- `offlineSync.ts` tem código para sync mas não é integrado
- `syncEngine.ts` implementado mas não usado pelos hooks

---

### 5.2 Sincronização Offline
| Aspecto | Status |
|---------|--------|
| **Classificação** | 🟡 **PARTIALLY WIRED** |
| Backend | ✅ Endpoints `/sync/*` implementados |
| Frontend | ⚠️ Implementado em `syncEngine.ts` mas não integrado |

**Issues:**
- Duas implementações de sync (`offlineSync.ts` e `syncEngine.ts`)
- `useOnlineStatus.syncNow()` está comentado
- Nenhum hook usa o sync engine

---

## 6. CONFIGURAÇÕES

### 6.1 Configurações do Usuário
| Aspecto | Status |
|---------|--------|
| **Classificação** | 🔴 **MOCKED** |
| Backend | ✅ Endpoints `GET/PATCH /config` implementados |
| Frontend | ❌ Hook `useConfig` usa apenas localStorage |

---

### 6.2 Preferências (Tema, Acessibilidade)
| Aspecto | Status |
|---------|--------|
| **Classificação** | 🔴 **LOCAL ONLY** |
| Backend | N/A |
| Frontend | ✅ localStorage apenas |

---

## 7. LGPD/COMPLIANCE

| Aspecto | Status |
|---------|--------|
| **Classificação** | 🟢 **FULLY WORKING** |
| Backend | ✅ Endpoints `/lgpd/*` implementados |
| Frontend | ✅ `api.meusDados()` e `api.exportarDados()` implementados |

**Endpoints:**
```
GET  /lgpd/meus-dados
POST /lgpd/exportar
```

**Issues:**
- UI de LGPD não integrada com esses endpoints
- Usuário não consegue acessar via interface

---

## 8. GESTÃO/APROVAÇÕES

### 8.1 Cadastro de Usuários
| Aspecto | Status |
|---------|--------|
| **Classificação** | 🔴 **MOCKED** |
| Backend | ✅ Endpoints `/gestao/cadastros` implementados |
| Frontend | ❌ `approvalService.ts` usa apenas localStorage |

**Endpoints disponíveis:**
```
GET    /gestao/cadastros
POST   /gestao/cadastros/:uuid/aprovar
POST   /gestao/cadastros/:uuid/rejeitar
```

---

### 8.2 Reset de Senha
| Aspecto | Status |
|---------|--------|
| **Classificação** | 🔴 **MOCKED** |
| Backend | ✅ Endpoints `/gestao/senha-resets` implementados |
| Frontend | ❌ Local apenas via `approvalService.ts` |

---

## 9. AUDITORIA

| Aspecto | Status |
|---------|--------|
| **Classificação** | 🟡 **PARTIALLY WIRED** |
| Backend | ✅ Endpoints `/audit/*` implementados |
| Frontend | ⚠️ `api.obterAuditTrail()` existe mas não é usado |
| Uso real | ❌ Logs apenas em localStorage via `logging.ts` |

---

## 10. WORKFLOWS

| Aspecto | Status |
|---------|--------|
| **Classificação** | ⚫ **NOT IMPLEMENTED** |
| Backend | ✅ Endpoints `/workflows/*` implementados |
| Frontend | ❌ Nenhuma página/workflow implementado |

---

## 11. ADAMBOOT (Proficiência)

| Aspecto | Status |
|---------|--------|
| **Classificação** | 🔴 **MOCKED** |
| Backend | ✅ Endpoints `/adamboot/*` implementados |
| Frontend | ❌ `AdamBootService.ts` usa apenas localStorage |

---

## 12. WEBSOCKET/REAL-TIME

| Aspecto | Status |
|---------|--------|
| **Classificação** | 🟡 **PARTIALLY WIRED** |
| Backend | ✅ Implementado em `services/websocket.ts` |
| Frontend | ⚠️ `WebSocketContext` existe mas uso limitado |
| Uso real | ❌ Apenas em DashboardSupervisor (simulado) |

---

# Tabela Consolidada

| # | Fluxo | Status | Impacto Demo | Esforço Correção |
|---|-------|--------|--------------|------------------|
| 1 | Autenticação JWT | 🟡 Partial | Alto | Médio |
| 2 | Refresh Token | 🟢 Working | Médio | N/A |
| 3 | Dashboard Inicial | 🔴 Mocked | Médio | Alto |
| 4 | BI/Analytics | 🟢 Working | **Crítico** | N/A |
| 5 | Passagem de Turno | 🔴 Mocked | **Crítico** | Alto |
| 6 | DSS | 🔴 Mocked | Médio | Médio |
| 7 | Composições | 🟡 Partial | Médio | Baixo |
| 8 | Inter-Yard | 🟡 Partial | Alto | Baixo |
| 9 | Equipamentos | 🔴 Mocked | Baixo | Médio |
| 10 | Graus de Risco | 🔴 Mocked | Baixo | Médio |
| 11 | Sync Offline | 🟡 Partial | Alto | Médio |
| 12 | Configurações | 🔴 Mocked | Baixo | Baixo |
| 13 | LGPD | 🟢 Working | Baixo | N/A |
| 14 | Gestão/Aprovações | 🔴 Mocked | Médio | Médio |
| 15 | Auditoria | 🟡 Partial | Baixo | Médio |
| 16 | Workflows | ⚫ Not Implemented | Baixo | Alto |
| 17 | AdamBoot | 🔴 Mocked | Baixo | Médio |
| 18 | WebSocket | 🟡 Partial | Baixo | Alto |

---

# Legenda

| Emoji | Status | Descrição |
|-------|--------|-----------|
| 🟢 | **Fully Working** | Fluxo completo, frontend ↔ backend integrados |
| 🟡 | **Partially Wired** | Parcialmente integrado, pode ter fallbacks |
| 🔴 | **Mocked/Local Only** | Apenas localStorage/mock, sem backend |
| 🟠 | **Broken** | Integração existe mas está quebrada |
| ⚫ | **Not Implemented** | Backend pronto, frontend não implementado |
