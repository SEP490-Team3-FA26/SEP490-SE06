/**
 * catalog.constants.ts - Hằng Số Danh Mục & Cấu Hình Phân Trang Dược Phẩm Mobile
 * Chú thích mã nguồn: Tiếng Việt 100% theo quy chuẩn dự án WDP301/SEP490.
 */

export const GUEST_CART_KEY = '@abc_guest_cart';
export const PAGE_LIMIT = 50; // Phân trang 50 sản phẩm / lần tải chuẩn Database MongoDB

// Danh sách danh mục thuốc phổ biến của chuỗi nhà thuốc ABC Pharmacy (100% chuẩn OTC không kê đơn theo GPP)
export const CATALOG_CATEGORIES = [
  { id: 'ALL', name: 'Tất cả', keyword: '' },
  { id: 'PATCH', name: 'Cao dán - Miếng dán', keyword: 'dán', categoryValue: 'Miếng dán giảm đau' },
  { id: 'PAIN_RELIEF', name: 'Giảm đau - Hạ sốt', keyword: 'giảm đau', categoryValue: 'Giảm đau, hạ sốt' },
  { id: 'DIGESTIVE', name: 'Tiêu hóa', keyword: 'tiêu hóa', categoryValue: 'Thuốc tiêu hóa' },
  { id: 'RESPIRATORY', name: 'Hô hấp', keyword: 'hô hấp', categoryValue: 'Thuốc hô hấp' },
  { id: 'DERMA', name: 'Da liễu - Bôi ngoài', keyword: 'da', categoryValue: 'Thuốc da liễu' },
  { id: 'VITAMIN', name: 'Vitamin & Khoáng chất', keyword: 'vitamin', categoryValue: 'Vitamin & Khoáng chất' },
  { id: 'SUPPLEMENT', name: 'Thực phẩm chức năng', keyword: 'thực phẩm', categoryValue: 'Thực phẩm chức năng' },
  { id: 'MEDICAL_DEVICE', name: 'Thiết bị y tế', keyword: 'thiết bị', categoryValue: 'Vật tư y tế' },
];

