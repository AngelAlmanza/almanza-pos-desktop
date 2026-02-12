import { useState, useRef, useEffect, useCallback } from 'react';
import {
  Box,
  Card,
  CardContent,
  TextField,
  Button,
  Typography,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  IconButton,
  Paper,
  Divider,
  Alert,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  List,
  ListItem,
  ListItemButton,
  ListItemText,
  Chip,
  InputAdornment,
} from '@mui/material';
import {
  Add,
  Remove,
  Delete,
  Search,
  ShoppingCart,
  Payment,
  QrCodeScanner,
} from '@mui/icons-material';
import { useAuth } from '../context/AuthContext';
import { ProductService } from '../services/ProductService';
import { SaleService } from '../services/SaleService';
import type { Product, CartItem, Sale } from '../models';
import { TicketPrinter } from '../utils/TicketPrinter';

export function POSPage() {
  const { user, cashRegisterSession } = useAuth();
  const [cart, setCart] = useState<CartItem[]>([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [searchResults, setSearchResults] = useState<Product[]>([]);
  const [showSearch, setShowSearch] = useState(false);
  const [paymentAmount, setPaymentAmount] = useState('');
  const [showPayment, setShowPayment] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [lastSale, setLastSale] = useState<Sale | null>(null);
  const searchInputRef = useRef<HTMLInputElement>(null);
  const barcodeInputRef = useRef<HTMLInputElement>(null);
  const [barcodeInput, setBarcodeInput] = useState('');

  const total = cart.reduce((sum, item) => sum + item.subtotal, 0);
  const changeAmount = paymentAmount ? parseFloat(paymentAmount) - total : 0;

  useEffect(() => {
    if (barcodeInputRef.current) {
      barcodeInputRef.current.focus();
    }
  }, [cart]);

  const handleBarcodeSubmit = useCallback(async (e: React.FormEvent) => {
    e.preventDefault();
    if (!barcodeInput.trim()) return;

    try {
      const product = await ProductService.findByBarcode(barcodeInput.trim());
      addToCart(product);
      setBarcodeInput('');
    } catch {
      // Try searching by name/code
      try {
        const results = await ProductService.search(barcodeInput.trim());
        if (results.length === 1) {
          addToCart(results[0]);
          setBarcodeInput('');
        } else if (results.length > 1) {
          setSearchResults(results);
          setShowSearch(true);
          setBarcodeInput('');
        } else {
          setError('Producto no encontrado');
          setTimeout(() => setError(''), 3000);
          setBarcodeInput('');
        }
      } catch {
        setError('Producto no encontrado');
        setTimeout(() => setError(''), 3000);
        setBarcodeInput('');
      }
    }
  }, [barcodeInput]);

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

  const addToCart = (product: Product, quantity = 1) => {
    setCart(prev => {
      const existingIndex = prev.findIndex(item => item.product.id === product.id);
      if (existingIndex >= 0) {
        const updated = [...prev];
        const newQty = updated[existingIndex].quantity + quantity;
        if (newQty > product.stock) {
          setError(`Stock insuficiente. Disponible: ${product.stock}`);
          setTimeout(() => setError(''), 3000);
          return prev;
        }
        updated[existingIndex] = {
          ...updated[existingIndex],
          quantity: newQty,
          subtotal: product.price * newQty,
        };
        return updated;
      }
      if (quantity > product.stock) {
        setError(`Stock insuficiente. Disponible: ${product.stock}`);
        setTimeout(() => setError(''), 3000);
        return prev;
      }
      return [...prev, { product, quantity, subtotal: product.price * quantity }];
    });
    setShowSearch(false);
    setSearchTerm('');
  };

  const updateQuantity = (index: number, delta: number) => {
    setCart(prev => {
      const updated = [...prev];
      const newQty = updated[index].quantity + delta;
      if (newQty <= 0) {
        return prev.filter((_, i) => i !== index);
      }
      if (newQty > updated[index].product.stock) {
        setError(`Stock insuficiente. Disponible: ${updated[index].product.stock}`);
        setTimeout(() => setError(''), 3000);
        return prev;
      }
      updated[index] = {
        ...updated[index],
        quantity: newQty,
        subtotal: updated[index].product.price * newQty,
      };
      return updated;
    });
  };

  const removeFromCart = (index: number) => {
    setCart(prev => prev.filter((_, i) => i !== index));
  };

  const handlePayment = async () => {
    if (!user || !cashRegisterSession) return;
    const payment = parseFloat(paymentAmount);
    if (isNaN(payment) || payment < total) {
      setError('Monto de pago insuficiente');
      return;
    }

    try {
      const sale = await SaleService.create({
        cash_register_session_id: cashRegisterSession.id,
        user_id: user.id,
        payment_method: 'cash',
        payment_amount: payment,
        items: cart.map(item => ({
          product_id: item.product.id,
          quantity: item.quantity,
        })),
      });

      setLastSale(sale);
      setCart([]);
      setPaymentAmount('');
      setShowPayment(false);
      setSuccess(`Venta #${sale.id} completada. Cambio: $${sale.change_amount.toFixed(2)}`);
      setTimeout(() => setSuccess(''), 5000);

      // Print ticket
      TicketPrinter.printSaleTicket(sale);
    } catch (err) {
      setError(String(err));
      setTimeout(() => setError(''), 5000);
    }
  };

  if (!cashRegisterSession) {
    return (
      <Box sx={{ textAlign: 'center', mt: 8 }}>
        <ShoppingCart sx={{ fontSize: 80, color: 'text.disabled', mb: 2 }} />
        <Typography variant="h5" color="text.secondary">
          No hay una caja abierta
        </Typography>
        <Typography color="text.secondary" sx={{ mt: 1 }}>
          Debes abrir una caja antes de poder realizar ventas.
        </Typography>
      </Box>
    );
  }

  return (
    <Box sx={{ display: 'flex', gap: 2, height: 'calc(100vh - 112px)' }}>
      {/* Left Panel - Cart */}
      <Box sx={{ flex: 1, display: 'flex', flexDirection: 'column' }}>
        {error && <Alert severity="error" sx={{ mb: 1 }} onClose={() => setError('')}>{error}</Alert>}
        {success && <Alert severity="success" sx={{ mb: 1 }} onClose={() => setSuccess('')}>{success}</Alert>}

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
                InputProps={{
                  startAdornment: (
                    <InputAdornment position="start">
                      <QrCodeScanner color="primary" />
                    </InputAdornment>
                  ),
                  endAdornment: (
                    <InputAdornment position="end">
                      <IconButton size="small" onClick={() => { setShowSearch(true); handleSearch(); }}>
                        <Search />
                      </IconButton>
                    </InputAdornment>
                  ),
                }}
              />
            </form>
          </CardContent>
        </Card>

        {/* Cart Table */}
        <TableContainer component={Paper} sx={{ flex: 1, overflow: 'auto' }}>
          <Table stickyHeader size="small">
            <TableHead>
              <TableRow>
                <TableCell>Producto</TableCell>
                <TableCell align="center">Cant.</TableCell>
                <TableCell align="right">P. Unit.</TableCell>
                <TableCell align="right">Subtotal</TableCell>
                <TableCell align="center" width={80}></TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {cart.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={5} align="center" sx={{ py: 4, color: 'text.secondary' }}>
                    Escanea o busca productos para agregarlos
                  </TableCell>
                </TableRow>
              ) : (
                cart.map((item, index) => (
                  <TableRow key={item.product.id}>
                    <TableCell>
                      <Typography variant="body2" fontWeight={600}>
                        {item.product.name}
                      </Typography>
                      {item.product.barcode && (
                        <Typography variant="caption" color="text.secondary">
                          {item.product.barcode}
                        </Typography>
                      )}
                    </TableCell>
                    <TableCell align="center">
                      <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 0.5 }}>
                        <IconButton size="small" onClick={() => updateQuantity(index, -1)}>
                          <Remove fontSize="small" />
                        </IconButton>
                        <Typography fontWeight={600}>{item.quantity}</Typography>
                        <IconButton size="small" onClick={() => updateQuantity(index, 1)}>
                          <Add fontSize="small" />
                        </IconButton>
                      </Box>
                    </TableCell>
                    <TableCell align="right">${item.product.price.toFixed(2)}</TableCell>
                    <TableCell align="right" sx={{ fontWeight: 600 }}>
                      ${item.subtotal.toFixed(2)}
                    </TableCell>
                    <TableCell align="center">
                      <IconButton size="small" color="error" onClick={() => removeFromCart(index)}>
                        <Delete fontSize="small" />
                      </IconButton>
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </TableContainer>
      </Box>

      {/* Right Panel - Summary */}
      <Card sx={{ width: 320, display: 'flex', flexDirection: 'column' }}>
        <CardContent sx={{ flex: 1, display: 'flex', flexDirection: 'column' }}>
          <Typography variant="h6" gutterBottom>
            Resumen de Venta
          </Typography>
          <Divider sx={{ mb: 2 }} />

          <Box sx={{ flex: 1 }}>
            <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 1 }}>
              <Typography color="text.secondary">Artículos:</Typography>
              <Typography fontWeight={600}>{cart.reduce((sum, item) => sum + item.quantity, 0)}</Typography>
            </Box>
            {cashRegisterSession.exchange_rate && (
              <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 1 }}>
                <Typography color="text.secondary">T/C USD:</Typography>
                <Typography fontWeight={600}>${cashRegisterSession.exchange_rate.toFixed(2)}</Typography>
              </Box>
            )}
          </Box>

          <Divider sx={{ my: 2 }} />
          <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 3 }}>
            <Typography variant="h5" fontWeight={700}>Total:</Typography>
            <Typography variant="h5" fontWeight={700} color="primary">
              ${total.toFixed(2)}
            </Typography>
          </Box>

          {cashRegisterSession.exchange_rate && total > 0 && (
            <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 2 }}>
              <Typography color="text.secondary">En USD:</Typography>
              <Typography fontWeight={600}>
                ${(total / cashRegisterSession.exchange_rate).toFixed(2)} USD
              </Typography>
            </Box>
          )}

          <Button
            fullWidth
            variant="contained"
            size="large"
            startIcon={<Payment />}
            disabled={cart.length === 0}
            onClick={() => { setShowPayment(true); setPaymentAmount(total.toFixed(2)); }}
            sx={{ py: 1.5 }}
          >
            Cobrar
          </Button>

          {lastSale && (
            <Button
              fullWidth
              variant="outlined"
              size="small"
              sx={{ mt: 1 }}
              onClick={() => TicketPrinter.printSaleTicket(lastSale)}
            >
              Reimprimir último ticket
            </Button>
          )}
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
            InputProps={{
              endAdornment: (
                <InputAdornment position="end">
                  <IconButton size="small" onClick={handleSearch}>
                    <Search />
                  </IconButton>
                </InputAdornment>
              ),
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

      {/* Payment Dialog */}
      <Dialog open={showPayment} onClose={() => setShowPayment(false)} maxWidth="xs" fullWidth>
        <DialogTitle>Cobrar Venta</DialogTitle>
        <DialogContent>
          <Box sx={{ textAlign: 'center', my: 2 }}>
            <Typography variant="h4" fontWeight={700} color="primary">
              ${total.toFixed(2)}
            </Typography>
            <Typography color="text.secondary">Total a cobrar</Typography>
          </Box>
          <TextField
            fullWidth
            label="Monto recibido"
            type="number"
            value={paymentAmount}
            onChange={(e) => setPaymentAmount(e.target.value)}
            sx={{ mb: 2 }}
            autoFocus
            inputProps={{ step: '0.01', min: '0' }}
            onKeyDown={(e) => e.key === 'Enter' && handlePayment()}
          />
          {parseFloat(paymentAmount) >= total && (
            <Alert severity="info" icon={false} sx={{ textAlign: 'center' }}>
              <Typography variant="h5" fontWeight={700}>
                Cambio: ${changeAmount.toFixed(2)}
              </Typography>
            </Alert>
          )}
          {parseFloat(paymentAmount) < total && paymentAmount !== '' && (
            <Alert severity="error">Monto insuficiente</Alert>
          )}
        </DialogContent>
        <DialogActions sx={{ px: 3, pb: 2 }}>
          <Button onClick={() => setShowPayment(false)}>Cancelar</Button>
          <Button
            variant="contained"
            onClick={handlePayment}
            disabled={!paymentAmount || parseFloat(paymentAmount) < total}
          >
            Confirmar Pago
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
}
