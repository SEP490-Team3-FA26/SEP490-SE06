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
import { CACHE_MANAGER } from '@nestjs/cache-manager';
import { Cache } from 'cache-manager';
import { sendKafkaMessage, subscribeToKafkaTopics } from '../common/kafka.helper';
import { ApiTags, ApiOperation } from '@nestjs/swagger';
import { JwtAuthGuard } from '../guards/jwt-auth.guard';
import {
  CreateFeedbackDto,
  ResolveFeedbackDto,
  BranchFeedbackQueryDto,
} from '../dto/feedback.dto';

@ApiTags('⭐ Customer Experience & Branch Feedback')
@Controller('api/feedbacks')
export class FeedbackController implements OnModuleInit {
  private readonly CHAIN_SUMMARY_CACHE_KEY = 'feedback:chain_summary';
  private readonly CHAIN_SUMMARY_TTL = 15 * 60 * 1000; // 15 phút (ms)

  constructor(
    @Inject('USER_SERVICE') private readonly userClient: ClientKafka,
    @Inject('ORDER_SERVICE') private readonly orderClient: ClientKafka,
    @Inject(CACHE_MANAGER) private readonly cacheManager: Cache,
  ) {}

  async onModuleInit() {
    await subscribeToKafkaTopics(this.userClient, [
      'user.feedback.create',
      'user.feedback.get_by_branch',
      'user.feedback.resolve',
      'user.feedback.chain_summary',
      'user.feedback.get_by_customer',
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
  async submitFeedback(@Body() dto: CreateFeedbackDto) {
    const result = await sendKafkaMessage(this.userClient, 'user.feedback.create', dto);
    // Invalidate báo cáo CSAT chuỗi trong Redis Cache để dữ liệu luôn phản ánh mới nhất
    await this.cacheManager.del(this.CHAIN_SUMMARY_CACHE_KEY);
    return result;
  }

  @Get('customer/:phone')
  @ApiOperation({ summary: 'Lấy danh sách phản hồi của khách hàng theo số điện thoại' })
  async getFeedbacksByCustomerPhone(@Param('phone') phone: string) {
    return await sendKafkaMessage(this.userClient, 'user.feedback.get_by_customer', { customerPhone: phone });
  }

  // =========================================================================
  // 3. TRƯỞNG CHI NHÁNH / ADMIN: Lấy danh sách phản hồi & CSAT của chi nhánh
  // =========================================================================
  @Get('branch/:branchId')
  @UseGuards(JwtAuthGuard)
  @ApiOperation({ summary: 'Lấy danh sách phản hồi & CSAT của chi nhánh' })
  async getFeedbacksByBranch(
    @Param('branchId') branchId: string,
    @Query() query: BranchFeedbackQueryDto,
  ) {
    return await sendKafkaMessage(this.userClient, 'user.feedback.get_by_branch', {
      branchId,
      status: query.status,
      rating: query.rating,
      page: query.page || 1,
      limit: query.limit || 20,
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
    @Body() dto: ResolveFeedbackDto,
    @Req() req: any,
  ) {
    const resolutionData = {
      ...dto,
      handledBy: req.user?.sub || req.user?.id || 'branch-manager',
      handledByName: req.user?.name || req.user?.email || 'Trưởng chi nhánh',
    };
    const result = await sendKafkaMessage(this.userClient, 'user.feedback.resolve', {
      id,
      resolution: resolutionData,
    });
    // Invalidate cache sau khi giải quyết khiếu nại
    await this.cacheManager.del(this.CHAIN_SUMMARY_CACHE_KEY);
    return result;
  }

  // =========================================================================
  // 5. ADMIN / BAN GIÁM ĐỐC: Báo cáo xếp hạng CSAT toàn chuỗi (Redis Cache-Aside)
  // =========================================================================
  @Get('analytics/chain-summary')
  @UseGuards(JwtAuthGuard)
  @ApiOperation({ summary: 'Báo cáo xếp hạng mức độ hài lòng CSAT toàn chuỗi (Redis Cache)' })
  async getChainFeedbackSummary() {
    // 1. Kiểm tra cache
    const cachedData = await this.cacheManager.get(this.CHAIN_SUMMARY_CACHE_KEY);
    if (cachedData) {
      return cachedData;
    }

    // 2. Cache miss -> Lấy dữ liệu qua Kafka
    const summary = await sendKafkaMessage(this.userClient, 'user.feedback.chain_summary', {});
    if (summary) {
      await this.cacheManager.set(this.CHAIN_SUMMARY_CACHE_KEY, summary, this.CHAIN_SUMMARY_TTL);
    }
    return summary;
  }
}
