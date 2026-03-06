// ============================================================================
// EFVM360 — Infrastructure as Code (Azure Bicep)
// ============================================================================

targetScope = 'subscription'

@description('Environment name')
@allowed(['staging', 'production'])
param environment string

@description('Azure region')
param location string = 'brazilsouth'

@description('MySQL admin password')
@secure()
param dbAdminPassword string

@description('JWT Secret')
@secure()
param jwtSecret string

var prefix = 'efvm360'
var rgName = 'rg-${prefix}-${environment}'

// Resource Group
resource rg 'Microsoft.Resources/resourceGroups@2023-07-01' = {
  name: rgName
  location: location
}

// MySQL Flexible Server
module mysql 'modules/mysql.bicep' = {
  scope: rg
  name: 'mysql-deploy'
  params: { prefix: prefix, environment: environment, location: location, adminPassword: dbAdminPassword }
}

// App Service Plan + App Service (Backend)
module appService 'modules/appservice.bicep' = {
  scope: rg
  name: 'appservice-deploy'
  params: { prefix: prefix, environment: environment, location: location, dbHost: mysql.outputs.fqdn, jwtSecret: jwtSecret }
}

// Key Vault
module keyVault 'modules/keyvault.bicep' = {
  scope: rg
  name: 'keyvault-deploy'
  params: { prefix: prefix, environment: environment, location: location, appServicePrincipalId: appService.outputs.principalId }
}

// Application Insights
module appInsights 'modules/appinsights.bicep' = {
  scope: rg
  name: 'appinsights-deploy'
  params: { prefix: prefix, environment: environment, location: location }
}

// Static Web App (Frontend)
module swa 'modules/staticwebapp.bicep' = {
  scope: rg
  name: 'swa-deploy'
  params: { prefix: prefix, environment: environment, location: location }
}
