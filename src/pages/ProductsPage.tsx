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
  IconButton,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  TextField,
  MenuItem,
  Alert,
  Chip,
  Switch,
} from '@mui/material';
import { Add, Edit, Delete } from '@mui/icons-material';
import { ProductService } from '../services/ProductService';
import { CategoryService } from '../services/CategoryService';
import type { Product, Category } from '../models';
import type { CreateProductDTO, UpdateProductDTO } from '../dto';

export function ProductsPage() {
  const [products, setProducts] = useState<Product[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState<Product | null>(null);
  const [error, setError] = useState('');
  const [catOpen, setCatOpen] = useState(false);
  const [catName, setCatName] = useState('');
  const [catDesc, setCatDesc] = useState('');

  const [form, setForm] = useState({
    name: '',
    description: '',
    barcode: '',
    price: '',
    unit: 'pieza',
    category_id: '',
    stock: '',
    min_stock: '',
  });

  const loadData = async () => {
    try {
      const [prods, cats] = await Promise.all([
        ProductService.getAll(),
        CategoryService.getAll(),
      ]);
      setProducts(prods);
      setCategories(cats);
    } catch (err) {
      setError(String(err));
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  const resetForm = () => {
    setForm({ name: '', description: '', barcode: '', price: '', unit: 'pieza', category_id: '', stock: '', min_stock: '' });
    setEditing(null);
  };

  const handleOpen = (product?: Product) => {
    if (product) {
      setEditing(product);
      setForm({
        name: product.name,
        description: product.description || '',
        barcode: product.barcode || '',
        price: String(product.price),
        unit: product.unit,
        category_id: product.category_id ? String(product.category_id) : '',
        stock: String(product.stock),
        min_stock: String(product.min_stock),
      });
    } else {
      resetForm();
    }
    setOpen(true);
  };

  const handleSave = async () => {
    try {
      if (editing) {
        const dto: UpdateProductDTO = {
          id: editing.id,
          name: form.name || undefined,
          description: form.description || undefined,
          barcode: form.barcode || undefined,
          price: form.price ? parseFloat(form.price) : undefined,
          unit: form.unit || undefined,
          category_id: form.category_id ? parseInt(form.category_id) : undefined,
          min_stock: form.min_stock ? parseFloat(form.min_stock) : undefined,
        };
        await ProductService.update(dto);
      } else {
        const dto: CreateProductDTO = {
          name: form.name,
          description: form.description || undefined,
          barcode: form.barcode || undefined,
          price: parseFloat(form.price),
          unit: form.unit,
          category_id: form.category_id ? parseInt(form.category_id) : undefined,
          stock: form.stock ? parseFloat(form.stock) : 0,
          min_stock: form.min_stock ? parseFloat(form.min_stock) : 0,
        };
        await ProductService.create(dto);
      }
      setOpen(false);
      resetForm();
      loadData();
    } catch (err) {
      setError(String(err));
    }
  };

  const handleDelete = async (id: number) => {
    if (!confirm('¿Eliminar este producto?')) return;
    try {
      await ProductService.delete(id);
      loadData();
    } catch (err) {
      setError(String(err));
    }
  };

  const handleToggleActive = async (product: Product) => {
    try {
      await ProductService.update({ id: product.id, active: !product.active });
      loadData();
    } catch (err) {
      setError(String(err));
    }
  };

  const handleAddCategory = async () => {
    try {
      await CategoryService.create({ name: catName, description: catDesc || undefined });
      setCatOpen(false);
      setCatName('');
      setCatDesc('');
      loadData();
    } catch (err) {
      setError(String(err));
    }
  };

  const units = ['pieza', 'kg', 'litro', 'metro', 'paquete', 'caja', 'otro'];

  return (
    <Box>
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3 }}>
        <Typography variant="h5">Productos</Typography>
        <Box sx={{ display: 'flex', gap: 1 }}>
          <Button variant="outlined" onClick={() => setCatOpen(true)}>+ Categoría</Button>
          <Button variant="contained" startIcon={<Add />} onClick={() => handleOpen()}>
            Nuevo Producto
          </Button>
        </Box>
      </Box>

      {error && <Alert severity="error" sx={{ mb: 2 }} onClose={() => setError('')}>{error}</Alert>}

      <TableContainer component={Paper}>
        <Table size="small">
          <TableHead>
            <TableRow>
              <TableCell>Nombre</TableCell>
              <TableCell>Código</TableCell>
              <TableCell>Categoría</TableCell>
              <TableCell align="right">Precio</TableCell>
              <TableCell>Unidad</TableCell>
              <TableCell align="right">Stock</TableCell>
              <TableCell>Estado</TableCell>
              <TableCell align="center">Acciones</TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {products.map((product) => (
              <TableRow key={product.id} hover>
                <TableCell>
                  <Typography variant="body2" fontWeight={600}>{product.name}</Typography>
                  {product.description && (
                    <Typography variant="caption" color="text.secondary">{product.description}</Typography>
                  )}
                </TableCell>
                <TableCell>{product.barcode || '-'}</TableCell>
                <TableCell>{product.category_name || '-'}</TableCell>
                <TableCell align="right" sx={{ fontWeight: 600 }}>${product.price.toFixed(2)}</TableCell>
                <TableCell>{product.unit}</TableCell>
                <TableCell align="right">
                  <Chip
                    label={product.stock}
                    size="small"
                    color={product.stock <= product.min_stock ? 'error' : 'default'}
                  />
                </TableCell>
                <TableCell>
                  <Switch
                    size="small"
                    checked={product.active}
                    onChange={() => handleToggleActive(product)}
                  />
                </TableCell>
                <TableCell align="center">
                  <IconButton size="small" onClick={() => handleOpen(product)}><Edit fontSize="small" /></IconButton>
                  <IconButton size="small" color="error" onClick={() => handleDelete(product.id)}><Delete fontSize="small" /></IconButton>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </TableContainer>

      {/* Product Dialog */}
      <Dialog open={open} onClose={() => setOpen(false)} maxWidth="sm" fullWidth>
        <DialogTitle>{editing ? 'Editar Producto' : 'Nuevo Producto'}</DialogTitle>
        <DialogContent>
          <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2, mt: 1 }}>
            <TextField label="Nombre" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} required fullWidth />
            <TextField label="Descripción" value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} fullWidth multiline rows={2} />
            <TextField label="Código de barras" value={form.barcode} onChange={(e) => setForm({ ...form, barcode: e.target.value })} fullWidth />
            <Box sx={{ display: 'flex', gap: 2 }}>
              <TextField label="Precio" type="number" value={form.price} onChange={(e) => setForm({ ...form, price: e.target.value })} required sx={{ flex: 1 }} inputProps={{ step: '0.01', min: '0' }} />
              <TextField select label="Unidad" value={form.unit} onChange={(e) => setForm({ ...form, unit: e.target.value })} sx={{ flex: 1 }}>
                {units.map((u) => <MenuItem key={u} value={u}>{u}</MenuItem>)}
              </TextField>
            </Box>
            <TextField select label="Categoría" value={form.category_id} onChange={(e) => setForm({ ...form, category_id: e.target.value })} fullWidth>
              <MenuItem value="">Sin categoría</MenuItem>
              {categories.map((cat) => <MenuItem key={cat.id} value={String(cat.id)}>{cat.name}</MenuItem>)}
            </TextField>
            {!editing && (
              <Box sx={{ display: 'flex', gap: 2 }}>
                <TextField label="Stock inicial" type="number" value={form.stock} onChange={(e) => setForm({ ...form, stock: e.target.value })} sx={{ flex: 1 }} inputProps={{ step: '0.01', min: '0' }} />
                <TextField label="Stock mínimo" type="number" value={form.min_stock} onChange={(e) => setForm({ ...form, min_stock: e.target.value })} sx={{ flex: 1 }} inputProps={{ step: '0.01', min: '0' }} />
              </Box>
            )}
            {editing && (
              <TextField label="Stock mínimo" type="number" value={form.min_stock} onChange={(e) => setForm({ ...form, min_stock: e.target.value })} fullWidth inputProps={{ step: '0.01', min: '0' }} />
            )}
          </Box>
        </DialogContent>
        <DialogActions sx={{ px: 3, pb: 2 }}>
          <Button onClick={() => setOpen(false)}>Cancelar</Button>
          <Button variant="contained" onClick={handleSave} disabled={!form.name || !form.price}>
            {editing ? 'Guardar' : 'Crear'}
          </Button>
        </DialogActions>
      </Dialog>

      {/* Category Dialog */}
      <Dialog open={catOpen} onClose={() => setCatOpen(false)} maxWidth="xs" fullWidth>
        <DialogTitle>Nueva Categoría</DialogTitle>
        <DialogContent>
          <TextField label="Nombre" value={catName} onChange={(e) => setCatName(e.target.value)} fullWidth sx={{ mt: 1, mb: 2 }} required />
          <TextField label="Descripción" value={catDesc} onChange={(e) => setCatDesc(e.target.value)} fullWidth multiline rows={2} />
        </DialogContent>
        <DialogActions sx={{ px: 3, pb: 2 }}>
          <Button onClick={() => setCatOpen(false)}>Cancelar</Button>
          <Button variant="contained" onClick={handleAddCategory} disabled={!catName}>Crear</Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
}
