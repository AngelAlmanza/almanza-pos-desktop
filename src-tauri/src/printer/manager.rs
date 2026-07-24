use crate::printer::adapters::{escpos::ESCPosAdapter, PrinterAdapter};
use crate::printer::hardware::PrinterHardware;
use crate::printer::models::*;
use std::sync::Arc;

pub struct PrinterManager {
    adapter: Arc<dyn PrinterAdapter>,
    hardware: Arc<PrinterHardware>,
}

impl PrinterManager {
    pub async fn new(config: PrinterConfig) -> Result<Self, String> {
        let adapter: Arc<dyn PrinterAdapter> = Arc::new(ESCPosAdapter::new(config.clone()));

        let hardware = Arc::new(PrinterHardware::new(config.connection.clone()).await?);

        Ok(Self { adapter, hardware })
    }

    pub async fn print_ticket(&self, data: TicketData) -> Result<(), String> {
        let commands = self.adapter.generate_commands(&data).await?;
        self.hardware.send_commands(&commands).await?;
        Ok(())
    }

    pub async fn test_print(&self) -> Result<(), String> {
        self.adapter.test_connection().await?;

        let test_data = TicketData {
            items: vec![TicketItem {
                description: "TEST ITEM".to_string(),
                quantity: 1.0,
                unit_price: 10.0,
                total: 10.0,
            }],
            total: 10.0,
            subtotal: 10.0,
            tax: 0.0,
            barcode: None,
            qr_code: None,
            footer: Some("TICKET DE PRUEBA".to_string()),
            header: Some("ALMANZA POS".to_string()),
        };

        self.print_ticket(test_data).await
    }
}
