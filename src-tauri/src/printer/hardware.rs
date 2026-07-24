use crate::printer::models::ConnectionType;
use std::io::Write;
use std::process::Command;
use std::sync::Arc;
use tokio::sync::Mutex;

/// Trait para diferentes tipos de conexión
#[async_trait::async_trait]
pub trait PrinterConnection: Send + Sync {
    async fn connect(&mut self) -> Result<(), String>;
    async fn send(&mut self, data: &[u8]) -> Result<(), String>;
    async fn is_connected(&self) -> bool;
}

/// Conexión USB usando serialport
pub struct USBConnection {
    vendor_id: String,
    product_id: String,
    port_name: Option<String>,
    port: Arc<Mutex<Option<Box<dyn serialport::SerialPort>>>>,
    connected: Arc<Mutex<bool>>,
}

impl USBConnection {
    pub fn new(vendor_id: String, product_id: String, port_name: Option<String>) -> Self {
        Self {
            vendor_id,
            product_id,
            port_name,
            port: Arc::new(Mutex::new(None)),
            connected: Arc::new(Mutex::new(false)),
        }
    }

    /// Detectar puerto USB de la impresora
    async fn discover_port(&mut self) -> Result<String, String> {
        // Usar serialport para detectar puertos disponibles
        let ports = serialport::available_ports()
            .map_err(|e| format!("Error enumerando puertos: {}", e))?;

        for port in ports {
            match port.port_type {
                serialport::SerialPortType::UsbPort(info) => {
                    // Comparar VID:PID
                    let vid = format!("{:04X}", info.vid);
                    let pid = format!("{:04X}", info.pid);

                    if vid == self.vendor_id && pid == self.product_id {
                        return Ok(port.port_name);
                    }
                }
                _ => continue,
            }
        }

        Err("Impresora USB no encontrada".to_string())
    }
}

#[async_trait::async_trait]
impl PrinterConnection for USBConnection {
    async fn connect(&mut self) -> Result<(), String> {
        // Detectar puerto si no está especificado
        if self.port_name.is_none() {
            self.port_name = Some(self.discover_port().await?);
        }

        let port_name = self.port_name.as_ref().ok_or("Puerto no especificado")?;

        // Abrir puerto serial
        let serial_port = serialport::new(port_name, 9600)
            .timeout(std::time::Duration::from_secs(5))
            .open()
            .map_err(|e| format!("Error abriendo puerto: {}", e))?;

        let mut port_guard = self.port.lock().await;
        *port_guard = Some(serial_port);
        *self.connected.lock().await = true;

        Ok(())
    }

    async fn send(&mut self, data: &[u8]) -> Result<(), String> {
        let mut port_guard = self.port.lock().await;

        match port_guard.as_mut() {
            Some(port) => {
                port.write_all(data)
                    .map_err(|e| format!("Error escribiendo en puerto: {}", e))?;
                Ok(())
            }
            None => Err("Puerto no conectado".to_string()),
        }
    }

    async fn is_connected(&self) -> bool {
        *self.connected.lock().await
    }
}

/// Conexión a impresora instalada en Windows vía spooler RAW
pub struct WindowsSpoolerConnection {
    printer_name: String,
    connected: Arc<Mutex<bool>>,
}

impl WindowsSpoolerConnection {
    pub fn new(printer_name: String) -> Self {
        Self {
            printer_name,
            connected: Arc::new(Mutex::new(false)),
        }
    }
}

#[async_trait::async_trait]
impl PrinterConnection for WindowsSpoolerConnection {
    async fn connect(&mut self) -> Result<(), String> {
        let printer_name = self.printer_name.clone();
        tokio::task::spawn_blocking(move || validate_windows_printer(&printer_name))
            .await
            .map_err(|e| format!("Error validando impresora de Windows: {}", e))??;
        *self.connected.lock().await = true;
        Ok(())
    }

    async fn send(&mut self, data: &[u8]) -> Result<(), String> {
        let printer_name = self.printer_name.clone();
        let payload = data.to_vec();

        tokio::task::spawn_blocking(move || send_raw_to_windows_printer(&printer_name, &payload))
            .await
            .map_err(|e| format!("Error enviando trabajo al spooler de Windows: {}", e))??;

        Ok(())
    }

    async fn is_connected(&self) -> bool {
        *self.connected.lock().await
    }
}

/// Gestor principal de hardware de impresora
pub struct PrinterHardware {
    connection: Arc<Mutex<Box<dyn PrinterConnection>>>,
}

impl PrinterHardware {
    pub async fn new(conn_type: ConnectionType) -> Result<Self, String> {
        let connection: Box<dyn PrinterConnection> = match conn_type {
            ConnectionType::USB {
                vendor_id,
                product_id,
                port_name,
            } => Box::new(USBConnection::new(vendor_id, product_id, port_name)),
            ConnectionType::WindowsSpooler { printer_name } => {
                Box::new(WindowsSpoolerConnection::new(printer_name))
            }
        };

        Ok(Self {
            connection: Arc::new(Mutex::new(connection)),
        })
    }

    /// Enviar comandos a la impresora
    pub async fn send_commands(&self, data: &[u8]) -> Result<(), String> {
        let mut conn = self.connection.lock().await;

        // Conectar si no está conectado
        if !conn.is_connected().await {
            conn.connect().await?;
        }

        conn.send(data).await
    }

    /// Detectar impresoras disponibles
    pub async fn detect_available_printers(
    ) -> Result<Vec<(String, String, String, Option<String>, String)>, String> {
        let mut printers = Vec::new();

        // Detectar USB
        let ports = serialport::available_ports()
            .map_err(|e| format!("Error detectando puertos: {}", e))?;

        for port in ports {
            match port.port_type {
                serialport::SerialPortType::UsbPort(info) => {
                    let vid = format!("{:04X}", info.vid);
                    let pid = format!("{:04X}", info.pid);
                    let name = info.product.unwrap_or_else(|| "USB Printer".to_string());

                    printers.push((name, vid, pid, Some(port.port_name), "usb".to_string()));
                }
                _ => {}
            }
        }

        for printer in detect_windows_printers()? {
            printers.push((
                printer.name,
                printer.vendor_id,
                printer.product_id,
                printer.port_name,
                "windows".to_string(),
            ));
        }

        Ok(printers)
    }
}

#[derive(serde::Deserialize)]
struct WindowsPrinterInfo {
    #[serde(rename = "Name")]
    name: String,
    #[serde(rename = "DriverName")]
    driver_name: Option<String>,
    #[serde(rename = "PortName")]
    port_name: Option<String>,
}

struct DetectedWindowsPrinter {
    name: String,
    vendor_id: String,
    product_id: String,
    port_name: Option<String>,
}

fn detect_windows_printers() -> Result<Vec<DetectedWindowsPrinter>, String> {
    let script = "Get-Printer | Select-Object Name,DriverName,PortName | ConvertTo-Json -Compress";
    let output = Command::new("powershell")
        .args(["-NoProfile", "-Command", script])
        .output()
        .map_err(|e| format!("No se pudo consultar impresoras de Windows: {}", e))?;

    if !output.status.success() {
        return Err(format!(
            "Get-Printer devolvio error: {}",
            String::from_utf8_lossy(&output.stderr)
        ));
    }

    let stdout = String::from_utf8_lossy(&output.stdout).trim().to_string();
    if stdout.is_empty() {
        return Ok(Vec::new());
    }

    let printers = parse_windows_printers(&stdout)?;
    Ok(printers
        .into_iter()
        .filter(|printer| is_supported_windows_printer(printer))
        .map(|printer| DetectedWindowsPrinter {
            name: printer.name.clone(),
            vendor_id: String::new(),
            product_id: String::new(),
            port_name: printer.port_name.clone(),
        })
        .collect())
}

fn parse_windows_printers(json: &str) -> Result<Vec<WindowsPrinterInfo>, String> {
    match serde_json::from_str::<Vec<WindowsPrinterInfo>>(json) {
        Ok(items) => Ok(items),
        Err(_) => serde_json::from_str::<WindowsPrinterInfo>(json)
            .map(|item| vec![item])
            .map_err(|e| {
                format!(
                    "No se pudo parsear la lista de impresoras de Windows: {}",
                    e
                )
            }),
    }
}

fn is_supported_windows_printer(printer: &WindowsPrinterInfo) -> bool {
    let name = printer.name.to_lowercase();
    let driver = printer
        .driver_name
        .clone()
        .unwrap_or_default()
        .to_lowercase();
    let port = printer.port_name.clone().unwrap_or_default().to_uppercase();

    if name.contains("microsoft print to pdf")
        || name.contains("microsoft xps document writer")
        || name.contains("fax")
    {
        return false;
    }

    port.starts_with("USB")
        || driver.contains("pos")
        || driver.contains("epson")
        || driver.contains("xprinter")
        || driver.contains("tm-")
}

#[cfg(target_os = "windows")]
fn validate_windows_printer(printer_name: &str) -> Result<(), String> {
    use windows::core::PWSTR;
    use windows::Win32::Graphics::Printing::{ClosePrinter, OpenPrinterW, PRINTER_HANDLE};

    let mut wide_name: Vec<u16> = printer_name
        .encode_utf16()
        .chain(std::iter::once(0))
        .collect();
    let mut handle = PRINTER_HANDLE::default();

    unsafe {
        OpenPrinterW(PWSTR(wide_name.as_mut_ptr()), &mut handle, None)
            .map_err(|e| format!("No se pudo abrir la impresora '{}' : {}", printer_name, e))?;
        let _ = ClosePrinter(handle);
    }

    Ok(())
}

#[cfg(not(target_os = "windows"))]
fn validate_windows_printer(_printer_name: &str) -> Result<(), String> {
    Err("El spooler de Windows solo esta disponible en Windows".to_string())
}

#[cfg(target_os = "windows")]
fn send_raw_to_windows_printer(printer_name: &str, data: &[u8]) -> Result<(), String> {
    use std::ffi::c_void;
    use windows::core::PWSTR;
    use windows::Win32::Graphics::Printing::{
        ClosePrinter, EndDocPrinter, EndPagePrinter, OpenPrinterW, StartDocPrinterW,
        StartPagePrinter, WritePrinter, DOC_INFO_1W, PRINTER_HANDLE,
    };

    let mut wide_name: Vec<u16> = printer_name
        .encode_utf16()
        .chain(std::iter::once(0))
        .collect();
    let mut doc_name: Vec<u16> = "Almanza POS Ticket"
        .encode_utf16()
        .chain(std::iter::once(0))
        .collect();
    let mut raw_type: Vec<u16> = "RAW".encode_utf16().chain(std::iter::once(0)).collect();
    let mut handle = PRINTER_HANDLE::default();

    unsafe {
        OpenPrinterW(PWSTR(wide_name.as_mut_ptr()), &mut handle, None)
            .map_err(|e| format!("No se pudo abrir la impresora '{}' : {}", printer_name, e))?;

        let doc_info = DOC_INFO_1W {
            pDocName: PWSTR(doc_name.as_mut_ptr()),
            pOutputFile: PWSTR::null(),
            pDatatype: PWSTR(raw_type.as_mut_ptr()),
        };

        let job_id = StartDocPrinterW(handle, 1, &doc_info);
        if job_id == 0 {
            let _ = ClosePrinter(handle);
            return Err(format!(
                "No se pudo iniciar el documento RAW en la impresora '{}'",
                printer_name
            ));
        }

        if !StartPagePrinter(handle).as_bool() {
            let _ = EndDocPrinter(handle);
            let _ = ClosePrinter(handle);
            return Err(format!(
                "No se pudo iniciar la pagina RAW en la impresora '{}'",
                printer_name
            ));
        }

        let mut bytes_written = 0u32;
        if !WritePrinter(
            handle,
            data.as_ptr() as *const c_void,
            data.len() as u32,
            &mut bytes_written,
        )
        .as_bool()
        {
            let _ = EndPagePrinter(handle);
            let _ = EndDocPrinter(handle);
            let _ = ClosePrinter(handle);
            return Err(format!(
                "No se pudo escribir bytes RAW en la impresora '{}'",
                printer_name
            ));
        }

        let _ = EndPagePrinter(handle);
        let _ = EndDocPrinter(handle);
        let _ = ClosePrinter(handle);

        if bytes_written != data.len() as u32 {
            return Err(format!(
                "La impresora '{}' solo recibio {} de {} bytes",
                printer_name,
                bytes_written,
                data.len()
            ));
        }
    }

    Ok(())
}

#[cfg(not(target_os = "windows"))]
fn send_raw_to_windows_printer(_printer_name: &str, _data: &[u8]) -> Result<(), String> {
    Err("El spooler RAW solo esta disponible en Windows".to_string())
}
