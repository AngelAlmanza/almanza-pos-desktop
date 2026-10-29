import { Add } from '@mui/icons-material';
import {
  Alert,
  Box,
  Button,
  FormControlLabel,
  Snackbar,
  Switch,
  Tab,
  Tabs,
  ToggleButton,
  ToggleButtonGroup,
  Typography,
} from '@mui/material';
import { useCallback, useEffect, useMemo, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { useAuth } from '@modules/auth/context/AuthContext';
import { CategoryFormDialog } from '@modules/catalog/products/components/CategoryFormDialog';
import { CategorySidebar } from '@modules/catalog/products/components/CategorySidebar';
import { ColumnVisibilityMenu } from '@modules/catalog/products/components/ColumnVisibilityMenu';
import { ProductFormDialog } from '@modules/catalog/products/components/ProductFormDialog';
import {
  ProductSidePanel,
  type PanelSection,
} from '@modules/catalog/products/components/ProductSidePanel';
import { ProductTable, type ProductTableView } from '@modules/catalog/products/components/ProductTable';
import { StockHistoryTab } from '@modules/catalog/products/components/StockHistoryTab';
import { StockSummaryCards } from '@modules/catalog/products/components/StockSummaryCards';
import type { Category } from '@modules/catalog/categories/types';
import { CategoryService } from '@modules/catalog/categories/services/CategoryService';
import { ProductService } from '@modules/catalog/products/services/ProductService';
import type {
  CategoryFilter,
  Product,
  ProductColumnKey,
  ProductFilters,
  StockStatusFilter,
} from '@modules/catalog/products/types';
import { describeCategoryDeletion } from '@modules/catalog/products/utils/categoryDeletion';
import { ALL_COLUMN_KEYS } from '@modules/catalog/products/utils/columnVisibility';
import { getProductPermissions } from '@modules/catalog/products/utils/productPermissions';
import {
  compareProductsByName,
  countByCategory,
  filterProducts,
  summarizeStock,
} from '@modules/catalog/products/utils/stockStatus';
import { ConfirmModal } from '@modules/shared/components/ConfirmModal';

interface PanelState {
  product: Product;
  section: PanelSection;
}

const DEFAULT_FILTERS: ProductFilters = { category: 'all', status: 'all', showInactive: false };

export function ProductsPage() {
  const { user, isAdmin } = useAuth();
  const permissions = useMemo(() => getProductPermissions(isAdmin), [isAdmin]);
  const [searchParams, setSearchParams] = useSearchParams();
  const tab: 'products' | 'history' =
    permissions.canViewHistory && searchParams.get('tab') === 'history' ? 'history' : 'products';

  const [products, setProducts] = useState<Product[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState('');
  const [notice, setNotice] = useState('');
  const [filters, setFilters] = useState<ProductFilters>(DEFAULT_FILTERS);
  const [visibleColumns, setVisibleColumns] = useState<ProductColumnKey[]>(ALL_COLUMN_KEYS);

  const [panel, setPanel] = useState<PanelState | null>(null);
  const [historyRefresh, setHistoryRefresh] = useState(0);

  const [productDialogOpen, setProductDialogOpen] = useState(false);
  const [editing, setEditing] = useState<Product | null>(null);
  const [newCategoryId, setNewCategoryId] = useState<number | null>(null);
  const [categoryDialog, setCategoryDialog] = useState<{
    open: boolean;
    editing: Category | null;
    forProduct: boolean;
  }>({ open: false, editing: null, forProduct: false });

  const [productToDelete, setProductToDelete] = useState<Product | null>(null);
  const [categoryToDelete, setCategoryToDelete] = useState<Category | null>(null);

  const loadData = useCallback(async () => {
    setLoading(true);
    setLoadError('');
    try {
      const [prods, cats] = await Promise.all([ProductService.getAll(), CategoryService.getAll()]);
      setProducts(prods);
      setCategories(cats);
    } catch (err) {
      setLoadError(String(err));
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void loadData();
  }, [loadData]);

  const visibleProducts = useMemo(
    () => filterProducts(products, filters).sort(compareProductsByName),
    [products, filters],
  );
  const summary = useMemo(() => (loading ? null : summarizeStock(products)), [products, loading]);
  const counts = useMemo(
    () => countByCategory(products, filters.showInactive),
    [products, filters.showInactive],
  );

  let view: ProductTableView = 'rows';
  if (loading) view = 'loading';
  else if (loadError) view = 'error';
  else if (products.length === 0) view = 'empty';
  else if (visibleProducts.length === 0) view = 'no-results';

  const filtersActive =
    filters.category !== 'all' || filters.status !== 'all' || filters.showInactive;

  const setTab = (next: 'products' | 'history') => {
    setSearchParams(next === 'history' ? { tab: 'history' } : {}, { replace: true });
  };

  // ---- Panel lateral ----
  const openPanel = (product: Product, section: PanelSection) => setPanel({ product, section });

  const handleAdjusted = (updated: Product) => {
    setProducts((prev) => prev.map((p) => (p.id === updated.id ? updated : p)));
    setHistoryRefresh((n) => n + 1);
  };

  const handleOpenFromHistory = (productId: number) => {
    const product = products.find((p) => p.id === productId);
    if (!product) return;
    setTab('products');
    openPanel(product, 'history');
  };

  // ---- Productos ----
  const handleNewProduct = () => {
    setEditing(null);
    setNewCategoryId(null);
    setProductDialogOpen(true);
  };

  const handleEditProduct = (product: Product) => {
    setEditing(product);
    setNewCategoryId(null);
    setProductDialogOpen(true);
  };

  const handleProductSaved = () => {
    setProductDialogOpen(false);
    setEditing(null);
    void loadData();
  };

  const handleToggleActive = async (product: Product) => {
    try {
      await ProductService.update({ id: product.id, active: !product.active });
      await loadData();
    } catch (err) {
      setNotice(String(err));
    }
  };

  const handleConfirmDeleteProduct = async () => {
    if (!productToDelete) return;
    const target = productToDelete;
    setProductToDelete(null);
    try {
      await ProductService.delete(target.id);
      await loadData();
    } catch (err) {
      setNotice(`${String(err)} Si ya no lo vendes, puedes desactivarlo en su lugar.`);
    }
  };

  // ---- Categorías ----
  const handleCategorySaved = async (category: Category) => {
    const forProduct = categoryDialog.forProduct;
    setCategoryDialog({ open: false, editing: null, forProduct: false });
    await loadData();
    if (forProduct) setNewCategoryId(category.id);
  };

  const handleConfirmDeleteCategory = async () => {
    if (!categoryToDelete) return;
    const target = categoryToDelete;
    setCategoryToDelete(null);
    try {
      await CategoryService.delete(target.id);
      if (filters.category === target.id) setFilters((prev) => ({ ...prev, category: 'all' }));
      await loadData();
    } catch (err) {
      setNotice(String(err));
    }
  };

  const productsInCategory = (categoryId: number): number =>
    products.filter((p) => p.category_id === categoryId).length;

  const handleToggleStatus = (status: 'low' | 'out') => {
    setFilters((prev) => ({ ...prev, status: prev.status === status ? 'all' : status }));
  };

  return (
    <Box>
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
        <Typography variant="h5">Productos</Typography>
        {permissions.canManageProducts && tab === 'products' && (
          <Button
            variant="contained"
            size="small"
            startIcon={<Add fontSize="small" />}
            onClick={handleNewProduct}
            data-testid="new-product"
          >
            Nuevo producto
          </Button>
        )}
      </Box>

      {permissions.canViewHistory && (
        <Tabs value={tab} onChange={(_, value: 'products' | 'history') => setTab(value)} sx={{ mb: 2 }}>
          <Tab value="products" label="Productos" data-testid="tab-products" />
          <Tab value="history" label="Historial de stock" data-testid="tab-history" />
        </Tabs>
      )}

      {tab === 'history' && (
        <StockHistoryTab refreshKey={historyRefresh} onOpenProduct={handleOpenFromHistory} />
      )}

      {tab === 'products' && (
        <>
          <StockSummaryCards
            summary={summary}
            statusFilter={filters.status}
            onToggleStatus={handleToggleStatus}
          />

          <Box
            sx={{ display: 'flex', alignItems: 'center', gap: 2, mb: 2, flexWrap: 'wrap' }}
          >
            <Box sx={{ display: 'flex', flexDirection: 'row', alignItems: 'center', gap: 1 }}>
            <Typography
              id="stock-filter-label"
              variant="body2"
              sx={{ whiteSpace: 'nowrap', color: 'text.secondary' }}
            >
              Estado de stock:
            </Typography>
            <ToggleButtonGroup
              exclusive
              size="small"
              aria-labelledby="stock-filter-label"
              value={filters.status}
              onChange={(_, value: StockStatusFilter | null) => {
                if (value !== null) setFilters((prev) => ({ ...prev, status: value }));
              }}
            >
              <ToggleButton value="all" data-testid="filter-status-all" sx={{ textTransform: 'none' }}>
                Todos
              </ToggleButton>
              <ToggleButton value="normal" data-testid="filter-status-normal" sx={{ textTransform: 'none' }}>
                Normal
              </ToggleButton>
              <ToggleButton value="low" data-testid="filter-status-low" sx={{ textTransform: 'none' }}>
                Bajo
              </ToggleButton>
              <ToggleButton value="out" data-testid="filter-status-out" sx={{ textTransform: 'none' }}>
                Agotado
              </ToggleButton>
            </ToggleButtonGroup>
            </Box>
            <ColumnVisibilityMenu visible={visibleColumns} onChange={setVisibleColumns} />
            <FormControlLabel
              sx={{ m: 0 }}
              control={
                <Switch
                  size="small"
                  checked={filters.showInactive}
                  onChange={(e) => setFilters((prev) => ({ ...prev, showInactive: e.target.checked }))}
                  slotProps={{ input: { 'data-testid': 'filter-inactive' } as object }}
                />
              }
              label="Mostrar inactivos"
            />
          </Box>

          <Box sx={{ display: 'flex', gap: 2, alignItems: 'flex-start' }}>
            <CategorySidebar
              categories={categories}
              counts={counts}
              selected={filters.category}
              loading={loading}
              canManage={permissions.canManageCategories}
              onSelect={(value: CategoryFilter) => setFilters((prev) => ({ ...prev, category: value }))}
              onCreate={() => setCategoryDialog({ open: true, editing: null, forProduct: false })}
              onEdit={(category) => setCategoryDialog({ open: true, editing: category, forProduct: false })}
              onDelete={setCategoryToDelete}
            />
            <ProductTable
              view={view}
              products={visibleProducts}
              permissions={permissions}
              visibleColumns={visibleColumns}
              errorMessage={loadError}
              onRetry={() => void loadData()}
              onClearFilters={() => setFilters(DEFAULT_FILTERS)}
              onCreate={handleNewProduct}
              onAdjust={(product) => openPanel(product, 'adjust')}
              onHistory={(product) => openPanel(product, 'history')}
              onEdit={handleEditProduct}
              onToggleActive={(product) => void handleToggleActive(product)}
              onDelete={setProductToDelete}
            />
          </Box>
          {filtersActive && view === 'rows' && (
            <Typography variant="caption" color="text.secondary" sx={{ mt: 1, display: 'block' }} aria-live="polite">
              {visibleProducts.length} productos mostrados
            </Typography>
          )}
        </>
      )}

      {panel && user && (
        <ProductSidePanel
          key={`${panel.product.id}-${panel.section}`}
          product={panel.product}
          initialSection={panel.section}
          canViewHistory={permissions.canViewHistory}
          userId={user.id}
          onClose={() => setPanel(null)}
          onAdjusted={handleAdjusted}
        />
      )}

      {permissions.canManageProducts && (
        <ProductFormDialog
          open={productDialogOpen}
          editing={editing}
          categories={categories}
          defaultCategoryId={typeof filters.category === 'number' ? filters.category : null}
          newCategoryId={newCategoryId}
          onClose={() => setProductDialogOpen(false)}
          onSaved={handleProductSaved}
          onRequestNewCategory={() => setCategoryDialog({ open: true, editing: null, forProduct: true })}
        />
      )}

      {permissions.canManageCategories && (
        <CategoryFormDialog
          open={categoryDialog.open}
          editing={categoryDialog.editing}
          onClose={() => setCategoryDialog({ open: false, editing: null, forProduct: false })}
          onSaved={(category) => void handleCategorySaved(category)}
        />
      )}

      <ConfirmModal
        open={productToDelete !== null}
        onClose={() => setProductToDelete(null)}
        onConfirm={() => void handleConfirmDeleteProduct()}
        title="Eliminar producto"
        message={`¿Eliminar "${productToDelete?.name ?? ''}"? Esta acción no se puede deshacer.`}
        confirmLabel="Eliminar"
        confirmColor="error"
      />

      <ConfirmModal
        open={categoryToDelete !== null}
        onClose={() => setCategoryToDelete(null)}
        onConfirm={() => void handleConfirmDeleteCategory()}
        title="Eliminar categoría"
        message={
          categoryToDelete
            ? describeCategoryDeletion(categoryToDelete.name, productsInCategory(categoryToDelete.id))
            : ''
        }
        confirmLabel="Eliminar"
        confirmColor="error"
      />

      <Snackbar
        open={notice !== ''}
        autoHideDuration={8000}
        onClose={() => setNotice('')}
        anchorOrigin={{ vertical: 'bottom', horizontal: 'center' }}
      >
        <Alert severity="error" onClose={() => setNotice('')} data-testid="products-notice">
          {notice}
        </Alert>
      </Snackbar>
    </Box>
  );
}
