import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document } from 'mongoose';

@Schema({ timestamps: true, collection: 'staff_notifications' })
export class StaffNotification extends Document {
  @Prop({ required: true })
  recipientId: string;

  @Prop({ required: true })
  branchId: string;

  @Prop({ required: true, enum: ['shift_swap_request', 'shift_swap_response', 'shift_swap_approved', 'shift_swap_rejected', 'schedule_published'] })
  type: string;

  @Prop({ required: true })
  title: string;

  @Prop({ required: true })
  message: string;

  @Prop()
  relatedId?: string;

  @Prop({ default: false })
  isRead: boolean;
}

export const StaffNotificationSchema = SchemaFactory.createForClass(StaffNotification);
