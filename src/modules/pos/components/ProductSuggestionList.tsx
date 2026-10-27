import { useEffect } from 'react';
import { Box, Chip, LinearProgress, Paper, Popper, Typography } from '@mui/material';
import type { Product } from '@modules/catalog/products/types';
import { formatCurrency } from '@modules/shared/utils/FormatCurrency';
import { getSuggestionOptionId, isOutOfStock } from '@modules/pos/utils/productSuggestions';

/** Alto de una fila; la lista muestra 3 y el resto con scroll (FR1.3). */
const ROW_HEIGHT = 56;
const VISIBLE_ROWS = 3;

interface ProductSuggestionListProps {
  suggestions: Product[];
  status: 'loading' | 'ready' | 'empty';
  highlightedIndex: number | null;
  listId: string;
  anchorEl: HTMLElement | null;
  onSelect: (product: Product) => void;
}

/** Presentacional: dibuja la lista bajo el campo; no consulta ni decide. */
export const ProductSuggestionList = ({
  suggestions,
  status,
  highlightedIndex,
  listId,
  anchorEl,
  onSelect,
}: ProductSuggestionListProps) => {
  const highlighted = highlightedIndex === null ? undefined : suggestions[highlightedIndex];
  const highlightedId = highlighted ? getSuggestionOptionId(listId, highlighted.id) : null;

  // FR1.5: mantiene visible la fila resaltada.
  useEffect(() => {
    if (highlightedId) {
      document.getElementById(highlightedId)?.scrollIntoView({ block: 'nearest' });
    }
  }, [highlightedId]);

  if (!anchorEl) return null;

  return (
    <Popper
      open
      anchorEl={anchorEl}
      placement="bottom-start"
      style={{ width: anchorEl.clientWidth }}
      sx={{ zIndex: (theme) => theme.zIndex.modal }}
    >
      {/* Ni un clic en una fila ni un arrastre de la barra de scroll quitan el foco al campo. */}
      <Paper
        elevation={4}
        data-testid="product-suggestion-list"
        onMouseDown={(event) => event.preventDefault()}
        sx={{ mt: 0.5, overflow: 'hidden' }}
      >
        {status === 'loading' ? (
          <LinearProgress sx={{ height: 2 }} data-testid="product-suggestion-loading" />
        ) : (
          <Box
            component="ul"
            role="listbox"
            id={listId}
            aria-label="Sugerencias de productos"
            sx={{
              m: 0,
              p: 0,
              listStyle: 'none',
              maxHeight: ROW_HEIGHT * VISIBLE_ROWS,
              overflowY: 'auto',
            }}
          >
            {status === 'empty' && (
              <Box
                component="li"
                role="presentation"
                data-testid="product-suggestion-empty"
                sx={{ minHeight: ROW_HEIGHT, display: 'flex', alignItems: 'center', px: 2 }}
              >
                <Typography color="text.secondary">Sin coincidencias</Typography>
              </Box>
            )}
            {status === 'ready' &&
              suggestions.map((product, index) => {
                const outOfStock = isOutOfStock(product);
                return (
                  <Box
                    key={product.id}
                    component="li"
                    role="option"
                    id={getSuggestionOptionId(listId, product.id)}
                    aria-selected={index === highlightedIndex}
                    aria-disabled={outOfStock || undefined}
                    data-testid={`product-suggestion-${product.id}`}
                    onClick={() => onSelect(product)}
                    sx={{
                      minHeight: ROW_HEIGHT,
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'space-between',
                      gap: 1,
                      px: 2,
                      py: 0.75,
                      cursor: 'pointer',
                      bgcolor: index === highlightedIndex ? 'action.selected' : 'transparent',
                      '&:hover': { bgcolor: 'action.hover' },
                    }}
                  >
                    <Box sx={{ minWidth: 0 }}>
                      <Typography
                        noWrap
                        sx={{ color: outOfStock ? 'text.secondary' : 'text.primary' }}
                      >
                        {product.name}
                      </Typography>
                      <Typography variant="caption" color="text.secondary" noWrap component="div">
                        {product.barcode ? `${product.barcode} · ` : ''}
                        {formatCurrency(product.price)} · Stock: {product.stock} {product.unit}
                      </Typography>
                    </Box>
                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.75, flexShrink: 0 }}>
                      {product.is_bulk && (
                        <Chip label="A granel" size="small" color="primary" variant="outlined" />
                      )}
                      {outOfStock && (
                        <Chip label="Agotado" size="small" color="error" variant="outlined" />
                      )}
                    </Box>
                  </Box>
                );
              })}
          </Box>
        )}
      </Paper>
    </Popper>
  );
};
