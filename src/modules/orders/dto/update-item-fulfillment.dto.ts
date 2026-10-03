import { ApiProperty } from '@nestjs/swagger';
import { IsEnum } from 'class-validator';
import { OrderItemFulfillmentStatus } from '@/modules/orders/enums/order-item-fulfillment-status.enum';

export class UpdateItemFulfillmentDto {
  @ApiProperty({ enum: OrderItemFulfillmentStatus })
  @IsEnum(OrderItemFulfillmentStatus)
  status: OrderItemFulfillmentStatus;
}
