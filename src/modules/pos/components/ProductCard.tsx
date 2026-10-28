import { memo, useState } from 'react';
import { Inventory2 } from '@mui/icons-material';
import { Box, ButtonBase, Chip, Typography } from '@mui/material';
import type { Product } from '@modules/catalog/products/types';
import { formatCurrency } from '@modules/shared/utils/FormatCurrency';
import { isOutOfStock } from '@modules/pos/utils/productSuggestions';

/** Alto reservado para la imagen desde el principio (evita saltos al cargar, NFR2). */
const IMAGE_AREA_HEIGHT = 120;
/** Con 0.6 el texto principal conserva más de 3:1 de contraste sobre el fondo blanco. */
const OUT_OF_STOCK_OPACITY = 0.6;

interface ProductCardProps {
  product: Product;
  /** URL ya resuelta por `ProductGrid` (una sola vez para toda la cuadrícula) o `null`. */
  imageUrl: string | null;
  /** Se llama también con una tarjeta agotada: la barra muestra el aviso (P3). */
  onSelect: (product: Product) => void;
}

const ProductCardBase = ({ product, imageUrl, onSelect }: ProductCardProps) => {
  // Una imagen que falla (archivo borrado o dañado) deja el placeholder, sin mensaje (W7).
  const [failedUrl, setFailedUrl] = useState<string | null>(null);
  const outOfStock = isOutOfStock(product);
  const showImage = imageUrl !== null && failedUrl !== imageUrl;

  const label = outOfStock
    ? `${product.name}, ${formatCurrency(product.price)}, agotado`
    : `${product.name}, ${formatCurrency(product.price)}, stock ${product.stock} ${product.unit}`;

  return (
    <ButtonBase
      onClick={() => onSelect(product)}
      aria-label={label}
      aria-disabled={outOfStock || undefined}
      data-testid={`product-card-${product.id}`}
      sx={{
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'stretch',
        width: '100%',
        height: '100%',
        textAlign: 'left',
        overflow: 'hidden',
        border: '1px solid',
        borderColor: 'divider',
        borderRadius: 2,
        bgcolor: 'background.paper',
        cursor: outOfStock ? 'not-allowed' : 'pointer',
        transition: 'border-color 120ms, box-shadow 120ms',
        '&:hover': { borderColor: 'primary.main', boxShadow: 1 },
        '&.Mui-focusVisible': { outline: '2px solid', outlineColor: 'primary.main', outlineOffset: 2 },
      }}
    >
      <Box sx={{ opacity: outOfStock ? OUT_OF_STOCK_OPACITY : 1, width: '100%' }}>
        <Box
          sx={{
            height: IMAGE_AREA_HEIGHT,
            bgcolor: 'action.hover',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            overflow: 'hidden',
          }}
        >
          {showImage ? (
            <Box
              component="img"
              src={imageUrl}
              alt=""
              loading="lazy"
              decoding="async"
              onError={() => setFailedUrl(imageUrl)}
              sx={{ width: '100%', height: '100%', objectFit: 'cover', display: 'block' }}
            />
          ) : (
            <Inventory2 sx={{ fontSize: 40, color: 'text.disabled' }} />
          )}
        </Box>
        <Box sx={{ p: 1.25 }}>
          <Typography
            variant="body2"
            fontWeight={600}
            sx={{
              display: '-webkit-box',
              WebkitLineClamp: 2,
              WebkitBoxOrient: 'vertical',
              overflow: 'hidden',
              minHeight: '2.6em',
              lineHeight: 1.3,
            }}
          >
            {product.name}
          </Typography>
          {product.barcode && (
            <Typography variant="caption" color="text.secondary" noWrap component="div">
              {product.barcode}
            </Typography>
          )}
          <Typography variant="caption" color="text.secondary" component="div">
            Stock: {product.stock} {product.unit}
          </Typography>
          <Typography
            variant="subtitle1"
            fontWeight={700}
            color="primary"
            sx={{ fontVariantNumeric: 'tabular-nums' }}
          >
            {formatCurrency(product.price)}
          </Typography>
        </Box>
      </Box>
      {(product.is_bulk || outOfStock) && (
        <Box sx={{ display: 'flex', gap: 0.5, px: 1.25, pb: 1.25, mt: 'auto', flexWrap: 'wrap' }}>
          {product.is_bulk && (
            <Chip label="A granel" size="small" color="primary" variant="outlined" />
          )}
          {outOfStock && (
            <Chip label="Agotado" size="small" color="error" variant="outlined" />
          )}
        </Box>
      )}
    </ButtonBase>
  );
};

export const ProductCard = memo(ProductCardBase);
