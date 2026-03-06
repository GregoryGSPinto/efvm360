# EFVM360 Backend — Documentação da API v1

## Base URL

- **Local:** `http://localhost:3001/api/v1`
- **Azure:** `https://efvm360-api-prod.azurewebsites.net/api/v1`

## Autenticação

Todas as rotas (exceto `/auth/login`, `/auth/refresh` e `/health`) exigem JWT:

```
Authorization: Bearer <access_token>
```

---

## Endpoints

### 🔐 AUTH

#### POST /auth/login
Autentica usuário e retorna tokens JWT.

```json
// Request
{ "matricula": "Vale001", "senha": "Vale@2024" }

// Response 200
{
  "accessToken": "eyJhbGciOiJI...",
  "refreshToken": "abc123...",
  "user": {
    "uuid": "f47ac10b-...",
    "nome": "Operador Vale",
    "matricula": "Vale001",
    "funcao": "maquinista",
    "turno": "A",
    "horarioTurno": "07-19"
  },
  "expiresIn": "8h"
}

// Response 401
{ "error": "Matrícula ou senha incorretos", "code": "AUTH_INVALID_CREDENTIALS" }

// Response 401 (bloqueado)
{ "error": "Conta bloqueada. Tente novamente em 14 minutos.", "code": "AUTH_ACCOUNT_LOCKED" }
```

#### POST /auth/refresh
Renova access token usando refresh token (rotation: token antigo é invalidado).

```json
// Request
{ "refreshToken": "abc123..." }

// Response 200
{ "accessToken": "eyJ...", "refreshToken": "def456...", "expiresIn": "8h" }
```

#### POST /auth/logout
Revoga todos os refresh tokens do usuário. **Requer auth.**

```json
// Response 200
{ "message": "Logout realizado com sucesso" }
```

#### POST /auth/alterar-senha
Altera senha do usuário logado. **Requer auth.**

```json
// Request
{ "senhaAtual": "Vale@2024", "novaSenha": "NovaVale@2025" }

// Response 200
{ "message": "Senha alterada com sucesso. Realize login novamente." }
```

#### GET /auth/me
Retorna dados do usuário logado. **Requer auth.**

```json
// Response 200
{ "user": { "uuid": "...", "nome": "...", "matricula": "...", ... } }
```

---

### 📋 PASSAGENS

#### GET /passagens
Lista passagens com filtros opcionais. **Requer auth.**

```
GET /passagens?data=2026-02-21&turno=A&status=assinado_completo&limit=20&offset=0
```

```json
// Response 200
{
  "passagens": [
    {
      "uuid": "...",
      "data_passagem": "2026-02-21",
      "turno": "A",
      "status": "assinado_completo",
      "operadorSai": { "nome": "...", "matricula": "..." },
      "operadorEntra": { "nome": "...", "matricula": "..." }
    }
  ],
  "total": 42
}
```

#### GET /passagens/:uuid
Retorna detalhe completo de uma passagem. **Requer auth.**

#### POST /passagens
Salva passagem (nova ou atualização). **Requer auth.**

```json
// Request
{
  "uuid": null,
  "cabecalho": { "data": "2026-02-21", "turno": "A", "horario": "07-19", "dss": "DSS-001" },
  "patioCima": [...],
  "patioBaixo": [...],
  "equipamentos": [...],
  "segurancaManobras": {...},
  "pontosAtencao": {...},
  "intervencoes": [...],
  "sala5s": {...},
  "assinaturas": {
    "sai": { "nome": "Op1", "matricula": "Vale001", "confirmado": true, "hashIntegridade": "abc..." },
    "entra": { "nome": "Op2", "matricula": "Vale004", "confirmado": true, "hashIntegridade": "def..." }
  }
}

// Response 201
{ "uuid": "f47ac10b-...", "status": "assinado_completo", "hashIntegridade": "sha256..." }
```

#### POST /passagens/:uuid/assinar
Assina passagem com verificação de senha **server-side**. **Requer auth.**

```json
// Request
{ "tipo": "saida", "senha": "Vale@2024" }

// Response 200
{ "message": "Assinatura de saida registrada com sucesso", "hash": "sha256...", "status": "assinado_parcial" }

// Response 403
{ "error": "Senha incorreta", "code": "AUTH_INVALID_PASSWORD" }
```

---

### 📊 AUDITORIA

#### GET /audit
Lista registros de auditoria. **Requer auth (mínimo inspetor).**

```
GET /audit?matricula=Vale001&acao=LOGIN&limit=50&offset=0&dataInicio=2026-02-01&dataFim=2026-02-28
```

#### GET /audit/integridade
Verifica integridade da cadeia de auditoria. **Requer auth (administrador).**

```json
// Response 200
{ "valida": true, "totalRegistros": 1547, "registrosVerificados": 1547 }

// Response 200 (corrompida)
{ "valida": false, "totalRegistros": 1547, "registrosVerificados": 892, "primeiroInvalido": 893 }
```

#### POST /audit/sync
Sincroniza audit trail do frontend. **Requer auth.**

```json
// Request
{
  "registros": [
    { "matricula": "Vale001", "acao": "LOGIN", "recurso": "autenticacao", "detalhes": "...", "timestamp": "2026-02-21T10:00:00Z" }
  ]
}

// Response 200
{ "importados": 15, "duplicados": 2 }
```

---

### 👥 USUÁRIOS

#### GET /usuarios
Lista todos os usuários. **Requer auth (mínimo gestor).**

#### POST /usuarios
Cria novo usuário. **Requer auth (administrador).**

```json
// Request
{ "nome": "Novo Operador", "matricula": "Vale005", "funcao": "maquinista", "turno": "B", "horarioTurno": "19-07", "senha": "Segura@2024" }
```

#### PATCH /usuarios/:uuid
Atualiza usuário existente. **Requer auth (administrador).**

```json
// Request (campos opcionais)
{ "nome": "Nome Atualizado", "funcao": "supervisor", "ativo": false }
```

---

### ❤️ HEALTH

#### GET /health
Verifica saúde da API e conexão com MySQL. **Sem autenticação.**

```json
// Response 200
{
  "status": "healthy",
  "service": "efvm360-backend",
  "version": "1.0.0",
  "database": "connected",
  "timestamp": "2026-02-21T14:30:00.000Z",
  "uptime": 86400,
  "environment": "production"
}
```

---

## Códigos de Erro

| Código | HTTP | Significado |
|--------|------|-------------|
| AUTH_MISSING_TOKEN | 401 | Header Authorization ausente |
| AUTH_TOKEN_EXPIRED | 401 | Access token expirado |
| AUTH_INVALID_TOKEN | 401 | Token inválido ou adulterado |
| AUTH_INVALID_CREDENTIALS | 401 | Matrícula ou senha incorretos |
| AUTH_ACCOUNT_LOCKED | 401 | Conta bloqueada por tentativas |
| AUTH_REFRESH_INVALID | 401 | Refresh token inválido/expirado |
| AUTH_FORBIDDEN | 403 | Permissão insuficiente |
| AUTH_INVALID_PASSWORD | 403 | Senha incorreta (assinatura) |
| VALIDATION_ERROR | 400 | Dados obrigatórios ausentes |
| DUPLICATE_MATRICULA | 409 | Matrícula já cadastrada |
| RATE_LIMIT_EXCEEDED | 429 | Muitas requisições |
| LOGIN_RATE_LIMIT | 429 | Muitas tentativas de login |
| CORS_ERROR | 403 | Origem não permitida |
| INTERNAL_ERROR | 500 | Erro interno do servidor |

---

## Segurança

| Mecanismo | Implementação |
|-----------|--------------|
| Senhas | bcrypt (cost 12) |
| Tokens | JWT RS256 + refresh rotation |
| Rate Limiting | 100 req/15min global, 5 login/15min |
| CORS | Whitelist por origem |
| Headers | Helmet (CSP, HSTS, X-Frame) |
| Audit | Append-only com triggers MySQL |
| Input | Sanitização + express-validator |
| SSL | Obrigatório em Azure (HSTS preload) |
