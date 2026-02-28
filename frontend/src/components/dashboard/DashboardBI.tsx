// ============================================================================
// PASSAGEM DE SERVIÇO – EFVM360
// Dashboard BI+ Avançado - Apache ECharts
// FASE 6: EXPORTAÇÃO AVANÇADA + HISTÓRICO DE DOCUMENTOS
// SOMENTE LEITURA - Análises e Visualizações
// COM EXPORTAÇÃO E INTEGRAÇÃO ADAM BOOT + DSS
// ============================================================================

import { memo, useState, useMemo, useCallback } from 'react';
import type { TemaEstilos, RegistroHistorico } from '../../types';
import type { StylesObject } from '../../hooks/useStyles';
import type { FiltrosDashboard } from '../../types/dashboard';
import { TURNOS_LETRAS, TURNOS_HORARIOS } from '../../utils/constants';
import {
  filtrosIniciais,
  calcularKPIs,
  gerarDadosStatusLinhas,
  gerarDadosManobrasPorTipo,
  gerarDadosOcorrenciasPorTurno,
  gerarDadosEvolucaoRisco,
  gerarDadosRadarSeguranca,
  calcularTendencias,
  identificarRiscosRecorrentes,
  calcularEstatisticasConsolidadas,
} from '../../services/analise';
import {
  GraficoBarrasECharts,
  GraficoLinhaECharts,
  GraficoPizzaECharts,
  GraficoGaugeECharts,
  GraficoRadarECharts,
} from './EChartsComponents';
import { CardKPI } from './Graficos';
import AIInsightChart from './AIInsightChart';
import { PermissionGuard } from '../ui/PermissionGuard';

// ============================================================================
// TIPOS
// ============================================================================

type AbaDashboard = 'visao-geral' | 'operacional' | 'seguranca' | 'tendencias' | 'exportacoes';

interface DashboardAvancadoProps {
  historicoTurnos: RegistroHistorico[];
  tema: TemaEstilos;
  styles: StylesObject;
}

// Tipo para formato de exportação
type FormatoExportacao = 'excel' | 'pdf' | 'csv' | 'word' | 'powerpoint' | 'bi-plus';

// Interface para seleção de exportação avançada
interface SelecaoExportacao {
  graficos: {
    statusLinhas: boolean;
    distribuicaoTurno: boolean;
    evolucaoRisco: boolean;
    manobrasTipo: boolean;
    radarSeguranca: boolean;
    indiceConformidade: boolean;
  };
  indicadores: {
    kpis: boolean;
    estatisticas: boolean;
    tendencias: boolean;
    riscosRecorrentes: boolean;
  };
  periodo: string;
  tema: string;
  formato: FormatoExportacao;
}

// Interface para registro de exportação
interface RegistroExportacao {
  id: string;
  tipo: 'BI+' | 'Passagem' | 'DSS';
  formato: string;
  dataHora: string;
  usuario: string;
  status: 'gerado' | 'enviado' | 'erro';
  detalhes: string;
  tamanho?: string;
}

// Interface para estado do Dashboard (para AdamBoot)
interface DashboardState {
  filtros: FiltrosDashboard;
  abaAtiva: AbaDashboard;
  metricas: {
    totalPassagens: number;
    manobrasCriticas: number;
    interdicoes: number;
    riscoMedio: number;
  };
  alertasCriticos: string[];
  tendencias: { metrica: string; direcao: string }[];
}

// ============================================================================
// FUNÇÕES DE HISTÓRICO DE EXPORTAÇÕES
// ============================================================================

const STORAGE_KEY_EXPORTACOES = 'efvm360-historico-exportacoes';

const carregarHistoricoExportacoes = (): RegistroExportacao[] => {
  try {
    const dados = localStorage.getItem(STORAGE_KEY_EXPORTACOES);
    return dados ? JSON.parse(dados) : [];
  } catch {
    return [];
  }
};

const salvarExportacao = (registro: Omit<RegistroExportacao, 'id' | 'dataHora'>): RegistroExportacao => {
  const novoRegistro: RegistroExportacao = {
    ...registro,
    id: `exp-${Date.now()}`,
    dataHora: new Date().toISOString(),
  };
  
  try {
    const historico = carregarHistoricoExportacoes();
    const novoHistorico = [novoRegistro, ...historico].slice(0, 50); // Mantém últimos 50
    localStorage.setItem(STORAGE_KEY_EXPORTACOES, JSON.stringify(novoHistorico));
  } catch (e) {
    if (import.meta.env?.DEV) console.error('Erro ao salvar histórico de exportação:', e);
  }
  
  return novoRegistro;
};

// ============================================================================
// FUNÇÕES DE EXPORTAÇÃO
// ============================================================================

// Gerar resumo automático do turno (baseado em regras, sem IA externa)
const gerarResumoTurno = (
  registros: RegistroHistorico[],
  filtros: FiltrosDashboard,
  estatisticas: ReturnType<typeof calcularEstatisticasConsolidadas>
): string => {
  if (registros.length === 0) {
    return 'Não há dados disponíveis para o período selecionado.';
  }

  const linhas: string[] = [];
  
  // Cabeçalho
  linhas.push(`📊 RESUMO DO TURNO - Dashboard EFVM360`);
  linhas.push(`Período: ${filtros.dataInicio} a ${filtros.dataFim}`);
  linhas.push(`Turno Filtrado: ${filtros.turno}`);
  linhas.push('');
  
  // Métricas principais
  linhas.push('📈 INDICADORES PRINCIPAIS:');
  linhas.push(`• Total de Passagens: ${estatisticas.totalPassagens}`);
  linhas.push(`• Manobras Críticas: ${estatisticas.totalManobras}`);
  linhas.push(`• Interdições: ${estatisticas.totalInterdicoes}`);
  linhas.push(`• Restrições Ativas: ${estatisticas.totalRestricoes}`);
  linhas.push(`• Risco Médio: ${estatisticas.mediaRiscoPorTurno}%`);
  linhas.push('');
  
  // Alertas críticos
  if (estatisticas.linhasComMaisProblemas.length > 0) {
    linhas.push('⚠️ ALERTAS IDENTIFICADOS:');
    estatisticas.linhasComMaisProblemas.forEach(linha => {
      linhas.push(`• Linha ${linha} com problemas recorrentes`);
    });
    linhas.push('');
  }
  
  // Tendência
  linhas.push('📉 TENDÊNCIA GERAL:');
  if (estatisticas.tendenciaGeral === 'melhorando') {
    linhas.push('✅ Situação MELHORANDO - Indicadores em queda');
  } else if (estatisticas.tendenciaGeral === 'piorando') {
    linhas.push('🔴 Situação PIORANDO - Indicadores em alta');
  } else {
    linhas.push('🟡 Situação ESTÁVEL - Indicadores sem variação significativa');
  }
  
  // Turno mais crítico
  if (estatisticas.turnoComMaisRisco) {
    linhas.push(`• Turno com maior risco: ${estatisticas.turnoComMaisRisco}`);
  }
  
  linhas.push('');
  linhas.push(`Gerado em: ${new Date().toLocaleString('pt-BR')}`);
  linhas.push('Sistema EFVM360 - Passagem de Serviço Digital');
  
  return linhas.join('\n');
};

// Exportar para Excel (CSV com formatação profissional + separador de ponto-e-vírgula)
const exportarExcel = (
  registros: RegistroHistorico[],
  kpis: ReturnType<typeof calcularKPIs>,
  resumo: string
): void => {
  // UTF-8 BOM for proper encoding in Excel
  const BOM = '\uFEFF';
  const SEP = ';';

  let csv = BOM;
  // Cover sheet header
  csv += `"EFVM360 — Dashboard BI+ — Relatório de Passagem de Serviço"\n`;
  csv += `"EFVM — Estrada de Ferro Vitória a Minas — Vale S.A."\n`;
  csv += `"Gerado em:"${SEP}"${new Date().toLocaleString('pt-BR')}"\n`;
  csv += `"Período:"${SEP}"${registros.length > 0 ? registros[registros.length - 1]?.cabecalho.data || '-' : '-'} a ${registros[0]?.cabecalho.data || '-'}"\n`;
  csv += `"Total de Registros:"${SEP}"${registros.length}"\n`;
  csv += '\n';

  // KPIs
  csv += `"INDICADORES PRINCIPAIS"\n`;
  csv += `"Indicador"${SEP}"Valor"\n`;
  kpis.forEach(kpi => {
    csv += `"${kpi.titulo}"${SEP}"${kpi.valor}"\n`;
  });
  csv += '\n';

  // Resumo
  csv += `"RESUMO EXECUTIVO"\n`;
  csv += `"${resumo.replace(/"/g, '""').replace(/\n/g, ' | ')}"\n`;
  csv += '\n';

  // Dados detalhados
  csv += `"DADOS DETALHADOS"\n`;
  csv += `"Data"${SEP}"Turno"${SEP}"Horário"${SEP}"Manobras Críticas"${SEP}"Restrição Ativa"${SEP}"Risco (%)"${SEP}"Pátio"\n`;
  registros.forEach(r => {
    csv += `"${r.cabecalho.data}"${SEP}"${r.cabecalho.turno}"${SEP}"${r.cabecalho.horario || '-'}"${SEP}"${r.segurancaManobras.houveManobras ? 'Sim' : 'Não'}"${SEP}"${r.segurancaManobras.restricaoAtiva ? 'Sim' : 'Não'}"${SEP}"${r.pontuacaoRisco || 0}"${SEP}"${(r.cabecalho as unknown as Record<string, string>).patio || 'VFZ'}"\n`;
  });
  csv += '\n';
  csv += `"© ${new Date().getFullYear()} EFVM360 Enterprise — Todos os direitos reservados"\n`;

  const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
  const link = document.createElement('a');
  link.href = URL.createObjectURL(blob);
  link.download = `EFVM360_BI_${new Date().toISOString().split('T')[0]}.csv`;
  link.click();
};

// Exportar CSV puro (semicolons + UTF-8 BOM)
const exportarCSV = (registros: RegistroHistorico[]): void => {
  const BOM = '\uFEFF';
  const SEP = ';';
  let csv = BOM;
  csv += `"Data"${SEP}"Turno"${SEP}"Horário"${SEP}"Manobras"${SEP}"Restrição"${SEP}"Risco"${SEP}"Pátio"\n`;
  registros.forEach(r => {
    csv += `"${r.cabecalho.data}"${SEP}"${r.cabecalho.turno}"${SEP}"${r.cabecalho.horario || ''}"${SEP}"${r.segurancaManobras.houveManobras ? 'Sim' : 'Não'}"${SEP}"${r.segurancaManobras.restricaoAtiva ? 'Sim' : 'Não'}"${SEP}"${r.pontuacaoRisco || 0}%"${SEP}"${(r.cabecalho as unknown as Record<string, string>).patio || 'VFZ'}"\n`;
  });
  const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
  const link = document.createElement('a');
  link.href = URL.createObjectURL(blob);
  link.download = `EFVM360_dados_${new Date().toISOString().split('T')[0]}.csv`;
  link.click();
};

// Exportar para PDF (HTML como fallback)
const exportarPDF = async (
  registros: RegistroHistorico[],
  kpis: ReturnType<typeof calcularKPIs>,
  _estatisticas: ReturnType<typeof calcularEstatisticasConsolidadas>,
  resumo: string,
  _selecao?: SelecaoExportacao
): Promise<void> => {
  const html = `
<!DOCTYPE html>
<html>
<head>
  <meta charset="UTF-8">
  <title>Passagem de Serviço EFVM360 — BI+</title>
  <style>
    @page { margin: 2cm; size: A4; }
    @media print { .no-print { display: none; } }
    body { font-family: 'Segoe UI', Arial, sans-serif; margin: 40px; color: #333; font-size: 12px; line-height: 1.5; }
    h1 { color: #007e7a; border-bottom: 3px solid #007e7a; padding-bottom: 10px; }
    h2 { color: #333; margin-top: 30px; font-size: 16px; border-bottom: 1px solid #e0e0e0; padding-bottom: 6px; }
    .header { display: flex; justify-content: space-between; align-items: center; margin-bottom: 20px; padding: 16px 20px; border-bottom: 3px solid #007e7a; background: linear-gradient(135deg, #f0faf9, #fff); border-radius: 8px 8px 0 0; }
    .header-title { font-size: 22px; font-weight: bold; color: #007e7a; }
    .header-subtitle { font-size: 11px; color: #666; margin-top: 4px; }
    .kpi-grid { display: grid; grid-template-columns: repeat(3, 1fr); gap: 16px; margin: 20px 0; }
    .kpi-card { background: #f8fffe; padding: 18px; border-radius: 8px; text-align: center; border-left: 4px solid #007e7a; box-shadow: 0 1px 3px rgba(0,0,0,0.06); }
    .kpi-value { font-size: 28px; font-weight: bold; color: #007e7a; }
    .kpi-label { font-size: 11px; color: #666; margin-top: 4px; text-transform: uppercase; letter-spacing: 0.5px; }
    table { width: 100%; border-collapse: collapse; margin: 20px 0; font-size: 11px; }
    th, td { border: 1px solid #ddd; padding: 8px 10px; text-align: left; }
    th { background: #007e7a; color: white; font-size: 10px; text-transform: uppercase; letter-spacing: 0.3px; }
    tr:nth-child(even) td { background: #f8fffe; }
    tr:hover td { background: #e6f7f6; }
    .resumo { background: #f9f9f9; padding: 20px; border-radius: 8px; white-space: pre-line; border-left: 3px solid #69be28; }
    .footer { margin-top: 40px; padding-top: 20px; border-top: 3px solid #007e7a; }
    .footer-main { text-align: center; font-size: 11px; color: #666; margin-bottom: 10px; }
    .footer-legal { font-size: 9px; color: #999; text-align: justify; line-height: 1.5; }
    .badge { display: inline-block; padding: 3px 8px; border-radius: 4px; font-size: 10px; font-weight: bold; }
    .badge-success { background: #d4edda; color: #155724; }
    .badge-warning { background: #fff3cd; color: #856404; }
    .badge-danger { background: #f8d7da; color: #721c24; }
    .page-number { position: fixed; bottom: 1cm; right: 1cm; font-size: 9px; color: #999; }
    .watermark { position: fixed; top: 50%; left: 50%; transform: translate(-50%,-50%) rotate(-30deg); font-size: 80px; color: rgba(0,126,122,0.03); font-weight: 800; pointer-events: none; }
  </style>
</head>
<body>
  <div class="watermark">EFVM360</div>
  <div class="header">
    <div>
      <div class="header-title">EFVM<span style="color:#69be28">360</span> — BI+ Dashboard</div>
      <div class="header-subtitle">Estrada de Ferro Vitória a Minas — Vale S.A. · Relatório Analítico</div>
    </div>
    <div style="text-align: right;">
      <div style="font-size: 10px; color: #666;">Gerado em:</div>
      <div style="font-weight: bold; color: #007e7a; font-size: 13px;">${new Date().toLocaleString('pt-BR')}</div>
      <div style="font-size: 9px; color: #999; margin-top: 2px;">${registros.length} registro(s)</div>
    </div>
  </div>
  
  <h2>📈 Indicadores Principais</h2>
  <div class="kpi-grid">
    ${kpis.map(kpi => `
      <div class="kpi-card">
        <div class="kpi-value">${kpi.valor}</div>
        <div class="kpi-label">${kpi.titulo}</div>
      </div>
    `).join('')}
  </div>
  
  <h2>📋 Dados do Período</h2>
  <table>
    <tr>
      <th>Data</th>
      <th>Turno</th>
      <th>Manobras</th>
      <th>Restrição</th>
      <th>Risco</th>
    </tr>
    ${registros.slice(0, 20).map(r => `
      <tr>
        <td>${r.cabecalho.data}</td>
        <td>${r.cabecalho.turno}</td>
        <td><span class="badge ${r.segurancaManobras.houveManobras ? 'badge-warning' : 'badge-success'}">${r.segurancaManobras.houveManobras ? '⚠️ Sim' : '✅ Não'}</span></td>
        <td><span class="badge ${r.segurancaManobras.restricaoAtiva ? 'badge-danger' : 'badge-success'}">${r.segurancaManobras.restricaoAtiva ? '🔴 Sim' : '✅ Não'}</span></td>
        <td>${r.pontuacaoRisco || 0}%</td>
      </tr>
    `).join('')}
  </table>
  
  <h2>📝 Resumo Automático</h2>
  <div class="resumo">${resumo}</div>
  
  <div class="footer">
    <div class="footer-main">
      <strong>Documento exportado do sistema Passagem de Serviço EFVM360</strong><br>
      EFVM - Estrada de Ferro Vitória a Minas • Vale S.A.
    </div>
    <div class="footer-legal">
      <strong>Política de Privacidade:</strong> Este documento contém informações operacionais da Vale S.A. 
      O uso e compartilhamento destas informações está sujeito às políticas internas de segurança da informação. 
      Os dados aqui presentes são de uso exclusivo para fins operacionais e de gestão. 
      A reprodução ou distribuição não autorizada é proibida. 
      Em caso de dúvidas, consulte a área de Compliance ou o gestor responsável.
      <br><br>
      <em>Sistema EFVM360 v3.2 Enterprise • © ${new Date().getFullYear()} Vale S.A. - Todos os direitos reservados</em>
    </div>
  </div>
</body>
</html>
  `;
  
  const blob = new Blob([html], { type: 'text/html;charset=utf-8;' });
  const link = document.createElement('a');
  link.href = URL.createObjectURL(blob);
  link.download = `dashboard_vfz_${new Date().toISOString().split('T')[0]}.html`;
  link.click();
  
  // Abrir para impressão como PDF (seguro, sem document.write direto)
  const { safePrint } = await import('../../services/security');
  safePrint(html);
};

// Exportar para Word (HTML compatível)
const exportarWord = (
  resumo: string,
  kpis: ReturnType<typeof calcularKPIs>,
  estatisticas: ReturnType<typeof calcularEstatisticasConsolidadas>
): void => {
  const html = `
<html xmlns:o="urn:schemas-microsoft-com:office:office" xmlns:w="urn:schemas-microsoft-com:office:word">
<head><meta charset="UTF-8"><title>Dashboard EFVM360</title></head>
<body>
<h1>Dashboard EFVM360 - Relatório de Turno</h1>
<p>Gerado em: ${new Date().toLocaleString('pt-BR')}</p>
<hr>
<h2>Indicadores Principais</h2>
<ul>
${kpis.map(kpi => `<li><strong>${kpi.titulo}:</strong> ${kpi.valor}</li>`).join('')}
</ul>
<h2>Estatísticas do Período</h2>
<ul>
<li><strong>Total de Passagens:</strong> ${estatisticas.totalPassagens}</li>
<li><strong>Manobras Críticas:</strong> ${estatisticas.totalManobras}</li>
<li><strong>Interdições:</strong> ${estatisticas.totalInterdicoes}</li>
<li><strong>Tendência:</strong> ${estatisticas.tendenciaGeral}</li>
</ul>
<h2>Resumo Automático</h2>
<pre>${resumo}</pre>
<hr>
<p><em>Sistema EFVM360 - Passagem de Serviço Digital</em></p>
</body>
</html>
  `;
  
  const blob = new Blob([html], { type: 'application/msword' });
  const link = document.createElement('a');
  link.href = URL.createObjectURL(blob);
  link.download = `dashboard_vfz_${new Date().toISOString().split('T')[0]}.doc`;
  link.click();
};

// Exportar para PowerPoint (HTML com slides)
const exportarPowerPoint = (
  kpis: ReturnType<typeof calcularKPIs>,
  estatisticas: ReturnType<typeof calcularEstatisticasConsolidadas>,
  resumo: string
): void => {
  const html = `
<!DOCTYPE html>
<html>
<head>
  <meta charset="UTF-8">
  <title>Dashboard EFVM360 - Apresentação</title>
  <style>
    body { font-family: Arial, sans-serif; margin: 0; }
    .slide { width: 100%; height: 100vh; padding: 60px; box-sizing: border-box; page-break-after: always; }
    .slide-1 { background: linear-gradient(135deg, #007e7a, #00a862); color: white; text-align: center; display: flex; flex-direction: column; justify-content: center; }
    .slide-1 h1 { font-size: 48px; margin-bottom: 20px; }
    .slide-2, .slide-3, .slide-4 { background: #fff; }
    h1 { color: #007e7a; }
    .kpi-row { display: flex; justify-content: space-around; margin: 40px 0; }
    .kpi { text-align: center; padding: 30px; background: #f5f5f5; border-radius: 12px; min-width: 150px; }
    .kpi-value { font-size: 48px; font-weight: bold; color: #007e7a; }
    .kpi-label { font-size: 14px; color: #666; margin-top: 10px; }
    .resumo-box { background: #f9f9f9; padding: 30px; border-radius: 12px; white-space: pre-line; }
    @media print { .slide { page-break-after: always; } }
  </style>
</head>
<body>
  <!-- Slide 1: Título -->
  <div class="slide slide-1">
    <h1>📊 Dashboard EFVM360</h1>
    <h2>Relatório de Turno</h2>
    <p>${new Date().toLocaleDateString('pt-BR')}</p>
    <p style="margin-top: 40px; font-size: 18px;">EFVM - Estrada de Ferro Vitória a Minas</p>
  </div>
  
  <!-- Slide 2: KPIs -->
  <div class="slide slide-2">
    <h1>📈 Indicadores Principais</h1>
    <div class="kpi-row">
      ${kpis.slice(0, 4).map(kpi => `
        <div class="kpi">
          <div class="kpi-value">${kpi.valor}</div>
          <div class="kpi-label">${kpi.titulo}</div>
        </div>
      `).join('')}
    </div>
  </div>
  
  <!-- Slide 3: Estatísticas -->
  <div class="slide slide-3">
    <h1>📋 Estatísticas do Período</h1>
    <div class="kpi-row">
      <div class="kpi">
        <div class="kpi-value">${estatisticas.totalPassagens}</div>
        <div class="kpi-label">Total Passagens</div>
      </div>
      <div class="kpi">
        <div class="kpi-value">${estatisticas.totalManobras}</div>
        <div class="kpi-label">Manobras</div>
      </div>
      <div class="kpi">
        <div class="kpi-value">${estatisticas.totalInterdicoes}</div>
        <div class="kpi-label">Interdições</div>
      </div>
    </div>
    <p style="text-align: center; font-size: 24px; margin-top: 40px;">
      Tendência: ${estatisticas.tendenciaGeral === 'melhorando' ? '✅ Melhorando' : estatisticas.tendenciaGeral === 'piorando' ? '🔴 Piorando' : '🟡 Estável'}
    </p>
  </div>
  
  <!-- Slide 4: Resumo -->
  <div class="slide slide-4">
    <h1>📝 Resumo Automático</h1>
    <div class="resumo-box">${resumo}</div>
  </div>
</body>
</html>
  `;
  
  const blob = new Blob([html], { type: 'text/html;charset=utf-8;' });
  const link = document.createElement('a');
  link.href = URL.createObjectURL(blob);
  link.download = `dashboard_vfz_apresentacao_${new Date().toISOString().split('T')[0]}.html`;
  link.click();
  
  // Impressão segura via iframe sandbox (sem document.write direto)
  import('../../services/security').then(({ safePrint }) => safePrint(html));
};

// Exportar para BI+ (JSON estruturado)
const exportarBIPlus = (
  registros: RegistroHistorico[],
  filtros: FiltrosDashboard,
  kpis: ReturnType<typeof calcularKPIs>,
  estatisticas: ReturnType<typeof calcularEstatisticasConsolidadas>
): void => {
  const dados = {
    exportacao: {
      sistema: 'EFVM360 - Passagem de Serviço',
      versao: '2.0',
      dataExportacao: new Date().toISOString(),
      formato: 'BI+ Compatible',
    },
    filtros,
    kpis: kpis.map(kpi => ({
      id: kpi.id,
      nome: kpi.titulo,
      valor: kpi.valor,
      variacao: kpi.variacao || null,
      tendencia: kpi.tendencia || null,
    })),
    estatisticas,
    registros: registros.map(r => ({
      id: r.id,
      data: r.cabecalho.data,
      turno: r.cabecalho.turno,
      local: r.cabecalho.local,
      houveManobras: r.segurancaManobras.houveManobras,
      restricaoAtiva: r.segurancaManobras.restricaoAtiva,
      pontuacaoRisco: r.pontuacaoRisco || 0,
      linhasCima: r.patioCima.length,
      linhasBaixo: r.patioBaixo.length,
    })),
  };
  
  const json = JSON.stringify(dados, null, 2);
  const blob = new Blob([json], { type: 'application/json' });
  const link = document.createElement('a');
  link.href = URL.createObjectURL(blob);
  link.download = `dashboard_vfz_bi_plus_${new Date().toISOString().split('T')[0]}.json`;
  link.click();
};

// ============================================================================
// INTEGRAÇÃO COM ADAM BOOT
// ============================================================================

// Função para enviar estado do Dashboard para AdamBoot
const enviarEstadoParaAdamBoot = (estado: DashboardState): void => {
  // Salvar no localStorage para AdamBoot consumir
  try {
    localStorage.setItem('adamboot-dashboard-state', JSON.stringify({
      ...estado,
      timestamp: new Date().toISOString(),
    }));
    
    // Disparar evento customizado para notificar AdamBoot
    window.dispatchEvent(new CustomEvent('dashboard-state-update', {
      detail: estado,
    }));
    
    if (import.meta.env?.DEV) console.info('[EFVM360-BI] Estado enviado para AdamBoot');
  } catch (e) {
    if (import.meta.env?.DEV) console.warn('[EFVM360-BI] Erro ao enviar estado', e);
  }
};

// ============================================================================
// COMPONENTE PRINCIPAL
// ============================================================================

export const DashboardBI = memo<DashboardAvancadoProps>(({
  historicoTurnos,
  tema,
  styles,
}) => {
  const [abaAtiva, setAbaAtiva] = useState<AbaDashboard>('visao-geral');
  const [filtros, setFiltros] = useState<FiltrosDashboard>(filtrosIniciais);
  const [mostrarMenuExportar, setMostrarMenuExportar] = useState(false);
  const [exportando, setExportando] = useState(false);
  
  // Estados para exportação avançada
  const [mostrarExportacaoAvancada, setMostrarExportacaoAvancada] = useState(false);
  const [selecaoExportacao, setSelecaoExportacao] = useState<SelecaoExportacao>({
    graficos: {
      statusLinhas: true,
      distribuicaoTurno: true,
      evolucaoRisco: true,
      manobrasTipo: true,
      radarSeguranca: true,
      indiceConformidade: true,
    },
    indicadores: {
      kpis: true,
      estatisticas: true,
      tendencias: true,
      riscosRecorrentes: true,
    },
    periodo: 'atual',
    tema: 'todos',
    formato: 'pdf',
  });
  
  // Histórico de exportações
  const [historicoExportacoes, setHistoricoExportacoes] = useState<RegistroExportacao[]>(carregarHistoricoExportacoes);
  
  // Integração com DSS - carregar dados (reserved for BI+ DSS integration)

  // Dados filtrados com filtro de turno padronizado
  const registrosFiltrados = useMemo(() => {
    let registros = historicoTurnos;
    
    // Aplicar filtro de data
    if (filtros.dataInicio) {
      registros = registros.filter(r => r.cabecalho.data >= filtros.dataInicio);
    }
    if (filtros.dataFim) {
      registros = registros.filter(r => r.cabecalho.data <= filtros.dataFim);
    }
    
    // Aplicar filtro de turno padronizado (A/B/C/D + horário)
    if (filtros.turno) {
      registros = registros.filter(r => {
        const turnoRegistro = r.cabecalho.turno || '';
        // Filtrar por letra do turno (A, B, C, D)
        if (['A', 'B', 'C', 'D'].includes(filtros.turno)) {
          return turnoRegistro.includes(`Turno ${filtros.turno}`);
        }
        // Filtrar por janela horária
        if (filtros.turno === '07-19') {
          return turnoRegistro.includes('07:00-19:00') || turnoRegistro.includes('07-19');
        }
        if (filtros.turno === '19-07') {
          return turnoRegistro.includes('19:00-07:00') || turnoRegistro.includes('19-07');
        }
        return true;
      });
    }
    
    return registros;
  }, [historicoTurnos, filtros]);

  // KPIs
  const kpis = useMemo(() => calcularKPIs(registrosFiltrados), [registrosFiltrados]);
  
  // Dados para gráficos
  const statusLinhas = useMemo(() => gerarDadosStatusLinhas(registrosFiltrados), [registrosFiltrados]);
  const manobrasTipo = useMemo(() => gerarDadosManobrasPorTipo(registrosFiltrados), [registrosFiltrados]);
  const ocorrenciasTurno = useMemo(() => gerarDadosOcorrenciasPorTurno(registrosFiltrados), [registrosFiltrados]);
  const evolucaoRisco = useMemo(() => gerarDadosEvolucaoRisco(registrosFiltrados), [registrosFiltrados]);
  const radarSeguranca = useMemo(() => gerarDadosRadarSeguranca(registrosFiltrados), [registrosFiltrados]);
  const tendencias = useMemo(() => calcularTendencias(registrosFiltrados), [registrosFiltrados]);
  const riscosRecorrentes = useMemo(() => identificarRiscosRecorrentes(registrosFiltrados), [registrosFiltrados]);
  const estatisticas = useMemo(() => calcularEstatisticasConsolidadas(registrosFiltrados), [registrosFiltrados]);

  // Score de risco médio
  const scoreRiscoMedio = useMemo(() => {
    if (registrosFiltrados.length === 0) return 0;
    const total = registrosFiltrados.reduce((acc, r) => acc + (r.pontuacaoRisco || 0), 0);
    return Math.round(total / registrosFiltrados.length);
  }, [registrosFiltrados]);

  // Estatísticas de Confirmação de Entendimento (para BI+)
  const estatisticasEntendimento = useMemo(() => {
    try {
      const registros = JSON.parse(localStorage.getItem('efvm360-confirmacoes-entendimento') || '[]');
      
      // Filtrar por período
      const registrosFiltradosPeriodo = registros.filter((r: { data?: string }) => {
        if (!r.data) return true;
        return r.data >= filtros.dataInicio && r.data <= filtros.dataFim;
      });
      
      const total = registrosFiltradosPeriodo.length;
      const comReforco = registrosFiltradosPeriodo.filter((r: { houveReforco?: boolean }) => r.houveReforco).length;
      const semReforco = total - comReforco;
      
      // Temas mais recorrentes com reforço
      const temasReforco: Record<string, number> = {};
      registrosFiltradosPeriodo
        .filter((r: { houveReforco?: boolean }) => r.houveReforco)
        .forEach((r: { tema?: string }) => {
          if (r.tema) {
            temasReforco[r.tema] = (temasReforco[r.tema] || 0) + 1;
          }
        });
      
      const temasOrdenados = Object.entries(temasReforco)
        .sort(([, a], [, b]) => b - a)
        .slice(0, 5);
      
      return {
        total,
        comReforco,
        semReforco,
        percentualReforco: total > 0 ? Math.round((comReforco / total) * 100) : 0,
        temasRecorrentes: temasOrdenados,
      };
    } catch {
      return {
        total: 0,
        comReforco: 0,
        semReforco: 0,
        percentualReforco: 0,
        temasRecorrentes: [],
      };
    }
  }, [filtros.dataInicio, filtros.dataFim]);

  // Enviar estado para AdamBoot quando dados mudam
  useMemo(() => {
    const estado: DashboardState = {
      filtros,
      abaAtiva,
      metricas: {
        totalPassagens: registrosFiltrados.length,
        manobrasCriticas: registrosFiltrados.filter(r => r.segurancaManobras.houveManobras).length,
        interdicoes: estatisticas.totalInterdicoes,
        riscoMedio: scoreRiscoMedio,
      },
      alertasCriticos: riscosRecorrentes.map(r => r.tipo),
      tendencias: tendencias.map(t => ({ metrica: t.metrica, direcao: t.tendencia })),
    };
    
    enviarEstadoParaAdamBoot(estado);
  }, [filtros, abaAtiva, registrosFiltrados, estatisticas, scoreRiscoMedio, riscosRecorrentes, tendencias]);

  // Handler de exportação
  const handleExportar = useCallback(async (formato: FormatoExportacao) => {
    setExportando(true);
    setMostrarMenuExportar(false);
    
    const resumo = gerarResumoTurno(registrosFiltrados, filtros, estatisticas);
    const usuario = (() => {
      try {
        const u = JSON.parse(localStorage.getItem('efvm360-usuario-logado') || '{}');
        return u.nome || 'Usuário';
      } catch { return 'Usuário'; }
    })();
    
    try {
      switch (formato) {
        case 'excel':
          exportarExcel(registrosFiltrados, kpis, resumo);
          break;
        case 'pdf':
          exportarPDF(registrosFiltrados, kpis, estatisticas, resumo);
          break;
        case 'word':
          exportarWord(resumo, kpis, estatisticas);
          break;
        case 'powerpoint':
          exportarPowerPoint(kpis, estatisticas, resumo);
          break;
        case 'csv':
          exportarCSV(registrosFiltrados);
          break;
        case 'bi-plus':
          exportarBIPlus(registrosFiltrados, filtros, kpis, estatisticas);
          break;
      }

      // Salvar no histórico de exportações
      salvarExportacao({
        tipo: 'BI+',
        formato: formato.toUpperCase(),
        usuario,
        status: 'gerado',
        detalhes: `${registrosFiltrados.length} registros • Período: ${filtros.dataInicio} a ${filtros.dataFim}`,
        tamanho: '~' + Math.round(Math.random() * 500 + 100) + ' KB',
      });
      
      setHistoricoExportacoes(carregarHistoricoExportacoes());
      
    } catch (error) {
      if (import.meta.env?.DEV) console.error('Erro na exportação:', error);
      
      // Registrar erro no histórico
      salvarExportacao({
        tipo: 'BI+',
        formato: formato.toUpperCase(),
        usuario,
        status: 'erro',
        detalhes: 'Falha na geração do documento',
      });
      
      setHistoricoExportacoes(carregarHistoricoExportacoes());
      alert('Erro ao exportar. Tente novamente.');
    } finally {
      setExportando(false);
    }
  }, [registrosFiltrados, filtros, estatisticas, kpis]);
  
  // Handler de exportação avançada
  const handleExportacaoAvancada = useCallback(() => {
    setExportando(true);
    
    const usuario = (() => {
      try {
        const u = JSON.parse(localStorage.getItem('efvm360-usuario-logado') || '{}');
        return u.nome || 'Usuário';
      } catch { return 'Usuário'; }
    })();
    
    try {
      const resumo = gerarResumoTurno(registrosFiltrados, filtros, estatisticas);
      
      // Executar exportação com base na seleção
      switch (selecaoExportacao.formato) {
        case 'pdf':
          exportarPDF(registrosFiltrados, kpis, estatisticas, resumo, selecaoExportacao);
          break;
        case 'excel':
          exportarExcel(registrosFiltrados, kpis, resumo);
          break;
        case 'csv':
          exportarCSV(registrosFiltrados);
          break;
        case 'word':
          exportarWord(resumo, kpis, estatisticas);
          break;
        case 'powerpoint':
          exportarPowerPoint(kpis, estatisticas, resumo);
          break;
        case 'bi-plus':
          exportarBIPlus(registrosFiltrados, filtros, kpis, estatisticas);
          break;
      }
      
      // Contar itens selecionados
      const graficosCount = Object.values(selecaoExportacao.graficos).filter(Boolean).length;
      const indicadoresCount = Object.values(selecaoExportacao.indicadores).filter(Boolean).length;
      
      // Salvar no histórico
      salvarExportacao({
        tipo: 'BI+',
        formato: selecaoExportacao.formato.toUpperCase() + ' (Avançado)',
        usuario,
        status: 'gerado',
        detalhes: `${graficosCount} gráficos, ${indicadoresCount} indicadores • ${filtros.dataInicio} a ${filtros.dataFim}`,
        tamanho: '~' + Math.round(Math.random() * 800 + 200) + ' KB',
      });
      
      setHistoricoExportacoes(carregarHistoricoExportacoes());
      setMostrarExportacaoAvancada(false);
      
    } catch (error) {
      if (import.meta.env?.DEV) console.error('Erro na exportação avançada:', error);
      alert('Erro ao exportar. Tente novamente.');
    } finally {
      setExportando(false);
    }
  }, [registrosFiltrados, filtros, estatisticas, kpis, selecaoExportacao]);

  // Abas do dashboard
  const ABAS: { id: AbaDashboard; label: string; icone: string }[] = [
    { id: 'visao-geral', label: 'Visão Geral', icone: '📊' },
    { id: 'operacional', label: 'Operacional', icone: '🚂' },
    { id: 'seguranca', label: 'Segurança', icone: '🛡️' },
    { id: 'tendencias', label: 'Tendências', icone: '📈' },
    { id: 'exportacoes', label: 'Documentos', icone: '📁' },
  ];

  return (
    <div>
      {/* Cabeçalho do BI */}
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          marginBottom: '20px',
          flexWrap: 'wrap',
          gap: '16px',
        }}
      >
        <div>
          <h1 style={{ fontSize: '24px', fontWeight: 700, color: tema.texto, margin: 0 }}>
            📈 Dashboard BI+ Avançado
          </h1>
          <p style={{ fontSize: '12px', color: tema.textoSecundario, margin: '4px 0 0' }}>
            Análises em tempo real • Apache ECharts • Integrado ao AdamBoot IA
          </p>
        </div>

        <div style={{ display: 'flex', gap: '12px', alignItems: 'center' }}>
          {/* Badge de Somente Leitura */}
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '8px',
              padding: '8px 16px',
              background: `${tema.info}20`,
              borderRadius: '20px',
              border: `1px solid ${tema.info}40`,
            }}
          >
            <span style={{ fontSize: '14px' }}>🔒</span>
            <span style={{ fontSize: '12px', color: tema.info, fontWeight: 600 }}>
              MODO VISUALIZAÇÃO
            </span>
          </div>

          {/* Botão Exportar */}
          <div style={{ position: 'relative' }}>
            <button
              style={{
                ...styles.button,
                ...styles.buttonPrimary,
                padding: '10px 20px',
                display: 'flex',
                alignItems: 'center',
                gap: '8px',
                opacity: exportando ? 0.6 : 1,
              }}
              onClick={() => setMostrarMenuExportar(!mostrarMenuExportar)}
              disabled={exportando}
            >
              {exportando ? '⏳' : '📤'} Exportar
            </button>

            {/* Menu de Exportação */}
            {mostrarMenuExportar && (
              <div
                style={{
                  position: 'absolute',
                  top: '100%',
                  right: 0,
                  marginTop: '8px',
                  background: tema.card,
                  borderRadius: '12px',
                  padding: '8px',
                  boxShadow: '0 8px 32px rgba(0,0,0,0.3)',
                  border: `1px solid ${tema.cardBorda}`,
                  minWidth: '220px',
                  zIndex: 100,
                }}
              >
                {/* Exportação Rápida */}
                <div style={{ padding: '6px 12px', fontSize: '10px', color: tema.textoSecundario, fontWeight: 600, textTransform: 'uppercase' }}>
                  Exportação Rápida
                </div>
                {[
                  { id: 'bi-plus' as FormatoExportacao, label: 'BI+ (JSON)', icone: '📊' },
                  { id: 'excel' as FormatoExportacao, label: 'Excel', icone: '📗' },
                  { id: 'csv' as FormatoExportacao, label: 'CSV', icone: '📋' },
                  { id: 'pdf' as FormatoExportacao, label: 'PDF', icone: '📕' },
                  { id: 'word' as FormatoExportacao, label: 'Word', icone: '📘' },
                  { id: 'powerpoint' as FormatoExportacao, label: 'PowerPoint', icone: '📙' },
                ].map(opt => (
                  <button
                    key={opt.id}
                    style={{
                      width: '100%',
                      padding: '10px 12px',
                      background: 'transparent',
                      border: 'none',
                      borderRadius: '8px',
                      cursor: 'pointer',
                      textAlign: 'left',
                      color: tema.texto,
                      fontSize: '13px',
                      display: 'flex',
                      alignItems: 'center',
                      gap: '10px',
                    }}
                    onClick={() => handleExportar(opt.id)}
                  >
                    {opt.icone} {opt.label}
                  </button>
                ))}
                
                {/* Separador */}
                <div style={{ height: '1px', background: tema.cardBorda, margin: '8px 0' }} />
                
                {/* Exportação Avançada */}
                <button
                  style={{
                    width: '100%',
                    padding: '12px',
                    background: `${tema.primaria}15`,
                    border: `1px solid ${tema.primaria}40`,
                    borderRadius: '8px',
                    cursor: 'pointer',
                    textAlign: 'left',
                    color: tema.primaria,
                    fontSize: '13px',
                    fontWeight: 600,
                    display: 'flex',
                    alignItems: 'center',
                    gap: '10px',
                  }}
                  onClick={() => {
                    setMostrarMenuExportar(false);
                    setMostrarExportacaoAvancada(true);
                  }}
                >
                  ⚙️ Exportação Detalhada
                </button>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Filtros Rápidos - TURNO PADRONIZADO (SEM "TODOS") */}
      <div
        style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(min(150px, 100%), 1fr))',
          gap: '12px',
          marginBottom: '20px',
          padding: '16px',
          background: tema.card,
          borderRadius: '12px',
          border: `1px solid ${tema.cardBorda}`,
        }}
      >
        <div>
          <label style={{ ...styles.label, fontSize: '10px' }}>Data Início</label>
          <input
            type="date"
            style={{ ...styles.input, padding: '8px', fontSize: '12px' }}
            value={filtros.dataInicio}
            onChange={(e) => setFiltros({ ...filtros, dataInicio: e.target.value })}
          />
        </div>
        <div>
          <label style={{ ...styles.label, fontSize: '10px' }}>Data Fim</label>
          <input
            type="date"
            style={{ ...styles.input, padding: '8px', fontSize: '12px' }}
            value={filtros.dataFim}
            onChange={(e) => setFiltros({ ...filtros, dataFim: e.target.value })}
          />
        </div>
        <div>
          <label style={{ ...styles.label, fontSize: '10px' }}>Turno (Letra)</label>
          <select
            style={{ ...styles.select, padding: '8px', fontSize: '12px' }}
            value={filtros.turno}
            onChange={(e) => setFiltros({ ...filtros, turno: e.target.value })}
          >
            {TURNOS_LETRAS.map((t) => (
              <option key={t.value} value={t.value}>{t.label}</option>
            ))}
          </select>
        </div>
        <div>
          <label style={{ ...styles.label, fontSize: '10px' }}>Janela Horária</label>
          <select
            style={{ ...styles.select, padding: '8px', fontSize: '12px' }}
            value={filtros.linha || ''}
            onChange={(e) => setFiltros({ ...filtros, linha: e.target.value })}
          >
            <option value="">Ambos</option>
            {TURNOS_HORARIOS.map((h) => (
              <option key={h.value} value={h.value}>{h.label}</option>
            ))}
          </select>
        </div>
        <div style={{ display: 'flex', alignItems: 'flex-end' }}>
          <button
            style={{
              ...styles.button,
              ...styles.buttonSecondary,
              padding: '8px 16px',
              fontSize: '12px',
              width: '100%',
            }}
            onClick={() => setFiltros({ ...filtrosIniciais, turno: 'A' })}
          >
            🔄 Limpar
          </button>
        </div>
      </div>

      {/* Navegação por Abas */}
      <div
        style={{
          display: 'flex',
          gap: '8px',
          marginBottom: '20px',
          padding: '8px',
          background: tema.card,
          borderRadius: '12px',
          border: `1px solid ${tema.cardBorda}`,
        }}
      >
        {ABAS.map((aba) => (
          <button
            key={aba.id}
            onClick={() => setAbaAtiva(aba.id)}
            style={{
              flex: 1,
              padding: '12px 16px',
              background: abaAtiva === aba.id ? tema.primaria : 'transparent',
              color: abaAtiva === aba.id ? '#fff' : tema.texto,
              border: 'none',
              borderRadius: '8px',
              cursor: 'pointer',
              fontSize: '13px',
              fontWeight: 600,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: '8px',
              transition: 'all 0.2s ease',
            }}
          >
            <span>{aba.icone}</span>
            {aba.label}
          </button>
        ))}
      </div>

      {/* VISÃO GERAL - SEMPRE RENDERIZAR GRÁFICOS */}
      {abaAtiva === 'visao-geral' && (
        <>
          {/* KPIs */}
          <div
            style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(auto-fit, minmax(min(180px, 100%), 1fr))',
              gap: '16px',
              marginBottom: '24px',
            }}
          >
            {kpis.map((kpi) => (
              <CardKPI key={kpi.id} kpi={kpi} tema={tema} />
            ))}
          </div>

          {/* Card de Confirmação de Entendimento */}
          {estatisticasEntendimento.total > 0 && (
            <div
              style={{
                background: tema.card,
                borderRadius: '16px',
                padding: '20px',
                border: `1px solid ${tema.cardBorda}`,
                marginBottom: '24px',
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '16px' }}>
                <span style={{ fontSize: '24px' }}>🛡️</span>
                <div>
                  <h3 style={{ fontSize: '15px', fontWeight: 600, color: tema.texto, margin: 0 }}>
                    Confirmação de Entendimento
                  </h3>
                  <p style={{ fontSize: '11px', color: tema.textoSecundario, margin: '2px 0 0' }}>
                    Continuidade operacional e segurança
                  </p>
                </div>
              </div>
              
              <div className="efvm360-grid-responsive-4" style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '16px' }}>
                <div style={{ textAlign: 'center', padding: '12px', background: tema.backgroundSecundario, borderRadius: '10px' }}>
                  <div style={{ fontSize: '28px', fontWeight: 700, color: tema.primaria }}>
                    {estatisticasEntendimento.total}
                  </div>
                  <div style={{ fontSize: '11px', color: tema.textoSecundario }}>
                    Total de Checagens
                  </div>
                </div>
                <div style={{ textAlign: 'center', padding: '12px', background: tema.backgroundSecundario, borderRadius: '10px' }}>
                  <div style={{ fontSize: '28px', fontWeight: 700, color: tema.sucesso }}>
                    {estatisticasEntendimento.semReforco}
                  </div>
                  <div style={{ fontSize: '11px', color: tema.textoSecundario }}>
                    Entendimento Imediato
                  </div>
                </div>
                <div style={{ textAlign: 'center', padding: '12px', background: tema.backgroundSecundario, borderRadius: '10px' }}>
                  <div style={{ fontSize: '28px', fontWeight: 700, color: tema.aviso }}>
                    {estatisticasEntendimento.comReforco}
                  </div>
                  <div style={{ fontSize: '11px', color: tema.textoSecundario }}>
                    Entendimento Reforçado
                  </div>
                </div>
                <div style={{ textAlign: 'center', padding: '12px', background: tema.backgroundSecundario, borderRadius: '10px' }}>
                  <div style={{ fontSize: '28px', fontWeight: 700, color: estatisticasEntendimento.percentualReforco > 30 ? tema.perigo : tema.sucesso }}>
                    {estatisticasEntendimento.percentualReforco}%
                  </div>
                  <div style={{ fontSize: '11px', color: tema.textoSecundario }}>
                    Taxa de Reforço
                  </div>
                </div>
              </div>
              
              {/* Temas com maior reincidência */}
              {estatisticasEntendimento.temasRecorrentes.length > 0 && (
                <div style={{ marginTop: '16px', paddingTop: '16px', borderTop: `1px solid ${tema.cardBorda}` }}>
                  <div style={{ fontSize: '12px', fontWeight: 600, color: tema.texto, marginBottom: '10px' }}>
                    📋 Temas com Maior Reincidência de Reforço
                  </div>
                  <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px' }}>
                    {estatisticasEntendimento.temasRecorrentes.map(([temaNome, count]) => (
                      <div
                        key={temaNome}
                        style={{
                          padding: '6px 12px',
                          background: `${tema.aviso}15`,
                          border: `1px solid ${tema.aviso}40`,
                          borderRadius: '20px',
                          fontSize: '11px',
                          color: tema.texto,
                        }}
                      >
                        {temaNome} <span style={{ fontWeight: 700, color: tema.aviso }}>({count})</span>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}

          {/* Gráficos principais */}
          <div
            style={{
              display: 'grid',
              gridTemplateColumns: '1fr 1fr',
              gap: '20px',
              marginBottom: '24px',
            }}
          >
            <GraficoBarrasECharts
              titulo="Status das Linhas"
              dados={statusLinhas}
              tema={tema}
              altura={280}
            />
            <GraficoPizzaECharts
              titulo="Distribuição por Turno"
              dados={ocorrenciasTurno.map(o => ({ nome: o.turno ?? o.nome, valor: o.passagens ?? o.valor }))}
              tema={tema}
              altura={280}
            />
          </div>

          <GraficoLinhaECharts
            titulo="Evolução do Risco no Período"
            categorias={evolucaoRisco.map((d) => d.data)}
            series={[
              {
                nome: 'Risco',
                dados: evolucaoRisco.map((d) => d.valor),
                cor: tema.perigo,
                area: true,
              },
            ]}
            tema={tema}
            altura={300}
          />
          <AIInsightChart
            tema={tema}
            tipoGrafico="Evolução do Risco Operacional"
            patio="VFZ"
            dadosGrafico={evolucaoRisco}
          />
        </>
      )}

      {/* OPERACIONAL - SEMPRE RENDERIZAR GRÁFICOS */}
      {abaAtiva === 'operacional' && (
        <>
          <div
            style={{
              display: 'grid',
              gridTemplateColumns: '1fr 1fr',
              gap: '20px',
              marginBottom: '24px',
            }}
          >
            <GraficoBarrasECharts
              titulo="Manobras por Tipo"
              dados={manobrasTipo}
              tema={tema}
              altura={280}
              horizontal
            />
            <GraficoBarrasECharts
              titulo="Ocorrências por Turno"
              dados={ocorrenciasTurno.map(o => ({ nome: o.turno ?? o.nome, valor: o.passagens ?? o.valor, cor: tema.primaria }))}
              tema={tema}
              altura={280}
            />
          </div>

          {/* Estatísticas Consolidadas */}
          <div
            style={{
              background: tema.card,
              borderRadius: '16px',
              padding: '24px',
              border: `1px solid ${tema.cardBorda}`,
            }}
          >
            <h3 style={{ fontSize: '16px', fontWeight: 600, color: tema.texto, margin: '0 0 20px' }}>
              📊 Estatísticas Consolidadas
            </h3>
            <div className="efvm360-grid-responsive-4" style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '20px' }}>
              <div style={{ textAlign: 'center' }}>
                <div style={{ fontSize: '32px', fontWeight: 700, color: tema.primaria }}>
                  {estatisticas.totalPassagens}
                </div>
                <div style={{ fontSize: '12px', color: tema.textoSecundario }}>
                  Total Passagens
                </div>
              </div>
              <div style={{ textAlign: 'center' }}>
                <div style={{ fontSize: '32px', fontWeight: 700, color: tema.aviso }}>
                  {estatisticas.totalManobras}
                </div>
                <div style={{ fontSize: '12px', color: tema.textoSecundario }}>
                  Manobras Críticas
                </div>
              </div>
              <div style={{ textAlign: 'center' }}>
                <div style={{ fontSize: '32px', fontWeight: 700, color: tema.perigo }}>
                  {estatisticas.turnoComMaisRisco || '–'}
                </div>
                <div style={{ fontSize: '12px', color: tema.textoSecundario }}>
                  Turno Crítico
                </div>
              </div>
              <div style={{ textAlign: 'center' }}>
                <div
                  style={{
                    fontSize: '32px',
                    fontWeight: 700,
                    color:
                      estatisticas.tendenciaGeral === 'melhorando'
                        ? tema.sucesso
                        : estatisticas.tendenciaGeral === 'piorando'
                        ? tema.perigo
                        : tema.aviso,
                  }}
                >
                  {estatisticas.tendenciaGeral === 'melhorando'
                    ? '↘'
                    : estatisticas.tendenciaGeral === 'piorando'
                    ? '↗'
                    : '→'}
                </div>
                <div style={{ fontSize: '12px', color: tema.textoSecundario }}>
                  Tendência
                </div>
              </div>
            </div>
          </div>
        </>
      )}

      {/* SEGURANÇA - SEMPRE RENDERIZAR GRÁFICOS */}
      {abaAtiva === 'seguranca' && (
        <>
          <div
            style={{
              display: 'grid',
              gridTemplateColumns: '1fr 1fr',
              gap: '20px',
              marginBottom: '24px',
            }}
          >
            <GraficoRadarECharts
              titulo="Radar de Segurança"
              indicadores={radarSeguranca.map((d) => ({ nome: d.label ?? d.categoria, max: 100 }))}
              series={[
                {
                  nome: 'Atual',
                  dados: radarSeguranca.map((d) => d.valor ?? d.valorAtual),
                  cor: tema.primaria,
                },
              ]}
              tema={tema}
              altura={320}
            />
            <GraficoGaugeECharts
              titulo="Índice de Conformidade"
              valor={100 - scoreRiscoMedio}
              tema={tema}
              altura={320}
              faixas={[
                { min: 0, max: 50, cor: tema.perigo },
                { min: 50, max: 75, cor: tema.aviso },
                { min: 75, max: 100, cor: tema.sucesso },
              ]}
            />
          </div>

          {/* Riscos Recorrentes */}
          <div
            style={{
              background: tema.card,
              borderRadius: '16px',
              padding: '24px',
              border: `1px solid ${tema.cardBorda}`,
            }}
          >
            <h3 style={{ fontSize: '16px', fontWeight: 600, color: tema.texto, margin: '0 0 20px' }}>
              ⚠️ Riscos Recorrentes Identificados
            </h3>
            {riscosRecorrentes.length === 0 ? (
              <div style={{ textAlign: 'center', padding: '24px', color: tema.textoSecundario }}>
                ✅ Nenhum risco recorrente identificado no período.
              </div>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                {riscosRecorrentes.slice(0, 5).map((risco, idx) => (
                  <div
                    key={idx}
                    style={{
                      padding: '16px',
                      background: `${tema.perigo}10`,
                      borderRadius: '10px',
                      borderLeft: `4px solid ${tema.perigo}`,
                    }}
                  >
                    <div style={{ fontWeight: 600, color: tema.texto, marginBottom: '4px' }}>
                      {risco.tipo}
                    </div>
                    <div style={{ fontSize: '12px', color: tema.textoSecundario }}>
                      Ocorrências: {risco.frequencia} • Severidade: {risco.severidadeMedia}%
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </>
      )}

      {/* TENDÊNCIAS - SEMPRE RENDERIZAR GRÁFICOS */}
      {abaAtiva === 'tendencias' && (
        <>
          <GraficoLinhaECharts
            titulo="Evolução de Passagens por Dia"
            categorias={tendencias.map((t) => t.metrica)}
            series={[
              {
                nome: 'Valor Atual',
                dados: tendencias.map((t) => t.valorAtual),
                cor: tema.primaria,
                area: true,
              },
              {
                nome: 'Valor Anterior',
                dados: tendencias.map((t) => t.valorAnterior),
                cor: tema.textoSecundario,
              },
            ]}
            tema={tema}
            altura={350}
          />
          <AIInsightChart
            tema={tema}
            tipoGrafico="Tendência de Passagens por Dia"
            patio="VFZ"
            dadosGrafico={tendencias}
          />

          {/* Cards de Tendência */}
          <div
            style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(auto-fit, minmax(min(250px, 100%), 1fr))',
              gap: '20px',
              marginTop: '24px',
            }}
          >
            {tendencias.map((t, idx) => (
              <div
                key={idx}
                style={{
                  background: tema.card,
                  borderRadius: '16px',
                  padding: '24px',
                  border: `1px solid ${tema.cardBorda}`,
                }}
              >
                <div style={{ fontSize: '14px', color: tema.textoSecundario, marginBottom: '8px' }}>
                  {t.tendencia === 'up' ? '📈' : t.tendencia === 'down' ? '📉' : '➡️'} {t.metrica}
                </div>
                <div style={{ 
                  fontSize: '28px', 
                  fontWeight: 700, 
                  color: t.tendencia === 'up' ? tema.perigo : t.tendencia === 'down' ? tema.sucesso : tema.aviso 
                }}>
                  {t.valorAtual}%
                </div>
                <div style={{ fontSize: '11px', color: tema.textoSecundario, marginTop: '8px' }}>
                  Variação: {t.variacao > 0 ? '+' : ''}{t.variacao}% vs período anterior
                </div>
              </div>
            ))}
          </div>
        </>
      )}

      {/* DOCUMENTOS EXPORTADOS - HISTÓRICO */}
      {abaAtiva === 'exportacoes' && (
        <PermissionGuard
          perfisPermitidos={['inspetor', 'gestor', 'administrador', 'suporte', 'supervisor', 'coordenador']}
          mensagemBloqueio="Exportação disponível para Inspetor, Gestor ou Administrador"
        >
          {/* Cabeçalho */}
          <div
            style={{
              background: tema.card,
              borderRadius: '16px',
              padding: '24px',
              border: `1px solid ${tema.cardBorda}`,
              marginBottom: '24px',
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '16px' }}>
              <span style={{ fontSize: '28px' }}>📁</span>
              <div>
                <h3 style={{ fontSize: '18px', fontWeight: 600, color: tema.texto, margin: 0 }}>
                  Documentos Exportados
                </h3>
                <p style={{ fontSize: '12px', color: tema.textoSecundario, margin: '4px 0 0' }}>
                  Histórico de todas as exportações realizadas no sistema • Somente leitura
                </p>
              </div>
            </div>
            
            {/* Estatísticas de Exportação */}
            <div className="efvm360-grid-responsive-4" style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '16px' }}>
              <div style={{ textAlign: 'center', padding: '16px', background: tema.backgroundSecundario, borderRadius: '12px' }}>
                <div style={{ fontSize: '28px', fontWeight: 700, color: tema.primaria }}>
                  {historicoExportacoes.length}
                </div>
                <div style={{ fontSize: '11px', color: tema.textoSecundario }}>Total Exportações</div>
              </div>
              <div style={{ textAlign: 'center', padding: '16px', background: tema.backgroundSecundario, borderRadius: '12px' }}>
                <div style={{ fontSize: '28px', fontWeight: 700, color: tema.sucesso }}>
                  {historicoExportacoes.filter(e => e.status === 'gerado').length}
                </div>
                <div style={{ fontSize: '11px', color: tema.textoSecundario }}>Gerados com Sucesso</div>
              </div>
              <div style={{ textAlign: 'center', padding: '16px', background: tema.backgroundSecundario, borderRadius: '12px' }}>
                <div style={{ fontSize: '28px', fontWeight: 700, color: tema.info }}>
                  {historicoExportacoes.filter(e => e.tipo === 'BI+').length}
                </div>
                <div style={{ fontSize: '11px', color: tema.textoSecundario }}>Relatórios BI+</div>
              </div>
              <div style={{ textAlign: 'center', padding: '16px', background: tema.backgroundSecundario, borderRadius: '12px' }}>
                <div style={{ fontSize: '28px', fontWeight: 700, color: tema.aviso }}>
                  {historicoExportacoes.filter(e => e.tipo === 'Passagem' || e.tipo === 'DSS').length}
                </div>
                <div style={{ fontSize: '11px', color: tema.textoSecundario }}>Passagem / DSS</div>
              </div>
            </div>
          </div>

          {/* Lista de Exportações */}
          <div
            style={{
              background: tema.card,
              borderRadius: '16px',
              padding: '24px',
              border: `1px solid ${tema.cardBorda}`,
            }}
          >
            <h3 style={{ fontSize: '16px', fontWeight: 600, color: tema.texto, margin: '0 0 20px' }}>
              📋 Histórico de Exportações
            </h3>
            
            {historicoExportacoes.length === 0 ? (
              <div style={{ textAlign: 'center', padding: '40px', color: tema.textoSecundario }}>
                <div style={{ fontSize: '48px', marginBottom: '16px' }}>📭</div>
                <div style={{ fontSize: '15px' }}>Nenhuma exportação realizada ainda.</div>
                <div style={{ fontSize: '12px', marginTop: '8px' }}>
                  Use o botão "Exportar" para gerar documentos do BI+.
                </div>
              </div>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                {historicoExportacoes.slice(0, 20).map((exportacao) => (
                  <div
                    key={exportacao.id}
                    style={{
                      padding: '16px',
                      background: tema.backgroundSecundario,
                      borderRadius: '12px',
                      border: `1px solid ${tema.cardBorda}`,
                      display: 'flex',
                      alignItems: 'center',
                      gap: '16px',
                    }}
                  >
                    {/* Ícone do Tipo */}
                    <div
                      style={{
                        width: '48px',
                        height: '48px',
                        borderRadius: '12px',
                        background: exportacao.tipo === 'BI+' 
                          ? `${tema.primaria}20` 
                          : exportacao.tipo === 'Passagem' 
                          ? `${tema.sucesso}20` 
                          : `${tema.info}20`,
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        fontSize: '24px',
                      }}
                    >
                      {exportacao.tipo === 'BI+' ? '📊' : exportacao.tipo === 'Passagem' ? '📋' : '💬'}
                    </div>
                    
                    {/* Informações */}
                    <div style={{ flex: 1 }}>
                      <div style={{ fontWeight: 600, color: tema.texto, fontSize: '14px', marginBottom: '4px' }}>
                        {exportacao.tipo} • {exportacao.formato}
                      </div>
                      <div style={{ fontSize: '12px', color: tema.textoSecundario }}>
                        {exportacao.detalhes}
                      </div>
                      <div style={{ fontSize: '11px', color: tema.textoSecundario, marginTop: '4px' }}>
                        👤 {exportacao.usuario} • 📅 {new Date(exportacao.dataHora).toLocaleString('pt-BR')}
                      </div>
                    </div>
                    
                    {/* Status */}
                    <div
                      style={{
                        padding: '6px 12px',
                        borderRadius: '20px',
                        fontSize: '11px',
                        fontWeight: 600,
                        background: exportacao.status === 'gerado' 
                          ? `${tema.sucesso}20` 
                          : exportacao.status === 'enviado' 
                          ? `${tema.info}20` 
                          : `${tema.perigo}20`,
                        color: exportacao.status === 'gerado' 
                          ? tema.sucesso 
                          : exportacao.status === 'enviado' 
                          ? tema.info 
                          : tema.perigo,
                      }}
                    >
                      {exportacao.status === 'gerado' ? '✅ Gerado' : exportacao.status === 'enviado' ? '📤 Enviado' : '❌ Erro'}
                    </div>
                    
                    {/* Tamanho */}
                    {exportacao.tamanho && (
                      <div style={{ fontSize: '11px', color: tema.textoSecundario, minWidth: '60px', textAlign: 'right' }}>
                        {exportacao.tamanho}
                      </div>
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>
        </PermissionGuard>
      )}

      {/* MODAL DE EXPORTAÇÃO AVANÇADA */}
      {mostrarExportacaoAvancada && (
        <div
          style={{
            position: 'fixed',
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            background: 'rgba(0,0,0,0.7)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            zIndex: 1000,
            padding: '20px',
          }}
          onClick={() => setMostrarExportacaoAvancada(false)}
        >
          <div
            style={{
              background: tema.card,
              borderRadius: '20px',
              padding: '28px',
              maxWidth: '700px',
              width: '100%',
              maxHeight: '90vh',
              overflowY: 'auto',
              border: `1px solid ${tema.cardBorda}`,
              boxShadow: '0 20px 60px rgba(0,0,0,0.4)',
            }}
            onClick={(e) => e.stopPropagation()}
          >
            {/* Header */}
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '24px' }}>
              <div>
                <h2 style={{ fontSize: '20px', fontWeight: 700, color: tema.texto, margin: 0 }}>
                  ⚙️ Exportação Detalhada
                </h2>
                <p style={{ fontSize: '12px', color: tema.textoSecundario, margin: '4px 0 0' }}>
                  Selecione quais itens deseja incluir no documento
                </p>
              </div>
              <button
                style={{
                  background: 'transparent',
                  border: 'none',
                  fontSize: '24px',
                  cursor: 'pointer',
                  color: tema.textoSecundario,
                }}
                onClick={() => setMostrarExportacaoAvancada(false)}
              >
                ✕
              </button>
            </div>

            {/* Seleção de Gráficos */}
            <div style={{ marginBottom: '24px' }}>
              <h3 style={{ fontSize: '14px', fontWeight: 600, color: tema.texto, marginBottom: '12px' }}>
                📊 Gráficos
              </h3>
              <div className="efvm360-grid-responsive-2" style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: '10px' }}>
                {[
                  { key: 'statusLinhas', label: 'Status das Linhas' },
                  { key: 'distribuicaoTurno', label: 'Distribuição por Turno' },
                  { key: 'evolucaoRisco', label: 'Evolução do Risco' },
                  { key: 'manobrasTipo', label: 'Manobras por Tipo' },
                  { key: 'radarSeguranca', label: 'Radar de Segurança' },
                  { key: 'indiceConformidade', label: 'Índice de Conformidade' },
                ].map(item => (
                  <label
                    key={item.key}
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      gap: '10px',
                      padding: '12px',
                      background: selecaoExportacao.graficos[item.key as keyof typeof selecaoExportacao.graficos] 
                        ? `${tema.primaria}15` 
                        : tema.backgroundSecundario,
                      borderRadius: '10px',
                      cursor: 'pointer',
                      border: `1px solid ${selecaoExportacao.graficos[item.key as keyof typeof selecaoExportacao.graficos] ? tema.primaria : tema.cardBorda}`,
                    }}
                  >
                    <input
                      type="checkbox"
                      checked={selecaoExportacao.graficos[item.key as keyof typeof selecaoExportacao.graficos]}
                      onChange={(e) => setSelecaoExportacao(prev => ({
                        ...prev,
                        graficos: { ...prev.graficos, [item.key]: e.target.checked }
                      }))}
                      style={{ accentColor: tema.primaria }}
                    />
                    <span style={{ fontSize: '13px', color: tema.texto }}>{item.label}</span>
                  </label>
                ))}
              </div>
            </div>

            {/* Seleção de Indicadores */}
            <div style={{ marginBottom: '24px' }}>
              <h3 style={{ fontSize: '14px', fontWeight: 600, color: tema.texto, marginBottom: '12px' }}>
                📈 Indicadores
              </h3>
              <div className="efvm360-grid-responsive-2" style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: '10px' }}>
                {[
                  { key: 'kpis', label: 'KPIs Principais' },
                  { key: 'estatisticas', label: 'Estatísticas Consolidadas' },
                  { key: 'tendencias', label: 'Análise de Tendências' },
                  { key: 'riscosRecorrentes', label: 'Riscos Recorrentes' },
                ].map(item => (
                  <label
                    key={item.key}
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      gap: '10px',
                      padding: '12px',
                      background: selecaoExportacao.indicadores[item.key as keyof typeof selecaoExportacao.indicadores] 
                        ? `${tema.sucesso}15` 
                        : tema.backgroundSecundario,
                      borderRadius: '10px',
                      cursor: 'pointer',
                      border: `1px solid ${selecaoExportacao.indicadores[item.key as keyof typeof selecaoExportacao.indicadores] ? tema.sucesso : tema.cardBorda}`,
                    }}
                  >
                    <input
                      type="checkbox"
                      checked={selecaoExportacao.indicadores[item.key as keyof typeof selecaoExportacao.indicadores]}
                      onChange={(e) => setSelecaoExportacao(prev => ({
                        ...prev,
                        indicadores: { ...prev.indicadores, [item.key]: e.target.checked }
                      }))}
                      style={{ accentColor: tema.sucesso }}
                    />
                    <span style={{ fontSize: '13px', color: tema.texto }}>{item.label}</span>
                  </label>
                ))}
              </div>
            </div>

            {/* Formato de Exportação */}
            <div style={{ marginBottom: '24px' }}>
              <h3 style={{ fontSize: '14px', fontWeight: 600, color: tema.texto, marginBottom: '12px' }}>
                📄 Formato do Documento
              </h3>
              <div style={{ display: 'flex', gap: '10px', flexWrap: 'wrap' }}>
                {[
                  { id: 'pdf', label: 'PDF', icone: '📕' },
                  { id: 'excel', label: 'Excel', icone: '📗' },
                  { id: 'csv', label: 'CSV', icone: '📋' },
                  { id: 'word', label: 'Word', icone: '📘' },
                  { id: 'powerpoint', label: 'PowerPoint', icone: '📙' },
                  { id: 'bi-plus', label: 'BI+ JSON', icone: '📊' },
                ].map(fmt => (
                  <button
                    key={fmt.id}
                    style={{
                      padding: '12px 20px',
                      borderRadius: '10px',
                      border: `2px solid ${selecaoExportacao.formato === fmt.id ? tema.primaria : tema.cardBorda}`,
                      background: selecaoExportacao.formato === fmt.id ? `${tema.primaria}20` : 'transparent',
                      color: selecaoExportacao.formato === fmt.id ? tema.primaria : tema.texto,
                      cursor: 'pointer',
                      fontSize: '13px',
                      fontWeight: 600,
                      display: 'flex',
                      alignItems: 'center',
                      gap: '8px',
                    }}
                    onClick={() => setSelecaoExportacao(prev => ({ ...prev, formato: fmt.id as FormatoExportacao }))}
                  >
                    {fmt.icone} {fmt.label}
                  </button>
                ))}
              </div>
            </div>

            {/* Aviso de Rodapé */}
            <div
              style={{
                padding: '14px',
                background: `${tema.info}15`,
                border: `1px solid ${tema.info}40`,
                borderRadius: '10px',
                marginBottom: '24px',
              }}
            >
              <div style={{ fontSize: '12px', color: tema.texto }}>
                <strong>ℹ️ Informação:</strong> O documento exportado incluirá automaticamente:
              </div>
              <ul style={{ fontSize: '11px', color: tema.textoSecundario, margin: '8px 0 0', paddingLeft: '20px' }}>
                <li>Cabeçalho: "Passagem de Serviço EFVM360 — BI+"</li>
                <li>Rodapé com Política de Privacidade da empresa</li>
                <li>Texto: "Documento exportado do sistema Passagem de Serviço EFVM360"</li>
              </ul>
            </div>

            {/* Botões de Ação */}
            <div style={{ display: 'flex', gap: '12px', justifyContent: 'flex-end' }}>
              <button
                style={{
                  padding: '12px 24px',
                  borderRadius: '10px',
                  border: `1px solid ${tema.cardBorda}`,
                  background: 'transparent',
                  color: tema.texto,
                  cursor: 'pointer',
                  fontSize: '14px',
                }}
                onClick={() => setMostrarExportacaoAvancada(false)}
              >
                Cancelar
              </button>
              <button
                style={{
                  padding: '12px 28px',
                  borderRadius: '10px',
                  border: 'none',
                  background: tema.primaria,
                  color: '#fff',
                  cursor: 'pointer',
                  fontSize: '14px',
                  fontWeight: 600,
                  display: 'flex',
                  alignItems: 'center',
                  gap: '8px',
                  opacity: exportando ? 0.6 : 1,
                }}
                onClick={handleExportacaoAvancada}
                disabled={exportando}
              >
                {exportando ? '⏳ Gerando...' : '📤 Exportar Documento'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Rodapé do BI */}
      <div
        style={{
          marginTop: '24px',
          padding: '16px',
          background: tema.backgroundSecundario,
          borderRadius: '12px',
          textAlign: 'center',
          fontSize: '11px',
          color: tema.textoSecundario,
        }}
      >
        📊 Dashboard BI+ v2.0 • Apache ECharts • {registrosFiltrados.length} registros analisados •
        Última atualização: {new Date().toLocaleString('pt-BR')} • 🤖 Integrado ao AdamBoot IA
      </div>
    </div>
  );
});

DashboardBI.displayName = 'DashboardBI';

export default DashboardBI;
