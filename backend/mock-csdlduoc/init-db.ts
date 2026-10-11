import mongoose from "mongoose";
const bcrypt = require("bcryptjs");
import * as dotenv from "dotenv";
import * as path from "path";

// Load .env
dotenv.config({ path: path.join(__dirname, "../.env") });
dotenv.config({ path: path.join(__dirname, "../../.env") });

const MONGODB_URI =
  process.env.MONGODB_URI ||
  process.env.MONGODB_ATLAS_URI ||
  "mongodb+srv://phuocthde180577_db_user:Phuoc12345@cluster0.ruhl6tb.mongodb.net/WDP201?appName=Cluster0";

// Danh mục Cơ sở Cấp phép (Phân định rõ Kho Tổng vs Kho Nhánh)
const NATIONAL_FACILITIES = [
  {
    facility_code: "79-001234",
    branch_code: "BR-001",
    facility_type: "CENTRAL_WAREHOUSE", // Kho Tổng GSP
    name: "Kho Tổng & Nhà Thuốc Trung Tâm VinaPharmacy - CN1",
    tax_code: "0312345678",
    practice_license_code: "GSP-HCM-2024-00192",
    address: "Phường Bến Nghé, Quận 1, TP. Hồ Chí Minh",
    manager_name: "Quản Lý Kho Tổng GSP",
    phone: "0901234567",
    status: "ACTIVE",
    gsp_certified: true,
    gpp_certified: true,
  },
  {
    facility_code: "79-001235",
    branch_code: "BR-002",
    facility_type: "RETAIL_BRANCH", // Kho Nhánh Bán Lẻ
    name: "Nhà thuốc VinaPharmacy - CN2 (Thủ Đức)",
    tax_code: "0312345678-001",
    practice_license_code: "GPP-HCM-2024-00245",
    address: "Phường Thảo Điền, TP. Thủ Đức, TP. Hồ Chí Minh",
    manager_name: "Quản lý Chi nhánh 2",
    phone: "0901234568",
    status: "ACTIVE",
    gsp_certified: false,
    gpp_certified: true,
  },
  {
    facility_code: "79-001236",
    branch_code: "BR-003",
    facility_type: "RETAIL_BRANCH", // Kho Nhánh Bán Lẻ
    name: "Nhà thuốc VinaPharmacy - CN3 (Quận 7)",
    tax_code: "0312345678-002",
    practice_license_code: "GPP-HCM-2024-00312",
    address: "Phường Tân Hưng, Quận 7, TP. Hồ Chí Minh",
    manager_name: "Quản lý Chi nhánh 3",
    phone: "0901234569",
    status: "ACTIVE",
    gsp_certified: false,
    gpp_certified: true,
  },
  {
    facility_code: "79-001237",
    branch_code: "BR-004",
    facility_type: "RETAIL_BRANCH", // Kho Nhánh Bán Lẻ
    name: "Nhà thuốc VinaPharmacy - CN4 (Cầu Giấy - Hà Nội)",
    tax_code: "0312345678-003",
    practice_license_code: "GPP-HAN-2024-00489",
    address: "Phường Dịch Vọng Hậu, Quận Cầu Giấy, TP. Hà Nội",
    manager_name: "Quản lý Chi nhánh 4",
    phone: "0901234570",
    status: "ACTIVE",
    gsp_certified: false,
    gpp_certified: true,
  },
  {
    facility_code: "48-001238",
    branch_code: "BR-005",
    facility_type: "RETAIL_BRANCH", // Kho Nhánh Bán Lẻ
    name: "Nhà thuốc ABC Pharmacy Hội An",
    tax_code: "0312345678-004",
    practice_license_code: "GPP-QNA-2024-00115",
    address: "TP. Hội An, Tỉnh Quảng Nam",
    manager_name: "Quản lý Chi nhánh Hội An",
    phone: "0901234571",
    status: "ACTIVE",
    gsp_certified: false,
    gpp_certified: true,
  },
];

async function initializeNationalPharmaDatabase() {
  console.log("================================================================");
  console.log("🚀 BẮT ĐẦU KHỞI TẠO DỮ LIỆU CSDL DƯỢC QUỐC GIA (QĐ 232 v1.1)");
  console.log(`🌐 MongoDB URI: ${MONGODB_URI.slice(0, 35)}...`);
  console.log("================================================================\n");

  await mongoose.connect(MONGODB_URI);
  const db = mongoose.connection.db!;

  // -------------------------------------------------------------
  // 1. TẠO TÀI KHOẢN THANH TRA BỘ Y TẾ (MOH_INSPECTOR)
  // -------------------------------------------------------------
  console.log("👤 [1/4] Khởi tạo tài khoản Thanh Tra Cục Quản Lý Dược (Bộ Y Tế)...");
  const usersColl = db.collection("users");
  const inspectorEmail = "inspector@csdlduoc.gov.vn";
  const rawPassword = "Inspector@2026";
  const passwordHash = bcrypt.hashSync(rawPassword, 10);

  const existingInspector = await usersColl.findOne({ email: inspectorEmail });
  if (existingInspector) {
    await usersColl.updateOne(
      { email: inspectorEmail },
      {
        $set: {
          role: "moh_inspector",
          fullName: "Thanh Tra Viên Cục Quản Lý Dược (Bộ Y Tế)",
          passwordHash,
          isActive: true,
          isEmailVerified: true,
          phone: "19008255",
          department: "Phòng Thanh Tra Dược & Độc Chất - Bộ Y Tế",
          updatedAt: new Date(),
        },
      }
    );
    console.log(`   ✅ Cập nhật tài khoản thanh tra thành công: ${inspectorEmail}`);
  } else {
    await usersColl.insertOne({
      email: inspectorEmail,
      fullName: "Thanh Tra Viên Cục Quản Lý Dược (Bộ Y Tế)",
      passwordHash,
      role: "moh_inspector",
      isActive: true,
      isEmailVerified: true,
      phone: "19008255",
      department: "Phòng Thanh Tra Dược & Độc Chất - Bộ Y Tế",
      createdAt: new Date(),
      updatedAt: new Date(),
    });
    console.log(`   ✅ Tạo mới tài khoản thanh tra thành công: ${inspectorEmail} | Mật khẩu: ${rawPassword}`);
  }

  // -------------------------------------------------------------
  // 2. KHỞI TẠO DANH MỤC CƠ SỞ DƯỢC (KHO TỔNG & KHO NHÁNH)
  // -------------------------------------------------------------
  console.log("\n🏢 [2/4] Khởi tạo danh mục cơ sở cấp phép: national_facilities...");
  const facilitiesColl = db.collection("national_facilities");
  await facilitiesColl.createIndex({ facility_code: 1 }, { unique: true });
  await facilitiesColl.createIndex({ branch_code: 1 });

  for (const fac of NATIONAL_FACILITIES) {
    await facilitiesColl.updateOne(
      { facility_code: fac.facility_code },
      { $set: { ...fac, updatedAt: new Date() } },
      { upsert: true }
    );
  }
  console.log(`   ✅ Đã nạp ${NATIONAL_FACILITIES.length} cơ sở (Kho Tổng GSP: BR-001, Kho Nhánh: BR-002, BR-003, BR-004, BR-005)`);

  // -------------------------------------------------------------
  // 3. ĐỒNG BỘ 2.331 THUỐC ĐANG CÓ SANG NATIONAL_DRUGS (BẢO TOÀN DỮ LIỆU)
  // -------------------------------------------------------------
  console.log("\n💊 [3/4] Đồng bộ danh mục thuốc hiện có (2.331 thuốc) sang national_drugs...");
  const medicinesColl = db.collection("medicines");
  const nationalDrugsColl = db.collection("national_drugs");
  await nationalDrugsColl.createIndex({ id: 1 }, { unique: true });
  await nationalDrugsColl.createIndex({ registration_number: 1 });
  await nationalDrugsColl.createIndex({ name: "text", active_pharmaceutical_ingredient: "text" });

  const totalMedicines = await medicinesColl.countDocuments();
  console.log(`   Số lượng thuốc trong WDP301: ${totalMedicines} thuốc`);

  const cursor = medicinesColl.find({});
  let processedCount = 0;
  let drugIndex = 1;

  const batchUpdates: any[] = [];
  const nationalDrugDocs: any[] = [];

  while (await cursor.hasNext()) {
    const med = await cursor.next();
    if (!med) continue;

    const drugId = med.nationalDrugId || `DRUG-${String(drugIndex).padStart(5, "0")}`;
    drugIndex++;

    // Xác định phân loại kê đơn: 0 (OTC) vs 1 (ETC)
    const isPrescription =
      med.drug_classification === "PRESCRIPTION_DRUG" ||
      med.category?.toLowerCase().includes("kháng sinh") ||
      med.category?.toLowerCase().includes("tim mạch") ||
      med.category?.toLowerCase().includes("tiểu đường") ||
      med.category?.toLowerCase().includes("thần kinh")
        ? 1
        : 0;

    // Xác định phân loại kiểm soát đặc biệt: 0..6
    let specialControl = 0;
    const nameLower = (med.name || "").toLowerCase();
    const activeLower = (med.active_ingredient || "").toLowerCase();

    if (nameLower.includes("morphin") || activeLower.includes("morphin")) specialControl = 1; // Gây nghiện
    else if (nameLower.includes("diazepam") || activeLower.includes("diazepam")) specialControl = 2; // Hướng thần
    else if (nameLower.includes("pseudoephedrin") || activeLower.includes("pseudoephedrin") || nameLower.includes("decolgen")) specialControl = 3; // Tiền chất
    else if (nameLower.includes("methotrexat") || activeLower.includes("methotrexat")) specialControl = 4; // Thuốc độc

    // Quy cách đóng gói & mã GTIN
    const packagings = (med.units || []).map((u: any, idx: number) => ({
      unit_id: `U-${String(idx + 1).padStart(2, "0")}`,
      unit_name: u.unitName || "Hộp",
      gtin: u.barcode || med.barcode || `893${String(Math.floor(100000000 + Math.random() * 900000000))}`,
    }));

    if (packagings.length === 0) {
      packagings.push({
        unit_id: "U-01",
        unit_name: med.unit || "Hộp",
        gtin: med.barcode || `893${String(Math.floor(100000000 + Math.random() * 900000000))}`,
      });
    }

    // Document chuẩn CSDL Dược Quốc Gia v1.1
    const nationalDrugDoc = {
      id: drugId,
      name: med.name,
      drug_group_id: med.category || "GRP-CHUNG",
      registration_number: med.registration_number || `VN-${String(Math.floor(10000 + Math.random() * 90000))}-22`,
      old_registration_number: med.old_registration_number || null,
      active_pharmaceutical_ingredient: med.active_ingredient || "Dược chất tiêu chuẩn",
      strength: med.strength || "Tiêu chuẩn Dược Điển",
      routes: [{ id: "R-01", name: med.dosage_form || "Đường uống" }],
      prescription_status: isPrescription,
      special_control_type: specialControl,
      packagings,
      last_update_time: new Date().toISOString().slice(0, 10),
      manufacturer: {
        id: "M-VN",
        name: med.manufacturer || "Công ty Cổ phần Dược phẩm Việt Nam",
        country: "Việt Nam",
        address: "Khu Công Nghiệp Dược Phẩm Quốc Gia",
      },
      approval_date: "2020-01-01",
      expiry_date: med.expiry_date || "2028-12-31",
      source_medicine_id: med._id,
      updatedAt: new Date(),
    };

    nationalDrugDocs.push(nationalDrugDoc);

    // Cập nhật lại vào medicines để gắn kết 2 bên mà không sửa dữ liệu kinh doanh
    batchUpdates.push({
      updateOne: {
        filter: { _id: med._id },
        update: {
          $set: {
            nationalDrugId: drugId,
            prescription_status: isPrescription,
            special_control_type: specialControl,
            nationalLastUpdateTime: new Date().toISOString().slice(0, 10),
          },
        },
      },
    });

    processedCount++;

    // Xử lý theo từng batch 500 để tối ưu tốc độ bằng bulkWrite
    if (nationalDrugDocs.length >= 500) {
      const nationalBulk = nationalDrugDocs.map((d) => ({
        updateOne: { filter: { id: d.id }, update: { $set: d }, upsert: true },
      }));
      await nationalDrugsColl.bulkWrite(nationalBulk);
      await medicinesColl.bulkWrite(batchUpdates);
      console.log(`   ... Đã xử lý ${processedCount}/${totalMedicines} thuốc`);
      nationalDrugDocs.length = 0;
      batchUpdates.length = 0;
    }
  }

  // Flush số còn lại
  if (nationalDrugDocs.length > 0) {
    const nationalBulk = nationalDrugDocs.map((d) => ({
      updateOne: { filter: { id: d.id }, update: { $set: d }, upsert: true },
    }));
    await nationalDrugsColl.bulkWrite(nationalBulk);
    await medicinesColl.bulkWrite(batchUpdates);
    console.log(`   ... Đã xử lý ${processedCount}/${totalMedicines} thuốc`);
  }

  const finalNationalCount = await nationalDrugsColl.countDocuments();
  console.log(`   ✅ Hoàn tất đồng bộ! national_drugs hiện có: ${finalNationalCount} thuốc.`);

  // -------------------------------------------------------------
  // 4. KHỞI TẠO SỔ CÁI GIAO DỊCH (NATIONAL_TRANSACTIONS)
  // -------------------------------------------------------------
  console.log("\n📑 [4/4] Khởi tạo Sổ Cái Giao Dịch Quốc Gia: national_transactions...");
  const txnsColl = db.collection("national_transactions");
  await txnsColl.createIndex({ transaction_id: 1 }, { unique: true });
  await txnsColl.createIndex({ facility_code: 1, transaction_type: 1 });
  await txnsColl.createIndex({ status: 1 });
  await txnsColl.createIndex({ transaction_date: -1 });

  console.log("   ✅ Đã đánh index xong cho national_transactions.");

  console.log("\n================================================================");
  console.log("🎉 KHỞI TẠO CSDL DƯỢC QUỐC GIA MÔ PHỎNG THÀNH CÔNG 100%!");
  console.log("📋 THÔNG TIN TÀI KHOẢN THANH TRA BỘ Y TẾ:");
  console.log(`   - Email: ${inspectorEmail}`);
  console.log(`   - Mật khẩu: ${rawPassword}`);
  console.log(`   - Role: moh_inspector`);
  console.log("================================================================\n");

  await mongoose.disconnect();
}

initializeNationalPharmaDatabase().catch((err) => {
  console.error("❌ Lỗi khởi tạo database:", err);
  process.exit(1);
});
