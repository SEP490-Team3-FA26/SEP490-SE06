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
      'hr.attendance.check_in',
      'hr.attendance.check_out',
      'hr.attendance.my_current_shift',
      'hr.attendance.verify_active_shift',
      'hr.attendance.branch_today',
      'hr.attendance.history',
      'hr.payroll.calculate',
      'hr.payroll.list',
      'hr.payroll.detail',
      'hr.payroll.adjust',
      'hr.payroll.submit',
      'hr.payroll.approve',
      'hr.payroll.my_payslip',
      'hr.leave.balance',
      'hr.leave.my_list',
      'hr.leave.branch_list',
      'hr.leave.create',
      'hr.leave.respond',
      'hr.leave.cancel',
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

  // --- HR: LEAVE MANAGEMENT ---
  @Get('leaves/balance')
  @Roles('pharmacist', 'branch', 'warehouse', 'admin')
  @ApiOperation({ summary: 'Lấy số dư ngày phép năm của tôi' })
  async getLeaveBalance(@Request() req) {
    return await sendKafkaMessage(this.kafkaClient, 'hr.leave.balance', { userId: req.user.sub });
  }

  @Get('leaves/mine')
  @Roles('pharmacist', 'branch', 'warehouse', 'admin')
  @ApiOperation({ summary: 'Lấy danh sách đơn xin nghỉ của tôi' })
  async getMyLeaves(@Request() req, @Query('status') status?: string) {
    return await sendKafkaMessage(this.kafkaClient, 'hr.leave.my_list', { userId: req.user.sub, status });
  }

  @Get('leaves/branch')
  @Roles('branch', 'admin')
  @ApiOperation({ summary: 'Lấy danh sách đơn xin nghỉ của toàn chi nhánh (Quản lý)' })
  async getBranchLeaves(@Request() req, @Query('status') status?: string) {
    return await sendKafkaMessage(this.kafkaClient, 'hr.leave.branch_list', { branchId: req.user.branchId, status });
  }

  @Post('leaves')
  @Roles('pharmacist', 'branch', 'warehouse', 'admin')
  @ApiOperation({ summary: 'Tạo đơn xin nghỉ ca' })
  async createLeave(@Request() req, @Body() data: any) {
    return await sendKafkaMessage(this.kafkaClient, 'hr.leave.create', {
      ...data,
      requesterId: req.user.sub,
      requesterName: req.user.fullName,
      requesterRole: req.user.role,
      branchId: req.user.branchId,
    });
  }

  @Patch('leaves/:id/respond')
  @Roles('branch', 'admin')
  @ApiOperation({ summary: 'Quản lý phê duyệt hoặc từ chối đơn xin nghỉ' })
  async respondLeave(
    @Request() req,
    @Param('id') leaveId: string,
    @Body() data: { action: 'approve' | 'reject'; managerNote?: string },
  ) {
    return await sendKafkaMessage(this.kafkaClient, 'hr.leave.respond', {
      leaveId,
      managerId: req.user.sub,
      managerName: req.user.fullName,
      managerRole: req.user.role,
      managerBranchId: req.user.branchId,
      action: data.action,
      managerNote: data.managerNote,
    });
  }

  @Patch('leaves/:id/cancel')
  @Roles('pharmacist', 'warehouse', 'branch', 'admin')
  @ApiOperation({ summary: 'Nhân viên hủy đơn xin nghỉ đang chờ duyệt' })
  async cancelLeave(@Request() req, @Param('id') leaveId: string, @Body() data: { cancelReason?: string }) {
    return await sendKafkaMessage(this.kafkaClient, 'hr.leave.cancel', {
      leaveId,
      userId: req.user.sub,
      cancelReason: data.cancelReason,
    });
  }

  @Post('leaves/upload-attachment')
  @Roles('branch', 'pharmacist', 'warehouse', 'admin')
  @UseInterceptors(FileInterceptor('file'))
  @ApiOperation({ summary: 'Tải lên tài liệu minh chứng xin nghỉ (giấy ốm, giấy ra viện)' })
  async uploadLeaveAttachment(
    @Request() req,
    @UploadedFile() file: Express.Multer.File,
    @Body() body?: { base64?: string; filename?: string },
  ) {
    const userId = req.user?.sub || req.user?.id || 'general';
    const branchId = req.user?.branchId || 'general';

    if (file) {
      const allowedMimes = ['image/jpeg', 'image/png', 'image/webp', 'image/jpg', 'application/pdf'];
      if (!allowedMimes.includes(file.mimetype)) {
        throw new BadRequestException('Chỉ chấp nhận file ảnh JPEG, PNG, WebP hoặc PDF');
      }
      return await this.cloudinaryStorageService.uploadImage({
        buffer: file.buffer,
        filename: file.originalname,
        mimeType: file.mimetype,
        category: 'leave-attachments',
        userId,
        branchId,
        side: 'leave',
      });
    }

    if (body?.base64) {
      return await this.cloudinaryStorageService.uploadImage({
        base64: body.base64,
        filename: body.filename,
        category: 'leave-attachments',
        userId,
        branchId,
        side: 'leave',
      });
    }

    throw new BadRequestException('Vui lòng cung cấp file đính kèm hoặc base64');
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

  // --- HR: ATTENDANCE & GPS CHECK-IN ---
  @Post('attendance/check-in')
  @Roles('branch', 'pharmacist', 'warehouse', 'admin')
  @ApiOperation({ summary: 'Nhân viên điểm danh vào ca bằng GPS Geofencing' })
  async attendanceCheckIn(@Request() req, @Body() data: { latitude: number; longitude: number; shiftId?: string; isMockLocation?: boolean; note?: string }) {
    return await sendKafkaMessage(this.kafkaClient, 'hr.attendance.check_in', {
      employeeId: req.user.sub,
      branchId: req.user.branchId,
      ...data,
    });
  }

  @Post('attendance/check-out')
  @Roles('branch', 'pharmacist', 'warehouse', 'admin')
  @ApiOperation({ summary: 'Nhân viên check-out kết thúc ca làm việc' })
  async attendanceCheckOut(@Request() req, @Body() data: { latitude?: number; longitude?: number; note?: string }) {
    return await sendKafkaMessage(this.kafkaClient, 'hr.attendance.check_out', {
      employeeId: req.user.sub,
      ...data,
    });
  }

  @Get('attendance/my-current-shift')
  @Roles('branch', 'pharmacist', 'warehouse', 'admin')
  @ApiOperation({ summary: 'Lấy trạng thái ca trực hiện tại và điểm danh của bản thân' })
  async getMyCurrentShift(@Request() req) {
    return await sendKafkaMessage(this.kafkaClient, 'hr.attendance.my_current_shift', {
      employeeId: req.user.sub,
      branchId: req.user.branchId,
    });
  }

  @Get('attendance/my-today')
  @Roles('branch', 'pharmacist', 'warehouse', 'admin')
  @ApiOperation({ summary: 'Alias lấy trạng thái điểm danh hôm nay của cá nhân (Dành cho Mobile App)' })
  async getMyTodayAttendance(@Request() req) {
    const shiftStatus: any = await sendKafkaMessage(this.kafkaClient, 'hr.attendance.my_current_shift', {
      employeeId: req.user.sub,
      branchId: req.user.branchId,
    });
    return shiftStatus?.attendance || shiftStatus;
  }

  @Get('attendance/history')
  @Roles('branch', 'pharmacist', 'warehouse', 'admin')
  @ApiOperation({ summary: 'Lấy lịch sử điểm danh của cá nhân nhân viên' })
  async getMyAttendanceHistory(@Request() req, @Query('startDate') startDate?: string, @Query('endDate') endDate?: string) {
    return await sendKafkaMessage(this.kafkaClient, 'hr.attendance.history', {
      employeeId: req.user.sub,
      startDate,
      endDate,
    });
  }

  @Get('attendance/today')
  @Roles('branch', 'admin', 'director')
  @ApiOperation({ summary: 'Quản lý xem danh sách điểm danh hôm nay của chi nhánh' })
  async getBranchTodayAttendance(@Request() req, @Query('date') date?: string) {
    return await sendKafkaMessage(this.kafkaClient, 'hr.attendance.branch_today', {
      branchId: req.user.branchId,
      date,
    });
  }

  // --- HR: PAYROLL MANAGEMENT ---
  @Post('payroll/calculate')
  @Roles('branch', 'admin', 'director')
  @ApiOperation({ summary: 'Tính toán dự thảo bảng lương tháng cho chi nhánh' })
  async calculateMonthlyPayroll(@Request() req, @Body() data: { month: number; year: number; branchId?: string; mealAllowanceRate?: number }) {
    // Nếu là Quản lý chi nhánh (role 'branch'), bắt buộc khóa chặt theo chi nhánh của mình (Chống IDOR/BOLA)
    const branchId = req.user.role === 'branch'
      ? req.user.branchId
      : (data.branchId || req.user.branchId || 'BR-001');

    return await sendKafkaMessage(this.kafkaClient, 'hr.payroll.calculate', {
      branchId,
      month: Number(data.month),
      year: Number(data.year),
      mealAllowanceRate: data.mealAllowanceRate ? Number(data.mealAllowanceRate) : 35000,
      managerId: req.user.sub,
      managerName: req.user.fullName,
      requesterBranchId: req.user.branchId,
      requesterRole: req.user.role,
    });
  }

  @Get('payroll')
  @Roles('branch', 'admin', 'director')
  @ApiOperation({ summary: 'Lấy danh sách bảng lương của chi nhánh' })
  async listPayrolls(@Request() req, @Query('year') year?: number, @Query('branchId') branchId?: string) {
    try {
      const targetBranch = req.user.role === 'branch' ? req.user.branchId : (branchId || req.user.branchId);
      return await sendKafkaMessage(this.kafkaClient, 'hr.payroll.list', {
        branchId: targetBranch,
        year: year ? Number(year) : undefined,
      });
    } catch (err: any) {
      // Khi microservice timeout hoac dang khoi dong lai, tra ve mang rong de UI hien thi trang thai rong an toan
      if (err?.name === 'TimeoutError' || err?.message?.includes('timeout') || err?.status === 504 || (err?.getStatus && err.getStatus() === 504)) {
        return [];
      }
      throw err;
    }
  }

  @Get('payroll/my-payslip')
  @Roles('branch', 'pharmacist', 'warehouse', 'admin')
  @ApiOperation({ summary: 'Nhân viên xem phiếu lương cá nhân của chính mình' })
  async getMyPayslip(@Request() req, @Query('month') month?: number, @Query('year') year?: number) {
    try {
      const employeeId = req.user?.sub || req.user?._id || req.user?.id;
      return await sendKafkaMessage(this.kafkaClient, 'hr.payroll.my_payslip', {
        employeeId,
        month: month ? Number(month) : undefined,
        year: year ? Number(year) : undefined,
      });
    } catch (err: any) {
      return [];
    }
  }

  @Get('payroll/my-payslips')
  @Roles('branch', 'pharmacist', 'warehouse', 'admin')
  @ApiOperation({ summary: 'Alias nhân viên xem phiếu lương cá nhân của chính mình (Cho Mobile App)' })
  async getMyPayslipsAlias(@Request() req, @Query('month') month?: number, @Query('year') year?: number) {
    try {
      const employeeId = req.user?.sub || req.user?._id || req.user?.id;
      return await sendKafkaMessage(this.kafkaClient, 'hr.payroll.my_payslip', {
        employeeId,
        month: month ? Number(month) : undefined,
        year: year ? Number(year) : undefined,
      });
    } catch (err: any) {
      return [];
    }
  }

  @Get('payroll/:id')
  @Roles('branch', 'admin', 'director')
  @ApiOperation({ summary: 'Xem chi tiết bảng lương' })
  async getPayrollDetail(@Request() req, @Param('id') id: string) {
    return await sendKafkaMessage(this.kafkaClient, 'hr.payroll.detail', {
      payrollId: id,
      requesterBranchId: req.user.branchId,
      requesterRole: req.user.role,
    });
  }

  @Patch('payroll/:id/adjust')
  @Roles('branch', 'admin')
  @ApiOperation({ summary: 'Quản lý điều chỉnh thủ công thưởng/phạt của nhân viên' })
  async adjustPayrollItem(
    @Request() req,
    @Param('id') payrollId: string,
    @Body() body: { employeeId: string; manualAdjustment: number; penalties?: number; adjustmentNote?: string },
  ) {
    return await sendKafkaMessage(this.kafkaClient, 'hr.payroll.adjust', {
      payrollId,
      ...body,
      requesterBranchId: req.user.branchId,
      requesterRole: req.user.role,
    });
  }

  @Patch('payroll/:id/submit')
  @Roles('branch', 'admin')
  @ApiOperation({ summary: 'Quản lý gửi bảng lương lên Ban Giám đốc phê duyệt' })
  async submitPayroll(@Request() req, @Param('id') payrollId: string) {
    return await sendKafkaMessage(this.kafkaClient, 'hr.payroll.submit', {
      payrollId,
      managerId: req.user.sub,
      requesterBranchId: req.user.branchId,
      requesterRole: req.user.role,
    });
  }

  @Patch('payroll/:id/approve')
  @Roles('branch', 'director', 'admin')
  @ApiOperation({ summary: 'Quản lý chi nhánh / Ban Giám đốc phê duyệt bảng lương cơ sở' })
  async approvePayroll(@Request() req, @Param('id') payrollId: string) {
    return await sendKafkaMessage(this.kafkaClient, 'hr.payroll.approve', {
      payrollId,
      approverId: req.user.sub,
      approverRole: req.user.role,
      requesterBranchId: req.user.branchId,
    });
  }
}
