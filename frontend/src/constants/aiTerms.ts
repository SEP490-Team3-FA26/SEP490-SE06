// frontend/src/constants/aiTerms.ts
/**
 * =========================================================================
 * NỘI QUY SỬ DỤNG TRỢ LÝ DƯỢC SĨ AI (DỄ HIỂU - KHÔNG TỪ VIẾT TẮT)
 * Ngôn ngữ đời thường, gần gũi, bôi đen các mục quan trọng
 * Tuyệt đối không dùng từ viết tắt chuyên ngành (OTC, ETC, GPP, ADR, PII...)
 * Chú thích mã nguồn: Tiếng Việt 100%
 * =========================================================================
 */

// Mã phiên bản quy chuẩn thống nhất do máy chủ (API Gateway) cấp
export const AI_TERMS_VERSION = "v1.0-OTC";
export const STORAGE_KEY_AI_TERMS_ACCEPTED = "abc_ai_terms_accepted_v1";
export const STORAGE_KEY_AI_TERMS_TIMESTAMP = "abc_ai_terms_accepted_at";
export const STORAGE_KEY_AI_TERMS_AUDIT = "abc_ai_terms_audit_log";

export interface SimpleTermRule {
  id: string;
  order: number;
  title: string;
  badge: string;
  highlightText: string;
  description: string;
  bulletPoints: string[];
}

export const SIMPLE_AI_TERMS_RULES: SimpleTermRule[] = [
  {
    id: "rule-1-scope",
    order: 1,
    title: "Chỉ tư vấn thuốc thông thường",
    badge: "Thuốc thông thường",
    highlightText: "AI không thay thế bác sĩ khám bệnh.",
    description: "Trợ lý AI chỉ giúp gợi ý các loại thuốc thông thường không cần đơn bác sĩ (như cảm cúm nhẹ, nhức đầu, ho khan, sổ mũi) và vitamin, thực phẩm bồi bổ sức khỏe.",
    bulletPoints: [
      "AI **không chẩn đoán bệnh** và **không kê đơn điều trị bệnh nặng**.",
      "Mọi thông tin chỉ mang tính chất hướng dẫn chăm sóc sức khỏe ban đầu.",
    ],
  },
  {
    id: "rule-2-emergency",
    order: 2,
    title: "Không dùng cho trường hợp cấp cứu",
    badge: "Khẩn cấp gọi 115",
    highlightText: "Gặp nguy hiểm hãy gọi 115 hoặc đi bệnh viện ngay.",
    description: "Tuyệt đối không dùng trợ lý AI khi bạn hoặc người thân có các dấu hiệu nguy kịch như: khó thở, đau tức ngực dữ dội, ngất xỉu, co giật, sốt quá cao liên tục không hạ, chảy máu nhiều hoặc tai nạn.",
    bulletPoints: [
      "Hãy gọi ngay cấp cứu **115** hoặc đến **cơ sở y tế gần nhất** để được bác sĩ cấp cứu kịp thời.",
    ],
  },
  {
    id: "rule-3-no-prescription-online",
    order: 3,
    title: "Không bán thuốc cần đơn bác sĩ trên mạng",
    badge: "Nhận tại quầy thuốc",
    highlightText: "Thuốc cần đơn bác sĩ chỉ được nhận trực tiếp tại nhà thuốc.",
    description: "Theo quy định an toàn y tế, các loại thuốc bắt buộc có đơn của bác sĩ (như thuốc kháng sinh, thuốc đặc trị) tuyệt đối không được bán giao hàng qua mạng.",
    bulletPoints: [
      "Bạn có thể gửi ảnh chụp đơn thuốc để Dược sĩ chuẩn bị trước.",
      "Bạn bắt buộc phải mang **đơn thuốc gốc đến nhà thuốc** để Dược sĩ đối chiếu và giao thuốc.",
    ],
  },
  {
    id: "rule-4-honest-profile",
    order: 4,
    title: "Khai báo đúng thông tin sức khỏe",
    badge: "Khai báo trung thực",
    highlightText: "Nói rõ tiền sử dị ứng và bệnh đang có để tránh uống nhầm thuốc.",
    description: "Bạn cần cung cấp đúng và đầy đủ: triệu chứng đang bị, dị ứng thuốc nào, đang mắc bệnh gì (như huyết áp, tim mạch, tiểu đường, dạ dày), thuốc đang uống và có đang mang thai hay cho con bú không.",
    bulletPoints: [
      "Khai báo sai hoặc giấu bệnh có thể dẫn đến việc uống nhầm thuốc gây **nguy hiểm trực tiếp cho tính mạng**.",
    ],
  },
  {
    id: "rule-5-personal-use",
    order: 5,
    title: "Chỉ dùng cho chính bản thân bạn",
    badge: "Không dùng cho người khác",
    highlightText: "Không chia sẻ đơn gợi ý cho người thân hoặc bạn bè.",
    description: "Lời khuyên và thuốc được gợi ý chỉ tính toán phù hợp cho riêng thể trạng của bạn tại thời điểm nhắn tin.",
    bulletPoints: [
      "Tuyệt đối **không đưa đơn này cho người khác uống theo**.",
      "Không tự ý dùng lại hướng dẫn cũ khi bị ốm lại ở lần sau.",
    ],
  },
  {
    id: "rule-6-pharmacist-check",
    order: 6,
    title: "Luôn có Dược sĩ thật kiểm tra lại",
    badge: "Dược sĩ thật kiểm duyệt",
    highlightText: "Mọi loại thuốc đều phải được Dược sĩ có bằng cấp duyệt qua.",
    description: "Trợ lý AI chỉ đóng vai trò ghi nhận và soạn trước danh sách thuốc gợi ý.",
    bulletPoints: [
      "Bắt buộc phải có **Dược sĩ thật kiểm tra liều lượng và độ an toàn** thì đơn thuốc mới được xác nhận.",
      "Nếu phát hiện có rủi ro uống nhầm thuốc, hệ thống sẽ **chặn ngay** và khuyên bạn đi khám bác sĩ.",
    ],
  },
  {
    id: "rule-7-privacy",
    order: 7,
    title: "Giữ kín thông tin cá nhân của bạn",
    badge: "Bảo mật an toàn",
    highlightText: "Thông tin sức khỏe được giữ kín tuyệt đối.",
    description: "Thông tin bạn trao đổi chỉ dùng để tư vấn chọn thuốc an toàn và phục vụ chăm sóc sức khỏe.",
    bulletPoints: [
      "Hệ thống tự động che tên, số điện thoại và email trong tin nhắn văn bản; ảnh chụp chỉ dùng để nhận diện thuốc nên bạn **không chụp kèm thông tin cá nhân riêng tư**.",
      "Thông tin dị ứng và bệnh nền **mặc định tắt đính kèm**, chỉ gửi khi bạn chủ động bật trên khung chat.",
      "Nhà thuốc cam kết **không bán hay chia sẻ thông tin của bạn** cho bất kỳ ai.",
    ],
  },
  {
    id: "rule-8-adr-hotline",
    order: 8,
    title: "Dừng uống thuốc ngay nếu thấy bất thường",
    badge: "Tổng đài 1800 6868",
    highlightText: "Ngừng thuốc ngay nếu bị ngứa, nổi mẩn, khó thở sau khi uống.",
    description: "Nếu có bất kỳ dấu hiệu lạ nào sau khi dùng thuốc, hãy dừng uống ngay và liên hệ nhân viên y tế.",
    bulletPoints: [
      "Gọi ngay tổng đài Dược sĩ miễn phí: **1800 6868** (từ 07:00 đến 22:00 hàng ngày).",
      "Nếu thấy khó thở hoặc mệt nhiều, hãy đến ngay trạm y tế hoặc bệnh viện gần bạn nhất.",
    ],
  },
];
