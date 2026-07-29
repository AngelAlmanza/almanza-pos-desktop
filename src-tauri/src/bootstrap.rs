use crate::infrastructure::sqlite::Database;
use crate::modules::accounts_receivable::adapters::inbound::tauri::*;
use crate::modules::cash_register::adapters::inbound::tauri::*;
use crate::modules::catalog::categories::adapters::inbound::tauri::*;
use crate::modules::catalog::products::adapters::inbound::tauri::*;
use crate::modules::identity::adapters::inbound::auth_tauri::*;
use crate::modules::identity::adapters::inbound::users_tauri::*;
use crate::modules::inventory::adapters::inbound::tauri::*;
use crate::modules::printing::adapters::inbound::tauri::*;
use crate::modules::sales::adapters::inbound::tauri::*;
use crate::modules::settings::adapters::inbound::tauri::*;
use tauri::Manager;

pub fn run() {
    tauri::Builder::default()
        .plugin(tauri_plugin_fs::init())
        .plugin(tauri_plugin_dialog::init())
        .plugin(tauri_plugin_opener::init())
        .setup(|app| {
            let db = Database::new(&app.handle())
                .map_err(|error| {
                    eprintln!("Failed to initialize database: {error}");
                    error
                })
                .expect("Failed to initialize database");
            app.manage(db);
            Ok(())
        })
        .invoke_handler(tauri::generate_handler![
            login,
            get_current_user,
            get_users,
            get_user,
            create_user,
            update_user,
            delete_user,
            get_categories,
            get_category,
            create_category,
            update_category,
            delete_category,
            get_products,
            get_active_products,
            get_product,
            find_product_by_barcode,
            search_products,
            create_product,
            update_product,
            delete_product,
            get_printer_config,
            save_printer_config,
            detect_usb_printers,
            test_printer,
            print_sale_ticket,
            get_cash_register_sessions,
            get_cash_register_sessions_by_date_range,
            get_cash_register_session,
            get_open_cash_register,
            get_open_cash_register_by_user,
            open_cash_register,
            close_cash_register,
            get_cash_register_summary,
            get_customers,
            get_active_customers,
            get_customer,
            create_customer,
            update_customer,
            get_customer_movements,
            register_customer_payment,
            create_sale,
            get_sale,
            get_sales,
            get_sales_by_session,
            get_sales_by_date_range,
            get_sales_report,
            get_top_products,
            cancel_sale,
            get_inventory_adjustments,
            get_inventory_adjustments_by_date_range,
            get_inventory_adjustments_by_product,
            create_inventory_adjustment,
            get_settings,
            update_setting,
            create_setting,
            delete_setting,
            save_setting_image,
            get_setting_image,
        ])
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}
