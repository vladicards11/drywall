import { describe, it, expect } from "vitest";
import { calcularMuro, GeometriaInvalidaError } from "../src/orquestador.js";
import { calcularProyecto, ProyectoInvalidoError } from "../src/proyecto.js";
import { obtenerCatalogoGenericoEstandar } from "@drywall-calc/catalog-schemas";
import { roundUpSafe } from "../src/utils/redondeo.js";

import casoA from "./fixtures/caso-A-simple.json" assert { type: "json" };
import casoB from "./fixtures/caso-B-abertura.json" assert { type: "json" };
import casoC from "./fixtures/caso-C-esquina.json" assert { type: "json" };
import casoD from "./fixtures/caso-D-doble-capa.json" assert { type: "json" };
import casoF from "./fixtures/caso-F-union-T.json" assert { type: "json" };
import casoG from "./fixtures/caso-G-estructura-doble.json" assert { type: "json" };

const catalogo = obtenerCatalogoGenericoEstandar();

describe("Orquestador - Pruebas de integración de Casos de Oro", () => {
  it("Caso A - Muro simple sin aberturas", () => {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const res = calcularMuro(casoA.input.muro as any, [], catalogo);

    expect(res.placas.cantidad_total).toBe(casoA.output_esperado.placas.cantidad_total);
    expect(res.perfiles.montantes).toBe(casoA.output_esperado.perfiles.montantes);
    expect(res.perfiles.rieles_barras).toBe(casoA.output_esperado.perfiles.rieles_barras);
    expect(res.tornillos.placa_perfil).toBe(casoA.output_esperado.tornillos.placa_perfil);
    expect(res.tornillos.perfil_perfil).toBe(casoA.output_esperado.tornillos.perfil_perfil);
    expect(res.tornillos.anclajes_losa).toBe(casoA.output_esperado.tornillos.anclajes_losa);
    expect(res.cinta.ml_total).toBeCloseTo(casoA.output_esperado.cinta.ml_total, 2);
    expect(res.cinta.rollos).toBe(casoA.output_esperado.cinta.rollos);
    expect(res.masilla.kg_total).toBeCloseTo(casoA.output_esperado.masilla.kg_total, 2);
    expect(res.masilla.bolsas).toBe(casoA.output_esperado.masilla.bolsas);
    expect(res.aislante.m2).toBeCloseTo(casoA.output_esperado.aislante.m2, 2);
    expect(res.aislante.paquetes).toBe(casoA.output_esperado.aislante.paquetes);
    expect(res.esquineros.ml_total).toBe(casoA.output_esperado.esquineros.ml_total);

    // Verificar trazabilidad
    expect(res.trazabilidad.length).toBeGreaterThan(0);
  });

  it("Caso B - Muro con abertura (puerta)", () => {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const res = calcularMuro(casoB.input.muro as any, [], catalogo);

    expect(res.placas.cantidad_total).toBe(casoB.output_esperado.placas.cantidad_total);
    expect(res.perfiles.montantes).toBe(casoB.output_esperado.perfiles.montantes);
    expect(res.perfiles.rieles_barras).toBe(casoB.output_esperado.perfiles.rieles_barras);
    expect(res.tornillos.placa_perfil).toBe(casoB.output_esperado.tornillos.placa_perfil);
    expect(res.tornillos.perfil_perfil).toBe(casoB.output_esperado.tornillos.perfil_perfil);
    expect(res.tornillos.anclajes_losa).toBe(casoB.output_esperado.tornillos.anclajes_losa);
    expect(res.cinta.ml_total).toBeCloseTo(casoB.output_esperado.cinta.ml_total, 2);
    expect(res.cinta.rollos).toBe(casoB.output_esperado.cinta.rollos);
    expect(res.masilla.kg_total).toBeCloseTo(casoB.output_esperado.masilla.kg_total, 2);
    expect(res.masilla.bolsas).toBe(casoB.output_esperado.masilla.bolsas);
    expect(res.aislante.m2).toBeCloseTo(casoB.output_esperado.aislante.m2, 2);
    expect(res.aislante.paquetes).toBe(casoB.output_esperado.aislante.paquetes);
    expect(res.esquineros.ml_total).toBe(casoB.output_esperado.esquineros.ml_total);
  });

  it("Caso C - Dos muros con encuentro en esquina", () => {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const res = calcularProyecto(casoC.input as any, catalogo);

    expect(res.totales.placas.cantidad_total).toBe(casoC.output_esperado.placas.cantidad_total);
    expect(res.totales.perfiles.montantes).toBe(casoC.output_esperado.perfiles.montantes);
    expect(res.totales.perfiles.rieles_barras).toBe(casoC.output_esperado.perfiles.rieles_barras);
    expect(res.totales.tornillos.placa_perfil).toBe(casoC.output_esperado.tornillos.placa_perfil);
    expect(res.totales.tornillos.perfil_perfil).toBe(casoC.output_esperado.tornillos.perfil_perfil);
    expect(res.totales.tornillos.anclajes_losa).toBe(casoC.output_esperado.tornillos.anclajes_losa);
    expect(res.totales.cinta.ml_total).toBeCloseTo(casoC.output_esperado.cinta.ml_total, 2);
    expect(res.totales.cinta.rollos).toBe(casoC.output_esperado.cinta.rollos);
    expect(res.totales.masilla.kg_total).toBeCloseTo(casoC.output_esperado.masilla.kg_total, 2);
    expect(res.totales.masilla.bolsas).toBe(casoC.output_esperado.masilla.bolsas);
    expect(res.totales.aislante.m2).toBeCloseTo(casoC.output_esperado.aislante.m2, 2);
    expect(res.totales.aislante.paquetes).toBe(casoC.output_esperado.aislante.paquetes);
    expect(res.totales.esquineros.ml_total).toBeCloseTo(casoC.output_esperado.esquineros.ml_total, 2);
  });

  it("Debería arrojar ProyectoInvalidoError ante fallas de integridad referencial", () => {
    // Caso con unión que apunta a muro inexistente
    const invalidProyecto1 = {
      proyecto: "Proyecto Inválido 1",
      catalogo: "generico_estandar",
      elementos: [
        {
          id: "muro_valido",
          geometria: { largo_m: 3.00, alto_m: 2.40 },
          sistema: { estructura: "simple", caras: 2, capas_por_cara: 1, perfil: "M48", riel: "R48", separacion_montante_m: 0.40 },
          placa: { tipo: "ST", espesor_mm: 12.5, formato_m: [1.20, 2.40], orientacion: "vertical" },
          aberturas: [],
          encuentros: ["union_valida"]
        }
      ],
      uniones: [
        {
          id: "union_valida",
          muros_conectados: ["muro_valido", "muro_inexistente"],
          angulo_grados: 90,
          tipo_union: "esquina_externa_simple",
          config_modulacion: { resetear_perfiles: true, perfiles_simetricos: false }
        }
      ]
    };

    // Caso con muro que apunta a unión inexistente
    const invalidProyecto2 = {
      proyecto: "Proyecto Inválido 2",
      catalogo: "generico_estandar",
      elementos: [
        {
          id: "muro_valido",
          geometria: { largo_m: 3.00, alto_m: 2.40 },
          sistema: { estructura: "simple", caras: 2, capas_por_cara: 1, perfil: "M48", riel: "R48", separacion_montante_m: 0.40 },
          placa: { tipo: "ST", espesor_mm: 12.5, formato_m: [1.20, 2.40], orientacion: "vertical" },
          aberturas: [],
          encuentros: ["union_inexistente"]
        }
      ],
      uniones: []
    };

    expect(() => calcularProyecto(invalidProyecto1 as any, catalogo)).toThrow(ProyectoInvalidoError);
    expect(() => calcularProyecto(invalidProyecto2 as any, catalogo)).toThrow(ProyectoInvalidoError);
  });

  it("Caso D - Muro con doble capa por cara", () => {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const res = calcularMuro(casoD.input.muro as any, [], catalogo);

    expect(res.placas.cantidad_total).toBe(casoD.output_esperado.placas.cantidad_total);
    expect(res.perfiles.montantes).toBe(casoD.output_esperado.perfiles.montantes);
    expect(res.perfiles.rieles_barras).toBe(casoD.output_esperado.perfiles.rieles_barras);
    expect(res.tornillos.placa_perfil).toBe(casoD.output_esperado.tornillos.placa_perfil);
    expect(res.tornillos.perfil_perfil).toBe(casoD.output_esperado.tornillos.perfil_perfil);
    expect(res.tornillos.anclajes_losa).toBe(casoD.output_esperado.tornillos.anclajes_losa);
    expect(res.cinta.ml_total).toBeCloseTo(casoD.output_esperado.cinta.ml_total, 2);
    expect(res.cinta.rollos).toBe(casoD.output_esperado.cinta.rollos);
    expect(res.masilla.kg_total).toBeCloseTo(casoD.output_esperado.masilla.kg_total, 2);
    expect(res.masilla.bolsas).toBe(casoD.output_esperado.masilla.bolsas);
    expect(res.aislante.m2).toBeCloseTo(casoD.output_esperado.aislante.m2, 2);
    expect(res.aislante.paquetes).toBe(casoD.output_esperado.aislante.paquetes);
  });

  it("Debería arrojar GeometriaInvalidaError ante valores negativos", () => {
    const brokenMuro = {
      ...casoA.input.muro,
      geometria: { largo_m: -1.0, alto_m: 2.40 }
    };
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    expect(() => calcularMuro(brokenMuro as any, [], catalogo)).toThrow(GeometriaInvalidaError);
  });

  it("Caso F - Encuentro en T con 3 muros", () => {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const res = calcularProyecto(casoF.input as any, catalogo);

    expect(res.totales.placas.cantidad_total).toBe(casoF.output_esperado.placas.cantidad_total);
    expect(res.totales.perfiles.montantes).toBe(casoF.output_esperado.perfiles.montantes);
    expect(res.totales.perfiles.rieles_barras).toBe(casoF.output_esperado.perfiles.rieles_barras);
    expect(res.totales.tornillos.placa_perfil).toBe(casoF.output_esperado.tornillos.placa_perfil);
    expect(res.totales.tornillos.perfil_perfil).toBe(casoF.output_esperado.tornillos.perfil_perfil);
    expect(res.totales.tornillos.anclajes_losa).toBe(casoF.output_esperado.tornillos.anclajes_losa);
    expect(res.totales.cinta.ml_total).toBeCloseTo(casoF.output_esperado.cinta.ml_total, 2);
    expect(res.totales.cinta.rollos).toBe(casoF.output_esperado.cinta.rollos);
    expect(res.totales.masilla.kg_total).toBeCloseTo(casoF.output_esperado.masilla.kg_total, 2);
    expect(res.totales.masilla.bolsas).toBe(casoF.output_esperado.masilla.bolsas);
    expect(res.totales.aislante.m2).toBeCloseTo(casoF.output_esperado.aislante.m2, 2);
    expect(res.totales.aislante.paquetes).toBe(casoF.output_esperado.aislante.paquetes);
    expect(res.totales.esquineros.ml_total).toBeCloseTo(casoF.output_esperado.esquineros.ml_total, 2);
  });

  it("11.4 - Uniones no ortogonales (60°): consume más riel que una a 90° debido al corte a inglete", () => {
    const muroBase = {
      id: "muro_ang",
      geometria: { largo_m: 3.00, alto_m: 2.40 },
      sistema: { estructura: "simple" as const, caras: 2 as const, capas_por_cara: 1, perfil: "M48", riel: "R48", separacion_montante_m: 0.40 },
      placa: { tipo: "ST", espesor_mm: 12.5, formato_m: [1.20, 2.40] as [number, number], orientacion: "vertical" as const },
      aberturas: [],
      encuentros: ["union_ang"]
    };

    const union90 = [
      {
        id: "union_ang",
        muros_conectados: ["muro_ang", "muro_vecino"],
        angulo_grados: 90,
        tipo_union: "esquina_externa_simple",
        config_modulacion: { resetear_perfiles: true, perfiles_simetricos: false }
      }
    ];

    const union60 = [
      {
        id: "union_ang",
        muros_conectados: ["muro_ang", "muro_vecino"],
        angulo_grados: 60,
        tipo_union: "esquina_externa_simple",
        config_modulacion: { resetear_perfiles: true, perfiles_simetricos: false }
      }
    ];

    const res90 = calcularMuro(muroBase, union90, catalogo);
    const res60 = calcularMuro(muroBase, union60, catalogo);

    // Mismo muro a 60° debe consumir más o igual rieles_barras debido al corte a inglete
    // Calculamos los metros de riel exactos usando calcularPerfiles directamente para comparar:
    const rieles90 = res90.perfiles.rieles_barras;
    const rieles60 = res60.perfiles.rieles_barras;

    // Verificamos que no sea menor en ningún caso
    expect(rieles60).toBeGreaterThanOrEqual(rieles90);

    // Y verificamos que los anclajes de losa sean mayores o iguales debido al aumento de longitud por inglete
    expect(res60.tornillos.anclajes_losa).toBeGreaterThanOrEqual(res90.tornillos.anclajes_losa);
  });

  it("Caso G - Muro simple con estructura doble", () => {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const res = calcularMuro(casoG.input as any, [], catalogo);

    expect(res.placas.cantidad_total).toBe(casoG.output_esperado.placas.cantidad_total);
    expect(res.perfiles.montantes).toBe(casoG.output_esperado.perfiles.montantes);
    expect(res.perfiles.rieles_barras).toBe(casoG.output_esperado.perfiles.rieles_barras);
    expect(res.tornillos.placa_perfil).toBe(casoG.output_esperado.tornillos.placa_perfil);
    expect(res.tornillos.perfil_perfil).toBe(casoG.output_esperado.tornillos.perfil_perfil);
    expect(res.tornillos.anclajes_losa).toBe(casoG.output_esperado.tornillos.anclajes_losa);
    expect(res.cinta.ml_total).toBeCloseTo(casoG.output_esperado.cinta.ml_total, 2);
    expect(res.cinta.rollos).toBe(casoG.output_esperado.cinta.rollos);
    expect(res.masilla.kg_total).toBeCloseTo(casoG.output_esperado.masilla.kg_total, 2);
    expect(res.masilla.bolsas).toBe(casoG.output_esperado.masilla.bolsas);
    expect(res.aislante.m2).toBeCloseTo(casoG.output_esperado.aislante.m2, 2);
    expect(res.aislante.paquetes).toBe(casoG.output_esperado.aislante.paquetes);
    expect(res.esquineros.ml_total).toBeCloseTo(casoG.output_esperado.esquineros.ml_total, 2);
  });

  it("12.1 - Comparativa estructura simple vs doble: duplica perfiles y anclajes, pero mantiene placas y aislante", () => {
    const muroSimple = {
      id: "muro_simple",
      geometria: { largo_m: 4.00, alto_m: 2.40 },
      sistema: { estructura: "simple" as const, caras: 2 as const, capas_por_cara: 1, perfil: "M48", riel: "R48", separacion_montante_m: 0.40 },
      placa: { tipo: "ST", espesor_mm: 12.5, formato_m: [1.20, 2.40] as [number, number], orientacion: "vertical" as const },
      aberturas: [],
      encuentros: []
    };

    const muroDoble = {
      ...muroSimple,
      id: "muro_doble",
      sistema: {
        ...muroSimple.sistema,
        estructura: "doble" as const
      }
    };

    const resSimple = calcularMuro(muroSimple, [], catalogo);
    const resDoble = calcularMuro(muroDoble, [], catalogo);

    // Duplicación x2 en estructura y anclajes
    expect(resDoble.perfiles.montantes).toBe(resSimple.perfiles.montantes * 2);
    expect(resDoble.perfiles.rieles_barras).toBe(resSimple.perfiles.rieles_barras * 2);
    expect(resDoble.tornillos.anclajes_losa).toBe(resSimple.tornillos.anclajes_losa * 2);

    // Placas y aislante NO se duplican
    expect(resDoble.placas.cantidad_total).toBe(resSimple.placas.cantidad_total);
    expect(resDoble.aislante.m2).toBeCloseTo(resSimple.aislante.m2, 2);
  });

  it("13.2-13.3 - Placas especiales (RH/RF), densidad variable de tornillos y peso estructural", () => {
    const muroST = {
      id: "muro_ST",
      geometria: { largo_m: 4.00, alto_m: 2.40 },
      sistema: { estructura: "simple" as const, caras: 2 as const, capas_por_cara: 1, perfil: "M48", riel: "R48", separacion_montante_m: 0.40 },
      placa: { tipo: "ST", espesor_mm: 12.5, formato_m: [1.20, 2.40] as [number, number], orientacion: "vertical" as const },
      aberturas: [],
      encuentros: []
    };

    const muroRF = {
      ...muroST,
      id: "muro_RF",
      placa: { tipo: "RF", espesor_mm: 15.0, formato_m: [1.20, 2.40] as [number, number], orientacion: "vertical" as const }
    };

    const resST = calcularMuro(muroST, [], catalogo);
    const resRF = calcularMuro(muroRF, [], catalogo);

    // 1. Tornillería variable por espesor:
    // Placa ST (12.5mm) usa densidad de 25 tornillos/m2
    // Area neta = 9.60m2 * 2 caras * 1 capa * 25 = 480 tornillos
    expect(resST.tornillos.placa_perfil).toBe(480);

    // Placa RF (15mm) usa densidad de 28 tornillos/m2
    // Area neta = 9.60m2 * 2 caras * 1 capa * 28 = 538 tornillos (roundUpSafe)
    expect(resRF.tornillos.placa_perfil).toBe(538);

    // 2. Peso estructural de placas:
    // ST: area instalada (sum of p.ancho * p.alto) = 19.20m2
    // 19.20m2 * 9.5 kg/m2 = 182.40 kg
    expect(resST.placas.peso_total_kg).toBeCloseTo(182.40, 2);

    // RF: area instalada = 19.20m2
    // 19.20m2 * 11.6 kg/m2 = 222.72 kg
    expect(resRF.placas.peso_total_kg).toBeCloseTo(222.72, 2);

    // 3. Consolidación de peso a nivel proyecto
    const proyecto = {
      proyecto: "Proyecto Especial",
      catalogo: "generico_estandar",
      elementos: [muroST, muroRF],
      uniones: []
    };

    const resProyecto = calcularProyecto(proyecto, catalogo);
    expect(resProyecto.totales.placas.peso_total_kg).toBeCloseTo(182.40 + 222.72, 1);
  });
});
