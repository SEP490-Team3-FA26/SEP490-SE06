import api from '../core/api';

export interface CustomerLoyaltyData {
  userId?: string;
  fullName: string;
  phone: string;
  email?: string;
  role?: 'user' | 'guest' | 'customer';
  points: number;
  accumulatedPoints?: number;
  tier: string;
  multiplier?: number;
  conversionRate?: number;
}

export interface CustomerClinicalSafety {
  allergies?: string[];
  chronicConditions?: string[];
  refillReminder?: {
    isDue: boolean;
    daysRemaining: number;
    patientName?: string;
    message: string;
    recommendedVoucher?: string;
    suggestedProducts?: any[];
  } | null;
  recommendedVoucher?: string;
  segment?: string;
  customerType?: 'CHRONIC_PATIENT' | 'GENERAL_RETAIL';
  totalOrders12M?: number;
  totalSpent12M?: number;
  avgOrderValue?: number;
  lastOrderDate?: string;
}

export interface FullCustomerProfile {
  loyalty: CustomerLoyaltyData;
  clinical: CustomerClinicalSafety;
}

export interface QuickRegisterCustomerDto {
  fullName: string;
  phone: string;
  email?: string;
  allergies?: string[];
  chronicConditions?: string[];
  notes?: string;
}

export interface RecentCustomerRecord {
  phone: string;
  fullName: string;
  tier: string;
  points: number;
  lastVisited: number;
}

const RECENT_CUSTOMERS_STORAGE_KEY = 'pharma_recent_pos_customers';

export const customerService = {
  /**
   * Look up complete customer profile by phone or membership account number
   * Aggregates Loyalty Points, RFM Segmentation, and Chronic Refill Recommendation
   */
  async lookupCustomer(phone: string): Promise<FullCustomerProfile | null> {
    const cleanPhone = phone.trim().replace(/\s+/g, '');
    if (!cleanPhone) return null;

    try {
      // 1. Fetch loyalty info via API Gateway
      const loyaltyRes = await api.get(`/api/users/loyalty/lookup?phone=${encodeURIComponent(cleanPhone)}`);
      if (!loyaltyRes.data || loyaltyRes.data.error) {
        return null;
      }

      const loyalty: CustomerLoyaltyData = {
        userId: loyaltyRes.data.userId,
        fullName: loyaltyRes.data.fullName || 'Khách hàng',
        phone: loyaltyRes.data.phone || cleanPhone,
        email: loyaltyRes.data.email || '',
        points: loyaltyRes.data.points || 0,
        accumulatedPoints: loyaltyRes.data.accumulatedPoints || 0,
        tier: loyaltyRes.data.tier || 'Bronze',
        multiplier: loyaltyRes.data.multiplier || 1.0,
        conversionRate: loyaltyRes.data.conversionRate || 1,
      };

      // 2. Fetch RFM segment & chronic refill prediction in parallel (allergies & chronic conditions from MongoDB)
      let clinical: CustomerClinicalSafety = {
        allergies: loyaltyRes.data.allergies || [],
        chronicConditions: loyaltyRes.data.chronicConditions || [],
        refillReminder: null,
      };

      try {
        const [rfmRes, recRes] = await Promise.allSettled([
          api.get(`/api/users/rfm/customer/${encodeURIComponent(cleanPhone)}`),
          api.get('/api/recommendations/for-you', { params: { phone: cleanPhone } }),
        ]);

        if (rfmRes.status === 'fulfilled' && rfmRes.value?.data) {
          const rfmData = rfmRes.value.data;
          clinical.segment = rfmData.segment;
          clinical.customerType = rfmData.customerType;
          clinical.recommendedVoucher = rfmData.recommendedVoucher;
          clinical.totalOrders12M = rfmData.totalOrders12M;
          clinical.totalSpent12M = rfmData.totalSpent12M;
          clinical.avgOrderValue = rfmData.avgOrderValue;
          clinical.lastOrderDate = rfmData.lastOrderDate;
        }

        if (recRes.status === 'fulfilled' && recRes.value?.data) {
          const recData = recRes.value.data;
          if (recData.chronicReminder) {
            clinical.refillReminder = recData.chronicReminder;
          }
        }
      } catch (e) {
        console.warn('Clinical safety enrichment warning:', e);
      }

      // Save to recent customers list for instant re-selection during shift
      this.saveRecentCustomer({
        phone: loyalty.phone,
        fullName: loyalty.fullName,
        tier: loyalty.tier,
        points: loyalty.points,
        lastVisited: Date.now(),
      });

      return { loyalty, clinical };
    } catch (err: any) {
      if (err.response?.status === 404) {
        return null;
      }
      throw err;
    }
  },

  /**
   * Validation helper for customer data
   */
  validateCustomer(dto: { fullName?: string; phone?: string; email?: string }): { valid: boolean; error?: string } {
    const cleanName = (dto.fullName || '').trim();
    const cleanPhone = (dto.phone || '').trim().replace(/[\s.-]/g, '');
    const cleanEmail = (dto.email || '').trim();

    if (dto.fullName !== undefined) {
      if (!cleanName) {
        return { valid: false, error: 'Vui lòng nhập họ và tên khách hàng.' };
      }
      if (cleanName.length < 2) {
        return { valid: false, error: 'Họ và tên phải có ít nhất 2 ký tự.' };
      }
      if (/\d/.test(cleanName)) {
        return { valid: false, error: 'Họ và tên không được chứa chữ số.' };
      }
    }

    if (dto.phone !== undefined) {
      if (!cleanPhone) {
        return { valid: false, error: 'Vui lòng nhập số điện thoại.' };
      }
      const vnPhoneRegex = /^(0|\+84)(3[2-9]|5[2689]|7[06-9]|8[1-9]|9[0-9])[0-9]{7}$/;
      if (!vnPhoneRegex.test(cleanPhone)) {
        return { valid: false, error: 'Số điện thoại không hợp lệ (Gồm 10 số, bắt đầu bằng 03, 05, 07, 08, 09).' };
      }
    }

    if (cleanEmail) {
      const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
      if (!emailRegex.test(cleanEmail)) {
        return { valid: false, error: 'Email không đúng định dạng (Ví dụ: khachhang@gmail.com).' };
      }
    }

    return { valid: true };
  },

  /**
   * Fast customer registration at counter (3-5 seconds workflow)
   */
  async quickRegister(dto: QuickRegisterCustomerDto): Promise<FullCustomerProfile> {
    const validation = this.validateCustomer(dto);
    if (!validation.valid) {
      throw new Error(validation.error);
    }

    const cleanPhone = dto.phone.trim().replace(/[\s.-]/g, '');
    const cleanName = dto.fullName.trim();
    const cleanEmail = dto.email?.trim() || `${cleanPhone}@khachhang.wdp301.local`;
    const defaultPassword = 'abccamon';

    try {
      // Register account in system
      await api.post('/api/auth/register', {
        fullName: cleanName,
        email: cleanEmail,
        password: defaultPassword,
        phone: cleanPhone,
        role: 'user',
      });
    } catch (regErr: any) {
      // If user already exists, ignore and continue
      console.warn('Registration notice:', regErr.response?.data?.message || regErr.message);
    }

    // Persist medical allergies & chronic notes to MongoDB for clinical safety
    if ((dto.allergies && dto.allergies.length > 0) || (dto.chronicConditions && dto.chronicConditions.length > 0)) {
      try {
        await api.put(`/api/users/clinical-safety/${encodeURIComponent(cleanPhone)}`, {
          allergies: dto.allergies || [],
          chronicConditions: dto.chronicConditions || [],
        });
      } catch (clinicalErr: any) {
        console.warn('Persist clinical flags warning:', clinicalErr);
      }
    }

    // Attempt to lookup fresh loyalty profile with persisted clinical data
    const existing = await this.lookupCustomer(cleanPhone);
    if (existing) {
      return existing;
    }

    // Fallback profile if gateway delay
    const fallbackProfile: FullCustomerProfile = {
      loyalty: {
        fullName: cleanName,
        phone: cleanPhone,
        email: cleanEmail,
        points: 1000, // Welcome points
        accumulatedPoints: 1000,
        tier: 'Bronze',
        multiplier: 1.0,
        conversionRate: 1,
      },
      clinical: {
        allergies: dto.allergies || [],
        chronicConditions: dto.chronicConditions || [],
        refillReminder: null,
      },
    };

    this.saveRecentCustomer({
      phone: cleanPhone,
      fullName: cleanName,
      tier: 'Bronze',
      points: 1000,
      lastVisited: Date.now(),
    });

    return fallbackProfile;
  },

  /**
   * Get recently visited customers in the current pharmacist shift
   */
  getRecentCustomers(): RecentCustomerRecord[] {
    try {
      const data = localStorage.getItem(RECENT_CUSTOMERS_STORAGE_KEY);
      if (!data) return [];
      const parsed: RecentCustomerRecord[] = JSON.parse(data);
      return Array.isArray(parsed) ? parsed.slice(0, 5) : [];
    } catch {
      return [];
    }
  },

  /**
   * Save customer to recent list in localStorage
   */
  saveRecentCustomer(record: RecentCustomerRecord): void {
    try {
      const list = this.getRecentCustomers().filter((c) => c.phone !== record.phone);
      list.unshift(record);
      localStorage.setItem(RECENT_CUSTOMERS_STORAGE_KEY, JSON.stringify(list.slice(0, 6)));
    } catch (e) {
      console.warn('Failed to save recent customer:', e);
    }
  },

  /**
   * Update clinical flags (allergies & chronic conditions) directly in MongoDB via API Gateway
   */
  async updateClinicalSafety(phone: string, data: { allergies?: string[]; chronicConditions?: string[] }): Promise<any> {
    const cleanPhone = phone.trim().replace(/[\s.-]/g, '');
    const res = await api.put(`/api/users/clinical-safety/${encodeURIComponent(cleanPhone)}`, data);
    return res.data;
  },

  /**
   * Get clinical flags (allergies & chronic conditions) directly from MongoDB
   */
  async getClinicalSafety(phone: string): Promise<{ allergies: string[]; chronicConditions: string[] }> {
    const cleanPhone = phone.trim().replace(/[\s.-]/g, '');
    try {
      const res = await api.get(`/api/users/clinical-safety/${encodeURIComponent(cleanPhone)}`);
      return {
        allergies: res.data?.allergies || [],
        chronicConditions: res.data?.chronicConditions || [],
      };
    } catch {
      return { allergies: [], chronicConditions: [] };
    }
  },
};
