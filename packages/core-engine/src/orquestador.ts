import { Muro, Union, Catalogo, ResultadoMuro, PlacaRect, Retazo2D } from "@drywall-calc/catalog-schemas";
import { MuroSchema } from "@drywall-calc/catalog-schemas";
import { generarGrillaPlacas } from "./nesting/generarGrillaPlacas.js";
import { aplicarAberturas } from "./nesting/aplicarAberturas.js";
import { extraerJuntas } from "./nesting/extraerJuntas.js";
import { aplicarCortesL, extraerRetazosDeAberturas, optimizarReutilizacionRetazos, DemandaPlaca } from "./calculo/nesting2D.js";
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
  const [anchoPlacaFormato, altoPlacaFormato] = muro.placa.formato_m;
  const orientacion = muro.placa.orientacion;

  // 3. Generar y procesar grilla de placas para cada cara y capa
  let todasLasPlacas: PlacaRect[] = [];
  const caras: ("A" | "B")[] = muro.sistema.caras === 2 ? ["A", "B"] : ["A"];

  const simetrico = unionesDelMuro.some((u) => u.config_modulacion.perfiles_simetricos === true);
  const unionNoOrtogonal = unionesDelMuro.find((u) => u.angulo_grados !== 90 && u.angulo_grados > 0);
  const anguloEsquina = unionNoOrtogonal ? unionNoOrtogonal.angulo_grados : undefined;

  let retazosGenerados: Retazo2D[] = [];

  for (const cara of caras) {
    for (let capa = 1; capa <= muro.sistema.capas_por_cara; capa++) {
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
        anguloEsquina,
      });

      const placasRecortadas = aplicarAberturas(basePlacas, muro.aberturas);
      // Aplicar cortes en L para evitar juntas frías en esquinas superiores
      const placasConCortesL = aplicarCortesL(placasRecortadas, muro.aberturas, muro.geometria.largo_m);
      todasLasPlacas.push(...placasConCortesL);

      // Extraer retazos a partir de los recortes de aberturas
      const retCaras = extraerRetazosDeAberturas(basePlacas, muro.aberturas, muro.placa.tipo, muro.placa.espesor_mm, muro.id);
      retazosGenerados.push(...retCaras);
    }
  }

  // 4. Extraer juntas
  const juntas = extraerJuntas(todasLasPlacas, muro.aberturas);

  // 4B. Agregar juntas y desglosar demandas de placas de hornacinas
  let areaPlacasNicho = 0;
  const demandasHornacina: DemandaPlaca[] = [];
  let hornacinaIdCounter = 1;

  for (const ab of muro.aberturas) {
    if (ab.tipo === "hornacina") {
      const prof = ab.profundidad_m || 0.10;
      
      // Juntas longitudinales y de fondo
      for (let i = 0; i < 4; i++) {
        juntas.push({
          orientacion: "horizontal",
          coordenada_fija: 0,
          inicio: 0,
          fin: prof,
          longitud: prof,
          cara: "A",
          capa: 1
        });
      }
      for (let i = 0; i < 2; i++) {
        juntas.push({
          orientacion: "horizontal",
          coordenada_fija: 0,
          inicio: 0,
          fin: ab.ancho_m,
          longitud: ab.ancho_m,
          cara: "A",
          capa: 1
        });
        juntas.push({
          orientacion: "vertical",
          coordenada_fija: 0,
          inicio: 0,
          fin: ab.alto_m,
          longitud: ab.alto_m,
          cara: "A",
          capa: 1
        });
      }

      // Revestimiento interno (área: 2*H*D + 2*W*D + W*H)
      areaPlacasNicho += (2 * ab.alto_m * prof) + (2 * ab.ancho_m * prof) + (ab.ancho_m * ab.alto_m);

      // Desglose de piezas para nesting 2D
      demandasHornacina.push({
        id: `dem_nicho_fondo_${hornacinaIdCounter}`,
        ancho_m: ab.ancho_m,
        alto_m: ab.alto_m,
        placa_tipo: muro.placa.tipo,
        espesor_mm: muro.placa.espesor_mm,
        nombre_pieza: `Fondo de Hornacina #${hornacinaIdCounter}`,
      });
      demandasHornacina.push({
        id: `dem_nicho_base_${hornacinaIdCounter}`,
        ancho_m: ab.ancho_m,
        alto_m: prof,
        placa_tipo: muro.placa.tipo,
        espesor_mm: muro.placa.espesor_mm,
        nombre_pieza: `Base Horiz Hornacina #${hornacinaIdCounter}`,
      });
      demandasHornacina.push({
        id: `dem_nicho_dintel_${hornacinaIdCounter}`,
        ancho_m: ab.ancho_m,
        alto_m: prof,
        placa_tipo: muro.placa.tipo,
        espesor_mm: muro.placa.espesor_mm,
        nombre_pieza: `Techo Horiz Hornacina #${hornacinaIdCounter}`,
      });
      demandasHornacina.push({
        id: `dem_nicho_lat1_${hornacinaIdCounter}`,
        ancho_m: ab.alto_m,
        alto_m: prof,
        placa_tipo: muro.placa.tipo,
        espesor_mm: muro.placa.espesor_mm,
        nombre_pieza: `Lateral Izq Hornacina #${hornacinaIdCounter}`,
      });
      demandasHornacina.push({
        id: `dem_nicho_lat2_${hornacinaIdCounter}`,
        ancho_m: ab.alto_m,
        alto_m: prof,
        placa_tipo: muro.placa.tipo,
        espesor_mm: muro.placa.espesor_mm,
        nombre_pieza: `Lateral Der Hornacina #${hornacinaIdCounter}`,
      });

      hornacinaIdCounter++;
    }
  }

  // Ejecutamos la reutilización local de retazos para las hornacinas de este muro
  const resultadoReutilizacion = optimizarReutilizacionRetazos(demandasHornacina, retazosGenerados);

  // Las demandas de hornacina que NO pudieron satisfacerse con retazos consumen placa comercial nueva
  const areaPendienteM2 = resultadoReutilizacion.demandasPendientes.reduce((acc, d) => acc + (d.ancho_m * d.alto_m), 0);
  const placasNichoAdicionales = Math.ceil((areaPendienteM2 * 1.10) / (anchoPlacaFormato * altoPlacaFormato));

  // Actualizamos la lista de retazos disponibles (restantes) de este muro
  const retazosRestantesMuro = resultadoReutilizacion.retazosRestantes;

  // Marcamos las placas que se revistieron con retazos
  resultadoReutilizacion.demandasSatisfechas.forEach((sat) => {
    // Para dibujarlas en el visualizador, las podemos inyectar como sub-placas del detalle
    todasLasPlacas.push({
      id: sat.demandaId,
      x: 0, // Posición simbólica o no crítica para hornacina interna
      y: 0,
      ancho: sat.ancho_m,
      alto: sat.alto_m,
      cara: "A",
      capa: 1,
      recortada: true,
      esRetazoReutilizado: true,
      retazoOrigenId: sat.retazoUsadoId
    });
  });

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
  const pesoTotalKg = roundFloat((areaPlacasM2 + areaPlacasNicho) * pesoKgM2);
  trazabilidad.push(
    `Placas peso: (${areaPlacasM2.toFixed(2)} m2 base + ${areaPlacasNicho.toFixed(2)} m2 hornacina) x ${pesoKgM2} kg/m2 = ${pesoTotalKg.toFixed(2)} kg`
  );

  const retazosReutilizadosMuro: Retazo2D[] = resultadoReutilizacion.demandasSatisfechas.map((sat) => {
    const retOriginal = retazosGenerados.find((rg) => rg.id === sat.retazoUsadoId);
    return {
      id: sat.retazoUsadoId,
      ancho_m: sat.ancho_m,
      alto_m: sat.alto_m,
      placa_tipo: muro.placa.tipo,
      espesor_mm: muro.placa.espesor_mm,
      origen_elemento_id: retOriginal ? retOriginal.origen_elemento_id : muro.id
    };
  });

  trazabilidad.push(
    `Placas (Nesting 2D): Se generaron ${retazosGenerados.length} retazos a partir de recortes. Se reutilizaron ${retazosReutilizadosMuro.length} retazos para revestir la hornacina local, evitando comprar placas comerciales nuevas.`
  );

  return {
    muro_id: muro.id,
    placas: {
      cantidad_total: todasLasPlacas.filter(p => !p.esRetazoReutilizado).length + placasNichoAdicionales,
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
    retazos_generados: retazosGenerados,
    retazos_reutilizados: retazosReutilizadosMuro,
  };
}
