import {
  Catalogo,
  Cielorraso,
  ResultadoCielorraso,
  PlacaRect,
  JuntaSegmento,
  Corte1D
} from "@drywall-calc/catalog-schemas";
import { roundUpSafe, roundFloat } from "../utils/redondeo.js";
import { generarGrillaPlacas } from "../nesting/generarGrillaPlacas.js";
import { extraerJuntas } from "../nesting/extraerJuntas.js";
import { calcularCintaMasilla } from "./cintaMasilla.js";
import { calcularAislante } from "./aislante.js";
import { calcularNesting1D } from "./nesting1D.js";

export function calcularCielorraso(
  cielorraso: Cielorraso,
  catalogo: Catalogo
): ResultadoCielorraso {
  const trazabilidad: string[] = [];
  const largo = cielorraso.geometria.largo_m;
  const ancho = cielorraso.geometria.ancho_m;
  const areaNeta = largo * ancho;

  trazabilidad.push(`Geometría: Planta de cielorraso de ${largo.toFixed(2)}m x ${ancho.toFixed(2)}m (Área neta: ${areaNeta.toFixed(2)}m²)`);

  // 1. Cálculo de placas usando nesting 2D simplificado (generarGrillaPlacas)
  // Se simula como una sola cara ("A") y una capa (1) con dimensiones largo y ancho (como alto del muro)
  const placasDetalle = generarGrillaPlacas({
    largo_m: largo,
    alto_m: ancho,
    formato_m: cielorraso.placa.formato_m,
    orientacion: cielorraso.placa.orientacion,
    cara: "A",
    capa: 1
  });

  const cantidadPlacasNesting = placasDetalle.length;
  trazabilidad.push(`Placas (Nesting): Se calcularon ${cantidadPlacasNesting} placas de formato ${cielorraso.placa.formato_m[0]}m x ${cielorraso.placa.formato_m[1]}m orientadas ${cielorraso.placa.orientacion}`);

  // Calcular peso total de placas en base al área instalada y peso unitario del catálogo
  const placaConfig = catalogo.placas.find((p) => p.tipo === cielorraso.placa.tipo && p.espesor_mm === cielorraso.placa.espesor_mm);
  const pesoUnitarioPlaca = placaConfig ? placaConfig.peso_kg_m2 : 9.5;
  const placasPesoTotal = areaNeta * pesoUnitarioPlaca;
  trazabilidad.push(`Peso de Placas: ${areaNeta.toFixed(2)}m² x ${pesoUnitarioPlaca.toFixed(2)}kg/m² = ${placasPesoTotal.toFixed(2)}kg`);

  // 2. Cálculo de Juntas (Cinta y Masilla)
  const juntas = extraerJuntas(placasDetalle, []);
  const juntasTotalMl = juntas.reduce((sum, j) => sum + j.longitud, 0);
  trazabilidad.push(`Juntas: Extracción de juntas dio como resultado ${juntasTotalMl.toFixed(2)}ml de longitud de junta total`);

  const resCintaMasilla = calcularCintaMasilla(juntas, catalogo);
  trazabilidad.push(`Cinta: Requiere ${resCintaMasilla.cinta.ml_total.toFixed(2)}ml (${resCintaMasilla.cinta.rollos} rollos de ${catalogo.cinta.rendimiento_ml_por_rollo}m)`);
  trazabilidad.push(`Masilla: Requiere ${resCintaMasilla.masilla.kg_total.toFixed(2)}kg (${resCintaMasilla.masilla.bolsas} bolsas de ${catalogo.masilla.presentacion_kg_por_bolsa}kg)`);

  // 3. Búsqueda de Perfiles en el Catálogo
  // Fallbacks a perfiles de montantes y rieles comunes si no existen omega o angular en el catálogo
  const buscarPerfil = (codigo: string) => {
    let perfil = catalogo.perfiles.omega?.find((p) => p.codigo === codigo) ||
                 catalogo.perfiles.angular?.find((p) => p.codigo === codigo) ||
                 catalogo.perfiles.montante.find((p) => p.codigo === codigo) ||
                 catalogo.perfiles.riel.find((p) => p.codigo === codigo);
    return perfil;
  };

  const perfilSec = buscarPerfil(cielorraso.sistema.perfil_secundario);
  const perfilPri = cielorraso.sistema.perfil_principal ? buscarPerfil(cielorraso.sistema.perfil_principal) : undefined;
  const perfilPer = buscarPerfil(cielorraso.sistema.perfil_perimetral);

  const largoSec = perfilSec ? perfilSec.largo_barra_m : 3.00;
  const largoPri = perfilPri ? perfilPri.largo_barra_m : 3.00;
  const largoPer = perfilPer ? perfilPer.largo_barra_m : 3.00;

  // 4. Cálculo de Perfiles Metálicos con Nesting 1D
  const cortesPerimetrales: Corte1D[] = [];
  const cortesSecundarios: Corte1D[] = [];
  const cortesPrincipales: Corte1D[] = [];

  const perimetro = 2 * (largo + ancho);

  // Auxiliar para subdividir longitudes lineales mayores que la barra comercial
  const subdividirEnCortes = (
    longitudTotal: number,
    largoMaxBarra: number,
    prefijoId: string,
    descripcion: string,
    acumulador: Corte1D[]
  ) => {
    let rem = longitudTotal;
    let idx = 1;
    while (rem > largoMaxBarra) {
      acumulador.push({
        id: `${prefijoId}_${idx}`,
        longitud_m: largoMaxBarra,
        descripcion: `${descripcion} (Barra ${idx})`,
      });
      rem -= largoMaxBarra;
      idx++;
    }
    if (rem > 0.01) {
      acumulador.push({
        id: `${prefijoId}_${idx}`,
        longitud_m: parseFloat(rem.toFixed(3)),
        descripcion: `${descripcion} (Tramo)`,
      });
    }
  };

  // A. Angulares Perimetrales (Cortes lado por lado)
  subdividirEnCortes(largo, largoPer, "per_la", "Angular Perimetral (Largo A)", cortesPerimetrales);
  subdividirEnCortes(largo, largoPer, "per_lb", "Angular Perimetral (Largo B)", cortesPerimetrales);
  subdividirEnCortes(ancho, largoPer, "per_aa", "Angular Perimetral (Ancho A)", cortesPerimetrales);
  subdividirEnCortes(ancho, largoPer, "per_ab", "Angular Perimetral (Ancho B)", cortesPerimetrales);

  const nestingPerimetrales = calcularNesting1D(cortesPerimetrales, largoPer);

  // B. Secundarios
  const separacionSec = cielorraso.sistema.separacion_secundario_m;
  const lineasSecundarias = roundUpSafe(largo / separacionSec) + 1;
  for (let i = 0; i < lineasSecundarias; i++) {
    subdividirEnCortes(ancho, largoSec, `sec_l${i}`, `Perfil Secundario (Fila ${i + 1})`, cortesSecundarios);
  }

  const nestingSecundarios = calcularNesting1D(cortesSecundarios, largoSec);

  // C. Principales
  let lineasPrincipales = 0;
  let nestingPrincipales = undefined;

  if (cielorraso.sistema.tipo_estructura === "suspendido") {
    const separacionPri = cielorraso.sistema.separacion_principal_m || 1.00;
    lineasPrincipales = roundUpSafe(ancho / separacionPri) + 1;
    for (let i = 0; i < lineasPrincipales; i++) {
      subdividirEnCortes(largo, largoPri, `pri_l${i}`, `Perfil Principal (Fila ${i + 1})`, cortesPrincipales);
    }
    nestingPrincipales = calcularNesting1D(cortesPrincipales, largoPri);
  }

  trazabilidad.push(`Perimetrales (Nesting): Se optimizaron ${cortesPerimetrales.length} cortes en ${nestingPerimetrales.cantidad_barras} barras de angular (${nestingPerimetrales.desperdicio_pct}% merma)`);
  trazabilidad.push(`Secundarios (Nesting): Se optimizaron ${cortesSecundarios.length} cortes en ${nestingSecundarios.cantidad_barras} barras omega/montante (${nestingSecundarios.desperdicio_pct}% merma)`);
  if (nestingPrincipales) {
    trazabilidad.push(`Principales (Nesting): Se optimizaron ${cortesPrincipales.length} cortes en ${nestingPrincipales.cantidad_barras} barras principales (${nestingPrincipales.desperdicio_pct}% merma)`);
  }

  // 5. Cálculo de Suspensión (Colgadores)
  let colgadoresTotal = 0;
  let alambreMlTotal = 0;
  if (cielorraso.sistema.tipo_estructura === "suspendido") {
    const distCuelgue = cielorraso.sistema.distancia_cuelgue_m || 1.20;
    const puntosCuelguePorLinea = roundUpSafe(largo / distCuelgue) + 1;
    colgadoresTotal = lineasPrincipales * puntosCuelguePorLinea;
    alambreMlTotal = colgadoresTotal * cielorraso.sistema.altura_suspension_m;
    trazabilidad.push(`Suspensión: ${puntosCuelguePorLinea} puntos de cuelgue por cada una de las ${lineasPrincipales} líneas principales (espaciados cada ${distCuelgue.toFixed(2)}m). Total colgadores: ${colgadoresTotal}. Alambre requerido: ${alambreMlTotal.toFixed(2)}ml (altura de suspensión: ${cielorraso.sistema.altura_suspension_m.toFixed(2)}m)`);
  } else {
    trazabilidad.push(`Suspensión: 0 colgadores (Estructura directa fijada directamente a losa)`);
  }

  // 6. Cálculo de Tornillería
  // Tornillos Placa-Perfil
  const claveEspesor = `${cielorraso.placa.espesor_mm}mm`;
  const densidadTornillosPlaca = catalogo.tornillos.placa_perfil_por_m2[claveEspesor] || 25;
  const tornillosPlacaPerfil = roundUpSafe(areaNeta * densidadTornillosPlaca);
  trazabilidad.push(`Tornillos Placa-Perfil: ${areaNeta.toFixed(2)}m² x ${densidadTornillosPlaca} tornillos/m² = ${tornillosPlacaPerfil} unidades`);

  // Tornillos Perfil-Perfil (Metal-Metal Wafer)
  let tornillosPerfilPerfil = 0;
  if (cielorraso.sistema.tipo_estructura === "suspendido") {
    const intersecciones = lineasPrincipales * lineasSecundarias;
    const tornillosPorCruze = catalogo.tornillos.perfil_perfil_por_union || 2;
    const tornillosCruces = intersecciones * tornillosPorCruze;
    const tornillosExtremos = lineasSecundarias * 2 * 1;
    tornillosPerfilPerfil = tornillosCruces + tornillosExtremos;
    trazabilidad.push(`Tornillos Perfil-Perfil: ${intersecciones} cruces principal-secundario x ${tornillosPorCruze} tornillos = ${tornillosCruces}. Extremos a angular perimetral: ${tornillosExtremos}. Total: ${tornillosPerfilPerfil} unidades`);
  } else {
    const tornillosExtremos = lineasSecundarias * 2 * 1;
    tornillosPerfilPerfil = tornillosExtremos;
    trazabilidad.push(`Tornillos Perfil-Perfil: Extremos de perfil secundario a angular perimetral requiere ${tornillosPerfilPerfil} unidades`);
  }

  // Anclajes a Losa
  let anclajesLosa = 0;
  if (cielorraso.sistema.tipo_estructura === "suspendido") {
    anclajesLosa = colgadoresTotal;
    trazabilidad.push(`Anclajes Losa: 1 anclaje expansivo/clavo de impacto por colgador = ${anclajesLosa} unidades`);
  } else {
    const longTotalSec = lineasSecundarias * ancho;
    const separacionAnclaje = catalogo.tornillos.anclaje_losa_separacion_m || 0.50;
    anclajesLosa = roundUpSafe(longTotalSec / separacionAnclaje);
    trazabilidad.push(`Anclajes Losa (Sistema Directo): ${longTotalSec.toFixed(2)}ml totales de omega / ${separacionAnclaje.toFixed(2)}m de separación = ${anclajesLosa} unidades`);
  }

  // Anclajes a Pared (Fijación de angular perimetral)
  const anclajesPared = roundUpSafe(perimetro / 0.60);
  trazabilidad.push(`Anclajes Pared: Fijación de angular perimetral cada 0.60m = ${anclajesPared} unidades`);

  // 7. Cálculo de Aislante
  let aislanteM2 = 0;
  let aislantePaquetes = 0;
  if (cielorraso.aislante) {
    const resAislante = calcularAislante(areaNeta, catalogo);
    aislanteM2 = resAislante.m2;
    aislantePaquetes = resAislante.paquetes;
    trazabilidad.push(`Aislante: Lana/Fibra requiere ${aislanteM2.toFixed(2)}m² (${aislantePaquetes} paquetes de ${catalogo.aislante.presentacion_m2_por_paquete}m²)`);
  } else {
    trazabilidad.push(`Aislante: No requiere (sin especificación de aislamiento en cielorraso)`);
  }

  return {
    cielorraso_id: cielorraso.id,
    placas: {
      cantidad_total: cantidadPlacasNesting,
      peso_total_kg: roundFloat(placasPesoTotal),
      detalle: placasDetalle
    },
    perfiles: {
      secundarios_barras: nestingSecundarios.cantidad_barras,
      principales_barras: nestingPrincipales ? nestingPrincipales.cantidad_barras : 0,
      perimetrales_barras: nestingPerimetrales.cantidad_barras
    },
    colgadores: {
      cantidad_total: colgadoresTotal,
      alambre_ml: roundFloat(alambreMlTotal)
    },
    tornillos: {
      placa_perfil: tornillosPlacaPerfil,
      perfil_perfil: tornillosPerfilPerfil,
      anclajes_losa: anclajesLosa,
      anclajes_pared: anclajesPared
    },
    cinta: {
      ml_total: roundFloat(resCintaMasilla.cinta.ml_total),
      rollos: resCintaMasilla.cinta.rollos
    },
    masilla: {
      kg_total: roundFloat(resCintaMasilla.masilla.kg_total),
      bolsas: resCintaMasilla.masilla.bolsas
    },
    aislante: {
      m2: roundFloat(aislanteM2),
      paquetes: aislantePaquetes
    },
    trazabilidad,
    nesting_secundarios: nestingSecundarios,
    nesting_principales: nestingPrincipales,
    nesting_perimetrales: nestingPerimetrales
  };
}
