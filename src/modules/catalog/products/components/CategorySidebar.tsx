import { Add, DeleteOutline, Edit } from '@mui/icons-material';
import {
  Box,
  IconButton,
  List,
  ListItem,
  ListItemButton,
  ListItemText,
  Paper,
  Skeleton,
  Tooltip,
  Typography,
} from '@mui/material';
import type { Category } from '@modules/catalog/categories/types';
import type { CategoryFilter } from '@modules/catalog/products/types';
import { NO_CATEGORY_KEY, type CategoryCounts } from '@modules/catalog/products/utils/stockStatus';
import { truncateText } from '@modules/catalog/products/utils/truncateText';

interface CategorySidebarProps {
  categories: Category[];
  counts: CategoryCounts;
  selected: CategoryFilter;
  loading: boolean;
  canManage: boolean;
  onSelect: (value: CategoryFilter) => void;
  onCreate: () => void;
  onEdit: (category: Category) => void;
  onDelete: (category: Category) => void;
}

const SELECTED_BG = 'rgba(13,107,95,0.10)';
const MAX_NAME_CHARS = 24;
// Ancho reservado a la derecha para los botones editar y eliminar (2 x 26 px + margen).
const ACTIONS_WIDTH = 64;

// Conteo de productos dentro de un círculo con fondo y ancho mínimo fijo.
function CountBadge({ value, testId }: { value: number; testId?: string }) {
  return (
    <Box
      component="span"
      data-testid={testId}
      sx={{
        minWidth: 24,
        height: 24,
        px: 0.5,
        ml: 1,
        boxSizing: 'border-box',
        flexShrink: 0,
        display: 'inline-flex',
        alignItems: 'center',
        justifyContent: 'center',
        borderRadius: '12px',
        backgroundColor: 'rgba(26,32,53,0.08)',
        color: 'text.primary',
        fontSize: '0.75rem',
        fontWeight: 600,
        fontVariantNumeric: 'tabular-nums',
      }}
    >
      {value}
    </Box>
  );
}

export function CategorySidebar({
  categories,
  counts,
  selected,
  loading,
  canManage,
  onSelect,
  onCreate,
  onEdit,
  onDelete,
}: CategorySidebarProps) {
  const itemSx = (isSelected: boolean) => ({
    borderRadius: 1,
    py: 0.5,
    backgroundColor: isSelected ? SELECTED_BG : undefined,
    color: isSelected ? 'primary.main' : 'text.primary',
  });

  const countOf = (key: string): number => counts[key] ?? 0;

  return (
    <Paper
      component="nav"
      aria-label="Categorías"
      elevation={0}
      sx={{
        width: { md: 200, lg: 240 },
        flexShrink: 0,
        border: '1px solid rgba(26,32,53,0.10)',
        p: 1,
        alignSelf: 'flex-start',
      }}
    >
      <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', px: 1, py: 0.5 }}>
        <Typography
          variant="caption"
          sx={{ textTransform: 'uppercase', letterSpacing: '0.04em', color: 'text.secondary' }}
        >
          Categorías
        </Typography>
        {canManage && (
          <Tooltip title="Nueva categoría">
            <IconButton
              size="small"
              aria-label="Nueva categoría"
              onClick={onCreate}
              data-testid="category-create"
            >
              <Add fontSize="small" />
            </IconButton>
          </Tooltip>
        )}
      </Box>
      {loading ? (
        <Box sx={{ px: 1 }}>
          {[0, 1, 2, 3].map((i) => (
            <Skeleton key={i} height={32} />
          ))}
        </Box>
      ) : (
        <List dense disablePadding>
          <ListItem disablePadding>
            <ListItemButton
              sx={itemSx(selected === 'all')}
              aria-current={selected === 'all' ? 'true' : undefined}
              onClick={() => onSelect('all')}
              data-testid="category-all"
            >
              <ListItemText primary="Todas" />
              <CountBadge value={countOf('all')} />
            </ListItemButton>
          </ListItem>
          <ListItem disablePadding>
            <ListItemButton
              sx={itemSx(selected === 'none')}
              aria-current={selected === 'none' ? 'true' : undefined}
              onClick={() => onSelect('none')}
              data-testid="category-none"
            >
              <ListItemText primary="Sin categoría" />
              <CountBadge value={countOf(NO_CATEGORY_KEY)} />
            </ListItemButton>
          </ListItem>
          {categories.map((category) => {
            const isSelected = selected === category.id;
            const count = countOf(String(category.id));
            return (
              <ListItem key={category.id} disablePadding sx={{ display: 'flex', alignItems: 'center' }}>
                <ListItemButton
                  sx={{ ...itemSx(isSelected), flex: 1, minWidth: 0 }}
                  aria-current={isSelected ? 'true' : undefined}
                  aria-label={`${category.name}, ${count} productos`}
                  onClick={() => onSelect(category.id)}
                  data-testid={`category-${category.id}`}
                >
                  <ListItemText
                    primary={truncateText(category.name, MAX_NAME_CHARS)}
                    slotProps={{ primary: { noWrap: true, title: category.name } }}
                    sx={{ minWidth: 0 }}
                  />
                  <CountBadge value={count} testId={`category-count-${category.id}`} />
                </ListItemButton>
                {canManage && (
                  <Box sx={{ display: 'flex', width: ACTIONS_WIDTH, flexShrink: 0, justifyContent: 'flex-end' }}>
                    <Tooltip title={`Editar ${category.name}`}>
                      <IconButton
                        size="small"
                        aria-label={`Editar ${category.name}`}
                        onClick={() => onEdit(category)}
                        data-testid={`category-edit-${category.id}`}
                      >
                        <Edit sx={{ fontSize: 14 }} />
                      </IconButton>
                    </Tooltip>
                    <Tooltip title={`Eliminar ${category.name}`}>
                      <IconButton
                        size="small"
                        aria-label={`Eliminar ${category.name}`}
                        onClick={() => onDelete(category)}
                        data-testid={`category-delete-${category.id}`}
                      >
                        <DeleteOutline sx={{ fontSize: 14 }} />
                      </IconButton>
                    </Tooltip>
                  </Box>
                )}
              </ListItem>
            );
          })}
        </List>
      )}
    </Paper>
  );
}
