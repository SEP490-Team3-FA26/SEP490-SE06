import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document } from 'mongoose';

export type DeviceTokenDocument = DeviceToken & Document;

@Schema({ timestamps: true, collection: 'device_tokens' })
export class DeviceToken extends Document {
  @Prop({ required: true, index: true })
  userId: string;

  @Prop({ required: true, index: true })
  role: string; // 'warehouse', 'admin', 'customer', 'pharmacist', 'branch'

  @Prop({ default: null })
  branchId?: string;

  @Prop({ required: true, unique: true, index: true })
  pushToken: string; // Chuỗi FCM token gốc hoặc ExponentPushToken[...]

  @Prop({ required: true, enum: ['FCM', 'EXPO'], default: 'FCM' })
  tokenType: string;

  @Prop({ enum: ['android', 'ios', 'web'], default: 'android' })
  platform: string;

  @Prop({ default: true, index: true })
  isActive: boolean;

  @Prop()
  deviceModel?: string;

  @Prop({ default: Date.now })
  lastActiveAt: Date;
}

export const DeviceTokenSchema = SchemaFactory.createForClass(DeviceToken);

DeviceTokenSchema.index({ role: 1, isActive: 1 });
DeviceTokenSchema.index({ userId: 1, role: 1 });
