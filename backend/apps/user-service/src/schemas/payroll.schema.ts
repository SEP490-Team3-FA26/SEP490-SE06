import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document, Types } from 'mongoose';

export type PayrollDocument = Payroll & Document;

export enum PayrollStatus {
  DRAFT = 'DRAFT',
  SUBMITTED = 'SUBMITTED',
  APPROVED = 'APPROVED',
  PAID = 'PAID',
}

@Schema({ _id: false })
export class PayrollItem {
  @Prop({ type: Types.ObjectId, ref: 'User', required: true })
  employeeId: Types.ObjectId;

  @Prop({ required: true })
  employeeName: string;

  @Prop({ required: true })
  role: string;

  @Prop({ required: true, default: 7500000 })
  baseSalary: number;

  @Prop({ default: 26 })
  standardShifts: number;

  @Prop({ default: 0 })
  actualShifts: number;

  @Prop({ default: 0 })
  missingShifts: number;

  @Prop({ default: 0 })
  lateMinutes: number;

  @Prop({ default: 0 })
  otShifts: number;

  @Prop({ default: 0 })
  standardSalary: number;

  @Prop({ default: 0 })
  otSalary: number;

  @Prop({ default: 0 })
  certificateAllowance: number;

  @Prop({ default: 0 })
  picAllowance: number;

  @Prop({ default: 50000 })
  mealAllowanceRate: number;

  @Prop({ default: 0 })
  mealAllowance: number;

  @Prop({ default: 0 })
  shiftRate: number;

  @Prop({ default: 0 })
  nightShiftAllowance: number;

  @Prop({ default: 0 })
  personalSalesRevenue: number;

  @Prop({ default: 1.0 })
  commissionRate: number; // 1.0%

  @Prop({ default: 0 })
  commissionAmount: number;

  @Prop({ default: 0 })
  branchBonus: number;

  @Prop({ default: 0 })
  penalties: number;

  @Prop({ default: 0 })
  manualAdjustment: number;

  @Prop({ default: 0 })
  grossSalary: number;

  @Prop({ default: 0 })
  netSalary: number;

  @Prop({ default: '' })
  adjustmentNote: string;
}

export const PayrollItemSchema = SchemaFactory.createForClass(PayrollItem);

@Schema({ timestamps: true, collection: 'payrolls' })
export class Payroll extends Document {
  @Prop({ required: true, index: true })
  branchId: string;

  @Prop({ required: true })
  month: number; // 1-12

  @Prop({ required: true })
  year: number;

  @Prop({ required: true, enum: PayrollStatus, default: PayrollStatus.DRAFT, index: true })
  status: PayrollStatus;

  @Prop({ default: 0 })
  totalGross: number;

  @Prop({ default: 0 })
  totalNet: number;

  @Prop({ default: 50000 })
  mealAllowanceRate: number;

  @Prop({ type: [PayrollItemSchema], default: [] })
  items: PayrollItem[];

  @Prop({ type: Types.ObjectId, ref: 'User', default: null })
  calculatedBy?: Types.ObjectId;

  @Prop({ default: null })
  calculatedByName?: string;

  @Prop({ default: null })
  submittedAt?: Date;

  @Prop({ type: Types.ObjectId, ref: 'User', default: null })
  submittedBy?: Types.ObjectId;

  @Prop({ default: null })
  approvedAt?: Date;

  @Prop({ type: Types.ObjectId, ref: 'User', default: null })
  approvedBy?: Types.ObjectId;

  @Prop({ default: null })
  paidAt?: Date;

  @Prop({ default: '' })
  notes?: string;
}

export const PayrollSchema = SchemaFactory.createForClass(Payroll);
PayrollSchema.index({ branchId: 1, month: 1, year: 1 }, { unique: true });
