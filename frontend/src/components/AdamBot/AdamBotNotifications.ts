// ============================================================================
// EFVM360 — AdamBot Proactive Notifications
// Context-aware alerts based on operational state
// ============================================================================

import type { ContextoBot } from './AdamBotEngine';

export interface AdamNotification {
  id: string;
  tipo: 'alerta' | 'lembrete' | 'info';
  texto: string;
  prioridade: 'baixa' | 'media' | 'alta';
  timestamp: number;
  lida: boolean;
}

export function verificarNotificacoes(ctx: ContextoBot): AdamNotification[] {
  const notifs: AdamNotification[] = [];
  const now = Date.now();

  // 1. Handover in progress
  if (ctx.passagemEmAndamento && ctx.etapaBoaJornada < ctx.totalEtapas - 1) {
    notifs.push({
      id: `notif-passagem-${now}`,
      tipo: 'lembrete',
      texto: `Sua Boa Jornada esta na etapa ${ctx.etapaBoaJornada + 1} de ${ctx.totalEtapas}. Precisa de ajuda para continuar?`,
      prioridade: 'media',
      timestamp: now,
      lida: false,
    });
  }

  // 2. High operational risk
  if (ctx.nivelRisco === 'alto' || ctx.nivelRisco === 'critico') {
    notifs.push({
      id: `notif-risco-${now}`,
      tipo: 'alerta',
      texto: `Risco operacional ${ctx.nivelRisco?.toUpperCase()}. Score: ${ctx.scoreRisco}. Recomendo atencao redobrada.`,
      prioridade: 'alta',
      timestamp: now,
      lida: false,
    });
  }

  // 3. Interdicted lines
  const interditadas = (ctx.linhasPatio || []).filter(l => l.status === 'interditada');
  if (interditadas.length > 0) {
    notifs.push({
      id: `notif-linhas-${now}`,
      tipo: 'info',
      texto: `${interditadas.length} linha(s) interditada(s): ${interditadas.map(l => l.nome).join(', ')}`,
      prioridade: interditadas.length >= 3 ? 'alta' : 'media',
      timestamp: now,
      lida: false,
    });
  }

  // 4. Time-based: shift change reminder
  const hora = ctx.horaAtual;
  if ((hora === 6 || hora === 18) && !ctx.passagemEmAndamento) {
    notifs.push({
      id: `notif-turno-${now}`,
      tipo: 'lembrete',
      texto: 'Horario de troca de turno se aproximando. Hora de iniciar a Boa Jornada!',
      prioridade: 'media',
      timestamp: now,
      lida: false,
    });
  }

  return notifs;
}
