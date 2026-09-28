import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { AuditLogModule } from '@/modules/audit-log/audit-log.module';
import { CardDiscountsController } from '@/modules/card-discounts/card-discounts.controller';
import { CardDiscountsService } from '@/modules/card-discounts/card-discounts.service';
import { CardDiscountSetting } from '@/modules/card-discounts/entities/card-discount-setting.entity';
import { CartModule } from '@/modules/cart/cart.module';
import { SmartCard } from '@/modules/smart-cards/entities/smart-card.entity';
import { StudentProfile } from '@/modules/students/entities/student-profile.entity';

@Module({
  imports: [
    TypeOrmModule.forFeature([CardDiscountSetting, StudentProfile, SmartCard]),
    AuditLogModule,
    CartModule,
  ],
  controllers: [CardDiscountsController],
  providers: [CardDiscountsService],
  exports: [CardDiscountsService],
})
export class CardDiscountsModule {}
