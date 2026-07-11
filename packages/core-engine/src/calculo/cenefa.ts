import {
  Catalogo,
  Cenefa,
  ResultadoCenefa,
  Corte1D,
  Retazo2D
} from "@drywall-calc/catalog-schemas";
import { roundUpSafe, roundFloat } from "../utils/redondeo.js";
import { calcularNesting1D } from "./nesting1D.js";
import { optimizarReutilizacionRetazos, DemandaPlaca } from "./nesting2D.js";

export function calcularCenefa(
  cenefa: Cenefa,
  catalogo: Catalogo,
  piscinaRetazos: Retazo2D[] = []
): ResultadoCenefa {
  const trazabilidad: string[] = [];
  const longitud = cenefa.geometria.longitud_m;
  const anchoCajon = cenefa.geometria.ancho_cajon_m;
  const altoCajon = cenefa.geometria.alto_cajon_m;
  const aletaLuz = cenefa.geometria.aleta_luz_m;

  trazabilidad.push(`Geometría: Cenefa tipo ${cenefa.tipo} de ${longitud.toFixed(2)}m de longitud. Cajón de ${anchoCajon.toFixed(2)}m de ancho x ${altoCajon.toFixed(2)}m de alto (pestaña aleta de luz: ${aletaLuz.toFixed(2)}m)`);

  // 1. Área de placa y despiece con Nesting 2D
  const largoPlaca = Math.max(cenefa.placa.formato_m[0], cenefa.placa.formato_m[1]);
  const demandasCenefa: DemandaPlaca[] = [];
  let remLong = longitud;
  let idxT = 1;

  while (remLong > 0) {
    const longitudTramo = remLong > largoPlaca ? largoPlaca : remLong;
    remLong -= longitudTramo;

    // Faja base horizontal
    demandasCenefa.push({
      id: `dem_cen_base_${cenefa.id}_${idxT}`,
      ancho_m: parseFloat(anchoCajon.toFixed(3)),
      alto_m: parseFloat(longitudTramo.toFixed(3)),
      placa_tipo: cenefa.placa.tipo,
      espesor_mm: cenefa.placa.espesor_mm,
      nombre_pieza: `Base Cenefa (Tramo ${idxT})`,
    });

    if (cenefa.tipo === "adosada") {
      demandasCenefa.push({
        id: `dem_cen_vert_${cenefa.id}_${idxT}`,
        ancho_m: parseFloat(altoCajon.toFixed(3)),
        alto_m: parseFloat(longitudTramo.toFixed(3)),
        placa_tipo: cenefa.placa.tipo,
        espesor_mm: cenefa.placa.espesor_mm,
        nombre_pieza: `Lateral Vertical (Tramo ${idxT})`,
      });
      if (aletaLuz > 0) {
        demandasCenefa.push({
          id: `dem_cen_aleta_${cenefa.id}_${idxT}`,
          ancho_m: parseFloat(aletaLuz.toFixed(3)),
          alto_m: parseFloat(longitudTramo.toFixed(3)),
          placa_tipo: cenefa.placa.tipo,
          espesor_mm: cenefa.placa.espesor_mm,
          nombre_pieza: `Aleta de Luz (Tramo ${idxT})`,
        });
      }
    } else {
      demandasCenefa.push({
        id: `dem_cen_vertA_${cenefa.id}_${idxT}`,
        ancho_m: parseFloat(altoCajon.toFixed(3)),
        alto_m: parseFloat(longitudTramo.toFixed(3)),
        placa_tipo: cenefa.placa.tipo,
        espesor_mm: cenefa.placa.espesor_mm,
        nombre_pieza: `Lateral Vertical A (Tramo ${idxT})`,
      });
      demandasCenefa.push({
        id: `dem_cen_vertB_${cenefa.id}_${idxT}`,
        ancho_m: parseFloat(altoCajon.toFixed(3)),
        alto_m: parseFloat(longitudTramo.toFixed(3)),
        placa_tipo: cenefa.placa.tipo,
        espesor_mm: cenefa.placa.espesor_mm,
        nombre_pieza: `Lateral Vertical B (Tramo ${idxT})`,
      });
      if (aletaLuz > 0) {
        demandasCenefa.push({
          id: `dem_cen_aletaA_${cenefa.id}_${idxT}`,
          ancho_m: parseFloat(aletaLuz.toFixed(3)),
          alto_m: parseFloat(longitudTramo.toFixed(3)),
          placa_tipo: cenefa.placa.tipo,
          espesor_mm: cenefa.placa.espesor_mm,
          nombre_pieza: `Aleta de Luz A (Tramo ${idxT})`,
        });
        demandasCenefa.push({
          id: `dem_cen_aletaB_${cenefa.id}_${idxT}`,
          ancho_m: parseFloat(aletaLuz.toFixed(3)),
          alto_m: parseFloat(longitudTramo.toFixed(3)),
          placa_tipo: cenefa.placa.tipo,
          espesor_mm: cenefa.placa.espesor_mm,
          nombre_pieza: `Aleta de Luz B (Tramo ${idxT})`,
        });
      }
    }
    idxT++;
  }

  // Ejecutamos la reutilización contra la piscina de retazos recibida del proyecto
  const resultadoReutilizacion = optimizarReutilizacionRetazos(demandasCenefa, piscinaRetazos);

  const areaPlacaFaltante = resultadoReutilizacion.demandasPendientes.reduce((acc, d) => acc + (d.ancho_m * d.alto_m), 0);
  const areaFormato = cenefa.placa.formato_m[0] * cenefa.placa.formato_m[1];
  const cantidadPlacas = roundUpSafe((areaPlacaFaltante * 1.10) / areaFormato);

  let areaPlacaNetaTotal = 0;
  if (cenefa.tipo === "adosada") {
    areaPlacaNetaTotal = longitud * (anchoCajon + altoCajon + aletaLuz);
  } else {
    areaPlacaNetaTotal = longitud * (anchoCajon + 2 * altoCajon + 2 * aletaLuz);
  }

  trazabilidad.push(`Placas (Nesting 2D): Se desglosaron ${demandasCenefa.length} fajas de placa. Se reutilizaron ${resultadoReutilizacion.demandasSatisfechas.length} retazos del proyecto (${(areaPlacaNetaTotal - areaPlacaFaltante).toFixed(2)}m² ahorrados). Consumo neto comercial de ${cantidadPlacas} placas.`);

  const placaConfig = catalogo.placas.find((p) => p.tipo === cenefa.placa.tipo && p.espesor_mm === cenefa.placa.espesor_mm);
  const pesoUnitarioPlaca = placaConfig ? placaConfig.peso_kg_m2 : 9.5;
  const placasPesoTotal = areaPlacaNetaTotal * pesoUnitarioPlaca;

  const retazosReutilizadosCenefa: Retazo2D[] = resultadoReutilizacion.demandasSatisfechas.map((sat) => {
    const retOriginal = piscinaRetazos.find((rg) => rg.id === sat.retazoUsadoId);
    return {
      id: sat.retazoUsadoId,
      ancho_m: sat.ancho_m,
      alto_m: sat.alto_m,
      placa_tipo: cenefa.placa.tipo,
      espesor_mm: cenefa.placa.espesor_mm,
      origen_elemento_id: retOriginal ? retOriginal.origen_elemento_id : cenefa.id,
    };
  });

  // 2. Búsqueda de Perfiles
  const buscarPerfil = (codigo: string) => {
    let perfil = catalogo.perfiles.omega?.find((p) => p.codigo === codigo) ||
                 catalogo.perfiles.angular?.find((p) => p.codigo === codigo) ||
                 catalogo.perfiles.montante.find((p) => p.codigo === codigo) ||
                 catalogo.perfiles.riel.find((p) => p.codigo === codigo);
    return perfil;
  };

  const perfilSec = buscarPerfil(cenefa.sistema.perfil_secundario);
  const perfilPer = buscarPerfil(cenefa.sistema.perfil_perimetral);

  const largoSec = perfilSec ? perfilSec.largo_barra_m : 3.00;
  const largoPer = perfilPer ? perfilPer.largo_barra_m : 3.00;

  // 3. Perfiles Metálicos con Nesting 1D
  const cortesPerimetrales: Corte1D[] = [];
  const cortesSecundarios: Corte1D[] = [];

  let anclajesLosa = 0;
  let anclajesPared = 0;

  // Auxiliar para subdividir longitudes lineales
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

  if (cenefa.tipo === "adosada") {
    // 1 en losa, 1 en pared
    subdividirEnCortes(longitud, largoPer, "per_lo", "Riel Perimetral Losa", cortesPerimetrales);
    subdividirEnCortes(longitud, largoPer, "per_pa", "Riel Perimetral Pared", cortesPerimetrales);
    anclajesLosa = roundUpSafe(longitud / 0.60);
    anclajesPared = roundUpSafe(longitud / 0.60);
  } else {
    // 2 en losa
    subdividirEnCortes(longitud, largoPer, "per_la", "Riel Perimetral Losa A", cortesPerimetrales);
    subdividirEnCortes(longitud, largoPer, "per_lb", "Riel Perimetral Losa B", cortesPerimetrales);
    anclajesLosa = 2 * roundUpSafe(longitud / 0.60);
  }

  const nestingPerimetrales = calcularNesting1D(cortesPerimetrales, largoPer);

  // Secundarios (montantes verticales de cuelgue y horizontales de base)
  const separacionSec = cenefa.sistema.separacion_secundario_m;
  const cuelgues = roundUpSafe(longitud / separacionSec) + 1;

  for (let i = 0; i < cuelgues; i++) {
    // Corte base horizontal
    cortesSecundarios.push({
      id: `sec_base_${i}`,
      longitud_m: anchoCajon,
      descripcion: `Base Pórtico #${i + 1}`,
    });

    if (cenefa.tipo === "adosada") {
      // 1 cuelgue vertical
      cortesSecundarios.push({
        id: `sec_cuelgue_${i}`,
        longitud_m: altoCajon,
        descripcion: `Cuelgue Pórtico #${i + 1}`,
      });
    } else {
      // 2 cuelgues verticales
      cortesSecundarios.push({
        id: `sec_cuelgueA_${i}`,
        longitud_m: altoCajon,
        descripcion: `Cuelgue Izq Pórtico #${i + 1}`,
      });
      cortesSecundarios.push({
        id: `sec_cuelgueB_${i}`,
        longitud_m: altoCajon,
        descripcion: `Cuelgue Der Pórtico #${i + 1}`,
      });
    }
  }

  const nestingSecundarios = calcularNesting1D(cortesSecundarios, largoSec);

  trazabilidad.push(`Perimetrales (Nesting): Se optimizaron ${cortesPerimetrales.length} cortes en ${nestingPerimetrales.cantidad_barras} barras perimetrales (${nestingPerimetrales.desperdicio_pct}% merma)`);
  trazabilidad.push(`Secundarios (Nesting): Se optimizaron ${cortesSecundarios.length} cortes en ${nestingSecundarios.cantidad_barras} barras secundarias (${nestingSecundarios.desperdicio_pct}% merma)`);

  // 4. Tornillería
  const claveEspesor = `${cenefa.placa.espesor_mm}mm`;
  const densidadTornillosPlaca = catalogo.tornillos.placa_perfil_por_m2[claveEspesor] || 25;
  const tornillosPlacaPerfil = roundUpSafe(areaPlacaNetaTotal * densidadTornillosPlaca);

  let tornillosPerfilPerfil = 0;
  if (cenefa.tipo === "adosada") {
    tornillosPerfilPerfil = cuelgues * 2; // 2 wafer por pórtico
  } else {
    tornillosPerfilPerfil = cuelgues * 4; // 4 wafer por pórtico
  }

  trazabilidad.push(`Tornillería: Placa-Perfil requiere ${tornillosPlacaPerfil} tornillos. Perfil-Perfil (wafer) requiere ${tornillosPerfilPerfil} tornillos`);

  // 5. Cantoneras/Esquineros
  let longEsquineros = 0;
  if (cenefa.tipo === "adosada") {
    longEsquineros = longitud * (aletaLuz > 0 ? 2 : 1);
  } else {
    longEsquineros = longitud * (aletaLuz > 0 ? 4 : 2);
  }
  trazabilidad.push(`Cantoneras: Requiere ${longEsquineros.toFixed(2)}ml de esquinero metálico/plástico`);

  // 6. Cinta y Masilla
  let longJuntas = 0;
  if (cenefa.tipo === "adosada") {
    longJuntas = longitud * (2 + (aletaLuz > 0 ? 1 : 0));
  } else {
    longJuntas = longitud * (3 + (aletaLuz > 0 ? 2 : 0));
  }
  const longJuntasTotal = longJuntas * 1.10;

  const rollosCinta = roundUpSafe((longJuntasTotal * catalogo.cinta.factor_traslape) / catalogo.cinta.rendimiento_ml_por_rollo);
  const masillaKg = longJuntasTotal * catalogo.masilla.kg_por_ml_por_mano * catalogo.masilla.manos_estandar;
  const bolsasMasilla = roundUpSafe(masillaKg / catalogo.masilla.presentacion_kg_por_bolsa);

  trazabilidad.push(`Acabados: Juntas lineales estimadas en ${longJuntasTotal.toFixed(2)}ml (incluyendo 10% transversal). Requiere ${rollosCinta} rollos de cinta y ${masillaKg.toFixed(2)}kg de masilla (${bolsasMasilla} bolsas)`);

  return {
    cenefa_id: cenefa.id,
    placas: {
      cantidad_total: cantidadPlacas,
      peso_total_kg: roundFloat(placasPesoTotal)
    },
    perfiles: {
      secundarios_barras: nestingSecundarios.cantidad_barras,
      perimetrales_barras: nestingPerimetrales.cantidad_barras
    },
    tornillos: {
      placa_perfil: tornillosPlacaPerfil,
      perfil_perfil: tornillosPerfilPerfil,
      anclajes_losa: anclajesLosa,
      anclajes_pared: anclajesPared
    },
    cinta: {
      ml_total: roundFloat(longJuntasTotal),
      rollos: rollosCinta
    },
    masilla: {
      kg_total: roundFloat(masillaKg),
      bolsas: bolsasMasilla
    },
    esquineros: {
      ml_total: roundFloat(longEsquineros)
    },
    trazabilidad,
    nesting_secundarios: nestingSecundarios,
    nesting_perimetrales: nestingPerimetrales,
    retazos_reutilizados: retazosReutilizadosCenefa
  };
}
