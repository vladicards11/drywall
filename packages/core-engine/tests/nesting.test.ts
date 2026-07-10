import { describe, it, expect } from "vitest";
import { generarGrillaPlacas } from "../src/nesting/generarGrillaPlacas.js";
import { aplicarAberturas } from "../src/nesting/aplicarAberturas.js";
import { extraerJuntas } from "../src/nesting/extraerJuntas.js";

describe("generarGrillaPlacas tests", () => {
  it("3.1: Caso A - Vertical, sin aberturas ni uniones", () => {
    const plates = generarGrillaPlacas({
      largo_m: 4.00,
      alto_m: 2.40,
      formato_m: [1.20, 2.40],
      orientacion: "vertical",
      cara: "A",
      capa: 1,
    });

    expect(plates.length).toBe(4);
    // Plates should be ordered:
    // Placa 1: [0, 1.20]
    // Placa 2: [1.20, 2.40]
    // Placa 3: [2.40, 3.60]
    // Placa 4: [3.60, 4.00]
    expect(plates[0].x).toBeCloseTo(0);
    expect(plates[0].ancho).toBeCloseTo(1.20);
    expect(plates[0].recortada).toBe(false);

    expect(plates[3].x).toBeCloseTo(3.60);
    expect(plates[3].ancho).toBeCloseTo(0.40);
    expect(plates[3].recortada).toBe(true);
  });

  it("3.2: Horizontal orientation with staggering (patrón de aparejo)", () => {
    // Muro 4.20m largo, 2.40m alto. Placa 1.20 x 2.40.
    // En horizontal, alto_placa = 1.20, ancho_placa = 2.40.
    // 2 hiladas (j=0, j=1).
    const plates = generarGrillaPlacas({
      largo_m: 4.20,
      alto_m: 2.40,
      formato_m: [1.20, 2.40],
      orientacion: "horizontal",
      cara: "A",
      capa: 1,
    });

    // Hilada 0 (y=0):
    // Plate 1: [0, 2.40]
    // Plate 2: [2.40, 4.20]
    const row0 = plates.filter((p) => p.y === 0);
    expect(row0.length).toBe(2);
    expect(row0[0].x).toBeCloseTo(0);
    expect(row0[0].ancho).toBeCloseTo(2.40);
    expect(row0[1].x).toBeCloseTo(2.40);
    expect(row0[1].ancho).toBeCloseTo(1.80);

    // Hilada 1 (y=1.20), staggered by 1.20:
    // Plate 1: [0, 1.20]
    // Plate 2: [1.20, 3.60]
    // Plate 3: [3.60, 4.20]
    const row1 = plates.filter((p) => p.y === 1.20);
    expect(row1.length).toBe(3);
    expect(row1[0].x).toBeCloseTo(0);
    expect(row1[0].ancho).toBeCloseTo(1.20);
    expect(row1[1].x).toBeCloseTo(1.20);
    expect(row1[1].ancho).toBeCloseTo(2.40);
    expect(row1[2].x).toBeCloseTo(3.60);
    expect(row1[2].ancho).toBeCloseTo(0.60);
  });

  it("3.3: Simetrico = true", () => {
    // Muro 4.20m, Placa 1.20 x 2.40 vertical.
    // Recorte total = 4.20 % 1.20 = 0.60.
    // Al ser simétrico, se divide en 0.30 a cada extremo.
    const plates = generarGrillaPlacas({
      largo_m: 4.20,
      alto_m: 2.40,
      formato_m: [1.20, 2.40],
      orientacion: "vertical",
      simetrico: true,
      cara: "A",
      capa: 1,
    });

    expect(plates.length).toBe(5);
    // Plates:
    // P0: [0, 0.30] (width 0.30)
    // P1: [0.30, 1.50] (width 1.20)
    // P2: [1.50, 2.70] (width 1.20)
    // P3: [2.70, 3.90] (width 1.20)
    // P4: [3.90, 4.20] (width 0.30)
    expect(plates[0].x).toBeCloseTo(0);
    expect(plates[0].ancho).toBeCloseTo(0.30);
    expect(plates[0].recortada).toBe(true);

    expect(plates[1].x).toBeCloseTo(0.30);
    expect(plates[1].ancho).toBeCloseTo(1.20);
    expect(plates[1].recortada).toBe(false);

    expect(plates[4].x).toBeCloseTo(3.90);
    expect(plates[4].ancho).toBeCloseTo(0.30);
    expect(plates[4].recortada).toBe(true);
  });

  it("4.1: Caso B - Recorte parcial por abertura (puerta)", () => {
    const basePlates = generarGrillaPlacas({
      largo_m: 4.20,
      alto_m: 2.60,
      formato_m: [1.20, 3.00], // formato 1.20 x 3.00
      orientacion: "vertical",
      cara: "A",
      capa: 1,
    });

    // Vano de puerta: ancho 0.90, alto 2.10, distancia 1.00
    const finalPlates = aplicarAberturas(basePlates, [
      { tipo: "puerta", ancho_m: 0.90, alto_m: 2.10, distancia_desde_inicio_m: 1.00 },
    ]);

    // Deberían seguir habiendo 4 placas, pero la placa 0 (0 a 1.20) y la placa 1 (1.20 a 2.40) se marcan recortadas
    expect(finalPlates.length).toBe(4);
    expect(finalPlates[0].x).toBeCloseTo(0);
    expect(finalPlates[0].recortada).toBe(true); // interseca x en [1.00, 1.20]
    expect(finalPlates[1].x).toBeCloseTo(1.20);
    expect(finalPlates[1].recortada).toBe(true); // interseca x en [1.20, 1.90]
    expect(finalPlates[2].x).toBeCloseTo(2.40);
    expect(finalPlates[2].recortada).toBe(false);
  });

  it("4.2: Descarte de placas cubiertas 100% por abertura", () => {
    // Generamos placas con ancho angosto de 0.50m
    const basePlates = generarGrillaPlacas({
      largo_m: 3.00,
      alto_m: 2.40,
      formato_m: [0.50, 2.40],
      orientacion: "vertical",
      cara: "A",
      capa: 1,
    });

    // Abertura que va desde x=1.00 hasta x=2.00, alto 2.40 (toda la altura de la pared)
    const finalPlates = aplicarAberturas(basePlates, [
      { tipo: "pase", ancho_m: 1.00, alto_m: 2.40, distancia_desde_inicio_m: 1.00 },
    ]);

    // Las placas base son:
    // P0: [0, 0.5]
    // P1: [0.5, 1.0]
    // P2: [1.0, 1.5] -> 100% contenida en [1.0, 2.0] -> eliminada
    // P3: [1.5, 2.0] -> 100% contenida en [1.0, 2.0] -> eliminada
    // P4: [2.0, 2.5]
    // P5: [2.5, 3.0]
    expect(finalPlates.length).toBe(4);
    expect(finalPlates.map((p) => p.x)).toEqual([0, 0.5, 2.0, 2.5]);
  });

  it("4.3: Múltiples aberturas sin superposición", () => {
    const basePlates = generarGrillaPlacas({
      largo_m: 4.00,
      alto_m: 2.40,
      formato_m: [1.00, 2.40],
      orientacion: "vertical",
      cara: "A",
      capa: 1,
    });

    // Dos aberturas: puerta en x=0.5 (ancho 0.8) y ventana en x=2.5 (ancho 1.0)
    const finalPlates = aplicarAberturas(basePlates, [
      { tipo: "puerta", ancho_m: 0.80, alto_m: 2.00, distancia_desde_inicio_m: 0.50 },
      { tipo: "ventana", ancho_m: 1.00, alto_m: 1.00, distancia_desde_inicio_m: 2.50 },
    ]);

    // Placas base: [0, 1.0], [1.0, 2.0], [2.0, 3.0], [3.0, 4.0]
    // Puerta [0.5, 1.3] interseca P0 [0, 1.0] y P1 [1.0, 2.0]
    // Ventana [2.5, 3.5] interseca P2 [2.0, 3.0] y P3 [3.0, 4.0]
    // Todas deberían estar marcadas como recortadas, pero ninguna eliminada (altura < 2.40)
    expect(finalPlates.length).toBe(4);
    expect(finalPlates.every((p) => p.recortada)).toBe(true);
  });

  it("5.1: Caso A - Extracción de juntas sin aberturas", () => {
    const plates = generarGrillaPlacas({
      largo_m: 4.00,
      alto_m: 2.40,
      formato_m: [1.20, 2.40],
      orientacion: "vertical",
      cara: "A",
      capa: 1,
    });

    const juntas = extraerJuntas(plates, []);

    // 3 juntas verticales a x=1.20, 2.40, 3.60
    expect(juntas.length).toBe(3);
    expect(juntas.every((j) => j.orientacion === "vertical")).toBe(true);
    expect(juntas.map((j) => j.coordenada_fija).sort()).toEqual([1.20, 2.40, 3.60]);
    expect(juntas.every((j) => j.longitud === 2.40)).toBe(true);
  });

  it("5.2: Caso B - Recorte de juntas por aberturas", () => {
    const basePlates = generarGrillaPlacas({
      largo_m: 4.20,
      alto_m: 2.60,
      formato_m: [1.20, 3.00],
      orientacion: "vertical",
      cara: "A",
      capa: 1,
    });

    const finalPlates = aplicarAberturas(basePlates, [
      { tipo: "puerta", ancho_m: 0.90, alto_m: 2.10, distancia_desde_inicio_m: 1.00 },
    ]);

    const juntas = extraerJuntas(finalPlates, [
      { tipo: "puerta", ancho_m: 0.90, alto_m: 2.10, distancia_desde_inicio_m: 1.00 },
    ]);

    // Deberían haber 3 juntas verticales:
    // x=1.20 (recortada a 0.50 ml)
    // x=2.40 (2.60 ml)
    // x=3.60 (2.60 ml)
    expect(juntas.length).toBe(3);
    const j120 = juntas.find((j) => Math.abs(j.coordenada_fija - 1.20) < 0.01);
    expect(j120).toBeDefined();
    expect(j120!.longitud).toBeCloseTo(0.50);
    expect(j120!.inicio).toBeCloseTo(2.10);
    expect(j120!.fin).toBeCloseTo(2.60);

    const j240 = juntas.find((j) => Math.abs(j.coordenada_fija - 2.40) < 0.01);
    expect(j240!.longitud).toBeCloseTo(2.60);
  });

  it("5.3: Caso D - Desfase de juntas entre capas de placa", () => {
    // Capa 1: largo 3.60, sin desfase
    const platesCapa1 = generarGrillaPlacas({
      largo_m: 3.60,
      alto_m: 2.40,
      formato_m: [1.20, 2.40],
      orientacion: "vertical",
      cara: "A",
      capa: 1,
    });

    // Capa 2: largo 3.60, desfase 0.30m -> origen_x_m = -0.30
    const platesCapa2 = generarGrillaPlacas({
      largo_m: 3.60,
      alto_m: 2.40,
      formato_m: [1.20, 2.40],
      orientacion: "vertical",
      origen_x_m: -0.30,
      cara: "A",
      capa: 2,
    });

    const allPlates = [...platesCapa1, ...platesCapa2];
    const juntas = extraerJuntas(allPlates, []);

    // Juntas Capa 1: x=1.20, 2.40 (2 juntas)
    // Juntas Capa 2: x=0.90, 2.10, 3.30 (3 juntas)
    // Total 5 juntas
    const jC1 = juntas.filter((j) => j.capa === 1);
    expect(jC1.length).toBe(2);
    expect(jC1.map((j) => j.coordenada_fija).sort()).toEqual([1.20, 2.40]);

    const jC2 = juntas.filter((j) => j.capa === 2);
    expect(jC2.length).toBe(3);
    expect(jC2.map((j) => j.coordenada_fija).sort()).toEqual([0.90, 2.10, 3.30]);
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// Caso E — Ticket 4.2: columna de placa descartada al 100% dentro de un vano
// ─────────────────────────────────────────────────────────────────────────────
describe("Caso E — Descarte total de placa dentro de abertura ancha (ticket 4.2)", () => {
  it("4.2: Columna que cae 100% dentro del vano es descartada, no marcada como recortada", () => {
    // Muro 3.60m x 2.40m con pase (abertura de toda la altura) de 2.40m en x=[0.60, 3.00]
    // Columnas generadas: [0-1.20], [1.20-2.40], [2.40-3.60]
    // Columna 2 (x=1.20..2.40, y=0..2.40) cae completamente DENTRO del pase [0.60..3.00] x [0..2.40]
    // → debe ser descartada; solo quedan 2 placas por cara (col 1 y col 3 parciales)
    const abertura = {
      tipo: "pase" as const,
      ancho_m: 2.40,
      alto_m: 2.40,
      distancia_desde_inicio_m: 0.60,
    };

    const placas = generarGrillaPlacas({
      largo_m: 3.60,
      alto_m: 2.40,
      formato_m: [1.20, 2.40],
      orientacion: "vertical",
      cara: "A",
      capa: 1,
    });

    // Sin aberturas: 3 columnas (3.60 / 1.20 = 3 exactas)
    expect(placas.length).toBe(3);

    const resultado = aplicarAberturas(placas, [abertura]);

    // La columna 2 (x=1.20, ancho=1.20, y=0, alto=2.40) está completamente dentro del pase [0.60, 3.00] x [0, 2.40]
    // → se descarta. Quedan solo 2 placas.
    expect(resultado.length).toBe(2);

    // Ninguna placa restante debe ser la columna central
    const tieneColumnaDescartada = resultado.some(
      (p) => Math.abs(p.x - 1.20) < 1e-9 && Math.abs(p.ancho - 1.20) < 1e-9
    );
    expect(tieneColumnaDescartada).toBe(false);

    // Las 2 placas restantes deben estar marcadas como recortadas (porque el pase las intersecta parcialmente)
    expect(resultado.every((p) => p.recortada)).toBe(true);
  });

  it("4.2b: Placa NO descartada cuando la abertura solo la intersecta parcialmente", () => {
    // La columna 1 (x=0..1.20) intersecta el pase [0.60..3.00] → solo se recorta, NO se descarta
    const abertura = {
      tipo: "pase" as const,
      ancho_m: 2.40,
      alto_m: 2.40,
      distancia_desde_inicio_m: 0.60,
    };

    const placas = generarGrillaPlacas({
      largo_m: 3.60,
      alto_m: 2.40,
      formato_m: [1.20, 2.40],
      orientacion: "vertical",
      cara: "A",
      capa: 1,
    });

    const resultado = aplicarAberturas(placas, [abertura]);

    // Columna 1 (x=0..1.20): solo intersecta en [0.60..1.20] → recortada pero presente
    const col1 = resultado.find((p) => p.x < 1e-9);
    expect(col1).toBeDefined();
    expect(col1!.recortada).toBe(true);
    // Columna 3 (x=2.40..3.60): intersecta en [2.40..3.00] → recortada pero presente
    const col3 = resultado.find((p) => Math.abs(p.x - 2.40) < 1e-9);
    expect(col3).toBeDefined();
    expect(col3!.recortada).toBe(true);
  });
});

