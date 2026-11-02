/**
 * Centralized Colors System - Thiết Kế Module Hóa Độc Lập Cho Ứng Dụng Mobile
 * Chú thích mã nguồn: Tiếng Việt 100% theo quy chuẩn dự án WDP301/SEP490
 */

import { palette } from './palette';
import { roles } from './roles';
import { medical } from './medical';
import { semantic } from './semantic';
import { gradients } from './gradients';

export const colors = {
  palette,
  roles,
  medical,
  semantic,
  gradients,

  // Phím tắt thuận tiện cho Khách Hàng (Customer)
  customer: roles.customer,
  // Phím tắt thuận tiện cho Dược Sĩ (Pharmacist)
  pharmacist: roles.pharmacist,
  // Phím tắt thuận tiện cho Thủ Kho (Warehouse)
  warehouse: roles.warehouse,
  // Phím tắt thuận tiện cho Quản Trị (Admin)
  admin: roles.admin,
};

export type AppColors = typeof colors;
export { palette, roles, medical, semantic, gradients };
export default colors;

