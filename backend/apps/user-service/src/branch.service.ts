import { Injectable, Logger, OnModuleInit } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model, Types } from 'mongoose';
import { RpcException } from '@nestjs/microservices';
import { Branch, BranchDocument } from './schemas/branch.schema';
import { User, UserDocument } from '../../auth-service/src/auth/user.schema';
import { MedicineBatch } from '../../inventory-service/src/medicine/schemas/medicine-batch.schema';

@Injectable()
export class BranchService implements OnModuleInit {
  private readonly logger = new Logger(BranchService.name);

  constructor(
    @InjectModel(Branch.name)
    private readonly branchModel: Model<BranchDocument>,
    @InjectModel(User.name)
    private readonly userModel: Model<UserDocument>,
    @InjectModel(MedicineBatch.name)
    private readonly batchModel: Model<MedicineBatch>,
  ) { }

  async onModuleInit() {
    try {
      // Đảm bảo các chi nhánh đều có tọa độ GPS hợp lệ phục vụ Geofencing check-in
      await this.branchModel.updateMany(
        { $or: [{ latitude: { $exists: false } }, { latitude: null }] },
        { $set: { latitude: 10.7769, longitude: 106.7009, checkInRadiusMeters: 200 } }
      ).exec();
    } catch (err) {
      this.logger.warn('Không thể tự động cập nhật tọa độ GPS cho chi nhánh:', err);
    }
  }

  async findAll(): Promise<any[]> {
    let branches = await this.branchModel.find().sort({ branchCode: 1 }).lean().exec();

    // Tính toán dữ liệu nhân sự & tồn kho thực tế từ DB cho từng chi nhánh
    const enrichedBranches = await Promise.all(
      branches.map(async (branch) => {
        const code = branch.branchCode;

        // 1. Đếm số nhân sự thuộc chi nhánh
        const employeeCount = await this.userModel.countDocuments({
          branchId: code,
          isApproved: { $ne: 'rejected' },
        }).exec();

        // 2. Tính tổng số tồn kho thực tế từ MedicineBatch
        const stockAggregate = await this.batchModel.aggregate([
          { $match: { branchId: code, status: 'ACTIVE', stock: { $gt: 0 } } },
          { $group: { _id: null, total: { $sum: '$stock' } } },
        ]).exec();

        const realTotalStock = stockAggregate.length > 0 ? stockAggregate[0].total : 0;

        // 3. Đếm số lô thuốc hết hạn hoặc sắp hết hạn (< 30 ngày)
        const now = new Date();
        const thirtyDaysLater = new Date();
        thirtyDaysLater.setDate(now.getDate() + 30);

        const expiringCount = await this.batchModel.countDocuments({
          branchId: code,
          status: 'ACTIVE',
          stock: { $gt: 0 },
          expDate: { $lte: thirtyDaysLater },
        }).exec();

        return {
          ...branch,
          stats: {
            employees: employeeCount,
            totalStock: realTotalStock,
            lowStock: branch.stats?.lowStock || 0,
            expiring: expiringCount,
          },
        };
      })
    );

    return enrichedBranches;
  }

  async create(data: any): Promise<Branch> {
    const count = await this.branchModel.countDocuments().exec();
    // Auto-generate code if not provided
    if (!data.branchCode) {
      data.branchCode = `BR-${String(count + 1).padStart(3, '0')}`;
    }
    if (!data.image) {
      data.image = 'https://images.unsplash.com/photo-1586281380349-632531db7ed4?w=500&auto=format&fit=crop&q=60';
    }
    const newBranch = new this.branchModel(data);
    return newBranch.save();
  }

  async findById(id: string): Promise<any> {
    let branch: any = null;
    if (Types.ObjectId.isValid(id)) {
      try {
        branch = await this.branchModel.findById(id).lean().exec();
      } catch {
        // id không phải ObjectId hợp lệ
      }
    }
    if (!branch) {
      branch = await this.branchModel.findOne({ branchCode: id }).lean().exec();
    }
    return branch;
  }

  async update(id: string, data: any): Promise<Branch | null> {
    let updated: Branch | null = null;
    if (Types.ObjectId.isValid(id)) {
      updated = await this.branchModel.findByIdAndUpdate(id, data, { new: true }).exec();
    }
    if (!updated) {
      updated = await this.branchModel.findOneAndUpdate({ branchCode: id }, data, { new: true }).exec();
    }
    return updated;
  }

  /**
   * Cập nhật tọa độ GPS và bán kính Geofencing cho chi nhánh (Quản lý chi nhánh tự quyết định cơ sở mình)
   */
  async updateLocation(
    id: string,
    locationData: {
      latitude: number;
      longitude: number;
      checkInRadiusMeters?: number;
      address?: string;
    },
  ): Promise<Branch> {
    const lat = Number(locationData.latitude);
    const lng = Number(locationData.longitude);

    if (
      locationData.latitude === undefined ||
      locationData.latitude === null ||
      locationData.longitude === undefined ||
      locationData.longitude === null ||
      Number.isNaN(lat) ||
      Number.isNaN(lng) ||
      lat < -90 ||
      lat > 90 ||
      lng < -180 ||
      lng > 180
    ) {
      throw new RpcException('Tọa độ GPS không hợp lệ (Vĩ độ từ -90 đến 90, Kinh độ từ -180 đến 180)');
    }

    const radius =
      locationData.checkInRadiusMeters !== undefined ? Number(locationData.checkInRadiusMeters) : 200;
    if (Number.isNaN(radius) || radius < 20 || radius > 5000) {
      throw new RpcException('Bán kính điểm danh hợp lệ phải từ 20 mét đến 5000 mét');
    }

    const updatePayload: any = {
      latitude: lat,
      longitude: lng,
      checkInRadiusMeters: radius,
    };

    if (locationData.address && typeof locationData.address === 'string' && locationData.address.trim()) {
      updatePayload.address = locationData.address.trim();
    }

    const updated = await this.update(id, updatePayload);
    if (!updated) {
      throw new RpcException(`Không tìm thấy chi nhánh với mã hoặc ID: ${id}`);
    }

    this.logger.log(
      `Đã cập nhật vị trí GPS chi nhánh ${id}: Lat ${lat}, Lng ${lng}, Bán kính ${radius}m`
    );
    return updated;
  }

  async delete(id: string): Promise<any> {
    return this.branchModel.findByIdAndDelete(id).exec();
  }

  async handleLowStockAlert(data: { branchId: string; medicineId: string; medicineName: string; currentStock: number; minStock: number; timestamp: string }) {
    this.logger.warn(`Received low stock alert for branch ${data.branchId}: ${data.medicineName} (${data.currentStock} < ${data.minStock})`);

    const branch = await this.branchModel.findById(data.branchId).exec();
    if (!branch) return;

    const newAlert = {
      id: Date.now(),
      type: 'low_stock',
      item: data.medicineName,
      current: data.currentStock,
      min: data.minStock,
      time: 'Vừa xong (Từ quầy)',
    };

    branch.alerts = branch.alerts || [];
    // Thêm alert mới vào đầu danh sách
    branch.alerts.unshift(newAlert as any);

    // Cập nhật stats.lowStock
    branch.stats = branch.stats || { employees: 0, totalStock: 0, lowStock: 0, expiring: 0 };
    branch.stats.lowStock += 1;

    // Giữ lại tối đa 50 alerts
    if (branch.alerts.length > 50) {
      branch.alerts = branch.alerts.slice(0, 50);
    }

    await branch.save();
  }
}
