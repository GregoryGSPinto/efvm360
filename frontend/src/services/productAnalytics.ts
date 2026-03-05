// ============================================================================
// EFVM360 — Product Analytics Service
// Privacy-friendly event tracking for product usage insights
// ============================================================================

export interface AnalyticsEvent {
  name: string;
  properties: Record<string, string | number | boolean>;
  timestamp: string;
  sessionId: string;
  userId?: string;
}

const SESSION_KEY = 'efvm360-analytics-session';
const EVENTS_KEY = 'efvm360-analytics-events';
const MAX_STORED_EVENTS = 500;

function getSessionId(): string {
  let sessionId = sessionStorage.getItem(SESSION_KEY);
  if (!sessionId) {
    sessionId = `s_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;
    sessionStorage.setItem(SESSION_KEY, sessionId);
  }
  return sessionId;
}

function getStoredEvents(): AnalyticsEvent[] {
  try {
    const raw = localStorage.getItem(EVENTS_KEY);
    return raw ? JSON.parse(raw) : [];
  } catch {
    return [];
  }
}

function persistEvents(events: AnalyticsEvent[]): void {
  const trimmed = events.slice(-MAX_STORED_EVENTS);
  localStorage.setItem(EVENTS_KEY, JSON.stringify(trimmed));
}

/** Track a product analytics event */
export function trackEvent(
  name: string,
  properties: Record<string, string | number | boolean> = {},
  userId?: string,
): void {
  const event: AnalyticsEvent = {
    name,
    properties,
    timestamp: new Date().toISOString(),
    sessionId: getSessionId(),
    userId,
  };

  const events = getStoredEvents();
  events.push(event);
  persistEvents(events);
}

// ── Pre-defined event helpers ─────────────────────────────────────────────

export function trackHandoverCreated(sectionsFilled: number, timeToComplete: number): void {
  trackEvent('handover.created', { sections_filled: sectionsFilled, time_to_complete_ms: timeToComplete });
}

export function trackHandoverSigned(timeToSign: number, role: string): void {
  trackEvent('handover.signed', { time_to_sign_ms: timeToSign, role });
}

export function trackYardLayoutUpdated(changesCount: number): void {
  trackEvent('yard.layout.updated', { changes_count: changesCount });
}

export function trackRiskGradeCreated(severity: string, nrReference: string): void {
  trackEvent('risk.grade.created', { severity, nr_reference: nrReference });
}

export function trackAdamBotQuery(queryType: string, responseTime: number): void {
  trackEvent('adambot.query', { query_type: queryType, response_time_ms: responseTime });
}

export function trackSyncCompleted(recordsSynced: number, duration: number): void {
  trackEvent('sync.completed', { records_synced: recordsSynced, duration_ms: duration });
}

export function trackUserLogin(method: string, device: string): void {
  trackEvent('user.login', { method, device });
}

export function trackPageViewed(pageName: string): void {
  trackEvent('page.viewed', { page_name: pageName });
}

// ── Analytics aggregation (for admin dashboard) ───────────────────────────

export interface EventCount {
  name: string;
  count: number;
}

export function getEventCounts(): EventCount[] {
  const events = getStoredEvents();
  const counts = new Map<string, number>();
  for (const e of events) {
    counts.set(e.name, (counts.get(e.name) || 0) + 1);
  }
  return Array.from(counts.entries())
    .map(([name, count]) => ({ name, count }))
    .sort((a, b) => b.count - a.count);
}

export function getEventsByName(name: string): AnalyticsEvent[] {
  return getStoredEvents().filter(e => e.name === name);
}

export function getUniqueUsers(): number {
  const events = getStoredEvents();
  const users = new Set(events.map(e => e.userId).filter(Boolean));
  return users.size;
}

export function getEventsInRange(startDate: Date, endDate: Date): AnalyticsEvent[] {
  const events = getStoredEvents();
  return events.filter(e => {
    const t = new Date(e.timestamp);
    return t >= startDate && t <= endDate;
  });
}

export function getDailyEventCounts(days: number = 30): { date: string; count: number }[] {
  const now = new Date();
  const result: { date: string; count: number }[] = [];
  const events = getStoredEvents();

  for (let i = days - 1; i >= 0; i--) {
    const d = new Date(now);
    d.setDate(d.getDate() - i);
    const dateStr = d.toISOString().split('T')[0];
    const count = events.filter(e => e.timestamp.startsWith(dateStr)).length;
    result.push({ date: dateStr, count });
  }
  return result;
}

export function clearAnalytics(): void {
  localStorage.removeItem(EVENTS_KEY);
}
