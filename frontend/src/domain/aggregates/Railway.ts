// ============================================================================
// EFVM360 — Domain Aggregate: Railway (Multi-Tenancy)
// ============================================================================

export interface RailwayBranding {
  primaryColor: string;
  secondaryColor: string;
  logoUrl: string | null;
}

export interface Railway {
  id: string;
  name: string;
  region: string | null;
  branding: RailwayBranding;
}

// ── Known Railways ──────────────────────────────────────────────────────

export const RAILWAYS: Railway[] = [
  {
    id: 'EFVM',
    name: 'Estrada de Ferro Vitória-Minas',
    region: 'ES/MG',
    branding: { primaryColor: '#007e7a', secondaryColor: '#d4a017', logoUrl: null },
  },
  {
    id: 'EFC',
    name: 'Estrada de Ferro Carajás',
    region: 'MA/PA',
    branding: { primaryColor: '#1a5276', secondaryColor: '#f39c12', logoUrl: null },
  },
  {
    id: 'FCA',
    name: 'Ferrovia Centro-Atlântica',
    region: 'MG/GO/BA',
    branding: { primaryColor: '#2e86c1', secondaryColor: '#e74c3c', logoUrl: null },
  },
];

// ── Queries ─────────────────────────────────────────────────────────────

export function getRailwayById(id: string): Railway | undefined {
  return RAILWAYS.find(r => r.id === id);
}

export function getRailwayBranding(id: string): RailwayBranding {
  const railway = getRailwayById(id);
  return railway?.branding || RAILWAYS[0].branding;
}

export function getAllRailways(): Railway[] {
  return RAILWAYS;
}

export function isValidRailway(id: string): boolean {
  return RAILWAYS.some(r => r.id === id);
}
