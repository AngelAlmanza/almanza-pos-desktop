use crate::models::sale::Sale;

use super::models::{TicketData, TicketItem};

pub fn build_sale_ticket(
    sale: &Sale,
    business_name: Option<&str>,
    business_rfc: Option<&str>,
    ticket_header: Option<&str>,
    ticket_footer: Option<&str>,
) -> TicketData {
    let subtotal = sale.items.iter().map(|item| item.subtotal).sum::<f64>();

    let mut header_lines = Vec::new();
    if let Some(name) = business_name.filter(|value| !value.trim().is_empty()) {
        header_lines.push(name.trim().to_string());
    }
    if let Some(rfc) = business_rfc.filter(|value| !value.trim().is_empty()) {
        header_lines.push(format!("RFC: {}", rfc.trim()));
    }
    if let Some(extra) = ticket_header.filter(|value| !value.trim().is_empty()) {
        header_lines.push(extra.trim().to_string());
    }
    header_lines.push(format!("VENTA #{}", sale.id));
    header_lines.push(format!("Fecha: {}", sale.created_at));
    if let Some(cashier) = sale
        .user_name
        .as_deref()
        .filter(|value| !value.trim().is_empty())
    {
        header_lines.push(format!("Cajero: {}", cashier.trim()));
    }

    let mut footer_lines = Vec::new();
    footer_lines.push(format!(
        "Metodo de pago: {}",
        payment_method_label(&sale.payment_method)
    ));
    if let Some(extra) = ticket_footer.filter(|value| !value.trim().is_empty()) {
        footer_lines.push(extra.trim().to_string());
    }

    TicketData {
        items: sale
            .items
            .iter()
            .map(|item| TicketItem {
                description: item.product_name.clone(),
                quantity: item.quantity,
                unit_price: item.unit_price,
                total: item.subtotal,
            })
            .collect(),
        total: sale.total,
        subtotal,
        tax: (sale.total - subtotal).max(0.0),
        barcode: None,
        qr_code: None,
        footer: Some(footer_lines.join("\n")),
        header: Some(header_lines.join("\n")),
    }
}

fn payment_method_label(method: &str) -> &'static str {
    match method {
        "cash_mxn" => "Efectivo MXN",
        "cash_usd" => "Efectivo USD",
        "transfer" => "Transferencia",
        "mixed" => "Mixto",
        _ => "Otro",
    }
}
