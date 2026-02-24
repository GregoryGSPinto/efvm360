// ============================================================================
// VFZ — Azure Key Vault (Secrets Management)
// ============================================================================

param prefix string
param environment string
param location string
param appServicePrincipalId string

resource kv 'Microsoft.KeyVault/vaults@2023-07-01' = {
  name: '${prefix}-kv-${environment}'
  location: location
  properties: {
    sku: { family: 'A', name: 'standard' }
    tenantId: subscription().tenantId
    enableSoftDelete: true
    softDeleteRetentionInDays: 90
    enablePurgeProtection: true
    enableRbacAuthorization: false // Using access policies
    accessPolicies: [
      {
        tenantId: subscription().tenantId
        objectId: appServicePrincipalId
        permissions: { secrets: ['get', 'list'] }
      }
    ]
    networkAcls: {
      defaultAction: 'Allow' // Restrict to VNet in production
      bypass: 'AzureServices'
    }
  }
}

output vaultUri string = kv.properties.vaultUri
