import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document } from 'mongoose';

@Schema({ timestamps: true, collection: 'sensor_stations' })
export class SensorStation extends Document {
  @Prop({ type: String, required: true, unique: true, index: true })
  deviceId: string; // ESP32S3_404CCA44C814

  @Prop({ type: String, required: true, default: 'Trạm Quan Trắc Kho Tổng GSP - Khu A' })
  name: string;

  @Prop({ type: String, default: 'WAREHOUSE', enum: ['WAREHOUSE', 'BRANCH'] })
  targetType: string;

  @Prop({ type: String, default: 'CENTRAL_WH', index: true })
  targetId: string; // CENTRAL_WH

  @Prop({ type: Number, default: 15.0 })
  tempMin: number; // Chuẩn GSP tối thiểu 15°C

  @Prop({ type: Number, default: 25.0 })
  tempMax: number; // Chuẩn GSP tối đa 25°C (hoặc 30°C tùy kho)

  @Prop({ type: Number, default: 70.0 })
  humMax: number; // Chuẩn GSP độ ẩm tối đa 70% RH

  @Prop({ type: Boolean, default: true })
  isActive: boolean;

  @Prop({ type: Date })
  lastSeenAt: Date;

  @Prop({ type: Object })
  lastMetrics: any;
}

export const SensorStationSchema = SchemaFactory.createForClass(SensorStation);
