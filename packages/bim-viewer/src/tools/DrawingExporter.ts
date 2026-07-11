export interface DrawingExportData {
  proyectoNombre: string;
  muroNombre: string;
  largo_m: number;
  alto_m: number;
  distanciaParantes_cm: number;
  perfilCodigo: string;
  rielCodigo: string;
  placaTipo: string;
  aberturas: Array<{
    x: number;
    y: number;
    w: number;
    h: number;
    tipo: 'puerta' | 'ventana' | 'pase';
  }>;
}

export class DrawingExporter {
  /**
   * Genera un plano SVG técnico con membrete y acotaciones constructivas (cotas) listo para descarga.
   */
  static generateTechnicalDrawing(data: DrawingExportData): string {
    const scale = 80; // Píxeles por metro para el dibujo
    const padding = 120; // Margen para membrete y cotas
    
    const wPx = data.largo_m * scale;
    const hPx = data.alto_m * scale;
    
    const viewWidth = wPx + padding * 2;
    const viewHeight = hPx + padding * 2;

    const today = new Date().toLocaleDateString();

    let svg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${viewWidth} ${viewHeight}" width="100%" height="100%" style="background:#0f172a; font-family:'Segoe UI', sans-serif;">`;

    // 1. Estilos CSS internos para estética tipo CAD/Blueprint
    svg += `
      <style>
        .border-line { stroke: #38bdf8; stroke-width: 2; fill: none; }
        .grid-line { stroke: #334155; stroke-dasharray: 4 4; stroke-width: 0.5; }
        .stud { fill: #f43f5e; stroke: #ffffff; stroke-width: 0.5; opacity: 0.85; }
        .track { fill: #3b82f6; stroke: #ffffff; stroke-width: 0.5; opacity: 0.85; }
        .dimension-line { stroke: #10b981; stroke-width: 1; }
        .dimension-text { fill: #34d399; font-size: 11px; font-weight: 600; text-anchor: middle; }
        .opening { fill: #020617; stroke: #e2e8f0; stroke-width: 1; stroke-dasharray: 2 2; }
        .text-header { fill: #38bdf8; font-weight: 800; font-size: 16px; }
        .text-body { fill: #94a3b8; font-size: 10px; }
        .text-value { fill: #f1f5f9; font-size: 11px; font-weight: 600; }
        .border-outer { stroke: #1e293b; stroke-width: 4; fill: none; }
      </style>
    `;

    // 2. Grilla de fondo tipo Blueprint
    for (let x = 20; x < viewWidth; x += 40) {
      svg += `<line x1="${x}" y1="20" x2="${x}" y2="${viewHeight - 20}" class="grid-line" />`;
    }
    for (let y = 20; y < viewHeight; y += 40) {
      svg += `<line x1="20" y1="${y}" x2="${viewWidth - 20}" y2="${y}" class="grid-line" />`;
    }

    // 3. Marco exterior del plano
    svg += `<rect x="15" y="15" width="${viewWidth - 30}" height="${viewHeight - 30}" class="border-outer" />`;
    svg += `<rect x="25" y="25" width="${viewWidth - 50}" height="${viewHeight - 50}" class="border-line" />`;

    // 4. Área de Dibujo del Muro
    const startX = padding;
    const startY = padding;

    // Riel inferior y superior
    const trackHeight = 4.0 * scale / 100; // a escala
    svg += `<rect x="${startX}" y="${startY + hPx - trackHeight}" width="${wPx}" height="${trackHeight}" class="track" />`;
    svg += `<rect x="${startX}" y="${startY}" width="${wPx}" height="${trackHeight}" class="track" />`;

    // Distribución de Parantes (Verticales)
    const spacingM = data.distanciaParantes_cm / 100;
    const studWidth = 4.0 * scale / 100; // Ancho del parante a escala (4cm)
    
    let currentX = 0;
    while (currentX <= data.largo_m) {
      const posX = startX + currentX * scale;
      // Dibujar parante si no coincide al 100% con aberturas grandes (para simplificar)
      svg += `<rect x="${posX}" y="${startY + trackHeight}" width="${studWidth}" height="${hPx - trackHeight * 2}" class="stud" />`;
      
      // Acotaciones de espacio entre parantes (cotas)
      if (currentX > 0) {
        const prevPosX = startX + (currentX - spacingM) * scale;
        const cotaY = startY + hPx + 40;
        // Línea de cota
        svg += `<line x1="${prevPosX}" y1="${cotaY}" x2="${posX}" y2="${cotaY}" class="dimension-line" />`;
        // Extremos de cota (flechas o tildes CAD)
        svg += `<line x1="${prevPosX}" y1="${cotaY - 5}" x2="${prevPosX}" y2="${cotaY + 5}" class="dimension-line" />`;
        svg += `<line x1="${posX}" y1="${cotaY - 5}" x2="${posX}" y2="${cotaY + 5}" class="dimension-line" />`;
        // Texto con el espaciado
        svg += `<text x="${(prevPosX + posX) / 2}" y="${cotaY - 5}" class="dimension-text">${data.distanciaParantes_cm} cm</text>`;
      }

      currentX += spacingM;
    }

    // Parante final de cierre (derecho)
    const finalPosX = startX + wPx - studWidth;
    svg += `<rect x="${finalPosX}" y="${startY + trackHeight}" width="${studWidth}" height="${hPx - trackHeight * 2}" class="stud" />`;

    // Aberturas (Vanos)
    data.aberturas.forEach((ab) => {
      const abX = startX + ab.x * scale;
      const abY = startY + (data.alto_m - ab.y - ab.h) * scale;
      const abW = ab.w * scale;
      const abH = ab.h * scale;

      // Dibujar vano
      svg += `<rect x="${abX}" y="${abY}" width="${abW}" height="${abH}" class="opening" />`;
      
      // Etiqueta del vano
      svg += `<text x="${abX + abW / 2}" y="${abY + abH / 2 + 4}" font-size="9px" fill="#e2e8f0" font-weight="bold" text-anchor="middle">${ab.tipo.toUpperCase()}</text>`;
      svg += `<text x="${abX + abW / 2}" y="${abY + abH / 2 + 14}" font-size="8px" fill="#94a3b8" text-anchor="middle">${ab.w.toFixed(2)}x${ab.h.toFixed(2)}m</text>`;
    });

    // 5. Cotas del Muro general (Largo y Alto)
    // Cota de Ancho total (Superior)
    svg += `<line x1="${startX}" y1="${startY - 40}" x2="${startX + wPx}" y2="${startY - 40}" class="dimension-line" />`;
    svg += `<line x1="${startX}" y1="${startY - 45}" x2="${startX}" y2="${startY - 35}" class="dimension-line" />`;
    svg += `<line x1="${startX + wPx}" y1="${startY - 45}" x2="${startX + wPx}" y2="${startY - 35}" class="dimension-line" />`;
    svg += `<text x="${startX + wPx / 2}" y="${startY - 48}" class="dimension-text" font-size="12px">LARGO TOTAL: ${data.largo_m.toFixed(2)} m</text>`;

    // Cota de Alto total (Izquierda)
    svg += `<line x1="${startX - 40}" y1="${startY}" x2="${startX - 40}" y2="${startY + hPx}" class="dimension-line" />`;
    svg += `<line x1="${startX - 45}" y1="${startY}" x2="${startX - 35}" y2="${startY}" class="dimension-line" />`;
    svg += `<line x1="${startX - 45}" y1="${startY + hPx}" x2="${startX - 35}" y2="${startY + hPx}" class="dimension-line" />`;
    svg += `<text x="${startX - 48}" y="${startY + hPx / 2}" class="dimension-text" font-size="12px" transform="rotate(-90, ${startX - 48}, ${startY + hPx / 2})">ALTO TOTAL: ${data.alto_m.toFixed(2)} m</text>`;

    // 6. Membrete Técnico Profesional (Esquina inferior derecha)
    const tagW = 280;
    const tagH = 90;
    const tagX = viewWidth - tagW - 35;
    const tagY = viewHeight - tagH - 35;

    svg += `<rect x="${tagX}" y="${tagY}" width="${tagW}" height="${tagH}" fill="#1e293b" stroke="#38bdf8" stroke-width="1.5" rx="6" />`;
    
    // Líneas divisoras del membrete
    svg += `<line x1="${tagX}" y1="${tagY + 30}" x2="${tagX + tagW}" y2="${tagY + 30}" stroke="#334155" />`;
    svg += `<line x1="${tagX + 160}" y1="${tagY + 30}" x2="${tagX + 160}" y2="${tagY + tagH}" stroke="#334155" />`;

    // Textos del membrete
    svg += `<text x="${tagX + 12}" y="${tagY + 20}" class="text-header">DRYWALL CALC STUDIO</text>`;
    
    svg += `<text x="${tagX + 12}" y="${tagY + 42}" class="text-body">PROYECTO:</text>`;
    svg += `<text x="${tagX + 12}" y="${tagY + 54}" class="text-value">${data.proyectoNombre.slice(0, 22)}</text>`;
    
    svg += `<text x="${tagX + 12}" y="${tagY + 68}" class="text-body">MURO:</text>`;
    svg += `<text x="${tagX + 12}" y="${tagY + 80}" class="text-value">${data.muroNombre.slice(0, 22)}</text>`;

    svg += `<text x="${tagX + 172}" y="${tagY + 42}" class="text-body">FECHA:</text>`;
    svg += `<text x="${tagX + 172}" y="${tagY + 54}" class="text-value">${today}</text>`;
    
    svg += `<text x="${tagX + 172}" y="${tagY + 68}" class="text-body">ESCALA:</text>`;
    svg += `<text x="${tagX + 172}" y="${tagY + 80}" class="text-value">1:25 / CAD</text>`;

    svg += '</svg>';
    return svg;
  }

  /**
   * Genera un plano DXF técnico con capas de colores (Red/Blue/Green/Yellow/Cyan) listo para importar en AutoCAD.
   */
  static generateTechnicalDxf(data: DrawingExportData): string {
    const dxf: string[] = [];

    // 1. Cabecera y Definición de Capas con Colores (AutoCAD Standard Colors)
    dxf.push(
      "  0", "SECTION",
      "  2", "TABLES",
      "  0", "TABLE",
      "  2", "LAYER",
      " 70", "5",
      
      // Capa Rieles (Azul = 5)
      "  0", "LAYER",
      "  2", "ESTRUCTURA_RIELES",
      " 70", "0",
      " 62", "5",
      
      // Capa Parantes (Rojo = 1)
      "  0", "LAYER",
      "  2", "ESTRUCTURA_PARANTES",
      " 70", "0",
      " 62", "1",
      
      // Capa Aberturas/Vanos (Celeste/Cyan = 4)
      "  0", "LAYER",
      "  2", "ABERTURAS",
      " 70", "0",
      " 62", "4",
      
      // Capa Cotas/Medidas (Verde = 3)
      "  0", "LAYER",
      "  2", "COTAS",
      " 70", "0",
      " 62", "3",
      
      // Capa Membrete/Marco (Amarillo = 2)
      "  0", "LAYER",
      "  2", "MEMBRETE",
      " 70", "0",
      " 62", "2",
      
      "  0", "ENDTAB",
      "  0", "ENDSEC",
      
      // Sección de Entidades
      "  0", "SECTION",
      "  2", "ENTITIES"
    );

    // Helpers locales para escribir DXF
    const addLine = (layer: string, x1: number, y1: number, x2: number, y2: number) => {
      dxf.push(
        "  0", "LINE",
        "  8", layer,
        " 10", x1.toFixed(3),
        " 20", y1.toFixed(3),
        " 30", "0.0",
        " 11", x2.toFixed(3),
        " 21", y2.toFixed(3),
        " 31", "0.0"
      );
    };

    const addRect = (layer: string, rx: number, ry: number, rw: number, rh: number) => {
      addLine(layer, rx, ry, rx + rw, ry);
      addLine(layer, rx + rw, ry, rx + rw, ry + rh);
      addLine(layer, rx + rw, ry + rh, rx, ry + rh);
      addLine(layer, rx, ry + rh, rx, ry);
    };

    const addText = (layer: string, val: string, tx: number, ty: number, h = 0.08) => {
      dxf.push(
        "  0", "TEXT",
        "  8", layer,
        " 10", tx.toFixed(3),
        " 20", ty.toFixed(3),
        " 30", "0.0",
        " 40", h.toFixed(3),
        "  1", val
      );
    };

    // 2. Dibujar Marco y Borde Técnico
    const pad = 0.50; // Margen de 50cm para cotas y membrete
    const w = data.largo_m;
    const h = data.alto_m;
    
    // Marco exterior en capa MEMBRETE
    addRect("MEMBRETE", -pad, -pad, w + pad * 2, h + pad * 2);
    // Borde interno de dibujo
    addRect("MEMBRETE", -pad + 0.05, -pad + 0.05, w + pad * 2 - 0.10, h + pad * 2 - 0.10);

    // 3. Rieles Solera (Inferior y Superior)
    const trackH = 0.04;
    addRect("ESTRUCTURA_RIELES", 0, 0, w, trackH);
    addRect("ESTRUCTURA_RIELES", 0, h - trackH, w, trackH);

    // 4. Parantes Verticales (Montantes)
    const spacingM = data.distanciaParantes_cm / 100;
    const studW = 0.04; // 4cm

    let currentX = 0;
    while (currentX <= w) {
      // Omitir si cae dentro de un vano
      const insideOpening = data.aberturas.some(ab => 
        currentX >= ab.x && currentX <= (ab.x + ab.w)
      );

      if (!insideOpening || currentX === 0 || currentX >= (w - 0.05)) {
        addRect("ESTRUCTURA_PARANTES", currentX, trackH, studW, h - trackH * 2);
      }
      currentX += spacingM;
    }

    // Parante de cierre final
    const finalPosX = w - studW;
    addRect("ESTRUCTURA_PARANTES", finalPosX, trackH, studW, h - trackH * 2);

    // 5. Aberturas / Vanos y Refuerzos
    data.aberturas.forEach((ab, idx) => {
      // Hueco en capa ABERTURAS
      addRect("ABERTURAS", ab.x, ab.y, ab.w, ab.h);
      
      // Refuerzos perimetrales del vano
      // Dintel
      addRect("ESTRUCTURA_RIELES", ab.x, ab.y + ab.h, ab.w, 0.04);
      // Jambas
      addRect("ESTRUCTURA_PARANTES", ab.x - studW, ab.y, studW, ab.h);
      addRect("ESTRUCTURA_PARANTES", ab.x + ab.w, ab.y, studW, ab.h);
      
      // Si es ventana, antepecho
      if (ab.tipo === "ventana") {
        addRect("ESTRUCTURA_RIELES", ab.x, ab.y - 0.04, ab.w, 0.04);
      }

      // Textos del vano
      addText("ABERTURAS", `${ab.tipo.toUpperCase()} #${idx + 1}`, ab.x + ab.w/2 - 0.20, ab.y + ab.h/2 + 0.05, 0.06);
      addText("ABERTURAS", `${ab.w.toFixed(2)}x${ab.h.toFixed(2)}m`, ab.x + ab.w/2 - 0.20, ab.y + ab.h/2 - 0.05, 0.05);
    });

    // 6. Cotas / Acotaciones Constructivas (Líneas y texto)
    // Cota de Largo General (Superior)
    const cotaYTop = h + 0.25;
    addLine("COTAS", 0, cotaYTop, w, cotaYTop);
    addLine("COTAS", 0, cotaYTop - 0.05, 0, cotaYTop + 0.05);
    addLine("COTAS", w, cotaYTop - 0.05, w, cotaYTop + 0.05);
    addText("COTAS", `LARGO TOTAL: ${w.toFixed(2)} m`, w/2 - 0.40, cotaYTop + 0.06, 0.07);

    // Cota de Alto General (Izquierda)
    const cotaXLeft = -0.25;
    addLine("COTAS", cotaXLeft, 0, cotaXLeft, h);
    addLine("COTAS", cotaXLeft - 0.05, 0, cotaXLeft + 0.05, 0);
    addLine("COTAS", cotaXLeft - 0.05, h, cotaXLeft + 0.05, h);
    addText("COTAS", `ALTO TOTAL: ${h.toFixed(2)} m`, cotaXLeft - 0.12, h/2 - 0.30, 0.07);

    // Cotas de modulación de parantes (Abajo)
    currentX = spacingM;
    while (currentX <= w) {
      const prevX = currentX - spacingM;
      const cotaYBottom = -0.25;
      addLine("COTAS", prevX, cotaYBottom, currentX, cotaYBottom);
      addLine("COTAS", prevX, cotaYBottom - 0.03, prevX, cotaYBottom + 0.03);
      addLine("COTAS", currentX, cotaYBottom - 0.03, currentX, cotaYBottom + 0.03);
      addText("COTAS", `${data.distanciaParantes_cm}cm`, prevX + spacingM/2 - 0.10, cotaYBottom + 0.05, 0.05);
      currentX += spacingM;
    }

    // 7. Membrete Profesional (Esquina inferior derecha)
    const mX = w + pad - 2.50;
    const mY = -pad + 0.05;
    const mW = 2.40;
    const mH = 0.60;

    addRect("MEMBRETE", mX, mY, mW, mH);
    addLine("MEMBRETE", mX, mY + 0.25, mX + mW, mY + 0.25);
    addLine("MEMBRETE", mX + 1.40, mY, mX + 1.40, mY + 0.25);

    addText("MEMBRETE", "DRYWALL CALC STUDIO", mX + 0.10, mY + 0.35, 0.09);
    addText("MEMBRETE", `PROYECTO: ${data.proyectoNombre}`, mX + 0.10, mY + 0.15, 0.05);
    addText("MEMBRETE", `MURO: ${data.muroNombre}`, mX + 0.10, mY + 0.05, 0.05);
    addText("MEMBRETE", `FECHA: ${new Date().toLocaleDateString()}`, mX + 1.50, mY + 0.15, 0.05);
    addText("MEMBRETE", "ESCALA: 1:25", mX + 1.50, mY + 0.05, 0.05);

    // 8. Cierre de Secciones
    dxf.push(
      "  0", "ENDSEC",
      "  0", "EOF"
    );

    return dxf.join("\n");
  }
}
