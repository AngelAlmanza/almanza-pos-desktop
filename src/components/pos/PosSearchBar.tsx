import { QrCodeScanner, Search } from "@mui/icons-material";
import { Box, Card, CardContent, Chip, Dialog, DialogContent, DialogTitle, IconButton, InputAdornment, List, ListItem, ListItemButton, ListItemText, TextField, Typography } from "@mui/material";
import { SubmitEvent, useCallback, useEffect, useRef, useState } from "react";
import { getRequestedProductQuantityAfterAdd, usePos } from "../../context/PosProvider";
import { Product, SaleQuantitySelection } from "../../models";
import { ProductService } from "../../services/ProductService";
import { hasSufficientStock } from "../../utils/money";
import { buildQuantitySelection, usesBulkQuantityInput } from "../../utils/unitConversion";
import { BulkQuantityDialog } from "./BulkQuantityDialog";

export const PosSearchBar = () => {
  const { cart, dispatch, setError } = usePos();
  const [searchTerm, setSearchTerm] = useState('');
  const [showSearch, setShowSearch] = useState(false);
  const [barcodeInput, setBarcodeInput] = useState('');
  const [searchResults, setSearchResults] = useState<Product[]>([]);
  const [pendingProduct, setPendingProduct] = useState<Product | null>(null);
  const searchInputRef = useRef<HTMLInputElement>(null);
  const barcodeInputRef = useRef<HTMLInputElement>(null);

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
      setError(`Stock insuficiente. Disponible: ${product.stock}`);
      setTimeout(() => setError(''), 3000);
      return;
    }

    dispatch({ type: 'ADD_ITEM', payload: { product, selection } });
    setShowSearch(false);
    setSearchTerm('');
  };

  const handleProductSelected = (product: Product) => {
    if (usesBulkQuantityInput(product)) {
      setPendingProduct(product);
    } else {
      addToCart(product);
    }
  };

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

  const handleBarcodeSubmit = useCallback(async (e: SubmitEvent<HTMLFormElement>) => {
    e.preventDefault();
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
  }, [barcodeInput]);

  useEffect(() => {
    if (barcodeInputRef.current) {
      barcodeInputRef.current.focus();
    }
  }, [cart]);

  return (
    <>
      {/* Barcode Scanner Input */}
      <Card sx={{ mb: 2 }}>
        <CardContent sx={{ py: 1.5, '&:last-child': { pb: 1.5 } }}>
          <form onSubmit={handleBarcodeSubmit}>
            <TextField
              fullWidth
              size="small"
              placeholder="Escanear código de barras o escribir código/nombre..."
              value={barcodeInput}
              onChange={(e) => setBarcodeInput(e.target.value)}
              inputRef={barcodeInputRef}
              slotProps={{
                input: {
                  startAdornment: (
                    <InputAdornment position="start">
                      <QrCodeScanner color="primary" />
                    </InputAdornment>
                  ),
                  endAdornment: (
                    <InputAdornment position="end">
                      <IconButton size="small" onClick={handleSearchBtn}>
                        <Search />
                      </IconButton>
                    </InputAdornment>
                  ),
                }
              }}
            />
          </form>
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
        onCancel={() => setPendingProduct(null)}
      />
    </>
  )
}
