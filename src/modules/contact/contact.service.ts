import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { CreateContactMessageDto } from '@/modules/contact/dto/create-contact-message.dto';
import { ContactMessage } from '@/modules/contact/entities/contact-message.entity';

@Injectable()
export class ContactService {
  constructor(
    @InjectRepository(ContactMessage)
    private readonly messagesRepository: Repository<ContactMessage>,
  ) {}

  async create(dto: CreateContactMessageDto): Promise<ContactMessage> {
    return this.messagesRepository.save(
      this.messagesRepository.create({
        fullName: dto.fullName,
        email: dto.email,
        phone: dto.phone ?? null,
        subject: dto.subject ?? null,
        message: dto.message,
      }),
    );
  }

  async listAll(): Promise<ContactMessage[]> {
    return this.messagesRepository.find({ order: { createdAt: 'DESC' } });
  }
}
