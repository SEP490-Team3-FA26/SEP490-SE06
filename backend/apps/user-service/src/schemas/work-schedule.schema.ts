import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document } from 'mongoose';

@Schema({ _id: false })
export class WorkScheduleAssignment {
  @Prop({ required: true })
  date: Date;

  @Prop({ required: true })
  shiftId: string;

  @Prop({ required: true })
  shiftName: string;

  @Prop({ required: true })
  shiftStart: string;

  @Prop({ required: true })
  shiftEnd: string;

  @Prop({ required: true })
  employeeId: string;

  @Prop({ required: true })
  employeeName: string;

  @Prop({ default: '' })
  note: string;
}
export const WorkScheduleAssignmentSchema = SchemaFactory.createForClass(WorkScheduleAssignment);

@Schema({ timestamps: true, collection: 'work_schedules' })
export class WorkSchedule extends Document {
  @Prop({ required: true })
  branchId: string;

  @Prop({ required: true })
  weekStart: Date;

  @Prop({ required: true })
  weekEnd: Date;

  @Prop({ required: true, enum: ['draft', 'published'], default: 'draft' })
  status: string;

  @Prop({ type: [WorkScheduleAssignmentSchema], default: [] })
  assignments: WorkScheduleAssignment[];

  @Prop()
  publishedAt?: Date;

  @Prop()
  publishedBy: string;
}

export const WorkScheduleSchema = SchemaFactory.createForClass(WorkSchedule);
