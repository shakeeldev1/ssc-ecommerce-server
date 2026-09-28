import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ContactController } from '@/modules/contact/contact.controller';
import { ContactService } from '@/modules/contact/contact.service';
import { ContactMessage } from '@/modules/contact/entities/contact-message.entity';

@Module({
  imports: [TypeOrmModule.forFeature([ContactMessage])],
  controllers: [ContactController],
  providers: [ContactService],
})
export class ContactModule {}
