// ============================================================================
// PASSAGEM DE SERVIÇO – EFVM360
// Componentes de Gráficos para Dashboard
// ============================================================================

import { memo, useMemo } from 'react';
import type { TemaEstilos } from '../../types';
import type {
  DadoBarras,
  DadoLinha,
  DadoRadar,
  DadoTimeline,
  KPICard,
  TendenciaOperacional,
} from '../../types/dashboard';

// ============================================================================
// CARD KPI
// ============================================================================

interface CardKPIProps {
  kpi: KPICard;
  tema: TemaEstilos;
  onClick?: () => void;
}

export const CardKPI = memo<CardKPIProps>(({ kpi, tema, onClick }) => (
  <div
    className="kpi-card"
    onClick={onClick}
    style={{
      background: tema.card,
      borderRadius: '16px',
      padding: '20px',
      border: `1px solid ${tema.cardBorda}`,
      borderLeft: `4px solid ${kpi.cor}`,
      cursor: onClick ? 'pointer' : 'default',
      transition: 'transform 0.25s cubic-bezier(0.4, 0, 0.2, 1), box-shadow 0.25s ease',
      boxShadow: tema.cardSombra,
      willChange: 'transform',
    }}
  >
    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
      <div>
        <div style={{ fontSize: '12px', color: tema.textoSecundario, marginBottom: '8px', textTransform: 'uppercase', letterSpacing: '0.5px' }}>
          {kpi.titulo}
        </div>
        <div style={{ fontSize: '32px', fontWeight: 700, color: kpi.cor }}>
          {kpi.valor}
        </div>
        {kpi.variacao !== undefined && (
          <div style={{
            display: 'flex',
            alignItems: 'center',
            gap: '4px',
            marginTop: '8px',
            fontSize: '12px',
            color: kpi.tendencia === 'up' ? tema.perigo : kpi.tendencia === 'down' ? tema.sucesso : tema.textoSecundario,
          }}>
            {kpi.tendencia === 'up' && '↑'}
            {kpi.tendencia === 'down' && '↓'}
            {kpi.tendencia === 'stable' && '→'}
            {Math.abs(kpi.variacao)}% vs período anterior
          </div>
        )}
      </div>
      <div style={{ fontSize: '32px', opacity: 0.9 }}>
        {kpi.icone}
      </div>
    </div>
    {kpi.descricao && (
      <div style={{ fontSize: '11px', color: tema.textoSecundario, marginTop: '12px' }}>
        {kpi.descricao}
      </div>
    )}
  </div>
));

CardKPI.displayName = 'CardKPI';

// ============================================================================
// GRÁFICO DE BARRAS SIMPLES (CSS)
// ============================================================================

interface GraficoBarrasProps {
  titulo: string;
  dados: DadoBarras[];
  tema: TemaEstilos;
  altura?: number;
  mostrarValores?: boolean;
  horizontal?: boolean;
}

export const GraficoBarras = memo<GraficoBarrasProps>(({
  titulo,
  dados,
  tema,
  altura = 200,
  mostrarValores = true,
  horizontal = false,
}) => {
  const maxValor = Math.max(...dados.map((d) => d.valor), 1);

  if (horizontal) {
    return (
      <div style={{
        background: tema.card,
        borderRadius: '16px',
        padding: '20px',
        border: `1px solid ${tema.cardBorda}`,
        boxShadow: tema.cardSombra,
      }}>
        <div style={{ fontSize: '14px', fontWeight: 600, color: tema.texto, marginBottom: '16px' }}>
          {titulo}
        </div>
        <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
          {dados.map((item) => (
            <div key={item.nome} style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
              <div style={{ width: '80px', fontSize: '12px', color: tema.textoSecundario }}>
                {item.nome}
              </div>
              <div style={{ flex: 1, height: '24px', background: tema.buttonInativo, borderRadius: '4px', overflow: 'hidden' }}>
                <div
                  style={{
                    width: `${(item.valor / maxValor) * 100}%`,
                    height: '100%',
                    background: item.cor || tema.primaria,
                    borderRadius: '4px',
                    transition: 'width 0.5s ease',
                  }}
                />
              </div>
              {mostrarValores && (
                <div style={{ width: '40px', fontSize: '13px', fontWeight: 600, color: tema.texto, textAlign: 'right' }}>
                  {item.valor}
                </div>
              )}
            </div>
          ))}
        </div>
      </div>
    );
  }

  return (
    <div style={{
      background: tema.card,
      borderRadius: '16px',
      padding: '20px',
      border: `1px solid ${tema.cardBorda}`,
      boxShadow: tema.cardSombra,
    }}>
      <div style={{ fontSize: '14px', fontWeight: 600, color: tema.texto, marginBottom: '16px' }}>
        {titulo}
      </div>
      <div style={{ display: 'flex', alignItems: 'flex-end', justifyContent: 'space-around', height: `${altura}px`, gap: '16px' }}>
        {dados.map((item) => (
          <div key={item.nome} style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', flex: 1 }}>
            <div
              style={{
                width: '100%',
                maxWidth: '60px',
                height: `${(item.valor / maxValor) * (altura - 40)}px`,
                minHeight: '4px',
                background: item.cor || tema.primaria,
                borderRadius: '6px 6px 0 0',
                transition: 'height 0.5s ease',
              }}
            />
            {mostrarValores && (
              <div style={{ fontSize: '14px', fontWeight: 700, color: tema.texto, marginTop: '8px' }}>
                {item.valor}
              </div>
            )}
            <div style={{ fontSize: '11px', color: tema.textoSecundario, marginTop: '4px', textAlign: 'center' }}>
              {item.nome}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
});

GraficoBarras.displayName = 'GraficoBarras';

// ============================================================================
// GRÁFICO DE LINHA (CSS/SVG)
// ============================================================================

interface GraficoLinhaProps {
  titulo: string;
  dados: DadoLinha[];
  tema: TemaEstilos;
  altura?: number;
  cor?: string;
  mostrarArea?: boolean;
}

export const GraficoLinha = memo<GraficoLinhaProps>(({
  titulo,
  dados,
  tema,
  altura = 180,
  cor,
  mostrarArea = true,
}) => {
  const corLinha = cor || tema.primaria;
  
  const { pontos, pathD, areaD, minY, maxY } = useMemo(() => {
    if (dados.length === 0) return { pontos: [], pathD: '', areaD: '', minY: 0, maxY: 100 };

    const valores = dados.map((d) => d.valor);
    const minV = Math.min(...valores);
    const maxV = Math.max(...valores);
    const range = maxV - minV || 1;
    const padding = 20;
    const width = 100;
    const h = altura - 60;

    const pts = dados.map((d, i) => ({
      x: padding + (i / (dados.length - 1 || 1)) * (width - 2 * padding),
      y: h - ((d.valor - minV) / range) * (h - padding),
      valor: d.valor,
      data: d.data,
    }));

    const path = pts.map((p, i) => `${i === 0 ? 'M' : 'L'} ${p.x} ${p.y}`).join(' ');
    const area = `${path} L ${pts[pts.length - 1]?.x || 0} ${h} L ${pts[0]?.x || 0} ${h} Z`;

    return { pontos: pts, pathD: path, areaD: area, minY: minV, maxY: maxV };
  }, [dados, altura]);

  return (
    <div style={{
      background: tema.card,
      borderRadius: '16px',
      padding: '20px',
      border: `1px solid ${tema.cardBorda}`,
      boxShadow: tema.cardSombra,
    }}>
      <div style={{ fontSize: '14px', fontWeight: 600, color: tema.texto, marginBottom: '16px' }}>
        {titulo}
      </div>
      <svg viewBox={`0 0 100 ${altura - 40}`} style={{ width: '100%', height: `${altura - 40}px` }}>
        {/* Linhas de grade */}
        {[0, 25, 50, 75, 100].map((pct) => (
          <line
            key={pct}
            x1="20"
            y1={altura - 60 - ((pct / 100) * (altura - 80))}
            x2="80"
            y2={altura - 60 - ((pct / 100) * (altura - 80))}
            stroke={tema.cardBorda}
            strokeWidth="0.3"
            strokeDasharray="2,2"
          />
        ))}
        
        {/* Área preenchida */}
        {mostrarArea && areaD && (
          <path d={areaD} fill={`${corLinha}20`} />
        )}
        
        {/* Linha */}
        {pathD && (
          <path
            d={pathD}
            fill="none"
            stroke={corLinha}
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
        )}
        
        {/* Pontos */}
        {pontos.map((p) => (
          <circle
            key={`ponto-${p.data}-${p.valor}`}
            cx={p.x}
            cy={p.y}
            r="3"
            fill={corLinha}
          >
            <title>{`${p.data}: ${p.valor}`}</title>
          </circle>
        ))}
      </svg>
      
      {/* Labels */}
      <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '10px', color: tema.textoSecundario, marginTop: '8px' }}>
        <span>{dados[0]?.data || ''}</span>
        <span>Min: {minY} | Max: {maxY}</span>
        <span>{dados[dados.length - 1]?.data || ''}</span>
      </div>
    </div>
  );
});

GraficoLinha.displayName = 'GraficoLinha';

// ============================================================================
// GRÁFICO RADAR (CSS/SVG)
// ============================================================================

interface GraficoRadarProps {
  titulo: string;
  dados: DadoRadar[];
  tema: TemaEstilos;
  tamanho?: number;
}

export const GraficoRadar = memo<GraficoRadarProps>(({
  titulo,
  dados,
  tema,
  tamanho = 200,
}) => {
  const centro = tamanho / 2;
  const raio = (tamanho / 2) - 40;
  const numLados = dados.length;

  const pontos = useMemo(() => {
    return dados.map((d, i) => {
      const angulo = (Math.PI * 2 * i) / numLados - Math.PI / 2;
      const percentual = d.valorAtual / d.maximo;
      return {
        x: centro + Math.cos(angulo) * raio * percentual,
        y: centro + Math.sin(angulo) * raio * percentual,
        label: d.categoria,
        valor: d.valorAtual,
        labelX: centro + Math.cos(angulo) * (raio + 25),
        labelY: centro + Math.sin(angulo) * (raio + 25),
      };
    });
  }, [dados, centro, raio, numLados]);

  const pathD = pontos.map((p, i) => `${i === 0 ? 'M' : 'L'} ${p.x} ${p.y}`).join(' ') + ' Z';

  // Linhas de grade
  const grades = [0.25, 0.5, 0.75, 1].map((pct) => {
    const r = raio * pct;
    return dados.map((_, i) => {
      const angulo = (Math.PI * 2 * i) / numLados - Math.PI / 2;
      return {
        x: centro + Math.cos(angulo) * r,
        y: centro + Math.sin(angulo) * r,
      };
    });
  });

  return (
    <div style={{
      background: tema.card,
      borderRadius: '16px',
      padding: '20px',
      border: `1px solid ${tema.cardBorda}`,
      boxShadow: tema.cardSombra,
    }}>
      <div style={{ fontSize: '14px', fontWeight: 600, color: tema.texto, marginBottom: '16px' }}>
        {titulo}
      </div>
      <svg viewBox={`0 0 ${tamanho} ${tamanho}`} style={{ width: '100%', maxWidth: `${tamanho}px`, margin: '0 auto', display: 'block' }}>
        {/* Grades */}
        {grades.map((grade, gi) => (
          <polygon
            key={gi}
            points={grade.map((p) => `${p.x},${p.y}`).join(' ')}
            fill="none"
            stroke={tema.cardBorda}
            strokeWidth="0.5"
          />
        ))}
        
        {/* Linhas do centro para os vértices */}
        {pontos.map((p, i) => (
          <line
            key={`linha-${p.label}`}
            x1={centro}
            y1={centro}
            x2={centro + Math.cos((Math.PI * 2 * i) / numLados - Math.PI / 2) * raio}
            y2={centro + Math.sin((Math.PI * 2 * i) / numLados - Math.PI / 2) * raio}
            stroke={tema.cardBorda}
            strokeWidth="0.5"
          />
        ))}
        
        {/* Área preenchida */}
        <path d={pathD} fill={`${tema.perigo}30`} stroke={tema.perigo} strokeWidth="2" />
        
        {/* Pontos */}
        {pontos.map((p) => (
          <g key={`ponto-${p.label}`}>
            <circle cx={p.x} cy={p.y} r="5" fill={tema.perigo} />
            <text
              x={p.labelX}
              y={p.labelY}
              textAnchor="middle"
              dominantBaseline="middle"
              fontSize="9"
              fill={tema.textoSecundario}
            >
              {p.label}
            </text>
            <text
              x={p.x}
              y={p.y - 12}
              textAnchor="middle"
              fontSize="10"
              fontWeight="600"
              fill={tema.texto}
            >
              {p.valor}%
            </text>
          </g>
        ))}
      </svg>
    </div>
  );
});

GraficoRadar.displayName = 'GraficoRadar';

// ============================================================================
// TIMELINE DE EVENTOS
// ============================================================================

interface TimelineEventosProps {
  titulo: string;
  eventos: DadoTimeline[];
  tema: TemaEstilos;
  maxItens?: number;
}

export const TimelineEventos = memo<TimelineEventosProps>(({
  titulo,
  eventos,
  tema,
  maxItens = 10,
}) => {
  const corSeveridade = (sev: string) => {
    switch (sev) {
      case 'critica': return tema.perigo;
      case 'alta': return '#f97316';
      case 'media': return tema.aviso;
      default: return tema.info;
    }
  };

  const iconeTipo = (tipo: string) => {
    switch (tipo) {
      case 'manobra': return '⚠️';
      case 'interdicao': return '⛔';
      case 'restricao': return '🚫';
      default: return '⚡';
    }
  };

  return (
    <div style={{
      background: tema.card,
      borderRadius: '16px',
      padding: '20px',
      border: `1px solid ${tema.cardBorda}`,
      boxShadow: tema.cardSombra,
    }}>
      <div style={{ fontSize: '14px', fontWeight: 600, color: tema.texto, marginBottom: '16px' }}>
        {titulo}
      </div>
      <div style={{ maxHeight: '400px', overflowY: 'auto' }}>
        {eventos.slice(0, maxItens).map((evento) => (
          <div
            key={evento.id}
            style={{
              display: 'flex',
              gap: '12px',
              padding: '12px',
              marginBottom: '8px',
              background: `${corSeveridade(evento.severidade)}10`,
              borderLeft: `3px solid ${corSeveridade(evento.severidade)}`,
              borderRadius: '8px',
            }}
          >
            <div style={{ fontSize: '20px' }}>{iconeTipo(evento.tipo)}</div>
            <div style={{ flex: 1 }}>
              <div style={{ fontWeight: 600, color: tema.texto, fontSize: '13px' }}>
                {evento.titulo}
              </div>
              <div style={{ fontSize: '12px', color: tema.textoSecundario, marginTop: '4px' }}>
                {evento.descricao}
              </div>
              <div style={{ fontSize: '10px', color: tema.textoSecundario, marginTop: '6px' }}>
                {evento.data} às {evento.hora}
              </div>
            </div>
            <div style={{
              padding: '4px 8px',
              borderRadius: '12px',
              background: corSeveridade(evento.severidade),
              color: '#fff',
              fontSize: '10px',
              fontWeight: 600,
              textTransform: 'uppercase',
              height: 'fit-content',
            }}>
              {evento.severidade}
            </div>
          </div>
        ))}
        {eventos.length === 0 && (
          <div style={{ textAlign: 'center', padding: '40px', color: tema.textoSecundario }}>
            Nenhum evento registrado
          </div>
        )}
      </div>
    </div>
  );
});

TimelineEventos.displayName = 'TimelineEventos';

// ============================================================================
// CARD DE TENDÊNCIA
// ============================================================================

interface CardTendenciaProps {
  tendencia: TendenciaOperacional;
  tema: TemaEstilos;
}

export const CardTendencia = memo<CardTendenciaProps>(({ tendencia, tema }) => {
  const corTendencia = tendencia.tendencia === 'up' ? tema.perigo : tendencia.tendencia === 'down' ? tema.sucesso : tema.aviso;
  const iconeTendencia = tendencia.tendencia === 'up' ? '↗' : tendencia.tendencia === 'down' ? '↘' : '→';

  return (
    <div style={{
      background: tema.card,
      borderRadius: '12px',
      padding: '16px',
      border: `1px solid ${tema.cardBorda}`,
      boxShadow: tema.cardSombra,
    }}>
      <div style={{ fontSize: '12px', color: tema.textoSecundario, marginBottom: '8px' }}>
        {tendencia.metrica}
      </div>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <div style={{ fontSize: '24px', fontWeight: 700, color: tema.texto }}>
          {tendencia.valorAtual}%
        </div>
        <div style={{
          display: 'flex',
          alignItems: 'center',
          gap: '4px',
          color: corTendencia,
          fontSize: '14px',
          fontWeight: 600,
        }}>
          <span style={{ fontSize: '20px' }}>{iconeTendencia}</span>
          {tendencia.variacao > 0 ? '+' : ''}{tendencia.variacao}%
        </div>
      </div>
      <div style={{ fontSize: '11px', color: tema.textoSecundario, marginTop: '8px' }}>
        Anterior: {tendencia.valorAnterior}%
      </div>
    </div>
  );
});

CardTendencia.displayName = 'CardTendencia';

// ============================================================================
// MINI GAUGE (VELOCÍMETRO)
// ============================================================================

interface MiniGaugeProps {
  valor: number;
  max: number;
  titulo: string;
  tema: TemaEstilos;
  tamanho?: number;
}

export const MiniGauge = memo<MiniGaugeProps>(({
  valor,
  max,
  titulo,
  tema,
  tamanho = 120,
}) => {
  const percentual = Math.min(valor / max, 1);
  const cor = percentual >= 0.7 ? tema.perigo : percentual >= 0.4 ? tema.aviso : tema.sucesso;

  return (
    <div style={{ textAlign: 'center' }}>
      <svg viewBox="0 0 120 70" style={{ width: tamanho, height: tamanho * 0.6 }}>
        {/* Fundo do arco */}
        <path
          d="M 10 60 A 50 50 0 0 1 110 60"
          fill="none"
          stroke={tema.buttonInativo}
          strokeWidth="10"
          strokeLinecap="round"
        />
        {/* Arco de valor */}
        <path
          d="M 10 60 A 50 50 0 0 1 110 60"
          fill="none"
          stroke={cor}
          strokeWidth="10"
          strokeLinecap="round"
          strokeDasharray={`${percentual * 157} 157`}
          style={{ transition: 'stroke-dasharray 0.5s ease' }}
        />
        {/* Valor central */}
        <text x="60" y="55" textAnchor="middle" fontSize="18" fontWeight="700" fill={tema.texto}>
          {valor}
        </text>
        <text x="60" y="68" textAnchor="middle" fontSize="8" fill={tema.textoSecundario}>
          / {max}
        </text>
      </svg>
      <div style={{ fontSize: '11px', color: tema.textoSecundario, marginTop: '4px' }}>
        {titulo}
      </div>
    </div>
  );
});

MiniGauge.displayName = 'MiniGauge';
