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
  const altoMuro = muro.geometria.alto_m;
  let ceilLength = muro.geometria.largo_m;
  let floorLength = muro.geometria.largo_m;
  let dintelLength = 0;

  for (const ab of muro.aberturas) {
    const esAlturaCompleta = ab.alto_m >= altoMuro - 1e-9;

    if (ab.tipo === "puerta" || ab.tipo === "pase") {
      // Toda abertura que arranca del piso interrumpe el riel inferior
      floorLength -= ab.ancho_m;
    }

    if (esAlturaCompleta) {
      // Vano de altura completa: también interrumpe el riel superior y NO genera dintel
      // (no hay muro por encima que soportar → no hace falta el riel horizontal de dintel)
      ceilLength -= ab.ancho_m;
    } else {
      // Vano parcial (puerta estándar, ventana): requiere riel de dintel horizontal
      // ancho del vano + 15cm por lado para fijación (según práctica de obra)
      dintelLength += ab.ancho_m + 0.30;
    }
  }

  // Corrección por ángulo no ortogonal (corte a inglete en uniones)
  const anchoPerfilM = rielConfig ? rielConfig.ancho_mm / 1000 : 0.048;
  let deltaAngulo = 0;
  for (const union of unionesDelMuro) {
    if (union.angulo_grados !== 90 && union.angulo_grados > 0) {
      const alphaRad = (union.angulo_grados * Math.PI) / 180;
      deltaAngulo += anchoPerfilM / Math.tan(alphaRad / 2);
    }
  }

  ceilLength += deltaAngulo;
  if (floorLength > 1e-9) {
    floorLength += deltaAngulo;
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
