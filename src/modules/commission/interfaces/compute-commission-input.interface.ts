import { CommissionChannel } from '@/modules/commission/enums/commission-channel.enum';

export interface ComputeCommissionInput {
  orderId: string;
  orderNumber: string;
  buyerUserId: string;
  totalAmount: number;
  channel: CommissionChannel;
  campaignCode?: string | null;
}
