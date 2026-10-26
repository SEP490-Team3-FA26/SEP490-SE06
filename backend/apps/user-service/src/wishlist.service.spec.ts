/// <reference types="jest" />
import { Test, TestingModule } from '@nestjs/testing';
import { UserService } from './user-service.service';
import { getModelToken, getConnectionToken } from '@nestjs/mongoose';
import { of } from 'rxjs';

/**
 * Bộ kiểm thử đơn vị cho chức năng Danh sách sản phẩm yêu thích (Wishlist - UC-96)
 * Tuân thủ quy chuẩn Test-Coupled Mandate (Rule 7) với đầy đủ 3 nhóm giá trị:
 * 1. [Normal Values]: Luồng nghiệp vụ chuẩn, thành công.
 * 2. [Boundary Values]: Giá trị biên, rỗng, idempotency chống trùng lặp.
 * 3. [Abnormal Values]: Dữ liệu dị thường, thiếu tham số, thuốc không tồn tại, auto-healing.
 */
describe('UserService - Wishlist Operations (UC-96)', () => {
  let service: UserService;

  // Mock document cho Wishlist
  const mockWishlistDoc = {
    userId: 'user_test_01',
    items: [{ medicineId: 'med_01', addedAt: new Date() }],
    save: jest.fn().mockResolvedValue(true),
  };

  // Mock Wishlist Model
  const mockWishlistModel: any = jest.fn().mockImplementation((dto) => ({
    ...dto,
    save: jest.fn().mockResolvedValue(true),
  }));
  mockWishlistModel.findOne = jest.fn();

  // Mock Medicine Model
  const mockMedicineModel: any = {
    find: jest.fn(),
    findById: jest.fn(),
  };

  // Mock Kafka Client
  const mockKafkaClient = {
    subscribeToResponseOf: jest.fn(),
    connect: jest.fn(),
    send: jest.fn(),
  };

  const defaultMockModel = {};

  beforeEach(async () => {
    jest.clearAllMocks();

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        UserService,
        { provide: getModelToken('User'), useValue: defaultMockModel },
        { provide: getModelToken('Cart'), useValue: defaultMockModel },
        { provide: getModelToken('Wishlist'), useValue: mockWishlistModel },
        { provide: getModelToken('Medicine'), useValue: mockMedicineModel },
        { provide: getModelToken('AuditLog'), useValue: defaultMockModel },
        { provide: getModelToken('Branch'), useValue: defaultMockModel },
        { provide: getModelToken('BranchFeedback'), useValue: defaultMockModel },
        { provide: getModelToken('CustomerSegment'), useValue: defaultMockModel },
        { provide: getModelToken('StaffTransferRequest'), useValue: defaultMockModel },
        { provide: getModelToken('StaffNotification'), useValue: defaultMockModel },
        { provide: getModelToken('WorkSchedule'), useValue: defaultMockModel },
        { provide: getModelToken('ShiftSwapRequest'), useValue: defaultMockModel },
        { provide: getModelToken('LeaveRequest'), useValue: defaultMockModel },
        { provide: getConnectionToken(), useValue: {} },
        { provide: 'INVENTORY_SERVICE', useValue: mockKafkaClient },
        { provide: 'AUTH_SERVICE', useValue: mockKafkaClient },
      ],
    }).compile();

    service = module.get<UserService>(UserService);
  });

  // =========================================================================
  // 1. [Normal Values] - Luồng nghiệp vụ chuẩn, thành công
  // =========================================================================
  describe('[Normal Values]', () => {
    it('should return enriched wishlist items when user has medicines in wishlist', async () => {
      // Giả lập tìm thấy wishlist của người dùng
      mockWishlistModel.findOne.mockReturnValue({
        exec: jest.fn().mockResolvedValue({
          userId: 'user_test_01',
          items: [{ medicineId: 'med_01', addedAt: new Date() }],
          save: jest.fn().mockResolvedValue(true),
        }),
      });

      // Giả lập tìm thấy thông tin chi tiết thuốc trong DB kho
      mockMedicineModel.find.mockReturnValue({
        lean: jest.fn().mockReturnValue({
          exec: jest.fn().mockResolvedValue([
            {
              _id: 'med_01',
              name: 'Paracetamol 500mg',
              price: 25000,
              category: 'Giảm đau',
            },
          ]),
        }),
      });

      const result = await service.getWishlist('user_test_01');

      expect(result.totalCount).toBe(1);
      expect(result.items[0].name).toBe('Paracetamol 500mg');
      expect(result.items[0].id).toBe('med_01');
    });

    it('should add a new medicine to wishlist successfully', async () => {
      // Giả lập thuốc tồn tại trong DB kho
      mockMedicineModel.findById.mockReturnValue({
        lean: jest.fn().mockReturnValue({
          exec: jest.fn().mockResolvedValue({
            _id: 'med_02',
            name: 'Amoxicillin 500mg',
          }),
        }),
      });

      // Giả lập wishlist hiện tại đang rỗng
      const wishlistInstance = {
        userId: 'user_test_01',
        items: [],
        save: jest.fn().mockResolvedValue(true),
      };
      mockWishlistModel.findOne.mockReturnValue({
        exec: jest.fn().mockResolvedValue(wishlistInstance),
      });

      const res = await service.addToWishlist('user_test_01', 'med_02');

      expect(res.success).toBe(true);
      expect(res.totalCount).toBe(1);
      expect(wishlistInstance.items.length).toBe(1);
      expect(wishlistInstance.save).toHaveBeenCalled();
    });

    it('should remove a medicine from wishlist successfully', async () => {
      const wishlistInstance = {
        userId: 'user_test_01',
        items: [
          { medicineId: 'med_01', addedAt: new Date() },
          { medicineId: 'med_02', addedAt: new Date() },
        ],
        save: jest.fn().mockResolvedValue(true),
      };
      mockWishlistModel.findOne.mockReturnValue({
        exec: jest.fn().mockResolvedValue(wishlistInstance),
      });

      const res = await service.removeFromWishlist('user_test_01', 'med_01');

      expect(res.success).toBe(true);
      expect(wishlistInstance.items.length).toBe(1);
      expect(wishlistInstance.items[0].medicineId).toBe('med_02');
      expect(wishlistInstance.save).toHaveBeenCalled();
    });

    it('should clear all medicines from wishlist', async () => {
      const wishlistInstance = {
        userId: 'user_test_01',
        items: [{ medicineId: 'med_01' }],
        save: jest.fn().mockResolvedValue(true),
      };
      mockWishlistModel.findOne.mockReturnValue({
        exec: jest.fn().mockResolvedValue(wishlistInstance),
      });

      const res = await service.clearWishlist('user_test_01');

      expect(res.success).toBe(true);
      expect(wishlistInstance.items).toEqual([]);
      expect(wishlistInstance.save).toHaveBeenCalled();
    });
  });

  // =========================================================================
  // 2. [Boundary Values] - Giá trị biên, rỗng, Idempotency chống trùng lặp
  // =========================================================================
  describe('[Boundary Values]', () => {
    it('should be idempotent and not add duplicate medicine to wishlist', async () => {
      mockMedicineModel.findById.mockReturnValue({
        lean: jest.fn().mockReturnValue({
          exec: jest.fn().mockResolvedValue({ _id: 'med_01', name: 'Paracetamol' }),
        }),
      });

      // Wishlist đã có sẵn med_01
      const wishlistInstance = {
        userId: 'user_test_01',
        items: [{ medicineId: 'med_01', addedAt: new Date() }],
        save: jest.fn().mockResolvedValue(true),
      };
      mockWishlistModel.findOne.mockReturnValue({
        exec: jest.fn().mockResolvedValue(wishlistInstance),
      });

      const res = await service.addToWishlist('user_test_01', 'med_01');

      expect(res.success).toBe(true);
      expect(res.alreadyExists).toBe(true);
      expect(wishlistInstance.items.length).toBe(1); // Không nhân bản thành 2
      expect(wishlistInstance.save).not.toHaveBeenCalled();
    });

    it('should return empty list when user wishlist has 0 items', async () => {
      mockWishlistModel.findOne.mockReturnValue({
        exec: jest.fn().mockResolvedValue({
          userId: 'user_test_01',
          items: [],
          save: jest.fn().mockResolvedValue(true),
        }),
      });

      const result = await service.getWishlist('user_test_01');

      expect(result.items).toEqual([]);
      expect(result.totalCount).toBe(0);
    });

    it('should handle clearWishlist gracefully when wishlist record does not exist', async () => {
      mockWishlistModel.findOne.mockReturnValue({
        exec: jest.fn().mockResolvedValue(null),
      });

      const res = await service.clearWishlist('user_without_wishlist');

      expect(res.success).toBe(true);
      expect(res.totalCount).toBe(0);
    });
  });

  // =========================================================================
  // 3. [Abnormal Values] - Dữ liệu dị thường, lỗi ngoại lệ, Auto-healing
  // =========================================================================
  describe('[Abnormal Values]', () => {
    it('should return empty if userId is empty or null in getWishlist', async () => {
      const res = await service.getWishlist('');
      expect(res.items).toEqual([]);
      expect(res.totalCount).toBe(0);
    });

    it('should return 400 error when userId or medicineId is missing in addToWishlist', async () => {
      const res1 = await service.addToWishlist('', 'med_01');
      expect(res1.error).toBe(true);
      expect(res1.statusCode).toBe(400);

      const res2 = await service.addToWishlist('user_test_01', '');
      expect(res2.error).toBe(true);
      expect(res2.statusCode).toBe(400);
    });

    it('should return 404 error when medicine does not exist in inventory', async () => {
      // Giả lập truy vấn DB không tìm thấy
      mockMedicineModel.findById.mockReturnValue({
        lean: jest.fn().mockReturnValue({
          exec: jest.fn().mockResolvedValue(null),
        }),
      });

      // Giả lập Kafka fallback cũng không tìm thấy
      mockKafkaClient.send.mockReturnValue(of(null));

      const res = await service.addToWishlist('user_test_01', 'non_existing_medicine');

      expect(res.error).toBe(true);
      expect(res.statusCode).toBe(404);
      expect(res.message).toContain('không tồn tại');
    });

    it('should auto-heal and remove deleted medicine from wishlist in getWishlist', async () => {
      const wishlistInstance = {
        userId: 'user_test_01',
        items: [
          { medicineId: 'med_active', addedAt: new Date() },
          { medicineId: 'med_deleted_by_admin', addedAt: new Date() },
        ],
        save: jest.fn().mockResolvedValue(true),
      };
      mockWishlistModel.findOne.mockReturnValue({
        exec: jest.fn().mockResolvedValue(wishlistInstance),
      });

      // Chỉ med_active còn tồn tại trong kho
      mockMedicineModel.find.mockReturnValue({
        lean: jest.fn().mockReturnValue({
          exec: jest.fn().mockResolvedValue([
            { _id: 'med_active', name: 'Thuốc Còn Bán' },
          ]),
        }),
      });

      const result = await service.getWishlist('user_test_01');

      // Thuốc bị xóa khỏi kho phải tự động bị lọc bỏ khỏi kết quả trả về
      expect(result.totalCount).toBe(1);
      expect(result.items[0].id).toBe('med_active');
      // Đảm bảo hàm save() được gọi để cập nhật lại DB (Auto-healing)
      expect(wishlistInstance.save).toHaveBeenCalled();
      expect(wishlistInstance.items.length).toBe(1);
    });
  });
});
