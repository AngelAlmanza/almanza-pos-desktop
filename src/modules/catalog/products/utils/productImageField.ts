// Máquina de estados del campo de imagen del formulario (functional-spec, BR5.1, BR5.2).
import type { ProductImageChange, ProductImagePreview } from '@modules/catalog/products/types';

export type ProductImageStatus =
  | 'empty'
  | 'saved'
  | 'pending-new'
  | 'pending-remove'
  | 'error'
  | 'missing';

interface PendingSnapshot {
  status: ProductImageStatus;
  pendingPath: string | null;
  preview: ProductImagePreview | null;
}

export interface ProductImageFieldState {
  status: ProductImageStatus;
  /** `image_file` del producto guardado; `null` si no tenía imagen. */
  savedFile: string | null;
  pendingPath: string | null;
  preview: ProductImagePreview | null;
  errorMessage: string | null;
  /** Estado previo a "Quitar", para que "Deshacer" vuelva al cambio anterior. */
  beforeRemove: PendingSnapshot | null;
}

export type ProductImageFieldAction =
  | { type: 'init'; savedFile: string | null }
  | { type: 'pick-success'; sourcePath: string; preview: ProductImagePreview }
  | { type: 'pick-failure'; message: string }
  | { type: 'remove' }
  | { type: 'undo' }
  | { type: 'load-failed' }
  | { type: 'cancel' };

export function initialProductImageFieldState(savedFile: string | null): ProductImageFieldState {
  return {
    status: savedFile ? 'saved' : 'empty',
    savedFile,
    pendingPath: null,
    preview: null,
    errorMessage: null,
    beforeRemove: null,
  };
}

export function productImageFieldReducer(
  state: ProductImageFieldState,
  action: ProductImageFieldAction,
): ProductImageFieldState {
  switch (action.type) {
    case 'init':
      return initialProductImageFieldState(action.savedFile);

    // Cancelar descarta cualquier cambio pendiente (W5, BR5.2).
    case 'cancel':
      return initialProductImageFieldState(state.savedFile);

    case 'pick-success':
      return {
        ...state,
        status: 'pending-new',
        pendingPath: action.sourcePath,
        preview: action.preview,
        errorMessage: null,
        beforeRemove: null,
      };

    // W1.6: el cambio pendiente anterior se conserva; solo se muestra el motivo.
    case 'pick-failure':
      return {
        ...state,
        status: state.status === 'empty' ? 'error' : state.status,
        errorMessage: action.message,
      };

    case 'remove': {
      if (state.status === 'saved' || state.status === 'missing') {
        return {
          ...state,
          status: 'pending-remove',
          errorMessage: null,
          beforeRemove: {
            status: state.status,
            pendingPath: state.pendingPath,
            preview: state.preview,
          },
        };
      }
      if (state.status === 'pending-new') {
        if (!state.savedFile) {
          return {
            ...state,
            status: 'empty',
            pendingPath: null,
            preview: null,
            errorMessage: null,
            beforeRemove: null,
          };
        }
        return {
          ...state,
          status: 'pending-remove',
          errorMessage: null,
          beforeRemove: {
            status: state.status,
            pendingPath: state.pendingPath,
            preview: state.preview,
          },
        };
      }
      return state;
    }

    case 'undo': {
      if (state.status !== 'pending-remove') return state;
      const previous = state.beforeRemove;
      if (!previous) return { ...initialProductImageFieldState(state.savedFile) };
      return {
        ...state,
        status: previous.status,
        pendingPath: previous.pendingPath,
        preview: previous.preview,
        errorMessage: null,
        beforeRemove: null,
      };
    }

    case 'load-failed':
      return state.status === 'saved' ? { ...state, status: 'missing' } : state;

    default:
      return state;
  }
}

/** Cambio de imagen que se envía al guardar; `undefined` = sin cambio (keep). */
export function toImageChange(state: ProductImageFieldState): ProductImageChange | undefined {
  if (state.status === 'pending-new' && state.pendingPath) {
    return { kind: 'replace', source_path: state.pendingPath };
  }
  if (state.status === 'pending-remove' && state.savedFile) {
    return { kind: 'remove' };
  }
  return undefined;
}
