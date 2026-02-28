// ============================================================================
// GESTÃO DE TROCA DE TURNO – EFVM360
// Componente de Tabela do Pátio
// ============================================================================

import { memo } from 'react';
import type { LinhaPatio, StatusLinha, TemaEstilos } from '../../types';
import type { StylesObject } from '../../hooks/useStyles';

interface TabelaPatioProps {
  linhas: LinhaPatio[];
  onUpdate: (index: number, campo: keyof LinhaPatio, valor: string | StatusLinha) => void;
  styles: StylesObject;
  tema: TemaEstilos;
}

export const TabelaPatio = memo<TabelaPatioProps>(({
  linhas,
  onUpdate,
  styles,
  tema,
}) => (
  <div style={{ overflowX: 'auto' }}>
    <table style={styles.table}>
      <thead>
        <tr>
          <th style={styles.th}>Linha</th>
          <th style={styles.th}>Status</th>
          <th style={styles.th}>Prefixo</th>
          <th style={styles.th}>Vagões</th>
          <th style={styles.th}>Descrição</th>
        </tr>
      </thead>
      <tbody>
        {linhas.map((linha, index) => (
          <tr key={linha.linha}>
            <td style={{ ...styles.td, fontWeight: 600 }}>{linha.linha}</td>
            <td style={styles.td}>
              <select
                style={{
                  ...styles.select,
                  padding: '8px',
                  background: linha.status === 'livre'
                    ? `${tema.sucesso}15`
                    : linha.status === 'ocupada'
                    ? `${tema.aviso}15`
                    : `${tema.perigo}15`,
                  borderColor: linha.status === 'livre'
                    ? tema.sucesso
                    : linha.status === 'ocupada'
                    ? tema.aviso
                    : tema.perigo,
                }}
                value={linha.status}
                onChange={(e) => onUpdate(index, 'status', e.target.value as StatusLinha)}
              >
                <option value="livre">✓ Livre</option>
                <option value="ocupada">● Ocupada</option>
                <option value="interditada">⛔ Interditada</option>
              </select>
            </td>
            <td style={styles.td}>
              <input
                type="text"
                style={{ ...styles.input, padding: '8px' }}
                placeholder="Prefixo"
                value={linha.prefixo}
                onChange={(e) => onUpdate(index, 'prefixo', e.target.value)}
                disabled={linha.status === 'livre'}
              />
            </td>
            <td style={styles.td}>
              <input
                type="number"
                style={{ ...styles.input, padding: '8px', width: '70px' }}
                placeholder="0"
                value={linha.vagoes}
                onChange={(e) => onUpdate(index, 'vagoes', e.target.value)}
                disabled={linha.status === 'livre'}
              />
            </td>
            <td style={styles.td}>
              <input
                type="text"
                style={{ ...styles.input, padding: '8px' }}
                placeholder="Observações"
                value={linha.descricao}
                onChange={(e) => onUpdate(index, 'descricao', e.target.value)}
              />
            </td>
          </tr>
        ))}
      </tbody>
    </table>
  </div>
));

TabelaPatio.displayName = 'TabelaPatio';

// ============================================================================
// TABELA DE EQUIPAMENTOS
// ============================================================================

interface Equipamento {
  nome: string;
  quantidade: number;
  emCondicoes: boolean;
  observacao: string;
  alteradoPor?: string;
  alteradoEm?: string;
}

interface TabelaEquipamentosProps {
  equipamentos: Equipamento[];
  onUpdate: (
    index: number,
    campo: 'quantidade' | 'emCondicoes' | 'observacao',
    valor: number | boolean | string
  ) => void;
  styles: StylesObject;
  tema: TemaEstilos;
  /** User role — only inspetor/gestor/administrador can edit */
  userRole?: string;
  /** Logged user name for audit trail */
  userName?: string;
  /** Logged user matricula for audit trail */
  userMatricula?: string;
}

const ROLES_CAN_EDIT_EQUIP = new Set(['inspetor', 'gestor', 'coordenador', 'supervisor', 'oficial_operacao']);

export const TabelaEquipamentos = memo<TabelaEquipamentosProps>(({
  equipamentos,
  onUpdate,
  styles,
  tema,
  userRole,
  userName,
  userMatricula,
}) => {
  const canEdit = !userRole || ROLES_CAN_EDIT_EQUIP.has(userRole);

  const handleUpdate = (index: number, campo: 'quantidade' | 'emCondicoes' | 'observacao', valor: number | boolean | string) => {
    onUpdate(index, campo, valor);
    // Audit trail: record who made the change
    if (userName || userMatricula) {
      try {
        const audit = JSON.parse(localStorage.getItem('efvm360-equip-audit') || '[]');
        audit.push({
          equipamento: equipamentos[index]?.nome,
          campo,
          valor: String(valor),
          nome: userName || '',
          matricula: userMatricula || '',
          dataHora: new Date().toISOString(),
        });
        // Keep last 200 entries
        if (audit.length > 200) audit.splice(0, audit.length - 200);
        localStorage.setItem('efvm360-equip-audit', JSON.stringify(audit));
      } catch { /* storage full */ }
    }
  };

  return (
    <div style={{ overflowX: 'auto' }}>
      {!canEdit && (
        <div style={{
          padding: '10px 14px', marginBottom: '12px', borderRadius: '8px',
          background: `${tema.aviso}15`, border: `1px solid ${tema.aviso}40`,
          fontSize: '12px', color: tema.aviso, fontWeight: 600,
        }}>
          🔒 Somente Líder/Gestor pode editar equipamentos. Visualização apenas.
        </div>
      )}
      <table style={styles.table}>
        <thead>
          <tr>
            <th style={styles.th}>Equipamento</th>
            <th style={styles.th}>Quantidade</th>
            <th style={styles.th}>Condição</th>
            <th style={styles.th}>Observação</th>
          </tr>
        </thead>
        <tbody>
          {equipamentos.map((eq, index) => (
            <tr key={eq.nome}>
              <td style={{ ...styles.td, fontWeight: 600 }}>
                {eq.nome}
                {eq.alteradoPor && (
                  <div style={{ fontSize: '9px', color: tema.textoSecundario, fontWeight: 400, marginTop: 2 }}>
                    Editado: {eq.alteradoPor} {eq.alteradoEm ? `· ${new Date(eq.alteradoEm).toLocaleString('pt-BR')}` : ''}
                  </div>
                )}
              </td>
              <td style={styles.td}>
                <input
                  type="number"
                  min="0"
                  style={{ ...styles.input, padding: '8px', width: '80px', opacity: canEdit ? 1 : 0.6 }}
                  value={eq.quantidade}
                  onChange={(e) => handleUpdate(index, 'quantidade', parseInt(e.target.value) || 0)}
                  disabled={!canEdit}
                />
              </td>
              <td style={styles.td}>
                <button
                  type="button"
                  style={{
                    padding: '8px 16px',
                    borderRadius: '8px',
                    border: 'none',
                    cursor: canEdit ? 'pointer' : 'not-allowed',
                    fontWeight: 600,
                    fontSize: '12px',
                    background: eq.emCondicoes
                      ? `${tema.sucesso}20`
                      : `${tema.perigo}20`,
                    color: eq.emCondicoes ? tema.sucesso : tema.perigo,
                    opacity: canEdit ? 1 : 0.6,
                    transition: 'all 0.25s ease',
                  }}
                  onClick={() => canEdit && handleUpdate(index, 'emCondicoes', !eq.emCondicoes)}
                  disabled={!canEdit}
                >
                  {eq.emCondicoes ? '✓ OK' : '✗ Problema'}
                </button>
              </td>
              <td style={styles.td}>
                <input
                  type="text"
                  style={{ ...styles.input, padding: '8px', opacity: canEdit ? 1 : 0.6 }}
                  placeholder="Observação"
                  value={eq.observacao}
                  onChange={(e) => handleUpdate(index, 'observacao', e.target.value)}
                  disabled={!canEdit}
                />
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
});

TabelaEquipamentos.displayName = 'TabelaEquipamentos';

