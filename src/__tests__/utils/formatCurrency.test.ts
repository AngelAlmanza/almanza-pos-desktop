import { describe, it, expect } from 'vitest';
import { formatCurrency } from '../../utils/FormatCurrency';

describe('formatCurrency', () => {
  it('formats integer amounts with two decimal places', () => {
    expect(formatCurrency(100)).toMatch(/100\.00/);
    expect(formatCurrency(0)).toMatch(/0\.00/);
    expect(formatCurrency(1000)).toMatch(/1[,.]?000\.00/);
  });

  it('formats values that already have two decimals', () => {
    expect(formatCurrency(99.99)).toMatch(/99\.99/);
    expect(formatCurrency(0.50)).toMatch(/0\.50/);
    expect(formatCurrency(1234.56)).toMatch(/1[,.]?234\.56/);
  });

  it('rounds to two decimal places without floating point drift', () => {
    // 0.1 + 0.2 = 0.30000000000000004 in raw JS; Intl must format it as 0.30
    const raw = 0.1 + 0.2;
    expect(raw).not.toBe(0.3); // proves float imprecision exists
    expect(formatCurrency(raw)).toMatch(/0\.30/);
  });

  it('handles common POS prices correctly', () => {
    expect(formatCurrency(19.99)).toMatch(/19\.99/);
    expect(formatCurrency(9.90)).toMatch(/9\.90/);
    expect(formatCurrency(249.50)).toMatch(/249\.50/);
  });

  it('handles large monetary amounts', () => {
    expect(formatCurrency(99999.99)).toMatch(/99[,.]?999\.99/);
  });

  it('defaults to MXN currency', () => {
    const result = formatCurrency(100);
    // Should contain MXN indicator ($, MX$ or MXN)
    expect(result).toMatch(/[\$M]/);
  });

  it('formats USD amounts when currency is specified', () => {
    expect(formatCurrency(10.50, 'usd')).toMatch(/10\.50/);
  });

  it('handles values with many decimal places by rounding to 2', () => {
    // 1/3 = 0.333... should round to 0.33
    expect(formatCurrency(1 / 3)).toMatch(/0\.33/);
    // 2/3 = 0.666... should round to 0.67
    expect(formatCurrency(2 / 3)).toMatch(/0\.67/);
  });
});
