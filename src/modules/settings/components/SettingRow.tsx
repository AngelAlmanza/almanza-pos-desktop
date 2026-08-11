import type { Setting } from '@modules/settings/types';
import { Check, Close, Delete, Edit } from '@mui/icons-material';
import { Box, Button, Chip, CircularProgress, IconButton, TextField, Tooltip, Typography } from '@mui/material';
import { ImageField } from './ImageField';

interface SettingRowProps {
  setting: Setting;
  isLast: boolean;
  isEditing: boolean;
  draft: string;
  isSaving: boolean;
  imagePreview: string | null;
  isDev: boolean;
  onStartEdit: () => void;
  onChangeDraft: (value: string) => void;
  onSave: () => void;
  onCancel: () => void;
  onImageUpload: () => void;
  onDelete: () => void;
}

export function SettingRow({
  setting,
  isLast,
  isEditing,
  draft,
  isSaving,
  imagePreview,
  isDev,
  onStartEdit,
  onChangeDraft,
  onSave,
  onCancel,
  onImageUpload,
  onDelete,
}: SettingRowProps) {
  const isImageType = setting.value_type === 'image_path';
  const isMultiline = setting.value_type === 'multiline';

  return (
    <Box
      sx={{
        display: 'grid',
        gridTemplateColumns: { xs: '1fr', md: 'minmax(210px, 0.7fr) minmax(260px, 1.3fr) auto' },
        alignItems: isEditing && isMultiline ? 'start' : 'center',
        gap: { xs: 1.25, md: 3 },
        px: { xs: 2, sm: 3 },
        py: isEditing ? 2.5 : 2,
        borderBottom: isLast ? 'none' : '1px solid rgba(26,32,53,0.08)',
        backgroundColor: isEditing ? 'rgba(13,107,95,0.045)' : 'transparent',
        transition: 'background-color 150ms ease',
        '&:hover': !isEditing ? { backgroundColor: 'rgba(13,107,95,0.025)' } : undefined,
      }}
    >
      <Box>
        <Typography sx={{ fontSize: '0.9375rem', fontWeight: 700, color: 'text.primary', lineHeight: 1.35 }}>
          {setting.label}
        </Typography>
        {setting.description && (
          <Typography sx={{ fontSize: '0.8125rem', color: 'text.secondary', mt: 0.4, lineHeight: 1.45 }}>
            {setting.description}
          </Typography>
        )}
        {isDev && (
          <Chip
            label={setting.key}
            size="small"
            variant="outlined"
            sx={{ mt: 0.75, height: 19, fontSize: '0.7rem', fontFamily: 'monospace', color: 'text.secondary', borderColor: 'rgba(26,32,53,0.14)' }}
          />
        )}
      </Box>

      <Box sx={{ minWidth: 0 }}>
        {isImageType ? (
          <ImageField preview={imagePreview} isSaving={isSaving} onUpload={onImageUpload} />
        ) : isEditing ? (
          <TextField
            size="small"
            fullWidth
            multiline={isMultiline}
            minRows={isMultiline ? 3 : undefined}
            maxRows={isMultiline ? 6 : undefined}
            value={draft}
            onChange={event => onChangeDraft(event.target.value)}
            autoFocus
            onKeyDown={event => {
              if (event.key === 'Enter' && !isMultiline) {
                event.preventDefault();
                onSave();
              }
              if (event.key === 'Escape') onCancel();
            }}
            sx={{
              '& .MuiInputBase-input': { fontSize: '0.9375rem', py: 1 },
              '& .MuiOutlinedInput-root': { backgroundColor: '#fff' },
            }}
          />
        ) : (
          <Box
            onClick={onStartEdit}
            sx={{
              minHeight: 42,
              display: 'flex',
              alignItems: 'center',
              px: 1.5,
              py: 0.75,
              borderRadius: 1.5,
              backgroundColor: '#f5f3f0',
              cursor: 'text',
              transition: 'background-color 150ms ease',
              '&:hover': { backgroundColor: 'rgba(13,107,95,0.09)' },
            }}
          >
            <Typography sx={{ fontSize: '0.9375rem', color: setting.value ? 'text.primary' : 'text.secondary', whiteSpace: 'pre-wrap', wordBreak: 'break-word', lineHeight: 1.45 }}>
              {setting.value || <em>Aún sin configurar</em>}
            </Typography>
          </Box>
        )}
      </Box>

      <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: { xs: 'flex-start', md: 'flex-end' }, gap: 0.5, minWidth: { md: 88 } }}>
        {!isImageType && (isEditing ? (
          <>
            <Tooltip title="Guardar cambio (Enter)">
              <span>
                <IconButton size="small" onClick={onSave} disabled={isSaving} sx={{ color: 'primary.main', border: '1px solid rgba(13,107,95,0.22)' }}>
                  {isSaving ? <CircularProgress size={16} /> : <Check sx={{ fontSize: 18 }} />}
                </IconButton>
              </span>
            </Tooltip>
            <Tooltip title="Cancelar (Esc)">
              <IconButton size="small" onClick={onCancel} sx={{ color: 'text.secondary' }}><Close sx={{ fontSize: 18 }} /></IconButton>
            </Tooltip>
          </>
        ) : (
          <Button size="small" variant="text" startIcon={<Edit sx={{ fontSize: 16 }} />} onClick={onStartEdit} sx={{ whiteSpace: 'nowrap' }}>
            Editar
          </Button>
        ))}

        {isDev && !isEditing && (
          <Tooltip title="Eliminar">
            <IconButton size="small" onClick={onDelete} sx={{ color: 'text.disabled', '&:hover': { color: 'error.main' } }}>
              <Delete sx={{ fontSize: 17 }} />
            </IconButton>
          </Tooltip>
        )}
      </Box>
    </Box>
  );
}
