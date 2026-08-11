import { PrinterSettingsCard } from '@modules/settings/components/PrinterSettingsCard';
import { SettingRow } from '@modules/settings/components/SettingRow';
import { IS_DEV, VALUE_TYPE_OPTIONS } from '@modules/settings/constants/Settings';
import { SettingService } from '@modules/settings/services/SettingService';
import type { Setting, SettingValueType } from '@modules/settings/types';
import {
  Add,
  Business,
  CreditScore,
  Receipt,
  Settings as SettingsIcon,
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
  Typography,
} from '@mui/material';
import { open as openFileDialog } from '@tauri-apps/plugin-dialog';
import { useEffect, useReducer, useState, type ReactNode } from 'react';

interface GroupMeta {
  label: string;
  description: string;
  icon: ReactNode;
}

const GROUP_META: Record<string, GroupMeta> = {
  general: {
    label: 'Datos del negocio',
    description: 'La información que aparece en tus comprobantes y documentos.',
    icon: <Business sx={{ fontSize: 20 }} />,
  },
  ticket: {
    label: 'Ticket de venta',
    description: 'Personaliza el mensaje que recibe tu cliente después de pagar.',
    icon: <Receipt sx={{ fontSize: 20 }} />,
  },
  fiados: {
    label: 'Crédito a clientes',
    description: 'Define las reglas para las ventas que se pagan después.',
    icon: <CreditScore sx={{ fontSize: 20 }} />,
  },
  sistema: {
    label: 'Operación del sistema',
    description: 'Preferencias generales para el funcionamiento diario de tu caja.',
    icon: <SettingsIcon sx={{ fontSize: 20 }} />,
  },
};

interface EditState {
  editing: string | null;
  draft: string;
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
  const [editState, dispatch] = useReducer(editReducer, { editing: null, draft: '' });
  const [addOpenGroup, setAddOpenGroup] = useState<string | null>(null);
  const [newForm, setNewForm] = useState<NewSettingForm>(emptyForm(''));
  const [addSaving, setAddSaving] = useState(false);

  async function load() {
    setLoading(true);
    try {
      const data = await SettingService.getAll();
      setSettings(data);
      const imageKeys = data.filter(setting => setting.value_type === 'image_path').map(setting => setting.key);
      const entries = await Promise.all(
        imageKeys.map(async key => {
          const image = await SettingService.getImage(key).catch(() => null);
          return [key, image] as [string, string | null];
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
      const updated = await SettingService.update({ key: setting.key, value: editState.draft || null });
      setSettings(previous => previous.map(item => (item.key === updated.key ? updated : item)));
      dispatch({ type: 'done' });
      showToast('Cambio guardado', 'success');
    } catch (error) {
      showToast(String(error), 'error');
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
      setLogoImages(previous => ({ ...previous, [key]: dataUrl }));
      setSettings(await SettingService.getAll());
      showToast('Logo guardado', 'success');
    } catch (error) {
      showToast(String(error), 'error');
    } finally {
      setSavingKey(null);
    }
  }

  async function handleDelete(key: string) {
    try {
      await SettingService.delete(key);
      setSettings(previous => previous.filter(setting => setting.key !== key));
      showToast('Configuración eliminada', 'success');
    } catch (error) {
      showToast(String(error), 'error');
    }
  }

  async function handleCreate() {
    if (!newForm.key.trim() || !newForm.label.trim()) return;
    setAddSaving(true);
    try {
      const created = await SettingService.create({
        key: newForm.key.trim(),
        label: newForm.label.trim(),
        value_type: newForm.value_type,
        description: newForm.description.trim() || undefined,
        group_name: newForm.group_name,
      });
      setSettings(previous => [...previous, created]);
      setAddOpenGroup(null);
      showToast('Configuración creada', 'success');
    } catch (error) {
      showToast(String(error), 'error');
    } finally {
      setAddSaving(false);
    }
  }

  function showToast(msg: string, severity: 'success' | 'error') {
    setToast({ msg, severity });
  }

  const grouped = settings.reduce<Record<string, Setting[]>>((groups, setting) => {
    if (setting.group_name !== 'printer') {
      (groups[setting.group_name] ??= []).push(setting);
    }
    return groups;
  }, {});
  const groupKeys = Object.keys(grouped).sort();

  useEffect(() => {
    void load();
  }, []);

  if (loading) {
    return (
      <Box sx={{ display: 'flex', justifyContent: 'center', pt: 8 }}>
        <CircularProgress size={32} />
      </Box>
    );
  }

  return (
    <Box sx={{ pb: 4 }}>
      <Box sx={{ mb: 3 }}>
        <Typography
          sx={{ color: 'primary.main', fontSize: '0.75rem', fontWeight: 700, letterSpacing: '0.08em', textTransform: 'uppercase', mb: 0.75 }}
        >
          Administración de tu tienda
        </Typography>
        <Typography variant="h4" sx={{ fontWeight: 700, letterSpacing: '-0.02em', color: 'text.primary' }}>
          Configuración
        </Typography>
        <Typography sx={{ mt: 0.75, color: 'text.secondary', fontSize: '0.95rem', maxWidth: 650 }}>
          Personaliza cómo trabaja tu caja, cómo se ven tus tickets y la información de tu negocio.
        </Typography>
      </Box>

      <Paper
        elevation={0}
        sx={{ border: '1px solid rgba(26,32,53,0.10)', backgroundColor: '#f5f3f0', p: { xs: 2, sm: 2.5 }, mb: 3 }}
      >
        <Typography sx={{ fontSize: '0.875rem', fontWeight: 700, color: 'text.primary' }}>
          Ajustes organizados por tarea
        </Typography>
        <Typography sx={{ fontSize: '0.8125rem', color: 'text.secondary', mt: 0.25, mb: 1.5 }}>
          Elige una sección para ubicar rápidamente lo que necesitas cambiar.
        </Typography>
        <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 1 }}>
          <Button size="small" variant="outlined" href="#settings-printer">Impresión de tickets</Button>
          {groupKeys.map(group => {
            const meta = GROUP_META[group] ?? {
              label: group.charAt(0).toUpperCase() + group.slice(1),
              description: 'Ajustes de esta sección.',
              icon: <SettingsIcon sx={{ fontSize: 20 }} />,
            };
            return <Button key={group} size="small" variant="outlined" href={`#settings-${group}`}>{meta.label}</Button>;
          })}
        </Box>
      </Paper>

      <Box sx={{ display: 'flex', flexDirection: 'column', gap: 3 }}>
        <Box id="settings-printer">
          <PrinterSettingsCard onToast={showToast} />
        </Box>

        {groupKeys.map(group => {
          const rows = grouped[group];
          const meta = GROUP_META[group] ?? {
            label: group.charAt(0).toUpperCase() + group.slice(1),
            description: 'Ajustes de esta sección.',
            icon: <SettingsIcon sx={{ fontSize: 20 }} />,
          };
          const isAddOpen = addOpenGroup === group;

          return (
            <Paper key={group} id={`settings-${group}`} elevation={0} sx={{ border: '1px solid rgba(26,32,53,0.10)', overflow: 'hidden', scrollMarginTop: 24 }}>
              <Box sx={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: 2, px: { xs: 2, sm: 3 }, py: 2.5, backgroundColor: '#f5f3f0', borderBottom: '1px solid rgba(26,32,53,0.10)' }}>
                <Box sx={{ display: 'flex', alignItems: 'flex-start', gap: 1.5 }}>
                  <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'center', width: 36, height: 36, borderRadius: 1.5, backgroundColor: 'rgba(13,107,95,0.10)', color: 'primary.main', flexShrink: 0 }}>
                    {meta.icon}
                  </Box>
                  <Box>
                    <Typography sx={{ fontSize: '1rem', fontWeight: 700, color: 'text.primary' }}>{meta.label}</Typography>
                    <Typography sx={{ fontSize: '0.8125rem', color: 'text.secondary', mt: 0.25 }}>{meta.description}</Typography>
                  </Box>
                </Box>
                {IS_DEV && (
                  <Tooltip title="Nueva configuración">
                    <IconButton
                      size="small"
                      onClick={() => { setAddOpenGroup(isAddOpen ? null : group); setNewForm(emptyForm(group)); }}
                      sx={{ color: 'primary.main', border: '1px solid rgba(13,107,95,0.22)', borderRadius: 1.5 }}
                    >
                      <Add sx={{ fontSize: 18 }} />
                    </IconButton>
                  </Tooltip>
                )}
              </Box>

              {rows.map((setting, index) => (
                <SettingRow
                  key={setting.key}
                  setting={setting}
                  isLast={index === rows.length - 1 && !IS_DEV && !isAddOpen}
                  isEditing={editState.editing === setting.key}
                  draft={editState.editing === setting.key ? editState.draft : ''}
                  isSaving={savingKey === setting.key}
                  imagePreview={logoImages[setting.key] ?? null}
                  isDev={IS_DEV}
                  onStartEdit={() => dispatch({ type: 'start', key: setting.key, value: setting.value ?? '' })}
                  onChangeDraft={value => dispatch({ type: 'change', value })}
                  onSave={() => void saveEdit(setting)}
                  onCancel={() => dispatch({ type: 'cancel' })}
                  onImageUpload={() => void handleImageUpload(setting.key)}
                  onDelete={() => void handleDelete(setting.key)}
                />
              ))}

              <Collapse in={IS_DEV && isAddOpen}>
                <Box sx={{ px: 3, py: 2.5, borderTop: '1px solid rgba(26,32,53,0.08)', backgroundColor: 'rgba(13,107,95,0.03)', display: 'flex', flexDirection: 'column', gap: 1.5 }}>
                  <Typography sx={{ fontSize: '0.875rem', fontWeight: 700, color: 'primary.main' }}>Nueva configuración</Typography>
                  <Box sx={{ display: 'flex', gap: 1.5, flexWrap: 'wrap' }}>
                    <TextField label="Clave (key)" size="small" value={newForm.key} onChange={event => setNewForm(form => ({ ...form, key: event.target.value }))} sx={{ flex: '1 1 160px' }} slotProps={{ htmlInput: { style: { fontFamily: 'monospace', fontSize: 13 } } }} />
                    <TextField label="Etiqueta" size="small" value={newForm.label} onChange={event => setNewForm(form => ({ ...form, label: event.target.value }))} sx={{ flex: '1 1 160px' }} />
                    <Select size="small" value={newForm.value_type} onChange={event => setNewForm(form => ({ ...form, value_type: event.target.value as SettingValueType }))} sx={{ flex: '1 1 130px', fontSize: '0.875rem' }}>
                      {VALUE_TYPE_OPTIONS.map(option => <MenuItem key={option.value} value={option.value} dense>{option.label}</MenuItem>)}
                    </Select>
                  </Box>
                  <TextField label="Descripción (opcional)" size="small" value={newForm.description} onChange={event => setNewForm(form => ({ ...form, description: event.target.value }))} fullWidth />
                  <Box sx={{ display: 'flex', gap: 1, justifyContent: 'flex-end' }}>
                    <Button size="small" onClick={() => setAddOpenGroup(null)} sx={{ color: 'text.secondary' }}>Cancelar</Button>
                    <Button size="small" variant="contained" disableElevation onClick={() => void handleCreate()} disabled={!newForm.key.trim() || !newForm.label.trim() || addSaving}>
                      {addSaving ? <CircularProgress size={14} color="inherit" /> : 'Crear'}
                    </Button>
                  </Box>
                </Box>
              </Collapse>
            </Paper>
          );
        })}
      </Box>

      <Snackbar open={!!toast} autoHideDuration={3000} onClose={() => setToast(null)} anchorOrigin={{ vertical: 'bottom', horizontal: 'center' }}>
        <Alert severity={toast?.severity} onClose={() => setToast(null)} variant="filled" sx={{ fontSize: '0.8125rem' }}>{toast?.msg}</Alert>
      </Snackbar>
    </Box>
  );
}
