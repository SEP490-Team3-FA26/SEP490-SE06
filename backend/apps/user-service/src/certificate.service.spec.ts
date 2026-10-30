import { Test, TestingModule } from '@nestjs/testing';
import { getModelToken } from '@nestjs/mongoose';
import { BadRequestException, ForbiddenException, NotFoundException } from '@nestjs/common';
import { Types } from 'mongoose';
import { CertificateService } from './certificate.service';
import { StaffCertificate, CertificateType, CertificateStatus, CertificatePurpose } from './schemas/staff-certificate.schema';
import { User, UserRole } from '../../auth-service/src/auth/user.schema';

describe('CertificateService - Blocker Fixes Verification', () => {
  let service: CertificateService;
  let mockCertModel: any;
  let mockUserModel: any;

  const mockUserId1 = new Types.ObjectId();
  const mockUserId2 = new Types.ObjectId();
  const mockCertId1 = new Types.ObjectId();
  const mockManagerIdBranch1 = new Types.ObjectId();
  const mockManagerIdBranch2 = new Types.ObjectId();
  const mockAdminId = new Types.ObjectId();

  const createQueryMock = (data: any[] = []) => {
    const arr: any = [...data];
    arr.sort = jest.fn().mockReturnValue(arr);
    arr.lean = jest.fn().mockResolvedValue(arr);
    return arr;
  };

  beforeEach(async () => {

    mockCertModel = {
      find: jest.fn().mockImplementation(() => createQueryMock([])),
      findOne: jest.fn(),
      findById: jest.fn(),
      updateMany: jest.fn().mockResolvedValue({ modifiedCount: 1 }),
      deleteOne: jest.fn().mockResolvedValue({ deletedCount: 1 }),
      sort: jest.fn().mockReturnThis(),
      lean: jest.fn().mockResolvedValue([]),
    };

    // Mô phỏng constructor cho new certModel
    function MockCertInstance(data: any) {
      Object.assign(this, data);
      this._id = mockCertId1;
      this.save = jest.fn().mockResolvedValue(this);
    }
    Object.assign(MockCertInstance, mockCertModel);

    mockUserModel = {
      findById: jest.fn(),
      findOne: jest.fn(),
      findByIdAndUpdate: jest.fn().mockResolvedValue({}),
      updateMany: jest.fn().mockResolvedValue({ modifiedCount: 1 }),
      select: jest.fn().mockReturnThis(),
      lean: jest.fn().mockReturnThis(),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        CertificateService,
        {
          provide: getModelToken(StaffCertificate.name),
          useValue: MockCertInstance,
        },
        {
          provide: getModelToken(User.name),
          useValue: mockUserModel,
        },
      ],
    }).compile();

    service = module.get<CertificateService>(CertificateService);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('Blocker 4: Đảm bảo tính duy nhất số CCHN trên toàn chuỗi', () => {
    it('TC1: Chặn khi nộp CCHN trùng với một nhân sự khác trong toàn hệ thống', async () => {
      mockUserModel.findById.mockResolvedValue({
        _id: mockUserId1,
        fullName: 'Dược sĩ Nguyễn Văn B',
        email: 'b@vinapharmacy.com',
        branchId: 'BRANCH-01',
      });

      // Chưa trùng trong hồ sơ bản thân
      mockCertModel.findOne
        .mockResolvedValueOnce(null) // existing of own user
        .mockResolvedValueOnce({
          _id: new Types.ObjectId(),
          userId: mockUserId2,
          certificateNumber: '01234/SYT-CCHND',
          certificateType: CertificateType.PRACTICE_CERTIFICATE,
        }); // globalDuplicate found

      await expect(
        service.submitCertificate(mockUserId1.toHexString(), {
          certificateType: CertificateType.PRACTICE_CERTIFICATE,
          certificateNumber: '01234/SYT-CCHND',
          issuedBy: 'Sở Y tế Hà Nội',
          issueDate: '2022-01-01',
          frontImageUrl: 'https://example.com/front.jpg',
        }),
      ).rejects.toThrow(BadRequestException);
    });

    it('TC1b: Chặn khi cập nhật CCHN trùng với nhân sự khác trên toàn chuỗi', async () => {
      const existingCert = {
        _id: mockCertId1,
        userId: mockUserId1,
        certificateType: CertificateType.PRACTICE_CERTIFICATE,
        certificateNumber: 'OLD-NUMBER',
        status: CertificateStatus.CHO_DUYET,
        save: jest.fn().mockResolvedValue(true),
      };

      mockCertModel.findOne
        .mockResolvedValueOnce(existingCert) // findOne current cert
        .mockResolvedValueOnce(null) // own duplicate check
        .mockResolvedValueOnce({ _id: new Types.ObjectId(), userId: mockUserId2 }); // globalDuplicate found

      await expect(
        service.updateMyCertificate(mockUserId1.toHexString(), mockCertId1.toHexString(), {
          certificateNumber: '01234/SYT-CCHND',
        }),
      ).rejects.toThrow(BadRequestException);
    });
  });

  describe('Blocker 2: Ràng buộc loại bằng chỉ định PTCM (Chỉ CCHN mới được làm PTCM)', () => {
    it('TC2: Chặn khi Quản lý duyệt Bằng Đại học nhưng tick chọn PTCM', async () => {
      const mockUniversityCert = {
        _id: mockCertId1,
        userId: mockUserId1,
        branchId: 'BRANCH-01',
        certificateType: CertificateType.PHARMACIST_UNIVERSITY, // Bằng Đại học, không phải CCHN
        status: CertificateStatus.CHO_DUYET,
      };

      mockCertModel.findById.mockResolvedValue(mockUniversityCert);
      mockUserModel.findById.mockResolvedValue({
        _id: mockManagerIdBranch1,
        branchId: 'BRANCH-01',
        role: UserRole.BRANCH,
        fullName: 'Quản lý Chi nhánh 1',
      });

      await expect(
        service.approveCertificate(mockManagerIdBranch1.toHexString(), mockCertId1.toHexString(), {
          monthlyAllowance: 1500000,
          isBranchPIC: true, // Cố tình chọn làm PTCM cho bằng đại học
        }),
      ).rejects.toThrow(BadRequestException);
    });
  });

  describe('Blocker 3: Khắc phục lỗ hổng IDOR trong phê duyệt và từ chối', () => {
    it('TC3: Quản lý chi nhánh 1 không được phê duyệt hồ sơ của chi nhánh 2', async () => {
      const mockCertBranch2 = {
        _id: mockCertId1,
        userId: mockUserId2,
        branchId: 'BRANCH-02',
        certificateType: CertificateType.PRACTICE_CERTIFICATE,
        status: CertificateStatus.CHO_DUYET,
      };

      mockCertModel.findById.mockResolvedValue(mockCertBranch2);
      mockUserModel.findById.mockResolvedValue({
        _id: mockManagerIdBranch1,
        branchId: 'BRANCH-01', // Khác chi nhánh
        role: UserRole.BRANCH,
        fullName: 'Quản lý Chi nhánh 1',
      });

      await expect(
        service.approveCertificate(mockManagerIdBranch1.toHexString(), mockCertId1.toHexString(), {
          monthlyAllowance: 3500000,
          isBranchPIC: false,
        }),
      ).rejects.toThrow(ForbiddenException);
    });

    it('TC3b: Quản lý chi nhánh 1 không được từ chối hồ sơ của chi nhánh 2', async () => {
      const mockCertBranch2 = {
        _id: mockCertId1,
        userId: mockUserId2,
        branchId: 'BRANCH-02',
        certificateType: CertificateType.PRACTICE_CERTIFICATE,
        status: CertificateStatus.CHO_DUYET,
      };

      mockCertModel.findById.mockResolvedValue(mockCertBranch2);
      mockUserModel.findById.mockResolvedValue({
        _id: mockManagerIdBranch1,
        branchId: 'BRANCH-01',
        role: UserRole.BRANCH,
        fullName: 'Quản lý Chi nhánh 1',
      });

      await expect(
        service.rejectCertificate(
          mockManagerIdBranch1.toHexString(),
          mockCertId1.toHexString(),
          'Ảnh mờ không rõ số',
        ),
      ).rejects.toThrow(ForbiddenException);
    });

    it('TC3c: Tài khoản Admin có thẩm quyền duyệt hồ sơ của bất kỳ chi nhánh nào', async () => {
      const mockCertBranch2 = {
        _id: mockCertId1,
        userId: mockUserId2,
        branchId: 'BRANCH-02',
        certificateType: CertificateType.PRACTICE_CERTIFICATE,
        status: CertificateStatus.CHO_DUYET,
        save: jest.fn().mockResolvedValue(true),
      };

      mockCertModel.findById.mockResolvedValue(mockCertBranch2);
      mockCertModel.find.mockImplementation(() => createQueryMock([]));
      mockUserModel.findById.mockResolvedValue({
        _id: mockAdminId,
        role: UserRole.ADMIN, // Admin toàn quyền
        branchId: null,
        fullName: 'Hệ thống Quản trị IT',
      });

      const result = await service.approveCertificate(
        mockAdminId.toHexString(),
        mockCertId1.toHexString(),
        { monthlyAllowance: 3500000, isBranchPIC: false },
      );

      expect(mockCertBranch2.save).toHaveBeenCalled();
      expect(result).toBeDefined();
    });
  });

  describe('Blocker 1: Đơn nhiệm PTCM trong cùng chi nhánh (Chuẩn GPP)', () => {
    it('TC4: Khi bổ nhiệm PTCM mới, tự động hủy quyền PTCM của hồ sơ và user cũ trong chi nhánh', async () => {
      const mockNewCert = {
        _id: mockCertId1,
        userId: mockUserId2,
        userFullName: 'Dược sĩ Mới',
        branchId: 'BRANCH-01',
        certificateType: CertificateType.PRACTICE_CERTIFICATE,
        status: CertificateStatus.CHO_DUYET,
        isBranchPIC: false,
        save: jest.fn().mockResolvedValue(true),
      };

      mockCertModel.findById.mockResolvedValue(mockNewCert);
      mockUserModel.findById.mockResolvedValue({
        _id: mockManagerIdBranch1,
        branchId: 'BRANCH-01',
        role: UserRole.BRANCH,
        fullName: 'Quản lý Chi nhánh 1',
      });
      mockCertModel.find.mockImplementation(() => createQueryMock([]));

      await service.approveCertificate(
        mockManagerIdBranch1.toHexString(),
        mockCertId1.toHexString(),
        { monthlyAllowance: 4500000, isBranchPIC: true },
      );

      // Đảm bảo thu hồi cờ isBranchPIC của các văn bằng khác trong chi nhánh
      expect(mockCertModel.updateMany).toHaveBeenCalledWith(
        {
          branchId: 'BRANCH-01',
          _id: { $ne: mockNewCert._id },
          isBranchPIC: true,
        },
        { $set: { isBranchPIC: false } },
      );

      // Đảm bảo thu hồi cờ isBranchPIC của các user khác trong chi nhánh
      expect(mockUserModel.updateMany).toHaveBeenCalledWith(
        {
          branchId: 'BRANCH-01',
          _id: { $ne: mockNewCert.userId },
          isBranchPIC: true,
        },
        { $set: { isBranchPIC: false } },
      );

      expect(mockNewCert.isBranchPIC).toBe(true);
      expect(mockNewCert.status).toBe(CertificateStatus.DA_DUYET);
    });
  });
});
