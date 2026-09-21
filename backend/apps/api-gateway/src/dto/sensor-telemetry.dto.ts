import { Type } from 'class-transformer';
import {
  IsString,
  IsBoolean,
  IsNumber,
  IsOptional,
  IsArray,
  ValidateNested,
} from 'class-validator';

export class TelemetryMetricsDto {
  @IsNumber()
  @IsOptional()
  temperature?: number;

  @IsNumber()
  @IsOptional()
  humidity?: number;

  @IsNumber()
  @IsOptional()
  dew_point?: number;

  @IsNumber()
  @IsOptional()
  vpd?: number;
}

export class TelemetryDiagnosticsDto {
  @IsNumber()
  @IsOptional()
  chip_temp?: number;

  @IsNumber()
  @IsOptional()
  cpu_load?: number;

  @IsNumber()
  @IsOptional()
  cpu0?: number;

  @IsNumber()
  @IsOptional()
  cpu1?: number;

  @IsNumber()
  @IsOptional()
  free_heap?: number;

  @IsNumber()
  @IsOptional()
  uptime_sec?: number;

  @IsNumber()
  @IsOptional()
  wifi_rssi?: number;
}

export class TelemetryStatusDto {
  @IsBoolean()
  @IsOptional()
  alert?: boolean;

  @IsBoolean()
  @IsOptional()
  sensor_valid?: boolean;
}

export class TelemetryRecordItemDto {
  @IsNumber()
  @IsOptional()
  timestamp?: number;

  @IsNumber()
  @IsOptional()
  seq?: number;

  @ValidateNested()
  @Type(() => TelemetryMetricsDto)
  @IsOptional()
  metrics?: TelemetryMetricsDto;

  @ValidateNested()
  @Type(() => TelemetryDiagnosticsDto)
  @IsOptional()
  diagnostics?: TelemetryDiagnosticsDto;

  @ValidateNested()
  @Type(() => TelemetryStatusDto)
  @IsOptional()
  status?: TelemetryStatusDto;
}

export class SensorIngestDto {
  @IsString()
  @IsOptional()
  device_id?: string;

  @IsBoolean()
  @IsOptional()
  batch?: boolean;

  @IsNumber()
  @IsOptional()
  count?: number;

  @IsNumber()
  @IsOptional()
  timestamp?: number;

  @IsNumber()
  @IsOptional()
  seq?: number;

  @ValidateNested()
  @Type(() => TelemetryMetricsDto)
  @IsOptional()
  metrics?: TelemetryMetricsDto;

  @ValidateNested()
  @Type(() => TelemetryDiagnosticsDto)
  @IsOptional()
  diagnostics?: TelemetryDiagnosticsDto;

  @ValidateNested()
  @Type(() => TelemetryStatusDto)
  @IsOptional()
  status?: TelemetryStatusDto;

  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => TelemetryRecordItemDto)
  @IsOptional()
  records?: TelemetryRecordItemDto[];
}
