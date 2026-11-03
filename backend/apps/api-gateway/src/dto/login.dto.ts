import { IsOptional, IsString, MinLength, MaxLength } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class LoginDto {
  @ApiProperty({ example: 'admin@vinapharmacy.com', description: 'User email or identifier', required: false })
  @IsOptional()
  @IsString()
  email?: string;

  @ApiProperty({ example: '0988123456', description: 'User phone number', required: false })
  @IsOptional()
  @IsString()
  phone?: string;

  @ApiProperty({ example: '123456', description: 'User password (minimum 6 characters)' })
  @IsString()
  @MinLength(6, { message: 'Mật khẩu phải có ít nhất 6 ký tự' })
  @MaxLength(100)
  password: string;
}

