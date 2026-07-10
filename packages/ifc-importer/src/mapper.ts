/**
 * mapper.ts
 * Convierte MuroIFC[] → MuroFormData[] compatible con useProyecto.addMuro().
 * Este es el puente entre el mundo IFC y el motor de cálculo de Drywall Calc.
 */

import type { MuroIFC, AberturaIFC } from './types.js';

/**
 * Tipo que refleja la forma del formData de un muro en la web-app.
 * Se define aquí para no crear una dependencia circular con web-app.
 */
export interface MuroFormDataMinimal {
  largo_m: string;
  alto_m: string;
  aberturas: AberturaFormDataMinimal[];
  notas?: string;
  /** Nombre del piso IFC (IfcBuildingStorey) al que pertenece este muro. */
  storey?: string;
  startX?: number;
  startY?: number;
  endX?: number;
  endY?: number;
}

export interface AberturaFormDataMinimal {
  tipo: 'puerta' | 'ventana' | 'pase';
  ancho_m: number;
  alto_m: number;
  posicion_x_m: number;
}

/**
 * Mapea un AberturaIFC a los datos del formulario de abertura.
 */
function mapAbertura(ab: AberturaIFC): AberturaFormDataMinimal {
  return {
    tipo: ab.tipo,
    ancho_m: ab.ancho_m,
    alto_m: ab.alto_m,
    posicion_x_m: ab.posicion_x_m,
  };
}

/**
 * Mapea un MuroIFC a los datos del formulario de muro de la web app.
 *
 * @param muro - Muro extraído del IFC
 * @returns Objeto compatible con MuroFormData del motor
 */
export function mapMuroIFCToFormData(muro: MuroIFC): MuroFormDataMinimal {
  const notas: string[] = [];

  if (muro.metodo_extraccion === 'bounding_box') {
    notas.push('⚠ Dimensiones aproximadas (bounding box, sin Quantity Sets).');
  }
  if (muro.advertencias.length > 0) {
    notas.push(...muro.advertencias);
  }
  if (muro.aberturas.some((a) => a.confianza === 'estimado')) {
    notas.push('⚠ Posición de aberturas estimada — verificar antes de calcular.');
  }

  return {
    largo_m: muro.largo_m.toFixed(2),
    alto_m: muro.alto_m.toFixed(2),
    aberturas: muro.aberturas.map(mapAbertura),
    notas: notas.length > 0 ? notas.join(' | ') : undefined,
    storey: muro.storey,
    startX: muro.startX,
    startY: muro.startY,
    endX: muro.endX,
    endY: muro.endY,
  };
}

/**
 * Mapea todos los muros IFC al formato de formulario de la web app.
 *
 * @param muros - Array de muros extraídos del IFC
 * @returns Array de MuroFormDataMinimal
 */
export function mapMurosIFCToFormData(muros: MuroIFC[]): MuroFormDataMinimal[] {
  return muros.map(mapMuroIFCToFormData);
}
