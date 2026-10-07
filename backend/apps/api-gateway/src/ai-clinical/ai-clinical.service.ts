import {
  Injectable,
  Logger,
  NotFoundException,
  HttpException,
  HttpStatus,
} from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import * as fs from 'fs';
import * as path from 'path';
import { randomUUID } from 'crypto';
import { PrescriptionOcrLog } from './schemas/prescription-ocr-log.schema';
import { ConsultationAudioRecord } from './schemas/consultation-audio-record.schema';
import { S3StorageService } from '../storage/s3-storage.service';

@Injectable()
export class AiClinicalService {
  private readonly logger = new Logger(AiClinicalService.name);

  constructor(
    @InjectModel(PrescriptionOcrLog.name)
    private readonly ocrLogModel: Model<PrescriptionOcrLog>,
    @InjectModel(ConsultationAudioRecord.name)
    private readonly consultRecordModel: Model<ConsultationAudioRecord>,
    private readonly s3Storage: S3StorageService,
  ) {}

  private getAiServiceHost(): string {
    const configured = process.env.AI_SERVICE_URL;
    const isDocker = Boolean(
      process.env.KAFKA_BROKERS?.includes('kafka:') ||
      process.env.REDIS_HOST === 'redis',
    );
    if (isDocker) {
      if (
        configured &&
        !configured.includes('localhost') &&
        !configured.includes('127.0.0.1')
      ) {
        return configured;
      }
      return 'http://ai-service:8000';
    }
    return configured || 'http://localhost:8000';
  }

  /**
   * Save uploaded files to S3 Cloud Storage (with safe local fallback)
   */
  async saveUploadedFiles(
    files: Express.Multer.File[],
    subDir: 'ocr' | 'audio',
  ): Promise<string[]> {
    const savedUrls: string[] = [];
    for (const file of files) {
      try {
        const { key } = await this.s3Storage.uploadImage(file, `uploads/${subDir}`);
        const presigned = await this.s3Storage.getPresignedUrl(key, 86400 * 7);
        savedUrls.push(presigned);
      } catch (err: any) {
        this.logger.warn(`S3 upload fallback to local storage: ${err.message}`);
        const targetDir = path.join(process.cwd(), 'public', 'uploads', subDir);
        if (!fs.existsSync(targetDir)) {
          fs.mkdirSync(targetDir, { recursive: true });
        }
        const ext = (file.originalname?.split('.').pop() || 'jpg').toLowerCase();
        const fileName = `${Date.now()}_${randomUUID().substring(0, 8)}.${ext}`;
        const filePath = path.join(targetDir, fileName);
        fs.writeFileSync(filePath, file.buffer);
        savedUrls.push(`/public/uploads/${subDir}/${fileName}`);
      }
    }
    return savedUrls;
  }

  // =========================================================================
  // UC-69: OCR SCANNING & AUDIT HISTORY
  // =========================================================================

  async processOcrScan(
    files: Express.Multer.File[],
    branchId: string = 'BR-001',
    userContext?: any,
  ) {
    const imageUrls = await this.saveUploadedFiles(files, 'ocr');
    const scanId = `SCAN-${Date.now()}-${randomUUID().substring(0, 6).toUpperCase()}`;

    let aiResponseData: any = null;
    try {
      const formData = new FormData();
      for (const file of files) {
        const blob = new Blob([new Uint8Array(file.buffer)], {
          type: file.mimetype || 'image/jpeg',
        });
        formData.append('files', blob, file.originalname || 'prescription.jpg');
      }
      formData.append('branch_id', branchId);

      const aiServiceHost = this.getAiServiceHost();
      const response = await fetch(`${aiServiceHost}/api/ai/scan-prescription-v2`, {
        method: 'POST',
        headers: {
          'X-Internal-Token':
            process.env.JWT_SECRET || 'wdp301-super-secret-key-change-in-production',
        },
        body: formData,
      });

      if (response.ok) {
        aiResponseData = await response.json();
      } else {
        throw new Error(`AI service responded with status ${response.status}`);
      }
    } catch (err: any) {
      this.logger.error(`AI prescription scanning failed: ${err.message}`);
      throw new HttpException(
        'Dịch vụ AI chẩn đoán đơn thuốc hiện không khả dụng. Vui lòng kiểm tra lại kết nối.',
        HttpStatus.SERVICE_UNAVAILABLE,
      );
    }

    const rawExtractedItems = (aiResponseData.items || []).map((it: any) => {
      const sku = it.selected_sku || {};
      const ext = it.extracted || {};
      return {
        medicineId: sku.product_id || sku.id,
        name: sku.product_name || ext.raw_name || 'Dược phẩm',
        generic_name: ext.generic_name || sku.active_ingredient || '',
        strength: ext.strength || '',
        quantity: ext.quantity || 1,
        unit: sku.unit || ext.unit || 'Hộp',
        dosage: ext.usage_instruction || 'Theo chỉ định của bác sĩ',
        confidenceScore: ext.confidence || 0.95,
        matchedSku: sku,
      };
    });

    const ocrRecord = new this.ocrLogModel({
      scanId: aiResponseData.scan_id || scanId,
      branchId: branchId || 'BR-001',
      imageUrls,
      patient: aiResponseData.patient || {},
      doctor: aiResponseData.doctor || {},
      rawExtractedItems,
      pharmacistAdjustedItems: rawExtractedItems.map((r: any) => ({
        medicineId: r.medicineId,
        name: r.name,
        quantity: r.quantity,
        unit: r.unit,
        dosage: r.dosage,
        price: r.matchedSku?.retail_price || 50000,
        active_ingredient: r.generic_name,
      })),
      hasAdjustments: false,
      confidenceScore: 0.96,
      pharmacistInfo: {
        name: userContext?.fullName || 'Dược sĩ trực quầy',
        license: userContext?.license || 'CCHN-GPP/02849-HN',
        userId: userContext?.userId || userContext?.sub,
      },
      status: 'SCANNED',
    });

    await ocrRecord.save();

    return {
      ...aiResponseData,
      scan_id: ocrRecord.scanId,
      image_urls: imageUrls,
      saved_log_id: ocrRecord._id,
    };
  }

  async getOcrHistory(query: {
    branchId?: string;
    status?: string;
    search?: string;
    page?: number;
    limit?: number;
  }) {
    const filter: any = {};
    if (query.branchId && query.branchId !== 'ALL') {
      filter.branchId = query.branchId;
    }
    if (query.status && query.status !== 'ALL') {
      filter.status = query.status;
    }
    if (query.search) {
      const s = query.search.trim();
      filter.$or = [
        { scanId: { $regex: s, $options: 'i' } },
        { auditCode: { $regex: s, $options: 'i' } },
        { 'patient.name': { $regex: s, $options: 'i' } },
      ];
    }

    const page = Math.max(1, Number(query.page) || 1);
    const limit = Math.max(1, Math.min(100, Number(query.limit) || 20));
    const skip = (page - 1) * limit;

    const [data, total] = await Promise.all([
      this.ocrLogModel
        .find(filter)
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(limit)
        .lean()
        .exec(),
      this.ocrLogModel.countDocuments(filter).exec(),
    ]);

    return {
      success: true,
      data,
      pagination: {
        total,
        page,
        limit,
        totalPages: Math.ceil(total / limit),
      },
    };
  }

  async getOcrLogById(scanId: string) {
    const log = await this.ocrLogModel.findOne({ scanId }).lean().exec();
    if (!log) {
      throw new NotFoundException(`OCR scan ${scanId} not found`);
    }
    return { success: true, data: log };
  }

  async saveOcrAdjustment(
    scanId: string,
    body: {
      pharmacistAdjustedItems: any[];
      adjustmentSummary?: string;
      pharmacistInfo?: any;
      auditCode?: string;
      orderCode?: number;
      status?: string;
    },
  ) {
    const log = await this.ocrLogModel.findOne({ scanId });
    if (!log) {
      throw new NotFoundException(`OCR scan ${scanId} not found`);
    }

    log.pharmacistAdjustedItems = body.pharmacistAdjustedItems || log.pharmacistAdjustedItems;
    log.hasAdjustments = true;
    log.adjustmentSummary = body.adjustmentSummary || 'Dược sĩ đã hiệu chỉnh danh mục thuốc';
    log.auditCode = body.auditCode || `GPP-OCR-${Math.floor(100000 + Math.random() * 900000)}`;

    if (body.pharmacistInfo) {
      log.pharmacistInfo = {
        ...log.pharmacistInfo,
        ...body.pharmacistInfo,
        reviewedAt: new Date(),
      };
    }
    if (body.orderCode) {
      log.orderCode = body.orderCode;
      log.status = 'DISPENSED';
    } else {
      log.status = body.status || 'REVIEWED';
    }

    await log.save();

    return {
      success: true,
      message: 'OCR adjustment saved successfully',
      data: log,
    };
  }

  // =========================================================================
  // UC-70: OFFLINE VOICE CONSULTATION & TRACEABILITY
  // =========================================================================

  async processVoiceConsultation(
    audioFile: Express.Multer.File,
    branchId: string = 'BR-001',
    userContext?: any,
  ) {
    const savedAudioUrls = await this.saveUploadedFiles([audioFile], 'audio');
    const audioUrl = savedAudioUrls[0] || '';
    const consultationId = `CS-${Date.now()}-${randomUUID().substring(0, 6).toUpperCase()}`;

    let aiResponseData: any = null;
    try {
      const formData = new FormData();
      const blob = new Blob([new Uint8Array(audioFile.buffer)], {
        type: audioFile.mimetype || 'audio/webm',
      });
      formData.append('audio', blob, audioFile.originalname || 'audio.webm');
      formData.append('branch_id', branchId);

      const aiServiceHost = this.getAiServiceHost();
      const response = await fetch(`${aiServiceHost}/api/prescription`, {
        method: 'POST',
        headers: {
          'X-Internal-Token':
            process.env.JWT_SECRET || 'wdp301-super-secret-key-change-in-production',
        },
        body: formData,
      });

      if (response.ok) {
        aiResponseData = await response.json();
      } else {
        throw new Error(`AI voice service responded with status ${response.status}`);
      }
    } catch (err: any) {
      this.logger.error(`AI voice consultation failed: ${err.message}`);
      throw new HttpException(
        'Dịch vụ AI tư vấn giọng nói hiện không khả dụng. Vui lòng kiểm tra lại mic và đường truyền.',
        HttpStatus.SERVICE_UNAVAILABLE,
      );
    }

    const consultRecord = new this.consultRecordModel({
      consultationId,
      branchId,
      audioUrl,
      audioDuration: 15,
      transcription: aiResponseData.transcribed_text || 'Hội thoại tư vấn quầy offline',
      aiOriginalSuggestion: {
        diagnosis: aiResponseData.prescription?.diagnosis || 'Tư vấn triệu chứng quầy',
        recommended_drugs: aiResponseData.prescription?.recommended_drugs || [],
        warnings: aiResponseData.prescription?.warnings || [],
      },
      pharmacistFinalDecision: {
        selectedDrugs: (aiResponseData.prescription?.recommended_drugs || []).map((d: any) => ({
          name: d.name,
          active_ingredient: d.active_ingredient,
          dosage: d.dosage,
          quantity: 1,
          unit: 'Hộp',
          price: 50000,
        })),
        clinicalNotes: 'Dược sĩ đồng thuận tư vấn đơn thuốc AI ban đầu',
      },
      pharmacistAgreement: true,
      pharmacistInfo: {
        name: userContext?.fullName || 'Dược sĩ tư vấn',
        license: userContext?.license || 'CCHN-GPP/02849-HN',
        userId: userContext?.userId || userContext?.sub,
        confirmedAt: new Date(),
      },
      status: 'RECORDED',
    });

    await consultRecord.save();

    return {
      success: true,
      consultationId,
      audioUrl,
      aiSuggestion: consultRecord.aiOriginalSuggestion,
      inventoryStatus: aiResponseData.inventory_status || {},
      savedRecordId: consultRecord._id,
    };
  }

  async getConsultations(query: {
    branchId?: string;
    status?: string;
    search?: string;
    page?: number;
    limit?: number;
  }) {
    const filter: any = {};
    if (query.branchId && query.branchId !== 'ALL') {
      filter.branchId = query.branchId;
    }
    if (query.status && query.status !== 'ALL') {
      filter.status = query.status;
    }
    if (query.search) {
      const s = query.search.trim();
      filter.$or = [
        { consultationId: { $regex: s, $options: 'i' } },
        { auditCode: { $regex: s, $options: 'i' } },
        { transcription: { $regex: s, $options: 'i' } },
      ];
    }

    const page = Math.max(1, Number(query.page) || 1);
    const limit = Math.max(1, Math.min(100, Number(query.limit) || 20));
    const skip = (page - 1) * limit;

    const [data, total] = await Promise.all([
      this.consultRecordModel
        .find(filter)
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(limit)
        .lean()
        .exec(),
      this.consultRecordModel.countDocuments(filter).exec(),
    ]);

    return {
      success: true,
      data,
      pagination: {
        total,
        page,
        limit,
        totalPages: Math.ceil(total / limit),
      },
    };
  }

  async getConsultationById(id: string) {
    const record = await this.consultRecordModel
      .findOne({ consultationId: id })
      .lean()
      .exec();
    if (!record) {
      throw new NotFoundException(`Consultation record ${id} not found`);
    }
    return { success: true, data: record };
  }

  async confirmConsultationDecision(
    id: string,
    body: {
      pharmacistFinalDecision: {
        selectedDrugs?: any[];
        clinicalNotes?: string;
      };
      pharmacistAgreement: boolean;
      pharmacistInfo?: any;
      auditCode: string;
      orderCode?: number;
    },
  ) {
    const record = await this.consultRecordModel.findOne({ consultationId: id });
    if (!record) {
      throw new NotFoundException(`Consultation record ${id} not found`);
    }

    record.pharmacistFinalDecision =
      body.pharmacistFinalDecision || record.pharmacistFinalDecision;
    record.pharmacistAgreement = Boolean(body.pharmacistAgreement);
    record.auditCode =
      body.auditCode || `GPP-AI-${Math.floor(100000 + Math.random() * 900000)}`;

    if (body.pharmacistInfo) {
      record.pharmacistInfo = {
        ...record.pharmacistInfo,
        ...body.pharmacistInfo,
        confirmedAt: new Date(),
      };
    }
    if (body.orderCode) {
      record.orderCode = body.orderCode;
      record.status = 'ORDERED';
    } else {
      record.status = 'CONFIRMED';
    }

    await record.save();

    return {
      success: true,
      message: 'Pharmacist consultation decision confirmed and recorded',
      data: record,
    };
  }
}
