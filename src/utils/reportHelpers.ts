import type { Sale } from '../models';
import type { PaymentMethod } from '../types';

export const MAX_REPORT_RANGE_DAYS = 365;

export interface ReportMetrics {
  totalRevenue: number;
  completedCount: number;
  cancelledCount: number;
  cancelledAmount: number;
  averageSale: number;
  byPaymentMethod: Partial<Record<PaymentMethod, { count: number; amount: number }>>;
}

/** Returns true if the date range (in ms) exceeds MAX_REPORT_RANGE_DAYS. */
export function isRangeTooLong(startMs: number, endMs: number): boolean {
  return (endMs - startMs) / 86_400_000 > MAX_REPORT_RANGE_DAYS;
}

/** Returns only completed sales when includeCancelled is false. */
export function filterSales(sales: Sale[], includeCancelled: boolean): Sale[] {
  if (includeCancelled) return sales;
  return sales.filter((s) => s.status === 'completed');
}

/** Computes aggregated metrics from all sales (both statuses). */
export function computeMetrics(sales: Sale[]): ReportMetrics {
  const completed = sales.filter((s) => s.status === 'completed');
  const cancelled = sales.filter((s) => s.status === 'cancelled');

  const totalRevenue = completed.reduce((sum, s) => sum + s.total, 0);
  const cancelledAmount = cancelled.reduce((sum, s) => sum + s.total, 0);
  const averageSale = completed.length > 0 ? totalRevenue / completed.length : 0;

  const byPaymentMethod: Partial<Record<PaymentMethod, { count: number; amount: number }>> = {};
  for (const sale of completed) {
    const m = sale.payment_method;
    if (!byPaymentMethod[m]) {
      byPaymentMethod[m] = { count: 0, amount: 0 };
    }
    byPaymentMethod[m].count++;
    byPaymentMethod[m].amount += sale.total;
  }

  return {
    totalRevenue,
    completedCount: completed.length,
    cancelledCount: cancelled.length,
    cancelledAmount,
    averageSale,
    byPaymentMethod,
  };
}
