import api from '../core/api';
import { API_ENDPOINTS } from '../../constants/apiEndpoints';

export type CertificateType =
  | 'PHARMACIST_UNIVERSITY'
  | 'PHARMACIST_COLLEGE'
  | 'PHARMACIST_INTERMEDIATE'
  | 'PRACTICE_CERTIFICATE'
  | 'CONTINUING_EDUCATION';

export type CertificatePurpose = 'ALLOWANCE_ONLY' | 'BRANCH_PIC_RESPONSIBLE';

export type CertificateStatus = 'CHO_DUYET' | 'DA_DUYET' | 'TU_CHOI';

export interface StaffCertificate {
  _id: string;
  userId: string;
  userFullName: string;
  userEmail: string;
  branchId: string;
  certificateType: CertificateType;
  certificateNumber: string;
  issuedBy: string;
  issueDate: string;
  expiryDate?: string;
  purpose: CertificatePurpose;
  frontImageUrl: string;
  backImageUrl?: string;
  status: CertificateStatus;
  rejectionReason?: string;
  monthlyAllowance: number;
  isBranchPIC: boolean;
  verifiedBy?: string;
  verifiedByName?: string;
  verifiedAt?: string;
  submittedAt: string;
  createdAt: string;
  updatedAt: string;
}

export interface BranchCertificateSummary {
  pendingCount: number;
  approvedCount: number;
  cchnCount: number;
  totalMonthlyAllowance: number;
  responsiblePharmacist?: {
    fullName: string;
    email: string;
    phone?: string;
    highestDegree?: string;
  } | null;
}

export const certificateService = {
  /** Upload hình ảnh hoặc file scan bằng cấp */
  uploadImage: async (file: File): Promise<{ url: string; fileName: string }> => {
    const formData = new FormData();
    formData.append('file', file);
    const response = await api.post(API_ENDPOINTS.HR.CERTIFICATE_UPLOAD, formData, {
      headers: {
        'Content-Type': 'multipart/form-data',
      },
    });
    return response.data;
  },

  /** Upload hình ảnh bằng cấp qua base64 */
  uploadBase64: async (base64: string, filename?: string): Promise<{ url: string; fileName: string }> => {
    const response = await api.post(API_ENDPOINTS.HR.CERTIFICATE_UPLOAD, { base64, filename });
    return response.data;
  },

  /** Nhân viên nộp hồ sơ văn bằng mới */
  submitCertificate: async (data: {
    certificateType: CertificateType;
    certificateNumber: string;
    issuedBy: string;
    issueDate: string;
    expiryDate?: string;
    purpose: CertificatePurpose;
    frontImageUrl: string;
    backImageUrl?: string;
  }): Promise<StaffCertificate> => {
    const response = await api.post(API_ENDPOINTS.HR.CERTIFICATES, data);
    return response.data;
  },

  /** Lấy danh sách văn bằng của chính nhân viên đăng nhập */
  getMyCertificates: async (): Promise<StaffCertificate[]> => {
    const response = await api.get(API_ENDPOINTS.HR.CERTIFICATES_MINE);
    return response.data;
  },

  /** Sửa lại hồ sơ khi bị từ chối */
  updateCertificate: async (
    id: string,
    data: Partial<StaffCertificate>,
  ): Promise<StaffCertificate> => {
    const response = await api.put(API_ENDPOINTS.HR.CERTIFICATE_DETAIL(id), data);
    return response.data;
  },

  /** Xóa hồ sơ văn bằng chưa duyệt */
  deleteCertificate: async (id: string): Promise<{ success: boolean; message: string }> => {
    const response = await api.delete(API_ENDPOINTS.HR.CERTIFICATE_DETAIL(id));
    return response.data;
  },

  /** Quản lý chi nhánh xem danh sách văn bằng nhân viên */
  listBranchCertificates: async (status?: string): Promise<StaffCertificate[]> => {
    const params: any = {};
    if (status && status !== 'all') params.status = status;
    const response = await api.get(API_ENDPOINTS.HR.CERTIFICATES_BRANCH, { params });
    return response.data;
  },

  /** Quản lý chi nhánh xem tổng quan thống kê bằng cấp */
  getBranchSummary: async (): Promise<BranchCertificateSummary> => {
    const response = await api.get(API_ENDPOINTS.HR.CERTIFICATES_SUMMARY);
    return response.data;
  },

  /** Quản lý chi nhánh phê duyệt văn bằng */
  approveCertificate: async (
    id: string,
    data: { monthlyAllowance?: number; isBranchPIC?: boolean },
  ): Promise<StaffCertificate> => {
    const response = await api.patch(API_ENDPOINTS.HR.CERTIFICATE_APPROVE(id), data);
    return response.data;
  },

  /** Quản lý chi nhánh từ chối văn bằng */
  rejectCertificate: async (
    id: string,
    data: { rejectionReason: string },
  ): Promise<StaffCertificate> => {
    const response = await api.patch(API_ENDPOINTS.HR.CERTIFICATE_REJECT(id), data);
    return response.data;
  },
};
