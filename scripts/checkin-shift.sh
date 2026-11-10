#!/bin/bash
# ==============================================================================
# Script tự động điểm danh vào ca trực (Check-in Shift) cho Dược sĩ
# Dự án: WDP301 - Chuỗi Nhà Thuốc Chuẩn GPP
# Chú thích: Tiếng Việt 100% theo quy chuẩn dự án
# ==============================================================================

echo "=========================================================================="
echo "🩺 ĐANG ĐIỂM DANH VÀO CA TRỰC CHO DƯỢC SĨ (GPP ACTIVE SHIFT)..."
echo "=========================================================================="

docker exec wdp301-backend-1 node -e '
const mongoose = require("mongoose");

async function run() {
  await mongoose.connect(process.env.MONGODB_URI);
  const vnTime = new Date(Date.now() + 7 * 60 * 60 * 1000);
  const todayStr = vnTime.toISOString().slice(0, 10);
  const now = new Date();

  // Danh sách các tài khoản Dược sĩ / Quản lý ca trực chính
  const targetEmails = [
    "pharmacist@vinapharmacy.com",
    "duocsi1@gmail.com",
    "phuoc@vinapharmacy.com",
    "pharmacist.cn2@vinapharmacy.com",
    "pharmacist.cn3@vinapharmacy.com",
    "pharmacist.cn4@vinapharmacy.com",
    "manager@vinapharmacy.com"
  ];

  const users = await mongoose.connection.collection("users").find({ email: { $in: targetEmails } }).toArray();
  const branches = await mongoose.connection.collection("branches").find().toArray();
  const branchMap = {};
  branches.forEach(b => {
    branchMap[b.branchCode] = b;
  });

  const results = [];
  for (const u of users) {
    const branchCode = u.branchId || "BR-001";
    const branch = branchMap[branchCode] || branchMap["BR-001"] || { latitude: 15.968868, longitude: 108.256895 };

    const updateDoc = {
      $set: {
        employeeName: u.fullName,
        employeeRole: u.role,
        branchId: branchCode,
        shiftId: "DEFAULT",
        shiftName: "Ca làm việc chính thức (POS Active)",
        checkInTime: now,
        checkInLatitude: branch.latitude,
        checkInLongitude: branch.longitude,
        checkInDistanceMeters: 5,
        checkOutTime: null,
        checkOutLatitude: null,
        checkOutLongitude: null,
        status: "CHECKED_IN",
        isMockLocation: false,
        handoverId: null,
        isHandoverSubmitted: false,
        isHandoverCompleted: false,
        note: "Vào ca trực thành công qua script hỗ trợ kiểm thử",
        updatedAt: now
      },
      $setOnInsert: {
        employeeId: u._id,
        date: todayStr,
        createdAt: now
      }
    };

    await mongoose.connection.collection("attendances").updateOne(
      { employeeId: u._id, date: todayStr },
      updateDoc,
      { upsert: true }
    );
    results.push({ email: u.email, name: u.fullName, branch: branchCode, status: "CHECKED_IN" });
  }

  console.log("✅ Đã kích hoạt ca trực hôm nay (" + todayStr + ") thành công:");
  console.table(results);
  await mongoose.disconnect();
}
run().catch(console.error);
'

echo "=========================================================================="
echo "🎉 HOÀN TẤT! Dược sĩ đã vào ca trực thành công, quầy POS đã mở khóa bán hàng."
echo "=========================================================================="
