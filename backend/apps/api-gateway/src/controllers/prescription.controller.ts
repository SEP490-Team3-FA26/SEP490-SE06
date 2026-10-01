import {
  Controller,
  Get,
  Post,
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

  @Post("symptom-consult")
  @UseGuards(OptionalJwtAuthGuard)
  async textConsult(@Body("symptoms") symptoms: string) {
    if (!symptoms) {
      throw new HttpException(
        "Vui lòng cung cấp triệu chứng",
        HttpStatus.BAD_REQUEST,
      );
    }
    try {
      const aiServiceHost = this.getAiServiceHost();
      const response = await fetch(`${aiServiceHost}/api/ai/symptom-consult`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ symptoms }),
      }).catch(async () => {
        const aiUrl = process.env.AI_SERVICE_URL || "http://ai-service:8000";
        return await fetch(`${aiUrl}/api/ai/symptom-consult`, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({ symptoms }),
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
      message: string;
      history?: Array<{ role: string; content: string }>;
      age_group?: string;
      gender?: string;
      allergies?: string[];
    },
  ) {
    if (!body || !body.message || !body.message.trim()) {
      throw new HttpException(
        "Vui lòng cung cấp nội dung tin nhắn tư vấn",
        HttpStatus.BAD_REQUEST,
      );
    }

    try {
      // Data minimization: Không gửi PII (họ tên, email, sđt) sang AI service
      const sanitizedPayload = {
        message: body.message.trim(),
        history: Array.isArray(body.history) ? body.history.slice(-10) : [],
        age_group: body.age_group || null,
        gender: body.gender || null,
        allergies: Array.isArray(body.allergies) ? body.allergies : [],
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
      throw new HttpException(
        error.message || "Lỗi kết nối hoặc xử lý từ AI Chat Service",
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
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
}
