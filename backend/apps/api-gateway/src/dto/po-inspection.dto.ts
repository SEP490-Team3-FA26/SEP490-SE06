import { IsString, IsArray, ValidateNested, IsOptional, IsNumber } from 'class-validator';
import { Type } from 'class-transformer';

export class PoInspectionItemDto {
  @IsOptional()
  @IsString()
  medicineId?: string;

  @IsOptional()
  @IsString()
  _id?: string;

  @IsOptional()
  @IsString()
  medicineName?: string;

  @IsOptional()
  @IsString()
  batchNo?: string;

  @IsOptional()
  @IsString()
  expDate?: string;

  @IsOptional()
  @IsNumber()
  actualQty?: number;

  @IsOptional()
  @IsNumber()
  expectedQty?: number;

  @IsOptional()
  @IsNumber()
  discrepancy?: number;

  @IsOptional()
  @IsString()
  qualityStatus?: string;
}

export class SavePoInspectionDto {
  @IsArray({ message: 'items phải là mảng danh sách mặt hàng' })
  @ValidateNested({ each: true })
  @Type(() => PoInspectionItemDto)
  items: PoInspectionItemDto[];

  @IsOptional()
  @IsString()
  inspectedAt?: string;

  @IsOptional()
  @IsString()
  inspectedBy?: string;

  @IsOptional()
  @IsString()
  status?: string;

  @IsOptional()
  @IsString()
  poId?: string;
}
