import { NestFactory } from '@nestjs/core';
import { MicroserviceOptions, Transport } from '@nestjs/microservices';
import { InventoryServiceModule } from './inventory-service.module';

import { TelemetryConsumerModule } from './telemetry/telemetry-consumer.module';

process.on('unhandledRejection', (reason) => {
  console.warn('⚠️ [Inventory MS] Unhandled Rejection:', reason);
});
process.on('uncaughtException', (err) => {
  console.error('⚠️ [Inventory MS] Uncaught Exception:', err);
});

async function bootstrap() {
  process.env.KAFKAJS_NO_PARTITIONER_WARNING = '1';
  const kafkaBrokers = (process.env.KAFKA_BROKERS || 'localhost:9092').split(',');
  const kafkaBaseGroup = process.env.KAFKA_GROUP_ID || 'wdp301-consumers';

  let retries = 20;
  while (retries > 0) {
    try {
      console.log('🔄 Đang kết nối tới Kafka (Inventory MS)...');

      // 1. Khởi động Microservice chính cho nghiệp vụ CRUD / User RPC (Consumer Group: ...-inventory)
      const app = await NestFactory.createMicroservice<MicroserviceOptions>(
        InventoryServiceModule,
        {
          transport: Transport.KAFKA,
          options: {
            client: {
              clientId: 'inventory-crud-service',
              brokers: kafkaBrokers,
              connectionTimeout: 10000,
              retry: { initialRetryTime: 1000, retries: 10 },
              logLevel: 0,
            },
            consumer: {
              groupId: `${kafkaBaseGroup}-inventory`,
            },
            producer: {
              maxInFlightRequests: 1,
              maxMessageBytes: 10485760,
            },
            subscribe: {
              allowAutoTopicCreation: true,
            },
          } as any,
          logger: ['error', 'warn'],
        },
      );
      await app.listen();
      console.log(`🚀 Inventory CRUD Microservice khởi động thành công (Group: ${kafkaBaseGroup}-inventory)!`);

      // 2. Khởi động Microservice riêng biệt cho IoT Telemetry Ingestion (Consumer Group: ...-telemetry)
      // Áp dụng Consumer Group Isolation: Tách riêng luồng dữ liệu stream lưu lượng cao
      // để không gây Head-of-Line Blocking cho các request CRUD của người dùng.
      const telemetryApp = await NestFactory.createMicroservice<MicroserviceOptions>(
        TelemetryConsumerModule,
        {
          transport: Transport.KAFKA,
          options: {
            client: {
              clientId: 'inventory-telemetry-service',
              brokers: kafkaBrokers,
              connectionTimeout: 10000,
              retry: { initialRetryTime: 1000, retries: 10 },
              logLevel: 0,
            },
            consumer: {
              groupId: `${kafkaBaseGroup}-telemetry`,
            },
            producer: {
              maxInFlightRequests: 1,
              maxMessageBytes: 10485760,
            },
            subscribe: {
              allowAutoTopicCreation: true,
            },
          } as any,
          logger: ['error', 'warn'],
        },
      );
      await telemetryApp.listen();
      console.log(`📡 Telemetry Ingestion Microservice khởi động thành công (Group: ${kafkaBaseGroup}-telemetry)!`);

      break;
    } catch (error) {
      console.error('❌ Lỗi khởi động Inventory MS:', error);
      console.log('🔄 Kafka chưa sẵn sàng, đang thử lại sau 5s...');
      retries--;
      if (retries === 0) throw error;
      await new Promise((resolve) => setTimeout(resolve, 5000));
    }
  }
}

bootstrap();
