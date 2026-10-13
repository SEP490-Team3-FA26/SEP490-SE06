const path = require('path');
require('dotenv').config({ path: path.resolve(__dirname, '../.env') });
const mongoose = require('mongoose');

const uri = process.env.MONGODB_URI || process.env.MONGODB_CONNECTION_STRING;

if (!uri) {
  console.error('Thiếu biến môi trường MONGODB_CONNECTION_STRING trong file .env');
  process.exit(1);
}

async function run() {
  console.log('Đang kết nối MongoDB Atlas...');
  await mongoose.connect(uri);
  const auditColl = mongoose.connection.collection('audit_logs');

  const cutoffDate = new Date('2026-10-12T00:00:00.000Z');
  const countBefore = await auditColl.countDocuments();
  console.log(`Tổng số audit logs hiện tại: ${countBefore}`);

  const sensorQuery = {
    actionCode: 'POST__API_SENSOR',
    createdAt: { $lt: cutoffDate }
  };

  const toDeleteCount = await auditColl.countDocuments(sensorQuery);
  console.log(`Số bản ghi sensor cũ (trước ngày 2026-10-12) cần xóa (khoảng một nửa data rác): ${toDeleteCount}`);

  if (toDeleteCount > 0) {
    console.log('Đang tiến hành xóa...');
    const result = await auditColl.deleteMany(sensorQuery);
    console.log(`Đã xóa thành công: ${result.deletedCount} bản ghi.`);
  }

  const countAfter = await auditColl.countDocuments();
  console.log(`Tổng số audit logs còn lại: ${countAfter}`);

  await mongoose.disconnect();
  console.log('Đã hoàn tất dọn dẹp và ngắt kết nối.');
}

run().catch((err) => {
  console.error('Lỗi khi dọn dẹp audit logs:', err);
  process.exit(1);
});
