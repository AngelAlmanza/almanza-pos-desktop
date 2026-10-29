import {
  DeleteOutline,
  Edit,
  History,
  ImageOutlined,
  LocalShipping,
  ToggleOff,
  ToggleOn,
} from '@mui/icons-material';
import {
  Alert,
  Box,
  Button,
  Chip,
  IconButton,
  Paper,
  Skeleton,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Tooltip,
  Typography,
} from '@mui/material';
import type { Product, ProductColumnKey, ProductPermissions } from '@modules/catalog/products/types';
import { useProductImageSource } from '@modules/catalog/products/hooks/useProductImageSource';
import { StockStatusChip } from '@modules/catalog/products/components/StockStatusChip';
import { getStockStatus } from '@modules/catalog/products/utils/stockStatus';
import { formatCurrency } from '@modules/shared/utils/FormatCurrency';

export type ProductTableView = 'loading' | 'error' | 'empty' | 'no-results' | 'rows';

interface ProductTableProps {
  view: ProductTableView;
  products: Product[];
  permissions: ProductPermissions;
  visibleColumns: ProductColumnKey[];
  errorMessage: string;
  onRetry: () => void;
  onClearFilters: () => void;
  onCreate: () => void;
  onAdjust: (product: Product, trigger: HTMLElement) => void;
  onHistory: (product: Product, trigger: HTMLElement) => void;
  onEdit: (product: Product) => void;
  onToggleActive: (product: Product) => void;
  onDelete: (product: Product) => void;
}

// Limita el texto a dos líneas y deja "…" para el resto.
const CLAMP_2_SX = {
  display: '-webkit-box',
  WebkitLineClamp: 2,
  WebkitBoxOrient: 'vertical',
  overflow: 'hidden',
  overflowWrap: 'anywhere',
} as const;
const HEAD_SX = { backgroundColor: '#f5f3f0', fontSize: '0.7rem', textTransform: 'uppercase' } as const;

function Thumbnail({ imageFile }: { imageFile: string | null }) {
  const getSource = useProductImageSource();
  const src = getSource(imageFile);
  return (
    <Box
      sx={{
        width: 36,
        height: 36,
        borderRadius: 1,
        overflow: 'hidden',
        backgroundColor: 'rgba(26,32,53,0.05)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        color: 'text.disabled',
        flexShrink: 0,
      }}
    >
      {src ? (
        <Box component="img" src={src} alt="" sx={{ width: '100%', height: '100%', objectFit: 'cover' }} />
      ) : (
        <ImageOutlined fontSize="small" />
      )}
    </Box>
  );
}

function RowAction({
  label,
  testId,
  onClick,
  color,
  children,
}: {
  label: string;
  testId: string;
  onClick: (event: React.MouseEvent<HTMLElement>) => void;
  color?: 'error';
  children: React.ReactNode;
}) {
  return (
    <Tooltip title={label}>
      <IconButton size="small" aria-label={label} data-testid={testId} color={color} onClick={onClick}>
        {children}
      </IconButton>
    </Tooltip>
  );
}

export function ProductTable({
  view,
  products,
  permissions,
  visibleColumns,
  errorMessage,
  onRetry,
  onClearFilters,
  onCreate,
  onAdjust,
  onHistory,
  onEdit,
  onToggleActive,
  onDelete,
}: ProductTableProps) {
  const showActions =
    permissions.canAdjustStock || permissions.canViewHistory || permissions.canManageProducts;
  const show = (key: ProductColumnKey): boolean => visibleColumns.includes(key);
  // Producto (fija) + columnas visibles + Acciones (si aplica).
  const columnCount = 1 + visibleColumns.length + (showActions ? 1 : 0);

  const message = (content: React.ReactNode) => (
    <TableRow>
      <TableCell colSpan={columnCount} align="center" sx={{ py: 4, color: 'text.secondary' }}>
        {content}
      </TableCell>
    </TableRow>
  );

  return (
    <TableContainer
      component={Paper}
      elevation={0}
      sx={{ border: '1px solid rgba(26,32,53,0.10)', flex: 1, minWidth: 0, overflowX: 'auto' }}
    >
      <Table size="small" sx={{ tableLayout: 'auto' }}>
        <TableHead>
          <TableRow>
            <TableCell scope="col" sx={HEAD_SX}>Producto</TableCell>
            {show('barcode') && <TableCell scope="col" sx={HEAD_SX}>Código</TableCell>}
            {show('category') && <TableCell scope="col" sx={HEAD_SX}>Categoría</TableCell>}
            {show('unit') && <TableCell scope="col" sx={HEAD_SX}>Unidad</TableCell>}
            {show('price') && <TableCell scope="col" align="right" sx={HEAD_SX}>Precio</TableCell>}
            {show('stock') && <TableCell scope="col" align="right" sx={HEAD_SX}>Stock</TableCell>}
            {show('min_stock') && <TableCell scope="col" align="right" sx={HEAD_SX}>Mín.</TableCell>}
            {show('status') && <TableCell scope="col" sx={HEAD_SX}>Estado</TableCell>}
            {showActions && <TableCell scope="col" align="center" sx={HEAD_SX}>Acciones</TableCell>}
          </TableRow>
        </TableHead>
        <TableBody>
          {view === 'loading' &&
            [0, 1, 2, 3, 4, 5, 6, 7].map((i) => (
              <TableRow key={i}>
                <TableCell colSpan={columnCount}>
                  <Skeleton height={28} />
                </TableCell>
              </TableRow>
            ))}

          {view === 'error' &&
            message(
              <Alert
                severity="error"
                sx={{ justifyContent: 'center' }}
                action={
                  <Button color="inherit" size="small" onClick={onRetry} data-testid="products-retry">
                    Reintentar
                  </Button>
                }
              >
                {errorMessage}
              </Alert>,
            )}

          {view === 'empty' &&
            message(
              <Box>
                <Typography color="text.secondary" sx={{ mb: permissions.canManageProducts ? 1.5 : 0 }}>
                  Aún no hay productos
                </Typography>
                {permissions.canManageProducts && (
                  <Button variant="contained" size="small" onClick={onCreate} data-testid="empty-create-product">
                    Crear producto
                  </Button>
                )}
              </Box>,
            )}

          {view === 'no-results' &&
            message(
              <Box>
                <Typography color="text.secondary" sx={{ mb: 1.5 }}>
                  Ningún producto coincide con estos filtros
                </Typography>
                <Button variant="outlined" size="small" onClick={onClearFilters} data-testid="clear-filters">
                  Quitar filtros
                </Button>
              </Box>,
            )}

          {view === 'rows' &&
            products.map((product) => (
              <TableRow
                key={product.id}
                hover
                sx={{ opacity: product.active ? 1 : 0.6 }}
                data-testid={`product-row-${product.id}`}
              >
                <TableCell sx={{ maxWidth: 320, minWidth: 200 }}>
                  <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5 }}>
                    <Thumbnail imageFile={product.image_file} />
                    <Box sx={{ minWidth: 0, flex: 1 }}>
                      <Typography
                        variant="body2"
                        fontWeight={600}
                        title={product.name}
                        sx={CLAMP_2_SX}
                        data-testid={`product-name-${product.id}`}
                      >
                        {product.name}
                      </Typography>
                      {product.description && (
                        <Typography
                          variant="caption"
                          color="text.secondary"
                          component="div"
                          title={product.description}
                          sx={CLAMP_2_SX}
                          data-testid={`product-description-${product.id}`}
                        >
                          {product.description}
                        </Typography>
                      )}
                    </Box>
                  </Box>
                </TableCell>
                {show('barcode') && (
                  <TableCell sx={{ color: 'text.secondary', fontSize: '0.8125rem', fontFamily: 'monospace' }}>
                    {product.barcode || '—'}
                  </TableCell>
                )}
                {show('category') && (
                  <TableCell sx={{ color: 'text.secondary' }}>
                    {product.category_name || 'Sin categoría'}
                  </TableCell>
                )}
                {show('unit') && (
                  <TableCell>
                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.75 }}>
                      <Chip
                        label={product.unit.toLocaleUpperCase()}
                        size="small"
                        color="secondary"
                        variant="outlined"
                        sx={{ height: 22, fontSize: '0.6875rem' }}
                      />
                      {product.is_bulk && (
                        <Chip
                          label="A granel"
                          size="small"
                          color="primary"
                          variant="outlined"
                          sx={{ height: 22, fontSize: '0.6875rem' }}
                        />
                      )}
                    </Box>
                  </TableCell>
                )}
                {show('price') && (
                  <TableCell align="right" sx={{ fontWeight: 600, fontVariantNumeric: 'tabular-nums' }}>
                    {formatCurrency(product.price)}
                  </TableCell>
                )}
                {show('stock') && (
                  <TableCell align="right" sx={{ fontVariantNumeric: 'tabular-nums' }}>
                    {product.stock} {product.unit}
                  </TableCell>
                )}
                {show('min_stock') && (
                  <TableCell align="right" sx={{ color: 'text.secondary', fontVariantNumeric: 'tabular-nums' }}>
                    {product.min_stock}
                  </TableCell>
                )}
                {show('status') && (
                  <TableCell>
                    <StockStatusChip status={getStockStatus(product)} />
                  </TableCell>
                )}
                {showActions && (
                  <TableCell align="center" sx={{ p: 0.5, whiteSpace: 'nowrap' }}>
                    {permissions.canAdjustStock && product.active && (
                      <Tooltip title={`Ajustar stock de ${product.name}`}>
                        <Button
                          size="small"
                          startIcon={<LocalShipping sx={{ fontSize: 16 }} />}
                          aria-label={`Ajustar stock de ${product.name}`}
                          data-testid={`adjust-stock-${product.id}`}
                          onClick={(event) => onAdjust(product, event.currentTarget)}
                        >
                          Ajustar stock
                        </Button>
                      </Tooltip>
                    )}
                    {permissions.canViewHistory && (
                      <RowAction
                        label={`Ver historial de ${product.name}`}
                        testId={`product-history-${product.id}`}
                        onClick={(event) => onHistory(product, event.currentTarget)}
                      >
                        <History sx={{ fontSize: 18 }} />
                      </RowAction>
                    )}
                    {permissions.canManageProducts && (
                      <>
                        <RowAction
                          label={`Editar ${product.name}`}
                          testId={`product-edit-${product.id}`}
                          onClick={() => onEdit(product)}
                        >
                          <Edit sx={{ fontSize: 18 }} />
                        </RowAction>
                        <RowAction
                          label={`${product.active ? 'Desactivar' : 'Activar'} ${product.name}`}
                          testId={`product-toggle-${product.id}`}
                          onClick={() => onToggleActive(product)}
                        >
                          {product.active ? <ToggleOn sx={{ fontSize: 22 }} color="primary" /> : <ToggleOff sx={{ fontSize: 22 }} />}
                        </RowAction>
                        <RowAction
                          label={`Eliminar ${product.name}`}
                          testId={`product-delete-${product.id}`}
                          color="error"
                          onClick={() => onDelete(product)}
                        >
                          <DeleteOutline sx={{ fontSize: 18 }} />
                        </RowAction>
                      </>
                    )}
                  </TableCell>
                )}
              </TableRow>
            ))}
        </TableBody>
      </Table>
    </TableContainer>
  );
}
