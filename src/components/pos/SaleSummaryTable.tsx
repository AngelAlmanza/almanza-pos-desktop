import {
  Add,
  Delete,
  Remove
} from '@mui/icons-material';
import {
  Box,
  IconButton,
  Input,
  Paper,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Typography
} from "@mui/material";
import { Decimal } from 'decimal.js';
import { usePos } from '../../context/PosProvider';
import { isBulkUnit } from '../../utils/unitConversion';

export const SaleSummaryTable = () => {
  const { cart, dispatch, setError } = usePos();

  const updateQuantity = (index: number, delta: number) => {
    const item = cart[index];
    const newQty = new Decimal(item.quantity).plus(delta);
    if (newQty.lte(0)) {
      dispatch({ type: 'REMOVE_ITEM', payload: { productId: item.product.id } });
      return;
    }
    if (newQty.gt(item.product.stock)) {
      setError(`Stock insuficiente. Disponible: ${item.product.stock}`);
      setTimeout(() => setError(''), 3000);
      return;
    }
    dispatch({ type: 'INCREMENT', payload: { productId: item.product.id, delta } });
  };

  const handleQuantityChange = (index: number, rawValue: string) => {
    const item = cart[index];
    try {
      const qty = new Decimal(rawValue);
      if (qty.lte(0)) {
        dispatch({ type: 'REMOVE_ITEM', payload: { productId: item.product.id } });
        return;
      }
      if (qty.gt(item.product.stock)) {
        setError(`Stock insuficiente. Disponible: ${item.product.stock}`);
        setTimeout(() => setError(''), 3000);
        return;
      }
      dispatch({ type: 'SET_QUANTITY', payload: { productId: item.product.id, quantity: qty.toNumber() } });
    } catch {
      // ignore invalid/incomplete input while the user is typing
    }
  };

  const removeFromCart = (index: number) => {
    dispatch({ type: 'REMOVE_ITEM', payload: { productId: cart[index].product.id } });
  };

  return (
    <TableContainer component={Paper} sx={{ flex: 1, overflow: 'auto' }}>
      <Table stickyHeader size="small">
        <TableHead>
          <TableRow>
            <TableCell>Producto</TableCell>
            <TableCell align="center">Cant.</TableCell>
            <TableCell align="right">P. Unit.</TableCell>
            <TableCell align="right">Subtotal</TableCell>
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
            cart.map((item, index) => (
              <TableRow key={item.product.id}>
                <TableCell>
                  <Typography variant="body2" fontWeight={600}>
                    {item.product.name}
                  </Typography>
                  {item.product.barcode && (
                    <Typography variant="caption" color="text.secondary">
                      {item.product.barcode}
                    </Typography>
                  )}
                </TableCell>
                <TableCell align="center">
                  <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 0.5 }}>
                    <IconButton size="small" onClick={() => updateQuantity(index, isBulkUnit(item.product.unit) ? -0.1 : -1)}>
                      <Remove fontSize="small" />
                    </IconButton>
                    <Input
                      type="number"
                      value={item.quantity}
                      onChange={(e) => handleQuantityChange(index, e.target.value)}
                      inputProps={{ min: 0, max: item.product.stock, step: 'any' }}
                      sx={{ width: 60, textAlign: 'center' }}
                    />
                    <Typography variant="caption" color="text.secondary" sx={{ minWidth: 28 }}>
                      {item.product.unit}
                    </Typography>
                    <IconButton size="small" onClick={() => updateQuantity(index, isBulkUnit(item.product.unit) ? 0.1 : 1)}>
                      <Add fontSize="small" />
                    </IconButton>
                  </Box>
                </TableCell>
                <TableCell align="right">${item.product.price.toFixed(2)}</TableCell>
                <TableCell align="right" sx={{ fontWeight: 600 }}>
                  ${item.subtotal.toFixed(2)}
                </TableCell>
                <TableCell align="center">
                  <IconButton size="small" color="error" onClick={() => removeFromCart(index)}>
                    <Delete fontSize="small" />
                  </IconButton>
                </TableCell>
              </TableRow>
            ))
          )}
        </TableBody>
      </Table>
    </TableContainer>
  )
}