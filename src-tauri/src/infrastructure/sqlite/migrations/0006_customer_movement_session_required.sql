ALTER TABLE customer_account_movements RENAME TO customer_account_movements_legacy;
CREATE TABLE customer_account_movements (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    customer_id INTEGER NOT NULL REFERENCES customers(id),
    sale_id INTEGER REFERENCES sales(id),
    cash_register_session_id INTEGER NOT NULL REFERENCES cash_register_sessions(id),
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
INSERT INTO customer_account_movements (id, customer_id, sale_id, cash_register_session_id, user_id, movement_type, amount, payment_cash_mxn, payment_cash_usd, payment_transfer, exchange_rate, notes, created_at)
    SELECT id, customer_id, sale_id, cash_register_session_id, user_id, movement_type, amount, payment_cash_mxn, payment_cash_usd, payment_transfer, exchange_rate, notes, created_at
    FROM customer_account_movements_legacy;
DROP TABLE customer_account_movements_legacy;
CREATE INDEX idx_customer_movements_customer ON customer_account_movements(customer_id);
CREATE INDEX idx_customer_movements_created ON customer_account_movements(created_at);
CREATE INDEX idx_customer_movements_session ON customer_account_movements(cash_register_session_id);
