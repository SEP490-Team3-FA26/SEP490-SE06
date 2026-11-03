import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document } from 'mongoose';

@Schema({ timestamps: true, collection: 'shift_swap_requests' })
export class ShiftSwapRequest extends Document {
  @Prop({ required: true })
  branchId: string;

  @Prop({ required: true })
  requesterId: string;

  @Prop({ required: true })
  requesterName: string;

  @Prop({ required: true })
  requesterShiftDate: Date;

  @Prop({ required: true })
  requesterShiftId: string;

  @Prop({ required: true })
  requesterShiftName: string;

  @Prop({ required: true })
  targetId: string;

  @Prop({ required: true })
  targetName: string;

  @Prop({ required: true })
  targetShiftDate: Date;

  @Prop({ required: true })
  targetShiftId: string;

  @Prop({ required: true })
  targetShiftName: string;

  @Prop({ required: true })
  reason: string;

  @Prop({ required: true, enum: ['pending_target', 'pending_manager', 'approved', 'rejected'] })
  status: string;

  @Prop({ enum: ['accepted', 'rejected'] })
  targetResponse?: string;

  @Prop()
  targetRespondedAt?: Date;

  @Prop()
  targetRejectReason?: string;

  @Prop({ enum: ['approved', 'rejected'] })
  managerResponse?: string;

  @Prop()
  managerId?: string;

  @Prop()
  managerRespondedAt?: Date;

  @Prop()
  managerRejectReason?: string;
}

export const ShiftSwapRequestSchema = SchemaFactory.createForClass(ShiftSwapRequest);
