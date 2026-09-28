import { Module } from '@nestjs/common';
import { TaxService } from '@/modules/tax/tax.service';

@Module({
  providers: [TaxService],
  exports: [TaxService],
})
export class TaxModule {}
