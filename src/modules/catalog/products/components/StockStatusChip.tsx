import { Chip } from '@mui/material';
import type { StockStatus } from '@modules/catalog/products/types';
import { STOCK_STATUS_LABELS } from '@modules/catalog/products/utils/stockStatus';

interface StockStatusChipProps {
  // null = producto inactivo (sin estado de stock)
  status: StockStatus | null;
}

const STATUS_STYLES: Record<StockStatus | 'inactive', { bg: string; color: string }> = {
  normal: { bg: 'rgba(45,106,79,0.12)', color: 'success.dark' },
  low: { bg: 'rgba(193,125,17,0.12)', color: 'warning.dark' },
  out: { bg: 'rgba(185,28,28,0.10)', color: 'error.dark' },
  inactive: { bg: 'rgba(26,32,53,0.07)', color: 'text.secondary' },
};

export function StockStatusChip({ status }: StockStatusChipProps) {
  const key = status ?? 'inactive';
  const style = STATUS_STYLES[key];
  return (
    <Chip
      label={status === null ? 'Inactivo' : STOCK_STATUS_LABELS[status]}
      size="small"
      data-testid={`stock-status-${key}`}
      sx={{ backgroundColor: style.bg, color: style.color, fontWeight: 600, height: 22 }}
    />
  );
}
