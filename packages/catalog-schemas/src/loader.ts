import { Catalogo } from "./types.js";
import { CatalogoSchema } from "./catalogoSchema.js";
import genericoEstandar from "./catalogos/generico_estandar.json" with { type: "json" };

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

export function obtenerCatalogoGenericoEstandar(): Catalogo {
  return cargarCatalogo(genericoEstandar);
}
