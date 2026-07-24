use crate::printer::adapters::PrinterAdapter;
use crate::printer::models::*;
use crate::printer::utils::{chars_per_line, mm_to_dots, sanitize_text};
use async_trait::async_trait;

pub struct ESCPosAdapter {
    config: PrinterConfig,
}

impl ESCPosAdapter {
    pub fn new(config: PrinterConfig) -> Self {
        Self { config }
    }

    fn encode_text(&self, text: &str) -> Vec<u8> {
        sanitize_text(text).into_bytes()
    }

    fn line_feed(&self, lines: u8) -> Vec<u8> {
        vec![0x1B, 0x64, lines]
    }

    fn full_cut(&self) -> Vec<u8> {
        vec![0x1D, 0x56, 0x00]
    }

    fn partial_cut(&self) -> Vec<u8> {
        vec![0x1D, 0x56, 0x01]
    }

    fn separator_line(&self) -> Vec<u8> {
        let width = self.get_paper_width_dots(&self.config.paper_size, self.config.dpi);
        self.encode_text(&"-".repeat(chars_per_line(width)))
    }

    fn max_chars(&self) -> usize {
        let width = self.get_paper_width_dots(&self.config.paper_size, self.config.dpi);
        chars_per_line(width)
    }

    fn write_line(&self, commands: &mut Vec<u8>, text: &str) {
        commands.extend(self.encode_text(text));
        commands.push(0x0A);
    }

    fn write_multiline(&self, commands: &mut Vec<u8>, text: &str) {
        for line in text.lines() {
            self.write_line(commands, line);
        }
    }

    fn wrap_text(&self, text: &str, width: usize) -> Vec<String> {
        let sanitized = sanitize_text(text);
        if sanitized.is_empty() {
            return vec![String::new()];
        }

        let mut lines = Vec::new();
        let mut current = String::new();

        for word in sanitized.split_whitespace() {
            let candidate_len = if current.is_empty() {
                word.len()
            } else {
                current.len() + 1 + word.len()
            };

            if candidate_len <= width {
                if !current.is_empty() {
                    current.push(' ');
                }
                current.push_str(word);
            } else {
                if !current.is_empty() {
                    lines.push(current);
                    current = String::new();
                }

                if word.len() <= width {
                    current.push_str(word);
                } else {
                    let chars: Vec<char> = word.chars().collect();
                    for chunk in chars.chunks(width) {
                        lines.push(chunk.iter().collect());
                    }
                }
            }
        }

        if !current.is_empty() {
            lines.push(current);
        }

        if lines.is_empty() {
            lines.push(String::new());
        }

        lines
    }

    fn format_money(amount: f64) -> String {
        format!("${:.2}", amount)
    }

    fn quantity_label(quantity: f64) -> String {
        if (quantity.fract()).abs() < f64::EPSILON {
            format!("{}", quantity as i64)
        } else {
            format!("{:.3}", quantity)
        }
    }
}

#[async_trait]
impl PrinterAdapter for ESCPosAdapter {
    async fn generate_commands(&self, data: &TicketData) -> Result<Vec<u8>, String> {
        let mut commands = vec![];
        let width = self.max_chars();

        commands.extend(self.initialize().await?);

        if let Some(header) = &data.header {
            self.write_multiline(&mut commands, header);
            commands.push(0x0A);
        }

        for item in &data.items {
            let description_lines = self.wrap_text(&item.description, width);
            for line in description_lines {
                self.write_line(&mut commands, &line);
            }

            self.write_line(
                &mut commands,
                &format!("PRECIO: {}", Self::format_money(item.unit_price)),
            );
            self.write_line(
                &mut commands,
                &format!("CANTIDAD: {}", Self::quantity_label(item.quantity)),
            );
            self.write_line(
                &mut commands,
                &format!("IMPORTE: {}", Self::format_money(item.total)),
            );
            commands.push(0x0A);
        }

        commands.extend(self.separator_line());
        commands.push(0x0A);
        self.write_line(
            &mut commands,
            &format!("SUBTOTAL: {}", Self::format_money(data.subtotal)),
        );
        self.write_line(
            &mut commands,
            &format!("IMPUESTO: {}", Self::format_money(data.tax)),
        );
        commands.extend(self.separator_line());
        commands.push(0x0A);
        self.write_line(
            &mut commands,
            &format!("TOTAL: {}", Self::format_money(data.total)),
        );

        if let Some(footer) = &data.footer {
            commands.push(0x0A);
            self.write_multiline(&mut commands, footer);
        }

        commands.extend(self.line_feed(2));
        commands.extend(self.finalize(self.config.cut_type.clone()).await?);

        Ok(commands)
    }

    async fn initialize(&self) -> Result<Vec<u8>, String> {
        Ok(Vec::new())
    }

    async fn finalize(&self, cut_type: CutType) -> Result<Vec<u8>, String> {
        match cut_type {
            CutType::Full => Ok(self.full_cut()),
            CutType::Partial => Ok(self.partial_cut()),
            CutType::None => Ok(vec![]),
        }
    }

    async fn test_connection(&self) -> Result<(), String> {
        Ok(())
    }

    fn get_paper_width_dots(&self, size: &PaperSize, dpi: u16) -> u32 {
        match size {
            PaperSize::Small58mm => mm_to_dots(58.0, dpi),
            PaperSize::Medium80mm => mm_to_dots(80.0, dpi),
            PaperSize::Large100mm => mm_to_dots(100.0, dpi),
            PaperSize::Custom(dots) => *dots,
        }
    }
}

#[cfg(test)]
mod tests {
    use super::ESCPosAdapter;
    use crate::printer::adapters::PrinterAdapter;
    use crate::printer::models::{
        ConnectionType, CutType, PaperSize, PrinterConfig, PrinterStandard, TicketData, TicketItem,
    };

    fn build_adapter(cut_type: CutType) -> ESCPosAdapter {
        ESCPosAdapter::new(PrinterConfig {
            id: "printer".to_string(),
            name: "Test".to_string(),
            standard: PrinterStandard::ESCPos,
            paper_size: PaperSize::Small58mm,
            connection: ConnectionType::USB {
                vendor_id: "04B8".to_string(),
                product_id: "0202".to_string(),
                port_name: Some("COM3".to_string()),
            },
            is_default: true,
            dpi: 203,
            cut_type,
            encoding: "UTF-8".to_string(),
        })
    }

    fn sample_ticket() -> TicketData {
        TicketData {
            items: vec![TicketItem {
                description: "Café molido muy rico".to_string(),
                quantity: 1.0,
                unit_price: 20.0,
                total: 20.0,
            }],
            total: 20.0,
            subtotal: 20.0,
            tax: 0.0,
            barcode: None,
            qr_code: None,
            footer: Some("Gracias".to_string()),
            header: Some("Abarrotes Almanza".to_string()),
        }
    }

    #[test]
    fn initialize_is_empty_for_ultra_safe_text_mode() {
        let adapter = build_adapter(CutType::Partial);
        let init = tokio::runtime::Builder::new_current_thread()
            .enable_all()
            .build()
            .expect("runtime should build")
            .block_on(adapter.initialize())
            .expect("init should succeed");
        assert!(init.is_empty());
    }

    #[test]
    fn generate_commands_contains_cut_instruction() {
        let adapter = build_adapter(CutType::Full);
        let commands = tokio::runtime::Builder::new_current_thread()
            .enable_all()
            .build()
            .expect("runtime should build")
            .block_on(adapter.generate_commands(&sample_ticket()))
            .expect("ticket should render");

        assert!(commands
            .windows(3)
            .any(|window| window == [0x1D, 0x56, 0x00]));
    }

    #[test]
    fn generate_commands_does_not_emit_barcode() {
        let adapter = build_adapter(CutType::None);
        let commands = tokio::runtime::Builder::new_current_thread()
            .enable_all()
            .build()
            .expect("runtime should build")
            .block_on(adapter.generate_commands(&sample_ticket()))
            .expect("ticket should render");

        assert!(!commands
            .windows(3)
            .any(|window| window == [0x1D, 0x6B, 0x49]));
    }

    #[test]
    fn generate_commands_uses_safe_labels_and_ascii_text() {
        let adapter = build_adapter(CutType::None);
        let commands = tokio::runtime::Builder::new_current_thread()
            .enable_all()
            .build()
            .expect("runtime should build")
            .block_on(adapter.generate_commands(&sample_ticket()))
            .expect("ticket should render");
        let rendered = String::from_utf8_lossy(&commands);

        assert!(rendered.contains("Cafe molido muy rico"));
        assert!(rendered.contains("PRECIO: $20.00"));
        assert!(rendered.contains("CANTIDAD: 1"));
        assert!(rendered.contains("IMPORTE: $20.00"));
        assert!(rendered.contains("TOTAL: $20.00"));
    }
}
