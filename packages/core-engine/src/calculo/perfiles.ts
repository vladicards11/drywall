import { Muro, Union, Catalogo, ResultadoPerfiles } from "@drywall-calc/catalog-schemas";
import { roundUpSafe } from "../utils/redondeo.js";

export function calcularPerfiles(
  muro: Muro,
  unionesDelMuro: Union[],
  catalogo: Catalogo
): ResultadoPerfiles {
  // 1. Obtener largo de barra comercial del riel de la configuración del catálogo
  const rielConfig = catalogo.perfiles.riel.find((r) => r.codigo === muro.sistema.riel);
  const largoBarraRiel = rielConfig ? rielConfig.largo_barra_m : 3.00;

  // 2. Calcular montantes base
  const montantesBase = roundUpSafe(muro.geometria.largo_m / muro.sistema.separacion_montante_m) + 1;

  // 3. Calcular montantes por refuerzo de vanos (2 por abertura)
  const montantesRefuerzoVanos = 2 * muro.aberturas.length;

  // 4. Calcular montantes aportados por uniones (encuentros) sin duplicar
  let montantesUnion = 0;
  for (const union of unionesDelMuro) {
    const tipologia = catalogo.tipologias_union.find((t) => t.codigo === union.tipo_union);
    if (tipologia) {
      // Ordenar alfabéticamente para asegurar un muro dueño de la unión estable
      const sortedMuros = [...union.muros_conectados].sort();
      if (muro.id === sortedMuros[0]) {
        montantesUnion += tipologia.perfiles_adicionales;
      }
    }
  }

  const montantesTotal = montantesBase + montantesRefuerzoVanos + montantesUnion;

  // 5. Calcular rieles
  const ceilLength = muro.geometria.largo_m;
  let floorLength = muro.geometria.largo_m;
  let dintelLength = 0;

  for (const ab of muro.aberturas) {
    if (ab.tipo === "puerta" || ab.tipo === "pase") {
      // Las aberturas de piso interrumpen el riel inferior
      floorLength -= ab.ancho_m;
    }
    // Cada dintel de abertura requiere un riel de refuerzo igual al ancho + 15cm por lado para fijación
    dintelLength += ab.ancho_m + 0.30;
  }

  const totalRielLength = ceilLength + floorLength + dintelLength;
  const rielesBarras = roundUpSafe(totalRielLength / largoBarraRiel);

  return {
    montantes: montantesTotal,
    rieles_barras: rielesBarras,
    montantes_refuerzo_vanos: montantesRefuerzoVanos,
    montantes_union: montantesUnion,
  };
}
