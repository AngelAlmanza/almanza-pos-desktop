import { useCallback, useEffect, useReducer, useRef } from 'react';
import { ProductService } from '@modules/catalog/products/services/ProductService';
import type { Product } from '@modules/catalog/products/types';
import {
  SUGGEST_DEBOUNCE_MS,
  SUGGEST_LIMIT,
  buildAnnouncement,
  initialSuggestionsState,
  shouldSuggest,
  suggestionsReducer,
} from '@modules/pos/utils/productSuggestions';
import type { SuggestionsStatus } from '@modules/pos/utils/productSuggestions';

export interface UseProductSuggestionsResult {
  suggestions: Product[];
  status: SuggestionsStatus;
  errorMessage: string | null;
  /** Texto para la región `aria-live`. */
  announcement: string;
  /** Cierra y descarta toda consulta en vuelo, de forma síncrona (W5, L4, L7). */
  closeAndInvalidate: () => void;
}

/**
 * Sugerencias de búsqueda con espera de 200 ms y número de secuencia: solo se aplica la
 * respuesta de la consulta más reciente; cualquier cambio de texto, cierre o desmontaje
 * invalida las anteriores (L1, L4, FR1.11).
 */
export function useProductSuggestions(term: string, enabled: boolean): UseProductSuggestionsResult {
  const [state, dispatch] = useReducer(suggestionsReducer, initialSuggestionsState);
  // La secuencia vive en un ref para invalidar de forma síncrona, antes de que React
  // procese el reductor.
  const seqRef = useRef(0);

  useEffect(() => {
    seqRef.current += 1;
    const seq = seqRef.current;
    const eligible = enabled && shouldSuggest(term);
    dispatch({ type: 'input-changed', seq, eligible });
    if (!eligible) return undefined;

    const timer = setTimeout(async () => {
      if (seqRef.current !== seq) return;
      dispatch({ type: 'request-started', seq });
      try {
        const suggestions = await ProductService.suggest(term.trim(), SUGGEST_LIMIT);
        if (seqRef.current !== seq) return;
        dispatch({ type: 'response', seq, suggestions });
      } catch (error) {
        if (seqRef.current !== seq) return;
        dispatch({ type: 'failed', seq, message: String(error) });
      }
    }, SUGGEST_DEBOUNCE_MS);

    return () => {
      clearTimeout(timer);
      // También cubre el desmontaje: una respuesta tardía ya no se aplica.
      seqRef.current += 1;
    };
  }, [term, enabled]);

  const closeAndInvalidate = useCallback(() => {
    seqRef.current += 1;
    dispatch({ type: 'closed', seq: seqRef.current });
  }, []);

  return {
    suggestions: state.suggestions,
    status: state.status,
    errorMessage: state.errorMessage,
    announcement: buildAnnouncement(state.status, state.suggestions.length),
    closeAndInvalidate,
  };
}
