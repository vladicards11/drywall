import { describe, it, expect, vi } from 'vitest';
import { inyectarEstructuraDrywall } from '../src/injector.js';

// Mock de web-ifc para los tests de inyección
vi.mock('web-ifc', () => {
  return {
    IFCBUILDINGSTOREY: 1,
    IFCRELCONTAINEDINSPATIALSTRUCTURE: 2,
    IFCMEMBER: 3,
    IFCPLATE: 4,
    IFCGLOBALID: 5,
    IfcAPI: class {
      SetWasmPath() {}
      async Init() {}
      OpenModel() { return 42; }
      GetLineIDsWithType(modelID: number, type: number) {
        return {
          size() { return type === 1 ? 1 : 0; },
          get(index: number) { return 101; }
        };
      }
      GetLine(modelID: number, lineID: number) {
        if (lineID === 101) return { RelatingStructure: { value: 101 } };
        return {
          RelatedElements: [{ value: 201 }]
        };
      }
      CreateIfcEntity(modelID: number, type: number, ...args: any[]) {
        return { expressID: 999 };
      }
      WriteLine() {}
      SaveModel() { return new Uint8Array([1, 2, 3]); }
      CloseModel() {}
    }
  };
});

describe('inyectarEstructuraDrywall', () => {
  it('debe inyectar perfiles y placas correctamente y retornar el buffer modificado', async () => {
    const dummyBuffer = new ArrayBuffer(8);
    const data = [
      {
        muroId: 'Wall-01',
        elementos: [
          { tipo: 'parante' as const, nombre: 'Parante P1' },
          { tipo: 'placa' as const, nombre: 'Placa Yeso' }
        ]
      }
    ];

    const result = await inyectarEstructuraDrywall(dummyBuffer, data, '/mock-wasm/');
    expect(result).toBeInstanceOf(Uint8Array);
    expect(result[0]).toBe(1);
    expect(result[1]).toBe(2);
    expect(result[2]).toBe(3);
  });
});
