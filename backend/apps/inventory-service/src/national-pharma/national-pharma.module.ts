import { Module } from '@nestjs/common';
import { NationalPharmaService } from './national-pharma.service';

@Module({
  providers: [NationalPharmaService],
  exports: [NationalPharmaService],
})
export class NationalPharmaModule {}
