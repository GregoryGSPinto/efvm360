# Azure Key Vault — VFZ Secrets Management

## Visão Geral

Todos os secrets de produção (JWT, banco, Application Insights) são gerenciados via Azure Key Vault. Em desenvolvimento local, o sistema usa `.env` automaticamente.

## 1. Criar Key Vault

```bash
az keyvault create \
  --name kv-vfz-prod \
  --resource-group rg-vfz-prod \
  --location brazilsouth \
  --sku standard \
  --enable-soft-delete true \
  --retention-days 90
```

## 2. Adicionar Secrets

```bash
az keyvault secret set --vault-name kv-vfz-prod --name vfz-jwt-secret --value "$(openssl rand -base64 64)"
az keyvault secret set --vault-name kv-vfz-prod --name vfz-jwt-refresh-secret --value "$(openssl rand -base64 64)"
az keyvault secret set --vault-name kv-vfz-prod --name vfz-db-password --value "SENHA_MYSQL_AQUI"
az keyvault secret set --vault-name kv-vfz-prod --name vfz-db-host --value "vfz-mysql-prod.mysql.database.azure.com"
az keyvault secret set --vault-name kv-vfz-prod --name vfz-db-user --value "vfz_app"
az keyvault secret set --vault-name kv-vfz-prod --name vfz-db-name --value "vfz_railway"
az keyvault secret set --vault-name kv-vfz-prod --name vfz-appinsights-key --value "INSTRUMENTATION_KEY"
```

## 3. Managed Identity no App Service

```bash
# Habilitar System-Assigned Managed Identity
az webapp identity assign --name vfz-api-production --resource-group rg-vfz-prod

# Obter Principal ID
PRINCIPAL_ID=$(az webapp identity show --name vfz-api-production -g rg-vfz-prod --query principalId -o tsv)

# Conceder acesso ao Key Vault (RBAC — método recomendado)
az role assignment create \
  --role "Key Vault Secrets User" \
  --assignee $PRINCIPAL_ID \
  --scope /subscriptions/<SUB_ID>/resourceGroups/rg-vfz-prod/providers/Microsoft.KeyVault/vaults/kv-vfz-prod

# OU via Access Policy (método legado)
az keyvault set-policy --name kv-vfz-prod --object-id $PRINCIPAL_ID --secret-permissions get list
```

## 4. Configurar App Service

```bash
az webapp config appsettings set --name vfz-api-production -g rg-vfz-prod \
  --settings AZURE_KEYVAULT_URL="https://kv-vfz-prod.vault.azure.net/"
```

## 5. Integração no Backend

```typescript
// server.ts
import { loadSecrets, getSecret } from './services/keyVaultService';

async function bootstrap() {
  await loadSecrets(); // Key Vault em prod, .env em dev
  const jwtSecret = getSecret('JWT_SECRET');
  // ...
}
```

Dependências: `npm install @azure/identity @azure/keyvault-secrets`

## Segurança

| Regra | Detalhe |
|-------|---------|
| RBAC | Somente `Key Vault Secrets User` (read-only) para App Service |
| Soft Delete | Habilitado com retenção de 90 dias |
| Network | Restringir acesso à VNet do App Service |
| Rotation | Rotacionar JWT secrets a cada 90 dias |
| Auditoria | Habilitar diagnostic settings no Key Vault |
| Dev Local | `.env` usado automaticamente (sem Key Vault) |

## Rotação de Secrets

```bash
# Gerar novo secret
az keyvault secret set --vault-name kv-vfz-prod --name vfz-jwt-secret --value "$(openssl rand -base64 64)"

# Reiniciar App Service para carregar novo valor
az webapp restart --name vfz-api-production -g rg-vfz-prod
```

## Troubleshooting

| Problema | Solução |
|----------|---------|
| `SecretNotFound` | Verificar nome do secret (prefixo `vfz-`) |
| `ForbiddenByPolicy` | Verificar RBAC/Access Policy do Managed Identity |
| `AuthenticationError` | Verificar se Managed Identity está habilitado |
| Fallback para `.env` | `AZURE_KEYVAULT_URL` não configurado — comportamento esperado em dev |
