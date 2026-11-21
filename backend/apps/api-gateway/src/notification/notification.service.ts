import { Injectable, Logger } from "@nestjs/common";
import { InjectModel } from "@nestjs/mongoose";
import { Model } from "mongoose";
import { Notification } from "./notification.schema";

@Injectable()
export class NotificationService {
  private readonly logger = new Logger(NotificationService.name);

  constructor(
    @InjectModel(Notification.name)
    private readonly notificationModel: Model<Notification>,
  ) {}

  /**
   * Lưu notification vào DB (gọi song song với WebSocket emit)
   * Một notification có thể target nhiều rooms -> tạo nhiều records
   */
  async create(data: {
    type: string;
    targetRooms: string[];
    message: string;
    prId?: string;
    prCode?: string;
    poId?: string;
    grnId?: string;
    dispatchOrderId?: string;
    dispatchCode?: string;
    transferId?: string;
    transferCode?: string;
    branchId?: string;
    branchName?: string;
    itemsCount?: number;
    totalAmount?: number;
    supplierName?: string;
    rejectionReason?: string;
    approvedBy?: string;
    receivedBy?: string;
    createdBy?: string;
  }): Promise<Notification[]> {
    const { targetRooms, ...rest } = data;
    const docs = targetRooms.map((room) => ({ ...rest, targetRoom: room }));

    const created = await this.notificationModel.insertMany(docs);
    this.logger.log(
      `Saved ${created.length} notification(s) to DB [${data.type}] -> rooms: ${targetRooms.join(", ")}`,
    );
    return created as Notification[];
  }

  /**
   * Xác định rooms mà user thuộc về dựa trên role + branchId + cờ Dược sĩ PIC
   */
  private getUserRooms(role: string, branchId?: string, isBranchPIC?: boolean): string[] {
    const rooms: string[] = [];

    if (role === "admin" || role === "head_branch" || role === "director") {
      rooms.push("admin");
    }
    if (role === "warehouse") {
      rooms.push("warehouse");
    }
    if (role === "pharmacist" && isBranchPIC) {
      rooms.push("pic");
    }
    if ((role === "branch" || role === "pharmacist") && branchId) {
      rooms.push(`branch-${branchId}`);
    }

    return rooms;
  }

  /**
   * Lấy notifications cho user (dựa trên rooms user thuộc về)
   */
  async findForUser(
    userId: string,
    role: string,
    branchId?: string,
    options?: { unreadOnly?: boolean; limit?: number; offset?: number; isBranchPIC?: boolean },
  ) {
    const rooms = this.getUserRooms(role, branchId, options?.isBranchPIC);
    if (rooms.length === 0) return [];

    const query: any = { targetRoom: { $in: rooms } };

    if (options?.unreadOnly) {
      query.readBy = { $nin: [userId] };
    }

    return this.notificationModel
      .find(query)
      .sort({ createdAt: -1 })
      .skip(options?.offset || 0)
      .limit(options?.limit || 50)
      .lean()
      .exec();
  }

  /**
   * Lấy notifications mới (polling - sau timestamp)
   */
  async findNewSince(
    userId: string,
    role: string,
    branchId: string | undefined,
    afterTimestamp: Date,
    isBranchPIC?: boolean,
  ) {
    const rooms = this.getUserRooms(role, branchId, isBranchPIC);
    if (rooms.length === 0) return [];

    return this.notificationModel
      .find({
        targetRoom: { $in: rooms },
        createdAt: { $gt: afterTimestamp },
      })
      .sort({ createdAt: -1 })
      .lean()
      .exec();
  }

  /**
   * Đánh dấu đã đọc (thêm userId vào readBy array)
   */
  async markAsRead(notificationId: string, userId: string) {
    return this.notificationModel
      .findByIdAndUpdate(
        notificationId,
        { $addToSet: { readBy: userId } },
        { new: true },
      )
      .lean()
      .exec();
  }

  /**
   * Đánh dấu tất cả đã đọc cho user
   */
  async markAllAsRead(userId: string, role: string, branchId?: string, isBranchPIC?: boolean) {
    const rooms = this.getUserRooms(role, branchId, isBranchPIC);
    if (rooms.length === 0) return;

    return this.notificationModel
      .updateMany(
        { targetRoom: { $in: rooms }, readBy: { $nin: [userId] } },
        { $addToSet: { readBy: userId } },
      )
      .exec();
  }

  /**
   * Xoá notification
   */
  async delete(notificationId: string) {
    return this.notificationModel.findByIdAndDelete(notificationId).exec();
  }

  /**
   * Đếm notifications chưa đọc cho user
   */
  async getUnreadCount(
    userId: string,
    role: string,
    branchId?: string,
    isBranchPIC?: boolean,
  ): Promise<number> {
    const rooms = this.getUserRooms(role, branchId, isBranchPIC);
    if (rooms.length === 0) return 0;

    return this.notificationModel
      .countDocuments({
        targetRoom: { $in: rooms },
        readBy: { $nin: [userId] },
      })
      .exec();
  }
}
