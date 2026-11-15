/**
 * Script khởi tạo và đồng bộ 6 tài khoản Developer / Test chuẩn 100% ID
 * Áp dụng cho cả 2 Cơ sở dữ liệu vi dịch vụ:
 * 1. wdp301_auth (auth-service: phục vụ đăng nhập, cấp JWT)
 * 2. wdp301_user (user-service: quản lý hồ sơ, thẻ thành viên loyalty, điểm danh, phân quyền)
 */

const { MongoClient, ObjectId } = require('mongodb');
const bcrypt = require('bcryptjs');

const TARGET_PASS = encodeURIComponent(process.env.TARGET_PASSWORD || '');
const VPS_HOST = process.env.VPS_HOST || '127.0.0.1';

const AUTH_URI = process.env.TARGET_AUTH_URI || `mongodb://admin:${TARGET_PASS}@${VPS_HOST}:27018/wdp301_auth?authSource=admin&directConnection=true`;
const USER_URI = process.env.TARGET_USER_URI || `mongodb://admin:${TARGET_PASS}@${VPS_HOST}:27019/wdp301_user?authSource=admin&directConnection=true`;

// Danh sách 6 tài khoản kiểm thử chuẩn khớp 100% với khóa ngoại trên toàn hệ thống
const DEV_TEST_USERS = [
  {
    _id: new ObjectId('6a5f578c9a1f0dd7bd52223b'),
    fullName: 'Quản Trị Viên Hệ Thống (Admin)',
    email: 'admin@vinapharmacy.com',
    role: 'admin',
    phone: '0901111222',
    branchId: 'BR-001',
    branchName: 'Hội Sở Chính',
    isActive: true,
    isEmailVerified: true,
    isApproved: 'approved',
    points: 1000,
    accumulatedPoints: 1000,
    tier: 'Platinum',
    status: 'ACTIVE'
  },
  {
    _id: new ObjectId('6a1f195c9d723929bb2c6a96'),
    fullName: 'Ban Giám Đốc Chuỗi (Director)',
    email: 'director@vinapharmacy.com',
    role: 'director',
    phone: '0902222333',
    branchId: 'BR-001',
    branchName: 'Hội Sở Chính',
    isActive: true,
    isEmailVerified: true,
    isApproved: 'approved',
    points: 500,
    accumulatedPoints: 500,
    tier: 'Gold',
    status: 'ACTIVE'
  },
  {
    _id: new ObjectId('6a1f195c9d723929bb2c6a99'),
    fullName: 'Quản Lý Kho Vận (Warehouse)',
    email: 'warehouse@vinapharmacy.com',
    role: 'warehouse',
    phone: '0903333444',
    branchId: 'BR-001',
    branchName: 'Tổng Kho Dược GSP',
    isActive: true,
    isEmailVerified: true,
    isApproved: 'approved',
    points: 200,
    accumulatedPoints: 200,
    tier: 'Silver',
    status: 'ACTIVE'
  },
  {
    _id: new ObjectId('6a5f578c9a1f0dd7bd522240'),
    fullName: 'Quản Lý Chi Nhánh (Manager)',
    email: 'manager@vinapharmacy.com',
    role: 'branch',
    phone: '0904444551',
    branchId: 'BR-001',
    branchName: 'Chi Nhánh Quận 1',
    isActive: true,
    isEmailVerified: true,
    isApproved: 'approved',
    points: 150,
    accumulatedPoints: 150,
    tier: 'Silver',
    status: 'ACTIVE'
  },
  {
    _id: new ObjectId('6a5f578c9a1f0dd7bd522243'),
    fullName: 'Dược Sĩ Kê Đơn (Pharmacist)',
    email: 'pharmacist@vinapharmacy.com',
    role: 'pharmacist',
    phone: '0905555666',
    branchId: 'BR-001',
    branchName: 'Chi Nhánh Quận 1',
    isActive: true,
    isEmailVerified: true,
    isApproved: 'approved',
    points: 100,
    accumulatedPoints: 100,
    tier: 'Bronze',
    status: 'ACTIVE'
  },
  {
    _id: new ObjectId('6a5f578c9a1f0dd7bd522246'),
    fullName: 'Khách Hàng Mua Thuốc (User)',
    email: 'user@vinapharmacy.com',
    role: 'user',
    phone: '0906666777',
    branchId: 'BR-001',
    branchName: 'Khách Hàng Toàn Quốc',
    isActive: true,
    isEmailVerified: true,
    isApproved: 'approved',
    points: 50,
    accumulatedPoints: 50,
    tier: 'Bronze',
    status: 'ACTIVE'
  }
];

async function seedDevUsers() {
  console.log('====================================================');
  console.log('🚀 BẮT ĐẦU SEED TÀI KHOẢN DEVELOPER TEST CHO MICROSERVICES');
  console.log('====================================================\n');

  const authClient = new MongoClient(AUTH_URI);
  const userClient = new MongoClient(USER_URI);

  try {
    console.log('⏳ Đang kết nối tới wdp301_auth và wdp301_user...');
    await Promise.all([authClient.connect(), userClient.connect()]);
    console.log('✅ Đã kết nối thành công tới cả 2 CSDL vi dịch vụ!\n');

    const authCol = authClient.db('wdp301_auth').collection('users');
    const userCol = userClient.db('wdp301_user').collection('users');

    // Mật khẩu mặc định thống nhất là "123456"
    const passwordHash = await bcrypt.hash('123456', 12);

    for (const u of DEV_TEST_USERS) {
      const userDoc = {
        ...u,
        passwordHash,
        updatedAt: new Date()
      };

      // 1. Đồng bộ sang wdp301_auth (phục vụ đăng nhập)
      await authCol.updateOne(
        { _id: u._id },
        { $set: userDoc, $setOnInsert: { createdAt: new Date() } },
        { upsert: true }
      );

      // 2. Đồng bộ sang wdp301_user (phục vụ profile, loyalty, ca trực)
      await userCol.updateOne(
        { _id: u._id },
        { $set: userDoc, $setOnInsert: { createdAt: new Date() } },
        { upsert: true }
      );

      console.log(`✔ [Đồng bộ thành công] ${u.email.padEnd(28)} | Role: ${u.role.padEnd(10)} | ID: ${u._id}`);
    }

    console.log('\n====================================================');
    console.log('🎉 TẤT CẢ 6 TÀI KHOẢN TEST ĐÃ ĐỒNG BỘ 100% CÙNG _ID VÀO CẢ 2 DB!');
    console.log('👉 Mật khẩu mặc định: 123456');
    console.log('====================================================\n');

  } catch (err) {
    console.error('❌ Lỗi khi seed tài khoản:', err);
    process.exit(1);
  } finally {
    await Promise.all([authClient.close(), userClient.close()]);
  }
}

seedDevUsers();

