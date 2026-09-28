import { Module } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { APP_GUARD } from '@nestjs/core';
import { TypeOrmModule } from '@nestjs/typeorm';
import configuration, { Configuration } from '@/config/configuration';
import { validationSchema } from '@/config/validation.schema';
import { SeedModule } from '@/database/seed/seed.module';
import { buildTypeOrmOptions } from '@/database/typeorm.config';
import { AuditLogModule } from '@/modules/audit-log/audit-log.module';
import { AuthModule } from '@/modules/auth/auth.module';
import { JwtAuthGuard } from '@/modules/auth/guards/jwt-auth.guard';
import { RolesGuard } from '@/modules/auth/guards/roles.guard';
import { CardActivationModule } from '@/modules/card-activation/card-activation.module';
import { CardDiscountsModule } from '@/modules/card-discounts/card-discounts.module';
import { CartModule } from '@/modules/cart/cart.module';
import { CatalogModule } from '@/modules/catalog/catalog.module';
import { CommissionModule } from '@/modules/commission/commission.module';
import { ContactModule } from '@/modules/contact/contact.module';
import { CouponsModule } from '@/modules/coupons/coupons.module';
import { DirectoryModule } from '@/modules/directory/directory.module';
import { FinanceModule } from '@/modules/finance/finance.module';
import { HealthModule } from '@/modules/health/health.module';
import { InventoryModule } from '@/modules/inventory/inventory.module';
import { MediaModule } from '@/modules/media/media.module';
import { NotificationsModule } from '@/modules/notifications/notifications.module';
import { OrdersModule } from '@/modules/orders/orders.module';
import { OtpModule } from '@/modules/otp/otp.module';
import { ReportsModule } from '@/modules/reports/reports.module';
import { PricingModule } from '@/modules/pricing/pricing.module';
import { ReturnsModule } from '@/modules/returns/returns.module';
import { ReviewsModule } from '@/modules/reviews/reviews.module';
import { SmartCardsModule } from '@/modules/smart-cards/smart-cards.module';
import { StatsModule } from '@/modules/stats/stats.module';
import { StudentsModule } from '@/modules/students/students.module';
import { UsersModule } from '@/modules/users/users.module';
import { VendorsModule } from '@/modules/vendors/vendors.module';
import { WholesaleModule } from '@/modules/wholesale/wholesale.module';
import { WishlistModule } from '@/modules/wishlist/wishlist.module';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      load: [configuration],
      validationSchema,
    }),
    TypeOrmModule.forRootAsync({
      inject: [ConfigService],
      useFactory: (configService: ConfigService<Configuration, true>) =>
        buildTypeOrmOptions(configService),
    }),
    HealthModule,
    UsersModule,
    AuditLogModule,
    AuthModule,
    OtpModule,
    MediaModule,
    NotificationsModule,
    DirectoryModule,
    StudentsModule,
    SmartCardsModule,
    CardActivationModule,
    CardDiscountsModule,
    InventoryModule,
    VendorsModule,
    CatalogModule,
    PricingModule,
    WholesaleModule,
    CommissionModule,
    CartModule,
    WishlistModule,
    CouponsModule,
    OrdersModule,
    ReviewsModule,
    ReturnsModule,
    FinanceModule,
    ContactModule,
    ReportsModule,
    StatsModule,
    SeedModule,
  ],
  providers: [
    { provide: APP_GUARD, useClass: JwtAuthGuard },
    { provide: APP_GUARD, useClass: RolesGuard },
  ],
})
export class AppModule {}
