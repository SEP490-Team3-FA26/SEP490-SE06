const mongoose = require('mongoose');

const MONGODB_URI = 'mongodb+srv://phuocthde180577_db_user:Phuoc12345@cluster0.ruhl6tb.mongodb.net/WDP201?appName=Cluster0';

async function checkCustomers() {
  try {
    console.log('Connecting to MongoDB...');
    await mongoose.connect(MONGODB_URI);
    console.log('Connected successfully!\n');

    const db = mongoose.connection.db;
    const usersCollection = db.collection('users');

    // 1. Thống kê theo role
    const roleStats = await usersCollection.aggregate([
      { $group: { _id: '$role', count: { $sum: 1 } } }
    ]).toArray();

    console.log('=== THỐNG KÊ NGƯỜI DÙNG THEO ROLE ===');
    console.table(roleStats);

    // 2. Lấy toàn bộ người dùng có role = 'user' (khách hàng)
    const allCustomers = await usersCollection.find({ role: 'user' }).toArray();
    console.log(`\n=== TỔNG SỐ KHÁCH HÀNG (role: 'user'): ${allCustomers.length} ===`);

    // 3. Kiểm tra điều kiện ALL
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    const allEligible = allCustomers.filter(u => {
      const emailOk = u.email && emailRegex.test(u.email);
      const subscribed = u.newsletter?.isSubscribed !== false;
      const validEmail = u.newsletter?.isEmailValid !== false;
      return emailOk && subscribed && validEmail;
    });

    // 4. Kiểm tra điều kiện VIP
    const vipEligible = allEligible.filter(u => {
      const tierOk = ['Gold', 'Platinum', 'VIP', 'Vip', 'gold', 'platinum'].includes(u.tier);
      const targetGroupVip = u.targetGroup === 'VIP';
      const accumulatedOk = (u.accumulatedPoints || 0) >= 1000;
      const pointsOk = (u.points || 0) >= 500;
      return tierOk || targetGroupVip || accumulatedOk || pointsOk;
    });

    console.log(`- Đủ điều kiện nhận tệp ALL (Tất cả khách hàng): ${allEligible.length}`);
    console.log(`- Đủ điều kiện nhận tệp VIP: ${vipEligible.length}`);

    console.log('\n=== DANH SÁCH CHI TIẾT TẤT CẢ KHÁCH HÀNG (role: "user") ===');
    const tableData = allCustomers.map((u, idx) => ({
      STT: idx + 1,
      TenKhachHang: u.fullName || u.name || '(Chưa đặt)',
      Email: u.email,
      HangThe: u.tier || 'BRONZE',
      DiemTichLuy: u.accumulatedPoints || 0,
      DiemKhaDung: u.points || u.loyaltyPoints || 0,
      NhanTin: u.newsletter?.isSubscribed !== false ? 'Bật' : 'Tắt',
      TepALL: allEligible.some(e => e._id.toString() === u._id.toString()) ? '✅ Có' : '❌ Không',
      TepVIP: vipEligible.some(e => e._id.toString() === u._id.toString()) ? '⭐ Có' : '❌ Không',
    }));
    console.table(tableData);

    // 5. Nếu không có khách hàng hoặc ít, xem thử các tài khoản khác (admin/pharmacist/...)
    if (allCustomers.length < 5) {
      console.log('\n=== TỔNG QUAN CÁC TÀI KHOẢN KHÁC TRONG HỆ THỐNG ===');
      const otherUsers = await usersCollection.find({ role: { $ne: 'user' } }).limit(10).toArray();
      console.table(otherUsers.map(u => ({
        Ten: u.fullName || u.name,
        Email: u.email,
        Role: u.role
      })));
    }

  } catch (err) {
    console.error('Lỗi truy vấn:', err.message);
  } finally {
    await mongoose.disconnect();
  }
}

checkCustomers();
