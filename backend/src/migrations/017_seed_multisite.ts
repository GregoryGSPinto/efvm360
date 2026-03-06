// ============================================================================
// EFVM360 Backend — Migration 017: Seed Multi-Site & Compliance Data
// Seeds: Sites (Tubarão, Costa Lacerda), compliance checks, training records
// ============================================================================

import sequelize from '../config/database';

export async function runMigration017(): Promise<void> {
  const qi = sequelize.getQueryInterface();
  console.log('[EFVM360-MIGRATE-017] Iniciando seed multi-site + compliance...');

  const now = new Date();

  // ── 1. SITES SEED ──────────────────────────────────────────────────────
  const sites = [
    {
      code: 'TUB',
      name: 'Pátio de Tubarão',
      railway: 'EFVM',
      region: 'ES',
      timezone: 'America/Sao_Paulo',
      latitude: -20.2867,
      longitude: -40.2519,
    },
    {
      code: 'CLR',
      name: 'Pátio de Costa Lacerda',
      railway: 'EFVM',
      region: 'MG',
      timezone: 'America/Sao_Paulo',
      latitude: -19.9303,
      longitude: -43.0894,
    },
    {
      code: 'ITB',
      name: 'Terminal de Itabira',
      railway: 'EFVM',
      region: 'MG',
      timezone: 'America/Sao_Paulo',
      latitude: -19.6194,
      longitude: -43.2267,
    },
    {
      code: 'GVD',
      name: 'Pátio de Governador Valadares',
      railway: 'EFVM',
      region: 'MG',
      timezone: 'America/Sao_Paulo',
      latitude: -18.8511,
      longitude: -41.9494,
    },
    {
      code: 'FBN',
      name: 'Pátio de Fabriciano',
      railway: 'EFVM',
      region: 'MG',
      timezone: 'America/Sao_Paulo',
      latitude: -19.5189,
      longitude: -42.6283,
    },
  ];

  for (const site of sites) {
    const [existing] = await sequelize.query(
      `SELECT id FROM sites WHERE code = '${site.code}' LIMIT 1`
    ) as [Array<{ id: number }>, unknown];

    if (existing.length === 0) {
      await qi.bulkInsert('sites', [{
        uuid: crypto.randomUUID(),
        code: site.code,
        name: site.name,
        railway: site.railway,
        region: site.region,
        timezone: site.timezone,
        latitude: site.latitude,
        longitude: site.longitude,
        active: true,
        created_at: now,
        updated_at: now,
      }]);
    }
  }

  console.log('[EFVM360-MIGRATE-017] Seed: 5 sites EFVM (TUB, CLR, ITB, GVD, FBN)');

  // ── 2. COMPLIANCE CHECKS SEED (Tubarão + Costa Lacerda) ────────────────
  const complianceChecks = [
    // NR-01 — GRO
    { nr: 'NR-01', desc: 'Atualização da Matriz de Risco 5×5', freq: 'monthly' as const, evidence: true },
    { nr: 'NR-01', desc: 'Revisão do Plano de Ação GRO', freq: 'monthly' as const, evidence: true },
    // NR-11 — Transporte
    { nr: 'NR-11', desc: 'Checklist de equipamentos de transporte', freq: 'daily' as const, evidence: false },
    { nr: 'NR-11', desc: 'Inspeção de dispositivos de frenagem', freq: 'weekly' as const, evidence: true },
    // NR-12 — Máquinas
    { nr: 'NR-12', desc: 'Inventário de máquinas e manutenção', freq: 'monthly' as const, evidence: true },
    { nr: 'NR-12', desc: 'Verificação de proteções e dispositivos de segurança', freq: 'weekly' as const, evidence: false },
    // NR-13 — Caldeiras/Vasos de Pressão
    { nr: 'NR-13', desc: 'Inspeção de vasos de pressão', freq: 'annual' as const, evidence: true },
    // NR-35 — Trabalho em Altura
    { nr: 'NR-35', desc: 'Verificação de treinamentos NR-35 válidos', freq: 'monthly' as const, evidence: true },
    { nr: 'NR-35', desc: 'Inspeção de EPIs para trabalho em altura', freq: 'weekly' as const, evidence: false },
  ];

  const activeSites = ['TUB', 'CLR'];
  for (const siteCode of activeSites) {
    for (const check of complianceChecks) {
      const [existing] = await sequelize.query(
        `SELECT id FROM compliance_checks WHERE site_id = '${siteCode}' AND nr = '${check.nr}' AND description = '${check.desc.replace(/'/g, "''")}' LIMIT 1`
      ) as [Array<{ id: number }>, unknown];

      if (existing.length === 0) {
        // Randomize last_checked to create varied statuses
        const daysAgo = Math.floor(Math.random() * 45);
        const lastChecked = new Date(now.getTime() - daysAgo * 86400000);

        const freqDays: Record<string, number> = { daily: 1, weekly: 7, monthly: 30, annual: 365 };
        const nextDue = new Date(lastChecked.getTime() + freqDays[check.freq] * 86400000);
        const isOverdue = nextDue < now;

        await qi.bulkInsert('compliance_checks', [{
          uuid: crypto.randomUUID(),
          site_id: siteCode,
          nr: check.nr,
          description: check.desc,
          frequency: check.freq,
          last_checked: lastChecked,
          next_due: nextDue,
          status: isOverdue ? 'overdue' : 'compliant',
          responsible_matricula: siteCode === 'TUB' ? 'VFZ2001' : 'VCS2001',
          evidence_required: check.evidence,
          created_at: now,
          updated_at: now,
        }]);
      }
    }
  }

  console.log('[EFVM360-MIGRATE-017] Seed: compliance checks para TUB + CLR');

  // ── 3. TRAINING RECORDS SEED ────────────────────────────────────────────
  const trainings = [
    { type: 'NR-35 Trabalho em Altura', nr: 'NR-35', validYears: 2 },
    { type: 'NR-11 Transporte e Movimentação', nr: 'NR-11', validYears: 2 },
    { type: 'NR-12 Segurança em Máquinas', nr: 'NR-12', validYears: 2 },
    { type: 'Brigada de Incêndio', nr: 'NR-23', validYears: 1 },
    { type: 'CIPA — Prevenção de Acidentes', nr: 'NR-05', validYears: 1 },
  ];

  const usersBySite: Record<string, string[]> = {
    TUB: ['VFZ1001', 'VFZ1002', 'VFZ1003', 'VFZ2001', 'VFZ3001'],
    CLR: ['VCS1001', 'VCS1002', 'VCS1003', 'VCS2001', 'VCS3001'],
  };

  for (const [siteCode, users] of Object.entries(usersBySite)) {
    for (const user of users) {
      for (const training of trainings) {
        const [existing] = await sequelize.query(
          `SELECT id FROM training_records WHERE site_id = '${siteCode}' AND user_matricula = '${user}' AND training_type = '${training.type}' LIMIT 1`
        ) as [Array<{ id: number }>, unknown];

        if (existing.length === 0) {
          // Randomize: some trainings expired, some expiring soon, most valid
          const monthsAgo = Math.floor(Math.random() * (training.validYears * 12 + 6));
          const completedAt = new Date(now.getTime() - monthsAgo * 30 * 86400000);
          const expiresAt = new Date(completedAt.getTime() + training.validYears * 365 * 86400000);
          const daysUntilExpiry = (expiresAt.getTime() - now.getTime()) / 86400000;

          let status: 'valid' | 'expiring' | 'expired' = 'valid';
          if (daysUntilExpiry < 0) status = 'expired';
          else if (daysUntilExpiry < 30) status = 'expiring';

          await qi.bulkInsert('training_records', [{
            uuid: crypto.randomUUID(),
            site_id: siteCode,
            user_matricula: user,
            training_type: training.type,
            nr_reference: training.nr,
            completed_at: completedAt,
            expires_at: expiresAt,
            status,
            created_at: now,
            updated_at: now,
          }]);
        }
      }
    }
  }

  console.log('[EFVM360-MIGRATE-017] Seed: training records para TUB + CLR');

  // ── 4. ASSIGN EXISTING USERS TO SITES ──────────────────────────────────
  const userSiteAssignments = [
    // Tubarão users
    { matricula: 'VFZ1001', site: 'TUB', isDefault: true },
    { matricula: 'VFZ1002', site: 'TUB', isDefault: true },
    { matricula: 'VFZ1003', site: 'TUB', isDefault: true },
    { matricula: 'VFZ2001', site: 'TUB', isDefault: true },
    { matricula: 'VFZ3001', site: 'TUB', isDefault: true },
    // Costa Lacerda users
    { matricula: 'VCS1001', site: 'CLR', isDefault: true },
    { matricula: 'VCS1002', site: 'CLR', isDefault: true },
    { matricula: 'VCS1003', site: 'CLR', isDefault: true },
    { matricula: 'VCS2001', site: 'CLR', isDefault: true },
    { matricula: 'VCS3001', site: 'CLR', isDefault: true },
    // Admin has access to all sites
    { matricula: 'ADM9001', site: 'TUB', isDefault: true },
    { matricula: 'ADM9001', site: 'CLR', isDefault: false },
    { matricula: 'ADM9001', site: 'ITB', isDefault: false },
    { matricula: 'ADM9001', site: 'GVD', isDefault: false },
    { matricula: 'ADM9001', site: 'FBN', isDefault: false },
  ];

  for (const assignment of userSiteAssignments) {
    try {
      const [user] = await sequelize.query(
        `SELECT id FROM usuarios WHERE matricula = '${assignment.matricula}' LIMIT 1`
      ) as [Array<{ id: number }>, unknown];

      if (user.length > 0) {
        const [existing] = await sequelize.query(
          `SELECT id FROM user_sites WHERE user_id = ${user[0].id} AND site_code = '${assignment.site}' LIMIT 1`
        ) as [Array<{ id: number }>, unknown];

        if (existing.length === 0) {
          await qi.bulkInsert('user_sites', [{
            user_id: user[0].id,
            site_code: assignment.site,
            is_default: assignment.isDefault,
            created_at: now,
          }]);
        }
      }
    } catch {
      // User may not exist yet — skip
    }
  }

  console.log('[EFVM360-MIGRATE-017] Seed: user-site assignments');

  console.log('[EFVM360-MIGRATE-017] ══════════════════════════════════════════');
  console.log('[EFVM360-MIGRATE-017] MIGRACAO 017 COMPLETA — Seed multi-site');
  console.log('[EFVM360-MIGRATE-017] ══════════════════════════════════════════');
}
