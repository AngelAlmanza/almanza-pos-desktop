import type { Product } from '@modules/catalog/products/types';

/** Cantidad mínima de caracteres (recortados) para pedir sugerencias (FR1.1). */
export const MIN_SUGGEST_CHARS = 3;
/** Espera sin teclear antes de consultar (L1). */
export const SUGGEST_DEBOUNCE_MS = 200;
/** Máximo de sugerencias que pide el POS (FR1.3). */
export const SUGGEST_LIMIT = 10;

export type SuggestionsStatus = 'idle' | 'loading' | 'ready' | 'empty' | 'error';

export interface SuggestionsState {
  status: SuggestionsStatus;
  suggestions: Product[];
  errorMessage: string | null;
  /** Secuencia vigente: solo se aplica la respuesta que la lleve (L4). */
  seq: number;
}

export type SuggestionsEvent =
  | { type: 'input-changed'; seq: number; eligible: boolean }
  | { type: 'request-started'; seq: number }
  | { type: 'response'; seq: number; suggestions: Product[] }
  | { type: 'failed'; seq: number; message: string }
  | { type: 'closed'; seq: number };

export type EnterDecision = 'select-highlighted' | 'run-current-flow';

export const initialSuggestionsState: SuggestionsState = {
  status: 'idle',
  suggestions: [],
  errorMessage: null,
  seq: 0,
};

/** L1: el texto recortado tiene 3 caracteres o más. */
export function shouldSuggest(term: string): boolean {
  return term.trim().length >= MIN_SUGGEST_CHARS;
}

/** L6: un producto con `stock <= 0` se muestra marcado y no se agrega. */
export function isOutOfStock(product: Pick<Product, 'stock'>): boolean {
  return product.stock <= 0;
}

/**
 * L5 y tabla de teclado: ↓ resalta la primera o avanza (se detiene en la última);
 * ↑ retrocede y en la primera quita el resaltado.
 */
export function nextHighlight(
  current: number | null,
  key: 'ArrowDown' | 'ArrowUp',
  count: number,
): number | null {
  if (count <= 0) return null;
  const last = count - 1;
  if (key === 'ArrowDown') {
    return current === null ? 0 : Math.min(current + 1, last);
  }
  if (current === null || current <= 0) return null;
  return Math.min(current - 1, last);
}

/**
 * W5: solo se agrega la sugerencia resaltada con la lista abierta en `ready`.
 * En cualquier otro caso (sin resaltado, `loading`, lista cerrada) sigue el flujo actual.
 */
export function decideEnter(
  highlightedIndex: number | null,
  listOpen: boolean,
  status: SuggestionsStatus,
): EnterDecision {
  return listOpen && status === 'ready' && highlightedIndex !== null
    ? 'select-highlighted'
    : 'run-current-flow';
}

/**
 * Transiciones de la lista (diagrama de estados de la especificación). Toda respuesta,
 * fallo o inicio de consulta con una secuencia distinta de la vigente se descarta (L4).
 */
export function suggestionsReducer(
  state: SuggestionsState,
  event: SuggestionsEvent,
): SuggestionsState {
  switch (event.type) {
    case 'input-changed':
      // Cualquier cambio de texto invalida lo anterior; las filas viejas se ocultan.
      return event.eligible
        ? { status: 'loading', suggestions: [], errorMessage: null, seq: event.seq }
        : { ...initialSuggestionsState, seq: event.seq };
    case 'closed':
      return { ...initialSuggestionsState, seq: event.seq };
    case 'request-started':
      if (event.seq !== state.seq) return state;
      return { ...state, status: 'loading', suggestions: [], errorMessage: null };
    case 'response':
      if (event.seq !== state.seq) return state;
      return {
        status: event.suggestions.length > 0 ? 'ready' : 'empty',
        suggestions: event.suggestions,
        errorMessage: null,
        seq: state.seq,
      };
    case 'failed':
      if (event.seq !== state.seq) return state;
      return { status: 'error', suggestions: [], errorMessage: event.message, seq: state.seq };
  }
}

/** Id de una fila de la lista; lo comparten `aria-activedescendant` y las filas (NFR6). */
export function getSuggestionOptionId(listId: string, productId: number): string {
  return `${listId}-option-${productId}`;
}

/** Texto para la región `aria-live` (NFR6). */
export function buildAnnouncement(status: SuggestionsStatus, count: number): string {
  if (status === 'empty') return 'Sin coincidencias';
  if (status === 'ready') return count === 1 ? '1 sugerencia' : `${count} sugerencias`;
  return '';
}
