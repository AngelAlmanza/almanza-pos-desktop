import { useState } from 'react';
import {
  Box,
  Button,
  Typography,
  Card,
  CardContent,
  Grid,
  TextField,
  Alert,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Paper,
  Tabs,
  Tab,
} from '@mui/material';
import { PictureAsPdf, TableChart, Assessment } from '@mui/icons-material';
import { SaleService } from '../services/SaleService';
import type { SalesReport, TopProduct } from '../models';
import { ReportGenerator } from '../utils/ReportGenerator';

export function ReportsPage() {
  const [tab, setTab] = useState(0);
  const [startDate, setStartDate] = useState(() => {
    const d = new Date();
    d.setMonth(d.getMonth() - 1);
    return d.toISOString().split('T')[0];
  });
  const [endDate, setEndDate] = useState(() => new Date().toISOString().split('T')[0]);
  const [report, setReport] = useState<SalesReport | null>(null);
  const [topProducts, setTopProducts] = useState<TopProduct[]>([]);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const loadReport = async () => {
    try {
      setLoading(true);
      setError('');
      const [reportData, topData] = await Promise.all([
        SaleService.getReport({
          start_date: startDate,
          end_date: endDate + ' 23:59:59',
        }),
        SaleService.getTopProducts(startDate, endDate + ' 23:59:59', 10),
      ]);
      setReport(reportData);
      setTopProducts(topData);
    } catch (err) {
      setError(String(err));
    } finally {
      setLoading(false);
    }
  };

  const handleExportPDF = () => {
    if (!report) return;
    ReportGenerator.generateSalesReportPDF(report, topProducts, startDate, endDate);
  };

  const handleExportExcel = () => {
    if (!report) return;
    ReportGenerator.generateSalesExcel(report.sales, startDate, endDate);
  };

  return (
    <Box>
      <Typography variant="h5" sx={{ mb: 3 }}>Reportes</Typography>

      {error && <Alert severity="error" sx={{ mb: 2 }} onClose={() => setError('')}>{error}</Alert>}

      {/* Date Range Filter */}
      <Card sx={{ mb: 3 }}>
        <CardContent>
          <Box sx={{ display: 'flex', gap: 2, alignItems: 'center', flexWrap: 'wrap' }}>
            <TextField
              label="Fecha inicio"
              type="date"
              value={startDate}
              onChange={(e) => setStartDate(e.target.value)}
              InputLabelProps={{ shrink: true }}
              size="small"
            />
            <TextField
              label="Fecha fin"
              type="date"
              value={endDate}
              onChange={(e) => setEndDate(e.target.value)}
              InputLabelProps={{ shrink: true }}
              size="small"
            />
            <Button variant="contained" onClick={loadReport} disabled={loading}>
              {loading ? 'Cargando...' : 'Generar Reporte'}
            </Button>
            {report && (
              <Box sx={{ display: 'flex', gap: 1, ml: 'auto' }}>
                <Button variant="outlined" startIcon={<PictureAsPdf />} onClick={handleExportPDF}>
                  Exportar PDF
                </Button>
                <Button variant="outlined" startIcon={<TableChart />} onClick={handleExportExcel}>
                  Exportar Excel
                </Button>
              </Box>
            )}
          </Box>
        </CardContent>
      </Card>

      {report && (
        <>
          {/* Summary Cards */}
          <Grid container spacing={2} sx={{ mb: 3 }}>
            <Grid size={{ xs: 12, sm: 4 }}>
              <Card>
                <CardContent sx={{ textAlign: 'center' }}>
                  <Assessment sx={{ fontSize: 40, color: 'primary.main', mb: 1 }} />
                  <Typography variant="h4" fontWeight={700} color="primary">
                    ${report.total_sales.toFixed(2)}
                  </Typography>
                  <Typography color="text.secondary">Total Ventas</Typography>
                </CardContent>
              </Card>
            </Grid>
            <Grid size={{ xs: 12, sm: 4 }}>
              <Card>
                <CardContent sx={{ textAlign: 'center' }}>
                  <Typography variant="h4" fontWeight={700} color="secondary.main">
                    {report.total_transactions}
                  </Typography>
                  <Typography color="text.secondary">Transacciones</Typography>
                </CardContent>
              </Card>
            </Grid>
            <Grid size={{ xs: 12, sm: 4 }}>
              <Card>
                <CardContent sx={{ textAlign: 'center' }}>
                  <Typography variant="h4" fontWeight={700} color="success.main">
                    ${report.average_sale.toFixed(2)}
                  </Typography>
                  <Typography color="text.secondary">Promedio por Venta</Typography>
                </CardContent>
              </Card>
            </Grid>
          </Grid>

          <Box sx={{ mb: 2 }}>
            <Tabs value={tab} onChange={(_, v) => setTab(v)}>
              <Tab label="Productos Más Vendidos" />
              <Tab label="Detalle de Ventas" />
            </Tabs>
          </Box>

          {tab === 0 && (
            <TableContainer component={Paper}>
              <Table size="small">
                <TableHead>
                  <TableRow>
                    <TableCell>#</TableCell>
                    <TableCell>Producto</TableCell>
                    <TableCell align="right">Cantidad Vendida</TableCell>
                    <TableCell align="right">Ingresos</TableCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {topProducts.map((product, index) => (
                    <TableRow key={product.product_id} hover>
                      <TableCell>{index + 1}</TableCell>
                      <TableCell sx={{ fontWeight: 600 }}>{product.product_name}</TableCell>
                      <TableCell align="right">{product.total_quantity}</TableCell>
                      <TableCell align="right" sx={{ fontWeight: 600 }}>
                        ${product.total_revenue.toFixed(2)}
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
            <TableContainer component={Paper}>
              <Table size="small">
                <TableHead>
                  <TableRow>
                    <TableCell>ID</TableCell>
                    <TableCell>Fecha</TableCell>
                    <TableCell>Cajero</TableCell>
                    <TableCell align="right">Total</TableCell>
                    <TableCell>Método</TableCell>
                    <TableCell>Estado</TableCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {report.sales.map((sale) => (
                    <TableRow key={sale.id} hover>
                      <TableCell>#{sale.id}</TableCell>
                      <TableCell>{new Date(sale.created_at).toLocaleString()}</TableCell>
                      <TableCell>{sale.user_name}</TableCell>
                      <TableCell align="right" sx={{ fontWeight: 600 }}>
                        ${sale.total.toFixed(2)}
                      </TableCell>
                      <TableCell>{sale.payment_method === 'cash' ? 'Efectivo' : sale.payment_method}</TableCell>
                      <TableCell>{sale.status === 'completed' ? 'Completada' : 'Cancelada'}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </TableContainer>
          )}
        </>
      )}
    </Box>
  );
}
