# 🔒 EFVM360 — Branch Protection Rules

## Setup Guide

Configure these rules no GitHub → Settings → Branches → Branch protection rules.

---

### Branch: `main` (Produção)

| Rule | Value |
|------|-------|
| Require pull request before merging | ✅ |
| Required approvals | **2** |
| Dismiss stale reviews | ✅ |
| Require review from CODEOWNERS | ✅ |
| Require status checks to pass | ✅ |
| Required checks | `🏗️ Frontend Build`, `🏗️ Backend Build` |
| Require branches up to date | ✅ |
| Require conversation resolution | ✅ |
| Include administrators | ✅ |
| Allow force pushes | ❌ |
| Allow deletions | ❌ |

### Branch: `staging`

| Rule | Value |
|------|-------|
| Require pull request before merging | ✅ |
| Required approvals | **1** |
| Require status checks to pass | ✅ |
| Required checks | `🏗️ Frontend Build`, `🏗️ Backend Build` |
| Allow force pushes | ❌ |

### Branch: `develop`

| Rule | Value |
|------|-------|
| Require status checks to pass | ✅ |
| Required checks | `🧪 Frontend Tests`, `🧪 Backend Tests` |

---

## Git Flow

```
feature/* ──► develop ──► staging ──► main
                              │           │
                          auto-deploy  auto-deploy
                          (staging)    (production + approval)
```

## Environment Secrets (GitHub → Settings → Environments)

### `staging`
- `AZURE_CREDENTIALS_STAGING` — Azure service principal JSON
- `AZURE_SWA_TOKEN_STAGING` — Static Web Apps deployment token

### `production`
- `AZURE_CREDENTIALS_PRODUCTION` — Azure service principal JSON
- `AZURE_SWA_TOKEN_PRODUCTION` — Static Web Apps deployment token
- **Required reviewers**: Configurar 1-2 aprovadores obrigatórios
