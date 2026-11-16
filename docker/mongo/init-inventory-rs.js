/**
 * Kịch Bản Khởi Tạo Replica Set rs-inv Cho Container mongo-inventory
 * Bắt buộc cho Multi-Document Transactions trong nghiệp vụ Quản lý Kho Dược GSP
 */

try {
  const status = rs.status();
  print("ℹ️ [Inventory RS] Replica Set đã tồn tại:", status.set);
} catch (e) {
  print("🔄 [Inventory RS] Đang khởi tạo Replica Set rs-inv cho container Inventory...");
  rs.initiate({
    _id: "rs-inv",
    members: [{ _id: 0, host: "mongo-inventory:27017" }]
  });
  print("✅ [Inventory RS] Khởi tạo Replica Set rs-inv thành công!");
}

while (!rs.isMaster().ismaster) {
  print("⏳ [Inventory RS] Đang chờ node trở thành PRIMARY...");
  sleep(1000);
}

const adminDb = db.getSiblingDB("admin");
const serviceUser = process.env.SERVICE_DB_USER || "user_inventory";
const servicePass = process.env.SERVICE_DB_PASSWORD || "InvSec2026_wDp#";
const targetDbName = "wdp301_inventory";

if (!adminDb.getUser(serviceUser)) {
  print(`🔄 [Inventory RS] Đang tạo User "${serviceUser}" trên database [${targetDbName}]...`);
  adminDb.createUser({
    user: serviceUser,
    pwd: servicePass,
    roles: [
      { role: "readWrite", db: targetDbName }
    ]
  });
  print(`✅ [Inventory RS] Đã tạo thành công User "${serviceUser}" trên [${targetDbName}]!`);
}

