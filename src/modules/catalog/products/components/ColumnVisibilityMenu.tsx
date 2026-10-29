import { Checkbox, FormControl, InputLabel, ListItemText, MenuItem, Select } from '@mui/material';
import type { SelectChangeEvent } from '@mui/material';
import type { ProductColumnKey } from '@modules/catalog/products/types';
import {
  PRODUCT_COLUMNS,
  normalizeVisibleColumns,
} from '@modules/catalog/products/utils/columnVisibility';

interface ColumnVisibilityMenuProps {
  visible: ProductColumnKey[];
  onChange: (next: ProductColumnKey[]) => void;
}

const LABEL_ID = 'column-visibility-label';
const FIXED_COLUMNS = ['Producto', 'Acciones'] as const;

export function ColumnVisibilityMenu({ visible, onChange }: ColumnVisibilityMenuProps) {
  const handleChange = (event: SelectChangeEvent<string[]>) => {
    const value = event.target.value;
    onChange(normalizeVisibleColumns(typeof value === 'string' ? value.split(',') : value));
  };

  return (
    <FormControl size="small" sx={{ minWidth: 190 }}>
      <InputLabel id={LABEL_ID}>Columnas</InputLabel>
      <Select<string[]>
        multiple
        labelId={LABEL_ID}
        label="Columnas"
        value={visible}
        onChange={handleChange}
        renderValue={(selected) => `${selected.length} de ${PRODUCT_COLUMNS.length} columnas`}
        data-testid="column-visibility"
      >
        {FIXED_COLUMNS.map((label) => (
          <MenuItem key={label} value={label} disabled data-testid={`column-option-fixed-${label}`}>
            <Checkbox checked disabled size="small" />
            <ListItemText primary={label} />
          </MenuItem>
        ))}
        {PRODUCT_COLUMNS.map((column) => (
          <MenuItem key={column.key} value={column.key} data-testid={`column-option-${column.key}`}>
            <Checkbox checked={visible.includes(column.key)} size="small" />
            <ListItemText primary={column.label} />
          </MenuItem>
        ))}
      </Select>
    </FormControl>
  );
}
