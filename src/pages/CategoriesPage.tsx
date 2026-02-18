import { Add, Delete, Edit } from '@mui/icons-material';
import {
  Alert,
  Box,
  Button,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  IconButton,
  Paper,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  TextField,
  Typography,
} from '@mui/material';
import moment from 'moment';
import { useEffect, useState } from 'react';
import { ConfirmModal } from '../components/ConfirmModal';
import type { CreateCategoryDTO, UpdateCategoryDTO } from '../dto';
import type { Category } from '../models';
import { CategoryService } from '../services/CategoryService';
import { cleanError } from '../utils/CleanError';

moment.locale('es');

export function CategoriesPage() {
  const [categories, setCategories] = useState<Category[]>([]);
  const [open, setOpen] = useState(false);
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [confirmId, setConfirmId] = useState<number | null>(null);
  const [editing, setEditing] = useState<Category | null>(null);
  const [error, setError] = useState('');

  const [form, setForm] = useState({ name: '', description: '' });

  const loadData = async () => {
    try {
      const cats = await CategoryService.getAll();
      setCategories(cats);
    } catch (err) {
      setError(String(err));
    }
  };

  const resetForm = () => {
    setForm({ name: '', description: '' });
    setEditing(null);
  };

  const handleOpen = (category?: Category) => {
    if (category) {
      setEditing(category);
      setForm({
        name: category.name,
        description: category.description || '',
      });
    } else {
      resetForm();
    }
    setOpen(true);
  };

  const handleClose = () => {
    setOpen(false);
    resetForm();
  };

  const handleSave = async () => {
    try {
      if (editing) {
        const dto: UpdateCategoryDTO = {
          id: editing.id,
          name: form.name || undefined,
          description: form.description || undefined,
        };
        await CategoryService.update(dto);
      } else {
        const dto: CreateCategoryDTO = {
          name: form.name,
          description: form.description || undefined,
        };
        await CategoryService.create(dto);
      }
      setOpen(false);
      resetForm();
      loadData();
    } catch (err) {
      setError(String(err));
    } finally {
      cleanError(setError);
    }
  };

  const handleDelete = (id: number) => {
    setConfirmId(id);
    setConfirmOpen(true);
  };

  const handleConfirmDelete = async () => {
    if (!confirmId) return;
    try {
      await CategoryService.delete(confirmId);
      loadData();
    } catch (err) {
      setError(String(err));
    } finally {
      setConfirmOpen(false);
      setConfirmId(null);
      cleanError(setError);
    }
  };

  const handleCloseConfirm = () => {
    setConfirmOpen(false);
    setConfirmId(null);
  };

  useEffect(() => {
    loadData();
  }, []);

  return (
    <Box>
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3 }}>
        <Typography variant="h5">Categorías</Typography>
        <Button variant="contained" startIcon={<Add />} onClick={() => handleOpen()}>
          Nueva Categoría
        </Button>
      </Box>

      {error && (
        <Alert severity="error" sx={{ mb: 2 }} onClose={() => setError('')}>
          {error}
        </Alert>
      )}

      <TableContainer component={Paper}>
        <Table size="small">
          <TableHead>
            <TableRow>
              <TableCell>Nombre</TableCell>
              <TableCell>Descripción</TableCell>
              <TableCell>Fecha de creación</TableCell>
              <TableCell align="center">Acciones</TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {categories.map((category) => (
              <TableRow key={category.id} hover>
                <TableCell>
                  <Typography variant="body2" fontWeight={600}>
                    {category.name}
                  </Typography>
                </TableCell>
                <TableCell>
                  <Typography variant="body2" color="text.secondary">
                    {category.description || '-'}
                  </Typography>
                </TableCell>
                <TableCell>
                  <Typography variant="body2" color="text.secondary">
                    {moment(category.created_at).format('DD/MM/YYYY')}
                  </Typography>
                </TableCell>
                <TableCell align="center">
                  <IconButton size="small" onClick={() => handleOpen(category)}>
                    <Edit fontSize="small" />
                  </IconButton>
                  <IconButton size="small" color="error" onClick={() => handleDelete(category.id)}>
                    <Delete fontSize="small" />
                  </IconButton>
                </TableCell>
              </TableRow>
            ))}
            {categories.length === 0 && (
              <TableRow>
                <TableCell colSpan={4} align="center" sx={{ py: 4 }}>
                  <Typography color="text.secondary">No hay categorías registradas</Typography>
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </TableContainer>

      <Dialog open={open} onClose={handleClose} maxWidth="xs" fullWidth>
        <DialogTitle>{editing ? 'Editar Categoría' : 'Nueva Categoría'}</DialogTitle>
        <DialogContent>
          <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2, mt: 1 }}>
            <TextField
              label="Nombre"
              value={form.name}
              onChange={(e) => setForm({ ...form, name: e.target.value })}
              fullWidth
              required
            />
            <TextField
              label="Descripción"
              value={form.description}
              onChange={(e) => setForm({ ...form, description: e.target.value })}
              fullWidth
              multiline
              rows={3}
            />
          </Box>
        </DialogContent>
        <DialogActions sx={{ px: 3, pb: 2 }}>
          <Button onClick={handleClose}>Cancelar</Button>
          <Button variant="contained" onClick={handleSave} disabled={!form.name}>
            {editing ? 'Guardar' : 'Crear'}
          </Button>
        </DialogActions>
      </Dialog>

      <ConfirmModal
        open={confirmOpen}
        onClose={handleCloseConfirm}
        onConfirm={handleConfirmDelete}
        title="Confirmar eliminación"
        message="¿Estás seguro de querer eliminar esta categoría? Si tiene productos asociados, se marcarán como sin categoría."
      />
    </Box>
  );
}
