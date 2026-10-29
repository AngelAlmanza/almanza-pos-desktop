import { describe, expect, it } from 'vitest';
import { getLegacyRedirect, getVisibleNavItems } from '@core/layout/navItems';

describe('getVisibleNavItems', () => {
  it('shows Productos but not Categorías or Inventario to the admin', () => {
    const labels = getVisibleNavItems(true).map((item) => item.label);
    expect(labels).toContain('Productos');
    expect(labels).not.toContain('Categorías');
    expect(labels).not.toContain('Inventario');
    expect(labels).toContain('Usuarios');
  });

  it('shows Productos to the cashier', () => {
    const paths = getVisibleNavItems(false).map((item) => item.path);
    expect(paths).toContain('/products');
  });

  it('hides admin-only entries from the cashier', () => {
    const paths = getVisibleNavItems(false).map((item) => item.path);
    expect(paths).not.toContain('/users');
    expect(paths).not.toContain('/reports');
    expect(paths).not.toContain('/settings');
  });
});

describe('getLegacyRedirect', () => {
  it('sends /categories to /products', () => {
    expect(getLegacyRedirect('/categories', true)).toBe('/products');
    expect(getLegacyRedirect('/categories', false)).toBe('/products');
  });

  it('sends /inventory to the history tab for admins and to /products otherwise', () => {
    expect(getLegacyRedirect('/inventory', true)).toBe('/products?tab=history');
    expect(getLegacyRedirect('/inventory', false)).toBe('/products');
  });

  it('returns null for other paths', () => {
    expect(getLegacyRedirect('/sales', true)).toBeNull();
  });
});
