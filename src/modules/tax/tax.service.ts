import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Configuration } from '@/config/configuration';
import { TaxBreakdown } from '@/modules/tax/interfaces/tax-breakdown.interface';

/** Rounds to 2 decimal places, guarding against binary-float drift. */
const round2 = (value: number): number => Math.round((value + Number.EPSILON) * 100) / 100;

@Injectable()
export class TaxService {
  constructor(private readonly configService: ConfigService<Configuration, true>) {}

  /**
   * Computes GST/PST/WHT on a taxable base (the net goods value — subtotal minus
   * any discount). Rates come from config and default to 0, so with no tax
   * configured this returns an all-zero breakdown and changes no totals.
   */
  computeTax(taxableBase: number): TaxBreakdown {
    const { gstRate, pstRate, whtRate } = this.configService.get('tax', { infer: true });
    const taxableAmount = Math.max(0, round2(taxableBase));

    const gstAmount = round2((taxableAmount * gstRate) / 100);
    const pstAmount = round2((taxableAmount * pstRate) / 100);
    const whtAmount = round2((taxableAmount * whtRate) / 100);

    return {
      taxableAmount,
      gstRate,
      gstAmount,
      pstRate,
      pstAmount,
      whtRate,
      whtAmount,
      totalTax: round2(gstAmount + pstAmount + whtAmount),
    };
  }
}
