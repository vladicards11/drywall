import { z } from "zod";
import { Catalogo, CatalogoPerfil, CatalogoPlaca, TipologiaUnion } from "./types.js";

export const CatalogoPerfilSchema: z.ZodType<CatalogoPerfil> = z.object({
  codigo: z.string(),
  ancho_mm: z.number().positive(),
  largo_barra_m: z.number().positive(),
  peso_kg_ml: z.number().positive(),
});

export const CatalogoPlacaSchema: z.ZodType<CatalogoPlaca> = z.object({
  tipo: z.string(),
  nombre: z.string(),
  espesor_mm: z.number().positive(),
  formatos_m: z.array(z.tuple([z.number().positive(), z.number().positive()])),
  peso_kg_m2: z.number().positive(),
});

export const TipologiaUnionSchema: z.ZodType<TipologiaUnion> = z.object({
  codigo: z.string(),
  descripcion: z.string(),
  n_muros_soportados: z.number().int().positive(),
  perfiles_adicionales: z.number().int().nonnegative(),
  tratamiento_placa: z.enum(["a_tope", "envolvente"]),
  acabado: z.enum(["cinta_papel", "esquinero_metalico"]),
});

export const CatalogoSchema: z.ZodType<Catalogo> = z.object({
  sistema: z.string(),
  perfiles: z.object({
    montante: z.array(CatalogoPerfilSchema),
    riel: z.array(CatalogoPerfilSchema),
    separacion_montante_m_default: z.number().positive(),
    separaciones_permitidas_m: z.array(z.number().positive()),
  }),
  placas: z.array(CatalogoPlacaSchema),
  tornillos: z.object({
    placa_perfil_por_m2: z.record(z.string(), z.number().positive()),
    perfil_perfil_por_union: z.number().nonnegative(),
    anclaje_losa_separacion_m: z.number().positive(),
  }),
  cinta: z.object({
    rendimiento_ml_por_rollo: z.number().positive(),
    factor_traslape: z.number().positive(),
    cantonera_incluida_en_esquinas_externas: z.boolean(),
  }),
  masilla: z.object({
    kg_por_ml_por_mano: z.number().positive(),
    manos_estandar: z.number().int().positive(),
    presentacion_kg_por_bolsa: z.number().positive(),
  }),
  aislante: z.object({
    tipos: z.array(z.string()),
    espesores_mm_recomendados_por_ancho_perfil: z.record(z.string(), z.number().positive()),
    presentacion_m2_por_paquete: z.number().positive(),
  }),
  factor_desperdicio_placas_default: z.number().nonnegative(),
  desfase_junta_vertical_min_m: z.number().nonnegative(),
  tipologias_union: z.array(TipologiaUnionSchema),
});
