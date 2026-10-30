import {
  Controller,
  Get,
  Post,
  Put,
  Delete,
  Param,
  Body,
  UseGuards,
  Inject,
  OnModuleInit,
  Query,
  Request,
} from '@nestjs/common';
import { ClientKafka } from '@nestjs/microservices';
import { ApiTags, ApiBearerAuth, ApiOperation } from '@nestjs/swagger';
import { JwtAuthGuard } from '../guards/jwt-auth.guard';
import { RolesGuard } from '../guards/roles.guard';
import { Roles } from '../decorators/roles.decorator';
import { sendKafkaMessage, subscribeToKafkaTopics } from '../common/kafka.helper';

@ApiTags('🛡️ Admin & Branch Employee Management')
@Controller('api/admin/employees')
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles('admin', 'branch')
@ApiBearerAuth()
export class AdminEmployeeController implements OnModuleInit {
  constructor(@Inject('USER_SERVICE') private readonly kafkaClient: ClientKafka) {}

  async onModuleInit() {
    await subscribeToKafkaTopics(this.kafkaClient, [
      'user.admin.employee.create',
      'user.admin.employee.list',
      'user.admin.employee.get',
      'user.admin.employee.update',
      'user.admin.employee.ban_unban',
      'user.admin.employee.delete',
      'user.admin.employee.approve',
      'user.admin.employee.lookup',
      'user.admin.employee.transfer.create',
      'user.admin.employee.transfer.list',
      'user.admin.employee.transfer.respond',
    ]);
  }

  @Get()
  @Roles('admin', 'branch', 'pharmacist')
  @ApiOperation({ summary: 'Lấy danh sách nhân viên' })
  async listEmployees(@Query() query: any, @Request() req: any) {
    const filter = { ...(query || {}) };
    if (req.user?.role === 'branch' && req.user.branchId) {
      filter.branchId = req.user.branchId;
    }
    return await sendKafkaMessage(this.kafkaClient, 'user.admin.employee.list', filter);
  }

  @Get('lookup')
  @Roles('admin', 'branch')
  @ApiOperation({ summary: 'Tra cứu nhân viên theo email hoặc số điện thoại' })
  async lookupEmployees(@Query('query') query: string) {
    return await sendKafkaMessage(this.kafkaClient, 'user.admin.employee.lookup', { query });
  }

  @Get('transfer-requests')
  @Roles('admin', 'branch', 'pharmacist')
  @ApiOperation({ summary: 'Lấy danh sách yêu cầu điều chuyển nhân sự' })
  async listTransferRequests(@Query('status') status: string, @Request() req: any) {
    return await sendKafkaMessage(this.kafkaClient, 'user.admin.employee.transfer.list', {
      userId: req.user?.sub || req.user?._id,
      role: req.user?.role,
      branchId: req.user?.branchId,
      status,
    });
  }

  @Post('transfer-requests')
  @Roles('branch')
  @ApiOperation({ summary: 'Tạo yêu cầu điều chuyển nhân sự vào chi nhánh' })
  async createTransferRequest(@Body() body: { employeeId: string; note?: string }, @Request() req: any) {
    return await sendKafkaMessage(this.kafkaClient, 'user.admin.employee.transfer.create', {
      employeeId: body.employeeId,
      note: body.note,
      requesterId: req.user?.sub || req.user?._id,
      requesterName: req.user?.fullName || req.user?.name || 'Quản lý cơ sở',
      requesterBranchId: req.user?.branchId,
    });
  }

  @Put('transfer-requests/:id/respond')
  @Roles('admin', 'branch', 'pharmacist')
  @ApiOperation({ summary: 'Phản hồi yêu cầu điều chuyển nhân sự' })
  async respondTransferRequest(
    @Param('id') id: string,
    @Body() body: { action: 'approve' | 'reject'; responseNote?: string; scheduleResolution?: 'cancel_upcoming_shifts' | 'defer' },
    @Request() req: any,
  ) {
    return await sendKafkaMessage(this.kafkaClient, 'user.admin.employee.transfer.respond', {
      requestId: id,
      userId: req.user?.sub || req.user?._id,
      role: req.user?.role,
      branchId: req.user?.branchId,
      action: body.action,
      responseNote: body.responseNote,
      scheduleResolution: body.scheduleResolution,
    });
  }

  @Get(':id')
  @ApiOperation({ summary: 'Lấy thông tin chi tiết nhân viên' })
  async getEmployee(@Param('id') id: string) {
    return await sendKafkaMessage(this.kafkaClient, 'user.admin.employee.get', { id });
  }

  @Post()
  @ApiOperation({ summary: 'Tạo tài khoản nhân viên mới' })
  async createEmployee(@Body() data: any, @Request() req: any) {
    return await sendKafkaMessage(this.kafkaClient, 'user.admin.employee.create', {
      ...data,
      requesterRole: req.user?.role,
      requesterBranchId: req.user?.branchId,
    });
  }

  @Put(':id')
  @ApiOperation({ summary: 'Cập nhật thông tin nhân viên' })
  async updateEmployee(@Param('id') id: string, @Body() data: any, @Request() req: any) {
    return await sendKafkaMessage(this.kafkaClient, 'user.admin.employee.update', {
      id,
      ...data,
      requesterRole: req.user?.role,
      requesterBranchId: req.user?.branchId,
    });
  }

  @Put(':id/ban')
  @ApiOperation({ summary: 'Ban / Unban nhân viên' })
  async toggleBanEmployee(@Param('id') id: string, @Request() req: any) {
    return await sendKafkaMessage(this.kafkaClient, 'user.admin.employee.ban_unban', {
      id,
      requesterRole: req.user?.role,
      requesterBranchId: req.user?.branchId,
    });
  }

  @Delete(':id')
  @Roles('admin')
  @ApiOperation({ summary: 'Xóa tài khoản nhân viên (chỉ Admin)' })
  async deleteEmployee(@Param('id') id: string, @Request() req: any) {
    return await sendKafkaMessage(this.kafkaClient, 'user.admin.employee.delete', {
      id,
      requesterRole: req.user?.role,
      requesterBranchId: req.user?.branchId,
    });
  }

  @Put(':id/approve')
  @Roles('admin')
  @ApiOperation({ summary: 'Phê duyệt / Từ chối tài khoản nhân viên (chỉ Admin)' })
  async approveEmployee(@Param('id') id: string, @Body() body: { action: 'approve' | 'reject' }) {
    return await sendKafkaMessage(this.kafkaClient, 'user.admin.employee.approve', { id, action: body.action });
  }
}
