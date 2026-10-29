import {
  Alert,
  Box,
  Button,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  TextField,
} from '@mui/material';
import { useEffect, useState } from 'react';
import type { Category } from '@modules/catalog/categories/types';
import { CategoryService } from '@modules/catalog/categories/services/CategoryService';

interface CategoryFormDialogProps {
  open: boolean;
  editing: Category | null;
  onClose: () => void;
  // Recibe la categoría guardada (creada o editada).
  onSaved: (category: Category) => void;
}

export function CategoryFormDialog({ open, editing, onClose, onSaved }: CategoryFormDialogProps) {
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [error, setError] = useState('');
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (!open) return;
    setName(editing?.name ?? '');
    setDescription(editing?.description ?? '');
    setError('');
  }, [open, editing]);

  const handleSave = async () => {
    if (saving) return;
    setSaving(true);
    setError('');
    try {
      const saved = editing
        ? await CategoryService.update({
            id: editing.id,
            name: name || undefined,
            description: description || undefined,
          })
        : await CategoryService.create({ name, description: description || undefined });
      onSaved(saved);
    } catch (err) {
      setError(String(err));
    } finally {
      setSaving(false);
    }
  };

  return (
    <Dialog open={open} onClose={saving ? undefined : onClose} maxWidth="xs" fullWidth>
      <DialogTitle>{editing ? 'Editar categoría' : 'Nueva categoría'}</DialogTitle>
      <DialogContent>
        <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1.5, mt: 0.5 }}>
          {error && (
            <Alert severity="error" onClose={() => setError('')} data-testid="category-dialog-error">
              {error}
            </Alert>
          )}
          <TextField
            label="Nombre"
            value={name}
            onChange={(e) => setName(e.target.value)}
            fullWidth
            size="small"
            required
          />
          <TextField
            label="Descripción"
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            fullWidth
            size="small"
            multiline
            rows={2}
          />
        </Box>
      </DialogContent>
      <DialogActions sx={{ px: 3, pb: 2.5, gap: 1 }}>
        <Button onClick={onClose} color="inherit" disabled={saving}>
          Cancelar
        </Button>
        <Button
          variant="contained"
          onClick={() => void handleSave()}
          disabled={saving || !name.trim()}
          data-testid="category-save"
        >
          {editing ? 'Guardar' : 'Crear'}
        </Button>
      </DialogActions>
    </Dialog>
  );
}
