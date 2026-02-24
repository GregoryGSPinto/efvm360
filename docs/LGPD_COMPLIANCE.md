# VFZ v3.2 — Conformidade LGPD (Lei 13.709/2018)

## 1. Inventário de Dados Pessoais

| Dado | Tipo | Base Legal | Retenção |
|------|------|-----------|----------|
| Nome completo | Identificação | Execução contratual (Art. 7, V) | Ativo + 5 anos |
| Matrícula | Identificação | Legítimo interesse (Art. 7, IX) | Ativo + 5 anos |
| Função/cargo | Profissional | Execução contratual | Ativo + 5 anos |
| Senha (hash bcrypt) | Autenticação | Legítimo interesse | Até exclusão |
| IP de acesso | Segurança | Legítimo interesse | 90 dias |
| User-Agent | Segurança | Legítimo interesse | 90 dias |
| Audit trail | Operacional | Obrigação legal (Art. 7, II) | 5 anos |
| Assinatura digital | Operacional | Obrigação legal | 5 anos |
| Azure AD OID | Autenticação SSO | Execução contratual | Ativo + 5 anos |

## 2. API de Direitos dos Titulares

| Direito (Art. 18) | Endpoint | Método |
|-------------------|----------|--------|
| Acesso (II) | `GET /api/v1/lgpd/meus-dados` | Autenticado |
| Portabilidade (V) | `POST /api/v1/lgpd/exportar` | JSON download |
| Eliminação (VI) | `POST /api/v1/lgpd/anonimizar` | Anonimização* |
| Correção (III) | `PATCH /api/v1/usuarios/:uuid` | Nome, função |
| Política | `GET /api/v1/lgpd/politica` | Público |

*Anonimização, não exclusão — registros operacionais ferroviários preservados por obrigação legal.

## 3. Medidas Técnicas de Proteção

| Medida | Implementação |
|--------|---------------|
| Criptografia em trânsito | TLS 1.2+ obrigatório (Azure App Service) |
| Criptografia em repouso | Azure MySQL TDE + Key Vault para secrets |
| Hash de senha | bcrypt 12 rounds (irreversível) |
| Minimização | `toSafeJSON()` remove senha_hash de todas as respostas |
| Controle de acesso | RBAC hierárquico (5 níveis) + JWT expiração 8h |
| Audit trail | Append-only com hash encadeado (SHA-256) |
| Logs de acesso | IP + User-Agent registrados, retidos 90 dias |
| Consent | Aceite de termos registrado no primeiro login |

## 4. Consentimento

O sistema registra aceite de termos no primeiro login. O aviso de privacidade é acessível via `GET /api/v1/lgpd/politica` e pelo menu Configurações.

Para operações com base legal de consentimento, o registro inclui: matrícula, timestamp, versão dos termos, e IP.

## 5. Processo de Resposta a Incidentes

| Fase | Prazo | Ação |
|------|-------|------|
| Detecção | Imediato | Alert via App Insights → equipe segurança |
| Contenção | < 1h | Isolar acesso comprometido, revogar tokens |
| Avaliação | < 4h | Determinar escopo e dados afetados |
| Notificação ANPD | < 2 dias úteis | Se dados sensíveis vazados (Art. 48) |
| Notificação titulares | < 3 dias úteis | Via gestor operacional |
| Remediação | < 5 dias úteis | Correção + relatório post-mortem |

## 6. Data Retention Policy

```sql
-- Limpeza automática de logs de acesso (>90 dias)
DELETE FROM audit_log WHERE tipo = 'ACESSO' AND created_at < DATE_SUB(NOW(), INTERVAL 90 DAY);

-- Anonimização de usuários inativos (>5 anos)
UPDATE usuarios SET nome = 'Usuário Anonimizado', email = NULL
WHERE ultimo_acesso < DATE_SUB(NOW(), INTERVAL 5 YEAR) AND ativo = FALSE;
```

## 7. Responsáveis

| Papel | Contato |
|-------|---------|
| DPO Vale | dpo@vale.com |
| Canal LGPD | https://vale.com/privacidade |
| Responsável técnico | Equipe VFZ |
