use crate::modules::printing::application::PrinterPort;
use crate::printer::hardware::PrinterHardware;
use crate::printer::manager::PrinterManager;
use crate::printer::models::{PrinterConfig, PrinterInfo, TicketData};
use crate::shared::error::{AppError, AppResult};
use async_trait::async_trait;

pub struct EscposPrinterPort;

#[async_trait]
impl PrinterPort for EscposPrinterPort {
    async fn detect_printers(&self) -> AppResult<Vec<PrinterInfo>> {
        PrinterHardware::detect_available_printers()
            .await
            .map_err(AppError::Database)
            .map(|printers| {
                printers
                    .into_iter()
                    .map(
                        |(name, vendor_id, product_id, port_name, transport)| PrinterInfo {
                            id: if transport == "windows" {
                                format!("windows:{name}")
                            } else {
                                format!("usb:{vendor_id}:{product_id}")
                            },
                            name,
                            vendor_id,
                            product_id,
                            port_name,
                            transport,
                        },
                    )
                    .collect()
            })
    }

    async fn test_print(&self, config: PrinterConfig) -> AppResult<()> {
        PrinterManager::new(config)
            .await
            .map_err(AppError::Database)?
            .test_print()
            .await
            .map_err(AppError::Database)
    }

    async fn print_ticket(&self, config: PrinterConfig, ticket: TicketData) -> AppResult<()> {
        PrinterManager::new(config)
            .await
            .map_err(AppError::Database)?
            .print_ticket(ticket)
            .await
            .map_err(AppError::Database)
    }
}
