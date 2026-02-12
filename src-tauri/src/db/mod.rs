pub mod schema;
pub mod repository;

use rusqlite::Connection;
use std::sync::Mutex;
use std::path::PathBuf;

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

        std::fs::create_dir_all(&app_dir).map_err(|e| e.to_string())?;

        let db_path = app_dir.join("pos.db");
        println!("Database path: {:?}", db_path);

        let conn = Connection::open(&db_path).map_err(|e| e.to_string())?;

        // Enable WAL mode for better performance
        conn.execute_batch("PRAGMA journal_mode=WAL;")
            .map_err(|e| e.to_string())?;

        // Enable foreign keys
        conn.execute_batch("PRAGMA foreign_keys=ON;")
            .map_err(|e| e.to_string())?;

        let db = Database {
            conn: Mutex::new(conn),
        };

        // Initialize schema
        schema::initialize(&db)?;

        Ok(db)
    }
}
