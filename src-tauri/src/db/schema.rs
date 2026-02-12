use super::Database;

pub fn initialize(db: &Database) -> Result<(), String> {
    let conn = db.conn.lock().map_err(|e| e.to_string())?;

    conn.execute_batch(
        "
        CREATE TABLE IF NOT EXISTS users (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            username TEXT UNIQUE NOT NULL,
            password_hash TEXT NOT NULL,
            full_name TEXT NOT NULL,
            role TEXT NOT NULL CHECK(role IN ('admin', 'cashier')),
            active INTEGER DEFAULT 1,
            created_at TEXT DEFAULT (datetime('now', 'localtime')),
            updated_at TEXT DEFAULT (datetime('now', 'localtime'))
        );

        CREATE TABLE IF NOT EXISTS categories (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            name TEXT UNIQUE NOT NULL,
            description TEXT,
            created_at TEXT DEFAULT (datetime('now', 'localtime'))
        );

        CREATE TABLE IF NOT EXISTS products (
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

        CREATE TABLE IF NOT EXISTS cash_register_sessions (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            user_id INTEGER NOT NULL REFERENCES users(id),
            opening_amount REAL NOT NULL DEFAULT 0,
            closing_amount REAL,
            exchange_rate REAL,
            status TEXT NOT NULL CHECK(status IN ('open', 'closed')) DEFAULT 'open',
            opened_at TEXT DEFAULT (datetime('now', 'localtime')),
            closed_at TEXT
        );

        CREATE TABLE IF NOT EXISTS sales (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            cash_register_session_id INTEGER NOT NULL REFERENCES cash_register_sessions(id),
            user_id INTEGER NOT NULL REFERENCES users(id),
            total REAL NOT NULL,
            payment_method TEXT NOT NULL DEFAULT 'cash',
            payment_amount REAL NOT NULL,
            change_amount REAL NOT NULL DEFAULT 0,
            status TEXT NOT NULL DEFAULT 'completed',
            created_at TEXT DEFAULT (datetime('now', 'localtime'))
        );

        CREATE TABLE IF NOT EXISTS sale_items (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            sale_id INTEGER NOT NULL REFERENCES sales(id) ON DELETE CASCADE,
            product_id INTEGER NOT NULL REFERENCES products(id),
            product_name TEXT NOT NULL,
            quantity REAL NOT NULL,
            unit_price REAL NOT NULL,
            subtotal REAL NOT NULL
        );

        CREATE TABLE IF NOT EXISTS inventory_adjustments (
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

        CREATE INDEX IF NOT EXISTS idx_products_barcode ON products(barcode);
        CREATE INDEX IF NOT EXISTS idx_sales_session ON sales(cash_register_session_id);
        CREATE INDEX IF NOT EXISTS idx_sales_created ON sales(created_at);
        CREATE INDEX IF NOT EXISTS idx_sale_items_sale ON sale_items(sale_id);
        CREATE INDEX IF NOT EXISTS idx_inventory_product ON inventory_adjustments(product_id);
        ",
    )
    .map_err(|e| e.to_string())?;

    // Seed default admin user if no users exist
    seed_default_user(&conn)?;

    Ok(())
}

fn seed_default_user(conn: &rusqlite::Connection) -> Result<(), String> {
    let count: i64 = conn
        .query_row("SELECT COUNT(*) FROM users", [], |row| row.get(0))
        .map_err(|e| e.to_string())?;

    if count == 0 {
        let password_hash =
            bcrypt::hash("root", bcrypt::DEFAULT_COST).map_err(|e| e.to_string())?;

        conn.execute(
            "INSERT INTO users (username, password_hash, full_name, role) VALUES (?1, ?2, ?3, ?4)",
            rusqlite::params!["root", password_hash, "Administrador", "admin"],
        )
        .map_err(|e| e.to_string())?;
    }

    Ok(())
}
