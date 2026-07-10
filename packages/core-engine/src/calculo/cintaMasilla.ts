import { JuntaSegmento, Catalogo, ResultadoCintaMasilla } from "@drywall-calc/catalog-schemas";
import { roundUpSafe, roundFloat } from "../utils/redondeo.js";

export function calcularCintaMasilla(
  juntas: JuntaSegmento[],
  catalogo: Catalogo
): ResultadoCintaMasilla {
  const sumJuntas = juntas.reduce((acc, j) => acc + j.longitud, 0);

  // Cinta: total ml = ml_juntas * factor_traslape
  const mlTotalCinta = roundFloat(sumJuntas * catalogo.cinta.factor_traslape);
  const rollos = roundUpSafe(mlTotalCinta / catalogo.cinta.rendimiento_ml_por_rollo);

  // Masilla: total kg = ml_juntas * rendimiento_kg_por_ml_mano * manos
  const kgTotalMasilla = roundFloat(
    sumJuntas * catalogo.masilla.kg_por_ml_por_mano * catalogo.masilla.manos_estandar
  );
  const bolsas = roundUpSafe(kgTotalMasilla / catalogo.masilla.presentacion_kg_por_bolsa);

  return {
    cinta: {
      ml_total: mlTotalCinta,
      rollos,
    },
    masilla: {
      kg_total: kgTotalMasilla,
      bolsas,
    },
  };
}
