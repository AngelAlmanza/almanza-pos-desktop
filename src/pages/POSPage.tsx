import { Payment, Print, ShoppingCart } from "@mui/icons-material";
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
  Typography,
} from "@mui/material";
import { Decimal } from "decimal.js";
import { useMemo, useState } from "react";
import { PosSearchBar } from "../components/pos/PosSearchBar";
import { SaleSummaryTable } from "../components/pos/SaleSummaryTable";
import { useAuth } from "../context/AuthContext";
import { usePos } from "../context/PosProvider";
import type { Sale } from "../models";
import { SaleService } from "../services/SaleService";
import { TicketPrinter } from "../utils/TicketPrinter";

export function POSPage() {
  const { user, cashRegisterSession } = useAuth();
  const { cart, dispatch, error, setError } = usePos();
  const [showPayment, setShowPayment] = useState(false);
  const [success, setSuccess] = useState("");
  const [lastSale, setLastSale] = useState<Sale | null>(null);

  const [useCashMxn, setUseCashMxn] = useState(true);
  const [useCashUsd, setUseCashUsd] = useState(false);
  const [useTransfer, setUseTransfer] = useState(false);
  const [amountMxn, setAmountMxn] = useState("");
  const [amountUsd, setAmountUsd] = useState("");
  const [amountTransfer, setAmountTransfer] = useState("");

  const exchangeRate = useMemo(
    () =>
      cashRegisterSession?.exchange_rate
        ? new Decimal(cashRegisterSession.exchange_rate)
        : null,
    [cashRegisterSession],
  );

  const total = useMemo(
    () => cart.reduce((sum, item) => sum.plus(item.subtotal), new Decimal(0)),
    [cart],
  );

  const parseDec = (val: string): Decimal | null => {
    if (!val) return null;
    try {
      return new Decimal(val);
    } catch {
      return null;
    }
  };

  const paymentMxn = useMemo(
    () =>
      useCashMxn ? (parseDec(amountMxn) ?? new Decimal(0)) : new Decimal(0),
    [useCashMxn, amountMxn],
  );
  const paymentUsd = useMemo(
    () =>
      useCashUsd ? (parseDec(amountUsd) ?? new Decimal(0)) : new Decimal(0),
    [useCashUsd, amountUsd],
  );
  const paymentTransfer = useMemo(
    () =>
      useTransfer
        ? (parseDec(amountTransfer) ?? new Decimal(0))
        : new Decimal(0),
    [useTransfer, amountTransfer],
  );

  const totalPaid = useMemo(() => {
    const mxn = paymentMxn;
    const usdInMxn = exchangeRate ? paymentUsd.times(exchangeRate) : paymentUsd;
    return mxn.plus(usdInMxn).plus(paymentTransfer);
  }, [paymentMxn, paymentUsd, paymentTransfer, exchangeRate]);

  const changeAmount = useMemo(
    () => totalPaid.minus(total),
    [totalPaid, total],
  );

  const isPaymentSufficient = totalPaid.gte(total) && total.gt(0);

  const resetPaymentForm = () => {
    setUseCashMxn(true);
    setUseCashUsd(false);
    setUseTransfer(false);
    setAmountMxn("");
    setAmountUsd("");
    setAmountTransfer("");
  };

  const openPaymentDialog = () => {
    resetPaymentForm();
    setAmountMxn(total.toFixed(2));
    setShowPayment(true);
  };

  const handlePayment = async () => {
    if (!user || !cashRegisterSession) return;
    if (!isPaymentSufficient) {
      setError("Monto de pago insuficiente");
      return;
    }

    try {
      const sale = await SaleService.create({
        cash_register_session_id: cashRegisterSession.id,
        user_id: user.id,
        payment_cash_mxn: paymentMxn.toNumber(),
        payment_cash_usd: paymentUsd.toNumber(),
        payment_transfer: paymentTransfer.toNumber(),
        items: cart.map((item) => ({
          product_id: item.product.id,
          quantity: item.quantity,
        })),
      });

      setLastSale(sale);
      dispatch({ type: "CLEAR_CART" });
      resetPaymentForm();
      setShowPayment(false);
      setSuccess(
        `Venta #${sale.id} completada. Cambio: $${sale.change_amount.toFixed(2)}`,
      );
      setTimeout(() => setSuccess(""), 5000);

      TicketPrinter.printSaleTicket(sale);
    } catch (err) {
      setError(String(err));
      setTimeout(() => setError(""), 5000);
    }
  };

  if (!cashRegisterSession) {
    return (
      <Box sx={{ textAlign: "center", mt: 10 }}>
        <Box
          sx={{
            display: "inline-flex",
            p: 3,
            borderRadius: 3,
            backgroundColor: "rgba(26,32,53,0.05)",
            mb: 2,
          }}
        >
          <ShoppingCart sx={{ fontSize: 48, color: "text.disabled" }} />
        </Box>
        <Typography variant="h6" color="text.secondary" fontWeight={600}>
          No hay una caja abierta
        </Typography>
        <Typography variant="body2" color="text.secondary" sx={{ mt: 0.5 }}>
          Abre una caja en Cortes de Caja para comenzar a vender.
        </Typography>
      </Box>
    );
  }

  return (
    <Box sx={{ display: "flex", gap: 2, height: "calc(100vh - 104px)" }}>
      {/* Left Panel - Cart */}
      <Box
        sx={{ flex: 1, display: "flex", flexDirection: "column", minWidth: 0 }}
      >
        {error && (
          <Alert severity="error" sx={{ mb: 1 }} onClose={() => setError("")}>
            {error}
          </Alert>
        )}
        {success && (
          <Alert
            severity="success"
            sx={{ mb: 1 }}
            onClose={() => setSuccess("")}
          >
            {success}
          </Alert>
        )}
        <PosSearchBar />
        <SaleSummaryTable />
      </Box>

      {/* Right Panel - Receipt-style summary */}
      <Card
        sx={{
          width: 300,
          flexShrink: 0,
          display: "flex",
          flexDirection: "column",
          backgroundColor: "#faf9f6",
          borderLeft: "3px solid",
          borderColor: "primary.main",
        }}
      >
        <CardContent
          sx={{
            flex: 1,
            display: "flex",
            flexDirection: "column",
            p: 2.5,
            "&:last-child": { pb: 2.5 },
          }}
        >
          <Typography
            variant="caption"
            sx={{
              textTransform: "uppercase",
              letterSpacing: "0.08em",
              fontWeight: 600,
              color: "text.secondary",
              display: "block",
              mb: 2,
            }}
          >
            Resumen de Venta
          </Typography>

          <Box sx={{ flex: 1 }}>
            <Box
              sx={{ display: "flex", justifyContent: "space-between", mb: 1 }}
            >
              <Typography variant="body2" color="text.secondary">
                Artículos
              </Typography>
              <Typography
                variant="body2"
                fontWeight={600}
                sx={{ fontVariantNumeric: "tabular-nums" }}
              >
                {cart
                  .reduce(
                    (sum, item) => sum.plus(item.quantity),
                    new Decimal(0),
                  )
                  .toDecimalPlaces(3)
                  .toString()}
              </Typography>
            </Box>
            {exchangeRate && (
              <Box
                sx={{ display: "flex", justifyContent: "space-between", mb: 1 }}
              >
                <Typography variant="body2" color="text.secondary">
                  T/C USD
                </Typography>
                <Typography
                  variant="body2"
                  fontWeight={600}
                  color="warning.dark"
                  sx={{ fontVariantNumeric: "tabular-nums" }}
                >
                  ${exchangeRate.toFixed(2)}
                </Typography>
              </Box>
            )}
          </Box>

          <Divider sx={{ my: 2 }} />

          <Box sx={{ mb: 0.5 }}>
            <Typography
              variant="caption"
              color="text.secondary"
              sx={{ textTransform: "uppercase", letterSpacing: "0.06em" }}
            >
              Total
            </Typography>
            <Typography
              variant="h4"
              fontWeight={700}
              color="primary"
              sx={{ lineHeight: 1.1, fontVariantNumeric: "tabular-nums" }}
            >
              ${total.toFixed(2)}
            </Typography>
            {exchangeRate && total.gt(0) && (
              <Typography
                variant="caption"
                color="text.secondary"
                sx={{ fontVariantNumeric: "tabular-nums" }}
              >
                ≈ ${total.div(exchangeRate).toFixed(2)} USD
              </Typography>
            )}
          </Box>

          <Box sx={{ mt: "auto", pt: 2 }}>
            <Button
              fullWidth
              variant="contained"
              size="large"
              startIcon={<Payment />}
              disabled={cart.length === 0}
              onClick={openPaymentDialog}
            >
              Cobrar
            </Button>

            {lastSale && (
              <Button
                fullWidth
                variant="text"
                size="small"
                startIcon={<Print sx={{ fontSize: "0.9rem !important" }} />}
                sx={{ mt: 1, color: "text.secondary", fontSize: "0.75rem" }}
                onClick={() => TicketPrinter.printSaleTicket(lastSale)}
              >
                Reimprimir último ticket
              </Button>
            )}
          </Box>
        </CardContent>
      </Card>

      {/* Payment Dialog */}
      <Dialog
        open={showPayment}
        onClose={() => setShowPayment(false)}
        maxWidth="sm"
        fullWidth
      >
        <DialogTitle>Cobrar Venta</DialogTitle>
        <DialogContent>
          <Box
            sx={{
              textAlign: "center",
              py: 2.5,
              px: 2,
              mb: 2,
              borderRadius: 1.5,
              backgroundColor: "rgba(13,107,95,0.06)",
              border: "1px solid rgba(13,107,95,0.12)",
            }}
          >
            <Typography
              variant="caption"
              color="text.secondary"
              sx={{ textTransform: "uppercase", letterSpacing: "0.06em" }}
            >
              Total a cobrar
            </Typography>
            <Typography
              variant="h4"
              fontWeight={700}
              color="primary"
              sx={{ fontVariantNumeric: "tabular-nums", lineHeight: 1.2 }}
            >
              ${total.toFixed(2)}
            </Typography>
            {exchangeRate && (
              <Typography
                variant="caption"
                color="text.secondary"
                sx={{ fontVariantNumeric: "tabular-nums" }}
              >
                ≈ ${total.div(exchangeRate).toFixed(2)} USD · T/C: $
                {exchangeRate.toFixed(2)}
              </Typography>
            )}
          </Box>

          <Typography
            variant="caption"
            sx={{
              textTransform: "uppercase",
              letterSpacing: "0.06em",
              color: "text.secondary",
              display: "block",
              mb: 1.5,
            }}
          >
            Métodos de pago
          </Typography>

          {/* Cash MXN */}
          <Box
            sx={{
              mb: 1.5,
              p: 1.5,
              border: "1px solid",
              borderColor: useCashMxn ? "primary.main" : "divider",
              borderRadius: 1.5,
              backgroundColor: useCashMxn
                ? "rgba(13,107,95,0.04)"
                : "transparent",
            }}
          >
            <FormControlLabel
              control={
                <Checkbox
                  checked={useCashMxn}
                  size="small"
                  onChange={(e) => {
                    setUseCashMxn(e.target.checked);
                    if (!e.target.checked) setAmountMxn("");
                  }}
                />
              }
              label={
                <Typography variant="body2" fontWeight={500}>
                  Efectivo MXN
                </Typography>
              }
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
                sx={{ mt: 0.5 }}
                slotProps={{ htmlInput: { step: "0.01", min: "0" } }}
                onKeyDown={(e) =>
                  e.key === "Enter" && isPaymentSufficient && handlePayment()
                }
              />
            )}
          </Box>

          {/* Cash USD */}
          {exchangeRate && (
            <Box
              sx={{
                mb: 1.5,
                p: 1.5,
                border: "1px solid",
                borderColor: useCashUsd ? "success.main" : "divider",
                borderRadius: 1.5,
                backgroundColor: useCashUsd
                  ? "rgba(45,106,79,0.04)"
                  : "transparent",
              }}
            >
              <FormControlLabel
                control={
                  <Checkbox
                    checked={useCashUsd}
                    size="small"
                    onChange={(e) => {
                      setUseCashUsd(e.target.checked);
                      if (!e.target.checked) setAmountUsd("");
                    }}
                  />
                }
                label={
                  <Typography variant="body2" fontWeight={500}>
                    Efectivo USD
                  </Typography>
                }
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
                    sx={{ mt: 0.5 }}
                    slotProps={{ htmlInput: { step: "0.01", min: "0" } }}
                    onKeyDown={(e) =>
                      e.key === "Enter" &&
                      isPaymentSufficient &&
                      handlePayment()
                    }
                  />
                  {parseDec(amountUsd)?.gt(0) && (
                    <Typography
                      variant="caption"
                      color="text.secondary"
                      sx={{
                        mt: 0.5,
                        display: "block",
                        fontVariantNumeric: "tabular-nums",
                      }}
                    >
                      ≈ ${parseDec(amountUsd)!.times(exchangeRate).toFixed(2)}{" "}
                      MXN
                    </Typography>
                  )}
                </>
              )}
            </Box>
          )}

          {/* Transfer */}
          <Box
            sx={{
              mb: 2,
              p: 1.5,
              border: "1px solid",
              borderColor: useTransfer ? "secondary.main" : "divider",
              borderRadius: 1.5,
              backgroundColor: useTransfer
                ? "rgba(193,125,17,0.04)"
                : "transparent",
            }}
          >
            <FormControlLabel
              control={
                <Checkbox
                  checked={useTransfer}
                  size="small"
                  onChange={(e) => {
                    setUseTransfer(e.target.checked);
                    if (!e.target.checked) setAmountTransfer("");
                  }}
                />
              }
              label={
                <Typography variant="body2" fontWeight={500}>
                  Transferencia
                </Typography>
              }
            />
            {useTransfer && (
              <TextField
                fullWidth
                label="Monto transferencia (MXN)"
                type="number"
                value={amountTransfer}
                onChange={(e) => setAmountTransfer(e.target.value)}
                size="small"
                sx={{ mt: 0.5 }}
                slotProps={{ htmlInput: { step: "0.01", min: "0" } }}
                onKeyDown={(e) =>
                  e.key === "Enter" && isPaymentSufficient && handlePayment()
                }
              />
            )}
          </Box>

          <Divider sx={{ mb: 1.5 }} />

          <Box sx={{ display: "flex", justifyContent: "space-between", mb: 1 }}>
            <Typography variant="body2" color="text.secondary">
              Total recibido
            </Typography>
            <Typography
              variant="body2"
              fontWeight={600}
              sx={{ fontVariantNumeric: "tabular-nums" }}
            >
              ${totalPaid.toFixed(2)} MXN
            </Typography>
          </Box>

          {isPaymentSufficient && (
            <Box
              sx={{
                textAlign: "center",
                py: 2,
                px: 2,
                borderRadius: 1.5,
                backgroundColor: "rgba(45,106,79,0.08)",
                border: "1px solid rgba(45,106,79,0.20)",
                mt: 1,
              }}
            >
              <Typography
                variant="caption"
                color="success.main"
                sx={{
                  textTransform: "uppercase",
                  letterSpacing: "0.06em",
                  fontWeight: 600,
                }}
              >
                Cambio
              </Typography>
              <Typography
                variant="h4"
                fontWeight={700}
                color="success.main"
                sx={{ fontVariantNumeric: "tabular-nums", lineHeight: 1.2 }}
              >
                ${changeAmount.toFixed(2)}
              </Typography>
            </Box>
          )}

          {totalPaid.gt(0) && !isPaymentSufficient && (
            <Alert severity="error" sx={{ mt: 1 }} icon={false}>
              <Typography variant="body2">
                Faltan: <strong>${total.minus(totalPaid).toFixed(2)}</strong>{" "}
                MXN
              </Typography>
            </Alert>
          )}
        </DialogContent>
        <DialogActions sx={{ px: 3, pb: 2.5, gap: 1 }}>
          <Button onClick={() => setShowPayment(false)} color="inherit">
            Cancelar
          </Button>
          <Button
            variant="contained"
            onClick={handlePayment}
            disabled={!isPaymentSufficient}
            size="large"
            sx={{ px: 3 }}
          >
            Confirmar Pago
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
}
