import { Injectable, Inject, OnModuleInit, Logger } from '@nestjs/common';
import { RpcException } from '@nestjs/microservices';
import { InjectModel } from '@nestjs/mongoose';
import { Model, Types } from 'mongoose';
import { ConfigService } from '@nestjs/config';
import { ClientKafka } from '@nestjs/microservices';
import { PayOS } from '@payos/node';
import { timeout } from 'rxjs';
import { Order } from './schemas/order.schema';
import { CreateOrderDto } from './dto/create-order.dto';
import { Voucher } from './schemas/voucher.schema';
import { Expense } from './schemas/expense.schema';
import { PaymentWebhookLog, PaymentWebhookLogDocument } from './schemas/payment-webhook-log.schema';
import { PaymentReconciliation, PaymentReconciliationDocument } from './schemas/payment-reconciliation.schema';
import { PaymentVoucher, PaymentVoucherDocument } from './schemas/payment-voucher.schema';
import { MarketingCampaign } from './schemas/marketing-campaign.schema';
import { subscribeToKafkaTopics, sendKafkaMessage } from '../../api-gateway/src/common/kafka.helper';

const DEFAULT_PHONE_NUMBER = '0900000000';

@Injectable()
export class OrdersServiceService implements OnModuleInit {
  private readonly logger = new Logger(OrdersServiceService.name);
  private payos: PayOS;

  constructor(
    @InjectModel(Order.name) private readonly orderModel: Model<Order>,
    @InjectModel(Voucher.name) private readonly voucherModel: Model<Voucher>,
    @InjectModel(Expense.name) private readonly expenseModel: Model<Expense>,
    @InjectModel(PaymentWebhookLog.name) private readonly webhookLogModel: Model<PaymentWebhookLogDocument>,
    @InjectModel(PaymentReconciliation.name) private readonly reconciliationModel: Model<PaymentReconciliationDocument>,
    @InjectModel(PaymentVoucher.name) private readonly paymentVoucherModel: Model<PaymentVoucherDocument>,
    @InjectModel(MarketingCampaign.name) private readonly campaignModel: Model<MarketingCampaign>,
    private readonly configService: ConfigService,
    @Inject('INVENTORY_SERVICE') private readonly inventoryClient: ClientKafka,
    @Inject('USER_SERVICE') private readonly userClient: ClientKafka,
    @Inject('AUTH_SERVICE') private readonly authClient: ClientKafka,
  ) {
    const clientId = this.configService.get<string>('PAYOS_CLIENT_ID');
    const apiKey = this.configService.get<string>('PAYOS_API_KEY');
    const checksumKey = this.configService.get<string>('PAYOS_CHECKSUM_KEY');

    this.logger.log(`Initializing PayOS client with client ID: ${clientId ? 'FOUND' : 'MISSING'}`);
    this.payos = new PayOS({ clientId, apiKey, checksumKey });
  }

  async onModuleInit() {
    await subscribeToKafkaTopics(
      this.inventoryClient,
      ['inventory.sale.create', 'inventory.sale.revert'],
      60,
      3000,
    );
    await subscribeToKafkaTopics(
      this.userClient,
      ['user.loyalty.get', 'user.loyalty.lookup', 'user.loyalty.update_points'],
      60,
      3000,
    );
    await subscribeToKafkaTopics(
      this.authClient,
      ['auth.get.user.by.id'],
      60,
      3000,
    );

    // Background job to cancel PENDING orders older than 15 minutes
    setInterval(() => {
      this.cancelExpiredOrdersInBackground().catch(err => {
        this.logger.error('Failed to run cancel expired orders job:', err);
      });
    }, 5 * 60 * 1000); // Check every 5 minutes
  }

  private async cancelExpiredOrdersInBackground() {
    this.logger.log('Running background job to cancel expired PENDING orders...');
    const fifteenMinutesAgo = new Date(Date.now() - 15 * 60 * 1000);
    const expiredOrders = await this.orderModel.find({
      paymentStatus: 'PENDING',
      createdAt: { $lt: fifteenMinutesAgo },
      paymentMethod: 'QR_PAY'
    }).exec();

    for (const order of expiredOrders) {
      try {
        if (order.payosPaymentLinkId) {
          await this.payos.paymentRequests.cancel(order.orderCode, 'Hết hạn thanh toán (Quá 15 phút)');
        }
        order.paymentStatus = 'CANCELLED';
        await order.save();

        // Refund points if they were redeemed
        if (order.redeemedPoints > 0 && order.patientPhone !== '0900000000') {
          await sendKafkaMessage(
            this.userClient,
            'user.loyalty.update_points',
            {
              phone: order.patientPhone,
              pointsDelta: order.redeemedPoints,
            }
          );
        }
        this.logger.log(`Cancelled expired order: ${order.orderCode}`);
      } catch (err: any) {
        this.logger.error(`Error cancelling expired order ${order.orderCode}: ${err.message}`);
        // If PayOS already cancelled or not found, just mark as cancelled in DB
        if (err.message?.includes('not found') || err.message?.includes('already')) {
          order.paymentStatus = 'CANCELLED';
          await order.save();
        }
      }
    }
  }


  async createOrder(rawData: any) {
    let data = rawData;
    if (typeof rawData === 'string') {
      try {
        data = JSON.parse(rawData);
      } catch (e) {
        this.logger.error(`Failed to parse string rawData: ${rawData}`);
      }
    }
    this.logger.log(`Creating order in DB. PaymentMethod: ${data?.paymentMethod}, patientName: ${data?.patientName}, totalAmount: ${data?.totalAmount}`);

    // Generate a unique 64-bit int order code for PayOS
    const orderCode = Math.floor(100000 + Math.random() * 90000000);

    let voucherCode = undefined;
    let voucherDiscount = 0;

    if (data.voucherCode) {
      const subtotal = data.items.reduce((sum: number, it: any) => sum + it.price * it.quantity, 0);
      const valRes = await this.validateVoucher(data.voucherCode, subtotal);
      if (valRes.error) {
        throw new RpcException(valRes.message);
      }
      voucherCode = valRes.code;
      voucherDiscount = valRes.discount;
    }

    let redeemedPoints = data.redeemedPoints || 0;
    let pointsDiscount = 0;
    let earnedPoints = 0;
    let patientEmail = data.patientEmail || undefined;

    // Nếu đơn hàng từ UserLoyalty, lấy thông tin email
    if (data.userId) {
      try {
        const userLoyalty: any = await Promise.race([
          sendKafkaMessage(
            this.userClient,
            'user.loyalty.get',
            { userId: data.userId }
          ),
          new Promise((_, reject) => setTimeout(() => reject(new Error('Loyalty get timeout')), 2500))
        ]).catch(() => null);

        if (userLoyalty) {
          // Gắn email để gửi hóa đơn
          if (userLoyalty.email && !patientEmail) {
            patientEmail = userLoyalty.email;
          }
        }
      } catch (err: any) {
        this.logger.warn(`Failed to fetch user loyalty for ID ${data.userId}: ${err.message}`);
      }

      // Fallback: Lấy email từ auth-service (bảng users) nếu chưa có patientEmail
      if (!patientEmail) {
        try {
          const authUser: any = await Promise.race([
            sendKafkaMessage(
              this.authClient,
              'auth.get.user.by.id',
              data.userId
            ),
            new Promise((_, reject) => setTimeout(() => reject(new Error('Auth get user timeout')), 2500))
          ]).catch(() => null);

          if (authUser && authUser.email) {
            patientEmail = authUser.email;
          }
        } catch (err: any) {
          this.logger.warn(`Failed to fetch user email from auth-service for ID ${data.userId}: ${err.message}`);
        }
      }
    }

    if (data.patientPhone && data.patientPhone !== DEFAULT_PHONE_NUMBER) {
      try {
        const userLoyalty: any = await Promise.race([
          sendKafkaMessage(
            this.userClient,
            'user.loyalty.lookup',
            { phone: data.patientPhone }
          ),
          new Promise((_, reject) => setTimeout(() => reject(new Error('Loyalty lookup timeout')), 2500))
        ]).catch(e => {
          this.logger.warn(`Loyalty lookup timeout or error: ${e.message}`);
          return null;
        });

        if (userLoyalty && !userLoyalty.error) {
          const userPoints = userLoyalty.points || 0;
          if (redeemedPoints > userPoints) {
            throw new RpcException(`Số điểm quy đổi (${redeemedPoints}) lớn hơn số điểm bạn đang có (${userPoints})`);
          }

          if (userLoyalty.email && !patientEmail) {
            patientEmail = userLoyalty.email;
          }

          // Enforce 50% max point redemption constraint
          const subtotal = data.items.reduce((sum: number, it: any) => sum + it.price * it.quantity, 0);
          const memberDiscount = Math.round(subtotal * 0.05);
          const payableBeforePoints = subtotal - memberDiscount - voucherDiscount;
          const maxRedeemPoints = Math.floor(payableBeforePoints * 0.5);

          if (redeemedPoints > maxRedeemPoints) {
            throw new RpcException(`Chỉ được phép tiêu điểm tối đa 50% giá trị đơn hàng (tối đa quy đổi ${maxRedeemPoints} điểm)`);
          }

          pointsDiscount = redeemedPoints * (userLoyalty.conversionRate || 1);

          // Earned points: 1% * tier multiplier
          earnedPoints = Math.round((data.totalAmount / 100) * (userLoyalty.multiplier || 1.0));
        } else {
          if (redeemedPoints > 0) {
            throw new RpcException('Số điện thoại chưa đăng ký thành viên thân thiết');
          }
          earnedPoints = Math.round(data.totalAmount / 100);
        }
      } catch (err: any) {
        this.logger.error(`Error looking up customer: ${err.message}`);
        if (redeemedPoints > 0) {
          throw new RpcException(err.message || 'Không thể xác thực điểm tích lũy của khách hàng.');
        }
        earnedPoints = Math.round(data.totalAmount / 100);
      }
    } else {
      if (redeemedPoints > 0) {
        throw new RpcException('Vui lòng cung cấp số điện thoại để tiêu điểm tích lũy.');
      }
    }

    // Instantly deduct points from user balance if redeeming
    if (redeemedPoints > 0) {
      await sendKafkaMessage(
        this.userClient,
        'user.loyalty.update_points',
        {
          phone: data.patientPhone,
          pointsDelta: -redeemedPoints,
        }
      );
    }

    const newOrder = new this.orderModel({
      orderCode,
      patientName: data.patientName,
      patientPhone: data.patientPhone,
      patientEmail,
      shippingAddress: data.shippingAddress || 'Mua tại quầy',
      items: (data.items || []).map((it: any) => ({
        medicineId: it.medicineId,
        name: it.name,
        quantity: it.quantity,
        price: it.price,
        unit: it.unit || 'Hộp',
      })),
      totalAmount: data.totalAmount,
      paymentMethod: data.paymentMethod || 'QR_PAY',
      paymentStatus: 'PENDING',
      type: data.type || 'ONLINE',
      voucherCode,
      voucherDiscount,
      redeemedPoints,
      pointsDiscount,
      earnedPoints,
      userId: data.userId,
      branchId: data.branchId || 'BR-001',
      customerRole: data.customerRole || data.role || (data.isGuest ? 'guest' : 'customer'),
      role: data.role || data.customerRole || (data.isGuest ? 'guest' : 'customer'),
      isGuest: data.isGuest !== undefined ? Boolean(data.isGuest) : (data.role === 'guest' || !data.patientPhone || data.patientPhone === '0900000000'),
      // AI-beslissingsondersteuningsvelden voor auditspoor
      isAiAssisted: Boolean(data.isAiAssisted),
      aiAuditCode: data.aiAuditCode || undefined,
      consultationId: data.consultationId || undefined,
      pharmacistApprovedBy: data.pharmacistApprovedBy || undefined,
    });

    // ========================================================
    // ENTERPRISE SAGA PATTERN IMPLEMENTATION
    // ========================================================

    // Step 1: Claim Voucher atomically
    if (newOrder.voucherCode) {
      const voucherDoc = await this.voucherModel.findOne({ code: newOrder.voucherCode }).exec();
      const usageLimitFilter = (voucherDoc?.usageLimit !== null && voucherDoc?.usageLimit !== undefined)
        ? { usedCount: { $lt: voucherDoc.usageLimit } }
        : {};

      const claimed = await this.voucherModel.findOneAndUpdate(
        { code: newOrder.voucherCode, isActive: true, ...usageLimitFilter },
        { $inc: { usedCount: 1 } },
        { new: true }
      ).exec();

      if (!claimed) {
        throw new RpcException({ message: 'Mã giảm giá đã hết lượt sử dụng hoặc không còn hiệu lực' });
      }
    }

    let saleRes;
    try {
      // Step 2: Deduct Loyalty Points (Reserve)
      if (redeemedPoints > 0) {
        await sendKafkaMessage(
          this.userClient,
          'user.loyalty.update_points',
          {
            phone: newOrder.patientPhone,
            pointsDelta: -redeemedPoints,
          }
        );
      }
    } catch (err) {
      this.logger.error('Error reserving loyalty points:', err);
      throw new RpcException({ message: `Lỗi trừ điểm tích lũy: ${err.message}` });
    }
    // Branching logic based on payment method
    if (data.paymentMethod === 'QR_PAY') {
      try {
        const apiGatewayUrl = this.configService.get<string>('API_GATEWAY_URL') || 'http://10.0.2.2:4000';

        const defaultReturnUrl = `${apiGatewayUrl}/api/orders/payos-callback?orderCode=${orderCode}`;
        const defaultCancelUrl = `${apiGatewayUrl}/api/orders/payos-callback?orderCode=${orderCode}&cancel=true`;

        const returnUrl = data.returnUrl
          ? (data.returnUrl.includes('?') ? `${data.returnUrl}&orderCode=${orderCode}` : `${data.returnUrl}?orderCode=${orderCode}`)
          : defaultReturnUrl;

        const cancelUrl = data.cancelUrl
          ? (data.cancelUrl.includes('?') ? `${data.cancelUrl}&orderCode=${orderCode}` : `${data.cancelUrl}?orderCode=${orderCode}`)
          : defaultCancelUrl;

        const description = `WDP${orderCode}`.substring(0, 25);

        const paymentBody = {
          orderCode,
          amount: data.totalAmount,
          description,
          items: (data.items || []).map((it: any) => ({
            name: it.name.normalize('NFD').replace(/[\u0300-\u036f]/g, '').substring(0, 20),
            quantity: it.quantity,
            price: it.price,
          })),
          returnUrl,
          cancelUrl,
        };

        this.logger.log(`Calling PayOS with orderCode: ${orderCode}`);
        const paymentLinkRes = await this.payos.paymentRequests.create(paymentBody);

        newOrder.payosPaymentLinkId = paymentLinkRes.paymentLinkId;
        await newOrder.save();

        return {
          success: true,
          orderCode,
          paymentMethod: 'QR_PAY',
          checkoutUrl: paymentLinkRes.checkoutUrl,
          qrCode: paymentLinkRes.qrCode,
          order: newOrder,
        };
      } catch (err: any) {
        this.logger.error('Error creating PayOS payment link:', err);
        throw new RpcException({ message: `Lỗi tạo link thanh toán PayOS: ${err.message}` });
      }
    }

    // CASH or CARD: Complete order instantly
    newOrder.paymentStatus = 'PAID';
    await newOrder.save();

    // Deduct inventory and record sale
    try {
      const saleRes = await this.deductInventory(newOrder);

      // CREDIT POINTS ON SUCCESSFUL CASH/CARD PAYMENT
      if (newOrder.earnedPoints > 0 && newOrder.patientPhone !== '0900000000') {
        try {
          await sendKafkaMessage(
            this.userClient,
            'user.loyalty.update_points',
            {
              phone: newOrder.patientPhone,
              pointsDelta: newOrder.earnedPoints,
              accumulatedDelta: newOrder.earnedPoints,
            }
          ).catch((e: any) => this.logger.warn(`Failed to update loyalty points for phone ${newOrder.patientPhone}: ${e.message}`));
        } catch (e: any) {
          this.logger.warn(`Loyalty update skipped for phone ${newOrder.patientPhone}: ${e.message}`);
        }
      }

      newOrder.paymentStatus = 'PAID';
      await newOrder.save();
      this.sendInvoiceEmailAsync(newOrder);

      return {
        success: true,
        orderCode,
        paymentMethod: data.paymentMethod,
        order: newOrder,
        saleResult: saleRes,
      };
    } catch (err: any) {
      this.logger.error('Error deducting inventory:', err);

      // Asynchronously trigger sending invoice email even if inventory deduction fails
      this.sendInvoiceEmailAsync(newOrder);

      // Save with warning
      return {
        success: true,
        orderCode,
        paymentMethod: data.paymentMethod,
        order: newOrder,
        warning: `Đơn hàng đã lưu nhưng trừ kho thất bại: ${err.message}`,
      };
    }
  }

  async checkPaymentStatus(orderCode: number) {
    this.logger.log(`Checking payment status for orderCode: ${orderCode}`);
    const order = await this.orderModel.findOne({ orderCode }).exec();
    if (!order) {
      throw new RpcException({ message: `Không tìm thấy đơn hàng với mã: ${orderCode}` });
    }

    if (order.paymentStatus === 'PAID' || order.paymentStatus === 'CANCELLED') {
      return { success: true, status: order.paymentStatus, order };
    }

    try {
      this.logger.log(`Querying PayOS for details of order: ${orderCode}`);
      const paymentInfo = await this.payos.paymentRequests.get(orderCode);

      this.logger.log(`PayOS status for ${orderCode}: ${paymentInfo.status}`);
      if (paymentInfo.status === 'PAID') {
        order.paymentStatus = 'PAID';
        await order.save();

        // Deduct inventory
        const saleRes = await this.deductInventory(order);

        // CREDIT POINTS ON SUCCESSFUL PAYOS PAYMENT
        if (order.earnedPoints > 0 && order.patientPhone !== '0900000000') {
          await sendKafkaMessage(
            this.userClient,
            'user.loyalty.update_points',
            {
              phone: order.patientPhone,
              pointsDelta: order.earnedPoints,
              accumulatedDelta: order.earnedPoints,
            }
          );
        }

        this.sendInvoiceEmailAsync(order);

        return { success: true, status: 'PAID', order, saleResult: saleRes };
      } else if (paymentInfo.status === 'CANCELLED') {
        order.paymentStatus = 'CANCELLED';
        await order.save();

        // SAGA REVERT FOR CANCELLED QR_PAY

        // 1. Revert Inventory
        await sendKafkaMessage(this.inventoryClient, 'inventory.sale.revert', { orderCode: order.orderCode }).catch(e => this.logger.error('Failed to revert inventory on cancel', e));

        // 2. Refund Points
        if (order.redeemedPoints > 0 && order.patientPhone !== DEFAULT_PHONE_NUMBER) {
          await sendKafkaMessage(
            this.userClient,
            'user.loyalty.update_points',
            {
              phone: order.patientPhone,
              pointsDelta: order.redeemedPoints,
            }
          ).catch(e => this.logger.error('Failed to refund points on cancel', e));
        }

        // 3. Revert Voucher
        if (order.voucherCode) {
          await this.voucherModel.updateOne(
            { code: order.voucherCode },
            { $inc: { usedCount: -1 } }
          ).exec();
        }

        return { success: true, status: 'CANCELLED', order };
      }

      return { success: true, status: 'PENDING', order };
    } catch (err) {
      this.logger.error(`Error querying PayOS for ${orderCode}:`, err);
      return { success: true, status: 'PENDING', order };
    }
  }

  private sendInvoiceEmailAsync(order: any) {
    if (order.patientEmail) {
      this.logger.log(`Emitting orders.invoice.send event to auth-service for orderCode: ${order.orderCode} to email: ${order.patientEmail}`);
      this.authClient.emit('orders.invoice.send', {
        orderCode: order.orderCode,
        patientName: order.patientName,
        patientPhone: order.patientPhone,
        patientEmail: order.patientEmail,
        shippingAddress: order.shippingAddress,
        items: order.items,
        totalAmount: order.totalAmount,
        paymentMethod: order.paymentMethod,
        paymentStatus: order.paymentStatus,
        type: order.type,
        voucherCode: order.voucherCode,
        voucherDiscount: order.voucherDiscount,
        redeemedPoints: order.redeemedPoints,
        pointsDiscount: order.pointsDiscount,
        earnedPoints: order.earnedPoints,
        createdAt: order.createdAt || new Date(),
      });
    } else {
      this.logger.warn(`No patientEmail configured for orderCode: ${order.orderCode} — skipping invoice email`);
    }
  }

  async listOrders() {
    return this.orderModel.find().sort({ createdAt: -1 }).exec();
  }

  async getMyOrders(userId?: string, fullName?: string, phone?: string) {
    let cleanUserId = userId && userId.trim() !== '' ? userId.trim() : null;
    let cleanPhone = phone && phone.trim() !== '' ? phone.trim() : null;
    let cleanName = fullName && fullName.trim() !== '' ? fullName.trim() : null;

    // Auto-resolve phone and fullName from user record if missing but userId is present
    if (cleanUserId && (!cleanPhone || !cleanName)) {
      try {
        const userQuery: any[] = [{ id: cleanUserId }];
        if (Types.ObjectId.isValid(cleanUserId)) {
          userQuery.unshift({ _id: new Types.ObjectId(cleanUserId) });
        }
        const userDoc = await this.orderModel.db.collection('users').findOne({ $or: userQuery });
        if (userDoc) {
          if (!cleanPhone && userDoc.phone) cleanPhone = String(userDoc.phone).trim();
          if (!cleanName && userDoc.fullName) cleanName = String(userDoc.fullName).trim();
        }
      } catch (err: any) {
        this.logger.warn(`Could not auto-resolve user details for userId ${cleanUserId}: ${err.message}`);
      }
    }

    if (!cleanUserId && !cleanPhone && !cleanName) {
      return [];
    }

    const orConditions: any[] = [];

    if (cleanUserId) {
      orConditions.push({ userId: cleanUserId });
    }
    if (cleanPhone) {
      orConditions.push({ patientPhone: cleanPhone });
    }
    if (cleanName) {
      orConditions.push({ patientName: { $regex: cleanName, $options: 'i' } });
    }

    if (orConditions.length === 0) {
      return [];
    }

    const query = { $or: orConditions };

    this.logger.log(`[getMyOrders] Querying orders for userId=${cleanUserId}, fullName=${cleanName}, phone=${cleanPhone}`);
    const results = await this.orderModel.find(query).sort({ createdAt: -1 }).lean().exec();

    // Query POS in-store sales orders from salesorders collection
    let salesOrders: any[] = [];
    if (cleanPhone || cleanName) {
      try {
        const salesConditions: any[] = [];
        if (cleanPhone) {
          salesConditions.push({ patientPhone: cleanPhone });
        }
        if (cleanName) {
          salesConditions.push({ patientName: { $regex: cleanName, $options: 'i' } });
        }
        salesOrders = await this.orderModel.db.collection('salesorders')
          .find({ $or: salesConditions })
          .sort({ createdAt: -1 })
          .toArray();
      } catch (err: any) {
        this.logger.warn(`Could not query salesorders for customer: ${err.message}`);
      }
    }

    const existingCodes = new Set(results.map((o: any) => String(o.orderCode)));
    const normalizedSales = (salesOrders || [])
      .filter((s: any) => !existingCodes.has(String(s.orderCode)))
      .map((s: any) => ({
        _id: s._id,
        orderCode: s.orderCode,
        items: s.items || [],
        totalAmount: s.totalAmount || 0,
        paymentMethod: s.paymentMethod || 'CASH',
        paymentStatus: 'PAID', // In-store retail sale is completed and paid
        type: s.type || 'RETAIL',
        shippingAddress: s.shippingAddress || 'Mua tại quầy',
        patientName: s.patientName || cleanName || 'Khách hàng',
        patientPhone: s.patientPhone || cleanPhone || '',
        soldBy: s.soldBy || 'Dược sĩ tại quầy',
        branchId: s.branchId || 'BR-001',
        isPosInStore: true,
        nationalSyncCode: s.nationalSyncCode,
        nationalSyncStatus: s.nationalSyncStatus,
        createdAt: s.createdAt,
        updatedAt: s.updatedAt,
      }));

    const allOrders = [...results, ...normalizedSales].sort(
      (a: any, b: any) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
    );

    this.logger.log(`[getMyOrders] Found ${results.length} online/QR orders and ${normalizedSales.length} POS orders (Total: ${allOrders.length})`);
    return allOrders;
  }

  private async deductInventory(order: any) {
    this.logger.log(`Sending stock deduction to inventory-service for orderCode: ${order.orderCode}`);
    const payload = {
      orderCode: order.orderCode,
      type: order.type === 'ONLINE' ? 'RETAIL' : order.type,
      paymentMethod: order.paymentMethod,
      items: (order.items || []).map((it: any) => ({
        medicineId: it.medicineId,
        name: it.name,
        quantity: it.quantity,
      })),
      patientName: order.patientName,
      patientPhone: order.patientPhone,
      soldBy: order.type === 'ONLINE' ? 'Khách đặt online' : 'Dược sĩ tại quầy',
      branchId: order.branchId || null,
    };

    return new Promise((resolve) => {
      this.inventoryClient.send('inventory.sale.create', payload).pipe(timeout(10000)).subscribe({
        next: (res) => {
          this.logger.log(`Inventory deduction success for orderCode ${order.orderCode}: ${JSON.stringify(res)}`);
          resolve(res);
        },
        error: (err) => {
          this.logger.warn(`Inventory deduction failed/timed out for orderCode ${order.orderCode}: ${err.message}`);
          resolve({ warning: err.message || 'Hệ thống kho chưa phản hồi' });
        },
      });
    });
  }

  // ============================
  // VOUCHER MANAGEMENT LOGIC
  // ============================

  async createVoucher(data: any) {
    const code = data.code.toUpperCase().trim();

    // Check start and expiry date validity
    const start = new Date(data.startDate);
    const expiry = new Date(data.expiryDate);
    if (isNaN(start.getTime()) || isNaN(expiry.getTime())) {
      return { error: true, message: 'Ngày bắt đầu hoặc ngày kết thúc không hợp lệ', statusCode: 400 };
    }
    if (expiry <= start) {
      return { error: true, message: 'Ngày kết thúc phải lớn hơn ngày bắt đầu', statusCode: 400 };
    }

    // Check numerical fields validity
    if (data.usageLimit !== undefined && data.usageLimit !== null && data.usageLimit <= 0) {
      return { error: true, message: 'Tổng lượt dùng phải lớn hơn hoặc bằng 1', statusCode: 400 };
    }
    if (data.discountValue <= 0) {
      return { error: true, message: 'Giá trị giảm phải lớn hơn 0', statusCode: 400 };
    }
    if (data.discountType === 'PERCENTAGE' && (data.discountValue <= 0 || data.discountValue > 100)) {
      return { error: true, message: 'Phần trăm giảm giá phải từ 1 đến 100', statusCode: 400 };
    }
    if (data.minOrderValue < 0) {
      return { error: true, message: 'Giá trị đơn hàng tối thiểu không được âm', statusCode: 400 };
    }
    if (data.maxDiscountValue !== undefined && data.maxDiscountValue !== null && data.maxDiscountValue <= 0) {
      return { error: true, message: 'Giá trị giảm tối đa phải lớn hơn 0', statusCode: 400 };
    }

    const existing = await this.voucherModel.findOne({ code }).exec();
    if (existing) {
      return { error: true, message: 'Mã voucher đã tồn tại', statusCode: 400 };
    }

    const newVoucher = new this.voucherModel({
      ...data,
      code,
      usedCount: 0,
      isActive: data.isActive !== undefined ? data.isActive : true,
    });
    await newVoucher.save();
    return newVoucher;
  }

  async updateVoucher(id: string, payload: any) {
    if (payload.code) {
      payload.code = payload.code.toUpperCase().trim();
    }

    // Check start and expiry date validity
    if (payload.startDate || payload.expiryDate) {
      const voucher = await this.voucherModel.findById(id).exec();
      if (voucher) {
        const finalStart = payload.startDate ? new Date(payload.startDate) : new Date(voucher.startDate);
        const finalExpiry = payload.expiryDate ? new Date(payload.expiryDate) : new Date(voucher.expiryDate);
        if (isNaN(finalStart.getTime()) || isNaN(finalExpiry.getTime())) {
          return { error: true, message: 'Ngày bắt đầu hoặc ngày kết thúc không hợp lệ', statusCode: 400 };
        }
        if (finalExpiry <= finalStart) {
          return { error: true, message: 'Ngày kết thúc phải lớn hơn ngày bắt đầu', statusCode: 400 };
        }
      }
    }

    // Check numerical fields validity
    if (payload.usageLimit !== undefined && payload.usageLimit !== null && payload.usageLimit <= 0) {
      return { error: true, message: 'Tổng lượt dùng phải lớn hơn hoặc bằng 1', statusCode: 400 };
    }
    if (payload.discountValue !== undefined && payload.discountValue <= 0) {
      return { error: true, message: 'Giá trị giảm phải lớn hơn 0', statusCode: 400 };
    }
    if (payload.minOrderValue !== undefined && payload.minOrderValue < 0) {
      return { error: true, message: 'Giá trị đơn hàng tối thiểu không được âm', statusCode: 400 };
    }
    if (payload.maxDiscountValue !== undefined && payload.maxDiscountValue !== null && payload.maxDiscountValue <= 0) {
      return { error: true, message: 'Giá trị giảm tối đa phải lớn hơn 0', statusCode: 400 };
    }

    // Validate final percentage constraint
    if (payload.discountType !== undefined || payload.discountValue !== undefined) {
      const voucher = await this.voucherModel.findById(id).exec();
      if (voucher) {
        const finalType = payload.discountType !== undefined ? payload.discountType : voucher.discountType;
        const finalValue = payload.discountValue !== undefined ? payload.discountValue : voucher.discountValue;
        if (finalType === 'PERCENTAGE' && (finalValue <= 0 || finalValue > 100)) {
          return { error: true, message: 'Phần trăm giảm giá phải từ 1 đến 100', statusCode: 400 };
        }
      }
    }

    const updated = await this.voucherModel.findByIdAndUpdate(id, payload, { new: true }).exec();
    if (!updated) {
      return { error: true, message: 'Không tìm thấy voucher để cập nhật', statusCode: 404 };
    }
    return updated;
  }

  async deleteVoucher(id: string) {
    const updated = await this.voucherModel.findByIdAndUpdate(id, { isActive: false }, { new: true }).exec();
    if (!updated) {
      return { error: true, message: 'Không tìm thấy voucher để vô hiệu hóa', statusCode: 404 };
    }
    return { success: true, message: 'Vô hiệu hóa voucher thành công' };
  }

  async listVouchers() {
    return this.voucherModel.find().sort({ createdAt: -1 }).exec();
  }

  async validateVoucher(code: string, subtotal: number) {
    if (!code) {
      return { error: true, message: 'Chưa nhập mã giảm giá', statusCode: 400 };
    }
    const voucher = await this.voucherModel.findOne({ code: code.toUpperCase().trim() }).exec();
    if (!voucher) {
      return { error: true, message: 'Mã giảm giá không tồn tại', statusCode: 404 };
    }
    if (!voucher.isActive) {
      return { error: true, message: 'Mã giảm giá đã bị vô hiệu hóa', statusCode: 400 };
    }

    const now = new Date();
    if (now < new Date(voucher.startDate)) {
      return { error: true, message: 'Chương trình khuyến mãi chưa bắt đầu', statusCode: 400 };
    }
    if (now > new Date(voucher.expiryDate)) {
      return { error: true, message: 'Mã giảm giá đã hết hạn sử dụng', statusCode: 400 };
    }

    if (voucher.usageLimit !== null && voucher.usageLimit !== undefined && voucher.usedCount >= voucher.usageLimit) {
      return { error: true, message: 'Mã giảm giá đã hết lượt sử dụng', statusCode: 400 };
    }

    if (subtotal < voucher.minOrderValue) {
      return {
        error: true,
        message: `Mã giảm giá chỉ áp dụng cho đơn hàng từ ${voucher.minOrderValue.toLocaleString('vi-VN')}₫ trở lên`,
        statusCode: 400
      };
    }

    let discount = 0;
    if (voucher.discountType === 'PERCENTAGE') {
      discount = Math.round(subtotal * (voucher.discountValue / 100));
      if (voucher.maxDiscountValue && discount > voucher.maxDiscountValue) {
        discount = voucher.maxDiscountValue;
      }
    } else if (voucher.discountType === 'FIXED_AMOUNT') {
      discount = voucher.discountValue;
      if (discount > subtotal) {
        discount = subtotal;
      }
    }

    return {
      success: true,
      code: voucher.code,
      discountType: voucher.discountType,
      discountValue: voucher.discountValue,
      discount,
    };
  }

  async createExpense(data: any) {
    try {
      this.logger.log(`[createExpense] Logging fixed expense: ${data?.title}`);
      if (!data?.category) {
        throw new RpcException('Vui lòng chọn loại chi phí (Mặt bằng, Lương, Điện nước...)');
      }
      const amount = Number(data?.amount);
      if (isNaN(amount) || amount <= 0) {
        throw new RpcException('Số tiền chi phí phải là số dương > 0');
      }

      const categoryNames: Record<string, string> = {
        RENT: 'Chi phí Mặt bằng',
        SALARY: 'Chi phí Lương nhân viên',
        UTILITY: 'Chi phí Điện nước & Dịch vụ',
        OTHER: 'Chi phí Khác',
      };

      const newExpense = new this.expenseModel({
        branchId: data.branchId || 'BR-001',
        branchName: data.branchName || `Chi nhánh ${data.branchId || 'BR-001'}`,
        category: data.category,
        title: data.title || categoryNames[data.category] || 'Chi phí vận hành',
        amount,
        transactionDate: data.transactionDate ? new Date(data.transactionDate) : new Date(),
        notes: data.notes || '',
        createdBy: data.createdBy || 'Admin',
      });

      const saved = await newExpense.save();
      this.logger.log(`[createExpense] Successfully recorded expense: ${saved._id}`);
      return saved;
    } catch (error) {
      this.logger.error(`[createExpense] Error: ${error.message}`, error.stack);
      throw new RpcException(error.message || 'Lỗi khi ghi nhận chi phí');
    }
  }

  async getExpenses(query: any = {}) {
    try {
      const filter: any = {};
      if (query.branchId && query.branchId !== 'all') {
        filter.branchId = query.branchId;
      }
      if (query.category && query.category !== 'all') {
        filter.category = query.category;
      }
      if (query.year) {
        const year = Number(query.year);
        const startDate = new Date(year, 0, 1);
        const endDate = new Date(year, 11, 31, 23, 59, 59);
        filter.transactionDate = { $gte: startDate, $lte: endDate };
      }
      return await this.expenseModel.find(filter).sort({ transactionDate: -1, createdAt: -1 }).lean().exec();
    } catch (error) {
      throw new RpcException(error.message || 'Lỗi khi lấy danh sách chi phí');
    }
  }

  async getCashFlowSummary(query: any = {}) {
    try {
      const year = Number(query.year) || new Date().getFullYear();
      const branchId = query.branchId;

      const viewType = query.viewType || 'month';
      const targetDate = query.date ? new Date(query.date) : new Date();

      const orderFilter: any = {};
      const expenseFilter: any = {};
      const voucherFilter: any = {};

      if (branchId && branchId !== 'all') {
        orderFilter.branchId = branchId;
        expenseFilter.branchId = branchId;
        voucherFilter.branchId = branchId;
      }

      // 1. Time range filter based on viewType
      let startDate: Date;
      let endDate: Date;

      if (viewType === 'shift' || viewType === 'day') {
        startDate = new Date(targetDate.getFullYear(), targetDate.getMonth(), targetDate.getDate(), 0, 0, 0);
        endDate = new Date(targetDate.getFullYear(), targetDate.getMonth(), targetDate.getDate(), 23, 59, 59, 999);
      } else if (viewType === 'week') {
        const day = targetDate.getDay();
        const diff = targetDate.getDate() - day + (day === 0 ? -6 : 1);
        const monday = new Date(targetDate.getFullYear(), targetDate.getMonth(), diff, 0, 0, 0);
        startDate = monday;
        endDate = new Date(monday.getFullYear(), monday.getMonth(), monday.getDate() + 6, 23, 59, 59, 999);
      } else {
        startDate = new Date(year, 0, 1, 0, 0, 0);
        endDate = new Date(year, 11, 31, 23, 59, 59, 999);
      }

      orderFilter.createdAt = { $gte: startDate, $lte: endDate };
      expenseFilter.transactionDate = { $gte: startDate, $lte: endDate };
      voucherFilter.transactionDate = { $gte: startDate, $lte: endDate };

      const [orders, expenses, paymentVouchers] = await Promise.all([
        this.orderModel.find(orderFilter).lean().exec(),
        this.expenseModel.find(expenseFilter).lean().exec(),
        this.paymentVoucherModel.find(voucherFilter).lean().exec(),
      ]);

      // 2. Aggregate Inflows from Orders
      let totalRevenue = 0;
      let totalCashInflow = 0;
      let totalDigitalInflow = 0;
      let totalCogs = 0;
      const monthlyRevenue: number[] = new Array(12).fill(0);
      const monthlyCogs: number[] = new Array(12).fill(0);

      // Shift aggregations (Morning: 06:00-14:00, Afternoon: 14:00-22:00, Night: 22:00-06:00)
      const shiftData = {
        morning: {
          ordersCount: 0,
          cashInflow: 0,
          digitalInflow: 0,
          totalInflow: 0,
          pettyExpenses: 0,
          netFlow: 0,
          orders: [] as any[],
        },
        afternoon: {
          ordersCount: 0,
          cashInflow: 0,
          digitalInflow: 0,
          totalInflow: 0,
          pettyExpenses: 0,
          netFlow: 0,
          orders: [] as any[],
        },
        night: {
          ordersCount: 0,
          cashInflow: 0,
          digitalInflow: 0,
          totalInflow: 0,
          pettyExpenses: 0,
          netFlow: 0,
          orders: [] as any[],
        },
      };

      orders.forEach((raw_o: any) => {
        const o = raw_o;
        const date = new Date(o.createdAt || Date.now());
        const m = date.getMonth();
        const hours = date.getHours();
        const rev = Number(o.totalAmount || o.finalAmount || 0);
        const isCash = o.paymentMethod === 'CASH' || o.paymentMethod === 'TIEN_MAT';

        let cogs = 0;
        if (Array.isArray(o.items)) {
          cogs = o.items.reduce((sum: number, item: any) => {
            const ip = item.importPrice || item.costPrice || (item.price ? item.price * 0.65 : 0);
            return sum + ip * (item.quantity || 1);
          }, 0);
        }
        if (!cogs || cogs === 0) cogs = Math.round(rev * 0.65);

        totalRevenue += rev;
        totalCogs += cogs;
        monthlyRevenue[m] += rev;
        monthlyCogs[m] += cogs;

        if (isCash) {
          totalCashInflow += rev;
        } else {
          totalDigitalInflow += rev;
        }

        // Assign to shift
        let targetShift = shiftData.afternoon;
        if (hours >= 6 && hours < 14) {
          targetShift = shiftData.morning;
        } else if (hours >= 14 && hours < 22) {
          targetShift = shiftData.afternoon;
        } else {
          targetShift = shiftData.night;
        }

        targetShift.ordersCount++;
        targetShift.totalInflow += rev;
        if (isCash) targetShift.cashInflow += rev;
        else targetShift.digitalInflow += rev;
        targetShift.orders.push({
          orderId: o.orderCode || o._id,
          amount: rev,
          paymentMethod: o.paymentMethod,
          createdAt: o.createdAt,
          customerName: o.customerName || 'Retail Customer',
        });
      });

      // 3. Aggregate Outflows (Fixed expenses + Payment vouchers)
      let totalFixedExpenses = 0;
      let totalVouchersOutflow = 0;
      const monthlyExpenses: number[] = new Array(12).fill(0);
      const monthlyVouchers: number[] = new Array(12).fill(0);

      expenses.forEach((raw_e: any) => {
        const e = raw_e;
        const date = new Date(e.transactionDate || e.createdAt || Date.now());
        const m = date.getMonth();
        const hours = date.getHours();
        const amt = Number(e.amount || 0);

        totalFixedExpenses += amt;
        monthlyExpenses[m] += amt;

        if (hours >= 6 && hours < 14) {
          shiftData.morning.pettyExpenses += amt;
        } else if (hours >= 14 && hours < 22) {
          shiftData.afternoon.pettyExpenses += amt;
        } else {
          shiftData.night.pettyExpenses += amt;
        }
      });

      paymentVouchers.forEach((raw_v: any) => {
        const v = raw_v;
        const date = new Date(v.transactionDate || v.createdAt || Date.now());
        const m = date.getMonth();
        const amt = Number(v.amount || 0);

        totalVouchersOutflow += amt;
        monthlyVouchers[m] += amt;
      });

      const totalOutflow = totalFixedExpenses + totalVouchersOutflow;
      const netCashFlow = totalRevenue - totalOutflow;

      // Calculate shift net flow
      shiftData.morning.netFlow = shiftData.morning.totalInflow - shiftData.morning.pettyExpenses;
      shiftData.afternoon.netFlow = shiftData.afternoon.totalInflow - shiftData.afternoon.pettyExpenses;
      shiftData.night.netFlow = shiftData.night.totalInflow - shiftData.night.pettyExpenses;

      // Cash drawer calculation
      const initialCashFloat = 5000000; // Base cash drawer initial balance (5M VND)
      const morningDrawerBalance = initialCashFloat + shiftData.morning.cashInflow - shiftData.morning.pettyExpenses;
      const afternoonDrawerBalance = morningDrawerBalance + shiftData.afternoon.cashInflow - shiftData.afternoon.pettyExpenses;
      const currentDrawerBalance = afternoonDrawerBalance;

      // Monthly chart array
      const monthlyChart = monthlyRevenue.map((rev, idx) => ({
        month: `T${idx + 1}`,
        revenue: Math.round(rev),
        cogs: Math.round(monthlyCogs[idx]),
        fixedExpenses: Math.round(monthlyExpenses[idx]),
        vouchers: Math.round(monthlyVouchers[idx]),
        totalExpenses: Math.round(monthlyCogs[idx] + monthlyExpenses[idx] + monthlyVouchers[idx]),
        netProfit: Math.round(rev - (monthlyCogs[idx] + monthlyExpenses[idx] + monthlyVouchers[idx])),
      }));

      // Shift breakdowns array
      const shiftsBreakdown = [
        {
          shiftId: 'SHIFT-MORNING',
          name: 'Ca Sáng (06:00 - 14:00)',
          time: '06:00 - 14:00',
          staffName: 'Dược sĩ trực: Nguyễn Văn An',
          status: 'BALANCED',
          ordersCount: shiftData.morning.ordersCount,
          cashInflow: shiftData.morning.cashInflow,
          digitalInflow: shiftData.morning.digitalInflow,
          totalInflow: shiftData.morning.totalInflow,
          pettyExpenses: shiftData.morning.pettyExpenses,
          netFlow: shiftData.morning.netFlow,
          openingFloat: initialCashFloat,
          closingDrawerBalance: morningDrawerBalance,
          recentOrders: shiftData.morning.orders.slice(0, 5),
        },
        {
          shiftId: 'SHIFT-AFTERNOON',
          name: 'Ca Chiều (14:00 - 22:00)',
          time: '14:00 - 22:00',
          staffName: 'Dược sĩ trực: Trần Thị Mai',
          status: 'OPEN',
          ordersCount: shiftData.afternoon.ordersCount,
          cashInflow: shiftData.afternoon.cashInflow,
          digitalInflow: shiftData.afternoon.digitalInflow,
          totalInflow: shiftData.afternoon.totalInflow,
          pettyExpenses: shiftData.afternoon.pettyExpenses,
          netFlow: shiftData.afternoon.netFlow,
          openingFloat: morningDrawerBalance,
          closingDrawerBalance: afternoonDrawerBalance,
          recentOrders: shiftData.afternoon.orders.slice(0, 5),
        },
      ];

      return {
        viewType,
        year,
        date: targetDate.toISOString().split('T')[0],
        totalInflow: totalRevenue,
        totalOutflow,
        netCashFlow,
        totalCashInflow,
        totalDigitalInflow,
        totalFixedExpenses,
        totalVouchersOutflow,
        cashDrawer: {
          status: 'OPEN',
          initialFloat: initialCashFloat,
          currentBalance: currentDrawerBalance,
          isBalanced: true,
          lastVerifiedAt: new Date(),
        },
        shifts: shiftsBreakdown,
        monthlyChart,
        expensesCount: expenses.length,
        vouchersCount: paymentVouchers.length,
        ordersCount: orders.length,
      };
    } catch (error) {
      throw new RpcException(error.message || 'Error calculating cash flow summary');
    }
  }

  // =========================================================================
  // PAYMENT VOUCHER OPERATIONS
  // =========================================================================

  async createPaymentVoucher(dto: any) {
    try {
      const year = new Date().getFullYear();
      const randomCode = Math.floor(1000 + Math.random() * 9000);
      const voucherCode = dto.voucherCode || `PV-${year}-${randomCode}`;

      const voucher = new this.paymentVoucherModel({
        voucherCode,
        branchId: dto.branchId || 'BR-001',
        branchName: dto.branchName || 'Chi nhánh mặc định',
        recipientType: dto.recipientType || 'SUPPLIER',
        supplierId: dto.supplierId,
        supplierName: dto.supplierName,
        purchaseOrderId: dto.purchaseOrderId,
        amount: Number(dto.amount),
        paymentMethod: dto.paymentMethod || 'BANK_TRANSFER',
        status: dto.status || 'COMPLETED',
        description: dto.description || 'Thanh toán tiền hàng cho nhà cung cấp',
        notes: dto.notes,
        createdBy: dto.createdBy,
        createdByName: dto.createdByName,
        transactionDate: dto.transactionDate ? new Date(dto.transactionDate) : new Date(),
      });

      return await voucher.save();
    } catch (error) {
      throw new RpcException(error.message || 'Error creating payment voucher');
    }
  }

  async getPaymentVouchers(query: { branchId?: string; recipientType?: string; status?: string; startDate?: string; endDate?: string }) {
    try {
      const filter: any = {};
      if (query.branchId && query.branchId !== 'all') {
        filter.branchId = query.branchId;
      }
      if (query.recipientType) filter.recipientType = query.recipientType;
      if (query.status) filter.status = query.status;

      if (query.startDate || query.endDate) {
        filter.transactionDate = {};
        if (query.startDate) filter.transactionDate.$gte = new Date(query.startDate);
        if (query.endDate) filter.transactionDate.$lte = new Date(query.endDate + 'T23:59:59.999Z');
      }

      return await this.paymentVoucherModel.find(filter).sort({ transactionDate: -1, createdAt: -1 }).lean().exec();
    } catch (error) {
      throw new RpcException(error.message || 'Error retrieving payment vouchers');
    }
  }

  // =========================================================================
  // RECONCILIATION & WEBHOOK ENGINE
  // =========================================================================

  async handlePaymentWebhook(payload: any) {
    const data = payload?.data || payload;
    const orderCode = Number(data.orderCode);
    const amount = Number(data.amount);
    const reference = String(data.reference || data.paymentLinkId || Date.now());

    // 1. Lưu log raw webhook
    try {
      await this.webhookLogModel.create({
        gatewayProvider: 'PAYOS',
        transactionId: reference,
        orderCode,
        amount,
        accountNumber: data.accountNumber,
        counterAccountBankId: data.counterAccountBankId,
        description: data.description,
        paymentTime: data.transactionDateTime ? new Date(data.transactionDateTime) : new Date(),
        rawPayload: payload,
        signatureVerified: true,
        processingStatus: 'PROCESSED',
      });
    } catch (logErr: any) {
      this.logger.warn(`Webhook log already exists or error: ${logErr.message}`);
    }

    // 2. Tìm đơn hàng tương ứng
    const order = await this.orderModel.findOne({ orderCode });
    if (!order) {
      this.logger.warn(`[Reconciliation] Orphan payment received: orderCode=${orderCode}, amount=${amount}`);
      const orphan = await this.reconciliationModel.create({
        orderCode,
        expectedAmount: 0,
        actualAmount: amount,
        differenceAmount: -amount,
        status: 'ORPHAN_PAYMENT',
        bankTransactionId: reference,
        reconciledAt: new Date(),
      });
      return { status: 'ORPHAN_PAYMENT', message: 'Không tìm thấy đơn hàng, ghi nhận thanh toán mồ côi', reconciliationId: orphan._id };
    }

    const expectedAmount = order.totalAmount;
    const differenceAmount = expectedAmount - amount;

    let reconciliationStatus = 'MATCHED';
    let toleranceApplied = false;

    if (differenceAmount === 0) {
      reconciliationStatus = 'MATCHED';
      order.paymentStatus = 'PAID';
    } else if (differenceAmount > 0 && differenceAmount <= 5000) {
      // Dung sai thông minh <= 5.000 VNĐ: Cho phép xuất thuốc ngay tại quầy
      reconciliationStatus = 'UNDERPAID_TOLERANCE';
      toleranceApplied = true;
      order.paymentStatus = 'PAID';
      this.logger.log(`[Reconciliation] Smart tolerance applied for order #${orderCode}: missing ${differenceAmount}đ`);
    } else if (differenceAmount > 5000) {
      // Chuyển thiếu nhiều hơn 5k: Chặn đơn
      reconciliationStatus = 'UNDERPAID_BLOCKED';
      order.paymentStatus = 'PARTIAL_PAID';
      this.logger.warn(`[Reconciliation] Order #${orderCode} underpaid: missing ${differenceAmount}đ`);
    } else {
      // Chuyển thừa tiền (differenceAmount < 0)
      reconciliationStatus = 'OVERPAID_CREDITED';
      order.paymentStatus = 'PAID';
      const excessAmount = Math.abs(differenceAmount);
      this.logger.log(`[Reconciliation] Order #${orderCode} overpaid: excess ${excessAmount}đ credited to customer`);
      // Cộng điểm thưởng bù trừ nếu có SĐT khách
      if (order.patientPhone && order.patientPhone !== DEFAULT_PHONE_NUMBER) {
        try {
          this.userClient.emit('user.loyalty.update_points', {
            phone: order.patientPhone,
            points: Math.floor(excessAmount),
            reason: `Hoàn tiền chuyển thừa đơn #${orderCode}`,
          });
        } catch (e: any) {
          this.logger.warn(`Failed to credit loyalty points for excess payment: ${e.message}`);
        }
      }
    }

    await order.save();

    // 3. Lưu bản ghi đối soát
    const rec = await this.reconciliationModel.create({
      orderId: order._id,
      orderCode,
      branchId: order.branchId || 'BR-001',
      expectedAmount,
      actualAmount: amount,
      differenceAmount,
      toleranceApplied,
      status: reconciliationStatus,
      bankTransactionId: reference,
      reconciledAt: new Date(),
    });

    return {
      status: reconciliationStatus,
      toleranceApplied,
      orderCode,
      paymentStatus: order.paymentStatus,
      reconciliationId: rec._id,
    };
  }

  async handleManualOverride(data: { orderCode: number; bankTransactionId: string; cashierId?: string; actualAmount?: number; notes?: string }) {
    const order = await this.orderModel.findOne({ orderCode: Number(data.orderCode) });
    if (!order) {
      throw new RpcException(`Không tìm thấy đơn hàng #${data.orderCode}`);
    }

    const expectedAmount = order.totalAmount;
    const actualAmount = data.actualAmount || expectedAmount;
    const differenceAmount = expectedAmount - actualAmount;

    order.paymentStatus = 'PAID';
    await order.save();

    const rec = await this.reconciliationModel.create({
      orderId: order._id,
      orderCode: order.orderCode,
      branchId: order.branchId || 'BR-001',
      cashierId: data.cashierId || 'POS-CASHIER',
      expectedAmount,
      actualAmount,
      differenceAmount,
      toleranceApplied: true,
      status: 'MANUAL_OVERRIDE',
      bankTransactionId: data.bankTransactionId,
      resolutionNotes: data.notes || 'Dược sĩ xác nhận khẩn cấp có đối soát tại quầy',
      resolvedBy: data.cashierId || 'POS-CASHIER',
      resolvedAt: new Date(),
      reconciledAt: new Date(),
    });

    return {
      success: true,
      message: `Đã xác nhận thanh toán khẩn cấp cho đơn #${order.orderCode}`,
      orderCode: order.orderCode,
      reconciliationId: rec._id,
    };
  }

  async getReconciliationDiscrepancies(query: { branchId?: string; status?: string; startDate?: string; endDate?: string; page?: number; limit?: number }) {
    const filter: any = {};
    if (query.branchId) filter.branchId = query.branchId;
    if (query.status) {
      filter.status = query.status;
    } else {
      filter.status = { $ne: 'MATCHED' };
    }
    if (query.startDate || query.endDate) {
      filter.reconciledAt = {};
      if (query.startDate) filter.reconciledAt.$gte = new Date(query.startDate);
      if (query.endDate) filter.reconciledAt.$lte = new Date(query.endDate + 'T23:59:59.999Z');
    }

    const page = Number(query.page) || 1;
    const limit = Number(query.limit) || 20;
    const skip = (page - 1) * limit;

    const [items, total] = await Promise.all([
      this.reconciliationModel.find(filter).sort({ reconciledAt: -1 }).skip(skip).limit(limit).lean(),
      this.reconciliationModel.countDocuments(filter),
    ]);

    return { items, total, page, limit, totalPages: Math.ceil(total / limit) };
  }

  async getReconciliationSummary(query: { branchId?: string; startDate?: string; endDate?: string }) {
    const filter: any = {};
    if (query.branchId) filter.branchId = query.branchId;
    if (query.startDate || query.endDate) {
      filter.reconciledAt = {};
      if (query.startDate) filter.reconciledAt.$gte = new Date(query.startDate);
      if (query.endDate) filter.reconciledAt.$lte = new Date(query.endDate + 'T23:59:59.999Z');
    }

    const records = await this.reconciliationModel.find(filter).lean();

    let totalExpected = 0;
    let totalActual = 0;
    let totalMatched = 0;
    let totalUnderpaidTolerance = 0;
    let totalUnderpaidBlocked = 0;
    let totalOverpaid = 0;
    let totalManualOverride = 0;
    let totalOrphan = 0;

    records.forEach((r: any) => {
      totalExpected += r.expectedAmount || 0;
      totalActual += r.actualAmount || 0;
      if (r.status === 'MATCHED') totalMatched++;
      else if (r.status === 'UNDERPAID_TOLERANCE') totalUnderpaidTolerance++;
      else if (r.status === 'UNDERPAID_BLOCKED') totalUnderpaidBlocked++;
      else if (r.status === 'OVERPAID_CREDITED') totalOverpaid++;
      else if (r.status === 'MANUAL_OVERRIDE') totalManualOverride++;
      else if (r.status === 'ORPHAN_PAYMENT') totalOrphan++;
    });

    const totalRecords = records.length;
    const matchRate = totalRecords > 0 ? Number(((totalMatched / totalRecords) * 100).toFixed(1)) : 100;

    return {
      totalRecords,
      totalExpected,
      totalActual,
      difference: totalExpected - totalActual,
      matchRate,
      breakdown: {
        matched: totalMatched,
        underpaidTolerance: totalUnderpaidTolerance,
        underpaidBlocked: totalUnderpaidBlocked,
        overpaidCredited: totalOverpaid,
        manualOverride: totalManualOverride,
        orphan: totalOrphan,
      },
    };
  }

  async resolveDiscrepancy(payload: { id: string; resolutionNotes: string; resolvedBy: string }) {
    const rec = await this.reconciliationModel.findById(payload.id);
    if (!rec) {
      throw new RpcException('Không tìm thấy bản ghi đối soát cần xử lý');
    }

    rec.status = 'MANUALLY_RESOLVED';
    rec.resolutionNotes = payload.resolutionNotes;
    rec.resolvedBy = payload.resolvedBy;
    rec.resolvedAt = new Date();
    await rec.save();

    return { success: true, message: 'Đã hoàn tất xử lý giải trình đối soát', record: rec };
  }

  // ==========================================
  // MARKETING CAMPAIGNS & ROI ANALYTICS
  // ==========================================
  async createMarketingCampaign(payload: any) {
    try {
      const now = new Date();
      const count = await this.campaignModel.countDocuments();
      const code = payload.code || `MKT-${now.getFullYear()}-${String(count + 1).padStart(3, '0')}`;

      const costs = payload.costs || [];
      const totalCost = costs.reduce((sum: number, c: any) => sum + Number(c.amount || 0), 0);

      const campaign = new this.campaignModel({
        ...payload,
        code,
        costs,
        totalCost,
      });

      const saved = await campaign.save();
      this.logger.log(`Created marketing campaign: ${code}`);
      return saved;
    } catch (error) {
      throw new RpcException(error.message || 'Lỗi tạo chiến dịch Marketing');
    }
  }

  async listMarketingCampaigns(query: any = {}) {
    try {
      const filter: any = {};
      if (query.status && query.status !== 'all') {
        filter.status = query.status;
      }
      return await this.campaignModel.find(filter).sort({ createdAt: -1 }).exec();
    } catch (error) {
      throw new RpcException(error.message || 'Lỗi lấy danh sách chiến dịch');
    }
  }

  async getMarketingCampaignById(id: string) {
    try {
      const campaign = await this.campaignModel.findById(id).exec();
      if (!campaign) {
        throw new RpcException(`Không tìm thấy chiến dịch ${id}`);
      }
      return campaign;
    } catch (error) {
      throw new RpcException(error.message || 'Lỗi tìm chiến dịch');
    }
  }

  async addCampaignCost(id: string, costItem: { type: string; amount: number; note?: string; date?: Date }) {
    try {
      const campaign = await this.campaignModel.findById(id).exec();
      if (!campaign) {
        throw new RpcException(`Không tìm thấy chiến dịch ${id}`);
      }

      campaign.costs.push({
        type: costItem.type,
        amount: Number(costItem.amount),
        note: costItem.note,
        date: costItem.date ? new Date(costItem.date) : new Date(),
      } as any);

      campaign.totalCost = campaign.costs.reduce((sum, c) => sum + Number(c.amount || 0), 0);
      await campaign.save();

      return { success: true, message: 'Đã hạch toán chi phí marketing thành công!', campaign };
    } catch (error) {
      throw new RpcException(error.message || 'Lỗi hạch toán chi phí chiến dịch');
    }
  }

  async getMarketingRoiAnalytics() {
    try {
      const DEFAULT_PHARMA_COGS_RATIO = 0.65; // Chuẩn định mức giá vốn trung bình ngành Dược phẩm bán lẻ Việt Nam (65% COGS)
      const campaigns = await this.campaignModel.find().lean().exec();

      // Tối ưu hóa bộ nhớ: chỉ nạp các trường cần thiết phục vụ tính ROI & Attribution thay vì load toàn bộ document
      const allOrders = await this.orderModel
        .find({ paymentStatus: 'PAID' })
        .select('patientPhone totalAmount voucherCode voucherDiscount createdAt')
        .lean()
        .exec();

      // Bản đồ số điện thoại khách hàng và đơn hàng đầu tiên (để đo lường New Customers vs Cannibalization)
      const customerFirstOrderDate = new Map<string, Date>();
      allOrders.forEach((o) => {
        const phone = o.patientPhone || DEFAULT_PHONE_NUMBER;
        const oDate = new Date((o as any).createdAt || Date.now());
        if (!customerFirstOrderDate.has(phone) || oDate < customerFirstOrderDate.get(phone)!) {
          customerFirstOrderDate.set(phone, oDate);
        }
      });

      let chainTotalSpend = 0;
      let chainAttributedRevenue = 0;
      let chainGrossProfit = 0;
      let chainTotalAttributedOrders = 0;

      const campaignReports = campaigns.map((c) => {
        const vCodes = (c.voucherCodes || []).map((v) => v.toUpperCase().trim());
        const startDate = new Date(c.startDate);
        const endDate = new Date(c.endDate);

        // Gán các đơn hàng có áp dụng Voucher của chiến dịch hoặc trong khung thời gian
        const matchedOrders = allOrders.filter((o) => {
          const oVoucher = (o.voucherCode || '').toUpperCase().trim();
          const hasVoucher = oVoucher && vCodes.includes(oVoucher);
          const orderDate = new Date((o as any).createdAt || Date.now());
          const inTime = orderDate >= startDate && orderDate <= endDate;
          return hasVoucher && inTime;
        });

        const totalOrders = matchedOrders.length;
        const totalRevenue = matchedOrders.reduce((sum, o) => sum + (o.totalAmount || 0), 0);
        
        // Biên lợi nhuận gộp thực chất (Doanh thu - Giá vốn COGS định mức)
        const estimatedCogs = totalRevenue * DEFAULT_PHARMA_COGS_RATIO;
        const grossProfit = totalRevenue - estimatedCogs;
        const totalCost = c.totalCost || c.budget || 1; // Tránh chia cho 0
        const netProfit = grossProfit - totalCost;

        // Chỉ số ROI thực tế dựa trên Gross Margin: ((Gross Profit - Total Cost) / Total Cost) * 100
        const roi = totalCost > 0 ? Number(((netProfit / totalCost) * 100).toFixed(1)) : 0;
        const roas = totalCost > 0 ? Number((totalRevenue / totalCost).toFixed(2)) : 0;

        // Phân tích tệp khách mới vs Khách quen cũ (Giải quyết rủi ro Cannibalization từ Bước 3)
        let newCustomerOrders = 0;
        let returningCustomerOrders = 0;
        const uniquePhones = new Set<string>();

        matchedOrders.forEach((o) => {
          const phone = o.patientPhone || DEFAULT_PHONE_NUMBER;
          uniquePhones.add(phone);
          const firstDate = customerFirstOrderDate.get(phone);
          if (firstDate && firstDate >= startDate) {
            newCustomerOrders++;
          } else {
            returningCustomerOrders++;
          }
        });

        // Tỷ lệ Cannibalization: Tỷ lệ đơn hàng từ khách cũ quen thuộc vốn đã mua không cần marketing
        const cannibalizationRatio = totalOrders > 0 ? Number(((returningCustomerOrders / totalOrders) * 100).toFixed(1)) : 0;

        chainTotalSpend += totalCost;
        chainAttributedRevenue += totalRevenue;
        chainGrossProfit += grossProfit;
        chainTotalAttributedOrders += totalOrders;

        return {
          _id: c._id,
          code: c.code,
          name: c.name,
          channel: c.channel,
          budget: c.budget,
          totalCost,
          status: c.status,
          startDate: c.startDate,
          endDate: c.endDate,
          voucherCodes: c.voucherCodes,
          totalOrders,
          totalRevenue,
          grossProfit,
          netProfit,
          roi,
          roas,
          uniqueCustomers: uniquePhones.size,
          newCustomerOrders,
          returningCustomerOrders,
          cannibalizationRatio,
        };
      });

      const chainNetProfit = chainGrossProfit - chainTotalSpend;
      const chainRoi = chainTotalSpend > 0 ? Number(((chainNetProfit / chainTotalSpend) * 100).toFixed(1)) : 0;
      const chainRoas = chainTotalSpend > 0 ? Number((chainAttributedRevenue / chainTotalSpend).toFixed(2)) : 0;

      return {
        summary: {
          totalCampaigns: campaigns.length,
          activeCampaigns: campaigns.filter((c) => c.status === 'ACTIVE').length,
          totalSpend: chainTotalSpend,
          totalRevenue: chainAttributedRevenue,
          totalGrossProfit: chainGrossProfit,
          totalNetProfit: chainNetProfit,
          averageRoi: chainRoi,
          averageRoas: chainRoas,
          totalOrders: chainTotalAttributedOrders,
        },
        campaigns: campaignReports,
      };
    } catch (error) {
      throw new RpcException(error.message || 'Lỗi phân tích Marketing ROI');
    }
  }
}
