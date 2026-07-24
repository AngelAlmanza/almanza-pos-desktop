use crate::printer::models::{CutType, PaperSize, TicketData};
use async_trait::async_trait;

#[async_trait]
pub trait PrinterAdapter: Send + Sync {
    /// Generar comandos de impresión desde datos de ticket
    async fn generate_commands(&self, data: &TicketData) -> Result<Vec<u8>, String>;

    /// Inicializar impresora
    async fn initialize(&self) -> Result<Vec<u8>, String>;

    /// Finalizar (corte, etc)
    async fn finalize(&self, cut_type: CutType) -> Result<Vec<u8>, String>;

    /// Test de conexión
    async fn test_connection(&self) -> Result<(), String>;

    /// Obtener ancho de papel en dots según DPI
    fn get_paper_width_dots(&self, size: &PaperSize, dpi: u16) -> u32;
}

pub mod escpos;
