// ============================================================================
// EFVM360 — AdamBot Action Executor
// Suggests and executes navigation, form fill, patio creation, etc.
// ============================================================================

export interface ActionResult {
  sucesso: boolean;
  mensagem: string;
}

export interface AdamAction {
  tipo: 'navegar' | 'preencher' | 'criar' | 'editar' | 'explicar' | 'confirmar' | 'avancar' | 'voltar' | 'tour' | 'limpar';
  destino?: string;
  campo?: string;
  valor?: unknown;
  label?: string;
  callback?: string;
}

export interface ActionExecutors {
  navegar: (destino: string) => void;
  avancarEtapa: () => void;
  voltarEtapa: () => void;
  abrirTour: () => void;
  clearHistory: () => void;
}

export function executarAcao(
  action: AdamAction,
  executors: ActionExecutors,
): ActionResult {
  try {
    switch (action.tipo) {
      case 'navegar':
        if (action.destino) {
          executors.navegar(action.destino);
          return { sucesso: true, mensagem: `Navegando para ${action.destino}...` };
        }
        return { sucesso: false, mensagem: 'Destino nao especificado.' };

      case 'avancar':
        executors.avancarEtapa();
        return { sucesso: true, mensagem: 'Avancando para proxima etapa...' };

      case 'voltar':
        executors.voltarEtapa();
        return { sucesso: true, mensagem: 'Voltando para etapa anterior...' };

      case 'tour':
        executors.abrirTour();
        return { sucesso: true, mensagem: 'Iniciando tour guiado...' };

      case 'limpar':
        executors.clearHistory();
        return { sucesso: true, mensagem: 'Historico limpo!' };

      default:
        return { sucesso: false, mensagem: 'Acao nao reconhecida.' };
    }
  } catch {
    return { sucesso: false, mensagem: 'Erro ao executar acao.' };
  }
}
