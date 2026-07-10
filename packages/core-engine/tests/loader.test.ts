import { describe, it, expect } from "vitest";
import { obtenerCatalogoGenericoEstandar, cargarCatalogo, CatalogoInvalidoError } from "@drywall-calc/catalog-schemas";

describe("catalog loader tests", () => {
  it("should load the standard generic catalog successfully", () => {
    const catalogo = obtenerCatalogoGenericoEstandar();
    expect(catalogo.sistema).toBe("generico_estandar");
    expect(catalogo.perfiles.montante.length).toBeGreaterThan(0);
  });

  it("should throw CatalogoInvalidoError on invalid catalog data", () => {
    const invalidData = {
      sistema: "broken",
      perfiles: {
        montante: [],
        riel: [],
        separacion_montante_m_default: 0.40,
        // missing separaciones_permitidas_m
      }
    };

    expect(() => cargarCatalogo(invalidData)).toThrow(CatalogoInvalidoError);
  });
});
