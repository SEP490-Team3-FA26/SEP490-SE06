import { ensureKafkaTopicsExist, ensuredTopicsCache } from '../../../apps/api-gateway/src/common/kafka.helper';
import { Kafka } from 'kafkajs';

jest.mock('kafkajs');

describe('KafkaHelper - ensureKafkaTopicsExist [Test-Coupled Mandate]', () => {
  let mockAdmin: any;
  let mockKafka: any;

  beforeEach(() => {
    jest.clearAllMocks();
    ensuredTopicsCache.clear();

    mockAdmin = {
      connect: jest.fn().mockResolvedValue(undefined),
      createTopics: jest.fn().mockResolvedValue(true),
      disconnect: jest.fn().mockResolvedValue(undefined),
    };

    mockKafka = {
      admin: jest.fn().mockReturnValue(mockAdmin),
    };

    (Kafka as unknown as jest.Mock).mockImplementation(() => mockKafka);
  });

  describe('[Normal Values] - Luồng chuẩn & Tối ưu hóa Cache', () => {
    it('phải tạo topic và reply topic tương ứng với cờ waitForLeaders: false', async () => {
      const topics = ['inventory.product.create', 'user.profile.update'];

      await ensureKafkaTopicsExist(topics);

      expect(mockKafka.admin).toHaveBeenCalledTimes(1);
      expect(mockAdmin.connect).toHaveBeenCalledTimes(1);
      expect(mockAdmin.createTopics).toHaveBeenCalledWith({
        topics: [
          { topic: 'inventory.product.create' },
          { topic: 'inventory.product.create.reply' },
          { topic: 'user.profile.update' },
          { topic: 'user.profile.update.reply' },
        ],
        waitForLeaders: false,
      });
      expect(mockAdmin.disconnect).toHaveBeenCalledTimes(1);

      // Kiểm tra cache đã được lưu
      expect(ensuredTopicsCache.has('inventory.product.create')).toBe(true);
      expect(ensuredTopicsCache.has('user.profile.update')).toBe(true);
    });

    it('không được gọi lại Kafka Admin nếu tất cả topics đã có trong cache (Chống nghẽn CPU/Network)', async () => {
      const topics = ['order.checkout.create'];

      // Lần gọi 1: Chưa có trong cache -> Gọi Kafka Admin
      await ensureKafkaTopicsExist(topics);
      expect(mockAdmin.createTopics).toHaveBeenCalledTimes(1);

      // Lần gọi 2: Đã có trong cache -> Bỏ qua ngay lập tức, không gọi admin
      await ensureKafkaTopicsExist(topics);
      expect(mockAdmin.createTopics).toHaveBeenCalledTimes(1); // Vẫn chỉ là 1 lần
    });
  });

  describe('[Boundary Values] - Giá trị biên & Dữ liệu đặc thù', () => {
    it('phải kết thúc an toàn khi truyền mảng rỗng []', async () => {
      await ensureKafkaTopicsExist([]);

      expect(mockKafka.admin).not.toHaveBeenCalled();
      expect(mockAdmin.createTopics).not.toHaveBeenCalled();
    });

    it('phải lọc bỏ các topic rỗng hoặc trùng lặp trong cùng danh sách', async () => {
      const topics = ['inventory.item.get', '', 'inventory.item.get'];

      await ensureKafkaTopicsExist(topics as string[]);

      expect(mockAdmin.createTopics).toHaveBeenCalledWith({
        topics: [
          { topic: 'inventory.item.get' },
          { topic: 'inventory.item.get.reply' },
        ],
        waitForLeaders: false,
      });
      expect(ensuredTopicsCache.size).toBe(1);
    });
  });

  describe('[Abnormal Values] - Dữ liệu bất thường & Xử lý sự cố Kafka', () => {
    it('phải bắt lỗi ngoại lệ an toàn khi Kafka Admin connect bị lỗi, không làm sập ứng dụng', async () => {
      const consoleSpy = jest.spyOn(console, 'warn').mockImplementation(() => {});
      mockAdmin.connect.mockRejectedValueOnce(new Error('Connection timeout to broker kafka:29092'));

      await expect(ensureKafkaTopicsExist(['critical.topic'])).resolves.not.toThrow();

      expect(consoleSpy).toHaveBeenCalledWith(
        expect.stringContaining('[subscribeToKafkaTopics] Cảnh báo kiểm tra topic qua Kafka Admin: Connection timeout'),
      );
      consoleSpy.mockRestore();
    });

    it('phải xử lý an toàn khi admin.createTopics gặp lỗi từ broker', async () => {
      const consoleSpy = jest.spyOn(console, 'warn').mockImplementation(() => {});
      mockAdmin.createTopics.mockRejectedValueOnce(new Error('Topic exists or Broker failure'));

      await expect(ensureKafkaTopicsExist(['failure.topic'])).resolves.not.toThrow();

      expect(mockAdmin.disconnect).not.toHaveBeenCalled();
      consoleSpy.mockRestore();
    });
  });
});
