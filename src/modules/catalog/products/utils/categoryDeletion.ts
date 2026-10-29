// FR6.2: la confirmación dice cuántos productos quedarán sin categoría.
export function describeCategoryDeletion(name: string, productCount: number): string {
  if (productCount <= 0) {
    return `¿Eliminar la categoría "${name}"? No tiene productos.`;
  }
  if (productCount === 1) {
    return `¿Eliminar la categoría "${name}"? 1 producto quedará sin categoría.`;
  }
  return `¿Eliminar la categoría "${name}"? ${productCount} productos quedarán sin categoría.`;
}
