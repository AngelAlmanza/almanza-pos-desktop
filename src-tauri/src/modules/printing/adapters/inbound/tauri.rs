use crate::infrastructure::sqlite::Database;
use crate::modules::printing::adapters::outbound::{
    escpos::EscposPrinterPort, sqlite::SqlitePrintingSettingsRepository,
};
use crate::modules::printing::application;
use crate::modules::sales::adapters::outbound::sqlite::SqliteSalesRepository;
use crate::printer::models::{PrinterInfo, PrinterSettings};
use crate::shared::error::AppResult;
use tauri::State;

#[tauri::command]
pub fn get_printer_config(db: State<Database>) -> AppResult<PrinterSettings> {
    application::get_printer_config(&SqlitePrintingSettingsRepository::new(&db))
}

#[tauri::command]
pub fn save_printer_config(db: State<Database>, config: PrinterSettings) -> AppResult<()> {
    application::save_printer_config(&SqlitePrintingSettingsRepository::new(&db), config)
}

#[tauri::command]
pub async fn detect_usb_printers() -> AppResult<Vec<PrinterInfo>> {
    application::detect_usb_printers(&EscposPrinterPort).await
}

#[tauri::command]
pub async fn test_printer(db: State<'_, Database>) -> AppResult<()> {
    application::test_printer(
        &SqlitePrintingSettingsRepository::new(&db),
        &EscposPrinterPort,
    )
    .await
}

#[tauri::command]
pub async fn print_sale_ticket(db: State<'_, Database>, sale_id: i64) -> AppResult<()> {
    application::print_sale_ticket(
        &SqlitePrintingSettingsRepository::new(&db),
        &SqliteSalesRepository::new(&db),
        &EscposPrinterPort,
        sale_id,
    )
    .await
}
