import { useState, useEffect, useRef, useCallback } from 'react';
import {
  customerService,
  FullCustomerProfile,
  RecentCustomerRecord,
  QuickRegisterCustomerDto,
} from '../services/sales/customer.service';

export interface UseCustomerLookupOptions {
  onCustomerSelected?: (customer: FullCustomerProfile | null) => void;
  showToast?: (message: string, type?: 'success' | 'error' | 'warning' | 'info') => void;
}

export function useCustomerLookup(options?: UseCustomerLookupOptions) {
  const { onCustomerSelected, showToast } = options || {};

  const [customer, setCustomer] = useState<FullCustomerProfile | null>(null);
  const [isWalkIn, setIsWalkIn] = useState<boolean>(false);
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [isSearching, setIsSearching] = useState<boolean>(false);
  const [searchError, setSearchError] = useState<string | null>(null);
  const [isNotFound, setIsNotFound] = useState<boolean>(false);
  const [recentCustomers, setRecentCustomers] = useState<RecentCustomerRecord[]>([]);

  // Modals visibility
  const [isRegisterOpen, setIsRegisterOpen] = useState<boolean>(false);
  const [isClinicalModalOpen, setIsClinicalModalOpen] = useState<boolean>(false);

  // Input reference for customer phone input
  const inputRef = useRef<HTMLInputElement | null>(null);

  // Load recent customers on mount
  const refreshRecentCustomers = useCallback(() => {
    setRecentCustomers(customerService.getRecentCustomers());
  }, []);

  useEffect(() => {
    refreshRecentCustomers();
  }, [refreshRecentCustomers]);


  // Search customer by phone or membership account
  const searchCustomer = useCallback(
    async (targetPhone?: string) => {
      const phoneToSearch = (targetPhone !== undefined ? targetPhone : searchQuery).trim();
      if (!phoneToSearch) {
        setSearchError('Vui lòng nhập số điện thoại hoặc tài khoản');
        return;
      }

      const cleanPhone = phoneToSearch.replace(/[\s.-]/g, '');
      const vnPhoneRegex = /^(0|\+84)[0-9]{8,11}$/;
      if (!vnPhoneRegex.test(cleanPhone)) {
        const errorMsg = 'Số điện thoại không hợp lệ (Phải là 10 chữ số, ví dụ: 0901234567)';
        setSearchError(errorMsg);
        showToast?.(errorMsg, 'warning');
        return;
      }

      setIsSearching(true);
      setSearchError(null);
      setIsNotFound(false);

      try {
        const result = await customerService.lookupCustomer(cleanPhone);
        if (result) {
          setCustomer(result);
          setIsWalkIn(false);
          setIsNotFound(false);
          refreshRecentCustomers();
          onCustomerSelected?.(result);

          if (result.clinical.allergies && result.clinical.allergies.length > 0) {
            showToast?.(
              `⚠️ Cảnh báo lâm sàng: Khách có tiền sử dị ứng [${result.clinical.allergies.join(', ')}]!`,
              'warning'
            );
          } else if (result.clinical.refillReminder?.isDue) {
            showToast?.(
              `🔄 Nhắc nạp thuốc: Khách hàng sắp đến hạn mua lại thuốc định kỳ!`,
              'info'
            );
          } else {
            showToast?.(`Đã tìm thấy khách hàng: ${result.loyalty.fullName} (${result.loyalty.tier} VIP)`, 'success');
          }
        } else {
          setIsNotFound(true);
          setSearchError('Không tìm thấy tài khoản thành viên với số này.');
          showToast?.('Không tìm thấy tài khoản. Bấm "Thêm mới" để đăng ký nhanh!', 'warning');
        }
      } catch (err: any) {
        setIsNotFound(true);
        setSearchError(err.message || 'Lỗi tra cứu tài khoản khách hàng');
        showToast?.('Lỗi tra cứu tài khoản khách hàng', 'error');
      } finally {
        setIsSearching(false);
      }
    },
    [searchQuery, onCustomerSelected, showToast, refreshRecentCustomers]
  );

  // Quick register new customer at counter
  const quickRegister = useCallback(
    async (dto: QuickRegisterCustomerDto) => {
      setIsSearching(true);
      try {
        const newCustomer = await customerService.quickRegister(dto);
        setCustomer(newCustomer);
        setIsWalkIn(false);
        setIsNotFound(false);
        setIsRegisterOpen(false);
        setSearchQuery(newCustomer.loyalty.phone);
        refreshRecentCustomers();
        onCustomerSelected?.(newCustomer);
        showToast?.(`Đã tạo mới & liên kết tài khoản cho ${newCustomer.loyalty.fullName}!`, 'success');
        return { success: true, customer: newCustomer };
      } catch (err: any) {
        const msg = err.response?.data?.message || err.message || 'Lỗi tạo khách hàng mới';
        showToast?.(msg, 'error');
        return { success: false, error: msg };
      } finally {
        setIsSearching(false);
      }
    },
    [onCustomerSelected, showToast, refreshRecentCustomers]
  );

  // Select a recent customer directly
  const selectRecent = useCallback(
    (item: RecentCustomerRecord) => {
      setSearchQuery(item.phone);
      searchCustomer(item.phone);
    },
    [searchCustomer]
  );

  // Toggle walk-in guest mode on / off
  const toggleWalkInMode = useCallback(() => {
    setIsWalkIn((prev) => {
      const next = !prev;
      if (next) {
        setCustomer(null);
        setIsNotFound(false);
        setSearchQuery('');
        setSearchError(null);
        onCustomerSelected?.(null);
      }
      return next;
    });
  }, [onCustomerSelected]);

  // Clear selected customer back to initial state
  const clearCustomer = useCallback(() => {
    setCustomer(null);
    setIsWalkIn(false);
    setIsNotFound(false);
    setSearchQuery('');
    setSearchError(null);
    onCustomerSelected?.(null);
  }, [onCustomerSelected]);

  // Current active patient role
  const patientRole = isWalkIn ? 'guest' : (customer ? 'customer' : 'guest');

  return {
    customer,
    isWalkIn,
    patientRole,
    searchQuery,
    setSearchQuery,
    isSearching,
    searchError,
    isNotFound,
    recentCustomers,
    isRegisterOpen,
    setIsRegisterOpen,
    isClinicalModalOpen,
    setIsClinicalModalOpen,
    inputRef,
    searchCustomer,
    quickRegister,
    selectRecent,
    setWalkInMode: toggleWalkInMode,
    toggleWalkInMode,
    clearCustomer,
    refreshRecentCustomers,
  };
}
