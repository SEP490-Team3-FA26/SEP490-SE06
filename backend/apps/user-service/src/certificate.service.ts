import { Injectable, NotFoundException, BadRequestException, ForbiddenException, Logger } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model, Types } from 'mongoose';
import { StaffCertificate, StaffCertificateDocument, CertificateStatus, CertificateType, CertificatePurpose } from './schemas/staff-certificate.schema';
import { User, UserDocument } from '../../auth-service/src/auth/user.schema';

@Injectable()
export class CertificateService {
  private readonly logger = new Logger(CertificateService.name);

  constructor(
    @InjectModel(StaffCertificate.name)
    private readonly certModel: Model<StaffCertificateDocument>,
    @InjectModel(User.name)
    private readonly userModel: Model<UserDocument>,
  ) {}

  /** Nhân viên tự nộp hồ sơ văn bằng / CCHN mới */
  async submitCertificate(userId: string, data: any) {
    const user = await this.userModel.findById(userId);
    if (!user) {
      throw new NotFoundException('Không tìm thấy thông tin tài khoản nhân viên');
    }

    // Kiểm tra trùng số hiệu văn bằng của chính nhân sự này
    const existing = await this.certModel.findOne({
      userId: new Types.ObjectId(userId),
      certificateNumber: data.certificateNumber?.trim(),
      status: { $in: [CertificateStatus.CHO_DUYET, CertificateStatus.DA_DUYET] },
    });
    if (existing) {
      throw new BadRequestException('Số hiệu văn bằng/chứng chỉ này đã tồn tại trong hồ sơ của bạn');
    }

    const newCert = new this.certModel({
      userId: new Types.ObjectId(userId),
      userFullName: user.fullName,
      userEmail: user.email,
      branchId: user.branchId || data.branchId || null,
      certificateType: data.certificateType,
      certificateNumber: data.certificateNumber?.trim(),
      issuedBy: data.issuedBy?.trim(),
      issueDate: data.issueDate,
      expiryDate: data.expiryDate || null,
      purpose: data.purpose || CertificatePurpose.ALLOWANCE_ONLY,
      frontImageUrl: data.frontImageUrl,
      backImageUrl: data.backImageUrl || null,
      status: CertificateStatus.CHO_DUYET,
      submittedAt: new Date(),
    });

    const saved = await newCert.save();
    return JSON.parse(JSON.stringify(saved));
  }

  /** Lấy danh sách văn bằng của chính nhân viên */
  async getMyCertificates(userId: string) {
    return await this.certModel
      .find({ userId: new Types.ObjectId(userId) })
      .sort({ createdAt: -1 })
      .lean();
  }

  /** Chỉnh sửa lại hồ sơ (khi bị từ chối hoặc đang chờ duyệt) */
  async updateMyCertificate(userId: string, certificateId: string, data: any) {
    const cert = await this.certModel.findOne({
      _id: new Types.ObjectId(certificateId),
      userId: new Types.ObjectId(userId),
    });

    if (!cert) {
      throw new NotFoundException('Không tìm thấy văn bằng/chứng chỉ cần cập nhật');
    }

    if (cert.status === CertificateStatus.DA_DUYET) {
      throw new BadRequestException('Hồ sơ đã được phê duyệt hợp lệ, không thể tự sửa. Vui lòng liên hệ Quản lý.');
    }

    if (data.certificateType) cert.certificateType = data.certificateType;
    if (data.certificateNumber) cert.certificateNumber = data.certificateNumber.trim();
    if (data.issuedBy) cert.issuedBy = data.issuedBy.trim();
    if (data.issueDate) cert.issueDate = data.issueDate;
    if (data.expiryDate !== undefined) cert.expiryDate = data.expiryDate;
    if (data.purpose) cert.purpose = data.purpose;
    if (data.frontImageUrl) cert.frontImageUrl = data.frontImageUrl;
    if (data.backImageUrl !== undefined) cert.backImageUrl = data.backImageUrl;

    // Reset về trạng thái chờ duyệt nếu trước đó bị từ chối
    cert.status = CertificateStatus.CHO_DUYET;
    cert.rejectionReason = '';
    cert.submittedAt = new Date();

    const saved = await cert.save();
    return JSON.parse(JSON.stringify(saved));
  }

  /** Xóa hồ sơ văn bằng (chỉ khi chưa được duyệt) */
  async deleteMyCertificate(userId: string, certificateId: string) {
    const cert = await this.certModel.findOne({
      _id: new Types.ObjectId(certificateId),
      userId: new Types.ObjectId(userId),
    });

    if (!cert) {
      throw new NotFoundException('Không tìm thấy văn bằng cần xóa');
    }

    if (cert.status === CertificateStatus.DA_DUYET) {
      throw new BadRequestException('Không thể xóa văn bằng đã được phê duyệt');
    }

    await this.certModel.deleteOne({ _id: cert._id });
    return { success: true, message: 'Đã xóa hồ sơ văn bằng thành công' };
  }

  /** Quản lý chi nhánh xem danh sách văn bằng của nhân viên trong cơ sở */
  async listBranchCertificates(branchId: string, status?: string) {
    const query: any = {};
    if (branchId && branchId !== 'all') {
      query.branchId = branchId;
    }
    if (status && status !== 'all') {
      query.status = status;
    }

    return await this.certModel
      .find(query)
      .sort({ createdAt: -1 })
      .lean();
  }

  /** Quản lý chi nhánh phê duyệt văn bằng */
  async approveCertificate(
    managerId: string,
    certificateId: string,
    approvalData: { monthlyAllowance?: number; isBranchPIC?: boolean },
  ) {
    const cert = await this.certModel.findById(certificateId);
    if (!cert) {
      throw new NotFoundException('Không tìm thấy hồ sơ văn bằng');
    }

    const manager = await this.userModel.findById(managerId);

    // Xác định mức phụ cấp hàng tháng
    const allowance = Number(approvalData.monthlyAllowance) || 0;
    const isPIC = !!approvalData.isBranchPIC;

    cert.status = CertificateStatus.DA_DUYET;
    cert.monthlyAllowance = allowance;
    cert.isBranchPIC = isPIC;
    cert.rejectionReason = '';
    cert.verifiedBy = new Types.ObjectId(managerId);
    cert.verifiedByName = manager?.fullName || 'Quản lý cơ sở';
    cert.verifiedAt = new Date();

    const saved = await cert.save();

    // Đồng bộ lại tổng phụ cấp và quyền chuyên môn cho User sở hữu
    await this.syncUserQualifications(cert.userId.toString());

    return JSON.parse(JSON.stringify(saved));
  }

  /** Quản lý chi nhánh từ chối văn bằng */
  async rejectCertificate(managerId: string, certificateId: string, reason: string) {
    if (!reason || !reason.trim()) {
      throw new BadRequestException('Bắt buộc phải nhập lý do từ chối hồ sơ');
    }

    const cert = await this.certModel.findById(certificateId);
    if (!cert) {
      throw new NotFoundException('Không tìm thấy hồ sơ văn bằng');
    }

    const manager = await this.userModel.findById(managerId);

    cert.status = CertificateStatus.TU_CHOI;
    cert.rejectionReason = reason.trim();
    cert.monthlyAllowance = 0;
    cert.isBranchPIC = false;
    cert.verifiedBy = new Types.ObjectId(managerId);
    cert.verifiedByName = manager?.fullName || 'Quản lý cơ sở';
    cert.verifiedAt = new Date();

    const saved = await cert.save();

    // Đồng bộ lại thông tin của User
    await this.syncUserQualifications(cert.userId.toString());

    return JSON.parse(JSON.stringify(saved));
  }

  /** Tổng hợp số liệu bằng cấp cho chi nhánh */
  async getBranchCertificateSummary(branchId: string) {
    const query = branchId && branchId !== 'all' ? { branchId } : {};

    const [allCerts, picUser] = await Promise.all([
      this.certModel.find(query).lean(),
      this.userModel.findOne({ branchId, isBranchPIC: true }).select('fullName email phone highestDegree').lean(),
    ]);

    const pendingCount = allCerts.filter(c => c.status === CertificateStatus.CHO_DUYET).length;
    const approvedCount = allCerts.filter(c => c.status === CertificateStatus.DA_DUYET).length;
    const cchnCount = allCerts.filter(
      c => c.status === CertificateStatus.DA_DUYET && c.certificateType === CertificateType.PRACTICE_CERTIFICATE,
    ).length;

    // Tổng phụ cấp bằng cấp của các nhân viên đã duyệt
    const totalMonthlyAllowance = allCerts
      .filter(c => c.status === CertificateStatus.DA_DUYET)
      .reduce((sum, c) => sum + (c.monthlyAllowance || 0), 0);

    return {
      pendingCount,
      approvedCount,
      cchnCount,
      totalMonthlyAllowance,
      responsiblePharmacist: picUser || null,
    };
  }

  /** Đồng bộ các thông số bằng cấp đã duyệt lên tài khoản User */
  private async syncUserQualifications(userId: string) {
    try {
      const approvedCerts = await this.certModel.find({
        userId: new Types.ObjectId(userId),
        status: CertificateStatus.DA_DUYET,
      });

      // Tính tổng phụ cấp
      const totalAllowance = approvedCerts.reduce((sum, c) => sum + (c.monthlyAllowance || 0), 0);

      // Tìm CCHN nếu có
      const cchnCert = approvedCerts.find(c => c.certificateType === CertificateType.PRACTICE_CERTIFICATE);

      // Xác định bằng cao nhất
      let highestDegree: string | null = null;
      if (approvedCerts.some(c => c.certificateType === CertificateType.PHARMACIST_UNIVERSITY)) {
        highestDegree = 'Dược sĩ Đại học';
      } else if (approvedCerts.some(c => c.certificateType === CertificateType.PHARMACIST_COLLEGE)) {
        highestDegree = 'Dược sĩ Cao đẳng';
      } else if (approvedCerts.some(c => c.certificateType === CertificateType.PHARMACIST_INTERMEDIATE)) {
        highestDegree = 'Dược sĩ Trung cấp';
      }

      // Kiểm tra có đang là PTCM không
      const isPIC = approvedCerts.some(c => c.isBranchPIC);

      await this.userModel.findByIdAndUpdate(userId, {
        certificateAllowance: totalAllowance,
        practiceCertificateNumber: cchnCert ? cchnCert.certificateNumber : null,
        highestDegree,
        isBranchPIC: isPIC,
      });
    } catch (err: any) {
      this.logger.error(`Error syncing user qualifications for ${userId}: ${err.message}`);
    }
  }
}
