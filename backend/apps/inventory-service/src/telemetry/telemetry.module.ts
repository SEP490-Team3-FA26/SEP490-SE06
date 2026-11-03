import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { SensorTelemetry, SensorTelemetrySchema } from './schemas/sensor-telemetry.schema';
import { SensorStation, SensorStationSchema } from './schemas/sensor-station.schema';
import { TelemetryService } from './telemetry.service';
import { TelemetryController } from './telemetry.controller';

@Module({
  imports: [
    MongooseModule.forFeature([
      { name: SensorTelemetry.name, schema: SensorTelemetrySchema },
      { name: SensorStation.name, schema: SensorStationSchema },
    ]),
  ],
  controllers: [TelemetryController],
  providers: [TelemetryService],
  exports: [TelemetryService],
})
export class TelemetryModule {}
