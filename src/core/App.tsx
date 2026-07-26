import { CssBaseline, ThemeProvider } from '@mui/material';
import { LocalizationProvider } from '@mui/x-date-pickers';
import { AdapterMoment } from '@mui/x-date-pickers/AdapterMoment';
import { BrowserRouter, Navigate, Outlet, Route, Routes } from 'react-router-dom';
import { Layout } from '@core/layout/Layout';
import { AdminGuard, AuthGuard, GuestGuard } from '@core/guards/AuthGuard';
import { AuthProvider } from '@modules/auth/context/AuthContext';
import { LoginPage } from '@modules/auth/pages/LoginPage';
import { CashRegisterPage } from '@modules/cash-register/pages/CashRegisterPage';
import { CategoriesPage } from '@modules/catalog/categories/pages/CategoriesPage';
import { InventoryPage } from '@modules/catalog/inventory/pages/InventoryPage';
import { ProductsPage } from '@modules/catalog/products/pages/ProductsPage';
import { CustomersPage } from '@modules/customers/pages/CustomersPage';
import { PosProvider } from '@modules/pos/context/PosProvider';
import { POSPage } from '@modules/pos/pages/POSPage';
import { ReportsPage } from '@modules/reports/pages/ReportsPage';
import { SalesPage } from '@modules/sales/pages/SalesPage';
import { SettingsPage } from '@modules/settings/pages/SettingsPage';
import { UsersPage } from '@modules/users/pages/UsersPage';
import { theme } from '@core/theme';
// Import moment lang es
import 'moment/dist/locale/es';

function App() {
  return (
    <LocalizationProvider dateAdapter={AdapterMoment}>
      <ThemeProvider theme={theme}>
        <CssBaseline />
        <AuthProvider>
          <BrowserRouter>
            <Routes>
              {/* Guest routes */}
              <Route element={<GuestGuard />}>
                <Route path="/login" element={<LoginPage />} />
              </Route>

              {/* Authenticated routes */}
              <Route element={<AuthGuard />}>
                <Route element={<Layout />}>
                  <Route path="/" element={<Navigate to="/pos" replace />} />
                  <Route element={<PosProvider><Outlet /></PosProvider>}>
                    <Route path="/pos" element={<POSPage />} />
                  </Route>
                  <Route path="/sales" element={<SalesPage />} />
                  <Route path="/cash-register" element={<CashRegisterPage />} />
                  <Route path="/customers" element={<CustomersPage />} />

                  {/* Admin-only routes */}
                  <Route element={<AdminGuard />}>
                    <Route path="/products" element={<ProductsPage />} />
                    <Route path="/categories" element={<CategoriesPage />} />
                    <Route path="/inventory" element={<InventoryPage />} />
                    <Route path="/users" element={<UsersPage />} />
                    <Route path="/reports" element={<ReportsPage />} />
                    <Route path="/settings" element={<SettingsPage />} />
                  </Route>
                </Route>
              </Route>

              {/* Fallback */}
              <Route path="*" element={<Navigate to="/" replace />} />
            </Routes>
          </BrowserRouter>
        </AuthProvider>
      </ThemeProvider>
    </LocalizationProvider>
  );
}

export default App;
