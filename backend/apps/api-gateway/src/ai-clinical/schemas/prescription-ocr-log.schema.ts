import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document } from 'mongoose';

@Schema({ timestamps: true, collection: 'prescription_ocr_logs' })
export class PrescriptionOcrLog extends Document {
  @Prop({ required: true, unique: true, index: true })
  scanId: string;

  @Prop({ required: true, default: 'BR-001', index: true })
  branchId: string;

  @Prop({ type: [String], default: [] })
  imageUrls: string[];

  @Prop({ type: Object, default: {} })
  patient: {
    name?: string;
    age?: string | number;
    gender?: string;
    diagnosis?: string;
  };

  @Prop({ type: Object, default: {} })
  doctor: {
    name?: string;
    hospital?: string;
    specialty?: string;
  };

  @Prop({ type: [Object], default: [] })
  rawExtractedItems: Array<{
    medicineId?: string;
    name: string;
    generic_name?: string;
    strength?: string;
    quantity: number;
    unit?: string;
    dosage?: string;
    confidenceScore?: number;
    matchedSku?: any;
  }>;

  @Prop({ type: [Object], default: [] })
  pharmacistAdjustedItems: Array<{
    medicineId?: string;
    name: string;
    quantity: number;
    unit?: string;
    dosage?: string;
    price?: number;
    active_ingredient?: string;
    adjustmentNote?: string;
  }>;

  @Prop({ default: false })
  hasAdjustments: boolean;

  @Prop({ default: '' })
  adjustmentSummary: string;

  @Prop({ default: 0.95 })
  confidenceScore: number;

  @Prop({ type: Object, default: {} })
  pharmacistInfo: {
    name?: string;
    license?: string;
    userId?: string;
    reviewedAt?: Date;
  };

  @Prop({ index: true })
  auditCode?: string;

  @Prop({ index: true })
  orderCode?: number;

  @Prop({
    required: true,
    default: 'SCANNED',
    enum: ['SCANNED', 'REVIEWED', 'DISPENSED', 'REJECTED'],
    index: true,
  })
  status: string;
}

export const PrescriptionOcrLogSchema = SchemaFactory.createForClass(PrescriptionOcrLog);
PrescriptionOcrLogSchema.index({ branchId: 1, createdAt: -1 });
PrescriptionOcrLogSchema.index({ status: 1, createdAt: -1 });
PrescriptionOcrLogSchema.index({ auditCode: 1 });
