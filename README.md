# 🏪 Almanza POS Desktop

<div align="center">

[![Tauri](https://img.shields.io/badge/Tauri-2.x-blue?logo=tauri)](https://tauri.app/)
[![React](https://img.shields.io/badge/React-17--19-61dafb?logo=react)](https://react.dev/)
[![TypeScript](https://img.shields.io/badge/TypeScript-5.8-3178c6?logo=typescript)](https://www.typescriptlang.org/)
[![Rust](https://img.shields.io/badge/Rust-2021-ce422b?logo=rust)](https://www.rust-lang.org/)

**A desktop point-of-sale system for managing sales, inventory, cash registers, customers, and credit.**

[Features](#features) · [Installation](#installation) · [Development](#development) · [Architecture](#architecture) · [Testing](#testing)

</div>

---

## Overview

Almanza POS Desktop is a local point-of-sale application built with Tauri, React, and Rust. It is designed for small and medium-sized businesses that need cash-register operations, inventory control, multi-currency sales, customer and credit management, and ticket printing.

Data is stored locally in SQLite. The application initializes and migrates the database automatically on startup.

## Features

### Sales and cash registers

- Point of sale with search by name and barcode.
- Combined payments with MXN cash, USD cash, and bank transfer, including exchange rate and change calculation.
- Opening, closing, and querying cash-register sessions; closing balances retain MXN and USD cash amounts.
- Sales history, date filters, details, and sale cancellation.
- Configurable sales tickets and optional automatic printing.

### Catalog and inventory

- Products, categories, prices, minimum stock, and active/inactive products.
- Discrete and bulk units: piece, kilogram, liter, meter, package, box, and others.
- Unit conversion for bulk products and sale entry by base unit, subunit, or amount.
- Inventory adjustments with reasons and stock audit history.

### Customers and credit

- Customer directory with phone, notes, status, and credit limit.
- Credit sales, customer balances, and account movements.
- Customer payments with the same payment-method breakdown used in sales.

### Administration and reports

- Users with `admin` and `cashier` roles; administrative screens are protected by role.
- Sales reports, metrics, best-selling products, receivables, and debtors.
- Excel and PDF report export.
- Business data, logo, ticket header/footer, credit rules, and printer configuration.

### Printing

- ESC/POS tickets through USB (VID/PID) or the Windows print spooler.
- Windows printer detection, print test, and paper size, DPI, encoding, and cut-type configuration.

## Prerequisites

- An LTS Node.js release compatible with Vite 7 and npm.
- Stable Rust and Cargo.
- On Windows, Tauri build requirements: Microsoft C++ Build Tools and Microsoft Edge WebView2 Runtime.

Verify the installed tools:

```bash
node --version
npm --version
rustc --version
cargo --version
```

## Installation

```bash
git clone https://github.com/angel-almanza/almanza-pos-desktop.git
cd almanza-pos-desktop
npm install
```

Verify that the frontend builds correctly:

```bash
npm run build
```

## Development

### Frontend

```bash
npm run dev
```

Starts Vite at `http://localhost:1420`.

### Desktop application

```bash
npm run tauri dev
```

Starts the full Tauri application with hot reload.

### Production build

```bash
npm run tauri build
```

Generated installers and packages are located in `src-tauri/target/release/bundle/`.

### Default credentials

A new database is seeded with the following administrator account:

- Username: `root`
- Password: `root`

> Change these credentials before using the application in production.

## Available commands

```bash
# Frontend
npm run dev              # Vite development server
npm run build            # TypeScript validation and Vite build
npm run preview          # Preview the production build

# Frontend tests
npm test                 # Run Vitest once
npm run test:watch       # Run Vitest in watch mode
npm run test:coverage    # Generate coverage with Vitest

# Tauri
npm run tauri dev        # Desktop application in development
npm run tauri build      # Production packages

# Rust backend
cd src-tauri
cargo test               # All Rust tests
cargo test money         # Money-related tests
cargo check              # Fast type validation
```

## Architecture

### Frontend

The frontend uses React, TypeScript, Material UI, and React Router. It is organized by domain:

```text
src/
├── core/                         # App, theme, layout, and guards
│   ├── App.tsx
│   ├── guards/
│   └── layout/
├── modules/
│   ├── auth/                     # Session and authentication
│   ├── cash-register/            # Cash-register sessions
│   ├── catalog/
│   │   ├── categories/
│   │   ├── inventory/
│   │   └── products/
│   ├── customers/                # Customers, credit, and payments
│   ├── pos/                      # Cart and checkout flow
│   ├── reports/                  # Metrics and export
│   ├── sales/                    # Sales history and queries
│   ├── settings/                 # Business, ticket, and printing settings
│   ├── users/
│   └── shared/                   # Shared types, utilities, and components
└── __tests__/                    # Module-level unit tests
```

Each module groups its pages, components, services, and types. Services encapsulate Tauri `invoke()` calls and keep communication with Rust typed.

`AuthProvider` persists the session in `localStorage`. `PosProvider` wraps only the `/pos` route and manages the cart with `useReducer`.

### Backend

The backend follows vertical slices with inbound and outbound adapters:

```text
src-tauri/src/
├── bootstrap.rs                  # Tauri plugin, state, and command registration
├── infrastructure/sqlite/        # SQLite connection and versioned migrations
├── modules/
│   ├── identity/
│   ├── catalog/
│   ├── inventory/
│   ├── sales/
│   ├── cash_register/
│   ├── accounts_receivable/
│   ├── settings/
│   └── printing/
│       ├── application.rs
│       └── adapters/
│           ├── inbound/tauri.rs  # IPC commands
│           └── outbound/sqlite.rs
├── printer/                      # Configuration, hardware, and ESC/POS
├── models/
└── shared/                       # Money, pagination, and errors
```

The SQLite database is stored as `pos.db` in the application data directory. WAL mode and foreign keys are enabled. Migrations run transactionally, are recorded with checksums, and support existing databases.

### Monetary and inventory precision

- Frontend: `decimal.js` for price, quantity, and payment calculations.
- Backend: shared helpers round monetary amounts to two decimal places and stock quantities to three decimal places.
- Sale, cancellation, credit, and inventory operations validate their inputs and protect compound operations with SQLite transactions.

## Main technologies

| Area | Technologies |
| --- | --- |
| Interface | React, TypeScript, Vite, Material UI, MUI X Date Pickers |
| Desktop | Tauri 2, Dialog, Filesystem, and Opener plugins |
| State and precision | React Context, `useReducer`, decimal.js |
| Reports | ExcelJS, jsPDF, jsPDF-AutoTable |
| Backend | Rust, rusqlite, serde, bcrypt, tokio |
| Printing | ESC/POS, serialport, and Windows printing APIs |
| Testing | Vitest and Rust unit tests |

## Testing

```bash
# All frontend tests
npm test

# A specific frontend test
npx vitest run src/__tests__/modules/shared/utils/formatCurrency.test.ts

# All backend tests
cd src-tauri
cargo test
```

Tests cover monetary calculations, unit conversion, the POS reducer, sale-item presentation, reports, migrations, payments, bulk products, and ESC/POS printing.

## Security and data

- Passwords are protected with bcrypt.
- Authentication and role-based access control.
- Validation in both the UI and backend commands.
- SQLite transactions, constraints, and referential integrity.
- Local persistence: this project does not synchronize data with a remote service.

---

Made with ❤️ by Angel Almanza.
