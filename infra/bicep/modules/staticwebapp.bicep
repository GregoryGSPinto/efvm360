param prefix string
param environment string
param location string

resource swa 'Microsoft.Web/staticSites@2023-01-01' = {
  name: '${prefix}-web-${environment}'
  location: location
  sku: { name: environment == 'production' ? 'Standard' : 'Free' }
  properties: {}
}
