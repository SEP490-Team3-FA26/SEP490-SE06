import { useState, useEffect, useCallback } from 'react';
import { customerService, CustomerClinicalSafety } from '../services/sales/customer.service';
import { authService } from '../services/auth/auth.service';

/**
 * Custom Hook quản lý toàn bộ trạng thái & nghiệp vụ Hồ sơ Y khoa & Dị ứng cá nhân
 * Tuân thủ nghiêm ngặt chuẩn kiến trúc FE-ARCH 3 tầng (Playbook v2.0 & abc-frontend-skill)
 */
export function useCustomerMedicalRecord(options?: { autoEditIfIncomplete?: boolean }) {
  const [profile, setProfile] = useState<CustomerClinicalSafety>({
    allergies: [],
    allergicMedicines: [],
    allergicIngredients: [],
    chronicConditions: [],
    bloodType: 'Chưa rõ',
    medicalNotes: '',
    hasCompletedHealthOnboarding: false,
  });

  const [currentUser, setCurrentUser] = useState<any>(authService.getCurrentUser());
  const [isLoggedIn, setIsLoggedIn] = useState<boolean>(Boolean(authService.getCurrentUser()));
  const [loading, setLoading] = useState<boolean>(true);
  const [isEditing, setIsEditing] = useState<boolean>(Boolean(options?.autoEditIfIncomplete));
  const [saving, setSaving] = useState<boolean>(false);
  const [successMsg, setSuccessMsg] = useState<string>('');
  const [errorMsg, setErrorMsg] = useState<string>('');

  // Trạng thái các trường trong form chỉnh sửa
  const [editAllergies, setEditAllergies] = useState<string[]>([]);
  const [editAllergicMeds, setEditAllergicMeds] = useState<string[]>([]);
  const [editAllergicIngredients, setEditAllergicIngredients] = useState<string[]>([]);
  const [editConditions, setEditConditions] = useState<string[]>([]);
  const [editBloodType, setEditBloodType] = useState<string>('Chưa rõ');
  const [editNotes, setEditNotes] = useState<string>('');

  // Đồng bộ dữ liệu từ profile sang form chỉnh sửa
  const resetEditForm = useCallback((data: CustomerClinicalSafety) => {
    setEditAllergies(data.allergies || []);
    setEditAllergicMeds(data.allergicMedicines || []);
    setEditAllergicIngredients(data.allergicIngredients || []);
    setEditConditions(data.chronicConditions || []);
    setEditBloodType(data.bloodType || 'Chưa rõ');
    setEditNotes(data.medicalNotes || '');
  }, []);

  // Tải dữ liệu hồ sơ bệnh án từ API Gateway
  const loadData = useCallback(async () => {
    const user = authService.getCurrentUser();
    setCurrentUser(user);
    if (!user) {
      setIsLoggedIn(false);
      setLoading(false);
      return;
    }
    setIsLoggedIn(true);

    try {
      setLoading(true);
      setErrorMsg('');
      const data = await customerService.getMyClinicalProfile();
      // Bổ sung thông tin từ token session nếu thiếu
      if (!data.fullName && user.fullName) data.fullName = user.fullName;
      if (!data.email && user.email) data.email = user.email;
      if (!data.phone && user.phone) data.phone = user.phone;

      setProfile(data);
      resetEditForm(data);

      // Nếu người dùng chưa từng hoàn tất onboarding hoặc chưa có dữ liệu y khoa nào
      const isCompletelyEmpty =
        (!data.allergies || data.allergies.length === 0) &&
        (!data.chronicConditions || data.chronicConditions.length === 0);

      if ((options?.autoEditIfIncomplete && !data.hasCompletedHealthOnboarding) || (isCompletelyEmpty && !data.hasCompletedHealthOnboarding)) {
        setIsEditing(true);
      }
    } catch (err: any) {
      console.error('Lỗi khi tải hồ sơ bệnh án:', err);
      if (err.message === 'UNAUTHORIZED') {
        setIsLoggedIn(false);
      } else {
        setErrorMsg(err.response?.data?.message || err.message || 'Lỗi khi tải hồ sơ bệnh án');
      }
    } finally {
      setLoading(false);
    }
  }, [options?.autoEditIfIncomplete, resetEditForm]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  // Lưu hồ sơ bệnh án qua API Gateway (Kafka Event 202)
  const handleSave = async () => {
    try {
      setSaving(true);
      setErrorMsg('');
      setSuccessMsg('');

      const payload = {
        allergies: editAllergies,
        allergicMedicines: editAllergicMeds,
        allergicIngredients: editAllergicIngredients,
        chronicConditions: editConditions,
        bloodType: editBloodType === 'Chưa rõ' ? undefined : editBloodType,
        medicalNotes: editNotes.trim() || undefined,
        hasCompletedHealthOnboarding: true,
      };

      await customerService.updateMyClinicalProfile(payload);
      setSuccessMsg('Đã cập nhật hồ sơ bệnh án thành công!');
      setIsEditing(false);
      // Áp dụng Delayed Re-fetch (800ms) chuẩn Event-Driven Kafka Playbook v2.0
      setTimeout(() => {
        loadData();
      }, 800);
    } catch (err: any) {
      setErrorMsg(err.response?.data?.message || err.message || 'Lỗi khi cập nhật hồ sơ bệnh án');
    } finally {
      setSaving(false);
    }
  };

  // Thêm tag tiện ích cho từng nhóm
  const addTag = (category: 'allergies' | 'meds' | 'ingredients' | 'conditions', tag: string) => {
    const trimmed = tag.trim();
    if (!trimmed) return;
    if (category === 'allergies' && !editAllergies.includes(trimmed)) {
      setEditAllergies([...editAllergies, trimmed]);
    } else if (category === 'meds' && !editAllergicMeds.includes(trimmed)) {
      setEditAllergicMeds([...editAllergicMeds, trimmed]);
    } else if (category === 'ingredients' && !editAllergicIngredients.includes(trimmed)) {
      setEditAllergicIngredients([...editAllergicIngredients, trimmed]);
    } else if (category === 'conditions' && !editConditions.includes(trimmed)) {
      setEditConditions([...editConditions, trimmed]);
    }
  };

  // Xóa tag tiện ích cho từng nhóm
  const removeTag = (category: 'allergies' | 'meds' | 'ingredients' | 'conditions', tag: string) => {
    if (category === 'allergies') {
      setEditAllergies(editAllergies.filter((x) => x !== tag));
    } else if (category === 'meds') {
      setEditAllergicMeds(editAllergicMeds.filter((x) => x !== tag));
    } else if (category === 'ingredients') {
      setEditAllergicIngredients(editAllergicIngredients.filter((x) => x !== tag));
    } else if (category === 'conditions') {
      setEditConditions(editConditions.filter((x) => x !== tag));
    }
  };

  const hasAllergies = Boolean(
    (profile.allergies && profile.allergies.length > 0) ||
    (profile.allergicMedicines && profile.allergicMedicines.length > 0) ||
    (profile.allergicIngredients && profile.allergicIngredients.length > 0)
  );

  const hasConditions = Boolean(profile.chronicConditions && profile.chronicConditions.length > 0);

  return {
    profile,
    currentUser,
    isLoggedIn,
    loading,
    isEditing,
    setIsEditing,
    saving,
    successMsg,
    errorMsg,
    hasAllergies,
    hasConditions,
    // Trạng thái edit
    editAllergies,
    editAllergicMeds,
    editAllergicIngredients,
    editConditions,
    editBloodType,
    setEditBloodType,
    editNotes,
    setEditNotes,
    // Hàm xử lý
    addTag,
    removeTag,
    handleSave,
    resetForm: () => resetEditForm(profile),
    refresh: loadData,
  };
}

export default useCustomerMedicalRecord;
