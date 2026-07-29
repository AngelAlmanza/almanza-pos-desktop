use crate::models::sale::Sale;
use crate::printer::config::{runtime_config_from_settings, settings_from_map};
use crate::printer::models::{PrinterConfig, PrinterInfo, PrinterSettings, TicketData};
use crate::printer::ticket_builder::build_sale_ticket;
use crate::shared::error::{AppError, AppResult};
use async_trait::async_trait;
use std::collections::HashMap;

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

pub trait PrintingSettingsRepository {
    fn find_values(&self, keys: &[&str]) -> AppResult<HashMap<String, Option<String>>>;
    fn upsert_value(&self, key: &str, value: Option<&str>) -> AppResult<()>;
}

pub trait SaleReader {
    fn find_sale(&self, id: i64) -> AppResult<Option<Sale>>;
}

#[async_trait]
pub trait PrinterPort {
    async fn detect_printers(&self) -> AppResult<Vec<PrinterInfo>>;
    async fn test_print(&self, config: PrinterConfig) -> AppResult<()>;
    async fn print_ticket(&self, config: PrinterConfig, ticket: TicketData) -> AppResult<()>;
}

pub fn get_printer_config(
    repository: &impl PrintingSettingsRepository,
) -> AppResult<PrinterSettings> {
    settings_from_map(&repository.find_values(PRINTER_SETTING_KEYS)?)
}

pub fn save_printer_config(
    repository: &impl PrintingSettingsRepository,
    config: PrinterSettings,
) -> AppResult<()> {
    persist_printer_settings(repository, &config)
}

pub async fn detect_usb_printers(port: &impl PrinterPort) -> AppResult<Vec<PrinterInfo>> {
    port.detect_printers().await
}

pub async fn test_printer(
    repository: &impl PrintingSettingsRepository,
    port: &impl PrinterPort,
) -> AppResult<()> {
    let config = runtime_config_from_settings(&get_printer_config(repository)?, false)?
        .ok_or_else(|| {
            AppError::Validation("No hay configuracion de impresora disponible".to_string())
        })?;
    port.test_print(config).await
}

pub async fn print_sale_ticket(
    repository: &impl PrintingSettingsRepository,
    sales: &impl SaleReader,
    port: &impl PrinterPort,
    sale_id: i64,
) -> AppResult<()> {
    let config = runtime_config_from_settings(&get_printer_config(repository)?, true)?
        .ok_or_else(|| AppError::Conflict("La impresora esta deshabilitada".to_string()))?;
    let sale = sales
        .find_sale(sale_id)?
        .ok_or_else(|| AppError::NotFound("Venta no encontrada".to_string()))?;
    let settings = repository.find_values(TICKET_SETTING_KEYS)?;
    let ticket = build_sale_ticket(
        &sale,
        setting_value(&settings, "business_name"),
        setting_value(&settings, "business_rfc"),
        setting_value(&settings, "ticket_header"),
        setting_value(&settings, "ticket_footer"),
    );
    port.print_ticket(config, ticket).await
}

fn persist_printer_settings(
    repository: &impl PrintingSettingsRepository,
    config: &PrinterSettings,
) -> AppResult<()> {
    let enabled = config.enabled.to_string();
    let auto_print_sale = config.auto_print_sale.to_string();
    let dpi = config.dpi.to_string();
    repository.upsert_value("printer_enabled", Some(&enabled))?;
    repository.upsert_value("printer_auto_print_sale", Some(&auto_print_sale))?;
    repository.upsert_value("printer_transport", Some(config.transport.as_str()))?;
    repository.upsert_value("printer_display_name", string_option(&config.display_name))?;
    repository.upsert_value("printer_usb_vendor_id", config.usb_vendor_id.as_deref())?;
    repository.upsert_value("printer_usb_product_id", config.usb_product_id.as_deref())?;
    repository.upsert_value("printer_port_hint", config.port_hint.as_deref())?;
    repository.upsert_value(
        "printer_paper_size",
        Some(match config.paper_size {
            crate::printer::models::PaperSize::Small58mm => "58mm",
            crate::printer::models::PaperSize::Medium80mm => "80mm",
            crate::printer::models::PaperSize::Large100mm => "100mm",
            crate::printer::models::PaperSize::Custom(_) => "58mm",
        }),
    )?;
    repository.upsert_value("printer_dpi", Some(&dpi))?;
    repository.upsert_value(
        "printer_cut_type",
        Some(match config.cut_type {
            crate::printer::models::CutType::Full => "full",
            crate::printer::models::CutType::Partial => "partial",
            crate::printer::models::CutType::None => "none",
        }),
    )?;
    repository.upsert_value("printer_encoding", Some(config.encoding.as_str()))
}

fn setting_value<'a>(values: &'a HashMap<String, Option<String>>, key: &str) -> Option<&'a str> {
    values.get(key).and_then(|value| value.as_deref())
}

fn string_option(value: &str) -> Option<&str> {
    let trimmed = value.trim();
    (!trimmed.is_empty()).then_some(trimmed)
}
