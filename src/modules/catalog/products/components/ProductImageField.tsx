import { ImageOutlined } from '@mui/icons-material';
import { Box, Button, Typography } from '@mui/material';
import { open as openFileDialog } from '@tauri-apps/plugin-dialog';
import { useEffect, useState, type Dispatch } from 'react';
import { ProductService } from '@modules/catalog/products/services/ProductService';
import { useProductImageSource } from '@modules/catalog/products/hooks/useProductImageSource';
import type {
  ProductImageFieldAction,
  ProductImageFieldState,
} from '@modules/catalog/products/utils/productImageField';

interface ProductImageFieldProps {
  state: ProductImageFieldState;
  dispatch: Dispatch<ProductImageFieldAction>;
  saving: boolean;
}

const PREVIEW_SIZE = 168;

function Placeholder() {
  return (
    <Box
      data-testid="product-image-placeholder"
      sx={{
        position: 'absolute',
        inset: 0,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        color: 'text.disabled',
      }}
    >
      <ImageOutlined sx={{ fontSize: 48 }} />
    </Box>
  );
}

export function ProductImageField({ state, dispatch, saving }: ProductImageFieldProps) {
  const getSource = useProductImageSource();
  const [loaded, setLoaded] = useState(false);

  // Respaldo: data URL de la copia guardada cuando el protocolo de archivos no la sirve.
  const [fallback, setFallback] = useState<{ file: string; url: string | null } | null>(null);

  const showsPreview = state.status === 'pending-new' && state.preview;
  const savedSource =
    state.status === 'saved' || state.status === 'missing'
      ? fallback?.url && fallback.file === state.savedFile
        ? fallback.url
        : getSource(state.savedFile)
      : null;
  const source = showsPreview ? state.preview?.preview ?? null : savedSource;
  const hasImage = state.status === 'pending-new' || state.status === 'saved' || state.status === 'missing';

  // La imagen vuelve a "cargando" cada vez que cambia la fuente.
  useEffect(() => {
    setLoaded(false);
  }, [source]);

  // Otra imagen guardada (otro producto o cambio): se descarta el respaldo anterior.
  useEffect(() => {
    setFallback(null);
  }, [state.savedFile]);

  const handleLoadError = async () => {
    const file = state.savedFile;
    console.warn('No se pudo cargar la imagen de producto:', file, source?.slice(0, 120));
    // Solo se intenta el respaldo una vez por imagen guardada.
    if (state.status !== 'saved' || !file || fallback?.file === file) {
      dispatch({ type: 'load-failed' });
      return;
    }
    setFallback({ file, url: null });
    try {
      const url = await ProductService.readImage(file);
      if (url) {
        setFallback({ file, url });
        return;
      }
    } catch (err) {
      console.warn('No se pudo leer la imagen de respaldo:', err);
    }
    dispatch({ type: 'load-failed' });
  };

  const handlePick = async () => {
    try {
      const selected = await openFileDialog({
        multiple: false,
        filters: [{ name: 'Imágenes (png, jpg, jpeg, webp)', extensions: ['png', 'jpg', 'jpeg', 'webp'] }],
      });
      // Cancelar el selector no cambia nada (W1.3).
      if (!selected || typeof selected !== 'string') return;

      const preview = await ProductService.inspectImage(selected);
      dispatch({ type: 'pick-success', sourcePath: selected, preview });
    } catch (err) {
      dispatch({ type: 'pick-failure', message: String(err) });
    }
  };

  const caption = (() => {
    switch (state.status) {
      case 'pending-new':
        return 'Se aplicará al guardar';
      case 'pending-remove':
        return 'Se quitará al guardar';
      case 'missing':
        return 'No se encontró la imagen guardada';
      default:
        return null;
    }
  })();

  return (
    <Box
      data-testid="product-image-field"
      data-status={state.status}
      sx={{ display: 'flex', flexDirection: 'column', gap: 1, alignItems: 'stretch' }}
    >
      <Typography variant="body2" fontWeight={600}>
        Imagen
      </Typography>
      <Box
        sx={{
          position: 'relative',
          width: '100%',
          maxWidth: PREVIEW_SIZE * 1.5,
          aspectRatio: '1 / 1',
          border: '1px solid',
          borderColor: 'divider',
          borderRadius: 1.5,
          overflow: 'hidden',
          bgcolor: 'action.hover',
          alignSelf: 'center',
        }}
      >
        {(!source || !loaded) && <Placeholder />}
        {source && state.status !== 'pending-remove' && (
          <Box
            component="img"
            data-testid="product-image-preview"
            src={source}
            alt="Vista previa de la imagen del producto"
            loading="lazy"
            onLoad={() => setLoaded(true)}
            onError={() => void handleLoadError()}
            sx={{
              position: 'absolute',
              inset: 0,
              width: '100%',
              height: '100%',
              objectFit: 'contain',
              opacity: loaded ? 1 : 0,
            }}
          />
        )}
      </Box>

      {caption && (
        <Typography
          variant="caption"
          color={state.status === 'missing' ? 'warning.main' : 'text.secondary'}
          data-testid="product-image-caption"
          sx={{ textAlign: 'center' }}
        >
          {caption}
        </Typography>
      )}
      {state.errorMessage && (
        <Typography
          variant="caption"
          color="error"
          role="alert"
          data-testid="product-image-error"
          sx={{ textAlign: 'center' }}
        >
          {state.errorMessage}
        </Typography>
      )}

      <Box sx={{ display: 'flex', gap: 1, justifyContent: 'center', flexWrap: 'wrap' }}>
        {state.status === 'pending-remove' ? (
          <Button
            size="small"
            variant="outlined"
            onClick={() => dispatch({ type: 'undo' })}
            disabled={saving}
            data-testid="product-image-undo"
          >
            Deshacer
          </Button>
        ) : (
          <>
            <Button
              size="small"
              variant="outlined"
              onClick={() => void handlePick()}
              disabled={saving}
              data-testid="product-image-pick"
            >
              {hasImage ? 'Cambiar imagen' : 'Elegir imagen'}
            </Button>
            {hasImage && (
              <Button
                size="small"
                color="inherit"
                onClick={() => dispatch({ type: 'remove' })}
                disabled={saving}
                data-testid="product-image-remove"
              >
                Quitar imagen
              </Button>
            )}
          </>
        )}
      </Box>
    </Box>
  );
}
