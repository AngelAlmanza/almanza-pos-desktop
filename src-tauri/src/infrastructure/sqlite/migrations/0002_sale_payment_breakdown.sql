ALTER TABLE sales ADD COLUMN payment_cash_mxn REAL NOT NULL DEFAULT 0;
ALTER TABLE sales ADD COLUMN payment_cash_usd REAL NOT NULL DEFAULT 0;
ALTER TABLE sales ADD COLUMN payment_transfer REAL NOT NULL DEFAULT 0;
ALTER TABLE sales ADD COLUMN exchange_rate REAL;
ALTER TABLE cash_register_sessions ADD COLUMN closing_cash_mxn REAL;
ALTER TABLE cash_register_sessions ADD COLUMN closing_cash_usd REAL;
