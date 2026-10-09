import { Controller, Get, Post, Body, Patch, Delete, Query, Param, Req, UseGuards, Logger, ForbiddenException } from '@nestjs/common';
import { ApiTags, ApiBearerAuth, ApiOperation } from '@nestjs/swagger';
import { NotificationService } from './notification.service';
import { PushNotificationService } from './push-notification.service';
import { JwtAuthGuard } from '../guards/jwt-auth.guard';

@ApiTags('Notifications')
@ApiBearerAuth()
@Controller('api/notifications')
@UseGuards(JwtAuthGuard)
export class NotificationController {
  private readonly logger = new Logger(NotificationController.name);

  constructor(
    private readonly notificationService: NotificationService,
    private readonly pushService: PushNotificationService,
  ) {}

  @Get('me')
  @ApiOperation({ summary: 'Lấy notifications cho user hiện tại' })
  async getMyNotifications(
    @Query('unreadOnly') unreadOnly: string,
    @Query('limit') limit: string,
    @Query('offset') offset: string,
    @Req() req: any,
  ) {
    const user = req.user;
    const userId = user.sub || user._id;
    const notifications = await this.notificationService.findForUser(
      userId,
      user.role,
      user.branchId,
      {
        unreadOnly: unreadOnly === 'true',
        limit: limit ? parseInt(limit, 10) : 50,
        offset: offset ? parseInt(offset, 10) : 0,
      },
    );

    // Transform: add `read` boolean field per user
    const result = notifications.map((n: any) => ({
      ...n,
      read: (n.readBy || []).includes(userId),
    }));

    return { success: true, data: result };
  }

  @Get('new')
  @ApiOperation({ summary: 'Polling: lấy notifications mới sau timestamp' })
  async getNewNotifications(@Query('after') after: string, @Req() req: any) {
    const user = req.user;
    const userId = user.sub || user._id;
    const afterDate = new Date(after || 0);

    const notifications = await this.notificationService.findNewSince(
      userId,
      user.role,
      user.branchId,
      afterDate,
    );

    const result = notifications.map((n: any) => ({
      ...n,
      read: (n.readBy || []).includes(userId),
    }));

    return { success: true, data: result };
  }

  @Get('unread-count')
  @ApiOperation({ summary: 'Đếm notifications chưa đọc' })
  async getUnreadCount(@Req() req: any) {
    const user = req.user;
    const count = await this.notificationService.getUnreadCount(user.sub || user._id, user.role, user.branchId);
    return { success: true, data: count };
  }

  @Patch('mark-all-read')
  @ApiOperation({ summary: 'Đánh dấu tất cả đã đọc' })
  async markAllAsRead(@Req() req: any) {
    const user = req.user;
    await this.notificationService.markAllAsRead(user.sub || user._id, user.role, user.branchId);
    return { success: true, message: 'All notifications marked as read' };
  }

  @Patch(':id/read')
  @ApiOperation({ summary: 'Đánh dấu notification đã đọc' })
  async markAsRead(@Param('id') id: string, @Req() req: any) {
    const user = req.user;
    const notification = await this.notificationService.markAsRead(id, user.sub || user._id);
    return { success: true, data: notification };
  }

  @Delete(':id')
  @ApiOperation({ summary: 'Xoá notification' })
  async deleteNotification(@Param('id') id: string) {
    await this.notificationService.delete(id);
    return { success: true, message: 'Notification deleted' };
  }

  @Post('devices/register')
  @ApiOperation({ summary: 'Đăng ký push token của thiết bị di động' })
  async registerDevice(@Body() body: any, @Req() req: any) {
    const user = req.user;
    const userId = user.sub || user._id;
    const device = await this.pushService.registerToken({
      userId,
      role: user.role,
      branchId: user.branchId,
      pushToken: body.pushToken,
      platform: body.platform,
      deviceModel: body.deviceModel,
    });
    return { success: true, data: device };
  }

  @Post('devices/unregister')
  @ApiOperation({ summary: 'Hủy đăng ký push token khi đăng xuất' })
  async unregisterDevice(@Body() body: any) {
    await this.pushService.unregisterToken(body.pushToken);
    return { success: true, message: 'Device unregistered' };
  }

  @Post('test-push')
  @ApiOperation({ summary: 'Gửi test thông báo còi hú đến điện thoại theo role' })
  async testPush(@Body() body: any) {
    const role = body.role || 'warehouse';
    const title = body.title || 'TEST CÒI BÁO ĐỘNG KHO TỔNG';
    const message = body.body || 'Kiểm tra thông báo đẩy đến điện thoại thủ kho';

    const result = await this.pushService.sendToRole(role, {
      title,
      body: message,
      channelId: 'iot_temperature_critical',
      sound: 'siren_alarm',
      data: {
        type: 'IOT_TEMPERATURE_ALERT',
        deviceId: 'ESP32S3_2884855FFFFC',
        temp: '41.5',
      },
    });

    return {
      success: true,
      message: `Đã gửi test push tới role ${role}`,
      result,
    };
  }

  @Post('test-iot-alert')
  @ApiOperation({ summary: 'Bắn test cảnh báo IoT (GSP hoặc Hỏa hoạn) đến thủ kho' })
  async testIotAlert(@Body() body: any, @Req() req: any) {
    const user = req.user;
    if (user.role !== 'warehouse' && user.role !== 'admin') {
      throw new ForbiddenException('Chỉ thủ kho hoặc admin mới có quyền thực hiện test cảnh báo');
    }

    const type = body.type === 'FIRE_EMERGENCY' ? 'FIRE_EMERGENCY' : 'GSP_WARNING';
    const deviceId = body.deviceId || 'ESP32S3_404CCA44C814';

    let title: string;
    let messageBody: string;
    let channelId: string;
    let sound: string;
    let severity: 'WARNING' | 'EMERGENCY';
    let dataPayload: Record<string, string>;

    if (type === 'FIRE_EMERGENCY') {
      title = 'BÁO ĐỘNG HỎA HOẠN KHO TỔNG (TEST)';
      messageBody = `THỬ NGHIỆM: Kích hoạt chuông báo động hỏa hoạn khẩn cấp tại trạm ${deviceId}!`;
      channelId = 'fire_emergency_call_v4';
      sound = 'alarm_gentle';
      severity = 'EMERGENCY';
      dataPayload = {
        type: 'FIRE_EMERGENCY',
        deviceId,
        temp: '65.0',
        isTest: 'true',
      };
    } else {
      title = 'CẢNH BÁO QUÁ NHIỆT KHO TỔNG (TEST)';
      messageBody = `THỬ NGHIỆM: Nhiệt độ kho tổng vượt ngưỡng an toàn GSP tại trạm ${deviceId}!`;
      channelId = 'iot_temperature_critical';
      sound = 'default';
      severity = 'WARNING';
      dataPayload = {
        type: 'IOT_TEMPERATURE_ALERT',
        deviceId,
        temp: '42.0',
        isTest: 'true',
      };
    }

    // Chỉ bắn Push Notification thử nghiệm, không lưu DB theo yêu cầu
    const result = await this.pushService.sendToRole('warehouse', {
      title,
      body: messageBody,
      channelId,
      sound,
      severity,
      data: dataPayload,
    });

    return {
      success: true,
      message: `Đã gửi thử nghiệm ${type} tới thủ kho`,
      type,
      deviceId,
      result,
    };
  }
}

