export type PosViewMode = 'list' | 'grid';

/** Clave de la preferencia de vista, junto a `pos_session` (FR3.1, G9). */
export const VIEW_MODE_KEY = 'pos_view_mode';

export const DEFAULT_VIEW_MODE: PosViewMode = 'list';

export type ViewModeStorage = Pick<Storage, 'getItem' | 'setItem' | 'removeItem'>;

interface StoredViewMode {
  userId: number;
  viewMode: PosViewMode;
}

function resolveStorage(storage?: ViewModeStorage | null): ViewModeStorage | null {
  if (storage) return storage;
  try {
    return typeof localStorage === 'undefined' ? null : localStorage;
  } catch {
    // Acceso al almacenamiento bloqueado: se trata como no disponible.
    return null;
  }
}

function isPosViewMode(value: unknown): value is PosViewMode {
  return value === 'list' || value === 'grid';
}

function isStoredViewMode(value: unknown): value is StoredViewMode {
  if (typeof value !== 'object' || value === null) return false;
  const candidate = value as Record<string, unknown>;
  return typeof candidate.userId === 'number' && isPosViewMode(candidate.viewMode);
}

/**
 * FR3.2 y FR3.5: devuelve la vista guardada solo si pertenece al usuario actual; en
 * cualquier otro caso (falta, otro usuario, valor inválido, JSON ilegible o almacenamiento
 * no disponible) devuelve `'list'` sin lanzar errores hacia la pantalla.
 */
export function readViewMode(userId: number | null | undefined, storage?: ViewModeStorage | null): PosViewMode {
  if (userId === null || userId === undefined) return DEFAULT_VIEW_MODE;
  try {
    const target = resolveStorage(storage);
    const raw = target?.getItem(VIEW_MODE_KEY);
    if (!raw) return DEFAULT_VIEW_MODE;
    const parsed: unknown = JSON.parse(raw);
    return isStoredViewMode(parsed) && parsed.userId === userId ? parsed.viewMode : DEFAULT_VIEW_MODE;
  } catch {
    // FR3.5: un fallo de almacenamiento nunca se muestra; se usa la vista de lista.
    return DEFAULT_VIEW_MODE;
  }
}

/** FR3.1: guarda `{ userId, viewMode }`; si falla, la vista cambia igual y no se avisa (FR3.5). */
export function saveViewMode(userId: number, mode: PosViewMode, storage?: ViewModeStorage | null): void {
  try {
    const payload: StoredViewMode = { userId, viewMode: mode };
    resolveStorage(storage)?.setItem(VIEW_MODE_KEY, JSON.stringify(payload));
  } catch {
    // FR3.5: fallo de almacenamiento intencionalmente ignorado.
  }
}

/** FR3.4: se llama al cerrar sesión; un fallo de almacenamiento no debe impedir el cierre. */
export function clearViewMode(storage?: ViewModeStorage | null): void {
  try {
    resolveStorage(storage)?.removeItem(VIEW_MODE_KEY);
  } catch {
    // FR3.5: fallo de almacenamiento intencionalmente ignorado.
  }
}
