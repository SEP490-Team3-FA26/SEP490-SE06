import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document } from 'mongoose';

@Schema({ timestamps: true, collection: 'sensor_telemetries' })
export class SensorTelemetry extends Document {
  @Prop({ type: String, required: true, index: true })
  deviceId: string;

  @Prop({ type: String, default: 'WAREHOUSE', enum: ['WAREHOUSE', 'BRANCH'], index: true })
  targetType: string;

  @Prop({ type: String, default: 'CENTRAL_WH', index: true })
  targetId: string; // CENTRAL_WH hoặc mã chi nhánh BR-001

  @Prop({ type: Number, required: true, index: true })
  timestamp: number; // Unix epoch tính bằng giây

  @Prop({ type: Date, required: true, index: true })
  measuredAt: Date;

  @Prop({ type: Number, default: 0 })
  seq: number;

  @Prop({
    type: {
      temperature: { type: Number, default: 0 },
      humidity: { type: Number, default: 0 },
      dewPoint: { type: Number, default: 0 },
      vpd: { type: Number, default: 0 },
    },
    _id: false,
  })
  metrics: {
    temperature: number;
    humidity: number;
    dewPoint: number;
    vpd: number;
  };

  @Prop({
    type: {
      chipTemp: { type: Number, default: 0 },
      cpuLoad: { type: Number, default: 0 },
      cpu0: { type: Number, default: 0 },
      cpu1: { type: Number, default: 0 },
      freeHeap: { type: Number, default: 0 },
      uptimeSec: { type: Number, default: 0 },
      wifiRssi: { type: Number, default: 0 },
    },
    _id: false,
  })
  diagnostics: {
    chipTemp: number;
    cpuLoad: number;
    cpu0: number;
    cpu1: number;
    freeHeap: number;
    uptimeSec: number;
    wifiRssi: number;
  };

  @Prop({
    type: {
      alert: { type: Boolean, default: false },
      sensorValid: { type: Boolean, default: true },
    },
    _id: false,
  })
  status: {
    alert: boolean;
    sensorValid: boolean;
  };
}

export const SensorTelemetrySchema = SchemaFactory.createForClass(SensorTelemetry);

// Tối ưu hóa truy vấn chuỗi thời gian vẽ biểu đồ
SensorTelemetrySchema.index({ deviceId: 1, timestamp: -1 });
SensorTelemetrySchema.index({ targetId: 1, measuredAt: -1 });
SensorTelemetrySchema.index({ deviceId: 1, seq: -1 });

// Tự động dọn dẹp các bản ghi cũ hơn 7 ngày (7 * 24 * 3600 = 604800 giây)
SensorTelemetrySchema.index({ measuredAt: 1 }, { expireAfterSeconds: 604800 });
