import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document } from 'mongoose';

export type BranchFeedbackDocument = BranchFeedback & Document;

@Schema({ _id: false })
export class FeedbackResolution {
  @Prop()
  handledBy?: string;

  @Prop()
  handledByName?: string;

  @Prop({ enum: ['CALLED_CUSTOMER', 'OFFERED_VOUCHER', 'INTERNAL_TRAINING', 'OTHER'] })
  actionTaken?: string;

  @Prop()
  notes?: string;

  @Prop()
  resolvedAt?: Date;

  @Prop({ default: true })
  customerSatisfied?: boolean;
}

@Schema({ timestamps: true, collection: 'branch_feedbacks' })
export class BranchFeedback {
  @Prop({ required: true, index: true })
  orderId: string;

  @Prop({ required: true, index: true })
  orderCode: string;

  @Prop({ required: true, index: true })
  branchId: string;

  @Prop({ default: 'Chi nhánh chính' })
  branchName: string;

  @Prop()
  pharmacistId?: string;

  @Prop()
  pharmacistName?: string;

  @Prop()
  customerId?: string;

  @Prop({ required: true, index: true })
  customerPhone: string;

  @Prop()
  customerName?: string;

  @Prop({ enum: ['Bronze', 'Silver', 'Gold', 'Diamond'], default: 'Bronze' })
  customerTier: string;

  @Prop({ required: true, min: 1, max: 5 })
  rating: number;

  @Prop({ type: [String], default: [] })
  tags: string[];

  @Prop()
  comment?: string;

  @Prop({ type: [String], default: [] })
  images: string[];

  @Prop({ default: 0 })
  rewardPointsEarned: number;

  @Prop()
  issuedVoucherCode?: string;

  @Prop({ default: false, index: true })
  isNegative: boolean; // true nếu rating <= 2 sao

  @Prop({
    enum: ['PENDING', 'ACKNOWLEDGED', 'IN_PROGRESS', 'RESOLVED', 'CLOSED'],
    default: 'PENDING',
    index: true,
  })
  status: string;

  @Prop({ type: FeedbackResolution })
  resolution?: FeedbackResolution;
}

export const BranchFeedbackSchema = SchemaFactory.createForClass(BranchFeedback);
BranchFeedbackSchema.index({ branchId: 1, createdAt: -1 });
BranchFeedbackSchema.index({ orderCode: 1, customerPhone: 1 });
