/**
 * Centralized Barrel Export for all Frontend Services & API Endpoints
 * Chuẩn hóa truy cập dịch vụ và quản trị URL tập trung theo Playbook v2.0
 */

export { API_ENDPOINTS } from '../constants/apiEndpoints';
export { default as api } from './core/api';

// Auth & Users
export { authService } from './auth/auth.service';
export { userService } from './auth/user.service';

// Admin & HR
export { branchService } from './admin/branch.service';
export { employeeService } from './admin/employee.service';
export { hrService } from './hr/hr.service';

// Inventory & Warehouse
export { medicineService } from './inventory/medicine.service';
export { stockTransferService } from './inventory/stockTransfer.service';
export { inventoryCheckService } from './inventory/inventoryCheck.service';
export { inventoryMapService } from './inventory/inventoryMap.service';
export { pricingService } from './inventory/pricing.service';
export { sensorTelemetryService } from './inventory/sensorTelemetry.service';

// Procurement & Suppliers
export { supplierService } from './purchase/supplier.service';
export { purchaseOrderService } from './purchase/purchaseOrder.service';
export { purchaseRequisitionService } from './purchase/purchaseRequisition.service';
export { goodsReceiptService } from './purchase/goodsReceipt.service';
export { rfqService } from './purchase/rfq.service';

// Sales & Customer
export { orderService } from './sales/order.service';
export { cartService } from './sales/cart.service';
export { voucherService } from './sales/voucher.service';
export { prescriptionService } from './sales/prescription.service';
export { reconciliationService } from './sales/reconciliation.service';
export { campaignService } from './sales/campaign.service';
export { customerService } from './sales/customer.service';
export { rfmService } from './sales/rfm.service';
export { feedbackService } from './sales/feedback.service';

// Reports, Finance & BI
export { reportService } from './report/report.service';
export { financeService } from './finance.service';
export { supplyChainService } from './supplyChain.service';

// AI, Recommendations, Audits & Notifications
export { aiClinicalService } from './ai/aiClinical.service';
export { recommendationService } from './recommendation/recommendation.service';
export { auditService } from './audit/audit.service';
export { notificationService } from './notification.service';
