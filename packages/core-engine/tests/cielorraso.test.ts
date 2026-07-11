import { describe, it, expect } from "vitest";
import { calcularCielorraso } from "../src/calculo/cielorraso.js";
import { calcularProyecto } from "../src/proyecto.js";
import { Catalogo, Cielorraso, Proyecto } from "@drywall-calc/catalog-schemas";

const catalogoTest: Catalogo = {
  sistema: "generico_estandar",
  perfiles: {
    montante: [
      { codigo: "M48", ancho_mm: 48, largo_barra_m: 3.00, peso_kg_ml: 0.52 }
    ],
    riel: [
      { codigo: "R48", ancho_mm: 48, largo_barra_m: 3.00, peso_kg_ml: 0.49 }
    ],
    omega: [
      { codigo: "OMG38", ancho_mm: 38, largo_barra_m: 3.00, peso_kg_ml: 0.35 }
    ],
    angular: [
      { codigo: "ANG25", ancho_mm: 25, largo_barra_m: 3.00, peso_kg_ml: 0.28 }
    ],
    separacion_montante_m_default: 0.40,
    separaciones_permitidas_m: [0.40, 0.407, 0.50, 0.60]
  },
  placas: [
    { tipo: "ST", nombre: "Estandar", espesor_mm: 12.5, formatos_m: [[1.20, 2.40]], peso_kg_m2: 9.5 }
  ],
  tornillos: {
    placa_perfil_por_m2: { "12.5mm": 25 },
    perfil_perfil_por_union: 2,
    anclaje_losa_separacion_m: 0.50
  },
  cinta: {
    rendimiento_ml_por_rollo: 30,
    factor_traslape: 1.00,
    cantonera_incluida_en_esquinas_externas: false
  },
  masilla: {
    kg_por_ml_por_mano: 0.30,
    manos_estandar: 3,
    presentacion_kg_por_bolsa: 25
  },
  aislante: {
    tipos: ["lana_vidrio"],
    espesores_mm_recomendados_por_ancho_perfil: { "48": 50 },
    presentacion_m2_por_paquete: 10
  },
  factor_desperdicio_placas_default: 0.00,
  desfase_junta_vertical_min_m: 0.30,
  tipologias_union: []
};

describe("calcularCielorraso", () => {
  it("Caso 1: Cielorraso Directo (Omega)", () => {
    const cielorraso: Cielorraso = {
      id: "cie-directo",
      geometria: {
        largo_m: 4.00,
        ancho_m: 3.00
      },
      sistema: {
        tipo_estructura: "omega",
        perfil_secundario: "OMG38",
        perfil_perimetral: "ANG25",
        separacion_secundario_m: 0.40,
        altura_suspension_m: 0.00
      },
      placa: {
        tipo: "ST",
        espesor_mm: 12.5,
        formato_m: [1.20, 2.40],
        orientacion: "vertical"
      }
    };

    const res = calcularCielorraso(cielorraso, catalogoTest);

    // Verificaciones de Placas y Peso
    // Área neta = 12m2. Peso = 12 * 9.5 = 114kg.
    expect(res.placas.peso_total_kg).toBeCloseTo(114.0, 1);
    expect(res.placas.cantidad_total).toBeGreaterThan(0);

    // Verificaciones de Perfiles
    // Perímetro = 2 * (4 + 3) = 14m. Barras perimetrales (largo 3.00m) = roundUp(14 / 3) = 5
    expect(res.perfiles.perimetrales_barras).toBe(5);

    // Secundarios:
    // Líneas = roundUp(4.00 / 0.40) + 1 = 11 líneas
    // Barras por línea = roundUp(3.00 / 3.00) = 1
    // Total secundarios = 11 * 1 = 11 barras
    expect(res.perfiles.secundarios_barras).toBe(11);
    expect(res.perfiles.principales_barras).toBe(0);

    // Verificaciones de Suspensión
    expect(res.colgadores.cantidad_total).toBe(0);
    expect(res.colgadores.alambre_ml).toBe(0);

    // Verificaciones de Tornillos
    // Placa-Perfil: 12m2 * 25 tornillos/m2 = 300 tornillos
    expect(res.tornillos.placa_perfil).toBe(300);
    // Perfil-Perfil (extremos a angular): 11 líneas * 2 extremos = 22 tornillos
    expect(res.tornillos.perfil_perfil).toBe(22);
    // Anclaje Losa: 11 líneas * 3.00m = 33ml de perfiles. 33 / 0.50 = 66 anclajes
    expect(res.tornillos.anclajes_losa).toBe(66);
    // Anclajes Pared: 14m / 0.60 = 24 anclajes
    expect(res.tornillos.anclajes_pared).toBe(24);
  });

  it("Caso 2: Cielorraso Suspendido (Doble Nivel)", () => {
    const cielorraso: Cielorraso = {
      id: "cie-suspendido",
      geometria: {
        largo_m: 5.00,
        ancho_m: 4.00
      },
      sistema: {
        tipo_estructura: "suspendido",
        perfil_secundario: "OMG38",
        perfil_principal: "M48",
        perfil_perimetral: "ANG25",
        separacion_secundario_m: 0.50,
        separacion_principal_m: 1.00,
        distancia_cuelgue_m: 1.20,
        altura_suspension_m: 0.50
      },
      placa: {
        tipo: "ST",
        espesor_mm: 12.5,
        formato_m: [1.20, 2.40],
        orientacion: "vertical"
      },
      aislante: {
        tipo: "lana_vidrio",
        espesor_mm: 50
      }
    };

    const res = calcularCielorraso(cielorraso, catalogoTest);

    // Verificaciones de Perfiles
    // Perímetro = 2 * (5 + 4) = 18m. Barras perimetrales (largo 3.00m) = roundUp(18 / 3) = 6
    expect(res.perfiles.perimetrales_barras).toBe(6);

    // Secundarios (paralelos a ancho=4.00m, distribuidos a lo largo de largo=5.00m):
    // Líneas = roundUp(5.00 / 0.50) + 1 = 11 líneas
    // Barras por línea = roundUp(4.00 / 3.00) = 2
    // Total secundarios = 11 líneas de 4.00m -> nesting1D optimizado = 15 barras
    expect(res.perfiles.secundarios_barras).toBe(15);

    // Principales (paralelos a largo=5.00m, distribuidos a lo largo de ancho=4.00m):
    // Líneas = roundUp(4.00 / 1.00) + 1 = 5 líneas
    // Barras por línea = roundUp(5.00 / 3.00) = 2
    // Total principales = 5 * 2 = 10 barras
    expect(res.perfiles.principales_barras).toBe(10);

    // Verificaciones de Suspensión
    // Puntos de cuelgue por línea principal = roundUp(5.00 / 1.20) + 1 = 6 puntos
    // Total colgadores = 5 líneas * 6 puntos = 30 colgadores
    // Alambre = 30 * 0.50m = 15ml
    expect(res.colgadores.cantidad_total).toBe(30);
    expect(res.colgadores.alambre_ml).toBeCloseTo(15.0, 1);

    // Verificaciones de Tornillos
    // Placa-Perfil: 20m2 * 25 = 500
    expect(res.tornillos.placa_perfil).toBe(500);
    // Perfil-Perfil: 5 líneas principales * 11 líneas secundarias = 55 intersecciones
    // Wafer por cruce = 55 * 2 = 110. Wafer extremos = 11 líneas * 2 = 22. Total = 132
    expect(res.tornillos.perfil_perfil).toBe(132);
    // Anclaje Losa = 1 por colgador = 30
    expect(res.tornillos.anclajes_losa).toBe(30);
    // Anclajes Pared = 18m / 0.60 = 30
    expect(res.tornillos.anclajes_pared).toBe(30);

    // Aislante
    // Área neta = 20m2. Rendimiento = 10m2/paquete. Paquetes = 2.
    expect(res.aislante.m2).toBe(20.0);
    expect(res.aislante.paquetes).toBe(2);
  });
});

describe("calcularProyecto con Cielorrasos", () => {
  it("Consolidación correcta de muros y cielorrasos", () => {
    const proyecto: Proyecto = {
      proyecto: "Proyecto Mixto",
      catalogo: "generico_estandar",
      elementos: [
        {
          id: "muro-1",
          geometria: { largo_m: 3.00, alto_m: 2.50 },
          sistema: {
            estructura: "simple",
            caras: 1,
            capas_por_cara: 1,
            perfil: "M48",
            riel: "R48",
            separacion_montante_m: 0.40
          },
          placa: { tipo: "ST", espesor_mm: 12.5, formato_m: [1.20, 2.40], orientacion: "vertical" },
          aberturas: [],
          encuentros: []
        }
      ],
      uniones: [],
      cielorrasos: [
        {
          id: "cie-1",
          geometria: { largo_m: 3.00, ancho_m: 3.00 },
          sistema: {
            tipo_estructura: "omega",
            perfil_secundario: "OMG38",
            perfil_perimetral: "ANG25",
            separacion_secundario_m: 0.50,
            altura_suspension_m: 0.00
          },
          placa: { tipo: "ST", espesor_mm: 12.5, formato_m: [1.20, 2.40], orientacion: "vertical" }
        }
      ]
    };

    const res = calcularProyecto(proyecto, catalogoTest);

    // Verificaciones generales del Proyecto consolidado
    expect(res.cielorrasos).toBeDefined();
    expect(res.cielorrasos!.length).toBe(1);

    // Totales deben consolidar la placa de ambos
    expect(res.totales.placas.cantidad_total).toBeGreaterThan(0);
    expect(res.totales.cielorraso).toBeDefined();
    expect(res.totales.cielorraso!.secundarios).toBeGreaterThan(0);
    expect(res.totales.cielorraso!.perimetrales).toBeGreaterThan(0);
  });
});
