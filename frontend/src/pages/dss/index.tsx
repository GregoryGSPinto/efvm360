// ============================================================================
// GESTÃO DE TROCA DE TURNO – EFVM360
// Página de DSS - Diálogo de Saúde, Segurança e Meio Ambiente
// CONFORMIDADE PRO-041945 Rev. 02
// FASE 5: Pesquisa de temas, sugestão automática, integração entre turnos
// ============================================================================

import React, { useState, useMemo } from 'react';
import type { TemaEstilos, HistoricoDSS } from '../../types';
import { useDSS } from '../../hooks/useDSS';
import AITemasDSS from './AITemasDSS';
import {
  TEMAS_DSS_SUGERIDOS,
  METODOLOGIA_DSS,
  TURNOS_LETRAS,
  TURNOS_HORARIOS,
  formatarTurnoCompleto,
} from '../../utils/constants';
import type { TurnoLetra, TurnoHorario } from '../../types';

interface PaginaDSSProps {
  tema: TemaEstilos;
  styles: Record<string, React.CSSProperties>;
  onVoltar: () => void;
  sugestaoDSSAnterior?: {
    tema: string;
    topico?: string;
    pontosAtencao?: string;
  } | null;
}

export const PaginaDSS: React.FC<PaginaDSSProps> = ({ tema, styles, onVoltar, sugestaoDSSAnterior }) => {
  const {
    dadosDSS,
    historicoDSS,
    dssAnterior,
    atualizarIdentificacao,
    atualizarTema,
    atualizarTopico,
    atualizarRegistro,
    atualizarMetodologia,
    salvarDSS,
    limparDSS,
    podeFinalizarDSS,
    errosDSS,
    verificarTemaDuplicado,
  } = useDSS();

  const [mostrarTemaPersonalizado, setMostrarTemaPersonalizado] = useState(dadosDSS.temaPersonalizado);
  const [mostrarHistorico, setMostrarHistorico] = useState(false);
  const [mensagemSucesso, setMensagemSucesso] = useState('');
  const [erroTemaDuplicado, setErroTemaDuplicado] = useState('');
  const [erroTopicoDuplicado, setErroTopicoDuplicado] = useState('');
  const [buscaTema, setBuscaTema] = useState('');
  const [mostrarSugestoes, setMostrarSugestoes] = useState(false);
  // Experience layer state
  const [experiencias, setExperiencias] = useState<Array<{ autor: string; texto: string; data: string }>>([]);
  const [novaExperiencia, setNovaExperiencia] = useState('');
  const [mostrarFormExperiencia, setMostrarFormExperiencia] = useState(false);

  // Categorias de temas
  const categoriasTemas = useMemo(() => {
    const categorias: Record<string, typeof TEMAS_DSS_SUGERIDOS[number][]> = {};
    TEMAS_DSS_SUGERIDOS.forEach((t) => {
      if (!categorias[t.categoria]) categorias[t.categoria] = [];
      categorias[t.categoria].push(t);
    });
    return categorias;
  }, []);

  // Temas do histórico (globais)
  const temasGlobais = useMemo(() => {
    const temas = new Map<string, { tema: string; vezes: number; ultima: string }>();
    historicoDSS.forEach(dss => {
      if (dss.tema && dss.temaPersonalizado) {
        const key = dss.tema.toLowerCase().trim();
        const existing = temas.get(key);
        if (existing) {
          existing.vezes++;
        } else {
          temas.set(key, { 
            tema: dss.tema, 
            vezes: 1, 
            ultima: dss.identificacao.data 
          });
        }
      }
    });
    return Array.from(temas.values()).sort((a, b) => b.vezes - a.vezes);
  }, [historicoDSS]);

  // Filtrar sugestões de temas baseado na busca
  const sugestoesFiltradas = useMemo((): {
    sugeridos: typeof TEMAS_DSS_SUGERIDOS[number][];
    globais: { tema: string; vezes: number; ultima: string }[];
  } => {
    if (!buscaTema.trim()) return { sugeridos: [], globais: [] };
    const termo = buscaTema.toLowerCase().trim();

    const sugeridos = TEMAS_DSS_SUGERIDOS.filter((t: typeof TEMAS_DSS_SUGERIDOS[number]) =>
      t.tema.toLowerCase().includes(termo) ||
      t.categoria.toLowerCase().includes(termo)
    );

    const globais = temasGlobais.filter((t: { tema: string; vezes: number; ultima: string }) =>
      t.tema.toLowerCase().includes(termo)
    );

    return {
      sugeridos: sugeridos.slice(0, 5),
      globais: globais.slice(0, 5),
    };
  }, [buscaTema, temasGlobais]);

  // Verificar tópico duplicado no mesmo tema (case-insensitive)
  const verificarTopicoDuplicado = (topico: string): boolean => {
    if (!topico.trim() || !dadosDSS.tema) return false;
    const topicoNorm = topico.trim().toLowerCase().replace(/\s+/g, ' ');
    const temaNorm = dadosDSS.tema.trim().toLowerCase().replace(/\s+/g, ' ');
    return historicoDSS.some(dss =>
      dss.tema.trim().toLowerCase().replace(/\s+/g, ' ') === temaNorm &&
      (dss.topico || '').trim().toLowerCase().replace(/\s+/g, ' ') === topicoNorm
    );
  };

  const handleSalvar = () => {
    if (dadosDSS.temaPersonalizado && verificarTemaDuplicado(dadosDSS.tema)) {
      setErroTemaDuplicado('Tema já existe no histórico. Por favor, escolha um tema diferente.');
      return;
    }
    if (dadosDSS.topico && verificarTopicoDuplicado(dadosDSS.topico)) {
      setErroTopicoDuplicado('⚠️ Tópico já registrado neste tema');
      return;
    }

    if (salvarDSS()) {
      setMensagemSucesso('DSS registrado com sucesso!');
      setErroTemaDuplicado('');
      setErroTopicoDuplicado('');
      // Save experiences with DSS
      if (experiencias.length > 0) {
        try {
          const key = `efvm360-dss-experiencias-${Date.now()}`;
          localStorage.setItem(key, JSON.stringify({ tema: dadosDSS.tema, experiencias }));
        } catch { /* quota exceeded */ }
      }
      setExperiencias([]);
      setNovaExperiencia('');
      setMostrarFormExperiencia(false);
      setTimeout(() => setMensagemSucesso(''), 3000);
    }
  };

  const handleSelecionarTema = (temaTexto: string, personalizado = false) => {
    atualizarTema(temaTexto, personalizado);
    setMostrarTemaPersonalizado(personalizado);
    setErroTemaDuplicado('');
    setBuscaTema('');
    setMostrarSugestoes(false);
  };

  const handleTemaPersonalizadoChange = (valor: string) => {
    atualizarTema(valor, true);
    if (verificarTemaDuplicado(valor)) {
      setErroTemaDuplicado('⚠️ Tema já existe no histórico');
    } else {
      setErroTemaDuplicado('');
    }
  };

  const handleUsarSugestaoAnterior = () => {
    if (sugestaoDSSAnterior?.tema || dssAnterior?.tema) {
      const temaAnterior = sugestaoDSSAnterior?.tema || dssAnterior?.tema || '';
      const topicoAnterior = sugestaoDSSAnterior?.topico || dssAnterior?.topico || '';
      const pontosAnterior = sugestaoDSSAnterior?.pontosAtencao || dssAnterior?.registro?.pontosAtencao || '';
      
      // Verificar se é tema sugerido ou personalizado
      const isTemasSugerido = TEMAS_DSS_SUGERIDOS.some(t => t.tema === temaAnterior);
      
      atualizarTema(temaAnterior, !isTemasSugerido);
      setMostrarTemaPersonalizado(!isTemasSugerido);
      
      if (topicoAnterior) {
        atualizarTopico(topicoAnterior);
      }
      
      if (pontosAnterior) {
        atualizarRegistro('pontosAtencao', `[Continuidade do turno anterior]\n${pontosAnterior}`);
      }
    }
  };

  const handleTurnoLetraChange = (letra: string) => {
    atualizarIdentificacao('turnoLetra', letra);
    if (letra && dadosDSS.identificacao.turnoHorario) {
      const turnoCompleto = formatarTurnoCompleto(letra as TurnoLetra, dadosDSS.identificacao.turnoHorario as TurnoHorario);
      atualizarIdentificacao('turno', turnoCompleto);
    }
  };

  const handleTurnoHorarioChange = (horario: string) => {
    atualizarIdentificacao('turnoHorario', horario);
    if (dadosDSS.identificacao.turnoLetra && horario) {
      const turnoCompleto = formatarTurnoCompleto(dadosDSS.identificacao.turnoLetra as TurnoLetra, horario as TurnoHorario);
      atualizarIdentificacao('turno', turnoCompleto);
    }
  };

  const cardStyle: React.CSSProperties = {
    background: tema.card,
    borderRadius: '16px',
    padding: '20px',
    marginBottom: '16px',
    border: `1px solid ${tema.cardBorda}`,
  };

  const cardTitleStyle: React.CSSProperties = {
    fontSize: '16px',
    fontWeight: 700,
    color: tema.texto,
    marginBottom: '16px',
    display: 'flex',
    alignItems: 'center',
    gap: '8px',
  };

  return (
    <div style={{ padding: '20px', maxWidth: '900px', margin: '0 auto' }}>
      {/* Header — Botão voltar ACIMA do título */}
      <div style={{ marginBottom: '20px' }}>
        <button
          type="button"
          onClick={onVoltar}
          style={{
            ...styles.button,
            padding: '10px 16px',
            background: tema.buttonInativo,
            color: tema.texto,
            border: `1px solid ${tema.cardBorda}`,
            marginBottom: '12px',
          }}
        >
          ← Voltar
        </button>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '12px' }}>
          <div>
            <h1 style={{ color: tema.texto, fontSize: '22px', fontWeight: 700, margin: 0 }}>
              DSS - Dialogo de Saude, Seguranca e Meio Ambiente
            </h1>
            <p style={{ color: tema.textoSecundario, fontSize: '12px', margin: '4px 0 0' }}>
              PRO-041945 Rev. 02 - Espaco de dialogo aberto e participativo
            </p>
          </div>
          <button
            type="button"
            onClick={() => setMostrarHistorico(!mostrarHistorico)}
            style={{
              ...styles.button,
              padding: '10px 16px',
              background: mostrarHistorico ? tema.primaria : tema.buttonInativo,
              color: mostrarHistorico ? '#fff' : tema.texto,
            }}
          >
            Historico ({historicoDSS.length})
          </button>
        </div>
      </div>

      {/* Mensagem de sucesso */}
      {mensagemSucesso && (
        <div style={{
          padding: '14px 18px',
          background: `${tema.sucesso}20`,
          border: `2px solid ${tema.sucesso}`,
          borderRadius: '10px',
          marginBottom: '16px',
          display: 'flex',
          alignItems: 'center',
          gap: '10px',
        }}>
          <span style={{ fontSize: '20px' }}>✅</span>
          <span style={{ color: tema.sucesso, fontWeight: 600 }}>{mensagemSucesso}</span>
        </div>
      )}

      {/* Histórico */}
      {mostrarHistorico && (
        <div style={cardStyle}>
          <h3 style={cardTitleStyle}>📋 Histórico de DSS</h3>
          {historicoDSS.length === 0 ? (
            <p style={{ color: tema.textoSecundario, textAlign: 'center', padding: '20px' }}>
              Nenhum DSS registrado ainda.
            </p>
          ) : (
            <div style={{ maxHeight: '250px', overflowY: 'auto' }}>
              {historicoDSS.slice(0, 15).map((dss: HistoricoDSS) => (
                <div
                  key={dss.id}
                  style={{
                    padding: '12px',
                    marginBottom: '8px',
                    background: tema.backgroundSecundario,
                    borderRadius: '8px',
                    border: `1px solid ${tema.cardBorda}`,
                  }}
                >
                  <div style={{ fontWeight: 700, color: tema.texto, fontSize: '13px' }}>
                    {dss.tema}
                    {dss.topico && (
                      <span style={{ fontWeight: 400, color: tema.textoSecundario, marginLeft: '8px' }}>
                        • Tópico: {dss.topico}
                      </span>
                    )}
                  </div>
                  <div style={{ fontSize: '11px', color: tema.textoSecundario, marginTop: '4px' }}>
                    {dss.identificacao.data} • {dss.identificacao.turno} • {dss.identificacao.facilitador}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Orientação */}
      <div style={{
        padding: '14px 18px',
        background: `${tema.info}15`,
        border: `2px solid ${tema.info}40`,
        borderRadius: '12px',
        marginBottom: '16px',
      }}>
        <div style={{ display: 'flex', alignItems: 'flex-start', gap: '12px' }}>
          <span style={{ fontSize: '24px' }}>💬</span>
          <div>
            <div style={{ fontWeight: 700, color: tema.texto, marginBottom: '4px', fontSize: '13px' }}>
              O DSS é um espaço de diálogo aberto, preventivo e participativo.
            </div>
            <div style={{ fontSize: '11px', color: tema.textoSecundario }}>
              Duração recomendada: 10 a 15 minutos, antes da jornada de trabalho.
            </div>
          </div>
        </div>
      </div>

      {/* Sugestão do Turno Anterior - Integração entre turnos */}
      {(sugestaoDSSAnterior || dssAnterior) && (
        <div style={{
          padding: '18px',
          background: `linear-gradient(135deg, ${tema.aviso}15 0%, ${tema.primaria}10 100%)`,
          border: `2px solid ${tema.aviso}50`,
          borderRadius: '16px',
          marginBottom: '16px',
        }}>
          <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: '16px', flexWrap: 'wrap' }}>
            <div style={{ flex: 1 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '8px' }}>
                <span style={{ fontSize: '22px' }}>💡</span>
                <div style={{ fontSize: '12px', color: tema.aviso, textTransform: 'uppercase', fontWeight: 700, letterSpacing: '0.5px' }}>
                  Sugestão do Turno Anterior
                </div>
              </div>
              <div style={{ fontWeight: 700, color: tema.texto, fontSize: '15px', marginBottom: '4px' }}>
                {sugestaoDSSAnterior?.tema || dssAnterior?.tema}
              </div>
              {(sugestaoDSSAnterior?.topico || dssAnterior?.topico) && (
                <div style={{ fontSize: '12px', color: tema.textoSecundario }}>
                  Tópico: {sugestaoDSSAnterior?.topico || dssAnterior?.topico}
                </div>
              )}
              {(sugestaoDSSAnterior?.pontosAtencao || dssAnterior?.registro?.pontosAtencao) && (
                <div style={{ fontSize: '11px', color: tema.textoSecundario, marginTop: '6px', padding: '8px 10px', background: `${tema.backgroundSecundario}80`, borderRadius: '6px' }}>
                  📌 Pontos de atenção: {(sugestaoDSSAnterior?.pontosAtencao || dssAnterior?.registro?.pontosAtencao || '').slice(0, 100)}...
                </div>
              )}
            </div>
            <button
              type="button"
              onClick={handleUsarSugestaoAnterior}
              style={{
                ...styles.button,
                padding: '12px 20px',
                background: `linear-gradient(135deg, ${tema.primaria} 0%, ${tema.primariaHover} 100%)`,
                color: '#fff',
                fontWeight: 700,
                fontSize: '13px',
                border: 'none',
                boxShadow: `0 4px 12px ${tema.primaria}40`,
              }}
            >
              ✓ Usar Este Tema
            </button>
          </div>
          <div style={{ fontSize: '10px', color: tema.textoSecundario, marginTop: '10px', fontStyle: 'italic' }}>
            💬 Manter continuidade no tema reforça a cultura de segurança entre turnos.
          </div>
        </div>
      )}

      {/* CARD 1 - Identificação (SEM TIPO DE DSS) */}
      <div style={cardStyle}>
        <h3 style={cardTitleStyle}>📋 1. Identificação do DSS</h3>
        <div className="efvm360-grid-responsive-2" style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: '14px' }}>
          <div>
            <label style={styles.label}>Data *</label>
            <input
              type="date"
              style={styles.input}
              value={dadosDSS.identificacao.data}
              onChange={(e) => atualizarIdentificacao('data', e.target.value)}
            />
          </div>
          <div>
            <label style={styles.label}>Horário</label>
            <input
              type="time"
              style={styles.input}
              value={dadosDSS.identificacao.horario}
              onChange={(e) => atualizarIdentificacao('horario', e.target.value)}
            />
          </div>
          
          {/* TURNO PADRONIZADO A/B/C/D */}
          <div>
            <label style={styles.label}>Turno (Letra) *</label>
            <select
              style={styles.select}
              value={dadosDSS.identificacao.turnoLetra || ''}
              onChange={(e) => handleTurnoLetraChange(e.target.value)}
            >
              <option value="">Selecione A/B/C/D</option>
              {TURNOS_LETRAS.map((t) => (
                <option key={t.value} value={t.value}>{t.label}</option>
              ))}
            </select>
          </div>
          
          {/* JANELA HORÁRIA 07-19 / 19-07 */}
          <div>
            <label style={styles.label}>Janela Horária *</label>
            <select
              style={styles.select}
              value={dadosDSS.identificacao.turnoHorario || ''}
              onChange={(e) => handleTurnoHorarioChange(e.target.value)}
            >
              <option value="">Selecione horário</option>
              {TURNOS_HORARIOS.map((h) => (
                <option key={h.value} value={h.value}>{h.label}</option>
              ))}
            </select>
          </div>
          
          <div style={{ gridColumn: '1 / -1' }}>
            <label style={styles.label}>Facilitador *</label>
            <input
              type="text"
              style={styles.input}
              placeholder="Nome do facilitador"
              value={dadosDSS.identificacao.facilitador}
              onChange={(e) => atualizarIdentificacao('facilitador', e.target.value)}
            />
          </div>
        </div>

        {/* Exibir turno completo formatado */}
        {dadosDSS.identificacao.turnoLetra && dadosDSS.identificacao.turnoHorario && (
          <div style={{
            marginTop: '14px',
            padding: '10px 14px',
            background: `${tema.primaria}15`,
            border: `1px solid ${tema.primaria}40`,
            borderRadius: '8px',
            display: 'flex',
            alignItems: 'center',
            gap: '8px',
          }}>
            <span style={{ fontSize: '16px' }}>
              {dadosDSS.identificacao.turnoHorario === '07-19' ? '🌅' : '🌙'}
            </span>
            <div>
              <div style={{ fontSize: '10px', color: tema.textoSecundario }}>TURNO SELECIONADO:</div>
              <div style={{ fontWeight: 700, color: tema.primaria, fontSize: '13px' }}>
                {dadosDSS.identificacao.turno}
              </div>
            </div>
          </div>
        )}
      </div>

      {/* AI Temas DSS — Sugestões Inteligentes */}
      <div style={{ marginBottom: 20 }}>
        <AITemasDSS
          tema={tema}
          patio="VFZ"
          turno={dadosDSS.identificacao.turnoLetra || 'D'}
          onUsarTema={(titulo, pontos) => {
            atualizarTema(titulo, false);
            atualizarRegistro('pontosAtencao', pontos.join('\n'));
          }}
        />
      </div>

      {/* CARD 2 - Tema do DSS */}
      <div style={cardStyle}>
        <h3 style={cardTitleStyle}>🎯 2. Tema do DSS (Obrigatório)</h3>

        {/* CAMPO DE PESQUISA DE TEMAS */}
        <div style={{ marginBottom: '16px', position: 'relative' }}>
          <label style={styles.label}>🔍 Pesquisar Tema</label>
          <input
            type="text"
            style={{ ...styles.input, paddingRight: '40px' }}
            placeholder="Digite para buscar temas sugeridos ou criados..."
            value={buscaTema}
            onChange={(e) => {
              setBuscaTema(e.target.value);
              setMostrarSugestoes(true);
            }}
            onFocus={() => setMostrarSugestoes(true)}
          />
          {buscaTema && (
            <button
              type="button"
              onClick={() => { setBuscaTema(''); setMostrarSugestoes(false); }}
              style={{
                position: 'absolute',
                right: '10px',
                top: '32px',
                background: 'transparent',
                border: 'none',
                cursor: 'pointer',
                fontSize: '16px',
                color: tema.textoSecundario,
              }}
            >
              ✕
            </button>
          )}

          {/* Dropdown de sugestões */}
          {mostrarSugestoes && buscaTema.trim() && (sugestoesFiltradas.sugeridos.length > 0 || sugestoesFiltradas.globais.length > 0) && (
            <div style={{
              position: 'absolute',
              top: '100%',
              left: 0,
              right: 0,
              background: tema.card,
              border: `1px solid ${tema.cardBorda}`,
              borderRadius: '10px',
              boxShadow: tema.cardSombra,
              zIndex: 100,
              maxHeight: '250px',
              overflowY: 'auto',
            }}>
              {/* Temas Sugeridos (PRO-041945) */}
              {sugestoesFiltradas.sugeridos.length > 0 && (
                <>
                  <div style={{ padding: '8px 12px', fontSize: '10px', color: tema.textoSecundario, fontWeight: 600, background: tema.backgroundSecundario, borderBottom: `1px solid ${tema.cardBorda}` }}>
                    📚 TEMAS SUGERIDOS (PRO-041945)
                  </div>
                  {sugestoesFiltradas.sugeridos.map((t) => (
                    <button
                      key={t.id}
                      type="button"
                      onClick={() => handleSelecionarTema(t.tema, false)}
                      style={{
                        width: '100%',
                        padding: '10px 14px',
                        background: 'transparent',
                        border: 'none',
                        borderBottom: `1px solid ${tema.cardBorda}`,
                        cursor: 'pointer',
                        textAlign: 'left',
                        display: 'flex',
                        alignItems: 'center',
                        gap: '10px',
                      }}
                    >
                      <span style={{ fontSize: '12px' }}>📋</span>
                      <div>
                        <div style={{ fontWeight: 600, color: tema.texto, fontSize: '13px' }}>{t.tema}</div>
                        <div style={{ fontSize: '10px', color: tema.textoSecundario }}>{t.categoria}</div>
                      </div>
                    </button>
                  ))}
                </>
              )}

              {/* Temas Globais (criados pelos usuários) */}
              {sugestoesFiltradas.globais.length > 0 && (
                <>
                  <div style={{ padding: '8px 12px', fontSize: '10px', color: tema.textoSecundario, fontWeight: 600, background: tema.backgroundSecundario, borderBottom: `1px solid ${tema.cardBorda}` }}>
                    🌐 TEMAS CRIADOS (GLOBAIS)
                  </div>
                  {sugestoesFiltradas.globais.map((t) => (
                    <button
                      key={t.tema}
                      type="button"
                      onClick={() => handleSelecionarTema(t.tema, true)}
                      style={{
                        width: '100%',
                        padding: '10px 14px',
                        background: 'transparent',
                        border: 'none',
                        borderBottom: `1px solid ${tema.cardBorda}`,
                        cursor: 'pointer',
                        textAlign: 'left',
                        display: 'flex',
                        alignItems: 'center',
                        gap: '10px',
                      }}
                    >
                      <span style={{ fontSize: '12px' }}>🏷️</span>
                      <div>
                        <div style={{ fontWeight: 600, color: tema.texto, fontSize: '13px' }}>{t.tema}</div>
                        <div style={{ fontSize: '10px', color: tema.textoSecundario }}>Usado {t.vezes}x • Último: {t.ultima}</div>
                      </div>
                    </button>
                  ))}
                </>
              )}
            </div>
          )}
        </div>
        
        <div style={{
          padding: '10px 14px',
          background: `${tema.primaria}10`,
          border: `1px solid ${tema.primaria}40`,
          borderRadius: '8px',
          marginBottom: '14px',
        }}>
          <div style={{ fontSize: '12px', color: tema.texto }}>
            ⭐ O Tema é o elemento central do DSS. Selecione um tema sugerido ou digite um personalizado.
          </div>
        </div>

        {/* Temas sugeridos */}
        <div style={{ marginBottom: '16px' }}>
          <label style={{ ...styles.label, marginBottom: '10px' }}>Temas Sugeridos (PRO-041945)</label>
          {Object.entries(categoriasTemas).map(([categoria, temas]) => (
            <div key={categoria} style={{ marginBottom: '10px' }}>
              <div style={{ fontSize: '10px', color: tema.textoSecundario, marginBottom: '6px', fontWeight: 600, textTransform: 'uppercase' }}>
                {categoria}
              </div>
              <div style={{ display: 'flex', gap: '6px', flexWrap: 'wrap' }}>
                {temas.map((t) => (
                  <button
                    key={t.id}
                    type="button"
                    style={{
                      ...styles.button,
                      padding: '6px 12px',
                      fontSize: '11px',
                      background: dadosDSS.tema === t.tema && !dadosDSS.temaPersonalizado ? tema.primaria : tema.buttonInativo,
                      color: dadosDSS.tema === t.tema && !dadosDSS.temaPersonalizado ? '#fff' : tema.texto,
                      border: `1px solid ${dadosDSS.tema === t.tema && !dadosDSS.temaPersonalizado ? tema.primaria : tema.cardBorda}`,
                    }}
                    onClick={() => handleSelecionarTema(t.tema)}
                  >
                    {t.tema}
                  </button>
                ))}
              </div>
            </div>
          ))}
        </div>

        {/* Toggle tema personalizado */}
        <button
          type="button"
          style={{
            ...styles.button,
            padding: '10px 16px',
            marginBottom: '12px',
            background: mostrarTemaPersonalizado ? tema.info : tema.buttonInativo,
            color: mostrarTemaPersonalizado ? '#fff' : tema.texto,
            border: `2px solid ${mostrarTemaPersonalizado ? tema.info : tema.cardBorda}`,
          }}
          onClick={() => {
            setMostrarTemaPersonalizado(!mostrarTemaPersonalizado);
            if (!mostrarTemaPersonalizado) {
              atualizarTema('', true);
            }
            setErroTemaDuplicado('');
          }}
        >
          ✏️ {mostrarTemaPersonalizado ? 'Tema Personalizado Ativo' : 'Digitar Tema Personalizado'}
        </button>

        {mostrarTemaPersonalizado && (
          <div>
            <label style={styles.label}>Tema Personalizado *</label>
            <input
              type="text"
              style={{
                ...styles.input,
                borderColor: erroTemaDuplicado ? tema.perigo : undefined,
              }}
              placeholder="Digite o tema do DSS..."
              value={dadosDSS.temaPersonalizado ? dadosDSS.tema : ''}
              onChange={(e) => handleTemaPersonalizadoChange(e.target.value)}
            />
            {erroTemaDuplicado && (
              <div style={{ 
                color: tema.perigo, 
                fontSize: '11px', 
                marginTop: '6px',
                padding: '6px 10px',
                background: `${tema.perigo}15`,
                borderRadius: '6px',
              }}>
                {erroTemaDuplicado}
              </div>
            )}
          </div>
        )}

        {/* Tema selecionado */}
        {dadosDSS.tema && (
          <div style={{
            marginTop: '14px',
            padding: '12px',
            background: `${tema.sucesso}15`,
            border: `2px solid ${tema.sucesso}40`,
            borderRadius: '8px',
          }}>
            <div style={{ fontSize: '10px', color: tema.textoSecundario, marginBottom: '2px' }}>TEMA SELECIONADO:</div>
            <div style={{ fontWeight: 700, color: tema.sucesso, fontSize: '14px' }}>{dadosDSS.tema}</div>
          </div>
        )}

        {/* CAMPO TÓPICO - Aparece quando tema está selecionado */}
        {dadosDSS.tema && (
          <div style={{ marginTop: '16px' }}>
            <label style={styles.label}>
              📌 Tópico (opcional)
              <span style={{ fontWeight: 400, color: tema.textoSecundario, marginLeft: '8px', fontSize: '10px' }}>
                Detalhe específico do tema
              </span>
            </label>
            <input
              type="text"
              style={{
                ...styles.input,
                borderColor: erroTopicoDuplicado ? tema.perigo : undefined,
              }}
              placeholder="Ex: Procedimento de bloqueio, Uso de EPI específico..."
              value={dadosDSS.topico || ''}
              onChange={(e) => {
                atualizarTopico(e.target.value);
                if (verificarTopicoDuplicado(e.target.value)) {
                  setErroTopicoDuplicado('⚠️ Tópico já registrado neste tema');
                } else {
                  setErroTopicoDuplicado('');
                }
              }}
            />
            {erroTopicoDuplicado && (
              <div style={{
                color: tema.perigo, fontSize: '11px', marginTop: '6px',
                padding: '6px 10px', background: `${tema.perigo}15`, borderRadius: '6px',
              }}>
                {erroTopicoDuplicado}
              </div>
            )}
            <div style={{ fontSize: '10px', color: tema.textoSecundario, marginTop: '4px' }}>
              💡 O tópico ajuda a especificar o assunto abordado dentro do tema selecionado.
            </div>
          </div>
        )}
      </div>

      {/* CARD 3 - Metodologia */}
      <div style={cardStyle}>
        <h3 style={cardTitleStyle}>📘 3. Metodologia Pare, Pense, Pratique (Orientação)</h3>
        <div style={{ fontSize: '11px', color: tema.textoSecundario, marginBottom: '12px' }}>
          Marque as etapas aplicadas durante o diálogo (opcional).
        </div>
        <div style={{ display: 'flex', gap: '10px', flexWrap: 'wrap' }}>
          {Object.entries(METODOLOGIA_DSS).map(([key, met]) => (
            <button
              key={key}
              type="button"
              style={{
                flex: '1 1 calc(33% - 10px)',
                minWidth: '140px',
                padding: '14px',
                borderRadius: '10px',
                background: dadosDSS.metodologiaAplicada[key as keyof typeof dadosDSS.metodologiaAplicada]
                  ? `${met.cor}20`
                  : tema.backgroundSecundario,
                border: `3px solid ${dadosDSS.metodologiaAplicada[key as keyof typeof dadosDSS.metodologiaAplicada] ? met.cor : tema.cardBorda}`,
                cursor: 'pointer',
                textAlign: 'left',
              }}
              onClick={() => atualizarMetodologia(
                key as 'pare' | 'pense' | 'pratique',
                !dadosDSS.metodologiaAplicada[key as keyof typeof dadosDSS.metodologiaAplicada]
              )}
            >
              <div style={{ fontWeight: 800, fontSize: '16px', color: met.cor, marginBottom: '4px' }}>
                {dadosDSS.metodologiaAplicada[key as keyof typeof dadosDSS.metodologiaAplicada] ? '✓' : '○'} {met.nome}
              </div>
              <div style={{ fontSize: '10px', color: tema.texto }}>{met.descricao}</div>
            </button>
          ))}
        </div>
      </div>

      {/* CARD 4 - Registro */}
      <div style={cardStyle}>
        <h3 style={cardTitleStyle}>📝 4. Registro do DSS</h3>
        <div style={{ display: 'grid', gap: '12px' }}>
          <div>
            <label style={styles.label}>Principais riscos discutidos</label>
            <textarea
              style={styles.textarea}
              placeholder="Descreva os principais riscos abordados..."
              value={dadosDSS.registro.riscosDiscutidos}
              onChange={(e) => atualizarRegistro('riscosDiscutidos', e.target.value)}
              rows={2}
            />
          </div>
          <div>
            <label style={styles.label}>Medidas de controle combinadas</label>
            <textarea
              style={styles.textarea}
              placeholder="Liste as medidas de controle acordadas..."
              value={dadosDSS.registro.medidasControle}
              onChange={(e) => atualizarRegistro('medidasControle', e.target.value)}
              rows={2}
            />
          </div>
          <div>
            <label style={styles.label}>Pontos de atenção</label>
            <textarea
              style={styles.textarea}
              placeholder="Destaque pontos importantes..."
              value={dadosDSS.registro.pontosAtencao}
              onChange={(e) => atualizarRegistro('pontosAtencao', e.target.value)}
              rows={2}
            />
          </div>
          <div>
            <label style={styles.label}>Observações gerais (opcional)</label>
            <textarea
              style={styles.textarea}
              placeholder="Outras observações..."
              value={dadosDSS.registro.observacoesGerais}
              onChange={(e) => atualizarRegistro('observacoesGerais', e.target.value)}
              rows={2}
            />
          </div>
        </div>
      </div>

      {/* CARD 5 - Camada de Experiências */}
      <div style={cardStyle}>
        <h3 style={cardTitleStyle}>
          💡 5. Experiências Compartilhadas
          <span style={{ fontSize: '11px', fontWeight: 400, color: tema.textoSecundario, marginLeft: '8px' }}>
            (opcional)
          </span>
        </h3>
        <div style={{ fontSize: '12px', color: tema.textoSecundario, marginBottom: '14px' }}>
          Compartilhe vivências práticas relacionadas ao tema discutido.
        </div>

        {/* Lista de experiências adicionadas */}
        {experiencias.length > 0 && (
          <div style={{ marginBottom: '14px' }}>
            {experiencias.map((exp, idx) => (
              <div key={idx} style={{
                padding: '12px', marginBottom: '8px',
                background: `${tema.primaria}08`, border: `1px solid ${tema.primaria}25`,
                borderRadius: '10px', display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: '10px',
              }}>
                <div style={{ flex: 1 }}>
                  <div style={{ fontSize: '13px', color: tema.texto }}>{exp.texto}</div>
                  <div style={{ fontSize: '10px', color: tema.textoSecundario, marginTop: '4px' }}>
                    {exp.autor} · {exp.data}
                  </div>
                </div>
                <button type="button" onClick={() => setExperiencias(prev => prev.filter((_, i) => i !== idx))}
                  style={{ background: 'transparent', border: 'none', cursor: 'pointer', color: tema.perigo, fontSize: '14px', padding: '2px 6px' }}>
                  ✕
                </button>
              </div>
            ))}
          </div>
        )}

        {/* Form para nova experiência */}
        {mostrarFormExperiencia ? (
          <div style={{
            padding: '14px', background: tema.backgroundSecundario,
            borderRadius: '10px', border: `1px solid ${tema.cardBorda}`,
          }}>
            <label style={styles.label}>Descreva sua experiência</label>
            <textarea
              style={styles.textarea}
              placeholder="Ex: Na semana passada, ao realizar o bloqueio do AMV-15, percebi que..."
              value={novaExperiencia}
              onChange={(e) => setNovaExperiencia(e.target.value)}
              rows={3}
            />
            <div style={{ display: 'flex', gap: '8px', marginTop: '10px', justifyContent: 'flex-end' }}>
              <button type="button" onClick={() => { setMostrarFormExperiencia(false); setNovaExperiencia(''); }}
                style={{ ...styles.button, padding: '8px 16px', background: tema.buttonInativo, color: tema.texto, border: `1px solid ${tema.cardBorda}`, fontSize: '12px' }}>
                Cancelar
              </button>
              <button type="button"
                onClick={() => {
                  if (novaExperiencia.trim()) {
                    setExperiencias(prev => [...prev, {
                      autor: dadosDSS.identificacao.facilitador || 'Anônimo',
                      texto: novaExperiencia.trim(),
                      data: new Date().toLocaleDateString('pt-BR'),
                    }]);
                    setNovaExperiencia('');
                    setMostrarFormExperiencia(false);
                  }
                }}
                disabled={!novaExperiencia.trim()}
                style={{
                  ...styles.button, padding: '8px 16px', fontSize: '12px', fontWeight: 600,
                  background: novaExperiencia.trim() ? tema.primaria : tema.buttonInativo,
                  color: novaExperiencia.trim() ? '#fff' : tema.textoSecundario,
                  border: 'none', cursor: novaExperiencia.trim() ? 'pointer' : 'not-allowed',
                }}>
                ✓ Adicionar
              </button>
            </div>
          </div>
        ) : (
          <button type="button"
            onClick={() => setMostrarFormExperiencia(true)}
            style={{
              ...styles.button, width: '100%', padding: '12px',
              background: `${tema.primaria}10`, color: tema.primaria,
              border: `2px dashed ${tema.primaria}40`, fontWeight: 600, fontSize: '13px',
              cursor: 'pointer', borderRadius: '10px',
            }}>
            + Adicionar Experiência
          </button>
        )}
      </div>

      {/* Disclaimer */}
      <div style={{
        padding: '10px 14px',
        background: tema.backgroundSecundario,
        border: `1px solid ${tema.cardBorda}`,
        borderRadius: '8px',
        marginBottom: '16px',
      }}>
        <div style={{ fontSize: '10px', color: tema.textoSecundario, fontStyle: 'italic' }}>
          ℹ️ Este registro serve como apoio operacional. Não substitui o registro oficial no ValeForms.
        </div>
      </div>

      {/* Erros */}
      {errosDSS.length > 0 && (
        <div style={{
          padding: '12px',
          background: `${tema.perigo}10`,
          border: `2px solid ${tema.perigo}40`,
          borderRadius: '8px',
          marginBottom: '16px',
        }}>
          <div style={{ fontWeight: 700, color: tema.perigo, marginBottom: '6px', fontSize: '12px' }}>
            ⚠️ Campos obrigatórios pendentes:
          </div>
          {errosDSS.map((erro, idx) => (
            <div key={idx} style={{ fontSize: '11px', color: tema.perigo, marginLeft: '16px' }}>• {erro}</div>
          ))}
        </div>
      )}

      {/* Botões */}
      <div style={{ display: 'flex', gap: '12px', justifyContent: 'flex-end' }}>
        <button
          type="button"
          onClick={limparDSS}
          style={{
            ...styles.button,
            padding: '12px 20px',
            background: tema.buttonInativo,
            color: tema.texto,
            border: `1px solid ${tema.cardBorda}`,
          }}
        >
          🗑️ Limpar
        </button>
        <button
          type="button"
          onClick={handleSalvar}
          disabled={!podeFinalizarDSS || !!erroTemaDuplicado}
          style={{
            ...styles.button,
            padding: '12px 28px',
            background: podeFinalizarDSS && !erroTemaDuplicado ? tema.sucesso : tema.buttonInativo,
            color: podeFinalizarDSS && !erroTemaDuplicado ? '#fff' : tema.textoSecundario,
            cursor: podeFinalizarDSS && !erroTemaDuplicado ? 'pointer' : 'not-allowed',
            fontWeight: 700,
          }}
        >
          ✓ Registrar DSS
        </button>
      </div>
    </div>
  );
};

export default PaginaDSS;
