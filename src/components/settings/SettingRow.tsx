import { Check, Close, Delete, Edit } from "@mui/icons-material";
import { Box, Chip, CircularProgress, IconButton, TextField, Tooltip, Typography } from "@mui/material";
import { Setting } from "../../models";
import { ImageField } from "./ImageField";

interface SettingRowProps {
  setting: Setting;
  isLast: boolean;
  isEditing: boolean;
  draft: string;
  isSaving: boolean;
  imagePreview: string | null;
  isDev: boolean;
  onStartEdit: () => void;
  onChangeDraft: (v: string) => void;
  onSave: () => void;
  onCancel: () => void;
  onImageUpload: () => void;
  onDelete: () => void;
}

export const SettingRow = ({
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
}: SettingRowProps) => {
  const isImageType = setting.value_type === 'image_path';
  const isMultiline = setting.value_type === 'multiline';

  return (
    <Box
      sx={{
        display: 'flex',
        alignItems: isEditing && isMultiline ? 'flex-start' : 'center',
        px: 2.5,
        py: isEditing ? 1.5 : 1,
        gap: 2,
        borderBottom: isLast ? 'none' : '1px solid rgba(26,32,53,0.08)',
        backgroundColor: isEditing ? 'rgba(13,107,95,0.04)' : 'transparent',
        transition: 'background-color 150ms ease',
        '&:hover': !isEditing
          ? { backgroundColor: 'rgba(13,107,95,0.04)' }
          : undefined,
      }}
    >
      {/* Label column */}
      <Box sx={{ flex: '0 0 180px', minWidth: 0 }}>
        <Typography
          sx={{ fontSize: '0.8125rem', fontWeight: 500, color: 'text.primary', lineHeight: 1.3 }}
        >
          {setting.label}
        </Typography>
        {setting.description && (
          <Typography sx={{ fontSize: '0.7rem', color: 'text.disabled', mt: 0.25 }}>
            {setting.description}
          </Typography>
        )}
        {isDev && (
          <Chip
            label={setting.key}
            size="small"
            sx={{
              mt: 0.5,
              height: 16,
              fontSize: '0.8rem',
              fontFamily: 'monospace',
              color: 'text.disabled',
              borderColor: 'rgba(0,0,0,0.12)',
              '& .MuiChip-label': { px: 0.75 },
            }}
            variant="outlined"
          />
        )}
      </Box>

      {/* Value column */}
      <Box sx={{ flex: 1, minWidth: 0 }}>
        {isImageType ? (
          <ImageField
            preview={imagePreview}
            isSaving={isSaving}
            onUpload={onImageUpload}
          />
        ) : isEditing ? (
          <TextField
            size="small"
            fullWidth
            multiline={isMultiline}
            minRows={isMultiline ? 3 : undefined}
            maxRows={isMultiline ? 6 : undefined}
            value={draft}
            onChange={e => onChangeDraft(e.target.value)}
            autoFocus
            onKeyDown={e => {
              if (e.key === 'Enter' && !isMultiline) {
                e.preventDefault();
                onSave();
              }
              if (e.key === 'Escape') onCancel();
            }}
            sx={{
              '& .MuiInputBase-input': { fontSize: '0.875rem', py: 0.75 },
              '& .MuiOutlinedInput-root': {
                '& fieldset': { borderColor: 'primary.main' },
              },
            }}
          />
        ) : (
          <Typography
            onClick={onStartEdit}
            sx={{
              fontSize: '0.875rem',
              color: setting.value ? 'text.secondary' : 'text.disabled',
              cursor: 'text',
              borderRadius: 1,
              px: 0.5,
              py: 0.25,
              mx: -0.5,
              whiteSpace: 'pre-wrap',
              wordBreak: 'break-word',
              '&:hover': {
                backgroundColor: 'rgba(26,32,53,0.05)',
                color: 'text.primary',
              },
            }}
          >
            {setting.value || <em style={{ opacity: 0.45 }}>Sin valor</em>}
          </Typography>
        )}
      </Box>

      {/* Action column */}
      <Box
        sx={{
          flex: '0 0 auto',
          display: 'flex',
          alignItems: 'center',
          gap: 0.5,
          alignSelf: isEditing && isMultiline ? 'flex-start' : 'center',
          mt: isEditing && isMultiline ? 0.5 : 0,
        }}
      >
        {!isImageType && (
          <>
            {isEditing ? (
              <>
                <Tooltip title="Guardar (Enter)">
                  <span>
                    <IconButton
                      size="small"
                      onClick={onSave}
                      disabled={isSaving}
                      sx={{
                        color: 'primary.main',
                        p: 0.5,
                        '&:hover': { backgroundColor: 'primary.50' },
                      }}
                    >
                      {isSaving ? (
                        <CircularProgress size={14} />
                      ) : (
                        <Check sx={{ fontSize: 16 }} />
                      )}
                    </IconButton>
                  </span>
                </Tooltip>
                <Tooltip title="Cancelar (Esc)">
                  <IconButton
                    size="small"
                    onClick={onCancel}
                    sx={{ color: 'text.disabled', p: 0.5 }}
                  >
                    <Close sx={{ fontSize: 16 }} />
                  </IconButton>
                </Tooltip>
              </>
            ) : (
              <Tooltip title="Editar">
                <IconButton
                  size="small"
                  onClick={onStartEdit}
                  sx={{
                    color: 'text.disabled',
                    p: 0.5,
                    opacity: 0,
                    '.MuiBox-root:hover &': { opacity: 1 },
                    '&:hover': { color: 'primary.main', opacity: 1 },
                  }}
                >
                  <Edit sx={{ fontSize: 15 }} />
                </IconButton>
              </Tooltip>
            )}
          </>
        )}

        {isDev && !isEditing && (
          <Tooltip title="Eliminar">
            <IconButton
              size="small"
              onClick={onDelete}
              sx={{
                color: 'text.disabled',
                p: 0.5,
                opacity: 0,
                '.MuiBox-root:hover &': { opacity: 1 },
                '&:hover': { color: 'error.main', opacity: 1 },
              }}
            >
              <Delete sx={{ fontSize: 15 }} />
            </IconButton>
          </Tooltip>
        )}
      </Box>
    </Box>
  );
}