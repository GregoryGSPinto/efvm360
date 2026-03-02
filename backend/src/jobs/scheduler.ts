// ============================================================================
// EFVM360 Backend — Scheduled Jobs
// Uses setInterval with time-of-day targeting (no external dependencies)
// Install node-cron for more precise cron scheduling if needed:
//   npm install node-cron && npm install -D @types/node-cron
// ============================================================================

import { cleanupExpiredTokens } from '../services/authService';

const ONE_HOUR_MS = 60 * 60 * 1000;

/**
 * Calculates milliseconds until the next occurrence of a given hour (UTC).
 */
function msUntilNextHour(targetHourUTC: number): number {
  const now = new Date();
  const next = new Date(now);
  next.setUTCHours(targetHourUTC, 0, 0, 0);

  // If the target hour has already passed today, schedule for tomorrow
  if (next.getTime() <= now.getTime()) {
    next.setUTCDate(next.getUTCDate() + 1);
  }

  return next.getTime() - now.getTime();
}

/**
 * Schedules a recurring job that runs daily at a specific UTC hour.
 * First execution is delayed until the target hour, then repeats every 24h.
 */
function scheduleDailyJob(name: string, targetHourUTC: number, job: () => Promise<void>): void {
  const delay = msUntilNextHour(targetHourUTC);
  const delayHours = (delay / ONE_HOUR_MS).toFixed(1);

  console.log(`[SCHEDULER] Job "${name}" scheduled — first run in ${delayHours}h (${targetHourUTC}:00 UTC daily)`);

  // First execution at the target hour
  setTimeout(() => {
    job();
    // Then repeat every 24 hours
    setInterval(() => {
      job();
    }, 24 * ONE_HOUR_MS);
  }, delay);
}

/**
 * Job: Clean up expired and revoked refresh tokens.
 * Runs daily at 03:00 UTC to keep the refresh_tokens table lean.
 */
async function runCleanupExpiredTokens(): Promise<void> {
  const startTime = Date.now();
  try {
    const deletedCount = await cleanupExpiredTokens();
    const durationMs = Date.now() - startTime;
    console.log(`[SCHEDULER] cleanupExpiredTokens completed — ${deletedCount} tokens removed (${durationMs}ms)`);
  } catch (error) {
    console.error('[SCHEDULER] cleanupExpiredTokens FAILED:', error);
  }
}

/**
 * Initializes all scheduled jobs.
 * Call this once after the database connection is established.
 */
export function initScheduler(): void {
  console.log('[SCHEDULER] Initializing scheduled jobs...');

  // Clean expired/revoked refresh tokens daily at 03:00 UTC
  scheduleDailyJob('cleanupExpiredTokens', 3, runCleanupExpiredTokens);

  console.log('[SCHEDULER] All jobs registered.');
}
