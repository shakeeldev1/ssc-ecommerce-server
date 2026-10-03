import { OrderStatus } from '@/modules/orders/enums/order-status.enum';

export interface VendorAnalytics {
  totals: {
    products: number;
    activeProducts: number;
    pendingApproval: number;
    orders: number;
    revenue: number;
    itemsToFulfill: number;
  };
  orderStatusBreakdown: Record<OrderStatus, number>;
  fulfillmentBreakdown: { pending: number; packed: number; shipped: number };
  monthlyTrend: Array<{ month: string; revenue: number; orders: number }>;
  topProducts: Array<{ name: string; quantity: number; revenue: number }>;
}
