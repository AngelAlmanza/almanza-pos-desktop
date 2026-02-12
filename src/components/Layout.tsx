import { useState, useEffect } from 'react';
import { Outlet, useNavigate, useLocation } from 'react-router-dom';
import {
  Box,
  Drawer,
  AppBar,
  Toolbar,
  Typography,
  List,
  ListItem,
  ListItemButton,
  ListItemIcon,
  ListItemText,
  IconButton,
  Divider,
  Chip,
  Avatar,
  Menu,
  MenuItem,
} from '@mui/material';
import {
  Menu as MenuIcon,
  PointOfSale,
  ShoppingCart,
  Inventory2,
  Category,
  People,
  Assessment,
  AccountBalance,
  Logout,
  Person,
} from '@mui/icons-material';
import { useAuth } from '../context/AuthContext';

const DRAWER_WIDTH = 260;

interface NavItem {
  label: string;
  path: string;
  icon: React.ReactNode;
  adminOnly?: boolean;
}

const navItems: NavItem[] = [
  { label: 'Punto de Venta', path: '/pos', icon: <PointOfSale /> },
  { label: 'Ventas', path: '/sales', icon: <ShoppingCart /> },
  { label: 'Productos', path: '/products', icon: <Category />, adminOnly: true },
  { label: 'Inventario', path: '/inventory', icon: <Inventory2 />, adminOnly: true },
  { label: 'Usuarios', path: '/users', icon: <People />, adminOnly: true },
  { label: 'Cortes de Caja', path: '/cash-register', icon: <AccountBalance /> },
  { label: 'Reportes', path: '/reports', icon: <Assessment />, adminOnly: true },
];

export function Layout() {
  const { user, isAdmin, logout, cashRegisterSession, setCashRegisterSession } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const [mobileOpen, setMobileOpen] = useState(false);
  const [anchorEl, setAnchorEl] = useState<null | HTMLElement>(null);

  // Load open cash register session on mount
  useEffect(() => {
    const loadOpenSession = async () => {
      if (user && !cashRegisterSession) {
        try {
          const { CashRegisterService } = await import('../services/CashRegisterService');
          const session = await CashRegisterService.getOpen();
          if (session && session.user_id === user.id) {
            setCashRegisterSession(session);
          }
        } catch {
          // No open session, that's fine
        }
      }
    };
    loadOpenSession();
  }, [user]);

  const filteredNavItems = navItems.filter(item => !item.adminOnly || isAdmin);

  const handleNavClick = (path: string) => {
    navigate(path);
    setMobileOpen(false);
  };

  const handleLogout = () => {
    setAnchorEl(null);
    logout();
    navigate('/login');
  };

  const drawer = (
    <Box sx={{ height: '100%', display: 'flex', flexDirection: 'column' }}>
      <Box sx={{ p: 2, textAlign: 'center' }}>
        <PointOfSale sx={{ fontSize: 40, color: 'primary.main', mb: 1 }} />
        <Typography variant="h6" color="primary" fontWeight={700}>
          Almanza POS
        </Typography>
      </Box>
      <Divider />
      <List sx={{ flex: 1, px: 1 }}>
        {filteredNavItems.map((item) => (
          <ListItem key={item.path} disablePadding sx={{ mb: 0.5 }}>
            <ListItemButton
              selected={location.pathname === item.path}
              onClick={() => handleNavClick(item.path)}
              sx={{
                borderRadius: 2,
                '&.Mui-selected': {
                  backgroundColor: 'primary.main',
                  color: 'white',
                  '& .MuiListItemIcon-root': { color: 'white' },
                  '&:hover': { backgroundColor: 'primary.dark' },
                },
              }}
            >
              <ListItemIcon sx={{ minWidth: 40 }}>{item.icon}</ListItemIcon>
              <ListItemText primary={item.label} />
            </ListItemButton>
          </ListItem>
        ))}
      </List>
      <Divider />
      {cashRegisterSession && (
        <Box sx={{ p: 2 }}>
          <Chip
            icon={<AccountBalance />}
            label={`Caja #${cashRegisterSession.id} abierta`}
            color="success"
            size="small"
            sx={{ width: '100%' }}
          />
        </Box>
      )}
    </Box>
  );

  return (
    <Box sx={{ display: 'flex', height: '100vh' }}>
      <AppBar
        position="fixed"
        sx={{ zIndex: (theme) => theme.zIndex.drawer + 1 }}
        elevation={1}
      >
        <Toolbar>
          <IconButton
            color="inherit"
            edge="start"
            onClick={() => setMobileOpen(!mobileOpen)}
            sx={{ mr: 2, display: { sm: 'none' } }}
          >
            <MenuIcon />
          </IconButton>
          <Typography variant="h6" noWrap sx={{ flexGrow: 1 }}>
            {filteredNavItems.find(i => i.path === location.pathname)?.label || 'Almanza POS'}
          </Typography>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
            <Chip
              icon={<Person />}
              label={user?.full_name}
              variant="outlined"
              size="small"
              sx={{ color: 'white', borderColor: 'rgba(255,255,255,0.5)' }}
            />
            <Chip
              label={isAdmin ? 'Admin' : 'Cajero'}
              size="small"
              sx={{
                backgroundColor: isAdmin ? 'warning.main' : 'secondary.main',
                color: 'white',
                fontWeight: 600,
              }}
            />
            <IconButton color="inherit" onClick={(e) => setAnchorEl(e.currentTarget)}>
              <Avatar sx={{ width: 32, height: 32, bgcolor: 'secondary.main' }}>
                {user?.full_name?.charAt(0).toUpperCase()}
              </Avatar>
            </IconButton>
            <Menu
              anchorEl={anchorEl}
              open={Boolean(anchorEl)}
              onClose={() => setAnchorEl(null)}
            >
              <MenuItem onClick={handleLogout}>
                <ListItemIcon><Logout fontSize="small" /></ListItemIcon>
                Cerrar Sesión
              </MenuItem>
            </Menu>
          </Box>
        </Toolbar>
      </AppBar>

      <Drawer
        variant="permanent"
        sx={{
          display: { xs: 'none', sm: 'block' },
          '& .MuiDrawer-paper': {
            width: DRAWER_WIDTH,
            boxSizing: 'border-box',
            mt: '64px',
            height: 'calc(100% - 64px)',
          },
        }}
      >
        {drawer}
      </Drawer>

      <Drawer
        variant="temporary"
        open={mobileOpen}
        onClose={() => setMobileOpen(false)}
        sx={{
          display: { xs: 'block', sm: 'none' },
          '& .MuiDrawer-paper': { width: DRAWER_WIDTH },
        }}
      >
        {drawer}
      </Drawer>

      <Box
        component="main"
        sx={{
          flexGrow: 1,
          p: 3,
          mt: '64px',
          ml: { sm: `${DRAWER_WIDTH}px` },
          backgroundColor: 'background.default',
          minHeight: 'calc(100vh - 64px)',
          overflow: 'auto',
        }}
      >
        <Outlet />
      </Box>
    </Box>
  );
}
