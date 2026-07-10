import ExcelJS from "exceljs";
import { ResultadoProyecto, Catalogo } from "@drywall-calc/catalog-schemas";

export async function exportarAExcel(
  proyecto: ResultadoProyecto,
  catalogo: Catalogo
): Promise<Buffer> {
  const workbook = new ExcelJS.Workbook();
  workbook.creator = "Drywall Calc";
  workbook.created = new Date();

  // ==========================================
  // HOJA 1: RESUMEN CONSOLIDADO
  // ==========================================
  const wsResumen = workbook.addWorksheet("Resumen Consolidado");
  wsResumen.views = [{ showGridLines: true }];

  // Estilos base
  const fontTitle = { name: "Segoe UI", size: 16, bold: true, color: { argb: "FF0F172A" } };
  const fontSubtitle = { name: "Segoe UI", size: 11, italic: true, color: { argb: "FF475569" } };
  const fontHeader = { name: "Segoe UI", size: 11, bold: true, color: { argb: "FFFFFFFF" } };
  const fontBold = { name: "Segoe UI", size: 11, bold: true, color: { argb: "FF0F172A" } };
  const fontRegular = { name: "Segoe UI", size: 11, color: { argb: "FF334155" } };

  const fillHeader = {
    type: "pattern" as const,
    pattern: "solid" as const,
    fgColor: { argb: "FF1E293B" }, // Slate 800
  };

  const fillSubHeader = {
    type: "pattern" as const,
    pattern: "solid" as const,
    fgColor: { argb: "FFE2E8F0" }, // Slate 200
  };

  const borderThin = {
    top: { style: "thin" as const, color: { argb: "FFCBD5E1" } },
    left: { style: "thin" as const, color: { argb: "FFCBD5E1" } },
    bottom: { style: "thin" as const, color: { argb: "FFCBD5E1" } },
    right: { style: "thin" as const, color: { argb: "FFCBD5E1" } },
  };

  // Título
  wsResumen.mergeCells("A1:E1");
  const cellTitle = wsResumen.getCell("A1");
  cellTitle.value = "PRESUPUESTO CONSOLIDADO DE MATERIALES";
  cellTitle.font = fontTitle;
  cellTitle.alignment = { vertical: "middle", horizontal: "left" };
  wsResumen.getRow(1).height = 35;

  // Subtítulo
  wsResumen.mergeCells("A2:E2");
  const cellSubtitle = wsResumen.getCell("A2");
  cellSubtitle.value = `Proyecto: ${proyecto.proyecto} | Catálogo: Estandar Genérico`;
  cellSubtitle.font = fontSubtitle;
  cellSubtitle.alignment = { vertical: "middle", horizontal: "left" };
  wsResumen.getRow(2).height = 20;

  wsResumen.addRow([]); // Fila vacía

  // Encabezados de tabla
  const headerRow = wsResumen.addRow([
    "Material",
    "Especificación / Detalle",
    "Consumo Neto (Teórico)",
    "Unidades Comerciales",
    "Peso Estructural (kg)",
  ]);
  headerRow.height = 28;
  headerRow.eachCell((cell) => {
    cell.font = fontHeader;
    cell.fill = fillHeader;
    cell.alignment = { vertical: "middle", horizontal: "left" };
    cell.border = borderThin;
  });

  // Datos
  const t = proyecto.totales;
  const rowsData = [
    [
      "Placas de Yeso",
      "Placas de yeso según modulación",
      "-",
      `${t.placas.cantidad_total} unidades`,
      `${t.placas.peso_total_kg.toFixed(2)} kg`,
    ],
    [
      "Perfiles Montantes",
      `Montante comercial (${catalogo.perfiles.montante[0]?.largo_barra_m || 3.0}m)`,
      "-",
      `${t.perfiles.montantes} barras`,
      "-",
    ],
    [
      "Perfiles Rieles",
      `Riel comercial (${catalogo.perfiles.riel[0]?.largo_barra_m || 3.0}m)`,
      "-",
      `${t.perfiles.rieles_barras} barras`,
      "-",
    ],
    [
      "Tornillos Placa-Perfil",
      "Fijación de placas a perfiles",
      "-",
      `${t.tornillos.placa_perfil} unidades`,
      "-",
    ],
    [
      "Tornillos Perfil-Perfil",
      "Unión de perfiles (metal-metal)",
      "-",
      `${t.tornillos.perfil_perfil} unidades`,
      "-",
    ],
    [
      "Anclajes Losa",
      "Anclaje de rieles a losa/piso",
      "-",
      `${t.tornillos.anclajes_losa} unidades`,
      "-",
    ],
    [
      "Cinta para Juntas",
      `Cinta de papel microperforada (rollos de ${catalogo.cinta.rendimiento_ml_por_rollo}m)`,
      `${t.cinta.ml_total.toFixed(2)} ml`,
      `${t.cinta.rollos} rollos`,
      "-",
    ],
    [
      "Masilla",
      `Masilla en polvo/lista para usar (bolsas de ${catalogo.masilla.presentacion_kg_por_bolsa}kg)`,
      `${t.masilla.kg_total.toFixed(2)} kg`,
      `${t.masilla.bolsas} bolsas`,
      "-",
    ],
    [
      "Aislante",
      `Aislante termoacústico (paquetes de ${catalogo.aislante.presentacion_m2_por_paquete}m²)`,
      `${t.aislante.m2.toFixed(2)} m²`,
      `${t.aislante.paquetes} paquetes`,
      "-",
    ],
    [
      "Esquineros Metálicos",
      "Cantonera protectora de esquinas externas",
      `${t.esquineros.ml_total.toFixed(2)} ml`,
      "-",
      "-",
    ],
  ];

  rowsData.forEach((r) => {
    const row = wsResumen.addRow(r);
    row.height = 22;
    row.eachCell((cell) => {
      cell.font = fontRegular;
      cell.border = borderThin;
      cell.alignment = { vertical: "middle", horizontal: "left" };
    });
  });

  // Ajustar anchos de columnas
  wsResumen.columns.forEach((col) => {
    let maxLen = 0;
    col.eachCell!({ includeEmpty: true }, (cell) => {
      const cellLen = cell.value ? cell.value.toString().length : 0;
      if (cellLen > maxLen) maxLen = cellLen;
    });
    col.width = Math.max(maxLen + 4, 15);
  });

  // ==========================================
  // HOJA 2: DETALLE DESGLOSADO
  // ==========================================
  const wsDetalle = workbook.addWorksheet("Detalle por Muro y Ambiente");
  wsDetalle.views = [{ showGridLines: true }];

  // Título
  wsDetalle.mergeCells("A1:G1");
  const cellTitle2 = wsDetalle.getCell("A1");
  cellTitle2.value = "DESGLOSE DETALLADO DE MATERIALES";
  cellTitle2.font = fontTitle;
  cellTitle2.alignment = { vertical: "middle", horizontal: "left" };
  wsDetalle.getRow(1).height = 35;

  let currentRowNum = 3;

  // Si hay ambientes, listar primero los ambientes
  if (proyecto.por_ambiente && proyecto.por_ambiente.length > 0) {
    wsDetalle.getCell(`A${currentRowNum}`).value = "DESGLOSE POR AMBIENTE";
    wsDetalle.getCell(`A${currentRowNum}`).font = { name: "Segoe UI", size: 14, bold: true, color: { argb: "FF1E3A8A" } };
    currentRowNum += 2;

    for (const amb of proyecto.por_ambiente) {
      // Subcabecera de Ambiente
      wsDetalle.mergeCells(`A${currentRowNum}:G${currentRowNum}`);
      const cellAmb = wsDetalle.getCell(`A${currentRowNum}`);
      cellAmb.value = `Ambiente: ${amb.nombre} (ID: ${amb.ambiente_id})`;
      cellAmb.font = fontBold;
      cellAmb.fill = fillSubHeader;
      cellAmb.alignment = { vertical: "middle", horizontal: "left" };
      wsDetalle.getRow(currentRowNum).height = 24;
      currentRowNum += 1;

      // Headers para la tabla del ambiente
      const headersAmb = ["Material", "Especificación", "Consumo Neto", "Unidades Comerciales", "Peso Estructural (kg)"];
      const rHeader = wsDetalle.addRow(headersAmb);
      rHeader.height = 24;
      rHeader.eachCell((cell) => {
        cell.font = fontHeader;
        cell.fill = fillHeader;
        cell.border = borderThin;
        cell.alignment = { vertical: "middle", horizontal: "left" };
      });
      currentRowNum += 1;

      const amt = amb.totales;
      const rowsAmbData = [
        ["Placas de Yeso", "-", "-", `${amt.placas.cantidad_total} unidades`, `${amt.placas.peso_total_kg.toFixed(2)} kg`],
        ["Perfiles Montantes", "-", "-", `${amt.perfiles.montantes} barras`, "-"],
        ["Perfiles Rieles", "-", "-", `${amt.perfiles.rieles_barras} barras`, "-"],
        ["Tornillos Placa-Perfil", "-", "-", `${amt.tornillos.placa_perfil} unidades`, "-"],
        ["Tornillos Perfil-Perfil", "-", "-", `${amt.tornillos.perfil_perfil} unidades`, "-"],
        ["Anclajes Losa", "-", "-", `${amt.tornillos.anclajes_losa} unidades`, "-"],
        ["Cinta para Juntas", "-", `${amt.cinta.ml_total.toFixed(2)} ml`, `${amt.cinta.rollos} rollos`, "-"],
        ["Masilla", "-", `${amt.masilla.kg_total.toFixed(2)} kg`, `${amt.masilla.bolsas} bolsas`, "-"],
        ["Aislante", "-", `${amt.aislante.m2.toFixed(2)} m²`, `${amt.aislante.paquetes} paquetes`, "-"],
        ["Esquineros Metálicos", "-", `${amt.esquineros.ml_total.toFixed(2)} ml`, "-", "-"],
      ];

      rowsAmbData.forEach((r) => {
        const row = wsDetalle.addRow(r);
        row.height = 20;
        row.eachCell((cell) => {
          cell.font = fontRegular;
          cell.border = borderThin;
          cell.alignment = { vertical: "middle", horizontal: "left" };
        });
        currentRowNum += 1;
      });

      currentRowNum += 2; // Espacio
    }
  }

  // Desglose Individual por Muro
  wsDetalle.getCell(`A${currentRowNum}`).value = "DESGLOSE POR MURO INDIVIDUAL";
  wsDetalle.getCell(`A${currentRowNum}`).font = { name: "Segoe UI", size: 14, bold: true, color: { argb: "FF1E3A8A" } };
  currentRowNum += 2;

  for (const muro of proyecto.muros) {
    wsDetalle.mergeCells(`A${currentRowNum}:G${currentRowNum}`);
    const cellMuro = wsDetalle.getCell(`A${currentRowNum}`);
    cellMuro.value = `Muro: ${muro.muro_id}`;
    cellMuro.font = fontBold;
    cellMuro.fill = fillSubHeader;
    cellMuro.alignment = { vertical: "middle", horizontal: "left" };
    wsDetalle.getRow(currentRowNum).height = 24;
    currentRowNum += 1;

    // Tabla del muro
    const headersMuro = ["Material", "Especificación", "Consumo Neto", "Unidades Comerciales", "Peso Estructural (kg)"];
    const rHeader = wsDetalle.addRow(headersMuro);
    rHeader.height = 24;
    rHeader.eachCell((cell) => {
      cell.font = fontHeader;
      cell.fill = fillHeader;
      cell.border = borderThin;
      cell.alignment = { vertical: "middle", horizontal: "left" };
    });
    currentRowNum += 1;

    const rowsMuroData = [
      ["Placas de Yeso", "-", "-", `${muro.placas.cantidad_total} unidades`, `${muro.placas.peso_total_kg.toFixed(2)} kg`],
      ["Perfiles Montantes", "-", "-", `${muro.perfiles.montantes} barras`, "-"],
      ["Perfiles Rieles", "-", "-", `${muro.perfiles.rieles_barras} barras`, "-"],
      ["Tornillos Placa-Perfil", "-", "-", `${muro.tornillos.placa_perfil} unidades`, "-"],
      ["Tornillos Perfil-Perfil", "-", "-", `${muro.tornillos.perfil_perfil} unidades`, "-"],
      ["Anclajes Losa", "-", "-", `${muro.tornillos.anclajes_losa} unidades`, "-"],
      ["Cinta para Juntas", "-", `${muro.cinta.ml_total.toFixed(2)} ml`, `${muro.cinta.rollos} rollos`, "-"],
      ["Masilla", "-", `${muro.masilla.kg_total.toFixed(2)} kg`, `${muro.masilla.bolsas} bolsas`, "-"],
      ["Aislante", "-", `${muro.aislante.m2.toFixed(2)} m²`, `${muro.aislante.paquetes} paquetes`, "-"],
      ["Esquineros Metálicos", "-", `${muro.esquineros.ml_total.toFixed(2)} ml`, "-", "-"],
    ];

    rowsMuroData.forEach((r) => {
      const row = wsDetalle.addRow(r);
      row.height = 20;
      row.eachCell((cell) => {
        cell.font = fontRegular;
        cell.border = borderThin;
        cell.alignment = { vertical: "middle", horizontal: "left" };
      });
      currentRowNum += 1;
    });

    currentRowNum += 2;
  }

  // Ajustar anchos de columnas
  wsDetalle.columns.forEach((col) => {
    let maxLen = 0;
    col.eachCell!({ includeEmpty: true }, (cell) => {
      const cellLen = cell.value ? cell.value.toString().length : 0;
      if (cellLen > maxLen) maxLen = cellLen;
    });
    col.width = Math.max(maxLen + 4, 15);
  });

  const buffer = await workbook.xlsx.writeBuffer();
  return Buffer.from(buffer);
}
