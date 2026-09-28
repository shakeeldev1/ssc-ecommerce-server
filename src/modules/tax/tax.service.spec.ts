import { ConfigService } from '@nestjs/config';
import { Configuration } from '@/config/configuration';
import { TaxService } from '@/modules/tax/tax.service';

const serviceWithRates = (gstRate: number, pstRate: number, whtRate: number): TaxService => {
  const config = {
    get: () => ({ gstRate, pstRate, whtRate }),
  } as unknown as ConfigService<Configuration, true>;
  return new TaxService(config);
};

describe('TaxService', () => {
  it('returns an all-zero breakdown when every rate is 0 (tax off)', () => {
    const breakdown = serviceWithRates(0, 0, 0).computeTax(1000);
    expect(breakdown).toMatchObject({ taxableAmount: 1000, totalTax: 0 });
    expect(breakdown.gstAmount).toBe(0);
  });

  it('computes GST, PST and WHT and sums them into totalTax', () => {
    const breakdown = serviceWithRates(17, 2, 1).computeTax(1000);
    expect(breakdown.gstAmount).toBe(170);
    expect(breakdown.pstAmount).toBe(20);
    expect(breakdown.whtAmount).toBe(10);
    expect(breakdown.totalTax).toBe(200);
  });

  it('rounds each component to 2 decimal places', () => {
    const breakdown = serviceWithRates(17, 0, 0).computeTax(99.99);
    expect(breakdown.gstAmount).toBe(17); // 99.99 * 0.17 = 16.9983 → 17.00
  });

  it('clamps a negative taxable base to 0', () => {
    const breakdown = serviceWithRates(17, 0, 0).computeTax(-50);
    expect(breakdown.taxableAmount).toBe(0);
    expect(breakdown.totalTax).toBe(0);
  });
});
