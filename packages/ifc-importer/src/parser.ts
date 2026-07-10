/**
 * parser.ts
 * Punto de entrada de web-ifc: inicialización WASM, carga del modelo,
 * orquestación de extractores y disposición de recursos.
 */

import * as WebIFC from 'web-ifc';
import type { IfcImportResult, IfcParserOptions } from './types.js';
import { extractWalls } from './extractor/walls.js';
import { assignOpeningsToWalls } from './extractor/openings.js';
import { detectarUniones } from './extractor/uniones.js';
import { buildStoreyMap } from './extractor/storeys.js';

/**
 * Ruta por defecto del archivo WASM.
 * En la web app con Vite, el archivo se copia a /public/web-ifc/ y se sirve desde ahí.
 */
const DEFAULT_WASM_PATH = '/web-ifc/';

let _api: WebIFC.IfcAPI | null = null;

/**
 * Inicializa (o reutiliza) la instancia de IfcAPI con el WASM cargado.
 * @param wasmPath - Ruta donde está el archivo web-ifc.wasm (default: /web-ifc/)
 */
async function getApi(wasmPath = DEFAULT_WASM_PATH): Promise<WebIFC.IfcAPI> {
  if (_api) return _api;

  const api = new WebIFC.IfcAPI();
  api.SetWasmPath(wasmPath, true);
  await api.Init();
  _api = api;
  return api;
}

/**
 * Libera la instancia de IfcAPI (útil en tests o cuando ya no se necesita).
 */
export function disposeParser(): void {
  _api = null;
}

/**
 * Parsea un archivo IFC en memoria y extrae todos los muros y sus aberturas.
 *
 * @param buffer - Contenido del archivo .ifc como ArrayBuffer
 * @param options - Opciones de configuración del parser
 * @param wasmPath - Ruta al directorio con web-ifc.wasm (solo para tests/custom deployments)
 * @returns Resultado del parseo con muros, aberturas, advertencias y errores
 */
export async function parseIFC(
  buffer: ArrayBuffer,
  options: IfcParserOptions = {},
  wasmPath?: string
): Promise<IfcImportResult> {
  const {
    usarBoundingBoxFallback = true,
    altoMinimo_m = 0.5,
    largoMinimo_m = 0.1,
  } = options;

  void usarBoundingBoxFallback; // El fallback está siempre activo en walls.ts

  const advertencias: string[] = [];
  const errores: string[] = [];

  let api: WebIFC.IfcAPI;
  try {
    api = await getApi(wasmPath);
  } catch (e) {
    return {
      nombreArchivo: '',
      schemaVersion: 'desconocida',
      muros: [],
      uniones: [],
      advertencias,
      errores: [`Error inicializando web-ifc WASM: ${e}`],
    };
  }

  const uint8 = new Uint8Array(buffer);
  let modelID: number;
  try {
    modelID = api.OpenModel(uint8, {
      COORDINATE_TO_ORIGIN: true,
    });
  } catch (e) {
    return {
      nombreArchivo: '',
      schemaVersion: 'desconocida',
      muros: [],
      uniones: [],
      advertencias,
      errores: [`Error al abrir el modelo IFC: ${e}`],
    };
  }

  // ---- Detectar schema y nombre del proyecto ----
  let schemaVersion = 'IFC4';
  let nombreProyecto: string | undefined;

  // Schema detection: se detecta desde el header del IFC cuando es posible
  // (no todas las versiones de web-ifc exponen GetFileSchema — usamos valor por defecto)

  try {
    const projectIds = api.GetLineIDsWithType(modelID, WebIFC.IFCPROJECT);
    if (projectIds.size() > 0) {
      const project = api.GetLine(modelID, projectIds.get(0)) as {
        Name?: { value: string };
        LongName?: { value: string };
      };
      nombreProyecto = project.LongName?.value ?? project.Name?.value;
    }
  } catch { /* no crítico */ }

  // ---- Extracción de pisos (IfcBuildingStorey) ----
  let storeyMap;
  try {
    storeyMap = buildStoreyMap(api, modelID);
    if (storeyMap.size > 0) {
      advertencias.push(`[INFO] Pisos detectados: ${[...new Set(storeyMap.values())].join(', ')}`);
    }
  } catch (e) {
    advertencias.push(`No se pudieron extraer los pisos del IFC (no crítico): ${e}`);
    storeyMap = new Map();
  }

  // ---- Extracción de muros ----
  let muros;
  try {
    muros = extractWalls(api, modelID, altoMinimo_m, largoMinimo_m, storeyMap);
  } catch (e) {
    errores.push(`Error extrayendo muros: ${e}`);
    api.CloseModel(modelID);
    return { nombreArchivo: '', schemaVersion, muros: [], uniones: [], advertencias, errores };
  }

  if (muros.length === 0) {
    advertencias.push('No se encontraron muros en el modelo IFC. Verificar que el archivo contiene IfcWall o IfcWallStandardCase.');
  }

  // ---- Asignación de aberturas ----
  try {
    assignOpeningsToWalls(api, modelID, muros);
  } catch (e) {
    advertencias.push(`Error parcial al extraer aberturas: ${e}`);
  }

  // ---- Detección de uniones ----
  let uniones: any[] = [];
  try {
    uniones = detectarUniones(muros);
  } catch (e) {
    advertencias.push(`Error al detectar uniones espaciales: ${e}`);
  }

  // ---- Cleanup ----
  api.CloseModel(modelID);

  return {
    nombreArchivo: '',
    schemaVersion,
    nombreProyecto,
    muros,
    uniones,
    advertencias,
    errores,
  };
}
