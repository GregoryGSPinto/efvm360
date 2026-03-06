// ============================================================================
// EFVM360 Backend — Validators: Barrel Export
// ============================================================================

export { handleValidationErrors } from './handleValidationErrors';

// Auth
export {
  loginValidator,
  refreshValidator,
  alterarSenhaValidator,
  criarUsuarioValidator,
  atualizarUsuarioValidator,
} from './authValidator';

// Passagens
export {
  salvarPassagemValidator,
  uuidParamValidator,
  assinarPassagemValidator,
  listarPassagensValidator,
} from './passagemValidator';

// Auditoria
export {
  listarAuditValidator,
  sincronizarAuditValidator,
} from './auditValidator';

// Pátios
export {
  criarPatioValidator,
  atualizarPatioValidator,
} from './patioValidator';

// LGPD
export {
  lgpdExportRateLimit,
  anonimizarValidator,
} from './lgpdValidator';

// Sync
export {
  sincronizarBatchValidator,
} from './syncValidator';

// Integration APIs (Webhooks + Export)
export {
  exportRateLimit,
  createWebhookValidator,
  updateWebhookValidator,
  exportHandoversValidator,
  exportFormatValidator,
  exportKpisValidator,
} from './integrationValidator';
