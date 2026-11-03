import { Module } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { MongooseModule } from '@nestjs/mongoose';
import { TelemetryModule } from './telemetry.module';

/**
 * Module chuyên biệt cho Telemetry Microservice
 * Chạy độc lập với Consumer Group riêng (Consumer Group Isolation Pattern)
 * để tránh tắc nghẽn hàng đợi (Head-of-Line Blocking) với các luồng CRUD của User.
 */
@Module({
  imports: [
    ConfigModule.forRoot({ isGlobal: true }),
    MongooseModule.forRootAsync({
      imports: [ConfigModule],
      useFactory: async (configService: ConfigService) => ({
        uri: configService.get<string>('MONGODB_URI'),
      }),
      inject: [ConfigService],
    }),
    TelemetryModule,
  ],
})
export class TelemetryConsumerModule {}
