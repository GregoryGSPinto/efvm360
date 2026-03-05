// ============================================================================
// VFZ Backend — Validators: Integration APIs (Webhooks + Export)
// ============================================================================

import { body, query } from 'express-validator';
import rateLimit from 'express-rate-limit';
import { Request } from 'express';

// ── Rate limit for export endpoints: 30 req/15min per user ──────────────────

export const exportRateLimit = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 30,
  message: {
    error: 'Export rate limit exceeded — max 30 requests per 15 minutes',
    code: 'EXPORT_RATE_LIMIT',
  },
  keyGenerator: (req: Request): string => {
    return req.user?.matricula || req.ip || 'unknown';
  },
  standardHeaders: true,
  legacyHeaders: false,
});

// ── Webhook create validator ────────────────────────────────────────────────

export const createWebhookValidator = [
  body('name')
    .trim()
    .notEmpty().withMessage('Name is required')
    .isLength({ max: 150 }).withMessage('Name max 150 chars'),
  body('url')
    .trim()
    .notEmpty().withMessage('URL is required')
    .isURL({ require_protocol: true, protocols: ['https'] }).withMessage('URL must be a valid HTTPS URL'),
  body('events')
    .isArray({ min: 1 }).withMessage('Events must be a non-empty array'),
  body('events.*')
    .isString().withMessage('Each event must be a string'),
  body('max_retries')
    .optional()
    .isInt({ min: 0, max: 10 }).withMessage('max_retries must be 0-10'),
  body('backoff_ms')
    .optional()
    .isInt({ min: 100, max: 60000 }).withMessage('backoff_ms must be 100-60000'),
];

// ── Webhook update validator ────────────────────────────────────────────────

export const updateWebhookValidator = [
  body('name')
    .optional()
    .trim()
    .isLength({ max: 150 }).withMessage('Name max 150 chars'),
  body('url')
    .optional()
    .trim()
    .isURL({ require_protocol: true, protocols: ['https'] }).withMessage('URL must be a valid HTTPS URL'),
  body('events')
    .optional()
    .isArray({ min: 1 }).withMessage('Events must be a non-empty array'),
  body('events.*')
    .optional()
    .isString().withMessage('Each event must be a string'),
  body('active')
    .optional()
    .isBoolean().withMessage('active must be a boolean'),
  body('max_retries')
    .optional()
    .isInt({ min: 0, max: 10 }).withMessage('max_retries must be 0-10'),
  body('backoff_ms')
    .optional()
    .isInt({ min: 100, max: 60000 }).withMessage('backoff_ms must be 100-60000'),
];

// ── Export query validators ─────────────────────────────────────────────────

export const exportHandoversValidator = [
  query('from')
    .optional()
    .isISO8601().withMessage('from must be a valid date (YYYY-MM-DD)'),
  query('to')
    .optional()
    .isISO8601().withMessage('to must be a valid date (YYYY-MM-DD)'),
  query('format')
    .optional()
    .isIn(['json', 'csv']).withMessage('format must be json or csv'),
];

export const exportFormatValidator = [
  query('format')
    .optional()
    .isIn(['json', 'csv']).withMessage('format must be json or csv'),
];

export const exportKpisValidator = [
  query('period')
    .optional()
    .isInt({ min: 1, max: 365 }).withMessage('period must be 1-365 days'),
  query('format')
    .optional()
    .isIn(['json', 'csv']).withMessage('format must be json or csv'),
];
