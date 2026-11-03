import {
  Controller,
  Get,
  Post,
  Put,
  Patch,
  Delete,
  Body,
  Param,
  Req,
  Inject,
  OnModuleInit,
  UseGuards,
  BadRequestException,
  ForbiddenException,
  NotFoundException,
} from '@nestjs/common';
import { ClientKafka } from '@nestjs/microservices';
import { sendKafkaMessage, subscribeToKafkaTopics } from '../common/kafka.helper';
import { ApiTags, ApiOperation } from '@nestjs/swagger';
import { JwtAuthGuard } from '../guards/jwt-auth.guard';
import { RolesGuard } from '../guards/roles.guard';
import { Roles } from '../decorators/roles.decorator';
import { AuditLogAction } from '../decorators/audit-log.decorator';

@ApiTags('🏢 Branches')
@Controller('api/branches')
@UseGuards(JwtAuthGuard, RolesGuard)
export class BranchController implements OnModuleInit {
  constructor(
    @Inject('USER_SERVICE') private readonly userClient: ClientKafka,
  ) {}

  async onModuleInit() {
    await subscribeToKafkaTopics(this.userClient, [
      'user.branch.list',
      'user.branch.get',
      'user.branch.create',
      'user.branch.update',
      'user.branch.update_location',
      'user.branch.delete',
    ]);
  }

  @Get()
  @ApiOperation({ summary: 'Lấy danh sách tất cả chi nhánh' })
  async getAllBranches() {
    return await sendKafkaMessage(this.userClient, 'user.branch.list', {});
  }

  @Get('my-branch')
  @Roles('branch', 'pharmacist', 'warehouse', 'admin', 'director')
  @ApiOperation({ summary: 'Lấy thông tin chi nhánh của tài khoản đang đăng nhập' })
  async getMyBranch(@Req() req: any) {
    const branchId = req.user?.branchId;
    if (!branchId) {
      throw new BadRequestException('Tài khoản chưa được phân bổ vào chi nhánh cụ thể');
    }
    const branch = await sendKafkaMessage(this.userClient, 'user.branch.get', { id: branchId });
    if (!branch) {
      throw new NotFoundException(`Không tìm thấy chi nhánh với mã: ${branchId}`);
    }
    return branch;
  }

  @Get(':id')
  @ApiOperation({ summary: 'Lấy thông tin chi tiết một chi nhánh' })
  async getBranchById(@Param('id') id: string) {
    const branch = await sendKafkaMessage(this.userClient, 'user.branch.get', { id });
    if (!branch) {
      throw new NotFoundException(`Không tìm thấy chi nhánh với ID hoặc mã: ${id}`);
    }
    return branch;
  }

  @Post()
  @Roles('admin', 'director')
  @ApiOperation({ summary: 'Tạo chi nhánh mới (Dành cho Admin/Director)' })
  @AuditLogAction({
    actionCode: 'BRANCH_CREATE',
    actionName: 'Tạo chi nhánh mới',
    module: 'Branch',
    eventType: 'CREATE',
    entityType: 'Branch',
  })
  async createBranch(@Body() data: any) {
    return await sendKafkaMessage(this.userClient, 'user.branch.create', data);
  }

  @Patch('my-branch/location')
  @Roles('branch', 'admin', 'director')
  @ApiOperation({ summary: 'Quản lý chi nhánh thiết lập vị trí GPS & bán kính Geofencing cho cơ sở mình' })
  @AuditLogAction({
    actionCode: 'BRANCH_LOCATION_UPDATE',
    actionName: 'Quản lý cơ sở cập nhật vị trí GPS chi nhánh mình',
    module: 'Branch',
    eventType: 'UPDATE',
    entityType: 'Branch',
  })
  async updateMyBranchLocation(@Req() req: any, @Body() data: any) {
    const branchId = req.user?.branchId;
    if (!branchId) {
      throw new BadRequestException('Tài khoản chưa được liên kết với chi nhánh nào');
    }
    return await sendKafkaMessage(this.userClient, 'user.branch.update_location', {
      id: branchId,
      locationData: data,
    });
  }

  @Patch(':id/location')
  @Roles('branch', 'admin', 'director')
  @ApiOperation({ summary: 'Cập nhật vị trí GPS chi nhánh theo ID (Bảo vệ IDOR cho role branch)' })
  @AuditLogAction({
    actionCode: 'BRANCH_LOCATION_UPDATE',
    actionName: 'Cập nhật vị trí GPS chi nhánh theo ID',
    module: 'Branch',
    eventType: 'UPDATE',
    entityType: 'Branch',
  })
  async updateBranchLocation(@Param('id') id: string, @Req() req: any, @Body() data: any) {
    const userRole = (req.user?.role || '').toLowerCase();
    const userBranchId = req.user?.branchId;

    if (userRole === 'branch') {
      const branch: any = await sendKafkaMessage(this.userClient, 'user.branch.get', { id });
      if (!branch) {
        throw new NotFoundException('Không tìm thấy chi nhánh');
      }
      const isOwner =
        branch.branchCode === userBranchId ||
        branch._id?.toString() === userBranchId ||
        id === userBranchId;
      if (!isOwner) {
        throw new ForbiddenException('Bạn chỉ có quyền cài đặt vị trí cho chi nhánh của chính mình');
      }
    }

    return await sendKafkaMessage(this.userClient, 'user.branch.update_location', {
      id,
      locationData: data,
    });
  }

  @Put(':id')
  @Roles('branch', 'admin', 'director')
  @ApiOperation({ summary: 'Cập nhật thông tin chi nhánh (Bảo vệ IDOR cho role branch)' })
  @AuditLogAction({
    actionCode: 'BRANCH_UPDATE',
    actionName: 'Cập nhật thông tin chi nhánh',
    module: 'Branch',
    eventType: 'UPDATE',
    entityType: 'Branch',
  })
  async updateBranch(@Param('id') id: string, @Req() req: any, @Body() data: any) {
    const userRole = (req.user?.role || '').toLowerCase();
    const userBranchId = req.user?.branchId;

    if (userRole === 'branch') {
      const branch: any = await sendKafkaMessage(this.userClient, 'user.branch.get', { id });
      if (!branch) {
        throw new NotFoundException('Không tìm thấy chi nhánh');
      }
      const isOwner =
        branch.branchCode === userBranchId ||
        branch._id?.toString() === userBranchId ||
        id === userBranchId;
      if (!isOwner) {
        throw new ForbiddenException('Bạn chỉ có quyền cập nhật chi nhánh của chính mình');
      }
      // Không cho phép Quản lý chi nhánh tự ý thay đổi mã chi nhánh
      delete data.branchCode;
    }

    return await sendKafkaMessage(this.userClient, 'user.branch.update', { id, updateData: data });
  }

  @Delete(':id')
  @Roles('admin')
  @ApiOperation({ summary: 'Xóa chi nhánh (Chỉ Admin)' })
  @AuditLogAction({
    actionCode: 'BRANCH_DELETE',
    actionName: 'Xóa chi nhánh',
    module: 'Branch',
    eventType: 'DELETE',
    entityType: 'Branch',
  })
  async deleteBranch(@Param('id') id: string) {
    return await sendKafkaMessage(this.userClient, 'user.branch.delete', { id });
  }
}
