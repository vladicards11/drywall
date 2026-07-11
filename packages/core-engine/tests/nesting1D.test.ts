import { describe, it, expect } from "vitest";
import { calcularNesting1D } from "../src/calculo/nesting1D.js";
import { Corte1D } from "@drywall-calc/catalog-schemas";

describe("Algoritmo de Nesting 1D", () => {
  it("debe manejar un listado de cortes vacío", () => {
    const res = calcularNesting1D([], 3.00);
    expect(res.cantidad_barras).toBe(0);
    expect(res.barras.length).toBe(0);
    expect(res.desperdicio_pct).toBe(0);
  });

  it("debe empaquetar tramos que caben en una sola barra", () => {
    const cortes: Corte1D[] = [
      { id: "c1", longitud_m: 1.20, descripcion: "Tramo A" },
      { id: "c2", longitud_m: 1.00, descripcion: "Tramo B" },
      { id: "c3", longitud_m: 0.80, descripcion: "Tramo C" },
    ];
    // 1.20 + 1.00 + 0.80 = 3.00m (exacto)
    const res = calcularNesting1D(cortes, 3.00, 0.0);
    expect(res.cantidad_barras).toBe(1);
    expect(res.desperdicio_lineal_m).toBe(0);
    expect(res.desperdicio_pct).toBe(0);
    expect(res.barras[0].cortes.length).toBe(3);
  });

  it("debe abrir nuevas barras cuando los tramos no caben", () => {
    const cortes: Corte1D[] = [
      { id: "c1", longitud_m: 2.20, descripcion: "Tramo A" },
      { id: "c2", longitud_m: 2.20, descripcion: "Tramo B" },
      { id: "c3", longitud_m: 1.00, descripcion: "Tramo C" },
    ];
    // Barra 1: 2.20m. Remanente = 0.80m. (No cabe el otro 2.20m, pero ¿cabe el de 1.00m? Tampoco)
    // Barra 2: 2.20m. Remanente = 0.80m.
    // Barra 3: 1.00m. Remanente = 2.00m.
    // O bien, con FFD (ordenados de mayor a menor):
    // 2.20 (Barra 1), 2.20 (Barra 2), 1.00 (Barra 1 no cabe, Barra 2 no cabe, Barra 3)
    const res = calcularNesting1D(cortes, 3.00, 0.0);
    expect(res.cantidad_barras).toBe(3);
    expect(res.longitud_total_cortes_m).toBe(5.40);
    expect(res.longitud_total_comercial_m).toBe(9.00);
    expect(res.desperdicio_lineal_m).toBe(3.60);
    expect(res.desperdicio_pct).toBe(40.00);
  });

  it("debe considerar el kerf de corte al empaquetar", () => {
    const cortes: Corte1D[] = [
      { id: "c1", longitud_m: 1.50, descripcion: "Tramo A" },
      { id: "c2", longitud_m: 1.50, descripcion: "Tramo B" },
    ];
    // 1.50 + 1.50 = 3.00m.
    // Sin kerf (0.0): cabe en 1 barra.
    // Con kerf (0.003): 1.50 + 1.50 + 0.003 = 3.003 > 3.00 -> ocupa 2 barras.
    const resSinKerf = calcularNesting1D(cortes, 3.00, 0.0);
    expect(resSinKerf.cantidad_barras).toBe(1);

    const resConKerf = calcularNesting1D(cortes, 3.00, 0.003);
    expect(resConKerf.cantidad_barras).toBe(2);
  });
});
