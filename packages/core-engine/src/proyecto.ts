import {
  Proyecto,
  Catalogo,
  ResultadoProyecto,
  ResultadoMuro,
  ResultadoPerfiles,
  ResultadoTornillos,
  ResultadoAmbiente
} from "@drywall-calc/catalog-schemas";
import { calcularMuro } from "./orquestador.js";
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

  return {
    proyecto: proyecto.proyecto,
    muros: murosResultados,
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
