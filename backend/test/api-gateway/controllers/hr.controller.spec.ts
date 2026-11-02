// hr.controller.spec.ts - Kiểm thử HrController chuẩn WDP301/SEP490
// Tuân thủ Test-Coupled Mandate: phân chia rõ 3 nhóm [Normal Values], [Boundary Values], [Abnormal Values]
// Chú thích mã nguồn: Tiếng Việt 100%

import { Test, TestingModule } from '@nestjs/testing';
import { HrController } from '../../../apps/api-gateway/src/controllers/hr.controller';
import { CloudinaryStorageService } from '../../../apps/api-gateway/src/storage/cloudinary-storage.service';
import { of } from 'rxjs';

describe('HrController', () => {
  let controller: HrController;

  const mockKafkaUserClient = {
    send: jest.fn(),
    emit: jest.fn(),
    subscribeToResponseOf: jest.fn(),
    connect: jest.fn().mockResolvedValue(undefined),
  };

  const mockKafkaOrderClient = {
    send: jest.fn(),
    emit: jest.fn(),
    subscribeToResponseOf: jest.fn(),
    connect: jest.fn().mockResolvedValue(undefined),
  };

  const mockCloudinaryService = {
    uploadImage: jest.fn().mockResolvedValue({ secure_url: 'https://cloudinary.com/test.jpg' }),
  };

  beforeEach(async () => {
    jest.clearAllMocks();

    const module: TestingModule = await Test.createTestingModule({
      controllers: [HrController],
      providers: [
        { provide: 'USER_SERVICE', useValue: mockKafkaUserClient },
        { provide: 'ORDER_SERVICE', useValue: mockKafkaOrderClient },
        { provide: CloudinaryStorageService, useValue: mockCloudinaryService },
      ],
    }).compile();

    controller = module.get<HrController>(HrController);
  });

  describe('getColleagues', () => {
    // =========================================================================
    // 1. [Normal Values] - Luồng nghiệp vụ chuẩn, thành công
    // =========================================================================
    it('T-HR-01: [Normal Values] Lấy danh sách đồng nghiệp cùng chi nhánh thành công, tự động loại bỏ chính user', async () => {
      const mockEmployees = [
        { _id: 'emp-01', fullName: 'DS. Lê Hải Yến', role: 'pharmacist', branchId: 'BR-001' },
        { _id: 'emp-02', fullName: 'DS. Nguyễn Văn An', role: 'pharmacist', branchId: 'BR-001' },
        { _id: 'current-user-id', fullName: 'Tôi (Người Đăng Nhập)', role: 'pharmacist', branchId: 'BR-001' },
      ];
      mockKafkaUserClient.send.mockReturnValue(of(mockEmployees));

      const req = { user: { sub: 'current-user-id', branchId: 'BR-001' } };
      const result = await controller.getColleagues(req);

      expect(mockKafkaUserClient.send).toHaveBeenCalledWith('user.admin.employee.list', { branchId: 'BR-001' });
      expect(result).toHaveLength(2);
      expect(result.some((c: any) => c._id === 'current-user-id')).toBe(false);
      expect(result[0]._id).toBe('emp-01');
      expect(result[1]._id).toBe('emp-02');
    });

    it('T-HR-02: [Normal Values] Lấy số lượng thông báo HR chưa đọc của user', async () => {
      mockKafkaUserClient.send.mockReturnValue(of({ count: 5 }));

      const req = { user: { sub: 'emp-01' } };
      const result = await controller.unreadCount(req);

      expect(mockKafkaUserClient.send).toHaveBeenCalledWith('hr.notification.unread_count', { userId: 'emp-01' });
      expect(result).toEqual({ count: 5 });
    });

    // =========================================================================
    // 2. [Boundary Values] - Giá trị biên, rỗng, 1 phần tử, fallback toàn hệ thống
    // =========================================================================
    it('T-HR-03: [Boundary Values] Khi chi nhánh chỉ có 1 nhân viên (chính user), tự động fallback truy vấn toàn chuỗi', async () => {
      // Lượt gọi 1: Chi nhánh BR-001 chỉ có chính user
      mockKafkaUserClient.send
        .mockReturnValueOnce(of([{ _id: 'only-me', fullName: 'Chính Tôi', role: 'pharmacist', branchId: 'BR-001' }]))
        // Lượt gọi 2: Fallback lấy toàn hệ thống
        .mockReturnValueOnce(
          of([
            { _id: 'only-me', fullName: 'Chính Tôi', role: 'pharmacist' },
            { _id: 'emp-other-branch', fullName: 'DS. Trần Minh Khang', role: 'pharmacist', branchId: 'BR-002' },
            { _id: 'emp-wh', fullName: 'Ngô Quang Huy', role: 'warehouse', branchId: 'BR-003' },
          ])
        );

      const req = { user: { sub: 'only-me', branchId: 'BR-001' } };
      const result = await controller.getColleagues(req);

      expect(mockKafkaUserClient.send).toHaveBeenCalledTimes(2);
      expect(mockKafkaUserClient.send).toHaveBeenNthCalledWith(1, 'user.admin.employee.list', { branchId: 'BR-001' });
      expect(mockKafkaUserClient.send).toHaveBeenNthCalledWith(2, 'user.admin.employee.list', {});
      expect(result).toHaveLength(2);
      expect(result.some((c: any) => c._id === 'only-me')).toBe(false);
      expect(result[0]._id).toBe('emp-other-branch');
    });

    it('T-HR-04: [Boundary Values] Khi user không có branchId (null/undefined), gọi trực tiếp toàn chuỗi', async () => {
      mockKafkaUserClient.send.mockReturnValue(
        of([
          { _id: 'director-1', fullName: 'Giám Đốc', role: 'director' },
          { _id: 'emp-01', fullName: 'DS. Lê Hải Yến', role: 'pharmacist' },
        ])
      );

      const req = { user: { sub: 'director-1', branchId: undefined } };
      const result = await controller.getColleagues(req);

      expect(mockKafkaUserClient.send).toHaveBeenCalledWith('user.admin.employee.list', {});
      expect(result).toHaveLength(1);
      expect(result[0]._id).toBe('emp-01');
    });

    it('T-HR-05: [Boundary Values] Khi cả chi nhánh và toàn hệ thống đều rỗng, trả về mảng rỗng an toàn', async () => {
      mockKafkaUserClient.send.mockReturnValue(of([]));

      const req = { user: { sub: 'user-alone', branchId: 'BR-EMPTY' } };
      const result = await controller.getColleagues(req);

      expect(result).toEqual([]);
    });

    // =========================================================================
    // 3. [Abnormal Values] - Dữ liệu dị thường, bọc object { data: [...] }, null
    // =========================================================================
    it('T-HR-06: [Abnormal Values] Xử lý an toàn khi Kafka trả về bọc object { data: [...] } thay vì mảng trực tiếp', async () => {
      mockKafkaUserClient.send.mockReturnValue(
        of({
          data: [
            { id: 'emp-99', fullName: 'DS. Phạm Thị Thảo', role: 'pharmacist' },
            { id: 'user-caller', fullName: 'Người Gọi', role: 'pharmacist' },
          ],
        })
      );

      const req = { user: { id: 'user-caller', branchId: 'BR-001' } };
      const result = await controller.getColleagues(req);

      expect(result).toHaveLength(1);
      expect(result[0].id).toBe('emp-99');
    });

    it('T-HR-07: [Abnormal Values] Xử lý an toàn khi Kafka trả về null/undefined', async () => {
      mockKafkaUserClient.send.mockReturnValue(of(null));

      const req = { user: { sub: 'user-err' } };
      const result = await controller.getColleagues(req);

      expect(result).toEqual([]);
    });
  });
});
