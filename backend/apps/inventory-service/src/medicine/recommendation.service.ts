import { Injectable, Logger } from '@nestjs/common';
import { InjectModel, InjectConnection } from '@nestjs/mongoose';
import { Model, Connection } from 'mongoose';
import { Medicine } from './schemas/medicine.schema';
import { SearchHistory, SearchHistoryDocument } from './schemas/search-history.schema';

export interface RecommendationResponse {
  rfmSegment?: string;
  chronicReminder?: {
    isDue: boolean;
    daysRemaining: number;
    patientName?: string;
    message: string;
    recommendedVoucher?: string;
    suggestedProducts: any[];
  } | null;
  recentSearches: string[];
  recommendationReason: string;
  recommendationType: 'CROSS_SELL_HEALTH_BOOST' | 'CHRONIC_REFILL' | 'POPULAR_FAMILY_CARE';
  items: any[];
}

@Injectable()
export class RecommendationService {
  private readonly logger = new Logger(RecommendationService.name);

  constructor(
    @InjectModel(Medicine.name) private readonly medicineModel: Model<Medicine>,
    @InjectModel(SearchHistory.name) private readonly searchHistoryModel: Model<SearchHistoryDocument>,
    @InjectConnection() private readonly connection: Connection,
  ) {}

  // =========================================================================
  // 1. LOG TỪ KHÓA TÌM KIẾM CỦA NGƯỜI DÙNG (Search Logging)
  // =========================================================================
  async logSearch(payload: {
    keyword: string;
    category?: string;
    phone?: string;
    userId?: string;
    deviceId?: string;
    resultsCount?: number;
  }) {
    try {
      const trimmed = (payload.keyword || '').trim().toLowerCase();
      if (!trimmed || trimmed.length < 2) return { success: false, reason: 'Keyword too short' };

      // Giới hạn độ dài từ khóa tối đa 100 ký tự
      const safeKeyword = trimmed.slice(0, 100);

      await this.searchHistoryModel.create({
        keyword: safeKeyword,
        category: payload.category || undefined,
        phone: payload.phone || undefined,
        userId: payload.userId || undefined,
        deviceId: payload.deviceId || undefined,
        resultsCount: payload.resultsCount || 0,
      });

      return { success: true };
    } catch (err: any) {
      this.logger.warn(`Failed to log search history: ${err.message}`);
      return { success: false, error: err.message };
    }
  }

  // =========================================================================
  // 2. LẤY TỪ KHÓA TÌM KIẾM GẦN ĐÂY
  // =========================================================================
  async getRecentSearches(filter: { phone?: string; userId?: string; deviceId?: string }) {
    try {
      const orConditions: any[] = [];
      if (filter.phone) orConditions.push({ phone: filter.phone });
      if (filter.userId) orConditions.push({ userId: filter.userId });
      if (filter.deviceId) orConditions.push({ deviceId: filter.deviceId });

      if (orConditions.length === 0) return [];

      const histories = await this.searchHistoryModel
        .find({ $or: orConditions })
        .sort({ createdAt: -1 })
        .limit(20)
        .lean();

      // Loại bỏ các từ khóa trùng lặp, giữ lại thứ tự mới nhất
      const uniqueKeywords = Array.from(new Set(histories.map((h) => h.keyword))).slice(0, 6);
      return uniqueKeywords;
    } catch (err: any) {
      this.logger.error(`Error fetching recent searches: ${err.message}`);
      return [];
    }
  }

  // =========================================================================
  // 3. XÓA LỊCH SỬ TÌM KIẾM (BẢO MẬT QUYỀN RIÊNG TƯ THEO NĐ 13/2023)
  // =========================================================================
  async clearRecentSearches(filter: { phone?: string; userId?: string; deviceId?: string }) {
    try {
      const orConditions: any[] = [];
      if (filter.phone) orConditions.push({ phone: filter.phone });
      if (filter.userId) orConditions.push({ userId: filter.userId });
      if (filter.deviceId) orConditions.push({ deviceId: filter.deviceId });

      if (orConditions.length === 0) return { success: false };

      await this.searchHistoryModel.deleteMany({ $or: orConditions });
      return { success: true };
    } catch (err: any) {
      this.logger.error(`Error clearing search history: ${err.message}`);
      return { success: false, error: err.message };
    }
  }

  // =========================================================================
  // 4. THUẬT TOÁN GỢI Ý CÁ NHÂN HÓA PHARMA-SMART (RFM + SEARCH INTENT)
  // =========================================================================
  async getPersonalizedRecommendations(params: {
    phone?: string;
    userId?: string;
    deviceId?: string;
    branchId?: string;
  }): Promise<RecommendationResponse> {
    try {
      let rfmSegment: string | undefined = undefined;
      let chronicReminder: RecommendationResponse['chronicReminder'] = null;

      // -----------------------------------------------------------------------
      // BƯỚC A: KIỂM TRA PHÂN KHÚC KHÁCH HÀNG RFM (Nhắc nạp thuốc mãn tính)
      // -----------------------------------------------------------------------
      if (params.phone) {
        const segCollection = this.connection.collection('customer_segments');
        const segment = await segCollection.findOne({ phone: params.phone });

        if (segment) {
          rfmSegment = segment.segment;

          // Nếu là bệnh nhân mãn tính hoặc có lịch dự báo tái mua
          if (segment.customerType === 'CHRONIC_PATIENT' || segment.segment === 'LOYAL_CHRONIC' || segment.predictedRefillDate) {
            const now = new Date();
            const refillDate = segment.predictedRefillDate ? new Date(segment.predictedRefillDate) : null;
            let daysRemaining = 0;

            if (refillDate) {
              const diffMs = refillDate.getTime() - now.getTime();
              daysRemaining = Math.ceil(diffMs / (1000 * 60 * 60 * 24));
            }

            // Nếu còn <= 7 ngày hoặc đã quá hạn đến ngày nạp thuốc
            if (daysRemaining <= 7) {
              // Lấy các sản phẩm chăm sóc sức khỏe & hỗ trợ bệnh mãn tính an toàn
              const chronicCareMeds = await this.medicineModel
                .find({
                  drug_classification: { $nin: ['PRESCRIPTION', 'PRESCRIPTION_ANTIBIOTIC', 'PRESCRIPTION_DRUG'] },
                  status: 'ACTIVE',
                  stock: { $gt: 0 },
                  $or: [
                    { category: { $in: ['Bổ xương khớp', 'Dinh dưỡng', 'Thuốc tim mạch, Huyết áp', 'Thuốc tiểu đường', 'Thuốc bảo vệ gan'] } },
                    { name: { $regex: /(canxi|omega|huyết áp|đường huyết|tim mạch|bổ gan|khớp|glucosamine)/i } },
                  ],
                })
                .limit(4)
                .lean();

              chronicReminder = {
                isDue: true,
                daysRemaining: Math.max(0, daysRemaining),
                patientName: segment.fullName || 'Quý khách',
                message: daysRemaining <= 0
                  ? `Đơn thuốc định kỳ của ${segment.fullName || 'Quý khách'} đã đến hạn nạp lại. Hãy liên hệ Dược sĩ để nhận thuốc sớm nhất!`
                  : `Đơn thuốc định kỳ của ${segment.fullName || 'Quý khách'} dự kiến sẽ hết sau ${daysRemaining} ngày nữa. Dược sĩ đã sẵn sàng chuẩn bị đơn cho bạn!`,
                recommendedVoucher: segment.recommendedVoucher || 'VOUCHER_REFILL_FREESHIP',
                suggestedProducts: chronicCareMeds,
              };
            }
          }
        }
      }

      // -----------------------------------------------------------------------
      // BƯỚC B: LẤY LỊCH SỬ TÌM KIẾM 14 NGÀY GẦN NHẤT
      // -----------------------------------------------------------------------
      const recentKeywords = await this.getRecentSearches({
        phone: params.phone,
        userId: params.userId,
        deviceId: params.deviceId,
      });

      // -----------------------------------------------------------------------
      // BƯỚC C: PHÂN TÍCH Ý ĐỊNH LÂM SÀNG & QUY TẮC PHARMA CROSS-SELL
      // -----------------------------------------------------------------------
      let targetCategories: string[] = [];
      let nameKeywordsRegex: RegExp[] = [];
      let recommendationReason = 'Sản phẩm chăm sóc sức khỏe thiết yếu cho gia đình';
      let recommendationType: RecommendationResponse['recommendationType'] = 'POPULAR_FAMILY_CARE';

      if (recentKeywords.length > 0) {
        const combinedQuery = recentKeywords.join(' ').toLowerCase();

        // 1. Nhóm Cảm sốt / Đau đầu / Giảm đau
        if (/(sot|sốt|panadol|paracetamol|hapacol|efferalgan|dau dau|đau đầu|cam cum|cảm cúm)/i.test(combinedQuery)) {
          targetCategories = ['Thuốc bổ, vitamin', 'Thuốc bổ sung vitamin và khoáng chất', 'Dung dịch súc miệng', 'Thuốc bù điện giải'];
          nameKeywordsRegex = [/vitamin\s*c/i, /oresol/i, /xịt\s*mũi/i, /khẩu\s*trang/i, /súc\s*miệng/i];
          recommendationReason = `Dựa trên tìm kiếm gần đây về giảm sốt/cảm cúm: Đề xuất TPCN tăng đề kháng & bù điện giải`;
          recommendationType = 'CROSS_SELL_HEALTH_BOOST';
        }
        // 2. Nhóm Dạ dày / Tiêu hóa / Trào ngược
        else if (/(da day|dạ dày|bao tu|bao tử|trao nguoc|trào ngược|gaviscon|omeprazole|tieu chay|tiêu chảy|day bung|đầy bụng)/i.test(combinedQuery)) {
          targetCategories = ['Probiotic', 'Siro tiêu hoá', 'Thuốc dạ dày, tiêu hóa', 'Dinh dưỡng'];
          nameKeywordsRegex = [/men\s*vi\s*sinh/i, /curcumin/i, /tiêu\s*hóa/i, /trà\s*dây/i, /probiotic/i];
          recommendationReason = `Dựa trên tìm kiếm về dạ dày/tiêu hóa: Đề xuất Men vi sinh & Thảo dược bảo vệ đường ruột`;
          recommendationType = 'CROSS_SELL_HEALTH_BOOST';
        }
        // 3. Nhóm Ho / Viêm họng / Hô hấp
        else if (/(ho|eugica|prospan|viem hong|viêm họng|rat hong|rát họng|phe quan|phế quản)/i.test(combinedQuery)) {
          targetCategories = ['Siro trị ho cảm', 'Thuốc ho', 'Dung dịch súc miệng', 'Thuốc bổ, vitamin'];
          nameKeywordsRegex = [/keo\s*ong/i, /ngậm/i, /siro/i, /prospan/i, /eugica/i, /muối\s*biển/i];
          recommendationReason = `Dựa trên tìm kiếm về hô hấp: Đề xuất Xịt họng keo ong & Viên ngậm thảo dược dịu họng`;
          recommendationType = 'CROSS_SELL_HEALTH_BOOST';
        }
        // 4. Nhóm Mỹ phẩm / Da liễu / Mụn
        else if (/(mun|mụn|da|kem|chong nang|chống nắng|duong am|dưỡng ẩm|sua rua mat|sữa rửa mặt)/i.test(combinedQuery)) {
          targetCategories = ['Mỹ phẩm', 'Mỹ phẩm có chống nắng', 'Thuốc bôi sẹo - liền sẹo', 'Thuốc bôi ngoài da'];
          nameKeywordsRegex = [/rửa\s*mặt/i, /chống\s*nắng/i, /dưỡng\s*ẩm/i, /b5/i, /trị\s*mụn/i];
          recommendationReason = `Dựa trên tìm kiếm về chăm sóc da: Đề xuất Dược mỹ phẩm làm sạch & Bảo vệ phục hồi da`;
          recommendationType = 'CROSS_SELL_HEALTH_BOOST';
        }
        // 5. Nhóm Xương khớp / Đau nhức / Cơ
        else if (/(khop|khớp|dau lung|đau lưng|xuong|xương|glucosamine|gout|gút|moi goi|mỏi gối)/i.test(combinedQuery)) {
          targetCategories = ['Bổ xương khớp', 'Miếng dán giảm đau', 'Dầu nóng xoa bóp', 'Dầu nóng, xoa bóp', 'Cao xoa'];
          nameKeywordsRegex = [/salonpas/i, /canxi/i, /glucosamine/i, /dầu\s*xoa/i, /cao\s*dán/i];
          recommendationReason = `Dựa trên tìm kiếm về cơ xương khớp: Đề xuất Cao dán thảo dược & Dinh dưỡng bổ khớp`;
          recommendationType = 'CROSS_SELL_HEALTH_BOOST';
        }
      }

      // -----------------------------------------------------------------------
      // BƯỚC D: TRUY VẤN CSDL VỚI BỘ LỌC AN TOÀN PHÁP CHẾ DƯỢC (Strict Pharma Filter)
      // -----------------------------------------------------------------------
      // BẮT BUỘC: LOẠI BỎ 100% THUỐC KÊ ĐƠN (Prescription Drugs) KHỎI GỢI Ý
      const safeFilter: any = {
        drug_classification: {
          $nin: ['PRESCRIPTION', 'PRESCRIPTION_ANTIBIOTIC', 'PRESCRIPTION_DRUG'],
        },
        status: 'ACTIVE',
        stock: { $gt: 0 },
      };

      let queryConditions: any[] = [];

      if (targetCategories.length > 0) {
        queryConditions.push({ category: { $in: targetCategories } });
      }
      if (nameKeywordsRegex.length > 0) {
        queryConditions.push({
          $or: nameKeywordsRegex.map((regex) => ({ name: { $regex: regex } })),
        });
      }

      let recommendedItems: any[] = [];

      if (queryConditions.length > 0) {
        recommendedItems = await this.medicineModel
          .find({
            ...safeFilter,
            $or: queryConditions,
          })
          .limit(8)
          .lean();
      }

      // Nếu không tìm đủ hoặc chưa có lịch sử tìm kiếm: Fallback Top sản phẩm thiết yếu
      if (recommendedItems.length < 4) {
        const fallbackItems = await this.medicineModel
          .find({
            ...safeFilter,
            $or: [
              { category: { $in: ['Thuốc bổ, vitamin', 'Miếng dán giảm đau', 'Probiotic', 'Dung dịch súc miệng', 'Dinh dưỡng'] } },
              { name: { $regex: /(vitamin|salonpas|oresol|men vi sinh|nước muối|canxi)/i } },
            ],
          })
          .limit(8)
          .lean();

        // Gộp kết quả loại trừ trùng ID
        const existingIds = new Set(recommendedItems.map((item) => item._id.toString()));
        for (const fb of fallbackItems) {
          if (!existingIds.has(fb._id.toString()) && recommendedItems.length < 8) {
            recommendedItems.push(fb);
            existingIds.add(fb._id.toString());
          }
        }
      }

      return {
        rfmSegment,
        chronicReminder,
        recentSearches: recentKeywords,
        recommendationReason,
        recommendationType,
        items: recommendedItems,
      };
    } catch (err: any) {
      this.logger.error(`Error generating recommendations: ${err.message}`, err.stack);
      return {
        recentSearches: [],
        recommendationReason: 'Sản phẩm chăm sóc sức khỏe gia đình phổ biến',
        recommendationType: 'POPULAR_FAMILY_CARE',
        items: [],
      };
    }
  }
}
