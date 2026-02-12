import { useState, useEffect } from 'react';
import {
  Box,
  Button,
  Typography,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Paper,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  TextField,
  Alert,
  Chip,
  Card,
  CardContent,
  Grid,
} from '@mui/material';
import { AccountBalance, OpenInNew, Close, Print } from '@mui/icons-material';
import { useAuth } from '../context/AuthContext';
import { CashRegisterService } from '../services/CashRegisterService';
import { UserService } from '../services/UserService';
import type { CashRegisterSession, CashRegisterSummary, User } from '../models';
import { TicketPrinter } from '../utils/TicketPrinter';
import { MenuItem } from '@mui/material';

export function CashRegisterPage() {
  const { user, isAdmin, cashRegisterSession, setCashRegisterSession } = useAuth();
  const [sessions, setSessions] = useState<CashRegisterSession[]>([]);
  const [users, setUsers] = useState<User[]>([]);
  const [openDialog, setOpenDialog] = useState(false);
  const [closeDialog, setCloseDialog] = useState(false);
  const [summaryDialog, setSummaryDialog] = useState(false);
  const [summary, setSummary] = useState<CashRegisterSummary | null>(null);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  const [openForm, setOpenForm] = useState({
    user_id: user?.id?.toString() || '',
    opening_amount: '',
    exchange_rate: '',
  });

  const [closeForm, setCloseForm] = useState({
    closing_amount: '',
  });

  const loadData = async () => {
    try {
      const sessionsData = await CashRegisterService.getAll();
      setSessions(sessionsData);

      if (isAdmin) {
        const usersData = await UserService.getAll();
        setUsers(usersData.filter(u => u.active));
      }

      // Check for open session for current user
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

  useEffect(() => {
    loadData();
  }, []);

  const handleOpenCashRegister = async () => {
    try {
      const session = await CashRegisterService.open({
        user_id: parseInt(openForm.user_id),
        opening_amount: parseFloat(openForm.opening_amount) || 0,
        exchange_rate: openForm.exchange_rate ? parseFloat(openForm.exchange_rate) : undefined,
      });

      if (parseInt(openForm.user_id) === user?.id) {
        setCashRegisterSession(session);
      }

      setOpenDialog(false);
      setOpenForm({ user_id: user?.id?.toString() || '', opening_amount: '', exchange_rate: '' });
      setSuccess('Caja abierta exitosamente');
      setTimeout(() => setSuccess(''), 3000);
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
        closing_amount: parseFloat(closeForm.closing_amount) || 0,
      });

      setSummary(result);
      setCashRegisterSession(null);
      setCloseDialog(false);
      setSummaryDialog(true);
      setCloseForm({ closing_amount: '' });

      // Print closing ticket
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

  return (
    <Box>
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3 }}>
        <Typography variant="h5">Cortes de Caja</Typography>
        <Box sx={{ display: 'flex', gap: 1 }}>
          {cashRegisterSession && (
            <Button
              variant="outlined"
              color="error"
              startIcon={<Close />}
              onClick={() => setCloseDialog(true)}
            >
              Cerrar Caja
            </Button>
          )}
          <Button
            variant="contained"
            startIcon={<OpenInNew />}
            onClick={() => setOpenDialog(true)}
            disabled={!!cashRegisterSession}
          >
            Abrir Caja
          </Button>
        </Box>
      </Box>

      {error && <Alert severity="error" sx={{ mb: 2 }} onClose={() => setError('')}>{error}</Alert>}
      {success && <Alert severity="success" sx={{ mb: 2 }} onClose={() => setSuccess('')}>{success}</Alert>}

      {cashRegisterSession && (
        <Card sx={{ mb: 3, borderLeft: 4, borderColor: 'success.main' }}>
          <CardContent>
            <Grid container spacing={2} alignItems="center">
              <Grid size={{ xs: 12, sm: 3 }}>
                <Typography variant="subtitle2" color="text.secondary">Caja Activa</Typography>
                <Typography variant="h6" color="success.main">#{cashRegisterSession.id}</Typography>
              </Grid>
              <Grid size={{ xs: 12, sm: 3 }}>
                <Typography variant="subtitle2" color="text.secondary">Fondo Inicial</Typography>
                <Typography variant="h6">${cashRegisterSession.opening_amount.toFixed(2)}</Typography>
              </Grid>
              <Grid size={{ xs: 12, sm: 3 }}>
                <Typography variant="subtitle2" color="text.secondary">Abierta</Typography>
                <Typography>{new Date(cashRegisterSession.opened_at).toLocaleString()}</Typography>
              </Grid>
              {cashRegisterSession.exchange_rate && (
                <Grid size={{ xs: 12, sm: 3 }}>
                  <Typography variant="subtitle2" color="text.secondary">T/C USD</Typography>
                  <Typography variant="h6">${cashRegisterSession.exchange_rate.toFixed(2)}</Typography>
                </Grid>
              )}
            </Grid>
          </CardContent>
        </Card>
      )}

      <TableContainer component={Paper}>
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
                <TableCell>#{session.id}</TableCell>
                <TableCell>{session.user_name}</TableCell>
                <TableCell>{new Date(session.opened_at).toLocaleString()}</TableCell>
                <TableCell>{session.closed_at ? new Date(session.closed_at).toLocaleString() : '-'}</TableCell>
                <TableCell align="right">${session.opening_amount.toFixed(2)}</TableCell>
                <TableCell align="right">{session.closing_amount != null ? `$${session.closing_amount.toFixed(2)}` : '-'}</TableCell>
                <TableCell>{session.exchange_rate ? `$${session.exchange_rate.toFixed(2)}` : '-'}</TableCell>
                <TableCell>
                  <Chip
                    label={session.status === 'open' ? 'Abierta' : 'Cerrada'}
                    color={session.status === 'open' ? 'success' : 'default'}
                    size="small"
                  />
                </TableCell>
                <TableCell align="center">
                  <Button size="small" onClick={() => handleViewSummary(session.id)}>
                    Ver Resumen
                  </Button>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </TableContainer>

      {/* Open Cash Register Dialog */}
      <Dialog open={openDialog} onClose={() => setOpenDialog(false)} maxWidth="sm" fullWidth>
        <DialogTitle>
          <AccountBalance sx={{ mr: 1, verticalAlign: 'middle' }} />
          Abrir Caja
        </DialogTitle>
        <DialogContent>
          <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2, mt: 1 }}>
            {isAdmin ? (
              <TextField
                select
                label="Asignar a usuario"
                value={openForm.user_id}
                onChange={(e) => setOpenForm({ ...openForm, user_id: e.target.value })}
                required
                fullWidth
              >
                {users.map((u) => (
                  <MenuItem key={u.id} value={String(u.id)}>{u.full_name} ({u.role})</MenuItem>
                ))}
              </TextField>
            ) : (
              <TextField label="Usuario" value={user?.full_name} disabled fullWidth />
            )}
            <TextField
              label="Fondo inicial"
              type="number"
              value={openForm.opening_amount}
              onChange={(e) => setOpenForm({ ...openForm, opening_amount: e.target.value })}
              fullWidth
              inputProps={{ step: '0.01', min: '0' }}
            />
            <TextField
              label="Tasa de cambio USD (opcional)"
              type="number"
              value={openForm.exchange_rate}
              onChange={(e) => setOpenForm({ ...openForm, exchange_rate: e.target.value })}
              fullWidth
              inputProps={{ step: '0.01', min: '0' }}
              helperText="Dejar vacío si no se requiere"
            />
          </Box>
        </DialogContent>
        <DialogActions sx={{ px: 3, pb: 2 }}>
          <Button onClick={() => setOpenDialog(false)}>Cancelar</Button>
          <Button variant="contained" onClick={handleOpenCashRegister} disabled={!openForm.user_id}>
            Abrir Caja
          </Button>
        </DialogActions>
      </Dialog>

      {/* Close Cash Register Dialog */}
      <Dialog open={closeDialog} onClose={() => setCloseDialog(false)} maxWidth="sm" fullWidth>
        <DialogTitle>Cerrar Caja #{cashRegisterSession?.id}</DialogTitle>
        <DialogContent>
          <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2, mt: 1 }}>
            <Alert severity="info">
              Cuenta el efectivo en caja e ingresa el monto total.
            </Alert>
            <TextField
              label="Monto en caja"
              type="number"
              value={closeForm.closing_amount}
              onChange={(e) => setCloseForm({ closing_amount: e.target.value })}
              fullWidth
              autoFocus
              inputProps={{ step: '0.01', min: '0' }}
            />
          </Box>
        </DialogContent>
        <DialogActions sx={{ px: 3, pb: 2 }}>
          <Button onClick={() => setCloseDialog(false)}>Cancelar</Button>
          <Button variant="contained" color="error" onClick={handleCloseCashRegister}>
            Cerrar Caja
          </Button>
        </DialogActions>
      </Dialog>

      {/* Summary Dialog */}
      <Dialog open={summaryDialog} onClose={() => setSummaryDialog(false)} maxWidth="sm" fullWidth>
        <DialogTitle>Resumen de Caja #{summary?.session.id}</DialogTitle>
        <DialogContent>
          {summary && (
            <Box sx={{ mt: 1 }}>
              <Grid container spacing={2}>
                <Grid size={{ xs: 6 }}>
                  <Card variant="outlined">
                    <CardContent>
                      <Typography variant="caption" color="text.secondary">Fondo Inicial</Typography>
                      <Typography variant="h6">${summary.session.opening_amount.toFixed(2)}</Typography>
                    </CardContent>
                  </Card>
                </Grid>
                <Grid size={{ xs: 6 }}>
                  <Card variant="outlined">
                    <CardContent>
                      <Typography variant="caption" color="text.secondary">Total Ventas</Typography>
                      <Typography variant="h6" color="primary">${summary.total_sales.toFixed(2)}</Typography>
                    </CardContent>
                  </Card>
                </Grid>
                <Grid size={{ xs: 6 }}>
                  <Card variant="outlined">
                    <CardContent>
                      <Typography variant="caption" color="text.secondary">Transacciones</Typography>
                      <Typography variant="h6">{summary.total_transactions}</Typography>
                    </CardContent>
                  </Card>
                </Grid>
                <Grid size={{ xs: 6 }}>
                  <Card variant="outlined">
                    <CardContent>
                      <Typography variant="caption" color="text.secondary">Efectivo Esperado</Typography>
                      <Typography variant="h6">${summary.expected_cash.toFixed(2)}</Typography>
                    </CardContent>
                  </Card>
                </Grid>
                {summary.session.status === 'closed' && (
                  <>
                    <Grid size={{ xs: 6 }}>
                      <Card variant="outlined">
                        <CardContent>
                          <Typography variant="caption" color="text.secondary">Efectivo en Caja</Typography>
                          <Typography variant="h6">${summary.total_cash.toFixed(2)}</Typography>
                        </CardContent>
                      </Card>
                    </Grid>
                    <Grid size={{ xs: 6 }}>
                      <Card variant="outlined" sx={{
                        borderColor: summary.difference >= 0 ? 'success.main' : 'error.main',
                      }}>
                        <CardContent>
                          <Typography variant="caption" color="text.secondary">Diferencia</Typography>
                          <Typography
                            variant="h6"
                            color={summary.difference >= 0 ? 'success.main' : 'error.main'}
                          >
                            ${summary.difference.toFixed(2)}
                          </Typography>
                        </CardContent>
                      </Card>
                    </Grid>
                  </>
                )}
              </Grid>
            </Box>
          )}
        </DialogContent>
        <DialogActions sx={{ px: 3, pb: 2 }}>
          {summary && (
            <Button startIcon={<Print />} onClick={() => TicketPrinter.printCashRegisterCloseTicket(summary)}>
              Imprimir
            </Button>
          )}
          <Button onClick={() => setSummaryDialog(false)}>Cerrar</Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
}
