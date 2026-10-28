import { describe, expect, it } from 'vitest';
import {
  VIEW_MODE_KEY,
  clearViewMode,
  readViewMode,
  saveViewMode,
} from '@modules/pos/utils/viewMode';
import type { ViewModeStorage } from '@modules/pos/utils/viewMode';

function fakeStorage(initial: Record<string, string> = {}): ViewModeStorage & { data: Record<string, string> } {
  const data = { ...initial };
  return {
    data,
    getItem: (key: string) => (key in data ? data[key] : null),
    setItem: (key: string, value: string) => { data[key] = value; },
    removeItem: (key: string) => { delete data[key]; },
  };
}

const throwingStorage: ViewModeStorage = {
  getItem: () => { throw new Error('almacenamiento no disponible'); },
  setItem: () => { throw new Error('almacenamiento no disponible'); },
  removeItem: () => { throw new Error('almacenamiento no disponible'); },
};

describe('viewMode', () => {
  it('lee la vista de lista guardada por el usuario actual', () => {
    const storage = fakeStorage({ [VIEW_MODE_KEY]: JSON.stringify({ userId: 1, viewMode: 'list' }) });
    expect(readViewMode(1, storage)).toBe('list');
  });

  it('lee la vista de cuadrícula guardada por el usuario actual (AC3.1)', () => {
    const storage = fakeStorage({ [VIEW_MODE_KEY]: JSON.stringify({ userId: 1, viewMode: 'grid' }) });
    expect(readViewMode(1, storage)).toBe('grid');
  });

  it('devuelve lista cuando el valor es de otro usuario (AC3.3)', () => {
    const storage = fakeStorage({ [VIEW_MODE_KEY]: JSON.stringify({ userId: 2, viewMode: 'grid' }) });
    expect(readViewMode(1, storage)).toBe('list');
  });

  it('devuelve lista cuando no hay valor guardado ni usuario', () => {
    expect(readViewMode(1, fakeStorage())).toBe('list');
    expect(readViewMode(null, fakeStorage({ [VIEW_MODE_KEY]: JSON.stringify({ userId: 1, viewMode: 'grid' }) }))).toBe('list');
  });

  it('devuelve lista cuando el valor tiene una forma inválida (AC3.4)', () => {
    const invalid = [
      JSON.stringify({ userId: 1, viewMode: 'mosaic' }),
      JSON.stringify({ userId: '1', viewMode: 'grid' }),
      JSON.stringify({ viewMode: 'grid' }),
      JSON.stringify('grid'),
      'null',
    ];
    for (const value of invalid) {
      expect(readViewMode(1, fakeStorage({ [VIEW_MODE_KEY]: value }))).toBe('list');
    }
  });

  it('devuelve lista cuando el JSON es ilegible (AC3.4)', () => {
    expect(readViewMode(1, fakeStorage({ [VIEW_MODE_KEY]: '{no es json' }))).toBe('list');
  });

  it('devuelve lista cuando el almacenamiento lanza error al leer (AC3.4)', () => {
    expect(readViewMode(1, throwingStorage)).toBe('list');
  });

  it('guarda { userId, viewMode } con la clave pos_view_mode y lo recupera', () => {
    const storage = fakeStorage();
    saveViewMode(7, 'grid', storage);
    expect(JSON.parse(storage.data[VIEW_MODE_KEY])).toEqual({ userId: 7, viewMode: 'grid' });
    expect(readViewMode(7, storage)).toBe('grid');
  });

  it('borra la preferencia y la siguiente lectura devuelve lista (AC3.2)', () => {
    const storage = fakeStorage();
    saveViewMode(7, 'grid', storage);
    clearViewMode(storage);
    expect(storage.data[VIEW_MODE_KEY]).toBeUndefined();
    expect(readViewMode(7, storage)).toBe('list');
  });

  it('no lanza errores al guardar o borrar con almacenamiento que falla (FR3.5)', () => {
    expect(() => saveViewMode(1, 'grid', throwingStorage)).not.toThrow();
    expect(() => clearViewMode(throwingStorage)).not.toThrow();
  });
});
