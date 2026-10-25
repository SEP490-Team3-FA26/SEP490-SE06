// backend/apps/orders-service/src/orders-service.integration.spec.ts
/// <reference types="jest" />
import mongoose, { Model } from 'mongoose';
import { startTestContainer, TestContainerEnvironment } from '../../../test/test-container.helper';
import { Order, OrderSchema } from './schemas/order.schema';
import { Voucher, VoucherSchema } from './schemas/voucher.schema';

describe('Order Management Integration Test with Test Container (Report 5: F02 & F03)', () => {
  let testEnv: TestContainerEnvironment;
  let orderModel: Model<Order>;
  let voucherModel: Model<Voucher>;

  // Khởi động Test Container trước khi chạy toàn bộ test suite
  beforeAll(async () => {
    jest.setTimeout(60000); // 60s để container kịp khởi động
    testEnv = await startTestContainer();

    // Khởi tạo Models liên kết với Test Container connection
    orderModel = mongoose.model<Order>(Order.name, OrderSchema);
    voucherModel = mongoose.model<Voucher>(Voucher.name, VoucherSchema);
  });

  // Dọn dẹp sạch dữ liệu giữa các test cases
  afterEach(async () => {
    await testEnv.clean();
  });

  // Đóng và giải phóng Test Container sau khi hoàn thành
  afterAll(async () => {
    await testEnv.stop();
  });

  it('Kiểm tra môi trường Test Container đã kết nối thành công', () => {
    expect(testEnv.uri).toBeDefined();
    expect(mongoose.connection.readyState).toBe(1); // 1 = Connected
  });

  // ============================================================
  // TC-10: Lưu trữ & Tạo mới đơn hàng trên Test Container
  // ============================================================
  it('TC-10 (Integration): Tạo và lưu đơn hàng thành công vào Test Container', async () => {
    const newOrderData = {
      orderCode: 987654321,
      patientName: 'Lê Văn Cường',
      patientPhone: '0988776655',
      patientEmail: 'cuong.le@example.com',
      shippingAddress: '456 Lê Duẩn, Đà Nẵng',
      items: [
        {
          medicineId: 'med-paracetamol-500',
          name: 'Paracetamol 500mg',
          quantity: 3,
          price: 25000,
          unit: 'Hộp',
        },
      ],
      totalAmount: 75000,
      paymentMethod: 'QR_PAY',
      paymentStatus: 'PENDING',
    };

    const savedOrder = await orderModel.create(newOrderData);

    expect(savedOrder._id).toBeDefined();
    expect(savedOrder.orderCode).toBe(987654321);
    expect(savedOrder.paymentStatus).toBe('PENDING');
    expect(savedOrder.items).toHaveLength(1);
    expect(savedOrder.totalAmount).toBe(75000);

    // Kiểm tra trực tiếp trong Test Container MongoDB
    const fetched = await orderModel.findOne({ orderCode: 987654321 }).exec();
    expect(fetched).not.toBeNull();
    expect(fetched?.patientName).toBe('Lê Văn Cường');
  });

  // ============================================================
  // TC-11: Cập nhật trạng thái thanh toán đơn hàng (Status Transition)
  // ============================================================
  it('TC-11 (Integration): Cập nhật trạng thái thanh toán từ PENDING sang PAID', async () => {
    const order = await orderModel.create({
      orderCode: 11223344,
      patientName: 'Trần Thị Mai',
      patientPhone: '0912345678',
      shippingAddress: 'Quận 1, TP.HCM',
      items: [
        {
          medicineId: 'med-berberin',
          name: 'Berberin Mộc Hoa',
          quantity: 2,
          price: 30000,
        },
      ],
      totalAmount: 60000,
      paymentMethod: 'QR_PAY',
      paymentStatus: 'PENDING',
    });

    // Giả lập webhook xác nhận thanh toán PayOS thành công
    const updated = await orderModel.findOneAndUpdate(
      { orderCode: 11223344 },
      { $set: { paymentStatus: 'PAID' } },
      { new: true },
    );

    expect(updated?.paymentStatus).toBe('PAID');

    // Truy vấn lại từ database để đảm bảo dữ liệu đã được lưu bền vững
    const verifiedOrder = await orderModel.findById(order._id).exec();
    expect(verifiedOrder?.paymentStatus).toBe('PAID');
  });

  // ============================================================
  // TC-75: Quản lý Voucher khuyến mãi & Ràng buộc giá trị đơn tối thiểu
  // ============================================================
  it('TC-75 (Integration): Tạo và truy vấn Voucher thỏa mãn điều kiện đơn hàng tối thiểu', async () => {
    await voucherModel.create({
      code: 'PHARMA20',
      description: 'Giảm 20.000đ cho đơn từ 150.000đ',
      discountType: 'FIXED_AMOUNT',
      discountValue: 20000,
      minOrderValue: 150000,
      ruleType: 'STANDARD',
      isActive: true,
      usedCount: 0,
      startDate: new Date(Date.now() - 86400000), // Hôm qua
      expiryDate: new Date(Date.now() + 86400000 * 7), // 7 ngày tới
    });

    const voucher = await voucherModel.findOne({ code: 'PHARMA20', isActive: true }).exec();
    expect(voucher).not.toBeNull();
    expect(voucher?.discountValue).toBe(20000);
    expect(voucher?.minOrderValue).toBe(150000);

    // Đơn hàng 200k thỏa điều kiện minOrderValue >= 150k
    const orderTotal = 200000;
    const isApplicable = orderTotal >= (voucher?.minOrderValue || 0);
    expect(isApplicable).toBe(true);

    const finalAmount = orderTotal - (voucher?.discountValue || 0);
    expect(finalAmount).toBe(180000);
  });
});
