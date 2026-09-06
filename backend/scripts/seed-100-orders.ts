/**
 * =========================================================================
 * 📦 SCRIPT: seed-100-orders.ts
 * Mục đích: Thêm 100 dòng order có đánh số thứ tự (index: 1..100)
 *           xen kẽ 1 đơn Xuất Bán (Sale/Retail) và 1 đơn Xuất Hủy (Dispose/Waste)
 *           sử dụng danh mục thuốc thực tế trong database MongoDB Atlas.
 * =========================================================================
 */

import { connect, connection, Types } from 'mongoose';
import * as dotenv from 'dotenv';
import * as path from 'path';

dotenv.config({ path: path.resolve(__dirname, '../.env') });

const MONGODB_URI = process.env.MONGODB_URI || process.env.MONGODB_ATLAS_URI;

if (!MONGODB_URI) {
  console.error('❌ MONGODB_URI is not set in .env');
  process.exit(1);
}

const BRANCHES = ['BR-001', 'BR-002', 'BR-003', 'BR-004'];

const SAMPLE_CUSTOMERS = [
  'Nguyễn Văn An', 'Trần Thị Mai', 'Lê Hoàng Nam', 'Phạm Minh Tuấn',
  'Vũ Thu Hà', 'Đặng Quốc Huy', 'Bùi Lan Anh', 'Hoàng Gia Bảo',
  'Đỗ Khánh Linh', 'Ngô Quang Khải', 'Dương Thảo Nhi', 'Hồ Đức Thắng'
];

const DISPOSAL_REASONS = [
  'Thuốc quá hạn sử dụng theo biên bản kiểm kê định kỳ',
  'Bao bì rách, viên ẩm mốc trong quá trình bảo quản',
  'Lô thuốc cận hạn dưới 30 ngày theo khuyến nghị GPP',
  'Hỏng tem niêm phong và biến đổi màu sắc vỉ thuốc',
  'Thuốc thu hồi theo công văn Cục Quản lý Dược'
];

function getRandomInt(min: number, max: number) {
  return Math.floor(Math.random() * (max - min + 1)) + min;
}

function getRandomPhone() {
  const prefixes = ['090', '091', '098', '097', '038', '077', '083'];
  const prefix = prefixes[Math.floor(Math.random() * prefixes.length)];
  const suffix = Math.floor(1000000 + Math.random() * 9000000).toString().slice(0, 7);
  return `${prefix}${suffix}`;
}

async function run() {
  try {
    console.log('🔄 Đang kết nối tới cơ sở dữ liệu MongoDB Atlas...');
    await connect(MONGODB_URI!);
    console.log('✅ Kết nối thành công!');

    const db = connection.db!;
    const ordersCol = db.collection('orders');
    const medicinesCol = db.collection('medicines');
    const transactionsCol = db.collection('inventorytransactions');

    // 1. Lấy danh sách thuốc thực tế từ DB
    const medicines = await medicinesCol.find({ price: { $gt: 0 } }).limit(50).toArray();

    if (medicines.length === 0) {
      console.error('❌ Không tìm thấy thuốc nào trong DB!');
      process.exit(1);
    }
    console.log(`📦 Đã nạp ${medicines.length} thuốc mẫu từ database để tạo đơn.`);

    // 2. Tìm mã orderCode bắt đầu (đảm bảo không trùng)
    const baseOrderCode = 92000000;
    const now = Date.now();

    const ordersToInsert: any[] = [];
    const transactionsToInsert: any[] = [];

    console.log('\n🚀 Bắt đầu sinh 100 đơn hàng xen kẽ Xuất Bán và Xuất Hủy...\n');

    for (let index = 1; index <= 100; index++) {
      const isDisposal = index % 2 === 0; // Dòng chẵn: Xuất Hủy, Dòng lẻ: Xuất Bán
      const orderCode = baseOrderCode + index;
      const orderId = new Types.ObjectId();
      const branchId = BRANCHES[(index - 1) % BRANCHES.length];

      // Tạo thời gian lùi dần trong khoảng 30 ngày qua
      const timeOffset = (100 - index) * 5 * 3600 * 1000; // mỗi đơn cách nhau khoảng 5 giờ
      const orderDate = new Date(now - timeOffset);

      // Chọn 1 - 3 mặt hàng ngẫu nhiên
      const numItems = getRandomInt(1, 3);
      const items: any[] = [];
      let totalAmount = 0;

      for (let j = 0; j < numItems; j++) {
        const med = medicines[(index + j) % medicines.length];
        const qty = isDisposal ? getRandomInt(1, 5) : getRandomInt(1, 10);
        const price = med.price || 50000;
        const itemTotal = price * qty;

        totalAmount += itemTotal;
        items.push({
          _id: new Types.ObjectId(),
          medicineId: med._id.toString(),
          name: med.name,
          quantity: qty,
          price: price,
          unit: med.unit || 'Hộp'
        });

        // Tạo biến động kho tương ứng
        transactionsToInsert.push({
          type: isDisposal ? 'DISPOSE' : 'SALE_EXPORT',
          medicineId: med._id.toString(),
          medicineName: med.name,
          batchNo: `BATCH-${new Date(orderDate).toISOString().slice(0, 7)}-${branchId}`,
          quantityChange: -qty,
          stockBefore: (med.stock || 100) + qty,
          stockAfter: med.stock || 100,
          referenceId: orderId.toString(),
          referenceType: isDisposal ? 'EXPIRED_DISPOSAL' : 'ORDER',
          performedBy: isDisposal ? 'Thủ kho (Biên bản xuất hủy)' : 'Dược sĩ bán hàng',
          notes: isDisposal 
            ? `[Index #${index}] ${DISPOSAL_REASONS[index % DISPOSAL_REASONS.length]}`
            : `[Index #${index}] Đơn bán lẻ tại quầy ${branchId}`,
          createdAt: orderDate,
          updatedAt: orderDate
        });
      }

      if (isDisposal) {
        // --- ĐƠN XUẤT HỦY (Dòng chẵn: 2, 4, 6, ..., 100) ---
        const reason = DISPOSAL_REASONS[index % DISPOSAL_REASONS.length];
        ordersToInsert.push({
          _id: orderId,
          index: index, // Đánh số thứ tự index
          orderCode: orderCode,
          patientName: `[Index #${index}] Phiếu Xuất Hủy - ${reason.slice(0, 30)}...`,
          patientPhone: '0900000000',
          patientEmail: 'disposal@vinapharmacy.com',
          shippingAddress: `Khu vực lưu trữ hàng hủy - Chi nhánh ${branchId}`,
          items: items,
          totalAmount: totalAmount,
          paymentMethod: 'CASH',
          paymentStatus: 'CANCELLED', // Trạng thái hủy/tiêu hủy
          type: 'DISPOSE',            // Loại phiếu: Xuất Hủy
          branchId: branchId,
          notes: `[Index #${index}] ${reason}`,
          voucherDiscount: 0,
          redeemedPoints: 0,
          pointsDiscount: 0,
          earnedPoints: 0,
          createdAt: orderDate,
          updatedAt: orderDate,
          __v: 0
        });
      } else {
        // --- ĐƠN XUẤT BÁN (Dòng lẻ: 1, 3, 5, ..., 99) ---
        const customer = SAMPLE_CUSTOMERS[(index - 1) % SAMPLE_CUSTOMERS.length];
        const phone = getRandomPhone();
        ordersToInsert.push({
          _id: orderId,
          index: index, // Đánh số thứ tự index
          orderCode: orderCode,
          patientName: `[Index #${index}] ${customer} (Đơn Bán Lẻ)`,
          patientPhone: phone,
          patientEmail: `customer${index}@gmail.com`,
          shippingAddress: `Mua tại quầy - Nhà thuốc Chi nhánh ${branchId}`,
          items: items,
          totalAmount: totalAmount,
          paymentMethod: index % 3 === 0 ? 'QR_PAY' : 'CASH',
          paymentStatus: 'PAID',      // Đã thanh toán / Hoàn thành
          type: 'RETAIL',             // Loại phiếu: Bán lẻ
          branchId: branchId,
          notes: `[Index #${index}] Đơn bán hàng thành công tại quầy`,
          voucherDiscount: 0,
          redeemedPoints: 0,
          pointsDiscount: 0,
          earnedPoints: Math.round(totalAmount * 0.01),
          createdAt: orderDate,
          updatedAt: orderDate,
          __v: 0
        });
      }
    }

    // 3. Thực hiện lưu vào Database
    console.log(`💾 Đang chèn 100 đơn hàng vào collection 'orders'...`);
    const orderResult = await ordersCol.insertMany(ordersToInsert);
    console.log(`✅ Đã chèn thành công ${orderResult.insertedCount} đơn hàng vào 'orders'!`);

    console.log(`💾 Đang ghi nhận ${transactionsToInsert.length} giao dịch kho tương ứng vào 'inventorytransactions'...`);
    const txnResult = await transactionsCol.insertMany(transactionsToInsert);
    console.log(`✅ Đã chèn thành công ${txnResult.insertedCount} giao dịch kho!`);

    // 4. Kiểm tra và in mẫu thống kê
    console.log('\n--- BÁO CÁO KIỂM TRA 100 ĐƠN HÀNG VỪA TẠO ---');
    const insertedOrders = await ordersCol.find({
      orderCode: { $gte: 92000001, $lte: 92000100 }
    }).sort({ index: 1 }).toArray();

    const retailCount = insertedOrders.filter(o => o.type === 'RETAIL').length;
    const disposeCount = insertedOrders.filter(o => o.type === 'DISPOSE').length;

    console.log(`📊 Tổng số đơn: ${insertedOrders.length}`);
    console.log(`🛒 Đơn Xuất Bán (dòng lẻ 1, 3, 5...): ${retailCount}`);
    console.log(`🗑️ Đơn Xuất Hủy (dòng chẵn 2, 4, 6...): ${disposeCount}`);

    console.log('\n🔍 Xem trước 6 dòng đầu tiên (xen kẽ):');
    insertedOrders.slice(0, 6).forEach(o => {
      console.log(`  [Index: ${o.index}] Mã: ${o.orderCode} | Loại: ${o.type.padEnd(8)} | Trạng thái: ${o.paymentStatus.padEnd(10)} | Tên: ${o.patientName.slice(0, 40)} | Tiền: ${o.totalAmount.toLocaleString('vi-VN')} đ`);
    });

    console.log('\n🔍 Xem trước 4 dòng cuối cùng:');
    insertedOrders.slice(-4).forEach(o => {
      console.log(`  [Index: ${o.index}] Mã: ${o.orderCode} | Loại: ${o.type.padEnd(8)} | Trạng thái: ${o.paymentStatus.padEnd(10)} | Tên: ${o.patientName.slice(0, 40)} | Tiền: ${o.totalAmount.toLocaleString('vi-VN')} đ`);
    });

  } catch (error) {
    console.error('❌ Lỗi khi tạo dữ liệu order:', error);
  } finally {
    await connection.close();
    console.log('\n🔌 Đã đóng kết nối database.');
  }
}

run();
