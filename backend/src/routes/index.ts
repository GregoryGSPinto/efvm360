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
/**
 * @openapi
 * /health:
 *   get:
 *     tags: [Health]
 *     summary: Verificar saude do servico
 *     description: Retorna status do servidor e conexao com o banco de dados.
 *     responses:
 *       200:
 *         description: Servico saudavel
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 status:
 *                   type: string
 *                   example: healthy
 *                 service:
 *                   type: string
 *                   example: vfz-backend
 *                 version:
 *                   type: string
 *                   example: '1.0.0'
 *                 database:
 *                   type: string
 *                   example: connected
 *                 timestamp:
 *                   type: string
 *                   format: date-time
 *                 uptime:
 *                   type: number
 *                 environment:
 *                   type: string
 *       503:
 *         description: Servico indisponivel (banco desconectado)
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 status:
 *                   type: string
 *                   example: unhealthy
 *                 database:
 *                   type: string
 *                   example: disconnected
 */
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

// ── DSS (Diálogo de Segurança) ──────────────────────────────────────────
import * as dssCtrl from '../controllers/dssController';
router.get('/dss', authenticate, dssCtrl.listar);
router.get('/dss/:uuid', authenticate, uuidParamValidator, handleValidationErrors, dssCtrl.obter);
router.post('/dss', authenticate, dssCtrl.salvar);

// ── BI+ (Dashboard KPIs) ────────────────────────────────────────────────
import * as biCtrl from '../controllers/biController';
router.get('/bi/kpis', authenticate, biCtrl.kpis);
router.get('/bi/resumo-yard', authenticate, authorize('inspetor'), biCtrl.resumoYard);

// ── GESTÃO (Aprovações) ─────────────────────────────────────────────────
import * as gestaoCtrl from '../controllers/gestaoController';
router.get('/gestao/cadastros', authenticate, authorize('gestor'), gestaoCtrl.listarCadastros);
router.post('/gestao/cadastros/:uuid/aprovar', authenticate, authorize('gestor'), uuidParamValidator, handleValidationErrors, gestaoCtrl.aprovarCadastro);
router.post('/gestao/cadastros/:uuid/rejeitar', authenticate, authorize('gestor'), uuidParamValidator, handleValidationErrors, gestaoCtrl.rejeitarCadastro);
router.get('/gestao/senha-resets', authenticate, authorize('gestor'), gestaoCtrl.listarSenhaResets);
router.post('/gestao/senha-resets/:uuid/aprovar', authenticate, authorize('gestor'), uuidParamValidator, handleValidationErrors, gestaoCtrl.aprovarSenhaReset);

// ── ADAMBOOT (Proficiency) ──────────────────────────────────────────────
import * as adambootCtrl from '../controllers/adambootController';
router.get('/adamboot/perfil/:matricula?', authenticate, adambootCtrl.obterPerfil);
router.post('/adamboot/acesso', authenticate, adambootCtrl.registrarAcesso);

// ── CONFIGURAÇÕES DO USUÁRIO ────────────────────────────────────────────
import * as configCtrl from '../controllers/configController';
router.get('/config', authenticate, configCtrl.obter);
router.patch('/config', authenticate, configCtrl.atualizar);

// ── ORGANIZAÇÃO (Árvore hierárquica + pátios do usuário) ────────────────
import * as orgCtrl from '../controllers/orgController';
router.get('/org/tree/:matricula', authenticate, authorize('supervisor'), orgCtrl.getTree);
router.get('/org/superiors/:matricula', authenticate, orgCtrl.getSuperiors);
router.post('/org/assign', authenticate, authorize('coordenador'), orgCtrl.assignSubordinate);
router.delete('/org/assign/:id', authenticate, authorize('coordenador'), orgCtrl.removeRelationship);
router.get('/org/coordinators', orgCtrl.getCoordinators);
router.post('/org/approve-registration', authenticate, authorize('supervisor'), orgCtrl.approveRegistration);
router.get('/users/:matricula/yards', authenticate, orgCtrl.getUserYards);
router.post('/users/:matricula/yards', authenticate, authorize('coordenador'), orgCtrl.assignYard);
router.delete('/users/:matricula/yards/:yard', authenticate, authorize('coordenador'), orgCtrl.removeYard);

// ── METRICS (Observability) ──────────────────────────────────────────────
import * as metricsCtrl from '../controllers/metricsController';
router.get('/metrics/resumo', authenticate, authorize('inspetor'), metricsCtrl.resumo);
router.get('/metrics/requests', authenticate, authorize('administrador'), metricsCtrl.requests);

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
