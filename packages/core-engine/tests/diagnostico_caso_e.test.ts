import { describe, it, expect } from "vitest";
import { calcularMuro } from "../src/orquestador.js";
import { obtenerCatalogoGenericoEstandar } from "@drywall-calc/catalog-schemas";

const catalogo = obtenerCatalogoGenericoEstandar();

// Caso E: vano de pase exactamente alineado a los bordes de la columna central.
// Ejercita el path de descarte total + riel superior interrumpido + sin dintel.
describe("Caso E — Pase de altura completa alineado a columna (ticket 4.2 + fix de rieles)", () => {
  it("columa central descartada, riel superior interrumpido, sin dintel, 0 ml de junta", () => {
    const res = calcularMuro(
      {
        id: "muro_E",
        geometria: { largo_m: 3.60, alto_m: 2.40 },
        sistema: {
          estructura: "simple",
          caras: 2,
          capas_por_cara: 1,
          perfil: "M48",
          riel: "R48",
          separacion_montante_m: 0.40,
        },
        placa: { tipo: "ST", espesor_mm: 12.5, formato_m: [1.20, 2.40], orientacion: "vertical" },
        aberturas: [
          { tipo: "pase", ancho_m: 1.20, alto_m: 2.40, distancia_desde_inicio_m: 1.20 }
        ],
        encuentros: [],
      },
      [],
      catalogo
    );

    // Columna central [1.20,2.40] coincide exactamente con el vano → descartada
    expect(res.placas.cantidad_total).toBe(4); // 2 columnas × 2 caras

    // Montantes: ROUNDUP(3.60/0.40)+1=10, +2 jambas = 12
    expect(res.perfiles.montantes).toBe(12);
    expect(res.perfiles.montantes_refuerzo_vanos).toBe(2);

    // Riel: piso=(2.40) + techo=(2.40) + sin dintel = 4.80 → ROUNDUP(4.80/3.00) = 2 barras
    expect(res.perfiles.rieles_barras).toBe(2);

    // Tornillos placa-perfil: área neta 5.76 × 2 caras × 25/m2 = 288
    expect(res.tornillos.placa_perfil).toBe(288);
    // Tornillos perfil-perfil: 12 montantes × 2 × 2 = 48
    expect(res.tornillos.perfil_perfil).toBe(48);
    // Anclajes: 4 tramos de 1.20m (2 techo + 2 piso) × (ROUNDUP(1.20/0.50)+1=4) = 16
    expect(res.tornillos.anclajes_losa).toBe(16);

    // Columnas 0 y 2 no son adyacentes → 0 ml de junta → 0 cinta y masilla
    expect(res.cinta.ml_total).toBeCloseTo(0);
    expect(res.cinta.rollos).toBeCloseTo(0);
    expect(res.masilla.kg_total).toBeCloseTo(0);
    expect(res.masilla.bolsas).toBeCloseTo(0);

    // Área neta = 3.60×2.40 − 1.20×2.40 = 5.76 m²
    expect(res.aislante.m2).toBeCloseTo(5.76, 2);
    expect(res.aislante.paquetes).toBe(1);

    expect(res.esquineros.ml_total).toBeCloseTo(0);
  });
});

describe("Uniones con Angulos No Ortogonales (45 y 60 grados) - Épica 26 & 29", () => {
  it("compensa el largo de rieles según la fórmula de corte a inglete", () => {
    const uniones = [
      {
        id: "u_muro_F_G",
        muros_conectados: ["muro_F", "muro_G"],
        tipo_union: "esquina",
        angulo_grados: 45,
        config_modulacion: { resetear_perfiles: false, perfiles_simetricos: true }
      }
    ];

    const res = calcularMuro(
      {
        id: "muro_F",
        geometria: { largo_m: 3.00, alto_m: 2.40 },
        sistema: {
          estructura: "simple",
          caras: 2,
          capas_por_cara: 1,
          perfil: "M89", // Montante 89mm
          riel: "R90",    // Riel 90mm
          separacion_montante_m: 0.40,
        },
        placa: { tipo: "ST", espesor_mm: 12.5, formato_m: [1.20, 2.40], orientacion: "vertical" },
        aberturas: [],
        encuentros: [],
      },
      uniones,
      catalogo
    );

    // Riel 90mm -> espesor = 0.09m
    // deltaAngulo = 0.09 / tan(45° / 2) = 0.09 / tan(22.5°) = 0.09 / 0.4142 = ~0.217m de delta por riel
    // ceilLength = 3.00 + 0.217 = 3.217m
    // floorLength = 3.00 + 0.217 = 3.217m
    // totalRielLength = 6.434m -> rielesBarras = ROUNDUP(6.434/3) = 3 barras (sin inglete eran 2 barras)
    expect(res.perfiles.rieles_barras).toBe(3);
  });
});
