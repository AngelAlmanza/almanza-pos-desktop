import { useCallback, useEffect, useReducer, useRef, useState } from 'react';
import { ProductService } from '@modules/catalog/products/services/ProductService';
import type { Product } from '@modules/catalog/products/types';
import {
  GRID_DEBOUNCE_MS,
  gridReducer,
  initialGridState,
  normalizeGridTerm,
} from '@modules/pos/utils/productGrid';
import type { GridStatus } from '@modules/pos/utils/productGrid';

export interface UseProductGridResult {
  products: Product[];
  status: GridStatus;
  /** Texto recortado de la carga vigente. */
  term: string;
  errorMessage: string | null;
  /** Vuelve a pedir los productos (reintento o recarga tras una venta). */
  reload: () => void;
}

/**
 * Productos de la cuadrícula: sin texto usa `get_active_products`; con texto usa
 * `suggest_products` sin límite (la regla de coincidencia vive solo en el backend, G2).
 * Espera 100 ms al cambiar el texto y solo aplica la respuesta más reciente (G3).
 */
export function useProductGrid(rawTerm: string): UseProductGridResult {
  const [state, dispatch] = useReducer(gridReducer, initialGridState);
  const [reloadKey, setReloadKey] = useState(0);
  // La secuencia vive en un ref para invalidar de forma síncrona (cambio de texto, desmontaje).
  const seqRef = useRef(0);
  const lastTermRef = useRef<string | null>(null);

  // El recorte va aquí: un texto de solo espacios equivale a texto vacío.
  const term = normalizeGridTerm(rawTerm);

  useEffect(() => {
    seqRef.current += 1;
    const seq = seqRef.current;
    dispatch({ type: 'load-requested', seq, term });

    // Solo un cambio de texto espera; la primera carga, el reintento y la recarga van directo.
    const termChanged = lastTermRef.current !== null && lastTermRef.current !== term;
    lastTermRef.current = term;

    const timer = setTimeout(async () => {
      if (seqRef.current !== seq) return;
      try {
        const products = term === ''
          ? await ProductService.getActive()
          : await ProductService.suggest(term);
        if (seqRef.current !== seq) return;
        dispatch({ type: 'response', seq, products });
      } catch (error) {
        if (seqRef.current !== seq) return;
        dispatch({ type: 'failed', seq, message: String(error) });
      }
    }, termChanged ? GRID_DEBOUNCE_MS : 0);

    return () => {
      clearTimeout(timer);
      // También cubre el desmontaje: una respuesta tardía ya no se aplica.
      seqRef.current += 1;
    };
  }, [term, reloadKey]);

  const reload = useCallback(() => setReloadKey((key) => key + 1), []);

  return {
    products: state.products,
    status: state.status,
    term: state.term,
    errorMessage: state.errorMessage,
    reload,
  };
}
