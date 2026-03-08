# Interface Design System — Almanza POS

## Direction: "La Caja"

A tool for cashiers and admins in a physical Mexican retail store.
Dense but calm. Like the counter itself — purposeful, precise, warm.

---

## Palette

| Token            | Value       | Role                               |
|------------------|-------------|------------------------------------|
| Primary teal     | `#0d6b5f`   | Actions, accent, selected states   |
| Primary light    | `#1a8475`   | Hover states                       |
| Navy             | `#12172a`   | Sidebar background (register body) |
| Ink              | `#1a2035`   | Primary text                       |
| Ink secondary    | `#5a6380`   | Secondary text, labels             |
| Ink muted        | `#b0b8cc`   | Disabled, placeholder              |
| Background warm  | `#f0ede8`   | App background (receipt paper)     |
| Paper            | `#ffffff`   | Card/dialog surfaces               |
| Receipt warm     | `#faf9f6`   | POS right panel, expanded rows     |
| Table header bg  | `#f5f3f0`   | Table head background              |
| Amber            | `#c17d11`   | Exchange rate, secondary actions   |
| Forest green     | `#2d6a4f`   | Success, completed states          |
| Sidebar teal     | `#4db6a9`   | Sidebar icons when selected        |
| Error            | `#b91c1c`   | Destructive, cancelled             |

---

## Depth Strategy: Borders-Only

- **Cards**: `boxShadow: none`, `border: 1px solid rgba(26,32,53,0.10)`
- **Tables**: `elevation={0}`, `border: 1px solid rgba(26,32,53,0.10)`
- **Dialogs**: `boxShadow: 0 16px 64px rgba(26,32,53,0.18)`
- **Dividers**: `rgba(26,32,53,0.10)`
- **Sidebar border**: `rgba(255,255,255,0.06)`

---

## Spacing

Base unit: 8px. Scale: 4, 8, 12, 16, 20, 24, 32, 40

---

## Typography

Font: Inter. Fallback: Roboto, Helvetica, Arial.

- Headings h4–h6: `fontWeight: 600–700`, `letterSpacing: -0.01em to -0.02em`
- Table headers: `font-size: 0.7rem`, `uppercase`, `letter-spacing: 0.06em`, `color: #5a6380`
- Secondary text: `color: text.secondary (#5a6380)`, `fontSize: 0.8125rem`
- Monetary/numerical data: `fontVariantNumeric: tabular-nums` on h4, and inline `sx={{ fontVariantNumeric: 'tabular-nums' }}`
- Barcodes/codes: `fontFamily: monospace`
- Section labels: `textTransform: uppercase`, `letterSpacing: 0.06em`, `fontSize: caption`, `fontWeight: 600`

---

## Components

### Sidebar (Layout.tsx)
- Background: `#12172a` (dark navy)
- Width: 252px
- Nav text: `rgba(255,255,255,0.72)`
- Nav icons: `rgba(255,255,255,0.55)`
- Selected bg: `rgba(13,107,95,0.65)` (teal)
- Selected icon: `#4db6a9`
- Hover: `rgba(255,255,255,0.08)` bg
- Session indicator: teal-bordered box, `rgba(45,106,79,0.25)` bg

### AppBar + Sidebar ("chrome unificado")
- **Mismo color que el sidebar**: `#12172a` — forman una L oscura que enmarca el contenido
- Height: 56px (`APPBAR_HEIGHT = 56`)
- Border-bottom: `rgba(255,255,255,0.08)` (igual que dividers del sidebar)
- **Brand slot** (izquierda): ancho exacto de `DRAWER_WIDTH (252px)`, separado con `borderRight: rgba(255,255,255,0.08)`. Contiene logo PointOfSale teal + "Almanza POS" blanco.
- **Content zone** (centro): nombre de página actual, `rgba(255,255,255,0.90)`, fontWeight 600
- **User section** (derecha): nombre `rgba(255,255,255,0.88)` + rol `rgba(255,255,255,0.45)`, avatar `bgcolor: '#1a5e52'`
- `disableGutters` en Toolbar, padding manual por zonas
- El sidebar desktop **no tiene logo** — vive en el AppBar brand slot
- Mobile: sidebar temporal incluye logo propio en header height

### Buttons
- `textTransform: none`, `fontWeight: 600`, `boxShadow: none`
- In pages: typically `size="small"` for header actions
- In dialogs: `size="medium"` (default), confirm gets `size="large"` or `px: 3`

### Chips (status)
- No MUI color props — use custom `sx` for precise color control
- Success: `rgba(45,106,79,0.12)` bg, `success.dark` text
- Error: `rgba(185,28,28,0.10)` bg, `error.dark` text
- Warning: `rgba(193,125,17,0.12)` bg, `warning.dark` text
- Default: `rgba(26,32,53,0.07)` bg, `text.secondary` text
- Size: `sizeSmall` = `height: 20`, `borderRadius: 3`

### Metric Cards (ReportsPage, CashRegisterPage)
- Left border accent: `borderLeft: '3px solid'`, `borderColor: accentColor`
- Horizontal layout: icon container + label/value stack
- Icon container: `p: 1.25`, `borderRadius: 1.5`, `backgroundColor: rgba(..., 0.10)`
- Value: `variant="h5"`, `fontVariantNumeric: tabular-nums`, colored to accent
- Label: `caption`, `uppercase`, `letterSpacing: 0.05em`, `fontWeight: 500`

### Receipt Panel (POSPage right panel)
- `backgroundColor: '#faf9f6'`
- `borderLeft: '3px solid'`, `borderColor: 'primary.main'`
- Total: `variant="h4"`, teal color, tabular-nums
- Section labels: caption, uppercase, letterSpacing 0.08em

### Dialog Actions
- `px: 3, pb: 2.5, gap: 1`
- Cancel: `color="inherit"` (no color prop)
- Confirm: `variant="contained"`

### Empty States
- `py: 4, color: 'text.secondary'` in table cell with `colSpan`

### Table Row Hover
- `rgba(13,107,95,0.04)` — subtle teal tint

---

## Signature Element

Numbers and monetary amounts always use `fontVariantNumeric: 'tabular-nums'`. Combined with the receipt-warm panel (`#faf9f6`) and teal left-border on summary cards, the interface evokes a physical receipt slip.
