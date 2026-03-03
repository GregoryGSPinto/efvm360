// ============================================================================
// EFVM360 Backend — Analytics Controller
// Prompt 3.1: Dashboard endpoints per hierarchy level
// ============================================================================

import { Request, Response } from 'express';
import { DailyHandoverStats, OperatorPerformance, YardCompliance } from '../models/AnalyticsModels';
import { Op } from 'sequelize';

// ── Helper: get date N days ago ─────────────────────────────────────────

function daysAgo(n: number): string {
  const d = new Date();
  d.setDate(d.getDate() - n);
  return d.toISOString().split('T')[0];
}

// ── Refresh (recalculate materialized views) ────────────────────────────

export const refresh = async (req: Request, res: Response): Promise<void> => {
  if (!req.user) { res.status(401).json({ error: 'Não autenticado' }); return; }

  // In a real app, this would aggregate from passagens, inter_yard_handovers, etc.
  // For demo, we seed/refresh with realistic data.
  const yards = ['VFZ', 'VBR', 'VCS', 'P6', 'VTO'];
  const today = new Date();

  // Seed 90 days of daily stats for each yard
  for (const yard of yards) {
    for (let i = 0; i < 90; i++) {
      const date = new Date(today);
      date.setDate(date.getDate() - i);
      const dateStr = date.toISOString().split('T')[0];

      const compliance = 75 + Math.random() * 23; // 75-98%
      const fiveS = 3.2 + Math.random() * 1.6;    // 3.2-4.8
      const handovers = 5 + Math.floor(Math.random() * 11); // 5-15
      const anomalies = Math.floor(Math.random() * 4);       // 0-3

      await DailyHandoverStats.findOrCreate({
        where: { stat_date: dateStr, yard_code: yard },
        defaults: {
          stat_date: dateStr,
          yard_code: yard,
          total_handovers: handovers,
          avg_duration_minutes: 15 + Math.random() * 30,
          compliance_rate: parseFloat(compliance.toFixed(2)),
          five_s_avg_score: parseFloat(fiveS.toFixed(2)),
          anomalies_count: anomalies,
          inter_yard_count: Math.floor(Math.random() * 3),
        },
      });
    }

    // Yard compliance summary
    await YardCompliance.findOrCreate({
      where: { yard_code: yard },
      defaults: {
        yard_code: yard,
        compliance_30d: parseFloat((80 + Math.random() * 18).toFixed(2)),
        trend: ['improving', 'stable', 'declining'][Math.floor(Math.random() * 3)],
        handovers_30d: 150 + Math.floor(Math.random() * 200),
        anomalies_30d: Math.floor(Math.random() * 15),
        avg_resolution_hours: parseFloat((1 + Math.random() * 10).toFixed(2)),
        last_incident_date: Math.random() > 0.5 ? daysAgo(Math.floor(Math.random() * 30)) : null,
      },
    });
  }

  res.json({ message: 'Analytics refreshed', timestamp: new Date().toISOString() });
};

// ── Dashboard: Supervisor (single yard) ─────────────────────────────────

export const dashboardSupervisor = async (req: Request, res: Response): Promise<void> => {
  if (!req.user) { res.status(401).json({ error: 'Não autenticado' }); return; }

  const yard = (req.query.yard as string) || req.user.primaryYard || 'VFZ';
  const today = new Date().toISOString().split('T')[0];
  const thirtyDaysAgo = daysAgo(30);

  const todayStats = await DailyHandoverStats.findOne({
    where: { stat_date: today, yard_code: yard },
  });

  const last30 = await DailyHandoverStats.findAll({
    where: {
      yard_code: yard,
      stat_date: { [Op.gte]: thirtyDaysAgo },
    },
    order: [['stat_date', 'ASC']],
  });

  const yardCompliance = await YardCompliance.findOne({
    where: { yard_code: yard },
  });

  res.json({
    yard,
    today: todayStats ? {
      totalHandovers: todayStats.total_handovers,
      complianceRate: todayStats.compliance_rate,
      fiveSAvgScore: todayStats.five_s_avg_score,
      anomaliesCount: todayStats.anomalies_count,
    } : null,
    complianceTrend: last30.map(s => ({
      date: s.stat_date,
      compliance: s.compliance_rate,
      handovers: s.total_handovers,
      anomalies: s.anomalies_count,
    })),
    yardSummary: yardCompliance ? {
      compliance30d: yardCompliance.compliance_30d,
      trend: yardCompliance.trend,
      handovers30d: yardCompliance.handovers_30d,
      anomalies30d: yardCompliance.anomalies_30d,
    } : null,
  });
};

// ── Dashboard: Coordenador (multiple yards) ─────────────────────────────

export const dashboardCoordenador = async (req: Request, res: Response): Promise<void> => {
  if (!req.user) { res.status(401).json({ error: 'Não autenticado' }); return; }

  const yardsParam = req.query.yards as string;
  const yards = yardsParam ? yardsParam.split(',') : ['VFZ', 'VBR', 'VCS', 'P6', 'VTO'];

  const yardCompliance = await YardCompliance.findAll({
    where: { yard_code: { [Op.in]: yards } },
  });

  const today = new Date().toISOString().split('T')[0];
  const todayStats = await DailyHandoverStats.findAll({
    where: { stat_date: today, yard_code: { [Op.in]: yards } },
  });

  const thirtyDaysAgo = daysAgo(30);
  const operators = await OperatorPerformance.findAll({
    where: {
      yard_code: { [Op.in]: yards },
      period_month: { [Op.gte]: thirtyDaysAgo },
    },
    order: [['anomalies_reported', 'DESC']],
    limit: 20,
  });

  res.json({
    yards,
    comparison: yardCompliance.map(yc => ({
      yard: yc.yard_code,
      compliance: yc.compliance_30d,
      trend: yc.trend,
      handovers: yc.handovers_30d,
      anomalies: yc.anomalies_30d,
      avgResolutionHours: yc.avg_resolution_hours,
    })),
    todayByYard: todayStats.map(s => ({
      yard: s.yard_code,
      handovers: s.total_handovers,
      compliance: s.compliance_rate,
      fiveS: s.five_s_avg_score,
      anomalies: s.anomalies_count,
    })),
    topOperators: operators.map(op => ({
      matricula: op.matricula,
      yard: op.yard_code,
      handovers: op.handovers_completed,
      fiveS: op.avg_five_s_score,
      anomalies: op.anomalies_reported,
    })),
  });
};

// ── Dashboard: Gerente (all yards, consolidated) ────────────────────────

export const dashboardGerente = async (req: Request, res: Response): Promise<void> => {
  if (!req.user) { res.status(401).json({ error: 'Não autenticado' }); return; }

  const allYards = await YardCompliance.findAll({
    order: [['compliance_30d', 'DESC']],
  });

  const thirtyDaysAgo = daysAgo(30);
  const sixtyDaysAgo = daysAgo(60);
  const ninetyDaysAgo = daysAgo(90);

  const [last30, prev30, prev60] = await Promise.all([
    DailyHandoverStats.findAll({ where: { stat_date: { [Op.gte]: thirtyDaysAgo } } }),
    DailyHandoverStats.findAll({ where: { stat_date: { [Op.gte]: sixtyDaysAgo, [Op.lt]: thirtyDaysAgo } } }),
    DailyHandoverStats.findAll({ where: { stat_date: { [Op.gte]: ninetyDaysAgo, [Op.lt]: sixtyDaysAgo } } }),
  ]);

  const avgCompliance = (stats: DailyHandoverStats[]) =>
    stats.length > 0 ? stats.reduce((sum, s) => sum + Number(s.compliance_rate), 0) / stats.length : 0;

  const TARGET_COMPLIANCE = 90;

  res.json({
    consolidated: {
      totalYards: allYards.length,
      avgCompliance30d: parseFloat(avgCompliance(last30).toFixed(2)),
      totalHandovers30d: last30.reduce((sum, s) => sum + s.total_handovers, 0),
      totalAnomalies30d: last30.reduce((sum, s) => sum + s.anomalies_count, 0),
    },
    yardRanking: allYards.map(yc => ({
      yard: yc.yard_code,
      compliance: yc.compliance_30d,
      trend: yc.trend,
      handovers: yc.handovers_30d,
      anomalies: yc.anomalies_30d,
      belowTarget: Number(yc.compliance_30d) < TARGET_COMPLIANCE,
    })),
    monthlyTrend: [
      { period: '3 meses atras', compliance: parseFloat(avgCompliance(prev60).toFixed(2)) },
      { period: '2 meses atras', compliance: parseFloat(avgCompliance(prev30).toFixed(2)) },
      { period: 'Ultimos 30d', compliance: parseFloat(avgCompliance(last30).toFixed(2)) },
    ],
    slaAlerts: allYards
      .filter(yc => Number(yc.compliance_30d) < TARGET_COMPLIANCE)
      .map(yc => ({
        yard: yc.yard_code,
        compliance: yc.compliance_30d,
        gap: parseFloat((TARGET_COMPLIANCE - Number(yc.compliance_30d)).toFixed(2)),
      })),
  });
};

// ── Trends ──────────────────────────────────────────────────────────────

export const trends = async (req: Request, res: Response): Promise<void> => {
  if (!req.user) { res.status(401).json({ error: 'Não autenticado' }); return; }

  const yard = req.query.yard as string;
  const periodDays = req.query.period === '90d' ? 90 : req.query.period === '7d' ? 7 : 30;
  const since = daysAgo(periodDays);

  const where: Record<string, unknown> = { stat_date: { [Op.gte]: since } };
  if (yard) where.yard_code = yard;

  const stats = await DailyHandoverStats.findAll({
    where,
    order: [['stat_date', 'ASC']],
  });

  res.json({
    period: `${periodDays}d`,
    yard: yard || 'all',
    data: stats.map(s => ({
      date: s.stat_date,
      yard: s.yard_code,
      compliance: s.compliance_rate,
      handovers: s.total_handovers,
      fiveS: s.five_s_avg_score,
      anomalies: s.anomalies_count,
    })),
  });
};

// ── Operators Performance ───────────────────────────────────────────────

export const operators = async (req: Request, res: Response): Promise<void> => {
  if (!req.user) { res.status(401).json({ error: 'Não autenticado' }); return; }

  const yard = req.query.yard as string;
  const where: Record<string, unknown> = {};
  if (yard) where.yard_code = yard;

  const ops = await OperatorPerformance.findAll({
    where,
    order: [['handovers_completed', 'DESC']],
    limit: 50,
  });

  res.json({
    operators: ops.map(op => ({
      matricula: op.matricula,
      yard: op.yard_code,
      period: op.period_month,
      handovers: op.handovers_completed,
      fiveS: op.avg_five_s_score,
      anomalies: op.anomalies_reported,
      escalations: op.escalations_received,
      avgMinutes: op.avg_handover_minutes,
    })),
  });
};
