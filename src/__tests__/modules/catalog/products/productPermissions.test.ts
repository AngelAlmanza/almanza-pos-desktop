import { describe, expect, it } from 'vitest';
import { getProductPermissions } from '@modules/catalog/products/utils/productPermissions';

describe('getProductPermissions', () => {
  it('gives the admin every permission', () => {
    expect(getProductPermissions(true)).toEqual({
      canViewList: true,
      canAdjustStock: true,
      canManageProducts: true,
      canManageCategories: true,
      canViewHistory: true,
    });
  });

  it('lets the cashier view the list and adjust stock only', () => {
    const permissions = getProductPermissions(false);
    expect(permissions.canViewList).toBe(true);
    expect(permissions.canAdjustStock).toBe(true);
  });

  it('hides product management from the cashier', () => {
    expect(getProductPermissions(false).canManageProducts).toBe(false);
  });

  it('hides category management from the cashier', () => {
    expect(getProductPermissions(false).canManageCategories).toBe(false);
  });

  it('hides the history from the cashier', () => {
    expect(getProductPermissions(false).canViewHistory).toBe(false);
  });
});
