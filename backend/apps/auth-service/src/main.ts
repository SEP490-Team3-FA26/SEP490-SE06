import { NestFactory } from '@nestjs/core';
import { MicroserviceOptions, Transport } from '@nestjs/microservices';
import { getModelToken } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import * as bcrypt from 'bcryptjs';
import { AuthServiceAppModule } from './app.module';
import { User, UserRole } from './auth/user.schema';

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

      // --- SEED DUMMY ACCOUNTS ---
      if (process.env.NODE_ENV !== 'production') {
        const userModel = app.get<Model<User>>(getModelToken(User.name));
        const dummyUsers = [
          // 1. Quản trị hệ thống & Kho tổng GSP
          { email: 'admin@vinapharmacy.com', role: UserRole.ADMIN, fullName: 'Admin Hệ Thống', phone: '0901111222', address: 'Số 182 Lê Duẩn, P. Nguyễn Du, Q. Hai Bà Trưng, TP. Hà Nội', branchId: null },
          { email: 'director@vinapharmacy.com', role: UserRole.HEAD_BRANCH, fullName: 'Giám Đốc Chuỗi Chi Nhánh', phone: '0902222333', address: 'Số 182 Lê Duẩn, P. Nguyễn Du, Q. Hai Bà Trưng, TP. Hà Nội', branchId: null },
          { email: 'warehouse@vinapharmacy.com', role: UserRole.WAREHOUSE, fullName: 'Quản Lý Kho Tổng GSP', phone: '0903333444', address: 'Kho Tổng KCN Sài Đồng B, Q. Long Biên, TP. Hà Nội', branchId: 'CENTRAL_WH' },

          // 2. Chi nhánh 01 - Hoàn Kiếm (BR-001)
          { email: 'manager@vinapharmacy.com', role: UserRole.BRANCH, fullName: 'Nguyễn Thu Trang (Quản Lý CN1)', phone: '0904444551', address: 'Số 182 Lê Duẩn, P. Nguyễn Du, Q. Hai Bà Trưng, TP. Hà Nội', branchId: 'BR-001' },
          { email: 'pharmacist@vinapharmacy.com', role: UserRole.PHARMACIST, fullName: 'DS. Lê Hải Yến (Dược Sĩ CN1)', phone: '0905555661', address: 'Số 182 Lê Duẩn, P. Nguyễn Du, Q. Hai Bà Trưng, TP. Hà Nội', branchId: 'BR-001' },

          // 3. Chi nhánh 02 - Cầu Giấy (BR-002)
          { email: 'manager.cn2@vinapharmacy.com', role: UserRole.BRANCH, fullName: 'Trần Minh Đức (Quản Lý CN2)', phone: '0904444552', address: 'Số 234 Đường Cầu Giấy, P. Dịch Vọng, Q. Cầu Giấy, TP. Hà Nội', branchId: 'BR-002' },
          { email: 'pharmacist.cn2@vinapharmacy.com', role: UserRole.PHARMACIST, fullName: 'DS. Vũ Hoàng Long (Dược Sĩ CN2)', phone: '0905555662', address: 'Số 234 Đường Cầu Giấy, P. Dịch Vọng, Q. Cầu Giấy, TP. Hà Nội', branchId: 'BR-002' },

          // 4. Chi nhánh 03 - Đống Đa (BR-003)
          { email: 'manager.cn3@vinapharmacy.com', role: UserRole.BRANCH, fullName: 'Phạm Thị Lan (Quản Lý CN3)', phone: '0904444553', address: 'Số 98 Thái Hà, P. Trung Liệt, Q. Đống Đa, TP. Hà Nội', branchId: 'BR-003' },
          { email: 'pharmacist.cn3@vinapharmacy.com', role: UserRole.PHARMACIST, fullName: 'DS. Đỗ Kim Dung (Dược Sĩ CN3)', phone: '0905555663', address: 'Số 98 Thái Hà, P. Trung Liệt, Q. Đống Đa, TP. Hà Nội', branchId: 'BR-003' },

          // 5. Chi nhánh 04 - Ba Đình (BR-004)
          { email: 'manager.cn4@vinapharmacy.com', role: UserRole.BRANCH, fullName: 'Lê Hoàng Nam (Quản Lý CN4)', phone: '0904444554', address: 'Số 56 Kim Mã, P. Kim Mã, Q. Ba Đình, TP. Hà Nội', branchId: 'BR-004' },
          { email: 'pharmacist.cn4@vinapharmacy.com', role: UserRole.PHARMACIST, fullName: 'DS. Hoàng Tuấn Kiệt (Dược Sĩ CN4)', phone: '0905555664', address: 'Số 56 Kim Mã, P. Kim Mã, Q. Ba Đình, TP. Hà Nội', branchId: 'BR-004' },

          // 6. Khách hàng trực tuyến (Online Customers)
          { email: 'user@vinapharmacy.com', role: UserRole.USER, fullName: 'Nguyễn Văn An (Khách Hàng)', phone: '0987654321', address: 'Số 45 Tràng Tiền, P. Tràng Tiền, Q. Hoàn Kiếm, TP. Hà Nội', branchId: null },
          { email: 'user2@vinapharmacy.com', role: UserRole.USER, fullName: 'Trần Thị Mai (Khách Hàng)', phone: '0987654322', address: 'Số 12 Chùa Bộc, P. Quang Trung, Q. Đống Đa, TP. Hà Nội', branchId: null },
        ];

        const passwordHash = await bcrypt.hash('123456', 10);

        for (const dummy of dummyUsers) {
          const exists = await userModel.findOne({ email: dummy.email });
          if (!exists) {
            await userModel.create({
              ...dummy,
              passwordHash,
              isEmailVerified: true,
            });
            console.log(`🌱 [Seed] Đã tạo tài khoản: ${dummy.email} / Mật khẩu: 123456`);
          } else {
            await userModel.updateOne(
              { _id: exists._id },
              { $set: { address: dummy.address, phone: dummy.phone, fullName: dummy.fullName, branchId: dummy.branchId } }
            );
          }
        }
      } else {
        console.log('🛡️ [Seed] Bỏ qua seed tài khoản test trong môi trường PRODUCTION.');
      }
      // ---------------------------


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
