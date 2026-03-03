# EFVM360 — Guia de Deploy

Instruções para a equipe da Vale configurar o EFVM360 em ambiente de produção.

---

## Backend

### Requisitos

- Node.js 18+
- MySQL 8.0+
- 512MB RAM mínimo

### Configuração

1. Copiar `.env.example` para `.env` e configurar:

```env
# Database (MySQL)
DB_HOST=<mysql-host>
DB_PORT=3306
DB_NAME=efvm360
DB_USER=<db-user>
DB_PASSWORD=<db-password>
DB_SSL=true

# JWT (gerar secrets aleatórios de 64+ chars)
JWT_SECRET=<random-64-char-string>
JWT_REFRESH_SECRET=<random-64-char-string>

# Server
PORT=3001
NODE_ENV=production
API_PREFIX=/api/v1

# CORS (URL do frontend)
CORS_ORIGIN=https://efvm360.vale.com

# Security
BCRYPT_ROUNDS=12
RATE_LIMIT_WINDOW_MS=900000
RATE_LIMIT_MAX=100
LOGIN_MAX_ATTEMPTS=5
LOGIN_LOCKOUT_MINUTES=15

# Feature Flags
FEATURE_SSO_AZURE_AD=false
FEATURE_OFFLINE_MODE=true
FEATURE_DASHBOARD_BI=true

# Azure (opcional)
# APPLICATIONINSIGHTS_CONNECTION_STRING=<connection-string>
# AZURE_AD_TENANT_ID=<tenant-id>
# AZURE_AD_CLIENT_ID=<client-id>
```

### Instalação

```bash
cd backend
npm install
npm run seed:production   # Primeira vez: cria tabelas + usuários iniciais
npm start                 # Inicia o servidor
```

### Credenciais Iniciais

| Matrícula | Senha            | Função        | Ação Necessária          |
|-----------|------------------|---------------|--------------------------|
| ADM9001   | EFVM360@Admin!   | Administrador | Trocar senha no 1º login |
| SUP1001   | EFVM360@Sup!     | Supervisor    | Trocar senha no 1º login |

---

## Frontend

### Configuração

1. Criar `.env.production`:

```env
VITE_API_URL=https://<backend-url>/api/v1
VITE_SHOW_DEMO_CREDENTIALS=false
```

### Build

```bash
cd frontend
npm install
npm run build
```

Os arquivos de produção ficam em `frontend/dist/`.

### Servir

**Opção A: Nginx**

```nginx
server {
    listen 80;
    server_name efvm360.vale.com;
    root /var/www/efvm360/dist;
    index index.html;

    location / {
        try_files $uri $uri/ /index.html;
    }

    location /api/ {
        proxy_pass http://localhost:3001;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
    }
}
```

**Opção B: Vercel**

O frontend pode ser deployado no Vercel apontando para o repositório. Configurar `VITE_API_URL` nas variáveis de ambiente do Vercel.

---

## Variáveis de Ambiente

### Backend

| Variável | Descrição | Obrigatório | Default |
|----------|-----------|-------------|---------|
| `DB_HOST` | Host do MySQL | Sim | localhost |
| `DB_PORT` | Porta do MySQL | Não | 3306 |
| `DB_NAME` | Nome do banco | Sim | vfz_railway |
| `DB_USER` | Usuário do banco | Sim | — |
| `DB_PASSWORD` | Senha do banco | Sim | — |
| `DB_SSL` | Usar SSL na conexão | Não | false |
| `JWT_SECRET` | Secret para access tokens | Sim | — |
| `JWT_REFRESH_SECRET` | Secret para refresh tokens | Sim | — |
| `PORT` | Porta do servidor | Não | 3001 |
| `NODE_ENV` | Ambiente (production) | Sim | development |
| `CORS_ORIGIN` | URLs permitidas (comma-separated) | Sim | localhost |
| `BCRYPT_ROUNDS` | Rounds de hash bcrypt | Não | 12 |
| `RATE_LIMIT_MAX` | Max requests por janela | Não | 100 |

### Frontend

| Variável | Descrição | Obrigatório | Default |
|----------|-----------|-------------|---------|
| `VITE_API_URL` | URL da API backend | Sim | /api/v1 |
| `VITE_SHOW_DEMO_CREDENTIALS` | Mostrar painel de demo no login | Não | false |

---

## Arquitetura

```
                    ┌─────────────┐
                    │   Browser   │
                    │  (PWA/SPA)  │
                    └──────┬──────┘
                           │ HTTPS
                    ┌──────▼──────┐
                    │   Nginx /   │
                    │   Vercel    │
                    └──────┬──────┘
                           │
              ┌────────────┼────────────┐
              │                         │
       ┌──────▼──────┐          ┌──────▼──────┐
       │  Frontend   │          │   Backend   │
       │  (static)   │          │  (Express)  │
       │  dist/      │          │  port 3001  │
       └─────────────┘          └──────┬──────┘
                                       │
                                ┌──────▼──────┐
                                │   MySQL     │
                                │   8.0+      │
                                └─────────────┘
```

O frontend funciona em dois modos:
- **Com backend:** dados reais do MySQL
- **Sem backend:** dados mock locais (demonstração/offline)

---

## Verificação

Após o deploy, verificar:

1. `GET /api/v1/health` retorna `{ "status": "healthy" }`
2. Login com ADM9001 funciona
3. Dashboard carrega dados (sem badge "Modo Demo")
4. PWA instala corretamente no mobile
