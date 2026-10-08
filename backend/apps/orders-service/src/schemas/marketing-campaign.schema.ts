import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document } from 'mongoose';

@Schema({ _id: false })
export class CampaignCostItem {
  @Prop({
    type: String,
    required: true,
    enum: ['ADS', 'PRINTING', 'GIFTS', 'VOUCHER_DISCOUNT', 'AGENCY_FEE', 'OTHER'],
  })
  type: string;

  @Prop({ type: Number, required: true, min: 0 })
  amount: number;

  @Prop({ type: String })
  note?: string;

  @Prop({ type: Date, default: Date.now })
  date: Date;
}
export const CampaignCostItemSchema = SchemaFactory.createForClass(CampaignCostItem);

@Schema({ timestamps: true, collection: 'marketingcampaigns' })
export class MarketingCampaign extends Document {
  @Prop({ type: String, required: true, unique: true, index: true })
  code: string; // VD: MKT-2026-FLU, MKT-2026-HEART

  @Prop({ type: String, required: true })
  name: string;

  @Prop({
    type: String,
    required: true,
    enum: [
      'FACEBOOK_ADS',
      'GOOGLE_ADS',
      'ZALO_OA',
      'OFFLINE_POSM',
      'SMS_MARKETING',
      'COMMUNITY_HEALTH_EVENT',
      'TIKTOK_ADS',
    ],
    default: 'FACEBOOK_ADS',
  })
  channel: string;

  @Prop({ type: Number, required: true, min: 0, default: 0 })
  budget: number;

  @Prop({ type: [CampaignCostItemSchema], default: [] })
  costs: CampaignCostItem[];

  @Prop({ type: Number, default: 0 })
  totalCost: number;

  @Prop({ type: Date, required: true })
  startDate: Date;

  @Prop({ type: Date, required: true })
  endDate: Date;

  @Prop({
    type: String,
    default: 'ACTIVE',
    enum: ['DRAFT', 'ACTIVE', 'PAUSED', 'COMPLETED'],
    index: true,
  })
  status: string;

  @Prop({ type: [String], default: [] })
  voucherCodes: string[]; // Các mã voucher liên kết để gán doanh thu (Attribution)

  @Prop({ type: String })
  utmSource?: string;

  @Prop({ type: String })
  utmCampaign?: string;

  @Prop({ type: [String], default: [] })
  targetBranches: string[];

  @Prop({ type: String })
  targetAudience?: string;

  @Prop({ type: String })
  notes?: string;

  createdAt: Date;
  updatedAt: Date;
}

export const MarketingCampaignSchema = SchemaFactory.createForClass(MarketingCampaign);

MarketingCampaignSchema.index({ status: 1, startDate: 1, endDate: 1 });
MarketingCampaignSchema.index({ voucherCodes: 1 });
