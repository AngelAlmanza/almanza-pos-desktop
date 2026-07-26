import type { ProductUnit } from '@modules/shared/types/base';

export const UNITS: readonly ProductUnit[] = [
  'pieza',
  'kg',
  'litro',
  'metro',
  'paquete',
  'caja',
  'otro',
] as const;
