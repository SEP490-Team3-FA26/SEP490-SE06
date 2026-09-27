import {
  Controller,
  Get,
  Post,
  Patch,
  Body,
  Param,
  Query,
  Inject,
  OnModuleInit,
  UseGuards,
  Req,
} from '@nestjs/common';
import { ClientKafka } from '@nestjs/microservices';
import { sendKafkaMessage, subscribeToKafkaTopics } from '../common/kafka.helper';
import { ApiTags, ApiOperation } from '@nestjs/swagger';
import { JwtAuthGuard } from '../guards/jwt-auth.guard';

@ApiTags('⭐ Customer Experience & Branch Feedback')
@Controller('api/feedbacks')
export class FeedbackController implements OnModuleInit {
  constructor(
    @Inject('USER_SERVICE') private readonly userClient: ClientKafka,
    @Inject('ORDER_SERVICE') private readonly orderClient: ClientKafka,
  ) {}

  async onModuleInit() {
    await subscribeToKafkaTopics(this.userClient, [
      'feedback.create',
      'feedback.get_by_branch',
      'feedback.resolve',
      'feedback.chain_summary',
      'feedback.get_by_customer',
    ]);
    await subscribeToKafkaTopics(this.orderClient, ['orders.check']);
  }

  // =========================================================================
  // 1. PUBLIC: Tra cứu thông tin đơn hàng từ mã QR hóa đơn để mở Form Đánh Giá
  // =========================================================================
  @Get('lookup/:orderCode')
  @ApiOperation({ summary: 'Tra cứu thông tin đơn hàng từ mã QR trên hóa đơn' })
  async lookupOrderForFeedback(@Param('orderCode') orderCode: string) {
    let orderInfo: any = null;
    try {
      const numCode = Number(orderCode);
      if (!isNaN(numCode)) {
        orderInfo = await sendKafkaMessage(this.orderClient, 'orders.check', { orderCode: numCode });
      }
    } catch (e: any) {
      // Bỏ qua lỗi nếu không tìm thấy đơn, vẫn cho phép form hoạt động
    }

    const orderData = orderInfo?.order || orderInfo || {};
    return {
      orderCode,
      branchId: orderData.branchId || 'BR-001',
      branchName: orderData.branchName || 'Chi nhánh ABC Pharmacy',
      customerPhone: orderData.patientPhone || orderData.phone || '',
      customerName: orderData.patientName || orderData.customerName || '',
      pharmacistName: orderData.pharmacistName || orderData.staffName || 'Dược sĩ phụ trách',
      totalAmount: orderData.totalAmount || 0,
      createdAt: orderData.createdAt || new Date(),
    };
  }

  // =========================================================================
  // 2. PUBLIC/CUSTOMER: Gửi đánh giá dịch vụ, tích điểm Loyalty & nhận Voucher
  // =========================================================================
  @Post()
  @ApiOperation({ summary: 'Khách hàng gửi đánh giá trải nghiệm tại chi nhánh' })
  async submitFeedback(@Body() body: any) {
    return await sendKafkaMessage(this.userClient, 'feedback.create', body);
  }

  @Get('customer/:phone')
  @ApiOperation({ summary: 'Lấy danh sách phản hồi của khách hàng theo số điện thoại' })
  async getFeedbacksByCustomerPhone(@Param('phone') phone: string) {
    return await sendKafkaMessage(this.userClient, 'feedback.get_by_customer', { customerPhone: phone });
  }

  // =========================================================================
  // 3. TRƯỞNG CHI NHÁNH / ADMIN: Lấy danh sách phản hồi & CSAT của chi nhánh
  // =========================================================================
  @Get('branch/:branchId')
  @UseGuards(JwtAuthGuard)
  @ApiOperation({ summary: 'Lấy danh sách phản hồi & CSAT của chi nhánh' })
  async getFeedbacksByBranch(
    @Param('branchId') branchId: string,
    @Query('status') status?: string,
    @Query('rating') rating?: string,
    @Query('page') page?: string,
    @Query('limit') limit?: string,
  ) {
    return await sendKafkaMessage(this.userClient, 'feedback.get_by_branch', {
      branchId,
      status,
      rating: rating ? Number(rating) : undefined,
      page: page ? Number(page) : 1,
      limit: limit ? Number(limit) : 20,
    });
  }

  // =========================================================================
  // 4. TRƯỞNG CHI NHÁNH: Đóng phiếu xử lý khiếu nại (1-2 sao) trong SLA 24h
  // =========================================================================
  @Patch(':id/resolve')
  @UseGuards(JwtAuthGuard)
  @ApiOperation({ summary: 'Trưởng chi nhánh cập nhật biên bản giải quyết khiếu nại' })
  async resolveFeedback(
    @Param('id') id: string,
    @Body() body: any,
    @Req() req: any,
  ) {
    const resolutionData = {
      ...body,
      handledBy: req.user?.sub || req.user?.id || 'branch-manager',
      handledByName: req.user?.name || req.user?.email || 'Trưởng chi nhánh',
    };
    return await sendKafkaMessage(this.userClient, 'feedback.resolve', {
      id,
      resolution: resolutionData,
    });
  }

  // =========================================================================
  // 5. ADMIN / BAN GIÁM ĐỐC: Báo cáo xếp hạng CSAT toàn chuỗi
  // =========================================================================
  @Get('analytics/chain-summary')
  @UseGuards(JwtAuthGuard)
  @ApiOperation({ summary: 'Báo cáo xếp hạng mức độ hài lòng CSAT toàn chuỗi' })
  async getChainFeedbackSummary() {
    return await sendKafkaMessage(this.userClient, 'feedback.chain_summary', {});
  }
}
