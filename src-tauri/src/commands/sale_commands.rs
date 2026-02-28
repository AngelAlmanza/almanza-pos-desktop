use crate::db::repository::{cash_register_repo, product_repo, sale_repo};
use crate::db::Database;
use crate::models::sale::{CreateSaleRequest, DateRangeRequest, Sale, SalesReport, TopProduct};
use crate::utils::money;
use tauri::State;

#[tauri::command]
pub fn create_sale(db: State<Database>, request: CreateSaleRequest) -> Result<Sale, String> {
    let session = cash_register_repo::find_by_id(&db, request.cash_register_session_id)?
        .ok_or_else(|| "Sesión de caja no encontrada".to_string())?;

    if session.status != "open" {
        return Err("La sesión de caja no está abierta".to_string());
    }

    let exchange_rate = session.exchange_rate.unwrap_or(1.0);

    let cash_mxn = money::round2(request.payment_cash_mxn);
    let cash_usd = money::round2(request.payment_cash_usd);
    let transfer = money::round2(request.payment_transfer);

    if cash_usd > 0.0 && session.exchange_rate.is_none() {
        return Err(
            "No se puede pagar con USD sin tipo de cambio configurado en la caja".to_string(),
        );
    }

    let mut items: Vec<(i64, String, f64, f64, f64)> = Vec::new();
    let mut total = 0.0_f64;

    for item_req in &request.items {
        let product = product_repo::find_by_id(&db, item_req.product_id)?
            .ok_or_else(|| format!("Producto con ID {} no encontrado", item_req.product_id))?;

        if !product.active {
            return Err(format!("Producto '{}' está desactivado", product.name));
        }

        let quantity = money::round3(item_req.quantity);

        if product.stock < quantity {
            return Err(format!(
                "Stock insuficiente para '{}'. Disponible: {}, Solicitado: {}",
                product.name, product.stock, quantity
            ));
        }

        let subtotal = money::mul_money(product.price, quantity);
        total = money::round2(total + subtotal);
        items.push((
            product.id,
            product.name.clone(),
            quantity,
            product.price,
            subtotal,
        ));
    }

    let total_paid = money::total_paid_mxn(cash_mxn, cash_usd, transfer, exchange_rate);
    let change_amount = money::calc_change(total, total_paid);

    if change_amount < 0.0 {
        return Err(format!(
            "Pago insuficiente. Total: ${:.2}, Recibido: ${:.2}",
            total, total_paid
        ));
    }

    let payment_method = money::derive_payment_method(cash_mxn, cash_usd, transfer);

    sale_repo::create(
        &db,
        request.cash_register_session_id,
        request.user_id,
        total,
        &payment_method,
        total_paid,
        cash_mxn,
        cash_usd,
        transfer,
        session.exchange_rate,
        change_amount,
        &items,
    )
}

#[tauri::command]
pub fn get_sale(db: State<Database>, id: i64) -> Result<Sale, String> {
    sale_repo::find_by_id(&db, id)?.ok_or_else(|| "Venta no encontrada".to_string())
}

#[tauri::command]
pub fn get_sales(db: State<Database>) -> Result<Vec<Sale>, String> {
    sale_repo::find_all(&db)
}

#[tauri::command]
pub fn get_sales_by_session(db: State<Database>, session_id: i64) -> Result<Vec<Sale>, String> {
    sale_repo::find_by_session(&db, session_id)
}

#[tauri::command]
pub fn get_sales_by_date_range(
    db: State<Database>,
    request: DateRangeRequest,
) -> Result<Vec<Sale>, String> {
    sale_repo::find_by_date_range(&db, &request.start_date, &request.end_date)
}

#[tauri::command]
pub fn get_sales_report(
    db: State<Database>,
    request: DateRangeRequest,
) -> Result<SalesReport, String> {
    let sales = sale_repo::find_by_date_range(&db, &request.start_date, &request.end_date)?;
    let completed_sales: Vec<&Sale> = sales.iter().filter(|s| s.status == "completed").collect();
    let total_sales = money::round2(completed_sales.iter().map(|s| s.total).sum::<f64>());
    let total_transactions = completed_sales.len() as i64;
    let average_sale = if total_transactions > 0 {
        money::round2(total_sales / total_transactions as f64)
    } else {
        0.0
    };

    Ok(SalesReport {
        total_sales,
        total_transactions,
        average_sale,
        sales,
    })
}

#[tauri::command]
pub fn get_top_products(
    db: State<Database>,
    start_date: String,
    end_date: String,
    limit: Option<i64>,
) -> Result<Vec<TopProduct>, String> {
    sale_repo::get_top_products(&db, &start_date, &end_date, limit.unwrap_or(10))
}

#[tauri::command]
pub fn cancel_sale(db: State<Database>, sale_id: i64) -> Result<(), String> {
    sale_repo::cancel_sale(&db, sale_id)
}
