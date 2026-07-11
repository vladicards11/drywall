/**
 * index.ts — Public API del paquete @drywall-calc/ifc-importer
 */

export { parseIFC, disposeParser } from './parser.js';
export { mapMuroIFCToFormData, mapMurosIFCToFormData } from './mapper.js';
export { inyectarEstructuraDrywall } from './injector.js';
export type { WallInjectionData, InjectorElement } from './injector.js';
export type {
  IfcImportResult,
  MuroIFC,
  AberturaIFC,
  UnionIFC,
  TipoAbertura,
  IfcParserOptions,
} from './types.js';
export type { MuroFormDataMinimal, AberturaFormDataMinimal } from './mapper.js';
