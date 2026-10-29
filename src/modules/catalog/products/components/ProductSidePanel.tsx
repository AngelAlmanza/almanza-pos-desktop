import { Close } from '@mui/icons-material';
import {
  Alert,
  Box,
  Button,
  Chip,
  CircularProgress,
  Divider,
  Drawer,
  IconButton,
  Tab,
  Tabs,
  TextField,
  Typography,
} from '@mui/material';
import moment from 'moment';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { AdjustmentTypePicker } from '@modules/catalog/products/components/AdjustmentTypePicker';
import { StockStatusChip } from '@modules/catalog/products/components/StockStatusChip';
import { InventoryService } from '@modules/catalog/inventory/services/InventoryService';
import type { InventoryAdjustment } from '@modules/catalog/inventory/types';
import type { Product } from '@modules/catalog/products/types';
import {
  ADJUSTMENT_LABELS,
  previewAdjustment,
  validateAdjustmentQuantity,
} from '@modules/catalog/products/utils/stockAdjustment';
import { getStockStatus, STOCK_STATUS_LABELS } from '@modules/catalog/products/utils/stockStatus';
import type { AdjustmentType } from '@modules/shared/types/base';

export type PanelSection = 'adjust' | 'history';

interface ProductSidePanelProps {
  product: Product;
  initialSection: PanelSection;
  canViewHistory: boolean;
  userId: number;
  onClose: () => void;
  onAdjusted: (updated: Product) => void;
}

const SUCCESS_MS = 5000;

export function ProductSidePanel({
  product,
  initialSection,
  canViewHistory,
  userId,
  onClose,
  onAdjusted,
}: ProductSidePanelProps) {
  const canAdjust = product.active;
  const firstSection: PanelSection =
    initialSection === 'history' && canViewHistory ? 'history' : 'adjust';
  const [section, setSection] = useState<PanelSection>(firstSection);
  const [current, setCurrent] = useState<Product>(product);
  const [type, setType] = useState<AdjustmentType | null>(null);
  const [quantity, setQuantity] = useState('');
  const [reason, setReason] = useState('');
  const [touched, setTouched] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState(false);
  const quantityRef = useRef<HTMLInputElement | null>(null);
  const successTimer = useRef<number | undefined>(undefined);

  const [history, setHistory] = useState<InventoryAdjustment[]>([]);
  const [historyLoading, setHistoryLoading] = useState(false);
  const [historyError, setHistoryError] = useState('');

  useEffect(() => () => window.clearTimeout(successTimer.current), []);

  const loadHistory = useCallback(async () => {
    setHistoryLoading(true);
    setHistoryError('');
    try {
      const rows = await InventoryService.getByProduct(product.id);
      setHistory(rows);
    } catch (err) {
      setHistoryError(String(err));
    } finally {
      setHistoryLoading(false);
    }
  }, [product.id]);

  useEffect(() => {
    if (section === 'history' && canViewHistory) {
      void loadHistory();
    }
  }, [section, canViewHistory, loadHistory]);

  const validation = useMemo(() => validateAdjustmentQuantity(quantity, current), [quantity, current]);
  const preview = useMemo(() => {
    if (type === null || !validation.valid || validation.value === null) return null;
    return previewAdjustment(current.stock, type, validation.value);
  }, [type, validation, current.stock]);
  const previewStatus = preview
    ? getStockStatus({ ...current, stock: preview.resulting })
    : null;

  const canConfirm = !saving && type !== null && validation.valid;
  const quantityError = touched && !validation.valid ? validation.error : null;

  const handleTypeChange = (next: AdjustmentType) => {
    setType(next);
    // El foco pasa a Cantidad al elegir el tipo.
    window.setTimeout(() => quantityRef.current?.focus(), 0);
  };

  const handleConfirm = async () => {
    // Guardado una sola vez (FR5.7).
    if (saving || type === null || !validation.valid || validation.value === null) {
      setTouched(true);
      return;
    }
    setSaving(true);
    setError('');
    try {
      const adjustment = await InventoryService.create({
        product_id: current.id,
        user_id: userId,
        adjustment_type: type,
        quantity: validation.value,
        reason: reason.trim() || undefined,
      });
      const updated: Product = { ...current, stock: adjustment.new_stock };
      setCurrent(updated);
      onAdjusted(updated);
      setType(null);
      setQuantity('');
      setReason('');
      setTouched(false);
      setSuccess(true);
      window.clearTimeout(successTimer.current);
      successTimer.current = window.setTimeout(() => setSuccess(false), SUCCESS_MS);
      if (canViewHistory) void loadHistory();
    } catch (err) {
      // Se conserva lo escrito.
      setError(String(err));
    } finally {
      setSaving(false);
    }
  };

  return (
    <Drawer
      anchor="right"
      open
      onClose={onClose}
      slotProps={{
        paper: {
          role: 'dialog',
          'aria-modal': true,
          'aria-labelledby': 'product-panel-title',
          sx: { width: { xs: '100%', md: 400, xl: 440 }, p: 3, boxShadow: '0 16px 64px rgba(26,32,53,0.18)' },
        } as object,
      }}
    >
      <Box sx={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', mb: 1 }}>
        <Box sx={{ minWidth: 0 }}>
          <Typography id="product-panel-title" variant="h6" noWrap>
            {current.name}
          </Typography>
          <Typography variant="caption" color="text.secondary">
            {current.category_name || 'Sin categoría'}
          </Typography>
        </Box>
        <IconButton aria-label="Cerrar panel" onClick={onClose} data-testid="panel-close" size="small">
          <Close />
        </IconButton>
      </Box>

      <Box
        sx={{
          display: 'flex',
          alignItems: 'baseline',
          gap: 1.5,
          my: 1.5,
        }}
      >
        <Typography variant="h4" sx={{ fontVariantNumeric: 'tabular-nums' }} data-testid="panel-stock">
          {current.stock}
        </Typography>
        <Typography color="text.secondary">{current.unit}</Typography>
        <StockStatusChip status={getStockStatus(current)} />
      </Box>

      {canViewHistory && (
        <Tabs
          value={section}
          onChange={(_, value: PanelSection) => setSection(value)}
          sx={{ mb: 2, minHeight: 36 }}
        >
          {canAdjust && <Tab value="adjust" label="Ajustar" data-testid="panel-tab-adjust" />}
          <Tab value="history" label="Historial" data-testid="panel-tab-history" />
        </Tabs>
      )}

      {section === 'adjust' && canAdjust && (
        <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
          {success && (
            <Alert severity="success" role="status" data-testid="adjust-success">
              Ajuste guardado
            </Alert>
          )}
          <AdjustmentTypePicker value={type} onChange={handleTypeChange} disabled={saving} />
          <TextField
            label="Cantidad"
            type="number"
            size="small"
            fullWidth
            value={quantity}
            inputRef={quantityRef}
            onChange={(e) => setQuantity(e.target.value)}
            onBlur={() => setTouched(true)}
            onKeyDown={(e) => {
              if (e.key === 'Enter' && canConfirm) void handleConfirm();
            }}
            error={Boolean(quantityError)}
            helperText={quantityError ?? ' '}
            disabled={saving}
            slotProps={{
              htmlInput: {
                step: current.is_bulk ? '0.001' : '1',
                min: '0',
                'data-testid': 'adjust-quantity',
              },
            }}
          />
          <TextField
            label="Motivo (opcional)"
            size="small"
            fullWidth
            multiline
            rows={2}
            value={reason}
            onChange={(e) => setReason(e.target.value)}
            disabled={saving}
          />
          <Box
            aria-live="polite"
            data-testid="adjust-preview"
            sx={{ backgroundColor: '#faf9f6', borderLeft: '3px solid', borderColor: 'primary.main', p: 1.5 }}
          >
            {preview && previewStatus ? (
              <Typography variant="body2" sx={{ fontVariantNumeric: 'tabular-nums' }}>
                Ahora {preview.current} → Quedará <strong>{preview.resulting}</strong> {current.unit},
                estado {STOCK_STATUS_LABELS[previewStatus].toLowerCase()}
              </Typography>
            ) : (
              <Typography variant="body2" color="text.secondary">
                Elige un tipo y escribe la cantidad para ver cómo quedará el stock.
              </Typography>
            )}
          </Box>
          {error && (
            <Alert severity="error" onClose={() => setError('')} data-testid="adjust-error">
              {error}
            </Alert>
          )}
          <Box sx={{ display: 'flex', justifyContent: 'flex-end', gap: 1 }}>
            <Button color="inherit" onClick={onClose} disabled={saving}>
              Cerrar
            </Button>
            <Button
              variant="contained"
              onClick={() => void handleConfirm()}
              disabled={!canConfirm}
              startIcon={saving ? <CircularProgress size={14} color="inherit" /> : undefined}
              data-testid="adjust-confirm"
            >
              {saving ? 'Guardando…' : 'Confirmar'}
            </Button>
          </Box>
        </Box>
      )}

      {section === 'history' && canViewHistory && (
        <Box>
          {historyLoading && <CircularProgress size={20} />}
          {historyError && (
            <Alert
              severity="error"
              action={
                <Button color="inherit" size="small" onClick={() => void loadHistory()}>
                  Reintentar
                </Button>
              }
            >
              {historyError}
            </Alert>
          )}
          {!historyLoading && !historyError && history.length === 0 && (
            <Typography color="text.secondary">Este producto aún no tiene ajustes</Typography>
          )}
          {history.map((adj) => (
            <Box key={adj.id} data-testid={`history-item-${adj.id}`}>
              <Box sx={{ py: 1.25 }}>
                <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <Chip
                    size="small"
                    label={ADJUSTMENT_LABELS[adj.adjustment_type]}
                    sx={{
                      fontWeight: 600,
                      backgroundColor:
                        adj.adjustment_type === 'negative'
                          ? 'rgba(185,28,28,0.10)'
                          : 'rgba(45,106,79,0.10)',
                      color: adj.adjustment_type === 'negative' ? 'error.dark' : 'success.dark',
                    }}
                  />
                  <Typography variant="caption" color="text.secondary">
                    {moment(adj.created_at).format('DD/MM/YYYY hh:mm A')}
                  </Typography>
                </Box>
                <Typography variant="body2" sx={{ mt: 0.5, fontVariantNumeric: 'tabular-nums' }}>
                  {adj.quantity} · {adj.previous_stock} → <strong>{adj.new_stock}</strong>
                </Typography>
                <Typography variant="caption" color="text.secondary">
                  {adj.user_name || '—'}
                  {adj.reason ? ` · ${adj.reason}` : ''}
                </Typography>
              </Box>
              <Divider />
            </Box>
          ))}
        </Box>
      )}
    </Drawer>
  );
}
