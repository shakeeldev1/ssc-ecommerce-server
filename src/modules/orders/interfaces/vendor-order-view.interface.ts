import { OrderItem } from '@/modules/orders/entities/order-item.entity';
import { Order } from '@/modules/orders/entities/order.entity';

/**
 * An order as a single vendor sees it: only their own line items, plus the
 * shipping details they need to fulfill and their own portion of the total.
 * Other vendors' items and the whole-order money are never exposed.
 */
export interface VendorOrderView {
  id: string;
  orderNumber: string;
  status: Order['status'];
  paymentStatus: Order['paymentStatus'];
  shippingAddress: Order['shippingAddress'];
  createdAt: Date;
  items: OrderItem[];
  vendorItemCount: number;
  vendorSubtotal: number;
}
