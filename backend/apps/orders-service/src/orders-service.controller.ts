import { Controller } from '@nestjs/common';
import { MessagePattern, Payload, RpcException } from '@nestjs/microservices';
import { OrdersServiceService } from './orders-service.service';
import { CreateOrderDto } from './dto/create-order.dto';

@Controller()
export class OrdersServiceController {
  constructor(private readonly ordersServiceService: OrdersServiceService) { }

  @MessagePattern('orders.create')
  async createOrder(@Payload() data: CreateOrderDto) {
    try {
      return await this.ordersServiceService.createOrder(data);
    } catch (error) {
      if (error instanceof RpcException) throw error;
      throw new RpcException(error.message || 'Lỗi hệ thống khi tạo đơn hàng');
    }
  }

  @MessagePattern('orders.check')
  async checkPaymentStatus(@Payload() data: { orderCode: number }) {
    try {
      return await this.ordersServiceService.checkPaymentStatus(Number(data.orderCode));
    } catch (error) {
      if (error instanceof RpcException) throw error;
      throw new RpcException(error.message || 'Lỗi hệ thống khi kiểm tra trạng thái thanh toán');
    }
  }

  @MessagePattern('orders.list')
  async listOrders() {
    try {
      return await this.ordersServiceService.listOrders();
    } catch (error) {
      if (error instanceof RpcException) throw error;
      throw new RpcException(error.message || 'Lỗi hệ thống khi lấy danh sách đơn hàng');
    }
  }

  @MessagePattern('orders.my-orders')
  async getMyOrders(@Payload() data: { userId?: string; fullName?: string; phone?: string }) {
    try {
      return await this.ordersServiceService.getMyOrders(data?.userId, data?.fullName, data?.phone);
    } catch (error) {
      if (error instanceof RpcException) throw error;
      throw new RpcException(error.message || 'Lỗi hệ thống khi lấy lịch sử đơn hàng');
    }
  }

  @MessagePattern('vouchers.create')
  async createVoucher(@Payload() data: any) {
    try {
      return await this.ordersServiceService.createVoucher(data);
    } catch (error) {
      if (error instanceof RpcException) throw error;
      throw new RpcException(error.message || 'Lỗi hệ thống khi tạo voucher');
    }
  }

  @MessagePattern('vouchers.update')
  async updateVoucher(@Payload() data: any) {
    try {
      const res: any = await this.ordersServiceService.updateVoucher(data.id, data.payload);
      if (res && res.error) {
        throw new RpcException({ message: res.message || 'Lỗi cập nhật voucher', statusCode: res.statusCode || 400 });
      }
      return res;
    } catch (error) {
      if (error instanceof RpcException) throw error;
      throw new RpcException(error.message || 'Lỗi hệ thống khi cập nhật voucher');
    }
  }

  @MessagePattern('vouchers.delete')
  async deleteVoucher(@Payload() data: { id: string }) {
    try {
      return await this.ordersServiceService.deleteVoucher(data.id);
    } catch (error) {
      if (error instanceof RpcException) throw error;
      throw new RpcException(error.message || 'Lỗi hệ thống khi xóa voucher');
    }
  }

  @MessagePattern('vouchers.list')
  async listVouchers() {
    try {
      return await this.ordersServiceService.listVouchers();
    } catch (error) {
      if (error instanceof RpcException) throw error;
      throw new RpcException(error.message || 'Lỗi hệ thống khi lấy danh sách voucher');
    }
  }

  @MessagePattern('vouchers.validate')
  async validateVoucher(@Payload() data: { code: string; subtotal: number; items?: any[]; branchId?: string }) {
    try {
      return await this.ordersServiceService.validateVoucher(data.code, data.subtotal, data.items || [], data.branchId);
    } catch (error) {
      if (error instanceof RpcException) throw error;
      throw new RpcException(error.message || 'Lỗi hệ thống khi kiểm tra voucher');
    }
  }

  @MessagePattern('vouchers.claim')
  async claimVoucher(@Payload() data: { code: string }) {
    try {
      return await this.ordersServiceService.claimVoucher(data.code);
    } catch (error) {
      if (error instanceof RpcException) throw error;
      throw new RpcException(error.message || 'Lỗi hệ thống khi sử dụng voucher');
    }
  }

  // UC-75: Tiếp nhận cấu hình quy tắc Voucher nâng cao (Mua X tặng Y, Combo)
  @MessagePattern('voucher.event.rule_update')
  async handleVoucherRuleUpdate(@Payload() data: any) {
    try {
      return await this.ordersServiceService.createVoucher(data);
    } catch (error) {
      if (error instanceof RpcException) throw error;
      throw new RpcException(error.message || 'Lỗi hệ thống khi lưu quy tắc khuyến mãi nâng cao');
    }
  }

  @MessagePattern('vouchers.audit.flags')
  async getVoucherAuditFlags() {
    try {
      return await this.ordersServiceService.getVoucherAuditFlags();
    } catch (error) {
      if (error instanceof RpcException) throw error;
      throw new RpcException(error.message || 'Lỗi khi lấy danh sách kiểm toán nghi vấn voucher');
    }
  }

  @MessagePattern('finance.expense.create')
  async createExpense(@Payload() data: any) {
    try {
      return await this.ordersServiceService.createExpense(data);
    } catch (error) {
      if (error instanceof RpcException) throw error;
      throw new RpcException(error.message || 'Lỗi hệ thống khi tạo chi phí');
    }
  }

  @MessagePattern('finance.expense.list')
  async listExpenses(@Payload() query: any) {
    try {
      return await this.ordersServiceService.getExpenses(query);
    } catch (error) {
      if (error instanceof RpcException) throw error;
      throw new RpcException(error.message || 'Lỗi hệ thống khi lấy danh sách chi phí');
    }
  }

  @MessagePattern('finance.cashflow.summary')
  async getCashFlowSummary(@Payload() query: any) {
    try {
      return await this.ordersServiceService.getCashFlowSummary(query);
    } catch (error) {
      if (error instanceof RpcException) throw error;
      throw new RpcException(error.message || 'Error aggregating cash flow');
    }
  }

  @MessagePattern('finance.payment_voucher.create')
  async createPaymentVoucher(@Payload() dto: any) {
    try {
      return await this.ordersServiceService.createPaymentVoucher(dto);
    } catch (error) {
      if (error instanceof RpcException) throw error;
      throw new RpcException(error.message || 'Error creating payment voucher');
    }
  }

  @MessagePattern('finance.payment_voucher.list')
  async getPaymentVouchers(@Payload() query: any) {
    try {
      return await this.ordersServiceService.getPaymentVouchers(query);
    } catch (error) {
      if (error instanceof RpcException) throw error;
      throw new RpcException(error.message || 'Error fetching payment vouchers');
    }
  }

  @MessagePattern('orders.payment.webhook_received')
  async handlePaymentWebhook(@Payload() payload: any) {
    try {
      return await this.ordersServiceService.handlePaymentWebhook(payload);
    } catch (error) {
      if (error instanceof RpcException) throw error;
      throw new RpcException(error.message || 'Lỗi hệ thống khi xử lý webhook thanh toán');
    }
  }

  @MessagePattern('orders.reconciliation.manual_override')
  async handleManualOverride(@Payload() data: any) {
    try {
      return await this.ordersServiceService.handleManualOverride(data);
    } catch (error) {
      if (error instanceof RpcException) throw error;
      throw new RpcException(error.message || 'Lỗi hệ thống khi xác nhận thanh toán khẩn cấp');
    }
  }

  @MessagePattern('orders.reconciliation.get_discrepancies')
  async getReconciliationDiscrepancies(@Payload() query: any) {
    try {
      return await this.ordersServiceService.getReconciliationDiscrepancies(query);
    } catch (error) {
      if (error instanceof RpcException) throw error;
      throw new RpcException(error.message || 'Lỗi hệ thống khi lấy danh sách chênh lệch đối soát');
    }
  }

  @MessagePattern('orders.reconciliation.summary')
  async getReconciliationSummary(@Payload() query: any) {
    try {
      return await this.ordersServiceService.getReconciliationSummary(query);
    } catch (error) {
      if (error instanceof RpcException) throw error;
      throw new RpcException(error.message || 'Lỗi hệ thống khi tổng hợp báo cáo đối soát');
    }
  }

  @MessagePattern('orders.reconciliation.resolve')
  async resolveDiscrepancy(@Payload() payload: any) {
    try {
      return await this.ordersServiceService.resolveDiscrepancy(payload);
    } catch (error) {
      if (error instanceof RpcException) throw error;
      throw new RpcException(error.message || 'Lỗi hệ thống khi xử lý biên bản đối soát');
    }
  }

  // ==========================================
  // MARKETING CAMPAIGNS & ROI ANALYTICS
  // ==========================================
  @MessagePattern('orders.campaign.create')
  async createMarketingCampaign(@Payload() payload: any) {
    try {
      return await this.ordersServiceService.createMarketingCampaign(payload);
    } catch (error) {
      if (error instanceof RpcException) throw error;
      throw new RpcException(error.message || 'Lỗi tạo chiến dịch Marketing');
    }
  }

  @MessagePattern('orders.campaign.list')
  async listMarketingCampaigns(@Payload() query: any) {
    try {
      return await this.ordersServiceService.listMarketingCampaigns(query);
    } catch (error) {
      if (error instanceof RpcException) throw error;
      throw new RpcException(error.message || 'Lỗi lấy danh sách chiến dịch');
    }
  }

  @MessagePattern('orders.campaign.get_by_id')
  async getMarketingCampaignById(@Payload() id: string) {
    try {
      return await this.ordersServiceService.getMarketingCampaignById(id);
    } catch (error) {
      if (error instanceof RpcException) throw error;
      throw new RpcException(error.message || 'Lỗi lấy chi tiết chiến dịch');
    }
  }

  @MessagePattern('orders.campaign.add_cost')
  async addCampaignCost(@Payload() payload: { id: string; cost: any }) {
    try {
      return await this.ordersServiceService.addCampaignCost(payload.id, payload.cost);
    } catch (error) {
      if (error instanceof RpcException) throw error;
      throw new RpcException(error.message || 'Lỗi hạch toán chi phí');
    }
  }

  @MessagePattern('orders.campaign.analytics')
  async getMarketingRoiAnalytics() {
    try {
      return await this.ordersServiceService.getMarketingRoiAnalytics();
    } catch (error) {
      if (error instanceof RpcException) throw error;
      throw new RpcException(error.message || 'Lỗi phân tích hiệu quả ROI');
    }
  }

  @MessagePattern('orders.shift.aggregate_sales')
  async getShiftSalesAggregation(@Payload() payload: any) {
    try {
      return await this.ordersServiceService.getShiftSalesAggregation(payload);
    } catch (error) {
      if (error instanceof RpcException) throw error;
      throw new RpcException(error.message || 'Lỗi tổng hợp doanh số ca trực');
    }
  }

  @MessagePattern('orders.pharmacist.kpi_report')
  async getPharmacistKpiReport(@Payload() payload: any) {
    try {
      return await this.ordersServiceService.getPharmacistKpiAggregation(payload);
    } catch (error) {
      if (error instanceof RpcException) throw error;
      throw new RpcException(error.message || 'Lỗi tạo báo cáo KPI Dược sĩ');
    }
  }
}
