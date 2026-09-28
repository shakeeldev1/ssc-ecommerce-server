export interface NetRevenueReport {
  periodStart: string;
  periodEnd: string;
  orderCount: number;
  grossRevenue: number;
  totalRefunds: number;
  totalCommissions: number;
  netRevenue: number;
}
