import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document, Types } from 'mongoose';

export type StaffCertificateDocument = StaffCertificate & Document;

export enum CertificateType {
  PHARMACIST_UNIVERSITY = 'PHARMACIST_UNIVERSITY', // Bằng Dược sĩ Đại học
  PHARMACIST_COLLEGE = 'PHARMACIST_COLLEGE',       // Bằng Dược sĩ Cao đẳng
  PHARMACIST_INTERMEDIATE = 'PHARMACIST_INTERMEDIATE', // Bằng Trung cấp Dược
  PRACTICE_CERTIFICATE = 'PRACTICE_CERTIFICATE',   // Chứng chỉ hành nghề Dược (CCHN)
  CONTINUING_EDUCATION = 'CONTINUING_EDUCATION',   // Chứng chỉ đào tạo liên tục (CPE)
}

export enum CertificatePurpose {
  ALLOWANCE_ONLY = 'ALLOWANCE_ONLY',               // Hưởng phụ cấp chuyên môn thông thường
  BRANCH_PIC_RESPONSIBLE = 'BRANCH_PIC_RESPONSIBLE', // Đăng ký đứng tên PTCM chi nhánh
}

export enum CertificateStatus {
  CHO_DUYET = 'CHO_DUYET', // Chờ thẩm định
  DA_DUYET = 'DA_DUYET',   // Đã phê duyệt hợp lệ
  TU_CHOI = 'TU_CHOI',     // Bị từ chối
}

@Schema({ timestamps: true })
export class StaffCertificate extends Document {
  @Prop({ type: Types.ObjectId, ref: 'User', required: true, index: true })
  userId: Types.ObjectId;

  @Prop({ required: true })
  userFullName: string;

  @Prop({ required: true })
  userEmail: string;

  @Prop({ default: null, index: true })
  branchId: string;

  @Prop({ required: true, enum: CertificateType })
  certificateType: CertificateType;

  @Prop({ required: true, index: true })
  certificateNumber: string;

  @Prop({ required: true })
  issuedBy: string;

  @Prop({ required: true })
  issueDate: string;

  @Prop({ default: null })
  expiryDate?: string;

  @Prop({ required: true, enum: CertificatePurpose, default: CertificatePurpose.ALLOWANCE_ONLY })
  purpose: CertificatePurpose;

  @Prop({ required: true })
  frontImageUrl: string;

  @Prop({ default: null })
  backImageUrl?: string;

  @Prop({ required: true, enum: CertificateStatus, default: CertificateStatus.CHO_DUYET, index: true })
  status: CertificateStatus;

  @Prop({ default: '' })
  rejectionReason?: string;

  @Prop({ default: 0 })
  monthlyAllowance: number;

  @Prop({ default: false })
  isBranchPIC: boolean;

  @Prop({ type: Types.ObjectId, ref: 'User', default: null })
  verifiedBy?: Types.ObjectId;

  @Prop({ default: null })
  verifiedByName?: string;

  @Prop({ default: null })
  verifiedAt?: Date;

  @Prop({ default: () => new Date() })
  submittedAt: Date;
}

export const StaffCertificateSchema = SchemaFactory.createForClass(StaffCertificate);
