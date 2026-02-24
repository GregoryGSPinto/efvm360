// EFVM Pátio 360 — CQRS Projection Layer
export { EventProjector, getProjector, initializeProjections } from './EventProjector';
export type {
  DailyYardSummary,
  ShiftRiskScore,
  WeighingTrend,
  AnomalyHeatmap,
  InspectionCompliance,
} from './EventProjector';
