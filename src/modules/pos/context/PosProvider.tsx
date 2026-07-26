import { createContext, Dispatch, ReactNode, SetStateAction, useContext, useReducer, useState } from 'react';
import { Decimal } from 'decimal.js';
import type { Product } from '@modules/catalog/products/types';
import type { CartItem, SaleQuantitySelection } from '@modules/pos/types';
import { addQuantity, hasSufficientStock, multiplyMoney, sumQuantity } from '@modules/shared/utils/money';
import { buildQuantitySelection } from '@modules/shared/utils/unitConversion';

export type PosAction =
  | { type: 'ADD_ITEM'; payload: { product: Product; selection: SaleQuantitySelection } }
  | { type: 'REMOVE_ITEM'; payload: { lineKey: string } }
  | { type: 'SET_QUANTITY'; payload: { lineKey: string; quantity: number } }
  | { type: 'SET_INPUT'; payload: { lineKey: string; selection: SaleQuantitySelection } }
  | { type: 'INCREMENT'; payload: { lineKey: string; delta: number } }
  | { type: 'CLEAR_CART' };

type CartState = { cart: CartItem[] };

interface PosContextType {
  cart: CartItem[];
  error: string;
  setError: Dispatch<SetStateAction<string>>;
  dispatch: Dispatch<PosAction>;
}

export function buildCartLineKey(
  productId: number,
  selection: Pick<SaleQuantitySelection, 'input_mode' | 'input_unit'>,
): string {
  return `${productId}:${selection.input_mode}:${selection.input_unit}`;
}

function buildCartItem(product: Product, selection: SaleQuantitySelection): CartItem {
  const normalizedSelection = buildQuantitySelection(selection, product);

  return {
    line_key: buildCartLineKey(product.id, normalizedSelection),
    product,
    base_unit: product.unit,
    ...normalizedSelection,
    subtotal: multiplyMoney(product.price, normalizedSelection.quantity),
  };
}

function hasSufficientCartStock(cart: CartItem[], product: Product): boolean {
  const requestedQuantity = sumQuantity(
    cart.filter((item) => item.product.id === product.id).map((item) => item.quantity),
  );
  return hasSufficientStock(product.stock, requestedQuantity);
}

export function getRequestedProductQuantityAfterAdd(
  cart: CartItem[],
  product: Product,
  selection: SaleQuantitySelection,
): number {
  const lineKey = buildCartLineKey(product.id, selection);
  const existing = cart.find((item) => item.line_key === lineKey);
  const combinedSelection = existing
    ? buildQuantitySelection({
        ...selection,
        input_value: new Decimal(existing.input_value).plus(selection.input_value).toNumber(),
      }, product)
    : selection;
  const otherQuantity = sumQuantity(
    cart
      .filter((item) => item.product.id === product.id && item.line_key !== lineKey)
      .map((item) => item.quantity),
  );

  return sumQuantity([otherQuantity, combinedSelection.quantity]);
}

function addOrMergeItem(
  cart: CartItem[],
  product: Product,
  selection: SaleQuantitySelection,
): CartItem[] | null {
  const lineKey = buildCartLineKey(product.id, selection);
  const existing = cart.find((item) => item.line_key === lineKey);
  const nextItem = existing
    ? buildCartItem(product, {
        ...selection,
        input_value: new Decimal(existing.input_value).plus(selection.input_value).toNumber(),
      })
    : buildCartItem(product, selection);
  const nextCart = existing
    ? cart.map((item) => (item.line_key === lineKey ? nextItem : item))
    : [...cart, nextItem];

  return hasSufficientCartStock(nextCart, product) ? nextCart : null;
}

export function posReducer(state: CartState, action: PosAction): CartState {
  switch (action.type) {
    case 'ADD_ITEM': {
      const { product, selection } = action.payload;
      const nextCart = addOrMergeItem(state.cart, product, selection);
      return nextCart ? { ...state, cart: nextCart } : state;
    }

    case 'INCREMENT': {
      const { lineKey, delta } = action.payload;
      const current = state.cart.find((item) => item.line_key === lineKey);
      if (!current) return state;

      const nextQuantity = addQuantity(current.quantity, delta);
      if (nextQuantity <= 0) {
        return { ...state, cart: state.cart.filter((item) => item.line_key !== lineKey) };
      }

      const nextItem = buildCartItem(current.product, {
        quantity: nextQuantity,
        input_mode: 'base',
        input_value: nextQuantity,
        input_unit: current.base_unit,
      });
      const nextCart = state.cart.map((item) => (item.line_key === lineKey ? nextItem : item));
      return hasSufficientCartStock(nextCart, current.product) ? { ...state, cart: nextCart } : state;
    }

    case 'SET_QUANTITY': {
      const { lineKey, quantity } = action.payload;
      const current = state.cart.find((item) => item.line_key === lineKey);
      if (!current) return state;
      if (quantity <= 0) {
        return { ...state, cart: state.cart.filter((item) => item.line_key !== lineKey) };
      }

      const nextItem = buildCartItem(current.product, {
        quantity,
        input_mode: 'base',
        input_value: quantity,
        input_unit: current.base_unit,
      });
      const nextCart = state.cart.map((item) => (item.line_key === lineKey ? nextItem : item));
      return hasSufficientCartStock(nextCart, current.product) ? { ...state, cart: nextCart } : state;
    }

    case 'SET_INPUT': {
      const { lineKey, selection } = action.payload;
      const current = state.cart.find((item) => item.line_key === lineKey);
      if (!current) return state;

      const withoutCurrent = state.cart.filter((item) => item.line_key !== lineKey);
      const nextCart = addOrMergeItem(withoutCurrent, current.product, selection);
      return nextCart ? { ...state, cart: nextCart } : state;
    }

    case 'REMOVE_ITEM':
      return {
        ...state,
        cart: state.cart.filter((item) => item.line_key !== action.payload.lineKey),
      };

    case 'CLEAR_CART':
      return { ...state, cart: [] };

    default:
      return state;
  }
}

const PosContext = createContext<PosContextType | null>(null);

export function PosProvider({ children }: { children: ReactNode }) {
  const [state, dispatch] = useReducer(posReducer, { cart: [] });
  const [error, setError] = useState('');

  return (
    <PosContext.Provider value={{ cart: state.cart, dispatch, error, setError }}>
      {children}
    </PosContext.Provider>
  );
}

export function usePos(): PosContextType {
  const context = useContext(PosContext);
  if (!context) {
    throw new Error('usePos must be used within a PosProvider');
  }
  return context;
}
