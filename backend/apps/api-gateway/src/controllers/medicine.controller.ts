import {
  Controller,
  Get,
  Post,
  Put,
  Query,
  UseInterceptors,
  Param,
  Body,
  Patch,
  Inject,
  OnModuleInit,
  HttpCode,
  HttpException,
  HttpStatus,
  UseGuards,
  Optional,
  BadRequestException,
} from "@nestjs/common";
import { ClientKafka } from "@nestjs/microservices";
import {
  sendKafkaMessage,
  subscribeToKafkaTopics,
} from "../common/kafka.helper";
import {
  ApiTags,
  ApiOperation,
  ApiQuery,
  ApiBearerAuth,
} from "@nestjs/swagger";
import { JwtAuthGuard } from "../guards/jwt-auth.guard";
import { RolesGuard } from "../guards/roles.guard";
import { Roles } from "../decorators/roles.decorator";
import {
  CACHE_MANAGER,
  CacheInterceptor,
  CacheTTL,
} from "@nestjs/cache-manager";
import { Cache } from "cache-manager";
import { AuditLogAction } from "../decorators/audit-log.decorator";

@ApiTags("💊 Medicines")
@Controller("api/medicines")
export class MedicineController implements OnModuleInit {
  constructor(
    @Inject("INVENTORY_SERVICE") private readonly inventoryClient: ClientKafka,
    @Optional() @Inject(CACHE_MANAGER) private readonly cacheManager?: Cache,
  ) {}

  async onModuleInit() {
    // Đăng ký đầy đủ các reply topic cho ClientKafka trước khi nhận request
    await subscribeToKafkaTopics(this.inventoryClient, [
      "inventory.medicine.list",
      "inventory.medicine.get_by_id",
      "inventory.medicine.stats",
      "inventory.medicine.dropdown_list",
      "inventory.medicine.expiration_report",
      "inventory.medicine.low_stock_report",
      "inventory.medicine.get_filters",
      "inventory.medicine.branch_list",
      "inventory.medicine.create",
      "inventory.medicine.update",
      "inventory.medicine.handle_expiration_action",
      "inventory.medicine.get_by_barcode",
      "inventory.medicine.generate_barcode",
      "inventory.medicine.subcategory_counts",
      "inventory.medicine.get_alternatives",
      "inventory.medicine.warehouse_map",
      "inventory.medicine.warehouse_search",
    ]);
  }

  // Helper xóa cache liên quan đến danh mục thuốc, dropdown, thống kê và sơ đồ kho khi có thay đổi dữ liệu
  private async invalidateMedicineCaches() {
    if (!this.cacheManager) return;
    try {
      await Promise.all([
        this.cacheManager.del("medicines:dropdown:all"),
        this.cacheManager.del("medicines:dropdown:CENTRAL_WH"),
        this.cacheManager.del("medicines:stats:all"),
        this.cacheManager.del("medicines:stats:CENTRAL_WH"),
        this.cacheManager.del("medicines:expiration_report:all"),
        this.cacheManager.del("medicines:expiration_report:CENTRAL_WH"),
        this.cacheManager.del("medicines:filters:all"),
        this.cacheManager.del("medicines:warehouse-map"),
        this.cacheManager.del("medicines:reserve-batches:CENTRAL_WH"),
        this.cacheManager.del("medicines:reserve-batches:all"),
      ]);
    } catch (e) {}
  }

  @Get("filters")
  @ApiOperation({ summary: "Lấy danh sách các bộ lọc có sẵn" })
  async getFilters() {
    const cacheKey = "medicines:filters:all";
    if (this.cacheManager) {
      try {
        const cached = await this.cacheManager.get(cacheKey);
        if (cached) return cached;
      } catch (e) {}
    }

    try {
      const result = await sendKafkaMessage(
        this.inventoryClient,
        "inventory.medicine.get_filters",
        {},
      );
      if (this.cacheManager && result) {
        try {
          await this.cacheManager.set(cacheKey, result, 3600000); // Cache 1 giờ
        } catch (e) {}
      }
      return result;
    } catch (error) {
      return {
        categories: [
          "Kháng sinh",
          "Hạ sốt & Giảm đau",
          "Tim mạch",
          "Tiêu hóa",
          "Thực phẩm chức năng",
          "Vật tư y tế",
        ],
        classifications: ["PRESCRIPTION", "NON_PRESCRIPTION", "SUPPLEMENT"],
      };
    }
  }

  @Get("stats")
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: "Lấy thống kê tồn kho" })
  @ApiQuery({ name: "branchId", required: false, type: String })
  async getStats(@Query("branchId") branchId?: string) {
    const cacheKey = `medicines:stats:${branchId || "all"}`;
    if (this.cacheManager) {
      try {
        const cached = await this.cacheManager.get(cacheKey);
        if (cached) return cached;
      } catch (e) {}
    }

    const result = await sendKafkaMessage(
      this.inventoryClient,
      "inventory.medicine.stats",
      { branchId },
    );

    if (this.cacheManager && result) {
      try {
        await this.cacheManager.set(cacheKey, result, 60000); // Cache 60 giây
      } catch (e) {}
    }

    return result;
  }

  // Hỗ trợ cả 2 endpoint báo cáo hết hạn và cảnh báo hết hạn
  @Get(["expiration-report", "expiration-alerts"])
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: "Lấy báo cáo hết hạn của các lô hàng" })
  @ApiQuery({ name: "branchId", required: false, type: String })
  async getExpirationReport(@Query("branchId") branchId?: string) {
    const cacheKey = `medicines:expiration_report:${branchId || "all"}`;
    if (this.cacheManager) {
      try {
        const cached = await this.cacheManager.get(cacheKey);
        if (cached) return cached;
      } catch (e) {}
    }

    const result = await sendKafkaMessage(
      this.inventoryClient,
      "inventory.medicine.expiration_report",
      { branchId },
    );

    if (this.cacheManager && result) {
      try {
        await this.cacheManager.set(cacheKey, result, 60000); // Cache 60 giây
      } catch (e) {}
    }

    return result;
  }

  // Hỗ trợ cả 2 alias endpoint để đảm bảo tương thích ngược 100%
  @Post(["expiration-action", "handle-expiration"])
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({
    summary:
      "Xử lý đề xuất xử lý thuốc sắp hết hạn (Xuất hủy, Trả NCC, Giảm giá)",
  })
  async handleExpirationAction(
    @Body()
    body: {
      batchId: string;
      action: "DISPOSE" | "RETURN_SUPPLIER" | "DISCOUNT";
      quantity: number;
      notes?: string;
      discountPrice?: number;
      performedBy?: string;
    },
  ) {
    const res = await sendKafkaMessage(
      this.inventoryClient,
      "inventory.medicine.handle_expiration_action",
      body,
    );

    // Xóa cache khi có thao tác xuất hủy/giảm giá/trả NCC
    await this.invalidateMedicineCaches();

    return res;
  }

  @Get("low-stock-report")
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({
    summary: "Lấy báo cáo các loại thuốc sắp hết hàng hoặc hết hàng",
  })
  @ApiQuery({ name: "branchId", required: false, type: String })
  async getLowStockReport(@Query("branchId") branchId?: string) {
    return await sendKafkaMessage(
      this.inventoryClient,
      "inventory.medicine.low_stock_report",
      { branchId },
    );
  }

  @Get("dropdown")
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({
    summary: "Lấy danh sách tối giản của các loại thuốc phục vụ cho dropdown",
  })
  @ApiQuery({ name: "branchId", required: false, type: String })
  async getMedicinesDropdown(@Query("branchId") branchId?: string) {
    const cacheKey = `medicines:dropdown:${branchId || "all"}`;
    if (this.cacheManager) {
      try {
        const cached = await this.cacheManager.get(cacheKey);
        if (cached) return cached;
      } catch (e) {}
    }

    const result = await sendKafkaMessage(
      this.inventoryClient,
      "inventory.medicine.dropdown_list",
      { branchId },
    );

    if (this.cacheManager && result) {
      try {
        await this.cacheManager.set(cacheKey, result, 300000); // Cache 5 phút
      } catch (e) {}
    }

    return result;
  }

  @Get("warehouse-map")
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: "Lấy sơ đồ kho tổng quan 2D/3D (Cache-Aside Redis 5 phút)" })
  async getWarehouseMap() {
    const cacheKey = "medicines:warehouse-map";
    if (this.cacheManager) {
      try {
        const cached = await this.cacheManager.get(cacheKey);
        if (cached) return cached;
      } catch (e) {}
    }

    const result = await sendKafkaMessage(
      this.inventoryClient,
      "inventory.medicine.warehouse_map",
      {},
    );

    if (this.cacheManager && result) {
      try {
        await this.cacheManager.set(cacheKey, result, 300000); // Cache 5 phút (300,000 ms)
      } catch (e) {}
    }

    return result;
  }

  @Get("shelf-detail")
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: "Lấy chi tiết danh sách thuốc trong một tầng kệ (Cache-Aside Redis 2 phút)" })
  @ApiQuery({ name: "zone", required: true, type: String })
  @ApiQuery({ name: "rack", required: true, type: String })
  @ApiQuery({ name: "shelf", required: true, type: Number })
  async getShelfDetail(
    @Query("zone") zone: string,
    @Query("rack") rack: string,
    @Query("shelf") shelf: number,
  ) {
    const cacheKey = `medicines:shelf-detail:${zone}:${rack}:${shelf}`;
    if (this.cacheManager) {
      try {
        const cached = await this.cacheManager.get(cacheKey);
        if (cached) return cached;
      } catch (e) {}
    }

    const result = await sendKafkaMessage(
      this.inventoryClient,
      "inventory.medicine.shelf_detail",
      { zone, rack, shelf: Number(shelf) },
    );

    if (this.cacheManager && result) {
      try {
        await this.cacheManager.set(cacheKey, result, 120000); // Cache 2 phút (120,000 ms)
      } catch (e) {}
    }

    return result;
  }

  @Get("warehouse-search")
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({
    summary: "Tìm kiếm nhanh thuốc và lấy vị trí trong kho tổng",
  })
  @ApiQuery({ name: "q", required: true, type: String })
  async warehouseSearch(@Query("q") q: string) {
    return await sendKafkaMessage(
      this.inventoryClient,
      "inventory.medicine.warehouse_search",
      { q },
    );
  }

  @Post("sync-locations")
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles("ADMIN", "PHARMACIST")
  @ApiBearerAuth()
  @ApiOperation({
    summary: "Đồng bộ vị trí cho các lô thuốc cũ chưa có vị trí",
  })
  async syncLocations() {
    return await sendKafkaMessage(
      this.inventoryClient,
      "inventory.medicine.sync_locations",
      {},
    );
  }

  // Tồn kho thời gian thực toàn chuỗi + Thuật toán tồn kho an toàn
  @Get("safe-stock-chain")
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({
    summary: "Xem tồn kho thời gian thực toàn chuỗi + phân tích an toàn",
  })
  @ApiQuery({
    name: "serviceLevel",
    required: false,
    type: Number,
    description: "Mức phục vụ: 0.90/0.95/0.98/0.99",
    example: 0.95,
  })
  @ApiQuery({
    name: "periodDays",
    required: false,
    type: Number,
    description: "Kỳ phân tích (ngày)",
    example: 30,
  })
  @ApiQuery({
    name: "branchId",
    required: false,
    type: String,
    description: "Lọc theo chi nhánh",
  })
  @ApiQuery({ name: "page", required: false, type: Number })
  @ApiQuery({ name: "limit", required: false, type: Number })
  async getSafeStockChain(
    @Query("serviceLevel") serviceLevel?: number,
    @Query("periodDays") periodDays?: number,
    @Query("branchId") branchId?: string,
    @Query("page") page = 1,
    @Query("limit") limit = 20,
  ) {
    return await sendKafkaMessage(
      this.inventoryClient,
      "inventory.medicine.safe_stock_chain",
      {
        serviceLevel: serviceLevel ? Number(serviceLevel) : 0.95,
        periodDays: periodDays ? Number(periodDays) : 30,
        branchId: branchId || undefined,
        page: Number(page),
        limit: Number(limit),
      },
    );
  }

  // Phát hiện bất thường tồn kho (Z-Score / 3-Sigma Thống Kê Thuần Túy)
  @Get("anomaly-detection")
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({
    summary: "Phát hiện bất thường tồn kho bằng Z-Score / 3-Sigma",
  })
  @ApiQuery({
    name: "periodDays",
    required: false,
    type: Number,
    description: "Kỳ phân tích (ngày)",
    example: 60,
  })
  @ApiQuery({
    name: "zScoreThreshold",
    required: false,
    type: Number,
    description: "Ngưỡng Z-Score (mặc định: 3)",
    example: 3,
  })
  async getAnomalyDetection(
    @Query("periodDays") periodDays?: number,
    @Query("zScoreThreshold") zScoreThreshold?: number,
  ) {
    return await sendKafkaMessage(
      this.inventoryClient,
      "inventory.medicine.detect_anomalies",
      {
        periodDays: periodDays ? Number(periodDays) : 60,
        zScoreThreshold: zScoreThreshold ? Number(zScoreThreshold) : 3,
      },
    );
  }

  @Get("branch/:branchId")
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({
    summary: "Lấy danh sách thuốc và tồn kho riêng của chi nhánh",
  })
  @ApiQuery({ name: "page", required: false, type: Number })
  @ApiQuery({ name: "limit", required: false, type: Number })
  @ApiQuery({ name: "search", required: false, type: String })
  @ApiQuery({ name: "category", required: false, type: String })
  @ApiQuery({ name: "classification", required: false, type: String })
  @ApiQuery({ name: "targetGroup", required: false, type: String })
  @ApiQuery({ name: "minPrice", required: false, type: Number })
  @ApiQuery({ name: "maxPrice", required: false, type: Number })
  @ApiQuery({ name: "flavour", required: false, type: String })
  @ApiQuery({ name: "country", required: false, type: String })
  @ApiQuery({ name: "brand", required: false, type: String })
  @ApiQuery({ name: "indication", required: false, type: String })
  @ApiQuery({ name: "brandOrigin", required: false, type: String })
  @ApiQuery({ name: "branchStockOnly", required: false, type: Boolean })
  async getBranchMedicines(
    @Param("branchId") branchId: string,
    @Query("page") page = 1,
    @Query("limit") limit = 10,
    @Query("search") search = "",
    @Query("category") category = "",
    @Query("classification") classification = "",
    @Query("targetGroup") targetGroup = "",
    @Query("minPrice") minPrice?: number,
    @Query("maxPrice") maxPrice?: number,
    @Query("flavour") flavour = "",
    @Query("country") country = "",
    @Query("brand") brand = "",
    @Query("indication") indication = "",
    @Query("brandOrigin") brandOrigin = "",
    @Query("branchStockOnly") branchStockOnly?: boolean,
  ) {
    return await sendKafkaMessage(
      this.inventoryClient,
      "inventory.medicine.branch_list",
      {
        branchId,
        branchStockOnly,
        page: Math.max(Number(page) || 1, 1),
        limit: Math.min(Math.max(Number(limit) || 10, 1), 100),
        search,
        category,
        classification,
        targetGroup,
        minPrice: minPrice ? Number(minPrice) : undefined,
        maxPrice: maxPrice ? Number(maxPrice) : undefined,
        flavour,
        country,
        brand,
        indication,
        brandOrigin,
      },
    );
  }


  // ============================================================
  // WAREHOUSE MAP - So do kho 4 cap: Khu -> Ke -> Tang -> Thung
  // ============================================================

  // GET /api/medicines/shelf-layout?zone=A&rack=A1
  @Get('shelf-layout')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Lay layout ke kho (4 Tang x 10 Thung) voi thong tin thuoc va ton kho (Cache-Aside Redis 5 phut)' })
  async getShelfLayout(
    @Query('zone') zone: string,
    @Query('rack') rack: string,
  ) {
    const cacheKey = `medicines:shelf-layout:${zone}:${rack}`;
    if (this.cacheManager) {
      try {
        const cached = await this.cacheManager.get(cacheKey);
        if (cached) return cached;
      } catch (e) {}
    }

    const result = await sendKafkaMessage(this.inventoryClient, 'inventory.medicine.shelf.layout', { zone, rack });

    if (this.cacheManager && result) {
      try {
        await this.cacheManager.set(cacheKey, result, 300000); // Cache 5 phut (300,000 ms)
      } catch (e) {}
    }

    return result;
  }

  // GET /api/medicines/reserve-batches?branchId=CENTRAL_WH
  @Get('reserve-batches')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Lay danh sach lo dang o Khu Du Tru (FEFO sorted) (Cache-Aside Redis 2 phut)' })
  async getReserveBatches(@Query('branchId') branchId: string = 'CENTRAL_WH') {
    const cacheKey = `medicines:reserve-batches:${branchId || 'CENTRAL_WH'}`;
    if (this.cacheManager) {
      try {
        const cached = await this.cacheManager.get(cacheKey);
        if (cached) return cached;
      } catch (e) {}
    }

    const result = await sendKafkaMessage(this.inventoryClient, 'inventory.medicine.reserve.list', { branchId });

    if (this.cacheManager && result) {
      try {
        await this.cacheManager.set(cacheKey, result, 120000); // Cache 2 phut (120,000 ms)
      } catch (e) {}
    }

    return result;
  }

  // GET /api/medicines/bin-detail?zone=A&rack=A1&shelf=3&bin=2
  @Get('bin-detail')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Chi tiet thung thuoc: lo MAIN + lo RESERVE (xuat truoc theo FEFO) (Cache-Aside Redis 1 phut)' })
  async getBinDetail(
    @Query('zone') zone: string,
    @Query('rack') rack: string,
    @Query('shelf') shelf: number,
    @Query('bin') bin: number,
  ) {
    const cacheKey = `medicines:bin-detail:${zone}:${rack}:${shelf}:${bin}`;
    if (this.cacheManager) {
      try {
        const cached = await this.cacheManager.get(cacheKey);
        if (cached) return cached;
      } catch (e) {}
    }

    const result = await sendKafkaMessage(
      this.inventoryClient,
      'inventory.medicine.bin.detail',
      { zone, rack, shelf: Number(shelf), bin: Number(bin) }
    );

    if (this.cacheManager && result) {
      try {
        await this.cacheManager.set(cacheKey, result, 60000); // Cache 1 phut (60,000 ms)
      } catch (e) {}
    }

    return result;
  }

  // POST /api/medicines/assign-location
  @Post('assign-location')
  @HttpCode(HttpStatus.ACCEPTED)
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('ADMIN', 'MANAGER', 'WAREHOUSE')
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Gan thuoc vao vi tri thung co dinh trong kho (async Kafka + Evict Cache)' })
  async assignMedicineLocation(@Body() dto: {
    medicineId: string; zone: string; rack: string; shelf: number; bin: number; maxCapacity?: number;
  }) {
    this.inventoryClient.emit('inventory.medicine.event.location_assign', JSON.stringify(dto));
    if (this.cacheManager) {
      try {
        await Promise.all([
          this.cacheManager.del('medicines:warehouse-map'),
          this.cacheManager.del(`medicines:shelf-layout:${dto.zone}:${dto.rack}`),
          this.cacheManager.del(`medicines:bin-detail:${dto.zone}:${dto.rack}:${dto.shelf}:${dto.bin}`),
        ]);
      } catch (e) {}
    }
    return { status: 'Accepted', message: 'Da gan thuoc vao vi tri thung trong kho.' };
  }

  // PATCH /api/medicines/batches/:batchId/quarantine
  @Patch('batches/:batchId/quarantine')
  @HttpCode(HttpStatus.ACCEPTED)
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('ADMIN', 'MANAGER', 'WAREHOUSE')
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Khoa lo thuoc (QUARANTINED) - khong duoc xuat ban (async Kafka + Evict Cache)' })
  async quarantineBatch(
    @Param('batchId') batchId: string,
    @Body() body?: { reason?: string },
  ) {
    this.inventoryClient.emit('inventory.medicine.event.quarantine', JSON.stringify({ batchId, reason: body?.reason }));
    if (this.cacheManager) {
      try {
        await Promise.all([
          this.cacheManager.del('medicines:warehouse-map'),
          this.cacheManager.del('medicines:reserve-batches:CENTRAL_WH'),
          this.cacheManager.del('medicines:reserve-batches:all'),
        ]);
      } catch (e) {}
    }
    return { status: 'Accepted', message: 'Lo thuoc da duoc gui yeu cau cach ly (QUARANTINED).' };
  }

  // POST /api/medicines/relocate-bin
  @Post('relocate-bin')
  @HttpCode(HttpStatus.ACCEPTED)
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('ADMIN', 'MANAGER', 'WAREHOUSE')
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Chuyen o / Don kho thuoc giua cac thung trong kho (async Kafka + Evict Cache)' })
  async relocateBin(@Body() dto: {
    fromLocation: { zone: string; rack: string; shelf: number; bin: number };
    toLocation: { zone: string; rack: string; shelf: number; bin: number };
    batchId?: string;
    reason?: string;
  }) {
    this.inventoryClient.emit('inventory.medicine.event.relocate_bin', JSON.stringify(dto));
    if (this.cacheManager) {
      try {
        await Promise.all([
          this.cacheManager.del('medicines:warehouse-map'),
          this.cacheManager.del(`medicines:shelf-layout:${dto.fromLocation.zone}:${dto.fromLocation.rack}`),
          this.cacheManager.del(`medicines:shelf-layout:${dto.toLocation.zone}:${dto.toLocation.rack}`),
        ]);
      } catch (e) {}
    }
    return { status: 'Accepted', message: 'Yeu cau chuyen o / don kho da duoc gui xu ly ngam.' };
  }

  @Get("barcode/:barcode")
  @ApiOperation({
    summary:
      "Tra cứu thuốc siêu tốc bằng Barcode/Mã vạch và lấy Lô FEFO của chi nhánh",
  })
  @ApiQuery({ name: "branchId", required: false, type: String })
  async getMedicineByBarcode(
    @Param("barcode") barcode: string,
    @Query("branchId") branchId?: string,
  ) {
    const cacheKey = `medicine:barcode:${barcode}:${branchId || "ALL"}`;
    if (this.cacheManager) {
      try {
        const cached = await this.cacheManager.get(cacheKey);
        if (cached) {
          return cached;
        }
      } catch (e) {}
    }

    const result = await sendKafkaMessage(
      this.inventoryClient,
      "inventory.medicine.get_by_barcode",
      {
        barcode,
        branchId,
      },
    );

    if (result && result.found && this.cacheManager) {
      try {
        await this.cacheManager.set(cacheKey, result, 1800000); // 30 phút TTL
      } catch (e) {}
    }

    return result;
  }

  @Post(":id/generate-barcode")
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({
    summary: "Tự động sinh mã EAN-13 chuẩn Việt Nam và cập nhật cho thuốc",
  })
  async generateBarcode(@Param("id") id: string) {
    const result = await sendKafkaMessage(
      this.inventoryClient,
      "inventory.medicine.generate_barcode",
      { id },
    );
    if (result && result.barcode && this.cacheManager) {
      try {
        await this.cacheManager.del(`medicine:barcode:${result.barcode}:ALL`);
      } catch (e) {}
    }
    return result;
  }

  @Get(":id")
  @ApiOperation({ summary: "Lấy chi tiết 1 loại thuốc" })
  async getMedicineById(@Param("id") id: string) {
    // Kiểm tra định dạng ObjectId hợp lệ để tránh rơi nhầm các route chưa định nghĩa
    if (!/^[0-9a-fA-F]{24}$/.test(id)) {
      throw new BadRequestException(
        `Mã thuốc "${id}" không hợp lệ (phải là MongoDB ObjectId 24 ký tự)`,
      );
    }
    return await sendKafkaMessage(
      this.inventoryClient,
      "inventory.medicine.get_by_id",
      { id },
    );
  }

  @Get(":id/alternatives")
  @ApiOperation({ summary: "Tìm các loại thuốc thay thế" })
  @ApiQuery({ name: "branchId", required: true, type: String })
  async getAlternatives(
    @Param("id") id: string,
    @Query("branchId") branchId: string,
  ) {
    return await sendKafkaMessage(
      this.inventoryClient,
      "inventory.medicine.get_alternatives",
      { medicineId: id, branchId },
    );
  }

  @Patch(":id/status")
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: "Cập nhật trạng thái / tồn kho của thuốc" })
  @AuditLogAction({
    actionCode: "MEDICINE_STATUS_UPDATE",
    actionName: "Cập nhật trạng thái thuốc",
    module: "Inventory",
    eventType: "UPDATE",
    entityType: "Medicine",
  })
  async updateMedicineStatus(
    @Param("id") id: string,
    @Body("status") status: string,
    @Body("stock") stock?: number,
  ) {
    const result = await sendKafkaMessage(
      this.inventoryClient,
      "inventory.medicine.update_status",
      { id, status, stock },
    );
    await this.invalidateMedicineCaches();
    return result;
  }

  @Patch(":id/price-tiers")
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: "Cập nhật bảng giá sỉ bậc thang của thuốc" })
  @AuditLogAction({
    actionCode: "MEDICINE_PRICE_TIERS_UPDATE",
    actionName: "Cập nhật giá sỉ thuốc",
    module: "Inventory",
    eventType: "UPDATE",
    entityType: "Medicine",
  })
  async updateMedicinePriceTiers(
    @Param("id") id: string,
    @Body("priceTiers") priceTiers: { minQuantity: number; price: number }[],
  ) {
    const result = await sendKafkaMessage(
      this.inventoryClient,
      "inventory.medicine.update_price_tiers",
      { id, priceTiers },
    );
    await this.invalidateMedicineCaches();
    return result;
  }

  @Patch(":id/price")
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles("admin")
  @ApiBearerAuth()
  @ApiOperation({ summary: "Cập nhật giá bán chung của thuốc" })
  async updateMedicinePrice(
    @Param("id") id: string,
    @Body("price") price: number,
  ) {
    const result = await sendKafkaMessage(
      this.inventoryClient,
      "inventory.medicine.update_price",
      { id, price },
    );
    await this.invalidateMedicineCaches();
    return result;
  }

  @Post()
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles("admin", "head_branch", "warehouse")
  @ApiBearerAuth()
  @ApiOperation({ summary: "Tạo mới dược phẩm (SKU)" })
  @AuditLogAction({
    actionCode: "MEDICINE_CREATE",
    actionName: "Tạo mới dược phẩm",
    module: "Inventory",
    eventType: "CREATE",
    entityType: "Medicine",
  })
  async createMedicine(@Body() body: any) {
    const result = await sendKafkaMessage(
      this.inventoryClient,
      "inventory.medicine.create",
      body,
    );
    // Xóa cache dropdown, stats và filters khi tạo thuốc mới
    await this.invalidateMedicineCaches();
    return result;
  }

  @Put(":id")
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles("admin", "head_branch", "warehouse")
  @ApiBearerAuth()
  @ApiOperation({ summary: "Cập nhật thông tin dược phẩm (SKU)" })
  @AuditLogAction({
    actionCode: "MEDICINE_UPDATE",
    actionName: "Cập nhật thông tin dược phẩm",
    module: "Inventory",
    eventType: "UPDATE",
    entityType: "Medicine",
  })
  async updateMedicine(@Param("id") id: string, @Body() body: any) {
    const result = await sendKafkaMessage(
      this.inventoryClient,
      "inventory.medicine.update",
      { id, updateData: body },
    );
    // Xóa cache dropdown, stats và filters khi cập nhật thuốc
    await this.invalidateMedicineCaches();
    return result;
  }

  @Post("subcategories-count")
  @ApiOperation({ summary: "Đếm số lượng thuốc thực tế theo danh mục con trực tiếp từ MongoDB" })
  async getSubCategoryCounts(
    @Body() body: { category?: string; items: { id: string; searchKeyword?: string; categoryValue?: string }[] },
  ) {
    return await sendKafkaMessage(
      this.inventoryClient,
      "inventory.medicine.subcategory_counts",
      body,
    );
  }

  @Get()
  @ApiOperation({
    summary: "Lấy danh sách thuốc (kết nối Mongoose & Vector DB)",
  })
  @ApiQuery({ name: "page", required: false, type: Number })
  @ApiQuery({ name: "limit", required: false, type: Number })
  @ApiQuery({ name: "search", required: false, type: String })
  @ApiQuery({ name: "category", required: false, type: String })
  @ApiQuery({ name: "classification", required: false, type: String })
  @ApiQuery({ name: "drug_classification", required: false, type: String })
  @ApiQuery({ name: "targetGroup", required: false, type: String })
  @ApiQuery({ name: "minPrice", required: false, type: Number })
  @ApiQuery({ name: "maxPrice", required: false, type: Number })
  @ApiQuery({ name: "flavour", required: false, type: String })
  @ApiQuery({ name: "country", required: false, type: String })
  @ApiQuery({ name: "brand", required: false, type: String })
  @ApiQuery({ name: "indication", required: false, type: String })
  @ApiQuery({ name: "brandOrigin", required: false, type: String })
  @ApiQuery({ name: "branchId", required: false, type: String })
  @ApiQuery({ name: "bypassAiSearch", required: false, type: Boolean })
  @ApiQuery({ name: "directDb", required: false, type: Boolean })
  async getMedicines(
    @Query("page") page = 1,
    @Query("limit") limit = 10,
    @Query("search") search = "",
    @Query("category") category = "",
    @Query("classification") classification = "",
    @Query("drug_classification") drugClassification = "",
    @Query("targetGroup") targetGroup = "",
    @Query("minPrice") minPrice?: number,
    @Query("maxPrice") maxPrice?: number,
    @Query("flavour") flavour = "",
    @Query("country") country = "",
    @Query("brand") brand = "",
    @Query("indication") indication = "",
    @Query("brandOrigin") brandOrigin = "",
    @Query("branchId") branchId = "",
    @Query("bypassAiSearch") bypassAiSearch?: string | boolean,
    @Query("directDb") directDb?: string | boolean,
  ) {
    const safeLimit = Math.min(Math.max(Number(limit) || 10, 1), 100);
    const safePage = Math.max(Number(page) || 1, 1);
    const effectiveClassification = classification || drugClassification || "";
    const isDirectDb = bypassAiSearch === true || bypassAiSearch === "true" || directDb === true || directDb === "true";
    const cacheKey = `medicines:list:${safePage}:${safeLimit}:${search}:${category}:${effectiveClassification}:${targetGroup}:${minPrice || ""}:${maxPrice || ""}:${flavour}:${country}:${brand}:${indication}:${brandOrigin}:${branchId}:${isDirectDb}`;

    // 1. Kiểm tra cache Redis (Nếu không yêu cầu directDb / bypassAiSearch)
    if (!isDirectDb && this.cacheManager) {
      try {
        const cached = await this.cacheManager.get(cacheKey);
        if (cached) {
          return cached;
        }
      } catch (e) {}
    }

    // 2. Cache Miss hoặc Direct DB: Gọi sang Microservice qua Kafka
    try {
      const result = await sendKafkaMessage(
        this.inventoryClient,
        "inventory.medicine.list",
        {
          page: safePage,
          limit: safeLimit,
          search,
          category,
          classification: effectiveClassification,
          targetGroup,
          minPrice: minPrice ? Number(minPrice) : undefined,
          maxPrice: maxPrice ? Number(maxPrice) : undefined,
          flavour,
          country,
          brand,
          indication,
          brandOrigin,
          branchId,
          bypassAiSearch: isDirectDb,
        },
      );

      // 3. Ghi kết quả vào Redis Cache (Landing page mặc định: 10 phút, còn lại: 2 phút)
      if (!isDirectDb && this.cacheManager && result) {
        try {
          const isLandingDefault = safePage === 1 && safeLimit <= 12 && !search && !category;
          const ttl = isLandingDefault ? 600000 : 120000;
          await this.cacheManager.set(cacheKey, result, ttl);
        } catch (e) {}
      }

      return result;
    } catch (error) {
      return {
        data: [],
        total: 0,
        page: Number(page),
        limit: Number(limit),
        totalPages: 0,
      };
    }
  }
}
