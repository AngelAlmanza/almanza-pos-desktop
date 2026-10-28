import { useState } from 'react';
import { usePos } from '@modules/pos/context/PosProvider';
import type { CartItem, SaleQuantitySelection } from '@modules/pos/types';
import { addQuantity, hasSufficientStock, isPositiveQuantity, parseQuantityInput } from '@modules/shared/utils/money';

/** Los errores del carrito se limpian solos a los 3 s (igual que en la tabla de partidas). */
const CART_ERROR_MS = 3000;

export interface UseCartLineActionsResult {
  cart: CartItem[];
  /** Partida a granel en edición (abre el diálogo de cantidad). */
  editingBulkItem: CartItem | null;
  startEditingBulk: (item: CartItem) => void;
  confirmBulkEdit: (selection: SaleQuantitySelection) => void;
  cancelBulkEdit: () => void;
  updateQuantity: (index: number, delta: number) => void;
  changeQuantity: (index: number, rawValue: string) => void;
  removeLine: (index: number) => void;
}

/**
 * Lógica de las partidas del carrito compartida por `SaleSummaryTable` y `CompactCart`
 * (FR2.2): mismas validaciones de stock y mismos mensajes en ambas vistas.
 */
export function useCartLineActions(): UseCartLineActionsResult {
  const { cart, dispatch, setError } = usePos();
  const [editingBulkItem, setEditingBulkItem] = useState<CartItem | null>(null);

  const showError = (message: string) => {
    setError(message);
    setTimeout(() => setError(''), CART_ERROR_MS);
  };

  const updateQuantity = (index: number, delta: number) => {
    const item = cart[index];
    if (!item) return;
    const newQty = addQuantity(item.quantity, delta);

    if (!isPositiveQuantity(newQty)) {
      dispatch({ type: 'REMOVE_ITEM', payload: { lineKey: item.line_key } });
      return;
    }

    if (!hasSufficientStock(item.product.stock, newQty)) {
      showError(`Stock insuficiente. Disponible: ${item.product.stock}`);
      return;
    }

    dispatch({ type: 'INCREMENT', payload: { lineKey: item.line_key, delta } });
  };

  const changeQuantity = (index: number, rawValue: string) => {
    const item = cart[index];
    if (!item) return;
    const qty = parseQuantityInput(rawValue);

    if (qty === null) {
      // Ignore invalid/incomplete input while the user is typing.
      return;
    }

    if (!isPositiveQuantity(qty)) {
      dispatch({ type: 'REMOVE_ITEM', payload: { lineKey: item.line_key } });
      return;
    }

    if (!item.product.is_bulk && !Number.isInteger(qty)) {
      showError('Los productos por unidad solo aceptan cantidades enteras');
      return;
    }

    if (!hasSufficientStock(item.product.stock, qty)) {
      showError(`Stock insuficiente. Disponible: ${item.product.stock}`);
      return;
    }

    dispatch({ type: 'SET_QUANTITY', payload: { lineKey: item.line_key, quantity: qty } });
  };

  const removeLine = (index: number) => {
    const item = cart[index];
    if (!item) return;
    dispatch({ type: 'REMOVE_ITEM', payload: { lineKey: item.line_key } });
  };

  const confirmBulkEdit = (selection: SaleQuantitySelection) => {
    if (editingBulkItem) {
      dispatch({
        type: 'SET_INPUT',
        payload: { lineKey: editingBulkItem.line_key, selection },
      });
    }
    setEditingBulkItem(null);
  };

  return {
    cart,
    editingBulkItem,
    startEditingBulk: setEditingBulkItem,
    confirmBulkEdit,
    cancelBulkEdit: () => setEditingBulkItem(null),
    updateQuantity,
    changeQuantity,
    removeLine,
  };
}
