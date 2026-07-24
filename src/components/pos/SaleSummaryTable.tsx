import {
  Add,
  Delete,
  Edit,
  Remove
} from '@mui/icons-material';
import {
  Box,
  Button,
  Chip,
  IconButton,
  Input,
  Paper,
  Stack,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Typography
} from "@mui/material";
import { useState } from 'react';
import { usePos } from '../../context/PosProvider';
import { CartItem } from '../../models';
import { addQuantity, hasSufficientStock, isPositiveQuantity, parseQuantityInput } from '../../utils/money';
import {
  getBaseEquivalentLabel,
  getBasePriceLabel,
  getPurchaseLabel,
  type SaleItemPresentationData,
} from '../../utils/saleItemPresentation';
import { usesBulkQuantityInput } from '../../utils/unitConversion';
import { BulkQuantityDialog } from './BulkQuantityDialog';

export const SaleSummaryTable = () => {
  const { cart, dispatch, setError } = usePos();
  const [editingBulkItem, setEditingBulkItem] = useState<CartItem | null>(null);

  const toPresentationData = (item: CartItem): SaleItemPresentationData => ({
    quantity: item.quantity,
    base_unit: item.base_unit,
    input_mode: item.input_mode,
    input_value: item.input_value,
    input_unit: item.input_unit,
    unit_price: item.product.price,
    subtotal: item.subtotal,
  });

  const updateQuantity = (index: number, delta: number) => {
    const item = cart[index];
    const newQty = addQuantity(item.quantity, delta);

    if (!isPositiveQuantity(newQty)) {
      dispatch({ type: 'REMOVE_ITEM', payload: { lineKey: item.line_key } });
      return;
    }

    if (!hasSufficientStock(item.product.stock, newQty)) {
      setError(`Stock insuficiente. Disponible: ${item.product.stock}`);
      setTimeout(() => setError(''), 3000);
      return;
    }

    dispatch({ type: 'INCREMENT', payload: { lineKey: item.line_key, delta } });
  };

  const handleQuantityChange = (index: number, rawValue: string) => {
    const item = cart[index];
    const qty = parseQuantityInput(rawValue);

    if (qty === null) {
      // Ignore invalid/incomplete input while the user is typing.
      return;
    }

    if (!isPositiveQuantity(qty)) {
      dispatch({ type: 'REMOVE_ITEM', payload: { lineKey: item.line_key } });
      return;
    }

    if (!item.product.is_bulk && !Number.isInteger(qty)) {
      setError('Los productos por unidad solo aceptan cantidades enteras');
      setTimeout(() => setError(''), 3000);
      return;
    }

    if (!hasSufficientStock(item.product.stock, qty)) {
      setError(`Stock insuficiente. Disponible: ${item.product.stock}`);
      setTimeout(() => setError(''), 3000);
      return;
    }

    dispatch({ type: 'SET_QUANTITY', payload: { lineKey: item.line_key, quantity: qty } });
  };

  const removeFromCart = (index: number) => {
    dispatch({ type: 'REMOVE_ITEM', payload: { lineKey: cart[index].line_key } });
  };

  return (
    <>
      <TableContainer component={Paper} sx={{ flex: 1, overflow: 'auto' }}>
        <Table stickyHeader size="small">
          <TableHead>
            <TableRow>
              <TableCell>Producto</TableCell>
              <TableCell align="center">Compró</TableCell>
              <TableCell align="right">Precio base</TableCell>
              <TableCell align="right">Total</TableCell>
              <TableCell align="center" width={80}></TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {cart.length === 0 ? (
              <TableRow>
                <TableCell colSpan={5} align="center" sx={{ py: 4, color: 'text.secondary' }}>
                  Escanea o busca productos para agregarlos
                </TableCell>
              </TableRow>
            ) : (
              cart.map((item, index) => {
                const presentation = toPresentationData(item);
                const equivalentLabel = getBaseEquivalentLabel(presentation);

                return (
                <TableRow key={item.line_key}>
                  <TableCell>
                    <Typography variant="body2" fontWeight={600}>
                      {item.product.name}
                    </Typography>
                    <Stack direction="row" spacing={1} mt={0.5}>
                      {item.product.barcode && (
                        <Chip
                          label={item.product.barcode}
                          size="small"
                          color="secondary"
                          variant="outlined"
                          sx={{ mt: 0.5, height: 20, fontSize: '0.6875rem' }}
                        />
                      )}
                      {item.product.is_bulk && (
                        <Chip
                          label="A granel"
                          size="small"
                          color="primary"
                          variant="outlined"
                          sx={{ mt: 0.5, height: 20, fontSize: '0.6875rem' }}
                        />
                      )}
                    </Stack>
                  </TableCell>
                  <TableCell align="center">
                    {usesBulkQuantityInput(item.product) ? (
                      <Button
                        size="small"
                        variant="outlined"
                        endIcon={<Edit sx={{ fontSize: 15 }} />}
                        onClick={() => setEditingBulkItem(item)}
                        sx={{ fontVariantNumeric: 'tabular-nums', whiteSpace: 'nowrap' }}
                      >
                        {getPurchaseLabel(presentation)}
                      </Button>
                    ) : (
                      <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 0.5 }}>
                        <IconButton size="small" onClick={() => updateQuantity(index, -1)}>
                          <Remove fontSize="small" />
                        </IconButton>
                        <Input
                          type="number"
                          value={item.quantity}
                          onChange={(e) => handleQuantityChange(index, e.target.value)}
                          inputProps={{ min: 0, max: item.product.stock, step: 1 }}
                          sx={{ width: 60, textAlign: 'center' }}
                        />
                        <Typography variant="caption" color="text.secondary" sx={{ minWidth: 28 }}>
                          {item.product.unit}
                        </Typography>
                        <IconButton size="small" onClick={() => updateQuantity(index, 1)}>
                          <Add fontSize="small" />
                        </IconButton>
                      </Box>
                    )}
                    {equivalentLabel && (
                      <Typography variant="caption" color="text.secondary" display="block">
                        ≈ {equivalentLabel}
                      </Typography>
                    )}
                  </TableCell>
                  <TableCell align="right" sx={{ fontVariantNumeric: 'tabular-nums' }}>
                    {getBasePriceLabel(presentation)}
                  </TableCell>
                  <TableCell align="right" sx={{ fontWeight: 600 }}>
                    ${item.subtotal.toFixed(2)}
                  </TableCell>
                  <TableCell align="center">
                    <IconButton size="small" color="error" onClick={() => removeFromCart(index)}>
                      <Delete fontSize="small" />
                    </IconButton>
                  </TableCell>
                </TableRow>
                );
              })
            )}
          </TableBody>
        </Table>
      </TableContainer>
      <BulkQuantityDialog
        open={editingBulkItem !== null}
        product={editingBulkItem?.product ?? null}
        cartItems={cart}
        editingLineKey={editingBulkItem?.line_key}
        mode="edit"
        initialSelection={editingBulkItem}
        onConfirm={(selection) => {
          if (editingBulkItem) {
            dispatch({
              type: 'SET_INPUT',
              payload: { lineKey: editingBulkItem.line_key, selection },
            });
          }
          setEditingBulkItem(null);
        }}
        onCancel={() => setEditingBulkItem(null)}
      />
    </>
  )
}
