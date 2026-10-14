import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document } from 'mongoose';

export type SensorStationDocument = SensorStation & Document;

@Schema({ timestamps: true, collection: 'sensor_stations' })
export class SensorStation {
  @Prop({ type: String, required: true, unique: true, index: true })
  deviceId: string;

  @Prop({ type: String })
  name?: string;

  @Prop({ type: String, default: 'WAREHOUSE' })
  targetType?: string;

  @Prop({ type: String, default: 'CENTRAL_WH' })
  targetId?: string;

  @Prop({ type: Number, default: 15.0 })
  tempMin?: number;

  @Prop({ type: Number, default: 40.0 })
  tempMax?: number;

  @Prop({ type: Number, default: 70.0 })
  humMax?: number;

  @Prop({ type: Boolean, default: true })
  isActive?: boolean;
}

export const SensorStationSchema = SchemaFactory.createForClass(SensorStation);
