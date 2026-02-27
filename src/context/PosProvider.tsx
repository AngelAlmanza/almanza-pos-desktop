import { Decimal } from 'decimal.js';
import { createContext, Dispatch, ReactNode, SetStateAction, useContext, useReducer, useState } from "react";
import { CartItem, Product } from "../models";

export type PosAction =
  | { type: 'ADD_ITEM'; payload: { product: Product; quantity: number } }
  | { type: 'REMOVE_ITEM'; payload: { productId: number } }
  | { type: 'SET_QUANTITY'; payload: { productId: number; quantity: number } }
  | { type: 'INCREMENT'; payload: { productId: number; delta: number } }
  | { type: 'CLEAR_CART' };

type CartState = { cart: CartItem[] };

interface PosContextType {
  cart: CartItem[];
  error: string;
  setError: Dispatch<SetStateAction<string>>;
  dispatch: Dispatch<PosAction>;
}

function posReducer(state: CartState, action: PosAction): CartState {
  switch (action.type) {
    case 'ADD_ITEM': {
      const { product, quantity } = action.payload;
      const existing = state.cart.find(i => i.product.id === product.id);

      if (existing) {
        const newQty = new Decimal(existing.quantity).plus(quantity).toNumber();
        if (new Decimal(newQty).gt(product.stock)) return state;
        return {
          ...state,
          cart: state.cart.map(i =>
            i.product.id === product.id
              ? { ...i, quantity: newQty, subtotal: new Decimal(product.price).times(newQty).toNumber() }
              : i
          ),
        };
      }

      if (new Decimal(quantity).gt(product.stock)) return state;
      return {
        ...state,
        cart: [...state.cart, {
          product,
          quantity,
          subtotal: new Decimal(product.price).times(quantity).toNumber(),
        }],
      };
    }

    case 'INCREMENT': {
      const { productId, delta } = action.payload;
      return {
        ...state,
        cart: state.cart
          .map(i => {
            if (i.product.id !== productId) return i;
            const newQty = new Decimal(i.quantity).plus(delta).toNumber();
            return {
              ...i,
              quantity: newQty,
              subtotal: new Decimal(i.product.price).times(newQty).toNumber(),
            };
          })
          .filter(i => i.quantity > 0),
      };
    }

    case 'SET_QUANTITY': {
      const { productId, quantity } = action.payload;
      return {
        ...state,
        cart: state.cart
          .map(i =>
            i.product.id === productId
              ? {
                  ...i,
                  quantity,
                  subtotal: new Decimal(i.product.price).times(quantity).toNumber(),
                }
              : i
          )
          .filter(i => i.quantity > 0),
      };
    }

    case 'REMOVE_ITEM':
      return {
        ...state,
        cart: state.cart.filter(i => i.product.id !== action.payload.productId),
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
