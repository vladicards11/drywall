import { PlacaRect, Abertura } from "@drywall-calc/catalog-schemas";
import { interseccion, contieneCompletamente, Rect } from "../utils/geometria.js";

export function aplicarAberturas(placas: PlacaRect[], aberturas: Abertura[]): PlacaRect[] {
  if (aberturas.length === 0) {
    return placas;
  }

  const resultado: PlacaRect[] = [];

  for (const placa of placas) {
    let eliminada = false;
    let recortada = placa.recortada;

    const placaRect: Rect = {
      x: placa.x,
      y: placa.y,
      ancho: placa.ancho,
      alto: placa.alto,
    };

    for (const ab of aberturas) {
      const abRect: Rect = {
        x: ab.distancia_desde_inicio_m,
        y: 0, // Todas las aberturas (puertas, ventanas, pases) se asumen que parten de y = 0 en su proyección vertical para intersección de placas
        ancho: ab.ancho_m,
        alto: ab.alto_m,
      };

      // Si la placa está 100% dentro de la abertura, se elimina
      if (contieneCompletamente(abRect, placaRect)) {
        eliminada = true;
        break;
      }

      // Si hay intersección parcial, se marca como recortada
      if (interseccion(placaRect, abRect) !== null) {
        recortada = true;
      }
    }

    if (!eliminada) {
      resultado.push({
        ...placa,
        recortada,
      });
    }
  }

  return resultado;
}
