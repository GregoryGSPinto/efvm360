// ============================================================================
// EFVM360 — Dashboard Router (auto-selects dashboard by hierarchy level)
// ============================================================================

import { useMemo } from 'react';
import type { TemaComputed, StylesObject } from '../types';
import type { ConfiguracaoSistema, Usuario } from '../../types';
import { getHierarchyLevelForRole } from '../../domain/aggregates/UserAggregate';
import { HierarchyLevel } from '../../domain/contracts';
import DashboardSupervisor from './DashboardSupervisor';
import DashboardCoordenador from './DashboardCoordenador';
import DashboardGerente from './DashboardGerente';

interface Props {
  tema: TemaComputed;
  styles: StylesObject;
  config: ConfiguracaoSistema;
  usuarioLogado?: Usuario | null;
}

export default function DashboardRouter({ tema, usuarioLogado }: Props) {
  const level = useMemo(() => {
    if (!usuarioLogado) return HierarchyLevel.OPERATIVE;
    return getHierarchyLevelForRole(usuarioLogado.funcao);
  }, [usuarioLogado]);

  // ── Loading guard ──
  if (!usuarioLogado) {
    return (
      <div style={{ padding: 40, textAlign: 'center', color: tema.textoSecundario }}>
        Carregando dashboard...
      </div>
    );
  }

  if (level >= HierarchyLevel.MANAGEMENT) {
    return <DashboardGerente tema={tema} usuarioLogado={usuarioLogado} />;
  }
  if (level >= HierarchyLevel.COORDINATION) {
    return <DashboardCoordenador tema={tema} usuarioLogado={usuarioLogado} />;
  }
  if (level >= HierarchyLevel.SUPERVISION) {
    return <DashboardSupervisor tema={tema} usuarioLogado={usuarioLogado} />;
  }

  // Default: supervisor dashboard for any lower level that reaches this page
  return <DashboardSupervisor tema={tema} usuarioLogado={usuarioLogado} />;
}
