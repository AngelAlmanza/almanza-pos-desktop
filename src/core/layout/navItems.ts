export type NavIconKey =
  | 'pos'
  | 'sales'
  | 'customers'
  | 'products'
  | 'users'
  | 'cashRegister'
  | 'reports'
  | 'settings';

export interface NavItemData {
  label: string;
  path: string;
  iconKey: NavIconKey;
  adminOnly: boolean;
}

// FR1.1: una sola entrada "Productos"; sin "Categorías" ni "Inventario".
export const NAV_ITEMS: NavItemData[] = [
  { label: 'Punto de Venta', path: '/pos', iconKey: 'pos', adminOnly: false },
  { label: 'Ventas', path: '/sales', iconKey: 'sales', adminOnly: false },
  { label: 'Clientes', path: '/customers', iconKey: 'customers', adminOnly: false },
  { label: 'Productos', path: '/products', iconKey: 'products', adminOnly: false },
  { label: 'Usuarios', path: '/users', iconKey: 'users', adminOnly: true },
  { label: 'Cortes de Caja', path: '/cash-register', iconKey: 'cashRegister', adminOnly: false },
  { label: 'Reportes', path: '/reports', iconKey: 'reports', adminOnly: true },
  { label: 'Configuración', path: '/settings', iconKey: 'settings', adminOnly: true },
];

export function getVisibleNavItems(isAdmin: boolean): NavItemData[] {
  return NAV_ITEMS.filter((item) => !item.adminOnly || isAdmin);
}

// FR1.2: direcciones de las pantallas antiguas que ahora viven en Productos.
export function getLegacyRedirect(path: string, isAdmin: boolean): string | null {
  if (path === '/categories') return '/products';
  if (path === '/inventory') return isAdmin ? '/products?tab=history' : '/products';
  return null;
}
