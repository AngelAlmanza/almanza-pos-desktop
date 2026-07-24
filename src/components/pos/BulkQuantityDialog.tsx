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
import { useEffect, useMemo, useState } from 'react';
import { CartItem, Product, SaleQuantitySelection } from '../../models';
import { getRequestedProductQuantityAfterAdd } from '../../context/PosProvider';
import type { SaleInputMode } from '../../types';
import {
  hasSufficientStock,
  isPositiveQuantity,
  multiplyMoney,
  parseNumericInput,
} from '../../utils/money';
import {
  buildQuantitySelection,
  getUnitConfig,
  UnitConversionError,
} from '../../utils/unitConversion';
import {
  getBaseEquivalentLabel,
  getBasePriceLabel,
  getPurchaseLabel,
} from '../../utils/saleItemPresentation';

interface BulkQuantityDialogProps {
  open: boolean;
  product: Product | null;
  cartItems: CartItem[];
  editingLineKey?: string;
  mode?: 'add' | 'edit';
  initialSelection?: SaleQuantitySelection | null;
  onConfirm: (selection: SaleQuantitySelection) => void;
  onCancel: () => void;
}

interface QuantityCalculationResult {
  selection: SaleQuantitySelection | null;
  errorMessage: string | null;
}

export const BulkQuantityDialog = ({
  open,
  product,
  cartItems,
  editingLineKey,
  mode = 'add',
  initialSelection = null,
  onConfirm,
  onCancel,
}: BulkQuantityDialogProps) => {
  const [inputMode, setInputMode] = useState<SaleInputMode>('base');
  const [inputValue, setInputValue] = useState('');

  useEffect(() => {
    if (open) {
      setInputMode(initialSelection?.input_mode ?? 'base');
      setInputValue(initialSelection ? String(initialSelection.input_value) : '');
    }
  }, [
    initialSelection?.input_mode,
    initialSelection?.input_unit,
    initialSelection?.input_value,
    open,
    product?.id,
  ]);

  const config = product ? getUnitConfig(product.unit) : null;

  const quantityCalculation = useMemo<QuantityCalculationResult>(() => {
    if (!product) {
      return { selection: null, errorMessage: null };
    }

    const parsedInput = parseNumericInput(inputValue);
    if (parsedInput === null || parsedInput <= 0) {
      return { selection: null, errorMessage: null };
    }

    try {
      const inputUnit = inputMode === 'base'
        ? product.unit
        : inputMode === 'sub'
          ? config?.subUnitCode
          : 'MXN';
      if (!inputUnit) {
        return { selection: null, errorMessage: null };
      }

      return {
        selection: buildQuantitySelection({
          input_mode: inputMode,
          input_value: parsedInput,
          input_unit: inputUnit,
        }, product),
        errorMessage: null,
      };
    } catch (error) {
      return {
        selection: null,
        errorMessage: error instanceof UnitConversionError ? error.message : null,
      };
    }
  }, [config?.subUnitCode, inputMode, inputValue, product]);

  const selection = quantityCalculation.selection;
  const quantityInBase = selection?.quantity ?? null;
  const conversionError = quantityCalculation.errorMessage;

  const estimatedTotal = useMemo(() => {
    if (!quantityInBase || !product) return null;
    return multiplyMoney(product.price, quantityInBase);
  }, [quantityInBase, product]);

  const cartWithoutEditedLine = editingLineKey
    ? cartItems.filter((item) => item.line_key !== editingLineKey)
    : cartItems;
  const requestedProductQuantity = selection && product
    ? getRequestedProductQuantityAfterAdd(cartWithoutEditedLine, product, selection)
    : 0;
  const overStock = selection !== null
    && product !== null
    && !hasSufficientStock(product.stock, requestedProductQuantity);
  const isValid = quantityInBase !== null && isPositiveQuantity(quantityInBase) && !overStock;

  const handleModeChange = (_: unknown, newMode: SaleInputMode | null) => {
    if (newMode) {
      setInputMode(newMode);
      setInputValue('');
    }
  };

  const handleConfirm = () => {
    if (selection && isValid) {
      setInputMode('base');
      setInputValue('');
      onConfirm(selection);
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
      <DialogTitle>
        {mode === 'edit' ? 'Editar cantidad a granel' : 'Agregar producto a granel'}
      </DialogTitle>
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

        {conversionError && (
          <Alert severity="error">
            {conversionError}
          </Alert>
        )}

        {/* Preview */}
        {selection && estimatedTotal !== null && config && product && (
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
              <Typography variant="body2" color="text.secondary">Compró</Typography>
              <Typography variant="body2" fontWeight={600} sx={{ fontVariantNumeric: 'tabular-nums' }}>
                {getPurchaseLabel({
                  ...selection,
                  base_unit: product.unit,
                  unit_price: product.price,
                  subtotal: estimatedTotal,
                })}
              </Typography>
            </Box>
            {selection.input_mode === 'amount' && (
              <Box sx={{ display: 'flex', justifyContent: 'space-between' }}>
                <Typography variant="body2" color="text.secondary">Equivale a</Typography>
                <Typography variant="body2" fontWeight={600} sx={{ fontVariantNumeric: 'tabular-nums' }}>
                  {getBaseEquivalentLabel({
                    ...selection,
                    base_unit: product.unit,
                    unit_price: product.price,
                    subtotal: estimatedTotal,
                  })}
                </Typography>
              </Box>
            )}
            <Box sx={{ display: 'flex', justifyContent: 'space-between' }}>
              <Typography variant="body2" color="text.secondary">Precio base</Typography>
              <Typography variant="body2" fontWeight={600} sx={{ fontVariantNumeric: 'tabular-nums' }}>
                {getBasePriceLabel({ base_unit: product.unit, unit_price: product.price })}
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
            Stock insuficiente. Existencia total: {product?.stock.toFixed(3)} {config?.baseUnitLabel}
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
          {mode === 'edit' ? 'Actualizar cantidad' : 'Agregar al carrito'}
        </Button>
      </DialogActions>
    </Dialog>
  );
};
