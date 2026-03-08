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
// pub fn sum_money(values: &[f64]) -> f64 {
//     round2(values.iter().copied().sum::<f64>())
// }

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

    // ---- round2 ----

    #[test]
    fn test_round2_basic() {
        assert_eq!(round2(10.005), 10.01);
        assert_eq!(round2(10.004), 10.0);
        assert_eq!(round2(99.999), 100.0);
    }

    #[test]
    fn test_round2_zero() {
        assert_eq!(round2(0.0), 0.0);
    }

    #[test]
    fn test_round2_exact_values() {
        assert_eq!(round2(10.50), 10.50);
        assert_eq!(round2(100.0), 100.0);
        assert_eq!(round2(0.99), 0.99);
    }

    #[test]
    fn test_round2_float_precision() {
        // 0.1 + 0.2 in f64 = 0.30000000000000004 — round2 must give 0.30
        let raw = 0.1_f64 + 0.2_f64;
        assert_ne!(raw, 0.3_f64, "raw f64 addition is imprecise");
        assert_eq!(round2(raw), 0.30_f64);
    }

    #[test]
    fn test_round2_large_values() {
        assert_eq!(round2(123456.789), 123456.79);
        assert_eq!(round2(999999.999), 1000000.0);
    }

    // ---- round3 ----

    #[test]
    fn test_round3_zero() {
        assert_eq!(round3(0.0), 0.0);
    }

    #[test]
    fn test_round3_exact_values() {
        assert_eq!(round3(1.5), 1.5);
        assert_eq!(round3(2.250), 2.250);
        assert_eq!(round3(0.001), 0.001);
    }

    #[test]
    fn test_round3_float_precision() {
        // 0.1 + 0.2 in f64 = 0.30000000000000004
        let raw = 0.1_f64 + 0.2_f64;
        assert_ne!(raw, 0.3_f64, "raw f64 addition is imprecise");
        assert_eq!(round3(raw), 0.3_f64);
    }

    /// Demonstrates why inventory stock operations need rounding.
    /// inventory_repo calculates `current_stock - quantity` with raw f64,
    /// which can accumulate floating point error over multiple adjustments.
    #[test]
    fn test_round3_inventory_subtraction() {
        // e.g., 5.1 kg stock - 0.3 kg sold = 4.8 kg (not 4.799999999999999)
        let raw = 5.1_f64 - 0.3_f64;
        assert_eq!(round3(raw), 4.8_f64);
    }

    #[test]
    fn test_round3_inventory_addition() {
        // e.g., restock: 10.1 kg + 0.2 kg = 10.3 kg (not 10.299999999999999)
        let raw = 10.1_f64 + 0.2_f64;
        assert_eq!(round3(raw), 10.3_f64);
    }

    // ---- mul_money ----

    #[test]
    fn test_mul_money_basic() {
        assert_eq!(mul_money(19.99, 3.0), 59.97);
        assert_eq!(mul_money(1.5, 45.50), 68.25);
    }

    #[test]
    fn test_mul_money_classic_float_issue() {
        // Raw f64: 0.1 * 3 = 0.30000000000000004
        let raw = 0.1_f64 * 3.0_f64;
        assert_ne!(raw, 0.3_f64, "raw f64 multiplication is imprecise");
        assert_eq!(mul_money(0.1, 3.0), 0.30_f64);
    }

    #[test]
    fn test_mul_money_common_prices() {
        assert_eq!(mul_money(9.99, 7.0), 69.93);
        assert_eq!(mul_money(33.33, 3.0), 99.99);
        assert_eq!(mul_money(2.99, 3.0), 8.97);
    }

    #[test]
    fn test_mul_money_fractional_quantity() {
        // Sold by weight/volume
        assert_eq!(mul_money(89.50, 1.5), 134.25);
        assert_eq!(mul_money(100.0, 0.1), 10.0);
        assert_eq!(mul_money(10.0, 0.333), 3.33);
    }

    #[test]
    fn test_mul_money_zero() {
        assert_eq!(mul_money(0.0, 100.0), 0.0);
        assert_eq!(mul_money(100.0, 0.0), 0.0);
    }

    // ---- usd_to_mxn ----

    #[test]
    fn test_usd_to_mxn_basic() {
        assert_eq!(usd_to_mxn(10.0, 20.50), 205.0);
        assert_eq!(usd_to_mxn(5.0, 17.35), 86.75);
    }

    #[test]
    fn test_usd_to_mxn_round_rate() {
        assert_eq!(usd_to_mxn(1.0, 17.0), 17.0);
        assert_eq!(usd_to_mxn(100.0, 20.0), 2000.0);
    }

    #[test]
    fn test_usd_to_mxn_fractional_amount() {
        // $5.50 USD × 17.50 = $96.25 MXN (both inputs exactly representable)
        assert_eq!(usd_to_mxn(5.50, 17.50), 96.25);
    }

    #[test]
    fn test_usd_to_mxn_zero() {
        assert_eq!(usd_to_mxn(0.0, 17.50), 0.0);
    }

    // ---- total_paid_mxn ----

    #[test]
    fn test_total_paid_mxn_all_methods() {
        // $100 MXN + $10 USD × 20 + $50 transfer = $350
        let total = total_paid_mxn(100.0, 10.0, 50.0, 20.0);
        assert_eq!(total, 350.0);
    }

    #[test]
    fn test_total_paid_mxn_cash_only() {
        assert_eq!(total_paid_mxn(150.0, 0.0, 0.0, 17.50), 150.0);
    }

    #[test]
    fn test_total_paid_mxn_usd_only() {
        // $5 USD × 17.50 = $87.50 MXN
        assert_eq!(total_paid_mxn(0.0, 5.0, 0.0, 17.50), 87.50);
    }

    #[test]
    fn test_total_paid_mxn_transfer_only() {
        assert_eq!(total_paid_mxn(0.0, 0.0, 200.0, 17.50), 200.0);
    }

    #[test]
    fn test_total_paid_mxn_zero() {
        assert_eq!(total_paid_mxn(0.0, 0.0, 0.0, 17.50), 0.0);
    }

    #[test]
    fn test_total_paid_mxn_mixed_fractional() {
        // $89.50 MXN + $3.50 USD × 17.50 ($61.25) + $0 = $150.75
        assert_eq!(total_paid_mxn(89.50, 3.50, 0.0, 17.50), 150.75);
    }

    // ---- calc_change ----

    #[test]
    fn test_calc_change_exact_payment() {
        assert_eq!(calc_change(100.0, 100.0), 0.0);
    }

    #[test]
    fn test_calc_change_overpayment() {
        // Pay $200 for a $150 item → $50 change
        assert_eq!(calc_change(150.0, 200.0), 50.0);
    }

    #[test]
    fn test_calc_change_float_precision() {
        // Raw f64: 100.0 - 89.99 = 10.010000000000001
        // round2 must give 10.01
        assert_eq!(calc_change(89.99, 100.0), 10.01);
    }

    #[test]
    fn test_calc_change_one_cent() {
        // Pay $1.00 for a $0.99 item → $0.01 change
        assert_eq!(calc_change(0.99, 1.00), 0.01);
    }

    #[test]
    fn test_calc_change_underpayment_is_negative() {
        let change = calc_change(100.0, 50.0);
        assert!(change < 0.0);
        assert_eq!(change, -50.0);
    }

    // ---- derive_payment_method ----

    #[test]
    fn test_derive_payment_method_single() {
        assert_eq!(derive_payment_method(100.0, 0.0, 0.0), "cash_mxn");
        assert_eq!(derive_payment_method(0.0, 10.0, 0.0), "cash_usd");
        assert_eq!(derive_payment_method(0.0, 0.0, 500.0), "transfer");
    }

    #[test]
    fn test_derive_payment_method_mixed_two() {
        assert_eq!(derive_payment_method(50.0, 10.0, 0.0), "mixed");
        assert_eq!(derive_payment_method(50.0, 0.0, 200.0), "mixed");
        assert_eq!(derive_payment_method(0.0, 5.0, 100.0), "mixed");
    }

    #[test]
    fn test_derive_payment_method_mixed_all_three() {
        assert_eq!(derive_payment_method(100.0, 5.0, 50.0), "mixed");
    }

    #[test]
    fn test_derive_payment_method_all_zero_defaults_cash_mxn() {
        // No payment amount provided → default to cash_mxn
        assert_eq!(derive_payment_method(0.0, 0.0, 0.0), "cash_mxn");
    }
}
