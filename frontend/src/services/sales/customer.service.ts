import api from '../core/api';
import { API_ENDPOINTS } from '../../constants/apiEndpoints';

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
  userId?: string;
  fullName?: string;
  phone?: string;
  email?: string;
  tier?: string;
  allergies?: string[];
  allergicMedicines?: string[];
  allergicIngredients?: string[];
  chronicConditions?: string[];
  bloodType?: string;
  medicalNotes?: string;
  hasCompletedHealthOnboarding?: boolean;
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

export interface AllergyConflict {
  medicineName: string;
  activeIngredient: string;
  conflictType: 'ALLERGY_MEDICINE' | 'ALLERGY_INGREDIENT' | 'CROSS_REACTIVITY' | 'CONTRAINDICATION_CHRONIC';
  severity: 'CRITICAL' | 'HIGH' | 'MODERATE';
  reason: string;
  clinicalExplanation: string;
  suggestedAction: string;
  safeAlternatives: Array<{
    name: string;
    activeIngredient: string;
    indication: string;
    reason: string;
  }>;
}

export interface AllergyCheckResult {
  hasConflict: boolean;
  severity: 'CRITICAL' | 'HIGH' | 'MODERATE' | 'SAFE';
  conflicts: AllergyConflict[];
  safeAlternatives: Array<{
    name: string;
    activeIngredient: string;
    indication: string;
    reason: string;
  }>;
  message: string;
}

export interface FullCustomerProfile {
  loyalty: CustomerLoyaltyData;
  clinical: CustomerClinicalSafety;
  clinicalWarning?: string;
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
      const loyaltyRes = await api.get(API_ENDPOINTS.USERS.LOYALTY_LOOKUP(cleanPhone));
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
          api.get(API_ENDPOINTS.USERS.RFM_CUSTOMER(cleanPhone)),
          api.get(API_ENDPOINTS.RECOMMENDATIONS.FOR_YOU, { params: { phone: cleanPhone } }),
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
   * Đăng ký nhanh tài khoản khách hàng tại quầy POS (Quy trình 3-5 giây)
   * Tuân thủ bảo mật thông tin & an toàn lâm sàng GPP:
   * 1. Sinh mật khẩu ngẫu nhiên bảo mật cao (ngăn ngừa đăng nhập trái phép qua SĐT + mật khẩu mặc định).
   * 2. Fail-Fast: Ngừng ngay khi đăng ký thất bại hoặc trùng SĐT (409 Conflict), tuyệt đối không ghi đè dị ứng của khách cũ.
   * 3. Báo rõ khi tạo tài khoản thành công nhưng bước lưu dị ứng lâm sàng vào MongoDB gặp sự cố.
   * 4. Điểm tích lũy khởi tạo là 0, không trả về điểm giả mạo (Zero Mock Data).
   */
  async quickRegister(dto: QuickRegisterCustomerDto): Promise<FullCustomerProfile> {
    const validation = this.validateCustomer(dto);
    if (!validation.valid) {
      throw new Error(validation.error);
    }

    const cleanPhone = dto.phone.trim().replace(/[\s.-]/g, '');
    const cleanName = dto.fullName.trim();
    const cleanEmail = dto.email?.trim() || `${cleanPhone}@khachhang.wdp301.local`;

    // Sinh mật khẩu ngẫu nhiên an toàn cao thay vì mật khẩu cố định
    const randomChars = 'ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnopqrstuvwxyz23456789!@#$%^&*';
    let secureRandomPassword = '';
    if (typeof window !== 'undefined' && window.crypto && window.crypto.getRandomValues) {
      const randomValues = new Uint32Array(16);
      window.crypto.getRandomValues(randomValues);
      for (let i = 0; i < 16; i++) {
        secureRandomPassword += randomChars.charAt(randomValues[i] % randomChars.length);
      }
    } else {
      for (let i = 0; i < 16; i++) {
        secureRandomPassword += randomChars.charAt(Math.floor(Math.random() * randomChars.length));
      }
    }
    secureRandomPassword += 'Aa1!'; // Đảm bảo đáp ứng đầy đủ chữ hoa, chữ thường, số, ký tự đặc biệt

    let realUserId: string | undefined;
    try {
      // 1. Đăng ký tài khoản trong hệ thống Auth
      const regRes = await api.post(API_ENDPOINTS.AUTH.REGISTER, {
        fullName: cleanName,
        email: cleanEmail,
        password: secureRandomPassword,
        phone: cleanPhone,
        role: 'user',
        agreePrivacy: true,
      });
      realUserId = regRes?.data?.user?.id || regRes?.data?.user?._id || regRes?.data?.id;
    } catch (regErr: any) {
      const status = regErr?.response?.status;
      const errMsg = regErr?.response?.data?.message || regErr?.message || '';
      // Nguyên tắc Fail-fast & An toàn lâm sàng:
      // Nếu số điện thoại đã tồn tại (409 Conflict) hoặc lỗi đăng ký, DỪNG NGAY LẬP TỨC!
      // Tuyệt đối không nuốt lỗi 409 để không chạy tiếp lệnh ghi đè hồ sơ dị ứng của khách hàng cũ.
      if (status === 409 || errMsg.toLowerCase().includes('đã tồn tại') || errMsg.toLowerCase().includes('already exists') || errMsg.toLowerCase().includes('tồn tại')) {
        throw new Error(
          `Số điện thoại ${cleanPhone} đã tồn tại trong hệ thống. Vui lòng tra cứu khách hàng cũ hoặc cập nhật hồ sơ bệnh án theo ID khách hàng, không thể tạo mới đè lên.`
        );
      }
      throw new Error(`Đăng ký tài khoản khách hàng thất bại: ${errMsg}`);
    }

    // 2. Lưu hồ sơ an toàn lâm sàng (Dị ứng thuốc & bệnh nền mãn tính) vào MongoDB
    const hasClinicalData = (dto.allergies && dto.allergies.length > 0) || (dto.chronicConditions && dto.chronicConditions.length > 0);
    if (hasClinicalData) {
      try {
        await api.put(API_ENDPOINTS.USERS.CLINICAL_SAFETY(cleanPhone), {
          allergies: dto.allergies || [],
          chronicConditions: dto.chronicConditions || [],
        });
      } catch (clinicalErr: any) {
        // BẢO VỆ AN TOÀN LÂM SÀNG: Tuyệt đối không nuốt lỗi để tạo ra khách có dị ứng rỗng!
        // Ném lỗi có cấu trúc để UI giữ nguyên trạng thái chưa xác minh và hiển thị nút "Thử lưu lại hồ sơ dị ứng"
        const clinicalError: any = new Error(
          `Đã tạo tài khoản (${cleanName} - ID: ${realUserId || cleanPhone}), nhưng bước lưu hồ sơ dị ứng/bệnh nền vào hệ thống gặp sự cố (${clinicalErr?.response?.data?.message || clinicalErr?.message || 'Lỗi mạng'}). Dược sĩ vui lòng bấm "Thử lưu lại hồ sơ dị ứng" để đảm bảo an toàn!`
        );
        clinicalError.isClinicalSaveError = true;
        clinicalError.userId = realUserId;
        clinicalError.phone = cleanPhone;
        clinicalError.fullName = cleanName;
        clinicalError.allergies = dto.allergies || [];
        clinicalError.chronicConditions = dto.chronicConditions || [];
        throw clinicalError;
      }
    }

    // 3. Tra cứu hồ sơ khách hàng mới tạo từ máy chủ
    const existing = await this.lookupCustomer(cleanPhone);
    if (existing) {
      if (realUserId && !existing.loyalty.userId) {
        existing.loyalty.userId = realUserId;
      }
      this.saveRecentCustomer({
        phone: cleanPhone,
        fullName: cleanName,
        tier: existing.loyalty.tier || 'Bronze',
        points: existing.loyalty.points || 0,
        lastVisited: Date.now(),
      });
      return existing;
    }

    // Bỏ hồ sơ dự phòng thiếu ID! Chỉ trả về profile khi có ID thật từ kết quả tạo Auth
    if (realUserId) {
      const verifiedProfile: FullCustomerProfile = {
        loyalty: {
          userId: realUserId,
          fullName: cleanName,
          phone: cleanPhone,
          email: cleanEmail,
          points: 0, // Điểm bắt đầu thực tế là 0 (Zero Mock Data)
          accumulatedPoints: 0,
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
        points: 0,
        lastVisited: Date.now(),
      });

      return verifiedProfile;
    }

    throw new Error('Đăng ký tài khoản thành công nhưng không tìm thấy thông tin định danh ID từ máy chủ.');
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
   * Cập nhật hồ sơ bệnh án (Dược sĩ hoặc Quản trị viên cập nhật cho khách hàng qua SĐT)
   */
  async updateClinicalSafety(
    phone: string,
    data: {
      allergies?: string[];
      allergicMedicines?: string[];
      allergicIngredients?: string[];
      chronicConditions?: string[];
      bloodType?: string;
      medicalNotes?: string;
    },
  ): Promise<any> {
    const cleanPhone = phone.trim().replace(/[\s.-]/g, '');
    const res = await api.put(API_ENDPOINTS.USERS.CLINICAL_SAFETY(cleanPhone), data);
    return res.data;
  },

  /**
   * Lấy hồ sơ bệnh án qua SĐT khách hàng
   */
  async getClinicalSafety(phone: string): Promise<CustomerClinicalSafety> {
    const cleanPhone = phone.trim().replace(/[\s.-]/g, '');
    try {
      const res = await api.get(API_ENDPOINTS.USERS.CLINICAL_SAFETY(cleanPhone));
      return {
        allergies: res.data?.allergies || [],
        allergicMedicines: res.data?.allergicMedicines || [],
        allergicIngredients: res.data?.allergicIngredients || [],
        chronicConditions: res.data?.chronicConditions || [],
        bloodType: res.data?.bloodType || null,
        medicalNotes: res.data?.medicalNotes || null,
        hasCompletedHealthOnboarding: res.data?.hasCompletedHealthOnboarding ?? false,
      };
    } catch {
      return {
        allergies: [],
        allergicMedicines: [],
        allergicIngredients: [],
        chronicConditions: [],
        hasCompletedHealthOnboarding: false,
      };
    }
  },

  /**
   * Khách hàng tự lấy hồ sơ bệnh án & tiền sử y tế của mình
   */
  async getMyClinicalProfile(): Promise<CustomerClinicalSafety> {
    try {
      const res = await api.get(API_ENDPOINTS.USERS.CLINICAL_SAFETY_ME);
      return {
        userId: res.data?.userId,
        fullName: res.data?.fullName,
        phone: res.data?.phone,
        email: res.data?.email,
        tier: res.data?.tier,
        allergies: res.data?.allergies || [],
        allergicMedicines: res.data?.allergicMedicines || [],
        allergicIngredients: res.data?.allergicIngredients || [],
        chronicConditions: res.data?.chronicConditions || [],
        bloodType: res.data?.bloodType || null,
        medicalNotes: res.data?.medicalNotes || null,
        hasCompletedHealthOnboarding: res.data?.hasCompletedHealthOnboarding ?? false,
      };
    } catch (err: any) {
      if (err.response?.status === 401) {
        throw new Error('UNAUTHORIZED');
      }
      return {
        allergies: [],
        allergicMedicines: [],
        allergicIngredients: [],
        chronicConditions: [],
        hasCompletedHealthOnboarding: false,
      };
    }
  },

  /**
   * Khách hàng tự cập nhật hồ sơ bệnh án của mình (hoặc hoàn tất Onboarding lần đầu)
   */
  async updateMyClinicalProfile(data: {
    allergies?: string[];
    allergicMedicines?: string[];
    allergicIngredients?: string[];
    chronicConditions?: string[];
    bloodType?: string;
    medicalNotes?: string;
    hasCompletedHealthOnboarding?: boolean;
  }): Promise<any> {
    const res = await api.put(API_ENDPOINTS.USERS.CLINICAL_SAFETY_ME, data);
    return res.data;
  },

  /**
   * UC-107: Đối soát chéo giỏ hàng với tiền sử dị ứng và bệnh lý nền của bệnh nhân
   * Trả về phân tích nguy cơ lâm sàng và gợi ý các thuốc thay thế an toàn
   */
  async checkCartAllergyContraindications(payload: {
    customerProfile: Partial<CustomerClinicalSafety>;
    cartItems: Array<{
      id?: string;
      _id?: string;
      medicineId?: string;
      name: string;
      activeIngredient?: string;
      contraindications?: string;
      indications?: string;
      category?: string;
      price?: number;
    }>;
  }): Promise<AllergyCheckResult> {
    const res = await api.post(API_ENDPOINTS.PRESCRIPTIONS.ALLERGY_CHECK, payload);
    return res.data;
  },
};

