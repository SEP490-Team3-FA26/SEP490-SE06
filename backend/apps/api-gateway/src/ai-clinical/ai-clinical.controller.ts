import {
  Controller,
  Get,
  Post,
  Put,
  Param,
  Query,
  Body,
  UploadedFile,
  UploadedFiles,
  UseInterceptors,
  UseGuards,
  Req,
  HttpException,
  HttpStatus,
} from '@nestjs/common';
import { FileInterceptor, FilesInterceptor } from '@nestjs/platform-express';
import { ApiTags, ApiOperation, ApiConsumes, ApiBearerAuth } from '@nestjs/swagger';
import { JwtAuthGuard } from '../guards/jwt-auth.guard';
import { RolesGuard } from '../guards/roles.guard';
import { Roles } from '../decorators/roles.decorator';
import { AiClinicalService } from './ai-clinical.service';

const ALLOWED_IMAGE_TYPES = ['image/jpeg', 'image/jpg', 'image/png', 'image/webp'];
const MAX_IMAGE_SIZE = 10 * 1024 * 1024; // 10MB

const ALLOWED_AUDIO_TYPES = [
  'audio/webm',
  'audio/ogg',
  'audio/wav',
  'audio/wave',
  'audio/x-wav',
  'audio/mp4',
  'audio/mpeg',
  'audio/mp3',
  'audio/x-m4a',
  'video/webm', // MediaRecorder in Chromium browsers often records webm as video/webm
];
const MAX_AUDIO_SIZE = 25 * 1024 * 1024; // 25MB

@ApiTags('🤖 AI Clinical Services (UC-69 & UC-70)')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles('pharmacist', 'admin')
@Controller('api/ai')
export class AiClinicalController {
  constructor(private readonly aiClinicalService: AiClinicalService) {}

  // =========================================================================
  // UC-69: OCR PRESCRIPTION SCANNING & AUDIT HISTORY
  // =========================================================================

  @Post('scan-prescription')
  @ApiConsumes('multipart/form-data')
  @ApiOperation({ summary: 'Scan prescription images using AI Vision and persist OCR audit log' })
  @UseInterceptors(FilesInterceptor('images', 5))
  async scanPrescription(
    @UploadedFiles() files: Express.Multer.File[],
    @Body('branch_id') branchId?: string,
    @Req() req?: any,
  ) {
    if (!files || files.length === 0) {
      throw new HttpException('Vui lòng tải lên ít nhất 1 ảnh đơn thuốc', HttpStatus.BAD_REQUEST);
    }

    for (const f of files) {
      if (!ALLOWED_IMAGE_TYPES.includes(f.mimetype)) {
        throw new HttpException(
          `Định dạng file không hợp lệ (${f.originalname}). Chỉ chấp nhận JPEG, PNG, WEBP.`,
          HttpStatus.BAD_REQUEST,
        );
      }
      if (f.size > MAX_IMAGE_SIZE) {
        throw new HttpException(
          `Dung lượng ảnh vượt quá giới hạn 10MB (${f.originalname}).`,
          HttpStatus.BAD_REQUEST,
        );
      }
    }

    const branch = branchId || req?.user?.branchId || 'BR-001';
    return this.aiClinicalService.processOcrScan(files, branch, req?.user);
  }

  @Get('ocr-history')
  @ApiOperation({ summary: 'Query historical prescription OCR scans and pharmacist modifications' })
  async getOcrHistory(
    @Query('branchId') branchId?: string,
    @Query('status') status?: string,
    @Query('search') search?: string,
    @Query('page') page?: number,
    @Query('limit') limit?: number,
  ) {
    return this.aiClinicalService.getOcrHistory({
      branchId,
      status,
      search,
      page,
      limit,
    });
  }

  @Get('ocr-history/:scanId')
  @ApiOperation({ summary: 'Get specific OCR scan details by scanId' })
  async getOcrLogById(@Param('scanId') scanId: string) {
    return this.aiClinicalService.getOcrLogById(scanId);
  }

  @Put('ocr-history/:scanId/adjust')
  @ApiOperation({ summary: 'Save pharmacist adjustments to an OCR scanned prescription' })
  async saveOcrAdjustment(
    @Param('scanId') scanId: string,
    @Body() body: {
      pharmacistAdjustedItems: any[];
      adjustmentSummary?: string;
      pharmacistInfo?: any;
      auditCode?: string;
      orderCode?: number;
      status?: string;
    },
  ) {
    return this.aiClinicalService.saveOcrAdjustment(scanId, body);
  }

  // =========================================================================
  // UC-70: OFFLINE VOICE CONSULTATION & TRACEABILITY
  // =========================================================================

  @Post('voice-consult')
  @ApiConsumes('multipart/form-data')
  @ApiOperation({ summary: 'Record walk-in consultation voice, transcribe with AI, and recommend drugs' })
  @UseInterceptors(FileInterceptor('audio'))
  async recordVoiceConsultation(
    @UploadedFile() file: Express.Multer.File,
    @Body('branch_id') branchId?: string,
    @Req() req?: any,
  ) {
    if (!file) {
      throw new HttpException('Vui lòng cung cấp file ghi âm hội thoại', HttpStatus.BAD_REQUEST);
    }

    if (!ALLOWED_AUDIO_TYPES.includes(file.mimetype)) {
      throw new HttpException(
        `Định dạng âm thanh không hợp lệ (${file.mimetype}). Chỉ chấp nhận WEBM, OGG, WAV, MP3.`,
        HttpStatus.BAD_REQUEST,
      );
    }

    if (file.size > MAX_AUDIO_SIZE) {
      throw new HttpException(
        'Dung lượng file ghi âm vượt quá giới hạn 25MB.',
        HttpStatus.BAD_REQUEST,
      );
    }

    const branch = branchId || req?.user?.branchId || 'BR-001';
    return this.aiClinicalService.processVoiceConsultation(file, branch, req?.user);
  }

  @Get('consultations')
  @ApiOperation({ summary: 'Get list of past pharmacist voice consultations' })
  async getConsultations(
    @Query('branchId') branchId?: string,
    @Query('status') status?: string,
    @Query('search') search?: string,
    @Query('page') page?: number,
    @Query('limit') limit?: number,
  ) {
    return this.aiClinicalService.getConsultations({
      branchId,
      status,
      search,
      page,
      limit,
    });
  }

  @Get('consult-audio/:id')
  @ApiOperation({ summary: 'Get audio recording and consultation details by ID' })
  async getConsultationAudio(@Param('id') id: string) {
    return this.aiClinicalService.getConsultationById(id);
  }

  @Put('consultations/:id/confirm')
  @ApiOperation({ summary: 'Confirm pharmacist clinical decision, save agreement, and synchronize with order' })
  async confirmConsultationDecision(
    @Param('id') id: string,
    @Body() body: {
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
    return this.aiClinicalService.confirmConsultationDecision(id, body);
  }
}
