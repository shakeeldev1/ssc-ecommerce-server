import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { SmartCard } from '@/modules/smart-cards/entities/smart-card.entity';
import { SmartCardsController } from '@/modules/smart-cards/smart-cards.controller';
import { SmartCardsService } from '@/modules/smart-cards/smart-cards.service';
import { StudentProfile } from '@/modules/students/entities/student-profile.entity';
import { StudentsModule } from '@/modules/students/students.module';

@Module({
  imports: [TypeOrmModule.forFeature([SmartCard, StudentProfile]), StudentsModule],
  controllers: [SmartCardsController],
  providers: [SmartCardsService],
  exports: [SmartCardsService],
})
export class SmartCardsModule {}
