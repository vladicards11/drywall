import * as pdfMakeNamespace from "pdfmake";
import * as pdfFonts from "pdfmake/build/vfs_fonts.js";
import { ResultadoProyecto, Catalogo } from "@drywall-calc/catalog-schemas";
import * as path from "path";
import { fileURLToPath } from "url";

const pdfMake: any = (pdfMakeNamespace as any).default || pdfMakeNamespace;

// Inicializar el sistema de fuentes virtual y local de pdfmake
pdfMake.vfs = (pdfFonts as any).default;

pdfMake.setLocalAccessPolicy(() => true);
pdfMake.setUrlAccessPolicy(() => true);

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
// pdfExporter.ts is in packages/core-engine/src/export, so go up 3 levels to reach packages/core-engine
const fontDir = path.resolve(__dirname, "../../../../node_modules/pdfmake/fonts/Roboto");

pdfMake.fonts = {
  Roboto: {
    normal: path.join(fontDir, "Roboto-Regular.ttf"),
    bold: path.join(fontDir, "Roboto-Medium.ttf"),
    italics: path.join(fontDir, "Roboto-Italic.ttf"),
    bolditalics: path.join(fontDir, "Roboto-MediumItalic.ttf")
  }
};

export async function exportarAPDF(
  proyecto: ResultadoProyecto,
  catalogo: Catalogo
): Promise<Buffer> {
  const t = proyecto.totales;

  // Estructura del contenido principal
  const content: any[] = [
    { text: "INFORME DE PRESUPUESTO - DRYWALL CALC", style: "header" },
    { text: `Proyecto: ${proyecto.proyecto}`, style: "subheader" },
    { text: `Catálogo: Estandar Genérico`, style: "subheader" },
    { text: `Fecha de Generación: ${new Date().toLocaleDateString()}`, style: "subheader" },
    { text: "\n" },

    { text: "1. RESUMEN CONSOLIDADO DE MATERIALES", style: "sectionHeader" },
    { text: "\n" },
    {
      table: {
        headerRows: 1,
        widths: ["*", "auto", "auto", "auto", "auto"],
        body: [
          [
            { text: "Material", style: "tableHeader" },
            { text: "Detalle / Especificación", style: "tableHeader" },
            { text: "Consumo Neto", style: "tableHeader" },
            { text: "Unidades Comerciales", style: "tableHeader" },
            { text: "Peso Estructural", style: "tableHeader" }
          ],
          [
            "Placas de Yeso",
            "Placa según especificación",
            "-",
            `${t.placas.cantidad_total} unidades`,
            `${t.placas.peso_total_kg.toFixed(2)} kg`
          ],
          [
            "Perfiles Montantes",
            `Montante comercial (${catalogo.perfiles.montante[0]?.largo_barra_m || 3.0}m)`,
            "-",
            `${t.perfiles.montantes} barras`,
            "-"
          ],
          [
            "Perfiles Rieles",
            `Riel comercial (${catalogo.perfiles.riel[0]?.largo_barra_m || 3.0}m)`,
            "-",
            `${t.perfiles.rieles_barras} barras`,
            "-"
          ],
          [
            "Tornillos Placa-Perfil",
            "Fijación de placas",
            "-",
            `${t.tornillos.placa_perfil} un`,
            "-"
          ],
          [
            "Tornillos Perfil-Perfil",
            "Fijación metal-metal",
            "-",
            `${t.tornillos.perfil_perfil} un`,
            "-"
          ],
          [
            "Anclajes Losa",
            "Anclaje de rieles",
            "-",
            `${t.tornillos.anclajes_losa} un`,
            "-"
          ],
          [
            "Cinta para Juntas",
            `Papel microperforado (${catalogo.cinta.rendimiento_ml_por_rollo}m)`,
            `${t.cinta.ml_total.toFixed(2)} ml`,
            `${t.cinta.rollos} rollos`,
            "-"
          ],
          [
            "Masilla",
            `Masilla en polvo/lista (${catalogo.masilla.presentacion_kg_por_bolsa}kg)`,
            `${t.masilla.kg_total.toFixed(2)} kg`,
            `${t.masilla.bolsas} bolsas`,
            "-"
          ],
          [
            "Aislante",
            `Lana de vidrio/mineral (${catalogo.aislante.presentacion_m2_por_paquete}m²)`,
            `${t.aislante.m2.toFixed(2)} m²`,
            `${t.aislante.paquetes} paq`,
            "-"
          ],
          [
            "Esquineros Metálicos",
            "Cantonera protectora",
            `${t.esquineros.ml_total.toFixed(2)} ml`,
            "-",
            "-"
          ]
        ]
      },
      layout: "lightHorizontalLines"
    },
    { text: "\n\n" }
  ];

  // Si hay ambientes, agregar el desglose por ambiente
  if (proyecto.por_ambiente && proyecto.por_ambiente.length > 0) {
    content.push({ text: "2. DESGLOSE POR AMBIENTE", style: "sectionHeader" }, { text: "\n" });

    for (const amb of proyecto.por_ambiente) {
      content.push(
        { text: `Ambiente: ${amb.nombre} (ID: ${amb.ambiente_id})`, style: "ambientSubHeader" },
        { text: `Muros incluidos: ${amb.muros.join(", ")}`, style: "bodyTextSmall" },
        { text: "\n" },
        {
          table: {
            headerRows: 1,
            widths: ["*", "auto", "auto", "auto"],
            body: [
              [
                { text: "Material", style: "tableHeader" },
                { text: "Consumo Neto", style: "tableHeader" },
                { text: "Unidades Comerciales", style: "tableHeader" },
                { text: "Peso Estructural", style: "tableHeader" }
              ],
              ["Placas de Yeso", "-", `${amb.totales.placas.cantidad_total} un`, `${amb.totales.placas.peso_total_kg.toFixed(2)} kg`],
              ["Perfiles Montantes", "-", `${amb.totales.perfiles.montantes} barras`, "-"],
              ["Perfiles Rieles", "-", `${amb.totales.perfiles.rieles_barras} barras`, "-"],
              ["Tornillos Placa-Perfil", "-", `${amb.totales.tornillos.placa_perfil} un`, "-"],
              ["Tornillos Perfil-Perfil", "-", `${amb.totales.tornillos.perfil_perfil} un`, "-"],
              ["Anclajes Losa", "-", `${amb.totales.tornillos.anclajes_losa} un`, "-"],
              ["Cinta para Juntas", `${amb.totales.cinta.ml_total.toFixed(2)} ml`, `${amb.totales.cinta.rollos} rollos`, "-"],
              ["Masilla", `${amb.totales.masilla.kg_total.toFixed(2)} kg`, `${amb.totales.masilla.bolsas} bolsas`, "-"],
              ["Aislante", `${amb.totales.aislante.m2.toFixed(2)} m²`, `${amb.totales.aislante.paquetes} paq`, "-"],
              ["Esquineros Metálicos", `${amb.totales.esquineros.ml_total.toFixed(2)} ml`, "-", "-"]
            ]
          },
          layout: "lightHorizontalLines"
        },
        { text: "\n\n" }
      );
    }
  }

  // Desglose Individual por Muro
  content.push({ text: "3. DETALLE POR MURO INDIVIDUAL", style: "sectionHeader" }, { text: "\n" });

  for (const muro of proyecto.muros) {
    content.push(
      { text: `Muro: ${muro.muro_id}`, style: "ambientSubHeader" },
      { text: "\n" },
      {
        table: {
          headerRows: 1,
          widths: ["*", "auto", "auto", "auto"],
          body: [
            [
              { text: "Material", style: "tableHeader" },
              { text: "Consumo Neto", style: "tableHeader" },
              { text: "Unidades Comerciales", style: "tableHeader" },
              { text: "Peso Estructural", style: "tableHeader" }
            ],
            ["Placas de Yeso", "-", `${muro.placas.cantidad_total} un`, `${muro.placas.peso_total_kg.toFixed(2)} kg`],
            ["Perfiles Montantes", "-", `${muro.perfiles.montantes} barras`, "-"],
            ["Perfiles Rieles", "-", `${muro.perfiles.rieles_barras} barras`, "-"],
            ["Tornillos Placa-Perfil", "-", `${muro.tornillos.placa_perfil} un`, "-"],
            ["Tornillos Perfil-Perfil", "-", `${muro.tornillos.perfil_perfil} un`, "-"],
            ["Anclajes Losa", "-", `${muro.tornillos.anclajes_losa} un`, "-"],
            ["Cinta para Juntas", `${muro.cinta.ml_total.toFixed(2)} ml`, `${muro.cinta.rollos} rollos`, "-"],
            ["Masilla", `${muro.masilla.kg_total.toFixed(2)} kg`, `${muro.masilla.bolsas} bolsas`, "-"],
            ["Aislante", `${muro.aislante.m2.toFixed(2)} m²`, `${muro.aislante.paquetes} paq`, "-"],
            ["Esquineros Metálicos", `${muro.esquineros.ml_total.toFixed(2)} ml`, "-", "-"]
          ]
        },
        layout: "lightHorizontalLines"
      },
      { text: "\n\n" }
    );
  }

  // Definición del documento
  const docDefinition = {
    content,
    styles: {
      header: {
        fontSize: 18,
        bold: true,
        color: "#0F172A",
        margin: [0, 0, 0, 10]
      },
      subheader: {
        fontSize: 10,
        italic: true,
        color: "#475569"
      },
      sectionHeader: {
        fontSize: 14,
        bold: true,
        color: "#1E293B",
        margin: [0, 10, 0, 5],
        decoration: "underline"
      },
      ambientSubHeader: {
        fontSize: 12,
        bold: true,
        color: "#1E3A8A",
        margin: [0, 5, 0, 3]
      },
      tableHeader: {
        fontSize: 10,
        bold: true,
        color: "#1E293B"
      },
      bodyTextSmall: {
        fontSize: 9,
        color: "#64748B"
      }
    },
    defaultStyle: {
      fontSize: 10,
      color: "#334155"
    }
  };

  const pdfDoc = pdfMake.createPdf(docDefinition);
  const buffer = await pdfDoc.getBuffer();
  return Buffer.from(buffer);
}
