import { Type } from 'class-transformer';
import { 
  IsString, 
  IsOptional, 
  IsNumber, 
  IsArray, 
  ValidateNested, 
  IsNotEmpty, 
  IsIn,
  IsBoolean 
} from 'class-validator';

export class OrderItemDto {
  @IsString()
  @IsNotEmpty()
  medicineId: string;

  @IsString()
  @IsNotEmpty()
  name: string;

  @IsNumber()
  price: number;

  @IsNumber()
  quantity: number;

  @IsString()
  @IsOptional()
  unit?: string;

  /** Number of base stock units contained in one sold unit. */
  @IsNumber()
  @IsOptional()
  exchangeValue?: number;

  @IsNumber()
  @IsOptional()
  dosePerTime?: number;

  @IsNumber()
  @IsOptional()
  timesPerDay?: number;

  @IsNumber()
  @IsOptional()
  dailyDose?: number;

  @IsNumber()
  @IsOptional()
  durationDays?: number;

  @IsString()
  @IsOptional()
  dosageInstructions?: string;
}

export class CreateOrderDto {
  @IsString()
  @IsOptional()
  patientName?: string;

  @IsString()
  @IsOptional()
  patientPhone?: string;

  @IsString()
  @IsOptional()
  patientEmail?: string;

  @IsString()
  @IsOptional()
  shippingAddress?: string;

  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => OrderItemDto)
  items: OrderItemDto[];

  @IsNumber()
  totalAmount: number;

  @IsString()
  @IsIn(['QR_PAY', 'CASH', 'CARD'])
  paymentMethod: string;

  @IsString()
  @IsOptional()
  @IsIn(['ONLINE', 'RETAIL', 'POS_SALE'])
  type?: string;

  @IsString()
  @IsOptional()
  voucherCode?: string;

  @IsNumber()
  @IsOptional()
  redeemedPoints?: number;

  @IsString()
  @IsOptional()
  userId?: string;

  @IsString()
  @IsOptional()
  branchId?: string;

  @IsString()
  @IsOptional()
  returnUrl?: string;

  @IsString()
  @IsOptional()
  cancelUrl?: string;

  // AI decision-support audit trail
  @IsBoolean()
  @IsOptional()
  isAiAssisted?: boolean;

  @IsString()
  @IsOptional()
  aiAuditCode?: string;

  @IsString()
  @IsOptional()
  consultationId?: string;

  @IsString()
  @IsOptional()
  pharmacistApprovedBy?: string;

  @IsString()
  @IsOptional()
  approvedBy?: string;

  @IsString()
  @IsOptional()
  approvedAt?: string;
}
