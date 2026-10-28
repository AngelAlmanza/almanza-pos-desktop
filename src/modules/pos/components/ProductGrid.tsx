import { useEffect, useMemo, useRef, useState } from 'react';
import { ArrowDownward, ArrowUpward } from '@mui/icons-material';
import {
  Alert,
  Box,
  Button,
  FormControl,
  IconButton,
  InputLabel,
  LinearProgress,
  MenuItem,
  Select,
  Skeleton,
  Tooltip,
  Typography,
} from '@mui/material';
import type { Product } from '@modules/catalog/products/types';
import { useProductImageSource } from '@modules/catalog/products/hooks/useProductImageSource';
import { useProductGrid } from '@modules/pos/hooks/useProductGrid';
import { groupProducts, sortProducts } from '@modules/pos/utils/productGrid';
import type { GridSortDirection, GridSortKey, GridStatus } from '@modules/pos/utils/productGrid';
import { ProductCard } from './ProductCard';

/** Cuatro columnas mínimas de 176 px: 3 por fila a 1366 px y 7 a 1920 px (FR2.3). */
const GRID_COLUMNS = 'repeat(auto-fill, minmax(176px, 1fr))';
const SKELETON_COUNT = 8;

const SORT_LABELS: Record<GridSortKey, string> = {
  name: 'Nombre',
  price: 'Precio',
  stock: 'Stock',
};

interface ProductGridProps {
  /** Texto de la barra; filtra desde el primer carácter (FR2.6). */
  term: string;
  /** Cambia tras cada venta cobrada y dispara la recarga del stock (FR2.11). */
  salesVersion: number;
  onProductSelect: (product: Product) => void;
  /** Limpia la barra y devuelve el foco a ella. */
  onClearSearch: () => void;
}

interface GridSortControlProps {
  sortKey: GridSortKey;
  direction: GridSortDirection;
  onKeyChange: (key: GridSortKey) => void;
  onDirectionToggle: () => void;
}

const GridSortControl = ({ sortKey, direction, onKeyChange, onDirectionToggle }: GridSortControlProps) => (
  <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
    <FormControl size="small" sx={{ minWidth: 130 }} data-testid="grid-sort">
      <InputLabel id="grid-sort-label">Ordenar por</InputLabel>
      <Select
        labelId="grid-sort-label"
        label="Ordenar por"
        value={sortKey}
        onChange={(event) => onKeyChange(event.target.value as GridSortKey)}
      >
        {(Object.keys(SORT_LABELS) as GridSortKey[]).map((key) => (
          <MenuItem key={key} value={key}>{SORT_LABELS[key]}</MenuItem>
        ))}
      </Select>
    </FormControl>
    <Tooltip title={direction === 'asc' ? 'Orden ascendente' : 'Orden descendente'}>
      <IconButton
        size="small"
        onClick={onDirectionToggle}
        aria-label={direction === 'asc' ? 'Orden ascendente, cambiar a descendente' : 'Orden descendente, cambiar a ascendente'}
        data-testid="grid-sort-direction"
      >
        {direction === 'asc' ? <ArrowUpward fontSize="small" /> : <ArrowDownward fontSize="small" />}
      </IconButton>
    </Tooltip>
  </Box>
);

interface GridStatusNoticeProps {
  status: GridStatus;
  term: string;
  onRetry: () => void;
  onClearSearch: () => void;
}

/** Estados sin tarjetas (carga, error, vacíos) y el aviso de stock atrasado. */
const GridStatusNotice = ({ status, term, onRetry, onClearSearch }: GridStatusNoticeProps) => {
  if (status === 'loading') {
    return (
      <Box
        sx={{ display: 'grid', gridTemplateColumns: GRID_COLUMNS, gap: 1.5 }}
        data-testid="grid-loading"
        aria-busy="true"
      >
        {Array.from({ length: SKELETON_COUNT }, (_, index) => (
          <Skeleton key={index} variant="rounded" height={230} />
        ))}
      </Box>
    );
  }
  if (status === 'error') {
    return (
      <Alert
        severity="error"
        action={
          <Button color="inherit" size="small" onClick={onRetry} data-testid="grid-retry">
            Reintentar
          </Button>
        }
      >
        No se pudieron cargar los productos
      </Alert>
    );
  }
  if (status === 'empty-catalog') {
    return (
      <Typography color="text.secondary" textAlign="center" sx={{ py: 6 }} data-testid="grid-empty-catalog">
        No hay productos activos
      </Typography>
    );
  }
  if (status === 'empty-filter') {
    return (
      <Box sx={{ textAlign: 'center', py: 6 }} data-testid="grid-empty-filter">
        <Typography color="text.secondary" sx={{ mb: 1.5 }}>
          Sin coincidencias para «{term}»
        </Typography>
        <Button variant="outlined" size="small" onClick={onClearSearch} data-testid="grid-clear-search">
          Limpiar búsqueda
        </Button>
      </Box>
    );
  }
  if (status === 'stale') {
    return (
      <Alert
        severity="warning"
        sx={{ mb: 1.5 }}
        action={
          <Button color="inherit" size="small" onClick={onRetry} data-testid="grid-retry">
            Reintentar
          </Button>
        }
      >
        No se pudo actualizar el stock
      </Alert>
    );
  }
  return null;
};

export const ProductGrid = ({ term, salesVersion, onProductSelect, onClearSearch }: ProductGridProps) => {
  const grid = useProductGrid(term);
  const { reload } = grid;
  const getImageSource = useProductImageSource();
  const [sortKey, setSortKey] = useState<GridSortKey>('name');
  const [direction, setDirection] = useState<GridSortDirection>('asc');
  const scrollRef = useRef<HTMLDivElement>(null);
  const lastSalesVersionRef = useRef(salesVersion);

  // G8: tras una venta cobrada se recarga el stock; la primera carga ya la hace el hook.
  useEffect(() => {
    if (lastSalesVersionRef.current === salesVersion) return;
    lastSalesVersionRef.current = salesVersion;
    reload();
  }, [salesVersion, reload]);

  // W2.5: al cambiar el filtro, el scroll vuelve arriba.
  useEffect(() => {
    scrollRef.current?.scrollTo({ top: 0 });
  }, [grid.term]);

  const groups = useMemo(
    () => groupProducts(sortProducts(grid.products, sortKey, direction)),
    [grid.products, sortKey, direction],
  );

  // La URL de cada imagen se resuelve una vez aquí; las tarjetas solo la reciben.
  const imageUrls = useMemo(() => {
    const urls = new Map<number, string | null>();
    for (const product of grid.products) {
      urls.set(product.id, getImageSource(product.image_file));
    }
    return urls;
  }, [grid.products, getImageSource]);

  const hasCards = grid.status === 'populated' || grid.status === 'refreshing' || grid.status === 'stale';
  const productCount = hasCards ? grid.products.length : 0;

  return (
    <Box
      sx={{ flex: 1, minHeight: 0, display: 'flex', flexDirection: 'column' }}
      data-testid="product-grid"
    >
      <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', mb: 1, minHeight: 40 }}>
        <Typography variant="subtitle2" color="text.secondary">
          {hasCards ? `${productCount} ${productCount === 1 ? 'producto' : 'productos'}` : ''}
        </Typography>
        <GridSortControl
          sortKey={sortKey}
          direction={direction}
          onKeyChange={setSortKey}
          onDirectionToggle={() => setDirection((current) => (current === 'asc' ? 'desc' : 'asc'))}
        />
      </Box>
      {grid.status === 'refreshing' && (
        <LinearProgress sx={{ height: 2 }} data-testid="grid-refreshing" />
      )}
      <Box
        ref={scrollRef}
        role="region"
        aria-label="Productos"
        sx={{ flex: 1, minHeight: 0, overflowY: 'auto', pr: 0.5 }}
      >
        <GridStatusNotice
          status={grid.status}
          term={grid.term}
          onRetry={reload}
          onClearSearch={onClearSearch}
        />
        {hasCards && groups.map((group) => (
          <Box
            key={group.key}
            component="section"
            aria-labelledby={`product-group-title-${group.key}`}
            data-testid={`product-group-${group.categoryId ?? 'none'}`}
            sx={{ mb: 2 }}
          >
            <Typography
              id={`product-group-title-${group.key}`}
              variant="overline"
              component="h3"
              sx={{
                position: 'sticky',
                top: 0,
                zIndex: 1,
                display: 'block',
                py: 0.5,
                mb: 1,
                bgcolor: 'background.default',
                color: 'text.secondary',
                fontWeight: 600,
              }}
            >
              {group.name} · {group.products.length}
            </Typography>
            <Box
              component="ul"
              sx={{ display: 'grid', gridTemplateColumns: GRID_COLUMNS, gap: 1.5, listStyle: 'none', m: 0, p: 0 }}
            >
              {group.products.map((product) => (
                <Box component="li" key={product.id} sx={{ display: 'flex' }}>
                  <ProductCard
                    product={product}
                    imageUrl={imageUrls.get(product.id) ?? null}
                    onSelect={onProductSelect}
                  />
                </Box>
              ))}
            </Box>
          </Box>
        ))}
      </Box>
      {/* Anuncia el número de productos a lectores de pantalla (NFR6). */}
      <Box
        role="status"
        aria-live="polite"
        data-testid="product-grid-announcement"
        sx={{
          position: 'absolute',
          width: 1,
          height: 1,
          overflow: 'hidden',
          clip: 'rect(0 0 0 0)',
          whiteSpace: 'nowrap',
        }}
      >
        {hasCards ? `${productCount} ${productCount === 1 ? 'producto' : 'productos'}` : ''}
      </Box>
    </Box>
  );
};
