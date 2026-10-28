import { useEffect, useRef, useState } from 'react';
import { Add, Delete, Edit, Remove } from '@mui/icons-material';
import { Box, Button, IconButton, Typography } from '@mui/material';
import type { CartItem } from '@modules/pos/types';
import { useCartLineActions } from '@modules/pos/hooks/useCartLineActions';
import {
  getBaseEquivalentLabel,
  getBasePriceLabel,
  getPurchaseLabel,
  type SaleItemPresentationData,
} from '@modules/pos/utils/saleItemPresentation';
import { usesBulkQuantityInput } from '@modules/shared/utils/unitConversion';
import { formatCurrency } from '@modules/shared/utils/FormatCurrency';
import { BulkQuantityDialog } from './BulkQuantityDialog';

/** Duración del resaltado de una partida recién agregada. */
const NEW_LINE_HIGHLIGHT_MS = 600;

interface CompactCartProps {
  /** Devuelve el foco a la barra cuando el carrito queda vacío. */
  onEmptyFocus: () => void;
}

const toPresentationData = (item: CartItem): SaleItemPresentationData => ({
  quantity: item.quantity,
  base_unit: item.base_unit,
  input_mode: item.input_mode,
  input_value: item.input_value,
  input_unit: item.input_unit,
  unit_price: item.product.price,
  subtotal: item.subtotal,
});

/** P2: segunda línea con la cantidad y el precio base ("2 pza × $54.00/pza"). */
const getQuantityLine = (item: CartItem): string => {
  const presentation = toPresentationData(item);
  const quantityLabel = getBaseEquivalentLabel(presentation) ?? getPurchaseLabel(presentation);
  return `${quantityLabel} × ${getBasePriceLabel(presentation)}`;
};

export const CompactCart = ({ onEmptyFocus }: CompactCartProps) => {
  const {
    cart,
    editingBulkItem,
    startEditingBulk,
    confirmBulkEdit,
    cancelBulkEdit,
    updateQuantity,
    removeLine,
  } = useCartLineActions();
  const [highlightKey, setHighlightKey] = useState<string | null>(null);
  const knownKeysRef = useRef<Set<string>>(new Set());
  const previousLengthRef = useRef(cart.length);
  const onEmptyFocusRef = useRef(onEmptyFocus);
  onEmptyFocusRef.current = onEmptyFocus;

  // Resalta la partida recién agregada durante 600 ms.
  useEffect(() => {
    const known = knownKeysRef.current;
    const added = cart.find((item) => !known.has(item.line_key));
    knownKeysRef.current = new Set(cart.map((item) => item.line_key));
    if (!added) return undefined;
    setHighlightKey(added.line_key);
    const timer = setTimeout(() => setHighlightKey(null), NEW_LINE_HIGHLIGHT_MS);
    return () => clearTimeout(timer);
  }, [cart]);

  // Al quedar vacío (se eliminó la última partida) el foco vuelve a la barra.
  useEffect(() => {
    if (previousLengthRef.current > 0 && cart.length === 0) onEmptyFocusRef.current();
    previousLengthRef.current = cart.length;
  }, [cart.length]);

  return (
    <>
      <Box
        data-testid="compact-cart"
        sx={{ flex: 1, minHeight: 0, display: 'flex', flexDirection: 'column' }}
      >
        <Typography
          variant="caption"
          component="h2"
          sx={{ textTransform: 'uppercase', letterSpacing: '0.08em', fontWeight: 600, color: 'text.secondary', mb: 1 }}
        >
          Venta actual
        </Typography>
        {cart.length === 0 ? (
          <Typography color="text.secondary" textAlign="center" sx={{ py: 4 }}>
            Toca un producto para agregarlo
          </Typography>
        ) : (
          <Box component="ul" sx={{ listStyle: 'none', m: 0, p: 0, overflowY: 'auto', flex: 1 }}>
            {cart.map((item, index) => (
              <Box
                component="li"
                key={item.line_key}
                data-testid={`compact-cart-item-${item.line_key}`}
                sx={{
                  py: 1,
                  px: 0.5,
                  borderBottom: '1px solid',
                  borderColor: 'divider',
                  borderRadius: 1,
                  transition: 'background-color 300ms',
                  bgcolor: highlightKey === item.line_key ? 'rgba(13,107,95,0.08)' : 'transparent',
                }}
              >
                <Box sx={{ display: 'flex', justifyContent: 'space-between', gap: 1 }}>
                  <Typography variant="body2" fontWeight={600} sx={{ minWidth: 0, wordBreak: 'break-word' }}>
                    {item.product.name}
                  </Typography>
                  <Typography variant="body2" fontWeight={600} sx={{ fontVariantNumeric: 'tabular-nums', flexShrink: 0 }}>
                    {formatCurrency(item.subtotal)}
                  </Typography>
                </Box>
                <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 1 }}>
                  <Typography variant="caption" color="text.secondary" sx={{ fontVariantNumeric: 'tabular-nums' }}>
                    {getQuantityLine(item)}
                  </Typography>
                  <Box sx={{ display: 'flex', alignItems: 'center', flexShrink: 0 }}>
                    {usesBulkQuantityInput(item.product) ? (
                      <Button
                        size="small"
                        startIcon={<Edit sx={{ fontSize: 15 }} />}
                        onClick={() => startEditingBulk(item)}
                        aria-label={`Editar cantidad de ${item.product.name}`}
                        data-testid={`compact-cart-edit-${item.line_key}`}
                      >
                        Editar
                      </Button>
                    ) : (
                      <>
                        <IconButton
                          size="small"
                          onClick={() => updateQuantity(index, -1)}
                          aria-label={`Disminuir cantidad de ${item.product.name}`}
                          data-testid={`compact-cart-decrease-${item.line_key}`}
                        >
                          <Remove fontSize="small" />
                        </IconButton>
                        <IconButton
                          size="small"
                          onClick={() => updateQuantity(index, 1)}
                          aria-label={`Aumentar cantidad de ${item.product.name}`}
                          data-testid={`compact-cart-increase-${item.line_key}`}
                        >
                          <Add fontSize="small" />
                        </IconButton>
                      </>
                    )}
                    <IconButton
                      size="small"
                      color="error"
                      onClick={() => removeLine(index)}
                      aria-label={`Eliminar ${item.product.name}`}
                      data-testid={`compact-cart-remove-${item.line_key}`}
                    >
                      <Delete fontSize="small" />
                    </IconButton>
                  </Box>
                </Box>
              </Box>
            ))}
          </Box>
        )}
      </Box>
      <BulkQuantityDialog
        open={editingBulkItem !== null}
        product={editingBulkItem?.product ?? null}
        cartItems={cart}
        editingLineKey={editingBulkItem?.line_key}
        mode="edit"
        initialSelection={editingBulkItem}
        onConfirm={confirmBulkEdit}
        onCancel={cancelBulkEdit}
      />
    </>
  );
};
