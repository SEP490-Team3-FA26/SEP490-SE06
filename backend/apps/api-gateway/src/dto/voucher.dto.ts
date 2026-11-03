import { IsBoolean, IsDateString, IsIn, IsInt, IsNotEmpty, IsOptional, IsString, Max, Min, IsNumber, ValidateNested, IsArray } from 'class-validator';
import { Type } from 'class-transformer';
import { ApiProperty, ApiPropertyOptional, PartialType } from '@nestjs/swagger';

// DTO điều kiện mua hàng cho Mua X tặng Y
export class BuyConditionDto {
  @ApiPropertyOptional({ description: 'ID thuốc cần mua' })
  @IsOptional()
  @IsString()
  buyMedicineId?: string;

  @ApiPropertyOptional({ description: 'Tên thuốc cần mua' })
  @IsOptional()
  @IsString()
  buyMedicineName?: string;

  @ApiPropertyOptional({ description: 'Số lượng mua tối thiểu' })
  @IsOptional()
  @IsNumber()
  buyQuantity?: number;
}

// DTO quà tặng kèm cho Mua X tặng Y
export class GiftRewardDto {
  @ApiPropertyOptional({ description: 'ID thuốc quà tặng' })
  @IsOptional()
  @IsString()
  giftMedicineId?: string;

  @ApiPropertyOptional({ description: 'Tên thuốc quà tặng' })
  @IsOptional()
  @IsString()
  giftMedicineName?: string;

  @ApiPropertyOptional({ description: 'Số lượng quà tặng' })
  @IsOptional()
  @IsNumber()
  giftQuantity?: number;

  @ApiPropertyOptional({ description: 'Tỷ lệ giảm giá cho quà (%)', default: 100 })
  @IsOptional()
  @IsNumber()
  giftDiscountPercent?: number;
}

// DTO chi tiết thuốc trong Combo
export class ComboItemConditionDto {
  @ApiProperty({ description: 'ID thuốc trong Combo' })
  @IsString()
  medicineId: string;

  @ApiPropertyOptional({ description: 'Tên thuốc trong Combo' })
  @IsOptional()
  @IsString()
  medicineName?: string;

  @ApiProperty({ description: 'Số lượng yêu cầu trong Combo' })
  @IsNumber()
  minQuantity: number;
}

// DTO điều kiện gói Combo khuyến mãi
export class ComboConditionDto {
  @ApiPropertyOptional({ description: 'Danh sách các thuốc bắt buộc trong Combo' })
  @IsOptional()
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => ComboItemConditionDto)
  comboMedicines?: ComboItemConditionDto[];

  @ApiPropertyOptional({ description: 'Loại giảm giá Combo' })
  @IsOptional()
  @IsString()
  comboDiscountType?: string;

  @ApiPropertyOptional({ description: 'Giá trị giảm Combo' })
  @IsOptional()
  @IsNumber()
  comboDiscountValue?: number;
}

export class CreateVoucherDto {
  @ApiProperty({ description: 'Mã voucher khuyến mãi', example: 'CHAOXUAN2026' })
  @IsString({ message: 'Mã voucher phải là chuỗi' })
  @IsNotEmpty({ message: 'Mã voucher không được để trống' })
  code: string;

  @ApiPropertyOptional({ description: 'Loại quy tắc voucher (STANDARD, BUY_X_GET_Y, COMBO)', example: 'STANDARD' })
  @IsOptional()
  @IsString()
  ruleType?: 'STANDARD' | 'BUY_X_GET_Y' | 'COMBO';

  @ApiPropertyOptional({ description: 'Mô tả chương trình voucher' })
  @IsOptional()
  @IsString()
  description?: string;

  @ApiPropertyOptional({ description: 'Loại giảm giá', example: 'PERCENTAGE' })
  @IsOptional()
  @IsIn(['PERCENTAGE', 'FIXED', 'FIXED_AMOUNT'], { message: 'Loại giảm giá phải là PERCENTAGE, FIXED hoặc FIXED_AMOUNT' })
  discountType?: 'PERCENTAGE' | 'FIXED' | 'FIXED_AMOUNT';

  @ApiPropertyOptional({ description: 'Giá trị giảm (% hoặc VNĐ)', example: 10 })
  @IsOptional()
  @IsNumber({}, { message: 'Giá trị giảm giá phải là số' })
  discountValue?: number;

  @ApiPropertyOptional({ description: 'Giá trị đơn hàng tối thiểu (VNĐ)', example: 100000, minimum: 0 })
  @IsOptional()
  @IsNumber({}, { message: 'Đơn hàng tối thiểu phải là số' })
  minOrderValue?: number;

  @ApiPropertyOptional({ description: 'Mức giảm tối đa cho voucher % (VNĐ)', example: 50000, minimum: 0 })
  @IsOptional()
  @IsNumber({}, { message: 'Mức giảm tối đa phải là số' })
  maxDiscountValue?: number;

  @ApiPropertyOptional({ description: 'Số lượt sử dụng tối đa', example: 100, minimum: 1 })
  @IsOptional()
  @IsInt({ message: 'Số lượt dùng phải là số nguyên' })
  usageLimit?: number;

  @ApiPropertyOptional({ description: 'Ngày bắt đầu hiệu lực (ISO 8601)' })
  @IsOptional()
  @IsDateString({}, { message: 'Ngày bắt đầu phải đúng định dạng ngày' })
  startDate?: string;

  @ApiPropertyOptional({ description: 'Ngày hết hạn hiệu lực (ISO 8601)' })
  @IsOptional()
  @IsDateString({}, { message: 'Ngày kết thúc phải đúng định dạng ngày' })
  endDate?: string;

  @ApiPropertyOptional({ description: 'Ngày hết hạn hiệu lực (ISO 8601)' })
  @IsOptional()
  @IsDateString({}, { message: 'Ngày hết hạn phải đúng định dạng ngày' })
  expiryDate?: string;

  @ApiPropertyOptional({ description: 'Trạng thái kích hoạt', default: true })
  @IsOptional()
  @IsBoolean({ message: 'Trạng thái kích hoạt phải là boolean' })
  isActive?: boolean;

  // Điều kiện Mua X tặng Y (UC-75)
  @ApiPropertyOptional({ description: 'Điều kiện mua Mua X tặng Y' })
  @IsOptional()
  @ValidateNested()
  @Type(() => BuyConditionDto)
  buyCondition?: BuyConditionDto;

  // Quà tặng kèm cho Mua X tặng Y (UC-75)
  @ApiPropertyOptional({ description: 'Quà tặng kèm Mua X tặng Y' })
  @IsOptional()
  @ValidateNested()
  @Type(() => GiftRewardDto)
  giftReward?: GiftRewardDto;

  // Điều kiện mua theo Combo (UC-75)
  @ApiPropertyOptional({ description: 'Điều kiện gói Combo' })
  @IsOptional()
  @ValidateNested()
  @Type(() => ComboConditionDto)
  comboCondition?: ComboConditionDto;
}

export class UpdateVoucherDto extends PartialType(CreateVoucherDto) {}
