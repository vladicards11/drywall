/**
 * storeys.ts
 * Extrae los IfcBuildingStorey del modelo y construye un mapa
 *   expressId (muro) → nombre del piso
 *
 * Relación IFC utilizada:
 *   IfcRelContainedInSpatialStructure
 *     .RelatingStructure → IfcBuildingStorey
 *     .RelatedElements   → [IfcWall, IfcWallStandardCase, ...]
 *
 * Si un muro no está contenido en ningún storey, se devuelve undefined
 * para esa clave — la lógica del llamador puede asignar "Sin Piso Asignado".
 */

import * as WebIFC from 'web-ifc';

/** Nombre del piso por expressId de muro */
export type StoreyMap = Map<number, string>;

/**
 * Construye el mapa expressIdMuro → nombrePiso recorriendo
 * todas las relaciones IfcRelContainedInSpatialStructure del modelo.
 *
 * @param api     - Instancia de IfcAPI con el modelo ya cargado
 * @param modelID - ID del modelo abierto
 * @returns       Map<expressId, storey_name>
 */
export function buildStoreyMap(api: WebIFC.IfcAPI, modelID: number): StoreyMap {
  const map: StoreyMap = new Map();

  try {
    // Obtenemos todas las relaciones de contención espacial
    const relIds = api.GetLineIDsWithType(
      modelID,
      WebIFC.IFCRELCONTAINEDINSPATIALSTRUCTURE
    );

    for (let i = 0; i < relIds.size(); i++) {
      const relId = relIds.get(i);

      let rel: {
        RelatingStructure?: { value: number };
        RelatedElements?: { value: number }[];
      };

      try {
        rel = api.GetLine(modelID, relId, false) as typeof rel;
      } catch {
        continue;
      }

      // Obtenemos el IfcBuildingStorey referenciado
      const storeyExpressId = rel.RelatingStructure?.value;
      if (storeyExpressId === undefined) continue;

      let storeyName = `Piso ${i + 1}`; // Nombre por defecto
      try {
        const storeyLine = api.GetLine(modelID, storeyExpressId, false) as {
          Name?: { value: string };
          LongName?: { value: string };
          Elevation?: { value: number };
        };
        const raw =
          storeyLine.LongName?.value ??
          storeyLine.Name?.value;

        if (raw && raw.trim()) {
          storeyName = raw.trim();
        } else if (storeyLine.Elevation?.value !== undefined) {
          // Fallback: usar la elevación como nombre del piso
          storeyName = `Nivel +${storeyLine.Elevation.value.toFixed(2)} m`;
        }
      } catch {
        // Mantener nombre por defecto
      }

      // Asignamos el nombre del piso a cada elemento relacionado
      const elements = rel.RelatedElements ?? [];
      for (const elem of elements) {
        if (typeof elem?.value === 'number') {
          map.set(elem.value, storeyName);
        }
      }
    }
  } catch (e) {
    // No es crítico — si falla, el mapa queda vacío y los muros
    // no tendrán storey asignado
    console.warn('[ifc-importer] buildStoreyMap falló (no crítico):', e);
  }

  return map;
}
