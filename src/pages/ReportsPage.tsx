import {
  Assessment,
  AttachMoney,
  Cancel,
  DateRange,
  FolderOpen,
  MoneyOff,
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
  Chip,
  CircularProgress,
  FormControlLabel,
  Grid,
  IconButton,
  Paper,
  Snackbar,
  Stack,
  Switch,
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
import { useMemo, useState } from "react";
import { MetricCard } from "../components/reports/MetricCard";
import type { SalesReport, TopProduct } from "../models";
import { SaleService } from "../services/SaleService";
import type { PaymentMethod } from "../types";
import { formatCurrency } from "../utils/FormatCurrency";
import { paymentMethodLabel } from "../utils/PaymentLabels";
import { ReportGenerator } from "../utils/ReportGenerator";
import {
  MAX_REPORT_RANGE_DAYS,
  computeMetrics,
  filterSales,
  isRangeTooLong,
} from "../utils/reportHelpers";

moment.locale("es");

const getDefaultStartDate = (): Moment =>
  moment().subtract(1, "month").startOf("month");
const getDefaultEndDate = (): Moment => moment();

const toErrorMsg = (err: unknown): string =>
  err instanceof Error ? err.message : String(err);

export function ReportsPage() {
  const [tab, setTab] = useState(0);
  const [startDate, setStartDate] = useState<Moment>(() =>
    getDefaultStartDate(),
  );
  const [endDate, setEndDate] = useState<Moment>(() => getDefaultEndDate());
  const [report, setReport] = useState<SalesReport | null>(null);
  const [topProducts, setTopProducts] = useState<TopProduct[]>([]);
  const [includeCancelled, setIncludeCancelled] = useState(false);
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
  const rangeTooLong = isRangeTooLong(startDate.valueOf(), endDate.valueOf());
  const canGenerate = isDateRangeValid && !rangeTooLong;

  const metrics = useMemo(
    () => (report ? computeMetrics(report.sales) : null),
    [report],
  );

  const displaySales = useMemo(
    () => (report ? filterSales(report.sales, includeCancelled) : []),
    [report, includeCancelled],
  );

  const loadReport = async () => {
    if (!canGenerate) return;
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
      setError(toErrorMsg(err));
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
        includeCancelled,
      );
      if (filePath) {
        setSnackbar({ open: true, filePath, format: "pdf" });
      }
    } catch (err) {
      setError(toErrorMsg(err));
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
        report,
        startDate.format("YYYY-MM-DD"),
        endDate.format("YYYY-MM-DD"),
        includeCancelled,
      );
      if (filePath) {
        setSnackbar({ open: true, filePath, format: "excel" });
      }
    } catch (err) {
      setError(toErrorMsg(err));
    } finally {
      setExportingExcel(false);
    }
  };

  const handleOpenFile = async () => {
    if (!snackbar) return;
    try {
      await openPath(snackbar.filePath);
    } catch (err) {
      setError(toErrorMsg(err));
    }
  };

  const handleRevealInFolder = async () => {
    if (!snackbar) return;
    try {
      await revealItemInDir(snackbar.filePath);
    } catch (err) {
      setError(toErrorMsg(err));
    }
  };

  const handleCloseSnackbar = () => setSnackbar(null);

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

      {/* ── Filter Card ──────────────────────────────────────────────────── */}
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
                  disabled={loading || !canGenerate}
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

          {/* Options + validation row */}
          <Box
            sx={{
              display: "flex",
              alignItems: "center",
              justifyContent: "space-between",
              mt: 1.5,
              flexWrap: "wrap",
              gap: 1,
            }}
          >
            <FormControlLabel
              control={
                <Switch
                  size="small"
                  checked={includeCancelled}
                  onChange={(e) => setIncludeCancelled(e.target.checked)}
                />
              }
              label={
                <Typography variant="body2" color="text.secondary">
                  Incluir ventas canceladas
                </Typography>
              }
              sx={{ m: 0 }}
            />
            <Box
              sx={{
                display: "flex",
                flexDirection: "column",
                alignItems: "flex-end",
                gap: 0.25,
              }}
            >
              {!isDateRangeValid && (
                <Typography variant="caption" color="error">
                  La fecha de fin no puede ser anterior a la de inicio
                </Typography>
              )}
              {rangeTooLong && (
                <Typography variant="caption" color="error">
                  El rango no puede superar {MAX_REPORT_RANGE_DAYS} días
                </Typography>
              )}
            </Box>
          </Box>
        </CardContent>
      </Card>

      {report && metrics && (
        <>
          {/* ── Metric Cards ──────────────────────────────────────────────── */}
          <Grid container spacing={2} sx={{ mb: 3 }}>
            {/* Row 1 – revenue */}
            <Grid size={{ xs: 6, sm: 4 }}>
              <MetricCard
                icon={<Assessment sx={{ fontSize: 22, color: "#0d6b5f" }} />}
                value={formatCurrency(report.total_sales)}
                label="Total Ventas"
                accentColor="#0d6b5f"
                iconBg="rgba(13,107,95,0.10)"
              />
            </Grid>
            <Grid size={{ xs: 6, sm: 4 }}>
              <MetricCard
                icon={<Receipt sx={{ fontSize: 22, color: "#2d6a4f" }} />}
                value={String(report.total_transactions)}
                label="Completadas"
                accentColor="#2d6a4f"
                iconBg="rgba(45,106,79,0.10)"
              />
            </Grid>
            <Grid size={{ xs: 6, sm: 4 }}>
              <MetricCard
                icon={<AttachMoney sx={{ fontSize: 22, color: "#c17d11" }} />}
                value={formatCurrency(report.average_sale)}
                label="Promedio por Venta"
                accentColor="#c17d11"
                iconBg="rgba(193,125,17,0.10)"
              />
            </Grid>
            {/* Row 2 – cancellations */}
            <Grid size={{ xs: 6, sm: 6 }}>
              <MetricCard
                icon={<Cancel sx={{ fontSize: 22, color: "#b91c1c" }} />}
                value={String(metrics.cancelledCount)}
                label="Canceladas"
                accentColor="#b91c1c"
                iconBg="rgba(185,28,28,0.10)"
              />
            </Grid>
            <Grid size={{ xs: 6, sm: 6 }}>
              <MetricCard
                icon={<MoneyOff sx={{ fontSize: 22, color: "#9b1818" }} />}
                value={formatCurrency(metrics.cancelledAmount)}
                label="Monto Cancelado"
                accentColor="#9b1818"
                iconBg="rgba(155,24,24,0.10)"
              />
            </Grid>
          </Grid>

          {/* ── Tabs ──────────────────────────────────────────────────────── */}
          <Box sx={{ mb: 2, borderBottom: 1, borderColor: "divider" }}>
            <Tabs value={tab} onChange={(_, v) => setTab(v)}>
              <Tab label="Productos Más Vendidos" />
              <Tab label="Detalle de Ventas" />
              <Tab label="Desglose por Pago" />
            </Tabs>
          </Box>

          {/* Tab 0 – Top products */}
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

          {/* Tab 1 – Sales detail (filtered by includeCancelled) */}
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
                  {displaySales.map((sale) => (
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
                      <TableCell>
                        <Chip
                          label={
                            sale.status === "completed"
                              ? "Completada"
                              : "Cancelada"
                          }
                          size="small"
                          sx={{
                            fontWeight: 500,
                            bgcolor:
                              sale.status === "completed"
                                ? "rgba(45,106,79,0.10)"
                                : "rgba(185,28,28,0.10)",
                            color:
                              sale.status === "completed"
                                ? "success.main"
                                : "error.main",
                          }}
                        />
                      </TableCell>
                    </TableRow>
                  ))}
                  {displaySales.length === 0 && (
                    <TableRow>
                      <TableCell
                        colSpan={6}
                        align="center"
                        sx={{ py: 4, color: "text.secondary" }}
                      >
                        No hay ventas en el rango seleccionado
                      </TableCell>
                    </TableRow>
                  )}
                </TableBody>
              </Table>
            </TableContainer>
          )}

          {/* Tab 2 – Payment breakdown (always from completed sales) */}
          {tab === 2 && (
            <TableContainer
              component={Paper}
              elevation={0}
              sx={{ border: "1px solid rgba(26,32,53,0.10)" }}
            >
              <Table size="small">
                <TableHead>
                  <TableRow>
                    <TableCell>Método de Pago</TableCell>
                    <TableCell align="right">Transacciones</TableCell>
                    <TableCell align="right">Total</TableCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {(
                    Object.entries(metrics.byPaymentMethod) as [
                      PaymentMethod,
                      { count: number; amount: number },
                    ][]
                  ).map(([method, data]) => (
                    <TableRow key={method} hover>
                      <TableCell sx={{ fontWeight: 500 }}>
                        {paymentMethodLabel(method)}
                      </TableCell>
                      <TableCell
                        align="right"
                        sx={{ fontVariantNumeric: "tabular-nums" }}
                      >
                        {data.count}
                      </TableCell>
                      <TableCell
                        align="right"
                        sx={{
                          fontWeight: 600,
                          fontVariantNumeric: "tabular-nums",
                        }}
                      >
                        {formatCurrency(data.amount)}
                      </TableCell>
                    </TableRow>
                  ))}
                  {Object.keys(metrics.byPaymentMethod).length === 0 && (
                    <TableRow>
                      <TableCell
                        colSpan={3}
                        align="center"
                        sx={{ py: 4, color: "text.secondary" }}
                      >
                        No hay ventas completadas en el rango seleccionado
                      </TableCell>
                    </TableRow>
                  )}
                </TableBody>
              </Table>
            </TableContainer>
          )}
        </>
      )}

      {/* ── Export snackbar ───────────────────────────────────────────────── */}
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
