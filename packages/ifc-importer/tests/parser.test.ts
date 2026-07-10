/**
 * Tests unitarios del paquete ifc-importer.
 * 
 * Nota: Los tests del parser completo requieren el WASM cargado,
 * por lo que usamos mocks para la inicialización de web-ifc.
 * Los extractores y el mapper se testean con datos simulados.
 */

import { describe, it, expect, vi } from 'vitest';
import { mapMuroIFCToFormData, mapMurosIFCToFormData } from '../src/mapper.js';
import type { MuroIFC, AberturaIFC } from '../src/types.js';

// ─── Fixtures ───────────────────────────────────────────────────────────────

const aberturaEjemplo: AberturaIFC = {
  expressId: 100,
  ancho_m: 0.90,
  alto_m: 2.10,
  posicion_x_m: 1.50,
  tipo: 'puerta',
  confianza: 'seguro',
};

const aberturaEstimada: AberturaIFC = {
  expressId: 200,
  ancho_m: 1.20,
  alto_m: 1.10,
  posicion_x_m: 3.00,
  tipo: 'ventana',
  confianza: 'estimado',
};

const muroSimple: MuroIFC = {
  expressId: 1,
  nombre: 'Muro exterior norte',
  largo_m: 5.40,
  alto_m: 2.80,
  espesor_m: 0.125,
  aberturas: [aberturaEjemplo],
  metodo_extraccion: 'quantity_sets',
  advertencias: [],
};

const muroConBoundingBox: MuroIFC = {
  expressId: 2,
  nombre: 'Muro interior',
  largo_m: 3.20,
  alto_m: 2.80,
  espesor_m: 0.125,
  aberturas: [aberturaEstimada],
  metodo_extraccion: 'bounding_box',
  advertencias: ['Dimensiones extraídas desde bounding box.'],
};

// ─── Tests del Mapper ────────────────────────────────────────────────────────

describe('mapMuroIFCToFormData', () => {
  it('convierte largo_m y alto_m a strings con 2 decimales', () => {
    const result = mapMuroIFCToFormData(muroSimple);
    expect(result.largo_m).toBe('5.40');
    expect(result.alto_m).toBe('2.80');
  });

  it('mapea aberturas correctamente', () => {
    const result = mapMuroIFCToFormData(muroSimple);
    expect(result.aberturas).toHaveLength(1);
    expect(result.aberturas[0].tipo).toBe('puerta');
    expect(result.aberturas[0].ancho_m).toBe(0.90);
    expect(result.aberturas[0].alto_m).toBe(2.10);
    expect(result.aberturas[0].posicion_x_m).toBe(1.50);
  });

  it('no agrega notas cuando los datos son de calidad segura (quantity_sets)', () => {
    const result = mapMuroIFCToFormData(muroSimple);
    expect(result.notas).toBeUndefined();
  });

  it('agrega nota de advertencia cuando se usó bounding box', () => {
    const result = mapMuroIFCToFormData(muroConBoundingBox);
    expect(result.notas).toBeDefined();
    expect(result.notas).toContain('bounding box');
  });

  it('agrega nota de advertencia cuando hay aberturas estimadas', () => {
    const result = mapMuroIFCToFormData(muroConBoundingBox);
    expect(result.notas).toContain('estimada');
  });

  it('mapea un muro sin aberturas correctamente', () => {
    const muroSinAberturas: MuroIFC = { ...muroSimple, aberturas: [] };
    const result = mapMuroIFCToFormData(muroSinAberturas);
    expect(result.aberturas).toHaveLength(0);
  });
});

describe('mapMurosIFCToFormData', () => {
  it('mapea un array completo de muros', () => {
    const result = mapMurosIFCToFormData([muroSimple, muroConBoundingBox]);
    expect(result).toHaveLength(2);
    expect(result[0].largo_m).toBe('5.40');
    expect(result[1].largo_m).toBe('3.20');
  });

  it('retorna array vacío cuando no hay muros', () => {
    const result = mapMurosIFCToFormData([]);
    expect(result).toHaveLength(0);
  });
});

// ─── Tests de tipos de salida ─────────────────────────────────────────────────

describe('IfcImportResult tipos', () => {
  it('MuroIFC tiene todas las propiedades requeridas', () => {
    expect(muroSimple).toHaveProperty('expressId');
    expect(muroSimple).toHaveProperty('largo_m');
    expect(muroSimple).toHaveProperty('alto_m');
    expect(muroSimple).toHaveProperty('aberturas');
    expect(muroSimple).toHaveProperty('metodo_extraccion');
    expect(muroSimple).toHaveProperty('advertencias');
  });

  it('AberturaIFC tiene todas las propiedades requeridas', () => {
    expect(aberturaEjemplo).toHaveProperty('expressId');
    expect(aberturaEjemplo).toHaveProperty('ancho_m');
    expect(aberturaEjemplo).toHaveProperty('alto_m');
    expect(aberturaEjemplo).toHaveProperty('posicion_x_m');
    expect(aberturaEjemplo).toHaveProperty('tipo');
    expect(aberturaEjemplo).toHaveProperty('confianza');
  });

  it('tipo de abertura es puerta, ventana o vano', () => {
    const tipos = ['puerta', 'ventana', 'pase'];
    expect(['puerta', 'ventana', 'pase']).toContain(aberturaEjemplo.tipo);
  });

  it('metodo_extraccion es quantity_sets o bounding_box', () => {
    const metodos = ['quantity_sets', 'bounding_box'];
    expect(metodos).toContain(muroSimple.metodo_extraccion);
    expect(metodos).toContain(muroConBoundingBox.metodo_extraccion);
  });
});

// ─── Tests del Detección de uniones en planta ──────────────────────────────────

describe('detectarUniones', () => {
  it('detecta esquina en L a 90 grados entre dos muros', async () => {
    const { detectarUniones } = await import('../src/extractor/uniones.js');

    // Muro F: va de (0,0) a (3,0)
    const muroF: MuroIFC = {
      expressId: 10,
      largo_m: 3.0,
      alto_m: 2.5,
      aberturas: [],
      metodo_extraccion: 'bounding_box',
      advertencias: [],
      startX: 0,
      startY: 0,
      endX: 3.0,
      endY: 0,
    };

    // Muro G: va de (3,0) a (3,2.5) -> esquina en (3,0)
    const muroG: MuroIFC = {
      expressId: 11,
      largo_m: 2.5,
      alto_m: 2.5,
      aberturas: [],
      metodo_extraccion: 'bounding_box',
      advertencias: [],
      startX: 3.0,
      startY: 0,
      endX: 3.0,
      endY: 2.5,
    };

    const uniones = detectarUniones([muroF, muroG]);
    expect(uniones).toHaveLength(1);
    expect(uniones[0].muros_conectados).toContain(10);
    expect(uniones[0].muros_conectados).toContain(11);
    expect(uniones[0].tipo_union).toBe('L');
    expect(uniones[0].angulo_grados).toBe(90);
  });

  it('detecta encuentro en T a 45 grados', async () => {
    const { detectarUniones } = await import('../src/extractor/uniones.js');

    // Muro H (eje horizontal): de (0,0) a (4,0)
    const muroH: MuroIFC = {
      expressId: 20,
      largo_m: 4.0,
      alto_m: 2.5,
      aberturas: [],
      metodo_extraccion: 'bounding_box',
      advertencias: [],
      startX: 0,
      startY: 0,
      endX: 4.0,
      endY: 0,
    };

    // Muro I (eje diagonal): de (2,0) a (3,1) -> toca en el centro de H en (2,0)
    const dx = 1.0;
    const dy = 1.0;
    // angulo = atan2(1, 1) = 45 grados
    const muroI: MuroIFC = {
      expressId: 21,
      largo_m: 1.414,
      alto_m: 2.5,
      aberturas: [],
      metodo_extraccion: 'bounding_box',
      advertencias: [],
      startX: 2.0,
      startY: 0,
      endX: 2.0 + dx,
      endY: 0 + dy,
    };

    const uniones = detectarUniones([muroH, muroI]);
    expect(uniones).toHaveLength(1);
    expect(uniones[0].tipo_union).toBe('T');
    expect(uniones[0].angulo_grados).toBe(45);
  });
});
