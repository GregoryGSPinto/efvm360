# EFVM360 — Features Evolution (Enterprise)

**Data:** 2026-03-05  
**Objetivo:** Features enterprise que elevam a plataforma de portfolio a produto  
**Pré-requisito:** Bilingual + Design completa (Fase 2)  

---

## Feature Roadmap

```
FASE 3A — Real-Time & WebSocket          [2-3 semanas]
FASE 3B — Predictive Maintenance (ML)    [2-3 semanas]
FASE 3C — PWA Enhanced (Capacitor)       [1-2 semanas]
FASE 3D — Integration APIs               [2-3 semanas]
FASE 3E — Advanced Analytics             [1-2 semanas]
FASE 3F — Multi-Site Support             [1-2 semanas]
FASE 3G — Compliance Automation          [1-2 semanas]
```

---

## FASE 3A — Real-Time Dashboard (WebSocket)

### Objetivo

Dashboard ao vivo com status do pátio atualizado em tempo real, sem polling.

### Implementação

```typescript
// backend/src/services/websocket.ts
import { Server as SocketIOServer } from 'socket.io';
import { Server } from 'http';
import { verifyJWT } from '../middleware/auth';

export function initializeWebSocket(httpServer: Server) {
  const io = new SocketIOServer(httpServer, {
    cors: { origin: process.env.FRONTEND_URL, credentials: true },
    pingInterval: 25000,
    pingTimeout: 60000,
  });

  // Auth middleware para WebSocket
  io.use(async (socket, next) => {
    const token = socket.handshake.auth.token;
    try {
      const user = await verifyJWT(token);
      socket.data.user = user;
      next();
    } catch {
      next(new Error('Authentication failed'));
    }
  });

  io.on('connection', (socket) => {
    const { user } = socket.data;
    console.log(`[WS] Connected: ${user.matricula} (${user.role})`);

    // Join room by patio
    socket.join(`patio:${user.patioId || 'tubarao'}`);

    // Join role-based room
    socket.join(`role:${user.role}`);

    socket.on('disconnect', () => {
      console.log(`[WS] Disconnected: ${user.matricula}`);
    });
  });

  return io;
}

// Emissão de eventos
export const WS_EVENTS = {
  YARD_STATUS_UPDATE: 'yard:status:update',
  LINE_STATUS_CHANGE: 'yard:line:change',
  AMV_POSITION_CHANGE: 'yard:amv:change',
  NEW_HANDOVER: 'handover:new',
  HANDOVER_SIGNED: 'handover:signed',
  EQUIPMENT_ALERT: 'equipment:alert',
  RISK_ALERT: 'risk:alert',
  SYNC_COMPLETE: 'sync:complete',
} as const;
```

### Frontend Hook

```typescript
// frontend/src/hooks/useWebSocket.ts
import { useEffect, useRef, useState } from 'react';
import { io, Socket } from 'socket.io-client';
import { useAuth } from './useAuth';

export function useWebSocket() {
  const { token } = useAuth();
  const socketRef = useRef<Socket | null>(null);
  const [connected, setConnected] = useState(false);

  useEffect(() => {
    if (!token) return;

    const socket = io(import.meta.env.VITE_WS_URL || 'ws://localhost:3001', {
      auth: { token },
      reconnectionAttempts: 5,
      reconnectionDelay: 1000,
      reconnectionDelayMax: 5000,
    });

    socket.on('connect', () => setConnected(true));
    socket.on('disconnect', () => setConnected(false));

    socketRef.current = socket;

    return () => {
      socket.disconnect();
    };
  }, [token]);

  return { socket: socketRef.current, connected };
}
```

### Dashboard Real-Time Components

| Component | WS Event | Update |
|-----------|----------|--------|
| YardStatusMap | yard:status:update | Posição das linhas |
| LineStatusBadge | yard:line:change | Status individual |
| AMVIndicator | yard:amv:change | Normal/Reversa |
| HandoverFeed | handover:new/signed | Timeline de passagens |
| EquipmentAlerts | equipment:alert | Alertas de criticidade |
| ConnectionBadge | connect/disconnect | Online indicator |

---

## FASE 3B — Predictive Maintenance (ML)

### Objetivo

Prever falhas de equipamentos baseado em histórico de manutenção e uso.

### Data Model

```typescript
interface MaintenanceRecord {
  equipmentId: string;
  type: 'preventive' | 'corrective' | 'predictive';
  date: Date;
  duration_hours: number;
  cost: number;
  failure_mode?: string;
  parts_replaced?: string[];
  next_scheduled?: Date;
}

interface PredictionResult {
  equipmentId: string;
  equipment_name: string;
  predicted_failure_date: Date;
  confidence: number; // 0-1
  risk_level: 'low' | 'medium' | 'high' | 'critical';
  recommended_action: string;
  estimated_cost: number;
  model_version: string;
}
```

### ML Pipeline (Simplified — TensorFlow.js ou API)

**Opção A — Client-side (TensorFlow.js):**
- Model treinado offline com dados históricos
- Inferência no browser (funciona offline)
- Model size < 5MB
- Good for: predictions baseadas em padrões simples

**Opção B — API-based (Backend):**
- Python ML service (scikit-learn / Prophet)
- REST API chamada do backend Express
- Better accuracy, mais dados
- Requires connectivity

**Recomendação:** Começar com Opção A (offline-first philosophy) e evoluir para Opção B quando backend ML service estiver disponível.

### Features Preditivas

| Feature | Input | Output |
|---------|-------|--------|
| MTBF (Mean Time Between Failures) | Maintenance history | Dias até próxima falha provável |
| Degradation Curve | Usage hours + conditions | % degradação estimada |
| Cost Optimization | Maintenance costs + downtime | Preventive vs. corrective tradeoff |
| Anomaly Detection | Sensor readings (future) | Desvio do padrão normal |

---

## FASE 3C — PWA Enhanced

### Objetivo

Transformar o PWA existente em experiência mobile-native via Capacitor.

### Setup

```bash
cd frontend
pnpm add @capacitor/core @capacitor/cli
pnpm add @capacitor/push-notifications @capacitor/camera @capacitor/geolocation
pnpm add @capacitor/network @capacitor/haptics @capacitor/status-bar
npx cap init "EFVM360" "com.efvm360.app" --web-dir dist
npx cap add android
npx cap add ios
```

### Capacitor Plugins Required

| Plugin | Use Case |
|--------|----------|
| @capacitor/push-notifications | Alertas de passagem/risco |
| @capacitor/camera | Foto de equipamento/defeito |
| @capacitor/geolocation | Localização do inspetor |
| @capacitor/network | Detecção de conectividade |
| @capacitor/haptics | Feedback tátil em ações críticas |
| @capacitor/status-bar | Overlay com status |
| @capacitor/filesystem | Cache de dados offline |

### Offline Enhancements

```typescript
// Enhanced offline indicator
import { Network } from '@capacitor/network';

const status = await Network.getStatus();
// { connected: boolean, connectionType: 'wifi' | 'cellular' | 'none' }

Network.addListener('networkStatusChange', (status) => {
  if (status.connected) {
    triggerSync(); // Sync queued operations
  }
});
```

---

## FASE 3D — Integration APIs

### Objetivo

APIs para integração com sistemas corporativos.

### Integration Points

| System | Protocol | Data Flow |
|--------|----------|-----------|
| SAP PM (Maintenance) | REST / OData | Bidirectional — work orders, equipment |
| Oracle EBS | REST | Bidirectional — inventory, procurement |
| SCADA / CLP | OPC-UA / MQTT | Inbound — sensor data, AMV status |
| MS Teams | Webhook | Outbound — notifications, alerts |
| Power BI | REST | Outbound — operational data export |
| SSO (Azure AD) | OIDC/PKCE | Already implemented |

### Webhook Engine

```typescript
// backend/src/services/webhooks.ts
interface WebhookConfig {
  id: string;
  name: string;
  url: string;
  events: string[];
  secret: string;
  active: boolean;
  retry_policy: {
    max_attempts: number;
    backoff_ms: number;
  };
}

// Quando um evento ocorre no EFVM360, disparar webhooks
async function dispatchWebhook(event: string, payload: any) {
  const hooks = await WebhookConfig.findAll({
    where: { active: true, events: { [Op.contains]: [event] } }
  });

  for (const hook of hooks) {
    const signature = createHmac('sha256', hook.secret)
      .update(JSON.stringify(payload))
      .digest('hex');

    await queue.add('webhook', {
      url: hook.url,
      payload,
      headers: {
        'X-EFVM360-Signature': signature,
        'X-EFVM360-Event': event,
      },
      retryPolicy: hook.retry_policy,
    });
  }
}
```

### Public API (for integrations)

```
POST /api/v1/integrations/webhooks          # Register webhook
GET  /api/v1/integrations/webhooks          # List webhooks
DEL  /api/v1/integrations/webhooks/:id      # Remove webhook

GET  /api/v1/export/handovers?from=&to=     # Export handovers (JSON/CSV)
GET  /api/v1/export/equipment               # Export equipment inventory
GET  /api/v1/export/risk-matrix             # Export risk matrix
GET  /api/v1/export/kpis?period=            # Export KPI data

POST /api/v1/import/equipment               # Bulk import equipment
POST /api/v1/import/users                   # Bulk import users
```

---

## FASE 3E — Advanced Analytics

### Objetivo

Análise avançada além do BI+ Dashboard existente.

### Features

| Feature | Descrição | Implementação |
|---------|-----------|---------------|
| Trend Analysis | Tendências de ocupação, ocorrências, risco | Recharts + linear regression |
| Anomaly Detection | Desvios de padrões normais | Z-score analysis |
| Heatmap | Mapa de calor de ocorrências por linha/turno | D3.js heatmap |
| Shift Comparison | Comparação entre turnos/equipes | Side-by-side charts |
| Forecast | Previsão de ocupação/demanda | ARIMA simples |
| Report Generator | PDF report com período selecionado | jsPDF + charts |

### Analytics Dashboard Layout

```
┌──────────────────────────────────────────────────────────────┐
│  EFVM360 Analytics                     [Period] [Export PDF] │
├──────────────────────────────────────────────────────────────┤
│                                                              │
│  ┌─────────────────┐ ┌─────────────────┐ ┌────────────────┐ │
│  │ Yard Occupancy  │ │ Incident Trend  │ │ Risk Score     │ │
│  │ [Sparkline]     │ │ [Sparkline]     │ │ [Gauge]        │ │
│  │ 78% (+3%)       │ │ 12 (-2)         │ │ 3.4/5.0        │ │
│  └─────────────────┘ └─────────────────┘ └────────────────┘ │
│                                                              │
│  ┌──────────────────────────┐ ┌────────────────────────────┐ │
│  │ Heatmap: Incidents       │ │ Shift Comparison           │ │
│  │ by Track × Time          │ │ [Grouped Bar Chart]        │ │
│  │ [D3 Heatmap]             │ │                            │ │
│  └──────────────────────────┘ └────────────────────────────┘ │
│                                                              │
│  ┌──────────────────────────────────────────────────────────┐ │
│  │ Forecast: Next 30 Days Yard Occupancy                    │ │
│  │ [Area Chart with confidence interval]                    │ │
│  └──────────────────────────────────────────────────────────┘ │
│                                                              │
└──────────────────────────────────────────────────────────────┘
```

---

## FASE 3F — Multi-Site Support

### Objetivo

Suportar múltiplos pátios/ferrovias com dados isolados mas gerenciamento centralizado.

### Data Architecture

```typescript
interface Site {
  id: string;
  name: string;             // "Pátio de Tubarão"
  code: string;             // "TUB"
  railway: string;          // "EFVM"
  region: string;           // "ES"
  timezone: string;         // "America/Sao_Paulo"
  coordinates: {
    lat: number;
    lng: number;
  };
  active: boolean;
}
```

### Multi-Tenant Strategy

**Approach: Schema-per-tenant (PostgreSQL) ou Row-level filtering (MySQL)**

Para MySQL (current):
```sql
-- Adicionar site_id em TODAS as tabelas
ALTER TABLE service_passes ADD COLUMN site_id VARCHAR(36) NOT NULL;
ALTER TABLE yard_layouts ADD COLUMN site_id VARCHAR(36) NOT NULL;
ALTER TABLE equipment ADD COLUMN site_id VARCHAR(36) NOT NULL;
-- etc.

-- Row-level security via middleware
CREATE INDEX idx_service_passes_site ON service_passes(site_id);
```

### Backend Middleware

```typescript
// backend/src/middleware/site-context.ts
export function siteContext(req: Request, res: Response, next: NextFunction) {
  const siteId = req.headers['x-site-id'] || req.user?.defaultSiteId;
  
  if (!siteId) {
    return res.status(400).json({ error: 'Site context required' });
  }

  // Verify user has access to this site
  if (!req.user.sites.includes(siteId)) {
    return res.status(403).json({ error: 'Access denied for this site' });
  }

  req.siteId = siteId;
  next();
}
```

### Sites EFVM

| Site | Code | Localização |
|------|------|------------|
| Pátio de Tubarão | TUB | Vitória, ES |
| Pátio de Costa Lacerda | CLR | Costa Lacerda, MG |
| Terminal de Itabira | ITB | Itabira, MG |
| Pátio de Governador Valadares | GVD | Gov. Valadares, MG |
| Pátio de Fabriciano | FBN | Coronel Fabriciano, MG |

---

## FASE 3G — Compliance Automation

### Objetivo

Automatizar verificação de conformidade com NRs brasileiras.

### NR Mapping

| NR | Tema | Verificação Automática |
|----|------|----------------------|
| NR-01 | GRO (Gerenciamento de Riscos) | Matriz 5×5 atualizada, plano de ação |
| NR-11 | Transporte e Movimentação | Checklist de equipamentos de transporte |
| NR-12 | Segurança em Máquinas | Inventário de máquinas + manutenção em dia |
| NR-13 | Caldeiras e Vasos de Pressão | Validade de inspeções |
| NR-35 | Trabalho em Altura | Treinamentos válidos + EPIs |

### Compliance Dashboard

```typescript
interface ComplianceCheck {
  nr: string;
  description: string;
  frequency: 'daily' | 'weekly' | 'monthly' | 'annual';
  last_checked: Date;
  status: 'compliant' | 'non_compliant' | 'pending' | 'overdue';
  responsible: string;
  evidence_required: boolean;
  evidence_url?: string;
}
```

### Automated Alerts

```
IF risk_matrix.last_updated > 30 days → ALERT "NR-01: Risk matrix outdated"
IF equipment.maintenance_due < today → ALERT "NR-12: Equipment maintenance overdue"
IF training.expiry < 30 days → ALERT "NR-35: Training expiring"
IF five_s.last_inspection > 7 days → ALERT "5S: Inspection overdue"
```

---

## Acceptance Criteria (Fase 3 Completa)

- [ ] WebSocket real-time dashboard funcional
- [ ] Live indicator de status das linhas
- [ ] Predictive maintenance dashboard (pelo menos MTBF)
- [ ] PWA enhanced com Capacitor configurado
- [ ] Push notifications funcionais
- [ ] Webhook engine com retry + HMAC signature
- [ ] Export API (JSON/CSV) para handovers, equipment, KPIs
- [ ] Analytics heatmap + trend + forecast
- [ ] PDF report generator
- [ ] Multi-site: pelo menos 2 pátios configurados
- [ ] Site switcher no navbar
- [ ] NR compliance dashboard
- [ ] Automated compliance alerts

---

*Este documento é executado via run-master.sh Fase 3*
