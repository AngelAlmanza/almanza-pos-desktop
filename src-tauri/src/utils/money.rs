/// Rounds a monetary value to 2 decimal places.
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
pub fn sum_money<I>(values: I) -> f64
where
    I: IntoIterator<Item = f64>,
{
    round2(values.into_iter().sum::<f64>())
}

/// Adds two monetary values and rounds to 2 decimals.
pub fn add_money(a: f64, b: f64) -> f64 {
    round2(a + b)
}

/// Subtracts two monetary values and rounds to 2 decimals.
pub fn sub_money(minuend: f64, subtrahend: f64) -> f64 {
    round2(minuend - subtrahend)
}

/// Divides a monetary value and rounds to 2 decimals.
pub fn div_money(value: f64, divisor: f64) -> f64 {
    if divisor == 0.0 {
        0.0
    } else {
        round2(value / divisor)
    }
}

/// Adds stock quantities and rounds to 3 decimals.
pub fn add_stock(current_stock: f64, quantity: f64) -> f64 {
    round3(current_stock + quantity)
}

/// Subtracts stock quantities and rounds to 3 decimals.
pub fn sub_stock(current_stock: f64, quantity: f64) -> f64 {
    round3(current_stock - quantity)
}

/// Converts USD to MXN using the given exchange rate, rounded to 2 decimals.
pub fn usd_to_mxn(usd: f64, exchange_rate: f64) -> f64 {
    round2(usd * exchange_rate)
}

/// Calculates the total paid in MXN equivalent from a mixed payment.
pub fn total_paid_mxn(cash_mxn: f64, cash_usd: f64, transfer: f64, exchange_rate: f64) -> f64 {
    sum_money([cash_mxn, usd_to_mxn(cash_usd, exchange_rate), transfer])
}

/// Calculates change amount (always in MXN).
pub fn calc_change(total: f64, total_paid: f64) -> f64 {
    sub_money(total_paid, total)
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
        let raw = 0.1_f64 + 0.2_f64;
        assert_ne!(raw, 0.3_f64, "raw f64 addition is imprecise");
        assert_eq!(round3(raw), 0.3_f64);
    }

    #[test]
    fn test_round3_inventory_subtraction() {
        let raw = 5.1_f64 - 0.3_f64;
        assert_eq!(round3(raw), 4.8_f64);
    }

    #[test]
    fn test_round3_inventory_addition() {
        let raw = 10.1_f64 + 0.2_f64;
        assert_eq!(round3(raw), 10.3_f64);
    }

    #[test]
    fn test_add_stock_rounds_to_3_decimals() {
        assert_eq!(add_stock(10.1, 0.2), 10.3);
    }

    #[test]
    fn test_sub_stock_rounds_to_3_decimals() {
        assert_eq!(sub_stock(5.1, 0.3), 4.8);
    }

    // ---- money helpers ----

    #[test]
    fn test_sum_money_basic() {
        assert_eq!(sum_money([19.99, 9.99, 4.99]), 34.97);
    }

    #[test]
    fn test_sum_money_float_precision() {
        assert_eq!(sum_money([0.1, 0.2]), 0.30);
    }

    #[test]
    fn test_add_money_basic() {
        assert_eq!(add_money(89.99, 10.01), 100.0);
    }

    #[test]
    fn test_sub_money_basic() {
        assert_eq!(sub_money(100.0, 89.99), 10.01);
    }

    #[test]
    fn test_div_money_basic() {
        assert_eq!(div_money(200.0, 17.50), 11.43);
    }

    #[test]
    fn test_div_money_zero_divisor() {
        assert_eq!(div_money(200.0, 0.0), 0.0);
    }

    // ---- mul_money ----

    #[test]
    fn test_mul_money_basic() {
        assert_eq!(mul_money(19.99, 3.0), 59.97);
        assert_eq!(mul_money(1.5, 45.50), 68.25);
    }

    #[test]
    fn test_mul_money_classic_float_issue() {
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
        assert_eq!(usd_to_mxn(5.50, 17.50), 96.25);
    }

    #[test]
    fn test_usd_to_mxn_zero() {
        assert_eq!(usd_to_mxn(0.0, 17.50), 0.0);
    }

    // ---- total_paid_mxn ----

    #[test]
    fn test_total_paid_mxn_all_methods() {
        let total = total_paid_mxn(100.0, 10.0, 50.0, 20.0);
        assert_eq!(total, 350.0);
    }

    #[test]
    fn test_total_paid_mxn_cash_only() {
        assert_eq!(total_paid_mxn(150.0, 0.0, 0.0, 17.50), 150.0);
    }

    #[test]
    fn test_total_paid_mxn_usd_only() {
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
        assert_eq!(total_paid_mxn(89.50, 3.50, 0.0, 17.50), 150.75);
    }

    // ---- calc_change ----

    #[test]
    fn test_calc_change_exact_payment() {
        assert_eq!(calc_change(100.0, 100.0), 0.0);
    }

    #[test]
    fn test_calc_change_overpayment() {
        assert_eq!(calc_change(150.0, 200.0), 50.0);
    }

    #[test]
    fn test_calc_change_float_precision() {
        assert_eq!(calc_change(89.99, 100.0), 10.01);
    }

    #[test]
    fn test_calc_change_one_cent() {
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
        assert_eq!(derive_payment_method(0.0, 0.0, 0.0), "cash_mxn");
    }
}
