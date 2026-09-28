import { Module } from '@nestjs/common';
import { SeedService } from '@/database/seed/seed.service';
import { UsersModule } from '@/modules/users/users.module';

@Module({
  imports: [UsersModule],
  providers: [SeedService],
})
export class SeedModule {}
