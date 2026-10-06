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

      // 2. Fetch RFM segment & chronic refill prediction in parallel
      let clinical: CustomerClinicalSafety = {
        allergies: this.getStoredAllergies(cleanPhone),
        chronicConditions: this.getStoredChronicConditions(cleanPhone),
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

    // Store medical allergies & chronic notes locally for immediate counter safety
    if (dto.allergies && dto.allergies.length > 0) {
      this.saveStoredAllergies(cleanPhone, dto.allergies);
    }
    if (dto.chronicConditions && dto.chronicConditions.length > 0) {
      this.saveStoredChronicConditions(cleanPhone, dto.chronicConditions);
    }

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
      // If user already exists, ignore and continue to fetch loyalty info
      console.warn('Registration notice:', regErr.response?.data?.message || regErr.message);
    }

    // Attempt to lookup fresh loyalty profile
    const existing = await this.lookupCustomer(cleanPhone);
    if (existing) {
      if (dto.allergies) existing.clinical.allergies = dto.allergies;
      if (dto.chronicConditions) existing.clinical.chronicConditions = dto.chronicConditions;
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
   * Storage helpers for clinical flags (allergies & chronic conditions)
   */
  getStoredAllergies(phone: string): string[] {
    try {
      const raw = localStorage.getItem(`pharma_allergies_${phone}`);
      return raw ? JSON.parse(raw) : [];
    } catch {
      return [];
    }
  },

  saveStoredAllergies(phone: string, allergies: string[]): void {
    try {
      localStorage.setItem(`pharma_allergies_${phone}`, JSON.stringify(allergies));
    } catch (e) {
      console.warn('Failed to save allergies:', e);
    }
  },

  getStoredChronicConditions(phone: string): string[] {
    try {
      const raw = localStorage.getItem(`pharma_chronic_${phone}`);
      return raw ? JSON.parse(raw) : [];
    } catch {
      return [];
    }
  },

  saveStoredChronicConditions(phone: string, conditions: string[]): void {
    try {
      localStorage.setItem(`pharma_chronic_${phone}`, JSON.stringify(conditions));
    } catch (e) {
      console.warn('Failed to save chronic conditions:', e);
    }
  },
};
