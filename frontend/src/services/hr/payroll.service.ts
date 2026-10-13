import api from '../core/api';
import { API_ENDPOINTS } from '../../constants/apiEndpoints';

export interface PayrollItem {
  employeeId: string;
  employeeName: string;
  role: string;
  baseSalary: number;
  standardShifts: number;
  actualShifts: number;
  missingShifts: number;
  lateMinutes: number;
  otShifts: number;
  shiftRate?: number;
  standardSalary: number;
  otSalary: number;
  certificateAllowance: number;
  picAllowance: number;
  mealAllowanceRate?: number;
  mealAllowance: number;
  nightShiftAllowance: number;
  personalSalesRevenue: number;
  commissionRate: number;
  commissionAmount: number;
  branchBonus: number;
  penalties: number;
  manualAdjustment: number;
  grossSalary: number;
  netSalary: number;
  adjustmentNote?: string;
}

export interface PayrollPeriod {
  _id: string;
  branchId: string;
  month: number;
  year: number;
  status: 'DRAFT' | 'SUBMITTED' | 'APPROVED' | 'PAID';
  mealAllowanceRate?: number;
  totalGross: number;
  totalNet: number;
  items: PayrollItem[];
  calculatedBy?: string;
  calculatedByName?: string;
  submittedAt?: string;
  approvedAt?: string;
  createdAt: string;
  updatedAt: string;
}

export interface PersonalPayslip {
  payrollId: string;
  branchId: string;
  month: number;
  year: number;
  status: string;
  item: PayrollItem;
  submittedAt?: string;
  approvedAt?: string;
}

export const payrollService = {
  calculatePayroll: async (month: number, year: number, branchId?: string, mealAllowanceRate?: number) => {
    const response = await api.post(API_ENDPOINTS.HR.PAYROLL_CALCULATE, { month, year, branchId, mealAllowanceRate });
    return response.data as PayrollPeriod;
  },

  listPayrolls: async (year?: number, branchId?: string) => {
    const params: any = {};
    if (year) params.year = year;
    if (branchId) params.branchId = branchId;
    const response = await api.get(API_ENDPOINTS.HR.PAYROLL_LIST, { params });
    return response.data as PayrollPeriod[];
  },

  getPayrollDetail: async (id: string) => {
    const response = await api.get(API_ENDPOINTS.HR.PAYROLL_DETAIL(id));
    return response.data as PayrollPeriod;
  },

  adjustPayrollItem: async (payrollId: string, data: { employeeId: string; manualAdjustment: number; penalties?: number; adjustmentNote?: string }) => {
    const response = await api.patch(API_ENDPOINTS.HR.PAYROLL_ADJUST(payrollId), data);
    return response.data as PayrollPeriod;
  },

  submitPayroll: async (payrollId: string) => {
    const response = await api.patch(API_ENDPOINTS.HR.PAYROLL_SUBMIT(payrollId));
    return response.data as PayrollPeriod;
  },

  approvePayroll: async (payrollId: string) => {
    const response = await api.patch(API_ENDPOINTS.HR.PAYROLL_APPROVE(payrollId));
    return response.data as PayrollPeriod;
  },

  getMyPayslips: async (month?: number, year?: number) => {
    const params: any = {};
    if (month) params.month = month;
    if (year) params.year = year;
    const response = await api.get(API_ENDPOINTS.HR.PAYROLL_MY_PAYSLIP, { params });
    return response.data as PersonalPayslip[];
  },
};
