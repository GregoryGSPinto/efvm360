// ============================================================================
// EFVM360 v3.2 — Página Histórico
// Extraída de App.tsx renderHistorico() — ~840 linhas
// ============================================================================

import { useMemo } from 'react';
import type { PaginaHistoricoProps } from '../types';
import { SectionHeader, Card } from '../../components';
import { obterLogsPorMatricula, obterResumoAtividades } from '../../services/logging';
import type { LogEntry } from '../../services/logging';
import { TEMAS_DSS_SUGERIDOS } from '../../utils/constants';

export default function PaginaHistorico(props: PaginaHistoricoProps): JSX.Element {
  const {
    tema, styles, historicoTurnos, historicoDSS, usuarioLogado,
    secaoHistoricoAtiva, setSecaoHistoricoAtiva, filtroTemaHistorico,
    setFiltroTemaHistorico, filtroPeriodoHistorico, setFiltroPeriodoHistorico,
    temasExpandidos, setTemasExpandidos,
  } = props;

  // Dados derivados
  const logsUsuario = useMemo(() => usuarioLogado ? obterLogsPorMatricula(usuarioLogado.matricula) : [], [usuarioLogado]);

    // Filtra passagens pelo usuário logado
    const historicoFiltrado = usuarioLogado
      ? historicoTurnos.filter(
          (reg) =>
            reg.assinaturas?.sai?.matricula === usuarioLogado.matricula ||
            reg.assinaturas?.entra?.matricula === usuarioLogado.matricula ||
            reg.cabecalho?.responsavel === usuarioLogado.matricula
        )
      : [];

    // Resumo de atividades
    const resumo = usuarioLogado ? obterResumoAtividades(usuarioLogado.matricula) : null;

    // ========== FUNÇÕES DE FILTRO POR PERÍODO ==========
    const filtrarPorPeriodo = <T extends { timestamp?: string; identificacao?: { data: string } }>(
      lista: T[]
    ): T[] => {
      if (filtroPeriodoHistorico === 'todos') return lista;
      
      const agora = new Date();
      const diasFiltro = filtroPeriodoHistorico === '7dias' ? 7 : 
                         filtroPeriodoHistorico === '30dias' ? 30 : 90;
      const dataLimite = new Date(agora.getTime() - diasFiltro * 24 * 60 * 60 * 1000);
      
      return lista.filter(item => {
        const dataItem = item.timestamp ? new Date(item.timestamp) : 
                        item.identificacao?.data ? new Date(item.identificacao.data) : null;
        return dataItem && dataItem >= dataLimite;
      });
    };

    // ========== DSS AGRUPADO POR TEMAS ==========
    const dssFiltradasPorPeriodo = filtrarPorPeriodo(historicoDSS);
    
    // Extrai temas únicos do histórico de DSS (SEM useMemo)
    const temasUnicosCalc = (() => {
      const temas = new Set<string>();
      dssFiltradasPorPeriodo.forEach(dss => {
        if (dss.tema) {
          const temaInfo = TEMAS_DSS_SUGERIDOS.find(t => 
            dss.tema.toLowerCase().includes(t.tema.toLowerCase()) ||
            t.tema.toLowerCase().includes(dss.tema.toLowerCase())
          );
          temas.add(temaInfo?.categoria || 'Outros');
        }
      });
      return Array.from(temas).sort();
    })();
    const temasUnicos = temasUnicosCalc;

    // Agrupa DSS por categoria de tema (SEM useMemo)
    const dssAgrupadoPorTema = (() => {
      const grupos: Record<string, typeof historicoDSS> = {};
      
      dssFiltradasPorPeriodo.forEach(dss => {
        if (!dss.tema) return;
        
        // Encontra a categoria do tema
        const temaInfo = TEMAS_DSS_SUGERIDOS.find(t => 
          dss.tema.toLowerCase().includes(t.tema.toLowerCase()) ||
          t.tema.toLowerCase().includes(dss.tema.toLowerCase())
        );
        const categoria = temaInfo?.categoria || 'Outros';
        
        if (!grupos[categoria]) grupos[categoria] = [];
        grupos[categoria].push(dss);
      });
      
      // Ordena cada grupo por data (mais recente primeiro)
      Object.keys(grupos).forEach(cat => {
        grupos[cat].sort((a, b) => 
          new Date(b.timestamp || b.identificacao.data).getTime() - 
          new Date(a.timestamp || a.identificacao.data).getTime()
        );
      });
      
      return grupos;
    })();

    // ========== RANKINGS INFORMATIVOS ==========
    // Ranking de DSS por facilitador (SEM useMemo)
    const rankingDSS = (() => {
      const contagem: Record<string, { nome: string; quantidade: number; temas: Set<string> }> = {};
      
      const dssFiltradas = filtroTemaHistorico === 'todos' 
        ? dssFiltradasPorPeriodo 
        : dssFiltradasPorPeriodo.filter(dss => {
            const temaInfo = TEMAS_DSS_SUGERIDOS.find(t => 
              dss.tema.toLowerCase().includes(t.tema.toLowerCase())
            );
            return temaInfo?.categoria === filtroTemaHistorico;
          });
      
      dssFiltradas.forEach(dss => {
        const facilitador = dss.identificacao?.facilitador || 'Não informado';
        if (!contagem[facilitador]) {
          contagem[facilitador] = { nome: facilitador, quantidade: 0, temas: new Set() };
        }
        contagem[facilitador].quantidade++;
        if (dss.tema) {
          const temaInfo = TEMAS_DSS_SUGERIDOS.find(t => 
            dss.tema.toLowerCase().includes(t.tema.toLowerCase())
          );
          contagem[facilitador].temas.add(temaInfo?.categoria || 'Outros');
        }
      });
      
      return Object.values(contagem)
        .map(c => ({ ...c, temas: Array.from(c.temas).join(', ') }))
        .sort((a, b) => b.quantidade - a.quantidade)
        .slice(0, 5);
    })();

    // Ranking de Troca de Turno (SEM useMemo)
    const rankingPassagem = (() => {
      const contagem: Record<string, { nome: string; matricula: string; quantidade: number; temas: Set<string> }> = {};
      
      const passagensFiltradas = filtrarPorPeriodo(historicoTurnos);
      
      passagensFiltradas.forEach(reg => {
        // Conta quem saiu
        if (reg.assinaturas?.sai?.nome) {
          const key = reg.assinaturas.sai.matricula || reg.assinaturas.sai.nome;
          if (!contagem[key]) {
            contagem[key] = { 
              nome: reg.assinaturas.sai.nome, 
              matricula: reg.assinaturas.sai.matricula || '',
              quantidade: 0, 
              temas: new Set() 
            };
          }
          contagem[key].quantidade++;
          // Associa o tema do DSS à passagem
          if (reg.cabecalho?.dss) {
            const temaInfo = TEMAS_DSS_SUGERIDOS.find(t => 
              reg.cabecalho.dss.toLowerCase().includes(t.tema.toLowerCase())
            );
            contagem[key].temas.add(temaInfo?.categoria || 'Operacional');
          }
        }
        
        // Conta quem entrou
        if (reg.assinaturas?.entra?.nome) {
          const key = reg.assinaturas.entra.matricula || reg.assinaturas.entra.nome;
          if (!contagem[key]) {
            contagem[key] = { 
              nome: reg.assinaturas.entra.nome, 
              matricula: reg.assinaturas.entra.matricula || '',
              quantidade: 0, 
              temas: new Set() 
            };
          }
          contagem[key].quantidade++;
          if (reg.cabecalho?.dss) {
            const temaInfo = TEMAS_DSS_SUGERIDOS.find(t => 
              reg.cabecalho.dss.toLowerCase().includes(t.tema.toLowerCase())
            );
            contagem[key].temas.add(temaInfo?.categoria || 'Operacional');
          }
        }
      });
      
      return Object.values(contagem)
        .map(c => ({ ...c, temas: Array.from(c.temas).join(', ') || 'Geral' }))
        .sort((a, b) => b.quantidade - a.quantidade)
        .slice(0, 5);
    })();

    // Toggle para expandir/retrair tema
    const toggleTema = (categoria: string) => {
      setTemasExpandidos(prev => ({ ...prev, [categoria]: !prev[categoria] }));
    };

    // Menu de navegação do Histórico
    const menuHistorico = [
      { id: 'resumo' as const, icon: '📊', label: 'Meu Resumo' },
      { id: 'atividades' as const, icon: '📋', label: 'Atividades Recentes' },
      { id: 'dss-temas' as const, icon: '📚', label: 'DSS por Temas' },
      { id: 'rankings' as const, icon: '🏆', label: 'Rankings' },
    ];

    // ========== ATIVIDADES RECENTES (LINHA DO TEMPO) ==========
    const atividadesRecentes = (() => {
      const atividades: Array<{
        id: string;
        tipo: 'DSS' | 'PASSAGEM' | 'ALERTA' | 'LOGIN' | 'LOGOUT';
        titulo: string;
        descricao: string;
        data: string;
        hora: string;
        usuario: string;
        icone: string;
        cor: string;
      }> = [];

      // Adiciona DSS
      dssFiltradasPorPeriodo.forEach(dss => {
        atividades.push({
          id: dss.id || dss.dataHoraCriacao,
          tipo: 'DSS',
          titulo: `DSS: ${dss.tema}`,
          descricao: dss.topico ? `Tópico: ${dss.topico}` : 'Registro de Diálogo de Segurança',
          data: dss.identificacao.data,
          hora: dss.identificacao.horario,
          usuario: dss.identificacao.facilitador,
          icone: '💬',
          cor: tema.info,
        });
      });

      // Adiciona Passagens
      filtrarPorPeriodo(historicoTurnos).forEach(reg => {
        atividades.push({
          id: reg.id.toString(),
          tipo: 'PASSAGEM',
          titulo: `Passagem: ${reg.cabecalho.turno || 'Turno'}`,
          descricao: reg.cabecalho.dss ? `DSS: ${reg.cabecalho.dss}` : 'Troca de Turno registrada',
          data: reg.cabecalho.data,
          hora: reg.cabecalho.horario,
          usuario: reg.assinaturas?.sai?.nome || 'Operador',
          icone: '📋',
          cor: tema.sucesso,
        });
      });

      // Adiciona Logs de login/logout
      logsUsuario.slice(0, 20).forEach(log => {
        if (log.tipo === 'LOGIN' || log.tipo === 'LOGOUT' || log.tipo === 'LOGOUT_TIMEOUT') {
          const dataLog = new Date(log.timestamp);
          atividades.push({
            id: log.id,
            tipo: log.tipo === 'LOGIN' ? 'LOGIN' : 'LOGOUT',
            titulo: log.tipo === 'LOGIN' ? 'Login realizado' : log.tipo === 'LOGOUT_TIMEOUT' ? 'Sessão expirada' : 'Logout realizado',
            descricao: log.descricao,
            data: dataLog.toISOString().split('T')[0],
            hora: dataLog.toTimeString().slice(0, 5),
            usuario: usuarioLogado?.nome || 'Usuário',
            icone: log.tipo === 'LOGIN' ? '🔓' : '🔒',
            cor: log.tipo === 'LOGIN' ? tema.sucesso : tema.textoSecundario,
          });
        }
      });

      // Ordena por data/hora (mais recente primeiro)
      return atividades.sort((a, b) => {
        const dataA = new Date(`${a.data}T${a.hora || '00:00'}`);
        const dataB = new Date(`${b.data}T${b.hora || '00:00'}`);
        return dataB.getTime() - dataA.getTime();
      }).slice(0, 50); // Limita a 50 atividades
    })();

    // ========== RENDERIZAÇÃO DE SEÇÕES ==========
    
    // Seção: Atividades Recentes (NOVO)
    const renderAtividadesRecentes = () => (
      <>
        {/* Header */}
        <Card title="📋 Linha do Tempo - Atividades Recentes" styles={styles}>
          <div style={{ fontSize: '12px', color: tema.textoSecundario, marginBottom: '16px' }}>
            Visualização cronológica de todas as atividades registradas. Somente leitura.
          </div>

          {/* Filtro de período */}
          <div style={{ 
            display: 'flex', 
            alignItems: 'center', 
            gap: '12px', 
            marginBottom: '20px',
            padding: '12px 16px',
            background: tema.backgroundSecundario,
            borderRadius: '10px',
          }}>
            <label style={{ fontSize: '12px', color: tema.texto, fontWeight: 600 }}>Período:</label>
            <select
              style={{ ...styles.select, minWidth: '150px', padding: '8px 12px' }}
              value={filtroPeriodoHistorico}
              onChange={(e) => setFiltroPeriodoHistorico(e.target.value as typeof filtroPeriodoHistorico)}
            >
              <option value="7dias">Últimos 7 dias</option>
              <option value="30dias">Últimos 30 dias</option>
              <option value="90dias">Últimos 90 dias</option>
              <option value="todos">Todo o período</option>
            </select>
            <div style={{ marginLeft: 'auto', fontSize: '12px', color: tema.textoSecundario }}>
              {atividadesRecentes.length} atividade(s)
            </div>
          </div>

          {/* Linha do Tempo */}
          {atividadesRecentes.length === 0 ? (
            <div style={{ textAlign: 'center', padding: '40px', color: tema.textoSecundario }}>
              <div style={{ fontSize: '48px', marginBottom: '16px' }}>📭</div>
              <div style={{ fontSize: '15px' }}>Nenhuma atividade encontrada no período selecionado.</div>
            </div>
          ) : (
            <div style={{ position: 'relative' }}>
              {/* Linha vertical */}
              <div style={{
                position: 'absolute',
                left: '20px',
                top: '0',
                bottom: '0',
                width: '2px',
                background: `linear-gradient(to bottom, ${tema.primaria}40, ${tema.cardBorda})`,
              }} />

              {/* Itens da linha do tempo */}
              {atividadesRecentes.map((atividade, idx) => (
                <div
                  key={atividade.id}
                  style={{
                    display: 'flex',
                    gap: '16px',
                    marginBottom: '16px',
                    position: 'relative',
                    paddingLeft: '50px',
                  }}
                >
                  {/* Marcador */}
                  <div style={{
                    position: 'absolute',
                    left: '8px',
                    width: '26px',
                    height: '26px',
                    borderRadius: '50%',
                    background: `${atividade.cor}20`,
                    border: `3px solid ${atividade.cor}`,
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    fontSize: '12px',
                    zIndex: 1,
                  }}>
                    {atividade.icone}
                  </div>

                  {/* Conteúdo */}
                  <div style={{
                    flex: 1,
                    padding: '14px 18px',
                    background: idx === 0 ? `${atividade.cor}10` : tema.backgroundSecundario,
                    borderRadius: '12px',
                    border: `1px solid ${idx === 0 ? atividade.cor : tema.cardBorda}40`,
                  }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '6px', flexWrap: 'wrap', gap: '8px' }}>
                      <div>
                        <div style={{ fontWeight: 700, color: tema.texto, fontSize: '14px' }}>
                          {atividade.titulo}
                        </div>
                        <div style={{ fontSize: '12px', color: tema.textoSecundario, marginTop: '2px' }}>
                          {atividade.descricao}
                        </div>
                      </div>
                      <div style={{
                        padding: '4px 10px',
                        background: `${atividade.cor}15`,
                        borderRadius: '6px',
                        fontSize: '10px',
                        fontWeight: 600,
                        color: atividade.cor,
                        textTransform: 'uppercase',
                      }}>
                        {atividade.tipo}
                      </div>
                    </div>
                    <div style={{ display: 'flex', gap: '16px', fontSize: '11px', color: tema.textoSecundario, marginTop: '8px' }}>
                      <span>📅 {new Date(atividade.data).toLocaleDateString('pt-BR')}</span>
                      <span>🕐 {atividade.hora}</span>
                      <span>👤 {atividade.usuario}</span>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </Card>

        {/* Legenda */}
        <Card title="📌 Legenda de Tipos" styles={styles}>
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: '12px' }}>
            {[
              { tipo: 'DSS', icone: '💬', cor: tema.info, desc: 'Diálogo de Segurança' },
              { tipo: 'PASSAGEM', icone: '📋', cor: tema.sucesso, desc: 'Troca de Turno' },
              { tipo: 'LOGIN', icone: '🔓', cor: tema.sucesso, desc: 'Acesso ao sistema' },
              { tipo: 'LOGOUT', icone: '🔒', cor: tema.textoSecundario, desc: 'Saída do sistema' },
            ].map(item => (
              <div key={item.tipo} style={{
                display: 'flex',
                alignItems: 'center',
                gap: '8px',
                padding: '8px 12px',
                background: `${item.cor}10`,
                borderRadius: '8px',
                border: `1px solid ${item.cor}30`,
              }}>
                <span style={{ fontSize: '16px' }}>{item.icone}</span>
                <div>
                  <div style={{ fontWeight: 600, color: item.cor, fontSize: '11px' }}>{item.tipo}</div>
                  <div style={{ fontSize: '10px', color: tema.textoSecundario }}>{item.desc}</div>
                </div>
              </div>
            ))}
          </div>
        </Card>
      </>
    );
    const renderResumo = () => (
      <>
        {/* Resumo de Atividades do Usuário */}
        {usuarioLogado && resumo && (
          <Card title={`📊 Resumo de Atividades - ${usuarioLogado.nome}`} styles={styles}>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(min(140px, 100%), 1fr))', gap: '16px' }}>
              <div style={{ textAlign: 'center', padding: '16px', background: `${tema.primaria}15`, borderRadius: '12px' }}>
                <div style={{ fontSize: '28px', fontWeight: 700, color: tema.primaria }}>{resumo.totalAcoes}</div>
                <div style={{ fontSize: '11px', color: tema.textoSecundario, marginTop: '4px' }}>Total de Ações</div>
              </div>
              <div style={{ textAlign: 'center', padding: '16px', background: `${tema.sucesso}15`, borderRadius: '12px' }}>
                <div style={{ fontSize: '28px', fontWeight: 700, color: tema.sucesso }}>{resumo.passagensCriadas}</div>
                <div style={{ fontSize: '11px', color: tema.textoSecundario, marginTop: '4px' }}>Passagens</div>
              </div>
              <div style={{ textAlign: 'center', padding: '16px', background: `${tema.info}15`, borderRadius: '12px' }}>
                <div style={{ fontSize: '28px', fontWeight: 700, color: tema.info }}>{resumo.diasAtivos}</div>
                <div style={{ fontSize: '11px', color: tema.textoSecundario, marginTop: '4px' }}>Dias Ativos</div>
              </div>
              <div style={{ textAlign: 'center', padding: '16px', background: `${tema.aviso}15`, borderRadius: '12px' }}>
                <div style={{ fontSize: '12px', fontWeight: 600, color: tema.aviso }}>
                  {resumo.ultimoLogin ? new Date(resumo.ultimoLogin).toLocaleDateString('pt-BR') : '-'}
                </div>
                <div style={{ fontSize: '11px', color: tema.textoSecundario, marginTop: '4px' }}>Último Login</div>
              </div>
            </div>
          </Card>
        )}

        {/* Passagens do Usuário */}
        <Card title={`📋 Minhas Passagens (${historicoFiltrado.length})`} styles={styles}>
          {historicoFiltrado.length === 0 ? (
            <div style={{ textAlign: 'center', padding: '32px', color: tema.textoSecundario }}>
              <div style={{ fontSize: '40px', marginBottom: '12px' }}>📁</div>
              <div>Você ainda não possui passagens registradas.</div>
            </div>
          ) : (
            historicoFiltrado.slice(0, 10).map((registro) => (
              <div key={registro.id} style={{ padding: '16px', borderBottom: `1px solid ${tema.cardBorda}`, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <div>
                  <div style={{ fontWeight: 700, color: tema.texto }}>{registro.cabecalho.turno}</div>
                  <div style={{ fontSize: '13px', color: tema.textoSecundario }}>{registro.cabecalho.data} às {registro.cabecalho.horario}</div>
                </div>
                <div style={{ textAlign: 'right', fontSize: '12px' }}>
                  <div style={{ color: tema.textoSecundario }}>Saiu: {registro.assinaturas.sai.nome || '-'}</div>
                  <div style={{ color: tema.textoSecundario }}>Entrou: {registro.assinaturas.entra.nome || '-'}</div>
                </div>
              </div>
            ))
          )}
        </Card>

        {/* Log de Atividades Recentes */}
        <Card title={`📝 Log de Atividades (últimos 20)`} styles={styles}>
          {logsUsuario.length === 0 ? (
            <div style={{ textAlign: 'center', padding: '24px', color: tema.textoSecundario }}>Nenhuma atividade registrada.</div>
          ) : (
            <div style={{ maxHeight: '400px', overflowY: 'auto' }}>
              {logsUsuario.slice(0, 20).map((log: LogEntry) => (
                <div key={log.id} style={{ padding: '12px', borderBottom: `1px solid ${tema.cardBorda}`, display: 'flex', alignItems: 'center', gap: '12px' }}>
                  <div style={{ width: '36px', height: '36px', borderRadius: '50%', background: log.tipo === 'LOGIN' ? `${tema.sucesso}20` : log.tipo === 'LOGOUT' || log.tipo === 'LOGOUT_TIMEOUT' ? `${tema.perigo}20` : `${tema.info}20`, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '16px' }}>
                    {log.tipo === 'LOGIN' ? '🔓' : log.tipo === 'LOGOUT' ? '🔒' : log.tipo === 'LOGOUT_TIMEOUT' ? '⏰' : log.tipo === 'PASSAGEM_CRIADA' ? '📋' : log.tipo === 'PASSAGEM_ENVIADA' ? '✅' : log.tipo === 'ASSINATURA_DIGITAL' ? '✍️' : log.tipo === 'CONFIGURACAO_ALTERADA' ? '⚙️' : '📌'}
                  </div>
                  <div style={{ flex: 1 }}>
                    <div style={{ fontSize: '13px', color: tema.texto }}>{log.descricao}</div>
                    <div style={{ fontSize: '11px', color: tema.textoSecundario }}>{new Date(log.timestamp).toLocaleString('pt-BR')}</div>
                  </div>
                  <div style={{ padding: '4px 8px', background: tema.buttonInativo, borderRadius: '6px', fontSize: '10px', color: tema.textoSecundario }}>{log.tipo.replace('_', ' ')}</div>
                </div>
              ))}
            </div>
          )}
        </Card>
      </>
    );

    // Seção: DSS por Temas
    const renderDSSPorTemas = () => (
      <>
        {/* Filtro de Período */}
        <Card title="🔍 Filtros de Visualização" styles={styles}>
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: '12px', alignItems: 'center' }}>
            <div>
              <label style={{ ...styles.label, marginBottom: '6px', display: 'block' }}>Período</label>
              <select
                style={{ ...styles.select, minWidth: '150px' }}
                value={filtroPeriodoHistorico}
                onChange={(e) => setFiltroPeriodoHistorico(e.target.value as typeof filtroPeriodoHistorico)}
              >
                <option value="7dias">Últimos 7 dias</option>
                <option value="30dias">Últimos 30 dias</option>
                <option value="90dias">Últimos 90 dias</option>
                <option value="todos">Todo o período</option>
              </select>
            </div>
            <div style={{ marginLeft: 'auto', padding: '12px 16px', background: `${tema.info}15`, borderRadius: '10px' }}>
              <span style={{ fontSize: '13px', color: tema.textoSecundario }}>Total de registros: </span>
              <strong style={{ color: tema.info }}>{dssFiltradasPorPeriodo.length} DSS</strong>
            </div>
          </div>
        </Card>

        {/* DSS Agrupados por Tema */}
        <Card title="📚 Registros de DSS por Tema" styles={styles}>
          {Object.keys(dssAgrupadoPorTema).length === 0 ? (
            <div style={{ textAlign: 'center', padding: '40px', color: tema.textoSecundario }}>
              <div style={{ fontSize: '48px', marginBottom: '16px' }}>📭</div>
              <div style={{ fontSize: '15px' }}>Nenhum registro de DSS encontrado no período selecionado.</div>
            </div>
          ) : (
            Object.entries(dssAgrupadoPorTema)
              .sort(([a], [b]) => a.localeCompare(b))
              .map(([categoria, registros]) => (
                <div key={categoria} style={{ marginBottom: '16px', border: `1px solid ${tema.cardBorda}`, borderRadius: '12px', overflow: 'hidden' }}>
                  {/* Cabeçalho do Grupo (Clicável) */}
                  <button
                    onClick={() => toggleTema(categoria)}
                    style={{
                      width: '100%',
                      padding: '16px 20px',
                      background: temasExpandidos[categoria] ? `${tema.primaria}15` : tema.backgroundSecundario,
                      border: 'none',
                      cursor: 'pointer',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'space-between',
                      transition: 'background 0.2s ease',
                    }}
                  >
                    <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                      <span style={{ fontSize: '20px' }}>
                        {categoria === 'Segurança' ? '🛡️' : 
                         categoria === 'Saúde' ? '💚' : 
                         categoria === 'Meio Ambiente' ? '🌿' : 
                         categoria === 'Comportamento' ? '🤝' : 
                         categoria === 'Aprendizado' ? '📖' : 
                         categoria === 'Procedimento' ? '📋' : 
                         categoria === 'Valor Vale' ? '💎' : '📁'}
                      </span>
                      <div style={{ textAlign: 'left' }}>
                        <div style={{ fontWeight: 700, color: tema.texto, fontSize: '15px' }}>{categoria}</div>
                        <div style={{ fontSize: '12px', color: tema.textoSecundario }}>{registros.length} registro(s)</div>
                      </div>
                    </div>
                    <span style={{ fontSize: '20px', color: tema.textoSecundario, transition: 'transform 0.2s ease', transform: temasExpandidos[categoria] ? 'rotate(180deg)' : 'rotate(0deg)' }}>
                      ▼
                    </span>
                  </button>
                  
                  {/* Lista de DSS do Grupo (Expansível) */}
                  {temasExpandidos[categoria] && (
                    <div style={{ maxHeight: '400px', overflowY: 'auto' }}>
                      {registros.map((dss, idx) => (
                        <div
                          key={dss.id || idx}
                          style={{
                            padding: '14px 20px',
                            borderTop: `1px solid ${tema.cardBorda}`,
                            background: idx % 2 === 0 ? 'transparent' : `${tema.backgroundSecundario}50`,
                          }}
                        >
                          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '8px' }}>
                            <div style={{ flex: 1 }}>
                              <div style={{ fontWeight: 600, color: tema.texto, fontSize: '14px' }}>{dss.tema}</div>
                              {dss.topico && (
                                <div style={{ fontSize: '12px', color: tema.primaria, marginTop: '2px' }}>📌 {dss.topico}</div>
                              )}
                            </div>
                            <div style={{ textAlign: 'right', fontSize: '11px', color: tema.textoSecundario }}>
                              <div>{dss.identificacao?.data}</div>
                              <div>{dss.identificacao?.turno || `Turno ${dss.identificacao?.turnoLetra}`}</div>
                            </div>
                          </div>
                          <div style={{ display: 'flex', gap: '16px', fontSize: '12px', color: tema.textoSecundario }}>
                            <span>👤 {dss.identificacao?.facilitador || 'Não informado'}</span>
                            <span>🕐 {dss.identificacao?.horario}</span>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              ))
          )}
        </Card>
      </>
    );

    // Seção: Rankings
    const renderRankings = () => (
      <>
        {/* Filtros */}
        <Card title="🔍 Filtros de Ranking" styles={styles}>
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: '16px', alignItems: 'flex-end' }}>
            <div>
              <label style={{ ...styles.label, marginBottom: '6px', display: 'block' }}>Período</label>
              <select
                style={{ ...styles.select, minWidth: '150px' }}
                value={filtroPeriodoHistorico}
                onChange={(e) => setFiltroPeriodoHistorico(e.target.value as typeof filtroPeriodoHistorico)}
              >
                <option value="7dias">Últimos 7 dias</option>
                <option value="30dias">Últimos 30 dias</option>
                <option value="90dias">Últimos 90 dias</option>
                <option value="todos">Todo o período</option>
              </select>
            </div>
            <div>
              <label style={{ ...styles.label, marginBottom: '6px', display: 'block' }}>Tema (DSS)</label>
              <select
                style={{ ...styles.select, minWidth: '180px' }}
                value={filtroTemaHistorico}
                onChange={(e) => setFiltroTemaHistorico(e.target.value)}
              >
                <option value="todos">Todos os temas</option>
                {temasUnicos.map(categoriaTema => (
                  <option key={categoriaTema} value={categoriaTema}>{categoriaTema}</option>
                ))}
              </select>
            </div>
          </div>
        </Card>

        {/* Aviso Informativo */}
        <div style={{ padding: '14px 18px', background: `${tema.info}10`, border: `1px solid ${tema.info}30`, borderRadius: '12px', marginBottom: '16px', display: 'flex', alignItems: 'center', gap: '12px' }}>
          <span style={{ fontSize: '20px' }}>ℹ️</span>
          <div style={{ fontSize: '13px', color: tema.texto }}>
            <strong>Rankings Informativos:</strong> Estes rankings são apenas para fins de acompanhamento e reconhecimento da participação. 
            Não possuem caráter avaliativo ou punitivo.
          </div>
        </div>

        {/* Ranking de DSS */}
        <Card title="🏆 Top 5 - Maior Participação em DSS" styles={styles}>
          {rankingDSS.length === 0 ? (
            <div style={{ textAlign: 'center', padding: '32px', color: tema.textoSecundario }}>
              <div style={{ fontSize: '40px', marginBottom: '12px' }}>📊</div>
              <div>Nenhum registro de DSS no período selecionado.</div>
            </div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
              {rankingDSS.map((item, idx) => (
                <div
                  key={item.nome}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: '16px',
                    padding: '16px',
                    background: idx === 0 ? `${tema.secundaria}15` : idx === 1 ? `${tema.info}10` : idx === 2 ? `${tema.aviso}10` : tema.backgroundSecundario,
                    borderRadius: '12px',
                    border: `1px solid ${idx === 0 ? tema.secundaria : tema.cardBorda}40`,
                  }}
                >
                  {/* Posição */}
                  <div style={{
                    width: '44px',
                    height: '44px',
                    borderRadius: '50%',
                    background: idx === 0 ? tema.secundaria : idx === 1 ? tema.info : idx === 2 ? tema.aviso : tema.buttonInativo,
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    fontSize: idx < 3 ? '20px' : '16px',
                    fontWeight: 700,
                    color: idx < 3 ? '#fff' : tema.texto,
                  }}>
                    {idx === 0 ? '🥇' : idx === 1 ? '🥈' : idx === 2 ? '🥉' : idx + 1}
                  </div>
                  
                  {/* Nome e Temas */}
                  <div style={{ flex: 1 }}>
                    <div style={{ fontWeight: 600, color: tema.texto, fontSize: '15px' }}>{item.nome}</div>
                    <div style={{ fontSize: '12px', color: tema.textoSecundario, marginTop: '2px' }}>
                      Temas: {item.temas || 'Diversos'}
                    </div>
                  </div>
                  
                  {/* Quantidade */}
                  <div style={{ textAlign: 'right' }}>
                    <div style={{ fontSize: '24px', fontWeight: 700, color: idx === 0 ? tema.secundaria : tema.primaria }}>{item.quantidade}</div>
                    <div style={{ fontSize: '11px', color: tema.textoSecundario }}>registro(s)</div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </Card>

        {/* Ranking de Troca de Turno */}
        <Card title="🏆 Top 5 - Maior Participação em Troca de Turno" styles={styles}>
          {rankingPassagem.length === 0 ? (
            <div style={{ textAlign: 'center', padding: '32px', color: tema.textoSecundario }}>
              <div style={{ fontSize: '40px', marginBottom: '12px' }}>📊</div>
              <div>Nenhuma troca de turno no período selecionado.</div>
            </div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
              {rankingPassagem.map((item, idx) => (
                <div
                  key={item.matricula || item.nome}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: '16px',
                    padding: '16px',
                    background: idx === 0 ? `${tema.secundaria}15` : idx === 1 ? `${tema.info}10` : idx === 2 ? `${tema.aviso}10` : tema.backgroundSecundario,
                    borderRadius: '12px',
                    border: `1px solid ${idx === 0 ? tema.secundaria : tema.cardBorda}40`,
                  }}
                >
                  {/* Posição */}
                  <div style={{
                    width: '44px',
                    height: '44px',
                    borderRadius: '50%',
                    background: idx === 0 ? tema.secundaria : idx === 1 ? tema.info : idx === 2 ? tema.aviso : tema.buttonInativo,
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    fontSize: idx < 3 ? '20px' : '16px',
                    fontWeight: 700,
                    color: idx < 3 ? '#fff' : tema.texto,
                  }}>
                    {idx === 0 ? '🥇' : idx === 1 ? '🥈' : idx === 2 ? '🥉' : idx + 1}
                  </div>
                  
                  {/* Nome e Matrícula */}
                  <div style={{ flex: 1 }}>
                    <div style={{ fontWeight: 600, color: tema.texto, fontSize: '15px' }}>{item.nome}</div>
                    <div style={{ fontSize: '12px', color: tema.textoSecundario, marginTop: '2px' }}>
                      {item.matricula && `Mat: ${item.matricula} • `}Temas: {item.temas}
                    </div>
                  </div>
                  
                  {/* Quantidade */}
                  <div style={{ textAlign: 'right' }}>
                    <div style={{ fontSize: '24px', fontWeight: 700, color: idx === 0 ? tema.secundaria : tema.primaria }}>{item.quantidade}</div>
                    <div style={{ fontSize: '11px', color: tema.textoSecundario }}>participação(ões)</div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </Card>

        {/* Estatísticas Gerais */}
        <Card title="📈 Estatísticas do Período" styles={styles}>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(min(180px, 100%), 1fr))', gap: '16px' }}>
            <div style={{ textAlign: 'center', padding: '20px', background: `${tema.primaria}10`, borderRadius: '12px', border: `1px solid ${tema.primaria}30` }}>
              <div style={{ fontSize: '32px', fontWeight: 700, color: tema.primaria }}>{dssFiltradasPorPeriodo.length}</div>
              <div style={{ fontSize: '12px', color: tema.textoSecundario, marginTop: '4px' }}>Total de DSS</div>
            </div>
            <div style={{ textAlign: 'center', padding: '20px', background: `${tema.sucesso}10`, borderRadius: '12px', border: `1px solid ${tema.sucesso}30` }}>
              <div style={{ fontSize: '32px', fontWeight: 700, color: tema.sucesso }}>{filtrarPorPeriodo(historicoTurnos).length}</div>
              <div style={{ fontSize: '12px', color: tema.textoSecundario, marginTop: '4px' }}>Total de Passagens</div>
            </div>
            <div style={{ textAlign: 'center', padding: '20px', background: `${tema.info}10`, borderRadius: '12px', border: `1px solid ${tema.info}30` }}>
              <div style={{ fontSize: '32px', fontWeight: 700, color: tema.info }}>{temasUnicos.length}</div>
              <div style={{ fontSize: '12px', color: tema.textoSecundario, marginTop: '4px' }}>Categorias de Temas</div>
            </div>
            <div style={{ textAlign: 'center', padding: '20px', background: `${tema.aviso}10`, borderRadius: '12px', border: `1px solid ${tema.aviso}30` }}>
              <div style={{ fontSize: '32px', fontWeight: 700, color: tema.aviso }}>{rankingDSS.length + rankingPassagem.length}</div>
              <div style={{ fontSize: '12px', color: tema.textoSecundario, marginTop: '4px' }}>Participantes Ativos</div>
            </div>
          </div>
        </Card>
      </>
    );

    // ========== RENDER PRINCIPAL ==========
    return (
      <>
        <SectionHeader title="🗂️ Histórico" tema={tema} />

        {/* Layout com menu lateral */}
        <div style={{ display: 'flex', gap: '20px', flexWrap: 'wrap' }}>
          {/* Menu de Navegação */}
          <div style={{ 
            width: '200px', 
            minWidth: '160px',
            background: tema.card,
            borderRadius: '16px',
            padding: '12px',
            border: `1px solid ${tema.cardBorda}`,
            boxShadow: tema.cardSombra,
            height: 'fit-content',
            position: 'sticky',
            top: '20px',
          }}>
            <div style={{ fontSize: '11px', color: tema.textoSecundario, padding: '8px 12px', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '1px' }}>
              Navegação
            </div>
            {menuHistorico.map((item) => (
              <button
                key={item.id}
                style={{
                  width: '100%',
                  padding: '12px 14px',
                  borderRadius: '10px',
                  border: 'none',
                  background: secaoHistoricoAtiva === item.id ? `${tema.primaria}20` : 'transparent',
                  color: secaoHistoricoAtiva === item.id ? tema.primaria : tema.texto,
                  fontWeight: secaoHistoricoAtiva === item.id ? 600 : 400,
                  fontSize: '13px',
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '10px',
                  textAlign: 'left',
                  marginBottom: '4px',
                  transition: 'all 0.2s ease',
                }}
                onClick={() => setSecaoHistoricoAtiva(item.id)}
              >
                <span style={{ fontSize: '16px' }}>{item.icon}</span>
                {item.label}
              </button>
            ))}
          </div>

          {/* Conteúdo Principal */}
          <div style={{ flex: 1, minWidth: '300px' }}>
            {secaoHistoricoAtiva === 'resumo' && renderResumo()}
            {secaoHistoricoAtiva === 'atividades' && renderAtividadesRecentes()}
            {secaoHistoricoAtiva === 'dss-temas' && renderDSSPorTemas()}
            {secaoHistoricoAtiva === 'rankings' && renderRankings()}
          </div>
        </div>
      </>
    );
}
