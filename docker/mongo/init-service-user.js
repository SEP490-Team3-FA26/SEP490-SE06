/**
 * Kịch Bản Tạo User Phân Quyền Riêng Cho Từng Container MongoDB Độc Lập
 * Chạy tự động tại thư mục /docker-entrypoint-initdb.d khi container khởi động lần đầu
 */

const targetDbName = process.env.SERVICE_DB_NAME || "admin";
const serviceUser = process.env.SERVICE_DB_USER;
const servicePass = process.env.SERVICE_DB_PASSWORD;

if (serviceUser && servicePass) {
  const targetDb = db.getSiblingDB(targetDbName);
  print(`🔄 [Init Service DB] Đang khởi tạo User "${serviceUser}" trên database [${targetDbName}]...`);
  
  // Tạo user trong database admin với quyền readWrite trên targetDbName
  const adminDb = db.getSiblingDB("admin");
  adminDb.createUser({
    user: serviceUser,
    pwd: servicePass,
    roles: [
      { role: "readWrite", db: targetDbName }
    ]
  });
  
  print(`✅ [Init Service DB] Đã tạo thành công User "${serviceUser}" với quyền readWrite trên [${targetDbName}]!`);
}

