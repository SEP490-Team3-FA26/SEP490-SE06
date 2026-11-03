import { Controller, Logger } from '@nestjs/common';
import { MessagePattern, EventPattern, Payload, RpcException, Ctx, KafkaContext } from '@nestjs/microservices';
import { ReportsService } from './reports.service';

@Controller()
export class ReportsController {
  private readonly logger = new Logger(ReportsController.name);

  constructor(private readonly reportsService: ReportsService) {}

  // ==========================================
  // Xử lý sự kiện bất đồng bộ huấn luyện AI qua Kafka
  // ==========================================
  @EventPattern('ai.forecast.event.train')
  async handleTrainAIForecast(@Payload() data: any) {
    try {
      const parsed = typeof data === 'string' ? JSON.parse(data) : data;
      this.logger.log(`[Kafka Event] Nhận yêu cầu huấn luyện lại AI Demand Forecast từ: ${parsed?.triggeredBy || 'Unknown'}`);
      
      const baseUrl = process.env.AI_SERVICE_URL || 'http://ai-service:8000';
      const epochs = parsed?.epochs || 60;
      const batch_size = parsed?.batch_size || 64;

      // Kích hoạt tiến trình huấn luyện ngầm trên AI Service
      fetch(`${baseUrl}/api/ai/forecast/train`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ epochs, batch_size }),
      }).then(res => {
        if (res.ok) {
          this.logger.log(`[Kafka Event] AI Service đã tiếp nhận lệnh huấn luyện AI Forecast thành công!`);
        } else {
          this.logger.warn(`[Kafka Event] AI Service phản hồi mã lỗi: ${res.status}`);
        }
      }).catch(err => {
        this.logger.warn(`[Kafka Event] Không kết nối được ${baseUrl}, thử fallback http://localhost:8000: ${err.message}`);
        fetch(`http://localhost:8000/api/ai/forecast/train`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ epochs, batch_size }),
        }).catch(fallbackErr => {
          this.logger.error(`[Kafka Event] Lỗi kích hoạt huấn luyện trên fallback: ${fallbackErr.message}`);
        });
      });
    } catch (err: any) {
      this.logger.error(`[Kafka Event] Lỗi xử lý sự kiện ai.forecast.event.train: ${err.message}`);
    }
  }

  @MessagePattern('inventory.report.create')
  async createReportRecord(@Payload() data: any) {
    try {
      return await this.reportsService.createReportRecord(data);
    } catch (error: any) {
      if (error instanceof RpcException) throw error;
      throw new RpcException(error.message || 'Lỗi tạo lịch sử báo cáo');
    }
  }

  @MessagePattern('inventory.report.list')
  async getReportHistory(@Payload() query: any) {
    try {
      return await this.reportsService.getReportHistory(query);
    } catch (error: any) {
      if (error instanceof RpcException) throw error;
      throw new RpcException(error.message || 'Lỗi lấy lịch sử báo cáo');
    }
  }

  @MessagePattern('inventory.reports.forecast_dataset')
  async getForecastDataset(
    @Payload() data: { periodDays?: number; branchId?: string },
    @Ctx() ctx: KafkaContext
  ) {
    console.log(`[Inventory-Service][getForecastDataset] Received request! Headers:`, JSON.stringify(ctx.getMessage().headers));
    const startTime = Date.now();
    try {
      const result = await this.reportsService.getForecastDataset(data?.periodDays, data?.branchId);
      console.log(`[Inventory-Service][getForecastDataset] Finished successfully in ${Date.now() - startTime}ms. Sent ${result?.length} records.`);
      return result;
    } catch (error: any) {
      console.error(`[Inventory-Service][getForecastDataset] Failed after ${Date.now() - startTime}ms:`, error);
      if (error instanceof RpcException) throw error;
      throw new RpcException(error.message || 'Lỗi lấy dữ liệu dự báo AI');
    }
  }

  @MessagePattern('inventory.reports.seasonal_trends')
  async getSeasonalDataset(@Payload() data: { branchId?: string; monthsCount?: number }) {
    try {
      return await this.reportsService.getSeasonalDataset(data?.branchId, data?.monthsCount);
    } catch (error: any) {
      if (error instanceof RpcException) throw error;
      throw new RpcException(error.message || 'Lỗi lấy dữ liệu xu hướng mùa');
    }
  }
}
