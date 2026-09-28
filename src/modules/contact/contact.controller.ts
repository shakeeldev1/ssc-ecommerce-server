import { Body, Controller, Get, Post } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { Public } from '@/modules/auth/decorators/public.decorator';
import { Roles } from '@/modules/auth/decorators/roles.decorator';
import { UserRole } from '@/modules/users/enums/user-role.enum';
import { ContactService } from '@/modules/contact/contact.service';
import { CreateContactMessageDto } from '@/modules/contact/dto/create-contact-message.dto';
import { ContactMessage } from '@/modules/contact/entities/contact-message.entity';

@ApiTags('contact')
@Controller('contact')
export class ContactController {
  constructor(private readonly contactService: ContactService) {}

  @Public()
  @Post()
  @ApiOperation({ summary: 'Submit a "Contact us" message' })
  create(@Body() dto: CreateContactMessageDto): Promise<ContactMessage> {
    return this.contactService.create(dto);
  }

  @Get()
  @Roles(UserRole.SUPER_ADMIN)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'List submitted contact messages' })
  listAll(): Promise<ContactMessage[]> {
    return this.contactService.listAll();
  }
}
