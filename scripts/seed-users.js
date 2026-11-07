/**
 * Script seed tai khoan nguoi dung va nhan vien chi nhanh
 * - 100 tai khoan khach hang (role: 'user'), co danh so tu '001.' den '100.' o dau ten.
 * - 50 tai khoan nhan vien (10 nhan vien x 5 chi nhanh: BR-001, BR-002, BR-003, BR-004, BR-006).
 *   Ten co danh so theo chi nhanh o dau: 'BR1-01.', 'BR1-02.', ..., 'BR6-10.'.
 * - Mat khau mac dinh cho tat ca tai khoan: 123456.
 */

const fs = require('fs');
const path = require('path');
const mongoose = require(path.resolve(__dirname, '../backend/node_modules/mongoose'));
const bcrypt = require(path.resolve(__dirname, '../backend/node_modules/bcryptjs'));

// Doc URI tu file .env cua backend
function getMongoUri() {
  const envPath = path.resolve(__dirname, '../backend/.env');
  if (fs.existsSync(envPath)) {
    const content = fs.readFileSync(envPath, 'utf8');
    const match = content.match(/MONGODB_URI=(.+)/) || content.match(/MONGODB_CONNECTION_STRING=(.+)/);
    if (match && match[1]) {
      return match[1].trim();
    }
  }
  return 'mongodb+srv://phuocthde180577_db_user:Phuoc12345@cluster0.ruhl6tb.mongodb.net/WDP201?appName=Cluster0';
}

// Data pools tieng Viet
const LAST_NAMES = [
  'Nguyễn', 'Trần', 'Lê', 'Phạm', 'Hoàng', 'Huỳnh', 'Phan', 'Vũ', 'Võ',
  'Đặng', 'Bùi', 'Đỗ', 'Hồ', 'Ngô', 'Dương', 'Lý', 'Lương', 'Mai',
  'Trịnh', 'Đinh', 'Đoàn', 'Lâm', 'Phùng', 'Tạ', 'Quách', 'Vương'
];

const MALE_MIDDLE = ['Văn', 'Hữu', 'Đức', 'Quang', 'Minh', 'Đình', 'Tuấn', 'Tiến', 'Quốc', 'Duy', 'Bảo', 'Thanh'];
const MALE_FIRST = ['An', 'Bình', 'Cường', 'Dũng', 'Đạt', 'Hải', 'Hiếu', 'Hoàng', 'Hùng', 'Huy', 'Khánh', 'Khoa', 'Kiên', 'Long', 'Minh', 'Nam', 'Nghĩa', 'Nhân', 'Phong', 'Phúc', 'Quân', 'Sơn', 'Tài', 'Thắng', 'Thịnh', 'Toàn', 'Triết', 'Trung', 'Tú', 'Tuấn', 'Việt', 'Vinh'];

const FEMALE_MIDDLE = ['Thị', 'Thu', 'Mai', 'Ngọc', 'Thảo', 'Phương', 'Kim', 'Cẩm', 'Mỹ', 'Lan', 'Quỳnh', 'Thúy'];
const FEMALE_FIRST = ['Anh', 'Bích', 'Châu', 'Chi', 'Diệp', 'Dung', 'Duyên', 'Giang', 'Hà', 'Hằng', 'Hạnh', 'Hoa', 'Hương', 'Huyền', 'Lan', 'Linh', 'Loan', 'Mai', 'My', 'Nga', 'Ngân', 'Ngọc', 'Nhung', 'Phương', 'Quyên', 'Quỳnh', 'Thảo', 'Thu', 'Thúy', 'Thủy', 'Tiên', 'Trang', 'Trâm', 'Uyên', 'Vân', 'Vy', 'Yến'];

const ADDRESSES = [
  '120 Hai Bà Trưng, P. Bến Nghé, Quận 1, TP. Hồ Chí Minh',
  '45 Lê Thánh Tôn, P. Bến Nghé, Quận 1, TP. Hồ Chí Minh',
  '88 Nguyễn Huệ, P. Bến Nghé, Quận 1, TP. Hồ Chí Minh',
  '15 Quốc Hương, P. Thảo Điền, TP. Thủ Đức, TP. Hồ Chí Minh',
  '234 Trần Não, P. Bình An, TP. Thủ Đức, TP. Hồ Chí Minh',
  '67 Xa Lộ Hà Nội, P. An Phú, TP. Thủ Đức, TP. Hồ Chí Minh',
  '56 Bạch Đằng, P. Thạch Thang, Quận Hải Châu, TP. Đà Nẵng',
  '102 Lê Duẩn, P. Thạch Thang, Quận Hải Châu, TP. Đà Nẵng',
  '25 Quang Trung, P. Hải Châu 1, Quận Hải Châu, TP. Đà Nẵng',
  '34 Tràng Tiền, P. Tràng Tiền, Quận Hoàn Kiếm, TP. Hà Nội',
  '78 Đinh Tiên Hoàng, P. Hàng Bạc, Quận Hoàn Kiếm, TP. Hà Nội',
  '19 Lý Thường Kiệt, P. Phan Chu Trinh, Quận Hoàn Kiếm, TP. Hà Nội',
  '189 Lý Thường Kiệt, P. Minh An, TP. Hội An, Tỉnh Quảng Nam',
  '54 Trần Phú, P. Minh An, TP. Hội An, Tỉnh Quảng Nam',
  '210 Nguyễn Trãi, P. 3, Quận 5, TP. Hồ Chí Minh',
  '315 Cách Mạng Tháng 8, P. 12, Quận 10, TP. Hồ Chí Minh',
  '89 Hoàng Hoa Thám, P. 6, Quận Bình Thạnh, TP. Hồ Chí Minh',
  '142 Cầu Giấy, P. Quan Hoa, Quận Cầu Giấy, TP. Hà Nội',
  '55 Nguyễn Khánh Toàn, P. Quan Hoa, Quận Cầu Giấy, TP. Hà Nội',
  '22 Hàng Bài, P. Hàng Bài, Quận Hoàn Kiếm, TP. Hà Nội'
];

const ALLERGIES_LIST = ['Penicillin', 'Cephalosporin', 'Aspirin', 'Ibuprofen', 'Sulfonamide', 'Paracetamol'];
const CHRONIC_CONDITIONS = ['Tăng huyết áp', 'Đái tháo đường type 2', 'Viêm loét dạ dày', 'Hen phế quản', 'Rối loạn lipid máu', 'Gút mãn tính'];

function randomElement(arr) {
  return arr[Math.floor(Math.random() * arr.length)];
}

function generateVietnameseName(isFemale = Math.random() > 0.5) {
  const last = randomElement(LAST_NAMES);
  const mid = isFemale ? randomElement(FEMALE_MIDDLE) : randomElement(MALE_MIDDLE);
  const first = isFemale ? randomElement(FEMALE_FIRST) : randomElement(MALE_FIRST);
  return `${last} ${mid} ${first}`;
}

// 5 Chi nhanh thuc te trong DB
const BRANCH_CONFIGS = [
  { branchId: 'BR-001', branchCodeNumber: '1', branchName: 'Nhà thuốc VinaPharmacy - CN1', provinceCode: 'HCM' },
  { branchId: 'BR-002', branchCodeNumber: '2', branchName: 'Nhà thuốc VinaPharmacy - CN2', provinceCode: 'HCM' },
  { branchId: 'BR-003', branchCodeNumber: '3', branchName: 'Nhà thuốc VinaPharmacy - CN3', provinceCode: 'DNA' },
  { branchId: 'BR-004', branchCodeNumber: '4', branchName: 'Nhà thuốc VinaPharmacy - CN4', provinceCode: 'HN' },
  { branchId: 'BR-006', branchCodeNumber: '6', branchName: 'Nhà thuốc ABC Pharmacy Hội An', provinceCode: 'QNA' }
];

async function runSeed() {
  const uri = getMongoUri();
  console.log('Connecting to MongoDB database...');
  await mongoose.connect(uri, { serverSelectionTimeoutMS: 15000 });
  console.log('Connected successfully to MongoDB.');

  const db = mongoose.connection.db;
  const usersCollection = db.collection('users');
  const branchesCollection = db.collection('branches');

  // Tao password hash cho '123456'
  console.log('Generating bcrypt password hash for default password: 123456...');
  const passwordHash = bcrypt.hashSync('123456', 10);

  // Lay tap hop email va phone da co trong DB de tranh trung lap
  const existingUsers = await usersCollection.find({}, { projection: { email: 1, phone: 1 } }).toArray();
  const existingEmails = new Set(existingUsers.map(u => (u.email || '').toLowerCase()));
  const existingPhones = new Set(existingUsers.map(u => u.phone).filter(Boolean));

  console.log(`Current existing users in DB: ${existingUsers.length}`);

  // 1. TAO 100 TAI KHOAN KHACH HANG
  console.log('\n--- Bắt đầu tạo 100 tài khoản khách hàng ---');
  const customerDocs = [];
  const tiers = ['Bronze', 'Bronze', 'Bronze', 'Silver', 'Silver', 'Gold', 'Platinum'];

  for (let i = 1; i <= 100; i++) {
    const paddedIndex = String(i).padStart(3, '0');
    const email = `cust${paddedIndex}@abcpharmacy.vn`;
    const phone = `0971${String(100000 + i).slice(1)}`; // 0971000001 -> 0971000100

    if (existingEmails.has(email)) {
      console.log(`Bỏ qua email đã tồn tại: ${email}`);
      continue;
    }
    if (existingPhones.has(phone)) {
      console.log(`Bỏ qua SĐT đã tồn tại: ${phone}`);
      continue;
    }

    const tier = randomElement(tiers);
    let points = 20;
    let accumulatedPoints = 50;
    if (tier === 'Silver') {
      points = Math.floor(100 + Math.random() * 200);
      accumulatedPoints = points + 150;
    } else if (tier === 'Gold') {
      points = Math.floor(500 + Math.random() * 800);
      accumulatedPoints = points + 600;
    } else if (tier === 'Platinum') {
      points = Math.floor(2000 + Math.random() * 3000);
      accumulatedPoints = points + 3500;
    }

    const hasAllergy = Math.random() < 0.25;
    const hasCondition = Math.random() < 0.3;
    const allergies = hasAllergy ? [randomElement(ALLERGIES_LIST)] : [];
    const chronicConditions = hasCondition ? [randomElement(CHRONIC_CONDITIONS)] : [];

    // Danh so o dau ten: '001. Nguyen Van An'
    const fullName = `${paddedIndex}. ${generateVietnameseName()}`;

    customerDocs.push({
      email,
      passwordHash,
      fullName,
      role: 'user',
      isActive: true,
      isEmailVerified: true,
      isApproved: 'approved',
      phone,
      address: randomElement(ADDRESSES),
      points,
      accumulatedPoints,
      tier,
      allergies,
      allergicMedicines: [],
      allergicIngredients: [],
      chronicConditions,
      hasCompletedHealthOnboarding: true,
      isTwoFactorEnabled: false,
      annualLeaveBalance: 12,
      usedAnnualLeave: 0,
      createdAt: new Date(),
      updatedAt: new Date()
    });

    existingEmails.add(email);
    existingPhones.add(phone);
  }

  if (customerDocs.length > 0) {
    const insertCustResult = await usersCollection.insertMany(customerDocs);
    console.log(`Đã thêm thành công ${insertCustResult.insertedCount} tài khoản khách hàng.`);
  } else {
    console.log('Không có khách hàng mới nào cần thêm.');
  }

  // 2. TAO NHAN VIEN CHO MOI CHI NHANH (10 nguoi / chi nhanh x 5 chi nhanh = 50 nguoi)
  console.log('\n--- Bắt đầu tạo nhân viên cho 5 chi nhánh (10 nhân viên/chi nhánh) ---');
  const staffDocs = [];

  for (const branch of BRANCH_CONFIGS) {
    console.log(`Khởi tạo 10 nhân viên cho ${branch.branchId} (${branch.branchName})...`);

    for (let j = 1; j <= 10; j++) {
      const paddedIndex = String(j).padStart(2, '0');
      // Format email: staff.br001.01@abcpharmacy.vn
      const branchLower = branch.branchId.toLowerCase().replace('-', '');
      const email = `staff.${branchLower}.${paddedIndex}@abcpharmacy.vn`;
      // Phone rieng biet: 098 + branchNum + 00 + j (vd: 0981001001)
      const phone = `098${branch.branchCodeNumber}00${branch.branchCodeNumber}${paddedIndex}`;

      if (existingEmails.has(email)) {
        console.log(`Bỏ qua email nhân viên đã tồn tại: ${email}`);
        continue;
      }
      if (existingPhones.has(phone)) {
        console.log(`Bỏ qua SĐT nhân viên đã tồn tại: ${phone}`);
        continue;
      }

      // Nhan vien so 1 la Quan ly / Truong co so, con lai la Duoc si
      const isManager = j === 1;
      const role = isManager ? 'branch' : 'pharmacist';
      const title = isManager ? 'DS. Quản Lý' : 'DS.';
      const highestDegree = isManager || j <= 4 ? 'Dược sĩ Đại học' : 'Dược sĩ Cao đẳng';
      const isBranchPIC = isManager; // Nguoi chiu trach nhiem chuyen mon

      // So chung chi hanh nghe
      const certRand = Math.floor(10000 + Math.random() * 90000);
      const practiceCertificateNumber = `CCHN-${branch.provinceCode}-${certRand}`;

      // Luong va phu cap
      const baseSalary = isManager ? 14000000 : Math.floor(8500000 + Math.random() * 3000000);
      const certificateAllowance = isManager ? 3000000 : Math.floor(1000000 + Math.random() * 1500000);

      // Danh so o dau ten: 'BR1-01. DS. Quan Ly Nguyen Van A'
      const fullName = `BR${branch.branchCodeNumber}-${paddedIndex}. ${title} ${generateVietnameseName()}`;

      staffDocs.push({
        email,
        passwordHash,
        fullName,
        role,
        isActive: true,
        isEmailVerified: true,
        isApproved: 'approved',
        branchId: branch.branchId,
        branchName: branch.branchName,
        phone,
        address: randomElement(ADDRESSES),
        highestDegree,
        practiceCertificateNumber,
        certificateAllowance,
        isBranchPIC,
        baseSalary,
        annualLeaveBalance: 12,
        usedAnnualLeave: Math.floor(Math.random() * 3),
        points: 0,
        accumulatedPoints: 0,
        tier: 'Bronze',
        allergies: [],
        chronicConditions: [],
        isTwoFactorEnabled: false,
        createdAt: new Date(),
        updatedAt: new Date()
      });

      existingEmails.add(email);
      existingPhones.add(phone);
    }
  }

  if (staffDocs.length > 0) {
    const insertStaffResult = await usersCollection.insertMany(staffDocs);
    console.log(`Đã thêm thành công ${insertStaffResult.insertedCount} tài khoản nhân viên.`);
  } else {
    console.log('Không có nhân viên mới nào cần thêm.');
  }

  // 3. CAP NHAT SO LUONG NHAN VIEN TRONG COLLECTION BRANCHES
  console.log('\n--- Cập nhật thống kê nhân viên vào collection branches ---');
  for (const branch of BRANCH_CONFIGS) {
    const staffCount = await usersCollection.countDocuments({
      branchId: branch.branchId,
      role: { $in: ['branch', 'pharmacist'] }
    });

    await branchesCollection.updateOne(
      { branchCode: branch.branchId },
      {
        $set: {
          'stats.employees': staffCount,
          updatedAt: new Date()
        }
      }
    );
    console.log(`Chi nhánh ${branch.branchId}: cập nhật stats.employees = ${staffCount}`);
  }

  // 4. KIEM TRA VA TONG KET
  const finalTotalUsers = await usersCollection.countDocuments();
  const finalCustomers = await usersCollection.countDocuments({ role: 'user' });
  const finalPharmacists = await usersCollection.countDocuments({ role: 'pharmacist' });
  const finalBranches = await usersCollection.countDocuments({ role: 'branch' });

  console.log('\n=============================================');
  console.log('TỔNG KẾT DỮ LIỆU USER SAU KHI SEED:');
  console.log(`- Tổng số users trong DB: ${finalTotalUsers}`);
  console.log(`- Khách hàng (role: user): ${finalCustomers}`);
  console.log(`- Dược sĩ (role: pharmacist): ${finalPharmacists}`);
  console.log(`- Quản lý chi nhánh (role: branch): ${finalBranches}`);
  console.log('Mật khẩu đăng nhập mặc định cho toàn bộ tài khoản mới: 123456');
  console.log('=============================================\n');

  await mongoose.disconnect();
  console.log('Hoàn thành seed dữ liệu và đóng kết nối MongoDB.');
}

runSeed().catch(err => {
  console.error('Lỗi khi chạy seed:', err);
  process.exit(1);
});

