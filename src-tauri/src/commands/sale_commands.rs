use crate::constants::{DEFAULT_PAGE_SIZE, MAX_PAGE_SIZE};
use crate::db::repository::sale_repo::PreparedSaleItem;
use crate::db::repository::{cash_register_repo, product_repo, sale_repo};
use crate::db::Database;
use crate::error::{AppError, AppResult};
use crate::models::cash_register::SessionStatus;
use crate::models::product::Product;
use crate::models::sale::{
    CreateSaleItemRequest, CreateSaleRequest, DateRangeRequest, Sale, SaleInputMode, SaleStatus,
    SalesReport, TopProduct,
};
use crate::models::shared::PaginatedResult;
use crate::utils::money;
use tauri::State;

fn expected_base_quantity(product: &Product, item: &CreateSaleItemRequest) -> AppResult<f64> {
    if !item.input_value.is_finite() || item.input_value <= 0.0 {
        return Err(AppError::Validation(
            "El valor capturado debe ser mayor que cero".to_string(),
        ));
    }

    let expected = match item.input_mode {
        SaleInputMode::Base => {
            if item.input_unit != product.unit {
                return Err(AppError::Validation(format!(
                    "La unidad capturada debe ser {} para '{}'",
                    product.unit, product.name
                )));
            }
            item.input_value
        }
        SaleInputMode::Sub => {
            if !product.is_bulk {
                return Err(AppError::Validation(format!(
                    "El producto '{}' no admite subunidades",
                    product.name
                )));
            }

            match (product.unit.as_str(), item.input_unit.as_str()) {
                ("kg", "g") | ("litro", "ml") => item.input_value / 1000.0,
                ("metro", "cm") => item.input_value / 100.0,
                _ => {
                    return Err(AppError::Validation(format!(
                        "La unidad {} no es compatible con {}",
                        item.input_unit, product.unit
                    )))
                }
            }
        }
        SaleInputMode::Amount => {
            if !product.is_bulk || item.input_unit != "MXN" || product.price <= 0.0 {
                return Err(AppError::Validation(format!(
                    "No se puede capturar '{}' mediante monto",
                    product.name
                )));
            }
            item.input_value / product.price
        }
    };

    Ok(money::round3(expected))
}

fn validate_sale_input(
    product: &Product,
    item: &CreateSaleItemRequest,
    quantity: f64,
) -> AppResult<()> {
    let expected_quantity = expected_base_quantity(product, item)?;
    if (expected_quantity - quantity).abs() > 0.000_001 {
        return Err(AppError::Validation(format!(
            "La cantidad capturada para '{}' no coincide con su conversión a {}",
            product.name, product.unit
        )));
    }

    Ok(())
}

#[tauri::command]
pub fn create_sale(db: State<Database>, request: CreateSaleRequest) -> AppResult<Sale> {
    if request.items.is_empty() {
        return Err(AppError::Validation(
            "La venta debe contener al menos un producto".to_string(),
        ));
    }

    let session = cash_register_repo::find_by_id(&db, request.cash_register_session_id)?
        .ok_or_else(|| AppError::NotFound("Sesión de caja no encontrada".to_string()))?;

    if session.status != SessionStatus::Open {
        return Err(AppError::Conflict(
            "La sesión de caja no está abierta".to_string(),
        ));
    }

    let exchange_rate = session.exchange_rate.unwrap_or(1.0);

    if request.payment_cash_mxn < 0.0
        || request.payment_cash_usd < 0.0
        || request.payment_transfer < 0.0
    {
        return Err(AppError::Validation(
            "Los montos de pago no pueden ser negativos".to_string(),
        ));
    }

    let cash_mxn = money::round2(request.payment_cash_mxn);
    let cash_usd = money::round2(request.payment_cash_usd);
    let transfer = money::round2(request.payment_transfer);

    if cash_usd > 0.0 && session.exchange_rate.is_none() {
        return Err(AppError::Validation(
            "No se puede pagar con USD sin tipo de cambio configurado en la caja".to_string(),
        ));
    }

    let mut items: Vec<PreparedSaleItem> = Vec::new();
    let mut total = 0.0_f64;

    for item_req in &request.items {
        let product = product_repo::find_by_id(&db, item_req.product_id)?.ok_or_else(|| {
            AppError::NotFound(format!(
                "Producto con ID {} no encontrado",
                item_req.product_id
            ))
        })?;

        if !product.active {
            return Err(AppError::Conflict(format!(
                "Producto '{}' está desactivado",
                product.name
            )));
        }

        let quantity = money::round3(item_req.quantity);

        if !quantity.is_finite() || quantity <= 0.0 {
            return Err(AppError::Validation(format!(
                "La cantidad de '{}' debe ser mayor que cero",
                product.name
            )));
        }

        if !product.is_bulk && quantity.fract() != 0.0 {
            return Err(AppError::Validation(format!(
                "El producto '{}' solo acepta cantidades enteras",
                product.name
            )));
        }

        validate_sale_input(&product, item_req, quantity)?;

        if product.stock < quantity {
            return Err(AppError::Validation(format!(
                "Stock insuficiente para '{}'. Disponible: {}, Solicitado: {}",
                product.name, product.stock, quantity
            )));
        }

        let subtotal = money::mul_money(product.price, quantity);
        total = money::add_money(total, subtotal);
        items.push(PreparedSaleItem {
            product_id: product.id,
            product_name: product.name.clone(),
            quantity,
            base_unit: product.unit.clone(),
            input_mode: item_req.input_mode,
            input_value: item_req.input_value,
            input_unit: item_req.input_unit.clone(),
            unit_price: product.price,
            subtotal,
        });
    }

    let total_paid = money::total_paid_mxn(cash_mxn, cash_usd, transfer, exchange_rate);
    let change_amount = money::calc_change(total, total_paid);

    if change_amount < 0.0 {
        return Err(AppError::Validation(format!(
            "Pago insuficiente. Total: ${:.2}, Recibido: ${:.2}",
            total, total_paid
        )));
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
pub fn get_sale(db: State<Database>, id: i64) -> AppResult<Sale> {
    sale_repo::find_by_id(&db, id)?
        .ok_or_else(|| AppError::NotFound("Venta no encontrada".to_string()))
}

#[tauri::command]
pub fn get_sales(db: State<Database>) -> AppResult<Vec<Sale>> {
    sale_repo::find_all(&db)
}

#[tauri::command]
pub fn get_sales_by_session(
    db: State<Database>,
    session_id: i64,
    page: Option<i64>,
    page_size: Option<i64>,
) -> AppResult<PaginatedResult<Sale>> {
    let page = page.unwrap_or(1).max(1);
    let page_size = page_size
        .unwrap_or(DEFAULT_PAGE_SIZE)
        .clamp(1, MAX_PAGE_SIZE);
    let (data, total) = sale_repo::find_by_session_paginated(&db, session_id, page, page_size)?;
    Ok(PaginatedResult {
        data,
        total,
        page,
        page_size,
    })
}

#[tauri::command]
pub fn get_sales_by_date_range(
    db: State<Database>,
    request: DateRangeRequest,
    page: Option<i64>,
    page_size: Option<i64>,
) -> AppResult<PaginatedResult<Sale>> {
    let page = page.unwrap_or(1).max(1);
    let page_size = page_size
        .unwrap_or(DEFAULT_PAGE_SIZE)
        .clamp(1, MAX_PAGE_SIZE);
    let (data, total) = sale_repo::find_by_date_range_paginated(
        &db,
        &request.start_date,
        &request.end_date,
        page,
        page_size,
    )?;
    Ok(PaginatedResult {
        data,
        total,
        page,
        page_size,
    })
}

#[tauri::command]
pub fn get_sales_report(db: State<Database>, request: DateRangeRequest) -> AppResult<SalesReport> {
    let sales = sale_repo::find_by_date_range(&db, &request.start_date, &request.end_date)?;
    let completed_sales: Vec<&Sale> = sales
        .iter()
        .filter(|s| s.status == SaleStatus::Completed)
        .collect();
    let total_sales = money::sum_money(completed_sales.iter().map(|s| s.total));
    let total_transactions = completed_sales.len() as i64;
    let average_sale = if total_transactions > 0 {
        money::div_money(total_sales, total_transactions as f64)
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
) -> AppResult<Vec<TopProduct>> {
    sale_repo::get_top_products(&db, &start_date, &end_date, limit.unwrap_or(10))
}

#[tauri::command]
pub fn cancel_sale(db: State<Database>, sale_id: i64) -> AppResult<()> {
    sale_repo::cancel_sale(&db, sale_id)
}

#[cfg(test)]
mod tests {
    use super::{validate_sale_input, CreateSaleItemRequest, Product, SaleInputMode};

    fn bulk_product() -> Product {
        Product {
            id: 1,
            name: "Tomate".to_string(),
            description: None,
            barcode: None,
            price: 100.0,
            unit: "kg".to_string(),
            is_bulk: true,
            category_id: None,
            category_name: None,
            stock: 10.0,
            min_stock: 0.0,
            active: true,
            created_at: "2026-01-01".to_string(),
            updated_at: "2026-01-01".to_string(),
        }
    }

    #[test]
    fn validates_subunit_and_amount_metadata_against_base_quantity() {
        let product = bulk_product();
        let subunit = CreateSaleItemRequest {
            product_id: product.id,
            quantity: 0.2,
            input_mode: SaleInputMode::Sub,
            input_value: 200.0,
            input_unit: "g".to_string(),
        };
        let amount = CreateSaleItemRequest {
            product_id: product.id,
            quantity: 0.2,
            input_mode: SaleInputMode::Amount,
            input_value: 20.0,
            input_unit: "MXN".to_string(),
        };

        assert!(validate_sale_input(&product, &subunit, 0.2).is_ok());
        assert!(validate_sale_input(&product, &amount, 0.2).is_ok());
    }

    #[test]
    fn rejects_tampered_display_metadata() {
        let product = bulk_product();
        let request = CreateSaleItemRequest {
            product_id: product.id,
            quantity: 0.2,
            input_mode: SaleInputMode::Sub,
            input_value: 500.0,
            input_unit: "g".to_string(),
        };

        assert!(validate_sale_input(&product, &request, 0.2).is_err());
    }
}
