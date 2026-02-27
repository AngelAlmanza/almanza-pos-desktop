/// Rounds a monetary value to 2 decimal places using banker's rounding.
pub fn round2(value: f64) -> f64 {
    (value * 100.0).round() / 100.0
}

/// Rounds a quantity value to 3 decimal places (e.g. 1.5 kg).
pub fn round3(value: f64) -> f64 {
    (value * 1000.0).round() / 1000.0
}

/// Multiplies two values and rounds to 2 decimal places (price * quantity).
pub fn mul_money(a: f64, b: f64) -> f64 {
    round2(a * b)
}

/// Sums monetary values with 2-decimal rounding.
pub fn sum_money(values: &[f64]) -> f64 {
    round2(values.iter().copied().sum::<f64>())
}

/// Converts USD to MXN using the given exchange rate, rounded to 2 decimals.
pub fn usd_to_mxn(usd: f64, exchange_rate: f64) -> f64 {
    round2(usd * exchange_rate)
}

/// Calculates the total paid in MXN equivalent from a mixed payment.
pub fn total_paid_mxn(cash_mxn: f64, cash_usd: f64, transfer: f64, exchange_rate: f64) -> f64 {
    round2(cash_mxn + usd_to_mxn(cash_usd, exchange_rate) + transfer)
}

/// Calculates change amount (always in MXN).
pub fn calc_change(total: f64, total_paid: f64) -> f64 {
    round2(total_paid - total)
}

/// Derives a human-readable payment method label from the amounts.
pub fn derive_payment_method(cash_mxn: f64, cash_usd: f64, transfer: f64) -> String {
    let methods: Vec<&str> = [
        (cash_mxn > 0.0, "cash_mxn"),
        (cash_usd > 0.0, "cash_usd"),
        (transfer > 0.0, "transfer"),
    ]
    .iter()
    .filter(|(active, _)| *active)
    .map(|(_, name)| *name)
    .collect();

    if methods.len() > 1 {
        "mixed".to_string()
    } else if let Some(m) = methods.first() {
        m.to_string()
    } else {
        "cash_mxn".to_string()
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn test_round2() {
        assert_eq!(round2(10.005), 10.01);
        assert_eq!(round2(10.004), 10.0);
        assert_eq!(round2(99.999), 100.0);
    }

    #[test]
    fn test_mul_money() {
        assert_eq!(mul_money(19.99, 3.0), 59.97);
        assert_eq!(mul_money(1.5, 45.50), 68.25);
    }

    #[test]
    fn test_usd_to_mxn() {
        assert_eq!(usd_to_mxn(10.0, 20.50), 205.0);
        assert_eq!(usd_to_mxn(5.0, 17.35), 86.75);
    }

    #[test]
    fn test_total_paid_mxn() {
        let total = total_paid_mxn(100.0, 10.0, 50.0, 20.0);
        assert_eq!(total, 350.0);
    }

    #[test]
    fn test_derive_payment_method() {
        assert_eq!(derive_payment_method(100.0, 0.0, 0.0), "cash_mxn");
        assert_eq!(derive_payment_method(0.0, 10.0, 0.0), "cash_usd");
        assert_eq!(derive_payment_method(0.0, 0.0, 500.0), "transfer");
        assert_eq!(derive_payment_method(50.0, 10.0, 0.0), "mixed");
        assert_eq!(derive_payment_method(50.0, 0.0, 200.0), "mixed");
    }
}
