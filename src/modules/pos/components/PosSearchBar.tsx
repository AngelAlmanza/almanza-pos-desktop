import { QrCodeScanner, Search } from "@mui/icons-material";
import { Box, Card, CardContent, Chip, ClickAwayListener, Dialog, DialogContent, DialogTitle, IconButton, InputAdornment, List, ListItem, ListItemButton, ListItemText, TextField, Typography } from "@mui/material";
import { KeyboardEvent, SubmitEvent, useEffect, useId, useRef, useState } from "react";
import { getRequestedProductQuantityAfterAdd, usePos } from '@modules/pos/context/PosProvider';
import type { Product } from '@modules/catalog/products/types';
import type { SaleQuantitySelection } from '@modules/pos/types';
import { ProductService } from '@modules/catalog/products/services/ProductService';
import { hasSufficientStock } from '@modules/shared/utils/money';
import { buildQuantitySelection, usesBulkQuantityInput } from '@modules/shared/utils/unitConversion';
import { useProductSuggestions } from '@modules/pos/hooks/useProductSuggestions';
import { decideEnter, getSuggestionOptionId, isOutOfStock, nextHighlight } from '@modules/pos/utils/productSuggestions';
import { BulkQuantityDialog } from "./BulkQuantityDialog";
import { ProductSuggestionList } from "./ProductSuggestionList";

/** Los errores del POS se limpian solos a los 3 s. */
const POS_ERROR_MS = 3000;

interface PosSearchBarProps {
  /** En `false` no se consulta ni se muestra la lista (U3 lo usa en vista de cuadrícula). */
  suggestionsEnabled?: boolean;
}

export const PosSearchBar = ({ suggestionsEnabled = true }: PosSearchBarProps) => {
  const { cart, error, dispatch, setError } = usePos();
  const [searchTerm, setSearchTerm] = useState('');
  const [showSearch, setShowSearch] = useState(false);
  const [barcodeInput, setBarcodeInput] = useState('');
  const [searchResults, setSearchResults] = useState<Product[]>([]);
  const [pendingProduct, setPendingProduct] = useState<Product | null>(null);
  const [highlightedIndex, setHighlightedIndex] = useState<number | null>(null);
  const [listOpen, setListOpen] = useState(false);
  const searchInputRef = useRef<HTMLInputElement>(null);
  const barcodeInputRef = useRef<HTMLInputElement>(null);
  const fieldRef = useRef<HTMLDivElement>(null);
  const listId = useId();

  const suggest = useProductSuggestions(barcodeInput, suggestionsEnabled);

  // Últimos valores para decisiones asíncronas (evitan cierres con datos viejos).
  const barcodeInputValueRef = useRef(barcodeInput);
  barcodeInputValueRef.current = barcodeInput;
  const errorRef = useRef(error);
  errorRef.current = error;
  const errorTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  // Guarda de "selección en curso": ignora una segunda selección mientras se relee el producto.
  const selectingRef = useRef(false);
  // Texto de la barra cuando se eligió la sugerencia; solo se limpia si no cambió después.
  const selectionTextRef = useRef<string | null>(null);

  useEffect(() => () => {
    if (errorTimerRef.current) clearTimeout(errorTimerRef.current);
  }, []);

  // Un mensaje nuevo cancela el temporizador anterior y el mismo mensaje no se repite
  // mientras siga visible.
  const showError = (message: string) => {
    if (errorRef.current === message) return;
    if (errorTimerRef.current) clearTimeout(errorTimerRef.current);
    setError(message);
    errorTimerRef.current = setTimeout(() => setError(''), POS_ERROR_MS);
  };

  const closeList = () => {
    setListOpen(false);
    setHighlightedIndex(null);
    suggest.closeAndInvalidate();
  };

  const addToCart = (
    product: Product,
    selection: SaleQuantitySelection = buildQuantitySelection({
      input_mode: 'base',
      input_value: 1,
      input_unit: product.unit,
    }, product),
  ) => {
    const requestedQty = getRequestedProductQuantityAfterAdd(cart, product, selection);

    if (!hasSufficientStock(product.stock, requestedQty)) {
      selectionTextRef.current = null;
      setError(`Stock insuficiente. Disponible: ${product.stock}`);
      setTimeout(() => setError(''), 3000);
      return;
    }

    dispatch({ type: 'ADD_ITEM', payload: { product, selection } });
    setShowSearch(false);
    setSearchTerm('');

    // Elegida desde una sugerencia: se limpia la barra solo si el texto no cambió.
    if (selectionTextRef.current !== null && selectionTextRef.current === barcodeInputValueRef.current) {
      setBarcodeInput('');
    }
    selectionTextRef.current = null;
    closeList();
    barcodeInputRef.current?.focus();
  };

  const handleProductSelected = (product: Product) => {
    if (usesBulkQuantityInput(product)) {
      setPendingProduct(product);
    } else {
      addToCart(product);
    }
  };

  // W3: relee el producto por id para validar con el stock real del momento.
  const handleSuggestionSelected = async (suggestion: Product) => {
    if (selectingRef.current) return;
    selectingRef.current = true;
    closeList();
    try {
      const product = await ProductService.getById(suggestion.id);
      if (!product.active) {
        showError('Producto no encontrado');
        return;
      }
      if (isOutOfStock(product)) {
        showError(`Stock insuficiente. Disponible: ${Math.max(product.stock, 0)}`);
        return;
      }
      selectionTextRef.current = barcodeInputValueRef.current;
      handleProductSelected(product);
    } catch {
      showError('Producto no encontrado');
    } finally {
      selectingRef.current = false;
    }
  };

  // La consulta de sugerencias falló: se avisa con el Alert del POS; Enter sigue funcionando.
  useEffect(() => {
    if (suggest.status === 'error' && suggest.errorMessage) {
      showError(suggest.errorMessage);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [suggest.status, suggest.errorMessage]);

  const handleSearch = async () => {
    if (!searchTerm.trim()) return;
    try {
      const results = await ProductService.search(searchTerm);
      setSearchResults(results);
      setShowSearch(true);
    } catch (err) {
      setError(String(err));
    }
  };

  const handleSearchBtn = () => {
    setShowSearch(true);
    handleSearch();
  }

  const handleBarcodeSubmit = async (e: SubmitEvent<HTMLFormElement>) => {
    e.preventDefault();
    // Síncrono y antes de cualquier await: una respuesta tardía o el temporizador de 200 ms
    // no deben reabrir la lista mientras el flujo de Enter consulta (el texto sigue igual
    // hasta el `finally`).
    closeList();
    if (!barcodeInput.trim()) return;

    try {
      const product = await ProductService.findByBarcode(barcodeInput.trim());
      handleProductSelected(product);
    } catch {
      // Try searching by name/code
      try {
        const results = await ProductService.search(barcodeInput.trim());
        if (results.length === 1) {
          handleProductSelected(results[0]);
        } else if (results.length > 1) {
          setSearchResults(results);
          setShowSearch(true);
        } else {
          setError('Producto no encontrado');
          setTimeout(() => setError(''), 3000);
        }
      } catch {
        setError('Producto no encontrado');
        setTimeout(() => setError(''), 3000);
      }
    } finally {
      setBarcodeInput('');
    }
  };

  const handleKeyDown = (e: KeyboardEvent<HTMLDivElement>) => {
    const decision = decideEnter(highlightedIndex, listVisible, suggest.status);
    if (e.key === 'Enter') {
      if (decision === 'select-highlighted' && highlightedIndex !== null) {
        // Evita el envío del formulario: se agrega la sugerencia resaltada.
        e.preventDefault();
        void handleSuggestionSelected(suggest.suggestions[highlightedIndex]);
      }
      // En cualquier otro caso el evento sigue al onSubmit (flujo actual).
      return;
    }
    if (!listVisible) return;

    if (e.key === 'ArrowDown' || e.key === 'ArrowUp') {
      // En `loading` no hay filas: no hay nada que resaltar.
      if (suggest.status !== 'ready') return;
      e.preventDefault();
      setHighlightedIndex(nextHighlight(highlightedIndex, e.key, suggest.suggestions.length));
    } else if (e.key === 'Escape') {
      e.preventDefault();
      closeList();
    } else if (e.key === 'Tab') {
      closeList();
    }
  };

  useEffect(() => {
    if (barcodeInputRef.current) {
      barcodeInputRef.current.focus();
    }
  }, [cart]);

  const listStatus = suggest.status === 'loading' || suggest.status === 'ready' || suggest.status === 'empty'
    ? suggest.status
    : null;
  const listVisible = suggestionsEnabled && listOpen && listStatus !== null;
  const rowsVisible = listVisible && (listStatus === 'ready' || listStatus === 'empty');
  const highlightedProduct = highlightedIndex === null ? undefined : suggest.suggestions[highlightedIndex];

  return (
    <>
      {/* Barcode Scanner Input */}
      <Card sx={{ mb: 2 }}>
        <CardContent sx={{ py: 1.5, '&:last-child': { pb: 1.5 } }}>
          <ClickAwayListener onClickAway={() => { if (listOpen) closeList(); }}>
            <Box>
              <form onSubmit={handleBarcodeSubmit}>
                <TextField
                  fullWidth
                  size="small"
                  placeholder="Escanear código de barras o escribir código/nombre..."
                  value={barcodeInput}
                  onChange={(e) => {
                    setBarcodeInput(e.target.value);
                    setHighlightedIndex(null);
                    setListOpen(true);
                  }}
                  onKeyDown={handleKeyDown}
                  onBlur={() => { if (listOpen) closeList(); }}
                  inputRef={barcodeInputRef}
                  ref={fieldRef}
                  slotProps={{
                    htmlInput: {
                      role: 'combobox',
                      'aria-label': 'Escanear o buscar producto por nombre o código',
                      'aria-expanded': rowsVisible,
                      'aria-controls': rowsVisible ? listId : undefined,
                      'aria-autocomplete': 'list',
                      'aria-activedescendant': rowsVisible && highlightedProduct
                        ? getSuggestionOptionId(listId, highlightedProduct.id)
                        : undefined,
                      'data-testid': 'pos-search-input',
                    },
                    input: {
                      startAdornment: (
                        <InputAdornment position="start">
                          <QrCodeScanner color="primary" />
                        </InputAdornment>
                      ),
                      endAdornment: (
                        <InputAdornment position="end">
                          <IconButton size="small" onClick={handleSearchBtn} data-testid="pos-search-button">
                            <Search />
                          </IconButton>
                        </InputAdornment>
                      ),
                    }
                  }}
                />
              </form>
              {suggestionsEnabled && listVisible && listStatus && (
                <ProductSuggestionList
                  suggestions={suggest.suggestions}
                  status={listStatus}
                  highlightedIndex={highlightedIndex}
                  listId={listId}
                  anchorEl={fieldRef.current}
                  onSelect={(product) => { void handleSuggestionSelected(product); }}
                />
              )}
              {/* Anuncia el número de sugerencias a lectores de pantalla (NFR6). */}
              <Box
                role="status"
                aria-live="polite"
                data-testid="pos-suggestions-announcement"
                sx={{
                  position: 'absolute',
                  width: 1,
                  height: 1,
                  overflow: 'hidden',
                  clip: 'rect(0 0 0 0)',
                  whiteSpace: 'nowrap',
                }}
              >
                {listVisible ? suggest.announcement : ''}
              </Box>
            </Box>
          </ClickAwayListener>
        </CardContent>
      </Card>

      {/* Search Dialog */}
      <Dialog open={showSearch} onClose={() => setShowSearch(false)} maxWidth="sm" fullWidth>
        <DialogTitle>Buscar Producto</DialogTitle>
        <DialogContent>
          <TextField
            fullWidth
            size="small"
            placeholder="Buscar por nombre o código..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && handleSearch()}
            inputRef={searchInputRef}
            sx={{ mb: 2, mt: 1 }}
            slotProps={{
              input: {
                endAdornment: (
                  <InputAdornment position="end">
                    <IconButton size="small" onClick={handleSearch}>
                      <Search />
                    </IconButton>
                  </InputAdornment>
                ),
              }
            }}
          />
          <List>
            {searchResults.map((product) => (
              <ListItem key={product.id} disablePadding>
                <ListItemButton onClick={() => handleProductSelected(product)}>
                  <ListItemText
                    primary={product.name}
                    secondary={`$${product.price.toFixed(2)} | Stock: ${product.stock} ${product.unit}`}
                  />
                  <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.75 }}>
                    {product.is_bulk && (
                      <Chip label="A granel" size="small" color="primary" variant="outlined" />
                    )}
                    {product.barcode && (
                      <Chip label={product.barcode} size="small" variant="outlined" />
                    )}
                  </Box>
                </ListItemButton>
              </ListItem>
            ))}
            {searchResults.length === 0 && (
              <Typography color="text.secondary" textAlign="center" sx={{ py: 2 }}>
                No se encontraron productos
              </Typography>
            )}
          </List>
        </DialogContent>
      </Dialog>

      {/* Bulk Quantity Dialog */}
      <BulkQuantityDialog
        open={pendingProduct !== null}
        product={pendingProduct}
        cartItems={cart}
        onConfirm={(selection) => {
          if (pendingProduct) addToCart(pendingProduct, selection);
          setPendingProduct(null);
        }}
        onCancel={() => {
          // Cancelar no agrega nada: la barra conserva el texto.
          selectionTextRef.current = null;
          setPendingProduct(null);
        }}
      />
    </>
  )
}
