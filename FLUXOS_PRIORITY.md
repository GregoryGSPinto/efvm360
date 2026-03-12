# EFVM360 — Priorização de Correções (FASE 2)

> Data: 2026-03-12  
> Objetivo: Maximizar percepção de produto funcional para demonstração enterprise

---

## Critérios de Priorização

1. **Visibilidade na Interface** — Fluxos que o usuário vê e interage diretamente
2. **Valor de Negócio Claro** — Funcionalidades que resolvem problemas reais
3. **Backend Pronto** — Endpoints já existem, só precisam ser conectados
4. **Esforço vs Impacto** — Correções rápidas com alto retorno

---

## 🎯 Prioridade 1 — CRÍTICO (Deve estar 100% para demo)

### 1. Passagem de Turno (Core)
| Aspecto | Valor |
|---------|-------|
| **Impacto Demo** | ⭐⭐⭐⭐⭐ Produto não faz sentido sem isso |
| **Visibilidade** | Tela principal, fluxo mais usado |
| **Backend** | ✅ 100% pronto |
| **Esforço** | Alto (mudança arquitetural no hook) |
| **Risco** | Alto — funcionalidade central |

**Problema:** Hook `useFormulario` salva apenas em localStorage  
**Solução:** Integrar `api.criarPassagem()` no `salvarPassagem()`

---

### 2. Dashboard BI/Analytics
| Aspecto | Valor |
|---------|-------|
| **Impacto Demo** | ⭐⭐⭐⭐⭐ Percepção de "sistema enterprise" |
| **Visibilidade** | Tela de destaque para gestores |
| **Backend** | ✅ Já funciona |
| **Esforço** | N/A — Manter funcionando |
| **Risco** | Baixo |

**Status:** ✅ Já está working, apenas garantir que continue funcional

---

## 🎯 Prioridade 2 — ALTO (Impacto alto, esforço médio)

### 3. Inter-Yard (Passagem entre Pátios)
| Aspecto | Valor |
|---------|-------|
| **Impacto Demo** | ⭐⭐⭐⭐ Diferencial competitivo |
| **Visibilidade** | Fluxo completo visível |
| **Backend** | ✅ 100% pronto |
| **Esforço** | Baixo — já está parcialmente integrado |
| **Risco** | Médio |

**Problema:** Fila de sync pode não estar processando  
**Solução:** Verificar e corrigir `processPendingSync()`

---

### 4. Autenticação/Cadastro de Usuários
| Aspecto | Valor |
|---------|-------|
| **Impacto Demo** | ⭐⭐⭐⭐ Primeira impressão |
| **Visibilidade** | Fluxo de entrada |
| **Backend** | ✅ Endpoints prontos |
| **Esforço** | Médio — mudar fluxo de cadastro |
| **Risco** | Médio |

**Problema:** Cadastro é local, não persiste no backend  
**Solução:** Integrar `POST /usuarios` e fluxo de aprovação real

---

### 5. Composições (Trens)
| Aspecto | Valor |
|---------|-------|
| **Impacto Demo** | ⭐⭐⭐ Visível na interface |
| **Visibilidade** | Lista de composições |
| **Backend** | ✅ 100% pronto |
| **Esforço** | Baixo — já está integrado, apenas polir |
| **Risco** | Baixo |

**Problema:** Estados de loading/error podem ser melhorados  
**Solução:** Melhorar UX técnica

---

## 🎯 Prioridade 3 — MÉDIO (Melhorias de UX e robustez)

### 6. DSS (Diálogo de Segurança)
| Aspecto | Valor |
|---------|-------|
| **Impacto Demo** | ⭐⭐⭐ Feature importante para segurança |
| **Visibilidade** | Tela dedicada |
| **Backend** | ✅ Pronto |
| **Esforço** | Médio — novo hook ou adaptar useDSS |
| **Risco** | Baixo |

**Problema:** Hook `useDSS` usa apenas localStorage  
**Solução:** Integrar endpoints `/dss`

---

### 7. Sincronização Offline
| Aspecto | Valor |
|---------|-------|
| **Impacto Demo** | ⭐⭐⭐ Diferencial técnico |
| **Visibilidade** | Indicador de sync, fila de pending |
| **Backend** | ✅ Endpoints prontos |
| **Esforço** | Médio — consolidar duas implementações |
| **Risco** | Médio |

**Problema:** Duas implementações (`offlineSync.ts` e `syncEngine.ts`), nenhuma integrada  
**Solução:** Consolidar e integrar com hooks

---

### 8. Auditoria
| Aspecto | Valor |
|---------|-------|
| **Impacto Demo** | ⭐⭐ Compliance/Enterprise |
| **Visibilidade** | Logs de auditoria |
| **Backend** | ✅ Pronto |
| **Esforço** | Médio — criar UI ou integrar existente |
| **Risco** | Baixo |

**Problema:** Backend tem auditoria, frontend só loga local  
**Solução:** Integrar `POST /audit/sync` nos eventos críticos

---

## 🎯 Prioridade 4 — BAIXO (Nice to have)

### 9. Equipamentos
| Aspecto | Valor |
|---------|-------|
| **Impacto Demo** | ⭐⭐ Visível mas não crítico |
| **Backend** | ✅ Pronto |
| **Esforço** | Médio |

### 10. Graus de Risco
| Aspecto | Valor |
|---------|-------|
| **Impacto Demo** | ⭐⭐ Feature de segurança |
| **Backend** | ✅ Pronto |
| **Esforço** | Médio |

### 11. Configurações
| Aspecto | Valor |
|---------|-------|
| **Impacto Demo** | ⭐ Menos visível |
| **Backend** | ✅ Pronto |
| **Esforço** | Baixo |

### 12. LGPD Portal
| Aspecto | Valor |
|---------|-------|
| **Impacto Demo** | ⭐ Compliance |
| **Backend** | ✅ Pronto |
| **Esforço** | Médio — criar UI |

### 13. Workflows
| Aspecto | Valor |
|---------|-------|
| **Impacto Demo** | ⭐ Feature avançada |
| **Backend** | ✅ Pronto |
| **Esforço** | Alto — não há UI |

### 14. AdamBoot
| Aspecto | Valor |
|---------|-------|
| **Impacto Demo** | ⭐⭐ Feature diferenciadora |
| **Backend** | ✅ Pronto |
| **Esforço** | Médio |

---

## 📋 Plano de Execução

### FASE 3A — Correções Críticas (Prioridade 1-2)

| Ordem | Fluxo | Tarefa | Arquivos |
|-------|-------|--------|----------|
| 1 | Passagem | Integrar `api.criarPassagem()` | `hooks/useFormulario.ts` |
| 2 | Passagem | Listar passagens do backend | `hooks/useFormulario.ts` |
| 3 | Passagem | Assinar passagem no backend | `hooks/usePassagemHandlers.ts` |
| 4 | Cadastro | Integrar cadastro real | `hooks/useAuth.ts`, `services/approvalService.ts` |
| 5 | Inter-Yard | Corrigir fila de sync | `pages/passagem-interpatio/index.tsx` |
| 6 | Composições | Melhorar UX | `pages/composicoes/index.tsx` |

### FASE 3B — Correções Médias (Prioridade 3)

| Ordem | Fluxo | Tarefa | Arquivos |
|-------|-------|--------|----------|
| 7 | DSS | Integrar endpoints | `hooks/useDSS.ts` |
| 8 | Sync | Consolidar sync engine | `services/syncEngine.ts`, `services/offlineSync.ts` |
| 9 | Auditoria | Integrar logs | `hooks/useBlindagem.ts` |

### FASE 3C — UX Técnica (FASE 4)

| Ordem | Tarefa | Escopo |
|-------|--------|--------|
| 10 | Skeleton/Loading | Todas as páginas com chamada API |
| 11 | Empty States | Mensagens honestas quando não há dados |
| 12 | Error Handling | Tratamento padronizado de erro |
| 13 | Retry Logic | Botões de retry em falhas |

---

## 🎯 Decisões de Escopo para Demo

### ✅ Deve funcionar perfeitamente:
1. Login/Logout JWT
2. Dashboard BI com dados reais
3. Criar e listar Passagens de Turno
4. Inter-Yard com sync
5. Composições

### ⚠️ Pode estar parcial (com fallback local):
6. Cadastro de usuários (mostrar fluxo, aprovar local)
7. DSS (criar local, mostrar que sync pendente)
8. Configurações (local, não crítico)

### ❌ Não incluir na demo:
9. Workflows (não há UI)
10. LGPD Portal (não há UI)
11. Auditoria completa (apenas local)

---

## 📊 Métricas de Sucesso

| Métrica | Antes | Depois (Meta) |
|---------|-------|---------------|
| Fluxos Fully Working | 3 | 7 |
| Fluxos Partially Wired | 5 | 3 |
| Fluxos Mocked | 8 | 4 |
| Cobertura API (endpoints usados/total) | ~15% | ~40% |
| Build sem erros | ❌ | ✅ |
| Lint sem erros | ❌ | ✅ |
