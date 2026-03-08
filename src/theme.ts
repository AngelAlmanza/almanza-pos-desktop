import { createTheme } from "@mui/material/styles";

export const theme = createTheme({
  palette: {
    mode: "light",
    primary: {
      main: "#0d6b5f",
      light: "#1a8475",
      dark: "#0a5249",
      contrastText: "#ffffff",
    },
    secondary: {
      main: "#c17d11",
      light: "#d4961a",
      dark: "#9a6309",
      contrastText: "#ffffff",
    },
    success: {
      main: "#2d6a4f",
      light: "#3d8b67",
      dark: "#1f4f39",
    },
    warning: {
      main: "#c17d11",
      light: "#d4961a",
      dark: "#9a6309",
    },
    error: {
      main: "#b91c1c",
      light: "#d32f2f",
      dark: "#9b1818",
    },
    background: {
      default: "#f0ede8",
      paper: "#ffffff",
    },
    text: {
      primary: "#1a2035",
      secondary: "#5a6380",
      disabled: "#b0b8cc",
    },
    divider: "rgba(26, 32, 53, 0.10)",
  },
  typography: {
    fontFamily: '"Inter", "Roboto", "Helvetica", "Arial", sans-serif',
    h4: {
      fontWeight: 700,
      letterSpacing: "-0.02em",
      fontVariantNumeric: "tabular-nums",
    },
    h5: {
      fontWeight: 600,
      letterSpacing: "-0.01em",
    },
    h6: {
      fontWeight: 600,
      letterSpacing: "-0.01em",
    },
    subtitle1: {
      fontWeight: 600,
    },
    subtitle2: {
      fontWeight: 600,
      letterSpacing: "0.01em",
    },
  },
  shape: {
    borderRadius: 6,
  },
  components: {
    MuiButton: {
      styleOverrides: {
        root: {
          textTransform: "none",
          fontWeight: 600,
          letterSpacing: 0,
          boxShadow: "none",
          "&:hover": { boxShadow: "none" },
          "&:active": { boxShadow: "none" },
          "&.Mui-focusVisible": { boxShadow: "none" },
        },
        sizeLarge: {
          padding: "10px 24px",
          fontSize: "0.9375rem",
        },
        contained: {
          "&:hover": { boxShadow: "none" },
        },
      },
    },
    MuiCard: {
      styleOverrides: {
        root: {
          boxShadow: "none",
          border: "1px solid rgba(26, 32, 53, 0.10)",
          backgroundImage: "none",
        },
      },
    },
    MuiPaper: {
      styleOverrides: {
        root: {
          backgroundImage: "none",
        },
        elevation1: {
          boxShadow:
            "0 1px 3px rgba(26, 32, 53, 0.06), 0 1px 2px rgba(26, 32, 53, 0.04)",
        },
        elevation2: {
          boxShadow: "0 2px 6px rgba(26, 32, 53, 0.08)",
        },
        elevation4: {
          boxShadow: "0 4px 12px rgba(26, 32, 53, 0.10)",
        },
        elevation8: {
          boxShadow: "0 8px 24px rgba(26, 32, 53, 0.12)",
        },
      },
    },
    MuiAppBar: {
      styleOverrides: {
        root: {
          backgroundColor: "#ffffff",
          color: "#1a2035",
          boxShadow: "none",
          borderBottom: "1px solid rgba(26, 32, 53, 0.10)",
        },
      },
    },
    MuiTableHead: {
      styleOverrides: {
        root: {
          "& .MuiTableCell-head": {
            fontWeight: 600,
            fontSize: "0.7rem",
            letterSpacing: "0.06em",
            textTransform: "uppercase",
            color: "#5a6380",
            backgroundColor: "#f5f3f0",
            borderBottom: "1px solid rgba(26, 32, 53, 0.12)",
          },
        },
      },
    },
    MuiTableCell: {
      styleOverrides: {
        root: {
          borderColor: "rgba(26, 32, 53, 0.08)",
          padding: "10px 16px",
          fontSize: "0.875rem",
        },
      },
    },
    MuiTableRow: {
      styleOverrides: {
        root: {
          "&:last-child td": {
            borderBottom: 0,
          },
          "&.MuiTableRow-hover:hover": {
            backgroundColor: "rgba(13, 107, 95, 0.04)",
          },
        },
      },
    },
    MuiChip: {
      styleOverrides: {
        root: {
          fontWeight: 500,
          borderRadius: 4,
        },
        sizeSmall: {
          fontSize: "0.7rem",
          height: 20,
          borderRadius: 3,
          padding: "0 2px",
        },
      },
    },
    MuiDialog: {
      styleOverrides: {
        paper: {
          border: "none",
          boxShadow:
            "0 16px 64px rgba(26, 32, 53, 0.18), 0 4px 16px rgba(26, 32, 53, 0.12)",
        },
      },
    },
    MuiDialogTitle: {
      styleOverrides: {
        root: {
          fontSize: "1rem",
          fontWeight: 600,
          padding: "20px 24px 12px",
          color: "#1a2035",
        },
      },
    },
    MuiDialogContent: {
      styleOverrides: {
        root: {
          padding: "8px 24px 16px",
        },
      },
    },
    MuiTab: {
      styleOverrides: {
        root: {
          textTransform: "none",
          fontWeight: 500,
          minHeight: 44,
          fontSize: "0.875rem",
          color: "#5a6380",
          "&.Mui-selected": {
            fontWeight: 600,
            color: "#0d6b5f",
          },
        },
      },
    },
    MuiTabs: {
      styleOverrides: {
        indicator: {
          height: 2,
          backgroundColor: "#0d6b5f",
        },
      },
    },
    MuiOutlinedInput: {
      styleOverrides: {
        root: {
          "& .MuiOutlinedInput-notchedOutline": {
            borderColor: "rgba(26, 32, 53, 0.18)",
          },
          "&:hover .MuiOutlinedInput-notchedOutline": {
            borderColor: "rgba(26, 32, 53, 0.32)",
          },
          "&.Mui-focused .MuiOutlinedInput-notchedOutline": {
            borderColor: "#0d6b5f",
          },
        },
      },
    },
    MuiAlert: {
      styleOverrides: {
        root: {
          borderRadius: 6,
          fontSize: "0.875rem",
        },
      },
    },
    MuiDivider: {
      styleOverrides: {
        root: {
          borderColor: "rgba(26, 32, 53, 0.10)",
        },
      },
    },
    MuiSwitch: {
      styleOverrides: {
        switchBase: {
          "&.Mui-checked": {
            color: "#0d6b5f",
            "& + .MuiSwitch-track": {
              backgroundColor: "#0d6b5f",
            },
          },
        },
      },
    },
    MuiListItemButton: {
      styleOverrides: {
        root: {
          borderRadius: 6,
        },
      },
    },
    MuiFormLabel: {
      styleOverrides: {
        root: {
          color: "#5a6380",
          fontSize: "0.875rem",
          "&.Mui-focused": {
            color: "#0d6b5f",
          },
        },
      },
    },
    MuiInputLabel: {
      styleOverrides: {
        root: {
          fontSize: "0.875rem",
        },
      },
    },
    MuiSnackbar: {
      styleOverrides: {
        root: {
          "& .MuiSnackbarContent-root": {
            backgroundColor: "#1a2035",
            color: "#ffffff",
          },
        },
      },
    },
  },
});
