/**
 * openings.ts
 * Extracción de aberturas (IfcOpeningElement) y asignación a muros.
 * Recorre las relaciones IfcRelVoidsElement para encontrar qué abertura
 * pertenece a qué muro, e IfcRelFillsElement para inferir si es puerta o ventana.
 */

import * as WebIFC from 'web-ifc';
import type { AberturaIFC, MuroIFC, TipoAbertura } from '../types.js';

/**
 * Extrae las aberturas del modelo IFC y las asigna a los muros correspondientes.
 * Modifica el array de muros en-place, completando la propiedad `aberturas`.
 *
 * @param api - Instancia de IfcAPI inicializada
 * @param modelID - ID del modelo
 * @param muros - Array de muros ya extraídos (se modifican en-place)
 */
export function assignOpeningsToWalls(
  api: WebIFC.IfcAPI,
  modelID: number,
  muros: MuroIFC[]
): void {
  // Índice rápido de muros por expressId
  const muroByExpressId = new Map<number, MuroIFC>();
  for (const muro of muros) {
    muroByExpressId.set(muro.expressId, muro);
  }

  // Map: openingExpressId → tipo (puerta/ventana) inferido desde IfcRelFillsElement
  const tipoByOpeningId = buildTipoMap(api, modelID);

  // Recorremos IfcRelVoidsElement: relaciona cada muro con sus aberturas
  const relVoidsIds = api.GetLineIDsWithType(modelID, WebIFC.IFCRELVOIDSELEMENT);

  for (let i = 0; i < relVoidsIds.size(); i++) {
    const relId = relVoidsIds.get(i);

    let relatedBuildingElement: number | null = null;
    let relatedOpeningElement: number | null = null;

    try {
      const rel = api.GetLine(modelID, relId) as {
        RelatingBuildingElement?: { value: number };
        RelatedOpeningElement?: { value: number };
      };
      relatedBuildingElement = rel.RelatingBuildingElement?.value ?? null;
      relatedOpeningElement = rel.RelatedOpeningElement?.value ?? null;
    } catch { continue; }

    if (relatedBuildingElement === null || relatedOpeningElement === null) continue;

    const muro = muroByExpressId.get(relatedBuildingElement);
    if (!muro) continue; // Esta abertura no pertenece a ningún muro del resultado

    // Extraemos geometría de la abertura
    const abertura = extractOpening(api, modelID, relatedOpeningElement, muro, tipoByOpeningId);
    if (abertura) {
      muro.aberturas.push(abertura);
    }
  }
}

/**
 * Construye un mapa openingExpressId → TipoAbertura
 * recorriendo IfcRelFillsElement → IfcDoor / IfcWindow.
 */
function buildTipoMap(
  api: WebIFC.IfcAPI,
  modelID: number
): Map<number, TipoAbertura> {
  const map = new Map<number, TipoAbertura>();

  const relFillsIds = api.GetLineIDsWithType(modelID, WebIFC.IFCRELFILLSELEMENT);
  for (let i = 0; i < relFillsIds.size(); i++) {
    const relId = relFillsIds.get(i);
    try {
      const rel = api.GetLine(modelID, relId) as {
        RelatingOpeningElement?: { value: number };
        RelatedBuildingElement?: { value: number };
      };
      const openingId = rel.RelatingOpeningElement?.value;
      const fillingId = rel.RelatedBuildingElement?.value;
      if (openingId === undefined || fillingId === undefined) continue;

      // Determinamos si el filling es una puerta o ventana
      const filling = api.GetLine(modelID, fillingId) as { type: number };
      if (filling.type === WebIFC.IFCDOOR) {
        map.set(openingId, 'puerta');
      } else if (filling.type === WebIFC.IFCWINDOW) {
        map.set(openingId, 'ventana');
      }
    } catch { /* skip */ }
  }

  return map;
}

/**
 * Extrae las dimensiones de un IfcOpeningElement y construye un AberturaIFC.
 */
function extractOpening(
  api: WebIFC.IfcAPI,
  modelID: number,
  openingExpressId: number,
  muro: MuroIFC,
  tipoMap: Map<number, TipoAbertura>
): AberturaIFC | null {
  let ancho_m: number | null = null;
  let alto_m: number | null = null;
  let posicion_x_m = 0;
  let confianza: AberturaIFC['confianza'] = 'estimado';

  try {
    // Intentamos bounding box de la abertura
    const mesh = api.GetFlatMesh(modelID, openingExpressId);
    if (mesh.geometries.size() > 0) {
      let minX = Infinity, maxX = -Infinity;
      let minY = Infinity, maxY = -Infinity;
      let minZ = Infinity, maxZ = -Infinity;

      for (let g = 0; g < mesh.geometries.size(); g++) {
        const placed = mesh.geometries.get(g);
        const geo = api.GetGeometry(modelID, placed.geometryExpressID);
        const verts = api.GetVertexArray(geo.GetVertexData(), geo.GetVertexDataSize());
        const mat = placed.flatTransformation;

        for (let v = 0; v < verts.length; v += 6) {
          const wx = mat[0] * verts[v] + mat[4] * verts[v + 1] + mat[8] * verts[v + 2] + mat[12];
          const wy = mat[1] * verts[v] + mat[5] * verts[v + 1] + mat[9] * verts[v + 2] + mat[13];
          const wz = mat[2] * verts[v] + mat[6] * verts[v + 1] + mat[10] * verts[v + 2] + mat[14];
          minX = Math.min(minX, wx); maxX = Math.max(maxX, wx);
          minY = Math.min(minY, wy); maxY = Math.max(maxY, wy);
          minZ = Math.min(minZ, wz); maxZ = Math.max(maxZ, wz);
        }
        api.Dispose();
      }

      const dx = maxX - minX;
      const dy = maxY - minY;
      const dz = maxZ - minZ;

      alto_m = dz;
      ancho_m = Math.max(dx, dy); // La dimensión horizontal más grande es el ancho
      posicion_x_m = Math.min(dx >= dy ? minX : minY, 0); // Estimación básica de posición
      confianza = 'estimado';
    }
  } catch { /* sin geometría válida */ }

  if (ancho_m === null || alto_m === null) return null;
  if (ancho_m < 0.1 || alto_m < 0.1) return null; // Filtrar aberturas insignificantes

  const tipo: TipoAbertura = tipoMap.get(openingExpressId) ?? 'pase';

  return {
    expressId: openingExpressId,
    ancho_m: Math.round(ancho_m * 100) / 100,
    alto_m: Math.round(alto_m * 100) / 100,
    posicion_x_m: Math.max(0, Math.round(posicion_x_m * 100) / 100),
    tipo,
    confianza,
  };
}
