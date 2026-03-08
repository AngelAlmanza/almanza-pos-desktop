/// Default number of records returned per page when the caller omits `page_size`.
pub const DEFAULT_PAGE_SIZE: i64 = 50;

/// Hard cap on `page_size` to prevent accidentally fetching unbounded result sets.
pub const MAX_PAGE_SIZE: i64 = 200;

/// Maximum number of products returned by a POS search query.
pub const SEARCH_RESULT_LIMIT: i64 = 20;
