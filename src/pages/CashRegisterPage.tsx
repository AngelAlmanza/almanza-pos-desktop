import { AccountBalance, Close, OpenInNew, Print } from "@mui/icons-material";
import {
  Alert,
  Box,
  Button,
  Card,
  CardContent,
  Chip,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  Grid,
  MenuItem,
  Paper,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TablePagination,
  TableRow,
  TextField,
  Typography,
} from "@mui/material";
import { DatePicker } from "@mui/x-date-pickers";
import moment, { Moment } from "moment";
import { useEffect, useState } from "react";
import { SummaryCard } from "../components/cash-register/SumaryCard";
import { useAuth } from "../context/AuthContext";
import type { CashRegisterSession, CashRegisterSummary, User } from "../models";
import { CashRegisterService } from "../services/CashRegisterService";
import { UserService } from "../services/UserService";
import { formatCurrency } from "../utils/FormatCurrency";
import { TicketPrinter } from "../utils/TicketPrinter";

moment.locale("es");

const getMonthStart = (): Moment => moment().startOf("month");
const getMonthEnd = (): Moment => moment().endOf("month");

export function CashRegisterPage() {
  const { user, isAdmin, cashRegisterSession, setCashRegisterSession } =
    useAuth();
  const [sessions, setSessions] = useState<CashRegisterSession[]>([]);
  const [users, setUsers] = useState<User[]>([]);
  const [openDialog, setOpenDialog] = useState(false);
  const [closeDialog, setCloseDialog] = useState(false);
  const [summaryDialog, setSummaryDialog] = useState(false);
  const [summary, setSummary] = useState<CashRegisterSummary | null>(null);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  const [startDate, setStartDate] = useState<Moment>(() => getMonthStart());
  const [endDate, setEndDate] = useState<Moment>(() => getMonthEnd());
  const [page, setPage] = useState(0);
  const [rowsPerPage, setRowsPerPage] = useState(50);
  const [totalRows, setTotalRows] = useState(0);

  const [openForm, setOpenForm] = useState({
    user_id: user?.id?.toString() || "",
    opening_amount: "",
    exchange_rate: "",
  });

  const [closeForm, setCloseForm] = useState({
    closing_cash_mxn: "",
    closing_cash_usd: "",
  });

  const loadSessions = async (
    currentPage = page,
    currentRowsPerPage = rowsPerPage,
  ) => {
    try {
      const result = await CashRegisterService.getByDateRange(
        {
          start_date: startDate.format("YYYY-MM-DD") + " 00:00:00",
          end_date: endDate.format("YYYY-MM-DD") + " 23:59:59",
        },
        currentPage + 1,
        currentRowsPerPage,
      );
      setSessions(result.data);
      setTotalRows(result.total);
    } catch (err) {
      setError(String(err));
    }
  };

  const handlePageChange = (_: unknown, newPage: number) => {
    setPage(newPage);
    loadSessions(newPage, rowsPerPage);
  };

  const handleRowsPerPageChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const newRows = parseInt(e.target.value, 10);
    setRowsPerPage(newRows);
    setPage(0);
    loadSessions(0, newRows);
  };

  const loadData = async () => {
    try {
      await loadSessions();
      if (isAdmin) {
        const usersData = await UserService.getAll();
        setUsers(usersData.filter((u) => u.active));
      }
      if (user) {
        const openSession = await CashRegisterService.getOpen();
        if (openSession && openSession.user_id === user.id) {
          setCashRegisterSession(openSession);
        }
      }
    } catch (err) {
      setError(String(err));
    }
  };

  const handleOpenCashRegister = async () => {
    try {
      const session = await CashRegisterService.open({
        user_id: parseInt(openForm.user_id),
        opening_amount: parseFloat(openForm.opening_amount) || 0,
        exchange_rate: openForm.exchange_rate
          ? parseFloat(openForm.exchange_rate)
          : undefined,
      });
      if (parseInt(openForm.user_id) === user?.id) {
        setCashRegisterSession(session);
      }
      setOpenDialog(false);
      setOpenForm({
        user_id: user?.id?.toString() || "",
        opening_amount: "",
        exchange_rate: "",
      });
      setSuccess("Caja abierta exitosamente");
      setTimeout(() => setSuccess(""), 3000);
      loadData();
    } catch (err) {
      setError(String(err));
    }
  };

  const handleCloseCashRegister = async () => {
    if (!cashRegisterSession) return;
    try {
      const result = await CashRegisterService.close({
        session_id: cashRegisterSession.id,
        closing_cash_mxn: parseFloat(closeForm.closing_cash_mxn) || 0,
        closing_cash_usd: parseFloat(closeForm.closing_cash_usd) || 0,
      });
      setSummary(result);
      setCashRegisterSession(null);
      setCloseDialog(false);
      setSummaryDialog(true);
      setCloseForm({ closing_cash_mxn: "", closing_cash_usd: "" });
      TicketPrinter.printCashRegisterCloseTicket(result);
      loadData();
    } catch (err) {
      setError(String(err));
    }
  };

  const handleViewSummary = async (sessionId: number) => {
    try {
      const result = await CashRegisterService.getSummary(sessionId);
      setSummary(result);
      setSummaryDialog(true);
    } catch (err) {
      setError(String(err));
    }
  };

  useEffect(() => {
    loadData();
  }, []);
  useEffect(() => {
    setPage(0);
    loadSessions(0, rowsPerPage);
  }, [startDate, endDate]);

  return (
    <Box>
      <Box
        sx={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          mb: 3,
        }}
      >
        <Typography variant="h5">Cortes de Caja</Typography>
        <Box sx={{ display: "flex", gap: 1 }}>
          {cashRegisterSession && (
            <Button
              variant="outlined"
              color="error"
              size="small"
              startIcon={<Close fontSize="small" />}
              onClick={() => setCloseDialog(true)}
            >
              Cerrar Caja
            </Button>
          )}
          <Button
            variant="contained"
            size="small"
            startIcon={<OpenInNew fontSize="small" />}
            onClick={() => setOpenDialog(true)}
            disabled={!!cashRegisterSession}
          >
            Abrir Caja
          </Button>
        </Box>
      </Box>

      <Box
        sx={{
          display: "flex",
          gap: 1.5,
          alignItems: "center",
          justifyContent: "flex-end",
          mb: 3,
        }}
      >
        <DatePicker
          label="Fecha inicio"
          value={startDate}
          onChange={(value) => setStartDate(value ?? getMonthStart())}
          maxDate={endDate}
          slotProps={{ textField: { size: "small" } }}
        />
        <DatePicker
          label="Fecha fin"
          value={endDate}
          onChange={(value) => setEndDate(value ?? getMonthEnd())}
          minDate={startDate}
          slotProps={{ textField: { size: "small" } }}
        />
      </Box>

      {error && (
        <Alert severity="error" sx={{ mb: 2 }} onClose={() => setError("")}>
          {error}
        </Alert>
      )}
      {success && (
        <Alert severity="success" sx={{ mb: 2 }} onClose={() => setSuccess("")}>
          {success}
        </Alert>
      )}

      {/* Active session card */}
      {cashRegisterSession && (
        <Card
          sx={{ mb: 3, borderLeft: "3px solid", borderColor: "success.main" }}
        >
          <CardContent sx={{ py: 2 }}>
            <Box
              sx={{ display: "flex", alignItems: "center", gap: 1, mb: 1.5 }}
            >
              <AccountBalance sx={{ fontSize: 16, color: "success.main" }} />
              <Typography
                variant="caption"
                sx={{
                  textTransform: "uppercase",
                  letterSpacing: "0.06em",
                  fontWeight: 600,
                  color: "success.main",
                }}
              >
                Caja Activa
              </Typography>
            </Box>
            <Grid container spacing={2}>
              <Grid size={{ xs: 6, sm: 3 }}>
                <Typography
                  variant="caption"
                  color="text.secondary"
                  sx={{
                    textTransform: "uppercase",
                    letterSpacing: "0.05em",
                    fontWeight: 600,
                  }}
                >
                  Número
                </Typography>
                <Typography
                  variant="h6"
                  color="success.main"
                  sx={{ fontVariantNumeric: "tabular-nums" }}
                >
                  #{cashRegisterSession.id}
                </Typography>
              </Grid>
              <Grid size={{ xs: 6, sm: 3 }}>
                <Typography
                  variant="caption"
                  color="text.secondary"
                  sx={{
                    textTransform: "uppercase",
                    letterSpacing: "0.05em",
                    fontWeight: 600,
                  }}
                >
                  Fondo Inicial
                </Typography>
                <Typography
                  variant="h6"
                  sx={{ fontVariantNumeric: "tabular-nums" }}
                >
                  {formatCurrency(cashRegisterSession.opening_amount)}
                </Typography>
              </Grid>
              <Grid size={{ xs: 6, sm: 3 }}>
                <Typography
                  variant="caption"
                  color="text.secondary"
                  sx={{
                    textTransform: "uppercase",
                    letterSpacing: "0.05em",
                    fontWeight: 600,
                  }}
                >
                  Abierta
                </Typography>
                <Typography variant="body2">
                  {moment(cashRegisterSession.opened_at).format(
                    "DD/MM/YYYY hh:mm A",
                  )}
                </Typography>
              </Grid>
              {cashRegisterSession.exchange_rate && (
                <Grid size={{ xs: 6, sm: 3 }}>
                  <Typography
                    variant="caption"
                    color="text.secondary"
                    sx={{
                      textTransform: "uppercase",
                      letterSpacing: "0.05em",
                      fontWeight: 600,
                    }}
                  >
                    T/C USD
                  </Typography>
                  <Typography
                    variant="h6"
                    color="warning.dark"
                    sx={{ fontVariantNumeric: "tabular-nums" }}
                  >
                    {formatCurrency(cashRegisterSession.exchange_rate)}
                  </Typography>
                </Grid>
              )}
            </Grid>
          </CardContent>
        </Card>
      )}

      <Paper elevation={0} sx={{ border: "1px solid rgba(26,32,53,0.10)" }}>
        <TableContainer>
          <Table size="small">
            <TableHead>
              <TableRow>
                <TableCell>ID</TableCell>
                <TableCell>Cajero</TableCell>
                <TableCell>Apertura</TableCell>
                <TableCell>Cierre</TableCell>
                <TableCell align="right">Fondo Inicial</TableCell>
                <TableCell align="right">Monto Cierre</TableCell>
                <TableCell>T/C USD</TableCell>
                <TableCell>Estado</TableCell>
                <TableCell align="center">Acciones</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {sessions.map((session) => (
                <TableRow key={session.id} hover>
                  <TableCell
                    sx={{
                      color: "text.secondary",
                      fontVariantNumeric: "tabular-nums",
                    }}
                  >
                    #{session.id}
                  </TableCell>
                  <TableCell sx={{ fontWeight: 500 }}>
                    {session.user_name}
                  </TableCell>
                  <TableCell
                    sx={{ fontSize: "0.8125rem", color: "text.secondary" }}
                  >
                    {moment(session.opened_at).format("DD/MM/YYYY hh:mm A")}
                  </TableCell>
                  <TableCell
                    sx={{ fontSize: "0.8125rem", color: "text.secondary" }}
                  >
                    {session.closed_at
                      ? moment(session.closed_at).format("DD/MM/YYYY hh:mm A")
                      : "—"}
                  </TableCell>
                  <TableCell
                    align="right"
                    sx={{ fontVariantNumeric: "tabular-nums" }}
                  >
                    {formatCurrency(session.opening_amount)}
                  </TableCell>
                  <TableCell
                    align="right"
                    sx={{ fontVariantNumeric: "tabular-nums" }}
                  >
                    {session.closing_amount != null
                      ? formatCurrency(session.closing_amount)
                      : "—"}
                  </TableCell>
                  <TableCell
                    sx={{
                      color: session.exchange_rate
                        ? "warning.dark"
                        : "text.secondary",
                      fontVariantNumeric: "tabular-nums",
                    }}
                  >
                    {session.exchange_rate
                      ? formatCurrency(session.exchange_rate)
                      : "—"}
                  </TableCell>
                  <TableCell>
                    <Chip
                      label={session.status === "open" ? "Abierta" : "Cerrada"}
                      size="small"
                      sx={
                        session.status === "open"
                          ? {
                              backgroundColor: "rgba(45,106,79,0.12)",
                              color: "success.dark",
                              fontWeight: 600,
                            }
                          : {
                              backgroundColor: "rgba(26,32,53,0.08)",
                              color: "text.secondary",
                              fontWeight: 500,
                            }
                      }
                    />
                  </TableCell>
                  <TableCell align="center">
                    <Button
                      size="small"
                      variant="text"
                      onClick={() => handleViewSummary(session.id)}
                    >
                      Ver Resumen
                    </Button>
                  </TableCell>
                </TableRow>
              ))}
              {sessions.length === 0 && (
                <TableRow>
                  <TableCell
                    colSpan={9}
                    align="center"
                    sx={{ py: 4, color: "text.secondary" }}
                  >
                    No hay sesiones en el rango seleccionado
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </TableContainer>
        <TablePagination
          component="div"
          count={totalRows}
          page={page}
          onPageChange={handlePageChange}
          rowsPerPage={rowsPerPage}
          onRowsPerPageChange={handleRowsPerPageChange}
          rowsPerPageOptions={[25, 50, 100]}
          labelRowsPerPage="Filas por página:"
          labelDisplayedRows={({ from, to, count }) =>
            `${from}–${to} de ${count}`
          }
        />
      </Paper>

      {/* Open Dialog */}
      <Dialog
        open={openDialog}
        onClose={() => setOpenDialog(false)}
        maxWidth="sm"
        fullWidth
      >
        <DialogTitle>Abrir Caja</DialogTitle>
        <DialogContent>
          <Box
            sx={{ display: "flex", flexDirection: "column", gap: 2, mt: 0.5 }}
          >
            {isAdmin ? (
              <TextField
                select
                label="Asignar a usuario"
                value={openForm.user_id}
                onChange={(e) =>
                  setOpenForm({ ...openForm, user_id: e.target.value })
                }
                required
                fullWidth
                size="small"
              >
                {users.map((u) => (
                  <MenuItem key={u.id} value={String(u.id)}>
                    {u.full_name} ({u.role})
                  </MenuItem>
                ))}
              </TextField>
            ) : (
              <TextField
                label="Usuario"
                value={user?.full_name}
                disabled
                fullWidth
                size="small"
              />
            )}
            <TextField
              label="Fondo inicial (MXN)"
              type="number"
              value={openForm.opening_amount}
              onChange={(e) =>
                setOpenForm({ ...openForm, opening_amount: e.target.value })
              }
              fullWidth
              size="small"
              slotProps={{ htmlInput: { step: "0.01", min: "0.01" } }}
            />
            <TextField
              label="Tipo de cambio USD (opcional)"
              type="number"
              value={openForm.exchange_rate}
              onChange={(e) =>
                setOpenForm({ ...openForm, exchange_rate: e.target.value })
              }
              fullWidth
              size="small"
              slotProps={{ htmlInput: { step: "0.01", min: "0.01" } }}
              helperText="Dejar vacío si no se aceptan dólares"
            />
          </Box>
        </DialogContent>
        <DialogActions sx={{ px: 3, pb: 2.5, gap: 1 }}>
          <Button onClick={() => setOpenDialog(false)} color="inherit">
            Cancelar
          </Button>
          <Button
            variant="contained"
            onClick={handleOpenCashRegister}
            disabled={!openForm.user_id}
          >
            Abrir Caja
          </Button>
        </DialogActions>
      </Dialog>

      {/* Close Dialog */}
      <Dialog
        open={closeDialog}
        onClose={() => setCloseDialog(false)}
        maxWidth="sm"
        fullWidth
      >
        <DialogTitle>Cerrar Caja #{cashRegisterSession?.id}</DialogTitle>
        <DialogContent>
          <Box
            sx={{ display: "flex", flexDirection: "column", gap: 2, mt: 0.5 }}
          >
            <Alert severity="info" sx={{ fontSize: "0.8125rem" }}>
              Cuenta el efectivo físico en caja e ingresa los montos.
            </Alert>
            <TextField
              label="Efectivo en caja (MXN)"
              type="number"
              value={closeForm.closing_cash_mxn}
              onChange={(e) =>
                setCloseForm({ ...closeForm, closing_cash_mxn: e.target.value })
              }
              fullWidth
              autoFocus
              size="small"
              slotProps={{ htmlInput: { step: "0.01", min: "0" } }}
            />
            {cashRegisterSession?.exchange_rate && (
              <TextField
                label="Efectivo en caja (USD)"
                type="number"
                value={closeForm.closing_cash_usd}
                onChange={(e) =>
                  setCloseForm({
                    ...closeForm,
                    closing_cash_usd: e.target.value,
                  })
                }
                fullWidth
                size="small"
                slotProps={{ htmlInput: { step: "0.01", min: "0" } }}
                helperText={`T/C: $${cashRegisterSession.exchange_rate.toFixed(2)}`}
              />
            )}
          </Box>
        </DialogContent>
        <DialogActions sx={{ px: 3, pb: 2.5, gap: 1 }}>
          <Button onClick={() => setCloseDialog(false)} color="inherit">
            Cancelar
          </Button>
          <Button
            variant="contained"
            color="error"
            onClick={handleCloseCashRegister}
          >
            Cerrar Caja
          </Button>
        </DialogActions>
      </Dialog>

      {/* Summary Dialog */}
      <Dialog
        open={summaryDialog}
        onClose={() => setSummaryDialog(false)}
        maxWidth="md"
        fullWidth
      >
        <DialogTitle>Resumen de Caja #{summary?.session.id}</DialogTitle>
        <DialogContent>
          {summary && (
            <Box sx={{ mt: 0.5 }}>
              <Grid container spacing={1.5}>
                <Grid size={{ xs: 6, md: 3 }}>
                  <SummaryCard
                    label="Fondo Inicial"
                    value={formatCurrency(summary.session.opening_amount)}
                  />
                </Grid>
                <Grid size={{ xs: 6, md: 3 }}>
                  <SummaryCard
                    label="Total Ventas"
                    value={formatCurrency(summary.total_sales)}
                  />
                </Grid>
                <Grid size={{ xs: 6, md: 3 }}>
                  <SummaryCard
                    label="Transacciones"
                    value={String(summary.total_transactions)}
                  />
                </Grid>
                <Grid size={{ xs: 6, md: 3 }}>
                  <SummaryCard
                    label="Cambio Entregado"
                    value={formatCurrency(summary.total_change_given)}
                  />
                </Grid>

                <Grid size={12}>
                  <Typography
                    variant="caption"
                    sx={{
                      textTransform: "uppercase",
                      letterSpacing: "0.06em",
                      fontWeight: 600,
                      color: "text.secondary",
                      display: "block",
                      mt: 1,
                    }}
                  >
                    Desglose de Cobros
                  </Typography>
                </Grid>
                <Grid size={{ xs: 6, md: 4 }}>
                  <SummaryCard
                    label="Efectivo MXN"
                    value={formatCurrency(summary.sales_cash_mxn)}
                  />
                </Grid>
                <Grid size={{ xs: 6, md: 4 }}>
                  <SummaryCard
                    label="Efectivo USD"
                    value={`$${summary.sales_cash_usd.toFixed(2)} USD`}
                  />
                </Grid>
                <Grid size={{ xs: 6, md: 4 }}>
                  <SummaryCard
                    label="Transferencias"
                    value={formatCurrency(summary.sales_transfer)}
                  />
                </Grid>

                <Grid size={12}>
                  <Typography
                    variant="caption"
                    sx={{
                      textTransform: "uppercase",
                      letterSpacing: "0.06em",
                      fontWeight: 600,
                      color: "text.secondary",
                      display: "block",
                      mt: 1,
                    }}
                  >
                    Efectivo Esperado vs Real
                  </Typography>
                </Grid>
                <Grid size={{ xs: 6, md: 3 }}>
                  <SummaryCard
                    label="Esperado MXN"
                    value={formatCurrency(summary.expected_cash_mxn)}
                  />
                </Grid>
                <Grid size={{ xs: 6, md: 3 }}>
                  <SummaryCard
                    label="Esperado USD"
                    value={`$${summary.expected_cash_usd.toFixed(2)} USD`}
                  />
                </Grid>

                {summary.session.status === "closed" && (
                  <>
                    <Grid size={{ xs: 6, md: 3 }}>
                      <SummaryCard
                        label="En Caja MXN"
                        value={formatCurrency(summary.actual_cash_mxn)}
                      />
                    </Grid>
                    <Grid size={{ xs: 6, md: 3 }}>
                      <SummaryCard
                        label="En Caja USD"
                        value={`$${summary.actual_cash_usd.toFixed(2)} USD`}
                      />
                    </Grid>

                    <Grid size={12}>
                      <Typography
                        variant="caption"
                        sx={{
                          textTransform: "uppercase",
                          letterSpacing: "0.06em",
                          fontWeight: 600,
                          color: "text.secondary",
                          display: "block",
                          mt: 1,
                        }}
                      >
                        Diferencias
                      </Typography>
                    </Grid>
                    <Grid size={{ xs: 6 }}>
                      <SummaryCard
                        label="Diferencia MXN"
                        value={`${summary.difference_mxn >= 0 ? "+" : ""}${formatCurrency(summary.difference_mxn)}`}
                        accent={
                          summary.difference_mxn >= 0 ? "success" : "error"
                        }
                      />
                    </Grid>
                    <Grid size={{ xs: 6 }}>
                      <SummaryCard
                        label="Diferencia USD"
                        value={`${summary.difference_usd >= 0 ? "+" : ""}$${summary.difference_usd.toFixed(2)} USD`}
                        accent={
                          summary.difference_usd >= 0 ? "success" : "error"
                        }
                      />
                    </Grid>
                  </>
                )}

                {summary.session.exchange_rate && (
                  <Grid size={12}>
                    <Typography
                      variant="caption"
                      color="text.secondary"
                      sx={{ mt: 0.5, display: "block" }}
                    >
                      Tipo de cambio de la sesión: $
                      {summary.session.exchange_rate.toFixed(2)} MXN/USD
                    </Typography>
                  </Grid>
                )}
              </Grid>
            </Box>
          )}
        </DialogContent>
        <DialogActions sx={{ px: 3, pb: 2.5, gap: 1 }}>
          {summary && (
            <Button
              startIcon={<Print fontSize="small" />}
              onClick={() =>
                TicketPrinter.printCashRegisterCloseTicket(summary)
              }
              variant="outlined"
            >
              Imprimir
            </Button>
          )}
          <Button onClick={() => setSummaryDialog(false)} variant="contained">
            Cerrar
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
}
