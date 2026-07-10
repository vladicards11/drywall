import { describe, it, expect } from "vitest";
import { calcularTornilleria } from "../src/calculo/tornilleria.js";
import { calcularCintaMasilla } from "../src/calculo/cintaMasilla.js";
import { calcularAislante } from "../src/calculo/aislante.js";
import { calcularEsquineros } from "../src/calculo/esquineros.js";
import { Muro, Union, JuntaSegmento, ResultadoPerfiles } from "@drywall-calc/catalog-schemas";
import { obtenerCatalogoGenericoEstandar } from "@drywall-calc/catalog-schemas";

const catalogo = obtenerCatalogoGenericoEstandar();

describe("Epic 7 - tornilleria, cinta, masilla, aislante, esquineros tests", () => {
  it("7.1: calcularTornilleria - Caso A", () => {
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

    const resPerfiles: ResultadoPerfiles = {
      montantes: 11,
      rieles_barras: 3,
      montantes_refuerzo_vanos: 0,
      montantes_union: 0,
    };

    const res = calcularTornilleria(muro, 9.60, resPerfiles, catalogo);
    expect(res.placa_perfil).toBe(480);
    expect(res.perfil_perfil).toBe(44);
    expect(res.anclajes_losa).toBe(18); // 9 superior + 9 inferior
  });

  it("7.2: calcularCintaMasilla - Caso A", () => {
    // 3 juntas verticales de 2.40m en ambas caras = 14.40 ml en total
    const juntas: JuntaSegmento[] = [
      { orientacion: "vertical", coordenada_fija: 1.20, inicio: 0, fin: 2.40, longitud: 2.40, cara: "A", capa: 1 },
      { orientacion: "vertical", coordenada_fija: 2.40, inicio: 0, fin: 2.40, longitud: 2.40, cara: "A", capa: 1 },
      { orientacion: "vertical", coordenada_fija: 3.60, inicio: 0, fin: 2.40, longitud: 2.40, cara: "A", capa: 1 },
      { orientacion: "vertical", coordenada_fija: 1.20, inicio: 0, fin: 2.40, longitud: 2.40, cara: "B", capa: 1 },
      { orientacion: "vertical", coordenada_fija: 2.40, inicio: 0, fin: 2.40, longitud: 2.40, cara: "B", capa: 1 },
      { orientacion: "vertical", coordenada_fija: 3.60, inicio: 0, fin: 2.40, longitud: 2.40, cara: "B", capa: 1 },
    ];

    const res = calcularCintaMasilla(juntas, catalogo);
    // Cinta: 14.40 * 1.05 = 15.12 ml (el backlog en caso de oro dice 14.40, pero por diseño lleva factor_traslape 1.05)
    // Vamos a comprobar que el cálculo de rollos y bolsas sea correcto
    expect(res.cinta.ml_total).toBeCloseTo(15.12, 2);
    expect(res.cinta.rollos).toBe(1);
    expect(res.masilla.kg_total).toBeCloseTo(12.96, 2);
    expect(res.masilla.bolsas).toBe(1);
  });

  it("7.3: calcularAislante - Caso A", () => {
    const res = calcularAislante(9.60, catalogo);
    expect(res.m2).toBeCloseTo(9.60, 2);
    expect(res.paquetes).toBe(1); // 9.60 / 12 = 0.8 -> 1
  });

  it("7.4: calcularEsquineros - Caso C", () => {
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

    const unionC: Union = {
      id: "union_C",
      muros_conectados: ["muro_C1", "muro_C2"],
      angulo_grados: 90,
      tipo_union: "esquina_externa_simple",
      config_modulacion: { resetear_perfiles: true, perfiles_simetricos: false },
    };

    const res = calcularEsquineros([unionC], muroC1, catalogo);
    expect(res.ml_total).toBeCloseTo(2.40, 2);
  });
});
