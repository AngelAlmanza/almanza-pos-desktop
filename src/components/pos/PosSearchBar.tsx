import { QrCodeScanner, Search } from "@mui/icons-material";
import { Card, CardContent, Chip, Dialog, DialogContent, DialogTitle, IconButton, InputAdornment, List, ListItem, ListItemButton, ListItemText, TextField, Typography } from "@mui/material";
import { Decimal } from 'decimal.js';
import { SubmitEvent, useCallback, useEffect, useRef, useState } from "react";
import { usePos } from "../../context/PosProvider";
import { Product } from "../../models";
import { ProductService } from "../../services/ProductService";

export const PosSearchBar = () => {
  const { cart, dispatch, setError } = usePos();
  const [searchTerm, setSearchTerm] = useState('');
  const [showSearch, setShowSearch] = useState(false);
  const [barcodeInput, setBarcodeInput] = useState('');
  const [searchResults, setSearchResults] = useState<Product[]>([]);
  const searchInputRef = useRef<HTMLInputElement>(null);
  const barcodeInputRef = useRef<HTMLInputElement>(null);

  const addToCart = (product: Product, quantity = 1) => {
    const existing = cart.find(item => item.product.id === product.id);
    const currentQty = existing?.quantity ?? 0;
    if (new Decimal(currentQty).plus(quantity).gt(product.stock)) {
      setError(`Stock insuficiente. Disponible: ${product.stock}`);
      setTimeout(() => setError(''), 3000);
      return;
    }
    dispatch({ type: 'ADD_ITEM', payload: { product, quantity } });
    setShowSearch(false);
    setSearchTerm('');
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
      addToCart(product);
    } catch {
      // Try searching by name/code
      try {
        const results = await ProductService.search(barcodeInput.trim());
        if (results.length === 1) {
          addToCart(results[0]);
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
                <ListItemButton onClick={() => addToCart(product)}>
                  <ListItemText
                    primary={product.name}
                    secondary={`$${product.price.toFixed(2)} | Stock: ${product.stock} ${product.unit}`}
                  />
                  {product.barcode && (
                    <Chip label={product.barcode} size="small" variant="outlined" />
                  )}
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
    </>
  )
}