import type { SettingValueType } from "../models";

export const VALUE_TYPE_OPTIONS: { value: SettingValueType; label: string }[] = [
  { value: 'string', label: 'Texto' },
  { value: 'multiline', label: 'Texto largo' },
  { value: 'number', label: 'Número' },
  { value: 'boolean', label: 'Verdadero/Falso' },
  { value: 'image_path', label: 'Imagen' },
];

export const IS_DEV = import.meta.env.DEV;