// ============================================================================
// VFZ Backend — BI Controller (Dashboard KPIs)
// ============================================================================

import { Request, Response } from 'express';
// Models used via raw SQL queries to avoid TS attribute type issues
import sequelize from '../config/database';

export const kpis = async (req: Request, res: Response): Promise<void> => {
  try {
    const { periodo = '30' } = req.query;
    const diasAtras = parseInt(periodo as string, 10) || 30;
    const dataInicio = new Date();
    dataInicio.setDate(dataInicio.getDate() - diasAtras);
    const dataInicioISO = dataInicio.toISOString();

    // Use raw queries to avoid TS attribute issues with created_at
    const [[totalResult]] = await sequelize.query(
      'SELECT COUNT(*) as total FROM passagens WHERE created_at >= :dataInicio',
      { replacements: { dataInicio: dataInicioISO } }
    ) as [Array<{ total: number }>, unknown];
    const totalPassagens = totalResult?.total || 0;

    const [[assinadasResult]] = await sequelize.query(
      "SELECT COUNT(*) as total FROM passagens WHERE created_at >= :dataInicio AND status = 'assinado_completo'",
      { replacements: { dataInicio: dataInicioISO } }
    ) as [Array<{ total: number }>, unknown];
    const passagensAssinadas = assinadasResult?.total || 0;

    // Passagens por turno
    const [porTurno] = await sequelize.query(`
      SELECT turno, COUNT(*) as total
      FROM passagens
      WHERE created_at >= :dataInicio
      GROUP BY turno ORDER BY turno
    `, { replacements: { dataInicio: dataInicioISO } }) as [Array<{ turno: string; total: number }>, unknown];

    // Passagens por dia (últimos N dias)
    const [porDia] = await sequelize.query(`
      SELECT data_passagem, COUNT(*) as total
      FROM passagens
      WHERE created_at >= :dataInicio
      GROUP BY data_passagem ORDER BY data_passagem DESC
      LIMIT 30
    `, { replacements: { dataInicio: dataInicioISO } }) as [Array<{ data_passagem: string; total: number }>, unknown];

    // Score operacional (% assinadas completas)
    const scoreOperacional = totalPassagens > 0
      ? Math.round((passagensAssinadas / totalPassagens) * 100)
      : 0;

    // Logins no período
    const [[loginsResult]] = await sequelize.query(
      "SELECT COUNT(*) as total FROM audit_trail WHERE acao = 'LOGIN' AND created_at >= :dataInicio",
      { replacements: { dataInicio: dataInicioISO } }
    ) as [Array<{ total: number }>, unknown];
    const totalLogins = loginsResult?.total || 0;

    res.json({
      periodo: diasAtras,
      totalPassagens,
      passagensAssinadas,
      scoreOperacional,
      totalLogins,
      porTurno,
      porDia,
    });
  } catch (error) {
    console.error('[BI] Erro KPIs:', error);
    res.status(500).json({ error: 'Erro ao calcular KPIs' });
  }
};

export const resumoYard = async (req: Request, res: Response): Promise<void> => {
  try {
    const [resumo] = await sequelize.query(`
      SELECT
        yard_id,
        COUNT(*) as total_passagens,
        SUM(CASE WHEN status = 'assinado_completo' THEN 1 ELSE 0 END) as assinadas,
        MAX(created_at) as ultima_passagem
      FROM passagens
      WHERE yard_id IS NOT NULL
      GROUP BY yard_id
    `) as [Array<Record<string, unknown>>, unknown];

    res.json({ resumo });
  } catch (error) {
    console.error('[BI] Erro resumo yard:', error);
    res.status(500).json({ error: 'Erro ao gerar resumo' });
  }
};
