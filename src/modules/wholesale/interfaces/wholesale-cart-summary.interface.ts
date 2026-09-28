import { WholesaleCartItem } from '@/modules/wholesale/entities/wholesale-cart-item.entity';

export interface WholesaleCartLine {
  item: WholesaleCartItem;
  unitPrice: number;
  lineTotal: number;
}

export interface WholesaleCartSummary {
  lines: WholesaleCartLine[];
  subtotal: number;
  totalItems: number;
}
