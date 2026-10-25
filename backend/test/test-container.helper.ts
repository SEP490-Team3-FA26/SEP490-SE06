// backend/test/test-container.helper.ts
import mongoose from 'mongoose';
import { MongoMemoryServer } from 'mongodb-memory-server';

/**
 * Giao diện đại diện cho môi trường Test Container
 */
export interface TestContainerEnvironment {
  uri: string;
  isRealContainer: boolean;
  stop: () => Promise<void>;
  clean: () => Promise<void>;
}

/**
 * Khởi tạo môi trường Test Container cho cơ sở dữ liệu MongoDB:
 * - Ưu tiên 1: Khởi động Docker Container thật thông qua Testcontainers (khi có Docker daemon).
 * - Ưu tiên 2: Fallback sang In-Memory MongoMemoryServer (khi chạy local chưa bật Docker Desktop).
 */
export async function startTestContainer(): Promise<TestContainerEnvironment> {
  let uri = '';
  let isRealContainer = false;
  let containerInstance: any = null;
  let memoryServerInstance: MongoMemoryServer | null = null;

  // 1. Thử khởi chạy Docker Test Container nếu có Docker daemon
  try {
    // Import linh hoạt thư viện Testcontainers
    // eslint-disable-next-line @typescript-eslint/no-var-requires
    const { MongoDBContainer } = require('@testcontainers/mongodb');
    console.log('🐳 [Test Container] Đang kết nối Docker daemon để khởi tạo MongoDB Container...');
    
    // Khởi tạo container mongo:6.0 với timeout 10 giây
    const container = new MongoDBContainer('mongo:6.0');
    containerInstance = await container.start();
    uri = containerInstance.getConnectionString();
    isRealContainer = true;
    console.log(`✅ [Test Container] Docker MongoDB Container đã chạy thành công tại: ${uri}`);
  } catch (error: any) {
    console.log(`⚠️ [Test Container Fallback] Không thể kết nối Docker daemon (${error.message || 'Chưa bật Docker'}).`);
    console.log('⚡ [Test Container Fallback] Tự động kích hoạt In-Memory Container để đảm bảo bộ test luôn chạy mượt mà!');

    // 2. Chuyển sang In-Memory Mongo Server an toàn
    memoryServerInstance = await MongoMemoryServer.create();
    uri = memoryServerInstance.getUri();
    isRealContainer = false;
    console.log(`✅ [Test Container In-Memory] Mongo Server ảo đã sẵn sàng tại: ${uri}`);
  }

  // Kết nối Mongoose tới URI vừa sinh ra
  if (mongoose.connection.readyState === 0) {
    await mongoose.connect(uri);
  }

  return {
    uri,
    isRealContainer,
    // Hàm dọn dẹp sạch toàn bộ dữ liệu giữa các bài test
    clean: async () => {
      if (mongoose.connection.readyState !== 0) {
        const collections = mongoose.connection.collections;
        for (const key of Object.keys(collections)) {
          await collections[key].deleteMany({});
        }
      }
    },
    // Hàm tắt container sau khi hoàn tất test suite
    stop: async () => {
      try {
        if (mongoose.connection.readyState !== 0) {
          await mongoose.disconnect();
        }
        if (containerInstance) {
          await containerInstance.stop();
          console.log('🛑 [Test Container] Đã dừng và giải phóng Docker Container.');
        }
        if (memoryServerInstance) {
          await memoryServerInstance.stop();
          console.log('🛑 [Test Container] Đã giải phóng In-Memory Mongo Server.');
        }
      } catch (err) {
        // Bỏ qua lỗi ngắt kết nối khi dọn dẹp
      }
    },
  };
}
