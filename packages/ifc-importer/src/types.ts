/**
 * Tipos internos del paquete ifc-importer.
 * Son las representaciones intermedias entre el IFC crudo y los tipos del motor de cálculo.
 */

/** Tipos de abertura inferibles desde el IFC */
export type TipoAbertura = 'puerta' | 'ventana' | 'pase';

/** Representación intermedia de una abertura extraída del IFC */
export interface AberturaIFC {
  /** Express ID del IfcOpeningElement */
  expressId: number;
  /** Ancho de la abertura en metros */
  ancho_m: number;
  /** Alto de la abertura en metros */
  alto_m: number;
  /** Posición X del lado izquierdo de la abertura a lo largo del muro (metros desde el extremo) */
  posicion_x_m: number;
  /** Tipo inferido: puerta, ventana o vano genérico */
  tipo: TipoAbertura;
  /** Confianza de la detección: 'seguro' = datos IFC directos, 'estimado' = inferido */
  confianza: 'seguro' | 'estimado';
}

/** Representación intermedia de un muro extraído del IFC */
export interface MuroIFC {
  /** Express ID del IfcWall o IfcWallStandardCase */
  expressId: number;
  /** Nombre/etiqueta del muro en el modelo IFC (si existe) */
  nombre?: string;
  /** Largo del muro en metros */
  largo_m: number;
  /** Alto del muro en metros */
  alto_m: number;
  /** Espesor del muro en metros (puede no estar disponible) */
  espesor_m?: number;
  /** Lista de aberturas dentro de este muro */
  aberturas: AberturaIFC[];
  /** Cómo se obtuvieron las dimensiones */
  metodo_extraccion: 'quantity_sets' | 'bounding_box';
  /** Advertencias del parser para este muro (datos ambiguos o faltantes) */
  advertencias: string[];
  /** Coordenadas 2D espaciales del eje del muro (opcionales, para detectar uniones) */
  startX?: number;
  startY?: number;
  endX?: number;
  endY?: number;
  /**
   * Nombre del piso/nivel arquitectónico (IfcBuildingStorey) al que pertenece el muro.
   * Extraído desde IfcRelContainedInSpatialStructure. Undefined si el modelo no lo define.
   */
  storey?: string;
}

/** Representación intermedia de una unión espacial de muros detectada */
export interface UnionIFC {
  id: string;
  muros_conectados: [number, number]; // Express IDs de los dos muros conectados
  angulo_grados: number;
  tipo_union: string; // 'L' (Esquina) o 'T' (Encuentro en T) o 'X'
}

/** Resultado completo de parsear un archivo IFC */
export interface IfcImportResult {
  /** Nombre del archivo importado */
  nombreArchivo: string;
  /** Versión del esquema IFC detectada (IFC2X3, IFC4, etc.) */
  schemaVersion: string;
  /** Nombre del proyecto IFC (si existe en IfcProject) */
  nombreProyecto?: string;
  /** Lista de muros extraídos */
  muros: MuroIFC[];
  /** Lista de uniones detectadas espacialmente */
  uniones: UnionIFC[];
  /** Advertencias globales del parseo */
  advertencias: string[];
  /** Errores no fatales encontrados durante el parseo */
  errores: string[];
}

/** Opciones de configuración del parser */
export interface IfcParserOptions {
  /**
   * Si true, usa bounding box como fallback cuando no hay quantity sets.
   * Default: true
   */
  usarBoundingBoxFallback?: boolean;
  /**
   * Alto mínimo de muro para considerarlo válido (filtrar muros de zócalos, etc.)
   * Default: 0.5 (metros)
   */
  altoMinimo_m?: number;
  /**
   * Largo mínimo de muro para considerarlo válido
   * Default: 0.1 (metros)
   */
  largoMinimo_m?: number;
}
