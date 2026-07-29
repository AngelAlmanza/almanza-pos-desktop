CREATE TABLE customers (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    name TEXT NOT NULL,
    phone TEXT,
    notes TEXT,
    credit_limit REAL NOT NULL DEFAULT 0,
    active INTEGER NOT NULL DEFAULT 1,
    created_at TEXT DEFAULT (datetime('now', 'localtime')),
    updated_at TEXT DEFAULT (datetime('now', 'localtime'))
);
ALTER TABLE sales ADD COLUMN customer_id INTEGER REFERENCES customers(id);
ALTER TABLE sales ADD COLUMN credit_amount REAL NOT NULL DEFAULT 0;
CREATE TABLE customer_account_movements (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    customer_id INTEGER NOT NULL REFERENCES customers(id),
    sale_id INTEGER REFERENCES sales(id),
    cash_register_session_id INTEGER REFERENCES cash_register_sessions(id),
    user_id INTEGER NOT NULL REFERENCES users(id),
    movement_type TEXT NOT NULL CHECK(movement_type IN ('sale_charge', 'account_payment')),
    amount REAL NOT NULL,
    payment_cash_mxn REAL NOT NULL DEFAULT 0,
    payment_cash_usd REAL NOT NULL DEFAULT 0,
    payment_transfer REAL NOT NULL DEFAULT 0,
    exchange_rate REAL,
    notes TEXT,
    created_at TEXT DEFAULT (datetime('now', 'localtime'))
);
CREATE INDEX idx_sales_customer ON sales(customer_id);
CREATE INDEX idx_customer_movements_customer ON customer_account_movements(customer_id);
CREATE INDEX idx_customer_movements_created ON customer_account_movements(created_at);
CREATE INDEX idx_customer_movements_session ON customer_account_movements(cash_register_session_id);
