import React from 'react';
import type { ResultadoNesting1D } from '@drywall-calc/catalog-schemas';

interface NestingVisualizerProps {
  nesting: ResultadoNesting1D;
  largoBarraComercial: number;
  nombrePerfil: string;
}

export const NestingVisualizer: React.FC<NestingVisualizerProps> = ({
  nesting,
  largoBarraComercial,
  nombrePerfil,
}) => {
  if (!nesting || nesting.barras.length === 0) {
    return (
      <div style={{ padding: '1rem', color: 'var(--text-secondary, #94a3b8)', fontStyle: 'italic', textAlign: 'center' }}>
        No hay datos de optimización de cortes disponibles para este perfil.
      </div>
    );
  }

  // Generador de colores estables para identificar tramos de corte
  const getColoresParaCorte = (id: string) => {
    // Hashear ID
    let hash = 0;
    for (let i = 0; i < id.length; i++) {
      hash = id.charCodeAt(i) + ((hash << 5) - hash);
    }
    const hue = Math.abs(hash % 360);
    // Paleta hermosa: HSL
    return {
      bg: `hsl(${hue}, 65%, 25%)`,
      border: `hsl(${hue}, 70%, 40%)`,
      text: `hsl(${hue}, 85%, 85%)`
    };
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem', marginTop: '1rem' }}>
      {/* Tarjeta de Resumen de Nesting */}
      <div style={{
        display: 'grid',
        gridTemplateColumns: 'repeat(auto-fit, minmax(120px, 1fr))',
        gap: '0.75rem',
        background: 'rgba(30, 41, 59, 0.4)',
        border: '1px solid rgba(255,255,255,0.06)',
        borderRadius: '12px',
        padding: '0.875rem 1rem'
      }}>
        <div>
          <span style={{ fontSize: '0.72rem', color: 'var(--text-secondary, #94a3b8)', display: 'block', textTransform: 'uppercase', letterSpacing: '0.5px' }}>
            Barras Necesarias
          </span>
          <span style={{ fontSize: '1.4rem', fontWeight: 700, color: 'var(--accent, #6366f1)' }}>
            {nesting.cantidad_barras} <span style={{ fontSize: '0.8rem', fontWeight: 400, color: 'var(--text-primary)' }}>und</span>
          </span>
        </div>
        <div>
          <span style={{ fontSize: '0.72rem', color: 'var(--text-secondary, #94a3b8)', display: 'block', textTransform: 'uppercase', letterSpacing: '0.5px' }}>
            Metraje Lineal Util
          </span>
          <span style={{ fontSize: '1.2rem', fontWeight: 600, color: 'var(--text-primary, #f8fafc)' }}>
            {nesting.longitud_total_cortes_m.toFixed(2)} <span style={{ fontSize: '0.8rem', fontWeight: 400 }}>m</span>
          </span>
        </div>
        <div>
          <span style={{ fontSize: '0.72rem', color: 'var(--text-secondary, #94a3b8)', display: 'block', textTransform: 'uppercase', letterSpacing: '0.5px' }}>
            Desperdicio en Obra
          </span>
          <span style={{ fontSize: '1.2rem', fontWeight: 600, color: nesting.desperdicio_pct > 15 ? '#ef4444' : '#10b981' }}>
            {nesting.desperdicio_pct.toFixed(1)}%
          </span>
        </div>
        <div>
          <span style={{ fontSize: '0.72rem', color: 'var(--text-secondary, #94a3b8)', display: 'block', textTransform: 'uppercase', letterSpacing: '0.5px' }}>
            Merma Sobrante
          </span>
          <span style={{ fontSize: '1.2rem', fontWeight: 600, color: 'var(--text-secondary, #94a3b8)' }}>
            {nesting.desperdicio_lineal_m.toFixed(2)} <span style={{ fontSize: '0.8rem', fontWeight: 400 }}>m</span>
          </span>
        </div>
      </div>

      {/* Listado de barras y sus despieces */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: '0.85rem' }}>
        <h4 style={{ fontSize: '0.82rem', fontWeight: 600, color: 'var(--text-primary, #f8fafc)', margin: '0 0 0.25rem', display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
          📐 Plano de Cortes para el Instalador ({nombrePerfil} · Barra {largoBarraComercial.toFixed(2)}m)
        </h4>

        {nesting.barras.map((barra) => {
          return (
            <div key={barra.id} style={{
              background: 'rgba(15, 23, 42, 0.4)',
              border: '1px solid rgba(255,255,255,0.04)',
              borderRadius: '10px',
              padding: '0.75rem'
            }}>
              {/* Encabezado de la barra */}
              <div style={{
                display: 'flex',
                justifyContent: 'space-between',
                fontSize: '0.75rem',
                color: 'var(--text-secondary, #94a3b8)',
                marginBottom: '0.5rem',
                fontWeight: 500
              }}>
                <span>Barra #{barra.id}</span>
                <span>Usado: {barra.longitud_usada_m.toFixed(2)}m / Libre: {barra.remanente_m.toFixed(2)}m</span>
              </div>

              {/* Barra Gráfica de Cortes */}
              <div style={{
                height: '32px',
                width: '100%',
                background: 'rgba(255,255,255,0.02)',
                border: '1px solid rgba(255,255,255,0.06)',
                borderRadius: '6px',
                overflow: 'hidden',
                display: 'flex',
                alignItems: 'stretch'
              }}>
                {barra.cortes.map((corte, idx) => {
                  const pct = (corte.longitud_m / largoBarraComercial) * 100;
                  const colores = getColoresParaCorte(corte.id);
                  return (
                    <div
                      key={`${corte.id}-${idx}`}
                      style={{
                        width: `${pct}%`,
                        background: colores.bg,
                        borderRight: `1px solid ${colores.border}`,
                        display: 'flex',
                        flexDirection: 'column',
                        justifyContent: 'center',
                        alignItems: 'center',
                        padding: '0 4px',
                        overflow: 'hidden',
                        cursor: 'help'
                      }}
                      title={`${corte.descripcion}: ${corte.longitud_m.toFixed(2)}m`}
                    >
                      <span style={{
                        fontSize: '0.68rem',
                        fontWeight: 700,
                        color: colores.text,
                        whiteSpace: 'nowrap',
                        textOverflow: 'ellipsis',
                        overflow: 'hidden',
                        width: '100%',
                        textAlign: 'center'
                      }}>
                        {corte.longitud_m.toFixed(2)}m
                      </span>
                      <span style={{
                        fontSize: '0.52rem',
                        color: colores.text,
                        opacity: 0.8,
                        whiteSpace: 'nowrap',
                        textOverflow: 'ellipsis',
                        overflow: 'hidden',
                        width: '100%',
                        textAlign: 'center'
                      }}>
                        {corte.descripcion.split(' ')[0]}
                      </span>
                    </div>
                  );
                })}

                {/* Sobrante (Merma) */}
                {barra.remanente_m > 0.01 && (
                  <div
                    style={{
                      width: `${(barra.remanente_m / largoBarraComercial) * 100}%`,
                      background: 'repeating-linear-gradient(45deg, rgba(239, 68, 68, 0.1), rgba(239, 68, 68, 0.1) 4px, rgba(0, 0, 0, 0.2) 4px, rgba(0, 0, 0, 0.2) 8px)',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      overflow: 'hidden',
                      color: 'rgba(239, 68, 68, 0.6)'
                    }}
                    title={`Merma sobrante no utilizable: ${barra.remanente_m.toFixed(2)}m`}
                  >
                    <span style={{ fontSize: '0.62rem', fontWeight: 500 }}>
                      {barra.remanente_m.toFixed(2)}m
                    </span>
                  </div>
                )}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};
