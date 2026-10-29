import { AddCircleOutline, LocalShipping, RemoveCircleOutline } from '@mui/icons-material';
import { ToggleButton, ToggleButtonGroup } from '@mui/material';
import type { AdjustmentType } from '@modules/shared/types/base';
import { ADJUSTMENT_LABELS } from '@modules/catalog/products/utils/stockAdjustment';

interface AdjustmentTypePickerProps {
  value: AdjustmentType | null;
  onChange: (value: AdjustmentType) => void;
  disabled?: boolean;
}

const OPTIONS: { type: AdjustmentType; icon: React.ReactNode }[] = [
  { type: 'add', icon: <LocalShipping /> },
  { type: 'positive', icon: <AddCircleOutline /> },
  { type: 'negative', icon: <RemoveCircleOutline /> },
];

export function AdjustmentTypePicker({ value, onChange, disabled }: AdjustmentTypePickerProps) {
  return (
    <ToggleButtonGroup
      exclusive
      fullWidth
      role="radiogroup"
      aria-label="Tipo de ajuste"
      value={value}
      disabled={disabled}
      onChange={(_, next: AdjustmentType | null) => {
        if (next !== null) onChange(next);
      }}
      sx={{ gap: 1, '& .MuiToggleButtonGroup-grouped': { border: '1px solid rgba(26,32,53,0.18) !important', borderRadius: '8px !important' } }}
    >
      {OPTIONS.map((option) => (
        <ToggleButton
          key={option.type}
          value={option.type}
          role="radio"
          aria-checked={value === option.type}
          data-testid={`adjust-type-${option.type}`}
          sx={{
            flexDirection: 'column',
            gap: 0.5,
            py: 1.5,
            textTransform: 'none',
            fontWeight: 600,
            fontSize: '0.8125rem',
            '&.Mui-selected': {
              borderColor: 'primary.main',
              backgroundColor: 'rgba(13,107,95,0.10)',
              color: 'primary.main',
            },
          }}
        >
          {option.icon}
          {ADJUSTMENT_LABELS[option.type]}
        </ToggleButton>
      ))}
    </ToggleButtonGroup>
  );
}
