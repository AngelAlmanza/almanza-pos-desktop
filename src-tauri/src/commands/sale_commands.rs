use crate::db::Database;
use crate::db::repository::{product_repo, sale_repo};
use crate::models::sale::{CreateSaleRequest, DateRangeRequest, Sale, SalesReport, TopProduct};
use tauri::State;

#[tauri::command]
pub fn create_sale(db: State<Database>, request: CreateSaleRequest) -> Result<Sale, String> {
    // Validate and prepare items
    let mut items: Vec<(i64, String, f64, f64, f64)> = Vec::new();
    let mut total = 0.0;

    for item_req in &request.items {
        let product = product_repo::find_by_id(&db, item_req.product_id)?
            .ok_or_else(|| format!("Producto con ID {} no encontrado", item_req.product_id))?;

        if !product.active {
            return Err(format!("Producto '{}' está desactivado", product.name));
        }

        if product.stock < item_req.quantity {
            return Err(format!(
                "Stock insuficiente para '{}'. Disponible: {}, Solicitado: {}",
                product.name, product.stock, item_req.quantity
            ));
        }

        let subtotal = product.price * item_req.quantity;
        total += subtotal;
        items.push((
            product.id,
            product.name.clone(),
            item_req.quantity,
            product.price,
            subtotal,
        ));
    }

    let change_amount = request.payment_amount - total;
    if change_amount < 0.0 {
        return Err("Pago insuficiente".to_string());
    }

    sale_repo::create(
        &db,
        request.cash_register_session_id,
        request.user_id,
        total,
        &request.payment_method,
        request.payment_amount,
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
pub fn get_sales_by_date_range(db: State<Database>, request: DateRangeRequest) -> Result<Vec<Sale>, String> {
    sale_repo::find_by_date_range(&db, &request.start_date, &request.end_date)
}

#[tauri::command]
pub fn get_sales_report(db: State<Database>, request: DateRangeRequest) -> Result<SalesReport, String> {
    let sales = sale_repo::find_by_date_range(&db, &request.start_date, &request.end_date)?;
    let completed_sales: Vec<&Sale> = sales.iter().filter(|s| s.status == "completed").collect();
    let total_sales: f64 = completed_sales.iter().map(|s| s.total).sum();
    let total_transactions = completed_sales.len() as i64;
    let average_sale = if total_transactions > 0 {
        total_sales / total_transactions as f64
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
