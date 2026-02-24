# VFZ — Roadmap Arquiteto de Soluções

## Objetivo

Posicionar o projeto VFZ como peça de portfólio que demonstra **pensamento de Arquiteto de Soluções** — não apenas código limpo, mas decisões arquiteturais justificadas, visão sistêmica, e solução de um problema real de infraestrutura crítica.

---

## O que um Arquiteto de Soluções demonstra

| Competência | O que avaliadores procuram | VFZ Atual | Meta |
|-------------|---------------------------|-----------|------|
| System Design | Trade-offs documentados, não só "fiz assim" | ⚠️ ADRs básicos | Decisões com alternativas analisadas |
| Domain Expertise | Entende o problema real, não só a tech | ✅ Terminologia ferroviária | Manter |
| Integration Thinking | Como o sistema conversa com outros | ❌ Isolado | ERP, SCADA, MES como pontos de extensão |
| Resilience | O que acontece quando falha? | ⚠️ Error boundaries | Sync engine + conflict resolution |
| Observability | Como sabe que está funcionando? | ✅ App Insights | SLIs/SLOs definidos |
| Cost Awareness | Quanto custa rodar isso? | ❌ Ausente | TCO model |
| Security Architecture | Visão de segurança, não só código | ⚠️ Implementado mas não documentado como arquitetura | Threat model formal |
| Scalability | Funciona com 10x mais usuários? | ⚠️ Load tests existem | Capacity planning documentado |

---

## Roadmap: 3 Fases

### FASE 1 — O Diferenciador Técnico (SYNC ENGINE)
**Impacto: 🔴 Máximo | É isso que separa dev senior de arquiteto**

Este é o coração. Um SA que resolve sincronização offline-first para infraestrutura crítica demonstra que entende problemas reais, não só CRUD.

#### 1.1 — Sync Queue Client-Side
```
Fila local persistente (IndexedDB, não localStorage)
├── Cada passagem recebe UUID v4 no momento da criação
├── Status: rascunho → assinada → pendente_sync → sincronizada
├── Timestamp de criação local (device clock)
├── Hash de integridade (HMAC do payload)
└── Retry automático com exponential backoff
```

**Trade-off documentável:**
- Por que IndexedDB e não localStorage? → Capacidade (localStorage = 5MB, IndexedDB = centenas de MB), transações ACID, não bloqueia main thread
- Por que não CRDT? → Passagem de serviço é write-once (não editável após assinatura), CRDT é overkill
- Por que UUID no client? → Dispositivo pode estar offline por horas, não pode esperar ID do server

#### 1.2 — Conflict Resolution Strategy
```
Estratégia: Last-Write-Wins com detecção de duplicatas
├── Mesmo turno + mesma data + mesmo pátio = potencial conflito
├── Server detecta e marca como "requer revisão"
├── Supervisor resolve manualmente (nunca perder dados)
└── Audit trail registra ambas versões
```

**Trade-off documentável:**
- Por que não merge automático? → Passagem de serviço é documento legal. Merge automático pode criar um documento que ninguém assinou
- Por que LWW e não consensus? → Cenário é 1 escritor por turno. Conflito real é raro (só em edge cases como troca de dispositivo)

#### 1.3 — Backend Sync Endpoint
```
POST /api/v1/sync/passagens
├── Recebe batch de passagens pendentes
├── Valida integridade (HMAC)
├── Detecta conflitos (turno + data + pátio)
├── Retorna: { sincronizadas: [...], conflitos: [...], rejeitadas: [...] }
└── Idempotente (re-sync do mesmo UUID = no-op)
```

#### 1.4 — Indicador Visual de Sync
```
UI mostra claramente:
├── 🟢 Sincronizado — dado está no server
├── 🟡 Pendente — salvo local, aguardando rede
├── 🔴 Conflito — requer atenção do supervisor
└── Contagem de itens pendentes na navbar (já temos o slot)
```

---

### FASE 2 — Documentação de Arquiteto
**Impacto: 🟠 Alto | É o que mostra na entrevista/proposta**

#### 2.1 — Solution Design Document (SDD)
Documento único que conta a "história arquitetural":

```
1. Contexto e Problema
   - Pátio ferroviário, troca de turno, sem rede confiável
   - Requisito: zero perda de dados, funcionar offline

2. Decisões Arquiteturais (ADRs expandidos)
   - ADR-001: Por que SPA e não SSR?
     Alternativas: Next.js SSR, MPA tradicional, Mobile nativo
     Decisão: SPA + PWA
     Razão: Offline-first requer Service Worker, SSR não ajuda quando não há rede
     
   - ADR-002: Por que MySQL e não MongoDB?
     Alternativas: MongoDB, PostgreSQL, SQLite
     Decisão: MySQL (Azure Flexible Server)
     Razão: Dados são relacionais (usuário→passagem→audit). 
     Schema rígido previne corrupção. Azure Flexible Server tem HA nativo.
     MongoDB seria melhor se passagens tivessem schema variável (não tem).
     
   - ADR-003: Por que não Kafka para audit trail?
     Alternativas: Kafka, EventHub, append-only table
     Decisão: Append-only MySQL table com hash chain
     Razão: Volume é baixo (~50 passagens/dia). Kafka adiciona complexidade 
     operacional desproporcional. Hash chain garante imutabilidade sem infra extra.
     Para escalar para múltiplos pátios, migrar para EventHub.
     
   - ADR-004: Por que JWT e não session cookies?
     Alternativas: Session cookies, JWT, Azure AD token only
     Decisão: JWT com refresh token + fallback local
     Razão: Cookies requerem server. Offline = sem server. JWT permite 
     validação local do token. Refresh token renova sem re-login.
     
   - ADR-005: Por que não React Native?
     Alternativas: React Native, Flutter, Capacitor, PWA
     Decisão: PWA
     Razão: Dispositivos são notebooks/tablets corporativos já existentes.
     App nativa requer MDM deploy. PWA instala via URL, atualiza automaticamente.
     Trade-off: menos acesso a hardware (mas não precisamos de câmera/GPS).

3. Visão de Integração Futura
   ┌─────────┐     ┌─────────┐     ┌──────────┐
   │ VFZ PWA │────▶│ VFZ API │────▶│ MySQL    │
   └─────────┘     └────┬────┘     └──────────┘
                        │
                   ┌────┴────────────────────┐
                   │                         │
              ┌────▼────┐            ┌───────▼───────┐
              │ ERP Vale │            │ SCADA/MES     │
              │ (SAP S4) │            │ (leitura only)│
              └─────────┘            └───────────────┘
   
   - ERP: exportar dados de passagem para SAP (REST ou fila)
   - SCADA: ler status de equipamentos automaticamente (futuro)
   - MES: integrar com sistema de manutenção (futuro)

4. Modelo de Dados (ER simplificado)
5. Fluxo de Sincronização (sequence diagram)
6. Failure Modes (FMEA)
7. Capacity Planning
8. Cost Model (TCO)
```

#### 2.2 — Threat Model (STRIDE)
```
| Threat              | Asset           | Mitigação                        |
|---------------------|-----------------|----------------------------------|
| Spoofing            | Login           | JWT + bcrypt + rate limit        |
| Tampering           | Passagem        | HMAC + hash chain audit          |
| Repudiation         | Assinatura      | Audit trail + assinatura digital |
| Info Disclosure     | Dados pessoais  | TLS + RBAC + LGPD API           |
| Denial of Service   | API             | Rate limit + WAF + CDN           |
| Elevation of Priv   | RBAC            | Hierarquia 5 níveis + server-side|
```

#### 2.3 — SLIs / SLOs / SLAs
```
| SLI                          | SLO          | Medição                    |
|------------------------------|-------------|----------------------------|
| Disponibilidade              | 99.5%       | Uptime do /health endpoint |
| Latência API p95             | < 1s        | App Insights               |
| Sync pendente máximo         | < 4 horas   | Contagem na fila local     |
| Perda de dados               | 0           | Audit trail integrity      |
| Tempo de recuperação (RTO)   | < 30 min    | Runbook de incidente       |
| Ponto de recuperação (RPO)   | < 1 hora    | Backup MySQL (PITR)        |
```

#### 2.4 — TCO Model (12 meses)
```
Azure Flexible Server B1ms:     ~R$ 150/mês
Azure App Service B1:           ~R$ 120/mês
Azure Static Web Apps (free):   R$ 0
Azure Key Vault:                ~R$ 5/mês
Azure App Insights:             ~R$ 30/mês
Azure Blob (backups):           ~R$ 10/mês
───────────────────────────────────────────
Total estimado:                 ~R$ 315/mês (~R$ 3.780/ano)
Para 1 pátio, ~20 operadores, ~50 passagens/dia

Escala para 5 pátios: +MySQL replica read, +App Service P1v3
Estimativa: ~R$ 1.200/mês (~R$ 14.400/ano)
```

---

### FASE 3 — Polish de Apresentação
**Impacto: 🟡 Médio | Diferença entre "bom" e "memorável"**

#### 3.1 — Deploy Real (Azure Free Tier)
- Static Web App (free) para o frontend
- URL pública compartilhável
- Demonstração ao vivo em entrevista

#### 3.2 — Case Study (1 página)
```
Título: "Digitalizando passagem de serviço em infraestrutura ferroviária 
         crítica: arquitetura offline-first para ambiente sem conectividade"

- Problema (1 parágrafo)
- Solução arquitetural (1 diagrama + 2 parágrafos)
- Decisões técnicas chave (3 bullets com trade-offs)
- Resultados (métricas: 94% redução de código, 234 testes, PWA offline)
- Próximos passos (sync engine, integração ERP)
```

#### 3.3 — Diagrama Arquitetural Premium
Um único diagrama C4 nível 2 (container) com visual profissional que pode ser mostrado em entrevista ou LinkedIn.

---

## Priorização

```
                    IMPACTO
                    Alto ┃
                         ┃  ★ Sync Engine (1.1-1.4)
                         ┃  ★ SDD Document (2.1)
                         ┃
                         ┃  ● ADRs expandidos (2.1)
                    Médio ┃  ● Threat Model (2.2)
                         ┃  ● SLI/SLO (2.3)
                         ┃
                         ┃  ○ Deploy Azure (3.1)
                    Baixo ┃  ○ Case Study (3.2)
                         ┃  ○ Diagrama premium (3.3)
                         ┗━━━━━━━━━━━━━━━━━━━━━━
                         Baixo    Médio    Alto
                              ESFORÇO
```

**Ordem de execução recomendada:**
1. SDD + ADRs expandidos (2.1) — documento que "vende" o sistema
2. Sync Engine (1.1-1.4) — o diferenciador técnico
3. SLI/SLO + TCO (2.3-2.4) — mostra pensamento operacional
4. Threat Model (2.2) — mostra pensamento de segurança
5. Deploy + Case Study (3.x) — apresentação final

---

## Resultado Esperado

Após completar as 3 fases:

| Aspecto | Antes | Depois |
|---------|-------|--------|
| Posicionamento | Dev Senior Frontend | Solutions Architect |
| Diferenciador | "Fiz um app bonito" | "Resolvi sync offline em infra crítica" |
| Entrevista | Mostra código | Mostra decisões + trade-offs + diagramas |
| LinkedIn | "Projeto pessoal" | "Arquitetura para operação ferroviária" |
| Proposta técnica | Genérica | Case study específico com números |
