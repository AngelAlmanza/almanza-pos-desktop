import { UploadFile } from "@mui/icons-material";
import { Box, Button, CircularProgress, Typography } from "@mui/material";

interface ImageFieldProps {
  preview: string | null;
  isSaving: boolean;
  onUpload: () => void;
}

export const ImageField = ({ preview, isSaving, onUpload }: ImageFieldProps) => {
  return (
    <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5 }}>
      {preview ? (
        <Box
          component="img"
          src={preview}
          alt="Logo"
          sx={{
            height: 48,
            maxWidth: 120,
            objectFit: 'contain',
            border: '1px solid rgba(26,32,53,0.10)',
            borderRadius: 1,
            p: 0.5,
            backgroundColor: '#fafafa',
          }}
        />
      ) : (
        <Box
          sx={{
            width: 64,
            height: 48,
            border: '1px dashed rgba(26,32,53,0.18)',
            borderRadius: 1,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            backgroundColor: 'rgba(0,0,0,0.02)',
          }}
        >
          <Typography sx={{ fontSize: '0.65rem', color: 'text.disabled' }}>Sin logo</Typography>
        </Box>
      )}
      <Button
        size="small"
        variant="outlined"
        startIcon={isSaving ? <CircularProgress size={12} /> : <UploadFile sx={{ fontSize: 14 }} />}
        onClick={onUpload}
        disabled={isSaving}
        sx={{ fontSize: '0.75rem', py: 0.5, px: 1.25 }}
      >
        {preview ? 'Cambiar' : 'Subir logo'}
      </Button>
    </Box>
  );
}