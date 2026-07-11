import { Muro, Union, Catalogo, ResultadoPerfiles, ResultadoTornillos } from "@drywall-calc/catalog-schemas";
import { roundUpSafe } from "../utils/redondeo.js";

export function calcularTornilleria(
  muro: Muro,
  areaNetaM2: number,
  resultadoPerfiles: ResultadoPerfiles,
  catalogo: Catalogo,
  unionesDelMuro: Union[] = []
): ResultadoTornillos {
  // 1. Tornillos placa-perfil
  const espesorKey = `${muro.placa.espesor_mm}mm`;
  const tornillosPlacaM2 = catalogo.tornillos.placa_perfil_por_m2[espesorKey] ?? 25;

  const totalCarasYCapas = muro.sistema.caras * muro.sistema.capas_por_cara;
  const placaPerfil = roundUpSafe(areaNetaM2 * totalCarasYCapas * tornillosPlacaM2);

  // 2. Tornillos perfil-perfil
  const tornillosPerfilUnion = catalogo.tornillos.perfil_perfil_por_union;
  // Fijación estándar de montantes a rieles en extremos
  let perfilPerfil = resultadoPerfiles.montantes * 2 * tornillosPerfilUnion;

  // Adicionar fijación sismorresistente por cada empalme telescópico en montantes (8 wafer por empalme)
  let empalmesMontantes = 0;
  if (resultadoPerfiles.nesting_montantes) {
    for (const barra of resultadoPerfiles.nesting_montantes.barras) {
      for (const corte of barra.cortes) {
        if (corte.id.includes("_b") && !corte.id.endsWith("_b1")) {
          empalmesMontantes++;
        }
      }
    }
  }
  perfilPerfil += empalmesMontantes * 8;

  // 3. Anclajes losa
  const separacionAnclajes = catalogo.tornillos.anclaje_losa_separacion_m;
  const altoMuro = muro.geometria.alto_m;
  let anclajesLosa = 0;

  // Corrección por ángulo no ortogonal (corte a inglete en uniones)
  const rielConfig = catalogo.perfiles.riel.find((r) => r.codigo === muro.sistema.riel);
  const anchoPerfilM = rielConfig ? rielConfig.ancho_mm / 1000 : 0.048;
  let deltaAngulo = 0;
  for (const union of unionesDelMuro) {
    if (union.angulo_grados !== 90 && union.angulo_grados > 0) {
      const alphaRad = (union.angulo_grados * Math.PI) / 180;
      deltaAngulo += anchoPerfilM / Math.tan(alphaRad / 2);
    }
  }

  // Riel superior (techo) — puede estar interrumpido por pases de altura completa
  const ceilSegments: { start: number; end: number }[] = [{ start: 0, end: muro.geometria.largo_m + deltaAngulo }];

  for (const ab of muro.aberturas) {
    const esAlturaCompleta = ab.alto_m >= altoMuro - 1e-9;
    if (esAlturaCompleta && (ab.tipo === "pase" || ab.tipo === "puerta")) {
      const cutStart = ab.distancia_desde_inicio_m;
      const cutEnd = cutStart + ab.ancho_m;
      const tempSegments: { start: number; end: number }[] = [];
      for (const seg of ceilSegments) {
        if (cutEnd <= seg.start + 1e-9 || cutStart >= seg.end - 1e-9) {
          tempSegments.push(seg);
          continue;
        }
        if (cutStart > seg.start + 1e-9) tempSegments.push({ start: seg.start, end: cutStart });
        if (cutEnd < seg.end - 1e-9) tempSegments.push({ start: cutEnd, end: seg.end });
      }
      ceilSegments.length = 0;
      ceilSegments.push(...tempSegments);
    }
  }

  for (const seg of ceilSegments) {
    const len = seg.end - seg.start;
    if (len > 1e-9) anclajesLosa += roundUpSafe(len / separacionAnclajes) + 1;
  }

  // Riel inferior (piso) — interrumpido por puertas y pases
  const floorSegments: { start: number; end: number }[] = [{ start: 0, end: muro.geometria.largo_m + deltaAngulo }];

  for (const ab of muro.aberturas) {
    if (ab.tipo === "puerta" || ab.tipo === "pase") {
      const cutStart = ab.distancia_desde_inicio_m;
      const cutEnd = cutStart + ab.ancho_m;
      const tempSegments: { start: number; end: number }[] = [];
      for (const seg of floorSegments) {
        if (cutEnd <= seg.start + 1e-9 || cutStart >= seg.end - 1e-9) {
          tempSegments.push(seg);
          continue;
        }
        if (cutStart > seg.start + 1e-9) tempSegments.push({ start: seg.start, end: cutStart });
        if (cutEnd < seg.end - 1e-9) tempSegments.push({ start: cutEnd, end: seg.end });
      }
      floorSegments.length = 0;
      floorSegments.push(...tempSegments);
    }
  }

  for (const seg of floorSegments) {
    const len = seg.end - seg.start;
    if (len > 1e-9) anclajesLosa += roundUpSafe(len / separacionAnclajes) + 1;
  }

  let anclajesLosaTotal = anclajesLosa;
  if (muro.sistema.estructura === "doble") {
    anclajesLosaTotal *= 2;
  }

  return {
    placa_perfil: placaPerfil,
    perfil_perfil: perfilPerfil,
    anclajes_losa: anclajesLosaTotal,
  };
}
