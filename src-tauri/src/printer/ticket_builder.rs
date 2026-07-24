use crate::models::sale::Sale;
use crate::utils::money;

use super::models::{TicketData, TicketItem};

pub fn build_sale_ticket(
    sale: &Sale,
    business_name: Option<&str>,
    business_rfc: Option<&str>,
    ticket_header: Option<&str>,
    ticket_footer: Option<&str>,
) -> TicketData {
    let subtotal = money::sum_money(sale.items.iter().map(|item| item.subtotal));

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
                base_quantity: item.quantity,
                base_unit: item.base_unit.clone(),
                input_mode: item.input_mode.map(|mode| mode.as_str().to_string()),
                input_value: item.input_value,
                input_unit: item.input_unit.clone(),
                unit_price: item.unit_price,
                total: item.subtotal,
            })
            .collect(),
        total: sale.total,
        subtotal,
        tax: money::sub_money(sale.total, subtotal).max(0.0),
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

#[cfg(test)]
mod tests {
    use super::build_sale_ticket;
    use crate::models::sale::{Sale, SaleInputMode, SaleItem, SaleStatus};

    #[test]
    fn maps_purchase_metadata_to_the_ticket_snapshot() {
        let sale = Sale {
            id: 1,
            cash_register_session_id: 1,
            user_id: 1,
            user_name: Some("Cajero".to_string()),
            total: 20.0,
            payment_method: "cash_mxn".to_string(),
            payment_amount: 20.0,
            payment_cash_mxn: 20.0,
            payment_cash_usd: 0.0,
            payment_transfer: 0.0,
            exchange_rate: None,
            change_amount: 0.0,
            status: SaleStatus::Completed,
            created_at: "2026-01-01".to_string(),
            items: vec![SaleItem {
                id: 1,
                sale_id: 1,
                product_id: 1,
                product_name: "Tomate".to_string(),
                quantity: 0.2,
                base_unit: Some("kg".to_string()),
                input_mode: Some(SaleInputMode::Sub),
                input_value: Some(200.0),
                input_unit: Some("g".to_string()),
                unit_price: 100.0,
                subtotal: 20.0,
            }],
        };

        let ticket = build_sale_ticket(&sale, None, None, None, None);
        assert_eq!(ticket.items[0].base_quantity, 0.2);
        assert_eq!(ticket.items[0].base_unit.as_deref(), Some("kg"));
        assert_eq!(ticket.items[0].input_mode.as_deref(), Some("sub"));
        assert_eq!(ticket.items[0].input_value, Some(200.0));
        assert_eq!(ticket.items[0].input_unit.as_deref(), Some("g"));
    }
}
