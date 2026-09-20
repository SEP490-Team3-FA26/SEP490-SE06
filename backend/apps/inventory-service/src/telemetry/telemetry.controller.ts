import { Controller, Logger } from '@nestjs/common';
import { MessagePattern, EventPattern, Payload } from '@nestjs/microservices';
import { TelemetryService } from './telemetry.service';

@Controller()
export class TelemetryController {
  private readonly logger = new Logger(TelemetryController.name);

  constructor(private readonly telemetryService: TelemetryService) {}

  // Lắng nghe sự kiện Ingest Telemetry từ API Gateway (Event-Driven phi chặn)
  @EventPattern('sensor.telemetry.ingest')
  async handleIngest(@Payload() payload: any) {
    try {
      const data = typeof payload === 'string' ? JSON.parse(payload) : payload;
      await this.telemetryService.handleIngestEvent(data);
    } catch (err) {
      this.logger.error('Lỗi khi xử lý sự kiện sensor.telemetry.ingest:', err);
    }
  }

  // Lấy chỉ số quan trắc mới nhất
  @MessagePattern('inventory.sensor.get_latest')
  async getLatest(@Payload() payload: { deviceId?: string }) {
    return await this.telemetryService.getLatest(payload?.deviceId);
  }

  // Lấy dữ liệu chuỗi thời gian lịch sử (5m, 1h, 24h, 7d)
  @MessagePattern('inventory.sensor.get_history')
  async getHistory(@Payload() payload: { deviceId?: string; range?: string }) {
    return await this.telemetryService.getHistory(
      payload?.deviceId || 'ESP32S3_404CCA44C814',
      payload?.range || '1h',
    );
  }

  // Lấy danh sách các trạm cảm biến
  @MessagePattern('inventory.sensor.get_stations')
  async getStations() {
    return await this.telemetryService.getStations();
  }
}
