import { PlacaRect, Abertura, Retazo2D } from "@drywall-calc/catalog-schemas";
import { roundFloat } from "../utils/redondeo.js";
import { interseccion, Rect } from "../utils/geometria.js";

// Dimensiones mínimas para considerar un retazo como útil/reutilizable (20cm x 20cm)
const MIN_RETAZO_DIM_M = 0.20;

/**
 * Aplica cortes en L ("pistola") en las esquinas superiores de puertas y ventanas
 * para evitar juntas frías alineadas con las jambas.
 */
export function aplicarCortesL(
  placas: PlacaRect[],
  aberturas: Abertura[],
  largoMuro: number
): PlacaRect[] {
  return placas.map((placa) => {
    let corteL = false;

    // Evaluamos si alguna esquina superior de vano cae dentro del cuerpo de la placa
    for (const ab of aberturas) {
      if (ab.tipo === "hornacina" || ab.tipo === "pase") continue;

      const yFijo = ab.alto_m; // Esquina superior (para puertas que nacen en y=0)
      const xIzq = ab.distancia_desde_inicio_m;
      const xDer = ab.distancia_desde_inicio_m + ab.ancho_m;

      // Una placa coincide con la esquina superior si envuelve el punto de la esquina
      // y la junta vertical de la placa está cerca o justo sobre la jamba.
      const cubreXIzq = placa.x <= xIzq && (placa.x + placa.ancho) >= xIzq;
      const cubreXDer = placa.x <= xDer && (placa.x + placa.ancho) >= xDer;
      const cubreY = yFijo >= placa.y && yFijo <= (placa.y + placa.alto);

      if (cubreY && (cubreXIzq || cubreXDer)) {
        // Para evitar juntas frías, si la placa termina exactamente en la jamba
        // o a menos de 15cm, se marca que requiere corte en L
        const distIzq = Math.min(Math.abs(placa.x - xIzq), Math.abs((placa.x + placa.ancho) - xIzq));
        const distDer = Math.min(Math.abs(placa.x - xDer), Math.abs((placa.x + placa.ancho) - xDer));

        if (distIzq < 0.15 || distDer < 0.15) {
          corteL = true;
        }
      }
    }

    return {
      ...placa,
      corteL
    };
  });
}

/**
 * Extrae los retazos rectangulares de yeso-cartón resultantes de recortar aberturas
 * sobre las placas comerciales completas de la grilla.
 */
export function extraerRetazosDeAberturas(
  placasBase: PlacaRect[],
  aberturas: Abertura[],
  placaTipo: string,
  espesorMm: number,
  muroId: string
): Retazo2D[] {
  const retazos: Retazo2D[] = [];
  let idx = 1;

  for (const placa of placasBase) {
    if (!placa.recortada) continue;

    const placaRect: Rect = {
      x: placa.x,
      y: placa.y,
      ancho: placa.ancho,
      alto: placa.alto,
    };

    for (const ab of aberturas) {
      if (ab.tipo === "hornacina") continue; // Hornacinas no eliminan placa base de la misma forma (son nichos empotrados)

      const abRect: Rect = {
        x: ab.distancia_desde_inicio_m,
        y: ab.tipo === "ventana" ? (ab.altura_desde_piso_m || 0.80) : 0,
        ancho: ab.ancho_m,
        alto: ab.alto_m,
      };

      const inter = interseccion(placaRect, abRect);
      if (inter) {
        // La intersección representa el hueco removido.
        // Físicamente, el instalador recorta esta pieza del panel entero.
        // Si la pieza removida es lo suficientemente grande, queda como retazo reutilizable.
        if (inter.ancho >= MIN_RETAZO_DIM_M && inter.alto >= MIN_RETAZO_DIM_M) {
          retazos.push({
            id: `retazo_${muroId}_${placa.id}_${idx++}`,
            ancho_m: roundFloat(inter.ancho),
            alto_m: roundFloat(inter.alto),
            placa_tipo: placaTipo,
            espesor_mm: espesorMm,
            origen_elemento_id: muroId,
          });
        }
      }
    }
  }

  return retazos;
}

export interface DemandaPlaca {
  id: string;
  ancho_m: number;
  alto_m: number;
  placa_tipo: string;
  espesor_mm: number;
  nombre_pieza: string;
}

export interface ResultadoReutilizacion {
  demandasSatisfechas: {
    demandaId: string;
    nombrePieza: string;
    retazoUsadoId: string;
    ancho_m: number;
    alto_m: number;
  }[];
  demandasPendientes: DemandaPlaca[];
  retazosRestantes: Retazo2D[];
}

/**
 * Optimiza la reutilización de retazos para cubrir piezas de placa pequeñas.
 * Permite rotación de 90° para mayor aprovechamiento en elementos no estructurales.
 */
export function optimizarReutilizacionRetazos(
  demandas: DemandaPlaca[],
  piscinaRetazos: Retazo2D[]
): ResultadoReutilizacion {
  const demandasSatisfechas: ResultadoReutilizacion["demandasSatisfechas"] = [];
  const demandasPendientes: DemandaPlaca[] = [];
  
  // Clonamos la piscina de retazos para ir modificándola
  let retazosDisponibles = [...piscinaRetazos];

  // Ordenamos las demandas de mayor a menor área para priorizar piezas grandes
  const demandasOrdenadas = [...demandas].sort((a, b) => (b.ancho_m * b.alto_m) - (a.ancho_m * a.alto_m));

  for (const dem of demandasOrdenadas) {
    let retazoAsignadoIdx = -1;
    let requiereRotacion = false;

    // Buscamos el retazo más pequeño que pueda albergar la demanda (Best-Fit)
    let mejorAreaSobrante = Infinity;

    for (let i = 0; i < retazosDisponibles.length; i++) {
      const ret = retazosDisponibles[i];

      if (ret.placa_tipo !== dem.placa_tipo || ret.espesor_mm !== dem.espesor_mm) {
        continue;
      }

      const areaRetazo = ret.ancho_m * ret.alto_m;
      const areaDemanda = dem.ancho_m * dem.alto_m;

      if (areaRetazo < areaDemanda) continue;

      // Caso sin rotar
      const cabeSinRotar = ret.ancho_m >= dem.ancho_m && ret.alto_m >= dem.alto_m;
      // Caso rotado 90 grados
      const cabeRotado = ret.ancho_m >= dem.alto_m && ret.alto_m >= dem.ancho_m;

      if (cabeSinRotar) {
        const sobrante = areaRetazo - areaDemanda;
        if (sobrante < mejorAreaSobrante) {
          mejorAreaSobrante = sobrante;
          retazoAsignadoIdx = i;
          requiereRotacion = false;
        }
      } else if (cabeRotado) {
        const sobrante = areaRetazo - areaDemanda;
        if (sobrante < mejorAreaSobrante) {
          mejorAreaSobrante = sobrante;
          retazoAsignadoIdx = i;
          requiereRotacion = true;
        }
      }
    }

    if (retazoAsignadoIdx !== -1) {
      const retUsado = retazosDisponibles[retazoAsignadoIdx];
      demandasSatisfechas.push({
        demandaId: dem.id,
        nombrePieza: dem.nombre_pieza,
        retazoUsadoId: retUsado.id,
        ancho_m: dem.ancho_m,
        alto_m: dem.alto_m,
      });

      // Si sobra una pieza útil, subdividimos y re-introducimos el retazo restante a la piscina
      const wRet = retUsado.ancho_m;
      const hRet = retUsado.alto_m;
      const wDem = requiereRotacion ? dem.alto_m : dem.ancho_m;
      const hDem = requiereRotacion ? dem.ancho_m : dem.alto_m;

      // Quitamos el retazo usado
      retazosDisponibles.splice(retazoAsignadoIdx, 1);

      // Calculamos dos posibles remanentes por corte guillotina:
      // Remanente 1: a la derecha (si sobra ancho)
      // Remanente 2: arriba (si sobra alto)
      const wSobrante = wRet - wDem;
      const hSobrante = hRet - hDem;

      if (wSobrante >= MIN_RETAZO_DIM_M && hRet >= MIN_RETAZO_DIM_M) {
        retazosDisponibles.push({
          id: `${retUsado.id}_r_w`,
          ancho_m: roundFloat(wSobrante),
          alto_m: roundFloat(hRet),
          placa_tipo: retUsado.placa_tipo,
          espesor_mm: retUsado.espesor_mm,
          origen_elemento_id: retUsado.origen_elemento_id,
        });
      }
      if (hSobrante >= MIN_RETAZO_DIM_M && wDem >= MIN_RETAZO_DIM_M) {
        retazosDisponibles.push({
          id: `${retUsado.id}_r_h`,
          ancho_m: roundFloat(wDem),
          alto_m: roundFloat(hSobrante),
          placa_tipo: retUsado.placa_tipo,
          espesor_mm: retUsado.espesor_mm,
          origen_elemento_id: retUsado.origen_elemento_id,
        });
      }
    } else {
      demandasPendientes.push(dem);
    }
  }

  return {
    demandasSatisfechas,
    demandasPendientes,
    retazosRestantes: retazosDisponibles,
  };
}
