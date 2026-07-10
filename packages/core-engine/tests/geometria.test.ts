import { describe, it, expect } from "vitest";
import { interseccion, contieneCompletamente, area, Rect } from "../src/utils/geometria.js";

describe("geometria rect tests", () => {
  it("should calculate correct area", () => {
    const r: Rect = { x: 0, y: 0, ancho: 1.20, alto: 2.40 };
    expect(area(r)).toBeCloseTo(2.88, 5);
  });

  it("should find overlap intersection", () => {
    const r1: Rect = { x: 0, y: 0, ancho: 2.0, alto: 2.0 };
    const r2: Rect = { x: 1.0, y: 1.0, ancho: 2.0, alto: 2.0 };
    const inter = interseccion(r1, r2);
    expect(inter).not.toBeNull();
    expect(inter!.x).toBe(1.0);
    expect(inter!.y).toBe(1.0);
    expect(inter!.ancho).toBe(1.0);
    expect(inter!.alto).toBe(1.0);
  });

  it("should return null for touching rects at borders", () => {
    const r1: Rect = { x: 0, y: 0, ancho: 1.20, alto: 2.40 };
    const r2: Rect = { x: 1.20, y: 0, ancho: 1.20, alto: 2.40 }; // touches r1 at right border
    expect(interseccion(r1, r2)).toBeNull();

    const r3: Rect = { x: 0, y: 2.40, ancho: 1.20, alto: 2.40 }; // touches r1 at top border
    expect(interseccion(r1, r3)).toBeNull();
  });

  it("should check contains correctly", () => {
    const contenedor: Rect = { x: 0, y: 0, ancho: 5.0, alto: 5.0 };
    const contenidoInside: Rect = { x: 1.0, y: 1.0, ancho: 2.0, alto: 2.0 };
    const contenidoBorder: Rect = { x: 0, y: 0, ancho: 5.0, alto: 5.0 };
    const contenidoOutside: Rect = { x: 4.0, y: 4.0, ancho: 2.0, alto: 2.0 };

    expect(contieneCompletamente(contenedor, contenidoInside)).toBe(true);
    expect(contieneCompletamente(contenedor, contenidoBorder)).toBe(true);
    expect(contieneCompletamente(contenedor, contenidoOutside)).toBe(false);
  });
});
