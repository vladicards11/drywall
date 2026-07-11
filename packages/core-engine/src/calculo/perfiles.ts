import { Muro, Union, Catalogo, ResultadoPerfiles, Corte1D } from "@drywall-calc/catalog-schemas";
import { roundUpSafe } from "../utils/redondeo.js";
import { calcularNesting1D } from "./nesting1D.js";

export function calcularPerfiles(
  muro: Muro,
  unionesDelMuro: Union[],
  catalogo: Catalogo
): ResultadoPerfiles {
  // 1. Obtener largos de barra comercial del catálogo
  const rielConfig = catalogo.perfiles.riel.find((r) => r.codigo === muro.sistema.riel);
  const largoBarraRiel = rielConfig ? rielConfig.largo_barra_m : 3.00;

  const montanteConfig = catalogo.perfiles.montante.find((m) => m.codigo === muro.sistema.perfil);
  const largoBarraMontante = montanteConfig ? montanteConfig.largo_barra_m : 3.00;

  // 2. Determinar cantidad de posiciones de montantes por cada tipo
  const montantesBase = roundUpSafe(muro.geometria.largo_m / muro.sistema.separacion_montante_m) + 1;
  const montantesRefuerzoVanos = 2 * muro.aberturas.length;

  let longitudAdicionalHornacinas = 0;
  for (const ab of muro.aberturas) {
    if (ab.tipo === "hornacina") {
      const prof = ab.profundidad_m || 0.10;
      longitudAdicionalHornacinas += 2 * (ab.ancho_m + ab.alto_m) + 4 * prof;
    }
  }
  // En hornacinas calculamos longitud lineal total adicional y la dividiremos en cortes de longitud razonable (ej. 1.00m o 1.50m)
  const cortesHornacina: number[] = [];
  let hornacinaRem = longitudAdicionalHornacinas;
  const LARGO_CORTE_HORNACINA = 1.50; // tramos típicos de refuerzo de nicho
  while (hornacinaRem > LARGO_CORTE_HORNACINA) {
    cortesHornacina.push(LARGO_CORTE_HORNACINA);
    hornacinaRem -= LARGO_CORTE_HORNACINA;
  }
  if (hornacinaRem > 0.05) {
    cortesHornacina.push(hornacinaRem);
  }

  let montantesUnion = 0;
  for (const union of unionesDelMuro) {
    const tipologia = catalogo.tipologias_union.find((t) => t.codigo === union.tipo_union);
    if (tipologia) {
      const sortedMuros = [...union.muros_conectados].sort();
      if (muro.id === sortedMuros[0]) {
        montantesUnion += tipologia.perfiles_adicionales;
      }
    }
  }

  // 3. Generar la lista de cortes individuales de Montantes
  const cortesMontante: Corte1D[] = [];
  const altoMuro = muro.geometria.alto_m;

  const agregarMontantePosicion = (descripcion: string, idxPos: number) => {
    if (altoMuro > largoBarraMontante) {
      // Si la altura del muro supera el largo comercial, realizar empalme telescópico con traslape
      const OVERLAP_EMPALME_M = 0.30;
      let altoRem = altoMuro;
      let idxBarra = 1;
      while (altoRem > largoBarraMontante) {
        cortesMontante.push({
          id: `mont_${descripcion.toLowerCase().substring(0, 3)}_${idxPos}_b${idxBarra}`,
          longitud_m: largoBarraMontante,
          descripcion: `${descripcion} (Tramo ${idxBarra})`,
        });
        altoRem -= (largoBarraMontante - OVERLAP_EMPALME_M);
        idxBarra++;
      }
      if (altoRem > 0.01) {
        cortesMontante.push({
          id: `mont_${descripcion.toLowerCase().substring(0, 3)}_${idxPos}_b${idxBarra}`,
          longitud_m: parseFloat(altoRem.toFixed(3)),
          descripcion: `${descripcion} (Tramo final)`,
        });
      }
    } else {
      cortesMontante.push({
        id: `mont_${descripcion.toLowerCase().substring(0, 3)}_${idxPos}`,
        longitud_m: altoMuro,
        descripcion,
      });
    }
  };

  // Posiciones base
  for (let i = 0; i < montantesBase; i++) {
    agregarMontantePosicion("Montante Base", i);
  }
  // Refuerzos de vano
  for (let i = 0; i < montantesRefuerzoVanos; i++) {
    agregarMontantePosicion("Refuerzo Vano", i);
  }
  // Encuentros/Uniones
  for (let i = 0; i < montantesUnion; i++) {
    agregarMontantePosicion("Encuentro Unión", i);
  }
  // Hornacinas
  cortesHornacina.forEach((long, i) => {
    cortesMontante.push({
      id: `mont_hor_${i}`,
      longitud_m: parseFloat(long.toFixed(3)),
      descripcion: "Refuerzo Hornacina",
    });
  });

  // Duplicar montantes si la estructura es doble
  let cortesMontantesFinal = [...cortesMontante];
  if (muro.sistema.estructura === "doble") {
    cortesMontantesFinal = [
      ...cortesMontante.map((c) => ({ ...c, id: `${c.id}_caraA`, descripcion: `${c.descripcion} (Fila A)` })),
      ...cortesMontante.map((c) => ({ ...c, id: `${c.id}_caraB`, descripcion: `${c.descripcion} (Fila B)` })),
    ];
  }

  // Ejecutar Nesting de Montantes
  const nestingMontantes = calcularNesting1D(cortesMontantesFinal, largoBarraMontante);

  // 4. Generar la lista de cortes individuales de Rieles
  let ceilLength = muro.geometria.largo_m;
  let floorLength = muro.geometria.largo_m;
  const dintelesCortes: number[] = [];

  for (const ab of muro.aberturas) {
    const esAlturaCompleta = ab.alto_m >= altoMuro - 1e-9;
    if (ab.tipo === "puerta" || ab.tipo === "pase") {
      floorLength -= ab.ancho_m;
    }
    if (esAlturaCompleta) {
      ceilLength -= ab.ancho_m;
    } else {
      dintelesCortes.push(ab.ancho_m + 0.30); // 15cm por lado
    }
  }

  // Corrección por ángulo en uniones
  const anchoPerfilM = rielConfig ? rielConfig.ancho_mm / 1000 : 0.048;
  let deltaAngulo = 0;
  for (const union of unionesDelMuro) {
    if (union.angulo_grados !== 90 && union.angulo_grados > 0) {
      const alphaRad = (union.angulo_grados * Math.PI) / 180;
      deltaAngulo += anchoPerfilM / Math.tan(alphaRad / 2);
    }
  }

  ceilLength += deltaAngulo;
  if (floorLength > 1e-9) {
    floorLength += deltaAngulo;
  }

  const cortesRiel: Corte1D[] = [];

  const agregarRielTramo = (longitudTotal: number, descripcion: string) => {
    let rem = longitudTotal;
    let idx = 1;
    while (rem > largoBarraRiel) {
      cortesRiel.push({
        id: `riel_${descripcion.toLowerCase().substring(0, 3)}_${idx}`,
        longitud_m: largoBarraRiel,
        descripcion: `${descripcion} (Barra ${idx})`,
      });
      rem -= largoBarraRiel;
      idx++;
    }
    if (rem > 0.01) {
      cortesRiel.push({
        id: `riel_${descripcion.toLowerCase().substring(0, 3)}_${idx}`,
        longitud_m: parseFloat(rem.toFixed(3)),
        descripcion: `${descripcion} (Tramo)`,
      });
    }
  };

  // Riel superior
  if (ceilLength > 0.01) {
    agregarRielTramo(ceilLength, "Riel Superior");
  }
  // Riel inferior
  if (floorLength > 0.01) {
    agregarRielTramo(floorLength, "Riel Inferior");
  }
  // Dinteles
  dintelesCortes.forEach((long, i) => {
    cortesRiel.push({
      id: `riel_din_${i}`,
      longitud_m: parseFloat(long.toFixed(3)),
      descripcion: `Riel de Dintel Vano ${i + 1}`,
    });
  });

  // Duplicar rieles si es doble estructura
  let cortesRielesFinal = [...cortesRiel];
  if (muro.sistema.estructura === "doble") {
    cortesRielesFinal = [
      ...cortesRiel.map((c) => ({ ...c, id: `${c.id}_caraA`, descripcion: `${c.descripcion} (Fila A)` })),
      ...cortesRiel.map((c) => ({ ...c, id: `${c.id}_caraB`, descripcion: `${c.descripcion} (Fila B)` })),
    ];
  }

  // Ejecutar Nesting de Rieles
  const nestingRieles = calcularNesting1D(cortesRielesFinal, largoBarraRiel);

  return {
    montantes: nestingMontantes.cantidad_barras,
    rieles_barras: nestingRieles.cantidad_barras,
    montantes_refuerzo_vanos: montantesRefuerzoVanos * (muro.sistema.estructura === "doble" ? 2 : 1),
    montantes_union: montantesUnion * (muro.sistema.estructura === "doble" ? 2 : 1),
    nesting_montantes: nestingMontantes,
    nesting_rieles: nestingRieles,
  };
}
