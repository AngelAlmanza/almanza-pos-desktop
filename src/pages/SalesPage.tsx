import { useState, useEffect } from 'react';
import {
  Box,
  Typography,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Paper,
  Chip,
  IconButton,
  Collapse,
  Alert,
  Button,
} from '@mui/material';
import { ExpandMore, ExpandLess, Print, Cancel } from '@mui/icons-material';
import { useAuth } from '../context/AuthContext';
import { SaleService } from '../services/SaleService';
import type { Sale } from '../models';
import { TicketPrinter } from '../utils/TicketPrinter';

export function SalesPage() {
  const { isAdmin, cashRegisterSession } = useAuth();
  const [sales, setSales] = useState<Sale[]>([]);
  const [expandedId, setExpandedId] = useState<number | null>(null);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(true);

  const loadSales = async () => {
    try {
      setLoading(true);
      let data: Sale[];
      if (isAdmin) {
        data = await SaleService.getAll();
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

  useEffect(() => {
    loadSales();
  }, [isAdmin, cashRegisterSession]);

  const handleCancel = async (saleId: number) => {
    if (!confirm('¿Estás seguro de cancelar esta venta?')) return;
    try {
      await SaleService.cancel(saleId);
      loadSales();
    } catch (err) {
      setError(String(err));
    }
  };

  const handlePrint = async (saleId: number) => {
    try {
      const sale = await SaleService.getById(saleId);
      TicketPrinter.printSaleTicket(sale);
    } catch (err) {
      setError(String(err));
    }
  };

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

      {error && <Alert severity="error" sx={{ mb: 2 }} onClose={() => setError('')}>{error}</Alert>}

      <TableContainer component={Paper}>
        <Table>
          <TableHead>
            <TableRow>
              <TableCell width={40}></TableCell>
              <TableCell>ID</TableCell>
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
            ) : sales.length === 0 ? (
              <TableRow>
                <TableCell colSpan={8} align="center" sx={{ py: 4, color: 'text.secondary' }}>
                  No hay ventas registradas
                </TableCell>
              </TableRow>
            ) : (
              sales.map((sale) => (
                <>
                  <TableRow key={sale.id} hover>
                    <TableCell>
                      <IconButton size="small" onClick={() => setExpandedId(expandedId === sale.id ? null : sale.id)}>
                        {expandedId === sale.id ? <ExpandLess /> : <ExpandMore />}
                      </IconButton>
                    </TableCell>
                    <TableCell>#{sale.id}</TableCell>
                    <TableCell>{new Date(sale.created_at).toLocaleString()}</TableCell>
                    <TableCell>{sale.user_name}</TableCell>
                    <TableCell align="right" sx={{ fontWeight: 600 }}>${sale.total.toFixed(2)}</TableCell>
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
                  <TableRow key={`${sale.id}-detail`}>
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
                                  <TableCell align="right">${item.unit_price.toFixed(2)}</TableCell>
                                  <TableCell align="right">${item.subtotal.toFixed(2)}</TableCell>
                                </TableRow>
                              ))}
                            </TableBody>
                          </Table>
                          <Box sx={{ mt: 1, display: 'flex', gap: 3 }}>
                            <Typography variant="body2">Pagado: <strong>${sale.payment_amount.toFixed(2)}</strong></Typography>
                            <Typography variant="body2">Cambio: <strong>${sale.change_amount.toFixed(2)}</strong></Typography>
                          </Box>
                        </Box>
                      </Collapse>
                    </TableCell>
                  </TableRow>
                </>
              ))
            )}
          </TableBody>
        </Table>
      </TableContainer>
    </Box>
  );
}
