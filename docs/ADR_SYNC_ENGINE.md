# VFZ — Architectural Decision Records (ADRs)

## Sync Engine & Offline-First Architecture

---

### ADR-006: IndexedDB over localStorage for Sync Queue

**Status:** Accepted  
**Date:** 2026-02-21  
**Context:** VFZ precisa de fila persistente para passagens não sincronizadas. Dados devem sobreviver a refresh, crash, e fechamento do navegador.

**Decision:** Usar IndexedDB como storage para a sync queue.

**Alternatives Considered:**

| Opção | Capacidade | Async | ACID | Índices |
|-------|-----------|-------|------|---------|
| localStorage | 5MB | ❌ Sync | ❌ | ❌ |
| **IndexedDB** | **Centenas de MB** | **✅** | **✅** | **✅** |
| SQLite (WASM) | Ilimitado | ✅ | ✅ | ✅ |
| Cache API | Centenas de MB | ✅ | ❌ | ❌ |

**Rationale:**
- localStorage é síncrone e bloqueia a UI thread. Durante troca de turno com formulário complexo, isso causa jank perceptível
- SQLite WASM (sql.js, wa-sqlite) adicionaria ~1MB ao bundle e complexidade de build desnecessária
- Cache API é para HTTP responses, não para dados estruturados
- IndexedDB oferece o melhor equilíbrio: capacidade suficiente, transações ACID (rollback em caso de falha), índices para busca por status/turno/data, e operação async que não bloqueia UI

**Trade-off accepted:** API do IndexedDB é complexa → encapsulada completamente em `syncStore.ts`, consumers usam interface limpa.

**Consequences:**
- Dados de sync sobrevivem a cenários que matariam localStorage (storage pressure, private browsing em alguns browsers)
- Buscar "todos os itens pendentes" é O(1) via índice, não O(n) deserializando JSON
- Testabilidade: IndexedDB pode ser mockado com `fake-indexeddb` em testes

---

### ADR-007: Store-and-Forward over Synchronous Sync

**Status:** Accepted  
**Date:** 2026-02-21  
**Context:** Pátio ferroviário tem conectividade intermitente. Operador não pode esperar rede para registrar passagem de turno — isso é operação crítica de segurança.

**Decision:** Arquitetura Store-and-Forward (offline-first).

**Alternatives Considered:**

| Opção | Offline? | Complexidade | Consistência |
|-------|---------|-------------|-------------|
| Sync síncrono | ❌ | Baixa | Forte |
| **Store-and-Forward** | **✅** | **Média** | **Eventual** |
| CRDT | ✅ | Alta | Eventual |
| WebSocket real-time | ❌ | Alta | Forte |

**Rationale:**
- **Sync síncrono** falha quando não há rede — inaceitável para ferrovia
- **CRDT** (Conflict-free Replicated Data Types) é elegante mas overkill. Passagem de serviço é write-once: uma vez assinada, não é editável. CRDT resolve merge de edições concorrentes, que não acontece aqui
- **WebSocket** requer conexão permanente — impossível em pátio ferroviário. Adiciona complexidade de reconexão e heartbeat para cenário que não precisa de real-time (passagem é 1x a cada 12h)
- **Store-and-Forward** resolve exatamente o problema: salva local, envia quando possível, garante entrega

**Consistency model:** Eventual consistency com window de minutos (não horas). Aceitável porque cada turno dura 12h e há apenas 1 passagem por troca.

**Consequences:**
- Operador vê confirmação imediata ("Salvo ✅") mesmo sem rede
- Possível ver dado no dispositivo A que não aparece no B por alguns minutos
- Backend precisa ser idempotente (re-sync do mesmo UUID = no-op)
- UI precisa mostrar claramente o status de sync (🟢 sincronizado | 🟡 pendente | ⚠️ conflito)

---

### ADR-008: Exponential Backoff with Jitter for Retry

**Status:** Accepted  
**Date:** 2026-02-21  
**Context:** Quando a rede volta após queda, múltiplos dispositivos tentam sincronizar simultaneamente.

**Decision:** Exponential backoff com jitter de ±25%.

**Sequence:** 2s → 4s → 8s → 16s → 32s → 60s → 120s → 300s (cap)

**Rationale:**
- **Backoff fixo** (ex: retry a cada 30s) causa thundering herd — 20 dispositivos reconectando ao mesmo tempo
- **Backoff exponencial** espaça as tentativas progressivamente
- **Jitter** impede que dispositivos com mesmo retry count sincronizem no mesmo momento
- **Cap de 5 minutos** evita que items fiquem parados por horas — o SLO é sync < 4h

**Alternatives Considered:**
- Retry imediato: sobrecarrega server quando ele está se recuperando
- Fibonacci backoff: similar ao exponencial mas com curva menos previsível (sem vantagem)
- Circuit breaker: mais complexo, adequado para microserviços, não para client-side

**Consequences:**
- Máximo ~20 retries em 4h, depois marca como `failed` para intervenção manual
- Server recebe requests espaçadas, não burst
- Jitter distribui requests uniformemente no tempo

---

### ADR-009: Manual Conflict Resolution by Supervisor

**Status:** Accepted  
**Date:** 2026-02-21  
**Context:** Dois dispositivos podem registrar passagem para o mesmo turno/data (raro, mas possível em troca de dispositivo).

**Decision:** Conflitos são detectados automaticamente e resolvidos manualmente por supervisor.

**Conflict detection:** Mesmo pátio + mesmo turno + mesma data = conflito.

**Alternatives Considered:**

| Opção | Automático? | Preserva ambos? | Risco legal |
|-------|-----------|----------------|-------------|
| Last-Write-Wins | ✅ | ❌ Perde o 1º | Alto |
| First-Write-Wins | ✅ | ❌ Perde o 2º | Alto |
| **Manual (supervisor)** | **❌** | **✅ Ambos** | **Zero** |
| Merge automático | ✅ | ✅ (combinado) | Alto |

**Rationale:**
- Passagem de serviço é **documento legal com assinatura**
- LWW ou FWW perde dados — inaceitável em operação ferroviária
- Merge automático criaria documento que ninguém assinou — inválido legalmente
- Resolução manual preserva ambas versões e dá ao supervisor a decisão
- A versão não escolhida permanece no audit trail como "versão descartada" — auditável

**Frequency estimate:** Conflitos reais < 1% das passagens (1 operador por turno, troca de dispositivo é exceção).

**Consequences:**
- Supervisor vê lista de conflitos no dashboard
- Ambas versões são preservadas (zero data loss)
- Audit trail registra quem resolveu e qual decisão
- UI mostra indicador vermelho quando há conflitos pendentes

---

### ADR-010: UUID Generated Client-Side

**Status:** Accepted  
**Date:** 2026-02-21  
**Context:** Passagem precisa de identificador único no momento da criação. Dispositivo pode estar offline.

**Decision:** UUID v4 gerado no client-side via `crypto.randomUUID()`.

**Alternatives Considered:**

| Opção | Offline? | Unicidade | Ordenável |
|-------|---------|-----------|----------|
| Auto-increment (server) | ❌ | ✅ | ✅ |
| **UUID v4 (client)** | **✅** | **✅ (probabilístico)** | **❌** |
| ULID | ✅ | ✅ | ✅ |
| Snowflake | ✅ (com config) | ✅ | ✅ |

**Rationale:**
- Auto-increment requer server — impossível offline
- UUID v4 tem probabilidade de colisão de 1 em 2^122 — efetivamente zero
- ULID é ordenável por tempo, mas adiciona dependência (ulid package) para benefício marginal neste contexto
- Snowflake requer configuração de machine-id — complexidade desnecessária para ~50 passagens/dia

**Trade-off accepted:** UUIDs não são ordenáveis cronologicamente → usamos `createdAt` timestamp para ordenação.

**Consequences:**
- Passagem tem ID estável desde o primeiro momento, mesmo offline
- Backend usa UUID como chave de idempotência (re-sync = no-op)
- IDs são 36 caracteres (vs 4 bytes de int) — overhead aceitável para volume baixo

---

### ADR-011: HMAC Integrity on Enqueue (Not Just on Sign)

**Status:** Accepted  
**Date:** 2026-02-21  
**Context:** Dados na sync queue podem ser adulterados entre save local e sync com server.

**Decision:** HMAC-SHA256 é computado no momento do enqueue e verificado pelo server.

**Rationale:**
- Se um atacante modificar dados no IndexedDB entre save e sync, o HMAC não vai bater
- Server pode rejeitar items com HMAC inválido
- Diferente da assinatura digital (que valida que o operador assinou), o HMAC valida integridade do transporte

**Consequences:**
- Cada item na fila tem `hmac` field computado com `gerarHMAC(payload)`
- Server verifica HMAC antes de aceitar a passagem
- Modificação de dados na sync queue é detectável
- Trade-off: HMAC key está no client (não é secret verdadeiro) — defesa contra tampering casual, não contra atacante sofisticado com DevTools. Segurança real vem do TLS + JWT no transporte

---

## Data Flow: Sync Lifecycle

```
┌─────────────────────────────────────────────────────────────────┐
│ DISPOSITIVO (Browser)                                           │
│                                                                 │
│  Operador → "Salvar" → useFormulario.salvarPassagem()          │
│                              │                                  │
│                    ┌─────────┴──────────┐                       │
│                    │                    │                        │
│              localStorage          SyncEngine                   │
│              (leitura rápida)     .enqueue()                    │
│                                       │                         │
│                                  IndexedDB                      │
│                                  sync_queue                     │
│                                  [status: pending]              │
│                                       │                         │
│                                  ┌────┴────┐                    │
│                                  │ Online? │                    │
│                                  └────┬────┘                    │
│                              ┌────────┴────────┐                │
│                              │                 │                │
│                           ❌ Não            ✅ Sim              │
│                           (espera)             │                │
│                                    POST /sync/passagens         │
│                                           │                     │
└───────────────────────────────────────────┼─────────────────────┘
                                            │
┌───────────────────────────────────────────┼─────────────────────┐
│ SERVIDOR                                  │                     │
│                                           ▼                     │
│                                    Verificar HMAC               │
│                                           │                     │
│                                   UUID já existe?               │
│                                    ┌──────┴──────┐              │
│                                    │             │              │
│                                 ✅ Sim        ❌ Não            │
│                                 (idempotente)    │              │
│                                 return 'ok'      │              │
│                                           Conflito?             │
│                                     (turno+data+pátio)          │
│                                    ┌──────┴──────┐              │
│                                    │             │              │
│                                 ⚠️ Sim        ✅ Não            │
│                            return 'conflict'     │              │
│                                              INSERT             │
│                                           return 'ok'           │
│                                                                 │
└─────────────────────────────────────────────────────────────────┘
```

---

## Failure Mode Analysis (FMEA)

| Modo de Falha | Probabilidade | Impacto | Detecção | Mitigação |
|---------------|-------------|---------|----------|-----------|
| Dispositivo desliga durante save | Média | Alto | IndexedDB tx rollback | Transação ACID: ou salva tudo ou nada |
| Rede cai durante sync | Alta | Baixo | Timeout 5s | Item volta para `pending`, retry com backoff |
| Server rejeita passagem | Baixa | Médio | Response 400/500 | Retry até MAX_RETRIES, depois `failed` para manual |
| Conflito turno/data | Muito baixa | Médio | Server detecta | Supervisor resolve manualmente |
| IndexedDB corrompido | Muito baixa | Alto | Catch em openDB | Fallback para localStorage queue |
| Clock do dispositivo errado | Baixa | Baixo | Server compara | `createdAt` é informativo, server usa seu próprio clock |
| Dois saves simultâneos no mesmo device | Muito baixa | Baixo | UUID garante unicidade | Cada save gera UUID diferente |
| Token JWT expirado durante sync | Média | Baixo | 401 response | Auto-refresh token, retry |
