import { Controller } from '@nestjs/common';
import { MessagePattern, EventPattern, Payload } from '@nestjs/microservices';
import { UserService } from './user-service.service';
import { BranchService } from './branch.service';
import { ExportJobStatusDto } from './dto/export-job-status.dto';
import { HrService } from './hr.service';

@Controller()
export class UserServiceController {
  constructor(
    private readonly userService: UserService,
    private readonly branchService: BranchService,
    private readonly hrService: HrService,
  ) { }

  @MessagePattern('user.edit_profile')
  handleEditProfile(@Payload() data: { userId: string; fullName?: string; phone?: string; address?: string }) {
    return this.userService.editProfile(data.userId, data);
  }

  @MessagePattern('user.change_avatar')
  handleChangeAvatar(@Payload() data: { userId: string; avatarUrl: string }) {
    return this.userService.changeAvatar(data.userId, data.avatarUrl);
  }

  // --- CART MESSAGE PATTERNS ---

  @MessagePattern('user.cart.get')
  handleGetCart(@Payload() data: { userId: string }) {
    return this.userService.getCart(data.userId);
  }

  @MessagePattern('user.cart.add')
  handleAddToCart(@Payload() data: { userId: string; medicineId: string; quantity: number }) {
    return this.userService.addToCart(data.userId, data.medicineId, data.quantity);
  }

  @MessagePattern('user.cart.update')
  handleUpdateCartItem(@Payload() data: { userId: string; medicineId: string; quantity: number }) {
    return this.userService.updateCartItem(data.userId, data.medicineId, data.quantity);
  }

  @MessagePattern('user.cart.delete')
  handleDeleteCartItem(@Payload() data: { userId: string; medicineId: string }) {
    return this.userService.deleteCartItem(data.userId, data.medicineId);
  }

  @MessagePattern('user.cart.clear')
  handleClearCart(@Payload() data: { userId: string }) {
    return this.userService.clearCart(data.userId);
  }

  @MessagePattern('user.branch.list')
  handleListBranches() {
    return this.branchService.findAll();
  }


  @MessagePattern('user.branch.create')
  async handleCreateBranch(@Payload() data: any) {
    const newBranch = await this.branchService.create(data);
    if (data.managerId && newBranch.branchCode) {
      try {
        await this.userService.updateEmployee(data.managerId, { branchId: newBranch.branchCode });
      } catch (err) {
        // Log the error but don't fail branch creation
        console.error('Error linking manager to branch:', err);
      }
    }
    return newBranch;
  }

  @MessagePattern('user.branch.update')
  handleUpdateBranch(@Payload() data: { id: string; updateData: any }) {
    return this.branchService.update(data.id, data.updateData);
  }

  @MessagePattern('user.branch.delete')
  handleDeleteBranch(@Payload() data: { id: string }) {
    return this.branchService.delete(data.id);
  }

  @MessagePattern('user.loyalty.get')
  handleGetLoyalty(@Payload() data: { userId: string }) {
    return this.userService.getLoyaltyInfo(data.userId);
  }

  @MessagePattern('user.loyalty.lookup')
  handleLookupLoyalty(@Payload() data: { phone: string }) {
    return this.userService.lookupLoyaltyByPhone(data.phone);
  }

  @MessagePattern('user.loyalty.update_points')
  handleUpdatePoints(@Payload() data: { phone?: string; userId?: string; pointsDelta: number; accumulatedDelta?: number }) {
    return this.userService.updatePoints(data);
  }

  // --- ADMIN EMPLOYEE MANAGEMENT ---

  @MessagePattern('user.admin.employee.create')
  handleCreateEmployee(@Payload() data: any) {
    return this.userService.createEmployee(data);
  }

  @MessagePattern('user.admin.employee.list')
  handleListEmployees(@Payload() data: any) {
    return this.userService.listEmployees(data);
  }

  @MessagePattern('user.admin.employee.get')
  handleGetEmployee(@Payload() data: { id: string }) {
    return this.userService.getEmployeeById(data.id);
  }

  @MessagePattern('user.admin.employee.update')
  handleUpdateEmployee(@Payload() data: any) {
    return this.userService.updateEmployee(data.id, data);
  }

  @MessagePattern('user.admin.employee.ban_unban')
  handleToggleBanEmployee(@Payload() data: { id: string }) {
    return this.userService.toggleBanEmployee(data.id);
  }

  @MessagePattern('user.admin.employee.delete')
  handleDeleteEmployee(@Payload() data: { id: string }) {
    return this.userService.deleteEmployee(data.id);
  }

  @MessagePattern('user.admin.employee.approve')
  handleApproveEmployee(@Payload() data: { id: string; action: 'approve' | 'reject' }) {
    return this.userService.approveEmployee(data.id, data.action);
  }

  @EventPattern('user.branch.alert.low_stock')
  handleLowStockAlertEvent(@Payload() data: any) {
    return this.branchService.handleLowStockAlert(data);
  }

  @MessagePattern('audit.created')
  handleCreateAuditLog(@Payload() data: any) {
    return this.userService.createAuditLog(data);
  }

  @MessagePattern('user.audit.list')
  handleListAuditLogs(@Payload() query: any) {
    return this.userService.listAuditLogs(query);
  }

  @MessagePattern('user.audit.export')
  handleExportAuditLogs(@Payload() query: any) {
    return this.userService.exportAuditLogs(query);
  }

  @MessagePattern('user.audit.export_status')
  async handleExportAuditLogsStatus(@Payload() data: { jobId: string }): Promise<ExportJobStatusDto> {
    return this.userService.getExportJobStatus(data.jobId);
  }

  // --- BRANCH FEEDBACK & CSKH LOYALTY ---

  @MessagePattern('user.feedback.create')
  handleCreateFeedback(@Payload() data: any) {
    return this.userService.createFeedback(data);
  }

  @MessagePattern('user.feedback.get_by_branch')
  handleGetFeedbacksByBranch(@Payload() data: any) {
    return this.userService.getFeedbacksByBranch(data);
  }

  @MessagePattern('user.feedback.resolve')
  handleResolveFeedback(@Payload() data: { id: string; resolution: any }) {
    return this.userService.resolveFeedback(data.id, data.resolution);
  }

  @MessagePattern('user.feedback.chain_summary')
  handleGetChainFeedbackSummary() {
    return this.userService.getChainFeedbackSummary();
  }

  @MessagePattern('user.feedback.get_by_customer')
  handleGetFeedbacksByCustomer(@Payload() data: { customerPhone: string }) {
    return this.userService.getFeedbacksByCustomerPhone(data.customerPhone);
  }

  // --- HR: WORK SHIFT ---
  @MessagePattern('hr.shift.list')
  handleListShifts(@Payload() data: { branchId: string }) {
    return this.hrService.listShifts(data.branchId);
  }

  @MessagePattern('hr.shift.create')
  handleCreateShift(@Payload() data: { branchId: string; name: string; startTime: string; endTime: string; color: string }) {
    return this.hrService.createShift(data.branchId, data);
  }

  @MessagePattern('hr.shift.update')
  handleUpdateShift(@Payload() data: { shiftId: string; branchId: string; [key: string]: any }) {
    const { shiftId, branchId, ...updateData } = data;
    return this.hrService.updateShift(shiftId, branchId, updateData);
  }

  @MessagePattern('hr.shift.toggle')
  handleToggleShift(@Payload() data: { shiftId: string; branchId: string }) {
    return this.hrService.toggleShift(data.shiftId, data.branchId);
  }

  // --- HR: WORK SCHEDULE ---
  @MessagePattern('hr.schedule.get_week')
  handleGetWeekSchedule(@Payload() data: { branchId: string; weekStart: string }) {
    return this.hrService.getWeekSchedule(data.branchId, data.weekStart);
  }

  @MessagePattern('hr.schedule.upsert')
  handleUpsertSchedule(@Payload() data: { branchId: string; managerId: string; weekStart: string; assignments: any[] }) {
    return this.hrService.upsertSchedule(data.branchId, data.managerId, data);
  }

  @MessagePattern('hr.schedule.publish')
  handlePublishSchedule(@Payload() data: { branchId: string; managerId: string; weekStart: string }) {
    return this.hrService.publishSchedule(data.branchId, data.managerId, data.weekStart);
  }

  @MessagePattern('hr.schedule.my_week')
  handleGetMyWeek(@Payload() data: { employeeId: string; branchId: string; weekStart: string }) {
    return this.hrService.getMyWeekSchedule(data.employeeId, data.branchId, data.weekStart);
  }

  // --- HR: SHIFT SWAP ---
  @MessagePattern('hr.swap.list')
  handleListSwaps(@Payload() data: { branchId: string; status?: string }) {
    return this.hrService.listSwapRequests(data.branchId, data.status);
  }

  @MessagePattern('hr.swap.my_list')
  handleListMySwaps(@Payload() data: { userId: string }) {
    return this.hrService.listMySwapRequests(data.userId);
  }

  @MessagePattern('hr.swap.create')
  handleCreateSwap(@Payload() data: any) {
    return this.hrService.createSwapRequest(data);
  }

  @MessagePattern('hr.swap.target_respond')
  handleTargetRespond(@Payload() data: { swapId: string; targetId: string; response: any; rejectReason?: string }) {
    return this.hrService.targetRespond(data.swapId, data.targetId, data.response, data.rejectReason);
  }

  @MessagePattern('hr.swap.manager_respond')
  handleManagerRespond(@Payload() data: { swapId: string; managerId: string; response: any; rejectReason?: string }) {
    return this.hrService.managerRespond(data.swapId, data.managerId, data.response, data.rejectReason);
  }

  // --- HR: NOTIFICATION ---
  @MessagePattern('hr.notification.list')
  handleListNotifications(@Payload() data: { userId: string; limit?: number; skip?: number }) {
    return this.hrService.listNotifications(data.userId, data.limit, data.skip);
  }

  @MessagePattern('hr.notification.mark_read')
  handleMarkRead(@Payload() data: { userId: string; notificationId?: string }) {
    return this.hrService.markRead(data.userId, data.notificationId);
  }

  @MessagePattern('hr.notification.unread_count')
  handleUnreadCount(@Payload() data: { userId: string }) {
    return this.hrService.getUnreadCount(data.userId);
  }
}
