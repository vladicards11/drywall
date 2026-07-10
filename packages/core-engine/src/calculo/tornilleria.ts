import { Muro, Catalogo, ResultadoPerfiles, ResultadoTornillos } from "@drywall-calc/catalog-schemas";
import { roundUpSafe } from "../utils/redondeo.js";

export function calcularTornilleria(
  muro: Muro,
  areaNetaM2: number,
  resultadoPerfiles: ResultadoPerfiles,
  catalogo: Catalogo
): ResultadoTornillos {
  // 1. Tornillos placa-perfil
  const espesorKey = `${muro.placa.espesor_mm}mm`;
  const tornillosPlacaM2 = catalogo.tornillos.placa_perfil_por_m2[espesorKey] ?? 25;

  const totalCarasYCapas = muro.sistema.caras * muro.sistema.capas_por_cara;
  const placaPerfil = roundUpSafe(areaNetaM2 * totalCarasYCapas * tornillosPlacaM2);

  // 2. Tornillos perfil-perfil
  const tornillosPerfilUnion = catalogo.tornillos.perfil_perfil_por_union;
  const perfilPerfil = resultadoPerfiles.montantes * 2 * tornillosPerfilUnion;

  // 3. Anclajes losa
  const separacionAnclajes = catalogo.tornillos.anclaje_losa_separacion_m;
  let anclajesLosa = 0;

  // Riel superior (techo)
  const ceilLength = muro.geometria.largo_m;
  anclajesLosa += roundUpSafe(ceilLength / separacionAnclajes) + 1;

  // Riel inferior (piso) - puede estar interrumpido por aberturas
  // Dividimos el piso en segmentos válidos
  const segments: { start: number; end: number }[] = [{ start: 0, end: muro.geometria.largo_m }];

  for (const ab of muro.aberturas) {
    if (ab.tipo === "puerta" || ab.tipo === "pase") {
      const cutStart = ab.distancia_desde_inicio_m;
      const cutEnd = cutStart + ab.ancho_m;

      // Cortamos los segmentos existentes
      const tempSegments: { start: number; end: number }[] = [];
      for (const seg of segments) {
        if (cutEnd <= seg.start + 1e-9 || cutStart >= seg.end - 1e-9) {
          tempSegments.push(seg);
          continue;
        }
        if (cutStart > seg.start + 1e-9) {
          tempSegments.push({ start: seg.start, end: cutStart });
        }
        if (cutEnd < seg.end - 1e-9) {
          tempSegments.push({ start: cutEnd, end: seg.end });
        }
      }
      segments.length = 0;
      segments.push(...tempSegments);
    }
  }

  // Calculamos anclajes para cada segmento de piso
  for (const seg of segments) {
    const len = seg.end - seg.start;
    if (len > 1e-9) {
      anclajesLosa += roundUpSafe(len / separacionAnclajes) + 1;
    }
  }

  return {
    placa_perfil: placaPerfil,
    perfil_perfil: perfilPerfil,
    anclajes_losa: anclajesLosa,
  };
}
