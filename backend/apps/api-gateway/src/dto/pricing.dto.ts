import { ArrayMaxSize, ArrayMinSize, IsArray, IsBoolean, IsInt, IsNotEmpty, IsOptional, IsString, Max, Min, ValidateNested } from 'class-validator';
import { Type } from 'class-transformer';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class WholesaleTierDto {
  @ApiProperty({ description: 'Số lượng mua tối thiểu để áp dụng mức giá sỉ', example: 10, minimum: 1 })
  @IsInt({ message: 'Số lượng tối thiểu của bậc sỉ phải là số nguyên' })
  @Min(1, { message: 'Số lượng tối thiểu của bậc sỉ phải từ 1 trở lên' })
  minQuantity: number;

  @ApiProperty({ description: 'Đơn giá sỉ tương ứng (VNĐ)', example: 45000, minimum: 0 })
  @IsInt({ message: 'Đơn giá bậc sỉ phải là số nguyên (VNĐ)' })
  @Min(0, { message: 'Đơn giá bậc sỉ không được nhỏ hơn 0 đ' })
  price: number;
}

export class UpsertBranchPriceDto {
  @ApiPropertyOptional({ description: 'Giá bán lẻ tại chi nhánh (VNĐ)', example: 50000, minimum: 0 })
  @IsOptional()
  @IsInt({ message: 'Giá bán lẻ phải là số nguyên (VNĐ)' })
  @Min(0, { message: 'Giá bán lẻ không được nhỏ hơn 0 đ' })
  @Max(1000000000, { message: 'Giá bán lẻ vượt quá giới hạn tối đa cho phép' })
  retailPrice?: number;

  @ApiPropertyOptional({ description: 'Giá bán sỉ cơ bản tại chi nhánh (VNĐ)', example: 48000, minimum: 0 })
  @IsOptional()
  @IsInt({ message: 'Giá bán sỉ cơ bản phải là số nguyên (VNĐ)' })
  @Min(0, { message: 'Giá bán sỉ cơ bản không được nhỏ hơn 0 đ' })
  @Max(1000000000, { message: 'Giá bán sỉ cơ bản vượt quá giới hạn tối đa cho phép' })
  wholesalePrice?: number;

  @ApiPropertyOptional({ description: 'Các bậc thang giá sỉ theo số lượng', type: [WholesaleTierDto] })
  @IsOptional()
  @IsArray({ message: 'Bậc thang giá sỉ phải là một danh sách' })
  @ValidateNested({ each: true })
  @Type(() => WholesaleTierDto)
  wholesaleTiers?: WholesaleTierDto[];

  @ApiPropertyOptional({ description: 'Mức tồn kho tối thiểu cảnh báo', example: 10, minimum: 0 })
  @IsOptional()
  @IsInt({ message: 'Mức tồn kho tối thiểu phải là số nguyên' })
  @Min(0, { message: 'Mức tồn kho tối thiểu không được nhỏ hơn 0' })
  minStock?: number;

  @ApiPropertyOptional({ description: 'Trạng thái kích hoạt bảng giá', example: true, default: true })
  @IsOptional()
  @IsBoolean({ message: 'Trạng thái kích hoạt phải là kiểu boolean' })
  isActive?: boolean;
}

export class BulkPriceItemDto extends UpsertBranchPriceDto {
  @ApiProperty({ description: 'Mã ID của dược phẩm', example: '6a21a9a84f7acd1b57259761' })
  @IsString({ message: 'ID dược phẩm phải là chuỗi' })
  @IsNotEmpty({ message: 'ID dược phẩm không được để trống' })
  medicineId: string;
}

export class BulkUpsertBranchPriceDto {
  @ApiProperty({ description: 'Danh sách các mặt hàng cần cập nhật bảng giá (1 - 500 mặt hàng)', type: [BulkPriceItemDto] })
  @IsArray({ message: 'Danh sách mặt hàng phải là một mảng' })
  @ArrayMinSize(1, { message: 'Danh sách mặt hàng không được để rỗng' })
  @ArrayMaxSize(500, { message: 'Mỗi lần chỉ được cập nhật tối đa 500 mặt hàng' })
  @ValidateNested({ each: true })
  @Type(() => BulkPriceItemDto)
  items: BulkPriceItemDto[];
}

export class CopyPriceListDto {
  @ApiProperty({ description: 'ID chi nhánh nguồn', example: '6a2bc52d446f5ecaa1f508bd' })
  @IsString({ message: 'ID chi nhánh nguồn phải là chuỗi' })
  @IsNotEmpty({ message: 'ID chi nhánh nguồn không được để trống' })
  fromBranchId: string;

  @ApiProperty({ description: 'ID chi nhánh đích', example: 'BR-001' })
  @IsString({ message: 'ID chi nhánh đích phải là chuỗi' })
  @IsNotEmpty({ message: 'ID chi nhánh đích không được để trống' })
  toBranchId: string;
}

export class SyncAllPriceListDto {
  @ApiProperty({ description: 'ID chi nhánh nguồn dùng để đồng bộ toàn chuỗi', example: '6a2bc52d446f5ecaa1f508bd' })
  @IsString({ message: 'ID chi nhánh nguồn phải là chuỗi' })
  @IsNotEmpty({ message: 'ID chi nhánh nguồn không được để trống' })
  fromBranchId: string;
}
