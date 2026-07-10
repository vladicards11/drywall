import {
  Proyecto,
  Catalogo,
  ResultadoProyecto,
  ResultadoMuro,
  ResultadoPerfiles,
  ResultadoTornillos
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

  for (const resMuro of murosResultados) {
    placasTotal += resMuro.placas.cantidad_total;
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

  return {
    proyecto: proyecto.proyecto,
    muros: murosResultados,
    totales,
  };
}
