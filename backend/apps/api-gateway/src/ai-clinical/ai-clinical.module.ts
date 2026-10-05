import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { PrescriptionOcrLog, PrescriptionOcrLogSchema } from './schemas/prescription-ocr-log.schema';
import { ConsultationAudioRecord, ConsultationAudioRecordSchema } from './schemas/consultation-audio-record.schema';
import { AiClinicalController } from './ai-clinical.controller';
import { AiClinicalService } from './ai-clinical.service';

@Module({
  imports: [
    MongooseModule.forFeature([
      { name: PrescriptionOcrLog.name, schema: PrescriptionOcrLogSchema },
      { name: ConsultationAudioRecord.name, schema: ConsultationAudioRecordSchema },
    ]),
  ],
  controllers: [AiClinicalController],
  providers: [AiClinicalService],
  exports: [AiClinicalService],
})
export class AiClinicalModule {}
