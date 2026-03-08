import {
  Cancel,
  ExpandLess,
  ExpandMore,
  Print,
  Refresh,
} from "@mui/icons-material";
import type { SelectChangeEvent } from "@mui/material";
import {
  Alert,
  Box,
  Button,
  Checkbox,
  Chip,
  Collapse,
  FormControl,
  IconButton,
  InputLabel,
  ListItemText,
  MenuItem,
  OutlinedInput,
  Paper,
  Select,
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
import { Fragment, useEffect, useMemo, useState } from "react";
import { ConfirmModal } from "../components/ConfirmModal";
import { useAuth } from "../context/AuthContext";
import type { Sale, User } from "../models";
import { SaleService } from "../services/SaleService";
import { UserService } from "../services/UserService";
import { cleanError } from "../utils/CleanError";
import { formatCurrency } from "../utils/FormatCurrency";
import { paymentMethodLabel } from "../utils/PaymentLabels";
import { TicketPrinter } from "../utils/TicketPrinter";

moment.locale("es");

const getMonthStart = (): Moment => moment().startOf("month");
const getMonthEnd = (): Moment => moment().endOf("month");

export function SalesPage() {
  const { isAdmin, cashRegisterSession } = useAuth();
  const [sales, setSales] = useState<Sale[]>([]);
  const [users, setUsers] = useState<User[]>([]);
  const [expandedId, setExpandedId] = useState<number | null>(null);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(true);

  const [startDate, setStartDate] = useState(() => getMonthStart());
  const [endDate, setEndDate] = useState(() => getMonthEnd());
  const [selectedUserIds, setSelectedUserIds] = useState<number[]>([]);
  const [searchSaleId, setSearchSaleId] = useState("");

  const [page, setPage] = useState(0);
  const [rowsPerPage, setRowsPerPage] = useState(50);
  const [totalRows, setTotalRows] = useState(0);

  const [confirmOpen, setConfirmOpen] = useState(false);
  const [confirmId, setConfirmId] = useState<number | null>(null);

  const loadUsers = async () => {
    try {
      const data = await UserService.getAll();
      setUsers(data);
      setSelectedUserIds(data.map((u) => u.id));
    } catch (err) {
      setError(String(err));
    }
  };

  const loadSales = async (
    currentPage = page,
    currentRowsPerPage = rowsPerPage,
  ) => {
    try {
      setLoading(true);
      const apiPage = currentPage + 1;
      if (isAdmin) {
        const result = await SaleService.getByDateRange(
          {
            start_date: startDate.format("YYYY-MM-DD") + " 00:00:00",
            end_date: endDate.format("YYYY-MM-DD") + " 23:59:59",
          },
          apiPage,
          currentRowsPerPage,
        );
        setSales(result.data);
        setTotalRows(result.total);
      } else if (cashRegisterSession) {
        const result = await SaleService.getBySession(
          cashRegisterSession.id,
          apiPage,
          currentRowsPerPage,
        );
        setSales(result.data);
        setTotalRows(result.total);
      } else {
        setSales([]);
        setTotalRows(0);
      }
    } catch (err) {
      setError(String(err));
    } finally {
      setLoading(false);
    }
  };

  const handleUserFilterChange = (event: SelectChangeEvent<number[]>) => {
    const value = event.target.value;
    setSelectedUserIds(
      typeof value === "string" ? value.split(",").map(Number) : value,
    );
  };

  const handleCancel = (saleId: number) => {
    setConfirmOpen(true);
    setConfirmId(saleId);
  };

  const handleConfirmCancel = async () => {
    if (!confirmId) return;
    try {
      await SaleService.cancel(confirmId);
      loadSales();
    } catch (err) {
      setError(String(err));
    } finally {
      setConfirmOpen(false);
      setConfirmId(null);
      cleanError(setError);
    }
  };

  const handleCloseConfirm = () => {
    setConfirmOpen(false);
    setConfirmId(null);
  };

  const handlePrint = async (saleId: number) => {
    try {
      const sale = await SaleService.getById(saleId);
      TicketPrinter.printSaleTicket(sale);
    } catch (err) {
      setError(String(err));
    } finally {
      cleanError(setError);
    }
  };

  const filteredSales = useMemo(() => {
    let result = sales;
    if (isAdmin && users.length > 0) {
      result = result.filter((sale) => selectedUserIds.includes(sale.user_id));
    }
    const parsedId = searchSaleId.trim()
      ? parseInt(searchSaleId.trim(), 10)
      : NaN;
    if (!Number.isNaN(parsedId)) {
      result = result.filter((sale) => sale.id === parsedId);
    }
    return result;
  }, [sales, selectedUserIds, isAdmin, users.length, searchSaleId]);

  useEffect(() => {
    if (isAdmin) {
      loadUsers();
    }
  }, [isAdmin]);

  const handlePageChange = (_: unknown, newPage: number) => {
    setPage(newPage);
    loadSales(newPage, rowsPerPage);
  };

  const handleRowsPerPageChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const newRowsPerPage = parseInt(e.target.value, 10);
    setRowsPerPage(newRowsPerPage);
    setPage(0);
    loadSales(0, newRowsPerPage);
  };

  useEffect(() => {
    setPage(0);
    loadSales(0, rowsPerPage);
  }, [startDate, endDate]);

  if (!isAdmin && !cashRegisterSession) {
    return (
      <Box sx={{ textAlign: "center", mt: 8 }}>
        <Typography variant="h6" color="text.secondary" fontWeight={600}>
          Sin acceso
        </Typography>
        <Typography variant="body2" color="text.secondary" sx={{ mt: 0.5 }}>
          Debes tener una caja abierta o ser administrador.
        </Typography>
      </Box>
    );
  }

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
        <Typography variant="h5">Ventas</Typography>
        <Button
          variant="outlined"
          size="small"
          startIcon={<Refresh fontSize="small" />}
          onClick={() => loadSales()}
        >
          Actualizar
        </Button>
      </Box>

      {(isAdmin || cashRegisterSession) && (
        <Box
          sx={{
            display: "flex",
            justifyContent: "flex-end",
            gap: 1.5,
            mb: 2,
            flexWrap: "wrap",
            alignItems: "center",
          }}
        >
          <TextField
            label="N° venta"
            placeholder="Ej: 42"
            value={searchSaleId}
            onChange={(e) => setSearchSaleId(e.target.value)}
            size="small"
            type="number"
            sx={{ width: 140 }}
            slotProps={{ htmlInput: { min: 1, step: 1 } }}
          />
          {isAdmin && (
            <>
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
              <FormControl size="small" sx={{ minWidth: 200 }}>
                <InputLabel>Cajeros</InputLabel>
                <Select
                  multiple
                  value={selectedUserIds}
                  onChange={handleUserFilterChange}
                  input={<OutlinedInput label="Cajeros" />}
                  renderValue={(selected) =>
                    selected.length === users.length
                      ? "Todos"
                      : users
                          .filter((u) => selected.includes(u.id))
                          .map((u) => u.full_name)
                          .join(", ")
                  }
                >
                  {users.map((user) => (
                    <MenuItem key={user.id} value={user.id}>
                      <Checkbox
                        checked={selectedUserIds.includes(user.id)}
                        size="small"
                      />
                      <ListItemText primary={user.full_name} />
                    </MenuItem>
                  ))}
                </Select>
              </FormControl>
            </>
          )}
        </Box>
      )}

      {error && (
        <Alert severity="error" sx={{ mb: 2 }} onClose={() => setError("")}>
          {error}
        </Alert>
      )}

      <TableContainer
        component={Paper}
        elevation={0}
        sx={{ border: "1px solid rgba(26,32,53,0.10)" }}
      >
        <Table size="small">
          <TableHead>
            <TableRow>
              <TableCell width={40} />
              <TableCell>N° Venta</TableCell>
              <TableCell>Fecha</TableCell>
              <TableCell>Cajero</TableCell>
              <TableCell align="right">Total</TableCell>
              <TableCell>Método</TableCell>
              <TableCell>Estado</TableCell>
              <TableCell align="center">Acciones</TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {loading ? (
              <TableRow>
                <TableCell
                  colSpan={8}
                  align="center"
                  sx={{ py: 4, color: "text.secondary" }}
                >
                  Cargando...
                </TableCell>
              </TableRow>
            ) : filteredSales.length === 0 ? (
              <TableRow>
                <TableCell
                  colSpan={8}
                  align="center"
                  sx={{ py: 4, color: "text.secondary" }}
                >
                  No hay ventas registradas
                </TableCell>
              </TableRow>
            ) : (
              filteredSales.map((sale) => (
                <Fragment key={sale.id}>
                  <TableRow hover>
                    <TableCell sx={{ p: 0, pl: 1 }}>
                      <IconButton
                        size="small"
                        onClick={() =>
                          setExpandedId(expandedId === sale.id ? null : sale.id)
                        }
                      >
                        {expandedId === sale.id ? (
                          <ExpandLess fontSize="small" />
                        ) : (
                          <ExpandMore fontSize="small" />
                        )}
                      </IconButton>
                    </TableCell>
                    <TableCell
                      sx={{
                        fontVariantNumeric: "tabular-nums",
                        color: "text.secondary",
                      }}
                    >
                      #{sale.id}
                    </TableCell>
                    <TableCell
                      sx={{ color: "text.secondary", fontSize: "0.8125rem" }}
                    >
                      {moment(sale.created_at).format("DD/MM/YYYY hh:mm A")}
                    </TableCell>
                    <TableCell sx={{ fontWeight: 500 }}>
                      {sale.user_name}
                    </TableCell>
                    <TableCell
                      align="right"
                      sx={{
                        fontWeight: 600,
                        fontVariantNumeric: "tabular-nums",
                      }}
                    >
                      {formatCurrency(sale.total)}
                    </TableCell>
                    <TableCell
                      sx={{ color: "text.secondary", fontSize: "0.8125rem" }}
                    >
                      {paymentMethodLabel(sale.payment_method)}
                    </TableCell>
                    <TableCell>
                      <Chip
                        label={
                          sale.status === "completed"
                            ? "Completada"
                            : "Cancelada"
                        }
                        size="small"
                        sx={{
                          backgroundColor:
                            sale.status === "completed"
                              ? "rgba(45,106,79,0.12)"
                              : "rgba(185,28,28,0.10)",
                          color:
                            sale.status === "completed"
                              ? "success.dark"
                              : "error.dark",
                          fontWeight: 600,
                        }}
                      />
                    </TableCell>
                    <TableCell align="center" sx={{ p: 0.5 }}>
                      <IconButton
                        size="small"
                        onClick={() => handlePrint(sale.id)}
                        title="Imprimir ticket"
                        sx={{ color: "text.secondary" }}
                      >
                        <Print sx={{ fontSize: 16 }} />
                      </IconButton>
                      {sale.status === "completed" && isAdmin && (
                        <IconButton
                          size="small"
                          color="error"
                          onClick={() => handleCancel(sale.id)}
                          title="Cancelar venta"
                        >
                          <Cancel sx={{ fontSize: 16 }} />
                        </IconButton>
                      )}
                    </TableCell>
                  </TableRow>
                  <TableRow>
                    <TableCell
                      colSpan={8}
                      sx={{
                        py: 0,
                        borderBottom:
                          expandedId === sale.id ? undefined : "none",
                        backgroundColor: "#faf9f6",
                      }}
                    >
                      <Collapse in={expandedId === sale.id}>
                        <Box sx={{ py: 2, px: 5 }}>
                          <Typography
                            variant="caption"
                            sx={{
                              textTransform: "uppercase",
                              letterSpacing: "0.06em",
                              fontWeight: 600,
                              color: "text.secondary",
                              display: "block",
                              mb: 1,
                            }}
                          >
                            Detalle de productos
                          </Typography>
                          <Table size="small">
                            <TableHead>
                              <TableRow>
                                <TableCell>Producto</TableCell>
                                <TableCell align="right">Cantidad</TableCell>
                                <TableCell align="right">P. Unitario</TableCell>
                                <TableCell align="right">Subtotal</TableCell>
                              </TableRow>
                            </TableHead>
                            <TableBody>
                              {sale.items.map((item) => (
                                <TableRow key={item.id}>
                                  <TableCell>{item.product_name}</TableCell>
                                  <TableCell
                                    align="right"
                                    sx={{ fontVariantNumeric: "tabular-nums" }}
                                  >
                                    {item.quantity}
                                  </TableCell>
                                  <TableCell
                                    align="right"
                                    sx={{ fontVariantNumeric: "tabular-nums" }}
                                  >
                                    {formatCurrency(item.unit_price)}
                                  </TableCell>
                                  <TableCell
                                    align="right"
                                    sx={{
                                      fontWeight: 600,
                                      fontVariantNumeric: "tabular-nums",
                                    }}
                                  >
                                    {formatCurrency(item.subtotal)}
                                  </TableCell>
                                </TableRow>
                              ))}
                            </TableBody>
                          </Table>
                          <Box sx={{ mt: 1.5, display: "flex", gap: 3 }}>
                            <Typography variant="body2" color="text.secondary">
                              Pagado:{" "}
                              <strong>
                                {formatCurrency(sale.payment_amount)}
                              </strong>
                            </Typography>
                            <Typography variant="body2" color="text.secondary">
                              Cambio:{" "}
                              <strong>
                                {formatCurrency(sale.change_amount)}
                              </strong>
                            </Typography>
                          </Box>
                        </Box>
                      </Collapse>
                    </TableCell>
                  </TableRow>
                </Fragment>
              ))
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

      <ConfirmModal
        open={confirmOpen}
        onClose={handleCloseConfirm}
        onConfirm={handleConfirmCancel}
        title="Cancelar venta"
        message="¿Estás seguro de cancelar esta venta? Esta acción no se puede deshacer."
      />
    </Box>
  );
}
