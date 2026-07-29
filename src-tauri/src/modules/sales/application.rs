use crate::constants::{DEFAULT_PAGE_SIZE, MAX_PAGE_SIZE};
use crate::models::cash_register::{CashRegisterSession, SessionStatus};
use crate::models::customer::Customer;
use crate::models::product::Product;
use crate::models::sale::{
    CreateSaleItemRequest, CreateSaleRequest, DateRangeRequest, Sale, SaleInputMode, SaleStatus,
    SalesReport, TopProduct,
};
use crate::shared::error::{AppError, AppResult};
use crate::shared::money;
use crate::shared::pagination::PaginatedResult;

#[derive(Debug, Clone)]
pub struct SaleDraftItem {
    pub product_id: i64,
    pub product_name: String,
    pub quantity: f64,
    pub base_unit: String,
    pub input_mode: SaleInputMode,
    pub input_value: f64,
    pub input_unit: String,
    pub unit_price: f64,
    pub subtotal: f64,
}

#[derive(Debug, Clone)]
pub struct SaleDraft {
    pub cash_register_session_id: i64,
    pub user_id: i64,
    pub total: f64,
    pub payment_method: String,
    pub payment_amount: f64,
    pub payment_cash_mxn: f64,
    pub payment_cash_usd: f64,
    pub payment_transfer: f64,
    pub exchange_rate: Option<f64>,
    pub change_amount: f64,
    pub customer_id: Option<i64>,
    pub credit_amount: f64,
    pub items: Vec<SaleDraftItem>,
}

#[derive(Debug, Clone)]
pub struct SalesReportMetrics {
    pub total_credit_sold: f64,
    pub total_account_collected: f64,
    pub outstanding_balance: f64,
    pub top_debtors: Vec<Customer>,
}

pub trait SaleDraftDependencies {
    fn find_session(&self, id: i64) -> AppResult<Option<CashRegisterSession>>;
    fn find_product(&self, id: i64) -> AppResult<Option<Product>>;
}

pub trait SalesUnitOfWork {
    fn create_sale_atomically(&self, draft: SaleDraft) -> AppResult<Sale>;
    fn cancel_sale_atomically(&self, sale_id: i64) -> AppResult<()>;
}

pub trait SalesQueryPort {
    fn find_sale(&self, id: i64) -> AppResult<Option<Sale>>;
    fn find_all_sales(&self) -> AppResult<Vec<Sale>>;
    fn find_sales_by_session(
        &self,
        session_id: i64,
        page: i64,
        page_size: i64,
    ) -> AppResult<(Vec<Sale>, i64)>;
    fn find_sales_by_date_range(
        &self,
        start: &str,
        end: &str,
        page: i64,
        page_size: i64,
    ) -> AppResult<(Vec<Sale>, i64)>;
    fn find_sales_for_report(&self, start: &str, end: &str) -> AppResult<Vec<Sale>>;
    fn report_metrics(&self, start: &str, end: &str) -> AppResult<SalesReportMetrics>;
    fn top_products(&self, start: &str, end: &str, limit: i64) -> AppResult<Vec<TopProduct>>;
}

pub fn create_sale<T>(ports: &T, request: CreateSaleRequest) -> AppResult<Sale>
where
    T: SaleDraftDependencies + SalesUnitOfWork,
{
    let draft = prepare_sale_draft(ports, request)?;
    ports.create_sale_atomically(draft)
}

fn prepare_sale_draft(
    dependencies: &impl SaleDraftDependencies,
    request: CreateSaleRequest,
) -> AppResult<SaleDraft> {
    if request.items.is_empty() {
        return Err(AppError::Validation(
            "La venta debe contener al menos un producto".to_string(),
        ));
    }
    let session = dependencies
        .find_session(request.cash_register_session_id)?
        .ok_or_else(|| AppError::NotFound("Sesión de caja no encontrada".to_string()))?;
    if session.status != SessionStatus::Open {
        return Err(AppError::Conflict(
            "La sesión de caja no está abierta".to_string(),
        ));
    }
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

    let mut items = Vec::with_capacity(request.items.len());
    let mut total = 0.0;
    for item_request in &request.items {
        let product = dependencies
            .find_product(item_request.product_id)?
            .ok_or_else(|| {
                AppError::NotFound(format!(
                    "Producto con ID {} no encontrado",
                    item_request.product_id
                ))
            })?;
        if !product.active {
            return Err(AppError::Conflict(format!(
                "Producto '{}' está desactivado",
                product.name
            )));
        }
        let quantity = money::round3(item_request.quantity);
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
        validate_sale_input(&product, item_request, quantity)?;
        if product.stock < quantity {
            return Err(AppError::Validation(format!(
                "Stock insuficiente para '{}'. Disponible: {}, Solicitado: {}",
                product.name, product.stock, quantity
            )));
        }
        let subtotal = money::mul_money(product.price, quantity);
        total = money::add_money(total, subtotal);
        items.push(SaleDraftItem {
            product_id: product.id,
            product_name: product.name,
            quantity,
            base_unit: product.unit,
            input_mode: item_request.input_mode,
            input_value: item_request.input_value,
            input_unit: item_request.input_unit.clone(),
            unit_price: product.price,
            subtotal,
        });
    }

    let exchange_rate = session.exchange_rate.unwrap_or(1.0);
    let total_paid = money::total_paid_mxn(cash_mxn, cash_usd, transfer, exchange_rate);
    let credit_amount = money::round2((total - total_paid).max(0.0));
    if credit_amount > 0.0 && request.customer_id.is_none() {
        return Err(AppError::Validation(
            "Selecciona un cliente para registrar el adeudo".to_string(),
        ));
    }
    Ok(SaleDraft {
        cash_register_session_id: request.cash_register_session_id,
        user_id: request.user_id,
        total,
        payment_method: money::derive_payment_method(cash_mxn, cash_usd, transfer),
        payment_amount: total_paid,
        payment_cash_mxn: cash_mxn,
        payment_cash_usd: cash_usd,
        payment_transfer: transfer,
        exchange_rate: session.exchange_rate,
        change_amount: money::calc_change(total, total_paid).max(0.0),
        customer_id: request.customer_id,
        credit_amount,
        items,
    })
}

pub fn get_sale(port: &impl SalesQueryPort, id: i64) -> AppResult<Sale> {
    port.find_sale(id)?
        .ok_or_else(|| AppError::NotFound("Venta no encontrada".to_string()))
}

pub fn get_sales(port: &impl SalesQueryPort) -> AppResult<Vec<Sale>> {
    port.find_all_sales()
}

pub fn get_sales_by_session(
    port: &impl SalesQueryPort,
    session_id: i64,
    page: Option<i64>,
    page_size: Option<i64>,
) -> AppResult<PaginatedResult<Sale>> {
    let (page, page_size) = page_bounds(page, page_size);
    let (data, total) = port.find_sales_by_session(session_id, page, page_size)?;
    Ok(PaginatedResult {
        data,
        total,
        page,
        page_size,
    })
}

pub fn get_sales_by_date_range(
    port: &impl SalesQueryPort,
    request: DateRangeRequest,
    page: Option<i64>,
    page_size: Option<i64>,
) -> AppResult<PaginatedResult<Sale>> {
    let (page, page_size) = page_bounds(page, page_size);
    let (data, total) =
        port.find_sales_by_date_range(&request.start_date, &request.end_date, page, page_size)?;
    Ok(PaginatedResult {
        data,
        total,
        page,
        page_size,
    })
}

pub fn get_sales_report(
    port: &impl SalesQueryPort,
    request: DateRangeRequest,
) -> AppResult<SalesReport> {
    let sales = port.find_sales_for_report(&request.start_date, &request.end_date)?;
    let completed: Vec<&Sale> = sales
        .iter()
        .filter(|sale| sale.status == SaleStatus::Completed)
        .collect();
    let total_sales = money::sum_money(completed.iter().map(|sale| sale.total));
    let total_transactions = completed.len() as i64;
    let metrics = port.report_metrics(&request.start_date, &request.end_date)?;
    Ok(SalesReport {
        total_sales,
        total_transactions,
        average_sale: if total_transactions == 0 {
            0.0
        } else {
            money::div_money(total_sales, total_transactions as f64)
        },
        total_credit_sold: metrics.total_credit_sold,
        total_account_collected: metrics.total_account_collected,
        outstanding_balance: metrics.outstanding_balance,
        top_debtors: metrics.top_debtors,
        sales,
    })
}

pub fn get_top_products(
    port: &impl SalesQueryPort,
    start: String,
    end: String,
    limit: Option<i64>,
) -> AppResult<Vec<TopProduct>> {
    port.top_products(&start, &end, limit.unwrap_or(10))
}

pub fn cancel_sale(port: &impl SalesUnitOfWork, sale_id: i64) -> AppResult<()> {
    port.cancel_sale_atomically(sale_id)
}

fn page_bounds(page: Option<i64>, page_size: Option<i64>) -> (i64, i64) {
    (
        page.unwrap_or(1).max(1),
        page_size
            .unwrap_or(DEFAULT_PAGE_SIZE)
            .clamp(1, MAX_PAGE_SIZE),
    )
}

pub fn validate_sale_input(
    product: &Product,
    item: &CreateSaleItemRequest,
    quantity: f64,
) -> AppResult<()> {
    if !item.input_value.is_finite() || item.input_value <= 0.0 {
        return Err(AppError::Validation(
            "El valor capturado debe ser mayor que cero".to_string(),
        ));
    }
    let expected = match item.input_mode {
        SaleInputMode::Base if item.input_unit == product.unit => item.input_value,
        SaleInputMode::Base => {
            return Err(AppError::Validation(format!(
                "La unidad capturada debe ser {} para '{}'",
                product.unit, product.name
            )))
        }
        SaleInputMode::Sub if !product.is_bulk => {
            return Err(AppError::Validation(format!(
                "El producto '{}' no admite subunidades",
                product.name
            )))
        }
        SaleInputMode::Sub => match (product.unit.as_str(), item.input_unit.as_str()) {
            ("kg", "g") | ("litro", "ml") => item.input_value / 1000.0,
            ("metro", "cm") => item.input_value / 100.0,
            _ => {
                return Err(AppError::Validation(format!(
                    "La unidad {} no es compatible con {}",
                    item.input_unit, product.unit
                )))
            }
        },
        SaleInputMode::Amount
            if product.is_bulk && item.input_unit == "MXN" && product.price > 0.0 =>
        {
            item.input_value / product.price
        }
        SaleInputMode::Amount => {
            return Err(AppError::Validation(format!(
                "No se puede capturar '{}' mediante monto",
                product.name
            )))
        }
    };
    if (money::round3(expected) - quantity).abs() > 0.000_001 {
        return Err(AppError::Validation(format!(
            "La cantidad capturada para '{}' no coincide con su conversión a {}",
            product.name, product.unit
        )));
    }
    Ok(())
}
