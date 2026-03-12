// ============================================================================
// EFVM360 — PDF Report Generator (Phase 3E: Advanced Analytics)
// jsPDF report with chart captures via html2canvas
// ============================================================================

import { memo, useState, useCallback } from 'react';
import type { TemaEstilos, RegistroHistorico } from '../../types';
import type { FiltrosDashboard } from '../../types/dashboard';
import { calcularKPIs, calcularEstatisticasConsolidadas } from '../../services/analise';

interface PDFReportGeneratorProps {
  registros: RegistroHistorico[];
  filtros: FiltrosDashboard;
  tema: TemaEstilos;
  chartContainerRef?: React.RefObject<HTMLDivElement | null>;
}

async function generatePDFReport(
  registros: RegistroHistorico[],
  filtros: FiltrosDashboard,
  chartContainerRef?: React.RefObject<HTMLDivElement | null>
): Promise<void> {
  // Dynamic imports to keep bundle small when PDF not used
  const [{ default: jsPDF }, { default: html2canvas }] = await Promise.all([
    import('jspdf'),
    import('html2canvas'),
  ]);

  const doc = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a4' });
  const pageWidth = doc.internal.pageSize.getWidth();
  const pageHeight = doc.internal.pageSize.getHeight();
  const margin = 20;
  let y = margin;

  const kpis = calcularKPIs(registros);
  const stats = calcularEstatisticasConsolidadas(registros);

  // ── Helper Functions ────────────────────────────────────────
  const addNewPageIfNeeded = (requiredSpace: number) => {
    if (y + requiredSpace > pageHeight - margin) {
      doc.addPage();
      y = margin;
      addPageFooter();
    }
  };

  const addPageFooter = () => {
    const pageNum = doc.getNumberOfPages();
    doc.setFontSize(8);
    doc.setTextColor(150);
    doc.text(
      `EFVM360 Analytics Report — Pagina ${pageNum}`,
      pageWidth / 2,
      pageHeight - 10,
      { align: 'center' }
    );
    doc.text(
      `Gerado em ${new Date().toLocaleString('pt-BR')}`,
      pageWidth - margin,
      pageHeight - 10,
      { align: 'right' }
    );
  };

  // ── Cover / Header ──────────────────────────────────────────
  // Green header bar
  doc.setFillColor(0, 126, 122); // #007e7a
  doc.rect(0, 0, pageWidth, 40, 'F');

  doc.setFontSize(22);
  doc.setTextColor(255, 255, 255);
  doc.text('EFVM360', margin, 18);

  doc.setFontSize(11);
  doc.text('Advanced Analytics Report', margin, 26);

  doc.setFontSize(9);
  doc.text('Independent portfolio case study', margin, 34);

  // Date range
  doc.setFontSize(9);
  doc.text(
    `Periodo: ${filtros.dataInicio} a ${filtros.dataFim}`,
    pageWidth - margin,
    26,
    { align: 'right' }
  );
  doc.text(
    `Turno: ${filtros.turno}`,
    pageWidth - margin,
    34,
    { align: 'right' }
  );

  y = 52;

  // ── KPI Summary ──────────────────────────────────────────────
  doc.setTextColor(0, 126, 122);
  doc.setFontSize(14);
  doc.text('Indicadores Principais', margin, y);
  y += 8;

  doc.setFontSize(10);
  doc.setTextColor(60, 60, 60);

  const kpiBoxWidth = (pageWidth - margin * 2 - 10) / 3;
  kpis.slice(0, 3).forEach((kpi, i) => {
    const bx = margin + i * (kpiBoxWidth + 5);
    doc.setFillColor(248, 255, 254);
    doc.roundedRect(bx, y, kpiBoxWidth, 22, 3, 3, 'F');
    doc.setDrawColor(0, 126, 122);
    doc.roundedRect(bx, y, kpiBoxWidth, 22, 3, 3, 'S');

    doc.setFontSize(16);
    doc.setTextColor(0, 126, 122);
    doc.text(String(kpi.valor), bx + kpiBoxWidth / 2, y + 10, { align: 'center' });

    doc.setFontSize(8);
    doc.setTextColor(100);
    doc.text(kpi.titulo, bx + kpiBoxWidth / 2, y + 18, { align: 'center' });
  });
  y += 30;

  // Second row of KPIs
  const remainingKpis = kpis.slice(3);
  if (remainingKpis.length > 0) {
    const kpiBoxWidth2 = (pageWidth - margin * 2 - 10) / Math.min(remainingKpis.length, 3);
    remainingKpis.forEach((kpi, i) => {
      const bx = margin + i * (kpiBoxWidth2 + 5);
      doc.setFillColor(248, 255, 254);
      doc.roundedRect(bx, y, kpiBoxWidth2, 22, 3, 3, 'F');
      doc.setDrawColor(0, 126, 122);
      doc.roundedRect(bx, y, kpiBoxWidth2, 22, 3, 3, 'S');

      doc.setFontSize(16);
      doc.setTextColor(0, 126, 122);
      doc.text(String(kpi.valor), bx + kpiBoxWidth2 / 2, y + 10, { align: 'center' });

      doc.setFontSize(8);
      doc.setTextColor(100);
      doc.text(kpi.titulo, bx + kpiBoxWidth2 / 2, y + 18, { align: 'center' });
    });
    y += 30;
  }

  // ── Statistics Summary ───────────────────────────────────────
  addNewPageIfNeeded(50);
  doc.setTextColor(0, 126, 122);
  doc.setFontSize(14);
  doc.text('Estatisticas Consolidadas', margin, y);
  y += 8;

  doc.setFontSize(10);
  doc.setTextColor(60, 60, 60);
  const statLines: [string, string][] = [
    ['Total Passagens', String(stats.totalPassagens)],
    ['Total Manobras Criticas', String(stats.totalManobras)],
    ['Total Interdicoes', String(stats.totalInterdicoes)],
    ['Total Restricoes', String(stats.totalRestricoes)],
    ['Risco Medio por Turno', `${stats.mediaRiscoPorTurno}%`],
    ['Turno com Maior Risco', stats.turnoComMaisRisco || 'N/A'],
    ['Tendencia Geral', stats.tendenciaGeral],
  ];

  statLines.forEach(([label, value]) => {
    doc.setFontSize(9);
    doc.setTextColor(100);
    doc.text(label + ':', margin, y);
    doc.setTextColor(30);
    doc.setFont(undefined!, 'bold');
    doc.text(value, margin + 65, y);
    doc.setFont(undefined!, 'normal');
    y += 6;
  });
  y += 6;

  // ── Problem areas ────────────────────────────────────────────
  if (stats.linhasComMaisProblemas.length > 0) {
    addNewPageIfNeeded(30);
    doc.setTextColor(0, 126, 122);
    doc.setFontSize(14);
    doc.text('Linhas com Mais Problemas', margin, y);
    y += 8;

    doc.setFontSize(10);
    doc.setTextColor(60, 60, 60);
    stats.linhasComMaisProblemas.forEach((linha) => {
      doc.text(`• Linha ${linha}`, margin + 5, y);
      y += 5;
    });
    y += 6;
  }

  // ── Chart Capture ────────────────────────────────────────────
  if (chartContainerRef?.current) {
    addNewPageIfNeeded(10);
    doc.addPage();
    y = margin;

    doc.setTextColor(0, 126, 122);
    doc.setFontSize(14);
    doc.text('Graficos Analiticos', margin, y);
    y += 10;

    try {
      const canvas = await html2canvas(chartContainerRef.current, {
        scale: 2,
        backgroundColor: '#ffffff',
        logging: false,
        useCORS: true,
      });

      const imgData = canvas.toDataURL('image/png');
      const imgWidth = pageWidth - margin * 2;
      const imgHeight = (canvas.height / canvas.width) * imgWidth;

      // Split into pages if needed
      let remainingHeight = imgHeight;
      let sourceY = 0;
      const availableHeight = pageHeight - y - margin;

      if (imgHeight <= availableHeight) {
        doc.addImage(imgData, 'PNG', margin, y, imgWidth, imgHeight);
      } else {
        // First chunk
        doc.addImage(
          imgData,
          'PNG',
          margin,
          y,
          imgWidth,
          imgHeight,
          undefined,
          'FAST'
        );
        // Clip by setting page break
        remainingHeight -= availableHeight;
        sourceY += availableHeight;

        while (remainingHeight > 0) {
          doc.addPage();
          y = margin;
          const chunkHeight = Math.min(remainingHeight, pageHeight - margin * 2);
          doc.addImage(
            imgData,
            'PNG',
            margin,
            y - sourceY,
            imgWidth,
            imgHeight,
            undefined,
            'FAST'
          );
          remainingHeight -= chunkHeight;
          sourceY += chunkHeight;
        }
      }
    } catch (err) {
      doc.setFontSize(10);
      doc.setTextColor(150);
      doc.text('(Graficos nao puderam ser capturados)', margin, y);
    }
  }

  // ── Footer on all pages ──────────────────────────────────────
  const totalPages = doc.getNumberOfPages();
  for (let i = 1; i <= totalPages; i++) {
    doc.setPage(i);
    doc.setFontSize(8);
    doc.setTextColor(150);
    doc.text(
      `EFVM360 Analytics — Pagina ${i}/${totalPages}`,
      pageWidth / 2,
      pageHeight - 10,
      { align: 'center' }
    );

    // Thin green line at bottom
    doc.setDrawColor(0, 126, 122);
    doc.setLineWidth(0.5);
    doc.line(margin, pageHeight - 15, pageWidth - margin, pageHeight - 15);
  }

  // ── Save ──────────────────────────────────────────────────────
  const filename = `EFVM360_Analytics_${filtros.dataInicio}_${filtros.dataFim}.pdf`;
  doc.save(filename);
}

const PDFReportGenerator = memo(function PDFReportGenerator({
  registros,
  filtros,
  tema,
  chartContainerRef,
}: PDFReportGeneratorProps) {
  const [generating, setGenerating] = useState(false);

  const handleGenerate = useCallback(async () => {
    setGenerating(true);
    try {
      await generatePDFReport(registros, filtros, chartContainerRef);
    } catch (err) {
      if (import.meta.env?.DEV) console.error('PDF generation error:', err);
    } finally {
      setGenerating(false);
    }
  }, [registros, filtros, chartContainerRef]);

  return (
    <button
      onClick={handleGenerate}
      disabled={generating || registros.length === 0}
      style={{
        padding: '10px 20px',
        borderRadius: '10px',
        border: 'none',
        background: generating ? tema.buttonInativo : tema.primaria,
        color: '#fff',
        cursor: generating ? 'not-allowed' : 'pointer',
        fontSize: '13px',
        fontWeight: 600,
        display: 'flex',
        alignItems: 'center',
        gap: '8px',
        opacity: generating || registros.length === 0 ? 0.6 : 1,
        transition: 'all 0.2s',
      }}
    >
      {generating ? '⏳ Gerando PDF...' : '📄 Exportar PDF Analytics'}
    </button>
  );
});

PDFReportGenerator.displayName = 'PDFReportGenerator';

export default PDFReportGenerator;
// eslint-disable-next-line react-refresh/only-export-components -- report generator is a non-React helper co-located with the UI wrapper
export { generatePDFReport };
export type { PDFReportGeneratorProps };
