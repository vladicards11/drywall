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
}
