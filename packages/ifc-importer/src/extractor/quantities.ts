/**
 * quantities.ts
 * Extracción semántica de dimensiones de muros usando IfcElementQuantity
 * (método preferido — más rápido y preciso que bounding box cuando está disponible).
 */

import * as WebIFC from 'web-ifc';

/**
 * Resultado de la extracción semántica de un muro.
 */
export interface QuantitySetResult {
  largo_m: number | null;
  alto_m: number | null;
  espesor_m: number | null;
}

/**
 * Intenta extraer largo, alto y espesor desde los Quantity Sets del muro.
 * Busca en Qto_WallBaseQuantities los valores de Length, Height y Width.
 *
 * @param api - Instancia de IfcAPI inicializada
 * @param modelID - ID del modelo cargado
 * @param wallExpressId - Express ID del muro
 * @returns Dimensiones en metros, o null por cada campo si no está disponible
 */
export function extractWallQuantities(
  api: WebIFC.IfcAPI,
  modelID: number,
  wallExpressId: number
): QuantitySetResult {
  const result: QuantitySetResult = {
    largo_m: null,
    alto_m: null,
    espesor_m: null,
  };

  try {
    // Recorremos las relaciones IfcRelDefinesByProperties del muro
    const rels = api.GetLineIDsWithType(modelID, WebIFC.IFCRELDEFINESBYPROPERTIES);

    for (let i = 0; i < rels.size(); i++) {
      const relId = rels.get(i);
      const rel = api.GetLine(modelID, relId) as {
        RelatedObjects?: { value: number }[];
        RelatingPropertyDefinition?: { value: number };
      };

      if (!rel.RelatedObjects || !rel.RelatingPropertyDefinition) continue;

      // Verificamos que este IfcRelDefines apunta al muro que nos interesa
      const isForThisWall = rel.RelatedObjects.some(
        (obj) => obj.value === wallExpressId
      );
      if (!isForThisWall) continue;

      // Leemos el PropertySet / ElementQuantity
      const qsId = rel.RelatingPropertyDefinition.value;
      const qs = api.GetLine(modelID, qsId) as {
        type?: number;
        Name?: { value: string };
        Quantities?: { value: number }[];
      };

      if (!qs.Quantities) continue;

      // Filtramos por nombre: Qto_WallBaseQuantities
      const qsName = qs.Name?.value ?? '';
      if (!qsName.includes('WallBase') && !qsName.includes('Qto_Wall')) continue;

      // Leemos cada IfcQuantityLength
      for (const qRef of qs.Quantities) {
        const q = api.GetLine(modelID, qRef.value) as {
          Name?: { value: string };
          LengthValue?: { value: number };
        };

        if (!q.Name || q.LengthValue === undefined) continue;

        const name = q.Name.value.toLowerCase();
        const val = q.LengthValue.value; // valor en metros (IFC usa SI)

        if (name === 'length') result.largo_m = val;
        else if (name === 'height') result.alto_m = val;
        else if (name === 'width') result.espesor_m = val;
      }
    }
  } catch {
    // Si hay error en la extracción semántica, devolvemos nulos y se usará bounding box
  }

  return result;
}
