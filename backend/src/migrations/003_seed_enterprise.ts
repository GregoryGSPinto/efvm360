// ============================================================================
// EFVM PÁTIO 360 — Seed Enterprise
// Migration 003: Seed dos 5 pátios Fase 1 com regras operacionais completas
// Fonte: PRO-004985, PRO-040960, PGS-005376, PGS-005023
// ============================================================================

export const SEED_YARD_CONFIGURATIONS = [
  // ═══════════════════════════════════════════════════════════════════
  // 1. FAZENDÃO (FZ) — Pera Ferroviária
  // PRO-004985 Anexo 5
  // ═══════════════════════════════════════════════════════════════════
  {
    yard_code: 'FZ',
    yard_name: 'Pera do Fazendão',
    yard_type: 'pera',
    railway: 'EFVM',
    normative_ref: 'PRO-004985 Anexo 5',
    config: {
      speedRules: {
        vmaTerminal: 10,   // Puxando na pera
        vmaRecuo: 5,       // Recuo padrão
        vmaEngate: 1,      // Engate todas peras
        vmaPesagem: null,   // Sem balança
        vmaAspersor: null,  // Sem aspersor
      },
      weighingRules: {
        enabled: false,
        maxGrossWeight: 110,
        dynamicScale: false,
        scaleOwner: 'N/A',
        stopOnScaleProhibited: false,
      },
      aspirationRules: {
        enabled: false,
        mandatoryFor: [],
      },
      lineCleaningStandard: {
        lateralClearance: '1m',
        interTrackClearance: '4cm abaixo do boleto',
        maxAccumulation: '9cm',
      },
      tracks: [
        { id: 'LTE-01', name: 'Linha Tronco Entrada', type: 'principal' },
        { id: 'LP-01', name: 'Linha da Pera', type: 'pera' },
        { id: 'LTS-01', name: 'Linha Tronco Saída', type: 'principal' },
      ],
      switches: [
        { id: 'AMV-01', name: 'AMV Entrada Pera', type: 'conjugada', position: 'entrada' },
        { id: 'AMV-02', name: 'AMV Saída Pera', type: 'conjugada', position: 'saida' },
      ],
      equipment: [
        { id: 'GDE-01', type: 'locomotiva', model: 'GDE', status: 'ativo' },
        { id: 'GDE-02', type: 'locomotiva', model: 'GDE', status: 'ativo' },
      ],
      parkingConfig: [
        { lineId: 'LOTE-258', name: 'Lote 258', capacity: 110, hasWedge: true },
      ],
      restrictions: [
        'AMVs conjugadas — operar conforme PRO-004985',
        'Vagões intercalados somente em reta, proibido curva e recuo',
        'Calço obrigatório em rampa (amarelo, lingueta)',
        'Rampa >2%: 2 calços mesmo rodeiro',
      ],
      authorizations: [],
      operationalNotes: 'Pera com 2 lotes GDE + lote 258. AMVs conjugadas entrada/saída.',
    },
    version: 1,
    valid_from: '2025-01-01',
    valid_until: null,
  },

  // ═══════════════════════════════════════════════════════════════════
  // 2. TIMBOPEBA (TO) — Pera com Balança Dinâmica
  // PRO-004985 Anexo 8
  // ═══════════════════════════════════════════════════════════════════
  {
    yard_code: 'TO',
    yard_name: 'Pera de Timbopeba',
    yard_type: 'pera',
    railway: 'EFVM',
    normative_ref: 'PRO-004985 Anexo 8',
    config: {
      speedRules: {
        vmaTerminal: 10,
        vmaRecuo: 5,
        vmaEngate: 1,
        vmaPesagem: 5,       // 5 km/h sem parar sobre balança
        vmaAspersor: null,
      },
      weighingRules: {
        enabled: true,
        maxGrossWeight: 110,
        dynamicScale: true,
        scaleOwner: 'Vale',
        stopOnScaleProhibited: true,
      },
      aspirationRules: {
        enabled: false,
        mandatoryFor: [],
      },
      lineCleaningStandard: {
        lateralClearance: '1m',
        interTrackClearance: '4cm abaixo do boleto',
        maxAccumulation: '9cm',
      },
      tracks: [
        { id: 'LTE-01', name: 'Linha Tronco Entrada', type: 'principal' },
        { id: 'LP-01', name: 'Linha da Pera', type: 'pera' },
        { id: 'LB-01', name: 'Linha da Balança', type: 'pesagem' },
        { id: 'LTS-01', name: 'Linha Tronco Saída', type: 'principal' },
      ],
      switches: [
        { id: 'AMV-01', name: 'AMV Entrada', type: 'simples', position: 'entrada' },
        { id: 'AMV-02', name: 'AMV Balança', type: 'simples', position: 'balanca' },
        { id: 'AMV-03', name: 'AMV Saída', type: 'simples', position: 'saida' },
      ],
      equipment: [
        { id: 'GDE-01', type: 'locomotiva', model: 'GDE', status: 'ativo' },
      ],
      parkingConfig: [],
      restrictions: [
        'Não parar sobre a balança (PRO-040960)',
        'Excesso >110t: recuar, aliviar, repesar',
        'Registrar vagão mais pesado e mais leve',
        'Calço obrigatório em rampa',
      ],
      authorizations: [],
      operationalNotes: 'Pera com balança dinâmica Vale. Pesagem obrigatória a 5 km/h contínuo.',
    },
    version: 1,
    valid_from: '2025-01-01',
    valid_until: null,
  },

  // ═══════════════════════════════════════════════════════════════════
  // 3. BRUCUTU (BR) — Pera com 3 lotes GDE
  // PRO-004985 Anexo 7
  // ═══════════════════════════════════════════════════════════════════
  {
    yard_code: 'BR',
    yard_name: 'Pera de Brucutu',
    yard_type: 'pera',
    railway: 'EFVM',
    normative_ref: 'PRO-004985 Anexo 7',
    config: {
      speedRules: {
        vmaTerminal: 10,
        vmaRecuo: 5,
        vmaEngate: 1,
        vmaPesagem: null,
        vmaAspersor: null,
      },
      weighingRules: {
        enabled: false,
        maxGrossWeight: 110,
        dynamicScale: false,
        scaleOwner: 'N/A',
        stopOnScaleProhibited: false,
      },
      aspirationRules: {
        enabled: false,
        mandatoryFor: [],
      },
      lineCleaningStandard: {
        lateralClearance: '1m',
        interTrackClearance: '4cm abaixo do boleto',
        maxAccumulation: '9cm',
      },
      tracks: [
        { id: 'LTE-01', name: 'Linha Tronco Entrada', type: 'principal' },
        { id: 'LP-01', name: 'Linha da Pera', type: 'pera' },
        { id: 'LTS-01', name: 'Linha Tronco Saída', type: 'principal' },
      ],
      switches: [
        { id: 'AMV-01', name: 'AMV Entrada', type: 'simples', position: 'entrada' },
        { id: 'AMV-02', name: 'AMV Saída', type: 'simples', position: 'saida' },
      ],
      equipment: [
        { id: 'GDE-01', type: 'locomotiva', model: 'GDE', status: 'ativo' },
        { id: 'GDE-02', type: 'locomotiva', model: 'GDE', status: 'ativo' },
        { id: 'GDE-03', type: 'locomotiva', model: 'GDE', status: 'ativo' },
      ],
      parkingConfig: [],
      restrictions: [
        'Vagões intercalados somente em reta',
        'Calço obrigatório em rampa',
      ],
      authorizations: [],
      operationalNotes: 'Pera com 3 lotes GDE. Operação padrão PRO-004985.',
    },
    version: 1,
    valid_from: '2025-01-01',
    valid_until: null,
  },

  // ═══════════════════════════════════════════════════════════════════
  // 4. COSTA LACERDA (CS) — Pátio de Manobra
  // PRO-004985 Anexo 12
  // ═══════════════════════════════════════════════════════════════════
  {
    yard_code: 'CS',
    yard_name: 'Pátio de Costa Lacerda',
    yard_type: 'patio',
    railway: 'EFVM',
    normative_ref: 'PRO-004985 Anexo 12',
    config: {
      speedRules: {
        vmaTerminal: 10,
        vmaRecuo: 5,
        vmaEngate: 1,
        vmaPesagem: null,
        vmaAspersor: null,
      },
      weighingRules: {
        enabled: false,
        maxGrossWeight: 110,
        dynamicScale: false,
        scaleOwner: 'N/A',
        stopOnScaleProhibited: false,
      },
      aspirationRules: {
        enabled: false,
        mandatoryFor: [],
      },
      lineCleaningStandard: {
        lateralClearance: '1m',
        interTrackClearance: '4cm abaixo do boleto',
        maxAccumulation: '9cm',
      },
      tracks: [
        { id: 'L1', name: 'Linha 1 — Principal', type: 'principal' },
        { id: 'L2', name: 'Linha 2 — Manobra', type: 'manobra' },
        { id: 'L3', name: 'Linha 3 — Estacionamento', type: 'estacionamento' },
      ],
      switches: [
        { id: 'AMV-01', name: 'AMV Principal', type: 'simples', position: 'entrada' },
        { id: 'AMV-02', name: 'AMV Manobra', type: 'simples', position: 'manobra' },
      ],
      equipment: [],
      parkingConfig: [
        { lineId: 'L3', name: 'Estacionamento CS', capacity: 80, hasWedge: true },
      ],
      restrictions: [
        'Calço obrigatório em rampa (amarelo, lingueta)',
        'Inflamáveis: calço de madeira (não metálico)',
      ],
      authorizations: [],
      operationalNotes: 'Pátio de manobra Costa Lacerda. Operação conforme PRO-004985 Anexo 12.',
    },
    version: 1,
    valid_from: '2025-01-01',
    valid_until: null,
  },

  // ═══════════════════════════════════════════════════════════════════
  // 5. PÁTIO 6 — MEIA (P6) — Terminal MR Mineração
  // PRO-040960 (Terminal Pátio 6)
  // ═══════════════════════════════════════════════════════════════════
  {
    yard_code: 'P6',
    yard_name: 'Terminal Pátio 6 — Meia',
    yard_type: 'terminal',
    railway: 'EFVM',
    normative_ref: 'PRO-040960',
    config: {
      speedRules: {
        vmaTerminal: 5,       // Terminal: 5 km/h
        vmaRecuo: 5,
        vmaEngate: 1,
        vmaPesagem: 5,         // 5 km/h sem parar
        vmaAspersor: 1,        // 1 km/h posicionar primeiro vagão
      },
      weighingRules: {
        enabled: true,
        maxGrossWeight: 110,    // Balança 110t
        dynamicScale: true,
        scaleOwner: 'MR Mineração',
        stopOnScaleProhibited: true,
      },
      aspirationRules: {
        enabled: true,
        mandatoryFor: ['granulado_finos', 'finos', 'superfinos'],
        anomalyForm: 'ValeForms OP3',
      },
      lineCleaningStandard: {
        lateralClearance: '1m',
        interTrackClearance: '4cm abaixo do boleto',
        maxAccumulation: '9cm',
      },
      tracks: [
        { id: 'LT-01', name: 'Linha Tronco', type: 'principal' },
        { id: 'LC-01', name: 'Linha Carregamento', type: 'carregamento' },
        { id: 'LB-01', name: 'Linha Balança', type: 'pesagem' },
        { id: 'LA-01', name: 'Linha Aspersão', type: 'aspersao' },
        { id: 'LR-01', name: 'Rabicho 340m', type: 'rabicho' },
      ],
      switches: [
        { id: 'AMV-01', name: 'AMV Entrada Terminal', type: 'simples', position: 'entrada' },
        { id: 'AMV-02', name: 'AMV Carregamento', type: 'simples', position: 'carregamento' },
        { id: 'AMV-03', name: 'AMV Balança', type: 'simples', position: 'balanca' },
        { id: 'AMV-04', name: 'AMV Aspersão', type: 'simples', position: 'aspersao' },
      ],
      equipment: [
        { id: 'GDE-01', type: 'locomotiva', model: 'GDE', status: 'ativo' },
        { id: 'GDE-02', type: 'locomotiva', model: 'GDE', status: 'ativo' },
        // ... até 30 GDEs + 2 DASH conforme PRO-040960
        { id: 'DASH-01', type: 'locomotiva', model: 'DASH', status: 'ativo' },
        { id: 'DASH-02', type: 'locomotiva', model: 'DASH', status: 'ativo' },
      ],
      parkingConfig: [],
      restrictions: [
        'Acesso SOMENTE com autorização MR Mineração (PRO-040960)',
        'Não parar sobre a balança',
        'Excesso >110t: recuar, aliviar carga, repesar',
        'Aspersão obrigatória: granulado+finos, finos, superfinos',
        'Anomalia aspersão: parar, informar MR, registrar ValeForms OP3',
        'Certificar aspersão na saída',
        'Rabicho máximo 340m',
        'VMA terminal 5 km/h',
        'VMA aspersor 1 km/h para posicionar primeiro vagão',
        'Carregamento, pesagem, aspersão, limpeza: responsabilidade MR',
      ],
      authorizations: [
        {
          type: 'MR_AUTHORIZATION',
          description: 'Autorização MR Mineração obrigatória para acesso',
          requiredFor: ['carregamento', 'pesagem', 'aspersao', 'limpeza'],
          authority: 'MR Mineração',
          normativeRef: 'PRO-040960',
        },
      ],
      operationalNotes: 'Terminal MR com balança 110t, aspersor, rabicho 340m. 30 GDEs + 2 DASH. Acesso controlado por MR.',
    },
    version: 1,
    valid_from: '2025-01-01',
    valid_until: null,
  },
];

// ── SQL de Seed ─────────────────────────────────────────────────────────

export function generateSeedSQL(): string {
  const statements: string[] = [];

  statements.push('-- ============================================================');
  statements.push('-- EFVM PÁTIO 360 — Seed Pátios Fase 1 (5 pátios)');
  statements.push('-- FZ, TO, BR, CS, P6');
  statements.push('-- ============================================================');
  statements.push('');

  for (const yard of SEED_YARD_CONFIGURATIONS) {
    const configJson = JSON.stringify(yard.config).replace(/'/g, "''");
    statements.push(`INSERT INTO yard_configurations (yard_id, yard_code, yard_name, yard_type, railway, normative_ref, config, version, valid_from, valid_until, updated_by)`);
    statements.push(`VALUES (gen_random_uuid(), '${yard.yard_code}', '${yard.yard_name}', '${yard.yard_type}', '${yard.railway}', '${yard.normative_ref}', '${configJson}'::jsonb, ${yard.version}, '${yard.valid_from}', ${yard.valid_until ? `'${yard.valid_until}'` : 'NULL'}, 'SEED_MIGRATION');`);
    statements.push('');
  }

  return statements.join('\n');
}

// ── Seed para IndexedDB (offline boot) ──────────────────────────────────

export function getSeedForOffline() {
  return SEED_YARD_CONFIGURATIONS.map(yard => ({
    yardCode: yard.yard_code,
    yardName: yard.yard_name,
    yardType: yard.yard_type,
    railway: yard.railway,
    normativeRef: yard.normative_ref,
    ...yard.config,
    version: yard.version,
    validFrom: yard.valid_from,
  }));
}
