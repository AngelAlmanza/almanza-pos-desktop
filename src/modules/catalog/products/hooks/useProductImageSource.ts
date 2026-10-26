import { convertFileSrc } from '@tauri-apps/api/core';
import { useCallback, useEffect, useState } from 'react';
import { ProductService } from '@modules/catalog/products/services/ProductService';
import { resolveProductImageSource } from '@modules/catalog/products/utils/productImage';

// La carpeta de imágenes se pide una sola vez y se guarda en memoria.
let imagesDirPromise: Promise<string> | null = null;

function loadImagesDir(): Promise<string> {
  if (!imagesDirPromise) {
    imagesDirPromise = ProductService.getImagesDir().catch((error: unknown) => {
      imagesDirPromise = null;
      throw error;
    });
  }
  return imagesDirPromise;
}

/**
 * Contrato `productImageSource` (U1 -> U3): devuelve una función que traduce
 * `image_file` en una fuente mostrable, o `null` (el llamador usa placeholder).
 */
export function useProductImageSource(): (imageFile: string | null | undefined) => string | null {
  const [imagesDir, setImagesDir] = useState<string | null>(null);

  useEffect(() => {
    let active = true;
    loadImagesDir()
      .then((dir) => {
        if (active) setImagesDir(dir);
      })
      .catch(() => {
        // Sin carpeta no hay fuente: se muestra el placeholder (BR3.1).
      });
    return () => {
      active = false;
    };
  }, []);

  return useCallback(
    (imageFile: string | null | undefined) =>
      resolveProductImageSource(imageFile, imagesDir, convertFileSrc),
    [imagesDir],
  );
}
