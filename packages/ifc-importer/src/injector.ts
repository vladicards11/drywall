import * as WebIFC from 'web-ifc';

export interface InjectorElement {
  tipo: 'parante' | 'placa';
  nombre: string;
  largo_m?: number;
  alto_m?: number;
  espesor_mm?: number;
}

export interface WallInjectionData {
  muroId: string;
  elementos: InjectorElement[];
}

/**
 * Genera un GUID IFC compatible (22 caracteres de base64 modificado).
 */
function generateGUID(): string {
  const chars = '0123456789ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz_$';
  let guid = '';
  for (let i = 0; i < 22; i++) {
    guid += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return guid;
}

/**
 * Inyecta elementos de perfilería (IfcMember) y placas (IfcPlate) en un archivo IFC original.
 * @param buffer - Buffer del archivo IFC original.
 * @param murosData - Datos de los elementos a inyectar por muro.
 * @param wasmPath - Ruta del WASM de web-ifc.
 */
export async function inyectarEstructuraDrywall(
  buffer: ArrayBuffer,
  murosData: WallInjectionData[],
  wasmPath = '/web-ifc/'
): Promise<Uint8Array> {
  const api = new WebIFC.IfcAPI();
  api.SetWasmPath(wasmPath, true);
  await api.Init();

  const uint8 = new Uint8Array(buffer);
  const modelID = api.OpenModel(uint8, {
    COORDINATE_TO_ORIGIN: true,
  });

  try {
    // 1. Obtener el primer IfcBuildingStorey para asociar los nuevos elementos
    const storeys = api.GetLineIDsWithType(modelID, WebIFC.IFCBUILDINGSTOREY);
    const firstStoreyID = storeys.size() > 0 ? storeys.get(0) : null;
    
    // Buscar o crear la relación IfcRelContainedInSpatialStructure para el storey
    let relSpatialID: number | null = null;
    if (firstStoreyID !== null) {
      const rels = api.GetLineIDsWithType(modelID, WebIFC.IFCRELCONTAINEDINSPATIALSTRUCTURE);
      for (let i = 0; i < rels.size(); i++) {
        const relID = rels.get(i);
        const relObj = api.GetLine(modelID, relID);
        if (relObj && relObj.RelatingStructure && relObj.RelatingStructure.value === firstStoreyID) {
          relSpatialID = relID;
          break;
        }
      }
    }

    const newElementIDs: number[] = [];

    // 2. Por cada muro y sus elementos calculados, crear las entidades
    for (const muro of murosData) {
      for (const el of muro.elementos) {
        const isParante = el.tipo === 'parante';
        const entityType = isParante ? WebIFC.IFCMEMBER : WebIFC.IFCPLATE;

        // Crear el GUID del elemento
        const guid = generateGUID();
        
        // Atributos básicos para IfcMember / IfcPlate:
        // [GlobalId, OwnerHistory, Name, Description, ObjectType, ObjectPlacement, Representation, Tag]
        const entityObj = api.CreateIfcEntity(modelID, entityType,
          guid,                  // GlobalId (IfcGloballyUniqueId)
          null,                  // OwnerHistory
          { type: 1, value: el.nombre }, // Name (IfcLabel)
          { type: 1, value: `Elemento Drywall inyectado para Muro ${muro.muroId}` }, // Description (IfcText)
          { type: 1, value: isParante ? 'PARANTE' : 'PLACA_YESO' }, // ObjectType
          null,                  // ObjectPlacement
          null,                  // Representation
          { type: 1, value: isParante ? 'STRUCTURAL' : 'FINISH' } // Tag
        );

        api.WriteLine(modelID, entityObj);
        newElementIDs.push(entityObj.expressID);
      }
    }

    // 3. Vincular los nuevos elementos a la estructura espacial
    if (firstStoreyID !== null && newElementIDs.length > 0) {
      if (relSpatialID !== null) {
        const relObj = api.GetLine(modelID, relSpatialID);
        if (relObj && relObj.RelatedElements) {
          const currentElements = relObj.RelatedElements.map((ref: any) => ref.value);
          const updatedElements = [...currentElements, ...newElementIDs].map(id => ({ type: 5, value: id }));
          relObj.RelatedElements = updatedElements;
          api.WriteLine(modelID, relObj);
        }
      } else {
        // Crear una nueva relación IfcRelContainedInSpatialStructure
        const relGuid = generateGUID();
        const newRelObj = api.CreateIfcEntity(modelID, WebIFC.IFCRELCONTAINEDINSPATIALSTRUCTURE,
          relGuid, // GlobalId
          null,    // OwnerHistory
          { type: 1, value: 'DrywallContainer' },
          { type: 1, value: 'Contenedor de elementos drywall calculados' },
          newElementIDs.map(id => ({ type: 5, value: id })), // RelatedElements
          { type: 5, value: firstStoreyID } // RelatingStructure
        );
        api.WriteLine(modelID, newRelObj);
      }
    }

    // 4. Exportar el archivo
    const modifiedData = api.SaveModel(modelID);
    api.CloseModel(modelID);
    return modifiedData;
  } catch (err) {
    api.CloseModel(modelID);
    throw err;
  }
}
