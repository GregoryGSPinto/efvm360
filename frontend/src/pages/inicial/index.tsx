// ============================================================================
// EFVM360 v3.2 — Página Inicial (Enterprise Dashboard)
// CSS Grid layout, personalized greeting, SVG gauge, responsive
// ============================================================================

import { useMemo, useCallback, useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import type { PaginaInicialProps } from '../types';
import { GaugeCircular, StatCard, AlertaCard, ProgressBar } from '../../components/ui';
import { ROUTES } from '../../router/routes';
import { useBriefingData } from '../../components/AdamBot/useBriefingData';
import { gerarBriefing, type ResultadoBriefing } from '../../components/AdamBot/AdamBotBriefing';
import { useAdamBotContext } from '../../components/AdamBot/AdamBotContext';
import { adamFalar } from '../../components/AdamBot/AdamBotVoice';
import { analisarTendencias, type AnaliseHistorico } from '../../components/AdamBot/AdamBotTendencias';
import {
  Sun, Moon, Calendar, TrainFront, MessageCircle, FileText,
  AlertTriangle, CheckCircle, ClipboardList, FolderOpen, ArrowRight, BarChart3,
} from 'lucide-react';

// ── Scoped styles (media queries + keyframes) ─────────────────────────────

const SCOPED_CSS = `
@keyframes efvm-pulse {
  0%, 100% { opacity: 1; }
  50% { opacity: 0.4; }
}
.efvm-pulse-dot {
  animation: efvm-pulse 1.4s ease-in-out infinite;
}
.efvm-dash-grid-stats {
  display: grid;
  grid-template-columns: repeat(4, 1fr);
  gap: 16px;
}
.efvm-dash-grid-2col {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 16px;
}
@media (max-width: 1024px) {
  .efvm-dash-grid-stats {
    grid-template-columns: repeat(2, 1fr);
  }
}
@media (max-width: 768px) {
  .efvm-dash-grid-stats {
    grid-template-columns: 1fr;
  }
  .efvm-dash-grid-2col {
    grid-template-columns: 1fr;
  }
}
`;

// ── Helpers ────────────────────────────────────────────────────────────────

function getSaudacao(t: (key: string) => string): string {
  const hora = new Date().getHours();
  if (hora < 12) return t('inicial.goodMorning');
  if (hora < 18) return t('inicial.goodAfternoon');
  return t('inicial.goodEvening');
}

function getLabelRisco(valor: number, t: (key: string) => string): string {
  if (valor <= 25) return t('inicial.riskLow');
  if (valor <= 50) return t('inicial.riskModerate');
  if (valor <= 75) return t('inicial.riskElevated');
  return t('inicial.riskCritical');
}

function formatarDataOperacional(dataStr?: string): { principal: string; secundario: string } {
  const agora = new Date();
  if (dataStr) {
    return { principal: dataStr, secundario: '' };
  }
  const dia = agora.toLocaleDateString('pt-BR', { day: '2-digit', month: 'short' }).replace('.', '');
  const semana = agora.toLocaleDateString('pt-BR', { weekday: 'long' });
  const ano = agora.getFullYear();
  return { principal: dia, secundario: `${semana}, ${ano}` };
}

// ── Component ─────────────────────────────────────────────────────────────

export default function PaginaInicial(props: PaginaInicialProps): JSX.Element {
  const {
    tema, styles, dadosFormulario, historicoTurnos, historicoDSS,
    alertasCriticos, estatisticasPatio, tempoTurnoDecorrido, temaDSSAnterior,
    obterLetraTurno, obterJanelaHoraria, setSecaoFormulario,
    usuarioLogado,
  } = props;

  const { t } = useTranslation();
  const navigate = useNavigate();

  // ── Memoized values ───────────────────────────────────────────────────

  const saudacao = useMemo(() => getSaudacao(t), [t]);

  const nomeUsuario = useMemo(() => {
    if (usuarioLogado?.nome) return usuarioLogado.nome.split(' ')[0];
    const nomeAssinatura = dadosFormulario.assinaturas?.entra?.nome;
    if (nomeAssinatura) return nomeAssinatura.split(' ')[0];
    return '';
  }, [usuarioLogado?.nome, dadosFormulario.assinaturas?.entra?.nome]);

  const funcaoLabel = useMemo(() => {
    if (!usuarioLogado?.funcao) return '';
    const map: Record<string, string> = {
      maquinista: 'Maquinista', operador: 'Operador', oficial: 'Oficial',
      oficial_operacao: 'Oficial de Operacao', inspetor: 'Inspetor',
      gestor: 'Gestor', supervisor: 'Supervisor', coordenador: 'Coordenador',
    };
    return map[usuarioLogado.funcao] || usuarioLogado.funcao;
  }, [usuarioLogado?.funcao]);

  const patioLabel = useMemo(() => usuarioLogado?.primaryYard || '', [usuarioLogado?.primaryYard]);

  const dataOp = useMemo(
    () => formatarDataOperacional(dadosFormulario.cabecalho.data),
    [dadosFormulario.cabecalho.data],
  );

  const pontuacaoRisco = useMemo(() => Math.min(100, Math.round(
    (alertasCriticos.length * 20) +
    (estatisticasPatio.total > 0
      ? (estatisticasPatio.ocupadas / estatisticasPatio.total) * 40
      : 0)
  )), [alertasCriticos.length, estatisticasPatio.ocupadas, estatisticasPatio.total]);

  // ── Memoized callbacks ────────────────────────────────────────────────

  const irParaPassagem = useCallback(() => {
    navigate(ROUTES.PASSAGEM);
    setSecaoFormulario('cabecalho');
  }, [navigate, setSecaoFormulario]);

  const continuarPassagem = useCallback(() => {
    navigate(ROUTES.PASSAGEM);
  }, [navigate]);

  const abrirDSS = useCallback(() => {
    navigate(ROUTES.DSS);
  }, [navigate]);

  const abrirBI = useCallback(() => {
    navigate(ROUTES.ANALYTICS);
  }, [navigate]);

  // ── Briefing de Turno ────────────────────────────────────────────────

  const dadosBriefing = useBriefingData();
  const [briefingEntregue, setBriefingEntregue] = useState(false);
  const [ultimoBriefing, setUltimoBriefing] = useState<ResultadoBriefing | null>(null);
  const [tendencias, setTendencias] = useState<AnaliseHistorico | null>(null);
  const { addBotMessage } = useAdamBotContext();

  // Gerar briefing no mount (sem autoplay de voz — mobile bloqueia)
  useEffect(() => {
    if (briefingEntregue) return;
    const timer = setTimeout(() => {
      const resultado = gerarBriefing(dadosBriefing);
      setUltimoBriefing(resultado);
      setBriefingEntregue(true);

      // Inject into AdamBot chat panel
      const badge = resultado.severidade === 'critico' ? 'CRITICO' : resultado.severidade === 'atencao' ? 'ATENCAO' : 'ESTAVEL';
      const msgChat = `📋 **${t('inicial.shiftBriefing')}** [${badge}]\n\n${resultado.itensDestaque.join('\n')}\n\n${resultado.severidade === 'critico' ? '⚠️ Atenção redobrada.' : resultado.severidade === 'atencao' ? '⚡ Pontos de atenção.' : '✅ Situação estável.'}`;
      addBotMessage(msgChat);

      // Trend analysis
      const analise = analisarTendencias();
      if (analise.alertas.length > 0) {
        setTendencias(analise);

        let msgTendencias = `📊 **${t('inicial.trendAnalysis')}**\n`;
        analise.alertas.forEach(a => {
          const icon = a.severidade === 'critico' ? '🔴' : a.severidade === 'aviso' ? '🟡' : 'ℹ️';
          msgTendencias += `\n${icon} ${a.titulo}`;
        });
        msgTendencias += `\n\n📈 ${analise.totalPassagensAnalisadas} ${t('inicial.analyzedHandovers')}`;
        addBotMessage(msgTendencias);
      }
    }, 2000);
    return () => clearTimeout(timer);
  }, [dadosBriefing, briefingEntregue, addBotMessage, t]);

  // Callback para ouvir briefing (requer interação do usuário — mobile-safe)
  const ouvirBriefing = useCallback(() => {
    if (!ultimoBriefing) return;
    adamFalar(ultimoBriefing.texto);
    // Falar alertas críticos 8s depois
    if (tendencias) {
      const critico = tendencias.alertas.find(a => a.severidade === 'critico');
      if (critico) {
        setTimeout(() => adamFalar(critico.descricaoVoz), 8000);
      }
    }
  }, [ultimoBriefing, tendencias]);

  // ── Derived state ─────────────────────────────────────────────────────

  const temPassagemEmAndamento = !!dadosFormulario.cabecalho.dss;
  const ocupacaoTexto = `${estatisticasPatio.ocupadas}/${estatisticasPatio.total}`;

  if (!usuarioLogado) {
    return (
      <div style={{ padding: 40, textAlign: 'center', color: tema.textoSecundario }}>
        {t('inicial.loadingOperator')}
      </div>
    );
  }

  return (
    <>
      <style>{SCOPED_CSS}</style>


      {/* ── HEADER: Greeting ──────────────────────────────────────────── */}
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          gap: 16,
          marginBottom: 24,
          padding: '20px 24px',
          background: tema.card,
          borderRadius: 14,
          border: `1px solid ${tema.cardBorda}`,
          boxShadow: tema.cardSombra,
          borderLeft: `5px solid ${tema.primaria}`,
        }}
      >
        <div style={{ flex: 1 }}>
          <div style={{ fontSize: 22, fontWeight: 700, color: tema.texto }}>
            {saudacao}{nomeUsuario ? `, ${nomeUsuario}` : ''}
          </div>
          {(funcaoLabel || patioLabel) && (
            <div style={{ fontSize: 13, color: tema.textoSecundario, marginTop: 4 }}>
              {funcaoLabel}{funcaoLabel && patioLabel ? ' — ' : ''}{patioLabel}
            </div>
          )}
        </div>
      </div>

      {/* ── BRIEFING DO TURNO ─────────────────────────────────────────── */}
      {ultimoBriefing && (
        <div style={{
          padding: '16px 20px', borderRadius: 14, marginBottom: 20,
          background: ultimoBriefing.severidade === 'critico' ? 'rgba(239,68,68,0.08)'
            : ultimoBriefing.severidade === 'atencao' ? 'rgba(245,158,11,0.08)' : 'rgba(34,197,94,0.08)',
          border: `1px solid ${ultimoBriefing.severidade === 'critico' ? '#ef4444'
            : ultimoBriefing.severidade === 'atencao' ? '#f59e0b' : '#22c55e'}30`,
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 10 }}>
            <span style={{ fontSize: 18 }}>📋</span>
            <span style={{ fontWeight: 700, fontSize: 14, color: tema.texto }}>{t('inicial.shiftBriefing')}</span>
            <span style={{
              fontSize: 10, padding: '2px 10px', borderRadius: 999, fontWeight: 700, color: '#fff',
              background: ultimoBriefing.severidade === 'critico' ? '#ef4444'
                : ultimoBriefing.severidade === 'atencao' ? '#f59e0b' : '#22c55e',
            }}>
              {ultimoBriefing.severidade === 'critico' ? t('inicial.critical') : ultimoBriefing.severidade === 'atencao' ? t('inicial.attention') : t('inicial.stable')}
            </span>
            <button
              type="button"
              onClick={ouvirBriefing}
              style={{
                marginLeft: 'auto', fontSize: 11, fontWeight: 600,
                padding: '4px 12px', borderRadius: 8, border: 'none', cursor: 'pointer',
                background: `${tema.primaria}15`, color: tema.primaria,
                display: 'flex', alignItems: 'center', gap: 4, minHeight: 32,
              }}
            >
              {t('inicial.listenBriefing')}
            </button>
            <span style={{ fontSize: 10, color: tema.textoSecundario }}>
              {new Date(ultimoBriefing.timestamp).toLocaleTimeString('pt-BR')}
            </span>
          </div>
          <div style={{ display: 'grid', gap: 4 }}>
            {ultimoBriefing.itensDestaque.map((item, i) => (
              <div key={i} style={{ fontSize: 12, color: tema.texto, lineHeight: 1.5 }}>{item}</div>
            ))}
          </div>
        </div>
      )}

      {/* ── TENDÊNCIAS ─────────────────────────────────────────────── */}
      {tendencias && tendencias.alertas.length > 0 && (
        <div style={{
          margin: '0 0 20px', padding: '16px 20px', borderRadius: 14,
          background: tendencias.alertas.some(a => a.severidade === 'critico')
            ? 'rgba(239,68,68,0.06)'
            : tendencias.alertas.some(a => a.severidade === 'aviso')
              ? 'rgba(245,158,11,0.06)'
              : 'rgba(59,130,246,0.06)',
          border: `1px solid ${
            tendencias.alertas.some(a => a.severidade === 'critico') ? '#ef4444'
            : tendencias.alertas.some(a => a.severidade === 'aviso') ? '#f59e0b'
            : '#3b82f6'
          }25`,
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 10 }}>
            <span style={{ fontSize: 16 }}>📊</span>
            <span style={{ fontWeight: 700, fontSize: 13, color: tema.texto, flex: 1 }}>
              {t('inicial.trends')} — {tendencias.periodoAnalisado}
            </span>
            <span style={{
              fontSize: 10, padding: '2px 8px', borderRadius: 999, fontWeight: 600,
              color: tema.textoSecundario, background: `${tema.texto}10`,
            }}>
              {tendencias.alertas.length} alerta{tendencias.alertas.length > 1 ? 's' : ''}
            </span>
          </div>
          {tendencias.alertas.map((alerta, i) => (
            <div key={i} style={{
              padding: '8px 12px', margin: '4px 0', borderRadius: 10,
              background: `${tema.texto}06`, fontSize: 12,
            }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 4 }}>
                <span>{
                  alerta.severidade === 'critico' ? '🔴' :
                  alerta.severidade === 'aviso' ? '🟡' :
                  alerta.tipo === 'melhoria' ? '🟢' : 'ℹ️'
                }</span>
                <span style={{ fontWeight: 600, color: tema.texto }}>{alerta.titulo}</span>
              </div>
              <div style={{ color: tema.textoSecundario, paddingLeft: 22 }}>
                {alerta.descricao}
              </div>
            </div>
          ))}
        </div>
      )}

      {/* ── ROW 1: 4x StatCards ───────────────────────────────────────── */}
      <div className="efvm-dash-grid-stats" style={{ marginBottom: 16 }}>
        {/* Turno */}
        <StatCard
          icon={obterJanelaHoraria().startsWith('07') ? <Sun size={28} /> : <Moon size={28} />}
          label={t('inicial.currentShift')}
          valor={`Turno ${obterLetraTurno()}`}
          destaque
          tema={tema}
        >
          <div style={{
            fontSize: 11,
            fontWeight: 600,
            background: `${tema.primaria}15`,
            padding: '3px 8px',
            borderRadius: 6,
            color: tema.texto,
            display: 'inline-block',
          }}>
            {obterJanelaHoraria()}
          </div>
          <div style={{
            fontSize: 16,
            fontWeight: 700,
            color: tema.sucesso,
            fontFamily: 'monospace',
            marginTop: 2,
          }}>
            {tempoTurnoDecorrido}
          </div>
        </StatCard>

        {/* Data */}
        <StatCard
          icon={<Calendar size={28} />}
          label={t('inicial.operationalDate')}
          valor={dataOp.principal}
          subtexto={dataOp.secundario}
          tema={tema}
        />

        {/* Ocupacao */}
        <StatCard
          icon={<TrainFront size={28} />}
          label={t('inicial.occupiedLines')}
          valor={ocupacaoTexto}
          tema={tema}
        >
          <div style={{ width: '100%', padding: '4px 0' }}>
            <ProgressBar valor={estatisticasPatio.ocupadas} maximo={estatisticasPatio.total} tema={tema} />
          </div>
        </StatCard>

        {/* Risco */}
        <StatCard
          icon=""
          label={t('inicial.riskLevel')}
          valor=""
          subtexto={`${alertasCriticos.length} ${t('inicial.activeAlerts')}`}
          tema={tema}
        >
          <GaugeCircular valor={pontuacaoRisco} tema={tema} tamanho={72} />
          <div style={{
            fontSize: 11,
            fontWeight: 700,
            color: pontuacaoRisco <= 25 ? tema.sucesso
              : pontuacaoRisco <= 50 ? tema.aviso
              : pontuacaoRisco <= 75 ? '#f97316'
              : tema.perigo,
            marginTop: 2,
          }}>
            {getLabelRisco(pontuacaoRisco, t)}
          </div>
        </StatCard>
      </div>

      {/* ── ROW 2: DSS + Alertas ──────────────────────────────────────── */}
      <div className="efvm-dash-grid-2col" style={{ marginBottom: 16 }}>
        {/* DSS Card */}
        <div
          style={{
            background: tema.card,
            border: `1px solid ${tema.cardBorda}`,
            borderRadius: 14,
            padding: 20,
            boxShadow: tema.cardSombra,
            display: 'flex',
            flexDirection: 'column',
            gap: 12,
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
            <MessageCircle size={32} />
            <div style={{ flex: 1 }}>
              <div style={{ fontWeight: 700, color: tema.texto, fontSize: 15 }}>
                {t('inicial.dss')}
              </div>
              <div style={{ fontSize: 12, color: tema.textoSecundario, marginTop: 2 }}>
                {temaDSSAnterior
                  ? <>{t('inicial.lastTopic')} <strong>{temaDSSAnterior}</strong></>
                  : <>{historicoDSS.length} {t('inicial.records')}</>
                }
              </div>
            </div>
          </div>
          <button
            type="button"
            onClick={abrirDSS}
            style={{
              ...styles.button,
              padding: '10px 20px',
              background: `linear-gradient(135deg, ${tema.info} 0%, ${tema.primaria} 100%)`,
              color: '#fff',
              fontWeight: 600,
              border: 'none',
              borderRadius: 10,
              cursor: 'pointer',
              width: '100%',
            }}
          >
            <FileText size={16} style={{ verticalAlign: 'middle', marginRight: 6 }} /> {t('inicial.accessDSS')}
          </button>
        </div>

        {/* Alertas Card */}
        <div
          style={{
            background: tema.card,
            border: `1px solid ${tema.cardBorda}`,
            borderRadius: 14,
            padding: 20,
            boxShadow: tema.cardSombra,
            display: 'flex',
            flexDirection: 'column',
            gap: 10,
          }}
        >
          <div style={{ fontWeight: 700, color: tema.texto, fontSize: 15, marginBottom: 4 }}>
            <AlertTriangle size={16} style={{ verticalAlign: 'middle', marginRight: 6 }} /> {t('inicial.alerts')} ({alertasCriticos.length})
          </div>
          {alertasCriticos.length === 0 ? (
            <div style={{
              display: 'flex',
              alignItems: 'center',
              gap: 10,
              padding: 16,
              background: `${tema.sucesso}10`,
              borderRadius: 10,
              border: `1px solid ${tema.sucesso}30`,
            }}>
              <CheckCircle size={24} />
              <div style={{ fontSize: 13, color: tema.sucesso, fontWeight: 600 }}>
                {t('inicial.noCriticalAlerts')}
              </div>
            </div>
          ) : (
            <>
              {alertasCriticos.slice(0, 3).map((alerta, idx) => (
                <AlertaCard
                  key={idx}
                  mensagem={alerta.mensagem}
                  severidade="critico"
                  tema={tema}
                />
              ))}
              {alertasCriticos.length > 3 && (
                <div style={{ fontSize: 12, color: tema.textoSecundario, textAlign: 'center', marginTop: 4 }}>
                  + {alertasCriticos.length - 3} {t('inicial.additionalAlerts')}
                </div>
              )}
            </>
          )}
        </div>
      </div>

      {/* ── ROW 3: Passagem em Andamento + Historico ──────────────────── */}
      <div className="efvm-dash-grid-2col" style={{ marginBottom: 16 }}>
        {/* Passagem em andamento */}
        <div
          style={{
            background: tema.card,
            border: `1px solid ${tema.cardBorda}`,
            borderRadius: 14,
            padding: 20,
            boxShadow: tema.cardSombra,
          }}
        >
          <div style={{ fontWeight: 700, color: tema.texto, fontSize: 15, marginBottom: 12 }}>
            <ClipboardList size={16} style={{ verticalAlign: 'middle', marginRight: 6 }} /> {t('inicial.shiftHandover')}
          </div>
          {temPassagemEmAndamento ? (
            <>
              <div className="efvm360-grid-responsive-3" style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 12, marginBottom: 12 }}>
                <div>
                  <div style={{ fontSize: 10, color: tema.textoSecundario }}>DSS</div>
                  <div style={{ fontWeight: 600, color: tema.texto, fontSize: 13 }}>
                    {dadosFormulario.cabecalho.dss}
                  </div>
                </div>
                <div>
                  <div style={{ fontSize: 10, color: tema.textoSecundario }}>TURNO</div>
                  <div style={{ fontWeight: 600, color: tema.texto, fontSize: 13 }}>
                    {dadosFormulario.cabecalho.turno}
                  </div>
                </div>
                <div>
                  <div style={{ fontSize: 10, color: tema.textoSecundario }}>HORARIO</div>
                  <div style={{ fontWeight: 600, color: tema.texto, fontSize: 13 }}>
                    {dadosFormulario.cabecalho.horario || '-'}
                  </div>
                </div>
              </div>
              <button
                type="button"
                style={{ ...styles.button, ...styles.buttonPrimary, width: '100%' }}
                onClick={continuarPassagem}
              >
                {t('inicial.continueHandover')} <ArrowRight size={16} style={{ verticalAlign: 'middle', marginLeft: 4 }} />
              </button>
            </>
          ) : (
            <div style={{ textAlign: 'center', padding: '16px 0' }}>
              <div style={{ fontSize: 13, color: tema.textoSecundario, marginBottom: 12 }}>
                {t('inicial.noHandoverInProgress')}
              </div>
              <button
                type="button"
                style={{ ...styles.button, ...styles.buttonPrimary, width: '100%' }}
                onClick={irParaPassagem}
              >
                <ClipboardList size={16} style={{ verticalAlign: 'middle', marginRight: 6 }} /> {t('inicial.startNewHandover')}
              </button>
            </div>
          )}
        </div>

        {/* Ultimas passagens */}
        <div
          style={{
            background: tema.card,
            border: `1px solid ${tema.cardBorda}`,
            borderRadius: 14,
            padding: 20,
            boxShadow: tema.cardSombra,
          }}
        >
          <div style={{ fontWeight: 700, color: tema.texto, fontSize: 15, marginBottom: 12 }}>
            <FolderOpen size={16} style={{ verticalAlign: 'middle', marginRight: 6 }} /> {t('inicial.lastHandovers')} ({historicoTurnos.length})
          </div>
          {historicoTurnos.length === 0 ? (
            <div style={{ textAlign: 'center', padding: 20, color: tema.textoSecundario, fontSize: 13 }}>
              {t('inicial.noHandoversYet')}
            </div>
          ) : (
            historicoTurnos.slice(0, 5).map((registro, idx) => (
              <div
                key={registro.id}
                style={{
                  padding: '10px 12px',
                  background: idx % 2 === 0 ? tema.backgroundSecundario : 'transparent',
                  borderRadius: 8,
                  marginBottom: 4,
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'center',
                }}
              >
                <div>
                  <div style={{ fontWeight: 600, color: tema.texto, fontSize: 13 }}>
                    {registro.cabecalho.turno}
                  </div>
                  <div style={{ fontSize: 11, color: tema.textoSecundario }}>
                    {registro.cabecalho.data} as {registro.cabecalho.horario}
                  </div>
                </div>
                <div style={{ fontSize: 11, color: tema.textoSecundario, textAlign: 'right' }}>
                  <div>{t('inicial.left')} {registro.assinaturas.sai.nome?.split(' ')[0] || '-'}</div>
                  <div>{t('inicial.entered')} {registro.assinaturas.entra.nome?.split(' ')[0] || '-'}</div>
                </div>
              </div>
            ))
          )}
        </div>
      </div>

      {/* ── ROW 4: CTAs ───────────────────────────────────────────────── */}
      <div className="efvm-dash-grid-2col">
        <button
          type="button"
          style={{
            ...styles.button,
            ...styles.buttonPrimary,
            padding: 20,
            fontSize: 15,
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            gap: 8,
            borderRadius: 14,
            cursor: 'pointer',
          }}
          onClick={irParaPassagem}
        >
          <ClipboardList size={28} />
          {t('inicial.newShiftChange')}
        </button>
        <button
          type="button"
          style={{
            ...styles.button,
            ...styles.buttonSecondary,
            padding: 20,
            fontSize: 15,
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            gap: 8,
            borderRadius: 14,
            cursor: 'pointer',
          }}
          onClick={abrirBI}
        >
          <BarChart3 size={28} />
          {t('inicial.biAdvanced')}
        </button>
      </div>

      {/* ── FOOTER ──────────────────────────────────────────────────── */}
      <footer style={{
        marginTop: 32,
        padding: '20px 0 8px',
        borderTop: `1px solid ${tema.cardBorda}`,
        textAlign: 'center',
      }}>
        <div style={{ fontSize: 12, color: tema.textoSecundario, lineHeight: 1.8 }}>
          &copy; 2025 EFVM360 Enterprise &mdash; {t('common.allRights')}
        </div>
        <div style={{ fontSize: 11, color: tema.textoSecundario, opacity: 0.7 }}>
          {t('common.developedBy')}
        </div>
      </footer>
    </>
  );
}
