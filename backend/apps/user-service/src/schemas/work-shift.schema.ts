import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document } from 'mongoose';

@Schema({ timestamps: true, collection: 'work_shifts' })
export class WorkShift extends Document {
  @Prop({ required: true })
  branchId: string;

  @Prop({ required: true })
  name: string;

  @Prop({ required: true })
  startTime: string;

  @Prop({ required: true })
  endTime: string;

  @Prop({ required: true })
  color: string;

  @Prop({ default: true })
  isActive: boolean;
}

export const WorkShiftSchema = SchemaFactory.createForClass(WorkShift);
