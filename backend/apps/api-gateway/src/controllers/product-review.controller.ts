// product-review.controller.ts - API Gateway Controller cho Đánh giá & Review sản phẩm (UC-77)
import {
  Controller,
  Get,
  Post,
  Body,
  Param,
  Query,
  Inject,
  OnModuleInit,
  UseGuards,
  Req,
  HttpCode,
  HttpStatus,
  BadRequestException,
  Optional,
  UseInterceptors,
  UploadedFile,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { ClientKafka } from '@nestjs/microservices';
import { CACHE_MANAGER } from '@nestjs/cache-manager';
import { Cache } from 'cache-manager';
import { sendKafkaMessage, subscribeToKafkaTopics } from '../common/kafka.helper';
import { ApiTags, ApiOperation, ApiConsumes } from '@nestjs/swagger';
import { JwtAuthGuard } from '../guards/jwt-auth.guard';
import { CreateProductReviewDto, ProductReviewQueryDto } from '../dto/product-review.dto';
import { CloudinaryStorageService } from '../storage/cloudinary-storage.service';

@ApiTags('💊 Product Reviews')
@Controller('api/products')
export class ProductReviewController implements OnModuleInit {
  private readonly CACHE_TTL_SUMMARY = 15 * 60 * 1000; // 15 phút (ms)
  private readonly CACHE_TTL_LIST = 5 * 60 * 1000; // 5 phút (ms)

  constructor(
    @Inject('INVENTORY_SERVICE') private readonly inventoryClient: ClientKafka,
    @Inject('ORDER_SERVICE') private readonly orderClient: ClientKafka,
    private readonly cloudinaryStorage: CloudinaryStorageService,
    @Optional() @Inject(CACHE_MANAGER) private readonly cacheManager?: Cache,
  ) {}

  async onModuleInit() {
    await subscribeToKafkaTopics(this.inventoryClient, [
      'product.review.create',
      'product.review.get_list',
      'product.review.get_summary',
      'product.review.get_by_customer',
      'product.review.vote_helpful',
    ]);
  }

  // =========================================================================
  // 1. GỬI ĐÁNH GIÁ SẢN PHẨM (HTTP 202 ACCEPTED / ASYNC EVENT-DRIVEN)
  // =========================================================================
  @Post(':medicineId/reviews')
  @HttpCode(HttpStatus.ACCEPTED)
  @ApiOperation({ summary: 'Khách hàng gửi đánh giá sản phẩm sau khi mua hàng (UC-77)' })
  async createReview(
    @Param('medicineId') medicineId: string,
    @Body() dto: CreateProductReviewDto,
    @Req() req: any,
  ) {
    if (!medicineId) {
      throw new BadRequestException('Mã thuốc medicineId không hợp lệ');
    }

    // Đảm bảo medicineId đồng bộ giữa param và body
    const payload = {
      ...dto,
      medicineId,
      userId: dto.userId || req.user?.sub || req.user?.id || undefined,
    };

    // Kiểm tra tính hợp lệ của đơn hàng qua ORDER_SERVICE (nếu có orderCode số)
    if (dto.orderCode) {
      try {
        const numCode = Number(dto.orderCode);
        if (!isNaN(numCode)) {
          const orderCheck: any = await sendKafkaMessage(this.orderClient, 'orders.check', {
            orderCode: numCode,
          });
          const orderData = orderCheck?.order || orderCheck;
          if (orderData) {
            // Kiểm tra xem có phải đơn mua trực tiếp tại quầy POS hay không
            const isPos =
              orderData.type === 'RETAIL' ||
              orderData.type === 'POS_SALE' ||
              orderData.type === 'POS' ||
              orderData.shippingAddress === 'Mua tại quầy' ||
              (typeof orderData.shippingAddress === 'string' &&
                orderData.shippingAddress.toLowerCase().includes('quầy'));

            // Đơn hàng đã bị hủy thì không được đánh giá
            if (orderData.paymentStatus === 'CANCELLED' || orderData.status === 'CANCELLED') {
              throw new BadRequestException('Không thể đánh giá sản phẩm của đơn hàng đã hủy');
            }

            // Với đơn đặt giao Online: Phải thanh toán thành công mới được đánh giá
            const isPaidSuccess = [
              'PAID',
              'COMPLETED',
              'DELIVERED',
              'INVENTORY_FULFILLING',
              'INVENTORY_FAILED',
              'PAYMENT_RECEIVED_INVENTORY_PENDING',
            ].includes(orderData.paymentStatus);

            if (!isPos && !isPaidSuccess && orderData.paymentStatus === 'PENDING') {
              throw new BadRequestException('Chỉ có thể đánh giá sản phẩm cho đơn hàng đã thanh toán thành công (PAID)');
            }
          }
        }
      } catch (err: any) {
        if (err instanceof BadRequestException) throw err;
        // Bỏ qua lỗi kết nối orders.check nếu không tìm thấy đơn, tiếp tục gửi review
      }
    }

    // Gửi sự kiện xử lý vào hàng đợi Kafka tới inventory-service
    const result = await sendKafkaMessage(this.inventoryClient, 'product.review.create', payload);

    // Xóa cache danh sách và tổng hợp rating của sản phẩm để dữ liệu luôn tươi mới
    if (this.cacheManager) {
      await this.cacheManager.del(`reviews:summary:${medicineId}`);
      await this.cacheManager.del(`reviews:list:${medicineId}`);
    }

    return {
      status: 'Accepted',
      message: 'Đánh giá sản phẩm đã được gửi thành công!',
      data: result,
    };
  }

  // =========================================================================
  // 2. LẤY DANH SÁCH ĐÁNH GIÁ CỦA SẢN PHẨM (CACHE-ASIDE)
  // =========================================================================
  @Get(':medicineId/reviews')
  @ApiOperation({ summary: 'Lấy danh sách đánh giá của sản phẩm kèm phân trang và lọc sao (Cache-Aside)' })
  async getReviews(
    @Param('medicineId') medicineId: string,
    @Query() query: ProductReviewQueryDto,
  ) {
    const cacheKey = `reviews:list:${medicineId}:${JSON.stringify(query || {})}`;

    if (this.cacheManager) {
      const cached = await this.cacheManager.get(cacheKey);
      if (cached) {
        return cached;
      }
    }

    const reviews = await sendKafkaMessage(this.inventoryClient, 'product.review.get_list', {
      medicineId,
      query,
    });

    if (this.cacheManager && reviews) {
      await this.cacheManager.set(cacheKey, reviews, this.CACHE_TTL_LIST);
    }

    return reviews;
  }

  // =========================================================================
  // 3. LẤY TỔNG QUAN XẾP HẠNG VÀ PHÂN BỐ SAO (CACHE-ASIDE)
  // =========================================================================
  @Get(':medicineId/reviews/summary')
  @ApiOperation({ summary: 'Lấy tổng hợp điểm trung bình và phân bố sao của sản phẩm' })
  async getReviewSummary(@Param('medicineId') medicineId: string) {
    const cacheKey = `reviews:summary:${medicineId}`;

    if (this.cacheManager) {
      const cached = await this.cacheManager.get(cacheKey);
      if (cached) {
        return cached;
      }
    }

    const summary = await sendKafkaMessage(this.inventoryClient, 'product.review.get_summary', {
      medicineId,
    });

    if (this.cacheManager && summary) {
      await this.cacheManager.set(cacheKey, summary, this.CACHE_TTL_SUMMARY);
    }

    return summary;
  }

  // =========================================================================
  // 4. LẤY LỊCH SỬ ĐÁNH GIÁ CỦA NGƯỜI DÙNG ĐÃ ĐĂNG NHẬP
  // =========================================================================
  @Get('reviews/me')
  @UseGuards(JwtAuthGuard)
  @ApiOperation({ summary: 'Khách hàng xem lại các sản phẩm đã đánh giá' })
  async getMyReviews(@Req() req: any) {
    const userId = req.user?.sub || req.user?.id;
    const customerPhone = req.user?.phone;

    return await sendKafkaMessage(this.inventoryClient, 'product.review.get_by_customer', {
      userId,
      customerPhone,
    });
  }

  // =========================================================================
  // 5. LẤY LỊCH SỬ ĐÁNH GIÁ THEO SỐ ĐIỆN THOẠI KHÁCH HÀNG (PUBLIC)
  // =========================================================================
  @Get('reviews/customer/:phone')
  @ApiOperation({ summary: 'Tra cứu đánh giá theo số điện thoại khách hàng' })
  async getCustomerReviews(@Param('phone') phone: string) {
    return await sendKafkaMessage(this.inventoryClient, 'product.review.get_by_customer', {
      customerPhone: phone,
    });
  }

  // =========================================================================
  // 6. BÌNH CHỌN ĐÁNH GIÁ HỮU ÍCH
  // =========================================================================
  @Post('reviews/:reviewId/helpful')
  @ApiOperation({ summary: 'Bình chọn đánh giá sản phẩm hữu ích' })
  async voteHelpful(@Param('reviewId') reviewId: string) {
    const updated = await sendKafkaMessage(this.inventoryClient, 'product.review.vote_helpful', {
      reviewId,
    });

    return {
      status: 'Accepted',
      message: 'Cảm ơn bạn đã bình chọn đánh giá hữu ích!',
      data: updated,
    };
  }

  // =========================================================================
  // 7. TẢI ẢNH ĐÁNH GIÁ LÊN CLOUDINARY (UC-77)
  // =========================================================================
  @Post('reviews/upload-image')
  @ApiOperation({ summary: 'Tải ảnh đánh giá sản phẩm thực tế lên Cloudinary (UC-77)' })
  @ApiConsumes('multipart/form-data', 'application/json')
  @UseInterceptors(FileInterceptor('image'))
  async uploadReviewImage(
    @UploadedFile() file?: Express.Multer.File,
    @Body() body?: { image?: string; base64?: string; filename?: string },
  ) {
    const base64Data = body?.base64 || body?.image;
    const fileBuffer = file?.buffer;
    const filename = file?.originalname || body?.filename || `review_${Date.now()}.jpg`;
    const mimeType = file?.mimetype || 'image/jpeg';

    if (!fileBuffer && !base64Data) {
      throw new BadRequestException('Vui lòng cung cấp tệp ảnh hoặc dữ liệu ảnh base64');
    }

    const uploadResult = await this.cloudinaryStorage.uploadImage({
      buffer: fileBuffer,
      base64: base64Data,
      filename,
      mimeType,
      category: 'reviews',
      folder: 'wdp301/reviews',
    });

    return {
      status: 'Success',
      message: 'Tải ảnh lên Cloudinary thành công!',
      url: uploadResult.url,
      fileName: uploadResult.fileName,
      publicId: uploadResult.publicId,
      isCloudinary: uploadResult.isCloudinary,
    };
  }
}
