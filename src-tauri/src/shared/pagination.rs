use serde::Serialize;

#[derive(Debug, Serialize)]
pub struct PaginatedResult<T: Serialize> {
    pub data: Vec<T>,
    pub total: i64,
    pub page: i64,
    pub page_size: i64,
}
