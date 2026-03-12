import {
  Add,
  Business,
  Receipt,
  Settings as SettingsIcon
} from '@mui/icons-material';
import {
  Alert,
  Box,
  Button,
  CircularProgress,
  Collapse,
  IconButton,
  MenuItem,
  Paper,
  Select,
  Snackbar,
  TextField,
  Tooltip,
  Typography
} from '@mui/material';
import { open as openFileDialog } from '@tauri-apps/plugin-dialog';
import { useEffect, useReducer, useState } from 'react';
import { SettingRow } from '../components/settings/SettingRow';
import { IS_DEV, VALUE_TYPE_OPTIONS } from '../constants/Settings';
import type { CreateSettingDTO } from '../dto';
import type { Setting, SettingValueType } from '../models';
import { SettingService } from '../services/SettingService';

// ─── constants ────────────────────────────────────────────────────────────────

const GROUP_META: Record<string, { label: string; icon: React.ReactNode }> = {
  general: { label: 'Datos del Negocio', icon: <Business sx={{ fontSize: 15 }} /> },
  ticket: { label: 'Ticket', icon: <Receipt sx={{ fontSize: 15 }} /> },
  sistema: { label: 'Sistema', icon: <SettingsIcon sx={{ fontSize: 15 }} /> },
};

// ─── row-level edit state ──────────────────────────────────────────────────────

interface EditState {
  editing: string | null; // key currently being edited
  draft: string;          // draft value for the active edit
}

type EditAction =
  | { type: 'start'; key: string; value: string }
  | { type: 'change'; value: string }
  | { type: 'cancel' }
  | { type: 'done' };

function editReducer(state: EditState, action: EditAction): EditState {
  switch (action.type) {
    case 'start':
      return { editing: action.key, draft: action.value };
    case 'change':
      return { ...state, draft: action.value };
    case 'cancel':
    case 'done':
      return { editing: null, draft: '' };
  }
}

interface NewSettingForm {
  key: string;
  label: string;
  value_type: SettingValueType;
  description: string;
  group_name: string;
}

const emptyForm = (group: string): NewSettingForm => ({
  key: '',
  label: '',
  value_type: 'string',
  description: '',
  group_name: group,
});

export function SettingsPage() {
  const [settings, setSettings] = useState<Setting[]>([]);
  const [loading, setLoading] = useState(true);
  const [logoImages, setLogoImages] = useState<Record<string, string | null>>({});
  const [savingKey, setSavingKey] = useState<string | null>(null);
  const [toast, setToast] = useState<{ msg: string; severity: 'success' | 'error' } | null>(null);

  // inline edit
  const [editState, dispatch] = useReducer(editReducer, { editing: null, draft: '' });

  // which group has its "add" form open (dev only)
  const [addOpenGroup, setAddOpenGroup] = useState<string | null>(null);
  const [newForm, setNewForm] = useState<NewSettingForm>(emptyForm(''));
  const [addSaving, setAddSaving] = useState(false);

  async function load() {
    setLoading(true);
    try {
      const data = await SettingService.getAll();
      setSettings(data);
      // load image previews for image_path settings
      const imageKeys = data.filter(s => s.value_type === 'image_path').map(s => s.key);
      const entries = await Promise.all(
        imageKeys.map(async k => {
          const img = await SettingService.getImage(k).catch(() => null);
          return [k, img] as [string, string | null];
        }),
      );
      setLogoImages(Object.fromEntries(entries));
    } catch {
      showToast('Error al cargar configuraciones', 'error');
    } finally {
      setLoading(false);
    }
  }

  async function saveEdit(setting: Setting) {
    setSavingKey(setting.key);
    try {
      const updated = await SettingService.update({
        key: setting.key,
        value: editState.draft || null,
      });
      setSettings(prev => prev.map(s => (s.key === updated.key ? updated : s)));
      dispatch({ type: 'done' });
      showToast('Guardado', 'success');
    } catch (e) {
      showToast(String(e), 'error');
    } finally {
      setSavingKey(null);
    }
  }

  async function handleImageUpload(key: string) {
    const selected = await openFileDialog({
      multiple: false,
      filters: [{ name: 'Imagen', extensions: ['png', 'jpg', 'jpeg', 'webp', 'gif', 'svg'] }],
    });
    if (!selected || typeof selected !== 'string') return;

    setSavingKey(key);
    try {
      const dataUrl = await SettingService.saveImage(key, selected);
      setLogoImages(prev => ({ ...prev, [key]: dataUrl }));
      // refresh the setting record (value = stored path)
      const updated = await SettingService.getAll();
      setSettings(updated);
      showToast('Imagen guardada', 'success');
    } catch (e) {
      showToast(String(e), 'error');
    } finally {
      setSavingKey(null);
    }
  }

  async function handleDelete(key: string) {
    try {
      await SettingService.delete(key);
      setSettings(prev => prev.filter(s => s.key !== key));
      showToast('Eliminado', 'success');
    } catch (e) {
      showToast(String(e), 'error');
    }
  }

  async function handleCreate() {
    if (!newForm.key.trim() || !newForm.label.trim()) return;
    setAddSaving(true);
    try {
      const dto: CreateSettingDTO = {
        key: newForm.key.trim(),
        label: newForm.label.trim(),
        value_type: newForm.value_type,
        description: newForm.description.trim() || undefined,
        group_name: newForm.group_name,
      };
      const created = await SettingService.create(dto);
      setSettings(prev => [...prev, created]);
      setAddOpenGroup(null);
      showToast('Configuración creada', 'success');
    } catch (e) {
      showToast(String(e), 'error');
    } finally {
      setAddSaving(false);
    }
  }

  function showToast(msg: string, severity: 'success' | 'error') {
    setToast({ msg, severity });
  }

  const grouped = settings.reduce<Record<string, Setting[]>>((acc, s) => {
    (acc[s.group_name] ??= []).push(s);
    return acc;
  }, {});

  const groupKeys = Object.keys(grouped).sort();

  useEffect(() => {
    load();
  }, []);

  if (loading) {
    return (
      <Box sx={{ display: 'flex', justifyContent: 'center', pt: 8 }}>
        <CircularProgress size={32} />
      </Box>
    );
  }

  return (
    <Box>
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3 }}>
        <Typography variant="h5">Configuración</Typography>
      </Box>

      <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
        {groupKeys.map(group => {
          const rows = grouped[group];
          const meta = GROUP_META[group] ?? {
            label: group.charAt(0).toUpperCase() + group.slice(1),
            icon: <SettingsIcon sx={{ fontSize: 15 }} />,
          };
          const isAddOpen = addOpenGroup === group;

          return (
            <Paper
              key={group}
              elevation={0}
              sx={{ border: '1px solid rgba(26,32,53,0.10)', overflow: 'hidden' }}
            >
              {/* Group header — same tokens as MuiTableHead */}
              <Box
                sx={{
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  px: 2.5,
                  py: 1.25,
                  backgroundColor: '#f5f3f0',
                  borderBottom: '1px solid rgba(26,32,53,0.12)',
                }}
              >
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                  <Box sx={{ color: 'text.disabled' }}>{meta.icon}</Box>
                  <Typography
                    sx={{
                      fontSize: '0.7rem',
                      fontWeight: 600,
                      letterSpacing: '0.07em',
                      textTransform: 'uppercase',
                      color: 'text.secondary',
                    }}
                  >
                    {meta.label}
                  </Typography>
                </Box>

                {IS_DEV && (
                  <Tooltip title="Nueva configuración">
                    <IconButton
                      size="small"
                      onClick={() => {
                        setAddOpenGroup(isAddOpen ? null : group);
                        setNewForm(emptyForm(group));
                      }}
                      sx={{ color: 'primary.main', p: 0.5 }}
                    >
                      <Add sx={{ fontSize: 16 }} />
                    </IconButton>
                  </Tooltip>
                )}
              </Box>

              {/* Setting rows */}
              {rows.map((setting, idx) => (
                <SettingRow
                  key={setting.key}
                  setting={setting}
                  isLast={idx === rows.length - 1 && !IS_DEV && !isAddOpen}
                  isEditing={editState.editing === setting.key}
                  draft={editState.editing === setting.key ? editState.draft : ''}
                  isSaving={savingKey === setting.key}
                  imagePreview={logoImages[setting.key] ?? null}
                  isDev={IS_DEV}
                  onStartEdit={() =>
                    dispatch({ type: 'start', key: setting.key, value: setting.value ?? '' })
                  }
                  onChangeDraft={v => dispatch({ type: 'change', value: v })}
                  onSave={() => saveEdit(setting)}
                  onCancel={() => dispatch({ type: 'cancel' })}
                  onImageUpload={() => handleImageUpload(setting.key)}
                  onDelete={() => handleDelete(setting.key)}
                />
              ))}

              {/* Add new form (dev only) */}
              <Collapse in={IS_DEV && isAddOpen}>
                <Box
                  sx={{
                    px: 2.5,
                    py: 2,
                    borderTop: '1px solid rgba(26,32,53,0.08)',
                    backgroundColor: 'rgba(13,107,95,0.03)',
                    display: 'flex',
                    flexDirection: 'column',
                    gap: 1.5,
                  }}
                >
                  <Typography
                    sx={{ fontSize: '0.75rem', fontWeight: 600, color: 'primary.main' }}
                  >
                    Nueva configuración
                  </Typography>
                  <Box sx={{ display: 'flex', gap: 1.5, flexWrap: 'wrap' }}>
                    <TextField
                      label="Clave (key)"
                      size="small"
                      value={newForm.key}
                      onChange={e => setNewForm(f => ({ ...f, key: e.target.value }))}
                      sx={{ flex: '1 1 160px' }}
                      slotProps={{ htmlInput: { style: { fontFamily: 'monospace', fontSize: 13 } } }}
                    />
                    <TextField
                      label="Etiqueta"
                      size="small"
                      value={newForm.label}
                      onChange={e => setNewForm(f => ({ ...f, label: e.target.value }))}
                      sx={{ flex: '1 1 160px' }}
                    />
                    <Select
                      size="small"
                      value={newForm.value_type}
                      onChange={e =>
                        setNewForm(f => ({ ...f, value_type: e.target.value as SettingValueType }))
                      }
                      sx={{ flex: '1 1 130px', fontSize: '0.875rem' }}
                    >
                      {VALUE_TYPE_OPTIONS.map(o => (
                        <MenuItem key={o.value} value={o.value} dense>
                          {o.label}
                        </MenuItem>
                      ))}
                    </Select>
                  </Box>
                  <TextField
                    label="Descripción (opcional)"
                    size="small"
                    value={newForm.description}
                    onChange={e => setNewForm(f => ({ ...f, description: e.target.value }))}
                    fullWidth
                  />
                  <Box sx={{ display: 'flex', gap: 1, justifyContent: 'flex-end' }}>
                    <Button
                      size="small"
                      onClick={() => setAddOpenGroup(null)}
                      sx={{ color: 'text.secondary' }}
                    >
                      Cancelar
                    </Button>
                    <Button
                      size="small"
                      variant="contained"
                      disableElevation
                      onClick={handleCreate}
                      disabled={!newForm.key.trim() || !newForm.label.trim() || addSaving}
                    >
                      {addSaving ? <CircularProgress size={14} /> : 'Crear'}
                    </Button>
                  </Box>
                </Box>
              </Collapse>
            </Paper>
          );
        })}
      </Box>

      {/* Toast */}
      <Snackbar
        open={!!toast}
        autoHideDuration={3000}
        onClose={() => setToast(null)}
        anchorOrigin={{ vertical: 'bottom', horizontal: 'center' }}
      >
        <Alert
          severity={toast?.severity}
          onClose={() => setToast(null)}
          variant="filled"
          sx={{ fontSize: '0.8125rem' }}
        >
          {toast?.msg}
        </Alert>
      </Snackbar>
    </Box>
  );
}
