import { describe, it, expect } from "vitest";
import { calcularPerfiles } from "../src/calculo/perfiles.js";
import { Muro, Union } from "@drywall-calc/catalog-schemas";
import { obtenerCatalogoGenericoEstandar } from "@drywall-calc/catalog-schemas";

const catalogo = obtenerCatalogoGenericoEstandar();

describe("calcularPerfiles tests", () => {
  it("6.1: Caso A - Muro simple sin vanos ni uniones", () => {
    const muro: Muro = {
      id: "muro_A",
      geometria: { largo_m: 4.00, alto_m: 2.40 },
      sistema: {
        estructura: "simple",
        caras: 2,
        capas_por_cara: 1,
        perfil: "M48",
        riel: "R48",
        separacion_montante_m: 0.40,
      },
      placa: { tipo: "ST", espesor_mm: 12.5, formato_m: [1.20, 2.40], orientacion: "vertical" },
      aberturas: [],
      encuentros: [],
    };

    const res = calcularPerfiles(muro, [], catalogo);
    expect(res.montantes).toBe(11);
    expect(res.rieles_barras).toBe(3);
    expect(res.montantes_refuerzo_vanos).toBe(0);
    expect(res.montantes_union).toBe(0);
  });

  it("6.2: Caso B - Muro con abertura (puerta)", () => {
    const muro: Muro = {
      id: "muro_B",
      geometria: { largo_m: 4.20, alto_m: 2.60 },
      sistema: {
        estructura: "simple",
        caras: 2,
        capas_por_cara: 1,
        perfil: "M48",
        riel: "R48",
        separacion_montante_m: 0.40,
      },
      placa: { tipo: "ST", espesor_mm: 12.5, formato_m: [1.20, 3.00], orientacion: "vertical" },
      aberturas: [
        { tipo: "puerta", ancho_m: 0.90, alto_m: 2.10, distancia_desde_inicio_m: 1.00 },
      ],
      encuentros: [],
    };

    const res = calcularPerfiles(muro, [], catalogo);
    // Montantes: 12 base + 2 de jamba = 14
    expect(res.montantes).toBe(14);
    expect(res.montantes_refuerzo_vanos).toBe(2);
    // Riel: 4.20 (cielo) + 3.30 (piso) + 1.20 (dintel) = 8.70 ml. Barras de 3m -> 3 barras
    expect(res.rieles_barras).toBe(3);
  });

  it("6.3: Caso C - Dos muros con unión en esquina sin duplicar", () => {
    const muroC1: Muro = {
      id: "muro_C1",
      geometria: { largo_m: 3.00, alto_m: 2.40 },
      sistema: {
        estructura: "simple",
        caras: 2,
        capas_por_cara: 1,
        perfil: "M48",
        riel: "R48",
        separacion_montante_m: 0.40,
      },
      placa: { tipo: "ST", espesor_mm: 12.5, formato_m: [1.20, 2.40], orientacion: "vertical" },
      aberturas: [],
      encuentros: ["union_C"],
    };

    const muroC2: Muro = {
      id: "muro_C2",
      geometria: { largo_m: 2.50, alto_m: 2.40 },
      sistema: {
        estructura: "simple",
        caras: 2,
        capas_por_cara: 1,
        perfil: "M48",
        riel: "R48",
        separacion_montante_m: 0.40,
      },
      placa: { tipo: "ST", espesor_mm: 12.5, formato_m: [1.20, 2.40], orientacion: "vertical" },
      aberturas: [],
      encuentros: ["union_C"],
    };

    const unionC: Union = {
      id: "union_C",
      muros_conectados: ["muro_C1", "muro_C2"],
      angulo_grados: 90,
      tipo_union: "esquina_externa_simple",
      config_modulacion: { resetear_perfiles: true, perfiles_simetricos: false },
    };

    const resC1 = calcularPerfiles(muroC1, [unionC], catalogo);
    const resC2 = calcularPerfiles(muroC2, [unionC], catalogo);

    // C1: 9 base + 1 unión = 10
    expect(resC1.montantes).toBe(10);
    expect(resC1.montantes_union).toBe(1);

    // C2: 8 base + 0 unión (ya cobrado en C1) = 8
    expect(resC2.montantes).toBe(8);
    expect(resC2.montantes_union).toBe(0);

    expect(resC1.montantes + resC2.montantes).toBe(18);
  });
});
