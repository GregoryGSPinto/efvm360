// ============================================================================
// VFZ Backend — Rotas da API v1
// ============================================================================

import { Router, Request, Response } from 'express';
import { authenticate, authorize } from '../middleware/auth';
import { loginRateLimit } from '../middleware/security';
import {
  handleValidationErrors,
  loginValidator,
  refreshValidator,
  alterarSenhaValidator,
  criarUsuarioValidator,
  atualizarUsuarioValidator,
  salvarPassagemValidator,
  uuidParamValidator,
  assinarPassagemValidator,
  listarPassagensValidator,
  listarAuditValidator,
  sincronizarAuditValidator,
  criarPatioValidator,
  atualizarPatioValidator,
  lgpdExportRateLimit,
  anonimizarValidator,
} from '../middleware/validators';
import * as authCtrl from '../controllers/authController';
import * as passagensCtrl from '../controllers/passagensController';
import * as auditCtrl from '../controllers/auditController';
import * as usersCtrl from '../controllers/usersController';
import sequelize from '../config/database';

const router = Router();

// ── HEALTH CHECK ─────────────────────────────────────────────────────────
router.get('/health', async (_req: Request, res: Response) => {
  try {
    await sequelize.authenticate();
    res.json({
      status: 'healthy',
      service: 'vfz-backend',
      version: '1.0.0',
      database: 'connected',
      timestamp: new Date().toISOString(),
      uptime: process.uptime(),
      environment: process.env.NODE_ENV || 'development',
    });
  } catch {
    res.status(503).json({
      status: 'unhealthy',
      service: 'vfz-backend',
      database: 'disconnected',
      timestamp: new Date().toISOString(),
    });
  }
});

// ── AUTENTICAÇÃO ─────────────────────────────────────────────────────────
router.post('/auth/login', loginRateLimit, loginValidator, handleValidationErrors, authCtrl.login);
router.post('/auth/refresh', refreshValidator, handleValidationErrors, authCtrl.refresh);
router.post('/auth/logout', authenticate, authCtrl.logout);
router.post('/auth/alterar-senha', authenticate, alterarSenhaValidator, handleValidationErrors, authCtrl.alterarSenha);
router.get('/auth/me', authenticate, authCtrl.me);

// ── PASSAGENS DE SERVIÇO ─────────────────────────────────────────────────
router.get('/passagens', authenticate, listarPassagensValidator, handleValidationErrors, passagensCtrl.listar);
router.get('/passagens/:uuid', authenticate, uuidParamValidator, handleValidationErrors, passagensCtrl.obter);
router.post('/passagens', authenticate, salvarPassagemValidator, handleValidationErrors, passagensCtrl.salvar);
router.post('/passagens/:uuid/assinar', authenticate, assinarPassagemValidator, handleValidationErrors, passagensCtrl.assinar);

// ── AUDITORIA ────────────────────────────────────────────────────────────
router.get('/audit', authenticate, authorize('inspetor'), listarAuditValidator, handleValidationErrors, auditCtrl.listar);
router.get('/audit/integridade', authenticate, authorize('administrador'), auditCtrl.verificarIntegridade);
router.post('/audit/sync', authenticate, sincronizarAuditValidator, handleValidationErrors, auditCtrl.sincronizar);

// ── USUÁRIOS (gestão) ────────────────────────────────────────────────────
router.get('/usuarios', authenticate, authorize('gestor'), usersCtrl.listar);
router.post('/usuarios', authenticate, authorize('administrador'), criarUsuarioValidator, handleValidationErrors, usersCtrl.criar);
router.patch('/usuarios/:uuid', authenticate, authorize('administrador'), uuidParamValidator, atualizarUsuarioValidator, handleValidationErrors, usersCtrl.atualizar);

// ── LGPD (Direitos do Titular) ───────────────────────────────────────────
import * as lgpdCtrl from '../controllers/lgpdController';
router.get('/lgpd/meus-dados', authenticate, lgpdCtrl.meusDados);
router.post('/lgpd/exportar', authenticate, lgpdExportRateLimit, lgpdCtrl.exportar);
router.post('/lgpd/anonimizar', authenticate, authorize('administrador'), anonimizarValidator, handleValidationErrors, lgpdCtrl.anonimizar);

// ── PÁTIOS ──────────────────────────────────────────────────────────────
import * as patiosCtrl from '../controllers/patiosController';
router.get('/patios', authenticate, patiosCtrl.listarAtivos);
router.get('/patios/todos', authenticate, authorize('inspetor', 'gestor', 'administrador'), patiosCtrl.listar);
router.post('/patios', authenticate, authorize('inspetor', 'gestor', 'administrador'), criarPatioValidator, handleValidationErrors, patiosCtrl.criar);
router.patch('/patios/:codigo', authenticate, authorize('inspetor', 'gestor', 'administrador'), atualizarPatioValidator, handleValidationErrors, patiosCtrl.atualizar);

// ── SYNC (Offline-First) ─────────────────────────────────────────────────
import syncRoutes from './syncRoutes';
router.use('/sync', syncRoutes);

// ── Azure AD SSO (Opcional via Feature Flag) ─────────────────────────────
import { FEATURES } from '../config/featureFlags';
if (FEATURES.SSO_AZURE_AD) {
  import('../middleware/azureAuth').then(({ validateAzureToken }) => {
    router.post('/auth/azure', validateAzureToken, authCtrl.login);
  });
}

export default router;
