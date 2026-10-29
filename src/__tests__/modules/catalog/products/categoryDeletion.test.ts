import { describe, expect, it } from 'vitest';
import { describeCategoryDeletion } from '@modules/catalog/products/utils/categoryDeletion';

describe('describeCategoryDeletion', () => {
  it('uses the plural for several products', () => {
    const text = describeCategoryDeletion('Lácteos', 3);
    expect(text).toContain('"Lácteos"');
    expect(text).toContain('3 productos quedarán sin categoría');
  });

  it('uses the singular for one product', () => {
    expect(describeCategoryDeletion('Lácteos', 1)).toContain('1 producto quedará sin categoría');
  });

  it('says the category is empty when it has no products', () => {
    expect(describeCategoryDeletion('Vacía', 0)).toContain('No tiene productos');
  });

  it('never claims products lose their category when there are none', () => {
    expect(describeCategoryDeletion('Vacía', 0)).not.toContain('sin categoría');
  });
});
