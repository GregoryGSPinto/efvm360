// ============================================================================
// PASSAGEM DE SERVIÇO – EFVM360
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
}

export const TabelaEquipamentos = memo<TabelaEquipamentosProps>(({
  equipamentos,
  onUpdate,
  styles,
  tema,
}) => (
  <div style={{ overflowX: 'auto' }}>
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
            <td style={{ ...styles.td, fontWeight: 600 }}>{eq.nome}</td>
            <td style={styles.td}>
              <input
                type="number"
                min="0"
                style={{ ...styles.input, padding: '8px', width: '80px' }}
                value={eq.quantidade}
                onChange={(e) => onUpdate(index, 'quantidade', parseInt(e.target.value) || 0)}
              />
            </td>
            <td style={styles.td}>
              <button
                type="button"
                style={{
                  padding: '8px 16px',
                  borderRadius: '8px',
                  border: 'none',
                  cursor: 'pointer',
                  fontWeight: 600,
                  fontSize: '12px',
                  background: eq.emCondicoes
                    ? `${tema.sucesso}20`
                    : `${tema.perigo}20`,
                  color: eq.emCondicoes ? tema.sucesso : tema.perigo,
                  transition: 'all 0.25s ease',
                }}
                onClick={() => onUpdate(index, 'emCondicoes', !eq.emCondicoes)}
              >
                {eq.emCondicoes ? '✓ OK' : '✗ Problema'}
              </button>
            </td>
            <td style={styles.td}>
              <input
                type="text"
                style={{ ...styles.input, padding: '8px' }}
                placeholder="Observação"
                value={eq.observacao}
                onChange={(e) => onUpdate(index, 'observacao', e.target.value)}
              />
            </td>
          </tr>
        ))}
      </tbody>
    </table>
  </div>
));

TabelaEquipamentos.displayName = 'TabelaEquipamentos';

