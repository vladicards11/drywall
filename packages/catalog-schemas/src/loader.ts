import { Catalogo } from "./types.js";
import { CatalogoSchema } from "./catalogoSchema.js";
import genericoEstandar from "./catalogos/generico_estandar.json" with { type: "json" };
import gyplacSuperboard from "./catalogos/gyplac_superboard.json" with { type: "json" };
import tupemesaPrecor from "./catalogos/tupemesa_precor.json" with { type: "json" };

export class CatalogoInvalidoError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "CatalogoInvalidoError";
  }
}

export function cargarCatalogo(data: unknown): Catalogo {
  const result = CatalogoSchema.safeParse(data);
  if (!result.success) {
    throw new CatalogoInvalidoError(
      `El catálogo es inválido: ${result.error.message}`
    );
  }
  return result.data;
}

export const CATALOGOS_REGISTRY: Record<string, unknown> = {
  generico_estandar: genericoEstandar,
  gyplac_superboard: gyplacSuperboard,
  tupemesa_precor: tupemesaPrecor,
};

export function obtenerCatalogo(sistema: string): Catalogo {
  const data = CATALOGOS_REGISTRY[sistema];
  if (!data) {
    throw new Error(`Catálogo no encontrado: ${sistema}`);
  }
  return cargarCatalogo(data);
}

export function obtenerCatalogoGenericoEstandar(): Catalogo {
  return cargarCatalogo(genericoEstandar);
}
