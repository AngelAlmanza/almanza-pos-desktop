import {
  Alert,
  Box,
  Button,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  InputAdornment,
  TextField,
  ToggleButton,
  ToggleButtonGroup,
  Typography,
} from '@mui/material';
import { useMemo, useState } from 'react';
import { Product } from '../../models';
import {
  hasSufficientStock,
  isPositiveQuantity,
  multiplyMoney,
  parseNumericInput,
  roundQuantity,
  subtractQuantity,
} from '../../utils/money';
import { amountToQuantity, getUnitConfig, subUnitToBase } from '../../utils/unitConversion';

type InputMode = 'base' | 'sub' | 'amount';

interface BulkQuantityDialogProps {
  open: boolean;
  product: Product | null;
  existingCartQty: number;
  onConfirm: (qty: number) => void;
  onCancel: () => void;
}

export const BulkQuantityDialog = ({
  open,
  product,
  existingCartQty,
  onConfirm,
  onCancel,
}: BulkQuantityDialogProps) => {
  const [inputMode, setInputMode] = useState<InputMode>('base');
  const [inputValue, setInputValue] = useState('');

  const config = product ? getUnitConfig(product.unit) : null;

  const quantityInBase = useMemo(() => {
    if (!product) {
      return null;
    }

    const parsedInput = parseNumericInput(inputValue);
    if (parsedInput === null || parsedInput <= 0) {
      return null;
    }

    try {
      switch (inputMode) {
        case 'base':
          return roundQuantity(parsedInput);
        case 'sub':
          return roundQuantity(subUnitToBase(inputValue, product.unit).toNumber());
        case 'amount':
          return roundQuantity(amountToQuantity(inputValue, product.price).toNumber());
      }
    } catch {
      return null;
    }
  }, [inputMode, inputValue, product]);

  const estimatedTotal = useMemo(() => {
    if (!quantityInBase || !product) return null;
    return multiplyMoney(product.price, quantityInBase);
  }, [quantityInBase, product]);

  const availableStock = product
    ? subtractQuantity(product.stock, existingCartQty)
    : 0;

  const overStock = quantityInBase !== null && !hasSufficientStock(availableStock, quantityInBase);
  const isValid = quantityInBase !== null && isPositiveQuantity(quantityInBase) && !overStock;

  const handleModeChange = (_: unknown, newMode: InputMode | null) => {
    if (newMode) {
      setInputMode(newMode);
      setInputValue('');
    }
  };

  const handleConfirm = () => {
    if (quantityInBase && isValid) {
      onConfirm(quantityInBase);
    }
  };

  const handleClose = () => {
    setInputMode('base');
    setInputValue('');
    onCancel();
  };

  const getAdornmentLabel = (): string => {
    if (!config) return '';
    switch (inputMode) {
      case 'base': return config.baseUnitLabel;
      case 'sub': return config.subUnitLabel;
      case 'amount': return '$';
    }
  };

  return (
    <Dialog open={open} onClose={handleClose} maxWidth="xs" fullWidth>
      <DialogTitle>Agregar Producto a Granel</DialogTitle>
      <DialogContent sx={{ display: 'flex', flexDirection: 'column', gap: 2.5 }}>
        {/* Product info */}
        {product && config && (
          <Box
            sx={{
              mt: 1,
              p: 2,
              backgroundColor: 'rgba(13,107,95,0.06)',
              border: '1px solid rgba(13,107,95,0.12)',
              borderRadius: 1.5,
            }}
          >
            <Typography
              variant="caption"
              sx={{ textTransform: 'uppercase', letterSpacing: '0.06em', fontWeight: 600 }}
              color="text.secondary"
            >
              Producto
            </Typography>
            <Typography variant="h6" fontWeight={700}>
              {product.name}
            </Typography>
            <Typography variant="caption" color="text.secondary" sx={{ fontVariantNumeric: 'tabular-nums' }}>
              ${product.price.toFixed(2)}/{config.baseUnitLabel} · Stock: {product.stock} {config.baseUnitLabel}
            </Typography>
          </Box>
        )}

        {/* Input mode selector */}
        {config && (
          <Box>
            <Typography
              variant="caption"
              sx={{ textTransform: 'uppercase', letterSpacing: '0.06em', fontWeight: 600, mb: 1, display: 'block' }}
              color="text.secondary"
            >
              Modo de entrada
            </Typography>
            <ToggleButtonGroup
              value={inputMode}
              exclusive
              onChange={handleModeChange}
              fullWidth
              size="small"
            >
              <ToggleButton value="base">{config.baseUnitLabel}</ToggleButton>
              <ToggleButton value="sub">{config.subUnitLabel}</ToggleButton>
              <ToggleButton value="amount">$</ToggleButton>
            </ToggleButtonGroup>
          </Box>
        )}

        {/* Input field */}
        <TextField
          autoFocus
          fullWidth
          type="number"
          label={
            inputMode === 'base' ? `Cantidad en ${config?.baseUnitLabel ?? ''}` :
              inputMode === 'sub' ? `Cantidad en ${config?.subUnitLabel ?? ''}` :
                'Monto en pesos'
          }
          value={inputValue}
          onChange={(e) => setInputValue(e.target.value)}
          onKeyDown={(e) => e.key === 'Enter' && isValid && handleConfirm()}
          slotProps={{
            input: {
              endAdornment: (
                <InputAdornment position="end">{getAdornmentLabel()}</InputAdornment>
              ),
            },
            htmlInput: { min: 0, step: 'any' },
          }}
        />

        {/* Preview */}
        {quantityInBase && estimatedTotal && config && (
          <Box
            sx={{
              p: 2,
              backgroundColor: 'rgba(13,107,95,0.04)',
              borderRadius: 1.5,
              display: 'flex',
              flexDirection: 'column',
              gap: 0.5,
            }}
          >
            <Box sx={{ display: 'flex', justifyContent: 'space-between' }}>
              <Typography variant="body2" color="text.secondary">Cantidad</Typography>
              <Typography variant="body2" fontWeight={600} sx={{ fontVariantNumeric: 'tabular-nums' }}>
                {quantityInBase.toFixed(3)} {config.baseUnitLabel}
              </Typography>
            </Box>
            <Box sx={{ display: 'flex', justifyContent: 'space-between' }}>
              <Typography variant="body2" color="text.secondary">Total</Typography>
              <Typography variant="body2" fontWeight={600} sx={{ fontVariantNumeric: 'tabular-nums' }}>
                ${estimatedTotal.toFixed(2)}
              </Typography>
            </Box>
          </Box>
        )}

        {/* Over-stock warning */}
        {overStock && (
          <Alert severity="warning">
            Stock insuficiente. Disponible: {availableStock.toFixed(3)} {config?.baseUnitLabel}
          </Alert>
        )}
      </DialogContent>
      <DialogActions sx={{ px: 3, pb: 2.5, gap: 1 }}>
        <Button onClick={handleClose}>Cancelar</Button>
        <Button
          variant="contained"
          size="large"
          sx={{ px: 3 }}
          disabled={!isValid}
          onClick={handleConfirm}
        >
          Agregar al carrito
        </Button>
      </DialogActions>
    </Dialog>
  );
};
