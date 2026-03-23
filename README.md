# 🏪 Almanza POS Desktop

<div align="center">

[![Tauri](https://img.shields.io/badge/Tauri-2.0-blue?logo=tauri)](https://tauri.app/)
[![React](https://img.shields.io/badge/React-18+-61dafb?logo=react)](https://react.dev/)
[![TypeScript](https://img.shields.io/badge/TypeScript-5.8-3178c6?logo=typescript)](https://www.typescriptlang.org/)
[![Rust](https://img.shields.io/badge/Rust-2021-ce422b?logo=rust)](https://www.rust-lang.org/)
[![License](https://img.shields.io/badge/License-MIT-green.svg)](LICENSE)

**A modern point of sale (POS) system for desktop with intuitive interface and powerful management capabilities**

[Features](#-features) • [Installation](#-installation) • [Quick Start](#-quick-start) • [Documentation](#-project-structure)

</div>

---

## 📋 Overview

**Almanza POS Desktop** is a professional point of sale application built with modern technologies. It combines the power of a Rust backend with the flexibility of React to create a smooth and responsive user experience.

Ideal for small and medium-sized businesses that need:
- ✅ Complete sales management
- ✅ Real-time inventory control
- ✅ Detailed reports and analytics
- ✅ Thermal ticket printing
- ✅ Secure cash register handling

---

## ⭐ Features

### 💰 Sales Management
- Intuitive and fast POS interface
- Support for multiple payment methods (cash, card, credit)
- Automatic change calculation in multiple currencies (USD/MXN)
- Receipts and thermal tickets

### 📦 Advanced Inventory
- Real-time stock tracking
- Support for unit, weight, and volume products
- Product categorization
- Adjustments and movement audit

### 📊 Comprehensive Reports
- Sales reports with multiple filters
- Income and profitability analysis
- Export to Excel and PDF
- Dashboards with key metrics

### 👥 User Management
- Secure authentication with bcrypt
- User roles (admin, seller)
- Role-based access control (RBAC)
- Operation audit

### 🏦 Cash Registers
- Cash drawer opening and closing
- Operation summaries
- Cash reconciliation
- Session history

### 🛠️ Integrations
- Barcode codes
- Thermal printers via serial and USB port
- Customizable application configuration
- Local persistence with SQLite

---

## 🚀 Prerequisites

Before getting started, make sure you have installed:

- **Node.js** `≥ 18.0` ([download](https://nodejs.org/))
- **Rust** `≥ 1.70` ([install](https://rustup.rs/))
- **npm** or **yarn** (included with Node.js)

### Verify Installation
```bash
node --version      # v18.0.0 or later
npm --version       # 9.0.0 or later
rustc --version     # rustc 1.70.0 or later
cargo --version     # cargo 1.70.0 or later
```

---

## 📦 Installation

### 1. Clone the Repository
```bash
git clone https://github.com/angel-almanza/almanza-pos-desktop.git
cd almanza-pos-desktop
```

### 2. Install Dependencies
```bash
npm install
```

### 3. Verify Build
```bash
npm run build
```

---

## 🎯 Quick Start

### Development - Frontend Only
```bash
npm run dev
```
Starts Vite server at `http://localhost:5173`

### Development - Full Application (Recommended)
```bash
npm run tauri dev
```
Opens the complete desktop application with hot-reload

### Build for Production
```bash
npm run tauri build
```
Generates the executable in `src-tauri/target/release/`

### Default Credentials
- **Username**: `root`
- **Password**: `root`

---

## 📜 Available Scripts

### Frontend
```bash
npm run dev              # Vite dev server
npm run build           # TypeScript check + build
npm run preview         # Preview production build

npm test                # Unit tests (one-shot)
npm run test:watch      # Tests in watch mode
npm run test:coverage   # Coverage report
```

### Tauri (Full Stack)
```bash
npm run tauri dev       # Desktop app with hot-reload
npm run tauri build     # Production build
```

### Rust Backend
```bash
cd src-tauri
cargo test              # Rust unit tests
cargo test money        # Module-specific tests (e.g., money.rs)
cargo check            # Validation without building
```

---

## 🏗️ Project Structure

```
almanza-pos-desktop/
├── src/                          # Frontend (React + TypeScript)
│   ├── components/               # Reusable components
│   │   ├── pos/                 # POS-specific components
│   │   ├── reports/             # Reports components
│   │   ├── cash-register/       # Cash register components
│   │   └── settings/            # Settings components
│   ├── pages/                   # Main pages
│   │   ├── LoginPage.tsx
│   │   ├── POSPage.tsx
│   │   ├── InventoryPage.tsx
│   │   ├── SalesPage.tsx
│   │   ├── ReportsPage.tsx
│   │   └── ...
│   ├── services/                # Services invoking Rust commands
│   │   ├── AuthService.ts
│   │   ├── ProductService.ts
│   │   ├── SaleService.ts
│   │   └── ...
│   ├── context/                 # React Context (Auth, POS)
│   │   ├── AuthContext.tsx
│   │   └── PosProvider.tsx
│   ├── guards/                  # Route guards (Auth, Admin)
│   ├── utils/                   # Utilities (formatting, reports)
│   ├── models/                  # TypeScript types
│   ├── dto/                     # Data Transfer Objects
│   ├── __tests__/              # Unit tests
│   └── App.tsx
│
├── src-tauri/                   # Backend (Rust + Tauri)
│   ├── src/
│   │   ├── lib.rs              # Tauri setup and command registration
│   │   ├── commands/           # IPC command handlers
│   │   │   ├── auth.rs
│   │   │   ├── product.rs
│   │   │   ├── sale.rs
│   │   │   └── ...
│   │   ├── db/                 # Database
│   │   │   ├── mod.rs          # Database struct
│   │   │   ├── schema.rs       # DDL and migrations
│   │   │   └── repository/     # SQL queries
│   │   ├── models/             # Rust structs
│   │   └── utils/              # Utilities
│   │       └── money.rs        # Monetary rounding helpers
│   └── Cargo.toml
│
├── package.json
├── vite.config.ts
├── tsconfig.json
├── vitest.config.ts
├── CLAUDE.md                   # Development guide
└── README.md
```

---

## 🛠️ Architecture

### Frontend → Backend
All communication is through **Tauri IPC** (`invoke()`):
```typescript
// Frontend
import { invoke } from '@tauri-apps/api/core';

const result = await invoke('create_sale', {
  items: cartItems
});
```

```rust
// Backend
#[tauri::command]
pub fn create_sale(db: tauri::State<Database>, items: Vec<SaleItem>) -> Result<Sale, String> {
  // Logic...
}
```

### State and Context
- **AuthContext**: Stores user session (localStorage)
- **PosProvider**: Manages shopping cart (useReducer with Decimal.js)
- **Database**: SQLite with transactions and foreign keys enabled

### Monetary Precision
- **Frontend**: `decimal.js` for all price × quantity operations
- **Backend**: Functions in `money.rs` (`round2`, `round3`, `mul_money`) to prevent floating-point drift

---

## 📊 Technology Stack

### Frontend
| Library | Version | Purpose |
|---------|---------|---------|
| **React** | 18+ | UI Framework |
| **TypeScript** | 5.8 | Type Safety |
| **Vite** | 7.0 | Build Tool |
| **Material UI** | 7.3 | Component Library |
| **Decimal.js** | 10.6 | Monetary precision |
| **ExcelJS** | 4.4 | Report generation |
| **jsPDF** | 4.1 | PDF generation |
| **Vitest** | 4.0 | Testing |

### Backend
| Library | Version | Purpose |
|---------|---------|---------|
| **Tauri** | 2.0 | App Framework |
| **Rust** | 2021 | Language |
| **rusqlite** | 0.31 | Database |
| **bcrypt** | 0.15 | Password hashing |
| **tokio** | 1.0 | Async runtime |
| **serde** | 1.0 | Serialization |
| **qrcode** | 0.12 | QR Codes |
| **barcode** | 0.17 | Barcodes |

---

## 🧪 Testing

### Frontend
```bash
# Run all tests
npm test

# Watch mode
npm run test:watch

# With coverage
npm run test:coverage

# Specific test
npx vitest run src/__tests__/utils/formatCurrency.test.ts
```

### Backend
```bash
cd src-tauri

# All tests
cargo test

# Module-specific tests
cargo test money
```

---

## 🔐 Security

- ✅ Authentication with bcrypt
- ✅ Passwords stored with hash
- ✅ Role-based access control (RBAC)
- ✅ ACID transactions in database
- ✅ Foreign keys and constraints enabled
- ✅ Input validation on client and server

---

## 📈 Performance

- 🚀 Data preloading with Tauri
- 📦 Optimized bundle with Vite
- 💾 Local caching with SQLite
- ⚡ Decimal.js to prevent unnecessary recalculations
- 🔄 Hot-reload in development

---

## 📝 Code Standards

### Frontend (TypeScript/React)
```typescript
// ✅ Good
const formatPrice = (price: number): string => {
  return new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(price);
};

// ❌ Avoid
const formatPrice = (price: any) => {
  return '$' + price;
};
```

### Commit Messages
```
type(scope): description

feat(pos): add quantity dialog for products
fix(inventory): fix rounding in stock
docs(readme): update instructions
```

Types: `feat`, `fix`, `docs`, `style`, `refactor`, `test`, `chore`

---

<div align="center">

**Made with ❤️ by Angel Almanza**

[⬆ Back to top](#-almanza-pos-desktop)

</div>
