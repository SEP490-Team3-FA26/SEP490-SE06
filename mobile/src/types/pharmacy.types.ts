// pharmacy.types.ts - Type definitions for Pharma ERP Mobile (WDP301)

export enum UserRole {
  ADMIN = 'admin',
  HEAD_BRANCH = 'headBranch', // Giám Đốc Chi Nhánh / Director
  WAREHOUSE = 'warehouse',   // Quản Lý Kho / Thủ Kho
  BRANCH = 'branch',         // Quản Lý Cơ Sở / Chi Nhánh
  PHARMACIST = 'pharmacist', // Dược Sĩ Bán Hàng
  CUSTOMER = 'customer',     // Khách Hàng
}

export const USER_ROLE_LABELS: Record<string, string> = {
  [UserRole.ADMIN]: 'Admin Hệ Thống',
  [UserRole.HEAD_BRANCH]: 'Giám Đốc Chi Nhánh',
  [UserRole.WAREHOUSE]: 'Quản Lý Kho',
  [UserRole.BRANCH]: 'Quản Lý Cơ Sở',
  [UserRole.PHARMACIST]: 'Dược Sĩ Bán Hàng',
  [UserRole.CUSTOMER]: 'Khách Hàng (Store)',
  director: 'Giám Đốc Chi Nhánh',
};

export interface UserProfile {
  id: string;
  _id?: string;
  name: string;
  firstName?: string;
  lastName?: string;
  email: string;
  phone?: string;
  role: string;
  branchId?: string;
  branchName?: string;
  points?: number;
  avatar?: string;
  isVerified?: boolean;
  isActive?: boolean;
  address?: string;
  gender?: string;
  birthDate?: string;
  createdAt?: string;
}

export interface MedicineBatch {
  batchNo: string;
  expDate: string;
  stock: number;
  status?: string;
}

export interface Medicine {
  id: string;
  _id?: string;
  name: string;
  price: number;
  unit: string;
  active: string;
  active_ingredient?: string;
  category: string;
  stock: number;
  isRx: boolean;
  batches: MedicineBatch[];
  image?: string;
  images?: string[];
  cong_dung?: string;
  indications?: string;
  cach_dung?: string;
  default_dosage?: string;
  tac_dung_phu?: string;
  side_effects?: string;
  luu_y?: string;
  contraindications?: string;
  bao_quan?: string;
  manufacturer?: string;
  registration_number?: string;
  dosage_form?: string;
}

export interface CartItem {
  medicine: Medicine;
  quantity: number;
  batchNo?: string;
  selectedUnit?: string;
}

export interface Voucher {
  id: string;
  _id?: string;
  code: string;
  discountType: 'PERCENT' | 'FIXED';
  discountValue: number;
  minOrderValue?: number;
  maxDiscount?: number;
  expDate?: string;
  description?: string;
  isActive?: boolean;
}

export interface OrderItem {
  medicineId: string;
  name: string;
  quantity: number;
  price: number;
  unit: string;
  batchNo?: string;
}

export interface Order {
  id: string;
  _id?: string;
  orderCode?: string;
  customerName?: string;
  phone?: string;
  items: OrderItem[];
  totalAmount: number;
  discountAmount?: number;
  finalAmount: number;
  paymentMethod: 'CASH' | 'PAYOS' | 'BANK_TRANSFER' | 'COD';
  paymentStatus: 'PENDING' | 'PAID' | 'FAILED' | 'REFUNDED';
  status: 'PENDING' | 'CONFIRMED' | 'PROCESSING' | 'COMPLETED' | 'CANCELLED';
  branchId?: string;
  branchName?: string;
  shippingAddress?: string;
  note?: string;
  createdAt?: string;
}

export interface Employee {
  id: string;
  _id?: string;
  name: string;
  email: string;
  phone: string;
  role: string;
  branchId?: string;
  branchName?: string;
  isActive: boolean;
  createdAt?: string;
}

export interface Branch {
  id: string;
  _id?: string;
  name: string;
  address: string;
  phone?: string;
  managerName?: string;
  status?: string;
}

export interface StockTransferItem {
  medicineId: string;
  name: string;
  batchNo: string;
  quantity: number;
  unit: string;
}

export interface StockTransfer {
  id: string;
  _id?: string;
  transferCode?: string;
  fromBranchId: string;
  fromBranchName?: string;
  toBranchId: string;
  toBranchName?: string;
  items: StockTransferItem[];
  status: 'PENDING' | 'APPROVED' | 'IN_TRANSIT' | 'COMPLETED' | 'REJECTED';
  reason?: string;
  createdBy?: string;
  createdAt?: string;
}

export interface AuditLog {
  id: string;
  _id?: string;
  action: string;
  userId?: string;
  userName?: string;
  userRole?: string;
  entityName?: string;
  entityId?: string;
  details?: any;
  ipAddress?: string;
  createdAt: string;
}

export interface SafeStockChainItem {
  id: string;
  medicineName: string;
  currentStock: number;
  safeStockThreshold: number;
  leadTimeDays: number;
  predictedDemand: number;
  recommendedReplenishment: number;
  urgency: 'HIGH' | 'MEDIUM' | 'LOW' | 'NORMAL';
  branchesStock?: Array<{ branchName: string; stock: number }>;
}

export interface DashboardSummary {
  revenueToday: number;
  revenueThisMonth: number;
  totalOrders: number;
  totalCustomers: number;
  totalMedicines: number;
  lowStockCount: number;
  pendingTransfersCount: number;
  branchPerformance?: Array<{
    branchId: string;
    branchName: string;
    revenue: number;
    orderCount: number;
  }>;
  recentTransactions?: any[];
}

export interface AppNotification {
  id: string;
  _id?: string;
  title: string;
  message: string;
  type: string;
  isRead: boolean;
  createdAt: string;
  data?: any;
}

export interface SamplePrescription {
  filename: string;
  title: string;
  diagnosis?: string;
  doctor?: string;
  previewUrl?: string;
}
