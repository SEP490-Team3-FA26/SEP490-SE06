import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document } from 'mongoose';

export type IotAlertDocument = IotAlert & Document;

@Schema({ timestamps: true, collection: 'iot_alerts' })
export class IotAlert extends Document {
  @Prop({ required: true, unique: true, index: true })
  alertCode: string;

  @Prop({ required: true, index: true })
  deviceId: string;

  @Prop({ required: true })
  stationName: string;

  @Prop({ default: 'WAREHOUSE' })
  targetType: string;

  @Prop({ default: 'CENTRAL_WH', index: true })
  targetId: string;

  @Prop({ default: 'TEMPERATURE' })
  metricType: string;

  @Prop({ required: true })
  currentValue: number;

  @Prop({ required: true })
  thresholdValue: number;

  @Prop({ enum: ['WARNING', 'CRITICAL', 'EMERGENCY'], default: 'WARNING' })
  severity: string;

  @Prop({ enum: ['TRIGGERED', 'ACKNOWLEDGED', 'RESOLVED'], default: 'TRIGGERED' })
  status: string;

  @Prop({ default: Date.now })
  triggeredAt: Date;

  @Prop()
  acknowledgedBy?: string;

  @Prop()
  acknowledgedAt?: Date;

  @Prop()
  resolvedAt?: Date;
}

export const IotAlertSchema = SchemaFactory.createForClass(IotAlert);
IotAlertSchema.index({ targetId: 1, status: 1 });
