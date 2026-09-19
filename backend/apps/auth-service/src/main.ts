import { NestFactory } from '@nestjs/core';
import { MicroserviceOptions, Transport } from '@nestjs/microservices';
import { getModelToken } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import * as bcrypt from 'bcryptjs';
import { AuthServiceAppModule } from './app.module';
import { User, UserRole } from './auth/user.schema';

process.on('unhandledRejection', (reason) => {
  console.warn('⚠️ [Auth MS] Unhandled Rejection:', reason);
});
process.on('uncaughtException', (err) => {
  console.error('⚠️ [Auth MS] Uncaught Exception:', err);
});

async function bootstrap() {
  process.env.KAFKAJS_NO_PARTITIONER_WARNING = '1';
  let retries = 10;
  while (retries > 0) {
    try {
      console.log('🔄 Đang kết nối tới Kafka...');
      const app = await NestFactory.createMicroservice<MicroserviceOptions>(
        AuthServiceAppModule,
        {
          transport: Transport.KAFKA,
          options: {
            client: {
              clientId: 'auth-service',
              brokers: (process.env.KAFKA_BROKERS || 'localhost:9092').split(','),
              connectionTimeout: 10000,
              retry: { initialRetryTime: 1000, retries: 10 },
              logLevel: 0,
            },
            consumer: {
              // Consumer Group ID — tất cả các pod cùng group sẽ chia nhau xử lý message
              groupId: (process.env.KAFKA_GROUP_ID || 'wdp301-consumers') + '-auth',
            },
            subscribe: {
              allowAutoTopicCreation: true,
            },
          } as any,
          logger: ['error', 'warn'],
        },
      );

      await app.listen();
      console.log('🚀 Auth Microservice khởi động thành công!');
      break;
    } catch (error) {
      console.log('🔄 Kafka chưa sẵn sàng, đang thử lại sau 5s...');
      retries--;
      if (retries === 0) throw error;
      await new Promise((resolve) => setTimeout(resolve, 5000));
    }
  }
}

bootstrap();
