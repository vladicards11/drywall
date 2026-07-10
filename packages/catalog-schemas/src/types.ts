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
  tipo: "puerta" | "ventana" | "pase";
  ancho_m: number;
  alto_m: number;
  distancia_desde_inicio_m: number;
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

export interface Proyecto {
  proyecto: string;
  catalogo: string;
  elementos: Muro[];
  uniones: Union[];
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
  placas: { cantidad_total: number; detalle: PlacaRect[] };
  perfiles: ResultadoPerfiles;
  tornillos: ResultadoTornillos;
  cinta: { ml_total: number; rollos: number };
  masilla: { kg_total: number; bolsas: number };
  aislante: { m2: number; paquetes: number };
  esquineros: { ml_total: number };
  trazabilidad: string[];
}

export interface ResultadoProyecto {
  proyecto: string;
  muros: ResultadoMuro[];
  totales: {
    placas: { cantidad_total: number };
    perfiles: ResultadoPerfiles;
    tornillos: ResultadoTornillos;
    cinta: { ml_total: number; rollos: number };
    masilla: { kg_total: number; bolsas: number };
    aislante: { m2: number; paquetes: number };
    esquineros: { ml_total: number };
  };
}
