import {
  IsString,
  IsNotEmpty,
  IsOptional,
  IsNumber,
  Min,
  Max,
  IsArray,
  IsBoolean,
} from 'class-validator';
import { Type } from 'class-transformer';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class CreateFeedbackDto {
  @ApiProperty({ description: 'Mã đơn hàng / hóa đơn' })
  @IsString()
  @IsNotEmpty()
  orderCode: string;

  @ApiPropertyOptional({ description: 'ID đơn hàng trong hệ thống' })
  @IsString()
  @IsOptional()
  orderId?: string;

  @ApiProperty({ description: 'Mã chi nhánh' })
  @IsString()
  @IsNotEmpty()
  branchId: string;

  @ApiPropertyOptional({ description: 'Tên chi nhánh' })
  @IsString()
  @IsOptional()
  branchName?: string;

  @ApiProperty({ description: 'Số điện thoại khách hàng' })
  @IsString()
  @IsNotEmpty()
  customerPhone: string;

  @ApiPropertyOptional({ description: 'Họ tên khách hàng' })
  @IsString()
  @IsOptional()
  customerName?: string;

  @ApiPropertyOptional({ description: 'Tên dược sĩ phụ trách' })
  @IsString()
  @IsOptional()
  pharmacistName?: string;

  @ApiProperty({ description: 'Điểm đánh giá từ 1 đến 5 sao', minimum: 1, maximum: 5 })
  @IsNumber()
  @Min(1)
  @Max(5)
  @Type(() => Number)
  rating: number;

  @ApiPropertyOptional({ description: 'Các nhãn đánh giá', type: [String] })
  @IsArray()
  @IsString({ each: true })
  @IsOptional()
  tags?: string[];

  @ApiPropertyOptional({ description: 'Ý kiến đóng góp' })
  @IsString()
  @IsOptional()
  comment?: string;

  @ApiPropertyOptional({ description: 'Hình ảnh đính kèm', type: [String] })
  @IsArray()
  @IsString({ each: true })
  @IsOptional()
  images?: string[];
}

export class ResolveFeedbackDto {
  @ApiPropertyOptional({ description: 'Hình thức xử lý khiếu nại' })
  @IsString()
  @IsOptional()
  actionTaken?: string;

  @ApiProperty({ description: 'Ghi chú biên bản giải quyết của Trưởng chi nhánh' })
  @IsString()
  @IsNotEmpty()
  notes: string;

  @ApiPropertyOptional({ description: 'Khách hàng đã hài lòng sau giải quyết hay chưa' })
  @IsBoolean()
  @IsOptional()
  customerSatisfied?: boolean;
}

export class BranchFeedbackQueryDto {
  @ApiPropertyOptional({ description: 'Lọc theo trạng thái xử lý' })
  @IsString()
  @IsOptional()
  status?: string;

  @ApiPropertyOptional({ description: 'Lọc theo số sao' })
  @IsOptional()
  @IsNumber()
  @Min(1)
  @Max(5)
  @Type(() => Number)
  rating?: number;

  @ApiPropertyOptional({ description: 'Số trang', default: 1 })
  @IsOptional()
  @IsNumber()
  @Type(() => Number)
  page?: number = 1;

  @ApiPropertyOptional({ description: 'Số bản ghi trên trang', default: 20 })
  @IsOptional()
  @IsNumber()
  @Type(() => Number)
  limit?: number = 20;
}
