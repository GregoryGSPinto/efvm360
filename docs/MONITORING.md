# VFZ v3.2 — Monitoramento (Azure Application Insights)

## Arquitetura

```
Frontend (React) ──► Application Insights SDK (page views, exceptions)
Backend (Express) ──► Application Insights (requests, dependencies, custom events)
Azure MySQL ──────► Dependency tracking (query duration)
```

## Backend Integration

```typescript
// server.ts
import { initMonitoring, trackLogin, flushTelemetry } from './services/monitoringService';
initMonitoring(); // First line after imports

// Graceful shutdown
process.on('SIGTERM', async () => {
  await flushTelemetry();
  process.exit(0);
});
```

Custom events disponíveis: `trackLogin()`, `trackLogout()`, `trackPassagemCriada()`, `trackPassagemAssinada()`, `trackAlertaCritico()`, `trackFormPreenchimento()`, `trackException()`.

## Dashboards

### 1. Operacional
| Métrica | Query KQL |
|---------|-----------|
| Passagens/dia | `customEvents \| where name == "PASSAGEM_ASSINADA" \| summarize count() by bin(timestamp, 1d)` |
| Tempo médio preenchimento | `customEvents \| where name == "FORM_PREENCHIMENTO" \| summarize avg(todouble(customMeasurements.duracaoMinutos))` |
| Alertas críticos/turno | `customEvents \| where name == "ALERTA_CRITICO" \| summarize count() by bin(timestamp, 12h)` |
| Turno sem registro | `customEvents \| where name == "PASSAGEM_ASSINADA" \| summarize count() by bin(timestamp, 12h) \| where count_ == 0` |

### 2. Autenticação
| Métrica | Query KQL |
|---------|-----------|
| Logins/hora | `customEvents \| where name == "LOGIN" \| summarize count() by bin(timestamp, 1h)` |
| Falhas de login | `customEvents \| where name == "LOGIN_FALHA" \| summarize count() by bin(timestamp, 1h)` |
| Método auth | `customEvents \| where name == "LOGIN" \| summarize count() by tostring(customDimensions.authMethod)` |
| Logouts por timeout | `customEvents \| where name == "LOGOUT" and customDimensions.reason == "timeout" \| count` |

### 3. Performance
| Métrica | Query KQL |
|---------|-----------|
| Response time p95 | `requests \| summarize percentile(duration, 95) by name \| order by percentile_duration_95 desc` |
| Slowest endpoints | `requests \| where duration > 2000 \| summarize count() by name \| top 10 by count_` |
| MySQL latency | `dependencies \| where type == "mysql" \| summarize percentile(duration, 95)` |
| Error rate | `requests \| summarize failures=countif(success == false), total=count() \| extend rate=100.0*failures/total` |

### 4. Infraestrutura
| Métrica | Query KQL |
|---------|-----------|
| Memory usage | `performanceCounters \| where name == "Private Bytes" \| summarize avg(value) by bin(timestamp, 5m)` |
| CPU | `performanceCounters \| where name == "% Processor Time" \| summarize avg(value) by bin(timestamp, 5m)` |
| Top exceptions | `exceptions \| summarize count() by outerMessage \| top 10 by count_` |

## Alertas

| Alerta | Condição | Severidade | Action Group |
|--------|----------|------------|--------------|
| Alta Latência | Response time p95 > 2s por 5min | ⚠️ Warning | email-ops |
| Error Rate | Failure rate > 5% por 5min | 🔴 Critical | email-ops + sms |
| Brute Force | LOGIN_FALHA > 10/min | 🔴 Critical | email-security |
| DB Down | Dependency failure > 0 por 2min | 🔴 Critical | email-ops + sms |
| Sem Passagem | Zero PASSAGEM_ASSINADA em 12h | ⚠️ Warning | email-supervisor |
| Memory High | Private Bytes > 512MB por 10min | ⚠️ Warning | email-ops |

### Criar alerta via CLI:

```bash
az monitor metrics alert create \
  --name "vfz-high-latency" \
  --resource-group rg-vfz-prod \
  --scopes "/subscriptions/<SUB>/resourceGroups/rg-vfz-prod/providers/Microsoft.Insights/components/vfz-appinsights" \
  --condition "avg requests/duration > 2000" \
  --window-size 5m \
  --evaluation-frequency 1m \
  --action vfz-ops-action-group \
  --severity 2
```

## Setup

```bash
# Variável de ambiente no App Service
az webapp config appsettings set --name vfz-api-production -g rg-vfz-prod \
  --settings APPLICATIONINSIGHTS_CONNECTION_STRING="InstrumentationKey=xxx;IngestionEndpoint=..."
```

## Retenção

| Dado | Retenção |
|------|----------|
| Requests/dependencies | 90 dias |
| Custom events | 90 dias |
| Exceptions | 90 dias |
| Logs (workspace) | 30 dias (expandir para LGPD se necessário) |
