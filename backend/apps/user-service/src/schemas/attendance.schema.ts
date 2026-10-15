import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document, Types } from 'mongoose';

export type AttendanceDocument = Attendance & Document;

export enum AttendanceStatus {
  CHECKED_IN = 'CHECKED_IN',
  COMPLETED = 'COMPLETED',
  LATE = 'LATE',
  ABSENT = 'ABSENT',
  ON_LEAVE_PAID = 'ON_LEAVE_PAID',
  ON_LEAVE_UNPAID = 'ON_LEAVE_UNPAID',
}

@Schema({ timestamps: true, collection: 'attendances' })
export class Attendance extends Document {
  @Prop({ type: Types.ObjectId, ref: 'User', required: true, index: true })
  employeeId: Types.ObjectId;

  @Prop({ required: true })
  employeeName: string;

  @Prop({ required: true })
  employeeRole: string;

  @Prop({ required: true, index: true })
  branchId: string;

  @Prop({ required: true })
  shiftId: string;

  @Prop({ required: true })
  shiftName: string;

  @Prop({ required: true, index: true })
  date: string; // YYYY-MM-DD

  @Prop({ default: null })
  checkInTime?: Date;

  @Prop({ default: null })
  checkInLatitude?: number;

  @Prop({ default: null })
  checkInLongitude?: number;

  @Prop({ default: 0 })
  checkInDistanceMeters?: number;

  @Prop({ default: null })
  checkOutTime?: Date;

  @Prop({ default: null })
  checkOutLatitude?: number;

  @Prop({ default: null })
  checkOutLongitude?: number;

  @Prop({ required: true, enum: AttendanceStatus, default: AttendanceStatus.CHECKED_IN, index: true })
  status: AttendanceStatus;

  @Prop({ default: false })
  isMockLocation: boolean;

  @Prop({ default: '' })
  note?: string;
}

export const AttendanceSchema = SchemaFactory.createForClass(Attendance);
AttendanceSchema.index({ employeeId: 1, date: 1, shiftId: 1 }, { unique: false });
AttendanceSchema.index({ branchId: 1, date: 1 });
