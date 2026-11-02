/**
 * Kiểm tra xem một mặt hàng có phải là thuốc kê đơn (Rx) hay không.
 * Căn cứ theo:
 * - CSDL Dược Quốc Gia & Quyết định 232/QĐ-TTYQG (prescription_status: 1 = ETC Kê đơn bắt buộc)
 * - Cờ is_prescription / isPrescription
 * - Phân loại drug_classification: 'PRESCRIPTION', 'PRESCRIPTION_ANTIBIOTIC'
 * - Thông tin chi tiết: 'Thuốc cần kê toa': 'Có' | true
 */
export const isPrescriptionMedicine = (med: any): boolean => {
  if (!med) return false;
  return Boolean(
    med.prescription_status === 1 ||
    med.prescriptionStatus === 1 ||
    med.is_prescription === true ||
    med.isPrescription === true ||
    med.drug_classification === 'PRESCRIPTION' ||
    med.drug_classification === 'PRESCRIPTION_ANTIBIOTIC' ||
    med.drugClassification === 'PRESCRIPTION' ||
    med.drugClassification === 'PRESCRIPTION_ANTIBIOTIC' ||
    med.thong_tin_chi_tiet?.['Thuốc cần kê toa'] === 'Có' ||
    med.thong_tin_chi_tiet?.['Thuốc cần kê toa'] === true
  );
};

