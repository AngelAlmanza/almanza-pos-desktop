import {
  Payment,
  ShoppingCart
} from '@mui/icons-material';
import {
  Alert,
  Box,
  Button,
  Card,
  CardContent,
  Checkbox,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  Divider,
  FormControlLabel,
  TextField,
  Typography
} from '@mui/material';
import { Decimal } from 'decimal.js';
import { useMemo, useState } from 'react';
import { PosSearchBar } from '../components/pos/PosSearchBar';
import { SaleSummaryTable } from '../components/pos/SaleSummaryTable';
import { useAuth } from '../context/AuthContext';
import { usePos } from '../context/PosProvider';
import type { Sale } from '../models';
import { SaleService } from '../services/SaleService';
import { TicketPrinter } from '../utils/TicketPrinter';

export function POSPage() {
  const { user, cashRegisterSession } = useAuth();
  const { cart, dispatch, error, setError } = usePos();
  const [showPayment, setShowPayment] = useState(false);
  const [success, setSuccess] = useState('');
  const [lastSale, setLastSale] = useState<Sale | null>(null);

  const [useCashMxn, setUseCashMxn] = useState(true);
  const [useCashUsd, setUseCashUsd] = useState(false);
  const [useTransfer, setUseTransfer] = useState(false);
  const [amountMxn, setAmountMxn] = useState('');
  const [amountUsd, setAmountUsd] = useState('');
  const [amountTransfer, setAmountTransfer] = useState('');

  const exchangeRate = useMemo(
    () => cashRegisterSession?.exchange_rate ? new Decimal(cashRegisterSession.exchange_rate) : null,
    [cashRegisterSession]
  );

  const total = useMemo(
    () => cart.reduce((sum, item) => sum.plus(item.subtotal), new Decimal(0)),
    [cart]
  );

  const parseDec = (val: string): Decimal | null => {
    if (!val) return null;
    try { return new Decimal(val); } catch { return null; }
  };

  const paymentMxn = useMemo(() => useCashMxn ? (parseDec(amountMxn) ?? new Decimal(0)) : new Decimal(0), [useCashMxn, amountMxn]);
  const paymentUsd = useMemo(() => useCashUsd ? (parseDec(amountUsd) ?? new Decimal(0)) : new Decimal(0), [useCashUsd, amountUsd]);
  const paymentTransfer = useMemo(() => useTransfer ? (parseDec(amountTransfer) ?? new Decimal(0)) : new Decimal(0), [useTransfer, amountTransfer]);

  const totalPaid = useMemo(() => {
    const mxn = paymentMxn;
    const usdInMxn = exchangeRate ? paymentUsd.times(exchangeRate) : paymentUsd;
    return mxn.plus(usdInMxn).plus(paymentTransfer);
  }, [paymentMxn, paymentUsd, paymentTransfer, exchangeRate]);

  const changeAmount = useMemo(() => totalPaid.minus(total), [totalPaid, total]);

  const isPaymentSufficient = totalPaid.gte(total) && total.gt(0);

  const resetPaymentForm = () => {
    setUseCashMxn(true);
    setUseCashUsd(false);
    setUseTransfer(false);
    setAmountMxn('');
    setAmountUsd('');
    setAmountTransfer('');
  };

  const openPaymentDialog = () => {
    resetPaymentForm();
    setAmountMxn(total.toFixed(2));
    setShowPayment(true);
  };

  const handlePayment = async () => {
    if (!user || !cashRegisterSession) return;
    if (!isPaymentSufficient) {
      setError('Monto de pago insuficiente');
      return;
    }

    try {
      const sale = await SaleService.create({
        cash_register_session_id: cashRegisterSession.id,
        user_id: user.id,
        payment_cash_mxn: paymentMxn.toNumber(),
        payment_cash_usd: paymentUsd.toNumber(),
        payment_transfer: paymentTransfer.toNumber(),
        items: cart.map(item => ({
          product_id: item.product.id,
          quantity: item.quantity,
        })),
      });

      setLastSale(sale);
      dispatch({ type: 'CLEAR_CART' });
      resetPaymentForm();
      setShowPayment(false);
      setSuccess(`Venta #${sale.id} completada. Cambio: $${sale.change_amount.toFixed(2)}`);
      setTimeout(() => setSuccess(''), 5000);

      TicketPrinter.printSaleTicket(sale);
    } catch (err) {
      setError(String(err));
      setTimeout(() => setError(''), 5000);
    }
  };

  if (!cashRegisterSession) {
    return (
      <Box sx={{ textAlign: 'center', mt: 8 }}>
        <ShoppingCart sx={{ fontSize: 80, color: 'text.disabled', mb: 2 }} />
        <Typography variant="h5" color="text.secondary">
          No hay una caja abierta
        </Typography>
        <Typography color="text.secondary" sx={{ mt: 1 }}>
          Debes abrir una caja antes de poder realizar ventas.
        </Typography>
      </Box>
    );
  }

  return (
    <Box sx={{ display: 'flex', gap: 2, height: 'calc(100vh - 112px)' }}>
      {/* Left Panel - Cart */}
      <Box sx={{ flex: 1, display: 'flex', flexDirection: 'column' }}>
        {error && <Alert severity="error" sx={{ mb: 1 }} onClose={() => setError('')}>{error}</Alert>}
        {success && <Alert severity="success" sx={{ mb: 1 }} onClose={() => setSuccess('')}>{success}</Alert>}

        <PosSearchBar />
        <SaleSummaryTable />
      </Box>

      {/* Right Panel - Summary */}
      <Card sx={{ width: 320, display: 'flex', flexDirection: 'column' }}>
        <CardContent sx={{ flex: 1, display: 'flex', flexDirection: 'column' }}>
          <Typography variant="h6" gutterBottom>
            Resumen de Venta
          </Typography>
          <Divider sx={{ mb: 2 }} />

          <Box sx={{ flex: 1 }}>
            <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 1 }}>
              <Typography color="text.secondary">Artículos:</Typography>
              <Typography fontWeight={600}>
                {cart.reduce((sum, item) => sum.plus(item.quantity), new Decimal(0)).toDecimalPlaces(3).toString()}
              </Typography>
            </Box>
            {exchangeRate && (
              <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 1 }}>
                <Typography color="text.secondary">T/C USD:</Typography>
                <Typography fontWeight={600}>${exchangeRate.toFixed(2)}</Typography>
              </Box>
            )}
          </Box>

          <Divider sx={{ my: 2 }} />
          <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 3 }}>
            <Typography variant="h5" fontWeight={700}>Total:</Typography>
            <Typography variant="h5" fontWeight={700} color="primary">
              ${total.toFixed(2)}
            </Typography>
          </Box>

          {exchangeRate && total.gt(0) && (
            <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 2 }}>
              <Typography color="text.secondary">En USD:</Typography>
              <Typography fontWeight={600}>
                ${total.div(exchangeRate).toFixed(2)} USD
              </Typography>
            </Box>
          )}

          <Button
            fullWidth
            variant="contained"
            size="large"
            startIcon={<Payment />}
            disabled={cart.length === 0}
            onClick={openPaymentDialog}
            sx={{ py: 1.5 }}
          >
            Cobrar
          </Button>

          {lastSale && (
            <Button
              fullWidth
              variant="outlined"
              size="small"
              sx={{ mt: 1 }}
              onClick={() => TicketPrinter.printSaleTicket(lastSale)}
            >
              Reimprimir último ticket
            </Button>
          )}
        </CardContent>
      </Card>

      {/* Payment Dialog */}
      <Dialog open={showPayment} onClose={() => setShowPayment(false)} maxWidth="sm" fullWidth>
        <DialogTitle>Cobrar Venta</DialogTitle>
        <DialogContent>
          <Box sx={{ textAlign: 'center', my: 2 }}>
            <Typography variant="h4" fontWeight={700} color="primary">
              ${total.toFixed(2)}
            </Typography>
            <Typography color="text.secondary">Total a cobrar (MXN)</Typography>
            {exchangeRate && (
              <Typography variant="body2" color="text.secondary">
                ≈ ${total.div(exchangeRate).toFixed(2)} USD (T/C: ${exchangeRate.toFixed(2)})
              </Typography>
            )}
          </Box>

          <Divider sx={{ mb: 2 }} />
          <Typography variant="subtitle2" sx={{ mb: 1 }}>Métodos de pago</Typography>

          {/* Cash MXN */}
          <Box sx={{ mb: 2, p: 1.5, border: '1px solid', borderColor: useCashMxn ? 'primary.main' : 'divider', borderRadius: 1 }}>
            <FormControlLabel
              control={<Checkbox checked={useCashMxn} onChange={(e) => { setUseCashMxn(e.target.checked); if (!e.target.checked) setAmountMxn(''); }} />}
              label="Efectivo MXN"
            />
            {useCashMxn && (
              <TextField
                fullWidth
                label="Monto en pesos"
                type="number"
                value={amountMxn}
                onChange={(e) => setAmountMxn(e.target.value)}
                size="small"
                autoFocus
                slotProps={{ htmlInput: { step: '0.01', min: '0' } }}
                onKeyDown={(e) => e.key === 'Enter' && isPaymentSufficient && handlePayment()}
              />
            )}
          </Box>

          {/* Cash USD */}
          {exchangeRate && (
            <Box sx={{ mb: 2, p: 1.5, border: '1px solid', borderColor: useCashUsd ? 'success.main' : 'divider', borderRadius: 1 }}>
              <FormControlLabel
                control={<Checkbox checked={useCashUsd} onChange={(e) => { setUseCashUsd(e.target.checked); if (!e.target.checked) setAmountUsd(''); }} />}
                label="Efectivo USD"
              />
              {useCashUsd && (
                <>
                  <TextField
                    fullWidth
                    label="Monto en dólares"
                    type="number"
                    value={amountUsd}
                    onChange={(e) => setAmountUsd(e.target.value)}
                    size="small"
                    slotProps={{ htmlInput: { step: '0.01', min: '0' } }}
                    onKeyDown={(e) => e.key === 'Enter' && isPaymentSufficient && handlePayment()}
                  />
                  {parseDec(amountUsd)?.gt(0) && (
                    <Typography variant="caption" color="text.secondary" sx={{ mt: 0.5, display: 'block' }}>
                      ≈ ${parseDec(amountUsd)!.times(exchangeRate).toFixed(2)} MXN
                    </Typography>
                  )}
                </>
              )}
            </Box>
          )}

          {/* Transfer */}
          <Box sx={{ mb: 2, p: 1.5, border: '1px solid', borderColor: useTransfer ? 'info.main' : 'divider', borderRadius: 1 }}>
            <FormControlLabel
              control={<Checkbox checked={useTransfer} onChange={(e) => { setUseTransfer(e.target.checked); if (!e.target.checked) setAmountTransfer(''); }} />}
              label="Transferencia"
            />
            {useTransfer && (
              <TextField
                fullWidth
                label="Monto transferencia (MXN)"
                type="number"
                value={amountTransfer}
                onChange={(e) => setAmountTransfer(e.target.value)}
                size="small"
                slotProps={{ htmlInput: { step: '0.01', min: '0' } }}
                onKeyDown={(e) => e.key === 'Enter' && isPaymentSufficient && handlePayment()}
              />
            )}
          </Box>

          <Divider sx={{ my: 2 }} />

          {/* Payment summary */}
          <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 0.5 }}>
            <Typography color="text.secondary">Total recibido (MXN):</Typography>
            <Typography fontWeight={600}>${totalPaid.toFixed(2)}</Typography>
          </Box>

          {isPaymentSufficient && (
            <Alert severity="info" icon={false} sx={{ textAlign: 'center', mt: 1 }}>
              <Typography variant="h5" fontWeight={700}>
                Cambio: ${changeAmount.toFixed(2)}
              </Typography>
            </Alert>
          )}
          {totalPaid.gt(0) && !isPaymentSufficient && (
            <Alert severity="error" sx={{ mt: 1 }}>
              Monto insuficiente. Faltan: ${total.minus(totalPaid).toFixed(2)}
            </Alert>
          )}
        </DialogContent>
        <DialogActions sx={{ px: 3, pb: 2 }}>
          <Button onClick={() => setShowPayment(false)}>Cancelar</Button>
          <Button
            variant="contained"
            onClick={handlePayment}
            disabled={!isPaymentSufficient}
          >
            Confirmar Pago
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
}
