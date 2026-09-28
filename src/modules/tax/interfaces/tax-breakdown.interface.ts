/**
 * A tax-ready breakdown for one order. `totalTax` (GST + PST + WHT) is what gets
 * added to the order total; each component is itemized for the invoice (§14).
 */
export interface TaxBreakdown {
  taxableAmount: number;
  gstRate: number;
  gstAmount: number;
  pstRate: number;
  pstAmount: number;
  whtRate: number;
  whtAmount: number;
  totalTax: number;
}
