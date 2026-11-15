import { Injectable, Logger, Inject, Optional } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model, Types } from 'mongoose';
import { ClientKafka, RpcException } from '@nestjs/microservices';
import { lastValueFrom } from 'rxjs';
import { timeout } from 'rxjs/operators';
import { Branch, BranchDocument } from './schemas/branch.schema';
import { User, UserDocument } from '../../auth-service/src/auth/user.schema';
import { MedicineBatch } from '../../inventory-service/src/medicine/schemas/medicine-batch.schema';

@Injectable()
export class BranchService {
  private readonly logger = new Logger(BranchService.name);

  constructor(
    @InjectModel(Branch.name)
    private readonly branchModel: Model<BranchDocument>,
    @InjectModel(User.name)
    private readonly userModel: Model<UserDocument>,
    @Optional()
    @InjectModel(MedicineBatch.name)
    private readonly batchModel?: Model<MedicineBatch>,
    @Optional()
    @Inject('INVENTORY_SERVICE')
    private readonly inventoryClient?: ClientKafka,
  ) { }

  async findAll(): Promise<any[]> {
    const branches = await this.branchModel.find().sort({ branchCode: 1 }).lean().exec();
    if (!branches || branches.length === 0) return [];

    const branchCodes = branches.map((b) => b.branchCode).filter(Boolean);

    // 1. Đếm số lượng nhân sự thuộc từng chi nhánh trong 1 câu lệnh aggregate duy nhất
    const employeeCountMap = new Map<string, number>();
    try {
      const employeeCounts = await this.userModel.aggregate([
        {
          $match: {
            branchId: { $in: branchCodes },
            isApproved: { $ne: 'rejected' },
          },
        },
        {
          $group: {
            _id: '$branchId',
            count: { $sum: 1 },
          },
        },
      ]).exec();
      for (const ec of employeeCounts) {
        employeeCountMap.set(ec._id, ec.count);
      }
    } catch (err: any) {
      this.logger.warn(`[BranchService] Lỗi thống kê nhân sự chi nhánh: ${err.message}`);
    }

    // 2. Lấy thống kê tồn kho thực tế và lô sắp hết hạn qua Batch Kafka RPC (1 message duy nhất)
    let statsMap: Record<string, { totalStock: number; expiringCount: number }> = {};
    if (this.inventoryClient && branchCodes.length > 0) {
      try {
        const statsRes: any = await lastValueFrom(
          this.inventoryClient.send('inventory.batch.stats_by_branch', { branchCodes }).pipe(
            timeout(3000)
          )
        );
        if (statsRes && typeof statsRes === 'object') {
          // Hỗ trợ cả map { [branchCode]: { totalStock, expiringCount } } lẫn fallback { totalStock, expiringCount }
          if (branchCodes.length === 1 && 'totalStock' in statsRes && !statsRes[branchCodes[0]]) {
            statsMap[branchCodes[0]] = {
              totalStock: statsRes.totalStock || 0,
              expiringCount: statsRes.expiringCount || 0,
            };
          } else {
            statsMap = statsRes;
          }
        }
      } catch (kafkaErr: any) {
        this.logger.warn(`[BranchService] Kafka Batch RPC inventory.batch.stats_by_branch lỗi: ${kafkaErr.message}`);
      }
    }

    // 3. Fallback: Nếu không nhận được dữ liệu từ Kafka và có batchModel cục bộ
    const localBatchStats = new Map<string, { totalStock: number; expiringCount: number }>();
    const missingCodes = branchCodes.filter((code) => !statsMap[code] || (statsMap[code].totalStock === 0 && statsMap[code].expiringCount === 0));
    if (this.batchModel && missingCodes.length > 0) {
      try {
        const thirtyDaysLater = new Date();
        thirtyDaysLater.setDate(thirtyDaysLater.getDate() + 30);
        const stockAggregate = await this.batchModel.aggregate([
          { $match: { branchId: { $in: missingCodes }, status: 'ACTIVE', stock: { $gt: 0 } } },
          {
            $group: {
              _id: '$branchId',
              totalStock: { $sum: '$stock' },
              expiringCount: {
                $sum: { $cond: [{ $lte: ['$expDate', thirtyDaysLater] }, 1, 0] },
              },
            },
          },
        ]).exec();
        for (const item of stockAggregate) {
          localBatchStats.set(item._id, { totalStock: item.totalStock || 0, expiringCount: item.expiringCount || 0 });
        }
      } catch (dbErr) {
        // Bỏ qua lỗi fallback DB
      }
    }

    return branches.map((branch) => {
      const code = branch.branchCode;
      const employeeCount = employeeCountMap.get(code) || 0;
      const stats = statsMap[code] || localBatchStats.get(code) || { totalStock: 0, expiringCount: 0 };

      return {
        ...branch,
        stats: {
          employees: employeeCount,
          totalStock: stats.totalStock || 0,
          lowStock: branch.stats?.lowStock || 0,
          expiring: stats.expiringCount || 0,
        },
      };
    });
  }

  async create(data: any): Promise<Branch> {
    const count = await this.branchModel.countDocuments().exec();
    // Tự động sinh mã chi nhánh an toàn, chống va chạm mã khi tạo đồng thời hoặc sau khi xóa chi nhánh
    if (!data.branchCode) {
      let nextIndex = count + 1;
      let candidate = `BR-${String(nextIndex).padStart(3, '0')}`;
      while (await this.branchModel.findOne({ branchCode: candidate }).exec()) {
        nextIndex++;
        candidate = `BR-${String(nextIndex).padStart(3, '0')}`;
      }
      data.branchCode = candidate;
    }
    if (!data.status) {
      data.status = 'preparing';
    }
    if (!data.image) {
      data.image = 'https://images.unsplash.com/photo-1586281380349-632531db7ed4?w=500&auto=format&fit=crop&q=60';
    }
    const newBranch = new this.branchModel(data);
    return newBranch.save();
  }

  async activateBranch(idOrCode: string, activatedBy?: string): Promise<any> {
    const branch = await this.findById(idOrCode);
    if (!branch) {
      throw new RpcException(`Chi nhánh ${idOrCode} không tồn tại`);
    }
    if (branch.status === 'active') {
      return { success: true, message: 'Chi nhánh đã hoạt động', data: branch };
    }
    if (!branch.manager) {
      throw new RpcException('Chi nhánh chưa được phân công Quản lý');
    }
    if (!branch.gppNumber) {
      throw new RpcException('Chi nhánh chưa có thông tin Giấy chứng nhận đạt chuẩn GPP hợp lệ');
    }
    if (branch.gppExpiryDate && new Date(branch.gppExpiryDate).getTime() < Date.now()) {
      throw new RpcException('Giấy chứng nhận GPP của chi nhánh đã hết hiệu lực');
    }
    const updated = await this.branchModel.findByIdAndUpdate(
      branch._id,
      {
        $set: {
          status: 'active',
          activatedAt: new Date(),
          activatedBy: activatedBy || 'Admin',
        },
      },
      { new: true }
    ).lean().exec();
    return { success: true, message: `Đã kích hoạt thành công chi nhánh ${branch.branchCode}`, data: updated };
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
