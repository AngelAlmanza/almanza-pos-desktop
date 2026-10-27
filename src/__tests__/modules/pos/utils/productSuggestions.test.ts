import { describe, expect, it } from 'vitest';
import type { Product } from '@modules/catalog/products/types';
import {
  buildAnnouncement,
  decideEnter,
  getSuggestionOptionId,
  initialSuggestionsState,
  isOutOfStock,
  nextHighlight,
  shouldSuggest,
  suggestionsReducer,
} from '@modules/pos/utils/productSuggestions';
import type { SuggestionsState } from '@modules/pos/utils/productSuggestions';

function product(id: number, stock = 5): Product {
  return {
    id,
    name: `Producto ${id}`,
    description: null,
    barcode: null,
    price: 10,
    unit: 'pieza',
    is_bulk: false,
    category_id: null,
    category_name: null,
    stock,
    min_stock: 0,
    active: true,
    created_at: '',
    updated_at: '',
    image_file: null,
  };
}

describe('shouldSuggest', () => {
  it('requiere 3 caracteres: 2 no disparan y 3 sí (AC1.2)', () => {
    expect(shouldSuggest('ja')).toBe(false);
    expect(shouldSuggest('jam')).toBe(true);
  });

  it('recorta los espacios al inicio y al final', () => {
    expect(shouldSuggest('  ja  ')).toBe(false);
    expect(shouldSuggest('  jam ')).toBe(true);
    expect(shouldSuggest('     ')).toBe(false);
    expect(shouldSuggest('')).toBe(false);
  });
});

describe('isOutOfStock', () => {
  it('marca agotado con stock 0 y con stock negativo (AC1.8)', () => {
    expect(isOutOfStock(product(1, 0))).toBe(true);
    expect(isOutOfStock(product(1, -2))).toBe(true);
  });

  it('no marca agotado con stock positivo, incluso fraccionario', () => {
    expect(isOutOfStock(product(1, 0.5))).toBe(false);
    expect(isOutOfStock(product(1, 3))).toBe(false);
  });
});

describe('nextHighlight', () => {
  it('↓ sin resaltado resalta la primera fila', () => {
    expect(nextHighlight(null, 'ArrowDown', 4)).toBe(0);
  });

  it('↓ avanza y se detiene en la última fila (AC1.4)', () => {
    expect(nextHighlight(1, 'ArrowDown', 4)).toBe(2);
    expect(nextHighlight(3, 'ArrowDown', 4)).toBe(3);
  });

  it('↑ retrocede y en la primera fila quita el resaltado', () => {
    expect(nextHighlight(2, 'ArrowUp', 4)).toBe(1);
    expect(nextHighlight(0, 'ArrowUp', 4)).toBeNull();
    expect(nextHighlight(null, 'ArrowUp', 4)).toBeNull();
  });

  it('con la lista vacía nunca resalta', () => {
    expect(nextHighlight(null, 'ArrowDown', 0)).toBeNull();
    expect(nextHighlight(2, 'ArrowUp', 0)).toBeNull();
  });

  it('un índice fuera de rango tras reducirse la lista se acota', () => {
    expect(nextHighlight(7, 'ArrowDown', 3)).toBe(2);
    expect(nextHighlight(7, 'ArrowUp', 3)).toBe(2);
  });
});

describe('decideEnter', () => {
  it('agrega la sugerencia solo con lista abierta, estado ready y fila resaltada', () => {
    expect(decideEnter(1, true, 'ready')).toBe('select-highlighted');
  });

  it('sin resaltado sigue el flujo actual (AC1.6)', () => {
    expect(decideEnter(null, true, 'ready')).toBe('run-current-flow');
  });

  it('en loading sigue el flujo actual aunque quede un índice (FR1.11)', () => {
    expect(decideEnter(0, true, 'loading')).toBe('run-current-flow');
  });

  it('con la lista cerrada o en empty o error sigue el flujo actual (AC1.5)', () => {
    expect(decideEnter(0, false, 'ready')).toBe('run-current-flow');
    expect(decideEnter(0, true, 'empty')).toBe('run-current-flow');
    expect(decideEnter(0, true, 'error')).toBe('run-current-flow');
    expect(decideEnter(0, true, 'idle')).toBe('run-current-flow');
  });
});

describe('suggestionsReducer', () => {
  const loading = (seq: number): SuggestionsState =>
    suggestionsReducer(initialSuggestionsState, { type: 'input-changed', seq, eligible: true });

  it('aplica la respuesta vigente con resultados', () => {
    const next = suggestionsReducer(loading(1), {
      type: 'response',
      seq: 1,
      suggestions: [product(1), product(2)],
    });
    expect(next.status).toBe('ready');
    expect(next.suggestions).toHaveLength(2);
  });

  it('una respuesta vigente sin resultados pasa a empty (AC1.9)', () => {
    const next = suggestionsReducer(loading(1), { type: 'response', seq: 1, suggestions: [] });
    expect(next.status).toBe('empty');
    expect(next.suggestions).toEqual([]);
  });

  it('descarta la respuesta de una secuencia vieja (AC1.10, FR1.11)', () => {
    const afterSecondInput = suggestionsReducer(loading(1), {
      type: 'input-changed',
      seq: 2,
      eligible: true,
    });
    const next = suggestionsReducer(afterSecondInput, {
      type: 'response',
      seq: 1,
      suggestions: [product(9)],
    });
    expect(next).toBe(afterSecondInput);
    expect(next.status).toBe('loading');
  });

  it('descarta una respuesta que llega después de borrar el texto', () => {
    const cleared = suggestionsReducer(loading(1), {
      type: 'input-changed',
      seq: 2,
      eligible: false,
    });
    const next = suggestionsReducer(cleared, { type: 'response', seq: 1, suggestions: [product(1)] });
    expect(next.status).toBe('idle');
    expect(next.suggestions).toEqual([]);
  });

  it('un cierre invalida la consulta en vuelo y vuelve a idle', () => {
    const closed = suggestionsReducer(loading(1), { type: 'closed', seq: 2 });
    expect(closed.status).toBe('idle');
    const late = suggestionsReducer(closed, { type: 'response', seq: 1, suggestions: [product(1)] });
    expect(late.status).toBe('idle');
  });

  it('un cambio de texto oculta las filas anteriores y pasa a loading', () => {
    const ready = suggestionsReducer(loading(1), { type: 'response', seq: 1, suggestions: [product(1)] });
    const next = suggestionsReducer(ready, { type: 'input-changed', seq: 2, eligible: true });
    expect(next.status).toBe('loading');
    expect(next.suggestions).toEqual([]);
  });

  it('una falla vigente pasa a error con su mensaje; una vieja se descarta', () => {
    const failed = suggestionsReducer(loading(1), { type: 'failed', seq: 1, message: 'boom' });
    expect(failed.status).toBe('error');
    expect(failed.errorMessage).toBe('boom');

    const stale = suggestionsReducer(loading(2), { type: 'failed', seq: 1, message: 'viejo' });
    expect(stale.status).toBe('loading');
    expect(stale.errorMessage).toBeNull();
  });

  it('el siguiente cambio de texto sale de error y vuelve a intentar', () => {
    const failed = suggestionsReducer(loading(1), { type: 'failed', seq: 1, message: 'boom' });
    const retry = suggestionsReducer(failed, { type: 'input-changed', seq: 2, eligible: true });
    expect(retry.status).toBe('loading');
    expect(retry.errorMessage).toBeNull();
  });
});

describe('utilidades de accesibilidad', () => {
  it('anuncia el número de sugerencias o la ausencia de coincidencias (NFR6)', () => {
    expect(buildAnnouncement('ready', 3)).toBe('3 sugerencias');
    expect(buildAnnouncement('ready', 1)).toBe('1 sugerencia');
    expect(buildAnnouncement('empty', 0)).toBe('Sin coincidencias');
    expect(buildAnnouncement('loading', 0)).toBe('');
  });

  it('el id de cada fila es único por lista y producto', () => {
    expect(getSuggestionOptionId(':r1:', 7)).toBe(':r1:-option-7');
    expect(getSuggestionOptionId(':r1:', 7)).not.toBe(getSuggestionOptionId(':r1:', 8));
  });
});
