import { PlacaRect, Abertura, JuntaSegmento } from "@drywall-calc/catalog-schemas";
import { iguales } from "../utils/redondeo.js";

interface Interval {
  start: number;
  end: number;
}

function subtractIntervals(base: Interval[], cut: Interval): Interval[] {
  const result: Interval[] = [];
  for (const interval of base) {
    // Si no hay superposición
    if (cut.end <= interval.start + 1e-9 || cut.start >= interval.end - 1e-9) {
      result.push(interval);
      continue;
    }

    // Parte izquierda
    if (cut.start > interval.start + 1e-9) {
      result.push({ start: interval.start, end: cut.start });
    }

    // Parte derecha
    if (cut.end < interval.end - 1e-9) {
      result.push({ start: cut.end, end: interval.end });
    }
  }
  return result;
}

export function extraerJuntas(placas: PlacaRect[], aberturas: Abertura[]): JuntaSegmento[] {
  const juntas: JuntaSegmento[] = [];

  // Agrupamos placas por cara y capa para calcular juntas independientemente
  const grupos: Record<string, PlacaRect[]> = {};
  for (const p of placas) {
    const key = `${p.cara}_${p.capa}`;
    if (!grupos[key]) {
      grupos[key] = [];
    }
    grupos[key].push(p);
  }

  for (const key of Object.keys(grupos)) {
    const plates = grupos[key];
    const [cara, capaStr] = key.split("_");
    const capa = parseInt(capaStr, 10);

    // 1. JUNTAS VERTICALES: bordes compartidos en x vertical
    for (let i = 0; i < plates.length; i++) {
      for (let j = 0; j < plates.length; j++) {
        if (i === j) continue;
        const p1 = plates[i];
        const p2 = plates[j];

        // p1 está inmediatamente a la izquierda de p2
        if (iguales(p1.x + p1.ancho, p2.x)) {
          const yStart = Math.max(p1.y, p2.y);
          const yEnd = Math.min(p1.y + p1.alto, p2.y + p2.alto);

          // Si hay superposición en y
          if (yEnd > yStart + 1e-9) {
            let intervals: Interval[] = [{ start: yStart, end: yEnd }];

            // Recortar por aberturas
            for (const ab of aberturas) {
              const xJoint = p2.x;
              const abStart = ab.distancia_desde_inicio_m;
              const abEnd = abStart + ab.ancho_m;

              // Si la junta cae dentro del rango horizontal del vano (estrictamente adentro)
              if (xJoint > abStart + 1e-9 && xJoint < abEnd - 1e-9) {
                // El vano cubre en y desde 0 hasta ab.alto_m
                intervals = subtractIntervals(intervals, { start: 0, end: ab.alto_m });
              }
            }

            for (const interval of intervals) {
              const len = interval.end - interval.start;
              if (len > 1e-9) {
                juntas.push({
                  orientacion: "vertical",
                  coordenada_fija: p2.x,
                  inicio: interval.start,
                  fin: interval.end,
                  longitud: len,
                  cara: cara as "A" | "B",
                  capa,
                });
              }
            }
          }
        }
      }
    }

    // 2. JUNTAS HORIZONTALES: bordes compartidos en y horizontal
    for (let i = 0; i < plates.length; i++) {
      for (let j = 0; j < plates.length; j++) {
        if (i === j) continue;
        const p1 = plates[i];
        const p2 = plates[j];

        // p1 está inmediatamente debajo de p2
        if (iguales(p1.y + p1.alto, p2.y)) {
          const xStart = Math.max(p1.x, p2.x);
          const xEnd = Math.min(p1.x + p1.ancho, p2.x + p2.ancho);

          // Si hay superposición en x
          if (xEnd > xStart + 1e-9) {
            let intervals: Interval[] = [{ start: xStart, end: xEnd }];

            // Recortar por aberturas
            for (const ab of aberturas) {
              const yJoint = p2.y;
              const abStart = ab.distancia_desde_inicio_m;
              const abEnd = abStart + ab.ancho_m;

              // Si la junta horizontal cae dentro del rango vertical del vano (0 a ab.alto_m)
              if (yJoint > 0 && yJoint < ab.alto_m - 1e-9) {
                // El vano cubre horizontalmente de abStart a abEnd
                intervals = subtractIntervals(intervals, { start: abStart, end: abEnd });
              }
            }

            for (const interval of intervals) {
              const len = interval.end - interval.start;
              if (len > 1e-9) {
                juntas.push({
                  orientacion: "horizontal",
                  coordenada_fija: p2.y,
                  inicio: interval.start,
                  fin: interval.end,
                  longitud: len,
                  cara: cara as "A" | "B",
                  capa,
                });
              }
            }
          }
        }
      }
    }
  }

  return juntas;
}
