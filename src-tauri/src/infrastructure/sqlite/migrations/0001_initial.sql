CREATE TABLE users (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    username TEXT UNIQUE NOT NULL,
    password_hash TEXT NOT NULL,
    full_name TEXT NOT NULL,
    role TEXT NOT NULL CHECK(role IN ('admin', 'cashier')),
    active INTEGER DEFAULT 1,
    created_at TEXT DEFAULT (datetime('now', 'localtime')),
    updated_at TEXT DEFAULT (datetime('now', 'localtime'))
);
CREATE TABLE categories (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    name TEXT UNIQUE NOT NULL,
    description TEXT,
    created_at TEXT DEFAULT (datetime('now', 'localtime'))
);
CREATE TABLE products (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    name TEXT NOT NULL,
    description TEXT,
    barcode TEXT UNIQUE,
    price REAL NOT NULL,
    unit TEXT NOT NULL DEFAULT 'pieza',
    category_id INTEGER REFERENCES categories(id) ON DELETE SET NULL,
    stock REAL DEFAULT 0,
    min_stock REAL DEFAULT 0,
    active INTEGER DEFAULT 1,
    created_at TEXT DEFAULT (datetime('now', 'localtime')),
    updated_at TEXT DEFAULT (datetime('now', 'localtime'))
);
CREATE TABLE cash_register_sessions (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    user_id INTEGER NOT NULL REFERENCES users(id),
    opening_amount REAL NOT NULL DEFAULT 0,
    closing_amount REAL,
    exchange_rate REAL,
    status TEXT NOT NULL CHECK(status IN ('open', 'closed')) DEFAULT 'open',
    opened_at TEXT DEFAULT (datetime('now', 'localtime')),
    closed_at TEXT
);
CREATE TABLE sales (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    cash_register_session_id INTEGER NOT NULL REFERENCES cash_register_sessions(id),
    user_id INTEGER NOT NULL REFERENCES users(id),
    total REAL NOT NULL,
    payment_method TEXT NOT NULL DEFAULT 'cash_mxn',
    payment_amount REAL NOT NULL,
    change_amount REAL NOT NULL DEFAULT 0,
    status TEXT NOT NULL DEFAULT 'completed',
    created_at TEXT DEFAULT (datetime('now', 'localtime'))
);
CREATE TABLE sale_items (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    sale_id INTEGER NOT NULL REFERENCES sales(id) ON DELETE CASCADE,
    product_id INTEGER NOT NULL REFERENCES products(id),
    product_name TEXT NOT NULL,
    quantity REAL NOT NULL,
    unit_price REAL NOT NULL,
    subtotal REAL NOT NULL
);
CREATE TABLE inventory_adjustments (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    product_id INTEGER NOT NULL REFERENCES products(id),
    user_id INTEGER NOT NULL REFERENCES users(id),
    adjustment_type TEXT NOT NULL CHECK(adjustment_type IN ('add', 'positive', 'negative')),
    quantity REAL NOT NULL,
    previous_stock REAL NOT NULL,
    new_stock REAL NOT NULL,
    reason TEXT,
    created_at TEXT DEFAULT (datetime('now', 'localtime'))
);
CREATE TABLE settings (
    key TEXT PRIMARY KEY,
    value TEXT,
    value_type TEXT NOT NULL DEFAULT 'string' CHECK(value_type IN ('string', 'multiline', 'number', 'boolean', 'image_path')),
    label TEXT NOT NULL,
    description TEXT,
    group_name TEXT NOT NULL DEFAULT 'general',
    sort_order INTEGER NOT NULL DEFAULT 0,
    created_at TEXT DEFAULT (datetime('now', 'localtime')),
    updated_at TEXT DEFAULT (datetime('now', 'localtime'))
);
CREATE INDEX idx_products_barcode ON products(barcode);
CREATE INDEX idx_sales_session ON sales(cash_register_session_id);
CREATE INDEX idx_sales_created ON sales(created_at);
CREATE INDEX idx_sale_items_sale ON sale_items(sale_id);
CREATE INDEX idx_inventory_product ON inventory_adjustments(product_id);
