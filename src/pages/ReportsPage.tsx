import {
  Assessment,
  AttachMoney,
  DateRange,
  FolderOpen,
  OpenInNew,
  PictureAsPdf,
  Receipt,
  TableChart,
} from "@mui/icons-material";
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
} from "@mui/material";
import { DatePicker } from "@mui/x-date-pickers";
import { openPath, revealItemInDir } from "@tauri-apps/plugin-opener";
import moment, { Moment } from "moment";
import { useState } from "react";
import { MetricCard } from "../components/reports/MetricCard";
import type { SalesReport, TopProduct } from "../models";
import { SaleService } from "../services/SaleService";
import { formatCurrency } from "../utils/FormatCurrency";
import { paymentMethodLabel } from "../utils/PaymentLabels";
import { ReportGenerator } from "../utils/ReportGenerator";

moment.locale("es");

const getDefaultStartDate = (): Moment =>
  moment().subtract(1, "month").startOf("month");
const getDefaultEndDate = (): Moment => moment();

export function ReportsPage() {
  const [tab, setTab] = useState(0);
  const [startDate, setStartDate] = useState<Moment>(() =>
    getDefaultStartDate(),
  );
  const [endDate, setEndDate] = useState<Moment>(() => getDefaultEndDate());
  const [report, setReport] = useState<SalesReport | null>(null);
  const [topProducts, setTopProducts] = useState<TopProduct[]>([]);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [exportingPdf, setExportingPdf] = useState(false);
  const [exportingExcel, setExportingExcel] = useState(false);
  const [snackbar, setSnackbar] = useState<{
    open: boolean;
    filePath: string;
    format: "pdf" | "excel";
  } | null>(null);

  const isDateRangeValid = !endDate.isBefore(startDate, "day");

  const loadReport = async () => {
    if (!isDateRangeValid) return;
    try {
      setLoading(true);
      setError("");
      const [reportData, topData] = await Promise.all([
        SaleService.getReport({
          start_date: startDate.format("YYYY-MM-DD") + " 00:00:00",
          end_date: endDate.format("YYYY-MM-DD") + " 23:59:59",
        }),
        SaleService.getTopProducts(
          startDate.format("YYYY-MM-DD") + " 00:00:00",
          endDate.format("YYYY-MM-DD") + " 23:59:59",
          10,
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
      setError("");
      const filePath = await ReportGenerator.generateSalesReportPDF(
        report,
        topProducts,
        startDate.format("YYYY-MM-DD"),
        endDate.format("YYYY-MM-DD"),
      );
      if (filePath) {
        setSnackbar({ open: true, filePath, format: "pdf" });
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
      setError("");
      const filePath = await ReportGenerator.generateSalesExcel(
        report.sales,
        startDate.format("YYYY-MM-DD"),
        endDate.format("YYYY-MM-DD"),
      );
      if (filePath) {
        setSnackbar({ open: true, filePath, format: "excel" });
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
    const parts = path.replace(/\\/g, "/").split("/");
    return parts[parts.length - 1] || "reporte";
  };

  return (
    <Box>
      <Typography variant="h5" sx={{ mb: 3 }}>
        Reportes
      </Typography>

      {error && (
        <Alert severity="error" sx={{ mb: 2 }} onClose={() => setError("")}>
          {error}
        </Alert>
      )}

      {/* Date Range Filter */}
      <Card sx={{ mb: 3 }}>
        <CardContent sx={{ py: 2 }}>
          <Grid container spacing={2} alignItems="center">
            <Grid size={{ xs: 12, sm: 6, md: 4 }}>
              <Box sx={{ display: "flex", alignItems: "center", gap: 1.5 }}>
                <DateRange
                  sx={{ color: "text.secondary", fontSize: 20, flexShrink: 0 }}
                />
                <DatePicker
                  label="Fecha inicio"
                  value={startDate}
                  onChange={(value) =>
                    setStartDate(value ?? getDefaultStartDate())
                  }
                  maxDate={endDate}
                  slotProps={{ textField: { size: "small", fullWidth: true } }}
                />
              </Box>
            </Grid>
            <Grid size={{ xs: 12, sm: 6, md: 4 }}>
              <DatePicker
                label="Fecha fin"
                value={endDate}
                onChange={(value) => setEndDate(value ?? getDefaultEndDate())}
                minDate={startDate}
                slotProps={{ textField: { size: "small", fullWidth: true } }}
              />
            </Grid>
            <Grid
              size={{ xs: 12, sm: 12, md: 4 }}
              sx={{ display: "flex", justifyContent: { md: "flex-end" } }}
            >
              <Stack direction="row" spacing={1} flexWrap="wrap" useFlexGap>
                <Button
                  variant="contained"
                  onClick={loadReport}
                  disabled={loading || !isDateRangeValid}
                  startIcon={
                    loading ? (
                      <CircularProgress size={16} color="inherit" />
                    ) : undefined
                  }
                >
                  {loading ? "Cargando..." : "Generar Reporte"}
                </Button>
                <Button
                  variant="outlined"
                  startIcon={
                    exportingPdf ? (
                      <CircularProgress size={16} color="inherit" />
                    ) : (
                      <PictureAsPdf />
                    )
                  }
                  onClick={handleExportPDF}
                  disabled={!report || exportingPdf || exportingExcel}
                >
                  {exportingPdf ? "Generando..." : "PDF"}
                </Button>
                <Button
                  variant="outlined"
                  startIcon={
                    exportingExcel ? (
                      <CircularProgress size={16} color="inherit" />
                    ) : (
                      <TableChart />
                    )
                  }
                  onClick={handleExportExcel}
                  disabled={!report || exportingPdf || exportingExcel}
                >
                  {exportingExcel ? "Generando..." : "Excel"}
                </Button>
              </Stack>
            </Grid>
          </Grid>
          {!isDateRangeValid && (
            <Typography
              variant="caption"
              color="error"
              sx={{ mt: 1, display: "block" }}
            >
              La fecha de fin no puede ser menor que la fecha de inicio
            </Typography>
          )}
        </CardContent>
      </Card>

      {report && (
        <>
          {/* Metric Cards */}
          <Grid container spacing={2} sx={{ mb: 3 }}>
            <Grid size={{ xs: 12, sm: 4 }}>
              <MetricCard
                icon={<Assessment sx={{ fontSize: 22, color: "#0d6b5f" }} />}
                value={formatCurrency(report.total_sales)}
                label="Total Ventas"
                accentColor="#0d6b5f"
                iconBg="rgba(13,107,95,0.10)"
              />
            </Grid>
            <Grid size={{ xs: 12, sm: 4 }}>
              <MetricCard
                icon={<Receipt sx={{ fontSize: 22, color: "#c17d11" }} />}
                value={String(report.total_transactions)}
                label="Transacciones"
                accentColor="#c17d11"
                iconBg="rgba(193,125,17,0.10)"
              />
            </Grid>
            <Grid size={{ xs: 12, sm: 4 }}>
              <MetricCard
                icon={<AttachMoney sx={{ fontSize: 22, color: "#2d6a4f" }} />}
                value={formatCurrency(report.average_sale)}
                label="Promedio por Venta"
                accentColor="#2d6a4f"
                iconBg="rgba(45,106,79,0.10)"
              />
            </Grid>
          </Grid>

          <Box sx={{ mb: 2, borderBottom: 1, borderColor: "divider" }}>
            <Tabs value={tab} onChange={(_, v) => setTab(v)}>
              <Tab label="Productos Más Vendidos" />
              <Tab label="Detalle de Ventas" />
            </Tabs>
          </Box>

          {tab === 0 && (
            <TableContainer
              component={Paper}
              elevation={0}
              sx={{ border: "1px solid rgba(26,32,53,0.10)" }}
            >
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
                      <TableCell
                        sx={{
                          color: "text.secondary",
                          fontVariantNumeric: "tabular-nums",
                        }}
                      >
                        {index + 1}
                      </TableCell>
                      <TableCell sx={{ fontWeight: 600 }}>
                        {product.product_name}
                      </TableCell>
                      <TableCell
                        align="right"
                        sx={{ fontVariantNumeric: "tabular-nums" }}
                      >
                        {product.total_quantity}
                      </TableCell>
                      <TableCell
                        align="right"
                        sx={{
                          fontWeight: 600,
                          fontVariantNumeric: "tabular-nums",
                        }}
                      >
                        {formatCurrency(product.total_revenue)}
                      </TableCell>
                    </TableRow>
                  ))}
                  {topProducts.length === 0 && (
                    <TableRow>
                      <TableCell
                        colSpan={4}
                        align="center"
                        sx={{ py: 4, color: "text.secondary" }}
                      >
                        No hay datos en el rango seleccionado
                      </TableCell>
                    </TableRow>
                  )}
                </TableBody>
              </Table>
            </TableContainer>
          )}

          {tab === 1 && (
            <TableContainer
              component={Paper}
              elevation={0}
              sx={{ border: "1px solid rgba(26,32,53,0.10)" }}
            >
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
                      <TableCell
                        sx={{
                          color: "text.secondary",
                          fontVariantNumeric: "tabular-nums",
                        }}
                      >
                        #{sale.id}
                      </TableCell>
                      <TableCell>
                        {moment(sale.created_at).format("DD/MM/YYYY hh:mm A")}
                      </TableCell>
                      <TableCell>{sale.user_name}</TableCell>
                      <TableCell
                        align="right"
                        sx={{
                          fontWeight: 600,
                          fontVariantNumeric: "tabular-nums",
                        }}
                      >
                        {formatCurrency(sale.total)}
                      </TableCell>
                      <TableCell>
                        {paymentMethodLabel(sale.payment_method)}
                      </TableCell>
                      <TableCell
                        sx={{
                          color:
                            sale.status === "completed"
                              ? "success.main"
                              : "error.main",
                          fontWeight: 500,
                        }}
                      >
                        {sale.status === "completed"
                          ? "Completada"
                          : "Cancelada"}
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
        anchorOrigin={{ vertical: "bottom", horizontal: "right" }}
        message={
          snackbar ? (
            <Box sx={{ display: "flex", alignItems: "center", gap: 1 }}>
              {snackbar.format === "pdf" ? (
                <PictureAsPdf sx={{ fontSize: 18 }} />
              ) : (
                <TableChart sx={{ fontSize: 18 }} />
              )}
              <Typography variant="body2">
                {getFileName(snackbar.filePath)}
              </Typography>
            </Box>
          ) : null
        }
        action={
          snackbar ? (
            <Box sx={{ display: "flex", alignItems: "center", gap: 0.5 }}>
              <Button
                size="small"
                color="primary"
                startIcon={<OpenInNew fontSize="small" />}
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
                <FolderOpen fontSize="small" />
              </IconButton>
            </Box>
          ) : null
        }
        sx={{ mb: 2, mr: 2 }}
      />
    </Box>
  );
}
