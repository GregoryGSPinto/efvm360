// ============================================================================
// EFVM360 Backend — Migration 014: Seed Operational Data
// Equipment, Risk Grades, Yard Layouts (comprehensive seed)
// ============================================================================

import sequelize from '../config/database';

export async function runMigration014(): Promise<void> {
  const qi = sequelize.getQueryInterface();
  console.log('[EFVM360-MIGRATE-014] Iniciando seed de dados operacionais...');

  const now = new Date();

  // ── 1. EQUIPMENT SEED ───────────────────────────────────────────────────
  const equipmentData = [
    // Comunicação
    { name: 'Rádio VHF', category: 'comunicacao', criticality: 'high', min_qty: 2, cur_qty: 3 },
    { name: 'Rádio UHF', category: 'comunicacao', criticality: 'high', min_qty: 2, cur_qty: 2 },
    { name: 'Celular Corporativo', category: 'comunicacao', criticality: 'medium', min_qty: 1, cur_qty: 2 },
    // Sinalização
    { name: 'Bandeira Vermelha', category: 'sinalizacao', criticality: 'high', min_qty: 4, cur_qty: 6 },
    { name: 'Bandeira Verde', category: 'sinalizacao', criticality: 'high', min_qty: 4, cur_qty: 5 },
    { name: 'Lanterna Ferroviária', category: 'sinalizacao', criticality: 'high', min_qty: 2, cur_qty: 3 },
    // Segurança
    { name: 'Extintor ABC 6kg', category: 'seguranca', criticality: 'critical', min_qty: 2, cur_qty: 3 },
    { name: 'Kit Primeiros Socorros', category: 'seguranca', criticality: 'critical', min_qty: 1, cur_qty: 2 },
    { name: 'Cone de Sinalização', category: 'seguranca', criticality: 'high', min_qty: 6, cur_qty: 8 },
    // Medição
    { name: 'Trena Laser', category: 'medicao', criticality: 'medium', min_qty: 1, cur_qty: 2 },
    { name: 'Manômetro', category: 'medicao', criticality: 'medium', min_qty: 1, cur_qty: 1 },
    { name: 'Termômetro Industrial', category: 'medicao', criticality: 'low', min_qty: 1, cur_qty: 1 },
    // Ferramentas
    { name: 'Chave Inglesa', category: 'ferramentas', criticality: 'medium', min_qty: 2, cur_qty: 3 },
    { name: 'Alicate Universal', category: 'ferramentas', criticality: 'medium', min_qty: 2, cur_qty: 2 },
    { name: 'Chave de Fenda Phillips', category: 'ferramentas', criticality: 'medium', min_qty: 2, cur_qty: 3 },
    // EPI
    { name: 'Capacete com Jugular', category: 'epi', criticality: 'critical', min_qty: 5, cur_qty: 8 },
    { name: 'Luvas de Proteção', category: 'epi', criticality: 'critical', min_qty: 5, cur_qty: 10 },
    { name: 'Óculos de Proteção', category: 'epi', criticality: 'critical', min_qty: 5, cur_qty: 7 },
    { name: 'Botina de Segurança', category: 'epi', criticality: 'critical', min_qty: 5, cur_qty: 6 },
    { name: 'Colete Refletivo', category: 'epi', criticality: 'critical', min_qty: 5, cur_qty: 8 },
    { name: 'Protetor Auricular', category: 'epi', criticality: 'high', min_qty: 5, cur_qty: 12 },
  ];

  for (const eq of equipmentData) {
    const [existing] = await sequelize.query(
      `SELECT id FROM equipment WHERE name = '${eq.name}' LIMIT 1`
    ) as [Array<{ id: number }>, unknown];

    if (existing.length === 0) {
      await qi.bulkInsert('equipment', [{
        uuid: crypto.randomUUID(),
        name: eq.name,
        category: eq.category,
        criticality: eq.criticality,
        min_quantity_per_shift: eq.min_qty,
        current_quantity: eq.cur_qty,
        status: 'operational',
        yard_code: null,
        created_at: now,
        updated_at: now,
      }]);
    }
  }

  console.log('[EFVM360-MIGRATE-014] ✅ Seed: 21 equipamentos operacionais');

  // ── 2. RISK GRADES SEED ────────────────────────────────────────────────
  const riskGrades = [
    { desc: 'Descarrilamento em manobra', prob: 3, impact: 5, grade: 'critical', mitigation: 'Inspeção visual pré-manobra obrigatória. Verificação de AMV antes de movimentação.', nr: 'NR-01' },
    { desc: 'Falha de comunicação rádio', prob: 4, impact: 4, grade: 'high', mitigation: 'Redundância via celular corporativo + protocolo verbal padronizado.', nr: 'NR-01' },
    { desc: 'Atropelamento na via permanente', prob: 2, impact: 5, grade: 'critical', mitigation: 'Sinalização ativa + apito 500m antes + velocidade restrita em pátio.', nr: 'NR-11' },
    { desc: 'Queda de nível (plataforma/vagão)', prob: 3, impact: 3, grade: 'medium', mitigation: 'Uso obrigatório de EPI + treinamento periódico de segurança.', nr: 'NR-12' },
    { desc: 'Exposição a ruído excessivo', prob: 5, impact: 2, grade: 'medium', mitigation: 'Uso obrigatório de protetor auricular tipo concha ou plugue.', nr: 'NR-15' },
    { desc: 'Choque entre composições', prob: 2, impact: 5, grade: 'critical', mitigation: 'Protocolo de comunicação CCO obrigatório antes de movimentação. VMA 5km/h.', nr: 'NR-01' },
    { desc: 'Vazamento de carga (minério)', prob: 3, impact: 3, grade: 'medium', mitigation: 'Inspeção de portas laterais. Registro em formulário de anomalia.', nr: 'NR-11' },
    { desc: 'Falha no sistema de freio', prob: 2, impact: 5, grade: 'critical', mitigation: 'Teste de freio obrigatório (freio 20). Calço de segurança em rampa.', nr: 'NR-11' },
    { desc: 'Incêndio em locomotiva', prob: 1, impact: 5, grade: 'high', mitigation: 'Extintor ABC em cada locomotiva. Treinamento de brigada anual.', nr: 'NR-23' },
    { desc: 'Exposição solar prolongada', prob: 4, impact: 2, grade: 'medium', mitigation: 'Pausas hidratação. Protetor solar. Chapéu sob capacete quando possível.', nr: 'NR-21' },
  ];

  for (const rg of riskGrades) {
    const [existing] = await sequelize.query(
      `SELECT id FROM risk_grades WHERE description = '${rg.desc.replace(/'/g, "''")}' LIMIT 1`
    ) as [Array<{ id: number }>, unknown];

    if (existing.length === 0) {
      await qi.bulkInsert('risk_grades', [{
        uuid: crypto.randomUUID(),
        description: rg.desc,
        probability: rg.prob,
        impact: rg.impact,
        grade: rg.grade,
        mitigation: rg.mitigation,
        nr_reference: rg.nr,
        active: true,
        created_at: now,
        updated_at: now,
      }]);
    }
  }

  console.log('[EFVM360-MIGRATE-014] ✅ Seed: 10 graus de risco (matriz 5×5)');

  // ── 3. PÁTIOS SEED (se não existirem) ──────────────────────────────────
  const patios = [
    { codigo: 'FZ', nome: 'Pera do Fazendão' },
    { codigo: 'TO', nome: 'Pera de Timbopeba' },
    { codigo: 'BR', nome: 'Pera de Brucutu' },
    { codigo: 'CS', nome: 'Pátio de Costa Lacerda' },
    { codigo: 'P6', nome: 'Terminal Pátio 6 — Meia' },
  ];

  for (const p of patios) {
    const [existing] = await sequelize.query(
      `SELECT id FROM patios WHERE codigo = '${p.codigo}' LIMIT 1`
    ) as [Array<{ id: number }>, unknown];

    if (existing.length === 0) {
      await qi.bulkInsert('patios', [{
        uuid: crypto.randomUUID(),
        codigo: p.codigo,
        nome: p.nome,
        ativo: true,
        padrao: p.codigo === 'FZ',
        criado_por: 'SEED',
        created_at: now,
        updated_at: now,
      }]);
    }
  }

  console.log('[EFVM360-MIGRATE-014] ✅ Seed: 5 pátios EFVM');

  console.log('[EFVM360-MIGRATE-014] ══════════════════════════════════════════');
  console.log('[EFVM360-MIGRATE-014] ✅ MIGRAÇÃO 014 COMPLETA — Seed operacional');
  console.log('[EFVM360-MIGRATE-014] ══════════════════════════════════════════');
}
