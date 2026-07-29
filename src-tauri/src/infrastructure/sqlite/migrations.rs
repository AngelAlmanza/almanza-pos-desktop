use super::Database;
use rusqlite::{Connection, OptionalExtension};

struct Migration {
    version: i64,
    sql: &'static str,
}

const MIGRATIONS: &[Migration] = &[
    Migration {
        version: 1,
        sql: include_str!("migrations/0001_initial.sql"),
    },
    Migration {
        version: 2,
        sql: include_str!("migrations/0002_sale_payment_breakdown.sql"),
    },
    Migration {
        version: 3,
        sql: include_str!("migrations/0003_sale_item_input_metadata.sql"),
    },
    Migration {
        version: 4,
        sql: include_str!("migrations/0004_customers_and_credit.sql"),
    },
    Migration {
        version: 5,
        sql: include_str!("migrations/0005_products_is_bulk.sql"),
    },
    Migration {
        version: 6,
        sql: include_str!("migrations/0006_customer_movement_session_required.sql"),
    },
];

pub fn initialize(db: &Database) -> Result<(), String> {
    let conn = db.conn.lock().map_err(|error| error.to_string())?;
    apply(&conn)?;
    seed_default_user(&conn)?;
    seed_default_settings(&conn)?;
    Ok(())
}

fn apply(conn: &Connection) -> Result<(), String> {
    conn.execute_batch(
        "CREATE TABLE IF NOT EXISTS schema_migrations (
            version INTEGER PRIMARY KEY,
            checksum TEXT NOT NULL,
            applied_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
        );",
    )
    .map_err(|error| format!("No se pudo crear el historial de migraciones: {error}"))?;

    if migration_count(conn)? == 0 {
        let legacy_version = detect_legacy_version(conn)?;
        if legacy_version > 0 {
            register_legacy_baseline(conn, legacy_version)?;
        }
    }

    for migration in MIGRATIONS {
        let checksum = checksum(migration.sql);
        let applied_checksum: Option<String> = conn
            .query_row(
                "SELECT checksum FROM schema_migrations WHERE version = ?1",
                [migration.version],
                |row| row.get(0),
            )
            .optional()
            .map_err(|error| {
                format!("No se pudo consultar el historial de migraciones: {error}")
            })?;

        match applied_checksum {
            Some(applied_checksum) if applied_checksum == checksum => continue,
            Some(_) => {
                return Err(format!(
                    "El checksum de la migración {:04} no coincide con el historial aplicado",
                    migration.version
                ));
            }
            None => apply_migration(conn, migration, &checksum)?,
        }
    }

    Ok(())
}

fn apply_migration(conn: &Connection, migration: &Migration, checksum: &str) -> Result<(), String> {
    conn.execute_batch("BEGIN IMMEDIATE").map_err(|error| {
        format!(
            "No se pudo iniciar la migración {:04}: {error}",
            migration.version
        )
    })?;

    let result = (|| {
        conn.execute_batch(migration.sql).map_err(|error| {
            format!(
                "Falló la migración {:04}; no se registrará como aplicada: {error}",
                migration.version
            )
        })?;
        conn.execute(
            "INSERT INTO schema_migrations (version, checksum) VALUES (?1, ?2)",
            (migration.version, checksum),
        )
        .map_err(|error| {
            format!(
                "No se pudo registrar la migración {:04}: {error}",
                migration.version
            )
        })?;
        Ok(())
    })();

    match result {
        Ok(()) => conn.execute_batch("COMMIT").map_err(|error| {
            format!(
                "No se pudo confirmar la migración {:04}: {error}",
                migration.version
            )
        }),
        Err(error) => {
            let _ = conn.execute_batch("ROLLBACK");
            Err(error)
        }
    }
}

fn register_legacy_baseline(conn: &Connection, version: i64) -> Result<(), String> {
    conn.execute_batch("BEGIN IMMEDIATE")
        .map_err(|error| format!("No se pudo iniciar el registro de la base existente: {error}"))?;

    let result = (|| {
        for migration in MIGRATIONS
            .iter()
            .filter(|migration| migration.version <= version)
        {
            conn.execute(
                "INSERT INTO schema_migrations (version, checksum) VALUES (?1, ?2)",
                (migration.version, checksum(migration.sql)),
            )
            .map_err(|error| {
                format!(
                    "No se pudo registrar la versión heredada {:04}: {error}",
                    migration.version
                )
            })?;
        }
        Ok(())
    })();

    match result {
        Ok(()) => conn
            .execute_batch("COMMIT")
            .map_err(|error| format!("No se pudo confirmar el historial heredado: {error}")),
        Err(error) => {
            let _ = conn.execute_batch("ROLLBACK");
            Err(error)
        }
    }
}

fn detect_legacy_version(conn: &Connection) -> Result<i64, String> {
    if !table_exists(conn, "users")? {
        return Ok(0);
    }

    for table in [
        "categories",
        "products",
        "cash_register_sessions",
        "sales",
        "sale_items",
        "inventory_adjustments",
        "settings",
    ] {
        if !table_exists(conn, table)? {
            return Err(format!(
                "La base existente tiene el esquema base incompleto: falta la tabla {table}"
            ));
        }
    }

    let payment_breakdown = has_columns(
        conn,
        "sales",
        [
            "payment_cash_mxn",
            "payment_cash_usd",
            "payment_transfer",
            "exchange_rate",
        ],
    )? && has_columns(
        conn,
        "cash_register_sessions",
        ["closing_cash_mxn", "closing_cash_usd"],
    )?;
    if !payment_breakdown {
        return Ok(1);
    }

    if !has_columns(
        conn,
        "sale_items",
        ["base_unit", "input_mode", "input_value", "input_unit"],
    )? {
        return Ok(2);
    }

    let customers_and_credit = table_exists(conn, "customers")?
        && table_exists(conn, "customer_account_movements")?
        && has_columns(conn, "sales", ["customer_id", "credit_amount"])?;
    if !customers_and_credit {
        return Ok(3);
    }

    if !has_columns(conn, "products", ["is_bulk"])? {
        return Ok(4);
    }

    if !column_is_not_null(
        conn,
        "customer_account_movements",
        "cash_register_session_id",
    )? {
        return Ok(5);
    }

    Ok(6)
}

fn migration_count(conn: &Connection) -> Result<i64, String> {
    conn.query_row("SELECT COUNT(*) FROM schema_migrations", [], |row| {
        row.get(0)
    })
    .map_err(|error| format!("No se pudo contar el historial de migraciones: {error}"))
}

fn table_exists(conn: &Connection, table: &str) -> Result<bool, String> {
    conn.query_row(
        "SELECT EXISTS(SELECT 1 FROM sqlite_master WHERE type = 'table' AND name = ?1)",
        [table],
        |row| row.get(0),
    )
    .map_err(|error| format!("No se pudo inspeccionar la tabla {table}: {error}"))
}

fn has_columns<const N: usize>(
    conn: &Connection,
    table: &str,
    columns: [&str; N],
) -> Result<bool, String> {
    for column in columns {
        if !column_exists(conn, table, column)? {
            return Ok(false);
        }
    }
    Ok(true)
}

fn column_exists(conn: &Connection, table: &str, column: &str) -> Result<bool, String> {
    let mut statement = conn
        .prepare(&format!(
            "SELECT COUNT(*) FROM pragma_table_info('{table}') WHERE name = ?1"
        ))
        .map_err(|error| format!("No se pudo inspeccionar la tabla {table}: {error}"))?;
    statement
        .query_row([column], |row| row.get::<_, i64>(0))
        .map(|count| count == 1)
        .map_err(|error| format!("No se pudo inspeccionar la columna {table}.{column}: {error}"))
}

fn column_is_not_null(conn: &Connection, table: &str, column: &str) -> Result<bool, String> {
    let mut statement = conn
        .prepare(&format!(
            "SELECT \"notnull\" FROM pragma_table_info('{table}') WHERE name = ?1"
        ))
        .map_err(|error| format!("No se pudo inspeccionar la tabla {table}: {error}"))?;
    statement
        .query_row([column], |row| row.get::<_, i64>(0))
        .optional()
        .map(|value| value == Some(1))
        .map_err(|error| format!("No se pudo inspeccionar la columna {table}.{column}: {error}"))
}

fn checksum(sql: &str) -> String {
    let mut hash = 0xcbf29ce484222325_u64;
    for byte in sql.as_bytes() {
        hash ^= u64::from(*byte);
        hash = hash.wrapping_mul(0x100000001b3);
    }
    format!("fnv1a64:{hash:016x}")
}

fn seed_default_user(conn: &Connection) -> Result<(), String> {
    let count: i64 = conn
        .query_row("SELECT COUNT(*) FROM users", [], |row| row.get(0))
        .map_err(|error| error.to_string())?;
    if count == 0 {
        let password_hash =
            bcrypt::hash("root", bcrypt::DEFAULT_COST).map_err(|error| error.to_string())?;
        conn.execute(
            "INSERT INTO users (username, password_hash, full_name, role) VALUES (?1, ?2, ?3, ?4)",
            rusqlite::params!["root", password_hash, "Administrador", "admin"],
        )
        .map_err(|error| error.to_string())?;
    }
    Ok(())
}

fn seed_default_settings(conn: &Connection) -> Result<(), String> {
    const DEFAULTS: &[(&str, &str, &str, &str, &str, i64)] = &[
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
        (
            "default_customer_credit_limit",
            "0",
            "number",
            "Límite de crédito predeterminado",
            "fiados",
            10,
        ),
    ];

    for (key, value, value_type, label, group_name, sort_order) in DEFAULTS {
        conn.execute(
            "INSERT OR IGNORE INTO settings (key, value, value_type, label, group_name, sort_order) VALUES (?1, ?2, ?3, ?4, ?5, ?6)",
            rusqlite::params![key, value, value_type, label, group_name, sort_order],
        )
        .map_err(|error| error.to_string())?;
    }
    Ok(())
}

#[cfg(test)]
mod tests {
    use super::{apply, apply_migration, checksum, Migration, MIGRATIONS};
    use rusqlite::Connection;

    #[test]
    fn applies_all_migrations_to_a_new_database_and_is_idempotent() {
        let conn = Connection::open_in_memory().unwrap();
        apply(&conn).unwrap();
        apply(&conn).unwrap();

        let count: i64 = conn
            .query_row("SELECT COUNT(*) FROM schema_migrations", [], |row| {
                row.get(0)
            })
            .unwrap();
        assert_eq!(count, MIGRATIONS.len() as i64);

        let required: i64 = conn
            .query_row(
                "SELECT \"notnull\" FROM pragma_table_info('customer_account_movements') WHERE name = 'cash_register_session_id'",
                [],
                |row| row.get(0),
            )
            .unwrap();
        assert_eq!(required, 1);
    }

    #[test]
    fn registers_an_existing_current_database_without_replaying_its_history() {
        let conn = Connection::open_in_memory().unwrap();
        apply(&conn).unwrap();
        conn.execute_batch("DROP TABLE schema_migrations").unwrap();

        apply(&conn).unwrap();

        let count: i64 = conn
            .query_row("SELECT COUNT(*) FROM schema_migrations", [], |row| {
                row.get(0)
            })
            .unwrap();
        assert_eq!(count, MIGRATIONS.len() as i64);
    }

    #[test]
    fn rejects_a_modified_applied_migration() {
        let conn = Connection::open_in_memory().unwrap();
        apply(&conn).unwrap();
        conn.execute(
            "UPDATE schema_migrations SET checksum = ?1 WHERE version = 1",
            ["modified"],
        )
        .unwrap();

        let error = apply(&conn).unwrap_err();
        assert!(error.contains("checksum"));
        assert_ne!(checksum(MIGRATIONS[0].sql), "modified");
    }

    #[test]
    fn does_not_register_a_failed_migration() {
        let conn = Connection::open_in_memory().unwrap();
        apply(&conn).unwrap();
        let failed = Migration {
            version: 99,
            sql: "CREATE TABLE incomplete (",
        };

        assert!(apply_migration(&conn, &failed, &checksum(failed.sql)).is_err());

        let count: i64 = conn
            .query_row(
                "SELECT COUNT(*) FROM schema_migrations WHERE version = 99",
                [],
                |row| row.get(0),
            )
            .unwrap();
        assert_eq!(count, 0);
    }
}
