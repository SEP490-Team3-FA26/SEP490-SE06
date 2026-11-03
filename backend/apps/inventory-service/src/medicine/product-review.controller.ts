// product-review.controller.ts - Controller Kafka microservice tiếp nhận các yêu cầu Review sản phẩm (UC-77)
import { Controller } from '@nestjs/common';
import { MessagePattern, EventPattern, Payload, RpcException } from '@nestjs/microservices';
import { ProductReviewService } from './product-review.service';

@Controller()
export class ProductReviewController {
  constructor(private readonly reviewService: ProductReviewService) {}

  /**
   * Tạo đánh giá sản phẩm mới (đồng bộ request-response qua send())
   */
  @MessagePattern('product.review.create')
  async handleCreateReview(@Payload() data: any) {
    try {
      return await this.reviewService.createReview(data);
    } catch (error) {
      if (error instanceof RpcException) throw error;
      throw new RpcException(error.message || 'Lỗi hệ thống khi tạo đánh giá sản phẩm');
    }
  }

  /**
   * Tiếp nhận sự kiện tạo đánh giá sản phẩm bất đồng bộ qua emit()
   */
  @EventPattern('product.review.event.create')
  async handleAsyncCreateReview(@Payload() payload: any) {
    try {
      const data = typeof payload === 'string' ? JSON.parse(payload) : payload;
      await this.reviewService.createReview(data);
      console.log(`✅ [ProductReview] Đã xử lý sự kiện tạo review cho thuốc ${data?.medicineId}`);
    } catch (error) {
      console.error('❌ [ProductReview] Lỗi khi xử lý async create review:', error?.message || error);
    }
  }

  /**
   * Lấy danh sách đánh giá của một sản phẩm
   */
  @MessagePattern('product.review.get_list')
  async handleGetReviews(@Payload() data: { medicineId: string; query?: any }) {
    try {
      return await this.reviewService.getReviewsByMedicine(data.medicineId, data.query);
    } catch (error) {
      if (error instanceof RpcException) throw error;
      throw new RpcException(error.message || 'Lỗi hệ thống khi lấy danh sách đánh giá');
    }
  }

  /**
   * Lấy dữ liệu tổng hợp đánh giá (điểm TB, phân bố sao)
   */
  @MessagePattern('product.review.get_summary')
  async handleGetSummary(@Payload() data: { medicineId: string }) {
    try {
      return await this.reviewService.getReviewSummary(data.medicineId);
    } catch (error) {
      if (error instanceof RpcException) throw error;
      throw new RpcException(error.message || 'Lỗi hệ thống khi lấy tổng hợp đánh giá');
    }
  }

  /**
   * Lấy lịch sử đánh giá của khách hàng theo SĐT hoặc userId
   */
  @MessagePattern('product.review.get_by_customer')
  async handleGetByCustomer(@Payload() data: { customerPhone?: string; userId?: string }) {
    try {
      return await this.reviewService.getCustomerReviews(data);
    } catch (error) {
      if (error instanceof RpcException) throw error;
      throw new RpcException(error.message || 'Lỗi hệ thống khi lấy lịch sử đánh giá khách hàng');
    }
  }

  /**
   * Bình chọn đánh giá hữu ích
   */
  @MessagePattern('product.review.vote_helpful')
  async handleVoteHelpful(@Payload() data: { reviewId: string }) {
    try {
      return await this.reviewService.voteHelpful(data.reviewId);
    } catch (error) {
      if (error instanceof RpcException) throw error;
      throw new RpcException(error.message || 'Lỗi hệ thống khi bình chọn đánh giá hữu ích');
    }
  }
}

