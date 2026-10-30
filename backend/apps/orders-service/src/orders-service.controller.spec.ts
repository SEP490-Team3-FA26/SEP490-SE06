// backend/apps/orders-service/src/orders-service.controller.spec.ts
/// <reference types="jest" />
import { Test, TestingModule } from '@nestjs/testing';
import { OrdersServiceController } from './orders-service.controller';
import { OrdersServiceService } from './orders-service.service';
import { RpcException } from '@nestjs/microservices';

describe('Order Management - OrdersServiceController (Report 5: F02 & F03)', () => {
  let controller: OrdersServiceController;
  let service: OrdersServiceService;

  // Mock dữ liệu service trả về
  const mockOrdersService = {
    createOrder: jest.fn(),
    checkPaymentStatus: jest.fn(),
    listOrders: jest.fn(),
    getMyOrders: jest.fn(),
    createVoucher: jest.fn(),
    updateVoucher: jest.fn(),
    deleteVoucher: jest.fn(),
    listVouchers: jest.fn(),
    validateVoucher: jest.fn(),
    getShiftSalesAggregation: jest.fn(),
    getPharmacistKpiAggregation: jest.fn(),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [OrdersServiceController],
      providers: [
        {
          provide: OrdersServiceService,
          useValue: mockOrdersService,
        },
      ],
    }).compile();

    controller = module.get<OrdersServiceController>(OrdersServiceController);
    service = module.get<OrdersServiceService>(OrdersServiceService);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  it('Kiểm tra controller đã được khởi tạo thành công', () => {
    expect(controller).toBeDefined();
  });

  // ============================================================
  // UC-10: Online Checkout & Create Order (TC-10 Happy Path & Fail)
  // ============================================================
  describe('[UC-10 / TC-10] createOrder - Đặt hàng trực tuyến', () => {
    const createOrderPayload: any = {
      orderCode: 123456,
      patientName: 'Nguyễn Văn A',
      patientPhone: '0901234567',
      shippingAddress: '123 Đường Dược Phẩm, TP.HCM',
      items: [
        { medicineId: 'med-01', name: 'Panadol Extra', quantity: 2, price: 50000 },
      ],
      totalAmount: 100000,
      paymentMethod: 'QR_PAY',
    };

    it('TC-10.1: Tạo đơn hàng thành công khi đầy đủ thông tin hợp lệ (Happy Path)', async () => {
      const mockResult = {
        orderId: 'mock-order-id-01',
        orderCode: 123456,
        status: 'PENDING',
        totalAmount: 100000,
        paymentLink: 'https://payos.vn/pay/123456',
      };
      mockOrdersService.createOrder.mockResolvedValue(mockResult);

      const result = await controller.createOrder(createOrderPayload);

      expect(result).toEqual(mockResult);
      expect(service.createOrder).toHaveBeenCalledWith(createOrderPayload);
    });

    it('TC-10.2: Ném lỗi RpcException khi service báo lỗi thiếu thông tin hoặc hết hàng', async () => {
      mockOrdersService.createOrder.mockRejectedValue(new Error('Tồn kho không đủ để đáp ứng đơn hàng'));

      await expect(controller.createOrder(createOrderPayload)).rejects.toThrow(RpcException);
    });
  });

  // ============================================================
  // UC-11: Payment Status Check (TC-11 PayOS VietQR Verification)
  // ============================================================
  describe('[UC-11 / TC-11] checkPaymentStatus - Đối soát thanh toán VietQR PayOS', () => {
    it('TC-11.1: Trả về trạng thái thanh toán thành công (PAID)', async () => {
      const mockPaymentResult = {
        orderCode: 123456,
        status: 'PAID',
        amount: 100000,
        paidAt: new Date().toISOString(),
      };
      mockOrdersService.checkPaymentStatus.mockResolvedValue(mockPaymentResult);

      const result = await controller.checkPaymentStatus({ orderCode: 123456 });

      expect(result).toEqual(mockPaymentResult);
      expect(service.checkPaymentStatus).toHaveBeenCalledWith(123456);
    });

    it('TC-11.2: Ném lỗi RpcException khi mã đơn hàng không tồn tại', async () => {
      mockOrdersService.checkPaymentStatus.mockRejectedValue(new Error('Không tìm thấy đơn hàng'));

      await expect(controller.checkPaymentStatus({ orderCode: 999999 })).rejects.toThrow(RpcException);
    });
  });

  // ============================================================
  // UC-12: Order Tracking & Customer Orders (TC-12 History)
  // ============================================================
  describe('[UC-12 / TC-12] listOrders & getMyOrders - Lịch sử và tra cứu đơn hàng', () => {
    it('TC-12.1: Lấy danh sách toàn bộ đơn hàng của hệ thống', async () => {
      const mockOrderList = [
        { orderCode: 123456, patientName: 'Nguyễn Văn A', totalAmount: 100000 },
        { orderCode: 123457, patientName: 'Trần Thị B', totalAmount: 250000 },
      ];
      mockOrdersService.listOrders.mockResolvedValue(mockOrderList);

      const result = await controller.listOrders();

      expect(result).toEqual(mockOrderList);
      expect(service.listOrders).toHaveBeenCalled();
    });

    it('TC-12.2: Lấy lịch sử đơn hàng của khách hàng theo số điện thoại hoặc ID', async () => {
      const mockMyOrders = [{ orderCode: 123456, patientPhone: '0901234567' }];
      mockOrdersService.getMyOrders.mockResolvedValue(mockMyOrders);

      const result = await controller.getMyOrders({ phone: '0901234567' });

      expect(result).toEqual(mockMyOrders);
      expect(service.getMyOrders).toHaveBeenCalledWith(undefined, undefined, '0901234567');
    });
  });

  // ============================================================
  // UC-20 & UC-75: Voucher Management & Promo Combo (TC-20, TC-75)
  // ============================================================
  describe('[UC-20 & UC-75] Quản lý Voucher & Khuyến mãi (Combo, Mua X tặng Y)', () => {
    it('TC-75.1: Tạo mới Voucher khuyến mãi thành công', async () => {
      const newVoucherDto = {
        code: 'SALE50K',
        discountType: 'FIXED_AMOUNT',
        discountValue: 50000,
        minOrderValue: 200000,
        ruleType: 'STANDARD',
      };
      const createdVoucher = { _id: 'voucher-01', ...newVoucherDto, isActive: true };
      mockOrdersService.createVoucher.mockResolvedValue(createdVoucher);

      const result = await controller.createVoucher(newVoucherDto);

      expect(result).toEqual(createdVoucher);
      expect(service.createVoucher).toHaveBeenCalledWith(newVoucherDto);
    });

    it('TC-75.2: Xóa voucher khuyến mãi thành công', async () => {
      mockOrdersService.deleteVoucher.mockResolvedValue({ success: true, message: 'Đã xóa voucher' });

      const result = await controller.deleteVoucher({ id: 'voucher-01' });

      expect(result.success).toBe(true);
      expect(service.deleteVoucher).toHaveBeenCalledWith('voucher-01');
    });
  });

  // ============================================================
  // UC-111 / SCRUM-106: Shift Sales Aggregation & Pharmacist KPI Report
  // ============================================================
  describe('[UC-111 / SCRUM-106] getShiftSalesAggregation & getPharmacistKpiReport', () => {
    // 1. [Normal Values]
    it('TC-111.1: [Normal Values] Tổng hợp doanh số ca trực thành công', async () => {
      const mockResult = {
        branchId: 'BR-001',
        totalRevenue: 3000000,
        cashSales: 2000000,
        digitalSales: 1000000,
        ordersCount: 15,
        otcCount: 6,
        otcRate: 40,
        recentOrders: [],
      };
      mockOrdersService.getShiftSalesAggregation.mockResolvedValue(mockResult);

      const payload = { branchId: 'BR-001', shiftId: 'CA_SANG', pharmacistId: '6745...01' };
      const res = await controller.getShiftSalesAggregation(payload);

      expect(res).toEqual(mockResult);
      expect(service.getShiftSalesAggregation).toHaveBeenCalledWith(payload);
    });

    it('TC-111.2: [Normal Values] Xuất báo cáo KPI Dược sĩ thành công', async () => {
      const mockKpiResult = {
        month: 10,
        year: 2026,
        branchId: 'BR-001',
        totalPharmacists: 1,
        kpiList: [
          {
            pharmacistId: '6745...01',
            pharmacistName: 'Dược sĩ Test',
            branchId: 'BR-001',
            totalRevenue: 50000000,
            cashRevenue: 30000000,
            digitalRevenue: 20000000,
            orderCount: 100,
            otcCount: 40,
            averageOrderValue: 500000,
            otcAttachmentRate: 40,
            assignedQuota: 50000000,
            quotaCompletionRate: 100,
          },
        ],
      };
      mockOrdersService.getPharmacistKpiAggregation.mockResolvedValue(mockKpiResult);

      const payload = { branchId: 'BR-001', month: 10, year: 2026 };
      const res = await controller.getPharmacistKpiReport(payload);

      expect(res).toEqual(mockKpiResult);
      expect(service.getPharmacistKpiAggregation).toHaveBeenCalledWith(payload);
    });

    // 2. [Boundary Values]
    it('TC-111.3: [Boundary Values] Xử lý an toàn khi ca không có đơn hàng nào (0 doanh số)', async () => {
      const emptyResult = {
        branchId: 'BR-001',
        totalRevenue: 0,
        cashSales: 0,
        digitalSales: 0,
        ordersCount: 0,
        otcCount: 0,
        otcRate: 0,
        recentOrders: [],
      };
      mockOrdersService.getShiftSalesAggregation.mockResolvedValue(emptyResult);

      const res = await controller.getShiftSalesAggregation({ branchId: 'BR-001' });
      expect(res.totalRevenue).toBe(0);
      expect(res.ordersCount).toBe(0);
    });

    it('TC-111.4: [Boundary Values] Xử lý an toàn khi Quota bằng 0 (không chia cho 0)', async () => {
      const zeroQuotaResult = {
        month: 10,
        year: 2026,
        branchId: 'BR-001',
        totalPharmacists: 1,
        kpiList: [
          {
            pharmacistId: '6745...01',
            totalRevenue: 10000000,
            assignedQuota: 50000000,
            quotaCompletionRate: 20,
          },
        ],
      };
      mockOrdersService.getPharmacistKpiAggregation.mockResolvedValue(zeroQuotaResult);

      const res = await controller.getPharmacistKpiReport({ branchId: 'BR-001', quota: 0 });
      expect(res.kpiList[0].assignedQuota).toBeGreaterThan(0);
    });

    // 3. [Abnormal Values]
    it('TC-111.5: [Abnormal Values] Ném RpcException khi service tổng hợp doanh số ném lỗi', async () => {
      mockOrdersService.getShiftSalesAggregation.mockRejectedValue(new Error('Lỗi truy vấn Database'));

      await expect(controller.getShiftSalesAggregation({ branchId: 'BR-001' })).rejects.toThrow(RpcException);
    });

    it('TC-111.6: [Abnormal Values] Ném RpcException khi service báo cáo KPI ném lỗi', async () => {
      mockOrdersService.getPharmacistKpiAggregation.mockRejectedValue(new Error('Lỗi Kafka Timeout'));

      await expect(controller.getPharmacistKpiReport({ branchId: 'BR-001' })).rejects.toThrow(RpcException);
    });
  });
});
