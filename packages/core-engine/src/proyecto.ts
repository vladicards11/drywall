import {
  Proyecto,
  Catalogo,
  ResultadoProyecto,
  ResultadoMuro,
  ResultadoPerfiles,
  ResultadoTornillos,
  ResultadoAmbiente,
  ResultadoCielorraso,
  ResultadoCenefa,
  Retazo2D
} from "@drywall-calc/catalog-schemas";
import { calcularMuro } from "./orquestador.js";
import { calcularCielorraso } from "./calculo/cielorraso.js";
import { calcularCenefa } from "./calculo/cenefa.js";
import { roundUpSafe, roundFloat } from "./utils/redondeo.js";

export class ProyectoInvalidoError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "ProyectoInvalidoError";
  }
}

export function calcularProyecto(
  proyecto: Proyecto,
  catalogo: Catalogo
): ResultadoProyecto {
  const muroIds = new Set(proyecto.elementos.map((m) => m.id));
  const unionIds = new Set(proyecto.uniones.map((u) => u.id));

  // 1. Validación de integridad referencial:
  // Cada muro.encuentros debe apuntar a un id de unión existente
  for (const muro of proyecto.elementos) {
    for (const enc of muro.encuentros) {
      if (!unionIds.has(enc)) {
        throw new ProyectoInvalidoError(
          `Encuentro "${enc}" en el muro "${muro.id}" no corresponde a ninguna unión registrada en el proyecto.`
        );
      }
    }
  }

  // Cada union.muros_conectados debe apuntar a un id de muro existente
  for (const union of proyecto.uniones) {
    for (const muroId of union.muros_conectados) {
      if (!muroIds.has(muroId)) {
        throw new ProyectoInvalidoError(
          `La unión "${union.id}" conecta con el muro "${muroId}", el cual no existe en el proyecto.`
        );
      }
    }
  }

  // 2. Calcular cada muro individualmente
  const murosResultados: ResultadoMuro[] = [];
  for (const muro of proyecto.elementos) {
    const resMuro = calcularMuro(muro, proyecto.uniones, catalogo);
    murosResultados.push(resMuro);
  }

  // Consolidamos la piscina global de retazos generados libres de muros
  let piscinaGlobal: Retazo2D[] = [];
  for (const rm of murosResultados) {
    if (rm.retazos_generados) {
      const usadosLocal = new Set(rm.retazos_reutilizados?.map((r) => r.id) || []);
      const libres = rm.retazos_generados.filter((r) => !usadosLocal.has(r.id));
      piscinaGlobal.push(...libres);
    }
  }

  // 2B. Calcular cada cielorraso individualmente
  const cielorrasosResultados: ResultadoCielorraso[] = [];
  if (proyecto.cielorrasos && proyecto.cielorrasos.length > 0) {
    for (const cie of proyecto.cielorrasos) {
      const resCie = calcularCielorraso(cie, catalogo);
      cielorrasosResultados.push(resCie);
    }
  }

  // 2C. Calcular cada cenefa individualmente alimentandola con la piscina de retazos
  const cenefasResultados: ResultadoCenefa[] = [];
  if (proyecto.cenefas && proyecto.cenefas.length > 0) {
    for (const cen of proyecto.cenefas) {
      const resCen = calcularCenefa(cen, catalogo, piscinaGlobal);
      cenefasResultados.push(resCen);

      // Descontamos los retazos que la cenefa consumió
      const usadosCen = new Set(resCen.retazos_reutilizados?.map((r: Retazo2D) => r.id) || []);
      piscinaGlobal = piscinaGlobal.filter((r: Retazo2D) => !usadosCen.has(r.id));
    }
  }

  // 3. Consolidar totales a nivel de proyecto
  let placasTotal = 0;
  let montantesTotal = 0;
  let rielesBarrasTotal = 0;
  let montantesRefuerzoVanosTotal = 0;
  let montantesUnionTotal = 0;

  let tornillosPlacaPerfilTotal = 0;
  let tornillosPerfilPerfilTotal = 0;
  let tornillosAnclajesLosaTotal = 0;

  let cintaMlTotal = 0;
  let masillaKgTotal = 0;
  let aislanteM2Total = 0;
  let esquinerosMlTotal = 0;

  let placasPesoTotal = 0;

  // Totales específicos de cielorrasos
  let cieSecundariosTotal = 0;
  let ciePrincipalesTotal = 0;
  let ciePerimetralesTotal = 0;
  let cieColgadoresTotal = 0;
  let alambreMlTotal = 0;

  // Totales específicos de cenefas
  let cenSecundariosTotal = 0;
  let cenPerimetralesTotal = 0;
  let cenEsquinerosTotal = 0;

  for (const resMuro of murosResultados) {
    placasTotal += resMuro.placas.cantidad_total;
    placasPesoTotal += resMuro.placas.peso_total_kg;
    montantesTotal += resMuro.perfiles.montantes;
    rielesBarrasTotal += resMuro.perfiles.rieles_barras;
    montantesRefuerzoVanosTotal += resMuro.perfiles.montantes_refuerzo_vanos;
    montantesUnionTotal += resMuro.perfiles.montantes_union;

    tornillosPlacaPerfilTotal += resMuro.tornillos.placa_perfil;
    tornillosPerfilPerfilTotal += resMuro.tornillos.perfil_perfil;
    tornillosAnclajesLosaTotal += resMuro.tornillos.anclajes_losa;

    cintaMlTotal += resMuro.cinta.ml_total;
    masillaKgTotal += resMuro.masilla.kg_total;
    aislanteM2Total += resMuro.aislante.m2;
    esquinerosMlTotal += resMuro.esquineros.ml_total;
  }

  for (const resCie of cielorrasosResultados) {
    placasTotal += resCie.placas.cantidad_total;
    placasPesoTotal += resCie.placas.peso_total_kg;
    
    cieSecundariosTotal += resCie.perfiles.secundarios_barras;
    ciePrincipalesTotal += resCie.perfiles.principales_barras;
    ciePerimetralesTotal += resCie.perfiles.perimetrales_barras;
    cieColgadoresTotal += resCie.colgadores.cantidad_total;
    alambreMlTotal += resCie.colgadores.alambre_ml;

    tornillosPlacaPerfilTotal += resCie.tornillos.placa_perfil;
    tornillosPerfilPerfilTotal += resCie.tornillos.perfil_perfil;
    tornillosAnclajesLosaTotal += resCie.tornillos.anclajes_losa + resCie.tornillos.anclajes_pared;

    cintaMlTotal += resCie.cinta.ml_total;
    masillaKgTotal += resCie.masilla.kg_total;
    aislanteM2Total += resCie.aislante.m2;
  }

  for (const resCen of cenefasResultados) {
    placasTotal += resCen.placas.cantidad_total;
    placasPesoTotal += resCen.placas.peso_total_kg;

    cenSecundariosTotal += resCen.perfiles.secundarios_barras;
    cenPerimetralesTotal += resCen.perfiles.perimetrales_barras;
    cenEsquinerosTotal += resCen.esquineros.ml_total;

    tornillosPlacaPerfilTotal += resCen.tornillos.placa_perfil;
    tornillosPerfilPerfilTotal += resCen.tornillos.perfil_perfil;
    tornillosAnclajesLosaTotal += resCen.tornillos.anclajes_losa + resCen.tornillos.anclajes_pared;

    cintaMlTotal += resCen.cinta.ml_total;
    masillaKgTotal += resCen.masilla.kg_total;
    esquinerosMlTotal += resCen.esquineros.ml_total;
  }

  // Las unidades comerciales del proyecto se recalculan con el total consolidado
  const rollosConsolidados = roundUpSafe(cintaMlTotal / catalogo.cinta.rendimiento_ml_por_rollo);
  const bolsasConsolidadas = roundUpSafe(masillaKgTotal / catalogo.masilla.presentacion_kg_por_bolsa);
  const paquetesConsolidados = roundUpSafe(aislanteM2Total / catalogo.aislante.presentacion_m2_por_paquete);

  const totales = {
    placas: {
      cantidad_total: placasTotal,
      peso_total_kg: roundFloat(placasPesoTotal),
    },
    perfiles: {
      montantes: montantesTotal,
      rieles_barras: rielesBarrasTotal,
      montantes_refuerzo_vanos: montantesRefuerzoVanosTotal,
      montantes_union: montantesUnionTotal,
    },
    tornillos: {
      placa_perfil: tornillosPlacaPerfilTotal,
      perfil_perfil: tornillosPerfilPerfilTotal,
      anclajes_losa: tornillosAnclajesLosaTotal,
    },
    cinta: {
      ml_total: roundFloat(cintaMlTotal),
      rollos: rollosConsolidados,
    },
    masilla: {
      kg_total: roundFloat(masillaKgTotal),
      bolsas: bolsasConsolidadas,
    },
    aislante: {
      m2: roundFloat(aislanteM2Total),
      paquetes: paquetesConsolidados,
    },
    esquineros: {
      ml_total: roundFloat(esquinerosMlTotal),
    },
    ...(cielorrasosResultados.length > 0 ? {
      cielorraso: {
        secundarios: cieSecundariosTotal,
        principales: ciePrincipalesTotal,
        perimetrales: ciePerimetralesTotal,
        colgadores: cieColgadoresTotal,
        alambre_ml: roundFloat(alambreMlTotal),
      }
    } : {}),
    ...(cenefasResultados.length > 0 ? {
      cenefa: {
        secundarios: cenSecundariosTotal,
        perimetrales: cenPerimetralesTotal,
        esquineros_ml: roundFloat(cenEsquinerosTotal)
      }
    } : {})
  };

  // 4. Si el proyecto tiene ambientes, calcular los desgloses por ambiente
  let porAmbiente: ResultadoAmbiente[] | undefined = undefined;

  if (proyecto.ambientes && proyecto.ambientes.length > 0) {
    porAmbiente = [];

    const murosAsignadosIds = new Set<string>();
    for (const amb of proyecto.ambientes) {
      for (const mId of amb.muros) {
        murosAsignadosIds.add(mId);
      }
    }

    const murosNoAsignados = murosResultados.filter(rm => !murosAsignadosIds.has(rm.muro_id));

    for (const amb of proyecto.ambientes) {
      const murosAmbiente = murosResultados.filter(rm => amb.muros.includes(rm.muro_id));
      porAmbiente.push(consolidarAmbiente(amb.id, amb.nombre, murosAmbiente, catalogo));
    }

    if (murosNoAsignados.length > 0) {
      porAmbiente.push(consolidarAmbiente("no_asignado", "Otros / Sin asignar", murosNoAsignados, catalogo));
    }
  }

  const todosRetazosReutilizados: Retazo2D[] = [];
  for (const rm of murosResultados) {
    if (rm.retazos_reutilizados) {
      todosRetazosReutilizados.push(...rm.retazos_reutilizados);
    }
  }
  for (const rc of cenefasResultados) {
    if (rc.retazos_reutilizados) {
      todosRetazosReutilizados.push(...rc.retazos_reutilizados);
    }
  }

  return {
    proyecto: proyecto.proyecto,
    muros: murosResultados,
    cielorrasos: cielorrasosResultados.length > 0 ? cielorrasosResultados : undefined,
    cenefas: cenefasResultados.length > 0 ? cenefasResultados : undefined,
    retazos_disponibles: piscinaGlobal,
    retazos_reutilizados: todosRetazosReutilizados,
    totales,
    ...(porAmbiente ? { por_ambiente: porAmbiente } : {}),
  };
}

function consolidarAmbiente(
  ambienteId: string,
  nombre: string,
  murosAmbiente: ResultadoMuro[],
  catalogo: Catalogo
): ResultadoAmbiente {
  let placasTotal = 0;
  let placasPesoTotal = 0;
  let montantesTotal = 0;
  let rielesBarrasTotal = 0;
  let montantesRefuerzoVanosTotal = 0;
  let montantesUnionTotal = 0;
  let tornillosPlacaPerfilTotal = 0;
  let tornillosPerfilPerfilTotal = 0;
  let tornillosAnclajesLosaTotal = 0;
  let cintaMlTotal = 0;
  let masillaKgTotal = 0;
  let aislanteM2Total = 0;
  let esquinerosMlTotal = 0;

  for (const rm of murosAmbiente) {
    placasTotal += rm.placas.cantidad_total;
    placasPesoTotal += rm.placas.peso_total_kg;
    montantesTotal += rm.perfiles.montantes;
    rielesBarrasTotal += rm.perfiles.rieles_barras;
    montantesRefuerzoVanosTotal += rm.perfiles.montantes_refuerzo_vanos;
    montantesUnionTotal += rm.perfiles.montantes_union;
    tornillosPlacaPerfilTotal += rm.tornillos.placa_perfil;
    tornillosPerfilPerfilTotal += rm.tornillos.perfil_perfil;
    tornillosAnclajesLosaTotal += rm.tornillos.anclajes_losa;
    cintaMlTotal += rm.cinta.ml_total;
    masillaKgTotal += rm.masilla.kg_total;
    aislanteM2Total += rm.aislante.m2;
    esquinerosMlTotal += rm.esquineros.ml_total;
  }

  const rollos = roundUpSafe(cintaMlTotal / catalogo.cinta.rendimiento_ml_por_rollo);
  const bolsas = roundUpSafe(masillaKgTotal / catalogo.masilla.presentacion_kg_por_bolsa);
  const paquetes = roundUpSafe(aislanteM2Total / catalogo.aislante.presentacion_m2_por_paquete);

  return {
    ambiente_id: ambienteId,
    nombre,
    totales: {
      placas: {
        cantidad_total: placasTotal,
        peso_total_kg: roundFloat(placasPesoTotal),
      },
      perfiles: {
        montantes: montantesTotal,
        rieles_barras: rielesBarrasTotal,
        montantes_refuerzo_vanos: montantesRefuerzoVanosTotal,
        montantes_union: montantesUnionTotal,
      },
      tornillos: {
        placa_perfil: tornillosPlacaPerfilTotal,
        perfil_perfil: tornillosPerfilPerfilTotal,
        anclajes_losa: tornillosAnclajesLosaTotal,
      },
      cinta: {
        ml_total: roundFloat(cintaMlTotal),
        rollos,
      },
      masilla: {
        kg_total: roundFloat(masillaKgTotal),
        bolsas,
      },
      aislante: {
        m2: roundFloat(aislanteM2Total),
        paquetes,
      },
      esquineros: {
        ml_total: roundFloat(esquinerosMlTotal),
      },
    },
    muros: murosAmbiente,
  };
}
