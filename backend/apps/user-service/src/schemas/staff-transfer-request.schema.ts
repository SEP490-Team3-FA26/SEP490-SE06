import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document } from 'mongoose';

@Schema({ timestamps: true, collection: 'staff_transfer_requests' })
export class StaffTransferRequest extends Document {
  @Prop({ required: true })
  employeeId: string;

  @Prop({ required: true })
  employeeName: string;

  @Prop({ required: true })
  employeeEmail: string;

  @Prop()
  fromBranchId?: string;

  @Prop({ required: true })
  toBranchId: string;

  @Prop({ required: true })
  requesterId: string;

  @Prop({ required: true })
  requesterName: string;

  @Prop({ required: true, enum: ['pending', 'approved', 'rejected', 'cancelled'], default: 'pending' })
  status: string;

  @Prop()
  note?: string;

  @Prop()
  responseNote?: string;

  @Prop()
  resolvedBy?: string;

  @Prop()
  resolvedAt?: Date;
}

export const StaffTransferRequestSchema = SchemaFactory.createForClass(StaffTransferRequest);
