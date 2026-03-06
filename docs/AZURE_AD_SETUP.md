# Azure AD / Entra ID — SSO Configuration

## Visão Geral

EFVM360 suporta dual-auth: Azure AD (SSO corporativo) + auth local (fallback). Azure AD tokens são validados via JWKS, e grupos são mapeados para roles EFVM360 automaticamente.

## 1. Registrar App no Entra ID

1. Portal Azure → **Microsoft Entra ID** → App registrations → **New registration**
2. Name: `EFVM360 - Gestão de Troca de Turno`
3. Supported accounts: **Single tenant** (apenas Vale)
4. Redirect URIs:
   - SPA: `https://efvm360.vale.com`
   - SPA: `http://localhost:5173` (dev only)

## 2. API Permissions (delegated)

| Permission | Type | Justificativa |
|------------|------|---------------|
| `openid` | Delegated | Required for OIDC |
| `profile` | Delegated | Nome do usuário |
| `email` | Delegated | Email corporativo |
| `User.Read` | Delegated | Perfil básico |

Admin consent required: **Yes** (grant for organization)

## 3. Token Configuration

- Token configuration → **Add groups claim**
- Token type: **ID** and **Access**
- Groups: **Security groups**
- Customize: Emit as `sAMAccountName` or group IDs

## 4. Grupo Azure AD → Role EFVM360

| Grupo Azure AD | Role EFVM360 | Nível |
|----------------|----------|-------|
| `EFVM360-Admins` | administrador | 5 |
| `EFVM360-Gestores` | gestor | 4 |
| `EFVM360-Inspetores` | inspetor | 3 |
| `EFVM360-Oficiais` | oficial | 2 |
| `EFVM360-Operadores` | operador | 1 |

Hierarquia: cada nível herda permissões dos inferiores.

## 5. Backend Configuration

```env
# .env (ou Azure App Service settings)
AZURE_AD_TENANT_ID=<tenant-id>
AZURE_AD_CLIENT_ID=<client-id>
```

Middleware: `src/middleware/azureADAuth.ts` — valida tokens JWKS, mapeia grupos → roles EFVM360. Se Azure AD não configurado, faz fallback transparente para auth local.

```typescript
// server.ts
import { azureADAuth } from './middleware/azureADAuth';
app.use(azureADAuth()); // Before local auth middleware
```

## 6. Frontend Configuration

```env
# frontend/.env
VITE_AZURE_CLIENT_ID=<client-id>
VITE_AZURE_TENANT_ID=<tenant-id>
VITE_AZURE_REDIRECT_URI=https://efvm360.vale.com
```

Usar `@azure/msal-browser` para login flow:

```typescript
import { PublicClientApplication } from '@azure/msal-browser';
const msalConfig = {
  auth: {
    clientId: import.meta.env.VITE_AZURE_CLIENT_ID,
    authority: `https://login.microsoftonline.com/${import.meta.env.VITE_AZURE_TENANT_ID}`,
    redirectUri: import.meta.env.VITE_AZURE_REDIRECT_URI,
  }
};
```

## 7. Dependências

```bash
# Backend
npm install jwks-rsa

# Frontend
npm install @azure/msal-browser @azure/msal-react
```

## 8. Dual Auth Flow

```
User → Login Screen
  ├─ "Entrar com Vale SSO" → MSAL redirect → Azure AD → Token → Backend validates via JWKS
  └─ "Matrícula + Senha" → Local auth → JWT → Normal flow
```

Ambos os métodos resultam em `req.user` com a mesma interface. O campo `authMethod` diferencia: `azure-ad` vs `local`.

## 9. Segurança

- Tokens validados contra JWKS endpoint da Microsoft (rotação automática de chaves)
- Single-tenant: apenas usuários do tenant Vale podem autenticar
- Groups claim: role determinada pelo grupo AD, não pelo usuário
- PKCE habilitado para SPA (proteção contra authorization code interception)
