import {
  IsString,
  IsNotEmpty,
  IsOptional,
  IsNumber,
  IsBoolean,
  ValidateNested,
} from 'class-validator';
import { Type } from 'class-transformer';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class PayOSWebhookDataDto {
  @ApiProperty({ description: 'Mã đơn hàng' })
  @IsNumber()
  @Type(() => Number)
  orderCode: number;

  @ApiProperty({ description: 'Số tiền thực tế khách đã chuyển' })
  @IsNumber()
  @Type(() => Number)
  amount: number;

  @ApiPropertyOptional({ description: 'Nội dung chuyển khoản' })
  @IsString()
  @IsOptional()
  description?: string;

  @ApiPropertyOptional({ description: 'Số tài khoản nhận' })
  @IsString()
  @IsOptional()
  accountNumber?: string;

  @ApiProperty({ description: 'Mã tham chiếu giao dịch duy nhất từ ngân hàng' })
  @IsString()
  @IsNotEmpty()
  reference: string;

  @ApiPropertyOptional({ description: 'Thời gian giao dịch' })
  @IsString()
  @IsOptional()
  transactionDateTime?: string;

  @ApiPropertyOptional({ description: 'Mã liên kết thanh toán' })
  @IsString()
  @IsOptional()
  paymentLinkId?: string;

  @ApiPropertyOptional({ description: 'Mã ngân hàng chuyển tới' })
  @IsString()
  @IsOptional()
  counterAccountBankId?: string;

  @IsString()
  @IsOptional()
  currency?: string;

  @IsString()
  @IsOptional()
  code?: string;

  @IsString()
  @IsOptional()
  desc?: string;

  @IsString()
  @IsOptional()
  counterAccountBankName?: string;

  @IsString()
  @IsOptional()
  counterAccountName?: string;

  @IsString()
  @IsOptional()
  counterAccountNumber?: string;

  @IsString()
  @IsOptional()
  virtualAccountName?: string;

  @IsString()
  @IsOptional()
  virtualAccountNumber?: string;
}

export class PayOSWebhookDto {
  @ApiProperty({ description: 'Mã trạng thái phản hồi' })
  @IsString()
  code: string;

  @ApiProperty({ description: 'Mô tả trạng thái' })
  @IsString()
  desc: string;

  @ApiProperty({ description: 'Dữ liệu giao dịch' })
  @ValidateNested()
  @Type(() => PayOSWebhookDataDto)
  data: PayOSWebhookDataDto;

  @ApiProperty({ description: 'Chữ ký kiểm tra tính toàn vẹn HMAC-SHA256' })
  @IsString()
  @IsNotEmpty()
  signature: string;
}

export class ManualOverridePaymentDto {
  @ApiProperty({ description: 'Mã đơn hàng cần xác nhận khẩn cấp' })
  @IsNumber()
  @Type(() => Number)
  orderCode: number;

  @ApiProperty({ description: 'Mã giao dịch trên App ngân hàng của khách (VD: FT260927...)' })
  @IsString()
  @IsNotEmpty()
  bankTransactionId: string;

  @ApiPropertyOptional({ description: 'Số tiền thực nhận (nếu có)' })
  @IsOptional()
  @IsNumber()
  @Type(() => Number)
  actualAmount?: number;

  @ApiPropertyOptional({ description: 'Lý do xác nhận khẩn cấp tại quầy' })
  @IsString()
  @IsOptional()
  notes?: string;
}

export class ReconciliationQueryDto {
  @ApiPropertyOptional({ description: 'Mã chi nhánh' })
  @IsString()
  @IsOptional()
  branchId?: string;

  @ApiPropertyOptional({ description: 'Trạng thái đối soát' })
  @IsString()
  @IsOptional()
  status?: string;

  @ApiPropertyOptional({ description: 'Từ ngày (YYYY-MM-DD)' })
  @IsString()
  @IsOptional()
  startDate?: string;

  @ApiPropertyOptional({ description: 'Đến ngày (YYYY-MM-DD)' })
  @IsString()
  @IsOptional()
  endDate?: string;

  @ApiPropertyOptional({ description: 'Số trang' })
  @IsOptional()
  @IsNumber()
  @Type(() => Number)
  page?: number = 1;

  @ApiPropertyOptional({ description: 'Số dòng trên trang' })
  @IsOptional()
  @IsNumber()
  @Type(() => Number)
  limit?: number = 20;
}

export class ResolveDiscrepancyDto {
  @ApiProperty({ description: 'Ghi chú giải trình của Kế toán' })
  @IsString()
  @IsNotEmpty()
  resolutionNotes: string;

  @ApiPropertyOptional({ description: 'Đã hoàn tiền cho khách (nếu chuyển thừa)' })
  @IsBoolean()
  @IsOptional()
  refundProcessed?: boolean;
}
