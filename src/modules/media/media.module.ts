import { Module } from '@nestjs/common';
import { MediaService } from '@/modules/media/media.service';

@Module({
  providers: [MediaService],
  exports: [MediaService],
})
export class MediaModule {}
