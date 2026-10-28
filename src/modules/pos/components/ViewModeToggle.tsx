import { GridView, ViewList } from '@mui/icons-material';
import { ToggleButton, ToggleButtonGroup, Tooltip } from '@mui/material';
import type { PosViewMode } from '@modules/pos/utils/viewMode';

interface ViewModeToggleProps {
  value: PosViewMode;
  onChange: (mode: PosViewMode) => void;
}

/** Selector exclusivo entre la vista de lista y la de cuadrícula (FR2.1). */
export const ViewModeToggle = ({ value, onChange }: ViewModeToggleProps) => (
  <ToggleButtonGroup
    exclusive
    size="small"
    value={value}
    // Un clic sobre el botón activo entrega `null`: se ignora para no quedar sin vista.
    onChange={(_, mode: PosViewMode | null) => {
      if (mode !== null) onChange(mode);
    }}
    aria-label="Vista de productos"
    data-testid="view-mode-toggle"
  >
    <Tooltip title="Vista de lista">
      <ToggleButton
        value="list"
        aria-label="Vista de lista"
        aria-pressed={value === 'list'}
        data-testid="view-mode-list"
      >
        <ViewList fontSize="small" />
      </ToggleButton>
    </Tooltip>
    <Tooltip title="Vista de cuadrícula">
      <ToggleButton
        value="grid"
        aria-label="Vista de cuadrícula"
        aria-pressed={value === 'grid'}
        data-testid="view-mode-grid"
      >
        <GridView fontSize="small" />
      </ToggleButton>
    </Tooltip>
  </ToggleButtonGroup>
);
