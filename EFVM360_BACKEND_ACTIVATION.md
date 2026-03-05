# EFVM360 — Backend Activation Plan

**Data:** 2026-03-05  
**Objetivo:** Conectar frontend DDD ao backend Express real  
**Pré-requisito:** CTO Audit completada (Fase 1)  

---

## Diagnóstico Inicial

O frontend EFVM360 implementa DDD com IndexedDB como persistência local. O backend Express + Sequelize existe mas pode não estar 100% conectado a todas as features do frontend.

**Objetivo desta fase:** Garantir que TODO fluxo do frontend tenha um endpoint real no backend, com migration, seed data, e validação end-to-end.

---

## STEP 1 — Endpoint Inventory

### 1.1 Mapear endpoints existentes no backend

```bash
# Gerar inventário completo
echo "=== BACKEND ROUTES ==="
grep -rn "router\.\(get\|post\|put\|patch\|delete\)" backend/src/routes/ --include="*.ts" | \
  sed 's|backend/src/routes/||' | sort

echo ""
echo "=== CONTROLLER METHODS ==="
for ctrl in backend/src/controllers/*.ts; do
  echo "--- $(basename $ctrl) ---"
  grep "async \|export " "$ctrl" | head -10
done
```

### 1.2 Mapear chamadas do frontend

```bash
# Todas as chamadas de API no frontend
grep -rn "api\.\|fetch(\|axios\.\|apiClient\." frontend/src/ --include="*.ts" --include="*.tsx" \
  | grep -v node_modules | grep -v __tests__ | sort
```

### 1.3 Gap Analysis

Comparar output 1.1 vs 1.2 para identificar:
- Endpoints existentes no backend mas não usados pelo frontend
- Chamadas no frontend sem endpoint correspondente no backend
- Endpoints mock/stub que precisam de implementação real

**Resultado esperado — tabela de gaps:**

| Feature | Frontend Call | Backend Endpoint | Status |
|---------|-------------|-----------------|--------|
| Login | POST /api/auth/login | ✅ | ⏳ |
| Refresh Token | POST /api/auth/refresh | ✅ | ⏳ |
| Azure AD SSO | GET /api/auth/azure/callback | ✅ | ⏳ |
| Criar Passagem | POST /api/passagens | ✅ | ⏳ |
| Listar Passagens | GET /api/passagens | ✅ | ⏳ |
| Assinar Passagem | POST /api/passagens/:id/sign | ✅/❌ | ⏳ |
| CRUD Layout Pátio | /api/yard-layouts/* | ✅/❌ | ⏳ |
| CRUD Equipamentos | /api/equipment/* | ✅/❌ | ⏳ |
| CRUD Graus Risco | /api/risk-grades/* | ✅/❌ | ⏳ |
| Dashboard KPIs | GET /api/dashboard/* | ✅/❌ | ⏳ |
| Gestão Equipe | /api/users/* | ✅/❌ | ⏳ |
| Audit Trail | GET /api/audit/* | ✅/❌ | ⏳ |
| AdamBot History | /api/adambot/* | ✅/❌ | ⏳ |

---

## STEP 2 — Database Schema Verification

### 2.1 Verificar migrations existentes

```bash
# Listar todas as migrations
find backend/src/migrations/ -type f | sort

# Verificar que migration cobre todos os models
echo "=== MODELS ==="
find backend/src/models/ -name "*.ts" -exec basename {} .ts \; | sort

echo ""
echo "=== MIGRATIONS ==="
ls backend/src/migrations/ | sort
```

### 2.2 Criar migrations faltantes

Para cada model sem migration correspondente:

```typescript
// Exemplo: backend/src/migrations/YYYYMMDDHHMMSS-create-yard-layouts.ts
import { QueryInterface, DataTypes } from 'sequelize';

export async function up(queryInterface: QueryInterface): Promise<void> {
  await queryInterface.createTable('yard_layouts', {
    id: {
      type: DataTypes.UUID,
      defaultValue: DataTypes.UUIDV4,
      primaryKey: true,
      allowNull: false,
    },
    patio_id: {
      type: DataTypes.STRING(50),
      allowNull: false,
    },
    patio_name: {
      type: DataTypes.STRING(100),
      allowNull: false,
    },
    lines: {
      type: DataTypes.JSON,
      allowNull: false,
      defaultValue: [],
    },
    amv_positions: {
      type: DataTypes.JSON,
      allowNull: true,
    },
    categories: {
      type: DataTypes.JSON,
      allowNull: true,
    },
    created_by: {
      type: DataTypes.UUID,
      allowNull: false,
      references: { model: 'users', key: 'id' },
    },
    created_at: {
      type: DataTypes.DATE,
      allowNull: false,
      defaultValue: DataTypes.NOW,
    },
    updated_at: {
      type: DataTypes.DATE,
      allowNull: false,
      defaultValue: DataTypes.NOW,
    },
  });

  await queryInterface.addIndex('yard_layouts', ['patio_id']);
}

export async function down(queryInterface: QueryInterface): Promise<void> {
  await queryInterface.dropTable('yard_layouts');
}
```

### 2.3 Tabelas necessárias

| Tabela | Model | Migration | Status |
|--------|-------|-----------|--------|
| users | User | ✅ | ⏳ |
| service_passes | ServicePass | ✅ | ⏳ |
| yard_layouts | YardLayout | ⏳ | ⏳ |
| equipment | Equipment | ⏳ | ⏳ |
| risk_grades | RiskGrade | ⏳ | ⏳ |
| audit_logs | AuditLog | ✅ | ⏳ |
| sessions | Session | ✅ | ⏳ |
| notifications | Notification | ⏳ | ⏳ |
| shift_crews | ShiftCrew | ⏳ | ⏳ |
| five_s_inspections | FiveSInspection | ⏳ | ⏳ |

---

## STEP 3 — Seed Data

### 3.1 User Seeds

```typescript
// backend/src/migrations/seed/users.ts
import bcrypt from 'bcrypt';

const SALT_ROUNDS = 12;

export async function seedUsers(queryInterface: any) {
  const password = await bcrypt.hash('EFVM360!demo', SALT_ROUNDS);

  await queryInterface.bulkInsert('users', [
    {
      id: 'usr-001',
      matricula: 'ADM9001',
      name: 'Gestor Demo',
      role: 'gestor',
      password_hash: password,
      active: true,
      created_at: new Date(),
      updated_at: new Date(),
    },
    {
      id: 'usr-002',
      matricula: 'VFZ1001',
      name: 'Inspetor Demo',
      role: 'inspetor',
      password_hash: password,
      active: true,
      created_at: new Date(),
      updated_at: new Date(),
    },
    {
      id: 'usr-003',
      matricula: 'VBR2001',
      name: 'Maquinista Demo',
      role: 'maquinista',
      password_hash: password,
      active: true,
      created_at: new Date(),
      updated_at: new Date(),
    },
    {
      id: 'usr-004',
      matricula: 'VFZ1002',
      name: 'Oficial Demo',
      role: 'oficial',
      password_hash: password,
      active: true,
      created_at: new Date(),
      updated_at: new Date(),
    },
  ]);
}
```

### 3.2 Yard Layout Seeds

```typescript
// Pátio de Tubarão (principal)
export async function seedYardLayouts(queryInterface: any) {
  await queryInterface.bulkInsert('yard_layouts', [
    {
      id: 'yard-001',
      patio_id: 'tubarao',
      patio_name: 'Pátio de Tubarão',
      lines: JSON.stringify([
        { id: 'L01', name: 'Linha 1', category: 'recepcao', status: 'available' },
        { id: 'L02', name: 'Linha 2', category: 'recepcao', status: 'occupied' },
        { id: 'L03', name: 'Linha 3', category: 'carregamento', status: 'available' },
        { id: 'L04', name: 'Linha 4', category: 'carregamento', status: 'maintenance' },
        { id: 'L05', name: 'Linha 5', category: 'expedicao', status: 'available' },
      ]),
      amv_positions: JSON.stringify([
        { id: 'AMV-01', name: 'AMV 01', position: 'normal', locked: false },
        { id: 'AMV-02', name: 'AMV 02', position: 'reversa', locked: true },
      ]),
      categories: JSON.stringify(['recepcao', 'carregamento', 'expedicao', 'manutencao']),
      created_by: 'usr-001',
      created_at: new Date(),
      updated_at: new Date(),
    },
  ]);
}
```

### 3.3 Equipment Seeds

```typescript
export async function seedEquipment(queryInterface: any) {
  const categories = [
    { cat: 'comunicacao', items: ['Rádio VHF', 'Rádio UHF', 'Celular corporativo'] },
    { cat: 'sinalizacao', items: ['Bandeira vermelha', 'Bandeira verde', 'Lanterna'] },
    { cat: 'seguranca', items: ['Extintor ABC', 'Kit primeiros socorros', 'Cone sinalização'] },
    { cat: 'medicao', items: ['Trena laser', 'Manômetro', 'Termômetro'] },
    { cat: 'ferramentas', items: ['Chave inglesa', 'Alicate', 'Chave de fenda'] },
    { cat: 'epi', items: ['Capacete', 'Luvas', 'Óculos proteção', 'Botina', 'Colete refletivo'] },
  ];

  const equipment = categories.flatMap(({ cat, items }, catIdx) =>
    items.map((name, itemIdx) => ({
      id: `equip-${catIdx}-${itemIdx}`,
      name,
      category: cat,
      criticality: cat === 'seguranca' || cat === 'epi' ? 'high' : 'medium',
      min_quantity_per_shift: cat === 'epi' ? 5 : 2,
      current_quantity: Math.floor(Math.random() * 5) + 2,
      status: 'operational',
      created_at: new Date(),
      updated_at: new Date(),
    }))
  );

  await queryInterface.bulkInsert('equipment', equipment);
}
```

### 3.4 Risk Grade Seeds

```typescript
export async function seedRiskGrades(queryInterface: any) {
  await queryInterface.bulkInsert('risk_grades', [
    { id: 'risk-001', description: 'Descarrilamento em manobra', probability: 3, impact: 5, grade: 'critical', mitigation: 'Inspeção visual pré-manobra obrigatória', nr_reference: 'NR-01', created_at: new Date(), updated_at: new Date() },
    { id: 'risk-002', description: 'Falha de comunicação rádio', probability: 4, impact: 4, grade: 'high', mitigation: 'Redundância via celular + protocolo verbal', nr_reference: 'NR-01', created_at: new Date(), updated_at: new Date() },
    { id: 'risk-003', description: 'Atropelamento na via', probability: 2, impact: 5, grade: 'critical', mitigation: 'Sinalização + apito + velocidade restrita', nr_reference: 'NR-11', created_at: new Date(), updated_at: new Date() },
    { id: 'risk-004', description: 'Queda de nível', probability: 3, impact: 3, grade: 'medium', mitigation: 'Uso de EPI + treinamento periódico', nr_reference: 'NR-12', created_at: new Date(), updated_at: new Date() },
    { id: 'risk-005', description: 'Exposição a ruído', probability: 5, impact: 2, grade: 'medium', mitigation: 'Uso de protetor auricular', nr_reference: 'NR-01', created_at: new Date(), updated_at: new Date() },
  ]);
}
```

---

## STEP 4 — API Client Bridge

### 4.1 Verificar ApiClient do Frontend

```bash
# Ver implementação do API client
cat frontend/src/api/*.ts | head -100

# Verificar se tem fallback para IndexedDB quando backend indisponível
grep -n "fallback\|offline\|catch\|IndexedDB" frontend/src/api/*.ts | head -15
```

### 4.2 Bridge Pattern (Backend Available ↔ Offline)

O frontend DEVE manter o padrão bridge:

```
Frontend Request
    │
    ├── Backend disponível? ──YES──► API call → salva em IndexedDB (cache)
    │
    └── Backend indisponível? ──NO──► IndexedDB local → enfileira para sync
```

### 4.3 Sync Engine Activation

```bash
# Verificar sync engine
cat frontend/src/infrastructure/persistence/SyncEngine.ts | head -80

# Verificar que sync tem retry com exponential backoff
grep -n "retry\|backoff\|jitter\|setTimeout" frontend/src/infrastructure/persistence/SyncEngine.ts | head -10
```

---

## STEP 5 — End-to-End Flow Validation

### 5.1 Fluxos críticos a validar

| # | Fluxo | Steps | Validação |
|---|-------|-------|-----------|
| 1 | Login | POST /auth/login → JWT → redirect dashboard | Token válido, refresh funciona |
| 2 | Criar Passagem | Preencher 12 seções → POST /passagens | Salva no MySQL, hash gerado |
| 3 | Assinar Passagem | POST /passagens/:id/sign → HMAC | Integridade verificável |
| 4 | CRUD Layout | Criar/editar/deletar pátio | Persiste no MySQL |
| 5 | CRUD Equipamentos | Adicionar/editar equipamento | Categoria + criticidade |
| 6 | Matriz Risco | CRUD grau de risco | 5×5 probability × impact |
| 7 | Dashboard | GET KPIs | Dados agregados corretos |
| 8 | Offline → Online | Criar passagem offline → sync | Sem perda de dados |
| 9 | RBAC | Oficial tenta CRUD → blocked | 403 Forbidden |
| 10 | Audit Trail | Verificar hash chain | previousHash → currentHash |

### 5.2 Docker Compose Validation

```bash
# Subir stack completa
docker-compose up -d

# Verificar que todos os containers estão saudáveis
docker-compose ps

# Rodar migrations
docker-compose exec backend npm run migrate

# Rodar seeds
docker-compose exec backend npm run migrate:seed

# Health check
curl http://localhost:3001/api/v1/health

# Testar login
curl -X POST http://localhost:3001/api/v1/auth/login \
  -H "Content-Type: application/json" \
  -d '{"matricula":"VFZ1001","password":"EFVM360!demo"}'
```

---

## STEP 6 — Matrícula Validation Fix

### 6.1 Problema conhecido

O regex de validação de matrícula precisa aceitar TODOS os formatos EFVM:

| Formato | Exemplo | Descrição |
|---------|---------|-----------|
| VFZ + 4 dígitos | VFZ1001 | Funcionário Vitória |
| VBR + 4 dígitos | VBR2001 | Funcionário Brasil |
| ADM + 4 dígitos | ADM9001 | Administrativo |

### 6.2 Fix

```typescript
// backend/src/middleware/validation.ts
const MATRICULA_REGEX = /^(VFZ|VBR|ADM)\d{4}$/;

export function validateMatricula(matricula: string): boolean {
  return MATRICULA_REGEX.test(matricula.toUpperCase());
}
```

---

## Acceptance Criteria

- [ ] Todos os endpoints do backend mapeados e documentados
- [ ] Migrations existem para TODAS as tabelas
- [ ] Seed data cobre todos os 4 roles + dados operacionais
- [ ] Docker-compose sobe sem erros
- [ ] Login funciona com matrícula VFZ/VBR/ADM
- [ ] Fluxo passagem completo: criar → preencher → assinar
- [ ] Offline → online sync funcional
- [ ] RBAC enforced em TODOS os endpoints
- [ ] Audit trail com hash chain verificável
- [ ] Health check retorna 200

---

*Este documento é executado via run-master.sh Fase 1.5*
