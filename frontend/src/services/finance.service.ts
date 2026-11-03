import { AxiosInstance } from 'axios';
import api from './core/api';
import { API_ENDPOINTS } from '../constants/apiEndpoints';

export interface ExpensePayload {
  branchId: string;
  branchName?: string;
  category: 'RENT' | 'SALARY' | 'UTILITY' | 'OTHER';
  title: string;
  amount: number;
  transactionDate?: string;
  notes?: string;
  createdBy?: string;
}

export interface ExpenseItem extends ExpensePayload {
  _id: string;
  createdAt: string;
  updatedAt: string;
}

export interface PaymentVoucherPayload {
  branchId: string;
  branchName?: string;
  recipientType: 'SUPPLIER' | 'PARTNER' | 'OPERATIONAL' | 'SALARY' | 'OTHER';
  supplierId?: string;
  supplierName?: string;
  purchaseOrderId?: string;
  amount: number;
  paymentMethod: 'CASH' | 'BANK_TRANSFER';
  status?: 'COMPLETED' | 'PENDING' | 'CANCELLED';
  description: string;
  notes?: string;
  transactionDate?: string;
  createdBy?: string;
  createdByName?: string;
}

export interface PaymentVoucherItem extends PaymentVoucherPayload {
  _id: string;
  voucherCode: string;
  createdAt: string;
  updatedAt: string;
}

export interface ShiftDetail {
  shiftId: string;
  name: string;
  time: string;
  staffName: string;
  pharmacistName?: string;
  pharmacistId?: string;
  isScheduled: boolean;
  status: 'OPEN' | 'BALANCED' | 'CLOSED' | 'UNASSIGNED';
  ordersCount: number;
  cashInflow: number;
  digitalInflow: number;
  totalInflow: number;
  pettyExpenses: number;
  netFlow: number;
  openingFloat: number;
  closingDrawerBalance: number;
  balanceNote?: string;
  recentOrders: Array<{
    orderId: string;
    amount: number;
    paymentMethod: string;
    createdAt: string;
    customerName: string;
  }>;
}

export interface CashFlowSummary {
  viewType?: 'shift' | 'day' | 'week' | 'month';
  year: number;
  date?: string;
  totalRevenue?: number;
  totalCogs?: number;
  totalFixedExpenses?: number;
  totalExpense?: number;
  netProfit?: number;
  totalInflow?: number;
  totalOutflow?: number;
  netCashFlow?: number;
  totalCashInflow?: number;
  totalDigitalInflow?: number;
  totalVouchersOutflow?: number;
  cashDrawer?: {
    status: 'OPEN' | 'BALANCED' | 'CLOSED';
    initialFloat: number;
    currentBalance: number;
    isBalanced: boolean;
    lastVerifiedAt?: string;
  };
  shifts?: ShiftDetail[];
  monthlyChart: {
    month: string;
    revenue: number;
    cogs: number;
    fixedExpenses: number;
    vouchers?: number;
    totalExpenses: number;
    netProfit: number;
  }[];
  expensesCount: number;
  vouchersCount?: number;
  ordersCount: number;
}

export interface ExpenseQueryParams {
  branchId?: string;
  category?: string;
  year?: string;
}

export interface CashFlowQueryParams {
  branchId?: string;
  year?: string;
  viewType?: string;
  date?: string;
}

export interface PaymentVoucherQueryParams {
  branchId?: string;
  recipientType?: string;
  status?: string;
  startDate?: string;
  endDate?: string;
}

/**
 * Service contract for financial operations
 */
export interface IFinanceService {
  createExpense(payload: ExpensePayload): Promise<ExpenseItem>;
  getExpenses(params?: ExpenseQueryParams): Promise<ExpenseItem[]>;
  getCashFlowSummary(params?: CashFlowQueryParams): Promise<CashFlowSummary>;
  createPaymentVoucher(payload: PaymentVoucherPayload): Promise<PaymentVoucherItem>;
  getPaymentVouchers(params?: PaymentVoucherQueryParams): Promise<PaymentVoucherItem[]>;
}

/**
 * Object-Oriented Finance Service implementation with encapsulation and DI
 */
export class FinanceService implements IFinanceService {
  private readonly basePath: string = API_ENDPOINTS.FINANCE.BASE;

  constructor(private readonly client: AxiosInstance = api) {}

  public async createExpense(payload: ExpensePayload): Promise<ExpenseItem> {
    const response = await this.client.post<ExpenseItem>(`${this.basePath}/expenses`, payload);
    return response.data;
  }

  public async getExpenses(params?: ExpenseQueryParams): Promise<ExpenseItem[]> {
    const response = await this.client.get<ExpenseItem[]>(`${this.basePath}/expenses`, { params });
    return response.data;
  }

  public async getCashFlowSummary(params?: CashFlowQueryParams): Promise<CashFlowSummary> {
    const response = await this.client.get<CashFlowSummary>(`${this.basePath}/cashflow`, { params });
    return response.data;
  }

  public async createPaymentVoucher(payload: PaymentVoucherPayload): Promise<PaymentVoucherItem> {
    const response = await this.client.post<PaymentVoucherItem>(`${this.basePath}/payment-vouchers`, payload);
    return response.data;
  }

  public async getPaymentVouchers(params?: PaymentVoucherQueryParams): Promise<PaymentVoucherItem[]> {
    const response = await this.client.get<PaymentVoucherItem[]>(`${this.basePath}/payment-vouchers`, { params });
    return response.data;
  }
}

/**
 * Singleton instance export for backward compatibility
 */
export const financeService = new FinanceService();
export default financeService;
