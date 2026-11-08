import {
  Controller,
  Get,
  Post,
  Delete,
  Param,
  Inject,
  OnModuleInit,
  UseInterceptors,
  UploadedFile,
  UploadedFiles,
  Body,
  HttpException,
  HttpStatus,
  UseGuards,
  Req,
} from "@nestjs/common";
import { ClientKafka } from "@nestjs/microservices";
import { FileInterceptor, FilesInterceptor } from "@nestjs/platform-express";
import {
  sendKafkaMessage,
  subscribeToKafkaTopics,
} from "../common/kafka.helper";
import { JwtAuthGuard } from "../guards/jwt-auth.guard";
import { OptionalJwtAuthGuard } from "../guards/optional-jwt-auth.guard";

@Controller("api/prescriptions")
export class PrescriptionController implements OnModuleInit {
  constructor(
    @Inject("INVENTORY_SERVICE") private readonly inventoryClient: ClientKafka,
  ) {}

  async onModuleInit() {
    // Topics are already subscribed globally in AppGatewayModule
  }

  private getAiServiceHost(): string {
    const configured = process.env.AI_SERVICE_URL;
    const isDocker = Boolean(
      process.env.KAFKA_BROKERS?.includes("kafka:") ||
      process.env.REDIS_HOST === "redis",
    );
    if (isDocker) {
      if (
        configured &&
        !configured.includes("localhost") &&
        !configured.includes("127.0.0.1")
      ) {
        return configured;
      }
      return "http://ai-service:8000";
    }
    return configured || "http://localhost:8000";
  }

  private getInternalHeaders(includeJsonContentType = true): Record<string, string> {
    const headers: Record<string, string> = {
      "X-Internal-Token":
        process.env.INTERNAL_SERVICE_TOKEN ||
        process.env.JWT_SECRET ||
        "wdp301-super-secret-key-change-in-production",
    };
    if (includeJsonContentType) {
      headers["Content-Type"] = "application/json";
    }
    return headers;
  }

  @Post("scan-ai")
  @UseGuards(JwtAuthGuard)
  @UseInterceptors(FilesInterceptor("images", 5))
  async scanPrescriptionImages(
    @UploadedFiles() files: Express.Multer.File[],
    @Body("branch_id") branchId?: string,
  ) {
    if (!files || files.length === 0) {
      throw new HttpException(
        "Vui lòng cung cấp ít nhất 1 ảnh đơn thuốc",
        HttpStatus.BAD_REQUEST,
      );
    }

    try {
      const formData = new FormData();
      for (const file of files) {
        const blob = new Blob([new Uint8Array(file.buffer)], {
          type: file.mimetype || "image/jpeg",
        });
        formData.append("files", blob, file.originalname || "prescription.jpg");
      }
      formData.append("branch_id", branchId || "CENTRAL_WH");

      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 60000); // 60s timeout for multi-page vision

      const aiServiceHost = this.getAiServiceHost();
      const response = await fetch(
        `${aiServiceHost}/api/ai/scan-prescription-v2`,
        {
          method: "POST",
          headers: this.getInternalHeaders(false),
          body: formData,
          signal: controller.signal,
        },
      ).catch(async () => {
        // Fallback for docker container naming if localhost fails
        const aiUrl = process.env.AI_SERVICE_URL || "http://ai-service:8000";
        return await fetch(`${aiUrl}/api/ai/scan-prescription-v2`, {
          method: "POST",
          headers: this.getInternalHeaders(false),
          body: formData,
          signal: controller.signal,
        });
      });

      clearTimeout(timeoutId);

      if (!response.ok) {
        const errorText = await response.text();
        let errorDetail = errorText;
        try {
          const parsed = JSON.parse(errorText);
          if (parsed.detail) {
            errorDetail =
              typeof parsed.detail === "string"
                ? parsed.detail
                : JSON.stringify(parsed.detail);
          }
        } catch (_) {}
        throw new HttpException(errorDetail, response.status);
      }

      return await response.json();
    } catch (error) {
      if (error instanceof HttpException) {
        throw error;
      }
      throw new HttpException(
        error.message || "Lỗi kết nối hoặc xử lý quét đơn thuốc từ AI Service",
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }

  @Post("scan")
  @UseGuards(OptionalJwtAuthGuard)
  @UseInterceptors(FileInterceptor("file"))
  async scanPrescriptionLegacy(@UploadedFile() file: Express.Multer.File) {
    if (!file) {
      throw new HttpException(
        "Vui lòng cung cấp file ảnh đơn thuốc",
        HttpStatus.BAD_REQUEST,
      );
    }
    try {
      const formData = new FormData();
      const blob = new Blob([new Uint8Array(file.buffer)], {
        type: file.mimetype || "image/jpeg",
      });
      formData.append("file", blob, file.originalname || "prescription.jpg");

      const aiServiceHost = this.getAiServiceHost();
      const response = await fetch(
        `${aiServiceHost}/api/ai/scan-prescription`,
        {
          method: "POST",
          headers: this.getInternalHeaders(false),
          body: formData,
        },
      ).catch(async () => {
        const aiUrl = process.env.AI_SERVICE_URL || "http://ai-service:8000";
        return await fetch(`${aiUrl}/api/ai/scan-prescription`, {
          method: "POST",
          headers: this.getInternalHeaders(false),
          body: formData,
        });
      });

      if (!response.ok) {
        const errorText = await response.text();
        let errorDetail = errorText;
        try {
          const parsed = JSON.parse(errorText);
          if (parsed.detail) {
            errorDetail =
              typeof parsed.detail === "string"
                ? parsed.detail
                : JSON.stringify(parsed.detail);
          }
        } catch (_) {}
        throw new HttpException(errorDetail, response.status);
      }
      return await response.json();
    } catch (error) {
      if (error instanceof HttpException) throw error;
      throw new HttpException(
        error.message || "Lỗi quét đơn thuốc luồng cũ",
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }

  @Get("samples")
  @UseGuards(OptionalJwtAuthGuard)
  async getSamplePrescriptions() {
    try {
      const aiServiceHost = this.getAiServiceHost();
      const response = await fetch(
        `${aiServiceHost}/api/ai/sample-prescriptions`,
        { headers: this.getInternalHeaders(false) },
      ).catch(async () => {
        const aiUrl = process.env.AI_SERVICE_URL || "http://ai-service:8000";
        return await fetch(`${aiUrl}/api/ai/sample-prescriptions`, {
          headers: this.getInternalHeaders(false),
        });
      });
      if (!response.ok) {
        return { success: true, samples: [] };
      }
      return await response.json();
    } catch {
      return { success: true, samples: [] };
    }
  }

  @Post("scan-sample")
  @UseGuards(OptionalJwtAuthGuard)
  async scanSamplePrescription(@Body("filename") filename: string) {
    if (!filename) {
      throw new HttpException(
        "Vui lòng cung cấp tên file đơn thuốc mẫu",
        HttpStatus.BAD_REQUEST,
      );
    }
    try {
      const aiServiceHost = this.getAiServiceHost();
      const response = await fetch(
        `${aiServiceHost}/api/ai/scan-sample-prescription`,
        {
          method: "POST",
          headers: this.getInternalHeaders(true),
          body: JSON.stringify({ filename }),
        },
      ).catch(async () => {
        const aiUrl = process.env.AI_SERVICE_URL || "http://ai-service:8000";
        return await fetch(`${aiUrl}/api/ai/scan-sample-prescription`, {
          method: "POST",
          headers: this.getInternalHeaders(true),
          body: JSON.stringify({ filename }),
        });
      });

      if (!response.ok) {
        const errorText = await response.text();
        let errorDetail = errorText;
        try {
          const parsed = JSON.parse(errorText);
          if (parsed.detail) {
            errorDetail =
              typeof parsed.detail === "string"
                ? parsed.detail
                : JSON.stringify(parsed.detail);
          }
        } catch (_) {}
        throw new HttpException(errorDetail, response.status);
      }
      return await response.json();
    } catch (error) {
      if (error instanceof HttpException) throw error;
      throw new HttpException(
        error.message || "Lỗi xử lý quét đơn thuốc mẫu",
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }

  // =========================================================================
  // BỘ LƯU TRỮ XÁC NHẬN CHẤP THUẬN NỘI QUY AI TRÊN MÁY CHỦ (SERVER CONSENT STORE)
  // Ghi nhận chấp thuận theo tài khoản người dùng hoặc phiên khách (Session ID / IP)
  // =========================================================================
  private static readonly consentStore = new Map<
    string,
    { accepted: boolean; version: string; acceptedAt: string }
  >();

  /**
   * Phương thức hỗ trợ dọn dẹp kho chấp thuận (chỉ dùng cho bài test unit)
   */
  public static clearConsentStoreForTesting(): void {
    PrescriptionController.consentStore.clear();
  }

  /**
   * Phương thức hỗ trợ ghi nhận chấp thuận trực tiếp (dùng cho test hoặc nội bộ)
   */
  public static setConsentForTesting(key: string, version = "v1.0-OTC"): void {
    PrescriptionController.consentStore.set(key, {
      accepted: true,
      version,
      acceptedAt: new Date().toISOString(),
    });
  }

  /**
   * Khử thông tin định danh cá nhân (PII Scrubbing) trước khi chuyển dữ liệu sang AI Service (DeepSeek)
   * Cam kết ẩn danh 100% dữ liệu y tế theo Điều 7 Nội quy AI
   */
  private sanitizePii(text?: string | null): string {
    if (!text || typeof text !== "string") return "";
    return text
      // 1. Khử số điện thoại Việt Nam (10-11 số, đầu 03, 05, 07, 08, 09 hoặc +84)
      .replace(/(?:\+84|0)(?:3[2-9]|5[25689]|7[06-9]|8[1-9]|9\d)\d{7}/g, "[ĐÃ ẨN SĐT]")
      // 2. Khử số CCCD / CMND (9 hoặc 12 số liên tiếp)
      .replace(/\b\d{12}\b|\b\d{9}\b/g, "[ĐÃ ẨN CCCD]")
      // 3. Khử địa chỉ Email
      .replace(/[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}/g, "[ĐÃ ẨN EMAIL]");
  }

  /**
   * Kiểm tra bản ghi chấp thuận Nội quy Trợ lý AI trên máy chủ (Server-side Fail-closed Check)
   * Ngăn chặn hoàn toàn việc client tự gửi "terms_confirmed: true" mà chưa từng gọi API xác nhận
   */
  private verifyServerAiConsent(req: any, body?: any): void {
    const CURRENT_TERMS_VERSION = "v1.0-OTC";
    const userId = req?.user?.sub || req?.user?.userId || req?.user?.id;
    const sessionId =
      req?.headers?.["x-client-session-id"] ||
      req?.headers?.["x-session-id"] ||
      body?.session_id ||
      body?.sessionId;
    const ip = req?.ip || req?.headers?.["x-forwarded-for"] || "127.0.0.1";

    // 1. Kiểm tra tài khoản người dùng đã đăng nhập
    if (userId && PrescriptionController.consentStore.has(`user:${userId}`)) {
      const record = PrescriptionController.consentStore.get(`user:${userId}`);
      if (record?.accepted && record.version === CURRENT_TERMS_VERSION) {
        return;
      }
    }

    // 2. Kiểm tra phiên khách vãng lai qua Session ID
    if (sessionId && PrescriptionController.consentStore.has(`session:${sessionId}`)) {
      const record = PrescriptionController.consentStore.get(`session:${sessionId}`);
      if (record?.accepted && record.version === CURRENT_TERMS_VERSION) {
        return;
      }
    }

    // 3. Fallback kiểm tra theo IP của máy khách
    if (ip && PrescriptionController.consentStore.has(`ip:${ip}`)) {
      const record = PrescriptionController.consentStore.get(`ip:${ip}`);
      if (record?.accepted && record.version === CURRENT_TERMS_VERSION) {
        return;
      }
    }

    // Không tìm thấy bản ghi chấp thuận hợp lệ trên máy chủ
    throw new HttpException(
      "Người dùng hoặc phiên làm việc này chưa hoàn tất xác nhận Nội quy Trợ lý Dược sĩ AI (phiên bản v1.0-OTC) trên máy chủ. Vui lòng mở và đồng ý Điều khoản trước khi sử dụng AI.",
      HttpStatus.FORBIDDEN,
    );
  }

  @Post("recommend")
  @UseGuards(OptionalJwtAuthGuard)
  @UseInterceptors(FileInterceptor("audio"))
  async recommendPrescription(
    @UploadedFile() file: Express.Multer.File,
    @Body("patient_id") patientId?: string,
    @Body("branch_id") branchId?: string,
    @Req() req?: any,
  ) {
    // Kiểm tra chấp thuận nội quy AI trên máy chủ trước khi xử lý giọng nói
    this.verifyServerAiConsent(req, { patient_id: patientId, branch_id: branchId });

    if (!file) {
      throw new HttpException(
        "Vui lòng cung cấp file ghi âm cuộc thoại",
        HttpStatus.BAD_REQUEST,
      );
    }

    try {
      const formData = new FormData();

      // Convert Buffer to Blob for fetch FormData
      const blob = new Blob([new Uint8Array(file.buffer)], {
        type: file.mimetype || "audio/webm",
      });
      formData.append("audio", blob, file.originalname || "audio.webm");

      if (patientId) {
        formData.append("patient_id", patientId);
      }

      const resolvedBranchId =
        branchId || req?.user?.branchId || req?.user?.branch_id;
      if (resolvedBranchId) {
        formData.append("branch_id", resolvedBranchId);
      }

      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 60000); // 60s timeout for STT + RAG + LLM

      const aiServiceHost = this.getAiServiceHost();
      const response = await fetch(`${aiServiceHost}/api/prescription`, {
        method: "POST",
        headers: this.getInternalHeaders(false),
        body: formData,
        signal: controller.signal,
      }).catch(async () => {
        const aiUrl = process.env.AI_SERVICE_URL || "http://ai-service:8000";
        return await fetch(`${aiUrl}/api/prescription`, {
          method: "POST",
          headers: this.getInternalHeaders(false),
          body: formData,
          signal: controller.signal,
        });
      });

      clearTimeout(timeoutId);

      if (!response.ok) {
        const errorText = await response.text();
        throw new HttpException(
          `Lỗi từ AI Service: ${errorText}`,
          response.status,
        );
      }

      return await response.json();
    } catch (error) {
      if (error instanceof HttpException) {
        throw error;
      }
      throw new HttpException(
        error.message || "Lỗi kết nối hoặc xử lý từ AI Service",
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }

  @Post("transcribe")
  @UseGuards(OptionalJwtAuthGuard)
  @UseInterceptors(FileInterceptor("audio"))
  async quickTranscribe(
    @UploadedFile() file: Express.Multer.File,
    @Req() req?: any,
  ) {
    // Kiểm tra chấp thuận nội quy AI trên máy chủ trước khi xử lý giọng nói
    this.verifyServerAiConsent(req);

    if (!file) {
      throw new HttpException(
        "Vui lòng cung cấp file ghi âm",
        HttpStatus.BAD_REQUEST,
      );
    }
    try {
      const formData = new FormData();
      const blob = new Blob([new Uint8Array(file.buffer)], {
        type: file.mimetype || "audio/webm",
      });
      formData.append("audio", blob, file.originalname || "voice_input.webm");

      const aiServiceHost = this.getAiServiceHost();
      const response = await fetch(`${aiServiceHost}/api/ai/transcribe`, {
        method: "POST",
        headers: this.getInternalHeaders(false),
        body: formData,
      });

      if (!response.ok) {
        const errText = await response.text();
        throw new HttpException(`AI Service lỗi: ${errText}`, response.status);
      }
      return await response.json();
    } catch (err: any) {
      if (err instanceof HttpException) throw err;
      throw new HttpException(
        err.message || "Lỗi bóc tách âm thanh từ AI Service",
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }

  @Post("symptom-consult")
  @UseGuards(OptionalJwtAuthGuard)
  async textConsult(
    @Body("symptoms") symptoms: string,
    @Body("branch_id") branchId?: string,
    @Body("terms_confirmed") termsConfirmed?: boolean | string,
    @Body("session_id") sessionId?: string,
    @Req() req?: any,
  ) {
    // 1. Kiểm tra xác nhận trên máy chủ (Server Consent Store) - Fail-closed cả tài khoản đăng nhập và khách vãng lai
    this.verifyServerAiConsent(req, { branch_id: branchId, session_id: sessionId });

    // 2. Chặn nếu client chủ động gửi cờ termsConfirmed là false
    if (termsConfirmed === false || termsConfirmed === "false") {
      throw new HttpException(
        "Người dùng bắt buộc phải đọc và đồng ý với nội quy tư vấn Dược sĩ AI trước khi gửi yêu cầu (Fail-closed).",
        HttpStatus.FORBIDDEN,
      );
    }

    if (!symptoms) {
      throw new HttpException(
        "Vui lòng cung cấp triệu chứng",
        HttpStatus.BAD_REQUEST,
      );
    }
    const resolvedBranchId =
      branchId || req?.user?.branchId || req?.user?.branch_id;

    // Khử PII trong mô tả triệu chứng trước khi chuyển tiếp sang AI Service
    const cleanSymptoms = this.sanitizePii(symptoms);
    const payload: any = { symptoms: cleanSymptoms };
    if (resolvedBranchId) {
      payload.branch_id = resolvedBranchId;
    }
    try {
      const aiServiceHost = this.getAiServiceHost();
      const response = await fetch(`${aiServiceHost}/api/ai/symptom-consult`, {
        method: "POST",
        headers: this.getInternalHeaders(true),
        body: JSON.stringify(payload),
      }).catch(async () => {
        const aiUrl = process.env.AI_SERVICE_URL || "http://ai-service:8000";
        return await fetch(`${aiUrl}/api/ai/symptom-consult`, {
          method: "POST",
          headers: this.getInternalHeaders(true),
          body: JSON.stringify(payload),
        });
      });

      if (!response.ok) {
        const errorText = await response.text();
        throw new HttpException(
          `Lỗi từ AI Service: ${errorText}`,
          HttpStatus.BAD_GATEWAY,
        );
      }

      return await response.json();
    } catch (error) {
      if (error instanceof HttpException) throw error;
      throw new HttpException(
        error.message || "Lỗi kết nối hoặc xử lý từ AI Service",
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }

  // =========================================================================
  // NỘI QUY & ĐIỀU KHOẢN SỬ DỤNG TRỢ LÝ DƯỢC SĨ AI (TÀI LIỆU NGHIỆP VỤ MỤC 18)
  // =========================================================================
  @Get("ai-terms")
  getAiConsultantTerms() {
    return {
      success: true,
      version: "v1.0-OTC",
      releaseDate: "01/11/2026",
      title: "NỘI QUY & ĐIỀU KHOẢN SỬ DỤNG TRỢ LÝ DƯỢC SĨ AI (ABC PHARMACY)",
      legalBases: [
        "Luật Dược số 105/2016/QH13",
        "Thông tư 07/2017/TT-BYT ban hành Danh mục thuốc không kê đơn",
        "Tiêu chuẩn Thực hành tốt Cơ sở bán lẻ thuốc (GPP) và GDP",
        "Nguyên tắc minh bạch & Quản trị rủi ro AI theo Dự thảo Luật Trí tuệ Nhân tạo 2025",
      ],
      articles: [
        {
          order: 1,
          title: "Mục tiêu & Phạm vi tư vấn OTC",
          summary: "Tư vấn hỗ trợ lựa chọn thuốc không kê đơn (OTC) và TPCN cho triệu chứng nhẹ; không chẩn đoán hay kê đơn.",
        },
        {
          order: 2,
          title: "Chống chỉ định & Tình huống khẩn cấp",
          summary: "Tuyệt đối không dùng cho trường hợp cấp cứu; có dấu hiệu nguy kịch cần gọi 115 hoặc đến bệnh viện ngay.",
        },
        {
          order: 3,
          title: "Quy định về thuốc kê đơn (ETC)",
          summary: "Thuốc kê đơn không được tư vấn hay bán online; chỉ đặt giữ hàng khi có đơn bác sĩ hợp lệ tại quầy.",
        },
        {
          order: 4,
          title: "Trách nhiệm khai báo của khách hàng",
          summary: "Khai báo trung thực, đầy đủ tiền sử bệnh, dị ứng, thuốc đang dùng; tự chịu trách nhiệm nếu cố tình sai lệch.",
        },
        {
          order: 5,
          title: "Nguyên tắc cá nhân hóa",
          summary: "Phiếu tư vấn chỉ áp dụng cho riêng người được tư vấn tại thời điểm đó; không chia sẻ hay dùng cho người khác.",
        },
        {
          order: 6,
          title: "Vai trò giám sát của Dược sĩ",
          summary: "Dược sĩ có CCHN chịu trách nhiệm chuyên môn tối cao; AI chỉ đóng vai trò trợ lý soạn nháp, nguyên tắc Fail-closed.",
        },
        {
          order: 7,
          title: "Bảo vệ & Minh bạch xử lý dữ liệu y tế qua AI",
          summary: "Mọi thông tin định danh (họ tên, SĐT, CCCD, Email) đều được hệ thống tự động phát hiện và che giấu ẩn danh 100% trước khi xử lý qua mô hình AI (DeepSeek / LLM). Dữ liệu lâm sàng (tiền sử dị ứng, bệnh nền) mặc định TẮT đính kèm và chỉ được gửi khi khách hàng chủ động bật tùy chọn đính kèm, nhằm mục đích duy nhất là phát hiện tương tác thuốc và chống sốc phản vệ an toàn.",
        },
        {
          order: 8,
          title: "Xử trí tác dụng phụ & Khiếu nại",
          summary: "Ngưng thuốc ngay khi có biểu hiện bất thường; liên hệ hotline 1800 6868 hoặc cơ sở y tế gần nhất.",
        },
      ],
    };
  }

  @Post("ai-terms/accept")
  @UseGuards(OptionalJwtAuthGuard)
  acceptAiConsultantTerms(
    @Body() body: { version?: string; acceptedAt?: string; session_id?: string; sessionId?: string; metadata?: any },
    @Req() req: any,
  ) {
    const version = body?.version || "v1.0-OTC";
    // Lưu thời điểm chính xác từ máy chủ (Server Timestamp)
    const acceptedAt = new Date().toISOString();
    // Đọc chuẩn userId: ưu tiên req.user.sub theo chuẩn JWT RFC 7519
    const userId = req?.user?.sub || req?.user?.userId || req?.user?.id || req?.user?._id;
    const sessionId =
      req?.headers?.["x-client-session-id"] ||
      req?.headers?.["x-session-id"] ||
      body?.session_id ||
      body?.sessionId ||
      "anonymous-session";
    const ip = req?.ip || req?.headers?.["x-forwarded-for"] || "127.0.0.1";

    // Lưu vào bộ nhớ máy chủ (Server Consent Store) phục vụ kiểm tra fail-closed cho các API tiếp theo
    if (userId) {
      PrescriptionController.consentStore.set(`user:${userId}`, {
        accepted: true,
        version,
        acceptedAt,
      });
    }
    if (sessionId) {
      PrescriptionController.consentStore.set(`session:${sessionId}`, {
        accepted: true,
        version,
        acceptedAt,
      });
    }
    if (ip) {
      PrescriptionController.consentStore.set(`ip:${ip}`, {
        accepted: true,
        version,
        acceptedAt,
      });
    }

    // Ghi nhận nhật ký kiểm toán (Audit Trail) phục vụ đối soát y tế
    const auditRecord = {
      userId: userId || "anonymous-guest",
      sessionId,
      version,
      acceptedAt,
      ip,
      userAgent: req?.headers?.["user-agent"] || "unknown",
      status: "CONFIRMED",
    };

    return {
      success: true,
      message: "Đã ghi nhận chấp thuận nội quy Trợ lý Dược sĩ AI thành công trên máy chủ",
      audit: auditRecord,
    };
  }

  @Post("chat")
  @UseGuards(OptionalJwtAuthGuard)
  async chatConsult(
    @Body()
    body: {
      message?: string;
      history?: Array<{ role: string; content: string }>;
      age_group?: string;
      gender?: string;
      allergies?: string[];
      allergic_medicines?: string[];
      allergic_ingredients?: string[];
      chronic_conditions?: string[];
      blood_type?: string;
      medical_notes?: string;
      image_base64?: string;
      terms_confirmed?: boolean | string;
      session_id?: string;
      sessionId?: string;
    },
    @Req() req?: any,
  ) {
    // 1. Kiểm tra xác nhận trên máy chủ (Server Consent Store) - Chặn client tự chế terms_confirmed: true
    this.verifyServerAiConsent(req, body);

    // 2. Chặn nếu client chủ động gửi cờ terms_confirmed là false
    if (body?.terms_confirmed === false || body?.terms_confirmed === "false") {
      throw new HttpException(
        "Người dùng bắt buộc phải đọc và đồng ý với nội quy tư vấn Dược sĩ AI trước khi gửi yêu cầu (Fail-closed).",
        HttpStatus.FORBIDDEN,
      );
    }
    const hasMessage = Boolean(body?.message && body.message.trim());
    const hasImage = Boolean(body?.image_base64 && body.image_base64.trim());

    if (!hasMessage && !hasImage) {
      throw new HttpException(
        "Vui lòng nhập nội dung tin nhắn hoặc gửi hình ảnh cần tư vấn",
        HttpStatus.BAD_REQUEST,
      );
    }

    try {
      // Data minimization & Cam kết ẩn danh 100%: Khử PII (họ tên, email, sđt, cccd) trong nội dung tự do
      const cleanMessage = this.sanitizePii(body.message ? body.message.trim() : "");
      const cleanNotes = body.medical_notes ? this.sanitizePii(body.medical_notes) : null;
      const cleanHistory = Array.isArray(body.history)
        ? body.history.slice(-30).map((h) => ({
            role: h.role,
            content: this.sanitizePii(h.content),
          }))
        : [];

      const sanitizedPayload = {
        message: cleanMessage,
        history: cleanHistory,
        age_group: body.age_group || null,
        gender: body.gender || null,
        allergies: Array.isArray(body.allergies) ? body.allergies : [],
        allergic_medicines: Array.isArray(body.allergic_medicines) ? body.allergic_medicines : [],
        allergic_ingredients: Array.isArray(body.allergic_ingredients) ? body.allergic_ingredients : [],
        chronic_conditions: Array.isArray(body.chronic_conditions) ? body.chronic_conditions : [],
        blood_type: body.blood_type || null,
        medical_notes: cleanNotes,
        image_base64: hasImage ? body.image_base64 : null,
      };

      const aiServiceHost = this.getAiServiceHost();
      const response = await fetch(`${aiServiceHost}/api/ai/chat`, {
        method: "POST",
        headers: this.getInternalHeaders(true),
        body: JSON.stringify(sanitizedPayload),
      }).catch(async () => {
        const aiUrl = process.env.AI_SERVICE_URL || "http://ai-service:8000";
        return await fetch(`${aiUrl}/api/ai/chat`, {
          method: "POST",
          headers: this.getInternalHeaders(true),
          body: JSON.stringify(sanitizedPayload),
        });
      });

      if (!response.ok) {
        const errorText = await response.text();
        throw new HttpException(
          `Lỗi từ AI Service: ${errorText}`,
          HttpStatus.BAD_GATEWAY,
        );
      }

      return await response.json();
    } catch (error) {
      if (error instanceof HttpException) {
        throw error;
      }
      throw new HttpException(
        error.message || "Lỗi kết nối hoặc xử lý từ AI Chat Service",
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }

  @Get("chat/sessions")
  @UseGuards(JwtAuthGuard)
  async getChatSessions(@Req() req: any) {
    try {
      const userId = req.user?.sub;
      if (!userId) {
        return { success: true, sessions: [] };
      }
      const aiServiceHost = this.getAiServiceHost();
      const response = await fetch(`${aiServiceHost}/api/ai/chat/sessions?user_id=${userId}`, {
        headers: this.getInternalHeaders(false),
      });
      if (!response.ok) {
        return { success: true, sessions: [] };
      }
      return await response.json();
    } catch (error) {
      return { success: true, sessions: [] };
    }
  }

  @Post("chat/sessions")
  @UseGuards(JwtAuthGuard)
  async saveChatSession(@Req() req: any, @Body() body: any) {
    try {
      const userId = req.user?.sub;
      if (!userId) {
        return { success: false, message: "Yêu cầu đăng nhập" };
      }
      const aiServiceHost = this.getAiServiceHost();
      const payload = {
        user_id: userId,
        session_id: body.session_id || body.id,
        title: body.title || "Cuộc trò chuyện",
        messages: body.messages || [],
        created_at: body.created_at || body.createdAt,
        updated_at: body.updated_at || body.updatedAt,
      };

      const response = await fetch(`${aiServiceHost}/api/ai/chat/sessions`, {
        method: "POST",
        headers: this.getInternalHeaders(true),
        body: JSON.stringify(payload),
      });

      if (!response.ok) {
        const errorText = await response.text();
        throw new HttpException(`Lỗi lưu session: ${errorText}`, HttpStatus.BAD_GATEWAY);
      }
      return await response.json();
    } catch (error) {
      throw new HttpException(error.message || "Lỗi lưu phiên trò chuyện", HttpStatus.INTERNAL_SERVER_ERROR);
    }
  }

  @Delete("chat/sessions/:sessionId")
  @UseGuards(JwtAuthGuard)
  async deleteChatSession(@Req() req: any, @Param("sessionId") sessionId: string) {
    try {
      const userId = req.user?.sub;
      if (!userId) {
        return { success: false };
      }
      const aiServiceHost = this.getAiServiceHost();
      const response = await fetch(`${aiServiceHost}/api/ai/chat/sessions/${sessionId}?user_id=${userId}`, {
        method: "DELETE",
        headers: this.getInternalHeaders(false),
      });
      if (!response.ok) {
        return { success: false };
      }
      return await response.json();
    } catch (error) {
      return { success: false };
    }
  }

  @Get()
  @UseGuards(OptionalJwtAuthGuard)
  async listPrescriptions() {
    try {
      return await sendKafkaMessage(
        this.inventoryClient,
        "inventory.prescription.list",
        {},
      );
    } catch (error) {
      return [];
    }
  }

  @Get(":code")
  @UseGuards(OptionalJwtAuthGuard)
  async getPrescriptionByCode(@Param("code") code: string) {
    return await sendKafkaMessage(
      this.inventoryClient,
      "inventory.prescription.get",
      { code },
    );
  }

  /**
   * UC-107: AI Allergy & Contraindication Cross-check
   * Kiểm tra chéo 4 chiều: Dị ứng nhóm, Thuốc dị ứng, Hoạt chất dị ứng, Bệnh nền
   * Trả về cảnh báo xung đột lâm sàng và gợi ý danh sách thuốc an toàn thay thế
   */
  @Post("allergy-check")
  @UseGuards(OptionalJwtAuthGuard)
  async checkCartAllergyAndContraindications(
    @Body()
    body: {
      customerProfile?: {
        allergies?: string[];
        allergicMedicines?: string[];
        allergicIngredients?: string[];
        chronicConditions?: string[];
        bloodType?: string;
        medicalNotes?: string;
      };
      cartItems?: Array<{
        id?: string;
        _id?: string;
        medicineId?: string;
        name: string;
        activeIngredient?: string;
        contraindications?: string;
        indications?: string;
        category?: string;
        price?: number;
      }>;
    },
  ) {
    const profile = body.customerProfile || {};
    const cartItems = body.cartItems || [];

    if (!cartItems || cartItems.length === 0) {
      return {
        hasConflict: false,
        severity: "SAFE",
        conflicts: [],
        safeAlternatives: [],
        message: "Giỏ hàng rỗng, không có nguy cơ dị ứng.",
      };
    }

    // Hàm chuẩn hóa chuỗi tiếng Việt để so khớp chính xác
    const normalize = (str?: string) => {
      if (!str) return "";
      return str
        .toLowerCase()
        .normalize("NFD")
        .replace(/[\u0300-\u036f]/g, "")
        .replace(/đ/g, "d")
        .replace(/Đ/g, "d")
        .trim();
    };

    const allergies = (profile.allergies || []).map(normalize).filter(Boolean);
    const allergicMeds = (profile.allergicMedicines || []).map(normalize).filter(Boolean);
    const allergicIngredients = (profile.allergicIngredients || []).map(normalize).filter(Boolean);
    const chronicConditions = (profile.chronicConditions || []).map(normalize).filter(Boolean);

    // Nếu bệnh nhân không có tiền sử dị ứng và không có bệnh nền
    if (
      allergies.length === 0 &&
      allergicMeds.length === 0 &&
      allergicIngredients.length === 0 &&
      chronicConditions.length === 0
    ) {
      return {
        hasConflict: false,
        severity: "SAFE",
        conflicts: [],
        safeAlternatives: [],
        message: "Hồ sơ bệnh nhân không ghi nhận tiền sử dị ứng hay bệnh lý nền xung đột.",
      };
    }

    const conflicts: Array<{
      medicineName: string;
      activeIngredient: string;
      conflictType: "ALLERGY_MEDICINE" | "ALLERGY_INGREDIENT" | "CROSS_REACTIVITY" | "CONTRAINDICATION_CHRONIC";
      severity: "CRITICAL" | "HIGH" | "MODERATE";
      reason: string;
      clinicalExplanation: string;
      suggestedAction: string;
      safeAlternatives: Array<{
        name: string;
        activeIngredient: string;
        indication: string;
        reason: string;
      }>;
    }> = [];

    // Duyệt qua từng sản phẩm trong giỏ hàng để đối soát lâm sàng
    for (const item of cartItems) {
      const medNameNorm = normalize(item.name);
      const ingredientNorm = normalize(item.activeIngredient || "");
      const itemContraNorm = normalize(item.contraindications || "");

      // 1. Kiểm tra dị ứng thuốc cụ thể (Direct Allergic Medicine Match)
      for (const allergicMed of allergicMeds) {
        if (medNameNorm.includes(allergicMed) || allergicMed.includes(medNameNorm)) {
          conflicts.push({
            medicineName: item.name,
            activeIngredient: item.activeIngredient || "N/A",
            conflictType: "ALLERGY_MEDICINE",
            severity: "CRITICAL",
            reason: `Trùng với thuốc từng bị dị ứng: "${item.name}"`,
            clinicalExplanation: `Bệnh nhân có tiền sử ghi nhận dị ứng trực tiếp với thuốc này. Việc tái sử dụng có thể dẫn đến phản ứng quá mẫn Type I qua trung gian IgE, nguy cơ sốc phản vệ và tử vong!`,
            suggestedAction: "CHỐNG CHỈ ĐỊNH TUYỆT ĐỐI. Dược sĩ cần ngừng bán thuốc này và đổi sang nhóm an toàn.",
            safeAlternatives: [
              {
                name: "Thuốc thay thế theo đơn",
                activeIngredient: "Nhóm dược lý khác",
                indication: "Điều trị tương đương",
                reason: "Không chứa hoạt chất hoặc tá dược gây dị ứng cho bệnh nhân.",
              },
            ],
          });
        }
      }

      // 2. Kiểm tra dị ứng trực tiếp hoạt chất (Allergic Ingredient Match)
      for (const allergicIng of allergicIngredients) {
        if (ingredientNorm.includes(allergicIng) || medNameNorm.includes(allergicIng)) {
          conflicts.push({
            medicineName: item.name,
            activeIngredient: item.activeIngredient || allergicIng,
            conflictType: "ALLERGY_INGREDIENT",
            severity: "CRITICAL",
            reason: `Thuốc chứa hoạt chất dị ứng: "${allergicIng}"`,
            clinicalExplanation: `Sản phẩm "${item.name}" có chứa thành phần hoạt chất chính "${item.activeIngredient || allergicIng}", trùng với tiền sử dị ứng đã khai báo của bệnh nhân.`,
            suggestedAction: "CHỐNG CHỈ ĐỊNH: Tuyệt đối không phân phối sản phẩm chứa hoạt chất này.",
            safeAlternatives: [],
          });
        }
      }

      // 3. Kiểm tra dị ứng chéo nhóm thuốc (Group Cross-Reactivity)
      // a) Dị ứng nhóm Penicillin / Beta-lactam
      const isPenicillinAllergic = allergies.some((a) => a.includes("penicillin") || a.includes("beta-lactam") || a.includes("khang sinh"));
      const isPenicillinClass =
        ingredientNorm.includes("amoxicillin") ||
        ingredientNorm.includes("ampicillin") ||
        ingredientNorm.includes("penicillin") ||
        ingredientNorm.includes("oxacillin") ||
        medNameNorm.includes("augmentin") ||
        medNameNorm.includes("klamentin") ||
        medNameNorm.includes("amox");

      if (isPenicillinAllergic && isPenicillinClass) {
        conflicts.push({
          medicineName: item.name,
          activeIngredient: item.activeIngredient || "Amoxicillin / Beta-lactam",
          conflictType: "CROSS_REACTIVITY",
          severity: "CRITICAL",
          reason: "Phản ứng dị ứng chéo với nhóm Penicillin / Beta-lactam",
          clinicalExplanation: `Thuốc "${item.name}" thuộc phân nhóm kháng sinh Beta-lactam (Amoxicillin/Penicillin). Bệnh nhân có tiền sử dị ứng Penicillin có nguy cơ cao bị co thắt phế quản, phù Quinke và sốc phản vệ cấp tính.`,
          suggestedAction: "Thay thế bằng kháng sinh nhóm Macrolid hoặc Quinolon (nếu không chống chỉ định).",
          safeAlternatives: [
            {
              name: "Azithromycin 500mg",
              activeIngredient: "Azithromycin",
              indication: "Nhiễm khuẩn đường hô hấp, tai mũi họng",
              reason: "Kháng sinh nhóm Macrolid an toàn cho bệnh nhân dị ứng Penicillin.",
            },
            {
              name: "Clarithromycin 500mg",
              activeIngredient: "Clarithromycin",
              indication: "Nhiễm trùng hô hấp, da và mô mềm",
              reason: "Kháng sinh phổ rộng không thuộc nhóm Beta-lactam.",
            },
          ],
        });
      }

      // b) Dị ứng nhóm Sulfa / Sulfonamide
      const isSulfaAllergic = allergies.some((a) => a.includes("sulfa") || a.includes("sulfonamide"));
      const isSulfaClass = ingredientNorm.includes("sulfamethoxazole") || medNameNorm.includes("bactrim") || medNameNorm.includes("cotrimoxazol");
      if (isSulfaAllergic && isSulfaClass) {
        conflicts.push({
          medicineName: item.name,
          activeIngredient: item.activeIngredient || "Sulfamethoxazole",
          conflictType: "CROSS_REACTIVITY",
          severity: "CRITICAL",
          reason: "Dị ứng chéo với phân nhóm Sulfonamid",
          clinicalExplanation: `Bệnh nhân dị ứng Sulfa có nguy cơ bùng phát hội chứng Stevens-Johnson hoặc Lyell đe dọa tính mạng khi sử dụng "${item.name}".`,
          suggestedAction: "Dừng kê đơn Sulfonamid, đổi sang dòng kháng sinh khác nhóm.",
          safeAlternatives: [
            {
              name: "Ciprofloxacin 500mg",
              activeIngredient: "Ciprofloxacin",
              indication: "Nhiễm khuẩn đường tiết niệu, tiêu hóa",
              reason: "Nhóm Fluoroquinolone không chứa nhân Sulfa.",
            },
          ],
        });
      }

      // c) Dị ứng nhóm NSAID / Aspirin
      const isNsaidAllergic = allergies.some((a) => a.includes("nsaid") || a.includes("aspirin") || a.includes("giam dau"));
      const isNsaidClass =
        ingredientNorm.includes("ibuprofen") ||
        ingredientNorm.includes("diclofenac") ||
        ingredientNorm.includes("meloxicam") ||
        ingredientNorm.includes("celecoxib") ||
        ingredientNorm.includes("aspirin") ||
        ingredientNorm.includes("naproxen") ||
        medNameNorm.includes("panadol extra") || // Chứa cafein hoặc phối hợp
        medNameNorm.includes("alaxan");

      if (isNsaidAllergic && isNsaidClass) {
        conflicts.push({
          medicineName: item.name,
          activeIngredient: item.activeIngredient || "NSAID",
          conflictType: "CROSS_REACTIVITY",
          severity: "HIGH",
          reason: "Phản ứng dị ứng chéo với thuốc kháng viêm không steroid (NSAID)",
          clinicalExplanation: `Bệnh nhân có tiền sử dị ứng NSAID/Aspirin, thuốc "${item.name}" có thể kích hoạt giải phóng leukotriene gây mề đay phù mạch hoặc co thắt phế quản.`,
          suggestedAction: "Đổi sang Paracetamol đơn chất liều thông thường để giảm đau, hạ sốt an toàn.",
          safeAlternatives: [
            {
              name: "Paracetamol 500mg (Hapacol / Efferalgan)",
              activeIngredient: "Paracetamol",
              indication: "Giảm đau, hạ sốt",
              reason: "Giảm đau trung ương, an toàn và không gây phản ứng chéo với NSAID.",
            },
          ],
        });
      }

      // 4. Kiểm tra chống chỉ định với Bệnh lý nền (Chronic Conditions Contraindication)
      // a) Viêm loét dạ dày - tá tràng
      const hasStomachUlcer = chronicConditions.some((c) => c.includes("da day") || c.includes("loet") || c.includes("tieu hoa") || c.includes("stomach"));
      if (hasStomachUlcer && isNsaidClass) {
        conflicts.push({
          medicineName: item.name,
          activeIngredient: item.activeIngredient || "NSAID",
          conflictType: "CONTRAINDICATION_CHRONIC",
          severity: "HIGH",
          reason: "Chống chỉ định với tiền sử Viêm loét dạ dày - tá tràng",
          clinicalExplanation: `Thuốc kháng viêm "${item.name}" ức chế tổng hợp Prostaglandin bảo vệ niêm mạc dạ dày, gây tăng tiết acid, nguy cơ tái phát loét, xuất huyết tiêu hóa ồ ạt hoặc thủng dạ dày!`,
          suggestedAction: "Ưu tiên thay thế bằng Paracetamol hoặc bổ sung thuốc bảo vệ dạ dày PPI nếu bắt buộc.",
          safeAlternatives: [
            {
              name: "Paracetamol 500mg",
              activeIngredient: "Paracetamol",
              indication: "Hạ sốt, giảm đau nhẹ đến vừa",
              reason: "Êm dịu với dạ dày, không gây kích ứng niêm mạc đường tiêu hóa.",
            },
          ],
        });
      }

      // b) Tăng huyết áp
      const hasHypertension = chronicConditions.some((c) => c.includes("huyet ap") || c.includes("hypertension") || c.includes("tim mach"));
      const isDecongestant =
        ingredientNorm.includes("pseudoephedrine") ||
        ingredientNorm.includes("phenylephrine") ||
        ingredientNorm.includes("ephedrine") ||
        medNameNorm.includes("decolgen") ||
        medNameNorm.includes("tiffy");

      if (hasHypertension && isDecongestant) {
        conflicts.push({
          medicineName: item.name,
          activeIngredient: item.activeIngredient || "Pseudoephedrine / Phenylephrine",
          conflictType: "CONTRAINDICATION_CHRONIC",
          severity: "HIGH",
          reason: "Chống chỉ định thuốc co mạch với bệnh nhân Tăng huyết áp",
          clinicalExplanation: `Thuốc "${item.name}" có chứa thành phần cường giao cảm gây co mạch ngoại biên toàn thân, dẫn đến bộc phát cơn tăng huyết áp kịch phát và tai biến mạch máu não.`,
          suggestedAction: "Đổi sang thuốc xịt mũi nước muối biển sâu hoặc kháng Histamin thế hệ mới không co mạch.",
          safeAlternatives: [
            {
              name: "Xịt mũi nước biển sâu Xisat 75ml",
              activeIngredient: "Nước biển tự nhiên chứa khoáng chất",
              indication: "Vệ sinh mũi, thông thoáng đường thở tự nhiên",
              reason: "Tác động vật lý tại chỗ, hoàn toàn không gây tăng huyết áp toàn thân.",
            },
            {
              name: "Loratadine 10mg",
              activeIngredient: "Loratadine",
              indication: "Giảm nghẹt mũi, viêm mũi dị ứng",
              reason: "Kháng histamin H1 thế hệ 2 không gây co mạch kích thích tim.",
            },
          ],
        });
      }

      // c) Hen suyễn
      const hasAsthma = chronicConditions.some((c) => c.includes("hen") || c.includes("asthma") || c.includes("phe quan"));
      if (hasAsthma && (isNsaidClass || ingredientNorm.includes("aspirin"))) {
        conflicts.push({
          medicineName: item.name,
          activeIngredient: item.activeIngredient || "NSAID / Aspirin",
          conflictType: "CONTRAINDICATION_CHRONIC",
          severity: "CRITICAL",
          reason: "Hội chứng hen nhạy cảm với Aspirin / NSAID (AERD)",
          clinicalExplanation: `Bệnh nhân hen suyễn có nguy cơ khởi phát cơn hen phế quản ác tính dữ dội (Aspirin-Exacerbated Respiratory Disease) đe dọa tính mạng khi dùng "${item.name}".`,
          suggestedAction: "Dừng ngay NSAID. Dùng Paracetamol liều vừa phải hoặc xịt Salbutamol giãn phế quản.",
          safeAlternatives: [
            {
              name: "Paracetamol 500mg",
              activeIngredient: "Paracetamol",
              indication: "Giảm đau, hạ sốt",
              reason: "Không kích thích phản ứng leukotriene ở phế quản.",
            },
          ],
        });
      }

      // d) Suy gan nặng
      const hasLiverFailure = chronicConditions.some((c) => c.includes("gan") || c.includes("liver") || c.includes("men gan"));
      const isHighDoseParacetamol = ingredientNorm.includes("paracetamol") || medNameNorm.includes("panadol extra") || medNameNorm.includes("efferalgan codein");
      if (hasLiverFailure && isHighDoseParacetamol) {
        conflicts.push({
          medicineName: item.name,
          activeIngredient: item.activeIngredient || "Paracetamol",
          conflictType: "CONTRAINDICATION_CHRONIC",
          severity: "CRITICAL",
          reason: "Nguy cơ độc tính cấp tính cho tế bào gan",
          clinicalExplanation: `Paracetamol chuyển hóa qua gan thành NAPQI độc hại. Bệnh nhân có tiền sử bệnh gan dễ bị cạn kiệt Glutathione, dẫn đến hoại tử tế bào gan và hôn mê gan cấp tính.`,
          suggestedAction: "Giảm liều Paracetamol tối đa < 2g/ngày hoặc thay bằng phương pháp vật lý/thảo dược.",
          safeAlternatives: [
            {
              name: "Miếng dán hạ sốt / Hạ nhiệt vật lý",
              activeIngredient: "Hydrogel làm mát",
              indication: "Hạ sốt hỗ trợ",
              reason: "Tác dụng ngoài da, không qua chuyển hóa tại gan.",
            },
          ],
        });
      }

      // e) Phụ nữ có thai hoặc đang cho con bú
      const isPregnant = chronicConditions.some((c) => c.includes("thai") || c.includes("mang bau") || c.includes("cho con bu") || c.includes("pregnant"));
      const isTeratogenic =
        ingredientNorm.includes("ciprofloxacin") ||
        ingredientNorm.includes("levofloxacin") ||
        ingredientNorm.includes("doxycycline") ||
        ingredientNorm.includes("tetracycline") ||
        ingredientNorm.includes("isotretinoin") ||
        ingredientNorm.includes("warfarin") ||
        itemContraNorm.includes("phu nu co thai") ||
        itemContraNorm.includes("mang thai");

      if (isPregnant && isTeratogenic) {
        conflicts.push({
          medicineName: item.name,
          activeIngredient: item.activeIngredient || "Quinolone / Doxycycline",
          conflictType: "CONTRAINDICATION_CHRONIC",
          severity: "CRITICAL",
          reason: "CHỐNG CHỈ ĐỊNH TUYỆT ĐỐI CHO PHỤ NỮ MANG THAI",
          clinicalExplanation: `Thuốc "${item.name}" có thể gây quái thai, tổn thương sụn khớp thai nhi (Quinolone) hoặc làm hỏng men răng và chậm phát triển xương (Tetracycline).`,
          suggestedAction: "Dược sĩ tuyệt đối không cấp phát. Đổi sang kháng sinh an toàn nhóm B (Amoxicillin / Cephalosporin).",
          safeAlternatives: [
            {
              name: "Amoxicillin 500mg",
              activeIngredient: "Amoxicillin",
              indication: "Nhiễm khuẩn hô hấp, tai mũi họng",
              reason: "Xếp loại an toàn FDA Category B cho phụ nữ có thai.",
            },
          ],
        });
      }
    }

    const hasConflict = conflicts.length > 0;
    const isCritical = conflicts.some((c) => c.severity === "CRITICAL");
    const isHigh = conflicts.some((c) => c.severity === "HIGH");
    const overallSeverity = isCritical ? "CRITICAL" : isHigh ? "HIGH" : hasConflict ? "MODERATE" : "SAFE";

    // Tổng hợp danh sách thuốc thay thế an toàn
    const allSafeAlternatives: any[] = [];
    conflicts.forEach((c) => {
      c.safeAlternatives.forEach((sa) => {
        if (!allSafeAlternatives.some((ex) => ex.name === sa.name)) {
          allSafeAlternatives.push(sa);
        }
      });
    });

    return {
      hasConflict,
      severity: overallSeverity,
      conflicts,
      safeAlternatives: allSafeAlternatives,
      message: hasConflict
        ? `Phát hiện ${conflicts.length} xung đột dị ứng và chống chỉ định y khoa nghiêm trọng với giỏ hàng!`
        : "Kiểm tra lâm sàng hoàn tất: Giỏ hàng an toàn với tiền sử dị ứng và bệnh lý của bệnh nhân.",
    };
  }
}

