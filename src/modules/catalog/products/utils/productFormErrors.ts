export type ProductFormField = 'name' | 'barcode' | 'price';

export interface MappedProductError {
  field: ProductFormField | null;
  message: string;
}

// Mensajes reales del backend (modules/catalog/products/application.rs):
//  - "El producto con código de barras {x} ya existe"
//  - "El nombre del producto no puede estar vacío"
//  - "El precio no puede ser negativo"
// FR3.3: el error se asigna al campo; lo que no coincide queda como aviso general.
export function mapProductError(raw: string): MappedProductError {
  const message = raw.trim();
  const lower = message.toLowerCase();
  if (lower.includes('código de barras') && lower.includes('ya existe')) {
    return {
      field: 'barcode',
      message: 'Este código de barras ya existe. Escribe uno distinto o déjalo vacío.',
    };
  }
  if (lower.includes('nombre del producto') && lower.includes('vacío')) {
    return { field: 'name', message: 'Escribe el nombre del producto.' };
  }
  if (lower.includes('precio') && lower.includes('negativo')) {
    return { field: 'price', message: 'El precio no puede ser negativo. Escribe 0 o más.' };
  }
  return { field: null, message };
}
