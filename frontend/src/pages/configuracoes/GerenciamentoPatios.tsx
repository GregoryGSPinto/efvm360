// ============================================================================
// EFVM360 v3.2 — Gerenciamento de Pátios (Configurações)
// CRUD de pátios com persistência offline-first (localStorage)
// ============================================================================

import { useState, useCallback } from 'react';
import type { StylesObject } from '../../hooks/useStyles';
import type { TemaEstilos } from '../../types';
import { usePatio } from '../../hooks/usePatio';

interface GerenciamentoPatiosProps {
  styles: StylesObject;
  tema: TemaEstilos;
}

export default function GerenciamentoPatios({ styles, tema }: GerenciamentoPatiosProps): JSX.Element {
  const { patios, criarPatio, editarPatio, desativarPatio, ativarPatio } = usePatio();

  const [mostrarForm, setMostrarForm] = useState(false);
  const [novoCodigo, setNovoCodigo] = useState('');
  const [novoNome, setNovoNome] = useState('');
  const [erroForm, setErroForm] = useState('');
  const [editandoCodigo, setEditandoCodigo] = useState<string | null>(null);
  const [editandoNome, setEditandoNome] = useState('');

  const handleCriar = useCallback(() => {
    const result = criarPatio(novoCodigo, novoNome);
    if (result.ok) {
      setNovoCodigo('');
      setNovoNome('');
      setMostrarForm(false);
      setErroForm('');
    } else {
      setErroForm(result.erro || 'Erro ao criar pátio');
    }
  }, [novoCodigo, novoNome, criarPatio]);

  const handleSalvarEdicao = useCallback((codigo: string) => {
    const result = editarPatio(codigo, editandoNome);
    if (result.ok) {
      setEditandoCodigo(null);
      setEditandoNome('');
    }
  }, [editandoNome, editarPatio]);

  const handleToggleAtivo = useCallback((codigo: string, ativoAtual: boolean) => {
    if (ativoAtual) {
      desativarPatio(codigo);
    } else {
      ativarPatio(codigo);
    }
  }, [desativarPatio, ativarPatio]);

  const handleIniciarEdicao = useCallback((codigo: string, nomeAtual: string) => {
    setEditandoCodigo(codigo);
    setEditandoNome(nomeAtual);
  }, []);

  const handleCancelarEdicao = useCallback(() => {
    setEditandoCodigo(null);
    setEditandoNome('');
  }, []);

  return (
    <div>
      {/* Header */}
      <div style={{ ...styles.card, marginBottom: 20 }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 12 }}>
          <div>
            <h3 style={{ ...styles.cardTitle, margin: 0 }}>Gerenciamento de Pátios</h3>
            <p style={{ fontSize: 13, color: tema.textoSecundario, margin: '4px 0 0' }}>
              Cadastre, edite e ative/desative pátios do sistema
            </p>
          </div>
          <button
            style={{
              ...styles.buttonPrimary,
              padding: '10px 20px',
              fontSize: 13,
              borderRadius: 8,
              cursor: 'pointer',
            }}
            onClick={() => { setMostrarForm(!mostrarForm); setErroForm(''); }}
          >
            {mostrarForm ? 'Cancelar' : '+ Novo Pátio'}
          </button>
        </div>
      </div>

      {/* Formulário de Criação */}
      {mostrarForm && (
        <div style={{ ...styles.card, marginBottom: 20 }}>
          <h4 style={{ color: tema.texto, margin: '0 0 16px', fontSize: 15, fontWeight: 600 }}>Novo Pátio</h4>

          {erroForm && (
            <div style={{
              padding: '10px 14px', marginBottom: 12, borderRadius: 8,
              background: 'rgba(220,38,38,0.08)', border: '1px solid rgba(220,38,38,0.2)',
              fontSize: 13, color: '#dc2626',
            }}>
              {erroForm}
            </div>
          )}

          <div style={{ display: 'grid', gridTemplateColumns: '140px 1fr', gap: 12, alignItems: 'end' }}>
            <div>
              <label style={styles.label}>Código (max 5)</label>
              <input
                style={styles.input}
                value={novoCodigo}
                onChange={e => setNovoCodigo(e.target.value.toUpperCase().slice(0, 5))}
                placeholder="Ex: VNS"
                maxLength={5}
              />
            </div>
            <div>
              <label style={styles.label}>Nome do Pátio</label>
              <input
                style={styles.input}
                value={novoNome}
                onChange={e => setNovoNome(e.target.value)}
                placeholder="Ex: Nova Serrana"
              />
            </div>
          </div>

          <div style={{ marginTop: 16, display: 'flex', gap: 10 }}>
            <button
              style={{
                ...styles.buttonPrimary,
                padding: '10px 24px',
                fontSize: 13,
                borderRadius: 8,
                cursor: 'pointer',
              }}
              onClick={handleCriar}
            >
              Criar Pátio
            </button>
            <button
              style={{
                ...styles.buttonSecondary,
                padding: '10px 24px',
                fontSize: 13,
                borderRadius: 8,
                cursor: 'pointer',
              }}
              onClick={() => { setMostrarForm(false); setErroForm(''); }}
            >
              Cancelar
            </button>
          </div>
        </div>
      )}

      {/* Tabela de Pátios */}
      <div style={{ ...styles.card, overflow: 'auto' }}>
        <table style={{ ...styles.table, width: '100%', borderCollapse: 'collapse' }}>
          <thead>
            <tr>
              <th style={styles.th}>Código</th>
              <th style={styles.th}>Nome</th>
              <th style={{ ...styles.th, textAlign: 'center' }}>Status</th>
              <th style={{ ...styles.th, textAlign: 'center' }}>Tipo</th>
              <th style={{ ...styles.th, textAlign: 'center' }}>Ações</th>
            </tr>
          </thead>
          <tbody>
            {patios.map(patio => (
              <tr key={patio.codigo}>
                <td style={{ ...styles.td, fontWeight: 600, fontFamily: 'monospace', fontSize: 14 }}>
                  {patio.codigo}
                </td>
                <td style={styles.td}>
                  {editandoCodigo === patio.codigo ? (
                    <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
                      <input
                        style={{ ...styles.input, margin: 0, padding: '6px 10px', fontSize: 13 }}
                        value={editandoNome}
                        onChange={e => setEditandoNome(e.target.value)}
                        onKeyDown={e => {
                          if (e.key === 'Enter') handleSalvarEdicao(patio.codigo);
                          if (e.key === 'Escape') handleCancelarEdicao();
                        }}
                        autoFocus
                      />
                      <button
                        onClick={() => handleSalvarEdicao(patio.codigo)}
                        style={{
                          background: tema.sucesso, color: '#fff', border: 'none',
                          borderRadius: 6, padding: '6px 12px', fontSize: 12, cursor: 'pointer', whiteSpace: 'nowrap',
                        }}
                      >
                        Salvar
                      </button>
                      <button
                        onClick={handleCancelarEdicao}
                        style={{
                          background: 'transparent', color: tema.textoSecundario, border: `1px solid ${tema.cardBorda}`,
                          borderRadius: 6, padding: '6px 12px', fontSize: 12, cursor: 'pointer', whiteSpace: 'nowrap',
                        }}
                      >
                        Cancelar
                      </button>
                    </div>
                  ) : (
                    <span style={{ color: tema.texto }}>{patio.nome}</span>
                  )}
                </td>
                <td style={{ ...styles.td, textAlign: 'center' }}>
                  <span style={{
                    display: 'inline-block', padding: '3px 10px', borderRadius: 12, fontSize: 11, fontWeight: 600,
                    background: patio.ativo ? 'rgba(34,197,94,0.12)' : 'rgba(220,38,38,0.10)',
                    color: patio.ativo ? '#16a34a' : '#dc2626',
                  }}>
                    {patio.ativo ? 'Ativo' : 'Inativo'}
                  </span>
                </td>
                <td style={{ ...styles.td, textAlign: 'center' }}>
                  <span style={{
                    fontSize: 11, color: tema.textoSecundario, fontWeight: 500,
                  }}>
                    {patio.padrao ? 'Padrão' : 'Custom'}
                  </span>
                </td>
                <td style={{ ...styles.td, textAlign: 'center' }}>
                  <div style={{ display: 'flex', gap: 8, justifyContent: 'center', flexWrap: 'wrap' }}>
                    {editandoCodigo !== patio.codigo && (
                      <button
                        onClick={() => handleIniciarEdicao(patio.codigo, patio.nome)}
                        style={{
                          background: 'transparent', color: tema.primaria,
                          border: `1px solid ${tema.primaria}`, borderRadius: 6,
                          padding: '5px 12px', fontSize: 12, cursor: 'pointer', whiteSpace: 'nowrap',
                        }}
                      >
                        Editar
                      </button>
                    )}
                    <button
                      onClick={() => handleToggleAtivo(patio.codigo, patio.ativo)}
                      style={{
                        background: patio.ativo ? 'rgba(220,38,38,0.08)' : 'rgba(34,197,94,0.08)',
                        color: patio.ativo ? '#dc2626' : '#16a34a',
                        border: `1px solid ${patio.ativo ? 'rgba(220,38,38,0.3)' : 'rgba(34,197,94,0.3)'}`,
                        borderRadius: 6, padding: '5px 12px', fontSize: 12, cursor: 'pointer', whiteSpace: 'nowrap',
                      }}
                    >
                      {patio.ativo ? 'Desativar' : 'Ativar'}
                    </button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>

        {patios.length === 0 && (
          <div style={{ padding: 24, textAlign: 'center', color: tema.textoSecundario, fontSize: 14 }}>
            Nenhum pátio cadastrado.
          </div>
        )}
      </div>
    </div>
  );
}
