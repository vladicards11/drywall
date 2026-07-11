import { z } from "zod";
import { Proyecto, Muro, Union, Abertura, Ambiente, Cielorraso, Cenefa } from "./types.js";

export const AberturaSchema: z.ZodType<Abertura> = z.object({
  tipo: z.enum(["puerta", "ventana", "pase", "hornacina"]),
  ancho_m: z.number().positive(),
  alto_m: z.number().positive(),
  distancia_desde_inicio_m: z.number().nonnegative(),
  profundidad_m: z.number().positive().optional(),
  altura_desde_piso_m: z.number().nonnegative().optional(),
}).refine(
  (a) => {
    if (a.tipo === "hornacina") {
      return a.profundidad_m !== undefined && a.altura_desde_piso_m !== undefined;
    }
    return true;
  },
  {
    message: "Si la abertura es de tipo hornacina, se requieren las propiedades profundidad_m y altura_desde_piso_m",
  }
);

export const MuroSchema: z.ZodType<Muro> = z.object({
  id: z.string(),
  geometria: z.object({
    largo_m: z.number().positive(),
    alto_m: z.number().positive(),
  }),
  sistema: z.object({
    estructura: z.enum(["simple", "doble"]),
    caras: z.union([z.literal(1), z.literal(2)]),
    capas_por_cara: z.number().int().positive(),
    perfil: z.string(),
    riel: z.string(),
    separacion_montante_m: z.number().positive(),
  }),
  placa: z.object({
    tipo: z.string(),
    espesor_mm: z.number().positive(),
    formato_m: z.tuple([z.number().positive(), z.number().positive()]),
    orientacion: z.enum(["vertical", "horizontal"]),
  }),
  aislante: z.object({
    tipo: z.string(),
    espesor_mm: z.number().positive(),
  }).optional(),
  aberturas: z.array(AberturaSchema),
  encuentros: z.array(z.string()),
}).refine(
  (muro) =>
    muro.aberturas.every(
      (a) => a.distancia_desde_inicio_m + a.ancho_m <= muro.geometria.largo_m
    ),
  { message: "Una abertura no puede sobresalir del largo del muro" }
).refine(
  (muro) =>
    muro.aberturas.every((a) => a.alto_m <= muro.geometria.alto_m),
  { message: "Una abertura no puede sobresalir del alto del muro" }
).refine(
  (muro) => {
    const abs = muro.aberturas;
    for (let i = 0; i < abs.length; i++) {
      for (let j = i + 1; j < abs.length; j++) {
        const a1 = abs[i];
        const a2 = abs[j];
        const start = Math.max(a1.distancia_desde_inicio_m, a2.distancia_desde_inicio_m);
        const end = Math.min(a1.distancia_desde_inicio_m + a1.ancho_m, a2.distancia_desde_inicio_m + a2.ancho_m);
        if (start < end - 1e-9) {
          return false;
        }
      }
    }
    return true;
  },
  { message: "Las aberturas no pueden superponerse entre sí" }
);

export const UnionSchema: z.ZodType<Union> = z.object({
  id: z.string(),
  muros_conectados: z.array(z.string()),
  angulo_grados: z.number(),
  tipo_union: z.string(),
  config_modulacion: z.object({
    resetear_perfiles: z.boolean(),
    perfiles_simetricos: z.boolean(),
  }),
});

export const AmbienteSchema: z.ZodType<Ambiente> = z.object({
  id: z.string(),
  nombre: z.string(),
  muros: z.array(z.string()),
});

export const CielorrasoSchema: z.ZodType<Cielorraso> = z.object({
  id: z.string(),
  geometria: z.object({
    largo_m: z.number().positive(),
    ancho_m: z.number().positive(),
  }),
  sistema: z.object({
    tipo_estructura: z.enum(["omega", "suspendido"]),
    perfil_secundario: z.string(),
    perfil_principal: z.string().optional(),
    perfil_perimetral: z.string(),
    separacion_secundario_m: z.number().positive(),
    separacion_principal_m: z.number().positive().optional(),
    distancia_cuelgue_m: z.number().positive().optional(),
    altura_suspension_m: z.number().nonnegative(),
  }),
  placa: z.object({
    tipo: z.string(),
    espesor_mm: z.number().positive(),
    formato_m: z.tuple([z.number().positive(), z.number().positive()]),
    orientacion: z.enum(["vertical", "horizontal"]),
  }),
  aislante: z.object({
    tipo: z.string(),
    espesor_mm: z.number().positive(),
  }).optional(),
}).refine(
  (cie) => {
    if (cie.sistema.tipo_estructura === "suspendido") {
      return (
        cie.sistema.perfil_principal !== undefined &&
        cie.sistema.separacion_principal_m !== undefined &&
        cie.sistema.distancia_cuelgue_m !== undefined
      );
    }
    return true;
  },
  {
    message:
      "Si la estructura es suspendida, se deben definir perfil_principal, separacion_principal_m y distancia_cuelgue_m",
  }
);

export const CenefaSchema: z.ZodType<Cenefa> = z.object({
  id: z.string(),
  tipo: z.enum(["adosada", "isla"]),
  geometria: z.object({
    longitud_m: z.number().positive(),
    ancho_cajon_m: z.number().positive(),
    alto_cajon_m: z.number().positive(),
    aleta_luz_m: z.number().nonnegative(),
  }),
  sistema: z.object({
    perfil_secundario: z.string(),
    perfil_perimetral: z.string(),
    separacion_secundario_m: z.number().positive(),
  }),
  placa: z.object({
    tipo: z.string(),
    espesor_mm: z.number().positive(),
    formato_m: z.tuple([z.number().positive(), z.number().positive()]),
  }),
});

export const ProyectoSchema: z.ZodType<Proyecto> = z.object({
  proyecto: z.string(),
  catalogo: z.string(),
  elementos: z.array(MuroSchema),
  uniones: z.array(UnionSchema),
  ambientes: z.array(AmbienteSchema).optional(),
  cielorrasos: z.array(CielorrasoSchema).optional(),
  cenefas: z.array(CenefaSchema).optional(),
});
