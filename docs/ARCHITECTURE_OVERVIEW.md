# Architecture Overview Document

## VFZ — Sistema de Passagem de Serviço Ferroviária
### Offline-First Architecture for Operational Continuity in Critical Railway Infrastructure

**Versão:** 3.2  
**Autor:** Gregory — UX/UI & AI Specialist | Railway Operations  
**Classificação:** Portfolio — Solution Architecture  
**Data:** Fevereiro 2026

---

## 1. Contexto e Problema

### 1.1 O Domínio

A Estrada de Ferro Vitória a Minas (EFVM) é a principal ferrovia de transporte de minério do Brasil, operando 24 horas por dia em turnos de 12 horas. A cada troca de turno, o operador que sai deve transferir ao operador que entra um registro completo do estado operacional do pátio: quais linhas estão ocupadas, quais estão interditadas, quais equipamentos apresentam defeito, quais manobras estão em andamento, e quais riscos de segurança existem.

Esse registro — a **passagem de serviço** — é um documento operacional e legal. Se um incidente ocorrer, a passagem de serviço é o primeiro documento auditado. Se a informação estiver incompleta ou incorreta, as consequências são operacionais (risco à segurança) e jurídicas (responsabilização do operador).

### 1.2 O Problema

Hoje, esse registro é feito em formulários de papel. Os problemas são conhecidos:

- **Ilegibilidade:** Escrita manual em ambiente industrial, frequentemente sob pressão de tempo
- **Perda:** Formulários são extraviados, manchados, ou danificados
- **Não-rastreabilidade:** Sem histórico digital, sem busca, sem comparação entre turnos
- **Sem alertas:** Condições recorrentes não são detectadas automaticamente
- **Sem backup:** Se o formulário se perde, a informação se perde

### 1.3 As Restrições

O pátio ferroviário impõe restrições que eliminam a maioria das soluções convencionais:

| Restrição | Impacto na Arquitetura |
|-----------|----------------------|
| **Sem conectividade confiável** | A solução DEVE funcionar 100% offline |
| **Turnos de 12 horas** | A interface deve ser legível durante longos períodos, inclusive em turno noturno |
| **Dispositivos corporativos existentes** | Não é possível instalar apps nativos sem processo de MDM |
| **Criticidade operacional** | Zero tolerância a perda de dados |
| **Ambiente regulado** | Conformidade com LGPD, auditabilidade, rastreabilidade |
| **Múltiplos perfis de usuário** | Operadores, supervisores, inspetores — com permissões diferentes |

A restrição de conectividade é a mais determinante. Ela elimina qualquer arquitetura que dependa de um servidor para funcionar. Ao mesmo tempo, quando a conectividade existe, os dados devem ser centralizados para auditoria e gestão.

### 1.4 O Requisito Central

> Um sistema que funciona como se não houvesse servidor, mas que sincroniza dados quando há rede. O operador nunca deve esperar conectividade para registrar uma passagem de serviço.

---

## 2. Visão Arquitetural

### 2.1 Princípio: Offline-First, Not Offline-Only

A arquitetura não é "um app offline que às vezes conecta". É um sistema distribuído onde cada dispositivo é um nó autônomo com capacidade de operar indefinidamente sem servidor, mas que converge para um estado centralizado quando a conectividade permite.

```
                    ┌─────────────────────────────┐
                    │       Azure Cloud            │
                    │                              │
                    │  ┌──────────┐ ┌──────────┐   │
                    │  │ App Svc  │ │ MySQL HA │   │
                    │  │ (API)    │←│ Flex Srv │   │
                    │  └────┬─────┘ └──────────┘   │
                    │       │                      │
                    │  ┌────┴─────┐ ┌──────────┐   │
                    │  │Key Vault │ │App Insight│   │
                    │  └──────────┘ └──────────┘   │
                    └───────────┬───────────────────┘
                                │
                    ════════════╪════════════ (rede intermitente)
                                │
          ┌─────────────────────┼─────────────────────┐
          │                     │                     │
    ┌─────┴─────┐         ┌────┴──────┐        ┌─────┴─────┐
    │ Device A  │         │ Device B  │        │ Device C  │
    │ (Turno A) │         │ (Turno B) │        │ (Superv.) │
    │           │         │           │        │           │
    │ ┌───────┐ │         │ ┌───────┐ │        │ ┌───────┐ │
    │ │  PWA  │ │         │ │  PWA  │ │        │ │  PWA  │ │
    │ ├───────┤ │         │ ├───────┤ │        │ ├───────┤ │
    │ │IndexDB│ │         │ │IndexDB│ │        │ │IndexDB│ │
    │ │SyncQ  │ │         │ │SyncQ  │ │        │ │SyncQ  │ │
    │ ├───────┤ │         │ ├───────┤ │        │ ├───────┤ │
    │ │LocalSt│ │         │ │LocalSt│ │        │ │LocalSt│ │
    │ │(dados)│ │         │ │(dados)│ │        │ │(dados)│ │
    │ └───────┘ │         │ └───────┘ │        │ └───────┘ │
    └───────────┘         └───────────┘        └───────────┘
```

### 2.2 Camadas do Sistema

```
┌─────────────────────────────────────────────────────────────┐
│                    PRESENTATION LAYER                        │
│  React 18 + TypeScript + Vite                               │
│  ┌──────────┐ ┌──────────┐ ┌──────────┐ ┌──────────┐       │
│  │ Passagem │ │Dashboard │ │Histórico │ │  Config  │       │
│  │ (form)   │ │  (BI+)   │ │(timeline)│ │(settings)│       │
│  └──────────┘ └──────────┘ └──────────┘ └──────────┘       │
├─────────────────────────────────────────────────────────────┤
│                    APPLICATION LAYER                         │
│  12 Custom Hooks + Feature Flags + RBAC                     │
│  ┌──────────┐ ┌──────────┐ ┌──────────┐ ┌──────────┐       │
│  │ useAuth  │ │useFormul.│ │useAlertas│ │useSyncSt.│       │
│  └──────────┘ └──────────┘ └──────────┘ └──────────┘       │
├─────────────────────────────────────────────────────────────┤
│                    DOMAIN LAYER                              │
│  Business Logic + Validation + Analysis                     │
│  ┌──────────┐ ┌──────────┐ ┌──────────┐ ┌──────────┐       │
│  │Validação │ │ Análise  │ │Permissões│ │ Alertas  │       │
│  │Formulário│ │Operacion.│ │Hierárq.  │ │Intelig.  │       │
│  └──────────┘ └──────────┘ └──────────┘ └──────────┘       │
├─────────────────────────────────────────────────────────────┤
│                    INFRASTRUCTURE LAYER                      │
│  ┌──────────────────────────┐ ┌──────────────────────────┐  │
│  │   SYNC ENGINE            │ │  SECURITY SERVICES       │  │
│  │   ┌────────────────────┐ │ │  ┌────────────────────┐  │  │
│  │   │ IndexedDB (Queue)  │ │ │  │ HMAC + SHA-256     │  │  │
│  │   │ SyncEngine (Orch.) │ │ │  │ Sanitização XSS    │  │  │
│  │   │ ConflictResolver   │ │ │  │ Audit Trail (chain)│  │  │
│  │   │ Exp. Backoff       │ │ │  │ Console Protection │  │  │
│  │   └────────────────────┘ │ │  └────────────────────┘  │  │
│  │                          │ │                          │  │
│  │   localStorage (dados)   │ │  JWT + Refresh Tokens    │  │
│  │   Service Worker (cache) │ │  Device Fingerprint      │  │
│  └──────────────────────────┘ └──────────────────────────┘  │
├─────────────────────────────────────────────────────────────┤
│                    BACKEND LAYER (quando conectado)          │
│  Express + TypeScript + Sequelize + MySQL 8.0               │
│  ┌──────────┐ ┌──────────┐ ┌──────────┐ ┌──────────┐       │
│  │ Auth JWT │ │Sync Batch│ │Audit Svc │ │ LGPD API │       │
│  │+ Az. AD  │ │+Conflict │ │Hash Chain│ │Titular   │       │
│  └──────────┘ └──────────┘ └──────────┘ └──────────┘       │
└─────────────────────────────────────────────────────────────┘
```

---

## 3. Decisões Arquiteturais

### 3.1 Por que PWA e não App Nativa?

**Decisão:** Progressive Web App (SPA + Service Worker)

| Critério | PWA | React Native | Flutter |
|----------|-----|-------------|---------|
| Instalação | URL (zero friction) | MDM + App Store | MDM + App Store |
| Atualização | Automática (SW) | Manual | Manual |
| Offline | ✅ Service Worker | ✅ SQLite | ✅ SQLite |
| Custo de deploy | Zero | MDM licensing | MDM licensing |
| Acesso a hardware | Limitado | Total | Total |

**Justificativa:** Os dispositivos são notebooks/tablets corporativos já existentes. O processo de deploy de app nativa via MDM na Vale leva semanas de aprovação. PWA instala via URL, atualiza automaticamente, e funciona offline via Service Worker. O trade-off aceito é menor acesso a hardware — mas o sistema não precisa de câmera, GPS, ou bluetooth.

### 3.2 Por que Offline-First com Store-and-Forward?

**Decisão:** Dados são salvos localmente primeiro, sincronizados com servidor quando há rede.

**Alternativas descartadas:**

- **Sync síncrono:** Falha quando não há rede — inaceitável para operação ferroviária
- **CRDT (Conflict-free Replicated Data Types):** Passagem de serviço é write-once após assinatura. CRDT resolve edição concorrente, que não ocorre neste domínio
- **WebSocket real-time:** Requer conexão permanente — impossível em pátio ferroviário

**Trade-off aceito:** Eventual consistency. Dado pode existir no dispositivo A mas não no B por alguns minutos. Aceitável porque troca de turno acontece 1x a cada 12h.

### 3.3 Por que IndexedDB para Sync Queue?

**Decisão:** IndexedDB ao invés de localStorage para a fila de sincronização.

| Critério | localStorage | IndexedDB |
|----------|-------------|-----------|
| Capacidade | 5MB | Centenas de MB |
| Operação | Síncrona (bloqueia UI) | Assíncrona |
| Transações | Nenhuma | ACID |
| Índices | Nenhum | Múltiplos |

**Justificativa:** Uma passagem com dados completos pode ter 50-100KB. localStorage com 5MB limita a ~50 passagens na fila. IndexedDB não tem esse limite. Mais importante: operação síncrona bloqueia a UI thread durante salvamento — inaceitável durante troca de turno onde o operador precisa de resposta imediata.

### 3.4 Por que SHA-256 Client-Side (e não bcrypt)?

**Decisão:** Hash de senha com SHA-256 + salt por matrícula no frontend. Bcrypt no backend.

**Justificativa transparente:** SHA-256 não é o ideal para hashing de senha — bcrypt com salt aleatório e cost factor é o padrão. Mas SHA-256 é nativo do browser (Web Crypto API), não requer dependência externa, e funciona offline. A decisão consciente é: proteção adequada para o modelo offline (onde o atacante precisaria de acesso físico ao dispositivo), com migração para bcrypt server-side quando o backend está ativo.

**Mitigação:** Salt por matrícula previne rainbow tables. Rate limit de 5 tentativas previne brute force. Quando o backend está ativo, a autenticação real usa bcrypt com cost 12.

### 3.5 Por que MySQL e não MongoDB?

**Decisão:** MySQL 8.0 (Azure Flexible Server)

**Justificativa:** Os dados são inerentemente relacionais: usuário → passagem → audit trail. O schema é rígido (mesmo formulário para todas as passagens) — não há benefício de schema flexível. MySQL com Azure Flexible Server oferece HA nativo, point-in-time recovery, e é a expertise existente da equipe de DBA da Vale.

**Quando MongoDB seria melhor:** Se cada pátio tivesse formulários com campos diferentes (schema variável). Não é o caso — o formulário é padronizado.

### 3.6 Por que não Kafka para Audit Trail?

**Decisão:** Append-only MySQL table com hash chain SHA-256.

**Justificativa:** O volume é ~50 passagens/dia e ~500 eventos de audit/dia. Kafka adiciona complexidade operacional (cluster ZooKeeper, topic management, consumer groups) para um volume que uma tabela MySQL com índice maneja trivialmente. O hash chain (cada registro contém o hash do anterior) garante imutabilidade sem infraestrutura adicional.

**Quando Kafka seria necessário:** Escala para 50+ pátios com necessidade de streaming real-time para dashboards centralizados. Nesse cenário, migrar para Azure EventHub (managed Kafka).

---

## 4. Modelo de Segurança

### 4.1 Threat Model (STRIDE)

| Ameaça | Vetor | Ativo em Risco | Mitigação | Residual |
|--------|-------|---------------|-----------|----------|
| **Spoofing** | Login falso | Sessão | JWT + bcrypt + rate limit (5 tentativas) + lockout 15min | Sem MFA offline (aceito) |
| **Tampering** | Modificar passagem salva | Dados do formulário | HMAC no enqueue + hash chain audit + validação server-side | HMAC key no client (defesa contra tampering casual) |
| **Repudiation** | "Eu não assinei isso" | Assinatura digital | Audit trail append-only + timestamp + matrícula + fingerprint do device | Assinatura é hash, não certificado digital (evolução futura) |
| **Info Disclosure** | Dados pessoais expostos | LGPD | TLS em trânsito + RBAC + API de direitos do titular | localStorage em plaintext (aceito para offline, mitiga com device policy) |
| **DoS** | Flood de requests | API | Rate limit (100/15min) + Helmet + CORS strict | Sem WAF/CDN em MVP |
| **Elevation** | Operador acessa admin | RBAC | Hierarquia 5 níveis server-validated + feature flags | RBAC client-side é bypassável (server valida) |

### 4.2 Defesa em Profundidade

```
Camada 1: Rede        → TLS 1.3 + CORS strict + Helmet headers
Camada 2: Autenticação → JWT (8h) + Refresh Token (7d) + Azure AD SSO
Camada 3: Autorização  → RBAC hierárquico (5 níveis) + feature flags
Camada 4: Dados        → HMAC payload + sanitização XSS + validação de tipo
Camada 5: Auditoria    → Append-only trail + hash chain + device fingerprint
Camada 6: Runtime      → Console protection (prod) + DevTools detection + integrity monitor
```

---

## 5. Modelo de Sincronização

### 5.1 Lifecycle de uma Passagem

```
  OPERADOR                         DISPOSITIVO                           SERVIDOR
     │                                │                                     │
     │  "Salvar Passagem"             │                                     │
     │───────────────────────────────►│                                     │
     │                                │                                     │
     │                          1. Valida formulário                        │
     │                          2. Salva em localStorage                    │
     │                          3. Gera UUID v4                             │
     │                          4. Computa HMAC-SHA256                      │
     │                          5. Enfileira em IndexedDB                   │
     │                          6. Status: PENDING                          │
     │                                │                                     │
     │  "Salvo ✅"                    │                                     │
     │◄───────────────────────────────│                                     │
     │                                │                                     │
     │  (operador continua            │  ┌─────────────────────┐            │
     │   trabalhando)                 │  │  SyncEngine (30s)   │            │
     │                                │  │  Há itens pending?  │            │
     │                                │  │  Há rede?           │            │
     │                                │  └────────┬────────────┘            │
     │                                │           │ Sim                     │
     │                                │           │                         │
     │                                │    POST /sync/passagens             │
     │                                │──────────────────────────────────►  │
     │                                │           │                         │
     │                                │           │     7. Verifica HMAC    │
     │                                │           │     8. Verifica UUID    │
     │                                │           │        (idempotente)    │
     │                                │           │     9. Detecta conflito │
     │                                │           │    10. INSERT + audit   │
     │                                │           │                         │
     │                                │    { status: "ok" }                 │
     │                                │◄────────────────────────────────────│
     │                                │                                     │
     │                          11. Status: SYNCED                          │
     │                          12. Atualiza UI (🟢)                        │
     │                                │                                     │
```

### 5.2 Detecção e Resolução de Conflitos

**Quando ocorre:** Mesmo pátio + mesmo turno + mesma data = duas passagens diferentes.

**Frequência estimada:** < 1% (1 operador por turno, conflito real só em troca de dispositivo).

**Resolução:**

```
   Conflict Detection (automática)          Resolution (manual)
   ┌─────────────────────────┐          ┌──────────────────────────┐
   │ Server recebe passagem  │          │ Supervisor vê conflito   │
   │ Turno A, 21/02/2026     │          │ no dashboard             │
   │                         │          │                          │
   │ Já existe passagem para │──────►   │ Visualiza ambas versões  │
   │ Turno A, 21/02/2026?    │          │                          │
   │                         │          │ Escolhe versão oficial   │
   │ SIM → status: CONFLICT  │          │                          │
   │ Ambas versões preservadas│         │ Versão descartada vai    │
   └─────────────────────────┘          │ para audit trail         │
                                        └──────────────────────────┘
```

**Por que não merge automático?** Passagem de serviço é documento legal com assinatura. Merge automático criaria um documento que ninguém assinou — juridicamente inválido. A decisão de qual versão é oficial pertence ao supervisor.

### 5.3 Exponential Backoff com Jitter

```
Tentativa:  1     2     3     4     5     6     7     8
Delay:      2s    4s    8s    16s   32s   60s   120s  300s (cap)
Jitter ±25%: 1.5s  3.2s  7.1s  14s   28s   52s   105s  260s

Total após 20 tentativas: ~4 horas → marca como FAILED
```

**Por que jitter?** Sem jitter, 20 dispositivos com mesmo retryCount tentariam no mesmo segundo = DDoS no próprio server. Jitter de ±25% distribui uniformemente.

---

## 6. Requisitos Não-Funcionais

### 6.1 SLIs, SLOs e SLAs

| SLI (o que medimos) | SLO (meta) | Medição |
|---------------------|-----------|---------|
| Disponibilidade offline | 100% | Service Worker + IndexedDB |
| Disponibilidade backend | 99.5% | Azure App Service SLA |
| Latência save local p95 | < 100ms | Performance API |
| Latência sync API p95 | < 1s | App Insights |
| Tempo máximo sem sync | < 4h | Sync queue monitoring |
| Perda de dados | Zero | Dual storage (localStorage + IndexedDB) |
| Tempo de recuperação (RTO) | < 30 min | Runbook de incidente |
| Ponto de recuperação (RPO) | < 1 hora | MySQL PITR (Azure) |

### 6.2 Capacity Planning

**Cenário atual:** 1 pátio, ~20 operadores, ~50 passagens/dia

| Recurso | Consumo Estimado | Limite |
|---------|-----------------|--------|
| localStorage por device | ~2MB | 5MB |
| IndexedDB sync queue | ~500KB (10 pending) | Ilimitado |
| MySQL storage/mês | ~50MB | 32GB (B1ms) |
| API requests/dia | ~200 | 100K (B1) |
| App Insights events/mês | ~15K | 5M (free tier) |

**Cenário futuro:** 5 pátios, ~100 operadores

| Recurso | Consumo Estimado | Ação |
|---------|-----------------|------|
| MySQL | ~250MB/mês | Read replica para dashboards |
| API requests/dia | ~1.000 | Scale up para P1v3 |
| App Insights | ~75K/mês | Permanecer no free tier |

### 6.3 TCO (12 meses, 1 pátio)

| Componente | Custo Mensal (R$) |
|-----------|-----------------|
| Azure Flexible Server B1ms (MySQL) | ~150 |
| Azure App Service B1 (backend) | ~120 |
| Azure Static Web Apps (frontend) | 0 (free tier) |
| Azure Key Vault | ~5 |
| Azure App Insights | ~30 |
| Azure Blob Storage (backups) | ~10 |
| **Total mensal** | **~R$ 315** |
| **Total anual** | **~R$ 3.780** |

**Comparação:** Um sistema SCADA comercial para a mesma função custa R$ 50-200K/ano em licenciamento.

---

## 7. Matriz de Riscos

| ID | Risco | Prob. | Impacto | Mitigação | Status |
|----|-------|-------|---------|-----------|--------|
| R1 | Dispositivo perde dados (crash/limpeza) | Média | Alto | Dual storage + sync automático | ✅ Mitigado |
| R2 | Conflito de passagem (2 devices mesmo turno) | Baixa | Médio | Detecção automática + resolução supervisor | ✅ Mitigado |
| R3 | Rede indisponível por > 4h | Alta | Baixo | Funciona 100% offline, sync quando voltar | ✅ By design |
| R4 | Token JWT expirado offline | Média | Baixo | Refresh token local (7d) | ✅ Mitigado |
| R5 | Ataque XSS via campos do formulário | Baixa | Alto | Sanitização profunda + CSP headers | ✅ Mitigado |
| R6 | Escalação de privilégio (RBAC bypass) | Baixa | Alto | Server-side validation + audit trail | ✅ Mitigado |
| R7 | localStorage tampered | Baixa | Médio | HMAC + validação estrutural + session integrity | ⚠️ Aceito (device policy) |
| R8 | Sem certificado digital para assinatura | - | Médio | Hash + timestamp + matrícula como evidência | ⚠️ Evolução futura |

---

## 8. Roadmap de Evolução

```
FASE 1 ✅ SPA Hardened (ATUAL)
├── Formulário digital completo (9 seções)
├── Segurança defense-in-depth
├── PWA offline-first
├── Dashboard BI operacional
├── LGPD compliance
└── 234 testes automatizados

FASE 2 ✅ Sync Engine (ATUAL)
├── IndexedDB sync queue
├── Store-and-forward com backoff
├── Conflict detection + resolution
├── Backend batch sync endpoint
└── SyncIndicator visual

FASE 3 ◻ Observabilidade Centralizada
├── Azure Application Insights (custom events operacionais)
├── KQL dashboards para gestão
├── Alertas automáticos (sync > 4h, conflitos não resolvidos)
└── Health check endpoint com métricas

FASE 4 ◻ Multi-Pátio
├── Tenant isolation (pátio como contexto)
├── Dashboard unificado para gestão
├── Comparação cross-pátio
└── EventHub para streaming cross-system

FASE 5 ◻ Integração Corporativa
├── SAP S4/HANA (exportação de registros)
├── SCADA/MES (leitura de sensores)
├── Azure AD SSO (já preparado)
└── Assinatura digital ICP-Brasil

FASE 6 ◻ Intelligence
├── ML para detecção de padrões
├── Predição de riscos por histórico
├── NLP no AdamBoot (LLM assistente)
└── Computer vision para inventário de pátio
```

---

## 9. Conclusão

Este sistema resolve um problema real — a digitalização da passagem de serviço ferroviária em ambiente sem conectividade — com uma arquitetura que reconhece e abraça as restrições do domínio ao invés de lutar contra elas.

A decisão de ir offline-first não foi uma limitação — foi a decisão arquitetural central. Tudo que se seguiu (sync engine, conflict resolution, dual storage, HMAC no client) é consequência natural dessa decisão.

O resultado é um sistema que um operador pode usar em um pátio sem rede alguma às 3 da manhã, com a confiança de que seus dados estão seguros localmente e serão centralizados quando a conectividade permitir. Sem perda, sem espera, sem dependência.

Isso é o que offline-first significa em infraestrutura crítica.

---

*Este documento é parte do portfólio de Solution Architecture.*
*Todas as decisões documentadas incluem alternativas analisadas e trade-offs aceitos.*
