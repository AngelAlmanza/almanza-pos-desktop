import {
  AccountBalance,
  Assessment,
  Category,
  Inventory2,
  Label,
  Logout,
  Menu as MenuIcon,
  People,
  PointOfSale,
  ShoppingCart,
} from "@mui/icons-material";
import {
  AppBar,
  Avatar,
  Box,
  Drawer,
  IconButton,
  List,
  ListItem,
  ListItemButton,
  ListItemIcon,
  ListItemText,
  Menu,
  MenuItem,
  Toolbar,
  Typography,
} from "@mui/material";
import { useEffect, useState } from "react";
import { Outlet, useLocation, useNavigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext";

const DRAWER_WIDTH = 252;
const APPBAR_HEIGHT = 56;

const CHROME_BG = "#12172a";
const CHROME_TEXT = "rgba(255, 255, 255, 0.90)";
const CHROME_TEXT_DIM = "rgba(255, 255, 255, 0.70)";
const CHROME_TEXT_MUTED = "rgba(255, 255, 255, 0.45)";
const CHROME_ICON = "rgba(255, 255, 255, 0.55)";
const CHROME_BORDER = "rgba(255, 255, 255, 0.08)";
const CHROME_HOVER = "rgba(255, 255, 255, 0.08)";
const SELECTED_BG = "rgba(13, 107, 95, 0.65)";
const SELECTED_ICON = "#4db6a9";
const SESSION_BG = "rgba(45, 106, 79, 0.25)";
const SESSION_BORDER = "rgba(45, 106, 79, 0.45)";

interface NavItem {
  label: string;
  path: string;
  icon: React.ReactNode;
  adminOnly?: boolean;
}

const navItems: NavItem[] = [
  { label: "Punto de Venta", path: "/pos", icon: <PointOfSale /> },
  { label: "Ventas", path: "/sales", icon: <ShoppingCart /> },
  {
    label: "Productos",
    path: "/products",
    icon: <Category />,
    adminOnly: true,
  },
  {
    label: "Categorías",
    path: "/categories",
    icon: <Label />,
    adminOnly: true,
  },
  {
    label: "Inventario",
    path: "/inventory",
    icon: <Inventory2 />,
    adminOnly: true,
  },
  { label: "Usuarios", path: "/users", icon: <People />, adminOnly: true },
  { label: "Cortes de Caja", path: "/cash-register", icon: <AccountBalance /> },
  {
    label: "Reportes",
    path: "/reports",
    icon: <Assessment />,
    adminOnly: true,
  },
];

export function Layout() {
  const { user, isAdmin, logout, cashRegisterSession, setCashRegisterSession } =
    useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const [mobileOpen, setMobileOpen] = useState(false);
  const [anchorEl, setAnchorEl] = useState<null | HTMLElement>(null);

  useEffect(() => {
    const loadOpenSession = async () => {
      if (user && !cashRegisterSession) {
        try {
          const { CashRegisterService } =
            await import("../services/CashRegisterService");
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

  const filteredNavItems = navItems.filter(
    (item) => !item.adminOnly || isAdmin,
  );

  const handleNavClick = (path: string) => {
    navigate(path);
    setMobileOpen(false);
  };

  const handleLogout = () => {
    setAnchorEl(null);
    logout();
    navigate("/login");
  };

  const currentPageLabel =
    filteredNavItems.find((i) => i.path === location.pathname)?.label ||
    "Almanza POS";

  // Sidebar content — no logo (lives in AppBar)
  const sidebarContent = (
    <Box
      sx={{
        height: "100%",
        display: "flex",
        flexDirection: "column",
        backgroundColor: CHROME_BG,
      }}
    >
      <List sx={{ flex: 1, px: 1.5, pt: 1.5, pb: 1 }}>
        {filteredNavItems.map((item) => {
          const isSelected = location.pathname === item.path;
          return (
            <ListItem key={item.path} disablePadding sx={{ mb: 0.25 }}>
              <ListItemButton
                selected={isSelected}
                onClick={() => handleNavClick(item.path)}
                sx={{
                  borderRadius: 1.5,
                  py: 0.875,
                  color: isSelected ? "white" : CHROME_TEXT_DIM,
                  "& .MuiListItemText-primary": { color: "inherit" },
                  "& .MuiListItemIcon-root": {
                    color: isSelected ? SELECTED_ICON : CHROME_ICON,
                    minWidth: 38,
                    "& .MuiSvgIcon-root": { fontSize: "1.2rem" },
                  },
                  "&:hover": {
                    backgroundColor: CHROME_HOVER,
                    color: CHROME_TEXT,
                    "& .MuiListItemIcon-root": {
                      color: "rgba(255,255,255,0.80)",
                    },
                  },
                  "&.Mui-selected": {
                    backgroundColor: SELECTED_BG,
                    "&:hover": { backgroundColor: "rgba(13, 107, 95, 0.80)" },
                  },
                }}
              >
                <ListItemIcon>{item.icon}</ListItemIcon>
                <ListItemText
                  primary={item.label}
                  slotProps={{
                    primary: {
                      fontSize: "0.875rem",
                      fontWeight: isSelected ? 600 : 400,
                    },
                  }}
                />
              </ListItemButton>
            </ListItem>
          );
        })}
      </List>

      {/* Session indicator */}
      {cashRegisterSession && (
        <Box sx={{ px: 2, pb: 2 }}>
          <Box
            sx={{
              display: "flex",
              alignItems: "center",
              gap: 1,
              px: 1.5,
              py: 1,
              borderRadius: 1.5,
              backgroundColor: SESSION_BG,
              border: `1px solid ${SESSION_BORDER}`,
            }}
          >
            <AccountBalance
              sx={{ fontSize: 14, color: SELECTED_ICON, flexShrink: 0 }}
            />
            <Typography
              variant="caption"
              sx={{ color: SELECTED_ICON, fontWeight: 600, lineHeight: 1.3 }}
            >
              Caja #{cashRegisterSession.id} abierta
            </Typography>
          </Box>
        </Box>
      )}
    </Box>
  );

  return (
    <Box sx={{ display: "flex", height: "100vh" }}>
      {/* ── AppBar: full dark chrome, brand slot + content zone ── */}
      <AppBar
        position="fixed"
        elevation={0}
        sx={{
          zIndex: (theme) => theme.zIndex.drawer + 1,
          backgroundColor: CHROME_BG,
          borderBottom: `1px solid ${CHROME_BORDER}`,
          // override the white theme override
          color: CHROME_TEXT,
        }}
      >
        <Toolbar
          disableGutters
          sx={{ minHeight: `${APPBAR_HEIGHT}px !important`, display: "flex" }}
        >
          {/* Brand slot — aligned with sidebar width on desktop */}
          <Box
            sx={{
              width: { sm: `${DRAWER_WIDTH}px` },
              flexShrink: 0,
              display: "flex",
              alignItems: "center",
              gap: 1.5,
              px: 3,
              borderRight: { sm: `1px solid ${CHROME_BORDER}` },
              height: "100%",
            }}
          >
            {/* Mobile: hamburger */}
            <IconButton
              onClick={() => setMobileOpen(!mobileOpen)}
              size="small"
              sx={{ display: { sm: "none" }, color: CHROME_TEXT_DIM, mr: 0.5 }}
            >
              <MenuIcon fontSize="small" />
            </IconButton>

            {/* Desktop: logo */}
            <Box
              sx={{
                display: { xs: "none", sm: "flex" },
                alignItems: "center",
                gap: 1.5,
              }}
            >
              <PointOfSale
                sx={{ fontSize: 22, color: SELECTED_ICON, flexShrink: 0 }}
              />
              <Typography
                sx={{
                  color: "white",
                  fontWeight: 700,
                  fontSize: "0.9375rem",
                  letterSpacing: "-0.01em",
                  lineHeight: 1,
                }}
              >
                Almanza POS
              </Typography>
            </Box>
          </Box>

          {/* Content zone — page name */}
          <Box sx={{ flex: 1, px: { xs: 1.5, sm: 3 } }}>
            <Typography
              noWrap
              sx={{
                color: CHROME_TEXT,
                fontWeight: 600,
                fontSize: "0.9375rem",
                letterSpacing: "-0.005em",
              }}
            >
              {currentPageLabel}
            </Typography>
          </Box>

          {/* User section */}
          <Box sx={{ display: "flex", alignItems: "center", gap: 1.5, pr: 2 }}>
            <Box
              sx={{ textAlign: "right", display: { xs: "none", sm: "block" } }}
            >
              <Typography
                sx={{
                  color: "rgba(255,255,255,0.88)",
                  fontWeight: 600,
                  fontSize: "0.8125rem",
                  lineHeight: 1.3,
                }}
              >
                {user?.full_name}
              </Typography>
              <Typography
                sx={{
                  color: CHROME_TEXT_MUTED,
                  fontSize: "0.7rem",
                  lineHeight: 1.2,
                }}
              >
                {isAdmin ? "Administrador" : "Cajero"}
              </Typography>
            </Box>

            <IconButton
              size="small"
              onClick={(e) => setAnchorEl(e.currentTarget)}
              sx={{ p: 0.25 }}
            >
              <Avatar
                sx={{
                  width: 32,
                  height: 32,
                  bgcolor: "#1a5e52",
                  fontSize: "0.8125rem",
                  fontWeight: 700,
                  color: "rgba(255,255,255,0.92)",
                }}
              >
                {user?.full_name?.charAt(0).toUpperCase()}
              </Avatar>
            </IconButton>

            <Menu
              anchorEl={anchorEl}
              open={Boolean(anchorEl)}
              onClose={() => setAnchorEl(null)}
              transformOrigin={{ horizontal: "right", vertical: "top" }}
              anchorOrigin={{ horizontal: "right", vertical: "bottom" }}
              slotProps={{
                paper: {
                  sx: {
                    mt: 0.75,
                    minWidth: 160,
                    backgroundColor: "#ffffff",
                    border: "1px solid rgba(26,32,53,0.12)",
                    boxShadow: "0 8px 24px rgba(26,32,53,0.14)",
                  },
                },
              }}
            >
              <MenuItem
                onClick={handleLogout}
                dense
                sx={{ color: "text.primary" }}
              >
                <ListItemIcon>
                  <Logout fontSize="small" sx={{ color: "text.secondary" }} />
                </ListItemIcon>
                Cerrar Sesión
              </MenuItem>
            </Menu>
          </Box>
        </Toolbar>
      </AppBar>

      {/* ── Permanent sidebar (desktop) ── */}
      <Drawer
        variant="permanent"
        sx={{
          display: { xs: "none", sm: "block" },
          "& .MuiDrawer-paper": {
            width: DRAWER_WIDTH,
            boxSizing: "border-box",
            mt: `${APPBAR_HEIGHT}px`,
            height: `calc(100% - ${APPBAR_HEIGHT}px)`,
            backgroundColor: CHROME_BG,
            border: "none",
            borderRight: `1px solid ${CHROME_BORDER}`,
          },
        }}
      >
        {sidebarContent}
      </Drawer>

      {/* ── Temporary sidebar (mobile) ── */}
      <Drawer
        variant="temporary"
        open={mobileOpen}
        onClose={() => setMobileOpen(false)}
        sx={{
          display: { xs: "block", sm: "none" },
          "& .MuiDrawer-paper": {
            width: DRAWER_WIDTH,
            backgroundColor: CHROME_BG,
            border: "none",
          },
        }}
      >
        {/* Mobile: include logo at top */}
        <Box
          sx={{
            px: 3,
            height: `${APPBAR_HEIGHT}px`,
            display: "flex",
            alignItems: "center",
            gap: 1.5,
            borderBottom: `1px solid ${CHROME_BORDER}`,
          }}
        >
          <PointOfSale sx={{ fontSize: 22, color: SELECTED_ICON }} />
          <Typography
            sx={{ color: "white", fontWeight: 700, fontSize: "0.9375rem" }}
          >
            Almanza POS
          </Typography>
        </Box>
        {sidebarContent}
      </Drawer>

      {/* ── Main content ── */}
      <Box
        component="main"
        sx={{
          flexGrow: 1,
          p: 3,
          mt: `${APPBAR_HEIGHT}px`,
          ml: { sm: `${DRAWER_WIDTH}px` },
          backgroundColor: "background.default",
          minHeight: `calc(100vh - ${APPBAR_HEIGHT}px)`,
          overflow: "auto",
        }}
      >
        <Outlet />
      </Box>
    </Box>
  );
}
