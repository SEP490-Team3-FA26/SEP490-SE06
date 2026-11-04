// frontend/src/constants/aiTerms.ts
/**
 * =========================================================================
 * NỘI QUY & ĐIỀU KHOẢN SỬ DỤNG TRỢ LÝ DƯỢC SĨ AI (ABC PHARMACY)
 * Căn cứ theo:
 * - Tài liệu nghiệp vụ: "Chức năng AI tư vấn thuốc không kê đơn" (v1.0)
 * - Luật Dược số 105/2016/QH13 và các Nghị định hướng dẫn GPP/GDP
 * - Nguyên tắc minh bạch y tế và Dự thảo Luật Trí tuệ Nhân tạo 2025
 * =========================================================================
 */

export const AI_TERMS_VERSION = "v1.0-OTC";
export const AI_TERMS_RELEASE_DATE = "01/11/2026";
export const STORAGE_KEY_AI_TERMS_ACCEPTED = "abc_ai_terms_accepted_v1";
export const STORAGE_KEY_AI_TERMS_TIMESTAMP = "abc_ai_terms_accepted_at";
export const STORAGE_KEY_AI_TERMS_AUDIT = "abc_ai_terms_audit_log";

export interface AITermsArticle {
  id: string;
  order: number;
  title: string;
  badge?: string;
  summary: string;
  details: string[];
  isCrucial?: boolean;
}

export const AI_TERMS_ARTICLES: AITermsArticle[] = [
  {
    id: "scope-otc",
    order: 1,
    title: "Điều 1: Mục tiêu & Phạm vi Tư vấn Sức khỏe",
    badge: "Phạm vi OTC",
    summary: "Dịch vụ tư vấn thuốc không kê đơn (OTC) và thực phẩm chức năng (TPCN) hỗ trợ triệu chứng nhẹ.",
    details: [
      "Trợ lý Dược sĩ AI của ABC Pharmacy được thiết kế nhằm hỗ trợ người dùng phân tích và sàng lọc các triệu chứng nhẹ thường gặp (cảm cúm, ho khan, nhức đầu nhẹ, dị ứng thời tiết, đầy hơi khó tiêu...).",
      "AI chỉ đề xuất các sản phẩm thuốc không kê đơn (OTC) và thực phẩm chức năng (TPCN) đã nằm trong danh mục kiểm soát và được Hội đồng Dược phê duyệt.",
      "TUYỆT ĐỐI KHÔNG: Dịch vụ này không phải là hoạt động khám bệnh, chữa bệnh, chẩn đoán hay kê đơn thuốc theo quy định của pháp luật y tế.",
    ],
    isCrucial: true,
  },
  {
    id: "emergency-warning",
    order: 2,
    title: "Điều 2: Chống Chỉ Định & Tình Huống Y Tế Khẩn Cấp",
    badge: "Cấp cứu 115",
    summary: "Nghiêm cấm sử dụng trong các trường hợp cấp cứu hoặc triệu chứng nguy hiểm.",
    details: [
      "Người dùng tuyệt đối KHÔNG sử dụng Trợ lý AI khi xuất hiện các triệu chứng nguy kịch hoặc cấp tính: Khó thở nghiêm trọng, đau thắt ngực lan ra cánh tay, co giật, mất ý thức, xuất huyết không cầm được, nôn ra máu, sốt cao liên tục không đáp ứng thuốc hạ sốt, hoặc chấn thương nặng.",
      "Trong mọi tình huống khẩn cấp, người bệnh hoặc người nhà cần lập tức liên hệ Cấp cứu 115 hoặc di chuyển ngay đến cơ sở khám chữa bệnh/bệnh viện gần nhất để được can thiệp y tế kịp thời.",
    ],
    isCrucial: true,
  },
  {
    id: "prescription-etc",
    order: 3,
    title: "Điều 3: Quy Định Nghiêm Ngặt Về Thuốc Kê Đơn (ETC)",
    badge: "Không bán ETC online",
    summary: "Thuốc kê đơn không được tư vấn gợi ý hay giao dịch trực tuyến.",
    details: [
      "Theo quy định hiện hành của Bộ Y tế, thuốc kê đơn (ETC) không được phép tư vấn tự do và không được giao dịch/bán lẻ qua kênh thương mại điện tử.",
      "Hệ thống chỉ hỗ trợ công cụ tải ảnh đơn thuốc của Bác sĩ điều trị để Dược sĩ kiểm tra tính hợp lệ và hỗ trợ khách hàng đặt giữ hàng nhận tại quầy (Click & Collect).",
      "Khách hàng bắt buộc phải xuất trình đơn thuốc bản gốc còn hiệu lực tại quầy thuốc của ABC Pharmacy khi làm thủ tục nhận thuốc.",
    ],
    isCrucial: true,
  },
  {
    id: "user-responsibility",
    order: 4,
    title: "Điều 4: Trách Nhiệm Khai Báo Trung Thực Của Người Dùng",
    badge: "Nghĩa vụ khách hàng",
    summary: "Khách hàng chịu trách nhiệm về tính chính xác của thông tin sức khỏe khai báo.",
    details: [
      "Khách hàng có trách nhiệm cung cấp thông tin trung thực, chính xác và đầy đủ nhất về: Triệu chứng hiện tại, tiền sử dị ứng thuốc/tá dược, các bệnh nền mãn tính (tim mạch, huyết áp, tiểu đường, hen suyễn, viêm loét dạ dày), thuốc đang sử dụng, và tình trạng thai kỳ hoặc nuôi con bằng sữa mẹ.",
      "Khách hàng chịu hoàn toàn trách nhiệm pháp lý và sức khỏe nếu cố tình cung cấp sai lệch, gian dối hoặc che giấu thông tin y tế của bản thân.",
    ],
    isCrucial: false,
  },
  {
    id: "personalization",
    order: 5,
    title: "Điều 5: Nguyên Tắc Cá Nhân Hóa & Nghiêm Cấm Dùng Cho Người Khác",
    badge: "Chỉ định cá nhân",
    summary: "Gợi ý chỉ dành riêng cho người được tư vấn tại thời điểm diễn ra đối thoại.",
    details: [
      "Mọi phân tích, cảnh báo và danh mục thuốc gợi ý chỉ có giá trị đối với cá nhân người dùng tại phiên đối thoại đó, dựa trên thể trạng và triệu chứng đã khai báo.",
      "Nghiêm cấm sao chép, chia sẻ, chuyển giao hoặc áp dụng đơn thuốc/phiếu gợi ý này cho người thân, bạn bè hoặc người khác dưới mọi hình thức.",
      "Không tự ý sử dụng lại nội dung tư vấn cũ cho những đợt bệnh tái phát về sau khi chưa có ý kiến của nhân viên y tế.",
    ],
    isCrucial: false,
  },
  {
    id: "pharmacist-supervision",
    order: 6,
    title: "Điều 6: Vai Trò Dược Sĩ & Cơ Chế Kiểm Duyệt Chuyên Môn",
    badge: "Dược sĩ giám sát",
    summary: "Dược sĩ có Chứng chỉ hành nghề duyệt chuyên môn tối cao; AI chỉ là trợ lý soạn thảo.",
    details: [
      "Trợ lý AI chỉ đóng vai trò hỗ trợ sàng lọc thông tin ban đầu và soạn thảo nháp Phiếu đề xuất thuốc OTC.",
      "Mọi phiếu đề xuất thuốc chỉ trở thành đơn hàng hợp lệ sau khi được Dược sĩ chuyên môn có Chứng chỉ hành nghề (CCHN) kiểm duyệt, xác nhận liều dùng và cách phối hợp thuốc an toàn.",
      "Hệ thống vận hành theo nguyên tắc 'Fail-closed': Khi có sự mâu thuẫn về dược lý, thiếu dữ liệu an toàn hoặc phát hiện nguy cơ tương tác thuốc, hệ thống sẽ tự động chặn và chuyển tiếp cho Dược sĩ hoặc khuyên khách đi khám.",
    ],
    isCrucial: true,
  },
  {
    id: "data-privacy",
    order: 7,
    title: "Điều 7: Bảo Mật Thông Tin & Giảm Thiểu Dữ Liệu Y Tế (Data Minimization)",
    badge: "Bảo mật y tế",
    summary: "Thông tin cá nhân được bảo vệ nghiêm ngặt và ẩn danh hóa khi xử lý qua AI.",
    details: [
      "Dữ liệu sức khỏe chỉ được thu thập và sử dụng phục vụ mục đích tư vấn y tế và lưu trữ hồ sơ theo quy định quản lý ngành dược.",
      "Khi gửi dữ liệu triệu chứng sang hệ thống mô hình ngôn ngữ AI, mọi thông tin định danh cá nhân trực tiếp (họ tên, số điện thoại, địa chỉ cụ thể) đều được loại bỏ hoặc mã hóa bảo mật.",
      "Hệ thống không chia sẻ, mua bán dữ liệu sức khỏe của người dùng cho bất kỳ bên thứ ba nào ngoài phạm vi đã được đồng ý.",
    ],
    isCrucial: false,
  },
  {
    id: "adr-reporting",
    order: 8,
    title: "Điều 8: Phản Ứng Bất Thường & Kênh Liên Hệ Hỗ Trợ Khẩn",
    badge: "Đường dây nóng",
    summary: "Hướng dẫn xử trí tác dụng không mong muốn (ADR) và tiếp nhận khiếu nại.",
    details: [
      "Nếu người dùng xuất hiện bất kỳ dấu hiệu bất thường, mẩn ngứa, phát ban, buồn nôn, khó thở sau khi sử dụng sản phẩm, phải NGƯNG DÙNG THUỐC NGAY LẬP TỨC và đến cơ sở y tế gần nhất.",
      "Tổng đài Dược sĩ chuyên môn ABC Pharmacy trực tuyến: 1800 6868 (Miễn phí cước, phục vụ từ 07:00 - 22:00 hàng ngày).",
      "Khách hàng có quyền khiếu nại hoặc yêu cầu giải thích về các tư vấn chuyên môn thông qua đường dây nóng hoặc trực tiếp tại chi nhánh gần nhất.",
    ],
    isCrucial: false,
  },
];

