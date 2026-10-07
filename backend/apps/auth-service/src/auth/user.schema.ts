import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document } from 'mongoose';

export enum UserRole {
  ADMIN = 'admin',
  DIRECTOR = 'director',
  HEAD_BRANCH = 'head_branch',
  WAREHOUSE = 'warehouse',
  BRANCH = 'branch',
  PHARMACIST = 'pharmacist',
  USER = 'user',
}

export type UserDocument = User & Document;

@Schema({ timestamps: true })
export class User extends Document {
  /** Email dùng để đăng nhập và nhận thông báo hệ thống (Duy nhất trong hệ thống) */
  @Prop({ required: true, unique: true })
  email: string;

  /** Chuỗi băm mật khẩu (Bcrypt) phục vụ xác thực bảo mật */
  @Prop({ required: true })
  passwordHash: string;

  /** Họ và tên đầy đủ của người dùng / nhân viên / dược sĩ */
  @Prop({ required: true })
  fullName: string;

  /** Phân quyền truy cập theo hệ thống RBAC (Admin, Dược sĩ, Kho, Giám đốc, Khách hàng...) */
  @Prop({ type: String, enum: UserRole, default: UserRole.PHARMACIST })
  role: UserRole;

  /** Trạng thái kích hoạt tài khoản (true: đang hoạt động, false: đã bị khóa/ban) */
  @Prop({ default: true })
  isActive: boolean;

  /** Cờ xác nhận người dùng đã xác thực email thành công hay chưa */
  @Prop({ default: false })
  isEmailVerified: boolean;

  /** Trạng thái phê duyệt nhân sự/dược sĩ bởi Quản trị viên ('pending', 'approved', 'rejected') */
  @Prop({ type: String, enum: ['pending', 'approved', 'rejected'], default: 'approved' })
  isApproved: string;

  /** Đường dẫn URL ảnh đại diện (Avatar) của người dùng */
  @Prop()
  avatarUrl?: string;

  /** ID định danh Google OAuth khi đăng nhập bằng tài khoản Google */
  @Prop()
  googleId?: string;

  /** ID chi nhánh nhà thuốc mà nhân sự/dược sĩ được chỉ định công tác */
  @Prop({ default: null })
  branchId?: string;

  /** Tên chi nhánh nhà thuốc tương ứng với branchId */
  @Prop({ default: null })
  branchName?: string;

  /** Cờ bật/tắt cơ chế xác thực hai yếu tố (2FA - Two-Factor Authentication) */
  @Prop({ default: false })
  isTwoFactorEnabled: boolean;

  /** Số điện thoại liên hệ, dùng đăng nhập và tra cứu khách hàng thân thiết tại quầy */
  @Prop({ unique: true, sparse: true })
  phone?: string;

  /** Địa chỉ cư trú hoặc địa chỉ nhận hàng mặc định của người dùng */
  @Prop()
  address?: string;

  /** Số điểm thưởng tích lũy khả dụng hiện tại (dùng để cấn trừ thanh toán đơn hàng) */
  @Prop({ default: 0 })
  points: number;

  /** Tổng điểm tích lũy trọn đời (dùng để xét thăng hạng thành viên Loyalty) */
  @Prop({ default: 0 })
  accumulatedPoints: number;

  /** Hạng thành viên khách hàng thân thiết (Bronze, Silver, Gold, Platinum) */
  @Prop({ default: 'Bronze' })
  tier?: string;

  /** Tiền sử dị ứng thuốc/hoạt chất (dùng cho AI kiểm tra và cảnh báo an toàn lâm sàng) */
  @Prop({ type: [String], default: [] })
  allergies?: string[];

  /** Tiền sử bệnh mãn tính (tiểu đường, tăng huyết áp... để AI kiểm tra chống chỉ định khi kê đơn) */
  @Prop({ type: [String], default: [] })
  chronicConditions?: string[];
}

export const UserSchema = SchemaFactory.createForClass(User);

