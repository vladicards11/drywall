import React, { useState } from 'react';
import type { PlacaRect, Abertura, JuntaSegmento } from '@drywall-calc/catalog-schemas';
import styles from './MuroVisualizer.module.css';

interface MuroSvgProps {
  largo_m: number;
  alto_m: number;
  placas: PlacaRect[];
  aberturas: Abertura[];
  juntas: JuntaSegmento[];
  zoom: number;
  pan: { x: number; y: number };
  onMouseDown: (e: React.MouseEvent<SVGSVGElement, MouseEvent>) => void;
  onMouseMove: (e: React.MouseEvent<SVGSVGElement, MouseEvent>) => void;
  onMouseUp: () => void;
  onMouseLeave: () => void;
  onWheel: (e: React.WheelEvent<SVGSVGElement>) => void;
}

export const MuroSvg: React.FC<MuroSvgProps> = ({
  largo_m,
  alto_m,
  placas,
  aberturas,
  juntas,
  zoom,
  pan,
  onMouseDown,
  onMouseMove,
  onMouseUp,
  onMouseLeave,
  onWheel,
}) => {
  const [hoveredPlaca, setHoveredPlaca] = useState<PlacaRect | null>(null);
  const [tooltipPos, setTooltipPos] = useState({ x: 0, y: 0 });

  // 1. Definir dimensiones base de renderizado.
  const SCALE = 100;
  const wallWidth = largo_m * SCALE;
  const wallHeight = alto_m * SCALE;

  // Margen alrededor del muro para cotas/dimensiones
  const PADDING = 60;
  const svgWidth = wallWidth + PADDING * 2;
  const svgHeight = wallHeight + PADDING * 2;

  // Función para convertir Y de base de datos (y = 0 en el suelo) a SVG (y = 0 arriba)
  const getSvgY = (y: number, alto: number) => {
    return (alto_m - (y + alto)) * SCALE;
  };

  const handlePlacaMouseEnter = (e: React.MouseEvent, placa: PlacaRect) => {
    setHoveredPlaca(placa);
    const rect = e.currentTarget.getBoundingClientRect();
    const svgEl = e.currentTarget.closest('svg');
    if (svgEl) {
      const svgRect = svgEl.getBoundingClientRect();
      setTooltipPos({
        x: rect.left - svgRect.left + rect.width / 2,
        y: rect.top - svgRect.top - 40,
      });
    }
  };

  return (
    <div className={styles.svgContainer}>
      <svg
        className={styles.svgCanvas}
        viewBox={`0 0 ${svgWidth} ${svgHeight}`}
        onMouseDown={onMouseDown}
        onMouseMove={onMouseMove}
        onMouseUp={onMouseUp}
        onMouseLeave={onMouseLeave}
        onWheel={onWheel}
        style={{ cursor: 'grab' }}
      >
        <defs>
          <pattern id="grid" width="20" height="20" patternUnits="userSpaceOnUse">
            <path d="M 20 0 L 0 0 0 20" fill="none" stroke="rgba(255, 255, 255, 0.03)" strokeWidth="1" />
          </pattern>
          <pattern id="diagonalHatch" width="10" height="10" patternTransform="rotate(45 0 0)" patternUnits="userSpaceOnUse">
            <line x1="0" y1="0" x2="0" y2="10" stroke="rgba(239, 68, 68, 0.15)" strokeWidth="3" />
          </pattern>
        </defs>

        <rect width="100%" height="100%" fill="url(#grid)" />

        <g transform={`translate(${PADDING + pan.x}, ${PADDING + pan.y}) scale(${zoom})`}>
          
          {/* 1. Fondo del Muro */}
          <rect
            x={0}
            y={0}
            width={wallWidth}
            height={wallHeight}
            className={styles.wallBg}
          />

          {/* 2. Placas */}
          <g>
            {placas.map((placa) => {
              const x = placa.x * SCALE;
              const y = getSvgY(placa.y, placa.alto);
              const w = placa.ancho * SCALE;
              const h = placa.alto * SCALE;

              const isHovered = hoveredPlaca?.id === placa.id;

              return (
                <g key={placa.id}>
                  <rect
                    x={x}
                    y={y}
                    width={w}
                    height={h}
                    rx={2}
                    ry={2}
                    className={`${styles.placa} ${placa.recortada ? styles.placaRecortada : styles.placaCompleta} ${isHovered ? styles.placaHovered : ''}`}
                    onMouseEnter={(e) => handlePlacaMouseEnter(e, placa)}
                    onMouseLeave={() => setHoveredPlaca(null)}
                  />
                  {w > 35 && h > 30 && (
                    <text
                      x={x + w / 2}
                      y={y + h / 2}
                      textAnchor="middle"
                      dominantBaseline="middle"
                      className={styles.placaText}
                    >
                      {placa.id.split('_').pop()}
                    </text>
                  )}
                </g>
              );
            })}
          </g>

          {/* 3. Juntas */}
          <g>
            {juntas.map((junta, idx) => {
              const isVert = junta.orientacion === 'vertical';
              const x1 = junta.coordenada_fija * SCALE;
              const y1 = isVert ? getSvgY(junta.inicio, junta.longitud) : getSvgY(junta.coordenada_fija, 0);
              const x2 = isVert ? x1 : x1 + junta.longitud * SCALE;
              const y2 = isVert ? y1 + junta.longitud * SCALE : y1;

              return (
                <line
                  key={idx}
                  x1={x1}
                  y1={y1}
                  x2={x2}
                  y2={y2}
                  className={styles.juntaLine}
                />
              );
            })}
          </g>

          {/* 4. Aberturas (Vanos) */}
          <g>
            {aberturas.map((ab, idx) => {
              const x = ab.distancia_desde_inicio_m * SCALE;
              const y = getSvgY(0, ab.alto_m);
              const w = ab.ancho_m * SCALE;
              const h = ab.alto_m * SCALE;

              return (
                <g key={idx}>
                  <rect
                    x={x}
                    y={y}
                    width={w}
                    height={h}
                    className={styles.aberturaBg}
                  />
                  <rect
                    x={x}
                    y={y}
                    width={w}
                    height={h}
                    fill="url(#diagonalHatch)"
                    stroke="var(--color-danger)"
                    strokeWidth="1"
                    strokeDasharray="2,2"
                  />
                  <text
                    x={x + w / 2}
                    y={y + h / 2}
                    textAnchor="middle"
                    dominantBaseline="middle"
                    className={styles.aberturaText}
                  >
                    {ab.tipo === 'puerta' ? '🚪 Puerta' : ab.tipo === 'ventana' ? '🪟 Ventana' : '↔ Pase'}
                    {` (${ab.ancho_m.toFixed(2)}x${ab.alto_m.toFixed(2)})`}
                  </text>
                </g>
              );
            })}
          </g>

          {/* 5. Cotas / Medidas del Muro */}
          <g className={styles.cotas}>
            {/* Cota horizontal (Largo) */}
            <line x1={0} y1={wallHeight + 20} x2={wallWidth} y2={wallHeight + 20} className={styles.cotaLine} />
            <line x1={0} y1={wallHeight + 15} x2={0} y2={wallHeight + 25} className={styles.cotaTick} />
            <line x1={wallWidth} y1={wallHeight + 15} x2={wallWidth} y2={wallHeight + 25} className={styles.cotaTick} />
            <text x={wallWidth / 2} y={wallHeight + 38} textAnchor="middle" className={styles.cotaText}>
              Largo: {largo_m.toFixed(2)} m
            </text>

            {/* Cota vertical (Alto) */}
            <line x1={-20} y1={0} x2={-20} y2={wallHeight} className={styles.cotaLine} />
            <line x1={-25} y1={0} x2={-15} y2={0} className={styles.cotaTick} />
            <line x1={-25} y1={wallHeight} x2={-15} y2={wallHeight} className={styles.cotaTick} />
            <text
              x={-35}
              y={wallHeight / 2}
              textAnchor="middle"
              dominantBaseline="middle"
              transform={`rotate(-90, -35, ${wallHeight / 2})`}
              className={styles.cotaText}
            >
              Alto: {alto_m.toFixed(2)} m
            </text>
          </g>

        </g>
      </svg>

      {hoveredPlaca && (
        <div
          className={styles.tooltip}
          style={{
            left: `${tooltipPos.x}px`,
            top: `${tooltipPos.y}px`,
          }}
        >
          <div className={styles.tooltipTitle}>Placa {hoveredPlaca.id.split('_').pop()}</div>
          <div className={styles.tooltipRow}>
            <span>Dimensiones:</span>
            <strong>{hoveredPlaca.ancho.toFixed(2)} × {hoveredPlaca.alto.toFixed(2)} m</strong>
          </div>
          <div className={styles.tooltipRow}>
            <span>Estado:</span>
            <span className={hoveredPlaca.recortada ? styles.tooltipRecortada : styles.tooltipCompleta}>
              {hoveredPlaca.recortada ? 'Recortada' : 'Completa'}
            </span>
          </div>
          <div className={styles.tooltipRow}>
            <span>Posición:</span>
            <span>x={hoveredPlaca.x.toFixed(2)}m, y={hoveredPlaca.y.toFixed(2)}m</span>
          </div>
        </div>
      )}
    </div>
  );
};
