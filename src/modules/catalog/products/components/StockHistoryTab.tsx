import {
  Alert,
  Box,
  Button,
  Chip,
  Link,
  Paper,
  Skeleton,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TablePagination,
  TableRow,
} from '@mui/material';
import { DatePicker } from '@mui/x-date-pickers';
import moment, { type Moment } from 'moment';
import { useCallback, useEffect, useState } from 'react';
import { InventoryService } from '@modules/catalog/inventory/services/InventoryService';
import type { InventoryAdjustment } from '@modules/catalog/inventory/types';
import { ADJUSTMENT_LABELS } from '@modules/catalog/products/utils/stockAdjustment';

moment.locale('es');

interface StockHistoryTabProps {
  // Cambia cuando se registra un ajuste, para recargar el historial.
  refreshKey: number;
  onOpenProduct: (productId: number) => void;
}

const getMonthStart = (): Moment => moment().startOf('month');
const getMonthEnd = (): Moment => moment().endOf('month');
const HEAD_SX = { backgroundColor: '#f5f3f0', fontSize: '0.7rem', textTransform: 'uppercase' } as const;

export function StockHistoryTab({ refreshKey, onOpenProduct }: StockHistoryTabProps) {
  const [startDate, setStartDate] = useState<Moment>(getMonthStart);
  const [endDate, setEndDate] = useState<Moment>(getMonthEnd);
  const [page, setPage] = useState(0);
  const [rowsPerPage, setRowsPerPage] = useState(50);
  const [rows, setRows] = useState<InventoryAdjustment[]>([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const load = useCallback(
    async (currentPage: number, currentRows: number) => {
      setLoading(true);
      setError('');
      try {
        const result = await InventoryService.getByDateRange(
          {
            start_date: startDate.format('YYYY-MM-DD') + ' 00:00:00',
            end_date: endDate.format('YYYY-MM-DD') + ' 23:59:59',
          },
          currentPage + 1,
          currentRows,
        );
        setRows(result.data);
        setTotal(result.total);
      } catch (err) {
        setError(String(err));
      } finally {
        setLoading(false);
      }
    },
    [startDate, endDate],
  );

  // Cambiar fechas o registrar un ajuste vuelve a la primera página.
  useEffect(() => {
    setPage(0);
    void load(0, rowsPerPage);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [load, refreshKey]);

  return (
    <Box>
      <Box sx={{ display: 'flex', gap: 1.5, alignItems: 'center', mb: 2, flexWrap: 'wrap' }}>
        <DatePicker
          label="Fecha inicio"
          value={startDate}
          onChange={(value) => setStartDate(value ?? getMonthStart())}
          maxDate={endDate}
          slotProps={{ textField: { size: 'small' } }}
        />
        <DatePicker
          label="Fecha fin"
          value={endDate}
          onChange={(value) => setEndDate(value ?? getMonthEnd())}
          minDate={startDate}
          slotProps={{ textField: { size: 'small' } }}
        />
      </Box>

      <Paper elevation={0} sx={{ border: '1px solid rgba(26,32,53,0.10)' }}>
        <TableContainer>
          <Table size="small">
            <TableHead>
              <TableRow>
                <TableCell scope="col" sx={HEAD_SX}>Fecha</TableCell>
                <TableCell scope="col" sx={HEAD_SX}>Producto</TableCell>
                <TableCell scope="col" sx={HEAD_SX}>Tipo</TableCell>
                <TableCell scope="col" align="right" sx={HEAD_SX}>Cantidad</TableCell>
                <TableCell scope="col" align="right" sx={HEAD_SX}>Stock anterior</TableCell>
                <TableCell scope="col" align="right" sx={HEAD_SX}>Stock nuevo</TableCell>
                <TableCell scope="col" sx={HEAD_SX}>Motivo</TableCell>
                <TableCell scope="col" sx={HEAD_SX}>Usuario</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {loading &&
                [0, 1, 2, 3].map((i) => (
                  <TableRow key={i}>
                    <TableCell colSpan={8}>
                      <Skeleton height={24} />
                    </TableCell>
                  </TableRow>
                ))}
              {!loading && error && (
                <TableRow>
                  <TableCell colSpan={8} sx={{ py: 3 }}>
                    <Alert
                      severity="error"
                      action={
                        <Button
                          color="inherit"
                          size="small"
                          onClick={() => void load(page, rowsPerPage)}
                          data-testid="history-retry"
                        >
                          Reintentar
                        </Button>
                      }
                    >
                      {error}
                    </Alert>
                  </TableCell>
                </TableRow>
              )}
              {!loading && !error && rows.length === 0 && (
                <TableRow>
                  <TableCell colSpan={8} align="center" sx={{ py: 4, color: 'text.secondary' }}>
                    Sin ajustes en estas fechas
                  </TableCell>
                </TableRow>
              )}
              {!loading &&
                !error &&
                rows.map((adj) => (
                  <TableRow key={adj.id} hover>
                    <TableCell sx={{ fontSize: '0.8125rem', color: 'text.secondary' }}>
                      {moment(adj.created_at).format('DD/MM/YYYY hh:mm A')}
                    </TableCell>
                    <TableCell sx={{ fontWeight: 500 }}>
                      <Link
                        component="button"
                        type="button"
                        underline="hover"
                        onClick={() => onOpenProduct(adj.product_id)}
                        data-testid={`history-product-${adj.id}`}
                      >
                        {adj.product_name ?? `Producto ${adj.product_id}`}
                      </Link>
                    </TableCell>
                    <TableCell>
                      <Chip
                        size="small"
                        label={ADJUSTMENT_LABELS[adj.adjustment_type]}
                        sx={{
                          fontWeight: 600,
                          backgroundColor:
                            adj.adjustment_type === 'negative'
                              ? 'rgba(185,28,28,0.10)'
                              : 'rgba(45,106,79,0.10)',
                          color: adj.adjustment_type === 'negative' ? 'error.dark' : 'success.dark',
                        }}
                      />
                    </TableCell>
                    <TableCell align="right" sx={{ fontVariantNumeric: 'tabular-nums' }}>
                      {adj.quantity}
                    </TableCell>
                    <TableCell
                      align="right"
                      sx={{ color: 'text.secondary', fontVariantNumeric: 'tabular-nums' }}
                    >
                      {adj.previous_stock}
                    </TableCell>
                    <TableCell align="right" sx={{ fontWeight: 600, fontVariantNumeric: 'tabular-nums' }}>
                      {adj.new_stock}
                    </TableCell>
                    <TableCell sx={{ color: 'text.secondary', fontSize: '0.8125rem' }}>
                      {adj.reason || '—'}
                    </TableCell>
                    <TableCell sx={{ color: 'text.secondary' }}>{adj.user_name || '—'}</TableCell>
                  </TableRow>
                ))}
            </TableBody>
          </Table>
        </TableContainer>
        <TablePagination
          component="div"
          count={total}
          page={page}
          onPageChange={(_, next) => {
            setPage(next);
            void load(next, rowsPerPage);
          }}
          rowsPerPage={rowsPerPage}
          onRowsPerPageChange={(e) => {
            const next = parseInt(e.target.value, 10);
            setRowsPerPage(next);
            setPage(0);
            void load(0, next);
          }}
          rowsPerPageOptions={[25, 50, 100]}
          labelRowsPerPage="Filas por página:"
          labelDisplayedRows={({ from, to, count }) => `${from}–${to} de ${count}`}
        />
      </Paper>
    </Box>
  );
}
