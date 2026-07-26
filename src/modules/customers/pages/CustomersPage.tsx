import {
  Add,
  ArrowDownward,
  ArrowUpward,
  Edit,
  Payments,
  PersonOff,
} from '@mui/icons-material';
import {
  Alert,
  Box,
  Button,
  Chip,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  Divider,
  IconButton,
  LinearProgress,
  Paper,
  Stack,
  Switch,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  TextField,
  Tooltip,
  Typography,
} from '@mui/material';
import { useEffect, useMemo, useState } from 'react';
import { useAuth } from '@modules/auth/context/AuthContext';
import type { CreateCustomerDTO, CreateCustomerPaymentDTO, Customer, CustomerAccountMovement, UpdateCustomerDTO } from '@modules/customers/types';
import { CustomerService } from '@modules/customers/services/CustomerService';
import { formatCurrency } from '@modules/shared/utils/FormatCurrency';

interface CustomerForm {
  name: string;
  phone: string;
  notes: string;
  credit_limit: string;
  active: boolean;
}

const emptyForm: CustomerForm = { name: '', phone: '', notes: '', credit_limit: '', active: true };

function customerToForm(customer: Customer): CustomerForm {
  return {
    name: customer.name,
    phone: customer.phone ?? '',
    notes: customer.notes ?? '',
    credit_limit: String(customer.credit_limit),
    active: customer.active,
  };
}

export function CustomersPage() {
  const { isAdmin, user, cashRegisterSession } = useAuth();
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [selected, setSelected] = useState<Customer | null>(null);
  const [movements, setMovements] = useState<CustomerAccountMovement[]>([]);
  const [formOpen, setFormOpen] = useState(false);
  const [formCustomer, setFormCustomer] = useState<Customer | null>(null);
  const [form, setForm] = useState<CustomerForm>(emptyForm);
  const [paymentOpen, setPaymentOpen] = useState(false);
  const [payment, setPayment] = useState({ cash_mxn: '', cash_usd: '', transfer: '', notes: '' });
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  const exchangeRate = cashRegisterSession?.exchange_rate ?? null;
  const paymentTotal = useMemo(() => {
    const mxn = Number(payment.cash_mxn) || 0;
    const usd = Number(payment.cash_usd) || 0;
    const transfer = Number(payment.transfer) || 0;
    return mxn + usd * (exchangeRate ?? 0) + transfer;
  }, [payment, exchangeRate]);

  async function loadCustomers(selectedId?: number) {
    setLoading(true);
    try {
      const data = await CustomerService.getAll();
      setCustomers(data);
      const id = selectedId ?? selected?.id;
      if (id) {
        const refreshed = data.find((customer) => customer.id === id) ?? null;
        setSelected(refreshed);
        if (refreshed) setMovements(await CustomerService.getMovements(id));
      }
    } catch (err) {
      setError(String(err));
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => { void loadCustomers(); }, []);

  async function openDetail(customer: Customer) {
    setSelected(customer);
    try {
      setMovements(await CustomerService.getMovements(customer.id));
    } catch (err) { setError(String(err)); }
  }

  function openCreate() {
    setFormCustomer(null);
    setForm(emptyForm);
    setFormOpen(true);
  }

  function openEdit(customer: Customer) {
    setFormCustomer(customer);
    setForm(customerToForm(customer));
    setFormOpen(true);
  }

  async function saveCustomer() {
    if (!form.name.trim()) { setError('El nombre es obligatorio'); return; }
    const limit = Number(form.credit_limit);
    if (form.credit_limit && (!Number.isFinite(limit) || limit < 0)) { setError('El límite debe ser mayor o igual a cero'); return; }
    setSaving(true);
    try {
      if (formCustomer) {
        const dto: UpdateCustomerDTO = { id: formCustomer.id, name: form.name.trim(), phone: form.phone || undefined, notes: form.notes || undefined, credit_limit: limit, active: form.active };
        await CustomerService.update(dto);
        await loadCustomers(formCustomer.id);
      } else {
        const dto: CreateCustomerDTO = { name: form.name.trim(), phone: form.phone || undefined, notes: form.notes || undefined, credit_limit: form.credit_limit ? limit : undefined };
        const created = await CustomerService.create(dto);
        await loadCustomers(created.id);
      }
      setFormOpen(false);
      setSuccess('Cliente guardado correctamente');
    } catch (err) { setError(String(err)); }
    finally { setSaving(false); }
  }

  function openPayment() {
    setPayment({ cash_mxn: '', cash_usd: '', transfer: '', notes: '' });
    setPaymentOpen(true);
  }

  async function registerPayment() {
    if (!selected || !user || !cashRegisterSession) return;
    if (paymentTotal <= 0 || paymentTotal > selected.balance + 0.001) {
      setError('Captura un pago válido que no exceda el adeudo');
      return;
    }
    setSaving(true);
    try {
      const dto: CreateCustomerPaymentDTO = {
        customer_id: selected.id,
        cash_register_session_id: cashRegisterSession.id,
        user_id: user.id,
        payment_cash_mxn: Number(payment.cash_mxn) || 0,
        payment_cash_usd: Number(payment.cash_usd) || 0,
        payment_transfer: Number(payment.transfer) || 0,
        notes: payment.notes || undefined,
      };
      await CustomerService.registerPayment(dto);
      await loadCustomers(selected.id);
      setPaymentOpen(false);
      setSuccess('Pago registrado en la cuenta del cliente');
    } catch (err) { setError(String(err)); }
    finally { setSaving(false); }
  }

  const capacity = selected && selected.credit_limit > 0
    ? Math.min(100, (selected.balance / selected.credit_limit) * 100)
    : 0;
  const available = selected ? Math.max(0, selected.credit_limit - selected.balance) : 0;

  return (
    <Box>
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3 }}>
        <Box>
          <Typography variant="h5">Clientes</Typography>
          <Typography variant="body2" color="text.secondary">Consulta cuentas, capacidad de crédito y movimientos.</Typography>
        </Box>
        {isAdmin && <Button variant="contained" startIcon={<Add />} onClick={openCreate}>Nuevo cliente</Button>}
      </Box>
      {error && <Alert severity="error" sx={{ mb: 2 }} onClose={() => setError('')}>{error}</Alert>}
      {success && <Alert severity="success" sx={{ mb: 2 }} onClose={() => setSuccess('')}>{success}</Alert>}
      <TableContainer component={Paper} elevation={0}>
        <Table size="small">
          <TableHead><TableRow><TableCell>Cliente</TableCell><TableCell>Teléfono</TableCell><TableCell align="right">Adeudo</TableCell><TableCell align="right">Límite</TableCell><TableCell align="right">Disponible</TableCell><TableCell>Estado</TableCell><TableCell /></TableRow></TableHead>
          <TableBody>
            {!loading && customers.map((customer) => {
              const availableCredit = Math.max(0, customer.credit_limit - customer.balance);
              return <TableRow hover key={customer.id} sx={{ cursor: 'pointer' }} onClick={() => void openDetail(customer)}>
                <TableCell><Typography fontWeight={600}>{customer.name}</Typography>{customer.notes && <Typography variant="caption" color="text.secondary" noWrap>{customer.notes}</Typography>}</TableCell>
                <TableCell>{customer.phone ?? '—'}</TableCell>
                <TableCell align="right"><Typography fontWeight={700} color={customer.balance > 0 ? 'warning.dark' : 'text.primary'} sx={{ fontVariantNumeric: 'tabular-nums' }}>{formatCurrency(customer.balance)}</Typography></TableCell>
                <TableCell align="right">{formatCurrency(customer.credit_limit)}</TableCell>
                <TableCell align="right">{formatCurrency(availableCredit)}</TableCell>
                <TableCell><Chip size="small" color={customer.active ? 'success' : 'default'} icon={customer.active ? undefined : <PersonOff />} label={customer.active ? 'Activo' : 'Inactivo'} /></TableCell>
                <TableCell align="right">{isAdmin && <Tooltip title="Editar"><IconButton size="small" onClick={(event) => { event.stopPropagation(); openEdit(customer); }}><Edit fontSize="small" /></IconButton></Tooltip>}</TableCell>
              </TableRow>;
            })}
            {!loading && customers.length === 0 && <TableRow><TableCell colSpan={7} align="center" sx={{ py: 6, color: 'text.secondary' }}>Aún no hay clientes registrados.</TableCell></TableRow>}
          </TableBody>
        </Table>
      </TableContainer>

      <Dialog open={Boolean(selected)} onClose={() => setSelected(null)} fullWidth maxWidth="md">
        {selected && <>
          <DialogTitle>{selected.name}</DialogTitle>
          <DialogContent>
            <Box sx={{ px: 2.5, py: 2, mb: 2, borderRadius: 1.5, bgcolor: 'rgba(193,125,17,0.07)', border: '1px solid rgba(193,125,17,0.20)' }}>
              <Stack direction={{ xs: 'column', sm: 'row' }} divider={<Divider flexItem orientation="vertical" />} spacing={2}>
                <Box sx={{ flex: 1 }}><Typography variant="caption" color="text.secondary" sx={{ textTransform: 'uppercase', letterSpacing: '.06em' }}>Adeudo actual</Typography><Typography variant="h4" color={selected.balance > 0 ? 'warning.dark' : 'text.primary'}>{formatCurrency(selected.balance)}</Typography></Box>
                <Box sx={{ flex: 1 }}><Typography variant="caption" color="text.secondary" sx={{ textTransform: 'uppercase', letterSpacing: '.06em' }}>Crédito disponible</Typography><Typography variant="h5" color="success.dark">{formatCurrency(available)}</Typography><LinearProgress variant="determinate" value={capacity} color={capacity >= 100 ? 'error' : capacity >= 80 ? 'warning' : 'success'} sx={{ mt: 1, height: 5, borderRadius: 2 }} /><Typography variant="caption" color="text.secondary">Límite: {formatCurrency(selected.credit_limit)}</Typography></Box>
              </Stack>
            </Box>
            {!cashRegisterSession && <Alert severity="info" sx={{ mb: 2 }}>Abre una caja para registrar pagos a cuenta.</Alert>}
            <Typography variant="subtitle2" sx={{ mb: 1 }}>Libreta de movimientos</Typography>
            <TableContainer component={Paper} variant="outlined"><Table size="small"><TableHead><TableRow><TableCell>Fecha</TableCell><TableCell>Concepto</TableCell><TableCell>Registró</TableCell><TableCell align="right">Movimiento</TableCell></TableRow></TableHead><TableBody>
              {movements.map((movement) => <TableRow key={movement.id}><TableCell>{movement.created_at}</TableCell><TableCell><Stack direction="row" spacing={1} alignItems="center">{movement.amount > 0 ? <ArrowUpward color="warning" fontSize="small" /> : <ArrowDownward color="success" fontSize="small" />}<Box><Typography variant="body2" fontWeight={600}>{movement.movement_type === 'sale_charge' ? `Venta fiada #${movement.sale_id}` : 'Pago a cuenta'}</Typography>{movement.notes && <Typography variant="caption" color="text.secondary">{movement.notes}</Typography>}</Box></Stack></TableCell><TableCell>{movement.user_name ?? '—'}</TableCell><TableCell align="right"><Typography color={movement.amount > 0 ? 'warning.dark' : 'success.dark'} fontWeight={700} sx={{ fontVariantNumeric: 'tabular-nums' }}>{movement.amount > 0 ? '+' : '−'}{formatCurrency(Math.abs(movement.amount))}</Typography></TableCell></TableRow>)}
              {movements.length === 0 && <TableRow><TableCell colSpan={4} align="center" sx={{ py: 4, color: 'text.secondary' }}>Sin movimientos todavía.</TableCell></TableRow>}
            </TableBody></Table></TableContainer>
          </DialogContent>
          <DialogActions sx={{ px: 3, pb: 2.5 }}>
            {isAdmin && <Button startIcon={<Edit />} onClick={() => openEdit(selected)}>Editar</Button>}
            <Box sx={{ flex: 1 }} />
            <Button onClick={() => setSelected(null)} color="inherit">Cerrar</Button>
            <Button variant="contained" startIcon={<Payments />} onClick={openPayment} disabled={!cashRegisterSession || selected.balance <= 0}>Registrar pago</Button>
          </DialogActions>
        </>}
      </Dialog>

      <Dialog open={formOpen} onClose={() => setFormOpen(false)} fullWidth maxWidth="sm">
        <DialogTitle>{formCustomer ? 'Editar cliente' : 'Nuevo cliente'}</DialogTitle>
        <DialogContent><Stack spacing={2} sx={{ pt: 1 }}>
          <TextField label="Nombre" fullWidth required value={form.name} onChange={(event) => setForm({ ...form, name: event.target.value })} />
          <TextField label="Teléfono" fullWidth value={form.phone} onChange={(event) => setForm({ ...form, phone: event.target.value })} />
          <TextField label="Límite de crédito" type="number" fullWidth value={form.credit_limit} onChange={(event) => setForm({ ...form, credit_limit: event.target.value })} slotProps={{ htmlInput: { min: 0, step: '0.01' } }} helperText={formCustomer ? 'Puede ser 0 para no permitir más crédito.' : 'Vacío usa el límite predeterminado de Configuración.'} />
          <TextField label="Notas" fullWidth multiline minRows={2} value={form.notes} onChange={(event) => setForm({ ...form, notes: event.target.value })} />
          {formCustomer && <Stack direction="row" spacing={1} alignItems="center"><Switch checked={form.active} onChange={(event) => setForm({ ...form, active: event.target.checked })} /><Typography>Cliente activo</Typography></Stack>}
        </Stack></DialogContent>
        <DialogActions sx={{ px: 3, pb: 2.5 }}><Button onClick={() => setFormOpen(false)} color="inherit">Cancelar</Button><Button variant="contained" disabled={saving} onClick={() => void saveCustomer()}>Guardar</Button></DialogActions>
      </Dialog>

      <Dialog open={paymentOpen} onClose={() => setPaymentOpen(false)} fullWidth maxWidth="sm">
        <DialogTitle>Registrar pago a cuenta</DialogTitle>
        <DialogContent><Stack spacing={2} sx={{ pt: 1 }}>
          <Alert severity="info">Adeudo de {selected?.name}: <strong>{formatCurrency(selected?.balance ?? 0)}</strong></Alert>
          <TextField label="Efectivo MXN" type="number" fullWidth value={payment.cash_mxn} onChange={(event) => setPayment({ ...payment, cash_mxn: event.target.value })} slotProps={{ htmlInput: { min: 0, step: '0.01' } }} />
          {exchangeRate && <TextField label={`Efectivo USD (T/C ${exchangeRate.toFixed(2)})`} type="number" fullWidth value={payment.cash_usd} onChange={(event) => setPayment({ ...payment, cash_usd: event.target.value })} slotProps={{ htmlInput: { min: 0, step: '0.01' } }} />}
          <TextField label="Transferencia MXN" type="number" fullWidth value={payment.transfer} onChange={(event) => setPayment({ ...payment, transfer: event.target.value })} slotProps={{ htmlInput: { min: 0, step: '0.01' } }} />
          <TextField label="Nota (opcional)" fullWidth value={payment.notes} onChange={(event) => setPayment({ ...payment, notes: event.target.value })} />
          <Box sx={{ textAlign: 'right' }}><Typography variant="caption" color="text.secondary">Total recibido</Typography><Typography variant="h5" color="primary">{formatCurrency(paymentTotal)}</Typography></Box>
        </Stack></DialogContent>
        <DialogActions sx={{ px: 3, pb: 2.5 }}><Button onClick={() => setPaymentOpen(false)} color="inherit">Cancelar</Button><Button variant="contained" disabled={saving || paymentTotal <= 0 || paymentTotal > (selected?.balance ?? 0)} onClick={() => void registerPayment()}>Confirmar pago</Button></DialogActions>
      </Dialog>
    </Box>
  );
}
