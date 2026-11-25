/**
 * Script Khởi tạo 1,000 Users vào MongoDB phục vụ Load Testing thực tế
 * Hệ thống: ABC Pharmacy Platform (WDP301 / SEP490-SE06)
 * 
 * Cách dùng:
 *   cd backend
 *   node scripts/seed-loadtest-1000-users.js          # Tạo 1000 users (an toàn nếu đã tồn tại)
 *   node scripts/seed-loadtest-1000-users.js --force  # Bổ sung user còn thiếu và xuất lại CSV/JSON
 *   node scripts/seed-loadtest-1000-users.js --clean  # Xóa 1000 users test khi cần
 */

const path = require('path');
const fs = require('fs');
require('dotenv').config({ path: path.join(__dirname, '../.env') });
const { MongoClient, ObjectId } = require('mongodb');
const bcrypt = require('bcryptjs');

const MONGODB_URI = process.env.MONGODB_URI;
if (!MONGODB_URI) {
  console.error('❌ MONGODB_URI không tìm thấy trong backend/.env');
  process.exit(1);
}

const DEFAULT_PASSWORD = 'Password123@';
const TOTAL_USERS = 1000;
const EMAIL_DOMAIN = 'abcpharmacy.store';

const BRANCHES = [
  { id: '6a2bc52d446f5ecaa1f508bd', name: 'Nhà thuốc VinaPharmacy - CN1' },
  { id: '6a2bc52d446f5ecaa1f508be', name: 'Nhà thuốc VinaPharmacy - CN2' },
  { id: '6a2bc52d446f5ecaa1f508bf', name: 'Nhà thuốc VinaPharmacy - CN3' },
  { id: '6a2bc52d446f5ecaa1f508c0', name: 'Nhà thuốc VinaPharmacy - CN4' },
  { id: '6a605cf9d6c224e674476e02', name: 'Nhà thuốc ABC Pharmacy Hội An' }
];

// Khởi tạo danh sách tài khoản DB và dữ liệu export cho công cụ load test
function buildUsersData(passwordHash) {
  const users = [];
  const exportData = [];
  const now = new Date();

  for (let i = 1; i <= TOTAL_USERS; i++) {
    const padIndex = String(i).padStart(4, '0');
    const email = `loadtest_user_${padIndex}@${EMAIL_DOMAIN}`;
    // Số điện thoại 10 số duy nhất bắt đầu bằng 0899
    const phone = `0899${String(i).padStart(6, '0')}`;
    const branch = BRANCHES[i % BRANCHES.length];
    // 950 khách hàng (user), 50 dược sĩ (pharmacist)
    const role = i <= 950 ? 'user' : 'pharmacist';
    const fullName = role === 'pharmacist' ? `Dược Sĩ Test ${padIndex}` : `Khách Hàng LoadTest ${padIndex}`;

    users.push({
      _id: new ObjectId(),
      email,
      passwordHash,
      fullName,
      role,
      phone,
      branchId: branch.id,
      branchName: branch.name,
      isActive: true,
      isEmailVerified: true,
      isApproved: 'approved',
      isTwoFactorEnabled: false,
      points: 100,
      accumulatedPoints: 100,
      tier: 'Bronze',
      allergies: [],
      allergicMedicines: [],
      allergicIngredients: [],
      chronicConditions: [],
      createdAt: now,
      updatedAt: now,
      __v: 0
    });

    exportData.push({
      email,
      password: DEFAULT_PASSWORD,
      role,
      phone,
      branchId: branch.id,
      branchName: branch.name
    });
  }

  return { users, exportData };
}

// Ghi danh sách user ra file CSV & JSON để phục vụ load test
function writeExportFiles(exportData) {
  const csvHeader = 'email,password,role,phone,branchId,branchName\n';
  const csvContent = csvHeader + exportData.map(u => `"${u.email}","${u.password}","${u.role}","${u.phone}","${u.branchId}","${u.branchName}"`).join('\n');
  const csvPath = path.join(__dirname, 'loadtest-users.csv');
  const jsonPath = path.join(__dirname, 'loadtest-users.json');

  fs.writeFileSync(csvPath, csvContent, 'utf8');
  fs.writeFileSync(jsonPath, JSON.stringify(exportData, null, 2), 'utf8');

  console.log(`📁 File CSV export danh sách ${TOTAL_USERS} users: ${csvPath}`);
  console.log(`📁 File JSON export danh sách ${TOTAL_USERS} users: ${jsonPath}`);
}

async function main() {
  const isCleanMode = process.argv.includes('--clean');
  const isForceMode = process.argv.includes('--force');
  const client = new MongoClient(MONGODB_URI);

  try {
    console.log('⏳ Đang kết nối tới MongoDB Atlas...');
    await client.connect();
    const db = client.db();
    const usersCol = db.collection('users');
    console.log(`✅ Kết nối thành công tới Database: ${db.databaseName}\n`);

    if (isCleanMode) {
      console.log('🧹 Đang xóa các tài khoản load test tiền tố "loadtest_user_" ...');
      const deleteResult = await usersCol.deleteMany({ email: { $regex: '^loadtest_user_' } });
      console.log(`✅ Đã xóa ${deleteResult.deletedCount} users load test.`);
      const currentCount = await usersCol.countDocuments();
      console.log(`📊 Số lượng users hiện tại trong DB: ${currentCount}`);
      return;
    }

    // Kiểm tra xem đã có đủ users loadtest chưa để tránh lỗi trùng khóa E11000
    const existing = await usersCol.countDocuments({ email: { $regex: '^loadtest_user_' } });
    if (existing >= TOTAL_USERS && !isForceMode) {
      console.log(`ℹ️ Đã có sẵn ${existing} tài khoản load test trong DB — bỏ qua bước insert để tránh trùng lặp.`);
      console.log('👉 Dùng "--force" nếu muốn đồng bộ/xuất lại file, hoặc "--clean" để xóa tạo lại.\n');

      const csvPath = path.join(__dirname, 'loadtest-users.csv');
      const jsonPath = path.join(__dirname, 'loadtest-users.json');
      if (!fs.existsSync(csvPath) || !fs.existsSync(jsonPath)) {
        const { exportData } = buildUsersData('');
        writeExportFiles(exportData);
      }
      return;
    }

    if (existing > 0) {
      console.log(`⚠️ Đã phát hiện ${existing} tài khoản load test tồn tại từ trước — sẽ chỉ chèn bổ sung các user còn thiếu (upsert).`);
    }

    console.log(`🔑 Đang băm mật khẩu chuẩn "${DEFAULT_PASSWORD}" bằng bcrypt (1 lần)...`);
    const passwordHash = await bcrypt.hash(DEFAULT_PASSWORD, 10);
    console.log('✅ Băm mật khẩu hoàn tất.\n');

    console.log(`📦 Đang khởi tạo danh sách ${TOTAL_USERS} tài khoản test...`);
    const { users, exportData } = buildUsersData(passwordHash);

    console.log(`🚀 Đang đồng bộ ${users.length} tài khoản vào collection "users" theo batch (an toàn chống trùng lặp)...`);
    const BATCH_SIZE = 500;
    let insertedCount = 0;

    for (let start = 0; start < users.length; start += BATCH_SIZE) {
      const batch = users.slice(start, start + BATCH_SIZE);
      const ops = batch.map(userDoc => ({
        updateOne: {
          filter: { email: userDoc.email },
          update: { $setOnInsert: userDoc },
          upsert: true
        }
      }));
      const res = await usersCol.bulkWrite(ops, { ordered: false });
      insertedCount += res.upsertedCount;
      console.log(`   ✔ Đã xử lý batch ${start + 1} - ${Math.min(start + BATCH_SIZE, users.length)} (thêm mới ${res.upsertedCount} users)`);
    }

    console.log(`\n🎉 ĐỒNG BỘ HOÀN TẤT (thêm mới ${insertedCount} users load test)!`);

    writeExportFiles(exportData);

    const totalCount = await usersCol.countDocuments();
    console.log(`📊 Tổng số users hiện có trong MongoDB: ${totalCount}`);
    console.log(`👉 Mật khẩu chung của tất cả ${TOTAL_USERS} users: ${DEFAULT_PASSWORD}`);
    console.log('====================================================\n');

  } catch (err) {
    console.error('❌ Lỗi:', err);
    process.exitCode = 1;
  } finally {
    await client.close();
  }
}

main();
