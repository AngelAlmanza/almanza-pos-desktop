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
  MenuItem,
  Alert,
  Chip,
  Tabs,
  Tab,
} from '@mui/material';
import { Add, Inventory2 } from '@mui/icons-material';
import { ProductService } from '../services/ProductService';
import { InventoryService } from '../services/InventoryService';
import { useAuth } from '../context/AuthContext';
import type { Product, InventoryAdjustment } from '../models';

export function InventoryPage() {
  const { user } = useAuth();
  const [products, setProducts] = useState<Product[]>([]);
  const [adjustments, setAdjustments] = useState<InventoryAdjustment[]>([]);
  const [tab, setTab] = useState(0);
  const [open, setOpen] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  const [form, setForm] = useState({
    product_id: '',
    adjustment_type: 'add',
    quantity: '',
    reason: '',
  });

  const loadData = async () => {
    try {
      const [prods, adjs] = await Promise.all([
        ProductService.getAll(),
        InventoryService.getAll(),
      ]);
      setProducts(prods);
      setAdjustments(adjs);
    } catch (err) {
      setError(String(err));
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  const handleAdjustment = async () => {
    if (!user) return;
    try {
      await InventoryService.create({
        product_id: parseInt(form.product_id),
        user_id: user.id,
        adjustment_type: form.adjustment_type as 'add' | 'positive' | 'negative',
        quantity: parseFloat(form.quantity),
        reason: form.reason || undefined,
      });
      setOpen(false);
      setForm({ product_id: '', adjustment_type: 'add', quantity: '', reason: '' });
      setSuccess('Ajuste de inventario realizado exitosamente');
      setTimeout(() => setSuccess(''), 3000);
      loadData();
    } catch (err) {
      setError(String(err));
    }
  };

  const lowStockProducts = products.filter(p => p.stock <= p.min_stock && p.active);

  return (
    <Box>
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3 }}>
        <Typography variant="h5">Inventario</Typography>
        <Button variant="contained" startIcon={<Add />} onClick={() => setOpen(true)}>
          Ajuste de Inventario
        </Button>
      </Box>

      {error && <Alert severity="error" sx={{ mb: 2 }} onClose={() => setError('')}>{error}</Alert>}
      {success && <Alert severity="success" sx={{ mb: 2 }} onClose={() => setSuccess('')}>{success}</Alert>}

      {lowStockProducts.length > 0 && (
        <Alert severity="warning" sx={{ mb: 2 }}>
          {lowStockProducts.length} producto(s) con stock bajo: {lowStockProducts.map(p => p.name).join(', ')}
        </Alert>
      )}

      <Box sx={{ mb: 2 }}>
        <Tabs value={tab} onChange={(_, v) => setTab(v)}>
          <Tab label="Stock Actual" />
          <Tab label="Historial de Ajustes" />
        </Tabs>
      </Box>

      {tab === 0 && (
        <TableContainer component={Paper}>
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
                <TableRow key={product.id} hover sx={{
                  backgroundColor: product.stock <= product.min_stock ? 'error.50' : undefined,
                }}>
                  <TableCell sx={{ fontWeight: 600 }}>{product.name}</TableCell>
                  <TableCell>{product.barcode || '-'}</TableCell>
                  <TableCell>{product.category_name || '-'}</TableCell>
                  <TableCell align="right">${product.price.toFixed(2)}</TableCell>
                  <TableCell align="right">
                    <Chip
                      label={`${product.stock} ${product.unit}`}
                      size="small"
                      color={product.stock <= product.min_stock ? 'error' : product.stock <= product.min_stock * 2 ? 'warning' : 'success'}
                    />
                  </TableCell>
                  <TableCell align="right">{product.min_stock}</TableCell>
                  <TableCell>
                    <Chip
                      label={product.active ? 'Activo' : 'Inactivo'}
                      size="small"
                      color={product.active ? 'success' : 'default'}
                    />
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </TableContainer>
      )}

      {tab === 1 && (
        <TableContainer component={Paper}>
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
                  <TableCell>{new Date(adj.created_at).toLocaleString()}</TableCell>
                  <TableCell>{adj.product_name}</TableCell>
                  <TableCell>
                    <Chip
                      label={adj.adjustment_type === 'add' ? 'Agregar' : adj.adjustment_type === 'positive' ? 'Ajuste +' : 'Ajuste -'}
                      size="small"
                      color={adj.adjustment_type === 'negative' ? 'error' : 'success'}
                    />
                  </TableCell>
                  <TableCell align="right">{adj.quantity}</TableCell>
                  <TableCell align="right">{adj.previous_stock}</TableCell>
                  <TableCell align="right">{adj.new_stock}</TableCell>
                  <TableCell>{adj.reason || '-'}</TableCell>
                  <TableCell>{adj.user_name}</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </TableContainer>
      )}

      {/* Adjustment Dialog */}
      <Dialog open={open} onClose={() => setOpen(false)} maxWidth="sm" fullWidth>
        <DialogTitle>
          <Inventory2 sx={{ mr: 1, verticalAlign: 'middle' }} />
          Ajuste de Inventario
        </DialogTitle>
        <DialogContent>
          <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2, mt: 1 }}>
            <TextField
              select
              label="Producto"
              value={form.product_id}
              onChange={(e) => setForm({ ...form, product_id: e.target.value })}
              required
              fullWidth
            >
              {products.filter(p => p.active).map((p) => (
                <MenuItem key={p.id} value={String(p.id)}>
                  {p.name} (Stock actual: {p.stock})
                </MenuItem>
              ))}
            </TextField>
            <TextField
              select
              label="Tipo de ajuste"
              value={form.adjustment_type}
              onChange={(e) => setForm({ ...form, adjustment_type: e.target.value })}
              required
              fullWidth
            >
              <MenuItem value="add">Agregar stock (compra/reabastecimiento)</MenuItem>
              <MenuItem value="positive">Ajuste positivo (inventario físico mayor)</MenuItem>
              <MenuItem value="negative">Ajuste negativo (inventario físico menor)</MenuItem>
            </TextField>
            <TextField
              label="Cantidad"
              type="number"
              value={form.quantity}
              onChange={(e) => setForm({ ...form, quantity: e.target.value })}
              required
              fullWidth
              inputProps={{ step: '0.01', min: '0.01' }}
            />
            <TextField
              label="Razón del ajuste"
              value={form.reason}
              onChange={(e) => setForm({ ...form, reason: e.target.value })}
              fullWidth
              multiline
              rows={2}
            />
          </Box>
        </DialogContent>
        <DialogActions sx={{ px: 3, pb: 2 }}>
          <Button onClick={() => setOpen(false)}>Cancelar</Button>
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
