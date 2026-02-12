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
import { UserService } from '../services/UserService';
import type { User } from '../models';

export function UsersPage() {
  const [users, setUsers] = useState<User[]>([]);
  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState<User | null>(null);
  const [error, setError] = useState('');
  const [form, setForm] = useState({
    username: '',
    password: '',
    full_name: '',
    role: 'cashier' as 'admin' | 'cashier',
  });

  const loadUsers = async () => {
    try {
      const data = await UserService.getAll();
      setUsers(data);
    } catch (err) {
      setError(String(err));
    }
  };

  useEffect(() => {
    loadUsers();
  }, []);

  const handleOpen = (user?: User) => {
    if (user) {
      setEditing(user);
      setForm({
        username: user.username,
        password: '',
        full_name: user.full_name,
        role: user.role,
      });
    } else {
      setEditing(null);
      setForm({ username: '', password: '', full_name: '', role: 'cashier' });
    }
    setOpen(true);
  };

  const handleSave = async () => {
    try {
      if (editing) {
        await UserService.update({
          id: editing.id,
          username: form.username !== editing.username ? form.username : undefined,
          password: form.password || undefined,
          full_name: form.full_name !== editing.full_name ? form.full_name : undefined,
          role: form.role !== editing.role ? form.role : undefined,
        });
      } else {
        await UserService.create(form);
      }
      setOpen(false);
      loadUsers();
    } catch (err) {
      setError(String(err));
    }
  };

  const handleToggleActive = async (user: User) => {
    try {
      await UserService.update({ id: user.id, active: !user.active });
      loadUsers();
    } catch (err) {
      setError(String(err));
    }
  };

  const handleDelete = async (id: number) => {
    if (!confirm('¿Eliminar este usuario?')) return;
    try {
      await UserService.delete(id);
      loadUsers();
    } catch (err) {
      setError(String(err));
    }
  };

  return (
    <Box>
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3 }}>
        <Typography variant="h5">Usuarios</Typography>
        <Button variant="contained" startIcon={<Add />} onClick={() => handleOpen()}>
          Nuevo Usuario
        </Button>
      </Box>

      {error && <Alert severity="error" sx={{ mb: 2 }} onClose={() => setError('')}>{error}</Alert>}

      <TableContainer component={Paper}>
        <Table>
          <TableHead>
            <TableRow>
              <TableCell>ID</TableCell>
              <TableCell>Usuario</TableCell>
              <TableCell>Nombre</TableCell>
              <TableCell>Rol</TableCell>
              <TableCell>Estado</TableCell>
              <TableCell>Creado</TableCell>
              <TableCell align="center">Acciones</TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {users.map((user) => (
              <TableRow key={user.id} hover>
                <TableCell>{user.id}</TableCell>
                <TableCell sx={{ fontWeight: 600 }}>{user.username}</TableCell>
                <TableCell>{user.full_name}</TableCell>
                <TableCell>
                  <Chip
                    label={user.role === 'admin' ? 'Administrador' : 'Cajero'}
                    size="small"
                    color={user.role === 'admin' ? 'warning' : 'primary'}
                  />
                </TableCell>
                <TableCell>
                  <Switch
                    size="small"
                    checked={user.active}
                    onChange={() => handleToggleActive(user)}
                  />
                </TableCell>
                <TableCell>{new Date(user.created_at).toLocaleDateString()}</TableCell>
                <TableCell align="center">
                  <IconButton size="small" onClick={() => handleOpen(user)}><Edit fontSize="small" /></IconButton>
                  <IconButton size="small" color="error" onClick={() => handleDelete(user.id)}><Delete fontSize="small" /></IconButton>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </TableContainer>

      <Dialog open={open} onClose={() => setOpen(false)} maxWidth="sm" fullWidth>
        <DialogTitle>{editing ? 'Editar Usuario' : 'Nuevo Usuario'}</DialogTitle>
        <DialogContent>
          <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2, mt: 1 }}>
            <TextField
              label="Nombre completo"
              value={form.full_name}
              onChange={(e) => setForm({ ...form, full_name: e.target.value })}
              required
              fullWidth
            />
            <TextField
              label="Usuario"
              value={form.username}
              onChange={(e) => setForm({ ...form, username: e.target.value })}
              required
              fullWidth
            />
            <TextField
              label={editing ? 'Nueva contraseña (dejar vacío para no cambiar)' : 'Contraseña'}
              type="password"
              value={form.password}
              onChange={(e) => setForm({ ...form, password: e.target.value })}
              required={!editing}
              fullWidth
            />
            <TextField
              select
              label="Rol"
              value={form.role}
              onChange={(e) => setForm({ ...form, role: e.target.value as 'admin' | 'cashier' })}
              required
              fullWidth
            >
              <MenuItem value="admin">Administrador</MenuItem>
              <MenuItem value="cashier">Cajero</MenuItem>
            </TextField>
          </Box>
        </DialogContent>
        <DialogActions sx={{ px: 3, pb: 2 }}>
          <Button onClick={() => setOpen(false)}>Cancelar</Button>
          <Button
            variant="contained"
            onClick={handleSave}
            disabled={!form.username || !form.full_name || (!editing && !form.password)}
          >
            {editing ? 'Guardar' : 'Crear'}
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
}
