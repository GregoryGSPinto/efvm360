// ============================================================================
// EFVM360 — App Service (Backend API) + Staging Slot
// ============================================================================

param prefix string
param environment string
param location string
param dbHost string
@secure()
param jwtSecret string

resource plan 'Microsoft.Web/serverfarms@2023-01-01' = {
  name: '${prefix}-plan-${environment}'
  location: location
  sku: { name: environment == 'production' ? 'P1v3' : 'B1' }
  kind: 'linux'
  properties: { reserved: true }
}

resource app 'Microsoft.Web/sites@2023-01-01' = {
  name: '${prefix}-api-${environment}'
  location: location
  identity: { type: 'SystemAssigned' }
  properties: {
    serverFarmId: plan.id
    httpsOnly: true
    siteConfig: {
      linuxFxVersion: 'NODE|20-lts'
      alwaysOn: environment == 'production'
      minTlsVersion: '1.2'
      ftpsState: 'Disabled'
      healthCheckPath: '/api/v1/health'
      appSettings: [
        { name: 'NODE_ENV', value: environment }
        { name: 'DB_HOST', value: dbHost }
        { name: 'DB_NAME', value: 'efvm360_railway' }
        { name: 'JWT_SECRET', value: jwtSecret }
        { name: 'WEBSITE_RUN_FROM_PACKAGE', value: '1' }
      ]
    }
  }
}

// Staging slot for blue/green deploy
resource stagingSlot 'Microsoft.Web/sites/slots@2023-01-01' = if (environment == 'production') {
  parent: app
  name: 'staging'
  location: location
  identity: { type: 'SystemAssigned' }
  properties: {
    serverFarmId: plan.id
    httpsOnly: true
    siteConfig: {
      linuxFxVersion: 'NODE|20-lts'
      minTlsVersion: '1.2'
      ftpsState: 'Disabled'
      healthCheckPath: '/api/v1/health'
    }
  }
}

output principalId string = app.identity.principalId
output hostname string = app.properties.defaultHostName
