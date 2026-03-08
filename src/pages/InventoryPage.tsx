import { Add, Inventory2 } from "@mui/icons-material";
import {
  Alert,
  Box,
  Button,
  Chip,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  MenuItem,
  Paper,
  Tab,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TablePagination,
  TableRow,
  Tabs,
  TextField,
  Typography,
} from "@mui/material";
import { DatePicker } from "@mui/x-date-pickers";
import moment, { type Moment } from "moment";
import { useEffect, useState } from "react";
import { useAuth } from "../context/AuthContext";
import type { InventoryAdjustment, Product } from "../models";
import { InventoryService } from "../services/InventoryService";
import { ProductService } from "../services/ProductService";
import { formatCurrency } from "../utils/FormatCurrency";

moment.locale("es");

const getMonthStart = (): Moment => moment().startOf("month");
const getMonthEnd = (): Moment => moment().endOf("month");

export function InventoryPage() {
  const { user } = useAuth();
  const [products, setProducts] = useState<Product[]>([]);
  const [adjustments, setAdjustments] = useState<InventoryAdjustment[]>([]);
  const [tab, setTab] = useState(0);
  const [open, setOpen] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  const [startDate, setStartDate] = useState<Moment>(getMonthStart);
  const [endDate, setEndDate] = useState<Moment>(getMonthEnd);
  const [adjPage, setAdjPage] = useState(0);
  const [adjRowsPerPage, setAdjRowsPerPage] = useState(50);
  const [adjTotal, setAdjTotal] = useState(0);

  const [form, setForm] = useState({
    product_id: "",
    adjustment_type: "add",
    quantity: "",
    reason: "",
  });

  const loadProducts = async () => {
    try {
      const prods = await ProductService.getAll();
      setProducts(prods);
    } catch (err) {
      setError(String(err));
    }
  };

  const loadAdjustments = async (
    currentPage = adjPage,
    currentRowsPerPage = adjRowsPerPage,
  ) => {
    try {
      const result = await InventoryService.getByDateRange(
        {
          start_date: startDate.format("YYYY-MM-DD") + " 00:00:00",
          end_date: endDate.format("YYYY-MM-DD") + " 23:59:59",
        },
        currentPage + 1,
        currentRowsPerPage,
      );
      setAdjustments(result.data);
      setAdjTotal(result.total);
    } catch (err) {
      setError(String(err));
    }
  };

  const handleAdjPageChange = (_: unknown, newPage: number) => {
    setAdjPage(newPage);
    loadAdjustments(newPage, adjRowsPerPage);
  };

  const handleAdjRowsPerPageChange = (
    e: React.ChangeEvent<HTMLInputElement>,
  ) => {
    const newRows = parseInt(e.target.value, 10);
    setAdjRowsPerPage(newRows);
    setAdjPage(0);
    loadAdjustments(0, newRows);
  };

  const loadData = async () => {
    await Promise.all([loadProducts(), loadAdjustments()]);
  };

  const handleAdjustment = async () => {
    if (!user) return;
    try {
      await InventoryService.create({
        product_id: parseInt(form.product_id),
        user_id: user.id,
        adjustment_type: form.adjustment_type as
          | "add"
          | "positive"
          | "negative",
        quantity: parseFloat(form.quantity),
        reason: form.reason || undefined,
      });
      setOpen(false);
      setForm({
        product_id: "",
        adjustment_type: "add",
        quantity: "",
        reason: "",
      });
      setSuccess("Ajuste realizado exitosamente");
      setTimeout(() => setSuccess(""), 3000);
      loadData();
    } catch (err) {
      setError(String(err));
    }
  };

  const getTypeChipStyle = (type: "add" | "positive" | "negative") => {
    if (type === "negative") {
      return {
        backgroundColor: "rgba(185,28,28,0.10)",
        color: "error.dark",
        fontWeight: 600,
      };
    }
    return {
      backgroundColor: "rgba(45,106,79,0.10)",
      color: "success.dark",
      fontWeight: 600,
    };
  };

  const getTypeLabel = (type: "add" | "positive" | "negative") => {
    switch (type) {
      case "add":
        return "Reabastecimiento";
      case "positive":
        return "Ajuste +";
      case "negative":
        return "Ajuste −";
      default:
        return "—";
    }
  };

  const getStockChipStyle = (product: Product) => {
    if (product.stock <= product.min_stock) {
      return {
        backgroundColor: "rgba(185,28,28,0.10)",
        color: "error.dark",
        fontWeight: 600,
      };
    }
    if (product.stock <= product.min_stock * 2) {
      return {
        backgroundColor: "rgba(193,125,17,0.10)",
        color: "warning.dark",
        fontWeight: 600,
      };
    }
    return {
      backgroundColor: "rgba(45,106,79,0.10)",
      color: "success.dark",
      fontWeight: 500,
    };
  };

  const lowStockProducts = products.filter(
    (p) => p.stock <= p.min_stock && p.active,
  );

  useEffect(() => {
    loadProducts();
  }, []);
  useEffect(() => {
    setAdjPage(0);
    loadAdjustments(0, adjRowsPerPage);
  }, [startDate, endDate]);

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
        <Typography variant="h5">Inventario</Typography>
        <Button
          variant="contained"
          size="small"
          startIcon={<Add fontSize="small" />}
          onClick={() => setOpen(true)}
        >
          Ajuste de Inventario
        </Button>
      </Box>

      {error && (
        <Alert severity="error" sx={{ mb: 2 }} onClose={() => setError("")}>
          {error}
        </Alert>
      )}
      {success && (
        <Alert severity="success" sx={{ mb: 2 }} onClose={() => setSuccess("")}>
          {success}
        </Alert>
      )}

      {lowStockProducts.length > 0 && (
        <Alert severity="warning" sx={{ mb: 2 }}>
          <strong>{lowStockProducts.length} producto(s) con stock bajo:</strong>{" "}
          {lowStockProducts.map((p) => p.name).join(", ")}
        </Alert>
      )}

      <Box
        sx={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          mb: 2,
          flexWrap: "wrap",
          gap: 1,
        }}
      >
        <Tabs value={tab} onChange={(_, v) => setTab(v)}>
          <Tab label="Stock Actual" />
          <Tab label="Historial de Ajustes" />
        </Tabs>
        {tab === 1 && (
          <Box sx={{ display: "flex", gap: 1.5, alignItems: "center" }}>
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
          </Box>
        )}
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
                <TableCell>Producto</TableCell>
                <TableCell>Código</TableCell>
                <TableCell>Categoría</TableCell>
                <TableCell align="right">Precio</TableCell>
                <TableCell align="right">Stock</TableCell>
                <TableCell align="right">Stock Mín.</TableCell>
                <TableCell>Estado</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {products.map((product) => (
                <TableRow
                  key={product.id}
                  hover
                  sx={{
                    backgroundColor:
                      product.stock <= product.min_stock
                        ? "rgba(185,28,28,0.03)"
                        : undefined,
                  }}
                >
                  <TableCell sx={{ fontWeight: 600 }}>{product.name}</TableCell>
                  <TableCell
                    sx={{
                      color: "text.secondary",
                      fontSize: "0.8125rem",
                      fontFamily: "monospace",
                    }}
                  >
                    {product.barcode || "—"}
                  </TableCell>
                  <TableCell sx={{ color: "text.secondary" }}>
                    {product.category_name || "—"}
                  </TableCell>
                  <TableCell
                    align="right"
                    sx={{ fontVariantNumeric: "tabular-nums" }}
                  >
                    {formatCurrency(product.price)}
                  </TableCell>
                  <TableCell align="right">
                    <Chip
                      label={`${product.stock} ${product.unit}`}
                      size="small"
                      sx={{
                        ...getStockChipStyle(product),
                        fontVariantNumeric: "tabular-nums",
                      }}
                    />
                  </TableCell>
                  <TableCell
                    align="right"
                    sx={{
                      color: "text.secondary",
                      fontVariantNumeric: "tabular-nums",
                    }}
                  >
                    {product.min_stock}
                  </TableCell>
                  <TableCell>
                    <Chip
                      label={product.active ? "Activo" : "Inactivo"}
                      size="small"
                      sx={
                        product.active
                          ? {
                              backgroundColor: "rgba(45,106,79,0.10)",
                              color: "success.dark",
                              fontWeight: 500,
                            }
                          : {
                              backgroundColor: "rgba(26,32,53,0.07)",
                              color: "text.secondary",
                            }
                      }
                    />
                  </TableCell>
                </TableRow>
              ))}
              {products.length === 0 && (
                <TableRow>
                  <TableCell
                    colSpan={7}
                    align="center"
                    sx={{ py: 4, color: "text.secondary" }}
                  >
                    No hay productos registrados
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </TableContainer>
      )}

      {tab === 1 && (
        <Paper elevation={0} sx={{ border: "1px solid rgba(26,32,53,0.10)" }}>
          <TableContainer>
            <Table size="small">
              <TableHead>
                <TableRow>
                  <TableCell>Fecha</TableCell>
                  <TableCell>Producto</TableCell>
                  <TableCell>Tipo</TableCell>
                  <TableCell align="right">Cantidad</TableCell>
                  <TableCell align="right">Stock Anterior</TableCell>
                  <TableCell align="right">Stock Nuevo</TableCell>
                  <TableCell>Razón</TableCell>
                  <TableCell>Usuario</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {adjustments.map((adj) => (
                  <TableRow key={adj.id} hover>
                    <TableCell
                      sx={{ fontSize: "0.8125rem", color: "text.secondary" }}
                    >
                      {moment(adj.created_at).format("DD/MM/YYYY hh:mm A")}
                    </TableCell>
                    <TableCell sx={{ fontWeight: 500 }}>
                      {adj.product_name}
                    </TableCell>
                    <TableCell>
                      <Chip
                        label={getTypeLabel(adj.adjustment_type)}
                        size="small"
                        sx={getTypeChipStyle(adj.adjustment_type)}
                      />
                    </TableCell>
                    <TableCell
                      align="right"
                      sx={{ fontVariantNumeric: "tabular-nums" }}
                    >
                      {adj.quantity}
                    </TableCell>
                    <TableCell
                      align="right"
                      sx={{
                        color: "text.secondary",
                        fontVariantNumeric: "tabular-nums",
                      }}
                    >
                      {adj.previous_stock}
                    </TableCell>
                    <TableCell
                      align="right"
                      sx={{
                        fontWeight: 600,
                        fontVariantNumeric: "tabular-nums",
                      }}
                    >
                      {adj.new_stock}
                    </TableCell>
                    <TableCell
                      sx={{ color: "text.secondary", fontSize: "0.8125rem" }}
                    >
                      {adj.reason || "—"}
                    </TableCell>
                    <TableCell sx={{ color: "text.secondary" }}>
                      {adj.user_name}
                    </TableCell>
                  </TableRow>
                ))}
                {adjustments.length === 0 && (
                  <TableRow>
                    <TableCell
                      colSpan={8}
                      align="center"
                      sx={{ py: 4, color: "text.secondary" }}
                    >
                      No hay ajustes en el rango seleccionado
                    </TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
          </TableContainer>
          <TablePagination
            component="div"
            count={adjTotal}
            page={adjPage}
            onPageChange={handleAdjPageChange}
            rowsPerPage={adjRowsPerPage}
            onRowsPerPageChange={handleAdjRowsPerPageChange}
            rowsPerPageOptions={[25, 50, 100]}
            labelRowsPerPage="Filas por página:"
            labelDisplayedRows={({ from, to, count }) =>
              `${from}–${to} de ${count}`
            }
          />
        </Paper>
      )}

      {/* Adjustment Dialog */}
      <Dialog
        open={open}
        onClose={() => setOpen(false)}
        maxWidth="sm"
        fullWidth
      >
        <DialogTitle>
          <Box sx={{ display: "flex", alignItems: "center", gap: 1 }}>
            <Inventory2 sx={{ fontSize: 20, color: "primary.main" }} />
            Ajuste de Inventario
          </Box>
        </DialogTitle>
        <DialogContent>
          <Box
            sx={{ display: "flex", flexDirection: "column", gap: 1.5, mt: 0.5 }}
          >
            <TextField
              select
              label="Producto"
              value={form.product_id}
              onChange={(e) => setForm({ ...form, product_id: e.target.value })}
              required
              fullWidth
              size="small"
            >
              {products
                .filter((p) => p.active)
                .map((p) => (
                  <MenuItem key={p.id} value={String(p.id)}>
                    {p.name} — Stock: {p.stock} {p.unit}
                  </MenuItem>
                ))}
            </TextField>
            <TextField
              select
              label="Tipo de ajuste"
              value={form.adjustment_type}
              onChange={(e) =>
                setForm({ ...form, adjustment_type: e.target.value })
              }
              required
              fullWidth
              size="small"
            >
              <MenuItem value="add">
                Agregar stock (compra / reabastecimiento)
              </MenuItem>
              <MenuItem value="positive">
                Ajuste positivo (conteo físico mayor)
              </MenuItem>
              <MenuItem value="negative">
                Ajuste negativo (conteo físico menor)
              </MenuItem>
            </TextField>
            <TextField
              label="Cantidad"
              type="number"
              value={form.quantity}
              onChange={(e) => setForm({ ...form, quantity: e.target.value })}
              required
              fullWidth
              size="small"
              slotProps={{ htmlInput: { step: "0.01", min: "0.01" } }}
            />
            <TextField
              label="Razón del ajuste (opcional)"
              value={form.reason}
              onChange={(e) => setForm({ ...form, reason: e.target.value })}
              fullWidth
              size="small"
              multiline
              rows={2}
            />
          </Box>
        </DialogContent>
        <DialogActions sx={{ px: 3, pb: 2.5, gap: 1 }}>
          <Button onClick={() => setOpen(false)} color="inherit">
            Cancelar
          </Button>
          <Button
            variant="contained"
            onClick={handleAdjustment}
            disabled={!form.product_id || !form.quantity}
          >
            Aplicar Ajuste
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
}
