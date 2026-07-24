use crate::db::repository::{sale_repo, setting_repo};
use crate::db::Database;
use crate::error::{AppError, AppResult};
use crate::printer::config::{runtime_config_from_settings, settings_from_map};
use crate::printer::hardware::PrinterHardware;
use crate::printer::manager::PrinterManager;
use crate::printer::models::{PrinterInfo, PrinterSettings};
use crate::printer::ticket_builder::build_sale_ticket;
use tauri::State;

const PRINTER_SETTING_KEYS: &[&str] = &[
    "printer_enabled",
    "printer_auto_print_sale",
    "printer_transport",
    "printer_display_name",
    "printer_usb_vendor_id",
    "printer_usb_product_id",
    "printer_port_hint",
    "printer_paper_size",
    "printer_dpi",
    "printer_cut_type",
    "printer_encoding",
];

const TICKET_SETTING_KEYS: &[&str] = &[
    "business_name",
    "business_rfc",
    "ticket_header",
    "ticket_footer",
];

#[tauri::command]
pub fn get_printer_config(db: State<Database>) -> AppResult<PrinterSettings> {
    let values = setting_repo::find_values_by_keys(&db, PRINTER_SETTING_KEYS)?;
    settings_from_map(&values)
}

#[tauri::command]
pub fn save_printer_config(db: State<Database>, config: PrinterSettings) -> AppResult<()> {
    persist_printer_settings(&db, &config)
}

#[tauri::command]
pub async fn detect_usb_printers() -> AppResult<Vec<PrinterInfo>> {
    let printers = PrinterHardware::detect_available_printers()
        .await
        .map_err(AppError::Database)?;

    Ok(printers
        .into_iter()
        .map(|(name, vendor_id, product_id, port_name, transport)| PrinterInfo {
            id: if transport == "windows" {
                format!("windows:{}", name)
            } else {
                format!("usb:{}:{}", vendor_id, product_id)
            },
            name,
            vendor_id,
            product_id,
            port_name,
            transport,
        })
        .collect())
}

#[tauri::command]
pub async fn test_printer(db: State<'_, Database>) -> AppResult<()> {
    let settings = load_printer_settings(&db)?;
    let config = runtime_config_from_settings(&settings, false)?
        .ok_or_else(|| AppError::Validation("No hay configuracion de impresora disponible".to_string()))?;

    let manager = PrinterManager::new(config)
        .await
        .map_err(AppError::Database)?;
    manager.test_print().await.map_err(AppError::Database)
}

#[tauri::command]
pub async fn print_sale_ticket(db: State<'_, Database>, sale_id: i64) -> AppResult<()> {
    let settings = load_printer_settings(&db)?;
    let config = runtime_config_from_settings(&settings, true)?
        .ok_or_else(|| AppError::Conflict("La impresora esta deshabilitada".to_string()))?;

    let sale = sale_repo::find_by_id(&db, sale_id)?
        .ok_or_else(|| AppError::NotFound("Venta no encontrada".to_string()))?;
    let ticket_settings = setting_repo::find_values_by_keys(&db, TICKET_SETTING_KEYS)?;
    let ticket = build_sale_ticket(
        &sale,
        ticket_settings.get("business_name").and_then(|value| value.as_deref()),
        ticket_settings.get("business_rfc").and_then(|value| value.as_deref()),
        ticket_settings.get("ticket_header").and_then(|value| value.as_deref()),
        ticket_settings.get("ticket_footer").and_then(|value| value.as_deref()),
    );

    let manager = PrinterManager::new(config)
        .await
        .map_err(AppError::Database)?;
    manager
        .print_ticket(ticket)
        .await
        .map_err(AppError::Database)
}

fn load_printer_settings(db: &Database) -> AppResult<PrinterSettings> {
    let values = setting_repo::find_values_by_keys(db, PRINTER_SETTING_KEYS)?;
    settings_from_map(&values)
}

fn persist_printer_settings(db: &Database, config: &PrinterSettings) -> AppResult<()> {
    let enabled = bool_to_string(config.enabled);
    let auto_print_sale = bool_to_string(config.auto_print_sale);
    let dpi = config.dpi.to_string();

    setting_repo::upsert_value(db, "printer_enabled", Some(enabled.as_str()))?;
    setting_repo::upsert_value(db, "printer_auto_print_sale", Some(auto_print_sale.as_str()))?;
    setting_repo::upsert_value(db, "printer_transport", Some(config.transport.as_str()))?;
    setting_repo::upsert_value(db, "printer_display_name", string_option(&config.display_name))?;
    setting_repo::upsert_value(db, "printer_usb_vendor_id", config.usb_vendor_id.as_deref())?;
    setting_repo::upsert_value(db, "printer_usb_product_id", config.usb_product_id.as_deref())?;
    setting_repo::upsert_value(db, "printer_port_hint", config.port_hint.as_deref())?;
    setting_repo::upsert_value(
        db,
        "printer_paper_size",
        Some(match config.paper_size {
            crate::printer::models::PaperSize::Small58mm => "58mm",
            crate::printer::models::PaperSize::Medium80mm => "80mm",
            crate::printer::models::PaperSize::Large100mm => "100mm",
            crate::printer::models::PaperSize::Custom(_) => "58mm",
        }),
    )?;
    setting_repo::upsert_value(db, "printer_dpi", Some(dpi.as_str()))?;
    setting_repo::upsert_value(
        db,
        "printer_cut_type",
        Some(match config.cut_type {
            crate::printer::models::CutType::Full => "full",
            crate::printer::models::CutType::Partial => "partial",
            crate::printer::models::CutType::None => "none",
        }),
    )?;
    setting_repo::upsert_value(db, "printer_encoding", Some(config.encoding.as_str()))?;
    Ok(())
}

fn bool_to_string(value: bool) -> String {
    if value {
        "true".to_string()
    } else {
        "false".to_string()
    }
}

fn string_option(value: &str) -> Option<&str> {
    let trimmed = value.trim();
    if trimmed.is_empty() {
        None
    } else {
        Some(trimmed)
    }
}
