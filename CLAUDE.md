# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Commands

### Frontend
```bash
npm run dev          # Start Vite dev server (frontend only)
npm run build        # TypeScript check + Vite build
npm test             # Run all Vitest tests (one-shot)
npm run test:watch   # Run Vitest in watch mode
npm run test:coverage # Run tests with coverage report

# Run a single test file
npx vitest run src/__tests__/utils/formatCurrency.test.ts
```

### Tauri (full app)
```bash
npm run tauri dev    # Start full Tauri app (Rust + frontend)
npm run tauri build  # Build production app
```

### Rust/Backend
```bash
cd src-tauri
cargo test           # Run all Rust unit tests
cargo test money     # Run tests in money.rs only
cargo check          # Type-check without building
```

## Architecture

### Frontend → Backend Communication
All backend calls go through `@tauri-apps/api/core`'s `invoke()`. Every page has a corresponding service class in `src/services/` that wraps `invoke()` calls with typed parameters and return values. Models are defined in `src/models/index.ts` and DTOs in `src/dto/index.ts`.

### Auth Flow
- Login stores session (user + token) in `localStorage` via `AuthService`.
- `AuthContext` (`src/context/AuthContext.tsx`) exposes the current user and is the source of truth in the frontend.
- Route guards (`src/guards/AuthGuard.tsx`) use `AuthGuard` (must be logged in), `GuestGuard` (redirect if logged in), and `AdminGuard` (role check).
- Default admin credentials: `root` / `root`.

### POS State Management
`PosProvider` (`src/context/PosProvider.tsx`) wraps only the `/pos` route and manages the shopping cart via a `useReducer`. The `posReducer` function is exported for unit testing. All cart math uses `decimal.js` to avoid floating-point drift.

### Rust Backend Structure
```
src-tauri/src/
├── lib.rs              # Tauri setup, plugin registration, command registration
├── commands/           # One file per domain; these are the Tauri IPC handlers
├── db/
│   ├── mod.rs          # Database struct (Mutex<Connection>), WAL mode, foreign keys ON
│   ├── schema.rs       # CREATE TABLE statements, migrations array, seed default user
│   └── repository/     # One file per domain; raw SQL queries
├── models/             # Rust structs matching DB rows (Serialize/Deserialize)
└── utils/money.rs      # Monetary rounding helpers (round2, round3, mul_money, etc.)
```

The `Database` struct wraps a `Mutex<Connection>` and is stored as Tauri managed state. Commands receive it via `tauri::State<Database>`. Migrations run at startup by attempting `ALTER TABLE` statements and ignoring "duplicate column name" errors.

### Money / Rounding Rules
- **Frontend**: Use `decimal.js` for all price × quantity calculations and payment totals.
- **Backend**: Use helpers from `utils/money.rs` — `round2` for monetary values (2 dp), `round3` for stock quantities (3 dp), `mul_money` for price × quantity.
- Raw f64 arithmetic (e.g., in `inventory_repo.rs`) accumulates floating-point error — always wrap with `round3()` for stock updates.

### Database
SQLite file stored at the OS app data directory (`pos.db`). WAL journal mode and foreign keys are enabled. Schema is initialized on every app start via `schema::initialize()` (idempotent `CREATE TABLE IF NOT EXISTS`).

Key relationships:
- `products.category_id → categories(id) ON DELETE SET NULL`
- `sales → cash_register_sessions` (a sale belongs to an open session)
- `sale_items → sales ON DELETE CASCADE`
- Products with sale references cannot be deleted (enforced in `product_repo.rs`).

## Code Style

### Frontend (TypeScript/React)
- camelCase for variables/functions, PascalCase for components.
- 2-space indentation, semicolons, single quotes.
- All variables and function parameters must be typed — no `any`.
- Use `interface` for object shapes and component props.

### Commit Messages
Format: `type(scope): description` in English.
Types: `feat`, `fix`, `docs`, `style`, `refactor`, `test`, `chore`.
