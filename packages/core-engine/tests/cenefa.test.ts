import { describe, it, expect } from "vitest";
import { calcularCenefa } from "../src/calculo/cenefa.js";
import { calcularProyecto } from "../src/proyecto.js";
import { Catalogo, Cenefa, Proyecto } from "@drywall-calc/catalog-schemas";

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

describe("calcularCenefa", () => {
  it("Caso 1: Cenefa Adosada con Aleta de Luz", () => {
    const cenefa: Cenefa = {
      id: "cen-adosada",
      tipo: "adosada",
      geometria: {
        longitud_m: 6.00,
        ancho_cajon_m: 0.40,
        alto_cajon_m: 0.20,
        aleta_luz_m: 0.05
      },
      sistema: {
        perfil_secundario: "OMG38",
        perfil_perimetral: "ANG25",
        separacion_secundario_m: 0.40
      },
      placa: {
        tipo: "ST",
        espesor_mm: 12.5,
        formato_m: [1.20, 2.40]
      }
    };

    const res = calcularCenefa(cenefa, catalogoTest);

    // Área neta = 6.00 * (0.40 + 0.20 + 0.05) = 6 * 0.65 = 3.90 m²
    // Peso = 3.90 * 9.5 = 37.05 kg
    expect(res.placas.peso_total_kg).toBeCloseTo(37.05, 1);
    
    // Placas con 15% desp = 3.90 * 1.15 = 4.485 m2. Placas = 4.485 / 2.88 = 2 placas
    expect(res.placas.cantidad_total).toBe(2);

    // Perimetrales = 2 * 6.00 = 12.00 ml. Barras = 12 / 3 = 4
    expect(res.perfiles.perimetrales_barras).toBe(4);

    // Secundarios:
    // Cuelgues = roundUp(6 / 0.40) + 1 = 16 pórticos
    // Longitud = 16 * 0.20 + 16 * 0.40 = 9.60 ml. Barras = roundUp(9.60 / 3) = 4
    expect(res.perfiles.secundarios_barras).toBe(4);

    // Cantoneras = 6.00 * 2 = 12.00 ml (arista inferior + aleta de luz)
    expect(res.esquineros.ml_total).toBeCloseTo(12.00, 1);

    // Wafer = 16 pórticos * 2 wafer = 32
    expect(res.tornillos.perfil_perfil).toBe(32);
    // Anclajes losa = roundUp(6 / 0.60) = 10. Anclajes pared = 10.
    expect(res.tornillos.anclajes_losa).toBe(10);
    expect(res.tornillos.anclajes_pared).toBe(10);
  });

  it("Caso 2: Cenefa de Isla (Suspendida)", () => {
    const cenefa: Cenefa = {
      id: "cen-isla",
      tipo: "isla",
      geometria: {
        longitud_m: 3.00,
        ancho_cajon_m: 0.50,
        alto_cajon_m: 0.30,
        aleta_luz_m: 0.00
      },
      sistema: {
        perfil_secundario: "OMG38",
        perfil_perimetral: "ANG25",
        separacion_secundario_m: 0.50
      },
      placa: {
        tipo: "ST",
        espesor_mm: 12.5,
        formato_m: [1.20, 2.40]
      }
    };

    const res = calcularCenefa(cenefa, catalogoTest);

    // Área neta = 3.00 * (0.50 + 2 * 0.30) = 3 * 1.10 = 3.30 m²
    // Peso = 3.30 * 9.5 = 31.35 kg
    expect(res.placas.peso_total_kg).toBeCloseTo(31.35, 1);

    // Perimetrales = 2 * 3.00 = 6.00 ml. Barras = 2
    expect(res.perfiles.perimetrales_barras).toBe(2);

    // Secundarios:
    // Cuelgues = roundUp(3 / 0.50) + 1 = 7 pórticos
    // Longitud = 2 * 7 * 0.30 (doble cuelgue) + 7 * 0.50 = 4.20 + 3.50 = 7.70 ml. Barras = 3
    expect(res.perfiles.secundarios_barras).toBe(3);

    // Cantoneras = 3.00 * 2 = 6.00 ml (dos aristas inferiores expuestas)
    expect(res.esquineros.ml_total).toBeCloseTo(6.00, 1);

    // Wafer = 7 pórticos * 4 = 28
    expect(res.tornillos.perfil_perfil).toBe(28);
    expect(res.tornillos.anclajes_losa).toBe(10); // 2 * roundUp(3 / 0.6) = 2 * 5 = 10
    expect(res.tornillos.anclajes_pared).toBe(0);
  });
});

describe("Muro con Hornacina Empotrada", () => {
  it("Cálculo correcto de refuerzos, placas internas y cantoneras de hornacinas", () => {
    const proyecto: Proyecto = {
      proyecto: "Proyecto con Hornacina",
      catalogo: "generico_estandar",
      elementos: [
        {
          id: "muro-nicho",
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
          aberturas: [
            {
              tipo: "hornacina",
              ancho_m: 0.60,
              alto_m: 0.60,
              distancia_desde_inicio_m: 1.20,
              altura_desde_piso_m: 1.00,
              profundidad_m: 0.15
            }
          ],
          encuentros: []
        }
      ],
      uniones: []
    };

    const res = calcularProyecto(proyecto, catalogoTest);

    // Verificaciones del muro con hornacina
    const rm = res.muros[0];

    // Esquineros:
    // Al ser 1 cara sin uniones, originalmente esquineros = 0.
    // Sumando hornacina: 2 * (0.60 + 0.60) = 2.40 ml de esquinero frontal expuesto.
    expect(rm.esquineros.ml_total).toBeCloseTo(2.40, 1);

    // Placas del muro con nicho:
    // Placas base compradas del frente (nesting completo) = 7.50 m2.
    // Placas internas = 2 * 0.60 * 0.15 (laterales) + 2 * 0.60 * 0.15 (horizontales) + 0.60 * 0.60 (fondo) = 0.72 m2.
    // Peso total = (7.50 + 0.72) * 9.5 = 8.22 * 9.5 = 78.09 kg.
    expect(rm.placas.peso_total_kg).toBeCloseTo(78.09, 1);

    // Perfiles del muro con nicho:
    // Base = roundUp(3.0 / 0.40) + 1 = 9 parantes.
    // Refuerzo jambas = 2 por abertura.
    // Refuerzo nicho trasero = 2 * (0.60 + 0.60) + 4 * 0.15 = 2.40 + 0.60 = 3.00 ml = 1 parante extra.
    // Total = 9 + 2 + 1 = 12 parantes montantes.
    expect(rm.perfiles.montantes).toBe(12);
  });
});
