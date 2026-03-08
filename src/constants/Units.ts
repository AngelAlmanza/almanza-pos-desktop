import type { ProductUnit } from '../types';

export const UNITS: readonly ProductUnit[] = [
  'pieza',
  'kg',
  'litro',
  'metro',
  'paquete',
  'caja',
  'otro',
] as const;
