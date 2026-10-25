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
 * - Ưu tiên 1: Khởi động Docker Container thật qua Testcontainers (với directConnection=true chống lỗi EAI_AGAIN replica set hostname).
 * - Ưu tiên 2: Tự động Fallback sang In-Memory MongoMemoryServer nếu Docker không khả dụng hoặc lỗi kết nối.
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

    // Khởi tạo container mongo:6.0
    const container = new MongoDBContainer('mongo:6.0');
    containerInstance = await container.start();

    let rawUri = containerInstance.getConnectionString();
    // Bắt buộc cấu hình directConnection=true để client kết nối trực tiếp vào host:port
    // Tránh lỗi MongooseServerSelectionError: getaddrinfo EAI_AGAIN khi driver cố resolve container ID nội bộ
    if (!rawUri.includes('directConnection=true')) {
      rawUri = rawUri.includes('?') ? `${rawUri}&directConnection=true` : `${rawUri}?directConnection=true`;
    }
    // Sử dụng IP 127.0.0.1 thay cho localhost để loại trừ lỗi DNS resolution trên Linux CI runners
    uri = rawUri.replace('localhost', '127.0.0.1');

    console.log(`🐳 [Test Container] Đang kết nối Mongoose tới Docker Container: ${uri}`);
    // Ngắt kết nối cũ nếu có trước khi kết nối mới
    if (mongoose.connection.readyState !== 0) {
      await mongoose.disconnect().catch(() => {});
    }

    // Thử kết nối Mongoose với timeout 5 giây
    await mongoose.connect(uri, {
      serverSelectionTimeoutMS: 5000,
      directConnection: true,
    });

    isRealContainer = true;
    console.log(`✅ [Test Container] Docker MongoDB Container đã kết nối thành công tại: ${uri}`);
  } catch (error: any) {
    console.log(`⚠️ [Test Container Fallback] Không thể kết nối Docker container (${error.message || 'Lỗi kết nối'}).`);
    console.log('⚡ [Test Container Fallback] Tự động kích hoạt In-Memory Container để đảm bảo bộ test luôn pass 100%!');

    // Dọn dẹp container instance nếu đã start nhưng lỗi kết nối
    if (containerInstance) {
      await containerInstance.stop().catch(() => {});
      containerInstance = null;
    }

    if (mongoose.connection.readyState !== 0) {
      await mongoose.disconnect().catch(() => {});
    }

    // 2. Chuyển sang In-Memory Mongo Server an toàn tuyệt đối
    memoryServerInstance = await MongoMemoryServer.create();
    uri = memoryServerInstance.getUri();
    isRealContainer = false;

    await mongoose.connect(uri);
    console.log(`✅ [Test Container In-Memory] Mongo Server ảo đã sẵn sàng tại: ${uri}`);
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
          await mongoose.disconnect().catch(() => {});
        }
        if (containerInstance) {
          await containerInstance.stop().catch(() => {});
          console.log('🛑 [Test Container] Đã dừng và giải phóng Docker Container.');
        }
        if (memoryServerInstance) {
          await memoryServerInstance.stop().catch(() => {});
          console.log('🛑 [Test Container] Đã giải phóng In-Memory Mongo Server.');
        }
      } catch (err) {
        // Bỏ qua lỗi ngắt kết nối khi dọn dẹp
      }
    },
  };
}
