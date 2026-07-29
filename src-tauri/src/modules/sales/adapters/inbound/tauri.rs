use crate::infrastructure::sqlite::Database;
use crate::models::sale::{CreateSaleRequest, DateRangeRequest, Sale, SalesReport, TopProduct};
use crate::modules::sales::adapters::outbound::sqlite::SqliteSalesRepository;
use crate::modules::sales::application;
use crate::shared::error::AppResult;
use crate::shared::pagination::PaginatedResult;
use tauri::State;

#[tauri::command]
pub fn create_sale(db: State<Database>, request: CreateSaleRequest) -> AppResult<Sale> {
    application::create_sale(&SqliteSalesRepository::new(&db), request)
}

#[tauri::command]
pub fn get_sale(db: State<Database>, id: i64) -> AppResult<Sale> {
    application::get_sale(&SqliteSalesRepository::new(&db), id)
}

#[tauri::command]
pub fn get_sales(db: State<Database>) -> AppResult<Vec<Sale>> {
    application::get_sales(&SqliteSalesRepository::new(&db))
}

#[tauri::command]
pub fn get_sales_by_session(
    db: State<Database>,
    session_id: i64,
    page: Option<i64>,
    page_size: Option<i64>,
) -> AppResult<PaginatedResult<Sale>> {
    application::get_sales_by_session(
        &SqliteSalesRepository::new(&db),
        session_id,
        page,
        page_size,
    )
}

#[tauri::command]
pub fn get_sales_by_date_range(
    db: State<Database>,
    request: DateRangeRequest,
    page: Option<i64>,
    page_size: Option<i64>,
) -> AppResult<PaginatedResult<Sale>> {
    application::get_sales_by_date_range(&SqliteSalesRepository::new(&db), request, page, page_size)
}

#[tauri::command]
pub fn get_sales_report(db: State<Database>, request: DateRangeRequest) -> AppResult<SalesReport> {
    application::get_sales_report(&SqliteSalesRepository::new(&db), request)
}

#[tauri::command]
pub fn get_top_products(
    db: State<Database>,
    start_date: String,
    end_date: String,
    limit: Option<i64>,
) -> AppResult<Vec<TopProduct>> {
    application::get_top_products(
        &SqliteSalesRepository::new(&db),
        start_date,
        end_date,
        limit,
    )
}

#[tauri::command]
pub fn cancel_sale(db: State<Database>, sale_id: i64) -> AppResult<()> {
    application::cancel_sale(&SqliteSalesRepository::new(&db), sale_id)
}

#[cfg(test)]
mod tests {
    use crate::models::product::Product;
    use crate::models::sale::{CreateSaleItemRequest, SaleInputMode};
    use crate::modules::sales::application::validate_sale_input;

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
            product_id: 1,
            quantity: 0.2,
            input_mode: SaleInputMode::Sub,
            input_value: 200.0,
            input_unit: "g".to_string(),
        };
        let amount = CreateSaleItemRequest {
            product_id: 1,
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
            product_id: 1,
            quantity: 0.2,
            input_mode: SaleInputMode::Sub,
            input_value: 500.0,
            input_unit: "g".to_string(),
        };
        assert!(validate_sale_input(&product, &request, 0.2).is_err());
    }
}
