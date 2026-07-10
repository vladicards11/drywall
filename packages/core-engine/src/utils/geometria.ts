import { EPSILON } from "./redondeo.js";

export interface Rect {
  x: number;
  y: number;
  ancho: number;
  alto: number;
}

export function area(r: Rect): number {
  return r.ancho * r.alto;
}

export function interseccion(r1: Rect, r2: Rect): Rect | null {
  const xStart = Math.max(r1.x, r2.x);
  const xEnd = Math.min(r1.x + r1.ancho, r2.x + r2.ancho);
  const yStart = Math.max(r1.y, r2.y);
  const yEnd = Math.min(r1.y + r1.alto, r2.y + r2.alto);

  const w = xEnd - xStart;
  const h = yEnd - yStart;

  // Si el ancho o alto de intersección es menor o igual a EPSILON, no hay superposición real
  if (w > EPSILON && h > EPSILON) {
    return {
      x: xStart,
      y: yStart,
      ancho: w,
      alto: h,
    };
  }

  return null;
}

export function contieneCompletamente(contenedor: Rect, contenido: Rect): boolean {
  return (
    contenido.x >= contenedor.x - EPSILON &&
    contenido.x + contenido.ancho <= contenedor.x + contenedor.ancho + EPSILON &&
    contenido.y >= contenedor.y - EPSILON &&
    contenido.y + contenido.alto <= contenedor.y + contenedor.alto + EPSILON
  );
}
