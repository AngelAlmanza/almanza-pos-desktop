import type { ProductPermissions } from '@modules/catalog/products/types';

// FR1.3: tabla de permisos por rol. Lo que no se permite se oculta (FR1.4).
export function getProductPermissions(isAdmin: boolean): ProductPermissions {
  return {
    canViewList: true,
    canAdjustStock: true,
    canManageProducts: isAdmin,
    canManageCategories: isAdmin,
    canViewHistory: isAdmin,
  };
}
