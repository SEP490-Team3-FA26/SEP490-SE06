/**
 * Kịch Bản Khởi Tạo Cụm MongoDB 8.0 Single-Node Replica Set (rs0)
 * và Cấp Quyền Tối Thiểu (Least Privilege) Cho 7 Microservices
 * 
 * Tự động kích hoạt khi container khởi động lần đầu với volume rỗng.
 */

// 1. Khởi tạo Single-Node Replica Set bắt buộc cho Multi-Document Transactions
try {
  const status = rs.status();
  print("ℹ️ [Mongo Init] Replica Set đã tồn tại:", status.set);
} catch (e) {
  print("🔄 [Mongo Init] Đang khởi tạo Replica Set rs0...");
  rs.initiate({
    _id: "rs0",
    members: [{ _id: 0, host: "127.0.0.1:27017" }]
  });
  print("✅ [Mongo Init] Khởi tạo Replica Set rs0 thành công!");
}

// Chờ Replica Set sẵn sàng thành Primary
while (!rs.isMaster().ismaster) {
  print("⏳ [Mongo Init] Đang chờ node trở thành PRIMARY...");
  sleep(1000);
}

// 2. Tạo tài khoản quản trị Root Admin
const adminDb = db.getSiblingDB("admin");
const rootUser = process.env.MONGO_ROOT_USER || "wdp_admin";
const rootPass = process.env.MONGO_ROOT_PASSWORD || "PhuocAdminSecure2026!WDP";

if (!adminDb.getUser(rootUser)) {
  print(`🔄 [Mongo Init] Đang tạo Root Admin User "${rootUser}"...`);
  adminDb.createUser({
    user: rootUser,
    pwd: rootPass,
    roles: [{ role: "root", db: "admin" }]
  });
  print("✅ [Mongo Init] Đã tạo Root Admin thành công!");
}

// 3. Danh sách 7 Database và User riêng biệt cho từng Microservice (Least Privilege)
const microserviceUsers = [
  {
    db: "wdp301_auth",
    user: process.env.MONGO_AUTH_USER || "user_auth",
    pwd: process.env.MONGO_AUTH_PASSWORD || "AuthSec2026_wDp#",
    desc: "Auth Service - Xác thực & OTP"
  },
  {
    db: "wdp301_user",
    user: process.env.MONGO_USER_USER || "user_user",
    pwd: process.env.MONGO_USER_PASSWORD || "UserSec2026_wDp#",
    desc: "User Service - Hồ sơ & Nhân sự HR"
  },
  {
    db: "wdp301_orders",
    user: process.env.MONGO_ORDERS_USER || "user_orders",
    pwd: process.env.MONGO_ORDERS_PASSWORD || "OrdersSec2026_wDp#",
    desc: "Orders Service - Bán hàng & Thu chi"
  },
  {
    db: "wdp301_inventory",
    user: process.env.MONGO_INVENTORY_USER || "user_inventory",
    pwd: process.env.MONGO_INVENTORY_PASSWORD || "InvSec2026_wDp#",
    desc: "Inventory Service - Dược phẩm & Kho GSP"
  },
  {
    db: "wdp301_supplier",
    user: process.env.MONGO_SUPPLIER_USER || "user_supplier",
    pwd: process.env.MONGO_SUPPLIER_PASSWORD || "SuppSec2026_wDp#",
    desc: "Supplier Service - Nhà cung cấp GDP"
  },
  {
    db: "wdp301_gateway",
    user: process.env.MONGO_GATEWAY_USER || "user_gateway",
    pwd: process.env.MONGO_GATEWAY_PASSWORD || "GatewaySec2026_wDp#",
    desc: "API Gateway - Thông báo & IoT Alert"
  },
  {
    db: "wdp301_national_pharma",
    user: process.env.MONGO_PHARMA_USER || "user_pharma",
    pwd: process.env.MONGO_PHARMA_PASSWORD || "PharmaSec2026_wDp#",
    desc: "CSDL Dược Quốc Gia Mock Server"
  }
];

microserviceUsers.forEach((service) => {
  const targetDb = db.getSiblingDB(service.db);
  if (!targetDb.getUser(service.user)) {
    print(`🔄 [Mongo Init] Đang tạo User "${service.user}" cho DB [${service.db}] (${service.desc})...`);
    targetDb.createUser({
      user: service.user,
      pwd: service.pwd,
      roles: [{ role: "readWrite", db: service.db }]
    });
    print(`✅ [Mongo Init] Đã tạo thành công User [${service.user}] trên DB [${service.db}]!`);
  }
});

print("🎉 [Mongo Init] Toàn bộ 7 Databases và 7 Users phân quyền Least-Privilege đã sẵn sàng!");

