import { Injectable, Logger, Inject, OnModuleInit, OnApplicationShutdown } from '@nestjs/common';
import { InjectModel, InjectConnection } from '@nestjs/mongoose';
import { Model, Connection } from 'mongoose';
import { ClientKafka } from '@nestjs/microservices';
import { lastValueFrom } from 'rxjs';
import { User } from '../../auth-service/src/auth/user.schema';
import { Medicine } from '../../inventory-service/src/medicine/schemas/medicine.schema';
import { Cart } from './schemas/cart.schema';
import { AuditLog, AuditLogDocument } from './schemas/audit-log.schema';
import { Branch, BranchDocument } from './schemas/branch.schema';
import { BranchFeedback, BranchFeedbackDocument } from './schemas/branch-feedback.schema';
import { CustomerSegment, CustomerSegmentDocument } from './schemas/customer-segment.schema';
import { StaffTransferRequest } from './schemas/staff-transfer-request.schema';
import { StaffNotification } from './schemas/staff-notification.schema';
import { WorkSchedule } from './schemas/work-schedule.schema';
import { ShiftSwapRequest } from './schemas/shift-swap-request.schema';
import { LeaveRequest, LeaveStatus } from './schemas/leave-request.schema';
import * as path from 'path';
import * as fs from 'fs';
import * as zlib from 'zlib';
import { randomUUID } from 'crypto';

import { ExportJob } from './interfaces/export-job.interface';
import { ExportJobStatusDto } from './dto/export-job-status.dto';
import { RpcException } from '@nestjs/microservices';
import * as bcrypt from 'bcryptjs';
import { subscribeToKafkaTopics } from '../../api-gateway/src/common/kafka.helper';

@Injectable()
export class UserService implements OnModuleInit, OnApplicationShutdown {
  private readonly logger = new Logger(UserService.name);

  // Audit Log high performance batching properties
  private logBuffer: any[] = [];
  private readonly bufferSizeLimit = 50;
  private readonly bufferBytesLimit = 5 * 1024 * 1024; // 5MB
  private currentBufferBytes = 0;
  private flushInterval: NodeJS.Timeout = null;

  // Background export jobs map
  private exportJobs = new Map<string, ExportJob>();

  constructor(
    @InjectModel(User.name)
    private readonly userModel: Model<User>,
    @InjectModel(Cart.name)
    private readonly cartModel: Model<Cart>,
    @InjectModel(Medicine.name)
    private readonly medicineModel: Model<any>,
    @InjectModel(AuditLog.name)
    private readonly auditLogModel: Model<AuditLogDocument>,
    @InjectModel(Branch.name)
    private readonly branchModel: Model<BranchDocument>,
    @InjectModel(BranchFeedback.name)
    private readonly feedbackModel: Model<BranchFeedbackDocument>,
    @InjectModel(CustomerSegment.name)
    private readonly segmentModel: Model<CustomerSegmentDocument>,
    @InjectModel(StaffTransferRequest.name)
    private readonly staffTransferRequestModel: Model<StaffTransferRequest>,
    @InjectModel(StaffNotification.name)
    private readonly staffNotificationModel: Model<StaffNotification>,
    @InjectModel(WorkSchedule.name)
    private readonly workScheduleModel: Model<WorkSchedule>,
    @InjectModel(ShiftSwapRequest.name)
    private readonly shiftSwapRequestModel: Model<ShiftSwapRequest>,
    @InjectModel(LeaveRequest.name)
    private readonly leaveRequestModel: Model<LeaveRequest>,
    @InjectConnection()
    private readonly connection: Connection,
    @Inject('INVENTORY_SERVICE')
    private readonly inventoryClient: ClientKafka,
    @Inject('AUTH_SERVICE')
    private readonly authClient: ClientKafka,
  ) { }

  async onModuleInit() {
    this.inventoryClient.subscribeToResponseOf('inventory.medicine.get_by_id');
    this.inventoryClient.subscribeToResponseOf('inventory.medicine.get_by_ids');

    // Start periodic bulk flush timer (every 150ms)
    this.flushInterval = setInterval(() => {
      this.flushLogs().catch((err) => this.logger.error('Error in periodic flushLogs', err));
    }, 150);

    const retries = 20;
    const delay = 3000;
    for (let i = 0; i < retries; i++) {
      try {
        await this.inventoryClient.connect();
        this.logger.log('Successfully connected ClientKafka for INVENTORY_SERVICE');
        break; // break instead of return so initialization continues if needed
      } catch (err: any) {
        if (i === retries - 1) {
          this.logger.error('Failed to connect to INVENTORY_SERVICE via Kafka after retries', err);
          throw err;
        }
        this.logger.warn(`Kafka INVENTORY_SERVICE connection attempt ${i + 1} failed. Retrying in ${delay}ms...`);
        try { await this.inventoryClient.close(); } catch (e) { }
        await new Promise((resolve) => setTimeout(resolve, delay));
      }
    }
    await subscribeToKafkaTopics(
      this.inventoryClient,
      ['inventory.medicine.get_by_id', 'inventory.medicine.get_by_ids'],
      60,
      3000,
    );
    this.logger.log('Successfully connected ClientKafka for INVENTORY_SERVICE');
  }

  async onApplicationShutdown() {
    this.logger.log('UserService shutting down. Flushing remaining audit logs...');
    if (this.flushInterval) {
      clearInterval(this.flushInterval);
    }
    await this.flushLogs();
  }


  async editProfile(userId: string, data: { fullName?: string; phone?: string; address?: string }) {
    this.logger.log(`Editing profile for user ${userId}`);

    const user = await this.userModel.findById(userId);
    if (!user) {
      return { error: true, message: 'User not found', statusCode: 404 };
    }

    if (data.fullName) {
      user.fullName = data.fullName;
    }
    if (data.phone) {
      user.phone = data.phone;
    }
    if (data.address) {
      user.address = data.address;
    }

    await user.save();

    const result = user.toObject();
    delete result.passwordHash;
    return result;
  }

  async changeAvatar(userId: string, avatarUrl: string) {
    this.logger.log(`Changing avatar for user ${userId}`);

    const user = await this.userModel.findById(userId);
    if (!user) {
      return { error: true, message: 'User not found', statusCode: 404 };
    }

    user.avatarUrl = avatarUrl;
    await user.save();

    const result = user.toObject();
    delete result.passwordHash;
    return result;
  }

  // --- CART OPERATIONS ---

  async getCart(userId: string) {
    this.logger.log(`Fetching cart for user ${userId}`);
    let cart = await this.cartModel.findOne({ userId }).exec();
    if (!cart) {
      cart = new this.cartModel({ userId, items: [] });
      await cart.save();
    }

    if (cart.items.length === 0) {
      return { items: [], totalQuantity: 0 };
    }

    const itemIds = cart.items.map((it) => it.medicineId);
    let medicineDetails: any[] = [];

    try {
      medicineDetails = await this.medicineModel.find({ _id: { $in: itemIds } }).lean().exec();
    } catch (dbErr: any) {
      this.logger.warn(`Direct DB medicine query failed, trying Kafka fallback: ${dbErr.message}`);
    }

    if (!medicineDetails || medicineDetails.length === 0) {
      try {
        const kafkaRes: any = await lastValueFrom(
          this.inventoryClient.send('inventory.medicine.get_by_ids', { ids: itemIds }).pipe(
            require('rxjs').timeout(3000)
          )
        );
        if (Array.isArray(kafkaRes)) {
          medicineDetails = kafkaRes;
        }
      } catch (err: any) {
        this.logger.error(`Failed to fetch medicine details via Kafka RPC: ${err.message}`);
      }
    }

    const medicineMap = new Map<string, any>(
      medicineDetails.map((med) => [med._id ? med._id.toString() : (med.id ? med.id.toString() : ''), med])
    );

    let hasHealed = false;
    const enrichedItems = [];

    for (const item of cart.items) {
      const med = medicineMap.get(item.medicineId);
      if (!med) {
        // Auto-healing: Medicine has been deleted from the catalog, so remove it from user's cart
        hasHealed = true;
        continue;
      }

      const currentStock = med.stock !== undefined ? med.stock : 999;
      let finalQty = item.quantity;

      // Cap quantity if it exceeds current stock
      if (finalQty > currentStock && currentStock > 0) {
        finalQty = currentStock;
        hasHealed = true;
      }

      let currentPrice = med.price || 0;
      if (med.priceTiers && med.priceTiers.length > 0) {
        const applicableTiers = [...med.priceTiers].sort((a: any, b: any) => b.minQuantity - a.minQuantity);
        for (const tier of applicableTiers) {
          if (finalQty >= tier.minQuantity) {
            currentPrice = tier.price;
            break;
          }
        }
      }

      const priceChanged = currentPrice !== item.addedPrice;

      enrichedItems.push({
        id: item.medicineId,
        name: med.name,
        active_ingredient: med.active_ingredient || '',
        category: med.category || 'Chưa phân loại',
        unit: med.unit || 'Viên',
        image: med.image || '',
        price: currentPrice,
        addedPrice: item.addedPrice || currentPrice,
        priceChanged,
        stock: currentStock,
        quantity: finalQty,
      });

      // Update quantity or pricing in the DB item if adjusted/healed
      item.quantity = finalQty;
    }

    // Filter out items with 0 quantity (out of stock/depleted items capped to 0) or deleted items
    const validItems = cart.items.filter((it) => {
      const med = medicineMap.get(it.medicineId);
      return med && it.quantity > 0;
    });

    if (hasHealed) {
      cart.items = validItems as any;
      await cart.save();
    }

    const totalQuantity = enrichedItems.reduce((sum, it) => sum + it.quantity, 0);

    return {
      items: enrichedItems,
      totalQuantity,
    };
  }

  async addToCart(userId: string, medicineId: string, quantity: number) {
    let medicine: any;

    try {
      medicine = await this.medicineModel.findById(medicineId).lean().exec();
    } catch (dbErr: any) {
      this.logger.warn(`Direct DB lookup for medicine ${medicineId} failed: ${dbErr.message}`);
    }

    if (!medicine) {
      try {
        medicine = await lastValueFrom(
          this.inventoryClient.send('inventory.medicine.get_by_id', { id: medicineId }).pipe(
            require('rxjs').timeout(3000)
          )
        );
      } catch (err: any) {
        this.logger.error(`[addToCart] Error calling inventory.medicine.get_by_id for ID ${medicineId}: ${err.message}`);
      }
    }

    if (!medicine) {
      return { error: true, message: 'Thuốc không tồn tại hoặc đã ngừng kinh doanh', statusCode: 404 };
    }

    const currentStock = medicine.stock !== undefined ? medicine.stock : 999;
    if (currentStock <= 0) {
      return { error: true, message: 'Thuốc hiện tại đã hết hàng. Vui lòng chọn sản phẩm khác.', statusCode: 400 };
    }

    let cart = await this.cartModel.findOne({ userId }).exec();
    if (!cart) {
      cart = new this.cartModel({ userId, items: [] });
    }

    const existingIndex = cart.items.findIndex((it) => it.medicineId === medicineId);
    if (existingIndex > -1) {
      const newQty = cart.items[existingIndex].quantity + quantity;
      if (newQty > currentStock && currentStock > 0) {
        return { error: true, message: `Chỉ còn ${currentStock} sản phẩm khả dụng trong kho!`, statusCode: 400 };
      }
      cart.items[existingIndex].quantity = newQty;

      // Update addedPrice to reflect new tiered price if applicable
      let currentPrice = medicine.price;
      if (medicine.priceTiers && medicine.priceTiers.length > 0) {
        const applicableTiers = [...medicine.priceTiers].sort((a: any, b: any) => b.minQuantity - a.minQuantity);
        for (const tier of applicableTiers) {
          if (newQty >= tier.minQuantity) {
            currentPrice = tier.price;
            break;
          }
        }
      }
      cart.items[existingIndex].addedPrice = currentPrice;

    } else {
      if (quantity > currentStock && currentStock > 0) {
        return { error: true, message: `Chỉ còn ${currentStock} sản phẩm khả dụng trong kho!`, statusCode: 400 };
      }

      let initialPrice = medicine.price;
      if (medicine.priceTiers && medicine.priceTiers.length > 0) {
        const applicableTiers = [...medicine.priceTiers].sort((a: any, b: any) => b.minQuantity - a.minQuantity);
        for (const tier of applicableTiers) {
          if (quantity >= tier.minQuantity) {
            initialPrice = tier.price;
            break;
          }
        }
      }

      cart.items.push({
        medicineId,
        quantity,
        addedPrice: initialPrice,
      } as any);
    }

    await cart.save();
    return { success: true, message: 'Thêm vào giỏ hàng thành công!' };
  }

  async updateCartItem(userId: string, medicineId: string, quantity: number) {
    this.logger.log(`Updating quantity for medicine ${medicineId} in cart for user ${userId} to ${quantity}`);
    const cart = await this.cartModel.findOne({ userId }).exec();
    if (!cart) {
      return { error: true, message: 'Giỏ hàng không tồn tại', statusCode: 404 };
    }

    const existingIndex = cart.items.findIndex((it) => it.medicineId === medicineId);
    if (existingIndex === -1) {
      return { error: true, message: 'Thuốc không có trong giỏ hàng', statusCode: 404 };
    }

    if (quantity <= 0) {
      cart.items.splice(existingIndex, 1);
      await cart.save();
      return { success: true, message: 'Đã xóa sản phẩm khỏi giỏ hàng' };
    }

    let medicine: any;
    try {
      medicine = await this.medicineModel.findById(medicineId).lean().exec();
    } catch {
      // Fallback
    }

    if (!medicine) {
      try {
        medicine = await lastValueFrom(
          this.inventoryClient.send('inventory.medicine.get_by_id', { id: medicineId }).pipe(
            require('rxjs').timeout(3000)
          )
        );
      } catch (err: any) {
        // Continue with existing cart state
      }
    }

    const currentStock = medicine && medicine.stock !== undefined ? medicine.stock : 999;
    if (quantity > currentStock && currentStock > 0) {
      return { error: true, message: `Chỉ còn ${currentStock} sản phẩm khả dụng trong kho!`, statusCode: 400 };
    }

    cart.items[existingIndex].quantity = quantity;

    // Update addedPrice to reflect new tiered price if applicable
    if (medicine) {
      let currentPrice = medicine.price;
      if (medicine.priceTiers && medicine.priceTiers.length > 0) {
        const applicableTiers = [...medicine.priceTiers].sort((a: any, b: any) => b.minQuantity - a.minQuantity);
        for (const tier of applicableTiers) {
          if (quantity >= tier.minQuantity) {
            currentPrice = tier.price;
            break;
          }
        }
      }
      cart.items[existingIndex].addedPrice = currentPrice;
    }

    await cart.save();
    return { success: true, message: 'Cập nhật số lượng giỏ hàng thành công!' };
  }

  async deleteCartItem(userId: string, medicineId: string) {
    this.logger.log(`Deleting medicine ${medicineId} from cart for user ${userId}`);
    const cart = await this.cartModel.findOne({ userId }).exec();
    if (!cart) {
      return { error: true, message: 'Giỏ hàng không tồn tại', statusCode: 404 };
    }

    cart.items = cart.items.filter((it) => it.medicineId !== medicineId) as any;
    await cart.save();
    return { success: true, message: 'Đã xóa sản phẩm khỏi giỏ hàng' };
  }

  async clearCart(userId: string) {
    this.logger.log(`Clearing cart for user ${userId}`);
    const cart = await this.cartModel.findOne({ userId }).exec();
    if (cart) {
      cart.items = [];
      await cart.save();
    }
    return { success: true, message: 'Làm trống giỏ hàng thành công!' };
  }

  getMemberTier(accumulatedPoints: number): { name: string; multiplier: number } {
    if (accumulatedPoints >= 10000) return { name: 'Diamond', multiplier: 2.0 };
    if (accumulatedPoints >= 5000) return { name: 'Gold', multiplier: 1.5 };
    if (accumulatedPoints >= 1000) return { name: 'Silver', multiplier: 1.2 };
    return { name: 'Bronze', multiplier: 1.0 };
  }

  async getLoyaltyInfo(userId: string) {
    this.logger.log(`Getting loyalty info for user ${userId}`);
    const user = await this.userModel.findById(userId);
    if (!user) {
      return { error: true, message: 'User not found', statusCode: 404 };
    }
    const accPoints = user.accumulatedPoints || 0;
    const currentPoints = user.points || 0;
    const tierInfo = this.getMemberTier(accPoints);

    return {
      userId: user._id.toString(),
      fullName: user.fullName,
      phone: user.phone || '',
      email: user.email,
      points: currentPoints,
      accumulatedPoints: accPoints,
      tier: tierInfo.name,
      multiplier: tierInfo.multiplier,
      conversionRate: 1, // 1 point = 1 VND
    };
  }

  async lookupLoyaltyByPhone(phone: string) {
    this.logger.log(`Looking up loyalty for phone ${phone}`);
    const user = await this.userModel.findOne({ phone }).exec();
    if (!user) {
      return { error: true, message: 'Khách hàng chưa đăng ký thành viên', statusCode: 404 };
    }
    const accPoints = user.accumulatedPoints || 0;
    const currentPoints = user.points || 0;
    const tierInfo = this.getMemberTier(accPoints);

    return {
      userId: user._id.toString(),
      fullName: user.fullName,
      phone: user.phone,
      email: user.email,
      points: currentPoints,
      accumulatedPoints: accPoints,
      tier: tierInfo.name,
      multiplier: tierInfo.multiplier,
      conversionRate: 1,
      allergies: user.allergies || [],
      chronicConditions: user.chronicConditions || [],
    };
  }

  async updateClinicalProfile(data: { phone?: string; userId?: string; allergies?: string[]; chronicConditions?: string[] }) {
    this.logger.log(`Updating clinical profile: phone=${data.phone}, userId=${data.userId}`);
    let user;
    if (data.userId) {
      user = await this.userModel.findById(data.userId).exec();
    } else if (data.phone) {
      user = await this.userModel.findOne({ phone: data.phone.trim() }).exec();
    }

    if (!user) {
      return { error: true, message: 'Không tìm thấy hồ sơ người dùng để cập nhật bệnh án', statusCode: 404 };
    }

    if (data.allergies !== undefined) user.allergies = data.allergies;
    if (data.chronicConditions !== undefined) user.chronicConditions = data.chronicConditions;
    await user.save();

    return {
      success: true,
      userId: user._id.toString(),
      fullName: user.fullName,
      phone: user.phone,
      allergies: user.allergies || [],
      chronicConditions: user.chronicConditions || [],
    };
  }

  async updatePoints(data: { phone?: string; userId?: string; pointsDelta: number; accumulatedDelta?: number; operationKey?: string }) {
    this.logger.log(`Updating points: phone=${data.phone}, userId=${data.userId}, delta=${data.pointsDelta}`);
    let user;
    if (data.userId) {
      user = await this.userModel.findById(data.userId);
    } else if (data.phone) {
      user = await this.userModel.findOne({ phone: data.phone });
    }

    if (!user) {
      return { error: true, message: 'User not found', statusCode: 404 };
    }

    const delta = Number(data.pointsDelta);
    if (!Number.isFinite(delta)) {
      throw new RpcException({ message: 'Biến động điểm phải là số hợp lệ', statusCode: 400 });
    }
    const filter: any = { _id: user._id };
    if (delta < 0) filter.points = { $gte: -delta };
    if (data.operationKey) filter.loyaltyOperationKeys = { $ne: data.operationKey };
    const increments: any = { points: delta };
    if (Number(data.accumulatedDelta) > 0) increments.accumulatedPoints = Number(data.accumulatedDelta);
    const update: any = { $inc: increments };
    if (data.operationKey) update.$addToSet = { loyaltyOperationKeys: data.operationKey };
    const originalUser = user;
    user = await this.userModel.findOneAndUpdate(filter, update, { new: true }).exec();
    if (!user) {
      if (data.operationKey) {
        const alreadyApplied = await this.userModel.findOne({
          _id: originalUser._id,
          loyaltyOperationKeys: data.operationKey,
        }).exec();
        if (alreadyApplied) {
          return { success: true, duplicate: true, points: alreadyApplied.points, accumulatedPoints: alreadyApplied.accumulatedPoints, tier: alreadyApplied.tier };
        }
      }
      throw new RpcException({ message: 'Không đủ điểm tích lũy để thực hiện giao dịch', statusCode: 409 });
    }
    const tierInfo = this.getMemberTier(user.accumulatedPoints || 0);
    await this.userModel.updateOne({ _id: user._id }, { $set: { tier: tierInfo.name } }).exec();
    return {
      success: true,
      points: user.points,
      accumulatedPoints: user.accumulatedPoints,
      tier: tierInfo.name,
      multiplier: tierInfo.multiplier,
    };
  }

  // --- AUDIT LOG OPERATIONS ---

  async createAuditLog(data: any) {
    // Calculate approximate size of document in bytes for the 5MB memory limit
    const jsonStr = JSON.stringify(data);
    const sizeBytes = Buffer.byteLength(jsonStr);

    this.logBuffer.push(data);
    this.currentBufferBytes += sizeBytes;

    // Flush immediately if either constraint is met: 50 logs OR 5MB of buffer size
    if (this.logBuffer.length >= this.bufferSizeLimit || this.currentBufferBytes >= this.bufferBytesLimit) {
      this.logger.log(`Audit log buffer limits hit (Size: ${this.logBuffer.length}, Bytes: ${this.currentBufferBytes}). Flushing now.`);
      this.flushLogs().catch((err) => this.logger.error('Error during immediate flushLogs', err));
    }

    return { success: true };
  }

  async flushLogs() {
    if (this.logBuffer.length === 0) {
      return;
    }

    // Shallow copy buffer and reset state
    const logsToWrite = [...this.logBuffer];
    this.logBuffer = [];
    this.currentBufferBytes = 0;

    try {
      // Map logs to bulkWrite insertOne operations
      const bulkOps = logsToWrite.map((log) => ({
        insertOne: {
          document: log,
        },
      }));

      const startTime = Date.now();
      // ordered: false skips duplicates (Unique Index constraints) and writes other unique items
      const result = await this.auditLogModel.bulkWrite(bulkOps, { ordered: false });
      const duration = Date.now() - startTime;

      this.logger.log(`Successfully bulk-wrote ${result.insertedCount} audit logs (Duration: ${duration}ms).`);
    } catch (err: any) {
      // Catch and ignore expected Duplicate Key warnings since they represent idempotency blocks
      this.logger.warn(`Bulk write completed with skipped items (e.g. duplicate key blocks). Details: ${err.message}`);
    }

    // Broadcast the batch of successfully saved logs to audit.persisted Kafka topic
    try {
      this.inventoryClient.emit('audit.persisted', logsToWrite);
    } catch (emitErr: any) {
      this.logger.error('Failed to emit audit.persisted events to Kafka', emitErr);
    }
  }

  async listAuditLogs(query: { page?: number; limit?: number; search?: string; role?: string; module?: string; eventType?: string; severity?: string; status?: string; afterEventId?: string }) {
    const page = Number(query.page) || 1;
    const limit = Number(query.limit) || 50;
    const skip = (page - 1) * limit;

    const filter: any = {};

    // Exact filters
    if (query.role) filter.role = query.role;
    if (query.eventType) filter.eventType = query.eventType;
    if (query.severity) filter.severity = query.severity;
    if (query.status) filter.status = query.status;

    // Support module scope filtering (array or single string)
    if (query.module) {
      if (query.module.includes(',')) {
        filter.module = { $in: query.module.split(',') };
      } else {
        filter.module = query.module;
      }
    }

    // High performance text index search (removes slow regex matching)
    if (query.search) {
      filter.$text = { $search: query.search };
    }

    // Support cursor-based catch up query after a specific log event
    if (query.afterEventId) {
      const referenceLog = await this.auditLogModel.findOne({ auditEventId: query.afterEventId }).exec();
      if (referenceLog) {
        filter._id = { $gt: referenceLog._id };
      }
    }

    try {
      const total = await this.auditLogModel.countDocuments(filter).exec();
      const items = await this.auditLogModel.find(filter)
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(limit)
        .exec();

      return { items, total, page, limit };
    } catch (err: any) {
      this.logger.error('Failed to list audit logs', err);
      return { error: true, message: err.message };
    }
  }

  async exportAuditLogs(query: any) {
    const jobId = randomUUID();

    // Initialize background export job
    this.exportJobs.set(jobId, {
      id: jobId,
      status: 'PENDING',
      createdAt: new Date(),
    });

    // Run export in background (non-blocking)
    this.runExportJob(jobId, query).catch((err) => {
      this.logger.error(`Export Job ${jobId} failed`, err);
    });

    return { jobId, status: 'PENDING' };
  }

  async getExportJobStatus(jobId: string): Promise<ExportJobStatusDto> {
    const job = this.exportJobs.get(jobId);
    if (!job) {
      throw new RpcException({ message: 'Export job not found', statusCode: 404 });
    }
    return job;
  }

  private async runExportJob(jobId: string, query: any) {
    const job = this.exportJobs.get(jobId);
    if (!job) return;

    job.status = 'PROCESSING';
    this.logger.log(`Starting export job ${jobId}`);

    const filter: any = {};
    if (query.role) filter.role = query.role;
    if (query.eventType) filter.eventType = query.eventType;
    if (query.severity) filter.severity = query.severity;
    if (query.status) filter.status = query.status;
    if (query.module) {
      if (query.module.includes(',')) {
        filter.module = { $in: query.module.split(',') };
      } else {
        filter.module = query.module;
      }
    }
    if (query.search) {
      filter.$text = { $search: query.search };
    }

    // Exclude large payload and before/after fields from exports for optimal file sizing
    const cursor = this.auditLogModel.find(filter)
      .select('-payload -diff')
      .sort({ createdAt: -1 })
      .cursor();

    const tempDir = path.resolve(process.cwd(), 'temp');
    if (!fs.existsSync(tempDir)) {
      fs.mkdirSync(tempDir, { recursive: true });
    }

    const filename = `audit-export-${jobId}.csv.gz`;
    const filePath = path.join(tempDir, filename);

    const writeStream = fs.createWriteStream(filePath);
    const gzip = zlib.createGzip();

    gzip.pipe(writeStream);

    // CSV Headers
    const headers = [
      'Time (UTC)',
      'Correlation ID',
      'Request ID',
      'Session ID',
      'User Email',
      'Role',
      'Module',
      'Action Code',
      'Action Name',
      'Event Type',
      'Entity Type',
      'Entity ID',
      'Entity Name',
      'Version',
      'Status',
      'Severity',
      'IP Address',
      'Browser',
      'OS',
      'Device',
      'Summary'
    ].join(',') + '\n';

    gzip.write(headers);

    let count = 0;
    try {
      for (let doc = await cursor.next(); doc != null; doc = await cursor.next()) {
        const row = [
          doc.createdAt ? doc.createdAt.toISOString() : '',
          doc.correlationId || '',
          doc.requestId || '',
          doc.sessionId || '',
          doc.username || '',
          doc.role || '',
          doc.module || '',
          doc.actionCode || '',
          doc.actionName || '',
          doc.eventType || '',
          doc.entityType || '',
          doc.entityId || '',
          doc.entityName || '',
          doc.entityVersion != null ? String(doc.entityVersion) : '',
          doc.status || '',
          doc.severity || '',
          doc.ip || '',
          doc.browser || '',
          doc.os || '',
          doc.device || '',
          doc.summary || ''
        ];

        // Format CSV Row with RFC 4180 escaping
        const escapedRow = row.map((val) => {
          const str = String(val);
          if (str.includes(',') || str.includes('"') || str.includes('\n')) {
            return '"' + str.replace(/"/g, '--') + '"'; // sanitize quotes
          }
          return str;
        }).join(',') + '\n';

        gzip.write(escapedRow);
        count++;
      }

      gzip.end();

      await new Promise<void>((resolve, reject) => {
        writeStream.on('finish', () => resolve());
        writeStream.on('error', (err) => reject(err));
      });

      job.status = 'COMPLETED';
      job.filename = filename;
      job.totalRecords = count;
      this.logger.log(`Export job ${jobId} finished successfully. Wrote ${count} records.`);
    } catch (err: any) {
      this.logger.error(`Error processing export job ${jobId}`, err);
      job.status = 'FAILED';
      job.error = err.message;
      try {
        gzip.end();
        writeStream.end();
      } catch (e) { }
    }
  }

  // --- ADMIN EMPLOYEE MANAGEMENT ---

  async createEmployee(data: any) {
    this.logger.log(`Creating new employee: ${data.email}, phone: ${data.phone}, requesterRole: ${data.requesterRole}`);
    const existing = await this.userModel.findOne({ email: data.email }).exec();
    if (existing) {
      return { error: true, message: 'Email đã tồn tại', statusCode: 409 };
    }

    // Validate unique phone number if provided
    if (data.phone) {
      const existingPhone = await this.userModel.findOne({ phone: data.phone.trim() }).exec();
      if (existingPhone) {
        return { error: true, message: 'Số điện thoại đã tồn tại', statusCode: 409 };
      }
    }

    // Ràng buộc phân quyền: Quản lý chi nhánh chỉ được tạo Dược sĩ cho cơ sở của mình
    if (data.requesterRole === 'branch') {
      if (!data.requesterBranchId) {
        return { error: true, message: 'Tài khoản quản lý không có thông tin chi nhánh', statusCode: 403 };
      }
      data.branchId = data.requesterBranchId;
      data.role = 'pharmacist';
    }

    const rawPassword = data.password && data.password.trim().length > 0 ? data.password.trim() : randomUUID().replace(/-/g, '').slice(0, 16);
    const passwordHash = await bcrypt.hash(rawPassword, 12);

    const newUser = new this.userModel({
      email: data.email,
      phone: data.phone?.trim() || undefined,
      passwordHash,
      fullName: data.fullName,
      role: data.role,
      branchId: data.branchId || null,
      isActive: true,       // Quản lý cơ sở chịu trách nhiệm cao nhất, nhân viên kích hoạt hoạt động ngay
      isEmailVerified: true,
      isApproved: 'approved',
    });

    await newUser.save();

    // Auto sync manager field in Branch when branch manager is created
    if (data.role === 'branch' && data.branchId) {
      await this.syncManagerToBranch(data.branchId, data.fullName);
    }

    // Phat su kien gui email chao mung va OTP thiet lap mat khau cho nhan vien moi
    try {
      this.authClient.emit('auth.employee.welcome_reset_password', {
        email: data.email,
        fullName: data.fullName,
        branchId: data.branchId,
        role: data.role,
      });
    } catch (err: any) {
      this.logger.warn(`Loi phat su kien gui email chao mung nhan vien: ${err.message}`);
    }

    const result = newUser.toObject();
    delete result.passwordHash;
    return result;
  }

  // --- DIEU CHUYEN NHAN SU GIUA CAC CHI NHANH ---

  async lookupEmployees(query: string) {
    if (!query || query.trim().length < 2) return [];
    const q = query.trim();
    // Escape ky tu dac biet cua regex de tranh loi cu phap va ReDoS
    const escaped = q.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    const regex = new RegExp(escaped, 'i');
    const employees = await this.userModel
      .find({
        role: 'pharmacist',
        $or: [{ email: regex }, { phone: regex }, { fullName: regex }],
      })
      .select('_id fullName email phone role branchId isActive isApproved')
      .limit(15)
      .lean()
      .exec();
    return employees;
  }

  async getEmployeeUpcomingShifts(employeeId: string, branchId: string) {
    if (!branchId || !employeeId) return [];
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const schedules = await this.workScheduleModel
      .find({
        branchId,
        weekEnd: { $gte: today },
        status: 'published',
      })
      .lean()
      .exec();

    const upcomingShifts: any[] = [];
    for (const sched of schedules) {
      for (const a of (sched.assignments || [])) {
        if (String(a.employeeId) === String(employeeId)) {
          const shiftDate = new Date(a.date);
          if (shiftDate >= today) {
            upcomingShifts.push({
              date: a.date,
              dateStr: shiftDate.toISOString().split('T')[0],
              shiftId: a.shiftId,
              shiftName: a.shiftName,
              shiftStart: a.shiftStart,
              shiftEnd: a.shiftEnd,
              scheduleId: (sched as any)._id?.toString(),
            });
          }
        }
      }
    }
    return upcomingShifts;
  }

  async createTransferRequest(data: {
    employeeId: string;
    note?: string;
    requesterId: string;
    requesterName: string;
    requesterBranchId: string;
  }) {
    if (!data.requesterBranchId) {
      return { error: true, message: 'Tai khoan quan ly khong co thong tin chi nhanh', statusCode: 403 };
    }

    const employee = await this.userModel.findById(data.employeeId).exec();
    if (!employee) {
      return { error: true, message: 'Khong tim thay thong tin nhan vien', statusCode: 404 };
    }

    if (employee.role === 'admin' || employee.role === 'warehouse') {
      return { error: true, message: 'Khong the tiep nhan nhan su vai tro quan tri he thong hoac thu kho', statusCode: 403 };
    }

    if (employee.branchId === data.requesterBranchId) {
      return { error: true, message: 'Nhan vien nay da truc thuoc chi nhanh cua ban', statusCode: 400 };
    }

    // Kiem tra neu dang co yeu cau pending cho nhan vien nay
    const existingPending = await this.staffTransferRequestModel.findOne({
      employeeId: data.employeeId,
      status: 'pending',
    }).exec();

    if (existingPending) {
      return { error: true, message: 'Nhan vien nay dang co mot yeu cau dieu chuyen cho duyet', statusCode: 409 };
    }

    const newRequest = await this.staffTransferRequestModel.create({
      employeeId: data.employeeId,
      employeeName: employee.fullName,
      employeeEmail: employee.email,
      fromBranchId: employee.branchId || undefined,
      toBranchId: data.requesterBranchId,
      requesterId: data.requesterId,
      requesterName: data.requesterName,
      status: 'pending',
      note: data.note || '',
    });

    // Thong bao in-app cho nhan vien
    try {
      await this.staffNotificationModel.create({
        recipientId: employee._id.toString(),
        branchId: data.requesterBranchId,
        type: 'staff_transfer_request',
        title: 'Yeu cau dieu chuyen cong tac',
        message: `Quan ly ${data.requesterName} gui yeu cau tiep nhan ban vao chi nhanh ${data.requesterBranchId}. Vui long phan hoi.`,
        relatedId: newRequest._id.toString(),
      });
    } catch (err: any) {
      this.logger.warn(`Loi tao thong bao dieu chuyen: ${err.message}`);
    }

    return newRequest.toObject ? newRequest.toObject() : newRequest;
  }

  async listTransferRequests(filter: { userId?: string; role?: string; branchId?: string; status?: string }) {
    const query: any = {};
    if (filter.status) {
      query.status = filter.status;
    }

    if (filter.role === 'pharmacist' && filter.userId) {
      query.employeeId = filter.userId;
    } else if (filter.role === 'branch' && filter.branchId) {
      query.$or = [{ toBranchId: filter.branchId }, { fromBranchId: filter.branchId }];
    }

    const requests = await this.staffTransferRequestModel.find(query).sort({ createdAt: -1 }).lean().exec();
    return requests;
  }

  async respondTransferRequest(data: {
    requestId: string;
    userId: string;
    role: string;
    branchId?: string;
    action: 'approve' | 'reject';
    responseNote?: string;
    scheduleResolution?: 'cancel_upcoming_shifts' | 'defer';
  }) {
    const request = await this.staffTransferRequestModel.findById(data.requestId).exec();
    if (!request) {
      return { error: true, message: 'Khong tim thay yeu cau dieu chuyen', statusCode: 404 };
    }

    if (request.status !== 'pending') {
      return { error: true, message: 'Yeu cau nay da duoc xu ly truoc do', statusCode: 400 };
    }

    // Kiem tra quyen: chinh nhan vien do hoac quan ly chi nhanh cu hoac admin
    const isEmployee = String(request.employeeId) === String(data.userId);
    const isOldManager = Boolean(request.fromBranchId && request.fromBranchId === data.branchId);
    const isAdmin = data.role === 'admin';

    if (!isEmployee && !isOldManager && !isAdmin) {
      return { error: true, message: 'Ban khong co quyen phan hoi yeu cau dieu chuyen nay', statusCode: 403 };
    }

    if (data.action === 'approve') {
      const fromBranch = request.fromBranchId;
      const upcomingShifts = fromBranch ? await this.getEmployeeUpcomingShifts(request.employeeId, fromBranch) : [];

      // Neu con ca truc chua hoan thanh va chua lua chon cach xu ly -> Bat buoc tra ve canh bao de nguoi dung lua chon
      if (upcomingShifts.length > 0 && !data.scheduleResolution) {
        return {
          hasConflict: true,
          code: 'HAS_UPCOMING_SHIFTS',
          message: `Nhan vien dang co ${upcomingShifts.length} ca truc sap toi tai chi nhanh cu. Vui long chon giai phap xu ly lich lam viec.`,
          upcomingShiftsCount: upcomingShifts.length,
          upcomingShifts,
        };
      }

      // LUA CHON 1: Tam thoi khong chuyen cho den khi nhan vien xong het lich
      if (upcomingShifts.length > 0 && data.scheduleResolution === 'defer') {
        const deferMsg = data.responseNote || `Tam hoan dieu chuyen: Nhan su se hoan thanh not ${upcomingShifts.length} ca truc tai co so hien tai truoc khi chuyen giao.`;
        request.responseNote = deferMsg;
        await request.save();

        try {
          await this.staffNotificationModel.create({
            recipientId: request.requesterId,
            branchId: request.toBranchId,
            type: 'staff_transfer_deferred',
            title: 'Tam hoan dieu chuyen cho xong ca truc',
            message: `Yeu cau tiep nhan nhan vien ${request.employeeName} tam hoan chuyen giao cho den khi nhan vien hoan thanh ${upcomingShifts.length} ca truc con lai tai co so cu.`,
            relatedId: request._id.toString(),
          });
        } catch (err: any) {
          this.logger.warn(`Loi tao thong bao tam hoan: ${err.message}`);
        }

        return {
          success: true,
          deferred: true,
          message: `Da tam hoan dieu chuyen. Nhan vien se hoan thanh het ${upcomingShifts.length} ca truc con lai tai chi nhanh cu truoc khi chuyen giao.`,
          request: request.toObject ? request.toObject() : request,
        };
      }

      // LUA CHON 2: Huy tat ca lich sap toi cua nhan vien do va chuyen ngay (Cover tat ca truong hop)
      if (upcomingShifts.length > 0 && data.scheduleResolution === 'cancel_upcoming_shifts') {
        const today = new Date();
        today.setHours(0, 0, 0, 0);

        // 1. Huy ca truc sap toi trong work_schedules cua fromBranch
        const schedulesToUpdate = await this.workScheduleModel
          .find({
            branchId: fromBranch,
            weekEnd: { $gte: today },
          })
          .exec();

        let cancelledShiftCount = 0;
        for (const sched of schedulesToUpdate) {
          let modified = false;
          const remainingAssignments: any[] = [];
          for (const a of (sched.assignments || [])) {
            if (String(a.employeeId) === String(request.employeeId) && new Date(a.date) >= today) {
              cancelledShiftCount++;
              modified = true;
            } else {
              remainingAssignments.push(a);
            }
          }
          if (modified) {
            sched.assignments = remainingAssignments;
            await sched.save();
          }
        }

        // 2. Huy cac don doi ca (shift_swap_requests) dang pending cua nhan vien tai fromBranch
        try {
          await this.shiftSwapRequestModel
            .updateMany(
              {
                branchId: fromBranch,
                status: 'pending',
                $or: [{ requesterId: request.employeeId }, { targetId: request.employeeId }],
              },
              {
                $set: {
                  status: 'rejected',
                  responseNote: 'Tu dong huy do nhan su da duoc dieu chuyen sang chi nhanh moi',
                },
              }
            )
            .exec();
        } catch (err: any) {
          this.logger.warn(`Loi huy shift swap: ${err.message}`);
        }

        // 3. Huy cac don nghi phep (leave_requests) dang PENDING cua nhan vien tu hom nay tro di tai fromBranch
        try {
          const todayStr = today.toISOString().split('T')[0];
          await this.leaveRequestModel
            .updateMany(
              {
                branchId: fromBranch,
                requesterId: request.employeeId,
                status: LeaveStatus.PENDING,
                shiftDate: { $gte: todayStr },
              },
              {
                $set: {
                  status: LeaveStatus.CANCELLED,
                  rejectionReason: 'Tu dong huy do nhan su da duoc dieu chuyen sang chi nhanh moi',
                },
              }
            )
            .exec();
        } catch (err: any) {
          this.logger.warn(`Loi huy leave request: ${err.message}`);
        }

        // 4. Ban thong bao canh bao cho quan ly chi nhanh cu vao xep nguoi thay the
        try {
          await this.staffNotificationModel.create({
            recipientId: request.fromBranchId,
            branchId: request.fromBranchId,
            type: 'staff_schedule_alert',
            title: 'Canh bao khuyet nhan su ca truc',
            message: `Nhan vien ${request.employeeName} da duoc dieu chuyen sang ${request.toBranchId}. He thong da tu dong huy ${cancelledShiftCount} ca truc sap toi. Vui long vao phan cong nhan su thay the ngay.`,
            relatedId: request._id.toString(),
          });
        } catch (err: any) {
          this.logger.warn(`Loi tao thong bao canh bao khuyet ca: ${err.message}`);
        }
      }

      // Chinh thuc cap nhat branchId sang chi nhanh moi
      request.status = 'approved';
      request.resolvedBy = data.userId;
      request.resolvedAt = new Date();
      if (data.responseNote) request.responseNote = data.responseNote;
      await request.save();

      await this.userModel
        .findByIdAndUpdate(request.employeeId, {
          $set: {
            branchId: request.toBranchId,
            role: 'pharmacist',
            isActive: true,
            isApproved: 'approved',
          },
        })
        .exec();

      try {
        await this.staffNotificationModel.create({
          recipientId: request.requesterId,
          branchId: request.toBranchId,
          type: 'staff_transfer_approved',
          title: 'Yeu cau tiep nhan duoc chap thuan',
          message: `Nhan vien ${request.employeeName} da chinh thuc duoc dieu chuyen vao chi nhanh ${request.toBranchId}.`,
          relatedId: request._id.toString(),
        });
      } catch (err: any) {
        this.logger.warn(`Loi tao thong bao chap thuan: ${err.message}`);
      }

      return request.toObject ? request.toObject() : request;
    } else {
      // Action === 'reject'
      request.status = 'rejected';
      request.resolvedBy = data.userId;
      request.resolvedAt = new Date();
      if (data.responseNote) request.responseNote = data.responseNote;
      await request.save();

      try {
        await this.staffNotificationModel.create({
          recipientId: request.requesterId,
          branchId: request.toBranchId,
          type: 'staff_transfer_rejected',
          title: 'Yeu cau tiep nhan bi tu choi',
          message: `Yeu cau tiep nhan nhan vien ${request.employeeName} da bi tu choi.`,
          relatedId: request._id.toString(),
        });
      } catch (err: any) {
        this.logger.warn(`Loi tao thong bao tu choi: ${err.message}`);
      }

      return request.toObject ? request.toObject() : request;
    }
  }

  async approveEmployee(id: string, action: 'approve' | 'reject') {
    this.logger.log(`Admin ${action}ing employee: ${id}`);
    const employee = await this.userModel.findById(id).exec();
    if (!employee) {
      return { error: true, message: 'Nhân viên không tồn tại', statusCode: 404 };
    }

    if (action === 'approve') {
      employee.isApproved = 'approved';
      employee.isActive = true;
    } else {
      employee.isApproved = 'rejected';
      employee.isActive = false;
    }

    await employee.save();
    const result = employee.toObject();
    delete result.passwordHash;
    return result;
  }

  async listEmployees(query: any) {
    this.logger.log('Admin listing employees');
    // Mặc định bỏ qua role 'user' (khách hàng)
    const filter: any = { role: { $ne: 'user' } };
    if (query?.role) {
      filter.role = query.role;
    }
    
    if (query?.unassigned === 'true' || query?.unassigned === true) {
      filter.branchId = { $in: [null, ""] };
    } else if (query?.branchId) {
      filter.branchId = query.branchId;
    }

    const employees = await this.userModel.find(filter).select('-passwordHash').sort({ createdAt: -1 }).exec();
    return employees;
  }

  async getEmployeeById(id: string) {
    this.logger.log(`Admin fetching employee: ${id}`);
    const employee = await this.userModel.findById(id).select('-passwordHash').exec();
    if (!employee) {
      return { error: true, message: 'Nhân viên không tồn tại', statusCode: 404 };
    }
    return employee;
  }

  async updateEmployee(id: string, data: any) {
    this.logger.log(`Updating employee: ${id}`);
    const employee = await this.userModel.findById(id).exec();
    if (!employee) {
      return { error: true, message: 'Nhân viên không tồn tại', statusCode: 404 };
    }

    // Ràng buộc bảo mật IDOR: Quản lý chi nhánh chỉ được cập nhật nhân sự thuộc cơ sở của mình
    if (data.requesterRole === 'branch') {
      if (!data.requesterBranchId || employee.branchId !== data.requesterBranchId) {
        return { error: true, message: 'Bạn không có quyền chỉnh sửa nhân sự của chi nhánh khác', statusCode: 403 };
      }
      data.branchId = data.requesterBranchId;
      data.role = 'pharmacist';
    }

    const oldBranchId = employee.branchId;
    if (data.fullName) employee.fullName = data.fullName;
    if (data.role) employee.role = data.role;
    if (data.branchId !== undefined) employee.branchId = data.branchId;
    if (data.phone !== undefined) {
      if (data.phone) {
        const existingPhone = await this.userModel.findOne({
          phone: data.phone.trim(),
          _id: { $ne: id },
        }).exec();
        if (existingPhone) {
          return { error: true, message: 'Số điện thoại đã tồn tại', statusCode: 409 };
        }
        employee.phone = data.phone.trim();
      } else {
        employee.set('phone', undefined);
      }
    }

    await employee.save();

    // Auto sync manager field in Branch when branch manager changes
    const finalRole = data.role || employee.role;
    if (finalRole === 'branch') {
      const newBranchId = data.branchId !== undefined ? data.branchId : oldBranchId;
      const managerName = data.fullName || employee.fullName;
      if (newBranchId) {
        await this.syncManagerToBranch(newBranchId, managerName);
      }
    }

    const result = employee.toObject();
    delete result.passwordHash;
    return result;
  }

  // Get user details by phone number (excluding password hash)
  async getUserByPhone(phone: string) {
    if (!phone) return null;
    const user = await this.userModel.findOne({ phone: phone.trim() }).select('-passwordHash').exec();
    return user;
  }

  /**
   * Cập nhật field `manager` trong Branch document khi quản lý chi nhánh thay đổi.
   * Chỉ cập nhật nếu người dùng là role 'branch' và có branchId hợp lệ.
   */
  private async syncManagerToBranch(branchId: string, managerName: string): Promise<void> {
    try {
      await this.branchModel.updateOne(
        { branchCode: branchId },
        { $set: { manager: managerName } },
      ).exec();
      this.logger.log(`✅ Synced manager "${managerName}" → branch [${branchId}]`);
    } catch (err) {
      this.logger.error(`❌ Failed to sync manager to branch [${branchId}]:`, err);
    }
  }

  async toggleBanEmployee(id: string, requesterRole?: string, requesterBranchId?: string) {
    this.logger.log(`Toggling ban for employee: ${id}`);
    const employee = await this.userModel.findById(id).exec();
    if (!employee) {
      return { error: true, message: 'Nhân viên không tồn tại', statusCode: 404 };
    }

    // Ràng buộc bảo mật IDOR: Quản lý chi nhánh chỉ được thao tác với nhân sự trong cơ sở mình
    if (requesterRole === 'branch') {
      if (!requesterBranchId || employee.branchId !== requesterBranchId) {
        return { error: true, message: 'Bạn không có quyền thao tác với nhân viên của chi nhánh khác', statusCode: 403 };
      }
    }

    // Ràng buộc chuẩn GPP: Nếu nhân sự này đang là PTCM và chuẩn bị bị khóa
    if (employee.isActive && employee.isBranchPIC) {
      return {
        error: true,
        message: 'Dược sĩ này đang là Phụ trách chuyên môn (PTCM) của chi nhánh. Vui lòng chuyển giao vai trò PTCM cho nhân sự khác trước khi khóa tài khoản.',
        statusCode: 400,
      };
    }

    // Toggle trạng thái isActive
    employee.isActive = !employee.isActive;
    await employee.save();

    const result = employee.toObject();
    delete result.passwordHash;
    return result;
  }

  async deleteEmployee(id: string, requesterRole?: string, requesterBranchId?: string) {
    this.logger.log(`Deleting employee: ${id}`);
    const employee = await this.userModel.findById(id).exec();
    if (!employee) {
      return { error: true, message: 'Nhân viên không tồn tại', statusCode: 404 };
    }

    // Ràng buộc bảo mật: Quản lý chi nhánh không có quyền xóa tài khoản nhân sự, chỉ được phép khóa (Ban)
    if (requesterRole === 'branch') {
      return { error: true, message: 'Quản lý chi nhánh không có thẩm quyền xóa tài khoản nhân viên, chỉ được phép khóa tài khoản', statusCode: 403 };
    }

    // Ràng buộc chuẩn GPP: Không được xóa trực tiếp nhân sự đang là PTCM cơ sở
    if (employee.isBranchPIC) {
      return {
        error: true,
        message: 'Không thể xóa Dược sĩ đang đứng tên Phụ trách chuyên môn (PTCM) của chi nhánh. Vui lòng chỉ định PTCM mới trước khi xóa.',
        statusCode: 400,
      };
    }

    await this.userModel.findByIdAndDelete(id).exec();
    return { success: true, message: 'Xóa nhân viên thành công' };
  }

  // =========================================================================
  // 🌟 KHÁCH HÀNG ĐÁNH GIÁ TRẢI NGHIỆM CHI NHÁNH & CSKH (LOYALTY INTEGRATED)
  // =========================================================================

  async createFeedback(data: any): Promise<any> {
    const {
      orderCode,
      orderId,
      branchId,
      branchName,
      customerPhone,
      customerName,
      rating,
      tags,
      comment,
      images,
      pharmacistId,
      pharmacistName,
    } = data;

    if (!orderCode || !customerPhone || !rating) {
      throw new RpcException('Thiếu thông tin bắt buộc: orderCode, customerPhone hoặc rating');
    }

    // 1. Kiểm tra đơn hàng đã đánh giá chưa (Khóa mỗi đơn hàng chỉ đánh giá 1 lần)
    const existingFeedback = await this.feedbackModel.findOne({ orderCode }).exec();
    if (existingFeedback) {
      return {
        success: false,
        alreadyReviewed: true,
        message: 'Hóa đơn này đã được gửi đánh giá trước đó.',
        feedback: existingFeedback,
      };
    }

    // 2. Chống gian lận / Farm điểm: Kiểm tra tần suất trong ngày của SĐT
    const startOfDay = new Date();
    startOfDay.setHours(0, 0, 0, 0);
    const todayFeedbackCount = await this.feedbackModel.countDocuments({
      customerPhone,
      createdAt: { $gte: startOfDay },
    });

    let rewardPoints = 0;
    let rewardMessage = '';
    const isAbuse = todayFeedbackCount >= 1; // Giới hạn 1 lần nhận điểm thưởng / ngày

    if (!isAbuse) {
      rewardPoints = 1000; // Đánh giá cơ bản được 1.000 điểm (= 1.000 VNĐ)
      if ((comment && comment.trim().length >= 30) || (images && images.length > 0)) {
        rewardPoints += 1000; // Nhận xét có tâm / có ảnh quầy được thêm 1.000 điểm (tối đa 2.000 điểm)
      }
      rewardMessage = `Bạn đã nhận được +${rewardPoints.toLocaleString('vi-VN')} điểm thưởng vào tài khoản thành viên!`;
    } else {
      rewardMessage = 'Cảm ơn bạn đã đóng góp ý kiến! Điểm thưởng đánh giá được áp dụng tối đa 1 lần mỗi ngày.';
    }

    // 3. Cập nhật điểm cho User & Tính Hạng thành viên (Tiering)
    let updatedCustomer: any = null;
    let customerTier = 'Bronze';
    try {
      if (rewardPoints > 0) {
        updatedCustomer = await this.updatePoints({
          phone: customerPhone,
          pointsDelta: rewardPoints,
          accumulatedDelta: rewardPoints,
        });
        customerTier = updatedCustomer?.tier || this.getMemberTier(updatedCustomer?.accumulatedPoints || 0).name;
      } else {
        const user = await this.userModel.findOne({ phone: customerPhone }).exec();
        if (user) {
          customerTier = this.getMemberTier(user.accumulatedPoints || 0).name;
        }
      }
    } catch (e: any) {
      this.logger.warn(`Không thể cập nhật điểm thưởng cho SĐT ${customerPhone}: ${e.message}`);
    }

    // 4. Phát sinh mã voucher giảm giá cho lần mua sau (Retention Voucher)
    const cleanBranchId = branchId || 'BR01';
    const issuedVoucherCode = `THANKS-${cleanBranchId.replace(/[^A-Za-z0-9]/g, '')}-${Date.now().toString().slice(-4)}`;

    const numRating = Number(rating);
    const isNegative = numRating <= 2;

    const newFeedback = new this.feedbackModel({
      orderId: orderId || orderCode,
      orderCode,
      branchId: cleanBranchId,
      branchName: branchName || 'Chi nhánh nhà thuốc ABC',
      pharmacistId,
      pharmacistName,
      customerPhone,
      customerName: updatedCustomer?.name || customerName || 'Khách hàng thân thiết',
      customerTier,
      rating: numRating,
      tags: Array.isArray(tags) ? tags : [],
      comment,
      images: Array.isArray(images) ? images : [],
      rewardPointsEarned: rewardPoints,
      issuedVoucherCode,
      isNegative,
      status: isNegative ? 'PENDING' : 'CLOSED',
    });

    const saved = await newFeedback.save();

    return {
      success: true,
      message: 'Gửi đánh giá dịch vụ thành công!',
      rewardPointsEarned: rewardPoints,
      rewardMessage,
      customerTier,
      currentPoints: updatedCustomer?.points || 0,
      voucher: {
        code: issuedVoucherCode,
        discountAmount: 5000,
        minOrderValue: 100000,
        description: 'Giảm 5.000đ cho đơn hàng kế tiếp từ 100.000đ tại chi nhánh',
        expiryDays: 14,
      },
      feedback: saved,
    };
  }

  async getFeedbacksByBranch(params: {
    branchId: string;
    status?: string;
    rating?: number;
    page?: number;
    limit?: number;
  }): Promise<any> {
    const { branchId, status, rating, page = 1, limit = 20 } = params;
    const query: any = { branchId };
    if (status) query.status = status;
    if (rating) query.rating = Number(rating);

    const skip = (page - 1) * limit;
    const [feedbacks, total, stats] = await Promise.all([
      this.feedbackModel.find(query).sort({ createdAt: -1 }).skip(skip).limit(limit).exec(),
      this.feedbackModel.countDocuments(query),
      this.feedbackModel.aggregate([
        { $match: { branchId } },
        {
          $group: {
            _id: null,
            avgRating: { $avg: '$rating' },
            totalFeedbacks: { $sum: 1 },
            count1: { $sum: { $cond: [{ $eq: ['$rating', 1] }, 1, 0] } },
            count2: { $sum: { $cond: [{ $eq: ['$rating', 2] }, 1, 0] } },
            count3: { $sum: { $cond: [{ $eq: ['$rating', 3] }, 1, 0] } },
            count4: { $sum: { $cond: [{ $eq: ['$rating', 4] }, 1, 0] } },
            count5: { $sum: { $cond: [{ $eq: ['$rating', 5] }, 1, 0] } },
            unresolvedNegative: {
              $sum: {
                $cond: [
                  { $and: [{ $lte: ['$rating', 2] }, { $eq: ['$status', 'PENDING'] }] },
                  1,
                  0,
                ],
              },
            },
          },
        },
      ]),
    ]);

    const statData = stats[0] || {
      avgRating: 5.0,
      totalFeedbacks: 0,
      count1: 0,
      count2: 0,
      count3: 0,
      count4: 0,
      count5: 0,
      unresolvedNegative: 0,
    };

    return {
      feedbacks,
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
      },
      stats: {
        avgRating: Math.round(statData.avgRating * 10) / 10,
        totalFeedbacks: statData.totalFeedbacks,
        ratingBreakdown: {
          1: statData.count1,
          2: statData.count2,
          3: statData.count3,
          4: statData.count4,
          5: statData.count5,
        },
        unresolvedNegative: statData.unresolvedNegative,
      },
    };
  }

  async resolveFeedback(id: string, resolutionData: any): Promise<any> {
    const feedback = await this.feedbackModel.findById(id).exec();
    if (!feedback) {
      throw new RpcException(`Không tìm thấy đánh giá với ID ${id}`);
    }

    feedback.status = 'RESOLVED';
    feedback.resolution = {
      handledBy: resolutionData.handledBy,
      handledByName: resolutionData.handledByName || 'Trưởng chi nhánh',
      actionTaken: resolutionData.actionTaken || 'CALLED_CUSTOMER',
      notes: resolutionData.notes || '',
      resolvedAt: new Date(),
      customerSatisfied: resolutionData.customerSatisfied ?? true,
    };

    return feedback.save();
  }

  async getChainFeedbackSummary(): Promise<any> {
    const summary = await this.feedbackModel.aggregate([
      {
        $group: {
          _id: '$branchId',
          branchName: { $first: '$branchName' },
          avgRating: { $avg: '$rating' },
          totalFeedbacks: { $sum: 1 },
          negativeCount: { $sum: { $cond: [{ $lte: ['$rating', 2] }, 1, 0] } },
          resolvedCount: { $sum: { $cond: [{ $eq: ['$status', 'RESOLVED'] }, 1, 0] } },
        },
      },
      { $sort: { avgRating: -1 } },
    ]);

    return summary.map((s) => ({
      branchId: s._id,
      branchName: s.branchName,
      avgRating: Math.round(s.avgRating * 10) / 10,
      totalFeedbacks: s.totalFeedbacks,
      negativeCount: s.negativeCount,
      resolvedCount: s.resolvedCount,
      resolutionRate:
        s.negativeCount > 0 ? Math.round((s.resolvedCount / s.negativeCount) * 100) : 100,
    }));
  }

  async getFeedbacksByCustomerPhone(customerPhone: string): Promise<any[]> {
    if (!customerPhone) return [];
    return this.feedbackModel
      .find({ customerPhone }, { orderCode: 1, rating: 1, comment: 1, createdAt: 1 })
      .lean()
      .exec();
  }

  // =========================================================================
  // RFM CUSTOMER SEGMENTATION ENGINE
  // =========================================================================

  async calculateRFMSegments() {
    this.logger.log('Bắt đầu tính toán phân cụm khách hàng RFM Thích Ứng (Adaptive Pharmacy RFM)...');
    const ordersCollection = this.connection.collection('orders');
    const vouchersCollection = this.connection.collection('vouchers');

    const oneYearAgo = new Date();
    oneYearAgo.setFullYear(oneYearAgo.getFullYear() - 1);

    // 1. Thu thập danh sách voucher đang hoạt động thực tế trong CSDL
    let availableVouchers: any[] = [];
    try {
      availableVouchers = await vouchersCollection
        .find({
          $or: [{ isActive: true }, { isActive: { $exists: false } }],
        })
        .toArray();
    } catch (vErr) {
      this.logger.warn('Không thể truy vấn bảng vouchers, dùng fallback mặc định:', vErr);
    }
    const voucherCodes = availableVouchers.map((v) => v.code).filter(Boolean);

    const pickVoucher = (preferredKeywords: string[], defaultFallback = 'TUVANPOS') => {
      for (const kw of preferredKeywords) {
        const found = voucherCodes.find((c: string) => c.toUpperCase().includes(kw.toUpperCase()));
        if (found) return found;
      }
      return voucherCodes[0] || defaultFallback;
    };

    // 2. Pipeline hợp nhất cả 2 nguồn đơn: đơn online PayOS (orders) VÀ đơn bán tại quầy POS (salesorders)
    const pipeline = [
      {
        $match: {
          patientPhone: { $exists: true, $ne: '', $nin: ['0', '0900000000', 'GUEST_RETAIL'] },
          paymentStatus: 'PAID',
          createdAt: { $gte: oneYearAgo },
        },
      },
      {
        $project: {
          patientPhone: 1,
          patientName: 1,
          branchId: 1,
          createdAt: 1,
          totalAmount: 1,
          items: 1,
          type: 1,
        },
      },
      {
        $unionWith: {
          coll: 'salesorders',
          pipeline: [
            {
              $match: {
                patientPhone: { $exists: true, $ne: '', $nin: ['0', '0900000000', 'GUEST_RETAIL'] },
                totalAmount: { $gt: 0 },
                createdAt: { $gte: oneYearAgo },
              },
            },
            {
              $project: {
                patientPhone: 1,
                patientName: 1,
                branchId: 1,
                createdAt: 1,
                totalAmount: 1,
                items: 1,
                type: 1,
              },
            },
          ],
        },
      },
      {
        $group: {
          _id: '$patientPhone',
          fullName: { $last: '$patientName' },
          primaryBranchId: { $last: '$branchId' },
          lastOrderDate: { $max: '$createdAt' },
          totalOrders: { $sum: 1 },
          totalSpent: { $sum: '$totalAmount' },
          itemNames: { $push: '$items.name' },
          orderTypes: { $push: '$type' },
        },
      },
    ];

    const aggregated = await ordersCollection.aggregate(pipeline).toArray();
    this.logger.log(`Đã tổng hợp thành công ${aggregated.length} khách hàng có lịch sử mua hàng từ cả Online lẫn Quầy POS.`);

    const now = new Date();
    // Danh mục từ khóa bệnh mãn tính bao quát (tiếng Việt có dấu, không dấu và tên hoạt chất/biệt dược thông dụng)
    const chronicKeywords = [
      'tiểu đường', 'đái tháo đường', 'huyết áp', 'tim mạch', 'mỡ máu', 'lipid', 'gout', 'gút',
      'hen suyễn', 'copd', 'khớp', 'viêm khớp', 'thoái hóa khớp', 'metformin', 'amlodipine',
      'losartan', 'atorvastatin', 'glucophage', 'concor', 'lipitor', 'januvia', 'micardis',
      'plavix', 'crestor', 'rosuvastatin', 'telmisartan', 'gliclazide', 'diamicron',
      'coversyl', 'bisoprolol', 'allopurinol', 'febuxostat'
    ];

    for (const item of aggregated) {
      const phone = item._id;
      const lastDate = new Date(item.lastOrderDate);
      const recencyDays = Math.max(0, Math.floor((now.getTime() - lastDate.getTime()) / (1000 * 60 * 60 * 24)));
      const totalOrders12M = item.totalOrders || 1;
      const totalSpent12M = item.totalSpent || 0;
      const avgOrderValue = Math.round(totalSpent12M / totalOrders12M);

      const flattenedNames = (item.itemNames || []).flat().filter(Boolean).join(' ').toLowerCase();
      const hasPrescription = (item.orderTypes || []).includes('PRESCRIPTION');
      const hasChronicKeywords = chronicKeywords.some((kw) => flattenedNames.includes(kw));
      const isChronic = hasChronicKeywords || (hasPrescription && totalOrders12M >= 2);
      const customerType = isChronic ? 'CHRONIC_PATIENT' : 'GENERAL_RETAIL';

      // 3. Chấm điểm R (Recency) theo đặc thù chu kỳ dùng thuốc ngành Dược
      let rScore = 1;
      if (isChronic) {
        if (recencyDays <= 25) rScore = 5;
        else if (recencyDays <= 35) rScore = 4;
        else if (recencyDays <= 50) rScore = 3;
        else if (recencyDays <= 75) rScore = 2;
        else rScore = 1;
      } else {
        if (recencyDays <= 20) rScore = 5;
        else if (recencyDays <= 45) rScore = 4;
        else if (recencyDays <= 90) rScore = 3;
        else if (recencyDays <= 150) rScore = 2;
        else rScore = 1;
      }

      // 4. Chấm điểm F (Frequency) thực tế trong 12 tháng
      let fScore = 1;
      if (totalOrders12M >= 8) fScore = 5;
      else if (totalOrders12M >= 5) fScore = 4;
      else if (totalOrders12M >= 3) fScore = 3;
      else if (totalOrders12M >= 2) fScore = 2;
      else fScore = 1;

      // 5. Chấm điểm M (Monetary) phân vị ngành Dược bán lẻ
      let mScore = 1;
      if (totalSpent12M >= 3000000) mScore = 5;
      else if (totalSpent12M >= 1500000) mScore = 4;
      else if (totalSpent12M >= 700000) mScore = 3;
      else if (totalSpent12M >= 300000) mScore = 2;
      else mScore = 1;

      const rfmScoreStr = `${rScore}${fScore}${mScore}`;

      let segment = 'POTENTIAL_LOYALIST';
      let recommendedVoucher = pickVoucher(['WELCOME', 'TUVANPOS', '30K'], 'TUVANPOS');
      let predictedRefillDate: Date | undefined = undefined;

      // 6. Phân cụm và liên kết voucher thực tế
      if (rScore >= 4 && fScore >= 4 && mScore >= 4) {
        segment = 'CHAMPIONS';
        recommendedVoucher = pickVoucher(['VIP', 'DIAMOND', '50%', 'SUMMER30', '30K'], 'SUMMER30');
      } else if (isChronic && (rScore >= 3 || fScore >= 3)) {
        segment = 'LOYAL_CHRONIC';
        recommendedVoucher = pickVoucher(['TIMMACH', 'NGUOICAOTUOI', 'CHRONIC', '30K'], 'TIMMACH2026');
        predictedRefillDate = new Date(lastDate.getTime() + 30 * 24 * 60 * 60 * 1000);
      } else if (rScore <= 2 && (fScore >= 2 || mScore >= 3 || isChronic)) {
        segment = 'AT_RISK';
        recommendedVoucher = pickVoucher(['NGUOICAOTUOI', '30K', 'TUVANPOS', 'WINBACK'], 'NGUOICAOTUOI');
        if (isChronic) {
          predictedRefillDate = new Date(lastDate.getTime() + 30 * 24 * 60 * 60 * 1000);
        }
      } else if (rScore === 1 && fScore === 1) {
        segment = 'HIBERNATING';
        recommendedVoucher = pickVoucher(['30K', 'TUVANPOS', 'WELCOME'], 'TUVANPOS');
      } else {
        segment = 'POTENTIAL_LOYALIST';
        recommendedVoucher = pickVoucher(['TUVANPOS', '30K', '1710'], 'TUVANPOS');
      }

      await this.segmentModel.findOneAndUpdate(
        { phone },
        {
          $set: {
            fullName: item.fullName || 'Khách hàng',
            primaryBranchId: item.primaryBranchId || 'BR-001',
            customerType,
            lastOrderDate: lastDate,
            recencyDays,
            totalOrders12M,
            totalSpent12M,
            avgOrderValue,
            rScore,
            fScore,
            mScore,
            rfmScoreStr,
            segment,
            predictedRefillDate,
            recommendedVoucher,
            lastEvaluatedAt: new Date(),
          },
        },
        { upsert: true, new: true }
      );
    }

    this.logger.log('Hoàn thành tính toán phân cụm RFM thích ứng thành công.');
    return { success: true, totalProcessed: aggregated.length };
  }

  async getCustomerSegmentByPhone(phone: string) {
    if (!phone) return null;
    const seg = await this.segmentModel.findOne({ phone }).lean();
    if (seg) return seg;

    return {
      phone,
      fullName: 'Khách hàng mới',
      segment: 'POTENTIAL_LOYALIST',
      customerType: 'GENERAL_RETAIL',
      rScore: 1,
      fScore: 1,
      mScore: 1,
      rfmScoreStr: '111',
      totalOrders12M: 0,
      totalSpent12M: 0,
      recencyDays: 0,
      avgOrderValue: 0,
      recommendedVoucher: 'TUVANPOS',
    };
  }

  async getRFMOverview(branchId?: string) {
    const filter: any = {};
    if (branchId) filter.primaryBranchId = branchId;

    const segments = await this.segmentModel.find(filter).lean();
    const summary: Record<string, { count: number; totalRevenue: number; avgSpent: number }> = {
      CHAMPIONS: { count: 0, totalRevenue: 0, avgSpent: 0 },
      LOYAL_CHRONIC: { count: 0, totalRevenue: 0, avgSpent: 0 },
      POTENTIAL_LOYALIST: { count: 0, totalRevenue: 0, avgSpent: 0 },
      AT_RISK: { count: 0, totalRevenue: 0, avgSpent: 0 },
      HIBERNATING: { count: 0, totalRevenue: 0, avgSpent: 0 },
    };

    segments.forEach((s: any) => {
      const segName = s.segment || 'POTENTIAL_LOYALIST';
      if (!summary[segName]) {
        summary[segName] = { count: 0, totalRevenue: 0, avgSpent: 0 };
      }
      summary[segName].count++;
      summary[segName].totalRevenue += s.totalSpent12M || 0;
    });

    Object.keys(summary).forEach((k) => {
      if (summary[k].count > 0) {
        summary[k].avgSpent = Math.round(summary[k].totalRevenue / summary[k].count);
      }
    });

    return {
      totalCustomers: segments.length,
      segments: summary,
    };
  }

  async getAtRiskCustomers(query?: { branchId?: string; limit?: number }) {
    const filter: any = { segment: 'AT_RISK' };
    if (query?.branchId) filter.primaryBranchId = query.branchId;

    const limit = query?.limit || 50;
    return await this.segmentModel
      .find(filter)
      .sort({ totalSpent12M: -1 })
      .limit(limit)
      .lean();
  }
}

