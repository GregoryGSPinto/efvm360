// ============================================================================
// EFVM360 — AdamBot Barrel Export
// ============================================================================

export { AdamBot } from './AdamBot';
export { AdamBotPanel } from './AdamBotPanel';
export { AdamBotProvider, useAdamBotContext } from './AdamBotContext';
export type { AdamMessage, ContextoBot } from './AdamBotEngine';
export { processarMensagem, getSugestoesContextuais, gerarBoasVindas } from './AdamBotEngine';
export type { AdamAction } from './AdamBotActions';
export { executarAcao } from './AdamBotActions';
export { adamFalar, adamCalar, adamFalando, adamPrecarregarVozes, falar, pararFala, initSTT, isTTSSupported, sttDisponivel, iniciarReconhecimento, pararReconhecimento, estaOuvindo } from './AdamBotVoice';
export { carregarMemoria, salvarMemoria, registrarInteracao, getInsightsMemoria } from './AdamBotMemory';
export type { AdamMemory } from './AdamBotMemory';
export { registrarAudit, getAuditLog, exportarAuditCSV } from './AdamBotAudit';
export type { AuditEntry } from './AdamBotAudit';
export { verificarNotificacoes } from './AdamBotNotifications';
export type { AdamNotification } from './AdamBotNotifications';
