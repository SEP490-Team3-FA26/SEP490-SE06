import {
  Controller,
  Get,
  Post,
  Delete,
  Query,
  Body,
  Inject,
  HttpStatus,
  HttpCode,
  Optional,
} from "@nestjs/common";
import { ClientKafka } from "@nestjs/microservices";
import { CACHE_MANAGER } from "@nestjs/cache-manager";
import { Cache } from "cache-manager";
import { sendKafkaMessage } from "../common/kafka.helper";
import { ApiTags, ApiOperation, ApiQuery } from "@nestjs/swagger";

@ApiTags("✨ Recommendations & Search Intent")
@Controller("api/recommendations")
export class RecommendationController {
  constructor(
    @Inject("INVENTORY_SERVICE") private readonly inventoryClient: ClientKafka,
    @Optional() @Inject(CACHE_MANAGER) private readonly cacheManager?: Cache,
  ) {}

  // =========================================================================
  // 1. GHI NHẬN TỪ KHÓA TÌM KIẾM (Event-Driven Kafka)
  // =========================================================================
  @Post("search-log")
  @HttpCode(HttpStatus.ACCEPTED)
  @ApiOperation({ summary: "Ghi nhận từ khóa tìm kiếm của khách hàng (Async Kafka Event)" })
  async logSearch(
    @Body()
    dto: {
      keyword: string;
      category?: string;
      phone?: string;
      userId?: string;
      deviceId?: string;
      resultsCount?: number;
    },
  ) {
    if (!dto.keyword || dto.keyword.trim().length < 2) {
      return { status: "Ignored", message: "Từ khóa quá ngắn" };
    }

    this.inventoryClient.emit("recommendation.event.search_log", JSON.stringify(dto));

    // Xóa cache recommendation của user để làm tươi gợi ý lần sau
    const identifier = dto.phone || dto.userId || dto.deviceId;
    if (identifier && this.cacheManager) {
      try {
        await this.cacheManager.del(`rec:for-you:${identifier}`);
        await this.cacheManager.del(`rec:searches:${identifier}`);
      } catch (e) {}
    }

    return {
      status: "Accepted",
      message: "Sự kiện tìm kiếm đã được ghi nhận vào hàng đợi xử lý",
    };
  }

  // =========================================================================
  // 2. LẤY GỢI Ý DÀNH RIÊNG CHO BẠN (Pharma-Smart Recommender + RFM Refill)
  // =========================================================================
  @Get("for-you")
  @ApiOperation({ summary: "Lấy danh sách sản phẩm gợi ý cá nhân hóa dựa trên RFM và lịch sử tìm kiếm" })
  @ApiQuery({ name: "phone", required: false })
  @ApiQuery({ name: "userId", required: false })
  @ApiQuery({ name: "deviceId", required: false })
  @ApiQuery({ name: "branchId", required: false })
  async getRecommendationsForYou(
    @Query("phone") phone?: string,
    @Query("userId") userId?: string,
    @Query("deviceId") deviceId?: string,
    @Query("branchId") branchId?: string,
  ) {
    const identifier = phone || userId || deviceId || "anonymous";
    const cacheKey = `rec:for-you:${identifier}:${branchId || "default"}`;

    if (this.cacheManager && identifier !== "anonymous") {
      try {
        const cached = await this.cacheManager.get(cacheKey);
        if (cached) return cached;
      } catch (e) {}
    }

    const result = await sendKafkaMessage(
      this.inventoryClient,
      "inventory.recommendation.for_you",
      { phone, userId, deviceId, branchId },
    );

    if (result && this.cacheManager && identifier !== "anonymous") {
      try {
        // Cache trong 5 phút (300.000 ms)
        await this.cacheManager.set(cacheKey, result, 300000);
      } catch (e) {}
    }

    return result;
  }

  // =========================================================================
  // 3. LẤY TỪ KHÓA TÌM KIẾM GẦN ĐÂY
  // =========================================================================
  @Get("recent-searches")
  @ApiOperation({ summary: "Lấy các từ khóa tìm kiếm gần đây của khách hàng" })
  @ApiQuery({ name: "phone", required: false })
  @ApiQuery({ name: "userId", required: false })
  @ApiQuery({ name: "deviceId", required: false })
  async getRecentSearches(
    @Query("phone") phone?: string,
    @Query("userId") userId?: string,
    @Query("deviceId") deviceId?: string,
  ) {
    return await sendKafkaMessage(
      this.inventoryClient,
      "inventory.recommendation.recent_searches",
      { phone, userId, deviceId },
    );
  }

  // =========================================================================
  // 4. XÓA LỊCH SỬ TÌM KIẾM (Bảo mật quyền riêng tư cá nhân theo NĐ 13/2023)
  // =========================================================================
  @Delete("recent-searches")
  @HttpCode(HttpStatus.ACCEPTED)
  @ApiOperation({ summary: "Xóa lịch sử tìm kiếm cá nhân (Async Kafka Event)" })
  async clearRecentSearches(
    @Body() dto: { phone?: string; userId?: string; deviceId?: string },
  ) {
    this.inventoryClient.emit("recommendation.event.clear_searches", JSON.stringify(dto));

    const identifier = dto.phone || dto.userId || dto.deviceId;
    if (identifier && this.cacheManager) {
      try {
        await this.cacheManager.del(`rec:for-you:${identifier}`);
        await this.cacheManager.del(`rec:searches:${identifier}`);
      } catch (e) {}
    }

    return {
      status: "Accepted",
      message: "Yêu cầu xóa lịch sử tìm kiếm đã được tiếp nhận",
    };
  }
}
