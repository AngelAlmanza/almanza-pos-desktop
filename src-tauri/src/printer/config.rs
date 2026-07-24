use std::collections::HashMap;

use crate::error::{AppError, AppResult};

use super::models::{
    ConnectionType, CutType, PaperSize, PrinterConfig, PrinterSettings, PrinterStandard,
};

const PRINTER_CONFIG_ID: &str = "default-escpos-printer";

pub fn default_settings() -> PrinterSettings {
    PrinterSettings {
        enabled: false,
        auto_print_sale: false,
        transport: "usb".to_string(),
        display_name: String::new(),
        usb_vendor_id: None,
        usb_product_id: None,
        port_hint: None,
        paper_size: PaperSize::Small58mm,
        dpi: 203,
        cut_type: CutType::Partial,
        encoding: "UTF-8".to_string(),
    }
}

pub fn settings_from_map(values: &HashMap<String, Option<String>>) -> AppResult<PrinterSettings> {
    let mut settings = default_settings();

    settings.enabled = parse_bool(values, "printer_enabled", settings.enabled);
    settings.auto_print_sale =
        parse_bool(values, "printer_auto_print_sale", settings.auto_print_sale);
    settings.transport = get_string(values, "printer_transport")
        .unwrap_or_else(|| settings.transport.clone())
        .to_lowercase();
    settings.display_name =
        get_string(values, "printer_display_name").unwrap_or_else(|| settings.display_name.clone());
    settings.usb_vendor_id = get_string(values, "printer_usb_vendor_id");
    settings.usb_product_id = get_string(values, "printer_usb_product_id");
    settings.port_hint = get_string(values, "printer_port_hint");
    settings.paper_size = parse_paper_size(
        get_string(values, "printer_paper_size").as_deref(),
        settings.paper_size,
    )?;
    settings.dpi = parse_u16(values, "printer_dpi", settings.dpi)?;
    settings.cut_type = parse_cut_type(
        get_string(values, "printer_cut_type").as_deref(),
        settings.cut_type.clone(),
    )?;
    settings.encoding =
        get_string(values, "printer_encoding").unwrap_or_else(|| settings.encoding.clone());

    Ok(settings)
}

pub fn runtime_config_from_settings(
    settings: &PrinterSettings,
    require_enabled: bool,
) -> AppResult<Option<PrinterConfig>> {
    if require_enabled && !settings.enabled {
        return Ok(None);
    }

    let connection = match settings.transport.as_str() {
        "usb" => {
            let vendor_id = required_text(
                settings.usb_vendor_id.as_deref(),
                "Falta configurar el Vendor ID (VID) de la impresora",
            )?;
            let product_id = required_text(
                settings.usb_product_id.as_deref(),
                "Falta configurar el Product ID (PID) de la impresora",
            )?;

            ConnectionType::USB {
                vendor_id,
                product_id,
                port_name: settings.port_hint.clone(),
            }
        }
        "windows" | "spooler" => ConnectionType::WindowsSpooler {
            printer_name: required_display_name(settings.display_name.as_str())?,
        },
        _ => {
            if settings.usb_vendor_id.is_some() && settings.usb_product_id.is_some() {
                ConnectionType::USB {
                    vendor_id: required_text(
                        settings.usb_vendor_id.as_deref(),
                        "Falta configurar el Vendor ID (VID) de la impresora",
                    )?,
                    product_id: required_text(
                        settings.usb_product_id.as_deref(),
                        "Falta configurar el Product ID (PID) de la impresora",
                    )?,
                    port_name: settings.port_hint.clone(),
                }
            } else {
                ConnectionType::WindowsSpooler {
                    printer_name: required_display_name(settings.display_name.as_str())?,
                }
            }
        }
    };

    Ok(Some(PrinterConfig {
        id: PRINTER_CONFIG_ID.to_string(),
        name: if settings.display_name.trim().is_empty() {
            "ESC/POS USB".to_string()
        } else {
            settings.display_name.trim().to_string()
        },
        standard: PrinterStandard::ESCPos,
        paper_size: settings.paper_size.clone(),
        connection,
        is_default: true,
        dpi: settings.dpi,
        cut_type: settings.cut_type.clone(),
        encoding: settings.encoding.trim().to_string(),
    }))
}

fn parse_bool(values: &HashMap<String, Option<String>>, key: &str, default: bool) -> bool {
    values
        .get(key)
        .and_then(|value| value.as_deref())
        .map(|value| {
            matches!(
                value.trim().to_lowercase().as_str(),
                "1" | "true" | "yes" | "on"
            )
        })
        .unwrap_or(default)
}

fn get_string(values: &HashMap<String, Option<String>>, key: &str) -> Option<String> {
    values
        .get(key)
        .and_then(|value| value.clone())
        .map(|value| value.trim().to_string())
        .filter(|value| !value.is_empty())
}

fn parse_u16(values: &HashMap<String, Option<String>>, key: &str, default: u16) -> AppResult<u16> {
    match get_string(values, key) {
        Some(value) => value.parse::<u16>().map_err(|_| {
            AppError::Validation(format!("El valor de '{}' no es un numero valido", key))
        }),
        None => Ok(default),
    }
}

fn parse_paper_size(value: Option<&str>, default: PaperSize) -> AppResult<PaperSize> {
    match value.unwrap_or("") {
        "" => Ok(default),
        "58mm" => Ok(PaperSize::Small58mm),
        "80mm" => Ok(PaperSize::Medium80mm),
        "100mm" => Ok(PaperSize::Large100mm),
        custom => custom.parse::<u32>().map(PaperSize::Custom).map_err(|_| {
            AppError::Validation("Tamano de papel invalido para impresora".to_string())
        }),
    }
}

fn parse_cut_type(value: Option<&str>, default: CutType) -> AppResult<CutType> {
    match value.unwrap_or("") {
        "" => Ok(default),
        "full" => Ok(CutType::Full),
        "partial" => Ok(CutType::Partial),
        "none" => Ok(CutType::None),
        _ => Err(AppError::Validation(
            "Tipo de corte invalido para impresora".to_string(),
        )),
    }
}

fn required_text(value: Option<&str>, message: &str) -> AppResult<String> {
    let value = value.unwrap_or("").trim();
    if value.is_empty() {
        return Err(AppError::Validation(message.to_string()));
    }

    Ok(value.to_uppercase())
}

fn required_display_name(value: &str) -> AppResult<String> {
    let value = value.trim();
    if value.is_empty() {
        return Err(AppError::Validation(
            "Falta configurar el nombre de la impresora de Windows".to_string(),
        ));
    }

    Ok(value.to_string())
}

#[cfg(test)]
mod tests {
    use std::collections::HashMap;

    use crate::printer::models::{ConnectionType, CutType};

    use super::{runtime_config_from_settings, settings_from_map};

    #[test]
    fn parses_defaults_when_settings_are_missing() {
        let map = HashMap::new();
        let config = settings_from_map(&map).expect("settings should parse");

        assert!(!config.enabled);
        assert_eq!(config.transport, "usb");
        assert_eq!(config.dpi, 203);
    }

    #[test]
    fn rejects_invalid_cut_type() {
        let mut map = HashMap::new();
        map.insert("printer_cut_type".to_string(), Some("weird".to_string()));

        let error = settings_from_map(&map).expect_err("cut type should fail");
        assert!(error.to_string().contains("Tipo de corte invalido"));
    }

    #[test]
    fn runtime_config_requires_vid_and_pid() {
        let settings = settings_from_map(&HashMap::new()).expect("settings should parse");
        let error = runtime_config_from_settings(&settings, false)
            .expect_err("runtime config should validate ids");

        assert!(error.to_string().contains("Vendor ID"));
    }

    #[test]
    fn parses_cut_type_from_map() {
        let mut map = HashMap::new();
        map.insert("printer_cut_type".to_string(), Some("full".to_string()));
        map.insert(
            "printer_usb_vendor_id".to_string(),
            Some("04B8".to_string()),
        );
        map.insert(
            "printer_usb_product_id".to_string(),
            Some("0202".to_string()),
        );

        let settings = settings_from_map(&map).expect("settings should parse");
        let runtime = runtime_config_from_settings(&settings, false)
            .expect("runtime should build")
            .expect("runtime should exist");

        assert!(matches!(runtime.cut_type, CutType::Full));
    }

    #[test]
    fn runtime_config_accepts_windows_spooler() {
        let mut map = HashMap::new();
        map.insert("printer_transport".to_string(), Some("windows".to_string()));
        map.insert(
            "printer_display_name".to_string(),
            Some("POS-58".to_string()),
        );

        let settings = settings_from_map(&map).expect("settings should parse");
        let runtime = runtime_config_from_settings(&settings, false)
            .expect("runtime should build")
            .expect("runtime should exist");

        assert!(matches!(
            runtime.connection,
            ConnectionType::WindowsSpooler { .. }
        ));
    }
}
