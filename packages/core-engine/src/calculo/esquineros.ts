import { Muro, Union, Catalogo } from "@drywall-calc/catalog-schemas";
import { roundFloat } from "../utils/redondeo.js";

export function calcularEsquineros(
  unionesDelMuro: Union[],
  muro: Muro,
  catalogo: Catalogo
): { ml_total: number } {
  let mlTotal = 0;

  for (const union of unionesDelMuro) {
    const tipologia = catalogo.tipologias_union.find((t) => t.codigo === union.tipo_union);
    if (tipologia && tipologia.acabado === "esquinero_metalico") {
      // Evitar duplicación entre muros conectados asignándolo al primero alfabéticamente
      const sortedMuros = [...union.muros_conectados].sort();
      if (muro.id === sortedMuros[0]) {
        mlTotal += muro.geometria.alto_m;
      }
    }
  }

  // Esquineros de los filos frontales expuestos de las hornacinas/nichos
  for (const ab of muro.aberturas) {
    if (ab.tipo === "hornacina") {
      mlTotal += 2 * (ab.ancho_m + ab.alto_m);
    }
  }

  return {
    ml_total: roundFloat(mlTotal),
  };
}
