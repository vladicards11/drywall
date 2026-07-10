import { describe, it, expect } from "vitest";
import { calcularMuro } from "../src/orquestador.js";
import { obtenerCatalogoGenericoEstandar } from "@drywall-calc/catalog-schemas";

const catalogo = obtenerCatalogoGenericoEstandar();

describe("Epic 9 - Property-based / Hardening tests", () => {
  it("9.1: Invariante de área de placas y 9.2: Invariante de perfiles", () => {
    // Corremos 100 iteraciones con parámetros aleatorios válidos
    for (let iter = 0; iter < 100; iter++) {
      // Dimensiones aleatorias de muro
      const largo = 2.0 + Math.random() * 8.0; // de 2m a 10m
      const alto = 2.0 + Math.random() * 2.0;  // de 2m a 4m
      const separacion = Math.random() > 0.5 ? 0.40 : 0.60;

      // Formatos aleatorios
      const orientacion = Math.random() > 0.5 ? "vertical" : "horizontal";

      // Aberturas aleatorias sin superposición
      const aberturas = [];
      if (Math.random() > 0.3) {
        // Añadir una puerta en una ubicación válida
        const anchoVano = 0.8 + Math.random() * 0.4; // 0.8m a 1.2m
        const altoVano = 1.8 + Math.random() * 0.4;  // 1.8m a 2.2m
        if (anchoVano < largo - 0.5 && altoVano < alto) {
          const dist = Math.random() * (largo - anchoVano);
          aberturas.push({
            tipo: "puerta" as const,
            ancho_m: parseFloat(anchoVano.toFixed(2)),
            alto_m: parseFloat(altoVano.toFixed(2)),
            distancia_desde_inicio_m: parseFloat(dist.toFixed(2)),
          });
        }
      }

      const muro = {
        id: `muro_rand_${iter}`,
        geometria: { largo_m: parseFloat(largo.toFixed(2)), alto_m: parseFloat(alto.toFixed(2)) },
        sistema: {
          estructura: "simple" as const,
          caras: 2 as const,
          capas_por_cara: 1,
          perfil: "M48",
          riel: "R48",
          separacion_montante_m: separacion,
        },
        placa: {
          tipo: "ST",
          espesor_mm: 12.5,
          formato_m: [1.20, 2.40] as [number, number],
          orientacion: orientacion as "vertical" | "horizontal",
        },
        aberturas,
        encuentros: [],
      };

      const res = calcularMuro(muro, [], catalogo);

      // 9.1: El área total de placas generadas (por cara) es mayor o igual al área neta del muro
      const areaNeta = muro.geometria.largo_m * muro.geometria.alto_m - aberturas.reduce((acc, a) => acc + a.ancho_m * a.alto_m, 0);
      const placasCaraA = res.placas.detalle.filter(p => p.cara === "A");
      const areaPlacasCaraA = placasCaraA.reduce((acc, p) => acc + p.ancho * p.alto, 0);
      expect(areaPlacasCaraA).toBeGreaterThanOrEqual(areaNeta - 1e-5);

      // 9.2: Las cantidades son no negativas y enteras
      expect(res.placas.cantidad_total).toBeGreaterThanOrEqual(0);
      expect(Number.isInteger(res.placas.cantidad_total)).toBe(true);

      expect(res.perfiles.montantes).toBeGreaterThanOrEqual(0);
      expect(Number.isInteger(res.perfiles.montantes)).toBe(true);

      expect(res.perfiles.rieles_barras).toBeGreaterThanOrEqual(0);
      expect(Number.isInteger(res.perfiles.rieles_barras)).toBe(true);

      expect(res.tornillos.placa_perfil).toBeGreaterThanOrEqual(0);
      expect(res.tornillos.perfil_perfil).toBeGreaterThanOrEqual(0);
      expect(res.tornillos.anclajes_losa).toBeGreaterThanOrEqual(0);
    }
  });

  it("9.3: Invariante de longitud de junta no negativa", () => {
    for (let iter = 0; iter < 50; iter++) {
      const largo = 3.0 + Math.random() * 5.0;
      const alto = 2.40;
      
      const muro = {
        id: `muro_junta_${iter}`,
        geometria: { largo_m: parseFloat(largo.toFixed(2)), alto_m: alto },
        sistema: {
          estructura: "simple" as const,
          caras: 2 as const,
          capas_por_cara: 2, // doble capa
          perfil: "M48",
          riel: "R48",
          separacion_montante_m: 0.40,
        },
        placa: {
          tipo: "ST",
          espesor_mm: 12.5,
          formato_m: [1.20, 2.40] as [number, number],
          orientacion: "vertical" as const,
        },
        aberturas: [
          { tipo: "puerta" as const, ancho_m: 0.90, alto_m: 2.10, distancia_desde_inicio_m: 1.00 }
        ],
        encuentros: [],
      };

      const res = calcularMuro(muro, [], catalogo);
      // Las juntas y el material no pueden ser negativos
      expect(res.cinta.ml_total).toBeGreaterThanOrEqual(0);
      expect(res.masilla.kg_total).toBeGreaterThanOrEqual(0);
    }
  });
});
