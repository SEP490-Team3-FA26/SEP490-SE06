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
          headers: {
            "X-Internal-Token":
              process.env.JWT_SECRET ||
              "wdp301-super-secret-key-change-in-production",
          },
          body: formData,
          signal: controller.signal,
        },
      ).catch(async () => {
        // Fallback for docker container naming if localhost fails
        const aiUrl = process.env.AI_SERVICE_URL || "http://ai-service:8000";
        return await fetch(`${aiUrl}/api/ai/scan-prescription-v2`, {
          method: "POST",
          headers: {
            "X-Internal-Token":
              process.env.JWT_SECRET ||
              "wdp301-super-secret-key-change-in-production",
          },
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
          headers: {
            "X-Internal-Token":
              process.env.JWT_SECRET ||
              "wdp301-super-secret-key-change-in-production",
          },
          body: formData,
        },
      ).catch(async () => {
        const aiUrl = process.env.AI_SERVICE_URL || "http://ai-service:8000";
        return await fetch(`${aiUrl}/api/ai/scan-prescription`, {
          method: "POST",
          headers: {
            "X-Internal-Token":
              process.env.JWT_SECRET ||
              "wdp301-super-secret-key-change-in-production",
          },
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
      ).catch(async () => {
        const aiUrl = process.env.AI_SERVICE_URL || "http://ai-service:8000";
        return await fetch(`${aiUrl}/api/ai/sample-prescriptions`);
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
          headers: {
            "Content-Type": "application/json",
            "X-Internal-Token":
              process.env.JWT_SECRET ||
              "wdp301-super-secret-key-change-in-production",
          },
          body: JSON.stringify({ filename }),
        },
      ).catch(async () => {
        const aiUrl = process.env.AI_SERVICE_URL || "http://ai-service:8000";
        return await fetch(`${aiUrl}/api/ai/scan-sample-prescription`, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            "X-Internal-Token":
              process.env.JWT_SECRET ||
              "wdp301-super-secret-key-change-in-production",
          },
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

  @Post("recommend")
  @UseGuards(OptionalJwtAuthGuard)
  @UseInterceptors(FileInterceptor("audio"))
  async recommendPrescription(
    @UploadedFile() file: Express.Multer.File,
    @Body("patient_id") patientId?: string,
    @Body("branch_id") branchId?: string,
    @Req() req?: any,
  ) {
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
        headers: {
          "X-Internal-Token":
            process.env.JWT_SECRET ||
            "wdp301-super-secret-key-change-in-production",
        },
        body: formData,
        signal: controller.signal,
      }).catch(async () => {
        const aiUrl = process.env.AI_SERVICE_URL || "http://ai-service:8000";
        return await fetch(`${aiUrl}/api/prescription`, {
          method: "POST",
          headers: {
            "X-Internal-Token":
              process.env.JWT_SECRET ||
              "wdp301-super-secret-key-change-in-production",
          },
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
  ) {
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
        headers: {
          "X-Internal-Token":
            process.env.JWT_SECRET ||
            "wdp301-super-secret-key-change-in-production",
        },
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
    @Req() req?: any,
  ) {
    if (!symptoms) {
      throw new HttpException(
        "Vui lòng cung cấp triệu chứng",
        HttpStatus.BAD_REQUEST,
      );
    }
    const resolvedBranchId =
      branchId || req?.user?.branchId || req?.user?.branch_id;
    const payload: any = { symptoms };
    if (resolvedBranchId) {
      payload.branch_id = resolvedBranchId;
    }
    try {
      const aiServiceHost = this.getAiServiceHost();
      const response = await fetch(`${aiServiceHost}/api/ai/symptom-consult`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(payload),
      }).catch(async () => {
        const aiUrl = process.env.AI_SERVICE_URL || "http://ai-service:8000";
        return await fetch(`${aiUrl}/api/ai/symptom-consult`, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
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
      throw new HttpException(
        error.message || "Lỗi kết nối hoặc xử lý từ AI Service",
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
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
      image_base64?: string;
    },
  ) {
    const hasMessage = Boolean(body?.message && body.message.trim());
    const hasImage = Boolean(body?.image_base64 && body.image_base64.trim());

    if (!hasMessage && !hasImage) {
      throw new HttpException(
        "Vui lòng nhập nội dung tin nhắn hoặc gửi hình ảnh cần tư vấn",
        HttpStatus.BAD_REQUEST,
      );
    }

    try {
      // Data minimization: Không gửi PII (họ tên, email, sđt) sang AI service
      const sanitizedPayload = {
        message: body.message ? body.message.trim() : "",
        history: Array.isArray(body.history) ? body.history.slice(-10) : [],
        age_group: body.age_group || null,
        gender: body.gender || null,
        allergies: Array.isArray(body.allergies) ? body.allergies : [],
        image_base64: hasImage ? body.image_base64 : null,
      };

      const aiServiceHost = this.getAiServiceHost();
      const response = await fetch(`${aiServiceHost}/api/ai/chat`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(sanitizedPayload),
      }).catch(async () => {
        const aiUrl = process.env.AI_SERVICE_URL || "http://ai-service:8000";
        return await fetch(`${aiUrl}/api/ai/chat`, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
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
      const response = await fetch(`${aiServiceHost}/api/ai/chat/sessions?user_id=${userId}`);
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
        headers: { "Content-Type": "application/json" },
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

