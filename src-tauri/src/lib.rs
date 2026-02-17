mod commands;
mod db;
mod models;

use tauri::Manager;
use commands::auth_commands::*;
use commands::cash_register_commands::*;
use commands::category_commands::*;
use commands::inventory_commands::*;
use commands::product_commands::*;
use commands::sale_commands::*;
use commands::user_commands::*;

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    tauri::Builder::default()
        .plugin(tauri_plugin_opener::init())
        .setup(|app| {
            let db = db::Database::new(&app.handle()).map_err(|e| {
                eprintln!("Failed to initialize database: {}", e);
                e
            }).expect("Failed to initialize database");
            app.manage(db);
            Ok(())
        })
        .invoke_handler(tauri::generate_handler![
            // Auth
            login,
            get_current_user,
            // Users
            get_users,
            get_user,
            create_user,
            update_user,
            delete_user,
            // Categories
            get_categories,
            get_category,
            create_category,
            update_category,
            delete_category,
            // Products
            get_products,
            get_active_products,
            get_product,
            find_product_by_barcode,
            search_products,
            create_product,
            update_product,
            update_product_stock,
            delete_product,
            // Cash Register
            get_cash_register_sessions,
            get_cash_register_session,
            get_open_cash_register,
            get_open_cash_register_by_user,
            open_cash_register,
            close_cash_register,
            get_cash_register_summary,
            // Sales
            create_sale,
            get_sale,
            get_sales,
            get_sales_by_session,
            get_sales_by_date_range,
            get_sales_report,
            get_top_products,
            cancel_sale,
            // Inventory
            get_inventory_adjustments,
            get_inventory_adjustments_by_date_range,
            get_inventory_adjustments_by_product,
            create_inventory_adjustment,
        ])
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}
