use serde::{Deserialize, Serialize};

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct Setting {
    pub key: String,
    pub value: Option<String>,
    pub value_type: String,
    pub label: String,
    pub description: Option<String>,
    pub group_name: String,
    pub sort_order: i64,
    pub created_at: String,
    pub updated_at: String,
}

#[derive(Debug, Deserialize)]
pub struct UpdateSettingRequest {
    pub key: String,
    pub value: Option<String>,
}

#[derive(Debug, Deserialize)]
pub struct CreateSettingRequest {
    pub key: String,
    pub value: Option<String>,
    pub value_type: String,
    pub label: String,
    pub description: Option<String>,
    pub group_name: String,
    pub sort_order: Option<i64>,
}
