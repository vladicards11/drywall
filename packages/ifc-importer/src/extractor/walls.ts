/**
 * walls.ts
 * Extracción de muros (IfcWall + IfcWallStandardCase) desde un modelo IFC cargado.
 * Usa extracción semántica (Quantity Sets) como método primario,
 * y bounding box geométrico como fallback.
 */

import * as WebIFC from 'web-ifc';
import type { MuroIFC } from '../types.js';
import { extractWallQuantities } from './quantities.js';
import type { StoreyMap } from './storeys.js';

/**
 * Extrae todos los muros del modelo IFC.
 *
 * @param api - Instancia de IfcAPI inicializada con el modelo cargado
 * @param modelID - ID del modelo
 * @param altoMinimo - Filtro: muros con alto menor a este valor se descartan (metros)
 * @param largoMinimo - Filtro: muros con largo menor a este valor se descartan (metros)
 * @returns Array de MuroIFC con dimensiones y lista de aberturas (vacía — se llena en openings.ts)
 */
export function extractWalls(
  api: WebIFC.IfcAPI,
  modelID: number,
  altoMinimo = 0.5,
  largoMinimo = 0.1,
  storeyMap?: StoreyMap
): MuroIFC[] {
  const muros: MuroIFC[] = [];

  // Obtenemos IDs de IfcWall y IfcWallStandardCase
  const wallTypes = [WebIFC.IFCWALL, WebIFC.IFCWALLSTANDARDCASE];

  for (const wallType of wallTypes) {
    const ids = api.GetLineIDsWithType(modelID, wallType);

    for (let i = 0; i < ids.size(); i++) {
      const expressId = ids.get(i);
      const advertencias: string[] = [];
      let largo_m: number | null = null;
      let alto_m: number | null = null;
      let espesor_m: number | null = null;
      let metodo_extraccion: MuroIFC['metodo_extraccion'] = 'quantity_sets';

      // ----- Intento 1: Extracción semántica (Quantity Sets) -----
      const qs = extractWallQuantities(api, modelID, expressId);
      largo_m = qs.largo_m;
      alto_m = qs.alto_m;
      espesor_m = qs.espesor_m;

      // ----- Intento 2: Bounding Box geométrico -----
      // ----- Extracción de Geometría y Coordenadas 2D -----
      let startX: number | undefined;
      let startY: number | undefined;
      let endX: number | undefined;
      let endY: number | undefined;

      try {
        const mesh = api.GetFlatMesh(modelID, expressId);
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
              const x = verts[v];
              const y = verts[v + 1];
              const z = verts[v + 2];

              const wx = mat[0] * x + mat[4] * y + mat[8] * z + mat[12];
              const wy = mat[1] * x + mat[5] * y + mat[9] * z + mat[13];
              const wz = mat[2] * x + mat[6] * y + mat[10] * z + mat[14];

              minX = Math.min(minX, wx); maxX = Math.max(maxX, wx);
              minY = Math.min(minY, wy); maxY = Math.max(maxY, wy);
              minZ = Math.min(minZ, wz); maxZ = Math.max(maxZ, wz);
            }

            api.Dispose();
          }

          // Determinamos dimensiones e inicio/fin 2D
          const dx = maxX - minX;
          const dy = maxY - minY;
          const dz = maxZ - minZ;

          if (largo_m === null || alto_m === null) {
            metodo_extraccion = 'bounding_box';
            advertencias.push('Dimensiones extraídas desde bounding box (sin Quantity Sets en el modelo).');
            alto_m = dz;
            if (dx >= dy) {
              largo_m = dx;
              espesor_m = dy;
            } else {
              largo_m = dy;
              espesor_m = dx;
            }
          }

          if (dx >= dy) {
            startX = minX;
            startY = (minY + maxY) / 2;
            endX = maxX;
            endY = (minY + maxY) / 2;
          } else {
            startX = (minX + maxX) / 2;
            startY = minY;
            endX = (minX + maxX) / 2;
            endY = maxY;
          }
        }
      } catch (geoErr) {
        advertencias.push(`Error al extraer geometría espacial: ${geoErr}`);
      }

      // ----- Lectura del nombre del muro -----
      let nombre: string | undefined;
      try {
        const wall = api.GetLine(modelID, expressId) as { Name?: { value: string } };
        nombre = wall.Name?.value;
      } catch { /* sin nombre */ }

      // ----- Validación y filtros -----
      if (largo_m === null || alto_m === null) {
        advertencias.push('No se pudieron determinar las dimensiones. Muro omitido.');
        continue;
      }

      if (alto_m < altoMinimo) continue; // Filtrar zócalos/parapetos bajos
      if (largo_m < largoMinimo) continue; // Filtrar muros insignificantes

      const muro: MuroIFC = {
        expressId,
        nombre,
        largo_m: Math.round(largo_m * 100) / 100,
        alto_m: Math.round(alto_m * 100) / 100,
        espesor_m: espesor_m !== null ? Math.round(espesor_m * 1000) / 1000 : undefined,
        aberturas: [], // Se completa en openings.ts
        metodo_extraccion,
        advertencias,
        startX: startX !== undefined ? Math.round(startX * 1000) / 1000 : undefined,
        startY: startY !== undefined ? Math.round(startY * 1000) / 1000 : undefined,
        endX: endX !== undefined ? Math.round(endX * 1000) / 1000 : undefined,
        endY: endY !== undefined ? Math.round(endY * 1000) / 1000 : undefined,
        // Asignamos el piso desde el storeyMap si está disponible
        storey: storeyMap?.get(expressId),
      };
      muros.push(muro);
    }
  }

  return muros;
}
