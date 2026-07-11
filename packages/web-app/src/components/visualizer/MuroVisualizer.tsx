import React, { useState, useEffect, useCallback } from 'react';
import { MuroSvg } from './MuroSvg';
import { Button } from '../ui/Button';

import { extraerJuntas } from '@drywall-calc/core-engine';
import type { ResultadoMuro, Abertura } from '@drywall-calc/catalog-schemas';
import styles from './MuroVisualizer.module.css';

interface MuroVisualizerProps {
  resultado: ResultadoMuro | null;
  largo_m: number;
  alto_m: number;
  aberturas: Abertura[];
  carasConfig: 1 | 2;
  capasConfig: number;
}

export const MuroVisualizer: React.FC<MuroVisualizerProps> = ({
  resultado,
  largo_m,
  alto_m,
  aberturas,
  carasConfig,
  capasConfig,
}) => {
  const [cara, setCara] = useState<'A' | 'B'>('A');
  const [capa, setCapa] = useState<number>(1);
  const [zoom, setZoom] = useState<number>(1.0);
  const [pan, setPan] = useState({ x: 0, y: 0 });
  const [isDragging, setIsDragging] = useState(false);
  const [dragStart, setDragStart] = useState({ x: 0, y: 0 });

  // Reset visualizer settings when resultado changes
  useEffect(() => {
    setCara('A');
    setCapa(1);
    setZoom(1.0);
    setPan({ x: 0, y: 0 });
  }, [resultado]);

  if (!resultado) return null;

  // Filter plates and joints for selected Cara and Capa
  const filteredPlacas = resultado.placas.detalle.filter(
    (p) => p.cara === cara && p.capa === capa
  );

  // Extract and filter joints for this specific cara and capa
  const allJuntas = extraerJuntas(resultado.placas.detalle, aberturas);
  const filteredJuntas = allJuntas.filter(
    (j) => j.cara === cara && j.capa === capa
  );

  // Zoom controls
  const handleZoomIn = () => setZoom((z) => Math.min(z + 0.15, 3.0));
  const handleZoomOut = () => setZoom((z) => Math.max(z - 0.15, 0.4));
  const handleZoomReset = () => {
    setZoom(1.0);
    setPan({ x: 0, y: 0 });
  };

  // Drag-to-pan handlers
  const handleMouseDown = (e: React.MouseEvent<SVGSVGElement, MouseEvent>) => {
    if (e.button !== 0) return; // Only left click
    setIsDragging(true);
    setDragStart({ x: e.clientX - pan.x, y: e.clientY - pan.y });
  };

  const handleMouseMove = (e: React.MouseEvent<SVGSVGElement, MouseEvent>) => {
    if (!isDragging) return;
    setPan({
      x: e.clientX - dragStart.x,
      y: e.clientY - dragStart.y,
    });
  };

  const handleMouseUp = () => setIsDragging(false);
  const handleMouseLeave = () => setIsDragging(false);

  // Mouse wheel zoom handler (tipo nativo WheelEvent, adjunto con {passive:false} en MuroSvg)
  const handleWheel = useCallback((e: WheelEvent) => {
    e.preventDefault();
    const zoomIntensity = 0.05;
    const delta = e.deltaY < 0 ? 1 : -1;
    setZoom((z) => Math.max(0.4, Math.min(z + delta * zoomIntensity, 3.0)));
  }, []);

  return (
    <div className={styles.visualizer}>
      {/* Top Controls Toolbar */}
      <div className={styles.toolbar}>
        <div className={styles.controlGroup}>
          <span className={styles.groupLabel}>Cara:</span>
          <div className={styles.btnToggle}>
            <Button
              variant={cara === 'A' ? 'primary' : 'secondary'}
              size="sm"
              onClick={() => setCara('A')}
            >
              Cara A
            </Button>
            {carasConfig === 2 && (
              <Button
                variant={cara === 'B' ? 'primary' : 'secondary'}
                size="sm"
                onClick={() => setCara('B')}
              >
                Cara B
              </Button>
            )}
          </div>
        </div>

        {capasConfig > 1 && (
          <div className={styles.controlGroup}>
            <span className={styles.groupLabel}>Capa:</span>
            <div className={styles.btnToggle}>
              {Array.from({ length: capasConfig }).map((_, i) => {
                const capaNum = i + 1;
                return (
                  <Button
                    key={capaNum}
                    variant={capa === capaNum ? 'primary' : 'secondary'}
                    size="sm"
                    onClick={() => setCapa(capaNum)}
                  >
                    Capa {capaNum}
                  </Button>
                );
              })}
            </div>
          </div>
        )}

        <div className={styles.spacer} />

        <div className={styles.controlGroup}>
          <span className={styles.groupLabel}>Zoom: {Math.round(zoom * 100)}%</span>
          <div className={styles.btnToggle}>
            <Button id="btn-zoom-out" variant="secondary" size="sm" onClick={handleZoomOut} title="Alejar">
              ➖
            </Button>
            <Button id="btn-zoom-in" variant="secondary" size="sm" onClick={handleZoomIn} title="Acercar">
              ➕
            </Button>
            <Button id="btn-zoom-reset" variant="secondary" size="sm" onClick={handleZoomReset} title="Centrar">
              Centrar
            </Button>
          </div>
        </div>
      </div>

      {/* SVG Canvas Container */}
      <MuroSvg
        largo_m={largo_m}
        alto_m={alto_m}
        placas={filteredPlacas}
        aberturas={aberturas}
        juntas={filteredJuntas}
        zoom={zoom}
        pan={pan}
        onMouseDown={handleMouseDown}
        onMouseMove={handleMouseMove}
        onMouseUp={handleMouseUp}
        onMouseLeave={handleMouseLeave}
        onWheel={handleWheel}
      />

      {/* Legend & Instructions footer */}
      <div className={styles.footer}>
        <div className={styles.legend}>
          <div className={styles.legendItem}>
            <span className={`${styles.legendBox} ${styles.legendCompleta}`} />
            <span>Placa Completa</span>
          </div>
          <div className={styles.legendItem}>
            <span className={`${styles.legendBox} ${styles.legendRecortada}`} />
            <span>Placa Recortada</span>
          </div>
          <div className={styles.legendItem}>
            <span className={`${styles.legendBox} ${styles.legendAbertura}`} />
            <span>Abertura (Vano)</span>
          </div>
          <div className={styles.legendItem}>
            <span className={`${styles.legendLine} ${styles.legendJunta}`} />
            <span>Junta de Placa</span>
          </div>
        </div>
        <div className={styles.hint}>
          💡 Arrastrá el lienzo para moverte · Rueda del mouse para hacer zoom
        </div>
      </div>
    </div>
  );
};
