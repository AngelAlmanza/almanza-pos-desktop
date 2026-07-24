use serde::{Deserialize, Serialize};

#[derive(Debug, Clone, Serialize, Deserialize)]
pub enum PrinterStandard {
    #[serde(rename = "escpos")]
    ESCPos,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub enum PaperSize {
    #[serde(rename = "58mm")]
    Small58mm, // 384 dots @ 203 DPI

    #[serde(rename = "80mm")]
    Medium80mm, // 576 dots @ 203 DPI

    #[serde(rename = "100mm")]
    Large100mm, // 720 dots @ 203 DPI

    #[serde(rename = "custom")]
    Custom(u32), // Ancho en dots
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub enum ConnectionType {
    #[serde(rename = "usb")]
    USB {
        vendor_id: String,
        product_id: String,
        port_name: Option<String>,
    },

    #[serde(rename = "windows")]
    WindowsSpooler { printer_name: String },
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct PrinterConfig {
    pub id: String, // UUID único
    pub name: String,
    pub standard: PrinterStandard,
    pub paper_size: PaperSize,
    pub connection: ConnectionType,
    pub is_default: bool,
    pub dpi: u16,          // 203 ó 406
    pub cut_type: CutType, // Tipo de corte
    pub encoding: String,  // UTF-8, ISO-8859-1, etc.
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct PrinterSettings {
    pub enabled: bool,
    pub auto_print_sale: bool,
    pub transport: String,
    pub display_name: String,
    pub usb_vendor_id: Option<String>,
    pub usb_product_id: Option<String>,
    pub port_hint: Option<String>,
    pub paper_size: PaperSize,
    pub dpi: u16,
    pub cut_type: CutType,
    pub encoding: String,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub enum CutType {
    #[serde(rename = "full")]
    Full,

    #[serde(rename = "partial")]
    Partial,

    #[serde(rename = "none")]
    None,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct TicketData {
    pub items: Vec<TicketItem>,
    pub total: f64,
    pub subtotal: f64,
    pub tax: f64,
    pub barcode: Option<String>,
    pub qr_code: Option<String>,
    pub footer: Option<String>,
    pub header: Option<String>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct TicketItem {
    pub description: String,
    pub quantity: f64,
    pub unit_price: f64,
    pub total: f64,
}

#[derive(Debug, Serialize, Deserialize)]
pub struct PrinterInfo {
    pub id: String,
    pub name: String,
    pub vendor_id: String,
    pub product_id: String,
    pub port_name: Option<String>,
    pub transport: String,
}
