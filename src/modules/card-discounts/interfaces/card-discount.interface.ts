import { ExternalHolderType } from '@/modules/students/enums/external-holder-type.enum';
import { CardDiscountType } from '@/modules/card-discounts/enums/card-discount-type.enum';

/** The automatic card discount a user currently qualifies for, if any. */
export interface CardHolderEligibility {
  holderType: ExternalHolderType;
  cardNumber: string;
  discountType: CardDiscountType;
  discountPercent: number;
  discountAmount: number;
  maxDiscountPerOrder: number | null;
}

export interface CardDiscountLine {
  unitPrice: number;
  quantity: number;
  isEligible: boolean;
}

export interface CardDiscountComputation {
  eligibility: CardHolderEligibility | null;
  /** Sum of line totals for card-discount-eligible products. */
  eligibleSubtotal: number;
  discountAmount: number;
}
