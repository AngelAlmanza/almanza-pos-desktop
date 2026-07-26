import { Memory, Print, Save, Usb } from '@mui/icons-material';
import {
  Alert,
  Box,
  Button,
  CircularProgress,
  FormControl,
  FormControlLabel,
  MenuItem,
  Paper,
  Select,
  Switch,
  TextField,
  Typography,
} from '@mui/material';
import { useEffect, useState } from 'react';
import type { PrinterInfo, PrinterSettings, SavePrinterConfigDTO } from '@modules/settings/types';
import { PrinterService } from '@modules/settings/services/PrinterService';

const DEFAULT_CONFIG: SavePrinterConfigDTO = {
  enabled: false,
  auto_print_sale: false,
  transport: 'usb',
  display_name: '',
  usb_vendor_id: null,
  usb_product_id: null,
  port_hint: null,
  paper_size: '58mm',
  dpi: 203,
  cut_type: 'partial',
  encoding: 'UTF-8',
};

interface PrinterSettingsCardProps {
  onToast: (message: string, severity: 'success' | 'error') => void;
}

export function PrinterSettingsCard({ onToast }: PrinterSettingsCardProps) {
  const [config, setConfig] = useState<SavePrinterConfigDTO>(DEFAULT_CONFIG);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [testing, setTesting] = useState(false);
  const [detecting, setDetecting] = useState(false);
  const [detectedPrinters, setDetectedPrinters] = useState<PrinterInfo[]>([]);
  const [detectError, setDetectError] = useState('');

  useEffect(() => {
    void loadConfig();
  }, []);

  async function loadConfig() {
    setLoading(true);
    try {
      const current = await PrinterService.getConfig();
      setConfig(normalizeConfig(current));
    } catch (error) {
      onToast(String(error), 'error');
    } finally {
      setLoading(false);
    }
  }

  async function handleSave() {
    setSaving(true);
    try {
      await PrinterService.saveConfig(config);
      onToast('Configuración de impresora guardada', 'success');
    } catch (error) {
      onToast(String(error), 'error');
    } finally {
      setSaving(false);
    }
  }

  async function handleTest() {
    setTesting(true);
    try {
      await PrinterService.testPrinter();
      onToast('Ticket de prueba enviado a la impresora', 'success');
    } catch (error) {
      onToast(String(error), 'error');
    } finally {
      setTesting(false);
    }
  }

  async function handleDetect() {
    setDetecting(true);
    setDetectError('');
    try {
      const printers = await PrinterService.detectUsbPrinters();
      setDetectedPrinters(printers);
      if (printers.length === 0) {
        setDetectError(
          'No se detectaron impresoras serial-over-USB. Verifica que Windows la exponga como puerto COM.',
        );
      } else {
        onToast('Impresoras USB detectadas', 'success');
      }
    } catch (error) {
      const message = String(error);
      setDetectError(message);
      onToast(message, 'error');
    } finally {
      setDetecting(false);
    }
  }

  function applyDetectedPrinter(printer: PrinterInfo) {
    setConfig((current) => ({
      ...current,
      transport: printer.transport,
      display_name: printer.name,
      usb_vendor_id: printer.vendor_id || null,
      usb_product_id: printer.product_id || null,
      port_hint: printer.port_name,
    }));
    onToast(`Impresora ${printer.name} aplicada al formulario`, 'success');
  }

  if (loading) {
    return (
      <Paper elevation={0} sx={{ border: '1px solid rgba(26,32,53,0.10)', p: 2.5 }}>
        <Box sx={{ display: 'flex', justifyContent: 'center', py: 2 }}>
          <CircularProgress size={24} />
        </Box>
      </Paper>
    );
  }

  return (
    <Paper elevation={0} sx={{ border: '1px solid rgba(26,32,53,0.10)', overflow: 'hidden' }}>
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
          <Box sx={{ color: 'text.disabled' }}>
            <Print sx={{ fontSize: 15 }} />
          </Box>
          <Typography
            sx={{
              fontSize: '0.7rem',
              fontWeight: 600,
              letterSpacing: '0.07em',
              textTransform: 'uppercase',
              color: 'text.secondary',
            }}
          >
            Impresora ESC/POS
          </Typography>
        </Box>
        <Typography sx={{ fontSize: '0.75rem', color: 'text.secondary' }}>
          V1 USB serial-over-USB
        </Typography>
      </Box>

      <Box sx={{ p: 2.5, display: 'flex', flexDirection: 'column', gap: 2 }}>
        <Box sx={{ display: 'flex', gap: 2, flexWrap: 'wrap' }}>
          <FormControlLabel
            control={
              <Switch
                checked={config.enabled}
                onChange={event =>
                  setConfig(current => ({ ...current, enabled: event.target.checked }))
                }
              />
            }
            label="Impresora habilitada"
          />
          <FormControlLabel
            control={
              <Switch
                checked={config.auto_print_sale}
                onChange={event =>
                  setConfig(current => ({ ...current, auto_print_sale: event.target.checked }))
                }
              />
            }
            label="Auto imprimir venta"
          />
        </Box>

        <Box sx={{ display: 'flex', gap: 1.5, flexWrap: 'wrap' }}>
          <TextField
            label="Nombre mostrado"
            size="small"
            value={config.display_name}
            onChange={event =>
              setConfig(current => ({ ...current, display_name: event.target.value }))
            }
            sx={{ flex: '1 1 220px' }}
          />
          <TextField
            label="Port hint / COM"
            size="small"
            value={config.port_hint ?? ''}
            onChange={event =>
              setConfig(current => ({
                ...current,
                port_hint: emptyToNull(event.target.value),
              }))
            }
            placeholder="Ej: COM3"
            sx={{ flex: '1 1 140px' }}
          />
        </Box>

        <Box sx={{ display: 'flex', gap: 1.5, flexWrap: 'wrap' }}>
          <TextField
            label="Vendor ID (VID)"
            size="small"
            value={config.usb_vendor_id ?? ''}
            onChange={event =>
              setConfig(current => ({
                ...current,
                usb_vendor_id: normalizeHex(event.target.value),
              }))
            }
            placeholder="04B8"
            sx={{ flex: '1 1 140px' }}
            slotProps={{ htmlInput: { maxLength: 4, style: { textTransform: 'uppercase' } } }}
          />
          <TextField
            label="Product ID (PID)"
            size="small"
            value={config.usb_product_id ?? ''}
            onChange={event =>
              setConfig(current => ({
                ...current,
                usb_product_id: normalizeHex(event.target.value),
              }))
            }
            placeholder="0202"
            sx={{ flex: '1 1 140px' }}
            slotProps={{ htmlInput: { maxLength: 4, style: { textTransform: 'uppercase' } } }}
          />
          <FormControl size="small" sx={{ flex: '1 1 140px' }}>
            <Select
              value={config.paper_size}
              onChange={event =>
                setConfig(current => ({ ...current, paper_size: event.target.value }))
              }
            >
              <MenuItem value="58mm">58 mm</MenuItem>
              <MenuItem value="80mm">80 mm</MenuItem>
              <MenuItem value="100mm">100 mm</MenuItem>
            </Select>
          </FormControl>
          <FormControl size="small" sx={{ flex: '1 1 140px' }}>
            <Select
              value={config.cut_type}
              onChange={event =>
                setConfig(current => ({
                  ...current,
                  cut_type: event.target.value as SavePrinterConfigDTO['cut_type'],
                }))
              }
            >
              <MenuItem value="partial">Corte parcial</MenuItem>
              <MenuItem value="full">Corte completo</MenuItem>
              <MenuItem value="none">Sin corte</MenuItem>
            </Select>
          </FormControl>
        </Box>

        <Box sx={{ display: 'flex', gap: 1.5, flexWrap: 'wrap' }}>
          <TextField
            label="DPI"
            size="small"
            type="number"
            value={config.dpi}
            onChange={event =>
              setConfig(current => ({
                ...current,
                dpi: Number(event.target.value) || 203,
              }))
            }
            sx={{ flex: '1 1 120px' }}
          />
          <FormControl size="small" sx={{ flex: '1 1 180px' }}>
            <Select
              value={config.encoding}
              onChange={event =>
                setConfig(current => ({ ...current, encoding: String(event.target.value) }))
              }
            >
              <MenuItem value="UTF-8">UTF-8</MenuItem>
              <MenuItem value="ISO-8859-1">ISO-8859-1</MenuItem>
            </Select>
          </FormControl>
          <TextField
            label="Transporte"
            size="small"
            value={config.transport === 'windows' ? 'Windows spooler' : 'USB'}
            disabled
            sx={{ flex: '1 1 140px' }}
          />
        </Box>

        <Box sx={{ display: 'flex', gap: 1, flexWrap: 'wrap' }}>
          <Button
            variant="outlined"
            startIcon={<Usb />}
            onClick={handleDetect}
            disabled={detecting}
          >
            {detecting ? <CircularProgress size={16} /> : 'Detectar impresoras USB'}
          </Button>
          <Button
            variant="contained"
            startIcon={<Save />}
            onClick={handleSave}
            disabled={saving}
          >
            {saving ? <CircularProgress size={16} color="inherit" /> : 'Guardar'}
          </Button>
          <Button
            variant="contained"
            color="inherit"
            startIcon={<Memory />}
            onClick={handleTest}
            disabled={testing}
          >
            {testing ? <CircularProgress size={16} color="inherit" /> : 'Imprimir ticket de prueba'}
          </Button>
        </Box>

        {detectError && <Alert severity="warning">{detectError}</Alert>}

        {detectedPrinters.length > 0 && (
          <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1 }}>
            <Typography
              sx={{
                fontSize: '0.75rem',
                fontWeight: 600,
                textTransform: 'uppercase',
                letterSpacing: '0.06em',
                color: 'text.secondary',
              }}
            >
              Detecciones USB
            </Typography>
            {detectedPrinters.map(printer => (
              <Box
                key={printer.id}
                sx={{
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'center',
                  gap: 1,
                  border: '1px solid rgba(26,32,53,0.08)',
                  borderRadius: 1.5,
                  px: 1.5,
                  py: 1,
                  flexWrap: 'wrap',
                }}
              >
                <Box>
                  <Typography sx={{ fontSize: '0.875rem', fontWeight: 600 }}>
                    {printer.name}
                  </Typography>
                  <Typography sx={{ fontSize: '0.75rem', color: 'text.secondary' }}>
                    {printer.vendor_id && printer.product_id
                      ? `VID: ${printer.vendor_id} · PID: ${printer.product_id}`
                      : 'Impresora instalada en Windows'}
                    {printer.port_name ? ` · ${printer.port_name}` : ''}
                    {printer.transport === 'windows' ? ' · Spooler Windows' : ''}
                  </Typography>
                </Box>
                <Button size="small" variant="text" onClick={() => applyDetectedPrinter(printer)}>
                  Usar
                </Button>
              </Box>
            ))}
          </Box>
        )}
      </Box>
    </Paper>
  );
}

function normalizeConfig(config: PrinterSettings): SavePrinterConfigDTO {
  return {
    enabled: config.enabled,
    auto_print_sale: config.auto_print_sale,
    transport: config.transport,
    display_name: config.display_name,
    usb_vendor_id: config.usb_vendor_id,
    usb_product_id: config.usb_product_id,
    port_hint: config.port_hint,
    paper_size: config.paper_size,
    dpi: config.dpi,
    cut_type: config.cut_type,
    encoding: config.encoding,
  };
}

function normalizeHex(value: string): string | null {
  const clean = value.replace(/[^a-fA-F0-9]/g, '').toUpperCase();
  return clean ? clean : null;
}

function emptyToNull(value: string): string | null {
  const trimmed = value.trim();
  return trimmed ? trimmed : null;
}
