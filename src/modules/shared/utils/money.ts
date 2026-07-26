import { Decimal } from 'decimal.js';

type NumericValue = Decimal.Value;

function toDecimal(value: NumericValue): Decimal {
  return value instanceof Decimal ? value : new Decimal(value);
}

function sumDecimals(values: NumericValue[]): Decimal {
  return values.reduce<Decimal>((total, value) => total.plus(value), new Decimal(0));
}

export function parseNumericInput(value: string): number | null {
  if (!value.trim()) return null;

  try {
    return toDecimal(value).toNumber();
  } catch {
    return null;
  }
}

export function roundMoney(value: NumericValue): number {
  return toDecimal(value).toDecimalPlaces(2).toNumber();
}

export function roundQuantity(value: NumericValue): number {
  return toDecimal(value).toDecimalPlaces(3).toNumber();
}

export function addMoney(a: NumericValue, b: NumericValue): number {
  return roundMoney(toDecimal(a).plus(b));
}

export function subtractMoney(minuend: NumericValue, subtrahend: NumericValue): number {
  return roundMoney(toDecimal(minuend).minus(subtrahend));
}

export function divideMoney(value: NumericValue, divisor: NumericValue): number {
  const divisorDecimal = toDecimal(divisor);
  if (divisorDecimal.isZero()) return 0;

  return roundMoney(toDecimal(value).div(divisorDecimal));
}

export function multiplyMoney(amount: NumericValue, quantity: NumericValue): number {
  return roundMoney(toDecimal(amount).times(quantity));
}

export function sumMoney(values: NumericValue[]): number {
  return roundMoney(sumDecimals(values));
}

export function addQuantity(a: NumericValue, b: NumericValue): number {
  return roundQuantity(toDecimal(a).plus(b));
}

export function subtractQuantity(minuend: NumericValue, subtrahend: NumericValue): number {
  return roundQuantity(toDecimal(minuend).minus(subtrahend));
}

export function sumQuantity(values: NumericValue[]): number {
  return roundQuantity(sumDecimals(values));
}

export function parseMoneyInput(value: string): number | null {
  const parsed = parseNumericInput(value);
  return parsed === null ? null : roundMoney(parsed);
}

export function parseQuantityInput(value: string): number | null {
  const parsed = parseNumericInput(value);
  return parsed === null ? null : roundQuantity(parsed);
}

export function usdToMxn(usd: NumericValue, exchangeRate: NumericValue): number {
  return multiplyMoney(usd, exchangeRate);
}

export function mxnToUsd(mxn: NumericValue, exchangeRate: NumericValue): number {
  return divideMoney(mxn, exchangeRate);
}

export function totalPaidMxn(
  cashMxn: NumericValue,
  cashUsd: NumericValue,
  transfer: NumericValue,
  exchangeRate: NumericValue | null,
): number {
  const usdInMxn = exchangeRate === null ? roundMoney(cashUsd) : usdToMxn(cashUsd, exchangeRate);
  return sumMoney([cashMxn, usdInMxn, transfer]);
}

export function calcChange(total: NumericValue, totalPaid: NumericValue): number {
  return subtractMoney(totalPaid, total);
}

export function hasSufficientStock(availableStock: NumericValue, requestedQuantity: NumericValue): boolean {
  return toDecimal(roundQuantity(availableStock)).gte(roundQuantity(requestedQuantity));
}

export function isPaymentSufficient(total: NumericValue, totalPaid: NumericValue): boolean {
  const normalizedTotal = roundMoney(total);
  return normalizedTotal > 0 && toDecimal(roundMoney(totalPaid)).gte(normalizedTotal);
}

export function isPositiveMoney(value: NumericValue): boolean {
  return toDecimal(roundMoney(value)).gt(0);
}

export function isPositiveQuantity(value: NumericValue): boolean {
  return toDecimal(roundQuantity(value)).gt(0);
}
