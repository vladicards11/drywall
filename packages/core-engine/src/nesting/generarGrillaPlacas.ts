import { PlacaRect } from "@drywall-calc/catalog-schemas";
import { roundFloat } from "../utils/redondeo.js";

export interface GenerarGrillaParams {
  largo_m: number;
  alto_m: number;
  formato_m: [number, number];
  orientacion: "vertical" | "horizontal";
  origen_x_m?: number;
  simetrico?: boolean;
  cara: "A" | "B";
  capa: number;
  anguloEsquina?: number;
}

export function generarGrillaPlacas(params: GenerarGrillaParams): PlacaRect[] {
  const {
    largo_m,
    alto_m,
    formato_m,
    orientacion,
    origen_x_m = 0,
    simetrico = false,
    cara,
    capa,
    anguloEsquina,
  } = params;

  const placas: PlacaRect[] = [];
  const [ancho_placa] = formato_m;

  if (orientacion === "vertical") {
    // En vertical, las placas van paradas: el ancho es formato_m[0] y el alto es formato_m[1]
    let offset_x = origen_x_m;
    if (simetrico) {
      offset_x = (largo_m % ancho_placa) / 2;
    }

    const iStart = Math.floor(-offset_x / ancho_placa);
    const iEnd = Math.ceil((largo_m - offset_x) / ancho_placa);

    let idCounter = 1;
    for (let i = iStart; i < iEnd; i++) {
      const xStart = i * ancho_placa + offset_x;
      const xEnd = xStart + ancho_placa;

      const xStartClamped = Math.max(0, xStart);
      const xEndClamped = Math.min(largo_m, xEnd);
      const width = xEndClamped - xStartClamped;

      if (width > 0) {
        // En vertical, el alto de la placa base es el alto total del muro (o el alto de la placa si fuera menor)
        // Pero las placas se cortan a la altura del muro
        const recortada = width < ancho_placa - 1e-9;
        
        // Si toca los extremos del muro, y hay corte angular, marcarla
        const tocaExtremo = (xStartClamped <= 1e-5) || (xEndClamped >= largo_m - 1e-5);
        const anguloCorte = (tocaExtremo && anguloEsquina !== undefined && anguloEsquina !== 90) ? anguloEsquina : undefined;

        placas.push({
          id: `placa_${cara}_${capa}_${idCounter++}`,
          x: roundFloat(xStartClamped),
          y: 0,
          ancho: roundFloat(width),
          alto: roundFloat(alto_m),
          cara,
          capa,
          recortada,
          anguloCorte,
        });
      }
    }
  } else {
    // En horizontal, las placas van acostadas: el ancho es formato_m[0] (o formato_m[1] depende del formato,
    // pero el estándar es que el largo de la placa es el ancho del rectángulo colocado horizontalmente)
    // Para simplificar, asumimos que formato_m es [ancho_columna, alto_hilada].
    // Normalmente formato_m es [1.20, 2.40], por lo que al acostarla,
    // el largo de la placa (2.40) actúa como ancho de la columna, y el ancho de la placa (1.20) actúa como el alto de la hilada.
    // Vamos a intercambiar las dimensiones:
    const ancho_placa_h = Math.max(formato_m[0], formato_m[1]);
    const alto_placa_h = Math.min(formato_m[0], formato_m[1]);

    let offset_x = origen_x_m;
    if (simetrico) {
      offset_x = (largo_m % ancho_placa_h) / 2;
    }

    const nHiladas = Math.ceil(alto_m / alto_placa_h);
    let idCounter = 1;

    for (let j = 0; j < nHiladas; j++) {
      const yStart = j * alto_placa_h;
      const yEnd = Math.min(yStart + alto_placa_h, alto_m);
      const height = yEnd - yStart;

      if (height <= 0) continue;

      // Staggering (patrón de aparejo) para hiladas impares: desplaza la grilla media placa a la izquierda
      const desfase_j = j % 2 === 1 ? ancho_placa_h / 2 : 0;
      const shift_j = offset_x - desfase_j;

      const iStart = Math.floor(-shift_j / ancho_placa_h);
      const iEnd = Math.ceil((largo_m - shift_j) / ancho_placa_h);

      for (let i = iStart; i < iEnd; i++) {
        const xStart = i * ancho_placa_h + shift_j;
        const xEnd = xStart + ancho_placa_h;

        const xStartClamped = Math.max(0, xStart);
        const xEndClamped = Math.min(largo_m, xEnd);
        const width = xEndClamped - xStartClamped;

        if (width > 0) {
          const recortada = width < ancho_placa_h - 1e-9 || height < alto_placa_h - 1e-9;
          
          const tocaExtremo = (xStartClamped <= 1e-5) || (xEndClamped >= largo_m - 1e-5);
          const anguloCorte = (tocaExtremo && anguloEsquina !== undefined && anguloEsquina !== 90) ? anguloEsquina : undefined;

          placas.push({
            id: `placa_${cara}_${capa}_${idCounter++}`,
            x: roundFloat(xStartClamped),
            y: roundFloat(yStart),
            ancho: roundFloat(width),
            alto: roundFloat(height),
            cara,
            capa,
            recortada,
            anguloCorte,
          });
        }
      }
    }
  }

  return placas;
}
