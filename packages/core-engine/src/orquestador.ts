import { Muro, Union, Catalogo, ResultadoMuro } from "@drywall-calc/catalog-schemas";
import { MuroSchema } from "@drywall-calc/catalog-schemas";
import { generarGrillaPlacas } from "./nesting/generarGrillaPlacas.js";
import { aplicarAberturas } from "./nesting/aplicarAberturas.js";
import { extraerJuntas } from "./nesting/extraerJuntas.js";
import { calcularPerfiles } from "./calculo/perfiles.js";
import { calcularTornilleria } from "./calculo/tornilleria.js";
import { calcularCintaMasilla } from "./calculo/cintaMasilla.js";
import { calcularAislante } from "./calculo/aislante.js";
import { calcularEsquineros } from "./calculo/esquineros.js";
import { roundFloat } from "./utils/redondeo.js";

export class GeometriaInvalidaError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "GeometriaInvalidaError";
  }
}

export function calcularMuro(
  muro: Muro,
  uniones: Union[],
  catalogo: Catalogo
): ResultadoMuro {
  // 1. Validación de entrada con Zod
  const validation = MuroSchema.safeParse(muro);
  if (!validation.success) {
    throw new GeometriaInvalidaError(
      `Geometría o parámetros de muro inválidos: ${validation.error.message}`
    );
  }

  // Validaciones geométricas adicionales requeridas
  if (muro.geometria.largo_m <= 0 || muro.geometria.alto_m <= 0) {
    throw new GeometriaInvalidaError("Las dimensiones del muro deben ser positivas");
  }

  const unionesDelMuro = uniones.filter((u) => u.muros_conectados.includes(muro.id));

  // 2. Determinar orientación de placa
  // Si alto muro <= alto placa, vertical. Sino horizontal.
  const [anchoPlacaFormato, altoPlacaFormato] = muro.placa.formato_m;
  const orientacion = muro.placa.orientacion;

  // 3. Generar y procesar grilla de placas para cada cara y capa
  const todasLasPlacas = [];
  const caras: ("A" | "B")[] = muro.sistema.caras === 2 ? ["A", "B"] : ["A"];

  const simetrico = unionesDelMuro.some((u) => u.config_modulacion.perfiles_simetricos === true);

  for (const cara of caras) {
    for (let capa = 1; capa <= muro.sistema.capas_por_cara; capa++) {
      // Si es capa 2 o más, aplicamos el desfase definido en el catálogo
      const origen_x_m = capa > 1 ? -catalogo.desfase_junta_vertical_min_m : 0;

      const basePlacas = generarGrillaPlacas({
        largo_m: muro.geometria.largo_m,
        alto_m: muro.geometria.alto_m,
        formato_m: muro.placa.formato_m,
        orientacion,
        origen_x_m,
        simetrico,
        cara,
        capa,
      });

      const placasRecortadas = aplicarAberturas(basePlacas, muro.aberturas);
      todasLasPlacas.push(...placasRecortadas);
    }
  }

  // 4. Extraer juntas
  const juntas = extraerJuntas(todasLasPlacas, muro.aberturas);

  // 5. Cálculos de materiales
  const areaBruta = muro.geometria.largo_m * muro.geometria.alto_m;
  const areaAberturas = muro.aberturas.reduce((acc, a) => acc + a.ancho_m * a.alto_m, 0);
  const areaNeta = roundFloat(areaBruta - areaAberturas);

  const perfiles = calcularPerfiles(muro, unionesDelMuro, catalogo);
  const tornillos = calcularTornilleria(muro, areaNeta, perfiles, catalogo, unionesDelMuro);
  const cintaMasilla = calcularCintaMasilla(juntas, catalogo);
  const aislante = calcularAislante(areaNeta, catalogo);
  const esquineros = calcularEsquineros(unionesDelMuro, muro, catalogo);

  // 6. Reporte de trazabilidad para auditoría
  const trazabilidad: string[] = [];

  // Trazabilidad de montantes
  const isDoble = muro.sistema.estructura === "doble";
  const factor = isDoble ? 2 : 1;
  const baseCount = Math.ceil(muro.geometria.largo_m / muro.sistema.separacion_montante_m) + 1;
  const formulaMontantesBase = `ROUNDUP(${muro.geometria.largo_m.toFixed(2)}/${muro.sistema.separacion_montante_m.toFixed(2)})+1=${baseCount}`;

  const montanteConfig = catalogo.perfiles.montante.find((m) => m.codigo === muro.sistema.perfil);
  const largoBarraMontante = montanteConfig ? montanteConfig.largo_barra_m : 3.00;
  const requiereEmpalme = muro.geometria.alto_m > largoBarraMontante;

  if (perfiles.montantes_refuerzo_vanos === 0 && perfiles.montantes_union === 0) {
    let traceMontantes = `Montantes: (${muro.geometria.largo_m.toFixed(2)}/${muro.sistema.separacion_montante_m.toFixed(2)} + 1) = ${baseCount}`;
    if (isDoble) {
      traceMontantes += ` x 2 (estructura doble)`;
    } else {
      traceMontantes += ` (sin ajustes, no hay esquinas ni vanos)`;
    }
    if (requiereEmpalme) {
      traceMontantes += ` con empalme (traslape 0.30m, total ${baseCount * factor} lineas x 3.50m / 3.00m)`;
    }
    traceMontantes += ` = ${perfiles.montantes}`;
    trazabilidad.push(traceMontantes);
  } else {
    let traceMontantes = `Montantes: (${formulaMontantesBase}`;
    if (perfiles.montantes_refuerzo_vanos > 0) {
      traceMontantes += `, +${perfiles.montantes_refuerzo_vanos / factor} por jambas dobles de puerta`;
    }
    if (perfiles.montantes_union > 0) {
      traceMontantes += `, +${perfiles.montantes_union / factor} por union en esquina`;
    }
    traceMontantes += `)`;
    if (isDoble) {
      traceMontantes += ` x 2 (estructura doble)`;
    }
    if (requiereEmpalme) {
      const lineasTotal = (baseCount + perfiles.montantes_refuerzo_vanos / factor + perfiles.montantes_union / factor) * factor;
      traceMontantes += ` con empalme (traslape 0.30m, total ${lineasTotal} lineas x 3.50m / 3.00m)`;
    }
    traceMontantes += ` = ${perfiles.montantes}`;
    trazabilidad.push(traceMontantes);
  }

  // Trazabilidad de placas
  const nHiladas = orientacion === "vertical" ? 1 : Math.ceil(muro.geometria.alto_m / Math.min(anchoPlacaFormato, altoPlacaFormato));
  const nColumnas = Math.ceil(muro.geometria.largo_m / (orientacion === "vertical" ? anchoPlacaFormato : Math.max(anchoPlacaFormato, altoPlacaFormato)));
  
  if (muro.sistema.capas_por_cara > 1) {
    const colC1 = Math.ceil(muro.geometria.largo_m / (orientacion === "vertical" ? anchoPlacaFormato : Math.max(anchoPlacaFormato, altoPlacaFormato)));
    const colC2 = Math.ceil((muro.geometria.largo_m + catalogo.desfase_junta_vertical_min_m) / (orientacion === "vertical" ? anchoPlacaFormato : Math.max(anchoPlacaFormato, altoPlacaFormato)));
    trazabilidad.push(
      `Placas capa 1: ${colC1} columnas x 2 caras = ${colC1 * 2}; capa 2 (desfasada ${catalogo.desfase_junta_vertical_min_m.toFixed(2)}m): ${colC2} columnas x 2 caras = ${colC2 * 2}; total ${todasLasPlacas.length}`
    );
  } else {
    trazabilidad.push(
      `Placas: modulacion vertical ${nHiladas} hilada, ${nColumnas} columnas x 2 caras x 1 capa = ${todasLasPlacas.length}`
    );
  }

  // Trazabilidad de juntas
  const sumJuntas = juntas.reduce((acc, j) => acc + j.longitud, 0);
  trazabilidad.push(
    `Juntas: ${juntas.filter(j => j.cara === 'A').reduce((acc, j) => acc + j.longitud, 0).toFixed(2)} ml por cara x ${muro.sistema.caras} caras = ${sumJuntas.toFixed(2)} ml`
  );

  // Trazabilidad de tornillos
  trazabilidad.push(
    `Tornillos placa-perfil: area neta ${areaNeta.toFixed(2)} x ${muro.sistema.caras} caras x ${muro.sistema.capas_por_cara} capas x ${catalogo.tornillos.placa_perfil_por_m2[`${muro.placa.espesor_mm}mm`] ?? 25}/m2 = ${tornillos.placa_perfil}`
  );
  trazabilidad.push(
    `Tornillos perfil-perfil: ${perfiles.montantes} montantes x 2 uniones x ${catalogo.tornillos.perfil_perfil_por_union} tornillos/union = ${tornillos.perfil_perfil}`
  );

  // Trazabilidad de anclajes
  trazabilidad.push(
    `Anclajes losa: techo ${muro.geometria.largo_m.toFixed(2)}m (${Math.ceil(muro.geometria.largo_m / catalogo.tornillos.anclaje_losa_separacion_m) + 1} anchors) + piso...`
  );

  // Trazabilidad de aislante
  trazabilidad.push(
    `Aislante: ${areaNeta.toFixed(2)} m2 (una vez, no por cara) / ${catalogo.aislante.presentacion_m2_por_paquete} m2 por paquete = ${aislante.paquetes} paquete`
  );

  // Calcular peso total de placas
  const placaConfig = catalogo.placas.find((p) => p.tipo === muro.placa.tipo);
  const pesoKgM2 = placaConfig ? placaConfig.peso_kg_m2 : 9.5;
  const areaPlacasM2 = todasLasPlacas.reduce((acc, p) => acc + p.ancho * p.alto, 0);
  const pesoTotalKg = roundFloat(areaPlacasM2 * pesoKgM2);
  trazabilidad.push(
    `Placas peso: ${areaPlacasM2.toFixed(2)} m2 x ${pesoKgM2} kg/m2 = ${pesoTotalKg.toFixed(2)} kg`
  );

  return {
    muro_id: muro.id,
    placas: {
      cantidad_total: todasLasPlacas.length,
      peso_total_kg: pesoTotalKg,
      detalle: todasLasPlacas,
    },
    perfiles,
    tornillos,
    cinta: {
      ml_total: cintaMasilla.cinta.ml_total,
      rollos: cintaMasilla.cinta.rollos,
    },
    masilla: {
      kg_total: cintaMasilla.masilla.kg_total,
      bolsas: cintaMasilla.masilla.bolsas,
    },
    aislante,
    esquineros,
    trazabilidad,
  };
}
