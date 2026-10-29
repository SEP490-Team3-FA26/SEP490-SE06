import { Controller } from '@nestjs/common';
import { MessagePattern, EventPattern, Payload } from '@nestjs/microservices';
import { UserService } from './user-service.service';
import { BranchService } from './branch.service';
import { ExportJobStatusDto } from './dto/export-job-status.dto';
import { HrService } from './hr.service';
import { CertificateService } from './certificate.service';
import { AttendanceService } from './attendance.service';
import { PayrollService } from './payroll.service';
import { ShiftHandoverService } from './shift-handover.service';
import { EmailMarketingService } from './email-marketing.service';

@Controller()
export class UserServiceController {
  constructor(
    private readonly userService: UserService,
    private readonly branchService: BranchService,
    private readonly hrService: HrService,
    private readonly certService: CertificateService,
    private readonly attendanceService: AttendanceService,
    private readonly payrollService: PayrollService,
    private readonly shiftHandoverService: ShiftHandoverService,
    private readonly emailMarketingService: EmailMarketingService,
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

  // --- WISHLIST MESSAGE PATTERNS ---

  @MessagePattern('user.wishlist.get')
  handleGetWishlist(@Payload() data: { userId: string }) {
    return this.userService.getWishlist(data.userId);
  }

  @MessagePattern('user.wishlist.add')
  handleAddToWishlist(@Payload() data: { userId: string; medicineId: string }) {
    return this.userService.addToWishlist(data.userId, data.medicineId);
  }

  @MessagePattern('user.wishlist.remove')
  handleRemoveFromWishlist(@Payload() data: { userId: string; medicineId: string }) {
    return this.userService.removeFromWishlist(data.userId, data.medicineId);
  }

  @MessagePattern('user.wishlist.clear')
  handleClearWishlist(@Payload() data: { userId: string }) {
    return this.userService.clearWishlist(data.userId);
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

  @MessagePattern('user.branch.get')
  handleGetBranch(@Payload() data: { id: string }) {
    return this.branchService.findById(data.id);
  }

  @MessagePattern('user.branch.update')
  handleUpdateBranch(@Payload() data: { id: string; updateData: any }) {
    return this.branchService.update(data.id, data.updateData);
  }

  @MessagePattern('user.branch.update_location')
  handleUpdateBranchLocation(@Payload() data: { id: string; locationData: any }) {
    return this.branchService.updateLocation(data.id, data.locationData);
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
  handleUpdatePoints(@Payload() data: { phone?: string; userId?: string; pointsDelta: number; accumulatedDelta?: number; operationKey?: string }) {
    return this.userService.updatePoints(data);
  }

  @MessagePattern('user.get_by_phone')
  handleGetUserByPhone(@Payload() data: { phone: string }) {
    return this.userService.getUserByPhone(data.phone);
  }

  @MessagePattern('user.clinical_profile.get')
  handleGetClinicalProfile(@Payload() data: { phone: string }) {
    return this.userService.lookupLoyaltyByPhone(data.phone);
  }

  @MessagePattern('user.clinical_profile.update')
  handleUpdateClinicalProfile(@Payload() data: { phone?: string; userId?: string; allergies?: string[]; chronicConditions?: string[] }) {
    return this.userService.updateClinicalProfile(data);
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
  handleToggleBanEmployee(@Payload() data: { id: string; requesterRole?: string; requesterBranchId?: string }) {
    return this.userService.toggleBanEmployee(data.id, data.requesterRole, data.requesterBranchId);
  }

  @MessagePattern('user.admin.employee.delete')
  handleDeleteEmployee(@Payload() data: { id: string; requesterRole?: string; requesterBranchId?: string }) {
    return this.userService.deleteEmployee(data.id, data.requesterRole, data.requesterBranchId);
  }

  @MessagePattern('user.admin.employee.approve')
  handleApproveEmployee(@Payload() data: { id: string; action: 'approve' | 'reject' }) {
    return this.userService.approveEmployee(data.id, data.action);
  }

  @MessagePattern('user.admin.employee.lookup')
  handleLookupEmployee(@Payload() data: { query: string }) {
    return this.userService.lookupEmployees(data.query);
  }

  @MessagePattern('user.admin.employee.transfer.create')
  handleCreateTransferRequest(@Payload() data: any) {
    return this.userService.createTransferRequest(data);
  }

  @MessagePattern('user.admin.employee.transfer.list')
  handleListTransferRequests(@Payload() data: any) {
    return this.userService.listTransferRequests(data);
  }

  @MessagePattern('user.admin.employee.transfer.respond')
  handleRespondTransferRequest(@Payload() data: any) {
    return this.userService.respondTransferRequest(data);
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

  // --- RFM CUSTOMER SEGMENTATION ---

  @MessagePattern('user.rfm.get_by_phone')
  handleGetCustomerRFM(@Payload() data: { phone: string }) {
    return this.userService.getCustomerSegmentByPhone(data.phone);
  }

  @MessagePattern('user.rfm.overview')
  handleGetRFMOverview(@Payload() data: { branchId?: string }) {
    return this.userService.getRFMOverview(data?.branchId);
  }

  @MessagePattern('user.rfm.recalculate')
  handleRecalculateRFM() {
    return this.userService.calculateRFMSegments();
  }

  @MessagePattern('user.rfm.at_risk_list')
  handleGetAtRiskCustomers(@Payload() data: { branchId?: string; limit?: number }) {
    return this.userService.getAtRiskCustomers(data);
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
  handlePublishSchedule(@Payload() data: { branchId: string; managerId: string; weekStart: string; sendEmailNotification?: boolean }) {
    return this.hrService.publishSchedule(data.branchId, data.managerId, data.weekStart, data.sendEmailNotification !== false);
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

  // --- HR: LEAVE MANAGEMENT ---
  @MessagePattern('hr.leave.balance')
  handleGetLeaveBalance(@Payload() data: { userId: string }) {
    return this.hrService.getMyLeaveBalance(data.userId);
  }

  @MessagePattern('hr.leave.my_list')
  handleGetMyLeaves(@Payload() data: { userId: string; status?: string }) {
    return this.hrService.getMyLeaves(data.userId, data.status);
  }

  @MessagePattern('hr.leave.branch_list')
  handleGetBranchLeaves(@Payload() data: { branchId: string; status?: string }) {
    return this.hrService.getBranchLeaves(data.branchId, data.status);
  }

  @MessagePattern('hr.leave.create')
  handleCreateLeave(@Payload() data: any) {
    return this.hrService.createLeaveRequest(data);
  }

  @MessagePattern('hr.leave.respond')
  handleRespondLeave(@Payload() data: {
    leaveId: string;
    managerId: string;
    managerName: string;
    managerRole?: string;
    managerBranchId?: string;
    action: 'approve' | 'reject';
    managerNote?: string;
  }) {
    return this.hrService.respondLeave(data);
  }

  @MessagePattern('hr.leave.cancel')
  handleCancelLeave(@Payload() data: { leaveId: string; userId: string; cancelReason?: string }) {
    return this.hrService.cancelLeave(data.leaveId, data.userId, data.cancelReason);
  }

  // --- HR: CERTIFICATE & CCHN MANAGEMENT ---
  @MessagePattern('hr.certificate.submit')
  handleSubmitCertificate(@Payload() data: { userId: string; [key: string]: any }) {
    const { userId, ...certData } = data;
    return this.certService.submitCertificate(userId, certData);
  }

  @MessagePattern('hr.certificate.my_list')
  handleGetMyCertificates(@Payload() data: { userId: string }) {
    return this.certService.getMyCertificates(data.userId);
  }

  @MessagePattern('hr.certificate.update')
  handleUpdateCertificate(@Payload() data: { userId: string; certificateId: string; [key: string]: any }) {
    const { userId, certificateId, ...updateData } = data;
    return this.certService.updateMyCertificate(userId, certificateId, updateData);
  }

  @MessagePattern('hr.certificate.delete')
  handleDeleteCertificate(@Payload() data: { userId: string; certificateId: string }) {
    return this.certService.deleteMyCertificate(data.userId, data.certificateId);
  }

  @MessagePattern('hr.certificate.branch_list')
  handleListBranchCertificates(@Payload() data: { branchId: string; status?: string }) {
    return this.certService.listBranchCertificates(data.branchId, data.status);
  }

  @MessagePattern('hr.certificate.approve')
  handleApproveCertificate(@Payload() data: { managerId: string; certificateId: string; monthlyAllowance?: number; isBranchPIC?: boolean }) {
    return this.certService.approveCertificate(data.managerId, data.certificateId, {
      monthlyAllowance: data.monthlyAllowance,
      isBranchPIC: data.isBranchPIC,
    });
  }

  @MessagePattern('hr.certificate.reject')
  handleRejectCertificate(@Payload() data: { managerId: string; certificateId: string; rejectionReason: string }) {
    return this.certService.rejectCertificate(data.managerId, data.certificateId, data.rejectionReason);
  }

  @MessagePattern('hr.certificate.branch_summary')
  handleGetBranchCertificateSummary(@Payload() data: { branchId: string }) {
    return this.certService.getBranchCertificateSummary(data.branchId);
  }

  // --- HR: ATTENDANCE & GPS CHECK-IN ---
  @MessagePattern('hr.attendance.check_in')
  handleAttendanceCheckIn(@Payload() data: { employeeId: string; branchId?: string; shiftId?: string; latitude: number; longitude: number; isMockLocation?: boolean; note?: string }) {
    return this.attendanceService.checkIn(data);
  }

  @MessagePattern('hr.attendance.check_out')
  handleAttendanceCheckOut(@Payload() data: { employeeId: string; latitude?: number; longitude?: number; note?: string }) {
    return this.attendanceService.checkOut(data);
  }

  @MessagePattern('hr.attendance.my_current_shift')
  handleGetMyCurrentShiftStatus(@Payload() data: { employeeId: string; branchId?: string }) {
    return this.attendanceService.getMyCurrentShiftStatus(data.employeeId, data.branchId);
  }

  @MessagePattern('hr.attendance.verify_active_shift')
  handleVerifyPharmacistActiveShift(@Payload() data: { pharmacistId: string; branchId?: string }) {
    return this.attendanceService.verifyPharmacistActiveShift(data.pharmacistId, data.branchId);
  }

  @MessagePattern('hr.attendance.branch_today')
  handleGetBranchTodayAttendance(@Payload() data: { branchId: string; date?: string }) {
    return this.attendanceService.getBranchTodayAttendance(data.branchId, data.date);
  }

  @MessagePattern('hr.attendance.history')
  handleGetMyAttendanceHistory(@Payload() data: { employeeId: string; startDate?: string; endDate?: string }) {
    return this.attendanceService.getMyAttendanceHistory(data.employeeId, data.startDate, data.endDate);
  }

  // --- HR: SHIFT HANDOVER (BÀN GIAO CA & CHỐT KÉT) ---
  @MessagePattern('hr.shift_handover.live_stats')
  handleGetShiftLiveStats(@Payload() data: { employeeId: string; branchId?: string; shiftId?: string }) {
    return this.shiftHandoverService.getShiftLiveStats(data);
  }

  @MessagePattern('hr.shift_handover.submit')
  handleSubmitShiftHandover(@Payload() data: any) {
    return this.shiftHandoverService.submitHandover(data);
  }

  @MessagePattern('hr.shift_handover.accept')
  handleAcceptShiftHandover(@Payload() data: { id: string; user: any }) {
    return this.shiftHandoverService.acceptHandover(data.id, data.user);
  }

  @MessagePattern('hr.shift_handover.history')
  handleGetShiftHandoverHistory(@Payload() data: { branchId: string; date?: string; limit?: number }) {
    return this.shiftHandoverService.getHandoverHistory(data);
  }

  @MessagePattern('hr.shift_handover.detail')
  handleGetShiftHandoverDetail(@Payload() data: { id: string; requesterBranchId?: string; requesterRole?: string }) {
    return this.shiftHandoverService.getHandoverDetail(data.id, data.requesterBranchId, data.requesterRole);
  }

  // --- HR: PAYROLL MANAGEMENT ---
  @MessagePattern('hr.payroll.calculate')
  handleCalculateMonthlyPayroll(@Payload() data: { branchId: string; month: number; year: number; mealAllowanceRate?: number; managerId?: string; managerName?: string; requesterBranchId?: string; requesterRole?: string }) {
    return this.payrollService.calculateMonthlyPayroll(data);
  }

  @MessagePattern('hr.payroll.list')
  handleListPayrolls(@Payload() data: { branchId?: string; year?: number }) {
    return this.payrollService.listPayrolls(data?.branchId, data?.year);
  }

  @MessagePattern('hr.payroll.detail')
  handleGetPayrollDetail(@Payload() data: { payrollId: string; requesterBranchId?: string; requesterRole?: string }) {
    return this.payrollService.getPayrollDetail(data.payrollId, data.requesterBranchId, data.requesterRole);
  }

  @MessagePattern('hr.payroll.adjust')
  handleAdjustPayrollItem(@Payload() data: { payrollId: string; employeeId: string; manualAdjustment: number; penalties?: number; adjustmentNote?: string; requesterBranchId?: string; requesterRole?: string }) {
    return this.payrollService.adjustPayrollItem(data);
  }

  @MessagePattern('hr.payroll.submit')
  handleSubmitPayroll(@Payload() data: { payrollId: string; managerId?: string; requesterBranchId?: string; requesterRole?: string }) {
    return this.payrollService.submitPayroll(data.payrollId, data.managerId, data.requesterBranchId, data.requesterRole);
  }

  @MessagePattern('hr.payroll.approve')
  handleApprovePayroll(@Payload() data: { payrollId: string; approverId?: string; approverRole?: string; requesterBranchId?: string }) {
    return this.payrollService.approvePayroll(data.payrollId, data.approverId, data.approverRole, data.requesterBranchId);
  }

  @MessagePattern('hr.payroll.my_payslip')
  handleGetMyPayslip(@Payload() data: { employeeId: string; month?: number; year?: number }) {
    return this.payrollService.getMyPayslip(data.employeeId, data.month, data.year);
  }

  // ===================================================================
  // EMAIL MARKETING — Quản lý chiến dịch gửi Email Newsletter
  // ===================================================================

  /** Tạo chiến dịch email mới (Lưu DB đồng bộ và trả về POJO object) */
  @MessagePattern('email.campaign.create')
  async handleCreateEmailCampaign(@Payload() data: { dto: any; createdBy?: string }) {
    const res = await this.emailMarketingService.createCampaign(data.dto, data.createdBy);
    return JSON.parse(JSON.stringify(res));
  }

  /** Cập nhật thông tin chiến dịch email */
  @MessagePattern('email.campaign.update')
  async handleUpdateEmailCampaign(@Payload() data: { id: string; dto: any }) {
    const res = await this.emailMarketingService.updateCampaign(data.id, data.dto);
    return JSON.parse(JSON.stringify(res));
  }

  /** Lấy danh sách chiến dịch email (có thể lọc theo status) */
  @MessagePattern('email.campaign.get.all')
  async handleGetAllEmailCampaigns(@Payload() data: { status?: string }) {
    const res = await this.emailMarketingService.getAllCampaigns(data?.status);
    return JSON.parse(JSON.stringify(res));
  }

  /** Lấy chi tiết 1 chiến dịch email theo ID */
  @MessagePattern('email.campaign.get.by.id')
  async handleGetEmailCampaignById(@Payload() data: { id: string }) {
    const res = await this.emailMarketingService.getCampaignById(data.id);
    return JSON.parse(JSON.stringify(res));
  }

  /** Gửi email thử nghiệm tới địa chỉ bất kỳ để Admin preview bố cục */
  @MessagePattern('email.campaign.send_test')
  async handleSendTestEmail(@Payload() data: { campaignId: string; testEmail: string }) {
    const res = await this.emailMarketingService.sendTestEmail(data.campaignId, data.testEmail);
    return JSON.parse(JSON.stringify(res));
  }

  /** Kích hoạt gửi ngay hoặc Retry chiến dịch (Bất đồng bộ — Kafka Event) */
  @EventPattern('email.campaign.event.trigger')
  handleTriggerCampaign(@Payload() data: { campaignId: string }) {
    this.emailMarketingService.executeCampaignSend(data.campaignId).catch((err) => {
      console.error(`[Email] Lỗi khi trigger chiến dịch ${data.campaignId}: ${err.message}`);
    });
  }

  /** Lấy thống kê tiến độ gửi real-time của chiến dịch */
  @MessagePattern('email.campaign.stats')
  async handleGetCampaignStats(@Payload() data: { campaignId: string }) {
    const res = await this.emailMarketingService.getCampaignStats(data.campaignId);
    return JSON.parse(JSON.stringify(res));
  }

  /** Hủy lịch gửi chiến dịch email */
  @MessagePattern('email.campaign.cancel')
  async handleCancelCampaign(@Payload() data: { id: string }) {
    const res = await this.emailMarketingService.cancelCampaign(data.id);
    return JSON.parse(JSON.stringify(res));
  }

  /** Xóa vĩnh viễn chiến dịch email và log liên quan */
  @MessagePattern('email.campaign.delete')
  async handleDeleteCampaign(@Payload() data: { id: string }) {
    const res = await this.emailMarketingService.deleteCampaign(data.id);
    return JSON.parse(JSON.stringify(res));
  }

  /** Xử lý hủy đăng ký email marketing (Unsubscribe 1-click qua token) */
  @MessagePattern('email.newsletter.unsubscribe')
  async handleUnsubscribeNewsletter(@Payload() data: { token: string; email: string }) {
    const res = await this.emailMarketingService.unsubscribeNewsletter(data.token, data.email);
    return JSON.parse(JSON.stringify(res));
  }

  /** Xử lý Webhook từ Resend (email bounced, delivered, complained) */
  @EventPattern('email.resend.webhook')
  handleResendWebhook(@Payload() data: any) {
    this.emailMarketingService.handleResendWebhook(data).catch((err) => {
      console.error(`[Resend Webhook] Lỗi xử lý: ${err.message}`);
    });
  }
}
