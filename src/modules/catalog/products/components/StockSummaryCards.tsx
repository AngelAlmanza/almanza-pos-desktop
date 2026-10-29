import { Box, ButtonBase, Typography } from '@mui/material';
import type { StockStatusFilter } from '@modules/catalog/products/types';
import type { StockSummary } from '@modules/catalog/products/utils/stockStatus';

interface StockSummaryCardsProps {
  // null mientras carga: se muestra "—"
  summary: StockSummary | null;
  statusFilter: StockStatusFilter;
  onToggleStatus: (status: 'low' | 'out') => void;
}

interface CardProps {
  label: string;
  value: number | null;
  accent: string;
  testId: string;
  pressed?: boolean;
  onClick?: () => void;
}

function SummaryCard({ label, value, accent, testId, pressed, onClick }: CardProps) {
  const content = (
    <>
      <Typography
        variant="caption"
        sx={{ textTransform: 'uppercase', letterSpacing: '0.04em', color: 'text.secondary' }}
      >
        {label}
      </Typography>
      <Typography variant="h5" sx={{ fontVariantNumeric: 'tabular-nums' }}>
        {value === null ? '—' : value}
      </Typography>
    </>
  );
  const sx = {
    flex: 1,
    display: 'block',
    textAlign: 'left' as const,
    px: 2,
    py: 1.5,
    borderRadius: 1.5,
    border: '1px solid rgba(26,32,53,0.10)',
    borderLeft: `3px solid ${accent}`,
    backgroundColor: pressed ? 'rgba(13,107,95,0.06)' : 'background.paper',
  };
  if (!onClick) {
    return (
      <Box data-testid={testId} sx={sx}>
        {content}
      </Box>
    );
  }
  return (
    <ButtonBase data-testid={testId} aria-pressed={pressed} onClick={onClick} sx={sx}>
      {content}
    </ButtonBase>
  );
}

export function StockSummaryCards({ summary, statusFilter, onToggleStatus }: StockSummaryCardsProps) {
  return (
    <Box
      role="region"
      aria-label="Resumen de stock"
      aria-live="polite"
      sx={{ display: 'flex', gap: 2, mb: 2 }}
    >
      <SummaryCard
        label="Activos"
        value={summary?.active ?? null}
        accent="#0d6b5f"
        testId="summary-active"
      />
      <SummaryCard
        label="Stock bajo"
        value={summary?.low ?? null}
        accent="#c17d11"
        testId="summary-low"
        pressed={statusFilter === 'low'}
        onClick={() => onToggleStatus('low')}
      />
      <SummaryCard
        label="Agotados"
        value={summary?.out ?? null}
        accent="#b91c1c"
        testId="summary-out"
        pressed={statusFilter === 'out'}
        onClick={() => onToggleStatus('out')}
      />
    </Box>
  );
}
