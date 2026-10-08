import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document } from 'mongoose';

@Schema({ timestamps: true, collection: 'consultation_audio_records' })
export class ConsultationAudioRecord extends Document {
  @Prop({ required: true, unique: true, index: true })
  consultationId: string;

  @Prop({ required: true, default: 'BR-001', index: true })
  branchId: string;

  @Prop({ default: '' })
  audioUrl: string;

  @Prop({ default: 0 })
  audioDuration: number;

  @Prop({ default: '' })
  transcription: string;

  @Prop({ type: Object, default: {} })
  aiOriginalSuggestion: {
    diagnosis?: string;
    recommended_drugs?: Array<{
      name: string;
      active_ingredient?: string;
      dosage?: string;
      confidence?: number;
      reason?: string;
    }>;
    warnings?: string[];
  };

  @Prop({ type: Object, default: {} })
  pharmacistFinalDecision: {
    selectedDrugs?: Array<{
      name: string;
      active_ingredient?: string;
      dosage?: string;
      quantity?: number;
      unit?: string;
      price?: number;
      isAlternative?: boolean;
      originalDrugReplaced?: string;
    }>;
    clinicalNotes?: string;
  };

  @Prop({ required: true, default: false })
  pharmacistAgreement: boolean;

  @Prop({ type: Object, default: {} })
  pharmacistInfo: {
    name?: string;
    license?: string;
    userId?: string;
    confirmedAt?: Date;
  };

  @Prop({ index: true })
  auditCode?: string;

  @Prop({ index: true })
  orderCode?: number;

  @Prop({
    required: true,
    default: 'RECORDED',
    enum: ['RECORDED', 'CONFIRMED', 'ORDERED'],
    index: true,
  })
  status: string;
}

export const ConsultationAudioRecordSchema = SchemaFactory.createForClass(ConsultationAudioRecord);
ConsultationAudioRecordSchema.index({ branchId: 1, createdAt: -1 });
ConsultationAudioRecordSchema.index({ status: 1, createdAt: -1 });
ConsultationAudioRecordSchema.index({ auditCode: 1 });
ConsultationAudioRecordSchema.index({ orderCode: 1 });
