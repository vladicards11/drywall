/**
 * uniones.ts
 * Algoritmo espacial para la detección automática de encuentros (uniones en L, T, X)
 * y cálculo de ángulos entre muros a partir de sus ejes 2D.
 */

import type { MuroIFC, UnionIFC } from '../types.js';

/**
 * Distancia euclidiana básica 2D.
 */
function dist2D(x1: number, y1: number, x2: number, y2: number): number {
  return Math.sqrt((x2 - x1) ** 2 + (y2 - y1) ** 2);
}

/**
 * Distancia mínima de un punto (px, py) a un segmento de línea (x1, y1) - (x2, y2).
 */
function distPuntoSegmento(
  px: number,
  py: number,
  x1: number,
  y1: number,
  x2: number,
  y2: number
): { distancia: number; esExtremo: boolean } {
  const l2 = (x2 - x1) ** 2 + (y2 - y1) ** 2;
  if (l2 === 0) return { distancia: dist2D(px, py, x1, y1), esExtremo: true };

  // Proyección parametrizada t
  let t = ((px - x1) * (x2 - x1) + (py - y1) * (y2 - y1)) / l2;
  t = Math.max(0, Math.min(1, t)); // Clampar al segmento

  const projX = x1 + t * (x2 - x1);
  const projY = y1 + t * (y2 - y1);

  const distancia = dist2D(px, py, projX, projY);
  const esExtremo = t < 0.05 || t > 0.95;

  return { distancia, esExtremo };
}

/**
 * Detecta espacialmente las uniones en planta a partir de las coordenadas 2D de los muros.
 */
export function detectarUniones(muros: MuroIFC[]): UnionIFC[] {
  const uniones: UnionIFC[] = [];
  const UMBRAL_CONEXION_M = 0.35; // 35 cm de tolerancia para uniones
  let unionCounter = 1;

  for (let i = 0; i < muros.length; i++) {
    const m1 = muros[i];
    if (m1.startX === undefined || m1.startY === undefined || m1.endX === undefined || m1.endY === undefined) {
      continue;
    }

    const start1 = { x: m1.startX, y: m1.startY };
    const end1 = { x: m1.endX, y: m1.endY };

    // Vector director m1
    const dx1 = end1.x - start1.x;
    const dy1 = end1.y - start1.y;
    const len1 = Math.sqrt(dx1 * dx1 + dy1 * dy1);

    for (let j = i + 1; j < muros.length; j++) {
      const m2 = muros[j];
      if (m2.startX === undefined || m2.startY === undefined || m2.endX === undefined || m2.endY === undefined) {
        continue;
      }

      const start2 = { x: m2.startX, y: m2.startY };
      const end2 = { x: m2.endX, y: m2.endY };

      // Vector director m2
      const dx2 = end2.x - start2.x;
      const dy2 = end2.y - start2.y;
      const len2 = Math.sqrt(dx2 * dx2 + dy2 * dy2);

      if (len1 === 0 || len2 === 0) continue;

      // Calcular el ángulo relativo en grados sexagesimales (0-180)
      const dotProduct = dx1 * dx2 + dy1 * dy2;
      let cosTheta = dotProduct / (len1 * len2);
      // Clampar para evitar errores flotantes de precisión fuera de [-1, 1]
      cosTheta = Math.max(-1, Math.min(1, cosTheta));
      const thetaRad = Math.acos(cosTheta);
      let angulo = (thetaRad * 180) / Math.PI;

      // Simplificamos al rango agudo/suplementario para el inglete
      if (angulo > 90) {
        angulo = 180 - angulo;
      }
      angulo = Math.round(angulo * 10) / 10;

      // 1. Distancias extremo a extremo (esquinas en L)
      const dSS = dist2D(start1.x, start1.y, start2.x, start2.y);
      const dSE = dist2D(start1.x, start1.y, end2.x, end2.y);
      const dES = dist2D(end1.x, end1.y, start2.x, start2.y);
      const dEE = dist2D(end1.x, end1.y, end2.x, end2.y);

      const minDistExtremo = Math.min(dSS, dSE, dES, dEE);

      if (minDistExtremo < UMBRAL_CONEXION_M) {
        // Esquina en L
        uniones.push({
          id: `union_${unionCounter++}`,
          muros_conectados: [m1.expressId, m2.expressId],
          angulo_grados: angulo === 0 ? 90 : angulo, // Si es 0 o colineal asumimos 90 por seguridad o el calculado
          tipo_union: 'L',
        });
        continue;
      }

      // 2. Distancias extremo de un muro al cuerpo del otro (encuentros en T)
      const distS1_M2 = distPuntoSegmento(start1.x, start1.y, start2.x, start2.y, end2.x, end2.y);
      const distE1_M2 = distPuntoSegmento(end1.x, end1.y, start2.x, start2.y, end2.x, end2.y);
      const distS2_M1 = distPuntoSegmento(start2.x, start2.y, start1.x, start1.y, end1.x, end1.y);
      const distE2_M1 = distPuntoSegmento(end2.x, end2.y, start1.x, start1.y, end1.x, end1.y);

      const minimaDistT = Math.min(distS1_M2.distancia, distE1_M2.distancia, distS2_M1.distancia, distE2_M1.distancia);

      if (minimaDistT < UMBRAL_CONEXION_M) {
        // Encuentro en T
        uniones.push({
          id: `union_${unionCounter++}`,
          muros_conectados: [m1.expressId, m2.expressId],
          angulo_grados: angulo === 0 ? 90 : angulo,
          tipo_union: 'T',
        });
      }
    }
  }

  return uniones;
}
