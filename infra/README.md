# VFZ v3.2 — Infrastructure as Code (Azure Bicep)

## Visão Geral

Toda a infraestrutura Azure é definida como código via Bicep, permitindo deploy reprodutível e versionado.

## Estrutura

```
infra/bicep/
├── main.bicep                  # Orchestrator (subscription scope)
├── modules/
│   ├── appservice.bicep        # App Service + staging slot
│   ├── mysql.bicep             # MySQL Flexible Server + firewall
│   ├── keyvault.bicep          # Key Vault (soft-delete + purge protection)
│   ├── appinsights.bicep       # Application Insights + Log Analytics
│   └── staticwebapp.bicep      # Static Web App (frontend)
└── parameters/
    ├── production.json         # Production parameters
    └── staging.json            # Staging parameters
```

## Deploy

```bash
# Login
az login
az account set --subscription <SUB_ID>

# Deploy staging
az deployment sub create \
  --location brazilsouth \
  --template-file infra/bicep/main.bicep \
  --parameters @infra/bicep/parameters/staging.json \
  dbAdminPassword=<PASSWORD> \
  jwtSecret=$(openssl rand -base64 64)

# Deploy production
az deployment sub create \
  --location brazilsouth \
  --template-file infra/bicep/main.bicep \
  --parameters @infra/bicep/parameters/production.json \
  dbAdminPassword=<PASSWORD> \
  jwtSecret=$(openssl rand -base64 64)
```

## Resources Created

| Resource | Staging | Production |
|----------|---------|------------|
| App Service Plan | B1 | P1v3 |
| App Service | vfz-api-staging | vfz-api-production |
| Staging Slot | — | vfz-api-production/staging |
| MySQL | Standard_B1ms (Burstable) | Standard_D2ds_v4 (GP) |
| MySQL HA | Disabled | ZoneRedundant |
| MySQL Backup | 7 days | 14 days + geo-redundant |
| Key Vault | Standard | Standard + purge protection |
| Static Web App | Free | Standard |
| App Insights | PerGB2018 | PerGB2018 |

## Security

- HTTPS only (httpsOnly: true)
- TLS 1.2 minimum
- FTPS disabled
- Key Vault with soft-delete (90 days) + purge protection
- MySQL firewall: Azure services only
- Managed Identity for Key Vault access
