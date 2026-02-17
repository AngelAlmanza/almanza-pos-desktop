import { Cancel, ExpandLess, ExpandMore, Print } from '@mui/icons-material';
import type { SelectChangeEvent } from '@mui/material';
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
  TableRow,
  TextField,
  Typography,
} from '@mui/material';
import { DatePicker } from '@mui/x-date-pickers';
import moment, { Moment } from 'moment';
import { Fragment, useEffect, useMemo, useState } from 'react';
import { ConfirmModal } from '../components/ConfirmModal';
import { useAuth } from '../context/AuthContext';
import type { Sale, User } from '../models';
import { SaleService } from '../services/SaleService';
import { UserService } from '../services/UserService';
import { cleanError } from '../utils/CleanError';
import { TicketPrinter } from '../utils/TicketPrinter';
import { formatCurrency } from '../utils/FormatCurrency';

moment.locale('es');

const getMonthStart = (): Moment => {
  return moment().startOf('month');
};

const getMonthEnd = (): Moment => {
  return moment().endOf('month');
};

export function SalesPage() {
  const { isAdmin, cashRegisterSession } = useAuth();
  const [sales, setSales] = useState<Sale[]>([]);
  const [users, setUsers] = useState<User[]>([]);
  const [expandedId, setExpandedId] = useState<number | null>(null);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(true);

  const [startDate, setStartDate] = useState(getMonthStart);
  const [endDate, setEndDate] = useState(getMonthEnd);
  const [selectedUserIds, setSelectedUserIds] = useState<number[]>([]);
  const [searchSaleId, setSearchSaleId] = useState('');

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

  const loadSales = async () => {
    try {
      setLoading(true);
      let data: Sale[];
      if (isAdmin) {
        data = await SaleService.getByDateRange({
          start_date: startDate.format('YYYY-MM-DD') + ' 00:00:00',
          end_date: endDate.format('YYYY-MM-DD') + ' 23:59:59',
        });
      } else if (cashRegisterSession) {
        data = await SaleService.getBySession(cashRegisterSession.id);
      } else {
        data = [];
      }
      setSales(data);
    } catch (err) {
      setError(String(err));
    } finally {
      setLoading(false);
    }
  };

  const handleUserFilterChange = (event: SelectChangeEvent<number[]>) => {
    const value = event.target.value;
    setSelectedUserIds(typeof value === 'string' ? value.split(',').map(Number) : value);
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
    const parsedId = searchSaleId.trim() ? parseInt(searchSaleId.trim(), 10) : NaN;
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

  useEffect(() => {
    loadSales();
  }, [startDate, endDate]); // this ensures that the sales are loaded when the date range changes

  if (!isAdmin && !cashRegisterSession) {
    return (
      <Box sx={{ textAlign: 'center', mt: 8 }}>
        <Typography variant="h5" color="text.secondary">
          No tienes acceso a las ventas
        </Typography>
        <Typography color="text.secondary" sx={{ mt: 1 }}>
          Debes tener una caja abierta o ser administrador.
        </Typography>
      </Box>
    );
  }

  return (
    <Box>
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3 }}>
        <Typography variant="h5">Ventas</Typography>
        <Button variant="outlined" onClick={loadSales}>Actualizar</Button>
      </Box>

      {(isAdmin || cashRegisterSession) && (
        <Box sx={{ display: 'flex', justifyContent: 'flex-end', gap: 2, mb: 2, flexWrap: 'wrap', alignItems: 'center' }}>
          <TextField
            label="N° venta"
            placeholder="Ej: 42"
            value={searchSaleId}
            onChange={(e) => setSearchSaleId(e.target.value)}
            size="small"
            type="number"
            sx={{ width: 160 }}
            slotProps={{
              htmlInput: {
                min: 1,
                step: 1
              },
            }}
          />
          {isAdmin && (
            <>
          <DatePicker
            label="Fecha inicio"
            value={startDate}
            onChange={(value) => setStartDate(value ?? getMonthStart())}
            maxDate={endDate}
            slotProps={{
              textField: {
                size: 'small',
              },
            }}
          />
          <DatePicker
            label="Fecha fin"
            value={endDate}
            onChange={(value) => setEndDate(value ?? getMonthEnd())}
            minDate={startDate}
            slotProps={{
              textField: {
                size: 'small',
              },
            }}
          />
          <FormControl size="small" sx={{ minWidth: 220 }}>
            <InputLabel>Cajeros</InputLabel>
            <Select
              multiple
              value={selectedUserIds}
              onChange={handleUserFilterChange}
              input={<OutlinedInput label="Cajeros" />}
              renderValue={(selected) =>
                selected.length === users.length
                  ? 'Todos'
                  : users
                    .filter((u) => selected.includes(u.id))
                    .map((u) => u.full_name)
                    .join(', ')
              }
            >
              {users.map((user) => (
                <MenuItem key={user.id} value={user.id}>
                  <Checkbox checked={selectedUserIds.includes(user.id)} />
                  <ListItemText primary={user.full_name} />
                </MenuItem>
              ))}
            </Select>
          </FormControl>
            </>
          )}
        </Box>
      )}

      {error && <Alert severity="error" sx={{ mb: 2 }} onClose={() => setError('')}>{error}</Alert>}

      <TableContainer component={Paper}>
        <Table>
          <TableHead>
            <TableRow>
              <TableCell width={40}></TableCell>
              <TableCell>N° venta</TableCell>
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
                <TableCell colSpan={8} align="center" sx={{ py: 4 }}>Cargando...</TableCell>
              </TableRow>
            ) : filteredSales.length === 0 ? (
              <TableRow>
                <TableCell colSpan={8} align="center" sx={{ py: 4, color: 'text.secondary' }}>
                  No hay ventas registradas
                </TableCell>
              </TableRow>
            ) : (
              filteredSales.map((sale) => (
                <Fragment key={sale.id}>
                  <TableRow hover>
                    <TableCell>
                      <IconButton size="small" onClick={() => setExpandedId(expandedId === sale.id ? null : sale.id)}>
                        {expandedId === sale.id ? <ExpandLess /> : <ExpandMore />}
                      </IconButton>
                    </TableCell>
                    <TableCell>#{sale.id}</TableCell>
                    <TableCell>{moment(sale.created_at).format('DD/MM/YYYY hh:mm A')}</TableCell>
                    <TableCell>{sale.user_name}</TableCell>
                    <TableCell align="right" sx={{ fontWeight: 600 }}>{formatCurrency(sale.total)}</TableCell>
                    <TableCell>{sale.payment_method === 'cash' ? 'Efectivo' : sale.payment_method}</TableCell>
                    <TableCell>
                      <Chip
                        label={sale.status === 'completed' ? 'Completada' : 'Cancelada'}
                        color={sale.status === 'completed' ? 'success' : 'error'}
                        size="small"
                      />
                    </TableCell>
                    <TableCell align="center">
                      <IconButton size="small" onClick={() => handlePrint(sale.id)} title="Imprimir ticket">
                        <Print fontSize="small" />
                      </IconButton>
                      {sale.status === 'completed' && isAdmin && (
                        <IconButton size="small" color="error" onClick={() => handleCancel(sale.id)} title="Cancelar venta">
                          <Cancel fontSize="small" />
                        </IconButton>
                      )}
                    </TableCell>
                  </TableRow>
                  <TableRow>
                    <TableCell colSpan={8} sx={{ py: 0, borderBottom: expandedId === sale.id ? undefined : 'none' }}>
                      <Collapse in={expandedId === sale.id}>
                        <Box sx={{ py: 2, px: 4 }}>
                          <Typography variant="subtitle2" gutterBottom>Detalle de productos:</Typography>
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
                                  <TableCell align="right">{item.quantity}</TableCell>
                                  <TableCell align="right">{formatCurrency(item.unit_price)}</TableCell>
                                  <TableCell align="right">{formatCurrency(item.subtotal)}</TableCell>
                                </TableRow>
                              ))}
                            </TableBody>
                          </Table>
                          <Box sx={{ mt: 1, display: 'flex', gap: 3 }}>
                            <Typography variant="body2">Pagado: <strong>{formatCurrency(sale.payment_amount)}</strong></Typography>
                            <Typography variant="body2">Cambio: <strong>{formatCurrency(sale.change_amount)}</strong></Typography>
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

      <ConfirmModal
        open={confirmOpen}
        onClose={handleCloseConfirm}
        onConfirm={handleConfirmCancel}
        title="Confirmar cancelación"
        message="¿Estás seguro de cancelar esta venta?"
      />
    </Box>
  );
}
