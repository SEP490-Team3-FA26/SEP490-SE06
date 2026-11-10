import { ApiProperty } from '@nestjs/swagger';
import { IsEmail, IsString, MinLength, MaxLength, IsEnum, IsOptional } from 'class-validator';

export enum UserRole {
  ADMIN = 'admin',
  MANAGER = 'manager',
  STAFF = 'staff',
  WAREHOUSE = 'warehouse',
  CUSTOMER = 'customer',
  USER = 'user',
  MOH_INSPECTOR = 'moh_inspector',
}

export class RegisterDto {
  @ApiProperty({ example: 'Nguyễn Văn A' })
  @IsString()
  @MinLength(2)
  fullName: string;

  @ApiProperty({ example: 'nguyenvana@wdp301.com' })
  @IsEmail({}, { message: 'Email không hợp lệ' })
  email: string;

  @ApiProperty({ example: '123456' })
  @IsString()
  @MinLength(6, { message: 'Mật khẩu phải có ít nhất 6 ký tự' })
  @MaxLength(100)
  password: string;

  @ApiProperty({ example: 'user', enum: UserRole, required: false })
  @IsEnum(UserRole)
  @IsOptional()
  role?: UserRole;

  @ApiProperty({ example: '0901234567', required: false })
  @IsString()
  @IsOptional()
  phone?: string;

  @ApiProperty({ example: true, required: false, description: 'Đồng ý với Quy định bảo mật thông tin' })
  @IsOptional()
  agreePrivacy?: boolean | string;

  @ApiProperty({ example: 'v1.0', required: false, description: 'Phiên bản chính sách bảo mật' })
  @IsOptional()
  @IsString()
  privacyPolicyVersion?: string;

  @ApiProperty({ example: '2026-11-08T12:00:00.000Z', required: false, description: 'Thời điểm chấp thuận chính sách' })
  @IsOptional()
  @IsString()
  privacyAgreedAt?: string;
}
