# EFVM360 v3.2 — Runbook Operacional
## Para equipe de operações TI Vale

---

## 1. CONTATOS E ESCALAÇÃO

| Nível | Papel | Contato | SLA |
|-------|-------|---------|-----|
| L1 | Plantão TI 24/7 | _preencher_ | < 15 min |
| L2 | Owner do Sistema | _preencher_ | < 1h |
| L3 | Cloud Engineer | _preencher_ | < 2h |
| L3 | DBA | _preencher_ | < 2h |
| L4 | Gerente TI Operações | _preencher_ | < 4h |

**Regra de escalação**: Se L1 não resolver em 30 min → L2. Se L2 não resolver em 1h → L3.

---

## 2. VERIFICAÇÕES DIÁRIAS

```bash
# Health check backend
curl -sf https://efvm360-api-production.azurewebsites.net/api/v1/health | jq .

# Verificar passagens das últimas 24h (deve haver pelo menos 2 por turno)
curl -sf -H "Authorization: Bearer $TOKEN" \
  https://efvm360-api-production.azurewebsites.net/api/v1/passagens?periodo=24h | jq '.total'

# Audit trail — integridade
curl -sf -H "Authorization: Bearer $TOKEN" \
  https://efvm360-api-production.azurewebsites.net/api/v1/audit/integridade | jq .

# MySQL backup status
az mysql flexible-server backup list -g rg-efvm360-prod -n efvm360-mysql-prod -o table

# App Service status
az webapp show -g rg-efvm360-prod -n efvm360-api-production --query "state" -o tsv
```

---

## 3. PROCEDIMENTOS DE INCIDENTE

### 3.1 Sistema Indisponível (500/timeout)

```
1. Verificar health endpoint: curl https://efvm360-api-production.../health
2. Se timeout → Reiniciar App Service:
   az webapp restart -g rg-efvm360-prod -n efvm360-api-production
3. Se persistir → Verificar MySQL:
   az mysql flexible-server show -g rg-efvm360-prod -n efvm360-mysql-prod --query "state"
4. Se MySQL down → Failover:
   az mysql flexible-server failover -g rg-efvm360-prod -n efvm360-mysql-prod
5. Se persistir → Verificar logs:
   az webapp log tail -g rg-efvm360-prod -n efvm360-api-production
```

### 3.2 Login Não Funciona

```
1. Testar health endpoint (API está up?)
2. Verificar rate limiting (muitas tentativas → aguardar cooldown)
3. Se Azure AD: verificar Entra ID service health
4. Se local auth: verificar MySQL connectivity
5. Reset de senha se necessário (admin):
   POST /api/v1/auth/admin/reset-password { matricula, novaSenha }
```

### 3.3 Passagens Não Salvam

```
1. Verificar MySQL connection pool: logs do App Service
2. Verificar disco do MySQL: az mysql flexible-server show --query "storage"
3. Verificar se há migration pendente: npm run migrate (staging primeiro)
4. Se dados corrompidos → restore do backup mais recente
```

### 3.4 Performance Degradada (latência > 2s)

```
1. App Insights → Performance → identify slow operations
2. Se MySQL lento → verificar slow query log
3. Se CPU alta → scale up temporário:
   az webapp config set -g rg-efvm360-prod -n efvm360-api-production --plan P1v3
4. Se connection pool exausto → reiniciar App Service
```

### 3.5 Suspeita de Brute Force

```
1. App Insights → customEvents → LOGIN_FALHA | where count > 10/min
2. Identificar IP(s) de origem
3. Bloquear IP temporariamente:
   az webapp config restriction add -g rg-efvm360-prod -n efvm360-api-production \
     --priority 100 --rule-name block-attacker --action Deny --ip-address <IP>/32
4. Notificar equipe de segurança (L3)
```

---

## 4. BACKUP E RECOVERY

### 4.1 Backup Automático
- MySQL: backup automático diário (7 dias retenção)
- Point-in-time restore: até 7 dias atrás

### 4.2 Restore

```bash
# Point-in-time restore (MySQL)
az mysql flexible-server restore \
  -g rg-efvm360-prod \
  --name efvm360-mysql-prod-restore \
  --source-server efvm360-mysql-prod \
  --restore-time "2024-03-15T10:00:00Z"
```

### 4.3 Rollback de Deploy

```bash
# Se deploy production causou problema:
# O CI/CD faz rollback automático se health check falhar.
# Para rollback manual:
az webapp deployment slot swap \
  -g rg-efvm360-prod -n efvm360-api-production \
  --slot staging --target-slot production
```

---

## 5. MANUTENÇÃO PROGRAMADA

### 5.1 Pre-manutenção
1. Avisar supervisor operacional com 48h antecedência
2. Programar para horário de menor impacto (03:00-05:00 BRT)
3. Garantir que passagens do turno atual estão assinadas

### 5.2 Durante manutenção
1. Habilitar página de manutenção:
   `az webapp config appsettings set ... --settings MAINTENANCE_MODE=true`
2. Executar migrations/updates
3. Testar em staging primeiro
4. Deploy production

### 5.3 Pós-manutenção
1. Health check
2. Testar login + criar passagem (smoke test manual)
3. Verificar App Insights (sem pico de erros)
4. Comunicar fim da manutenção ao supervisor

---

## 6. MONITORAMENTO

| O que verificar | Onde | Frequência |
|----------------|------|-----------|
| Health endpoint | curl / UptimeRobot | A cada 5 min |
| Error rate | App Insights | Contínuo (alertas) |
| Passagens/turno | App Insights custom events | Diário |
| Backup MySQL | Azure Portal | Diário |
| npm audit | GitHub Actions (Monday) | Semanal |
| Certificados TLS | Azure App Service | Mensal |

---

## 7. COMANDOS ÚTEIS

```bash
# Logs em tempo real
az webapp log tail -g rg-efvm360-prod -n efvm360-api-production

# Restart
az webapp restart -g rg-efvm360-prod -n efvm360-api-production

# Scale up (emergência)
az appservice plan update -g rg-efvm360-prod -n asp-efvm360-prod --sku P1v3

# Scale down (pós-emergência)
az appservice plan update -g rg-efvm360-prod -n asp-efvm360-prod --sku B1

# SSH no container
az webapp ssh -g rg-efvm360-prod -n efvm360-api-production

# Variáveis de ambiente
az webapp config appsettings list -g rg-efvm360-prod -n efvm360-api-production -o table
```
