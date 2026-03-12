// ============================================================================
// GESTÃO DE TROCA DE TURNO – EFVM360
// Componentes de Gráficos Apache ECharts
// Dashboard BI+ Avançado
// ============================================================================

import React, { memo, useRef, useEffect, useMemo } from 'react';
import type { TemaEstilos } from '../../types';

// ============================================================================
// PALETA DE CORES BI+ (SEM AZUL)
// Verde institucional VALE + ALTO CONTRASTE para textos
// ============================================================================

const getPaletaBIPlus = (tema: TemaEstilos) => {
  // Detectar modo escuro pela cor de texto principal
  const isModoEscuro = tema.texto === '#f5f5f5';
  
  return {
    // Paleta de séries - VERDE + NEUTROS (sem azul)
    series: isModoEscuro
      ? ['#4ade80', '#69be28', '#edb111', '#fb923c', '#69be28', '#a3e635']
      : ['#007e7a', '#69be28', '#d9a010', '#ea580c', '#16a34a', '#65a30d'],
    
    // Verde alternativo
    verde2: isModoEscuro ? '#69be28' : '#69be28',
    
    // TEXTOS - MÁXIMO CONTRASTE
    textoTitulo: isModoEscuro ? '#ffffff' : '#222222',      // Branco puro no escuro
    textoLabel: isModoEscuro ? '#e5e5e5' : '#334155',       // Cinza bem claro
    textoValor: isModoEscuro ? '#f5f5f5' : '#0f172a',       // Destaque valores
    
    // Background do tooltip
    bgTooltip: isModoEscuro ? 'rgba(15, 23, 42, 0.95)' : 'rgba(255, 255, 255, 0.98)',
    bordaTooltip: isModoEscuro ? 'rgba(74, 222, 128, 0.4)' : tema.cardBorda,
    
    // Linhas dos eixos - mais visíveis
    linhaEixo: isModoEscuro ? 'rgba(255, 255, 255, 0.25)' : 'rgba(0, 0, 0, 0.15)',
    linhaSplit: isModoEscuro ? 'rgba(255, 255, 255, 0.12)' : 'rgba(0, 0, 0, 0.08)',
  };
};

// ============================================================================
// TIPOS PARA ECHARTS
// ============================================================================

interface EChartsOption {
  [key: string]: unknown;
}

interface GraficoBaseProps {
  tema: TemaEstilos;
  altura?: number;
  className?: string;
}

// ============================================================================
// HOOK PARA INICIALIZAR ECHARTS (SEM TEMA NATIVO - evita azul)
// ============================================================================

const useECharts = (
  containerRef: React.RefObject<HTMLDivElement>,
  option: EChartsOption,
  tema: TemaEstilos
) => {
  const chartRef = useRef<unknown>(null);
  const resizeHandlerRef = useRef<(() => void) | null>(null);

  useEffect(() => {
    let isMounted = true;

    const initChart = async () => {
      try {
        const echarts = await import('echarts');
        
        if (!isMounted || !containerRef.current) return;

        // Destruir instância anterior se existir
        if (chartRef.current) {
          (chartRef.current as { dispose: () => void }).dispose();
        }

        // Criar instância SEM tema nativo (evita cores azuis do tema 'dark')
        // Todas as cores são definidas manualmente nas opções do gráfico
        const chart = echarts.init(containerRef.current);
        chartRef.current = chart;

        // Aplicar opções com cores customizadas
        chart.setOption(option);

        // Responsividade
        const handleResize = () => {
          if (chartRef.current) {
            (chartRef.current as { resize: () => void }).resize();
          }
        };
        resizeHandlerRef.current = handleResize;
        window.addEventListener('resize', handleResize);
      } catch {
        // ECharts não disponível - fallback silencioso
      }
    };

    initChart();

    return () => {
      isMounted = false;
      if (resizeHandlerRef.current) {
        window.removeEventListener('resize', resizeHandlerRef.current);
      }
      if (chartRef.current) {
        (chartRef.current as { dispose: () => void }).dispose();
        chartRef.current = null;
      }
    };
  }, [option, tema, containerRef]);

  return chartRef;
};

// ============================================================================
// GRÁFICO DE BARRAS ECHARTS
// ============================================================================

interface GraficoBarrasEChartsProps extends GraficoBaseProps {
  titulo: string;
  dados: { nome: string; valor: number; cor?: string }[];
  horizontal?: boolean;
}

export const GraficoBarrasECharts = memo<GraficoBarrasEChartsProps>(({
  titulo,
  dados,
  tema,
  altura = 300,
  horizontal = false,
}) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const paleta = getPaletaBIPlus(tema);
  
  // Verificar se há dados
  const temDados = dados.length > 0 && dados.some(d => d.valor > 0);
  
  // Extrair categorias e valores dos dados
  const categorias = useMemo(
    () => (dados.length > 0 ? dados.map(d => d.nome) : ['Sem dados']),
    [dados],
  );
  const valores = useMemo(
    () => (dados.length > 0 ? dados.map(d => d.valor) : [0]),
    [dados],
  );
  const cores = useMemo(
    () => dados.map((d, idx) => d.cor || paleta.series[idx % paleta.series.length]),
    [dados, paleta.series],
  );

  const option = useMemo<EChartsOption>(() => ({
    backgroundColor: 'transparent',
    title: {
      text: titulo,
      left: 'center',
      textStyle: {
        color: paleta.textoTitulo,
        fontSize: 14,
        fontWeight: 600,
      },
    },
    tooltip: {
      trigger: 'axis',
      backgroundColor: paleta.bgTooltip,
      borderColor: paleta.bordaTooltip,
      textStyle: { color: paleta.textoTitulo },
    },
    grid: {
      left: '3%',
      right: '4%',
      bottom: '10%',
      top: '15%',
      containLabel: true,
    },
    xAxis: {
      type: horizontal ? 'value' : 'category',
      data: horizontal ? undefined : categorias,
      axisLine: { lineStyle: { color: paleta.linhaEixo } },
      axisLabel: { color: paleta.textoLabel, fontSize: 10 },
      splitLine: { lineStyle: { color: paleta.linhaSplit } },
    },
    yAxis: {
      type: horizontal ? 'category' : 'value',
      data: horizontal ? categorias : undefined,
      axisLine: { lineStyle: { color: paleta.linhaEixo } },
      axisLabel: { color: paleta.textoLabel, fontSize: 10 },
      splitLine: { lineStyle: { color: paleta.linhaSplit } },
    },
    series: [{
      type: 'bar',
      data: temDados ? valores.map((v, idx) => ({
        value: v,
        itemStyle: { color: cores[idx] },
      })) : [{ value: 0, itemStyle: { color: 'transparent' } }],
      itemStyle: {
        borderRadius: horizontal ? [0, 4, 4, 0] : [4, 4, 0, 0],
      },
      // MICROINTERAÇÃO - Hover elegante
      emphasis: {
        itemStyle: { 
          shadowBlur: 12, 
          shadowColor: tema.cardBorda,
          shadowOffsetY: 4,
        },
      },
    }],
    // Mensagem quando não há dados
    graphic: !temDados ? [{
      type: 'text',
      left: 'center',
      top: 'middle',
      style: {
        text: 'Sem registros para o período',
        fontSize: 13,
        fill: paleta.textoLabel,
        fontWeight: 500,
      },
    }] : undefined,
  }), [titulo, categorias, valores, cores, horizontal, paleta, temDados, tema.cardBorda]);

  useECharts(containerRef, option, tema);

  return (
    <div
      ref={containerRef}
      className="chart-container"
      style={{
        width: '100%',
        height: altura,
        background: tema.card,
        borderRadius: '16px',
        border: `1px solid ${tema.cardBorda}`,
        padding: '16px',
        transition: 'box-shadow 0.3s ease, border-color 0.3s ease',
      }}
    />
  );
});

GraficoBarrasECharts.displayName = 'GraficoBarrasECharts';

// ============================================================================
// GRÁFICO DE LINHA ECHARTS
// ============================================================================

interface GraficoLinhaEChartsProps extends GraficoBaseProps {
  titulo: string;
  categorias: string[];
  series: {
    nome: string;
    dados: number[];
    cor?: string;
    area?: boolean;
  }[];
  suave?: boolean;
}

export const GraficoLinhaECharts = memo<GraficoLinhaEChartsProps>(({
  titulo,
  categorias,
  series,
  tema,
  altura = 300,
  suave = true,
}) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const paleta = getPaletaBIPlus(tema);
  
  // Verificar se há dados
  const temDados = categorias.length > 0 && series.some(s => s.dados.length > 0);

  const option = useMemo<EChartsOption>(() => ({
    backgroundColor: 'transparent',
    title: {
      text: titulo,
      left: 'center',
      textStyle: { color: paleta.textoTitulo, fontSize: 14, fontWeight: 600 },
    },
    tooltip: {
      trigger: 'axis',
      backgroundColor: paleta.bgTooltip,
      borderColor: paleta.bordaTooltip,
      textStyle: { color: paleta.textoTitulo },
    },
    legend: {
      bottom: 0,
      textStyle: { color: paleta.textoLabel, fontSize: 11 },
    },
    grid: {
      left: '3%',
      right: '4%',
      bottom: '15%',
      top: '15%',
      containLabel: true,
    },
    xAxis: {
      type: 'category',
      data: categorias.length > 0 ? categorias : ['Sem dados'],
      boundaryGap: false,
      axisLine: { lineStyle: { color: paleta.linhaEixo } },
      axisLabel: { color: paleta.textoLabel, fontSize: 10 },
    },
    yAxis: {
      type: 'value',
      axisLine: { lineStyle: { color: paleta.linhaEixo } },
      axisLabel: { color: paleta.textoLabel, fontSize: 10 },
      splitLine: { lineStyle: { color: paleta.linhaSplit } },
    },
    series: temDados ? series.map((s, idx) => {
      const cor = s.cor || paleta.series[idx % paleta.series.length];
      return {
        name: s.nome,
        type: 'line',
        data: s.dados,
        smooth: suave,
        symbol: 'circle',
        symbolSize: 6,
        lineStyle: { color: cor, width: 3 },
        itemStyle: { color: cor },
        // MICROINTERAÇÃO - Hover elegante nos pontos
        emphasis: {
          scale: true,
          focus: 'series',
          itemStyle: {
            shadowBlur: 10,
            shadowColor: `${cor}60`,
            borderWidth: 3,
            borderColor: '#fff',
          },
          lineStyle: {
            width: 4,
          },
        },
        areaStyle: s.area ? {
          color: {
            type: 'linear',
            x: 0, y: 0, x2: 0, y2: 1,
            colorStops: [
              { offset: 0, color: `${cor}40` },
              { offset: 1, color: `${cor}05` },
            ],
          },
        } : undefined,
      };
    }) : [{
      name: 'Sem dados',
      type: 'line',
      data: [0],
      lineStyle: { color: 'transparent' },
      itemStyle: { color: 'transparent' },
    }],
    // Mensagem quando não há dados
    graphic: !temDados ? [{
      type: 'text',
      left: 'center',
      top: 'middle',
      style: {
        text: 'Sem registros para o período',
        fontSize: 13,
        fill: paleta.textoLabel,
        fontWeight: 500,
      },
    }] : undefined,
  }), [titulo, categorias, series, suave, paleta, temDados]);

  useECharts(containerRef, option, tema);

  return (
    <div
      ref={containerRef}
      className="chart-container"
      style={{
        width: '100%',
        height: altura,
        background: tema.card,
        borderRadius: '16px',
        border: `1px solid ${tema.cardBorda}`,
        padding: '16px',
        transition: 'box-shadow 0.3s ease, border-color 0.3s ease',
      }}
    />
  );
});

GraficoLinhaECharts.displayName = 'GraficoLinhaECharts';

// ============================================================================
// GRÁFICO DE PIZZA/DONUT ECHARTS
// ============================================================================

interface GraficoPizzaEChartsProps extends GraficoBaseProps {
  titulo: string;
  dados: { nome: string; valor: number; cor?: string }[];
  donut?: boolean;
}

export const GraficoPizzaECharts = memo<GraficoPizzaEChartsProps>(({
  titulo,
  dados,
  tema,
  altura = 300,
  donut = true,
}) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const paleta = getPaletaBIPlus(tema);
  
  // Verificar se há dados
  const temDados = dados.length > 0 && dados.some(d => d.valor > 0);

  const option = useMemo<EChartsOption>(() => ({
    backgroundColor: 'transparent',
    title: {
      text: titulo,
      left: 'center',
      textStyle: { color: paleta.textoTitulo, fontSize: 14, fontWeight: 600 },
    },
    tooltip: {
      trigger: 'item',
      backgroundColor: paleta.bgTooltip,
      borderColor: paleta.bordaTooltip,
      textStyle: { color: paleta.textoTitulo },
      formatter: '{b}: {c} ({d}%)',
    },
    legend: {
      bottom: 0,
      textStyle: { color: paleta.textoLabel, fontSize: 11 },
    },
    series: [{
      type: 'pie',
      radius: donut ? ['40%', '70%'] : '70%',
      center: ['50%', '45%'],
      avoidLabelOverlap: true,
      itemStyle: {
        borderRadius: 8,
        borderColor: 'transparent',
        borderWidth: 2,
      },
      label: {
        show: false,
      },
      // MICROINTERAÇÃO - Hover elegante com scale
      emphasis: {
        scale: true,
        scaleSize: 8,
        label: {
          show: temDados,
          fontSize: 14,
          fontWeight: 'bold',
          color: paleta.textoTitulo,
        },
        itemStyle: {
          shadowBlur: 20,
          shadowColor: 'rgba(0,0,0,0.15)',
          shadowOffsetY: 4,
        },
        focus: 'self',
      },
      labelLine: { show: false },
      data: temDados ? dados.map((d, idx) => ({
        name: d.nome,
        value: d.valor,
        itemStyle: {
          color: d.cor || paleta.series[idx % paleta.series.length],
        },
      })) : [{
        name: 'Sem dados',
        value: 1,
        itemStyle: {
          color: paleta.linhaSplit,
        },
      }],
    }],
    // Mensagem quando não há dados
    graphic: !temDados ? [{
      type: 'text',
      left: 'center',
      top: 'middle',
      style: {
        text: 'Sem registros para o período',
        fontSize: 13,
        fill: paleta.textoLabel,
        fontWeight: 500,
      },
    }] : undefined,
  }), [titulo, dados, donut, paleta, temDados]);

  useECharts(containerRef, option, tema);

  return (
    <div
      ref={containerRef}
      className="chart-container"
      style={{
        width: '100%',
        height: altura,
        background: tema.card,
        borderRadius: '16px',
        border: `1px solid ${tema.cardBorda}`,
        padding: '16px',
        transition: 'box-shadow 0.3s ease, border-color 0.3s ease',
      }}
    />
  );
});

GraficoPizzaECharts.displayName = 'GraficoPizzaECharts';

// ============================================================================
// GRÁFICO GAUGE (VELOCÍMETRO) ECHARTS
// ============================================================================

interface GraficoGaugeEChartsProps extends GraficoBaseProps {
  titulo: string;
  valor: number;
  max?: number;
  unidade?: string;
  faixas?: { min: number; max: number; cor: string }[];
}

export const GraficoGaugeECharts = memo<GraficoGaugeEChartsProps>(({
  titulo,
  valor,
  tema,
  altura = 250,
  max = 100,
  unidade = '%',
  faixas,
}) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const paleta = getPaletaBIPlus(tema);

  const defaultFaixas = useMemo(() => (
    faixas || [
      { min: 0, max: 25, cor: tema.sucesso },
      { min: 25, max: 50, cor: tema.aviso },
      { min: 50, max: 75, cor: '#f97316' },
      { min: 75, max: 100, cor: tema.perigo },
    ]
  ), [faixas, tema.aviso, tema.perigo, tema.sucesso]);

  const option = useMemo<EChartsOption>(() => ({
    backgroundColor: 'transparent',
    title: {
      text: titulo,
      left: 'center',
      top: 10,
      textStyle: { color: paleta.textoTitulo, fontSize: 14, fontWeight: 600 },
    },
    series: [{
      type: 'gauge',
      center: ['50%', '60%'],
      radius: '85%',
      startAngle: 200,
      endAngle: -20,
      min: 0,
      max,
      splitNumber: 5,
      itemStyle: {
        color: defaultFaixas.find(f => valor >= f.min && valor <= f.max)?.cor || tema.primaria,
      },
      progress: {
        show: true,
        width: 20,
        roundCap: true,
      },
      pointer: {
        show: true,
        length: '60%',
        width: 6,
        itemStyle: { color: paleta.textoTitulo },
      },
      axisLine: {
        lineStyle: {
          width: 20,
          color: defaultFaixas.map(f => [f.max / max, f.cor] as [number, string]),
        },
      },
      axisTick: { show: false },
      splitLine: {
        distance: -30,
        length: 14,
        lineStyle: { color: paleta.linhaEixo, width: 2 },
      },
      axisLabel: {
        distance: -20,
        color: paleta.textoLabel,
        fontSize: 10,
      },
      anchor: {
        show: true,
        size: 16,
        itemStyle: {
          borderColor: tema.primaria,
          borderWidth: 3,
          color: 'transparent',
        },
      },
      detail: {
        valueAnimation: true,
        fontSize: 28,
        fontWeight: 'bold',
        color: paleta.textoTitulo,
        offsetCenter: [0, '30%'],
        formatter: `{value}${unidade}`,
      },
      data: [{ value: valor }],
    }],
  }), [titulo, valor, tema, max, unidade, defaultFaixas, paleta]);

  useECharts(containerRef, option, tema);

  return (
    <div
      ref={containerRef}
      className="chart-container"
      style={{
        width: '100%',
        height: altura,
        background: tema.card,
        borderRadius: '16px',
        border: `1px solid ${tema.cardBorda}`,
        padding: '16px',
        transition: 'box-shadow 0.3s ease, border-color 0.3s ease',
      }}
    />
  );
});

GraficoGaugeECharts.displayName = 'GraficoGaugeECharts';

// ============================================================================
// GRÁFICO RADAR ECHARTS
// ============================================================================

interface GraficoRadarEChartsProps extends GraficoBaseProps {
  titulo: string;
  indicadores: { nome: string; max: number }[];
  series: {
    nome: string;
    dados: number[];
    cor?: string;
  }[];
}

export const GraficoRadarECharts = memo<GraficoRadarEChartsProps>(({
  titulo,
  indicadores,
  series,
  tema,
  altura = 300,
}) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const paleta = getPaletaBIPlus(tema);
  
  // Verificar se há dados
  const temDados = indicadores.length > 0 && series.length > 0 && series.some(s => s.dados.length > 0);
  
  // Indicadores padrão quando não há dados
  const indicadoresPadrao = useMemo(() => (
    indicadores.length > 0 ? indicadores : [
      { nome: 'Indicador 1', max: 100 },
      { nome: 'Indicador 2', max: 100 },
      { nome: 'Indicador 3', max: 100 },
      { nome: 'Indicador 4', max: 100 },
    ]
  ), [indicadores]);

  const option = useMemo<EChartsOption>(() => ({
    backgroundColor: 'transparent',
    title: {
      text: titulo,
      left: 'center',
      textStyle: { color: paleta.textoTitulo, fontSize: 14, fontWeight: 600 },
    },
    tooltip: {
      trigger: 'item',
      backgroundColor: paleta.bgTooltip,
      borderColor: paleta.bordaTooltip,
      textStyle: { color: paleta.textoTitulo },
    },
    legend: {
      bottom: 0,
      textStyle: { color: paleta.textoLabel, fontSize: 11 },
    },
    radar: {
      indicator: indicadoresPadrao.map(i => ({
        name: i.nome,
        max: i.max,
      })),
      shape: 'polygon',
      splitNumber: 4,
      axisName: {
        color: paleta.textoLabel,
        fontSize: 10,
      },
      splitLine: {
        lineStyle: { color: paleta.linhaEixo },
      },
      splitArea: {
        areaStyle: { color: ['transparent', 'transparent'] },
      },
      axisLine: {
        lineStyle: { color: paleta.linhaEixo },
      },
    },
    series: [{
      type: 'radar',
      // MICROINTERAÇÃO - Hover elegante
      emphasis: {
        lineStyle: {
          width: 3,
        },
        areaStyle: {
          opacity: 0.5,
        },
      },
      data: temDados ? series.map((s, idx) => {
        const cor = s.cor || paleta.series[idx % paleta.series.length];
        return {
          name: s.nome,
          value: s.dados,
          symbol: 'circle',
          symbolSize: 6,
          lineStyle: { color: cor, width: 2 },
          areaStyle: { color: `${cor}30` },
          itemStyle: { color: cor },
          emphasis: {
            itemStyle: {
              shadowBlur: 8,
              shadowColor: `${cor}60`,
              borderWidth: 2,
              borderColor: '#fff',
            },
          },
        };
      }) : [{
        name: 'Sem dados',
        value: indicadoresPadrao.map(() => 0),
        lineStyle: { color: paleta.linhaSplit },
        areaStyle: { color: 'transparent' },
        itemStyle: { color: paleta.linhaSplit },
      }],
    }],
    // Mensagem quando não há dados
    graphic: !temDados ? [{
      type: 'text',
      left: 'center',
      top: 'middle',
      style: {
        text: 'Sem registros para o período',
        fontSize: 13,
        fill: paleta.textoLabel,
        fontWeight: 500,
      },
    }] : undefined,
  }), [titulo, indicadoresPadrao, series, paleta, temDados]);

  useECharts(containerRef, option, tema);

  return (
    <div
      ref={containerRef}
      className="chart-container"
      style={{
        width: '100%',
        height: altura,
        background: tema.card,
        borderRadius: '16px',
        border: `1px solid ${tema.cardBorda}`,
        padding: '16px',
        transition: 'box-shadow 0.3s ease, border-color 0.3s ease',
      }}
    />
  );
});

GraficoRadarECharts.displayName = 'GraficoRadarECharts';

// ============================================================================
// GRÁFICO HEATMAP ECHARTS
// ============================================================================

interface GraficoHeatmapEChartsProps extends GraficoBaseProps {
  titulo: string;
  xCategories: string[];
  yCategories: string[];
  dados: [number, number, number][]; // [xIndex, yIndex, value]
  min?: number;
  max?: number;
}

export const GraficoHeatmapECharts = memo<GraficoHeatmapEChartsProps>(({
  titulo,
  xCategories,
  yCategories,
  dados,
  tema,
  altura = 300,
  min = 0,
  max = 100,
}) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const paleta = getPaletaBIPlus(tema);

  const option = useMemo<EChartsOption>(() => ({
    backgroundColor: 'transparent',
    title: {
      text: titulo,
      left: 'center',
      textStyle: { color: paleta.textoTitulo, fontSize: 14, fontWeight: 600 },
    },
    tooltip: {
      position: 'top',
      backgroundColor: paleta.bgTooltip,
      borderColor: paleta.bordaTooltip,
      textStyle: { color: paleta.textoTitulo },
    },
    grid: {
      left: '15%',
      right: '10%',
      top: '15%',
      bottom: '20%',
    },
    xAxis: {
      type: 'category',
      data: xCategories,
      splitArea: { show: true, areaStyle: { color: ['transparent', 'transparent'] } },
      axisLabel: { color: paleta.textoLabel, fontSize: 10, rotate: 45 },
      axisLine: { lineStyle: { color: paleta.linhaEixo } },
    },
    yAxis: {
      type: 'category',
      data: yCategories,
      splitArea: { show: true, areaStyle: { color: ['transparent', 'transparent'] } },
      axisLabel: { color: paleta.textoLabel, fontSize: 10 },
      axisLine: { lineStyle: { color: paleta.linhaEixo } },
    },
    visualMap: {
      min,
      max,
      calculable: true,
      orient: 'horizontal',
      left: 'center',
      bottom: 0,
      textStyle: { color: paleta.textoLabel, fontSize: 10 },
      inRange: {
        color: [tema.sucesso, tema.aviso, tema.perigo],
      },
    },
    series: [{
      type: 'heatmap',
      data: dados,
      label: {
        show: true,
        color: '#fff',
        fontSize: 10,
      },
      emphasis: {
        itemStyle: {
          shadowBlur: 10,
          shadowColor: 'rgba(0,0,0,0.5)',
        },
      },
    }],
  }), [titulo, xCategories, yCategories, dados, tema, min, max, paleta]);

  useECharts(containerRef, option, tema);

  return (
    <div
      ref={containerRef}
      className="chart-container"
      style={{
        width: '100%',
        height: altura,
        background: tema.card,
        borderRadius: '16px',
        border: `1px solid ${tema.cardBorda}`,
        padding: '16px',
        transition: 'box-shadow 0.3s ease, border-color 0.3s ease',
      }}
    />
  );
});

GraficoHeatmapECharts.displayName = 'GraficoHeatmapECharts';

// ============================================================================
// EXPORTS
// ============================================================================

export default {
  GraficoBarrasECharts,
  GraficoLinhaECharts,
  GraficoPizzaECharts,
  GraficoGaugeECharts,
  GraficoRadarECharts,
  GraficoHeatmapECharts,
};
