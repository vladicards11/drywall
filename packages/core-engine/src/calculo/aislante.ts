import { Catalogo } from "@drywall-calc/catalog-schemas";
import { roundUpSafe, roundFloat } from "../utils/redondeo.js";

export function calcularAislante(
  areaNetaM2: number,
  catalogo: Catalogo
): { m2: number; paquetes: number } {
  const m2Total = roundFloat(areaNetaM2);
  const paquetes = roundUpSafe(m2Total / catalogo.aislante.presentacion_m2_por_paquete);

  return {
    m2: m2Total,
    paquetes,
  };
}
