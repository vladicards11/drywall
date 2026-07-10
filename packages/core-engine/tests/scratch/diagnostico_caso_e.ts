import { calcularMuro } from "../src/orquestador.js";
import { obtenerCatalogoGenericoEstandar } from "@drywall-calc/catalog-schemas";

const catalogo = obtenerCatalogoGenericoEstandar();

const muroE = {
  id: "muro_E",
  geometria: { largo_m: 3.60, alto_m: 2.40 },
  sistema: {
    estructura: "simple" as const,
    caras: 2 as const,
    capas_por_cara: 1,
    perfil: "M48",
    riel: "R48",
    separacion_montante_m: 0.40,
  },
  placa: { tipo: "ST", espesor_mm: 12.5, formato_m: [1.20, 2.40] as [number, number], orientacion: "vertical" as const },
  aberturas: [
    { tipo: "pase" as const, ancho_m: 1.20, alto_m: 2.40, distancia_desde_inicio_m: 1.20 }
  ],
  encuentros: [],
};

const res = calcularMuro(muroE, [], catalogo);

console.log("=== CASO E REAL (definido por el usuario) ===");
console.log("Esperado | Actual");
console.log(`placas.cantidad_total: 4 | ${res.placas.cantidad_total}`);
console.log(`perfiles.montantes: 12 | ${res.perfiles.montantes}`);
console.log(`perfiles.rieles_barras: 2 | ${res.perfiles.rieles_barras}`);
console.log(`perfiles.montantes_refuerzo_vanos: 2 | ${res.perfiles.montantes_refuerzo_vanos}`);
console.log(`tornillos.placa_perfil: 288 | ${res.tornillos.placa_perfil}`);
console.log(`tornillos.perfil_perfil: 48 | ${res.tornillos.perfil_perfil}`);
console.log(`tornillos.anclajes_losa: 16 | ${res.tornillos.anclajes_losa}`);
console.log(`cinta.ml_total: 0 | ${res.cinta.ml_total}`);
console.log(`cinta.rollos: 0 | ${res.cinta.rollos}`);
console.log(`masilla.kg_total: 0 | ${res.masilla.kg_total}`);
console.log(`masilla.bolsas: 0 | ${res.masilla.bolsas}`);
console.log(`aislante.m2: 5.76 | ${res.aislante.m2}`);
console.log(`aislante.paquetes: 1 | ${res.aislante.paquetes}`);
console.log(`esquineros.ml_total: 0 | ${res.esquineros.ml_total}`);
console.log("\n--- Trazabilidad ---");
res.trazabilidad.forEach(t => console.log(" ·", t));
console.log("\n--- Detalle placas (cara A) ---");
res.placas.detalle.filter(p => p.cara === "A").forEach(p => console.log(`  x=${p.x} ancho=${p.ancho} recortada=${p.recortada}`));
