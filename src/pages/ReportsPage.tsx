import {
  Assessment,
  AttachMoney,
  DateRange,
  FolderOpen,
  OpenInNew,
  PictureAsPdf,
  Receipt,
  TableChart,
} from '@mui/icons-material';
import {
  Alert,
  Box,
  Button,
  Card,
  CardContent,
  CircularProgress,
  Grid,
  IconButton,
  Paper,
  Snackbar,
  Stack,
  Tab,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Tabs,
  Typography,
} from '@mui/material';
import { DatePicker } from '@mui/x-date-pickers';
import { openPath, revealItemInDir } from '@tauri-apps/plugin-opener';
import moment, { Moment } from 'moment';
import { useState } from 'react';
import type { SalesReport, TopProduct } from '../models';
import { SaleService } from '../services/SaleService';
import { formatCurrency } from '../utils/FormatCurrency';
import { paymentMethodLabel } from '../utils/PaymentLabels';
import { ReportGenerator } from '../utils/ReportGenerator';

moment.locale('es');

const getDefaultStartDate = (): Moment => moment().subtract(1, 'month').startOf('month');
const getDefaultEndDate = (): Moment => moment();

export function ReportsPage() {
  const [tab, setTab] = useState(0);
  const [startDate, setStartDate] = useState<Moment>(() => getDefaultStartDate());
  const [endDate, setEndDate] = useState<Moment>(() => getDefaultEndDate());
  const [report, setReport] = useState<SalesReport | null>(null);
  const [topProducts, setTopProducts] = useState<TopProduct[]>([]);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [exportingPdf, setExportingPdf] = useState(false);
  const [exportingExcel, setExportingExcel] = useState(false);
  const [snackbar, setSnackbar] = useState<{
    open: boolean;
    filePath: string;
    format: 'pdf' | 'excel';
  } | null>(null);

  const isDateRangeValid = !endDate.isBefore(startDate, 'day');

  const loadReport = async () => {
    if (!isDateRangeValid) return;
    try {
      setLoading(true);
      setError('');
      const [reportData, topData] = await Promise.all([
        SaleService.getReport({
          start_date: startDate.format('YYYY-MM-DD') + ' 00:00:00',
          end_date: endDate.format('YYYY-MM-DD') + ' 23:59:59',
        }),
        SaleService.getTopProducts(
          startDate.format('YYYY-MM-DD') + ' 00:00:00',
          endDate.format('YYYY-MM-DD') + ' 23:59:59',
          10
        ),
      ]);
      setReport(reportData);
      setTopProducts(topData);
    } catch (err) {
      setError(String(err));
    } finally {
      setLoading(false);
    }
  };

  const handleExportPDF = async () => {
    if (!report) return;
    try {
      setExportingPdf(true);
      setError('');
      const filePath = await ReportGenerator.generateSalesReportPDF(
        report,
        topProducts,
        startDate.format('YYYY-MM-DD'),
        endDate.format('YYYY-MM-DD')
      );
      if (filePath) {
        setSnackbar({ open: true, filePath, format: 'pdf' });
      }
    } catch (err) {
      setError(String(err));
    } finally {
      setExportingPdf(false);
    }
  };

  const handleExportExcel = async () => {
    if (!report) return;
    try {
      setExportingExcel(true);
      setError('');
      const filePath = await ReportGenerator.generateSalesExcel(
        report.sales,
        startDate.format('YYYY-MM-DD'),
        endDate.format('YYYY-MM-DD')
      );
      if (filePath) {
        setSnackbar({ open: true, filePath, format: 'excel' });
      }
    } catch (err) {
      setError(String(err));
    } finally {
      setExportingExcel(false);
    }
  };

  const handleOpenFile = async () => {
    if (!snackbar) return;
    try {
      await openPath(snackbar.filePath);
    } catch (err) {
      setError(String(err));
    }
  };

  const handleRevealInFolder = async () => {
    if (!snackbar) return;
    try {
      await revealItemInDir(snackbar.filePath);
    } catch (err) {
      setError(String(err));
    }
  };

  const handleCloseSnackbar = () => {
    setSnackbar(null);
  };

  const getFileName = (path: string) => {
    const parts = path.replace(/\\/g, '/').split('/');
    return parts[parts.length - 1] || 'reporte';
  };

  return (
    <Box>
      <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 3 }}>
        <Assessment sx={{ fontSize: 28, color: 'primary.main' }} />
        <Typography variant="h5" fontWeight={600}>
          Reportes
        </Typography>
      </Box>

      {error && (
        <Alert severity="error" sx={{ mb: 2 }} onClose={() => setError('')}>
          {error}
        </Alert>
      )}

      {/* Date Range Filter */}
      <Card sx={{ mb: 3, boxShadow: 2 }}>
        <CardContent sx={{ py: 2.5 }}>
          <Grid container spacing={2} alignItems="center">
            <Grid size={{ xs: 12, sm: 6, md: 4 }}>
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5 }}>
                <DateRange sx={{ color: 'action.active' }} />
                <DatePicker
                  label="Fecha inicio"
                  value={startDate}
                  onChange={(value) => setStartDate(value ?? getDefaultStartDate())}
                  maxDate={endDate}
                  slotProps={{ textField: { size: 'small', fullWidth: true } }}
                />
              </Box>
            </Grid>
            <Grid size={{ xs: 12, sm: 6, md: 4 }}>
              <DatePicker
                label="Fecha fin"
                value={endDate}
                onChange={(value) => setEndDate(value ?? getDefaultEndDate())}
                minDate={startDate}
                slotProps={{ textField: { size: 'small', fullWidth: true } }}
              />
            </Grid>
            <Grid size={{ xs: 12, sm: 12, md: 4 }} sx={{ display: 'flex', justifyContent: 'flex-end' }}>
              <Stack direction="row" spacing={1} flexWrap="wrap" useFlexGap>
                <Button
                  variant="contained"
                  onClick={loadReport}
                  disabled={loading || !isDateRangeValid}
                  startIcon={loading ? <CircularProgress size={18} color="inherit" /> : undefined}
                >
                  {loading ? 'Cargando...' : 'Generar Reporte'}
                </Button>
                <Button
                  variant="outlined"
                  startIcon={
                    exportingPdf ? (
                      <CircularProgress size={18} color="inherit" />
                    ) : (
                      <PictureAsPdf />
                    )
                  }
                  onClick={() => {
                    handleExportPDF();
                  }}
                  disabled={!report || exportingPdf || exportingExcel}
                >
                  {exportingPdf ? 'Generando...' : 'PDF'}
                </Button>
                <Button
                  variant="outlined"
                  startIcon={
                    exportingExcel ? (
                      <CircularProgress size={18} color="inherit" />
                    ) : (
                      <TableChart />
                    )
                  }
                  onClick={() => {
                    handleExportExcel();
                  }}
                  disabled={!report || exportingPdf || exportingExcel}
                >
                  {exportingExcel ? 'Generando...' : 'Excel'}
                </Button>
              </Stack>
            </Grid>
          </Grid>
          {!isDateRangeValid && (
            <Typography variant="caption" color="error" sx={{ mt: 1, display: 'block' }}>
              La fecha de fin no puede ser menor que la fecha de inicio
            </Typography>
          )}
        </CardContent>
      </Card>

      {report && (
        <>
          {/* Summary Cards */}
          <Grid container spacing={2} sx={{ mb: 3 }}>
            <Grid size={{ xs: 12, sm: 4 }}>
              <Card sx={{ boxShadow: 2, borderTop: 3, borderColor: 'primary.main' }}>
                <CardContent sx={{ textAlign: 'center', py: 3 }}>
                  <Assessment sx={{ fontSize: 40, color: 'primary.main', mb: 1 }} />
                  <Typography variant="h4" fontWeight={700} color="primary">
                    {formatCurrency(report.total_sales)}
                  </Typography>
                  <Typography color="text.secondary" variant="body2">
                    Total Ventas
                  </Typography>
                </CardContent>
              </Card>
            </Grid>
            <Grid size={{ xs: 12, sm: 4 }}>
              <Card sx={{ boxShadow: 2, borderTop: 3, borderColor: 'secondary.main' }}>
                <CardContent sx={{ textAlign: 'center', py: 3 }}>
                  <Receipt sx={{ fontSize: 40, color: 'secondary.main', mb: 1 }} />
                  <Typography variant="h4" fontWeight={700} color="secondary.main">
                    {report.total_transactions}
                  </Typography>
                  <Typography color="text.secondary" variant="body2">
                    Transacciones
                  </Typography>
                </CardContent>
              </Card>
            </Grid>
            <Grid size={{ xs: 12, sm: 4 }}>
              <Card sx={{ boxShadow: 2, borderTop: 3, borderColor: 'success.main' }}>
                <CardContent sx={{ textAlign: 'center', py: 3 }}>
                  <AttachMoney sx={{ fontSize: 40, color: 'success.main', mb: 1 }} />
                  <Typography variant="h4" fontWeight={700} color="success.main">
                    {formatCurrency(report.average_sale)}
                  </Typography>
                  <Typography color="text.secondary" variant="body2">
                    Promedio por Venta
                  </Typography>
                </CardContent>
              </Card>
            </Grid>
          </Grid>

          <Box sx={{ mb: 2, borderBottom: 1, borderColor: 'divider' }}>
            <Tabs value={tab} onChange={(_, v) => setTab(v)}>
              <Tab label="Productos Más Vendidos" />
              <Tab label="Detalle de Ventas" />
            </Tabs>
          </Box>

          {tab === 0 && (
            <TableContainer component={Paper} sx={{ boxShadow: 2 }}>
              <Table size="small">
                <TableHead>
                  <TableRow sx={{ bgcolor: 'action.hover' }}>
                    <TableCell>
                      <strong>#</strong>
                    </TableCell>
                    <TableCell>
                      <strong>Producto</strong>
                    </TableCell>
                    <TableCell align="right">
                      <strong>Cantidad Vendida</strong>
                    </TableCell>
                    <TableCell align="right">
                      <strong>Ingresos</strong>
                    </TableCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {topProducts.map((product, index) => (
                    <TableRow key={product.product_id} hover>
                      <TableCell>{index + 1}</TableCell>
                      <TableCell sx={{ fontWeight: 600 }}>{product.product_name}</TableCell>
                      <TableCell align="right">{product.total_quantity}</TableCell>
                      <TableCell align="right" sx={{ fontWeight: 600 }}>
                        {formatCurrency(product.total_revenue)}
                      </TableCell>
                    </TableRow>
                  ))}
                  {topProducts.length === 0 && (
                    <TableRow>
                      <TableCell colSpan={4} align="center" sx={{ py: 4, color: 'text.secondary' }}>
                        No hay datos en el rango seleccionado
                      </TableCell>
                    </TableRow>
                  )}
                </TableBody>
              </Table>
            </TableContainer>
          )}

          {tab === 1 && (
            <TableContainer component={Paper} sx={{ boxShadow: 2 }}>
              <Table size="small">
                <TableHead>
                  <TableRow sx={{ bgcolor: 'action.hover' }}>
                    <TableCell>
                      <strong>ID</strong>
                    </TableCell>
                    <TableCell>
                      <strong>Fecha</strong>
                    </TableCell>
                    <TableCell>
                      <strong>Cajero</strong>
                    </TableCell>
                    <TableCell align="right">
                      <strong>Total</strong>
                    </TableCell>
                    <TableCell>
                      <strong>Método</strong>
                    </TableCell>
                    <TableCell>
                      <strong>Estado</strong>
                    </TableCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {report.sales.map((sale) => (
                    <TableRow key={sale.id} hover>
                      <TableCell>#{sale.id}</TableCell>
                      <TableCell>
                        {moment(sale.created_at).format('DD/MM/YYYY hh:mm A')}
                      </TableCell>
                      <TableCell>{sale.user_name}</TableCell>
                      <TableCell align="right" sx={{ fontWeight: 600 }}>
                        {formatCurrency(sale.total)}
                      </TableCell>
                      <TableCell>{paymentMethodLabel(sale.payment_method)}</TableCell>
                      <TableCell>
                        {sale.status === 'completed' ? 'Completada' : 'Cancelada'}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </TableContainer>
          )}
        </>
      )}

      <Snackbar
        open={Boolean(snackbar?.open)}
        autoHideDuration={8000}
        onClose={handleCloseSnackbar}
        anchorOrigin={{ vertical: 'bottom', horizontal: 'right' }}
        message={
          snackbar ? (
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
              {snackbar.format === 'pdf' ? (
                <PictureAsPdf color="action" />
              ) : (
                <TableChart color="action" />
              )}
              <Typography variant="body2">
                Reporte generado: {getFileName(snackbar.filePath)}
              </Typography>
            </Box>
          ) : null
        }
        action={
          snackbar ? (
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
              <Button
                size="small"
                color="primary"
                startIcon={<OpenInNew />}
                onClick={handleOpenFile}
              >
                Abrir
              </Button>
              <IconButton
                size="small"
                color="inherit"
                onClick={handleRevealInFolder}
                title="Mostrar en carpeta"
              >
                <FolderOpen />
              </IconButton>
            </Box>
          ) : null
        }
        sx={{ mb: 2, mr: 2 }}
      />
    </Box>
  );
}
