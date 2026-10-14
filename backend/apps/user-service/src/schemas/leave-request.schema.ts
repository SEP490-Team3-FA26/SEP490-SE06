import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document, Types } from 'mongoose';

export type LeaveRequestDocument = LeaveRequest & Document;

export enum LeaveType {
  ANNUAL_PAID = 'ANNUAL_PAID',
  SICK_LEAVE = 'SICK_LEAVE',
  UNPAID = 'UNPAID',
  SPECIAL_PAID = 'SPECIAL_PAID',
}

export enum LeaveStatus {
  PENDING = 'PENDING',
  APPROVED = 'APPROVED',
  REJECTED = 'REJECTED',
  CANCELLED = 'CANCELLED',
}

@Schema({ timestamps: true, collection: 'leave_requests' })
export class LeaveRequest extends Document {
  @Prop({ required: true, index: true })
  branchId: string;

  @Prop({ type: Types.ObjectId, ref: 'User', required: true, index: true })
  requesterId: Types.ObjectId;

  @Prop({ required: true })
  requesterName: string;

  @Prop({ required: true })
  requesterRole: string;

  @Prop({ required: true, enum: LeaveType })
  leaveType: LeaveType;

  @Prop({ required: true, index: true })
  shiftDate: string; // YYYY-MM-DD

  @Prop({ required: true })
  shiftId: string;

  @Prop({ required: true })
  shiftName: string;

  @Prop({ required: true })
  startTime: string;

  @Prop({ required: true })
  endTime: string;

  @Prop({ required: true, default: 1 })
  shiftsCount: number;

  @Prop({ required: true })
  reason: string;

  @Prop({ default: null })
  attachmentUrl?: string;

  @Prop({ required: true, enum: LeaveStatus, default: LeaveStatus.PENDING, index: true })
  status: LeaveStatus;

  @Prop({ default: null })
  managerId?: string;

  @Prop({ default: null })
  managerName?: string;

  @Prop({ default: null })
  managerNote?: string;

  @Prop({ default: null })
  managerRespondedAt?: Date;

  @Prop({ default: false })
  isWarningGppUnderstaffed?: boolean;

  @Prop({ default: null })
  cancelReason?: string;

  @Prop({ default: null })
  cancelledAt?: Date;
}

export const LeaveRequestSchema = SchemaFactory.createForClass(LeaveRequest);

LeaveRequestSchema.index({ branchId: 1, status: 1 });
LeaveRequestSchema.index({ requesterId: 1, shiftDate: 1 });
LeaveRequestSchema.index({ branchId: 1, shiftDate: 1, shiftId: 1 });
