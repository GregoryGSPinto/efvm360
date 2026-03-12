# Azure Key Vault Setup

Status: optional integration.

## Evidence In Code

- `backend/src/config/keyvault.ts`
- `backend/src/services/keyVaultService.ts`

## Usage

If `AZURE_KEYVAULT_URL` is configured, the backend can read secrets from Azure Key Vault. Without it, the backend falls back to environment variables.

This repository does not include a live Key Vault configuration. Do not claim managed secrets in production unless you have provisioned and verified that environment separately.
