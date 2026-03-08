import { PointOfSale, Visibility, VisibilityOff } from '@mui/icons-material';
import {
  Alert,
  Box,
  Button,
  Card,
  CardContent,
  IconButton,
  InputAdornment,
  TextField,
  Typography
} from '@mui/material';
import { SubmitEvent, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';

export function LoginPage() {
  const { login } = useAuth();
  const navigate = useNavigate();
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: SubmitEvent<HTMLFormElement>) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      await login(username, password);
      navigate('/');
    } catch (err) {
      setError(String(err));
    } finally {
      setLoading(false);
    }
  };

  return (
    <Box
      sx={{
        minHeight: '100vh',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        backgroundColor: '#12172a',
        backgroundImage: 'radial-gradient(ellipse at 60% 20%, rgba(13,107,95,0.18) 0%, transparent 60%)',
      }}
    >
      <Card
        sx={{
          maxWidth: 400,
          width: '100%',
          mx: 2,
          border: 'none',
          boxShadow: '0 24px 80px rgba(0,0,0,0.45)',
        }}
      >
        <CardContent sx={{ p: 4 }}>
          <Box sx={{ display: 'flex', flexDirection: 'column', alignItems: 'center', mb: 3.5 }}>
            <Box
              sx={{
                width: 52,
                height: 52,
                borderRadius: 2,
                backgroundColor: 'rgba(13,107,95,0.10)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                mb: 2,
                border: '1px solid rgba(13,107,95,0.20)',
              }}
            >
              <PointOfSale sx={{ fontSize: 28, color: 'primary.main' }} />
            </Box>
            <Typography variant="h5" fontWeight={700} color="text.primary">
              Almanza POS
            </Typography>
            <Typography variant="body2" color="text.secondary" sx={{ mt: 0.5 }}>
              Inicia sesión para continuar
            </Typography>
          </Box>

          {error && (
            <Alert severity="error" sx={{ mb: 2.5 }}>
              {error}
            </Alert>
          )}

          <form onSubmit={handleSubmit}>
            <TextField
              fullWidth
              label="Usuario"
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              margin="normal"
              autoFocus
              required
              size="small"
            />
            <TextField
              fullWidth
              label="Contraseña"
              type={showPassword ? 'text' : 'password'}
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              margin="normal"
              required
              size="small"
              slotProps={{
                input: {
                  endAdornment: (
                    <InputAdornment position="end">
                      <IconButton
                        onClick={() => setShowPassword(!showPassword)}
                        edge="end"
                        size="small"
                        tabIndex={-1}
                      >
                        {!showPassword ? <VisibilityOff fontSize="small" /> : <Visibility fontSize="small" />}
                      </IconButton>
                    </InputAdornment>
                  ),
                }
              }}
            />
            <Button
              fullWidth
              type="submit"
              variant="contained"
              size="large"
              disabled={loading}
              sx={{ mt: 3, py: 1.25 }}
            >
              {loading ? 'Iniciando sesión...' : 'Iniciar Sesión'}
            </Button>
          </form>
        </CardContent>
      </Card>
    </Box>
  );
}
