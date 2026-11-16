import { Test, TestingModule } from '@nestjs/testing';
import { CACHE_MANAGER } from '@nestjs/cache-manager';
import { MedicineController } from '../../../apps/api-gateway/src/controllers/medicine.controller';
import { of } from 'rxjs';

/**
 * BỘ KIỂM THỬ CONTROLLER API GATEWAY: TÌM KIẾM THUỐC TẠI CHI NHÁNH
 * (DEDICATED BRANCH MEDICINE SEARCH CONTROLLER SPEC)
 *
 * Mục tiêu: Bảo vệ vĩnh viễn core logic của API Gateway, ngăn ngừa hồi quy (regression),
 * đảm bảo đồng đội trong team không vô tình làm hỏng cơ chế Kafka Request-Response và Redis Cache-Aside.
 *
 * Phân chia đầy đủ 3 nhóm giá trị chuẩn:
 * 1. [Normal Values]: Luồng chuẩn, gửi đúng topic Kafka và cơ chế Cache-Aside (Hit / Miss).
 * 2. [Boundary Values]: Giá trị biên cho phân trang page/limit, chuỗi tìm kiếm rỗng/khoảng trắng.
 * 3. [Abnormal Values]: Dữ liệu dị thường, Redis Cache lỗi không làm sập luồng Kafka.
 */
describe('MedicineController - Branch Medicine Search API (API Gateway)', () => {
  let controller: MedicineController;

  const mockInventoryClient = {
    emit: jest.fn(),
    send: jest.fn(),
    subscribeToResponseOf: jest.fn(),
    connect: jest.fn().mockResolvedValue(null),
  };

  const mockCacheManager = {
    get: jest.fn(),
    set: jest.fn(),
    del: jest.fn(),
  };

  const mockSearchResult = {
    data: [
      {
        id: '66a01234567890abcdef1001',
        name: 'Cao dán Salonpas Diclofenac Patch Hisamitsu',
        price: 25000,
        stock: 404, // TỒN KHO CHI NHÁNH CHUẨN XÁC
        status: 'In Stock',
      },
    ],
    total: 1,
    page: 1,
    limit: 10,
    totalPages: 1,
  };

  beforeEach(async () => {
    jest.clearAllMocks();

    const module: TestingModule = await Test.createTestingModule({
      controllers: [MedicineController],
      providers: [
        { provide: 'INVENTORY_SERVICE', useValue: mockInventoryClient },
        { provide: CACHE_MANAGER, useValue: mockCacheManager },
      ],
    }).compile();

    controller = module.get<MedicineController>(MedicineController);
  });

  // =========================================================================
  // 1. [Normal Values] Luồng nghiệp vụ chuẩn
  // =========================================================================
  describe('1. [Normal Values] Luồng chuẩn - Ủy thác Kafka & Redis Cache-Aside', () => {
    it('[Normal] Khi Cache Miss, phải gửi message tới Kafka topic "inventory.medicine.branch_search" và lưu cache 60s', async () => {
      // 1. Giả lập Cache Miss
      mockCacheManager.get.mockResolvedValue(null);
      // 2. Giả lập Kafka trả kết quả thành công
      mockInventoryClient.send.mockReturnValue(of(mockSearchResult));

      const result = await controller.searchBranchMedicines(
        'BR-001',
        'Salonpas Diclofenac',
        1,
        10,
        true,
        'Miếng dán giảm đau',
        'NON_PRESCRIPTION',
      );

      // Kiểm tra: Phải kiểm tra cache trước
      expect(mockCacheManager.get).toHaveBeenCalledWith(
        expect.stringContaining('medicines:branch-search:BR-001:Salonpas Diclofenac:1:10:true'),
      );

      // Kiểm tra: Phải bắn đúng Kafka topic chuyên biệt của chi nhánh
      expect(mockInventoryClient.send).toHaveBeenCalledWith(
        'inventory.medicine.branch_search',
        expect.objectContaining({
          branchId: 'BR-001',
          search: 'Salonpas Diclofenac',
          page: 1,
          limit: 10,
          branchStockOnly: true,
          category: 'Miếng dán giảm đau',
          classification: 'NON_PRESCRIPTION',
        }),
      );

      // Kiểm tra: Phải lưu kết quả vào Redis Cache với TTL 60 giây (60000ms)
      expect(mockCacheManager.set).toHaveBeenCalledWith(
        expect.stringContaining('medicines:branch-search:BR-001:Salonpas Diclofenac'),
        mockSearchResult,
        60000,
      );

      // Kiểm tra: Kết quả trả về cho Client giữ nguyên tồn kho 404 hộp
      expect(result).toEqual(mockSearchResult);
      expect(result.data[0].stock).toBe(404);
    });

    it('[Normal] Khi Cache Hit, phải trả ngay kết quả từ Redis mà KHÔNG được gọi vào Kafka', async () => {
      // Giả lập Cache Hit trong Redis
      mockCacheManager.get.mockResolvedValue(mockSearchResult);

      const result = await controller.searchBranchMedicines(
        'BR-001',
        'Salonpas Diclofenac',
        1,
        10,
        true,
      );

      // Kiểm tra: Trả dữ liệu từ Cache
      expect(result).toEqual(mockSearchResult);
      // Tuyệt đối không làm nghẽn Kafka broker khi đã có Cache
      expect(mockInventoryClient.send).not.toHaveBeenCalled();
    });
  });

  // =========================================================================
  // 2. [Boundary Values] Giá trị biên & Chuẩn hóa tham số
  // =========================================================================
  describe('2. [Boundary Values] Giá trị biên cho phân trang & làm sạch tham số', () => {
    it('[Boundary] Tham số page <= 0 phải được chuẩn hóa an toàn về 1, limit > 100 phải chặn trần về 100', async () => {
      mockCacheManager.get.mockResolvedValue(null);
      mockInventoryClient.send.mockReturnValue(of(mockSearchResult));

      await controller.searchBranchMedicines(
        'BR-001',
        'Panadol',
        0,   // page = 0 (bất thường)
        500, // limit = 500 (vượt trần an toàn)
      );

      expect(mockInventoryClient.send).toHaveBeenCalledWith(
        'inventory.medicine.branch_search',
        expect.objectContaining({
          page: 1,   // Đã chuẩn hóa về 1
          limit: 100, // Đã chặn trần 100
        }),
      );
    });

    it('[Boundary] Từ khóa tìm kiếm có khoảng trắng thừa phải được trim gọn gàng', async () => {
      mockCacheManager.get.mockResolvedValue(null);
      mockInventoryClient.send.mockReturnValue(of(mockSearchResult));

      await controller.searchBranchMedicines(
        'BR-001',
        '   Salonpas   ',
        1,
        10,
      );

      expect(mockInventoryClient.send).toHaveBeenCalledWith(
        'inventory.medicine.branch_search',
        expect.objectContaining({
          search: 'Salonpas',
        }),
      );
    });
  });

  // =========================================================================
  // 3. [Abnormal Values] Dữ liệu dị thường & Khả năng chịu lỗi (Resilience)
  // =========================================================================
  describe('3. [Abnormal Values] Chịu lỗi Redis & Chống sập hệ thống (Fail-Safe)', () => {
    it('[Abnormal] Khi Redis Cache gặp lỗi sập kết nối, Gateway vẫn gọi Kafka bình thường mà không crash', async () => {
      // Giả lập Redis Cache bị lỗi kết nối
      mockCacheManager.get.mockRejectedValue(new Error('Redis connection refused'));
      mockCacheManager.set.mockRejectedValue(new Error('Redis write error'));
      mockInventoryClient.send.mockReturnValue(of(mockSearchResult));

      const result = await controller.searchBranchMedicines(
        'BR-001',
        'Paracetamol',
        1,
        10,
      );

      // Hệ thống vẫn hoàn thành và trả kết quả thành công cho Client
      expect(result).toEqual(mockSearchResult);
      expect(mockInventoryClient.send).toHaveBeenCalled();
    });
  });
});

