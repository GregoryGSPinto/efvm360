// ============================================================================
// EFVM360 — Incident Heatmap Component (Phase 3E: Advanced Analytics)
// D3.js heatmap — incidents by track x time (shift/date)
// ============================================================================

import { memo, useRef, useEffect, useMemo } from 'react';
import * as d3 from 'd3';
import type { TemaEstilos, RegistroHistorico } from '../../types';
import { STATUS_LINHA } from '../../utils/constants';

interface HeatmapCell {
  track: string;
  period: string;
  value: number;
}

interface IncidentHeatmapProps {
  registros: RegistroHistorico[];
  tema: TemaEstilos;
}

function computeHeatmapData(registros: RegistroHistorico[]): {
  cells: HeatmapCell[];
  tracks: string[];
  periods: string[];
} {
  if (registros.length === 0) return { cells: [], tracks: [], periods: [] };

  const cellMap = new Map<string, number>();
  const trackSet = new Set<string>();
  const periodSet = new Set<string>();

  registros.forEach((r) => {
    const period = r.cabecalho.data;
    periodSet.add(period);

    [...r.patioCima, ...r.patioBaixo].forEach((l) => {
      trackSet.add(l.linha);
      const key = `${l.linha}||${period}`;
      const incidentValue =
        l.status === STATUS_LINHA.INTERDITADA ? 3 :
        l.status === STATUS_LINHA.OCUPADA ? 1 : 0;
      cellMap.set(key, (cellMap.get(key) || 0) + incidentValue);
    });

    // Add maneuver incidents per date
    if (r.segurancaManobras.houveManobras.resposta && r.segurancaManobras.localManobra) {
      const key = `${r.segurancaManobras.localManobra}||${period}`;
      cellMap.set(key, (cellMap.get(key) || 0) + 2);
      trackSet.add(r.segurancaManobras.localManobra);
    }
  });

  const tracks = Array.from(trackSet).sort();
  const periods = Array.from(periodSet).sort();

  const cells: HeatmapCell[] = [];
  tracks.forEach((track) => {
    periods.forEach((period) => {
      const key = `${track}||${period}`;
      cells.push({ track, period, value: cellMap.get(key) || 0 });
    });
  });

  return { cells, tracks, periods };
}

const IncidentHeatmap = memo(function IncidentHeatmap({
  registros,
  tema,
}: IncidentHeatmapProps) {
  const svgRef = useRef<SVGSVGElement>(null);
  const tooltipRef = useRef<HTMLDivElement>(null);
  const { cells, tracks, periods } = useMemo(
    () => computeHeatmapData(registros),
    [registros]
  );

  useEffect(() => {
    if (!svgRef.current || cells.length === 0) return;

    const svg = d3.select(svgRef.current);
    svg.selectAll('*').remove();

    const margin = { top: 30, right: 20, bottom: 60, left: 80 };
    const containerWidth = svgRef.current.parentElement?.clientWidth || 600;
    const width = containerWidth - margin.left - margin.right;
    const cellSize = Math.min(
      Math.floor(width / Math.max(periods.length, 1)),
      40
    );
    const height = tracks.length * cellSize;

    svg
      .attr('width', width + margin.left + margin.right)
      .attr('height', height + margin.top + margin.bottom);

    const g = svg
      .append('g')
      .attr('transform', `translate(${margin.left},${margin.top})`);

    // Scales
    const x = d3
      .scaleBand<string>()
      .domain(periods)
      .range([0, Math.min(periods.length * cellSize, width)])
      .padding(0.05);

    const y = d3
      .scaleBand<string>()
      .domain(tracks)
      .range([0, height])
      .padding(0.05);

    const maxVal = d3.max(cells, (d) => d.value) || 1;
    const colorScale = d3
      .scaleSequential(d3.interpolateYlOrRd)
      .domain([0, maxVal]);

    // Axes
    const periodLabels = periods.map((p) => p.slice(5)); // MM-DD
    const xAxis = d3.axisBottom(x).tickFormat((_, i) => periodLabels[i] || '');
    g.append('g')
      .attr('transform', `translate(0,${height})`)
      .call(xAxis)
      .selectAll('text')
      .style('fill', tema.textoSecundario)
      .style('font-size', '10px')
      .attr('transform', 'rotate(-45)')
      .attr('text-anchor', 'end');

    g.append('g')
      .call(d3.axisLeft(y))
      .selectAll('text')
      .style('fill', tema.textoSecundario)
      .style('font-size', '11px');

    // Remove axis lines for cleaner look
    g.selectAll('.domain').attr('stroke', tema.cardBorda);
    g.selectAll('.tick line').attr('stroke', tema.cardBorda);

    // Tooltip reference
    const tooltip = d3.select(tooltipRef.current);

    // Cells
    g.selectAll('rect.cell')
      .data(cells)
      .join('rect')
      .attr('class', 'cell')
      .attr('x', (d) => x(d.period) || 0)
      .attr('y', (d) => y(d.track) || 0)
      .attr('width', x.bandwidth())
      .attr('height', y.bandwidth())
      .attr('rx', 3)
      .attr('fill', (d) => (d.value === 0 ? tema.backgroundSecundario : colorScale(d.value)))
      .attr('stroke', tema.card)
      .attr('stroke-width', 1)
      .style('cursor', 'pointer')
      .on('mouseover', function (_event, d) {
        d3.select(this).attr('stroke', tema.primaria).attr('stroke-width', 2);
        tooltip
          .style('opacity', '1')
          .html(
            `<strong>${d.track}</strong><br/>` +
            `Data: ${d.period}<br/>` +
            `Severidade: ${d.value}`
          );
      })
      .on('mousemove', function (event) {
        tooltip
          .style('left', `${event.offsetX + 15}px`)
          .style('top', `${event.offsetY - 10}px`);
      })
      .on('mouseout', function () {
        d3.select(this).attr('stroke', tema.card).attr('stroke-width', 1);
        tooltip.style('opacity', '0');
      });

    // Color legend
    const legendWidth = 120;
    const legendHeight = 10;
    const legendG = svg
      .append('g')
      .attr(
        'transform',
        `translate(${margin.left + width - legendWidth}, ${margin.top - 20})`
      );

    const legendScale = d3.scaleLinear().domain([0, maxVal]).range([0, legendWidth]);
    const legendAxis = d3.axisBottom(legendScale).ticks(4).tickSize(6);

    const defs = svg.append('defs');
    const linearGrad = defs
      .append('linearGradient')
      .attr('id', 'heatmap-legend-grad');
    linearGrad.append('stop').attr('offset', '0%').attr('stop-color', d3.interpolateYlOrRd(0));
    linearGrad.append('stop').attr('offset', '50%').attr('stop-color', d3.interpolateYlOrRd(0.5));
    linearGrad.append('stop').attr('offset', '100%').attr('stop-color', d3.interpolateYlOrRd(1));

    legendG
      .append('rect')
      .attr('width', legendWidth)
      .attr('height', legendHeight)
      .attr('rx', 3)
      .style('fill', 'url(#heatmap-legend-grad)');

    legendG
      .append('g')
      .attr('transform', `translate(0,${legendHeight})`)
      .call(legendAxis)
      .selectAll('text')
      .style('fill', tema.textoSecundario)
      .style('font-size', '9px');

    legendG.selectAll('.domain').attr('stroke', tema.cardBorda);
    legendG.selectAll('.tick line').attr('stroke', tema.cardBorda);
  }, [cells, tracks, periods, tema]);

  if (cells.length === 0) {
    return (
      <div
        style={{
          background: tema.card,
          borderRadius: '16px',
          padding: '40px',
          border: `1px solid ${tema.cardBorda}`,
          textAlign: 'center',
          color: tema.textoSecundario,
        }}
      >
        Sem dados para o heatmap de ocorrencias.
      </div>
    );
  }

  return (
    <div
      style={{
        background: tema.card,
        borderRadius: '16px',
        padding: '24px',
        border: `1px solid ${tema.cardBorda}`,
        position: 'relative',
      }}
    >
      <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '16px' }}>
        <span style={{ fontSize: '22px' }}>🔥</span>
        <div>
          <h3 style={{ fontSize: '16px', fontWeight: 600, color: tema.texto, margin: 0 }}>
            Heatmap de Ocorrencias — Linha x Periodo
          </h3>
          <p style={{ fontSize: '11px', color: tema.textoSecundario, margin: '2px 0 0' }}>
            Intensidade de incidentes por linha ferroviaria e data (D3.js)
          </p>
        </div>
      </div>

      <div style={{ overflowX: 'auto', position: 'relative' }}>
        <svg ref={svgRef} />
        <div
          ref={tooltipRef}
          style={{
            position: 'absolute',
            opacity: 0,
            pointerEvents: 'none',
            background: tema.card,
            border: `1px solid ${tema.cardBorda}`,
            borderRadius: '8px',
            padding: '8px 12px',
            fontSize: '12px',
            color: tema.texto,
            boxShadow: '0 4px 12px rgba(0,0,0,0.15)',
            transition: 'opacity 0.15s',
            zIndex: 10,
          }}
        />
      </div>
    </div>
  );
});

IncidentHeatmap.displayName = 'IncidentHeatmap';

export default IncidentHeatmap;
export { computeHeatmapData };
export type { HeatmapCell, IncidentHeatmapProps };
