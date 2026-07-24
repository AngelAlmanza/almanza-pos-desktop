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
            is_bulk INTEGER NOT NULL DEFAULT 0,
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
            closing_cash_mxn REAL,
            closing_cash_usd REAL,
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
            payment_method TEXT NOT NULL DEFAULT 'cash_mxn',
            payment_amount REAL NOT NULL,
            payment_cash_mxn REAL NOT NULL DEFAULT 0,
            payment_cash_usd REAL NOT NULL DEFAULT 0,
            payment_transfer REAL NOT NULL DEFAULT 0,
            exchange_rate REAL,
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

        CREATE TABLE IF NOT EXISTS settings (
            key TEXT PRIMARY KEY,
            value TEXT,
            value_type TEXT NOT NULL DEFAULT 'string'
                CHECK(value_type IN ('string', 'multiline', 'number', 'boolean', 'image_path')),
            label TEXT NOT NULL,
            description TEXT,
            group_name TEXT NOT NULL DEFAULT 'general',
            sort_order INTEGER NOT NULL DEFAULT 0,
            created_at TEXT DEFAULT (datetime('now', 'localtime')),
            updated_at TEXT DEFAULT (datetime('now', 'localtime'))
        );

        CREATE INDEX IF NOT EXISTS idx_products_barcode ON products(barcode);
        CREATE INDEX IF NOT EXISTS idx_sales_session ON sales(cash_register_session_id);
        CREATE INDEX IF NOT EXISTS idx_sales_created ON sales(created_at);
        CREATE INDEX IF NOT EXISTS idx_sale_items_sale ON sale_items(sale_id);
        CREATE INDEX IF NOT EXISTS idx_inventory_product ON inventory_adjustments(product_id);
        ",
    )
    .map_err(|e| e.to_string())?;

    run_migrations(&conn)?;
    seed_default_user(&conn)?;
    seed_default_settings(&conn)?;

    Ok(())
}

fn run_migrations(conn: &rusqlite::Connection) -> Result<(), String> {
    let migrations = [
        "ALTER TABLE sales ADD COLUMN payment_cash_mxn REAL NOT NULL DEFAULT 0",
        "ALTER TABLE sales ADD COLUMN payment_cash_usd REAL NOT NULL DEFAULT 0",
        "ALTER TABLE sales ADD COLUMN payment_transfer REAL NOT NULL DEFAULT 0",
        "ALTER TABLE sales ADD COLUMN exchange_rate REAL",
        "ALTER TABLE cash_register_sessions ADD COLUMN closing_cash_mxn REAL",
        "ALTER TABLE cash_register_sessions ADD COLUMN closing_cash_usd REAL",
    ];

    for sql in &migrations {
        match conn.execute(sql, []) {
            Ok(_) => {}
            Err(e) => {
                let msg = e.to_string();
                if !msg.contains("duplicate column name") {
                    return Err(format!("Migration error: {}", msg));
                }
            }
        }
    }

    migrate_products_is_bulk(conn)?;

    Ok(())
}

fn migrate_products_is_bulk(conn: &rusqlite::Connection) -> Result<(), String> {
    match conn.execute(
        "ALTER TABLE products ADD COLUMN is_bulk INTEGER NOT NULL DEFAULT 0",
        [],
    ) {
        Ok(_) => {
            conn.execute(
                "UPDATE products SET is_bulk = 1 WHERE unit IN ('kg', 'litro', 'metro')",
                [],
            )
            .map_err(|e| format!("Migration backfill error: {}", e))?;
        }
        Err(e) => {
            let msg = e.to_string();
            if !msg.contains("duplicate column name") {
                return Err(format!("Migration error: {}", msg));
            }
        }
    }

    Ok(())
}

#[cfg(test)]
mod tests {
    use super::migrate_products_is_bulk;
    use rusqlite::{params, Connection};

    #[test]
    fn bulk_migration_backfills_legacy_units_only_when_column_is_added() {
        let conn = Connection::open_in_memory().unwrap();
        conn.execute_batch(
            "CREATE TABLE products (
                id INTEGER PRIMARY KEY,
                unit TEXT NOT NULL
            );
            INSERT INTO products (id, unit) VALUES
                (1, 'kg'), (2, 'litro'), (3, 'metro'), (4, 'pieza');",
        )
        .unwrap();

        migrate_products_is_bulk(&conn).unwrap();

        let flags: Vec<(i64, i64)> = conn
            .prepare("SELECT id, is_bulk FROM products ORDER BY id")
            .unwrap()
            .query_map([], |row| Ok((row.get(0)?, row.get(1)?)))
            .unwrap()
            .collect::<Result<Vec<_>, _>>()
            .unwrap();
        assert_eq!(flags, vec![(1, 1), (2, 1), (3, 1), (4, 0)]);

        conn.execute("UPDATE products SET is_bulk = 0 WHERE id = ?1", params![1])
            .unwrap();
        migrate_products_is_bulk(&conn).unwrap();

        let customized_flag: i64 = conn
            .query_row("SELECT is_bulk FROM products WHERE id = 1", [], |row| {
                row.get(0)
            })
            .unwrap();
        assert_eq!(customized_flag, 0);
    }
}

fn seed_default_settings(conn: &rusqlite::Connection) -> Result<(), String> {
    let defaults: &[(&str, &str, &str, &str, &str, i64)] = &[
        (
            "business_name",
            "",
            "string",
            "Nombre del negocio",
            "general",
            10,
        ),
        ("business_address", "", "string", "Dirección", "general", 20),
        ("business_phone", "", "string", "Teléfono", "general", 30),
        ("business_rfc", "", "string", "RFC", "general", 40),
        ("business_logo", "", "image_path", "Logotipo", "general", 50),
        (
            "ticket_header",
            "",
            "multiline",
            "Encabezado del ticket",
            "ticket",
            10,
        ),
        (
            "ticket_footer",
            "",
            "multiline",
            "Pie del ticket",
            "ticket",
            20,
        ),
        (
            "printer_enabled",
            "false",
            "boolean",
            "Impresora habilitada",
            "printer",
            10,
        ),
        (
            "printer_auto_print_sale",
            "false",
            "boolean",
            "Auto imprimir venta",
            "printer",
            20,
        ),
        (
            "printer_transport",
            "usb",
            "string",
            "Transporte de impresora",
            "printer",
            30,
        ),
        (
            "printer_display_name",
            "",
            "string",
            "Nombre de la impresora",
            "printer",
            40,
        ),
        (
            "printer_usb_vendor_id",
            "",
            "string",
            "Vendor ID USB",
            "printer",
            50,
        ),
        (
            "printer_usb_product_id",
            "",
            "string",
            "Product ID USB",
            "printer",
            60,
        ),
        (
            "printer_port_hint",
            "",
            "string",
            "Puerto sugerido",
            "printer",
            70,
        ),
        (
            "printer_paper_size",
            "58mm",
            "string",
            "Tamano de papel",
            "printer",
            80,
        ),
        (
            "printer_dpi",
            "203",
            "number",
            "DPI de impresora",
            "printer",
            90,
        ),
        (
            "printer_cut_type",
            "partial",
            "string",
            "Tipo de corte",
            "printer",
            100,
        ),
        (
            "printer_encoding",
            "UTF-8",
            "string",
            "Encoding",
            "printer",
            110,
        ),
    ];

    for (key, value, value_type, label, group_name, sort_order) in defaults {
        conn.execute(
            "INSERT OR IGNORE INTO settings (key, value, value_type, label, group_name, sort_order) VALUES (?1, ?2, ?3, ?4, ?5, ?6)",
            rusqlite::params![key, value, value_type, label, group_name, sort_order],
        )
        .map_err(|e| e.to_string())?;
    }

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
