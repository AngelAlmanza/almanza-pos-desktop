use crate::infrastructure::sqlite::migrations;
use rusqlite::Connection;
use std::path::PathBuf;
use std::sync::Mutex;

pub struct Database {
    pub conn: Mutex<Connection>,
}

impl Database {
    pub fn new(app_handle: &tauri::AppHandle) -> Result<Self, String> {
        use tauri::Manager;

        let app_dir = app_handle
            .path()
            .app_data_dir()
            .unwrap_or_else(|_| PathBuf::from("."));

        std::fs::create_dir_all(&app_dir).map_err(|error| error.to_string())?;

        let db_path = app_dir.join("pos.db");
        println!("Database path: {db_path:?}");

        let conn = Connection::open(&db_path).map_err(|error| error.to_string())?;
        conn.execute_batch("PRAGMA journal_mode=WAL;")
            .map_err(|error| error.to_string())?;
        conn.execute_batch("PRAGMA foreign_keys=ON;")
            .map_err(|error| error.to_string())?;

        let db = Self {
            conn: Mutex::new(conn),
        };

        migrations::initialize(&db)?;
        Ok(db)
    }
}
