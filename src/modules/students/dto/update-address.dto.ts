import { PartialType } from '@nestjs/swagger';
import { CreateAddressDto } from '@/modules/students/dto/create-address.dto';

export class UpdateAddressDto extends PartialType(CreateAddressDto) {}
