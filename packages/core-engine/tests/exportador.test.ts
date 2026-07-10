import { describe, it, expect } from "vitest";
import { calcularProyecto } from "../src/proyecto.js";
import { exportarAExcel } from "../src/export/excelExporter.js";
import { exportarAPDF } from "../src/export/pdfExporter.js";
import { obtenerCatalogoGenericoEstandar } from "@drywall-calc/catalog-schemas";
import * as fs from "fs";
import * as path from "path";

const catalogo = obtenerCatalogoGenericoEstandar();

describe("Exportador - Pruebas de generación y guardado de archivos", () => {
  it("Debe generar correctamente los reportes de Excel y PDF y guardarlos localmente", async () => {
    const muro1 = {
      id: "muro_dormitorio_1",
      geometria: { largo_m: 4.00, alto_m: 2.40 },
      sistema: { estructura: "simple" as const, caras: 2 as const, capas_por_cara: 1, perfil: "M48", riel: "R48", separacion_montante_m: 0.40 },
      placa: { tipo: "ST", espesor_mm: 12.5, formato_m: [1.20, 2.40] as [number, number], orientacion: "vertical" as const },
      aberturas: [],
      encuentros: []
    };

    const muro2 = {
      ...muro1,
      id: "muro_dormitorio_2",
      geometria: { largo_m: 3.00, alto_m: 3.20 } // muro alto con empalme
    };

    const muroOtros = {
      ...muro1,
      id: "muro_cocina",
      geometria: { largo_m: 2.00, alto_m: 2.40 }
    };

    const proyecto = {
      proyecto: "Proyecto de Prueba Exportacion",
      catalogo: "generico_estandar",
      elementos: [muro1, muro2, muroOtros],
      uniones: [],
      ambientes: [
        {
          id: "dormitorio",
          nombre: "Dormitorio Principal",
          muros: ["muro_dormitorio_1", "muro_dormitorio_2"]
        }
      ]
    };

    // Calcular
    const resProyecto = calcularProyecto(proyecto, catalogo);

    // Exportar Excel
    const excelBuffer = await exportarAExcel(resProyecto, catalogo);
    expect(excelBuffer).toBeDefined();
    expect(excelBuffer.length).toBeGreaterThan(0);

    // Exportar PDF
    const pdfBuffer = await exportarAPDF(resProyecto, catalogo);
    expect(pdfBuffer).toBeDefined();
    expect(pdfBuffer.length).toBeGreaterThan(0);

    // Asegurar directorio de salidas
    const outputDir = path.join(__dirname, "outputs");
    if (!fs.existsSync(outputDir)) {
      fs.mkdirSync(outputDir, { recursive: true });
    }

    // Guardar archivos
    const excelPath = path.join(outputDir, "test_output.xlsx");
    const pdfPath = path.join(outputDir, "test_output.pdf");

    fs.writeFileSync(excelPath, excelBuffer);
    fs.writeFileSync(pdfPath, pdfBuffer);

    // Verificar existencia física
    expect(fs.existsSync(excelPath)).toBe(true);
    expect(fs.existsSync(pdfPath)).toBe(true);
  });
});
