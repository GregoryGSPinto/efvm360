// ============================================================================
// VFZ Backend — Sync Routes
// ============================================================================

import { Router } from 'express';
import { authenticate } from '../middleware/auth';
import * as syncCtrl from '../controllers/syncController';

const router = Router();

// POST /api/v1/sync/passagens — Batch sync (offline-first)
router.post('/passagens', authenticate, syncCtrl.sincronizarBatch);

// GET /api/v1/sync/status — Sync diagnostics
router.get('/status', authenticate, syncCtrl.statusSync);

// GET /api/v1/sync/conflicts — List unresolved conflicts (supervisor+)
router.get('/conflicts', authenticate, syncCtrl.listarConflitos);

export default router;
