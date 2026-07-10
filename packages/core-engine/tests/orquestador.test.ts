import { describe, it, expect } from "vitest";
import { calcularMuro, GeometriaInvalidaError } from "../src/orquestador.js";
import { obtenerCatalogoGenericoEstandar } from "@drywall-calc/catalog-schemas";
import { roundUpSafe } from "../src/utils/redondeo.js";

import casoA from "./fixtures/caso-A-simple.json" assert { type: "json" };
import casoB from "./fixtures/caso-B-abertura.json" assert { type: "json" };
import casoC from "./fixtures/caso-C-esquina.json" assert { type: "json" };
import casoD from "./fixtures/caso-D-doble-capa.json" assert { type: "json" };

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
    const muros = casoC.input.muros as any[];
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const uniones = casoC.input.uniones as any[];

    const res1 = calcularMuro(muros[0], uniones, catalogo);
    const res2 = calcularMuro(muros[1], uniones, catalogo);

    // Consolidación de Proyecto
    const placasTotal = res1.placas.cantidad_total + res2.placas.cantidad_total;
    const montantesTotal = res1.perfiles.montantes + res2.perfiles.montantes;
    const rielesTotal = res1.perfiles.rieles_barras + res2.perfiles.rieles_barras;
    const tornillosPlacaTotal = res1.tornillos.placa_perfil + res2.tornillos.placa_perfil;
    const tornillosPerfilTotal = res1.tornillos.perfil_perfil + res2.tornillos.perfil_perfil;
    const anclajesTotal = res1.tornillos.anclajes_losa + res2.tornillos.anclajes_losa;
    const esquinerosTotal = res1.esquineros.ml_total + res2.esquineros.ml_total;

    const cintaMlTotal = res1.cinta.ml_total + res2.cinta.ml_total;
    const masillaKgTotal = res1.masilla.kg_total + res2.masilla.kg_total;
    const aislanteM2Total = res1.aislante.m2 + res2.aislante.m2;

    // Cinta y masilla a nivel proyecto
    const rollosTotal = roundUpSafe(cintaMlTotal / catalogo.cinta.rendimiento_ml_por_rollo);
    const bolsasTotal = roundUpSafe(masillaKgTotal / catalogo.masilla.presentacion_kg_por_bolsa);
    const aislantePaquetesTotal = roundUpSafe(aislanteM2Total / catalogo.aislante.presentacion_m2_por_paquete);

    expect(placasTotal).toBe(casoC.output_esperado.placas.cantidad_total);
    expect(montantesTotal).toBe(casoC.output_esperado.perfiles.montantes);
    expect(rielesTotal).toBe(casoC.output_esperado.perfiles.rieles_barras);
    expect(tornillosPlacaTotal).toBe(casoC.output_esperado.tornillos.placa_perfil);
    expect(tornillosPerfilTotal).toBe(casoC.output_esperado.tornillos.perfil_perfil);
    expect(anclajesTotal).toBe(casoC.output_esperado.tornillos.anclajes_losa);
    expect(cintaMlTotal).toBeCloseTo(casoC.output_esperado.cinta.ml_total, 2);
    expect(rollosTotal).toBe(casoC.output_esperado.cinta.rollos);
    expect(masillaKgTotal).toBeCloseTo(casoC.output_esperado.masilla.kg_total, 2);
    expect(bolsasTotal).toBe(casoC.output_esperado.masilla.bolsas);
    expect(aislanteM2Total).toBeCloseTo(casoC.output_esperado.aislante.m2, 2);
    expect(aislantePaquetesTotal).toBe(casoC.output_esperado.aislante.paquetes);
    expect(esquinerosTotal).toBeCloseTo(casoC.output_esperado.esquineros.ml_total, 2);
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
});
