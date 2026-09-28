import { CartItem } from '@/modules/cart/entities/cart-item.entity';

export interface CartSummary {
  items: CartItem[];
  subtotal: number;
  totalItems: number;
}
