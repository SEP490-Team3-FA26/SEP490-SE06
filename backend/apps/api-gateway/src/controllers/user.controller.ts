import {
  Controller,
  Get,
  Put,
  Post,
  Delete,
  Param,
  Body,
  UseGuards,
  Request,
  Inject,
  OnModuleInit,
  HttpException,
  Query,
  Res,
  HttpStatus,
  Sse,
  MessageEvent,
} from "@nestjs/common";
import { ClientKafka, EventPattern, Payload } from "@nestjs/microservices";
import {
  sendKafkaMessage,
  subscribeToKafkaTopics,
} from "../common/kafka.helper";
import { JwtAuthGuard } from "../guards/jwt-auth.guard";
import { ApiTags, ApiBearerAuth, ApiOperation } from "@nestjs/swagger";
import { CACHE_MANAGER } from '@nestjs/cache-manager';
import { Cache } from 'cache-manager';
import * as path from "path";
import * as fs from "fs";
import { Subject, Observable } from "rxjs";
import { filter, map } from "rxjs/operators";

@ApiTags("👤 User Profile")
@Controller("api/users")
@UseGuards(JwtAuthGuard)
@ApiBearerAuth()
export class UserController implements OnModuleInit {
  private readonly auditSubject = new Subject<any>();

  constructor(
    @Inject("USER_SERVICE") private readonly kafkaClient: ClientKafka,
    @Inject(CACHE_MANAGER) private readonly cacheManager: Cache,
  ) {}

  async onModuleInit() {
    await subscribeToKafkaTopics(this.kafkaClient, [
      "user.edit_profile",
      "user.change_avatar",
      "user.cart.get",
      "user.cart.add",
      "user.cart.update",
      "user.cart.delete",
      "user.cart.clear",
      "user.loyalty.get",
      "user.loyalty.lookup",
      "user.loyalty.update_points",
      "user.audit.list",
      "user.audit.export",
      "user.audit.export_status",
      "user.rfm.get_by_phone",
      "user.rfm.overview",
      "user.rfm.recalculate",
      "user.rfm.at_risk_list",
    ]);
  }

  @Put("profile")
  @UseGuards(JwtAuthGuard)
  @ApiOperation({ summary: "Chỉnh sửa thông tin hồ sơ" })
  async editProfile(
    @Request() req,
    @Body() data: { fullName?: string; phone?: string; address?: string },
  ) {
    return await sendKafkaMessage(this.kafkaClient, "user.edit_profile", {
      userId: req.user.sub,
      ...data,
    });
  }

  @Post("avatar")
  @ApiOperation({ summary: "Cập nhật ảnh đại diện (avatar URL)" })
  async changeAvatar(@Request() req, @Body() data: { avatarUrl: string }) {
    return await sendKafkaMessage(this.kafkaClient, "user.change_avatar", {
      userId: req.user.sub,
      avatarUrl: data.avatarUrl,
    });
  }

  // --- CART REST ENDPOINTS ---

  @Get("cart")
  @ApiOperation({ summary: "Lấy thông tin giỏ hàng của user" })
  async getCart(@Request() req) {
    return await sendKafkaMessage(this.kafkaClient, "user.cart.get", {
      userId: req.user.sub,
    });
  }

  @Post("cart")
  @ApiOperation({ summary: "Thêm sản phẩm vào giỏ hàng" })
  async addToCart(
    @Request() req,
    @Body() data: { medicineId: string; quantity?: number },
  ) {
    return await sendKafkaMessage(this.kafkaClient, "user.cart.add", {
      userId: req.user.sub,
      medicineId: data.medicineId,
      quantity: data.quantity || 1,
    });
  }

  @Put("cart/:medicineId")
  @ApiOperation({ summary: "Cập nhật số lượng của sản phẩm trong giỏ hàng" })
  async updateCartItem(
    @Request() req,
    @Param("medicineId") medicineId: string,
    @Body("quantity") quantity: number,
  ) {
    return await sendKafkaMessage(this.kafkaClient, "user.cart.update", {
      userId: req.user.sub,
      medicineId,
      quantity,
    });
  }

  @Delete("cart/:medicineId")
  @ApiOperation({ summary: "Xóa sản phẩm khỏi giỏ hàng" })
  async deleteCartItem(
    @Request() req,
    @Param("medicineId") medicineId: string,
  ) {
    return await sendKafkaMessage(this.kafkaClient, "user.cart.delete", {
      userId: req.user.sub,
      medicineId,
    });
  }

  @Post("cart/clear")
  @ApiOperation({ summary: "Dọn sạch giỏ hàng" })
  async clearCart(@Request() req) {
    return await sendKafkaMessage(this.kafkaClient, "user.cart.clear", {
      userId: req.user.sub,
    });
  }

  @Get("loyalty")
  @ApiOperation({ summary: "Lấy thông tin tích điểm khách hàng thân thiết" })
  async getLoyalty(@Request() req) {
    return await sendKafkaMessage(this.kafkaClient, "user.loyalty.get", {
      userId: req.user.sub,
    });
  }

  @Get("loyalty/lookup")
  @ApiOperation({
    summary: "Tra cứu thông tin tích điểm của khách hàng bằng số điện thoại",
  })
  async lookupLoyalty(
    @Request() req,
    @Body("phone") bodyPhone?: string,
    @Param("phone") paramPhone?: string,
    @Request() queryReq?: any,
  ) {
    // Check both query param and body
    const phone = req.query.phone || bodyPhone || paramPhone;
    return await sendKafkaMessage(this.kafkaClient, "user.loyalty.lookup", {
      phone,
    });
  }

  // --- AUDIT LOG ENDPOINTS ---

  @Get("audit-logs")
  @ApiOperation({
    summary: "Truy vấn danh sách Audit Log (Phân quyền theo Scope)",
  })
  async getAuditLogs(
    @Request() req,
    @Query("page") page?: number,
    @Query("limit") limit?: number,
    @Query("search") search?: string,
    @Query("role") role?: string,
    @Query("module") moduleFilter?: string,
    @Query("eventType") eventType?: string,
    @Query("severity") severity?: string,
    @Query("status") status?: string,
    @Query("afterEventId") afterEventId?: string,
  ) {
    const user = req.user;
    let allowedModules = moduleFilter;

    // Scope-based RBAC check
    if (
      user.role === "admin" ||
      user.role === "head_branch" ||
      user.role === "director"
    ) {
      // Allowed to view all, no restrictions
    } else if (user.role === "warehouse") {
      // Restricted to Inventory and Purchase modules
      allowedModules = "Inventory,Purchase";
    } else {
      throw new HttpException(
        "Bạn không có quyền truy cập nhật ký hệ thống",
        HttpStatus.FORBIDDEN,
      );
    }

    return await sendKafkaMessage(this.kafkaClient, "user.audit.list", {
      page: page ? Number(page) : 1,
      limit: limit ? Number(limit) : 50,
      search: search || "",
      role: role || "",
      module: allowedModules || "",
      eventType: eventType || "",
      severity: severity || "",
      status: status || "",
      afterEventId: afterEventId || "",
    });
  }

  @Post("audit-logs/export")
  @ApiOperation({ summary: "Yêu cầu tải xuất Audit Logs dạng nền (.csv.gz)" })
  async exportAuditLogs(
    @Request() req,
    @Body()
    filter: {
      search?: string;
      role?: string;
      module?: string;
      eventType?: string;
      severity?: string;
      status?: string;
    },
  ) {
    const user = req.user;
    let allowedModules = filter.module;

    if (
      user.role === "admin" ||
      user.role === "head_branch" ||
      user.role === "director"
    ) {
      // Allowed
    } else if (user.role === "warehouse") {
      allowedModules = "Inventory,Purchase";
    } else {
      throw new HttpException(
        "Bạn không có quyền xuất nhật ký hệ thống",
        HttpStatus.FORBIDDEN,
      );
    }

    return await sendKafkaMessage(this.kafkaClient, "user.audit.export", {
      search: filter.search || "",
      role: filter.role || "",
      module: allowedModules || "",
      eventType: filter.eventType || "",
      severity: filter.severity || "",
      status: filter.status || "",
    });
  }

  @Get("audit-logs/export-status/:jobId")
  @ApiOperation({ summary: "Kiểm tra trạng thái tiến trình xuất file" })
  async getExportStatus(@Param("jobId") jobId: string) {
    return await sendKafkaMessage(
      this.kafkaClient,
      "user.audit.export_status",
      { jobId },
    );
  }

  @Get("audit-logs/download/:filename")
  @ApiOperation({ summary: "Tải xuống tệp Audit Log nén Gzip" })
  async downloadAuditLog(@Param("filename") filename: string, @Res() res) {
    const tempDir = path.resolve(process.cwd(), "temp");
    const filePath = path.join(tempDir, filename);

    if (!fs.existsSync(filePath)) {
      throw new HttpException(
        "Tệp không tồn tại hoặc đã hết hạn",
        HttpStatus.NOT_FOUND,
      );
    }

    res.setHeader("Content-Type", "application/x-gzip");
    res.setHeader("Content-Disposition", `attachment; filename="${filename}"`);

    const fileStream = fs.createReadStream(filePath);
    fileStream.pipe(res);
  }

  @Sse("audit-logs/stream")
  @ApiOperation({
    summary:
      "Kênh truyền dữ liệu nhật ký hệ thống thời gian thực (HTTP Streaming)",
  })
  auditLogStream(@Request() req): Observable<MessageEvent> {
    const user = req.user;

    // Check scope-based permissions
    if (
      user.role !== "admin" &&
      user.role !== "head_branch" &&
      user.role !== "director" &&
      user.role !== "warehouse"
    ) {
      throw new HttpException(
        "Bạn không có quyền truy cập nhật ký hệ thống",
        HttpStatus.FORBIDDEN,
      );
    }

    return this.auditSubject.asObservable().pipe(
      filter((log) => {
        // Scope-based Permission Filter
        if (
          user.role === "admin" ||
          user.role === "head_branch" ||
          user.role === "director"
        ) {
          return true;
        }
        if (user.role === "warehouse") {
          // Warehouse can only view Inventory and Purchase modules
          return log.module === "Inventory" || log.module === "Purchase";
        }
        return false;
      }),
      map(
        (log) =>
          ({
            data: log,
          }) as MessageEvent,
      ),
    );
  }

  @EventPattern("audit.persisted")
  handleAuditPersisted(@Payload() logs: any[]) {
    if (Array.isArray(logs)) {
      for (const log of logs) {
        this.auditSubject.next(log);
      }
    } else if (logs) {
      this.auditSubject.next(logs);
    }
  }

  // =========================================================================
  // RFM CUSTOMER SEGMENTATION
  // =========================================================================

  @Get("rfm/customer/:phone")
  @ApiOperation({ summary: "Tra cứu phân khúc RFM & đề xuất voucher của khách hàng" })
  async getCustomerRFM(@Param("phone") phone: string) {
    const cacheKey = `rfm:customer:${phone}`;
    const cached = await this.cacheManager.get(cacheKey);
    if (cached) return cached;

    const data = await sendKafkaMessage(this.kafkaClient, "user.rfm.get_by_phone", { phone });
    if (data) {
      await this.cacheManager.set(cacheKey, data, 86400 * 1000); // 24h
    }
    return data;
  }

  @Get("rfm/overview")
  @ApiOperation({ summary: "Báo cáo ma trận phân nhóm RFM toàn chuỗi / chi nhánh" })
  async getRFMOverview(@Query("branchId") branchId?: string) {
    const cacheKey = `rfm:overview:${branchId || 'chain'}`;
    const cached = await this.cacheManager.get(cacheKey);
    if (cached) return cached;

    const data = await sendKafkaMessage(this.kafkaClient, "user.rfm.overview", { branchId });
    if (data) {
      await this.cacheManager.set(cacheKey, data, 3600 * 1000); // 1h
    }
    return data;
  }

  @Post("rfm/recalculate")
  @ApiOperation({ summary: "Kích hoạt tính toán lại phân cụm RFM khách hàng" })
  async recalculateRFM() {
    return await sendKafkaMessage(this.kafkaClient, "user.rfm.recalculate", {});
  }

  @Get("rfm/at-risk")
  @ApiOperation({ summary: "Danh sách khách hàng có nguy cơ rời bỏ cần chăm sóc" })
  async getAtRiskCustomers(
    @Query("branchId") branchId?: string,
    @Query("limit") limit?: string,
  ) {
    return await sendKafkaMessage(this.kafkaClient, "user.rfm.at_risk_list", {
      branchId,
      limit: limit ? Number(limit) : 50,
    });
  }
}
