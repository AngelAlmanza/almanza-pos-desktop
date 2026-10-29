import {
  Alert,
  Box,
  Button,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  FormControlLabel,
  MenuItem,
  Switch,
  TextField,
  Typography,
} from '@mui/material';
import { useEffect, useReducer, useState } from 'react';
import { ProductImageField } from '@modules/catalog/products/components/ProductImageField';
import {
  initialProductImageFieldState,
  productImageFieldReducer,
  toImageChange,
} from '@modules/catalog/products/utils/productImageField';
import { mapProductError, type ProductFormField } from '@modules/catalog/products/utils/productFormErrors';
import { UNITS } from '@modules/catalog/products/constants/Units';
import type { CreateProductDTO, Product, UpdateProductDTO } from '@modules/catalog/products/types';
import type { Category } from '@modules/catalog/categories/types';
import { ProductService } from '@modules/catalog/products/services/ProductService';
import type { ProductUnit } from '@modules/shared/types/base';
import { supportsBulkQuantityInput } from '@modules/shared/utils/unitConversion';

interface ProductFormDialogProps {
  open: boolean;
  editing: Product | null;
  categories: Category[];
  // Categoría preseleccionada al abrir un alta (la que está filtrada en el listado).
  defaultCategoryId: number | null;
  // Categoría recién creada desde este formulario; se selecciona sola.
  newCategoryId: number | null;
  onClose: () => void;
  onSaved: () => void;
  onRequestNewCategory: () => void;
}

interface FormState {
  name: string;
  description: string;
  barcode: string;
  price: string;
  unit: ProductUnit;
  is_bulk: boolean;
  category_id: string;
  stock: string;
  min_stock: string;
}

const NEW_CATEGORY_VALUE = '__new__';

const EMPTY_FORM: FormState = {
  name: '',
  description: '',
  barcode: '',
  price: '',
  unit: 'pieza',
  is_bulk: false,
  category_id: '',
  stock: '',
  min_stock: '',
};

export function ProductFormDialog({
  open,
  editing,
  categories,
  defaultCategoryId,
  newCategoryId,
  onClose,
  onSaved,
  onRequestNewCategory,
}: ProductFormDialogProps) {
  const [form, setForm] = useState<FormState>(EMPTY_FORM);
  const [fieldErrors, setFieldErrors] = useState<Partial<Record<ProductFormField, string>>>({});
  const [dialogError, setDialogError] = useState('');
  const [saving, setSaving] = useState(false);
  const [imageState, dispatchImage] = useReducer(
    productImageFieldReducer,
    null,
    () => initialProductImageFieldState(null),
  );

  // Se reinicia el formulario cada vez que se abre.
  useEffect(() => {
    if (!open) return;
    setDialogError('');
    setFieldErrors({});
    dispatchImage({ type: 'init', savedFile: editing?.image_file ?? null });
    if (editing) {
      setForm({
        name: editing.name,
        description: editing.description || '',
        barcode: editing.barcode || '',
        price: String(editing.price),
        unit: editing.unit,
        is_bulk: editing.is_bulk,
        category_id: editing.category_id ? String(editing.category_id) : '',
        stock: String(editing.stock),
        min_stock: String(editing.min_stock),
      });
    } else {
      setForm({
        ...EMPTY_FORM,
        category_id: defaultCategoryId !== null ? String(defaultCategoryId) : '',
      });
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, editing]);

  useEffect(() => {
    if (open && newCategoryId !== null) {
      setForm((prev) => ({ ...prev, category_id: String(newCategoryId) }));
    }
  }, [open, newCategoryId]);

  const update = (patch: Partial<FormState>) => {
    setForm((prev) => ({ ...prev, ...patch }));
  };

  const handleClose = () => {
    if (saving) return;
    // Cancelar descarta el cambio de imagen pendiente.
    dispatchImage({ type: 'cancel' });
    onClose();
  };

  const handleSave = async () => {
    // Evita el doble guardado (FR3.4).
    if (saving) return;
    setSaving(true);
    setDialogError('');
    setFieldErrors({});
    try {
      const image = toImageChange(imageState);
      if (editing) {
        const dto: UpdateProductDTO = {
          id: editing.id,
          name: form.name || undefined,
          description: form.description || undefined,
          barcode: form.barcode || undefined,
          price: form.price ? parseFloat(form.price) : undefined,
          unit: form.unit || undefined,
          is_bulk: form.is_bulk,
          category_id: form.category_id ? parseInt(form.category_id, 10) : undefined,
          min_stock: form.min_stock ? parseFloat(form.min_stock) : undefined,
          image,
        };
        await ProductService.update(dto);
      } else {
        const dto: CreateProductDTO = {
          name: form.name,
          description: form.description || undefined,
          barcode: form.barcode || undefined,
          price: parseFloat(form.price),
          unit: form.unit,
          is_bulk: form.is_bulk,
          category_id: form.category_id ? parseInt(form.category_id, 10) : undefined,
          stock: form.stock ? parseFloat(form.stock) : 0,
          min_stock: form.min_stock ? parseFloat(form.min_stock) : 0,
          image,
        };
        await ProductService.create(dto);
      }
      onSaved();
    } catch (err) {
      // El diálogo sigue abierto y conserva lo escrito y el cambio de imagen pendiente.
      const mapped = mapProductError(String(err));
      if (mapped.field) {
        setFieldErrors({ [mapped.field]: mapped.message });
      } else {
        setDialogError(mapped.message);
      }
    } finally {
      setSaving(false);
    }
  };

  const hasValidBulkUnit = !form.is_bulk || supportsBulkQuantityInput(form.unit);
  const stepValue = form.is_bulk ? '0.001' : '1';

  return (
    <Dialog open={open} onClose={handleClose} maxWidth="md" fullWidth>
      <DialogTitle>{editing ? 'Editar producto' : 'Nuevo producto'}</DialogTitle>
      <DialogContent>
        {dialogError && (
          <Alert
            severity="error"
            sx={{ mb: 1.5 }}
            onClose={() => setDialogError('')}
            data-testid="product-dialog-error"
          >
            {dialogError}
          </Alert>
        )}
        <Box
          sx={{ display: 'flex', flexDirection: { xs: 'column', md: 'row' }, gap: 2.5, mt: 0.5 }}
        >
          <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1.5, flex: 1, minWidth: 0 }}>
            <TextField
              label="Nombre"
              value={form.name}
              onChange={(e) => update({ name: e.target.value })}
              required
              fullWidth
              size="small"
              error={Boolean(fieldErrors.name)}
              helperText={fieldErrors.name}
            />
            <TextField
              label="Descripción"
              value={form.description}
              onChange={(e) => update({ description: e.target.value })}
              fullWidth
              size="small"
              multiline
              rows={2}
            />
            <TextField
              label="Código de barras"
              value={form.barcode}
              onChange={(e) => update({ barcode: e.target.value })}
              fullWidth
              size="small"
              error={Boolean(fieldErrors.barcode)}
              helperText={fieldErrors.barcode}
            />
            <Box sx={{ display: 'flex', gap: 1.5 }}>
              <TextField
                label="Precio"
                type="number"
                value={form.price}
                onChange={(e) => update({ price: e.target.value })}
                required
                sx={{ flex: 1 }}
                size="small"
                error={Boolean(fieldErrors.price)}
                helperText={fieldErrors.price}
                slotProps={{ htmlInput: { step: '0.01', min: '0' } }}
              />
              <TextField
                select
                label="Unidad"
                value={form.unit}
                onChange={(e) => update({ unit: e.target.value as ProductUnit })}
                sx={{ flex: 1 }}
                size="small"
              >
                {UNITS.map((u) => (
                  <MenuItem key={u} value={u}>
                    {u}
                  </MenuItem>
                ))}
              </TextField>
            </Box>
            <Box
              sx={{
                px: 1.5,
                py: 1,
                border: '1px solid',
                borderColor: 'divider',
                borderRadius: 1.5,
              }}
            >
              <FormControlLabel
                sx={{ m: 0, alignItems: 'flex-start' }}
                control={
                  <Switch
                    size="small"
                    checked={form.is_bulk}
                    onChange={(e) => update({ is_bulk: e.target.checked })}
                  />
                }
                label={
                  <Box sx={{ ml: 0.5 }}>
                    <Typography variant="body2" fontWeight={600}>
                      Producto a granel
                    </Typography>
                    <Typography variant="caption" color="text.secondary">
                      Permite capturar la venta por {form.unit}, subunidad o monto.
                    </Typography>
                  </Box>
                }
              />
            </Box>
            {form.is_bulk && !hasValidBulkUnit && (
              <Alert severity="warning">
                Los productos a granel deben usar kg, litro o metro como unidad base.
              </Alert>
            )}
            <TextField
              select
              label="Categoría"
              value={form.category_id}
              onChange={(e) => {
                if (e.target.value === NEW_CATEGORY_VALUE) {
                  onRequestNewCategory();
                  return;
                }
                update({ category_id: e.target.value });
              }}
              fullWidth
              size="small"
            >
              <MenuItem value="">Sin categoría</MenuItem>
              {categories.map((cat) => (
                <MenuItem key={cat.id} value={String(cat.id)}>
                  {cat.name}
                </MenuItem>
              ))}
              <MenuItem value={NEW_CATEGORY_VALUE} data-testid="product-new-category">
                + Nueva categoría
              </MenuItem>
            </TextField>
            {!editing ? (
              <Box sx={{ display: 'flex', gap: 1.5 }}>
                <TextField
                  label="Stock inicial"
                  type="number"
                  value={form.stock}
                  onChange={(e) => update({ stock: e.target.value })}
                  sx={{ flex: 1 }}
                  size="small"
                  slotProps={{ htmlInput: { step: stepValue, min: '0' } }}
                />
                <TextField
                  label="Stock mínimo"
                  type="number"
                  value={form.min_stock}
                  onChange={(e) => update({ min_stock: e.target.value })}
                  sx={{ flex: 1 }}
                  size="small"
                  slotProps={{ htmlInput: { step: stepValue, min: '0' } }}
                />
              </Box>
            ) : (
              <TextField
                label="Stock mínimo"
                type="number"
                value={form.min_stock}
                onChange={(e) => update({ min_stock: e.target.value })}
                fullWidth
                size="small"
                slotProps={{ htmlInput: { step: stepValue, min: '0' } }}
              />
            )}
          </Box>
          <Box sx={{ width: { xs: '100%', md: 240 }, flexShrink: 0 }}>
            <ProductImageField state={imageState} dispatch={dispatchImage} saving={saving} />
          </Box>
        </Box>
      </DialogContent>
      <DialogActions sx={{ px: 3, pb: 2.5, gap: 1 }}>
        <Button onClick={handleClose} color="inherit" disabled={saving} data-testid="product-cancel">
          Cancelar
        </Button>
        <Button
          variant="contained"
          onClick={() => void handleSave()}
          disabled={saving || !form.name || !form.price || !hasValidBulkUnit}
          data-testid="product-save"
        >
          {editing ? 'Guardar' : 'Crear'}
        </Button>
      </DialogActions>
    </Dialog>
  );
}
