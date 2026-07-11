import { describe, it, expect } from "vitest";
import { aplicarCortesL, extraerRetazosDeAberturas, optimizarReutilizacionRetazos, DemandaPlaca } from "../src/calculo/nesting2D.js";
import { PlacaRect, Abertura, Retazo2D } from "@drywall-calc/catalog-schemas";

describe("Nesting 2D Real de Placas y Reutilización", () => {
  it("debe marcar cortes en L en placas que intersecan esquinas superiores de puertas", () => {
    // Puerta de 0.80m x 2.00m ubicada en x = 1.20m.
    // Esquina superior izquierda en (1.20, 2.00). Esquina superior derecha en (2.00, 2.00).
    const placas: PlacaRect[] = [
      {
        id: "placa_A_1_1",
        x: 0,
        y: 0,
        ancho: 1.20,
        alto: 2.40,
        cara: "A",
        capa: 1,
        recortada: false,
      },
      {
        id: "placa_A_1_2",
        x: 1.20,
        y: 0,
        ancho: 1.20,
        alto: 2.40,
        cara: "A",
        capa: 1,
        recortada: false,
      }
    ];

    const aberturas: Abertura[] = [
      {
        tipo: "puerta",
        ancho_m: 0.80,
        alto_m: 2.00,
        distancia_desde_inicio_m: 1.20,
      }
    ];

    const res = aplicarCortesL(placas, aberturas, 2.40);
    
    // La placa 1 termina exactamente en la jamba x=1.20m (distancia = 0)
    // Debería marcarse para corte en L
    expect(res[0].corteL).toBe(true);
    // La placa 2 comienza en x=1.20m, cubre la jamba derecha en x=2.00m (distancia = 0.40m, no califica para corte L derecho de forma directa)
    // Pero en x=1.20m está a distancia 0 de la jamba izquierda, por lo que también califica para corte en L
    expect(res[1].corteL).toBe(true);
  });

  it("debe extraer retazos utilizables del hueco de las aberturas", () => {
    // Placa que cubre x = [1.20, 2.40].
    // Puerta cubre x = [1.20, 2.00], y = [0.0, 2.00].
    // Intersección removida: x = [1.20, 2.00] -> ancho = 0.80m, alto = 2.00m.
    const placas: PlacaRect[] = [
      {
        id: "placa_A_1_2",
        x: 1.20,
        y: 0,
        ancho: 1.20,
        alto: 2.40,
        cara: "A",
        capa: 1,
        recortada: true,
      }
    ];

    const aberturas: Abertura[] = [
      {
        tipo: "puerta",
        ancho_m: 0.80,
        alto_m: 2.00,
        distancia_desde_inicio_m: 1.20,
      }
    ];

    const retazos = extraerRetazosDeAberturas(placas, aberturas, "ST", 12.5, "muro_test");
    
    expect(retazos.length).toBe(1);
    expect(retazos[0].ancho_m).toBe(0.80);
    expect(retazos[0].alto_m).toBe(2.00);
    expect(retazos[0].placa_tipo).toBe("ST");
  });

  it("debe optimizar y reutilizar retazos en demandas pequeñas", () => {
    const piscina: Retazo2D[] = [
      {
        id: "ret1",
        ancho_m: 0.80,
        alto_m: 2.00,
        placa_tipo: "ST",
        espesor_mm: 12.5,
        origen_elemento_id: "muro_A",
      }
    ];

    const demandas: DemandaPlaca[] = [
      {
        id: "dem1",
        ancho_m: 0.60,
        alto_m: 0.60,
        placa_tipo: "ST",
        espesor_mm: 12.5,
        nombre_pieza: "Fondo de Hornacina",
      },
      {
        id: "dem2",
        ancho_m: 0.15,
        alto_m: 0.60,
        placa_tipo: "ST",
        espesor_mm: 12.5,
        nombre_pieza: "Lateral Hornacina",
      }
    ];

    const res = optimizarReutilizacionRetazos(demandas, piscina);

    // Se deberían satisfacer ambas demandas de la única placa de retazo
    expect(res.demandasSatisfechas.length).toBe(2);
    expect(res.demandasPendientes.length).toBe(0);
    // Debe quedar un retazo restante en la piscina
    expect(res.retazosRestantes.length).toBeGreaterThan(0);
  });
});
