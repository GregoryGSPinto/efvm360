// ============================================================================
// EFVM360 — Azure MySQL Flexible Server
// ============================================================================

param prefix string
param environment string
param location string
@secure()
param adminPassword string

resource mysqlServer 'Microsoft.DBforMySQL/flexibleServers@2023-06-30' = {
  name: '${prefix}-mysql-${environment}'
  location: location
  sku: {
    name: environment == 'production' ? 'Standard_D2ds_v4' : 'Standard_B1ms'
    tier: environment == 'production' ? 'GeneralPurpose' : 'Burstable'
  }
  properties: {
    version: '8.0.21'
    administratorLogin: '${prefix}_admin'
    administratorLoginPassword: adminPassword
    storage: { storageSizeGB: environment == 'production' ? 64 : 32 }
    backup: {
      backupRetentionDays: environment == 'production' ? 14 : 7
      geoRedundantBackup: environment == 'production' ? 'Enabled' : 'Disabled'
    }
    highAvailability: {
      mode: environment == 'production' ? 'ZoneRedundant' : 'Disabled'
    }
  }
}

resource database 'Microsoft.DBforMySQL/flexibleServers/databases@2023-06-30' = {
  parent: mysqlServer
  name: 'efvm360_railway'
  properties: { charset: 'utf8mb4', collation: 'utf8mb4_unicode_ci' }
}

// Allow Azure services
resource firewallAllowAzure 'Microsoft.DBforMySQL/flexibleServers/firewallRules@2023-06-30' = {
  parent: mysqlServer
  name: 'AllowAzureServices'
  properties: {
    startIpAddress: '0.0.0.0'
    endIpAddress: '0.0.0.0'
  }
}

output fqdn string = mysqlServer.properties.fullyQualifiedDomainName
