import { describe, expect, it } from 'vitest';
import type { ProductImagePreview } from '@modules/catalog/products/types';
import {
  initialProductImageFieldState,
  productImageFieldReducer,
  toImageChange,
  type ProductImageFieldAction,
  type ProductImageFieldState,
} from '@modules/catalog/products/utils/productImageField';

const SAVED = '123e4567-e89b-42d3-a456-426614174000.png';
const preview: ProductImagePreview = {
  format: 'png',
  size_bytes: 10,
  preview: 'data:image/png;base64,AAAA',
};

function run(
  state: ProductImageFieldState,
  ...actions: ProductImageFieldAction[]
): ProductImageFieldState {
  return actions.reduce(productImageFieldReducer, state);
}

const pick: ProductImageFieldAction = {
  type: 'pick-success',
  sourcePath: 'C:\\fotos\\a.png',
  preview,
};

describe('productImageFieldReducer', () => {
  it('starts as empty without a saved image and as saved with one', () => {
    expect(initialProductImageFieldState(null).status).toBe('empty');
    expect(initialProductImageFieldState(SAVED).status).toBe('saved');
  });

  it('empty -> pending-new on a valid pick, error on an invalid one', () => {
    const empty = initialProductImageFieldState(null);
    const picked = run(empty, pick);
    expect(picked.status).toBe('pending-new');
    expect(picked.pendingPath).toBe('C:\\fotos\\a.png');
    expect(picked.preview).toEqual(preview);

    const failed = run(empty, { type: 'pick-failure', message: 'Formato no permitido.' });
    expect(failed.status).toBe('error');
    expect(failed.errorMessage).toBe('Formato no permitido.');
  });

  it('error -> pending-new when a valid file is picked afterwards and clears the message', () => {
    const state = run(
      initialProductImageFieldState(null),
      { type: 'pick-failure', message: 'mal' },
      pick,
    );
    expect(state.status).toBe('pending-new');
    expect(state.errorMessage).toBeNull();
  });

  it('saved keeps its status (with a visible error) when the new file is invalid', () => {
    const state = run(initialProductImageFieldState(SAVED), {
      type: 'pick-failure',
      message: 'El archivo está vacío.',
    });
    expect(state.status).toBe('saved');
    expect(state.errorMessage).toBe('El archivo está vacío.');
  });

  it('an invalid pick keeps the previous pending change', () => {
    const state = run(initialProductImageFieldState(null), pick, {
      type: 'pick-failure',
      message: 'mal',
    });
    expect(state.status).toBe('pending-new');
    expect(state.pendingPath).toBe('C:\\fotos\\a.png');
    expect(state.errorMessage).toBe('mal');
  });

  it('saved -> pending-remove -> saved with undo', () => {
    const removed = run(initialProductImageFieldState(SAVED), { type: 'remove' });
    expect(removed.status).toBe('pending-remove');
    expect(run(removed, { type: 'undo' }).status).toBe('saved');
  });

  it('saved -> missing when the image fails to load, and missing can be removed or replaced', () => {
    const missing = run(initialProductImageFieldState(SAVED), { type: 'load-failed' });
    expect(missing.status).toBe('missing');
    expect(run(missing, pick).status).toBe('pending-new');
    const removed = run(missing, { type: 'remove' });
    expect(removed.status).toBe('pending-remove');
    expect(run(removed, { type: 'undo' }).status).toBe('missing');
  });

  it('pending-new -> empty on remove when nothing was saved', () => {
    const state = run(initialProductImageFieldState(null), pick, { type: 'remove' });
    expect(state.status).toBe('empty');
    expect(state.pendingPath).toBeNull();
  });

  it('pending-new -> pending-remove on remove when an image was saved, and undo restores the pick', () => {
    const removed = run(initialProductImageFieldState(SAVED), pick, { type: 'remove' });
    expect(removed.status).toBe('pending-remove');
    const undone = run(removed, { type: 'undo' });
    expect(undone.status).toBe('pending-new');
    expect(undone.pendingPath).toBe('C:\\fotos\\a.png');
  });

  it('cancel discards any pending change', () => {
    const state = run(initialProductImageFieldState(SAVED), pick, { type: 'cancel' });
    expect(state.status).toBe('saved');
    expect(state.pendingPath).toBeNull();
    expect(toImageChange(state)).toBeUndefined();
  });

  it('ignores load-failed outside the saved state', () => {
    const pending = run(initialProductImageFieldState(null), pick);
    expect(run(pending, { type: 'load-failed' })).toBe(pending);
  });
});

describe('toImageChange', () => {
  it('is undefined (keep) for empty, saved, missing and error', () => {
    expect(toImageChange(initialProductImageFieldState(null))).toBeUndefined();
    expect(toImageChange(initialProductImageFieldState(SAVED))).toBeUndefined();
    const missing = run(initialProductImageFieldState(SAVED), { type: 'load-failed' });
    expect(toImageChange(missing)).toBeUndefined();
    const failed = run(initialProductImageFieldState(null), { type: 'pick-failure', message: 'x' });
    expect(toImageChange(failed)).toBeUndefined();
  });

  it('is replace with the source path for pending-new', () => {
    expect(toImageChange(run(initialProductImageFieldState(null), pick))).toEqual({
      kind: 'replace',
      source_path: 'C:\\fotos\\a.png',
    });
  });

  it('is remove for pending-remove', () => {
    const removed = run(initialProductImageFieldState(SAVED), { type: 'remove' });
    expect(toImageChange(removed)).toEqual({ kind: 'remove' });
  });
});
