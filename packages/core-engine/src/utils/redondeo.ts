export const EPSILON = 1e-9;

export function roundUpSafe(valor: number): number {
  return Math.ceil(valor - EPSILON);
}

export function roundDownSafe(valor: number): number {
  return Math.floor(valor + EPSILON);
}

export function iguales(a: number, b: number): boolean {
  return Math.abs(a - b) < EPSILON;
}

export function roundFloat(valor: number): number {
  return Math.round(valor * 10000) / 10000;
}
