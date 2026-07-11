import React, { useState } from 'react';
import type { PlacaRect, Abertura } from '@drywall-calc/catalog-schemas';

interface Placas2DVisualizerProps {
  placas: PlacaRect[];
  aberturas: Abertura[];
  largoMuro: number;
  altoMuro: number;
  nombreMuro: string;
}

export const Placas2DVisualizer: React.FC<Placas2DVisualizerProps> = ({
  placas,
  aberturas,
  largoMuro,
  altoMuro,
  nombreMuro,
}) => {
  const [hoveredPlaca, setHoveredPlaca] = useState<PlacaRect | null>(null);
  const [tooltipPos, setTooltipPos] = useState<{ x: number; y: number }>({ x: 0, y: 0 });

  // Dimensiones del canvas SVG
  const padding = 40;
  const width = 760;
  const scale = (width - 2 * padding) / largoMuro;
  const height = altoMuro * scale + 2 * padding;

  const handleMouseMove = (e: React.MouseEvent<SVGRectElement>, placa: PlacaRect) => {
    const rect = e.currentTarget.getBoundingClientRect();
    const svgEl = e.currentTarget.ownerSVGElement;
    if (svgEl) {
      const svgRect = svgEl.getBoundingClientRect();
      setTooltipPos({
        x: rect.left - svgRect.left + rect.width / 2,
        y: rect.top - svgRect.top - 55,
      });
    }
    setHoveredPlaca(placa);
  };

  return (
    <div style={{
      background: 'rgba(15, 23, 42, 0.4)',
      border: '1px solid rgba(255,255,255,0.06)',
      borderRadius: '16px',
      padding: '1.25rem',
      marginTop: '1.5rem',
      position: 'relative'
    }}>
      <h3 style={{ fontSize: '0.95rem', fontWeight: 600, color: 'var(--text-primary, #f8fafc)', margin: '0 0 1rem 0', display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
        🖼️ Plano de Emplacado 2D ({nombreMuro} · {largoMuro.toFixed(2)}m x {altoMuro.toFixed(2)}m)
      </h3>

      <div style={{ display: 'flex', justifyContent: 'center', overflowX: 'auto' }}>
        <svg
          width={width}
          height={height}
          style={{ background: '#090d16', borderRadius: '12px', border: '1px solid rgba(255,255,255,0.04)' }}
        >
          {/* Grilla de fondo decorativa */}
          <defs>
            <pattern id="grid" width={scale * 0.4} height={scale * 0.4} patternUnits="userSpaceOnUse">
              <path d={`M ${scale * 0.4} 0 L 0 0 0 ${scale * 0.4}`} fill="none" stroke="rgba(255,255,255,0.02)" strokeWidth="1" />
            </pattern>
            <pattern id="diagonalHatch" width="8" height="8" patternTransform="rotate(45 0 0)" patternUnits="userSpaceOnUse">
              <line x1="0" y1="0" x2="0" y2="8" stroke="rgba(16, 185, 129, 0.4)" strokeWidth="2.5" />
            </pattern>
          </defs>
          <rect width="100%" height="100%" fill="url(#grid)" />

          {/* Grupo de dibujo del muro */}
          <g transform={`translate(${padding}, ${padding})`}>
            {/* Contorno del muro */}
            <rect
              x={0}
              y={0}
              width={largoMuro * scale}
              height={altoMuro * scale}
              fill="rgba(255,255,255,0.01)"
              stroke="rgba(255,255,255,0.15)"
              strokeWidth="2"
            />

            {/* Aberturas (puertas, ventanas, pases) */}
            {aberturas.map((ab, idx) => {
              const yPos = ab.tipo === 'ventana' ? (ab.altura_desde_piso_m || 0.80) : 0;
              // En SVG, Y=0 es arriba, por lo que invertimos la coordenada y de forma vertical
              const svgY = (altoMuro - yPos - ab.alto_m) * scale;
              const svgHeight = ab.alto_m * scale;
              const svgX = ab.distancia_desde_inicio_m * scale;
              const svgWidth = ab.ancho_m * scale;

              if (ab.tipo === 'hornacina') return null; // Hornacinas son internas al muro, no cortan el contorno de placa frontal

              return (
                <g key={`ab-${idx}`}>
                  <rect
                    x={svgX}
                    y={svgY}
                    width={svgWidth}
                    height={svgHeight}
                    fill="#020617"
                    stroke="#ef4444"
                    strokeWidth="1.5"
                    strokeDasharray="4 3"
                    style={{ opacity: 0.85 }}
                  />
                  <text
                    x={svgX + svgWidth / 2}
                    y={svgY + svgHeight / 2}
                    fill="rgba(239, 68, 68, 0.7)"
                    fontSize="10"
                    fontWeight="700"
                    textAnchor="middle"
                    dominantBaseline="middle"
                  >
                    {ab.tipo.toUpperCase()}
                  </text>
                </g>
              );
            })}

            {/* Placas de yeso */}
            {placas.map((placa) => {
              // Ajustamos la escala e invertimos Y para que dibuje de abajo hacia arriba
              const svgX = placa.x * scale;
              const svgY = (altoMuro - placa.y - placa.alto) * scale;
              const svgWidth = placa.ancho * scale;
              const svgHeight = placa.alto * scale;

              const esReutilizada = placa.esRetazoReutilizado;
              const esCorteL = placa.corteL;

              let fillColor = 'rgba(99, 102, 241, 0.2)'; // Azul translúcido estándar
              let strokeColor = 'rgba(99, 102, 241, 0.6)';
              if (esReutilizada) {
                fillColor = 'url(#diagonalHatch)'; // Verde rayado
                strokeColor = 'rgba(16, 185, 129, 0.8)';
              } else if (esCorteL) {
                fillColor = 'rgba(236, 72, 153, 0.25)'; // Rosa translúcido para corte L
                strokeColor = 'rgba(236, 72, 153, 0.7)';
              }

              // Si está hovered, resaltar
              const isHovered = hoveredPlaca?.id === placa.id;

              return (
                <g key={placa.id}>
                  <rect
                    x={svgX}
                    y={svgY}
                    width={svgWidth}
                    height={svgHeight}
                    fill={isHovered ? 'rgba(255,255,255,0.08)' : fillColor}
                    stroke={isHovered ? '#fff' : strokeColor}
                    strokeWidth={isHovered ? '2' : '1'}
                    onMouseEnter={(e) => handleMouseMove(e, placa)}
                    onMouseMove={(e) => handleMouseMove(e, placa)}
                    onMouseLeave={() => setHoveredPlaca(null)}
                    style={{ transition: 'all 0.15s ease' }}
                  />
                  {/* Etiquetas breves dentro de la placa */}
                  {placa.ancho > 0.3 && placa.alto > 0.4 && (
                    <text
                      x={svgX + svgWidth / 2}
                      y={svgY + svgHeight / 2}
                      fill={isHovered ? '#fff' : 'rgba(255,255,255,0.4)'}
                      fontSize="9"
                      textAnchor="middle"
                      dominantBaseline="middle"
                      style={{ pointerEvents: 'none' }}
                    >
                      {esReutilizada ? '♻️' : esCorteL ? '🛡️ L' : `${placa.ancho.toFixed(2)}m`}
                    </text>
                  )}
                </g>
              );
            })}
          </g>
        </svg>

        {/* Tooltip informativo flotante */}
        {hoveredPlaca && (
          <div style={{
            position: 'absolute',
            left: `${tooltipPos.x}px`,
            top: `${tooltipPos.y}px`,
            transform: 'translateX(-50%)',
            background: '#1e293b',
            border: '1px solid rgba(255,255,255,0.1)',
            boxShadow: '0 10px 15px -3px rgba(0, 0, 0, 0.5)',
            borderRadius: '8px',
            padding: '0.5rem 0.75rem',
            zIndex: 50,
            pointerEvents: 'none',
            display: 'flex',
            flexDirection: 'column',
            gap: '0.15rem'
          }}>
            <span style={{ fontSize: '0.7rem', color: '#94a3b8', fontWeight: 600 }}>
              ID: {hoveredPlaca.id}
            </span>
            <span style={{ fontSize: '0.82rem', color: '#f8fafc', fontWeight: 700 }}>
              📏 {hoveredPlaca.ancho.toFixed(2)}m x {hoveredPlaca.alto.toFixed(2)}m
            </span>
            <div style={{ display: 'flex', gap: '0.3rem', marginTop: '0.2rem' }}>
              {hoveredPlaca.corteL && (
                <span style={{ fontSize: '0.62rem', background: '#ec4899', color: '#fff', padding: '1px 4px', borderRadius: '4px', fontWeight: 600 }}>
                  🛡️ CORTE EN L (ANTIFISURA)
                </span>
              )}
              {hoveredPlaca.esRetazoReutilizado && (
                <span style={{ fontSize: '0.62rem', background: '#10b981', color: '#fff', padding: '1px 4px', borderRadius: '4px', fontWeight: 600 }}>
                  ♻️ RETAZO REUTILIZADO
                </span>
              )}
              {!hoveredPlaca.corteL && !hoveredPlaca.esRetazoReutilizado && (
                <span style={{ fontSize: '0.62rem', background: 'rgba(255,255,255,0.06)', color: '#94a3b8', padding: '1px 4px', borderRadius: '4px' }}>
                  Placa base {hoveredPlaca.recortada ? 'recortada' : 'entera'}
                </span>
              )}
            </div>
          </div>
        )}
      </div>

      {/* Leyenda aclaratoria */}
      <div style={{
        display: 'flex',
        gap: '1.5rem',
        fontSize: '0.75rem',
        color: 'var(--text-secondary, #94a3b8)',
        justifyContent: 'center',
        marginTop: '0.85rem',
        borderTop: '1px solid rgba(255,255,255,0.04)',
        paddingTop: '0.75rem'
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.35rem' }}>
          <div style={{ width: '12px', height: '12px', background: 'rgba(99, 102, 241, 0.2)', border: '1px solid rgba(99, 102, 241, 0.6)', borderRadius: '3px' }} />
          <span>Placa comercial base</span>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.35rem' }}>
          <div style={{ width: '12px', height: '12px', background: 'rgba(236, 72, 153, 0.25)', border: '1px solid rgba(236, 72, 153, 0.7)', borderRadius: '3px' }} />
          <span>Placa con corte en L (antifisuras)</span>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.35rem' }}>
          <div style={{
            width: '12px',
            height: '12px',
            background: 'repeating-linear-gradient(45deg, rgba(16,185,129,0.3), rgba(16,185,129,0.3) 2px, rgba(0,0,0,0.2) 2px, rgba(0,0,0,0.2) 4px)',
            border: '1px solid rgba(16, 185, 129, 0.8)',
            borderRadius: '3px'
          }} />
          <span>Retazo reutilizado de aberturas</span>
        </div>
      </div>
    </div>
  );
};
