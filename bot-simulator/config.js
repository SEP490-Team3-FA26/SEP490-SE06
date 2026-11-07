// Cấu hình tham số kết nối và giới hạn cho Bot Simulator v2.0 Clean
const path = require('path');
const fs = require('fs');

// Tự động nạp biến môi trường từ file .env của bot-simulator hoặc thư mục gốc
try {
  require('dotenv').config({ path: path.join(__dirname, '.env') });
  if (!process.env.GATEWAY_URL) {
    require('dotenv').config({ path: path.join(__dirname, '../.env') });
  }
} catch {}

const config = {
  gatewayUrl: process.env.GATEWAY_URL || 'http://localhost:4000',
  simulatorPort: Number(process.env.SIMULATOR_PORT) || 4050,
  autoStart: process.env.AUTO_START === 'true',
  healthCheckIntervalMs: Number(process.env.HEALTH_CHECK_INTERVAL_MS) || 10000,
  tokenRefreshIntervalMs: Number(process.env.TOKEN_REFRESH_INTERVAL_MS) || 30 * 60 * 1000, // 30 phút

  credentials: {
    admin: {
      email: process.env.ADMIN_EMAIL || 'admin@vinapharmacy.com',
      password: process.env.ADMIN_PASSWORD || '123456',
    },
    warehouse: {
      email: process.env.WAREHOUSE_EMAIL || 'warehouse@vinapharmacy.com',
      password: process.env.WAREHOUSE_PASSWORD || '123456',
    },
    manager: {
      email: process.env.MANAGER_EMAIL || 'manager@vinapharmacy.com',
      password: process.env.MANAGER_PASSWORD || '123456',
    },
    pharmacist: {
      email: process.env.PHARMACIST_EMAIL || 'pharmacist@vinapharmacy.com',
      password: process.env.PHARMACIST_PASSWORD || '123456',
    },
    customer: {
      email: process.env.CUSTOMER_EMAIL || 'user@vinapharmacy.com',
      password: process.env.CUSTOMER_PASSWORD || '123456',
    },
  },

  // Tọa độ và cấu hình giờ ca làm việc cho từng chi nhánh
  defaultBranches: [
    {
      branchCode: 'BR-001',
      name: 'ABC Pharmacy Quận 1',
      lat: 15.968868,
      lng: 108.256895,
      radius: 500,
      shiftSchedule: { morningStart: '06:00', morningEnd: '14:00', afternoonStart: '14:00', afternoonEnd: '22:00' },
    },
    {
      branchCode: 'BR-002',
      name: 'ABC Pharmacy Quận 2',
      lat: 10.7769,
      lng: 106.7009,
      radius: 200,
      shiftSchedule: { morningStart: '07:00', morningEnd: '15:00', afternoonStart: '15:00', afternoonEnd: '23:00' },
    },
    {
      branchCode: 'BR-003',
      name: 'ABC Pharmacy Đà Nẵng',
      lat: 10.7769,
      lng: 106.7009,
      radius: 200,
      shiftSchedule: { morningStart: '07:00', morningEnd: '15:00', afternoonStart: '15:00', afternoonEnd: '23:00' },
    },
    {
      branchCode: 'BR-004',
      name: 'ABC Pharmacy Hà Nội',
      lat: 21.0285,
      lng: 105.8542,
      radius: 200,
      shiftSchedule: { morningStart: '06:00', morningEnd: '14:00', afternoonStart: '14:00', afternoonEnd: '22:00' },
    },
    {
      branchCode: 'BR-006',
      name: 'ABC Pharmacy Hội An',
      lat: 15.8801,
      lng: 108.3380,
      radius: 200,
      shiftSchedule: { morningStart: '07:00', morningEnd: '15:00', afternoonStart: '15:00', afternoonEnd: '23:00' },
    },
  ],

  // Tần suất cơ sở (Base Intervals tại tốc độ 1x)
  intervals: {
    browsingBaseMs: 7000,    // 7 giây / lượt tìm kiếm
    orderBaseMs: 20000,      // 20 giây / lượt đặt COD online
    posBaseMs: 14000,        // 14 giây / lượt POS bán lẻ & điểm danh
    warehouseBaseMs: 30000,  // 30 giây / lượt chuỗi cung ứng kho
  },
};

module.exports = config;
