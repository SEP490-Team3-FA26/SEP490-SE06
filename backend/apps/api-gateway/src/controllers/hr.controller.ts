import {
  Controller,
  Get,
  Post,
  Put,
  Patch,
  Delete,
  Param,
  Body,
  UseGuards,
  Inject,
  OnModuleInit,
  Query,
  Request,
  UseInterceptors,
  UploadedFile,
  BadRequestException,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { ClientKafka } from '@nestjs/microservices';
import { ApiTags, ApiBearerAuth, ApiOperation, ApiConsumes } from '@nestjs/swagger';
import { JwtAuthGuard } from '../guards/jwt-auth.guard';
import { RolesGuard } from '../guards/roles.guard';
import { Roles } from '../decorators/roles.decorator';
import { sendKafkaMessage, subscribeToKafkaTopics } from '../common/kafka.helper';
import { CloudinaryStorageService } from '../storage/cloudinary-storage.service';
import * as fs from 'fs';
import * as path from 'path';
import { randomUUID } from 'crypto';

@ApiTags('🏢 HR Management')
@Controller('api/hr')
@UseGuards(JwtAuthGuard, RolesGuard)
@ApiBearerAuth()
export class HrController implements OnModuleInit {
  constructor(
    @Inject('USER_SERVICE') private readonly kafkaClient: ClientKafka,
    private readonly cloudinaryStorageService: CloudinaryStorageService,
  ) {}

  async onModuleInit() {
    await subscribeToKafkaTopics(this.kafkaClient, [
      'hr.shift.list',
      'hr.shift.create',
      'hr.shift.update',
      'hr.shift.toggle',
      'hr.schedule.get_week',
      'hr.schedule.upsert',
      'hr.schedule.publish',
      'hr.schedule.my_week',
      'hr.swap.list',
      'hr.swap.my_list',
      'hr.swap.create',
      'hr.swap.target_respond',
      'hr.swap.manager_respond',
      'hr.notification.list',
      'hr.notification.mark_read',
      'hr.notification.unread_count',
      'user.admin.employee.list',
      'hr.certificate.submit',
      'hr.certificate.my_list',
      'hr.certificate.update',
      'hr.certificate.delete',
      'hr.certificate.branch_list',
      'hr.certificate.approve',
      'hr.certificate.reject',
      'hr.certificate.branch_summary',
    ]);
  }

  // --- HR: WORK SHIFT ---
  @Get('shifts')
  @Roles('branch', 'pharmacist', 'admin')
  @ApiOperation({ summary: 'Lấy danh sách ca làm việc của chi nhánh' })
  async listShifts(@Request() req) {
    return await sendKafkaMessage(this.kafkaClient, 'hr.shift.list', { branchId: req.user.branchId });
  }

  @Post('shifts')
  @Roles('branch', 'admin')
  @ApiOperation({ summary: 'Tạo ca làm việc' })
  async createShift(@Request() req, @Body() data: any) {
    return await sendKafkaMessage(this.kafkaClient, 'hr.shift.create', { branchId: req.user.branchId, ...data });
  }

  @Patch('shifts/:id')
  @Roles('branch', 'admin')
  @ApiOperation({ summary: 'Sửa ca làm việc' })
  async updateShift(@Request() req, @Param('id') shiftId: string, @Body() data: any) {
    return await sendKafkaMessage(this.kafkaClient, 'hr.shift.update', { shiftId, branchId: req.user.branchId, ...data });
  }

  @Patch('shifts/:id/toggle')
  @Roles('branch', 'admin')
  @ApiOperation({ summary: 'Kích hoạt / vô hiệu hóa ca' })
  async toggleShift(@Request() req, @Param('id') shiftId: string) {
    return await sendKafkaMessage(this.kafkaClient, 'hr.shift.toggle', { shiftId, branchId: req.user.branchId });
  }

  // --- HR: WORK SCHEDULE ---
  @Get('schedules/week')
  @Roles('branch', 'admin')
  @ApiOperation({ summary: 'Lấy lịch một tuần' })
  async getWeekSchedule(@Request() req, @Query('weekStart') weekStart: string) {
    return await sendKafkaMessage(this.kafkaClient, 'hr.schedule.get_week', { branchId: req.user.branchId, weekStart });
  }

  @Post('schedules')
  @Roles('branch', 'admin')
  @ApiOperation({ summary: 'Tạo / cập nhật lịch tuần (draft)' })
  async upsertSchedule(@Request() req, @Body() data: any) {
    return await sendKafkaMessage(this.kafkaClient, 'hr.schedule.upsert', { 
      branchId: req.user.branchId, 
      managerId: req.user.sub, 
      ...data 
    });
  }

  @Post('schedules/publish')
  @Roles('branch', 'admin')
  @ApiOperation({ summary: 'Publish lịch tuần' })
  async publishSchedule(@Request() req, @Body() data: { weekStart: string }) {
    return await sendKafkaMessage(this.kafkaClient, 'hr.schedule.publish', { 
      branchId: req.user.branchId, 
      managerId: req.user.sub, 
      weekStart: data.weekStart 
    });
  }

  @Get('schedules/my-week')
  @Roles('pharmacist', 'branch', 'admin')
  @ApiOperation({ summary: 'Xem lịch cá nhân tuần này' })
  async getMyWeekSchedule(@Request() req, @Query('weekStart') weekStart: string) {
    return await sendKafkaMessage(this.kafkaClient, 'hr.schedule.my_week', { 
      employeeId: req.user.sub, 
      branchId: req.user.branchId, 
      weekStart 
    });
  }

  // --- HR: SHIFT SWAP ---
  @Get('swaps')
  @Roles('branch')
  @ApiOperation({ summary: 'Xem tất cả yêu cầu đổi ca' })
  async listSwaps(@Request() req, @Query('status') status?: string) {
    return await sendKafkaMessage(this.kafkaClient, 'hr.swap.list', { branchId: req.user.branchId, status });
  }

  @Get('swaps/mine')
  @Roles('pharmacist')
  @ApiOperation({ summary: 'Xem yêu cầu đổi ca của tôi' })
  async listMySwaps(@Request() req) {
    return await sendKafkaMessage(this.kafkaClient, 'hr.swap.my_list', { userId: req.user.sub });
  }

  @Post('swaps')
  @Roles('pharmacist')
  @ApiOperation({ summary: 'Tạo yêu cầu đổi ca' })
  async createSwap(@Request() req, @Body() data: any) {
    return await sendKafkaMessage(this.kafkaClient, 'hr.swap.create', { 
      ...data,
      requesterId: req.user.sub,
      requesterName: req.user.fullName,
      branchId: req.user.branchId 
    });
  }

  @Patch('swaps/:id/target-respond')
  @Roles('pharmacist')
  @ApiOperation({ summary: 'Phản hồi yêu cầu đổi ca (Target)' })
  async targetRespond(@Request() req, @Param('id') swapId: string, @Body() data: { response: string, rejectReason?: string }) {
    return await sendKafkaMessage(this.kafkaClient, 'hr.swap.target_respond', { 
      swapId, 
      targetId: req.user.sub, 
      response: data.response, 
      rejectReason: data.rejectReason 
    });
  }

  @Patch('swaps/:id/manager-respond')
  @Roles('branch')
  @ApiOperation({ summary: 'Duyệt yêu cầu đổi ca (Manager)' })
  async managerRespond(@Request() req, @Param('id') swapId: string, @Body() data: { response: string, rejectReason?: string }) {
    return await sendKafkaMessage(this.kafkaClient, 'hr.swap.manager_respond', { 
      swapId, 
      managerId: req.user.sub, 
      response: data.response, 
      rejectReason: data.rejectReason 
    });
  }

  // --- HR: NOTIFICATION ---
  @Get('notifications')
  @Roles('branch', 'pharmacist', 'warehouse', 'admin')
  @ApiOperation({ summary: 'Lấy danh sách thông báo' })
  async listNotifications(@Request() req, @Query('limit') limit?: number, @Query('skip') skip?: number) {
    return await sendKafkaMessage(this.kafkaClient, 'hr.notification.list', { 
      userId: req.user.sub, 
      limit: limit ? Number(limit) : undefined, 
      skip: skip ? Number(skip) : undefined 
    });
  }

  @Patch('notifications/mark-read')
  @Roles('branch', 'pharmacist', 'warehouse', 'admin')
  @ApiOperation({ summary: 'Đánh dấu đã đọc' })
  async markRead(@Request() req, @Body() data: { notificationId?: string }) {
    return await sendKafkaMessage(this.kafkaClient, 'hr.notification.mark_read', { 
      userId: req.user.sub, 
      notificationId: data.notificationId 
    });
  }

  @Get('notifications/unread-count')
  @Roles('branch', 'pharmacist', 'warehouse', 'admin')
  @ApiOperation({ summary: 'Lấy số lượng thông báo chưa đọc' })
  async unreadCount(@Request() req) {
    return await sendKafkaMessage(this.kafkaClient, 'hr.notification.unread_count', { userId: req.user.sub });
  }

  @Get('colleagues')
  @Roles('branch', 'pharmacist', 'admin')
  @ApiOperation({ summary: 'Lấy danh sách nhân viên/đồng nghiệp chi nhánh để đổi ca' })
  async getColleagues(@Request() req) {
    return await sendKafkaMessage(this.kafkaClient, 'user.admin.employee.list', { branchId: req.user.branchId });
  }

  // --- HR: CERTIFICATES & CCHN MANAGEMENT ---

  @Post('certificates/upload')
  @Roles('branch', 'pharmacist', 'warehouse', 'admin')
  @UseInterceptors(FileInterceptor('file'))
  @ApiOperation({ summary: 'Tải lên hình ảnh bằng cấp / CCHN' })
  async uploadCertificateImage(
    @Request() req,
    @UploadedFile() file: Express.Multer.File,
    @Body() body?: { base64?: string; filename?: string; side?: 'front' | 'back' },
  ) {
    const userId = req.user?.sub || req.user?.id || 'general';
    const branchId = req.user?.branchId || 'general';
    const side = (body?.side || req.query?.side || 'front') as 'front' | 'back';

    // Trường hợp 1: Tải lên qua Multipart File
    if (file) {
      const allowedMimes = ['image/jpeg', 'image/png', 'image/webp', 'image/jpg', 'application/pdf'];
      if (!allowedMimes.includes(file.mimetype)) {
        throw new BadRequestException('Chỉ chấp nhận file ảnh JPEG, PNG, WebP hoặc PDF');
      }
      return await this.cloudinaryStorageService.uploadCertificateImage({
        buffer: file.buffer,
        filename: file.originalname,
        mimeType: file.mimetype,
        userId,
        branchId,
        side,
      });
    }

    // Trường hợp 2: Tải lên qua Base64 string
    if (body?.base64) {
      return await this.cloudinaryStorageService.uploadCertificateImage({
        base64: body.base64,
        filename: body.filename,
        userId,
        branchId,
        side,
      });
    }

    throw new BadRequestException('Vui lòng cung cấp file ảnh hoặc chuỗi base64');
  }

  @Post('certificates')
  @Roles('branch', 'pharmacist', 'warehouse', 'admin')
  @ApiOperation({ summary: 'Nhân viên nộp hồ sơ văn bằng / CCHN mới' })
  async submitCertificate(@Request() req, @Body() data: any) {
    return await sendKafkaMessage(this.kafkaClient, 'hr.certificate.submit', {
      userId: req.user.sub,
      branchId: req.user.branchId,
      ...data,
    });
  }

  @Get('certificates/mine')
  @Roles('branch', 'pharmacist', 'warehouse', 'admin')
  @ApiOperation({ summary: 'Lấy danh sách văn bằng / CCHN của chính mình' })
  async getMyCertificates(@Request() req) {
    return await sendKafkaMessage(this.kafkaClient, 'hr.certificate.my_list', {
      userId: req.user.sub,
    });
  }

  @Put('certificates/:id')
  @Roles('branch', 'pharmacist', 'warehouse', 'admin')
  @ApiOperation({ summary: 'Chỉnh sửa lại hồ sơ văn bằng khi bị từ chối' })
  async updateCertificate(@Request() req, @Param('id') id: string, @Body() data: any) {
    return await sendKafkaMessage(this.kafkaClient, 'hr.certificate.update', {
      userId: req.user.sub,
      certificateId: id,
      ...data,
    });
  }

  @Delete('certificates/:id')
  @Roles('branch', 'pharmacist', 'warehouse', 'admin')
  @ApiOperation({ summary: 'Xóa hồ sơ văn bằng' })
  async deleteCertificate(@Request() req, @Param('id') id: string) {
    return await sendKafkaMessage(this.kafkaClient, 'hr.certificate.delete', {
      userId: req.user.sub,
      certificateId: id,
    });
  }

  @Get('certificates/branch')
  @Roles('branch', 'admin')
  @ApiOperation({ summary: 'Quản lý xem danh sách văn bằng nhân viên trong chi nhánh' })
  async listBranchCertificates(@Request() req, @Query('status') status?: string) {
    return await sendKafkaMessage(this.kafkaClient, 'hr.certificate.branch_list', {
      branchId: req.user.branchId,
      status,
    });
  }

  @Get('certificates/branch/summary')
  @Roles('branch', 'admin')
  @ApiOperation({ summary: 'Thống kê tổng quan bằng cấp tại chi nhánh' })
  async getBranchCertificateSummary(@Request() req) {
    return await sendKafkaMessage(this.kafkaClient, 'hr.certificate.branch_summary', {
      branchId: req.user.branchId,
    });
  }

  @Patch('certificates/:id/approve')
  @Roles('branch', 'admin')
  @ApiOperation({ summary: 'Quản lý phê duyệt hồ sơ văn bằng và gán phụ cấp' })
  async approveCertificate(
    @Request() req,
    @Param('id') id: string,
    @Body() body: { monthlyAllowance?: number; isBranchPIC?: boolean },
  ) {
    return await sendKafkaMessage(this.kafkaClient, 'hr.certificate.approve', {
      managerId: req.user.sub,
      certificateId: id,
      monthlyAllowance: body.monthlyAllowance,
      isBranchPIC: body.isBranchPIC,
    });
  }

  @Patch('certificates/:id/reject')
  @Roles('branch', 'admin')
  @ApiOperation({ summary: 'Quản lý từ chối hồ sơ văn bằng kèm lý do' })
  async rejectCertificate(
    @Request() req,
    @Param('id') id: string,
    @Body() body: { rejectionReason: string },
  ) {
    return await sendKafkaMessage(this.kafkaClient, 'hr.certificate.reject', {
      managerId: req.user.sub,
      certificateId: id,
      rejectionReason: body.rejectionReason,
    });
  }
}
