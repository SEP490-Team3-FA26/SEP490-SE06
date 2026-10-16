import { IsBoolean, IsDateString, IsIn, IsInt, IsNotEmpty, IsOptional, IsString, Max, Min } from 'class-validator';
import { ApiProperty, ApiPropertyOptional, PartialType } from '@nestjs/swagger';

export class CreateVoucherDto {
  @ApiProperty({ description: 'Mã voucher khuyến mãi', example: 'CHAOXUAN2026' })
  @IsString({ message: 'Mã voucher phải là chuỗi' })
  @IsNotEmpty({ message: 'Mã voucher không được để trống' })
  code: string;

  @ApiPropertyOptional({ description: 'Mô tả chương trình voucher' })
  @IsOptional()
  @IsString()
  description?: string;

  @ApiProperty({ description: 'Loại giảm giá', enum: ['PERCENTAGE', 'FIXED'], example: 'PERCENTAGE' })
  @IsIn(['PERCENTAGE', 'FIXED'], { message: 'Loại giảm giá phải là PERCENTAGE hoặc FIXED' })
  discountType: 'PERCENTAGE' | 'FIXED';

  @ApiProperty({ description: 'Giá trị giảm (% hoặc VNĐ)', example: 10, minimum: 1 })
  @IsInt({ message: 'Giá trị giảm giá phải là số nguyên' })
  @Min(1, { message: 'Giá trị giảm giá tối thiểu là 1' })
  discountValue: number;

  @ApiPropertyOptional({ description: 'Giá trị đơn hàng tối thiểu (VNĐ)', example: 100000, minimum: 0 })
  @IsOptional()
  @IsInt({ message: 'Đơn hàng tối thiểu phải là số nguyên' })
  @Min(0, { message: 'Đơn hàng tối thiểu không được nhỏ hơn 0 đ' })
  minOrderValue?: number;

  @ApiPropertyOptional({ description: 'Mức giảm tối đa cho voucher % (VNĐ)', example: 50000, minimum: 0 })
  @IsOptional()
  @IsInt({ message: 'Mức giảm tối đa phải là số nguyên' })
  @Min(0, { message: 'Mức giảm tối đa không được nhỏ hơn 0 đ' })
  maxDiscountValue?: number;

  @ApiPropertyOptional({ description: 'Số lượt sử dụng tối đa', example: 100, minimum: 1 })
  @IsOptional()
  @IsInt({ message: 'Số lượt dùng phải là số nguyên' })
  @Min(1, { message: 'Số lượt dùng tối thiểu là 1' })
  usageLimit?: number;

  @ApiPropertyOptional({ description: 'Ngày bắt đầu hiệu lực (ISO 8601)' })
  @IsOptional()
  @IsDateString({}, { message: 'Ngày bắt đầu phải đúng định dạng ngày' })
  startDate?: string;

  @ApiPropertyOptional({ description: 'Ngày hết hạn hiệu lực (ISO 8601)' })
  @IsOptional()
  @IsDateString({}, { message: 'Ngày kết thúc phải đúng định dạng ngày' })
  endDate?: string;

  @ApiPropertyOptional({ description: 'Trạng thái kích hoạt', default: true })
  @IsOptional()
  @IsBoolean({ message: 'Trạng thái kích hoạt phải là boolean' })
  isActive?: boolean;
}

export class UpdateVoucherDto extends PartialType(CreateVoucherDto) {}
