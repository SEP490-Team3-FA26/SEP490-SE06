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
import { ApiTags, ApiOperation, ApiConsumes } from '@nestjs/swagger';
import { OptionalJwtAuthGuard } from '../guards/optional-jwt-auth.guard';
import { AiClinicalService } from './ai-clinical.service';

@ApiTags('🤖 AI Clinical Services (UC-69 & UC-70)')
@Controller('api/ai')
export class AiClinicalController {
  constructor(private readonly aiClinicalService: AiClinicalService) {}

  // =========================================================================
  // UC-69: OCR PRESCRIPTION SCANNING & AUDIT HISTORY
  // =========================================================================

  @Post('scan-prescription')
  @UseGuards(OptionalJwtAuthGuard)
  @ApiConsumes('multipart/form-data')
  @ApiOperation({ summary: 'Scan prescription images using AI Vision and persist OCR audit log' })
  @UseInterceptors(FilesInterceptor('images', 5))
  async scanPrescription(
    @UploadedFiles() files: Express.Multer.File[],
    @Body('branch_id') branchId?: string,
    @Req() req?: any,
  ) {
    if (!files || files.length === 0) {
      throw new HttpException('Please provide at least 1 prescription image', HttpStatus.BAD_REQUEST);
    }
    const branch = branchId || req?.user?.branchId || 'BR-001';
    return this.aiClinicalService.processOcrScan(files, branch, req?.user);
  }

  @Get('ocr-history')
  @UseGuards(OptionalJwtAuthGuard)
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
  @UseGuards(OptionalJwtAuthGuard)
  @ApiOperation({ summary: 'Get specific OCR scan details by scanId' })
  async getOcrLogById(@Param('scanId') scanId: string) {
    return this.aiClinicalService.getOcrLogById(scanId);
  }

  @Put('ocr-history/:scanId/adjust')
  @UseGuards(OptionalJwtAuthGuard)
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
  @UseGuards(OptionalJwtAuthGuard)
  @ApiConsumes('multipart/form-data')
  @ApiOperation({ summary: 'Record walk-in consultation voice, transcribe with AI, and recommend drugs' })
  @UseInterceptors(FileInterceptor('audio'))
  async recordVoiceConsultation(
    @UploadedFile() file: Express.Multer.File,
    @Body('branch_id') branchId?: string,
    @Req() req?: any,
  ) {
    if (!file) {
      throw new HttpException('Please provide an audio recording file', HttpStatus.BAD_REQUEST);
    }
    const branch = branchId || req?.user?.branchId || 'BR-001';
    return this.aiClinicalService.processVoiceConsultation(file, branch, req?.user);
  }

  @Get('consultations')
  @UseGuards(OptionalJwtAuthGuard)
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
  @UseGuards(OptionalJwtAuthGuard)
  @ApiOperation({ summary: 'Get audio recording and consultation details by ID' })
  async getConsultationAudio(@Param('id') id: string) {
    return this.aiClinicalService.getConsultationById(id);
  }

  @Put('consultations/:id/confirm')
  @UseGuards(OptionalJwtAuthGuard)
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
