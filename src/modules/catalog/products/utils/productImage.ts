// Contrato de visualización de la imagen de producto (BR2.6, BR3.1, BR3.2).
// U3 importa `resolveProductImageSource` / `useProductImageSource` para la cuadrícula del POS.

const IMAGE_FILE_PATTERN =
  /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[0-9a-f]{4}-[0-9a-f]{12}\.(png|jpg|webp)$/;

/** BR2.6: solo `<uuid-v4>.(png|jpg|webp)`; nada de rutas, `..` ni `:`. */
export function isValidProductImageFile(imageFile: string | null | undefined): imageFile is string {
  return typeof imageFile === 'string' && IMAGE_FILE_PATTERN.test(imageFile);
}

/**
 * Devuelve la fuente mostrable de la imagen o `null` (placeholder).
 * `convert` es `convertFileSrc` de Tauri; se inyecta para poder probar sin Tauri.
 */
export function resolveProductImageSource(
  imageFile: string | null | undefined,
  imagesDir: string | null,
  convert: (path: string) => string,
): string | null {
  if (!isValidProductImageFile(imageFile)) return null;
  if (!imagesDir) return null;
  const separator = imagesDir.includes('\\') ? '\\' : '/';
  const base = imagesDir.replace(/[\\/]+$/, '');
  return convert(`${base}${separator}${imageFile}`);
}
