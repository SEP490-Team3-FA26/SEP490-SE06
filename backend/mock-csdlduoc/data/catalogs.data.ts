// Danh mục Master Data chuẩn CSDL Dược Quốc gia Việt Nam (v2)
// Ban hành theo Quyết định 232/QĐ-TTYQG và Quyết định 522/QĐ-TTYQG

export interface UnitItem {
  id: string;
  code: string;
  name: string;
  description?: string;
}

export interface CountryItem {
  id: string;
  code: string; // ISO 3166-1 alpha-2 hoặc alpha-3
  name: string;
}

export interface DrugGroupItem {
  id: string;
  code: string;
  name: string;
  description: string;
}

export interface RouteItem {
  id: string;
  code: string;
  name: string;
}

export interface ManufacturerItem {
  id: string;
  code: string;
  name: string;
  country: string;
  address: string;
}

export interface ProvinceItem {
  id: string;
  code: string;
  name: string;
}

export interface CommuneItem {
  id: string;
  code: string;
  name: string;
  province_id: string;
}

export const MASTER_UNITS: UnitItem[] = [
  { id: "U-01", code: "HOP", name: "Hộp", description: "Đơn vị đóng gói dạng hộp" },
  { id: "U-02", code: "VI", name: "Vỉ", description: "Vỉ thuốc" },
  { id: "U-03", code: "VIEN", name: "Viên", description: "Viên nén/viên nang" },
  { id: "U-04", code: "GOI", name: "Gói", description: "Gói bột/cốm" },
  { id: "U-05", code: "CHAI", name: "Chai", description: "Chai siro/dung dịch" },
  { id: "U-06", code: "LO", name: "Lọ", description: "Lọ thủy tinh/nhựa" },
  { id: "U-07", code: "ONG", name: "Ống", description: "Ống tiêm/uống" },
  { id: "U-08", code: "TUYP", name: "Tuýp", description: "Tuýp kem/gel bôi" },
  { id: "U-09", code: "MIENG", name: "Miếng", description: "Miếng cao dán" },
  { id: "U-10", code: "LIEU", name: "Liều", description: "Liều xịt/hít" },
];

export const MASTER_COUNTRIES: CountryItem[] = [
  { id: "C-VN", code: "VN", name: "Việt Nam" },
  { id: "C-FR", code: "FR", name: "Pháp" },
  { id: "C-DE", code: "DE", name: "Đức" },
  { id: "C-GB", code: "GB", name: "Vương Quốc Anh" },
  { id: "C-US", code: "US", name: "Hoa Kỳ" },
  { id: "C-JP", code: "JP", name: "Nhật Bản" },
  { id: "C-CH", code: "CH", name: "Thụy Sĩ" },
  { id: "C-IN", code: "IN", name: "Ấn Độ" },
  { id: "C-KR", code: "KR", name: "Hàn Quốc" },
  { id: "C-IT", code: "IT", name: "Ý" },
  { id: "C-TH", code: "TH", name: "Thái Lan" },
];

export const MASTER_DRUG_GROUPS: DrugGroupItem[] = [
  {
    id: "GRP-01",
    code: "GIAM_DAU_HA_SOT",
    name: "Thuốc giảm đau, hạ sốt, chống viêm không steroid (NSAID)",
    description: "Nhóm thuốc tác dụng hạ thân nhiệt, giảm đau ngoại vi và kháng viêm",
  },
  {
    id: "GRP-02",
    code: "KHANG_SINH",
    name: "Thuốc kháng sinh & kháng khuẩn",
    description: "Nhóm Beta-lactam, Macrolide, Cephalosporin, Quinolone...",
  },
  {
    id: "GRP-03",
    code: "TIEU_HOA",
    name: "Thuốc đường tiêu hóa & gan mật",
    description: "Thuốc kháng acid, ức chế bơm proton PPI, men vi sinh, cầm tiêu chảy",
  },
  {
    id: "GRP-04",
    code: "TIM_MACH",
    name: "Thuốc tim mạch & hạ huyết áp",
    description: "Thuốc chẹn kênh canxi, ức chế men chuyển ACE, chẹn thụ thể ARB",
  },
  {
    id: "GRP-05",
    code: "NOI_TIET_TIEU_DUONG",
    name: "Thuốc điều trị đái tháo đường & nội tiết tố",
    description: "Biguanide, Sulfonylurea, Insulin và hormone chuyển hóa",
  },
  {
    id: "GRP-06",
    code: "HO_HAP",
    name: "Thuốc tác dụng trên đường hô hấp",
    description: "Thuốc giãn phế quản, long đờm, giảm ho, kháng Histamin H1",
  },
  {
    id: "GRP-07",
    code: "DA_LIEU",
    name: "Thuốc da liễu & bôi ngoài",
    description: "Corticoid bôi da, sát khuẩn, làm dịu da và trị nấm",
  },
  {
    id: "GRP-08",
    code: "THAN_KINH",
    name: "Thuốc tác dụng trên hệ thần kinh",
    description: "Thuốc an thần, hướng thần, chống trầm cảm và động kinh",
  },
  {
    id: "GRP-09",
    code: "VITAMIN_KHOANG_CHAT",
    name: "Vitamin & khoáng chất bổ sung",
    description: "Multivitamin, khoáng chất vi lượng, thuốc bổ dinh dưỡng",
  },
  {
    id: "GRP-10",
    code: "KIEM_SOAT_DAC_BIET",
    name: "Thuốc kiểm soát đặc biệt (Gây nghiện, Tiền chất, Thuốc độc)",
    description: "Danh mục quản lý nghiêm ngặt theo Nghị định 54/2017/NĐ-CP",
  },
];

export const MASTER_ROUTES: RouteItem[] = [
  { id: "R-01", code: "PO", name: "Đường uống" },
  { id: "R-02", code: "IV", name: "Tiêm tĩnh mạch" },
  { id: "R-03", code: "IM", name: "Tiêm bắp" },
  { id: "R-04", code: "TOPICAL", name: "Bôi/Dán ngoài da" },
  { id: "R-05", code: "OPHT", name: "Nhỏ mắt" },
  { id: "R-06", code: "OTIC", name: "Nhỏ tai" },
  { id: "R-07", code: "SUBLINGUAL", name: "Đặt dưới lưỡi" },
  { id: "R-08", code: "INHALATION", name: "Hít / Xịt qua đường hô hấp" },
  { id: "R-09", code: "RECTAL", name: "Đặt hậu môn / Trực tràng" },
];

export const MASTER_MANUFACTURERS: ManufacturerItem[] = [
  {
    id: "M-DHG",
    code: "DHG",
    name: "Công ty Cổ phần Dược Hậu Giang",
    country: "Việt Nam",
    address: "288 Nguyễn Văn Cừ, P. An Hòa, Q. Ninh Kiều, Cần Thơ",
  },
  {
    id: "M-IMEX",
    code: "IMEXPHARM",
    name: "Công ty Cổ phần Dược phẩm Imexpharm",
    country: "Việt Nam",
    address: "Số 4, Đường 30/4, P. 1, TP. Cao Lãnh, Đồng Tháp",
  },
  {
    id: "M-TRAPHACO",
    code: "TRAPHACO",
    name: "Công ty Cổ phần Traphaco",
    country: "Việt Nam",
    address: "75 Yên Ninh, P. Quán Thánh, Q. Ba Đình, Hà Nội",
  },
  {
    id: "M-GSK",
    code: "GSK",
    name: "GlaxoSmithKline Consumer Healthcare Pte Ltd",
    country: "Vương Quốc Anh",
    address: "980 Great West Road, Brentford, Middlesex, TW8 9GS, United Kingdom",
  },
  {
    id: "M-SANOFI",
    code: "SANOFI",
    name: "Công ty Cổ phần Sanofi Việt Nam",
    country: "Việt Nam",
    address: "Lô I-8-2, Đường D8, Khu Công nghệ Cao, P. Long Thạnh Mỹ, TP. Thủ Đức, TP.HCM",
  },
  {
    id: "M-AZ",
    code: "ASTRAZENECA",
    name: "AstraZeneca Pharmaceuticals LP",
    country: "Vương Quốc Anh",
    address: "1 Francis Crick Avenue, Cambridge Biomedical Campus, Cambridge, UK",
  },
  {
    id: "M-PFIZER",
    code: "PFIZER",
    name: "Pfizer Inc.",
    country: "Hoa Kỳ",
    address: "66 Hudson Boulevard East, New York, NY 10001, USA",
  },
  {
    id: "M-BAYER",
    code: "BAYER",
    name: "Bayer AG",
    country: "Đức",
    address: "Kaiser-Wilhelm-Allee 1, 51373 Leverkusen, Germany",
  },
  {
    id: "M-BOSTON",
    code: "BOSTON_PHARMA",
    name: "Công ty Cổ phần Dược phẩm Boston Việt Nam",
    country: "Việt Nam",
    address: "Số 43, Đường số 8, KCN VSIP 1, Thuận An, Bình Dương",
  },
  {
    id: "M-DANAPHA",
    code: "DANAPHA",
    name: "Công ty Cổ phần Dược Danapha",
    country: "Việt Nam",
    address: "253 Dũng Sĩ Thanh Khê, P. Thanh Khê Tây, Q. Thanh Khê, Đà Nẵng",
  },
];

export const MASTER_PROVINCES: ProvinceItem[] = [
  { id: "01", code: "HAN", name: "Thành phố Hà Nội" },
  { id: "79", code: "SGN", name: "Thành phố Hồ Chí Minh" },
  { id: "48", code: "DAD", name: "Thành phố Đà Nẵng" },
  { id: "31", code: "HPH", name: "Thành phố Hải Phòng" },
  { id: "92", code: "VCA", name: "Thành phố Cần Thơ" },
  { id: "74", code: "BDG", name: "Tỉnh Bình Dương" },
  { id: "75", code: "DNA", name: "Tỉnh Đồng Nai" },
];

export const MASTER_COMMUNES: CommuneItem[] = [
  // TP.HCM (79)
  { id: "CM-79-01", code: "BNH", name: "Phường Bến Nghé, Quận 1", province_id: "79" },
  { id: "CM-79-02", code: "BTN", name: "Phường Bến Thành, Quận 1", province_id: "79" },
  { id: "CM-79-03", code: "THD", name: "Phường Tân Hưng, Quận 7", province_id: "79" },
  { id: "CM-79-04", code: "TPA", name: "Phường Thảo Điền, TP. Thủ Đức", province_id: "79" },
  // Hà Nội (01)
  { id: "CM-01-01", code: "HKM", name: "Phường Tràng Tiền, Quận Hoàn Kiếm", province_id: "01" },
  { id: "CM-01-02", code: "BDH", name: "Phường Điện Biên, Quận Ba Đình", province_id: "01" },
  { id: "CM-01-03", code: "CGY", name: "Phường Dịch Vọng Hậu, Quận Cầu Giấy", province_id: "01" },
  // Đà Nẵng (48)
  { id: "CM-48-01", code: "HAI", name: "Phường Hải Châu 1, Quận Hải Châu", province_id: "48" },
  { id: "CM-48-02", code: "TKH", name: "Phường Thanh Khê Tây, Quận Thanh Khê", province_id: "48" },
];
