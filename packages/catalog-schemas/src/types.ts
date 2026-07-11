export interface CatalogoPerfil {
  codigo: string;
  ancho_mm: number;
  largo_barra_m: number;
  peso_kg_ml: number;
}

export interface CatalogoPlaca {
  tipo: string;
  nombre: string;
  espesor_mm: number;
  formatos_m: [number, number][];
  peso_kg_m2: number;
}

export interface TipologiaUnion {
  codigo: string;
  descripcion: string;
  n_muros_soportados: number;
  perfiles_adicionales: number;
  tratamiento_placa: "a_tope" | "envolvente";
  acabado: "cinta_papel" | "esquinero_metalico";
}

export interface Catalogo {
  sistema: string;
  perfiles: {
    montante: CatalogoPerfil[];
    riel: CatalogoPerfil[];
    omega?: CatalogoPerfil[];
    angular?: CatalogoPerfil[];
    separacion_montante_m_default: number;
    separaciones_permitidas_m: number[];
  };
  placas: CatalogoPlaca[];
  tornillos: {
    placa_perfil_por_m2: Record<string, number>;
    perfil_perfil_por_union: number;
    anclaje_losa_separacion_m: number;
  };
  cinta: {
    rendimiento_ml_por_rollo: number;
    factor_traslape: number;
    cantonera_incluida_en_esquinas_externas: boolean;
  };
  masilla: {
    kg_por_ml_por_mano: number;
    manos_estandar: number;
    presentacion_kg_por_bolsa: number;
  };
  aislante: {
    tipos: string[];
    espesores_mm_recomendados_por_ancho_perfil: Record<string, number>;
    presentacion_m2_por_paquete: number;
  };
  factor_desperdicio_placas_default: number;
  desfase_junta_vertical_min_m: number;
  tipologias_union: TipologiaUnion[];
}

export interface Abertura {
  tipo: "puerta" | "ventana" | "pase" | "hornacina";
  ancho_m: number;
  alto_m: number;
  distancia_desde_inicio_m: number;
  profundidad_m?: number;
  altura_desde_piso_m?: number;
}

export interface Muro {
  id: string;
  geometria: { largo_m: number; alto_m: number };
  sistema: {
    estructura: "simple" | "doble";
    caras: 1 | 2;
    capas_por_cara: number;
    perfil: string;
    riel: string;
    separacion_montante_m: number;
  };
  placa: {
    tipo: string;
    espesor_mm: number;
    formato_m: [number, number];
    orientacion: "vertical" | "horizontal";
  };
  aislante?: { tipo: string; espesor_mm: number };
  aberturas: Abertura[];
  encuentros: string[];
}

export interface Union {
  id: string;
  muros_conectados: string[];
  angulo_grados: number;
  tipo_union: string;
  config_modulacion: {
    resetear_perfiles: boolean;
    perfiles_simetricos: boolean;
  };
}

export interface Ambiente {
  id: string;
  nombre: string;
  muros: string[];
}

export interface Cielorraso {
  id: string;
  geometria: {
    largo_m: number;
    ancho_m: number;
  };
  sistema: {
    tipo_estructura: "omega" | "suspendido";
    perfil_secundario: string;
    perfil_principal?: string;
    perfil_perimetral: string;
    separacion_secundario_m: number;
    separacion_principal_m?: number;
    distancia_cuelgue_m?: number;
    altura_suspension_m: number;
  };
  placa: {
    tipo: string;
    espesor_mm: number;
    formato_m: [number, number];
    orientacion: "vertical" | "horizontal";
  };
  aislante?: {
    tipo: string;
    espesor_mm: number;
  };
}

export interface ResultadoCielorraso {
  cielorraso_id: string;
  placas: { cantidad_total: number; peso_total_kg: number; detalle: PlacaRect[] };
  perfiles: {
    secundarios_barras: number;
    principales_barras: number;
    perimetrales_barras: number;
  };
  colgadores: {
    cantidad_total: number;
    alambre_ml: number;
  };
  tornillos: {
    placa_perfil: number;
    perfil_perfil: number;
    anclajes_losa: number;
    anclajes_pared: number;
  };
  cinta: { ml_total: number; rollos: number };
  masilla: { kg_total: number; bolsas: number };
  aislante: { m2: number; paquetes: number };
  trazabilidad: string[];
  nesting_secundarios?: ResultadoNesting1D;
  nesting_principales?: ResultadoNesting1D;
  nesting_perimetrales?: ResultadoNesting1D;
}

export interface Cenefa {
  id: string;
  tipo: "adosada" | "isla";
  geometria: {
    longitud_m: number;
    ancho_cajon_m: number;
    alto_cajon_m: number;
    aleta_luz_m: number;
  };
  sistema: {
    perfil_secundario: string;
    perfil_perimetral: string;
    separacion_secundario_m: number;
  };
  placa: {
    tipo: string;
    espesor_mm: number;
    formato_m: [number, number];
  };
}

export interface ResultadoCenefa {
  cenefa_id: string;
  placas: { cantidad_total: number; peso_total_kg: number };
  perfiles: {
    secundarios_barras: number;
    perimetrales_barras: number;
  };
  tornillos: {
    placa_perfil: number;
    perfil_perfil: number;
    anclajes_losa: number;
    anclajes_pared: number;
  };
  cinta: { ml_total: number; rollos: number };
  masilla: { kg_total: number; bolsas: number };
  esquineros: { ml_total: number };
  trazabilidad: string[];
  nesting_secundarios?: ResultadoNesting1D;
  nesting_perimetrales?: ResultadoNesting1D;
  retazos_reutilizados?: Retazo2D[];
}

export interface Proyecto {
  proyecto: string;
  catalogo: string;
  elementos: Muro[];
  uniones: Union[];
  ambientes?: Ambiente[];
  cielorrasos?: Cielorraso[];
  cenefas?: Cenefa[];
}

export interface Retazo2D {
  id: string;
  ancho_m: number;
  alto_m: number;
  placa_tipo: string;
  espesor_mm: number;
  origen_elemento_id: string;
}

export interface PlacaRect {
  id: string;
  x: number;
  y: number;
  ancho: number;
  alto: number;
  cara: "A" | "B";
  capa: number;
  recortada: boolean;
  anguloCorte?: number;
  corteL?: boolean;
  esRetazoReutilizado?: boolean;
  retazoOrigenId?: string;
}

export interface Corte1D {
  id: string;
  longitud_m: number;
  descripcion: string;
}

export interface Barra1D {
  id: number;
  cortes: Corte1D[];
  longitud_usada_m: number;
  remanente_m: number;
}

export interface ResultadoNesting1D {
  barras: Barra1D[];
  cantidad_barras: number;
  longitud_total_cortes_m: number;
  longitud_total_comercial_m: number;
  desperdicio_lineal_m: number;
  desperdicio_pct: number;
}

export interface JuntaSegmento {
  orientacion: "vertical" | "horizontal";
  coordenada_fija: number;
  inicio: number;
  fin: number;
  longitud: number;
  cara: "A" | "B";
  capa: number;
}

export interface ResultadoPerfiles {
  montantes: number;
  rieles_barras: number;
  montantes_refuerzo_vanos: number;
  montantes_union: number;
  nesting_montantes?: ResultadoNesting1D;
  nesting_rieles?: ResultadoNesting1D;
}

export interface ResultadoTornillos {
  placa_perfil: number;
  perfil_perfil: number;
  anclajes_losa: number;
}

export interface ResultadoCintaMasilla {
  cinta: { ml_total: number; rollos: number };
  masilla: { kg_total: number; bolsas: number };
}

export interface ResultadoMuro {
  muro_id: string;
  placas: { cantidad_total: number; peso_total_kg: number; detalle: PlacaRect[] };
  perfiles: ResultadoPerfiles;
  tornillos: ResultadoTornillos;
  cinta: { ml_total: number; rollos: number };
  masilla: { kg_total: number; bolsas: number };
  aislante: { m2: number; paquetes: number };
  esquineros: { ml_total: number };
  trazabilidad: string[];
  retazos_generados?: Retazo2D[];
  retazos_reutilizados?: Retazo2D[];
}

export interface ResultadoAmbiente {
  ambiente_id: string;
  nombre: string;
  totales: {
    placas: { cantidad_total: number; peso_total_kg: number };
    perfiles: ResultadoPerfiles;
    tornillos: ResultadoTornillos;
    cinta: { ml_total: number; rollos: number };
    masilla: { kg_total: number; bolsas: number };
    aislante: { m2: number; paquetes: number };
    esquineros: { ml_total: number };
  };
  muros: ResultadoMuro[];
}

export interface ResultadoProyecto {
  proyecto: string;
  muros: ResultadoMuro[];
  cielorrasos?: ResultadoCielorraso[];
  cenefas?: ResultadoCenefa[];
  retazos_disponibles?: Retazo2D[];
  retazos_reutilizados?: Retazo2D[];
  totales: {
    placas: { cantidad_total: number; peso_total_kg: number };
    perfiles: ResultadoPerfiles;
    tornillos: ResultadoTornillos;
    cinta: { ml_total: number; rollos: number };
    masilla: { kg_total: number; bolsas: number };
    aislante: { m2: number; paquetes: number };
    esquineros: { ml_total: number };
    cielorraso?: {
      secundarios: number;
      principales: number;
      perimetrales: number;
      colgadores: number;
      alambre_ml: number;
    };
    cenefa?: {
      secundarios: number;
      perimetrales: number;
      esquineros_ml: number;
    };
  };
  por_ambiente?: ResultadoAmbiente[];
}
