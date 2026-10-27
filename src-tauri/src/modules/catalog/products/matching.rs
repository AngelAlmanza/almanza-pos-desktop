//! Reglas de coincidencia de las sugerencias de búsqueda (FR1.2, FR1.3).
//!
//! Funciones puras, sin acceso a datos: el caso de uso les entrega los productos activos.

use crate::models::product::Product;

/// Normaliza un texto para compararlo: recorta, translitera a ASCII (quita acentos y
/// marcas diacríticas), descarta los caracteres sin equivalente (`[?]`) y pasa a minúsculas.
pub fn fold(text: &str) -> String {
    deunicode::deunicode(text.trim())
        .replace("[?]", "")
        .to_lowercase()
}

/// Un producto coincide si es activo y su nombre o su código de barras normalizados
/// contienen el texto normalizado, en cualquier posición. La comparación es literal:
/// `%` y `_` no son comodines.
pub fn matches(product: &Product, folded_term: &str) -> bool {
    if !product.active || folded_term.is_empty() {
        return false;
    }
    fold(&product.name).contains(folded_term)
        || product
            .barcode
            .as_deref()
            .is_some_and(|barcode| fold(barcode).contains(folded_term))
}

fn starts_with_term(product: &Product, folded_term: &str) -> bool {
    fold(&product.name).starts_with(folded_term)
        || product
            .barcode
            .as_deref()
            .is_some_and(|barcode| fold(barcode).starts_with(folded_term))
}

/// Filtra y ordena para presentar: primero los que empiezan con el texto, luego el resto;
/// cada bloque por nombre normalizado ascendente. `limit` ausente devuelve todos y `0`
/// devuelve una lista vacía. Un texto vacío tras recortar no coincide con nada.
pub fn rank(products: Vec<Product>, term: &str, limit: Option<usize>) -> Vec<Product> {
    let folded_term = fold(term);
    if folded_term.is_empty() {
        return Vec::new();
    }

    // La clave de orden se calcula una vez por producto, no en cada comparación.
    let mut matched: Vec<(bool, String, Product)> = products
        .into_iter()
        .filter(|product| matches(product, &folded_term))
        .map(|product| {
            let prefix = starts_with_term(&product, &folded_term);
            (prefix, fold(&product.name), product)
        })
        .collect();

    // `false < true`, así que se invierte la bandera para que "empieza con" quede primero.
    matched.sort_by(|a, b| (!a.0, &a.1).cmp(&(!b.0, &b.1)));

    let ranked = matched.into_iter().map(|(_, _, product)| product);
    match limit {
        Some(limit) => ranked.take(limit).collect(),
        None => ranked.collect(),
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    fn product(id: i64, name: &str, barcode: Option<&str>, active: bool) -> Product {
        Product {
            id,
            name: name.to_string(),
            description: None,
            barcode: barcode.map(str::to_string),
            price: 1.0,
            unit: "pieza".to_string(),
            is_bulk: false,
            category_id: None,
            category_name: None,
            stock: 5.0,
            min_stock: 0.0,
            active,
            created_at: String::new(),
            updated_at: String::new(),
            image_file: None,
        }
    }

    fn names(products: &[Product]) -> Vec<&str> {
        products.iter().map(|p| p.name.as_str()).collect()
    }

    #[test]
    fn fold_removes_accents_enye_and_case() {
        assert_eq!(fold("  Jamón  "), "jamon");
        assert_eq!(fold("PIÑA"), "pina");
        assert_eq!(fold("Güero ÇÁÉÍÓÚ"), "guero caeiou");
    }

    #[test]
    fn fold_discards_characters_without_equivalent() {
        // U+E000 (uso privado) no tiene transliteración y deunicode devuelve "[?]".
        assert_eq!(fold("a\u{e000}b"), "ab");
    }

    #[test]
    fn matches_by_name_ignoring_accents_and_case() {
        let ham = product(1, "Jamón Serrano", None, true);
        assert!(matches(&ham, &fold("JAMON")));
        assert!(matches(&ham, &fold("serr")));
        assert!(!matches(&ham, &fold("queso")));
    }

    #[test]
    fn matches_by_barcode() {
        let item = product(1, "Leche", Some("7501055"), true);
        assert!(matches(&item, &fold("0105")));
        assert!(!matches(&item, &fold("9999")));
    }

    #[test]
    fn percent_and_underscore_are_literal() {
        let plain = product(1, "Leche entera", None, true);
        let percent = product(2, "Descuento 50% leche", None, true);
        let underscore = product(3, "Caja_grande", None, true);
        assert!(!matches(&plain, &fold("%")));
        assert!(!matches(&plain, &fold("l_che")));
        assert!(matches(&percent, &fold("50%")));
        assert!(matches(&underscore, &fold("a_g")));
    }

    #[test]
    fn inactive_products_never_match() {
        let inactive = product(1, "Leche", Some("123"), false);
        assert!(!matches(&inactive, &fold("leche")));
        assert!(rank(vec![inactive], "leche", None).is_empty());
    }

    #[test]
    fn rank_puts_starts_with_before_contains_then_sorts_by_name() {
        let products = vec![
            product(1, "Té de Limón", None, true),
            product(2, "Limón verde", None, true),
            product(3, "Agua de limón", None, true),
            product(4, "Limon amarillo", None, true),
        ];
        let ranked = rank(products, "limon", None);
        assert_eq!(
            names(&ranked),
            vec!["Limon amarillo", "Limón verde", "Agua de limón", "Té de Limón"]
        );
    }

    #[test]
    fn rank_treats_a_barcode_prefix_as_starts_with() {
        let products = vec![
            product(1, "Zeta con 750", None, true),
            product(2, "Beta", Some("750123"), true),
        ];
        let ranked = rank(products, "750", None);
        assert_eq!(names(&ranked), vec!["Beta", "Zeta con 750"]);
    }

    #[test]
    fn rank_applies_the_limit_and_zero_returns_nothing() {
        let products: Vec<Product> = (0..15)
            .map(|i| product(i, &format!("Galleta {i:02}"), None, true))
            .collect();
        assert_eq!(rank(products.clone(), "galleta", Some(10)).len(), 10);
        assert!(rank(products.clone(), "galleta", Some(0)).is_empty());
        assert_eq!(rank(products, "galleta", None).len(), 15);
    }

    #[test]
    fn rank_returns_nothing_for_an_empty_term() {
        let products = vec![product(1, "Leche", None, true)];
        assert!(rank(products.clone(), "", None).is_empty());
        assert!(rank(products, "   ", None).is_empty());
    }
}
