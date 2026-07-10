import React, { useRef, useEffect, useState } from 'react';
import type { ProyectoFormData } from '../../hooks/useProyecto';

interface InteractivePlantaMapProps {
  proyecto: ProyectoFormData;
  selectedMuroIdx: number;
  onSelectMuro?: (idx: number) => void;
}

export const InteractivePlantaMap: React.FC<InteractivePlantaMapProps> = ({
  proyecto,
  selectedMuroIdx,
  onSelectMuro
}) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [hoveredIdx, setHoveredIdx] = useState<number | null>(null);

  // Normalizar coordenadas para muros: si no las tienen (creados manualmente), creamos un layout lineal
  let currentX = 0;
  const murosConGeometria = proyecto.muros.map((m, idx) => {
    const largo = parseFloat(m.largo_m) || 0;
    const startX = m.startX !== undefined ? m.startX : currentX;
    const startY = m.startY !== undefined ? m.startY : 0;
    const endX = m.endX !== undefined ? m.endX : currentX + largo;
    const endY = m.endY !== undefined ? m.endY : 0;

    if (m.startX === undefined) {
      currentX += largo + 0.5; // Espacio entre muros
    }

    return {
      ...m,
      originalIdx: idx,
      startX,
      startY,
      endX,
      endY,
    };
  });

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas || murosConGeometria.length === 0) return;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    // Obtener dimensiones del contenedor
    const rect = canvas.parentElement?.getBoundingClientRect();
    const width = rect?.width || 500;
    const height = 300;
    canvas.width = width;
    canvas.height = height;

    // Calcular Bounding Box 2D de la planta completa para centrar y escalar
    let minX = Infinity, maxX = -Infinity;
    let minY = Infinity, maxY = -Infinity;

    murosConGeometria.forEach(m => {
      minX = Math.min(minX, m.startX!, m.endX!);
      maxX = Math.max(maxX, m.startX!, m.endX!);
      minY = Math.min(minY, m.startY!, m.endY!);
      maxY = Math.max(maxY, m.startY!, m.endY!);
    });

    const padding = 40;
    const dx = maxX - minX || 1;
    const dy = maxY - minY || 1;

    // Factor de escala para encajar la planta en el canvas
    const scaleX = (width - padding * 2) / dx;
    const scaleY = (height - padding * 2) / dy;
    const scale = Math.min(scaleX, scaleY, 60); // Límite de zoom máximo de 60px por metro

    // Centrado de la geometría
    const offsetX = (width - dx * scale) / 2 - minX * scale;
    const offsetY = (height - dy * scale) / 2 - minY * scale;

    // Limpiar canvas
    ctx.clearRect(0, 0, width, height);

    // Dibujar grilla fina de fondo premium
    ctx.strokeStyle = 'rgba(255, 255, 255, 0.03)';
    ctx.lineWidth = 1;
    const gridSize = 20;
    for (let x = 0; x < width; x += gridSize) {
      ctx.beginPath();
      ctx.moveTo(x, 0);
      ctx.lineTo(x, height);
      ctx.stroke();
    }
    for (let y = 0; y < height; y += gridSize) {
      ctx.beginPath();
      ctx.moveTo(0, y);
      ctx.lineTo(width, y);
      ctx.stroke();
    }

    // Dibujar uniones detectadas
    if (proyecto.uniones) {
      proyecto.uniones.forEach(u => {
        // Encontrar los muros de la unión para calcular el punto de encuentro
        const muroA = proyecto.muros.find(m => `muro_${proyecto.muros.indexOf(m)}` === u.muro_a);
        const muroB = proyecto.muros.find(m => `muro_${proyecto.muros.indexOf(m)}` === u.muro_b);

        if (muroA && muroB && muroA.startX !== undefined && muroB.startX !== undefined) {
          // Promedio rápido de los puntos extremos cercanos para el centro de unión
          let cx = (muroA.startX! + muroA.endX!) / 2;
          let cy = (muroA.startY! + muroA.endY!) / 2;
          
          // Refinar al extremo coincidente si están a menos de 0.4m
          for (let p1 of [{ x: muroA.startX!, y: muroA.startY! }, { x: muroA.endX!, y: muroA.endY! }]) {
            for (let p2 of [{ x: muroB.startX!, y: muroB.startY! }, { x: muroB.endX!, y: muroB.endY! }]) {
              const d = Math.sqrt((p1.x - p2.x) ** 2 + (p1.y - p2.y) ** 2);
              if (d < 0.4) {
                cx = (p1.x + p2.x) / 2;
                cy = (p1.y + p2.y) / 2;
                break;
              }
            }
          }

          const screenX = cx * scale + offsetX;
          const screenY = cy * scale + offsetY;

          // Dibujar punto de unión premium
          ctx.beginPath();
          ctx.arc(screenX, screenY, 5, 0, 2 * Math.PI);
          ctx.fillStyle = u.tipo_union === 'T' ? 'rgba(59, 130, 246, 0.7)' : 'rgba(245, 158, 11, 0.7)';
          ctx.fill();
        }
      });
    }

    // Dibujar cada muro
    murosConGeometria.forEach(m => {
      const sX = m.startX! * scale + offsetX;
      const sY = m.startY! * scale + offsetY;
      const eX = m.endX! * scale + offsetX;
      const eY = m.endY! * scale + offsetY;

      const isSelected = m.originalIdx === selectedMuroIdx;
      const isHovered = m.originalIdx === hoveredIdx;

      // Dibujar línea de muro
      ctx.beginPath();
      ctx.moveTo(sX, sY);
      ctx.lineTo(eX, eY);

      // Grosor del muro proporcional al riel
      ctx.lineWidth = isSelected || isHovered ? 12 : 8;
      
      if (isSelected) {
        ctx.strokeStyle = 'rgba(16, 185, 129, 0.85)'; // Emerald-500 premium green
      } else if (isHovered) {
        ctx.strokeStyle = 'rgba(99, 102, 241, 0.85)'; // Indigo-500
      } else {
        ctx.strokeStyle = 'rgba(255, 255, 255, 0.25)'; // Blanco traslúcido
      }
      ctx.lineCap = 'round';
      ctx.stroke();

      // Dibujar núcleo/línea central del muro
      ctx.beginPath();
      ctx.moveTo(sX, sY);
      ctx.lineTo(eX, eY);
      ctx.lineWidth = 2;
      ctx.strokeStyle = isSelected ? '#34d399' : '#ffffff';
      ctx.stroke();

      // Dibujar etiqueta de texto con nombre del muro
      const midX = (sX + eX) / 2;
      const midY = (sY + eY) / 2;

      ctx.save();
      ctx.fillStyle = isSelected ? '#10b981' : isHovered ? '#818cf8' : '#94a3b8';
      ctx.font = isSelected ? 'bold 11px sans-serif' : '10px sans-serif';
      ctx.textAlign = 'center';
      ctx.textBaseline = 'bottom';
      ctx.fillText(`Muro #${m.originalIdx + 1}`, midX, midY - 8);
      ctx.restore();
    });

  }, [proyecto, selectedMuroIdx, hoveredIdx, murosConGeometria]);

  // Manejo de eventos de mouse (hover y click)
  const handleMouseMove = (e: React.MouseEvent<HTMLCanvasElement>) => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const rect = canvas.getBoundingClientRect();
    const mx = e.clientX - rect.left;
    const my = e.clientY - rect.top;

    // Calcular Bounding Box y transformaciones locales
    let minX = Infinity, maxX = -Infinity;
    let minY = Infinity, maxY = -Infinity;

    murosConGeometria.forEach(m => {
      minX = Math.min(minX, m.startX!, m.endX!);
      maxX = Math.max(maxX, m.startX!, m.endX!);
      minY = Math.min(minY, m.startY!, m.endY!);
      maxY = Math.max(maxY, m.startY!, m.endY!);
    });

    const padding = 40;
    const dx = maxX - minX || 1;
    const dy = maxY - minY || 1;
    const scaleX = (canvas.width - padding * 2) / dx;
    const scaleY = (canvas.height - padding * 2) / dy;
    const scale = Math.min(scaleX, scaleY, 60);

    const offsetX = (canvas.width - dx * scale) / 2 - minX * scale;
    const offsetY = (canvas.height - dy * scale) / 2 - minY * scale;

    let closestIdx: number | null = null;
    let minDistance = Infinity;

    murosConGeometria.forEach(m => {
      const sX = m.startX! * scale + offsetX;
      const sY = m.startY! * scale + offsetY;
      const eX = m.endX! * scale + offsetX;
      const eY = m.endY! * scale + offsetY;

      // Distancia de punto mx,my a segmento sX,sY -> eX,eY
      const l2 = (eX - sX) ** 2 + (eY - sY) ** 2;
      let t = ((mx - sX) * (eX - sX) + (my - sY) * (eY - sY)) / l2;
      t = Math.max(0, Math.min(1, t));

      const projX = sX + t * (eX - sX);
      const projY = sY + t * (eY - sY);

      const distance = Math.sqrt((mx - projX) ** 2 + (my - projY) ** 2);
      if (distance < minDistance) {
        minDistance = distance;
        closestIdx = m.originalIdx;
      }
    });

    // Cambiar hoveredIdx si la distancia es menor a un umbral de proximidad de pixels
    if (minDistance < 15) {
      setHoveredIdx(closestIdx);
      canvas.style.cursor = 'pointer';
    } else {
      setHoveredIdx(null);
      canvas.style.cursor = 'default';
    }
  };

  const handleClick = () => {
    if (hoveredIdx !== null && onSelectMuro) {
      onSelectMuro(hoveredIdx);
    }
  };

  if (proyecto.muros.length === 0) return null;

  return (
    <div style={{
      background: 'rgba(30, 41, 59, 0.4)',
      backdropFilter: 'blur(8px)',
      border: '1px solid rgba(255, 255, 255, 0.06)',
      borderRadius: '16px',
      padding: '1rem',
      marginBottom: '1.25rem',
    }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.5rem' }}>
        <span style={{ fontSize: '0.85rem', fontWeight: 600, color: 'var(--text-secondary, #94a3b8)', display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
          🗺️ Esquema Interactivo de Planta 2D
        </span>
        <span style={{ fontSize: '0.72rem', color: '#64748b' }}>
          Hacé click en un segmento para seleccionarlo en la calculadora
        </span>
      </div>
      <div style={{ position: 'relative', width: '100%', height: '300px', borderRadius: '12px', overflow: 'hidden', background: '#0f172a' }}>
        <canvas
          ref={canvasRef}
          onMouseMove={handleMouseMove}
          onMouseLeave={() => setHoveredIdx(null)}
          onClick={handleClick}
          style={{ display: 'block', width: '100%', height: '100%' }}
        />
        {/* Leyenda pequeña */}
        <div style={{
          position: 'absolute',
          bottom: '8px',
          left: '8px',
          display: 'flex',
          gap: '0.8rem',
          background: 'rgba(15, 23, 42, 0.85)',
          padding: '4px 8px',
          borderRadius: '6px',
          fontSize: '0.68rem',
          border: '1px solid rgba(255,255,255,0.05)'
        }}>
          <span style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
            <span style={{ display: 'inline-block', width: '8px', height: '8px', borderRadius: '50%', background: '#10b981' }} />
            Seleccionado
          </span>
          <span style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
            <span style={{ display: 'inline-block', width: '8px', height: '8px', borderRadius: '50%', background: '#f59e0b' }} />
            Unión L
          </span>
          <span style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
            <span style={{ display: 'inline-block', width: '8px', height: '8px', borderRadius: '50%', background: '#3b82f6' }} />
            Unión T
          </span>
        </div>
      </div>
    </div>
  );
};
