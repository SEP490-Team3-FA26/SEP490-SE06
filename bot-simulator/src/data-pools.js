// Kho dữ liệu mẫu y tế thực tế phục vụ Digital Twin ABC Pharmacy

const CUSTOMER_NAMES = [
  'Nguyễn Văn An', 'Trần Thị Bích', 'Lê Hoàng Nam', 'Phạm Thu Hà', 'Hoàng Minh Tuấn',
  'Vũ Thị Mai', 'Đặng Quốc Khánh', 'Bùi Thanh Hằng', 'Đỗ Văn Hùng', 'Ngô Bảo Châu',
  'Dương Tuấn Kiệt', 'Lý Mỹ Kỳ', 'Hồ Quang Hiếu', 'Trương Ngọc Ánh', 'Phan Mạnh Quỳnh',
  'Võ Quốc Cường', 'Trịnh Kim Ngân', 'Đinh Trọng Nghĩa', 'Lưu Đức Hải', 'Tạ Đình Phong',
  'Nguyễn Thanh Thảo', 'Phạm Gia Huy', 'Bùi Như Quỳnh', 'Trần Đức Thắng', 'Đoàn Minh Quân',
  'Mai Phương Thúy', 'Nguyễn Quốc Đạt', 'Hà Thảo My', 'Lê Công Vinh', 'Phạm Minh Đức'
];

// Danh sách địa chỉ giao hàng COD đầy đủ 4 cấp hành chính thực tế
const COD_DELIVERY_ADDRESSES = [
  '142/8 Nguyễn Trãi, Phường Bến Thành, Quận 1, TP. Hồ Chí Minh',
  '88 Hai Bà Trưng, Phường Bến Nghé, Quận 1, TP. Hồ Chí Minh',
  '215 Trần Hưng Đạo, Phường Cô Giang, Quận 1, TP. Hồ Chí Minh',
  '34 Võ Thị Sáu, Phường Võ Thị Sáu, Quận 3, TP. Hồ Chí Minh',
  '120/4 Cách Mạng Tháng 8, Phường 10, Quận 3, TP. Hồ Chí Minh',
  '456 Lê Văn Sỹ, Phường 14, Quận 3, TP. Hồ Chí Minh',
  '78 Nguyễn Tri Phương, Phường 7, Quận 5, TP. Hồ Chí Minh',
  '102 An Dương Vương, Phường 9, Quận 5, TP. Hồ Chí Minh',
  '55 Nguyễn Thị Thập, Phường Tân Phú, Quận 7, TP. Hồ Chí Minh',
  '310 Huỳnh Tấn Phát, Phường Tân Thuận Tây, Quận 7, TP. Hồ Chí Minh',
  '182 Hoàng Hoa Thám, Phường 12, Quận Tân Bình, TP. Hồ Chí Minh',
  '29 Lê Lợi, Phường Thạch Thang, Quận Hải Châu, TP. Đà Nẵng',
  '248/12 Lê Duẩn, Phường Tân Chính, Quận Thanh Khê, TP. Đà Nẵng',
  '79 Nguyễn Văn Linh, Phường Nam Dương, Quận Hải Châu, TP. Đà Nẵng',
  '18 Phố Hàng Bài, Phường Tràng Tiền, Quận Hoàn Kiếm, TP. Hà Nội',
  '62 Phố Huế, Phường Hàng Bài, Quận Hoàn Kiếm, TP. Hà Nội',
  '105 Tây Sơn, Phường Quang Trung, Quận Đống Đa, TP. Hà Nội'
];

// Từ khóa tìm kiếm có phân bổ trọng số (Weight): 70% mùa dịch/cúm, 30% thường nhật
const SEARCH_KEYWORDS_WEIGHTED = [
  // Nhóm Hot Trend: Cúm, sốt, ho, tăng đề kháng (Weight 4 - 7)
  { keyword: 'panadol hạ sốt giảm đau', category: 'Hạ sốt & Giảm đau', weight: 7 },
  { keyword: 'panadol extra đỏ', category: 'Hạ sốt & Giảm đau', weight: 6 },
  { keyword: 'vitamin c 1000mg sủi tăng đề kháng', category: 'Thuốc bổ, vitamin', weight: 6 },
  { keyword: 'siro ho prospan thảo dược trẻ em', category: 'Siro ho cảm', weight: 6 },
  { keyword: 'khẩu trang y tế 4 lớp kháng khuẩn', category: 'Thiết bị vật tư y tế', weight: 5 },
  { keyword: 'nước muối sinh lý 0.9% súc họng', category: 'Vệ sinh mũi họng', weight: 5 },
  { keyword: 'viên ngậm ho bổ phế nam hà', category: 'Thuốc ho viêm họng', weight: 5 },
  { keyword: 'men vi sinh enterogermina tiêu hóa', category: 'Tiêu hóa & Men vi sinh', weight: 4 },
  { keyword: 'oresol bù nước điện giải khi sốt', category: 'Thuốc bù điện giải', weight: 4 },

  // Nhóm Thiết yếu thường nhật (Weight 1 - 2)
  { keyword: 'dầu nóng salonpas xoa bóp', category: 'Dầu nóng xoa bóp', weight: 2 },
  { keyword: 'glucosamine hỗ trợ xương khớp', category: 'Bổ sung xương khớp', weight: 2 },
  { keyword: 'kem bôi da liền sẹo dưỡng ẩm', category: 'Mỹ phẩm & Chăm sóc da', weight: 2 },
  { keyword: 'dầu cá omega 3 úc sáng mắt', category: 'Thuốc bổ, vitamin', weight: 2 },
  { keyword: 'dung dịch sát khuẩn betadine 10%', category: 'Sát trùng ngoài da', weight: 2 },
  { keyword: 'thuốc nhỏ mắt tobrex chống viêm', category: 'Thuốc mắt & tai', weight: 1 },
];

// Đánh giá tốt dành cho Hero / Best-seller products (4 - 5 sao)
const POSITIVE_REVIEWS_POOL = [
  {
    rating: 5,
    comment: 'Thuốc chính hãng, hạn dùng còn xa, dược sĩ tư vấn rất tận tâm và dễ hiểu!',
    tags: ['Chính hãng', 'Tư vấn tận tâm', 'Hiệu quả cao']
  },
  {
    rating: 5,
    comment: 'Giao hàng COD nhanh chóng, đóng gói cẩn thận có chèn chống sốc, uống 1 ngày đã đỡ.',
    tags: ['Giao nhanh COD', 'Đóng gói cẩn thận', 'Hiệu quả cao']
  },
  {
    rating: 5,
    comment: 'Giá cả hợp lý, nhà thuốc sạch sẽ và chuyên nghiệp, sẽ tiếp tục ủng hộ lâu dài.',
    tags: ['Giá tốt', 'Cơ sở sạch sẽ']
  },
  {
    rating: 4,
    comment: 'Chất lượng thuốc rất tốt, hướng dẫn sử dụng ghi chú rõ ràng trên bao bì.',
    tags: ['Đóng gói cẩn thận', 'Hướng dẫn rõ']
  },
  {
    rating: 4,
    comment: 'Nhân viên tư vấn nhiệt tình, thuốc đúng liều hiệu quả rõ rệt sau 2 ngày.',
    tags: ['Hiệu quả tốt', 'Nhân viên nhiệt tình']
  }
];

// Đánh giá tiêu cực dành cho Problematic products / Giờ cao điểm (1 - 2 sao) để kích hoạt SLA
const NEGATIVE_REVIEWS_POOL = [
  {
    rating: 2,
    comment: 'Hộp thuốc hơi bị móp ở mép do vận chuyển, cần cải thiện khâu đóng gói hộp.',
    tags: ['Đóng gói kém', 'Vận chuyển chậm']
  },
  {
    rating: 2,
    comment: 'Chi nhánh giờ cao điểm chỉ có 1 dược sĩ trực bán thuốc nên phải chờ hơn 20 phút.',
    tags: ['Chờ đợi lâu', 'Thiếu nhân sự']
  },
  {
    rating: 1,
    comment: 'Giao hàng COD trễ hơn 2 tiếng so với hẹn, làm lỡ giờ uống thuốc buổi chiều.',
    tags: ['Giao trễ', 'Chậm trễ đơn online']
  }
];

// Ghi chú check-in dành cho Dược sĩ đúng giờ và đi muộn
const CHECKIN_NOTES = {
  punctual: [
    'Đến sớm 10 phút kiểm tra tủ thuốc và vệ sinh quầy GPP',
    'Đến đúng giờ chuẩn bị bàn giao ca trực tiếp theo',
    'Có mặt sớm, két tiền và tủ thuốc đặc biệt nguyên vẹn',
    'Đến đúng giờ tiếp nhận sổ sách bàn giao ca sáng'
  ],
  late: [
    'Đi muộn 12 phút do kẹt xe giờ cao điểm trên trục đường chính',
    'Đi muộn 15 phút do trời mưa to ngập đường đã xin phép quản lý',
    'Đến trễ 10 phút do xe hư trên đường đi làm',
    'Trễ 18 phút do hỗ trợ xử lý hồ sơ bệnh án ca trước'
  ]
};

// Phương án giải quyết khi khiếu nại 1-2 sao theo SLA 24h
const MANAGER_RESOLVE_ACTIONS = [
  {
    actionTaken: 'CALLED_CUSTOMER',
    notes: 'Quản lý cơ sở đã chủ động gọi điện xin lỗi khách hàng, giải thích sự cố giờ cao điểm và tặng voucher giảm 15% cho lần mua tới.',
    customerSatisfied: true
  },
  {
    actionTaken: 'EXCHANGED_PRODUCT',
    notes: 'Đã cho nhân viên giao hoán đổi hộp thuốc mới nguyên vẹn tận nhà cho khách trong vòng 1 giờ, khách hài lòng.',
    customerSatisfied: true
  },
  {
    actionTaken: 'STAFF_COUNSELING',
    notes: 'Trình bày lại quy trình chăm sóc khách hàng với dược sĩ ca trực, yêu cầu bố trí thêm nhân viên hỗ trợ vào giờ cao điểm.',
    customerSatisfied: true
  }
];

const SUPPLIERS_POOL = [
  { supplierCode: 'SUP-DHG', name: 'Công ty Cổ phần Dược Hậu Giang (DHG Pharma)' },
  { supplierCode: 'SUP-TRA', name: 'Công ty Cổ phần Traphaco' },
  { supplierCode: 'SUP-IMP', name: 'Công ty Cổ phần Dược phẩm Imexpharm' },
  { supplierCode: 'SUP-TW1', name: 'Công ty Cổ phần Dược phẩm Trung ương 1 (Pharbaco)' },
  { supplierCode: 'SUP-BST', name: 'Công ty Cổ phần Dược phẩm Boston Việt Nam' },
  { supplierCode: 'SUP-SNF', name: 'Sanofi-Aventis Việt Nam' }
];

const PR_REASON_NOTES = [
  'Thuốc chủ lực bán chạy vượt trội trong tuần, tồn kho dưới mức an toàn 20 hộp.',
  'Nhu cầu mua hạ sốt và vitamin tăng cao đột biến theo mùa dịch, cần bổ sung gấp.',
  'Cơ số thuốc thiết yếu giảm nhanh sau chuỗi bán lẻ POS, cần nhập hàng bổ sung.',
  'Dự trữ cơ số thuốc đề phòng cao điểm cuối tuần theo kế hoạch chi nhánh.'
];

const GRN_RECEIPT_NOTES = [
  'Kiểm tra cảm quan đạt 100%, tem niêm phong COA nguyên vẹn, hạn sử dụng trên 24 tháng.',
  'Nhiệt độ xe chuyên dụng lạnh đạt 4.5°C khi giao hàng tại cửa kho tổng.',
  'Số lô và hạn dùng khớp hoàn toàn với phiếu xuất kho từ Nhà sản xuất.',
  'Đã nhập kho, dán mã barcode lô và sắp xếp lên kệ đúng vị trí quy định.'
];

const STOCK_TRANSFER_NOTES = [
  'Điều chuyển gấp thuốc chủ lực từ Kho Tổng về Chi nhánh bù đắp thiếu hụt.',
  'Điều phối cân bằng mức tồn kho giữa Kho Tổng và cơ sở vệ tinh.',
  'Điều chuyển thuốc theo yêu cầu cập nhật định kỳ của quản lý cơ sở.'
];

module.exports = {
  CUSTOMER_NAMES,
  COD_DELIVERY_ADDRESSES,
  SEARCH_KEYWORDS_WEIGHTED,
  POSITIVE_REVIEWS_POOL,
  NEGATIVE_REVIEWS_POOL,
  CHECKIN_NOTES,
  MANAGER_RESOLVE_ACTIONS,
  SUPPLIERS_POOL,
  PR_REASON_NOTES,
  GRN_RECEIPT_NOTES,
  STOCK_TRANSFER_NOTES,
};
