import { PrinterService } from '@modules/settings/services/PrinterService';
import type { PrinterInfo, PrinterSettings, SavePrinterConfigDTO } from '@modules/settings/types';
import { ExpandMore, Print, ReceiptLong, Save, Tune, Usb } from '@mui/icons-material';
import {
  Accordion,
  AccordionDetails,
  AccordionSummary,
  Alert,
  Box,
  Button,
  Chip,
  CircularProgress,
  FormControl,
  FormControlLabel,
  InputLabel,
  MenuItem,
  Paper,
  Select,
  Switch,
  TextField,
  Typography,
} from '@mui/material';
import { useEffect, useState } from 'react';

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
      setConfig(normalizeConfig(await PrinterService.getConfig()));
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
        setDetectError('No encontramos impresoras USB. Revisa que esté conectada y que Windows la muestre como un puerto COM.');
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
    setConfig(current => ({
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
      <Paper elevation={0} sx={{ border: '1px solid rgba(26,32,53,0.10)', p: 3 }}>
        <Box sx={{ display: 'flex', justifyContent: 'center', py: 2 }}><CircularProgress size={24} /></Box>
      </Paper>
    );
  }

  return (
    <Paper elevation={0} sx={{ border: '1px solid rgba(26,32,53,0.10)', overflow: 'hidden' }}>
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: 2, px: { xs: 2, sm: 3 }, py: 2.5, backgroundColor: '#f5f3f0', borderBottom: '1px solid rgba(26,32,53,0.10)' }}>
        <Box sx={{ display: 'flex', gap: 1.5, alignItems: 'flex-start' }}>
          <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', width: 40, height: 40, borderRadius: 1.5, backgroundColor: 'rgba(13,107,95,0.10)', color: 'primary.main', flexShrink: 0 }}>
            <Print sx={{ fontSize: 22 }} />
          </Box>
          <Box>
            <Typography sx={{ fontSize: '1rem', fontWeight: 700, color: 'text.primary' }}>Impresión de tickets</Typography>
            <Typography sx={{ fontSize: '0.8125rem', color: 'text.secondary', mt: 0.25 }}>
              Define cómo se imprimen los comprobantes al terminar una venta.
            </Typography>
          </Box>
        </Box>
        <Chip
          label={config.enabled ? 'Impresora activa' : 'Impresora desactivada'}
          size="small"
          sx={{ fontWeight: 700, color: config.enabled ? 'primary.main' : 'text.secondary', backgroundColor: config.enabled ? 'rgba(13,107,95,0.10)' : 'rgba(26,32,53,0.06)', mt: 0.25 }}
        />
      </Box>

      <Box sx={{ p: { xs: 2, sm: 3 }, display: 'flex', flexDirection: 'column', gap: 3 }}>
        <Box sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr', md: '1fr 1fr' }, gap: 1.5 }}>
          <Box sx={{ border: '1px solid rgba(26,32,53,0.10)', borderRadius: 1.5, p: 1.5, backgroundColor: config.enabled ? 'rgba(13,107,95,0.035)' : '#f5f3f0' }}>
            <FormControlLabel
              sx={{ m: 0, width: '100%', alignItems: 'center', justifyContent: 'space-between' }}
              labelPlacement="start"
              control={<Switch checked={config.enabled} onChange={event => setConfig(current => ({ ...current, enabled: event.target.checked }))} />}
              label={<Box><Typography sx={{ fontSize: '0.9375rem', fontWeight: 700 }}>Usar impresora de tickets</Typography><Typography sx={{ fontSize: '0.75rem', color: 'text.secondary', mt: 0.25 }}>Actívala cuando la impresora esté lista.</Typography></Box>}
            />
          </Box>
          <Box sx={{ border: '1px solid rgba(26,32,53,0.10)', borderRadius: 1.5, p: 1.5, backgroundColor: config.auto_print_sale ? 'rgba(13,107,95,0.035)' : '#f5f3f0' }}>
            <FormControlLabel
              sx={{ m: 0, width: '100%', alignItems: 'center', justifyContent: 'space-between' }}
              labelPlacement="start"
              control={<Switch checked={config.auto_print_sale} onChange={event => setConfig(current => ({ ...current, auto_print_sale: event.target.checked }))} />}
              label={<Box><Typography sx={{ fontSize: '0.9375rem', fontWeight: 700 }}>Imprimir al cobrar</Typography><Typography sx={{ fontSize: '0.75rem', color: 'text.secondary', mt: 0.25 }}>Envía el ticket automáticamente después de la venta.</Typography></Box>}
            />
          </Box>
        </Box>

        <Box>
          <Typography sx={{ fontSize: '0.8125rem', fontWeight: 700, color: 'text.primary', mb: 1.25 }}>Conexión de la impresora</Typography>
          <Box sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr', md: 'minmax(0, 1.3fr) minmax(220px, 0.7fr)' }, gap: 1.5 }}>
            <TextField label="Nombre de la impresora" size="small" value={config.display_name} onChange={event => setConfig(current => ({ ...current, display_name: event.target.value }))} placeholder="Ej. Impresora de caja" helperText="Un nombre para identificarla fácilmente." />
            <TextField label="Puerto de conexión" size="small" value={config.port_hint ?? ''} onChange={event => setConfig(current => ({ ...current, port_hint: emptyToNull(event.target.value) }))} placeholder="Ej. COM3" helperText="Solo si tu impresora usa puerto COM." />
          </Box>
        </Box>

        <Box>
          <Typography sx={{ fontSize: '0.8125rem', fontWeight: 700, color: 'text.primary', mb: 1.25 }}>Formato del ticket</Typography>
          <Box sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr', sm: '1fr 1fr' }, gap: 1.5 }}>
            <FormControl size="small" fullWidth>
              <InputLabel id="paper-size-label">Ancho de papel</InputLabel>
              <Select labelId="paper-size-label" label="Ancho de papel" value={config.paper_size} onChange={event => setConfig(current => ({ ...current, paper_size: event.target.value }))}>
                <MenuItem value="58mm">58 mm</MenuItem>
                <MenuItem value="80mm">80 mm</MenuItem>
                <MenuItem value="100mm">100 mm</MenuItem>
              </Select>
            </FormControl>
            <FormControl size="small" fullWidth>
              <InputLabel id="cut-type-label">Corte del papel</InputLabel>
              <Select labelId="cut-type-label" label="Corte del papel" value={config.cut_type} onChange={event => setConfig(current => ({ ...current, cut_type: event.target.value as SavePrinterConfigDTO['cut_type'] }))}>
                <MenuItem value="partial">Corte parcial</MenuItem>
                <MenuItem value="full">Corte completo</MenuItem>
                <MenuItem value="none">Sin corte</MenuItem>
              </Select>
            </FormControl>
          </Box>
        </Box>

        <Box sx={{ display: 'flex', gap: 1, flexWrap: 'wrap', pt: 0.5 }}>
          <Button variant="outlined" startIcon={detecting ? <CircularProgress size={16} /> : <Usb />} onClick={() => void handleDetect()} disabled={detecting}>
            Buscar impresora
          </Button>
          <Button variant="contained" disableElevation startIcon={saving ? <CircularProgress size={16} color="inherit" /> : <Save />} onClick={() => void handleSave()} disabled={saving}>
            Guardar configuración
          </Button>
          <Button variant="text" startIcon={testing ? <CircularProgress size={16} /> : <ReceiptLong />} onClick={() => void handleTest()} disabled={testing}>
            Imprimir prueba
          </Button>
        </Box>

        {detectError && <Alert severity="warning">{detectError}</Alert>}

        {detectedPrinters.length > 0 && (
          <Box sx={{ border: '1px solid rgba(13,107,95,0.18)', borderRadius: 1.5, overflow: 'hidden' }}>
            <Box sx={{ px: 2, py: 1.25, backgroundColor: 'rgba(13,107,95,0.05)' }}>
              <Typography sx={{ fontSize: '0.875rem', fontWeight: 700, color: 'primary.main' }}>Impresoras encontradas</Typography>
              <Typography sx={{ fontSize: '0.75rem', color: 'text.secondary', mt: 0.2 }}>Elige una para completar los datos de conexión.</Typography>
            </Box>
            {detectedPrinters.map(printer => (
              <Box key={printer.id} sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 2, px: 2, py: 1.5, borderTop: '1px solid rgba(26,32,53,0.08)', flexWrap: 'wrap' }}>
                <Box>
                  <Typography sx={{ fontSize: '0.875rem', fontWeight: 700 }}>{printer.name}</Typography>
                  <Typography sx={{ fontSize: '0.75rem', color: 'text.secondary', mt: 0.2 }}>
                    {printer.vendor_id && printer.product_id ? `VID: ${printer.vendor_id} · PID: ${printer.product_id}` : 'Impresora instalada en Windows'}
                    {printer.port_name ? ` · ${printer.port_name}` : ''}{printer.transport === 'windows' ? ' · Windows' : ''}
                  </Typography>
                </Box>
                <Button size="small" variant="outlined" onClick={() => applyDetectedPrinter(printer)}>Usar esta impresora</Button>
              </Box>
            ))}
          </Box>
        )}

        <Accordion disableGutters elevation={0} sx={{ border: '1px solid rgba(26,32,53,0.10)', borderRadius: '6px !important', '&:before': { display: 'none' } }}>
          <AccordionSummary expandIcon={<ExpandMore />} sx={{ px: 2, minHeight: 48, '& .MuiAccordionSummary-content': { my: 1 } }}>
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}><Tune sx={{ fontSize: 18, color: 'text.secondary' }} /><Typography sx={{ fontSize: '0.875rem', fontWeight: 700 }}>Configuración avanzada</Typography></Box>
          </AccordionSummary>
          <AccordionDetails sx={{ px: 2, pt: 0.5, pb: 2 }}>
            <Typography sx={{ fontSize: '0.75rem', color: 'text.secondary', mb: 1.5 }}>Solo modifica estos datos si te los proporcionó el proveedor de la impresora.</Typography>
            <Box sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr', sm: '1fr 1fr', lg: 'repeat(3, 1fr)' }, gap: 1.5 }}>
              <TextField label="Vendor ID (VID)" size="small" value={config.usb_vendor_id ?? ''} onChange={event => setConfig(current => ({ ...current, usb_vendor_id: normalizeHex(event.target.value) }))} placeholder="04B8" slotProps={{ htmlInput: { maxLength: 4, style: { textTransform: 'uppercase' } } }} />
              <TextField label="Product ID (PID)" size="small" value={config.usb_product_id ?? ''} onChange={event => setConfig(current => ({ ...current, usb_product_id: normalizeHex(event.target.value) }))} placeholder="0202" slotProps={{ htmlInput: { maxLength: 4, style: { textTransform: 'uppercase' } } }} />
              <TextField label="Resolución (DPI)" size="small" type="number" value={config.dpi} onChange={event => setConfig(current => ({ ...current, dpi: Number(event.target.value) || 203 }))} />
              <FormControl size="small"><InputLabel id="encoding-label">Codificación</InputLabel><Select labelId="encoding-label" label="Codificación" value={config.encoding} onChange={event => setConfig(current => ({ ...current, encoding: String(event.target.value) }))}><MenuItem value="UTF-8">UTF-8</MenuItem><MenuItem value="ISO-8859-1">ISO-8859-1</MenuItem></Select></FormControl>
              <TextField label="Método de conexión" size="small" value={config.transport === 'windows' ? 'Windows' : 'USB'} disabled />
            </Box>
          </AccordionDetails>
        </Accordion>
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
  return clean || null;
}

function emptyToNull(value: string): string | null {
  const trimmed = value.trim();
  return trimmed || null;
}
