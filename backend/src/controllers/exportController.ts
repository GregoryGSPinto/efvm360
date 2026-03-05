// ============================================================================
// VFZ Backend — Export Controller
// Data export endpoints: handovers, equipment, risk-matrix, KPIs
// Supports JSON and CSV formats
// ============================================================================

import { Request, Response } from 'express';
import sequelize from '../config/database';

// ── CSV Helpers ─────────────────────────────────────────────────────────────

function escapeCsvField(value: unknown): string {
  if (value === null || value === undefined) return '';
  const str = typeof value === 'object' ? JSON.stringify(value) : String(value);
  if (str.includes(',') || str.includes('"') || str.includes('\n')) {
    return `"${str.replace(/"/g, '""')}"`;
  }
  return str;
}

function toCsv(rows: Record<string, unknown>[]): string {
  if (rows.length === 0) return '';
  const headers = Object.keys(rows[0]);
  const lines = [
    headers.join(','),
    ...rows.map((row) => headers.map((h) => escapeCsvField(row[h])).join(',')),
  ];
  return lines.join('\n');
}

function sendExport(
  res: Response,
  data: Record<string, unknown>[],
  format: string,
  filename: string,
): void {
  if (format === 'csv') {
    res.setHeader('Content-Type', 'text/csv; charset=utf-8');
    res.setHeader('Content-Disposition', `attachment; filename="${filename}.csv"`);
    res.send(toCsv(data));
  } else {
    res.setHeader('Content-Disposition', `attachment; filename="${filename}.json"`);
    res.json({ data, total: data.length, exported_at: new Date().toISOString() });
  }
}

// ── Handovers Export ────────────────────────────────────────────────────────

export const handovers = async (req: Request, res: Response): Promise<void> => {
  try {
    const { from, to, format = 'json' } = req.query;
    let where = 'WHERE 1=1';
    const replacements: string[] = [];

    if (from) {
      where += ' AND p.data_passagem >= ?';
      replacements.push(from as string);
    }
    if (to) {
      where += ' AND p.data_passagem <= ?';
      replacements.push(to as string);
    }

    const [rows] = await sequelize.query(
      `SELECT
        p.uuid, p.data_passagem, p.turno, p.horario_turno, p.status,
        p.assinatura_sai_confirmado, p.assinatura_entra_confirmado,
        p.assinatura_sai_timestamp, p.assinatura_entra_timestamp,
        us.matricula AS operador_sai_matricula,
        ue.matricula AS operador_entra_matricula,
        p.created_at, p.updated_at
      FROM passagens p
      LEFT JOIN usuarios us ON p.operador_sai_id = us.id
      LEFT JOIN usuarios ue ON p.operador_entra_id = ue.id
      ${where}
      ORDER BY p.data_passagem DESC, p.created_at DESC
      LIMIT 5000`,
      { replacements },
    );

    sendExport(res, rows as Record<string, unknown>[], format as string, 'handovers');
  } catch (err: unknown) {
    console.error('[EXPORT] Handovers error:', err);
    res.status(500).json({ error: 'Erro ao exportar passagens' });
  }
};

// ── Equipment Export ────────────────────────────────────────────────────────

export const equipment = async (req: Request, res: Response): Promise<void> => {
  try {
    const { format = 'json' } = req.query;

    const [rows] = await sequelize.query(
      `SELECT uuid, name, category, criticality, min_quantity_per_shift,
              current_quantity, status, yard_code, created_at, updated_at
       FROM equipment
       ORDER BY category, name`,
    );

    sendExport(res, rows as Record<string, unknown>[], format as string, 'equipment');
  } catch (err: unknown) {
    console.error('[EXPORT] Equipment error:', err);
    res.status(500).json({ error: 'Erro ao exportar equipamentos' });
  }
};

// ── Risk Matrix Export ──────────────────────────────────────────────────────

export const riskMatrix = async (req: Request, res: Response): Promise<void> => {
  try {
    const { format = 'json' } = req.query;

    const [rows] = await sequelize.query(
      `SELECT uuid, description, probability, impact, grade, mitigation,
              nr_reference, active, created_at, updated_at
       FROM risk_grades
       ORDER BY probability * impact DESC`,
    );

    sendExport(res, rows as Record<string, unknown>[], format as string, 'risk-matrix');
  } catch (err: unknown) {
    console.error('[EXPORT] Risk matrix error:', err);
    res.status(500).json({ error: 'Erro ao exportar matriz de risco' });
  }
};

// ── KPIs Export ─────────────────────────────────────────────────────────────

export const kpis = async (req: Request, res: Response): Promise<void> => {
  try {
    const { period = '30', format = 'json' } = req.query;
    const daysBack = parseInt(period as string, 10) || 30;
    const since = new Date();
    since.setDate(since.getDate() - daysBack);
    const sinceISO = since.toISOString();

    // Total & signed handovers
    const [[totals]] = await sequelize.query(
      `SELECT
        COUNT(*) AS total_handovers,
        SUM(CASE WHEN status = 'assinado_completo' THEN 1 ELSE 0 END) AS signed_handovers
      FROM passagens WHERE created_at >= ?`,
      { replacements: [sinceISO] },
    ) as [Array<{ total_handovers: number; signed_handovers: number }>, unknown];

    // Handovers per shift
    const [perShift] = await sequelize.query(
      `SELECT turno, COUNT(*) AS total
       FROM passagens WHERE created_at >= ?
       GROUP BY turno ORDER BY turno`,
      { replacements: [sinceISO] },
    );

    // Handovers per day
    const [perDay] = await sequelize.query(
      `SELECT data_passagem, COUNT(*) AS total
       FROM passagens WHERE created_at >= ?
       GROUP BY data_passagem ORDER BY data_passagem DESC
       LIMIT 60`,
      { replacements: [sinceISO] },
    );

    // Equipment summary
    const [equipmentSummary] = await sequelize.query(
      `SELECT status, COUNT(*) AS total FROM equipment GROUP BY status`,
    );

    // Risk summary
    const [riskSummary] = await sequelize.query(
      `SELECT grade, COUNT(*) AS total FROM risk_grades WHERE active = true GROUP BY grade`,
    );

    // Login count
    const [[loginResult]] = await sequelize.query(
      `SELECT COUNT(*) AS total FROM audit_trail WHERE acao = 'LOGIN' AND created_at >= ?`,
      { replacements: [sinceISO] },
    ) as [Array<{ total: number }>, unknown];

    const totalHandovers = totals?.total_handovers || 0;
    const signedHandovers = totals?.signed_handovers || 0;
    const operationalScore = totalHandovers > 0
      ? Math.round((signedHandovers / totalHandovers) * 100)
      : 0;

    const kpiData = {
      period: daysBack,
      total_handovers: totalHandovers,
      signed_handovers: signedHandovers,
      operational_score: operationalScore,
      total_logins: loginResult?.total || 0,
      per_shift: perShift,
      per_day: perDay,
      equipment_summary: equipmentSummary,
      risk_summary: riskSummary,
    };

    if (format === 'csv') {
      // Flatten KPI data for CSV
      const flatRows = (perDay as Record<string, unknown>[]).map((day) => ({
        ...day,
        total_handovers: totalHandovers,
        signed_handovers: signedHandovers,
        operational_score: operationalScore,
      }));
      sendExport(res, flatRows, 'csv', 'kpis');
    } else {
      res.setHeader('Content-Disposition', 'attachment; filename="kpis.json"');
      res.json({ data: kpiData, exported_at: new Date().toISOString() });
    }
  } catch (err: unknown) {
    console.error('[EXPORT] KPIs error:', err);
    res.status(500).json({ error: 'Erro ao exportar KPIs' });
  }
};
