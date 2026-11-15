// Modal Tra Cứu Danh Sách 19 APIs CSDL Dược Quốc Gia (Quyết Định 232/QĐ-TTYQG & Thông Tư 11/2025/TT-BYT)
// Dành cho Ban Giám Đốc và Thanh Tra Y Tế giám sát chuẩn liên thông dữ liệu dược toàn chuỗi

import React, { useState } from "react";
import { X, Search, Copy, Check, ShieldCheck, ExternalLink, Code2, Database, Send, ArrowRight, BookOpen } from "lucide-react";

interface NationalApiItem {
  id: string;
  method: "GET" | "POST" | "PUT";
  endpoint: string;
  group: "AUTH" | "MASTER" | "TRANSACTION" | "INSPECTOR";
  name: string;
  description: string;
  authRequired: boolean;
  requestSample?: string;
  responseSample: string;
}

const NATIONAL_APIS_DATA: NationalApiItem[] = [
  // ─── 1. XÁC THỰC OAUTH2 ───
  {
    id: "auth-login",
    method: "POST",
    endpoint: "/v2/auth/login",
    group: "AUTH",
    name: "Xác thực OAuth2 cấp quyền doanh nghiệp",
    description: "Đăng nhập bằng mã cơ sở/mã số thuế và mật khẩu mã hóa Base64 để nhận Bearer Access Token thời hạn 1 giờ từ máy chủ Bộ Y Tế.",
    authRequired: false,
    requestSample: `POST /v2/auth/login
Content-Type: application/x-www-form-urlencoded

username=0312345678
password=TWF0S2hhdVNhbmRib3gyMDI2QA==`,
    responseSample: `{
  "access_token": "eyJhbGciOiJIUzI1NiIsInR5cCI6...",
  "token_type": "Bearer",
  "expires_in": 3600,
  "facility_code": "79-001234",
  "facility_name": "Kho Tổng & Nhà Thuốc Trung Tâm VinaPharmacy"
}`
  },

  // ─── 2. DANH MỤC MASTER DATA ───
  {
    id: "master-drugs",
    method: "GET",
    endpoint: "/v2/master/drugs",
    group: "MASTER",
    name: "Danh mục dùng chung 2.331 thuốc quốc gia",
    description: "Tra cứu danh mục thuốc đã được Cục Quản lý Dược cấp số đăng ký lưu hành. Hỗ trợ lọc theo khoảng ngày cập nhật last_update_from, số đăng ký và hoạt chất.",
    authRequired: true,
    responseSample: `{
  "page": 1,
  "page_size": 20,
  "total": 2331,
  "data": [
    {
      "id": "DRUG-0001",
      "name": "Panadol Extra với Actizorb",
      "registration_number": "VN-22012-19",
      "active_pharmaceutical_ingredient": "Paracetamol 500mg, Caffeine 65mg",
      "strength": "500mg/65mg",
      "prescription_status": 0,
      "packagings": [
        { "unit_id": "U-01", "unit_name": "Hộp", "gtin": "8935001800012" }
      ],
      "last_update_time": "2026-07-20"
    }
  ]
}`
  },
  {
    id: "master-drug-detail",
    method: "GET",
    endpoint: "/v2/master/drugs/:drug_id",
    group: "MASTER",
    name: "Chi tiết thuốc theo mã định danh hoặc SĐK",
    description: "Xem đầy đủ hồ sơ pháp lý của một thuốc theo mã định danh quốc gia (VD: DRUG-0001) hoặc số đăng ký (VN-22012-19).",
    authRequired: true,
    responseSample: `{
  "id": "DRUG-0001",
  "name": "Panadol Extra với Actizorb",
  "registration_number": "VN-22012-19",
  "old_registration_number": "VN-15421-12",
  "manufacturer": {
    "name": "GlaxoSmithKline Consumer Healthcare Pte Ltd",
    "country": "Vương Quốc Anh",
    "address": "980 Great West Road, Brentford, Middlesex"
  },
  "routes": [{ "id": "R-01", "name": "Đường uống" }],
  "approval_date": "2019-06-15",
  "expiry_date": "2029-06-15"
}`
  },
  {
    id: "master-units",
    method: "GET",
    endpoint: "/v2/master/units",
    group: "MASTER",
    name: "Danh mục đơn vị tính chuẩn hóa",
    description: "10 đơn vị tính dược phẩm chuẩn của Bộ Y Tế: Hộp, Chai, Vỉ, Viên, Gói, Ống, Tuýp, Lọ, Bình, Túi.",
    authRequired: true,
    responseSample: `[
  { "id": "U-01", "name": "Hộp" },
  { "id": "U-02", "name": "Vỉ" },
  { "id": "U-03", "name": "Viên" },
  { "id": "U-04", "name": "Chai" },
  { "id": "U-05", "name": "Gói" }
]`
  },
  {
    id: "master-routes",
    method: "GET",
    endpoint: "/v2/master/routes",
    group: "MASTER",
    name: "Danh mục đường dùng thuốc",
    description: "Phân loại đường đưa thuốc vào cơ thể: Đường uống, Tiêm bắp, Tiêm tĩnh mạch, Bôi ngoài da, Nhỏ mắt/mũi, Đặt dưới lưỡi.",
    authRequired: true,
    responseSample: `[
  { "id": "R-01", "name": "Đường uống" },
  { "id": "R-02", "name": "Bôi ngoài da" },
  { "id": "R-03", "name": "Tiêm tĩnh mạch" }
]`
  },
  {
    id: "master-drug-groups",
    method: "GET",
    endpoint: "/v2/master/drug-groups",
    group: "MASTER",
    name: "Danh mục nhóm tác dụng dược lý",
    description: "Nhóm tác dụng dược lý: Kháng sinh, Giảm đau hạ sốt NSAID, Tim mạch huyết áp, Tiêu hóa, Thần kinh.",
    authRequired: true,
    responseSample: `[
  { "id": "GRP-01", "name": "Thuốc giảm đau hạ sốt kháng viêm (NSAID)" },
  { "id": "GRP-02", "name": "Thuốc kháng sinh diệt khuẩn" },
  { "id": "GRP-03", "name": "Thuốc tim mạch và huyết áp" }
]`
  },
  {
    id: "master-manufacturers",
    method: "GET",
    endpoint: "/v2/master/manufacturers",
    group: "MASTER",
    name: "Danh mục hãng sản xuất dược phẩm",
    description: "Danh bạ các nhà máy sản xuất thuốc trong nước (GMP-WHO) và các tập đoàn dược phẩm quốc tế.",
    authRequired: true,
    responseSample: `[
  { "id": "M-DHG", "name": "Công ty Cổ phần Dược Hậu Giang", "country": "Việt Nam" },
  { "id": "M-GSK", "name": "GlaxoSmithKline", "country": "Vương Quốc Anh" }
]`
  },
  {
    id: "master-provinces",
    method: "GET",
    endpoint: "/v2/master/provinces",
    group: "MASTER",
    name: "Danh mục tỉnh / thành phố",
    description: "Danh sách 63 tỉnh/thành phố phục vụ quản lý địa bàn cấp phép kinh doanh dược.",
    authRequired: true,
    responseSample: `[
  { "id": "79", "name": "TP. Hồ Chí Minh" },
  { "id": "01", "name": "TP. Hà Nội" },
  { "id": "48", "name": "TP. Đà Nẵng" }
]`
  },
  {
    id: "master-communes",
    method: "GET",
    endpoint: "/v2/master/communes?province_id=79",
    group: "MASTER",
    name: "Danh mục phường / xã hành chính",
    description: "Tra cứu danh mục phường, xã theo mã tỉnh/thành phố để xác thực địa chỉ cơ sở bán lẻ GPP.",
    authRequired: true,
    responseSample: `[
  { "id": "26734", "name": "Phường Bến Nghé", "district": "Quận 1" },
  { "id": "26740", "name": "Phường Thảo Điền", "district": "TP. Thủ Đức" }
]`
  },

  // ─── 3. GIAO DỊCH DƯỢC PHẨM BẮT BUỘC (NHẬP - XUẤT - KIỂM KÊ) ───
  {
    id: "txn-stock-in",
    method: "POST",
    endpoint: "/v2/transactions/stock-in",
    group: "TRANSACTION",
    name: "Đồng bộ phiếu nhập kho (GSP / GDP)",
    description: "Bắt buộc đẩy thông tin lô nhập kho từ nhà cung cấp GDP (Số lô, HSD, giá nhập, hóa đơn GTGT) lên Bộ Y Tế trong vòng 24 giờ sau khi nghiệm thu.",
    authRequired: true,
    requestSample: `POST /v2/transactions/stock-in
Authorization: Bearer <token>
Content-Type: application/json

{
  "facility_code": "79-001234",
  "invoice_number": "HD-2026/08912",
  "invoice_date": "2026-11-14",
  "supplier_tax_code": "0301456789",
  "items": [
    {
      "drug_id": "DRUG-0001",
      "batch_number": "L26A01",
      "expiry_date": "2028-10-31",
      "quantity": 500,
      "unit": "Hộp",
      "unit_price": 38000
    }
  ]
}`,
    responseSample: `{
  "transaction_id": "TXN-IN-20261114-00412",
  "status": "ACCEPTED",
  "synced_at": "2026-11-14T08:30:00Z",
  "message": "Giao dịch nhập kho đã được ghi nhận vào Sổ cái Dược Quốc Gia."
}`
  },
  {
    id: "txn-stock-in-detail",
    method: "GET",
    endpoint: "/v2/transaction/stock-in/:id",
    group: "TRANSACTION",
    name: "Tra cứu chi tiết phiếu nhập kho đã liên thông",
    description: "Xem lại toàn bộ nội dung phiếu nhập kho và lịch sử ghi nhận trên máy chủ Bộ Y Tế.",
    authRequired: true,
    responseSample: `{
  "transaction_id": "TXN-IN-20261114-00412",
  "facility_code": "79-001234",
  "status": "VERIFIED",
  "items_count": 1,
  "created_at": "2026-11-14T08:30:00Z"
}`
  },
  {
    id: "txn-stock-in-status",
    method: "GET",
    endpoint: "/v2/transaction/stock-in/:id/status",
    group: "TRANSACTION",
    name: "Kiểm tra trạng thái xác thực phiếu nhập",
    description: "Kiểm tra xem phiếu nhập đã được hệ thống giám sát của Bộ Y Tế phê duyệt hay bị từ chối do sai số lô/hạn dùng.",
    authRequired: true,
    responseSample: `{
  "transaction_id": "TXN-IN-20261114-00412",
  "verification_status": "APPROVED",
  "reason": "Lô hàng hợp lệ theo danh mục cấp phép Cục Quản Lý Dược."
}`
  },
  {
    id: "txn-stock-out",
    method: "POST",
    endpoint: "/v2/transactions/stock-out",
    group: "TRANSACTION",
    name: "Đồng bộ hóa đơn bán lẻ POS & Bán theo đơn (GPP)",
    description: "Bắt buộc đẩy thông tin từng hóa đơn bán hàng tại quầy (mã toa thuốc, bác sĩ kê đơn nếu là thuốc Rx, số lô thuốc xuất bán) lên Bộ Y Tế.",
    authRequired: true,
    requestSample: `POST /v2/transactions/stock-out
Authorization: Bearer <token>
Content-Type: application/json

{
  "facility_code": "79-001235",
  "sale_type": "PRESCRIPTION",
  "prescription_code": "TOA-BV-88129",
  "doctor_name": "BS. Nguyễn Văn An",
  "customer_phone": "0901234567",
  "items": [
    {
      "drug_id": "DRUG-0002",
      "batch_number": "HAP2610",
      "quantity": 2,
      "unit": "Hộp",
      "unit_price": 42000
    }
  ]
}`,
    responseSample: `{
  "transaction_id": "TXN-OUT-20261114-00958",
  "status": "ACCEPTED",
  "prescription_validated": true,
  "message": "Đã ghi nhận hóa đơn bán lẻ thuốc thành công."
}`
  },
  {
    id: "txn-stock-out-detail",
    method: "GET",
    endpoint: "/v2/transactions/stock-out/:id",
    group: "TRANSACTION",
    name: "Tra cứu chi tiết hóa đơn xuất bán đã liên thông",
    description: "Truy vấn lịch sử xuất bán lẻ hoặc xuất điều chuyển liên cơ sở trên CSDL Dược Quốc Gia.",
    authRequired: true,
    responseSample: `{
  "transaction_id": "TXN-OUT-20261114-00958",
  "facility_code": "79-001235",
  "total_amount": 84000,
  "status": "COMPLETED"
}`
  },
  {
    id: "txn-stock-out-status",
    method: "GET",
    endpoint: "/v2/transactions/stock-out/:id/status",
    group: "TRANSACTION",
    name: "Kiểm tra tính hợp lệ của hóa đơn bán lẻ",
    description: "Cảnh báo nếu hóa đơn xuất bán thuốc kê đơn nhưng thiếu mã đơn thuốc hoặc xuất bán thuốc hết hạn.",
    authRequired: true,
    responseSample: `{
  "transaction_id": "TXN-OUT-20261114-00958",
  "compliance_status": "VALID",
  "warnings": []
}`
  },
  {
    id: "txn-stock-taking",
    method: "POST",
    endpoint: "/v2/transactions/stock-taking",
    group: "TRANSACTION",
    name: "Báo cáo biên bản kiểm kê cân đối tồn kho",
    description: "Gửi biên bản giải trình sai lệch số lượng tồn kho sổ sách vs tồn kho thực tế định kỳ hàng tháng/quý theo quy định GPP/GSP.",
    authRequired: true,
    requestSample: `POST /v2/transactions/stock-taking
Authorization: Bearer <token>
Content-Type: application/json

{
  "facility_code": "79-001234",
  "check_date": "2026-11-14",
  "discrepancy_reason": "Hư hỏng vỡ vỏ hộp trong bảo quản",
  "items": [
    {
      "drug_id": "DRUG-0001",
      "batch_number": "L26A01",
      "system_qty": 500,
      "actual_qty": 498,
      "difference": -2
    }
  ]
}`,
    responseSample: `{
  "transaction_id": "TXN-ST-20261114-00108",
  "status": "ACCEPTED",
  "variance_handled": true,
  "message": "Đã lưu biên bản kiểm kê và điều chỉnh số dư quốc gia."
}`
  },

  // ─── 4. GIÁM SÁT THANH TRA ───
  {
    id: "inspector-dashboard",
    method: "GET",
    endpoint: "/v2/transactions/inspector/dashboard",
    group: "INSPECTOR",
    name: "Sổ cái giám sát giao dịch quốc gia (Real-Time Ledger)",
    description: "Cung cấp cái nhìn toàn cảnh về mọi giao dịch Nhập - Xuất - Bán lẻ của toàn bộ các chi nhánh thuộc chuỗi; tự động phát hiện vi phạm bán thuốc hết hạn hoặc thu hồi.",
    authRequired: true,
    responseSample: `{
  "chain_name": "Chuỗi Nhà Thuốc VinaPharmacy",
  "facilities_count": 5,
  "compliance_rate": "99.2%",
  "active_violations": 0,
  "recent_transactions_count": 66
}`
  },
  {
    id: "inspector-transactions",
    method: "GET",
    endpoint: "/v2/transactions/inspector/transactions",
    group: "INSPECTOR",
    name: "Tra cứu lịch sử liên thông dữ liệu toàn chuỗi",
    description: "Bộ lọc nâng cao theo chi nhánh, mã giao dịch, thời gian gửi và loại nghiệp vụ phục vụ công tác thanh tra độc lập của Cục Quản Lý Dược.",
    authRequired: true,
    responseSample: `{
  "page": 1,
  "total": 66,
  "items": [
    {
      "sync_code": "TXN-IN-20261114-00412",
      "facility_code": "79-001234",
      "type": "STOCK_IN",
      "status": "ACCEPTED",
      "created_at": "2026-11-14T08:30:00Z"
    }
  ]
}`
  }
];

export interface NationalPharmaApisModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export function NationalPharmaApisModal({ isOpen, onClose }: NationalPharmaApisModalProps) {
  const [selectedGroup, setSelectedGroup] = useState<"ALL" | "AUTH" | "MASTER" | "TRANSACTION" | "INSPECTOR">("ALL");
  const [searchKeyword, setSearchKeyword] = useState("");
  const [selectedApi, setSelectedApi] = useState<NationalApiItem>(NATIONAL_APIS_DATA[0]);
  const [copiedText, setCopiedText] = useState<string | null>(null);

  if (!isOpen) return null;

  const handleCopy = (text: string, id: string) => {
    navigator.clipboard.writeText(text);
    setCopiedText(id);
    setTimeout(() => setCopiedText(null), 1800);
  };

  const filteredApis = NATIONAL_APIS_DATA.filter((api) => {
    const matchGroup = selectedGroup === "ALL" || api.group === selectedGroup;
    const matchKeyword =
      !searchKeyword ||
      api.name.toLowerCase().includes(searchKeyword.toLowerCase()) ||
      api.endpoint.toLowerCase().includes(searchKeyword.toLowerCase()) ||
      api.description.toLowerCase().includes(searchKeyword.toLowerCase());
    return matchGroup && matchKeyword;
  });

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 sm:p-6 bg-slate-950/70 backdrop-blur-sm animate-fadeIn">
      <div className="bg-white rounded-2xl border border-slate-200 shadow-2xl w-full max-w-6xl max-h-[92vh] flex flex-col overflow-hidden text-slate-800">
        
        {/* Header Chuẩn Bộ Y Tế & Ban Giám Đốc */}
        <div className="px-6 py-4 border-b border-slate-200 bg-gradient-to-r from-red-900 via-slate-900 to-blue-900 text-white flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-red-600/30 border border-red-500/50 flex items-center justify-center text-red-300 shadow-inner">
              <ShieldCheck size={24} />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="text-[10px] font-extrabold uppercase tracking-widest text-red-300 bg-red-950/80 px-2 py-0.5 rounded border border-red-800/80">Bộ Y Tế Việt Nam</span>
                <span className="text-[10px] font-mono text-emerald-300 bg-emerald-950/70 px-2 py-0.5 rounded border border-emerald-800/70 font-bold">
                  QĐ 232/QĐ-TTYQG v1.1
                </span>
                <span className="text-[10px] text-sky-200 bg-sky-950/70 px-2 py-0.5 rounded border border-sky-800/70">
                  Thông tư 11/2025/TT-BYT (GPP/GDP)
                </span>
              </div>
              <h2 className="text-base font-extrabold text-white mt-1 flex items-center gap-2">
                Danh Sách 19 APIs Cơ Sở Dữ Liệu Dược Quốc Gia
                <span className="text-xs font-normal text-slate-300 font-mono">(Tra Cứu Dành Cho Ban Giám Đốc)</span>
              </h2>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-2 rounded-xl text-slate-400 hover:text-white hover:bg-white/10 transition-colors"
          >
            <X size={20} />
          </button>
        </div>

        {/* Thanh Điều Hướng & Bộ Lọc Nhanh */}
        <div className="p-4 border-b border-slate-200 bg-slate-50 flex flex-col sm:flex-row items-center justify-between gap-3">
          {/* Nhóm Filter Tabs */}
          <div className="flex items-center gap-1.5 overflow-x-auto w-full sm:w-auto">
            <button
              onClick={() => setSelectedGroup("ALL")}
              className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all ${
                selectedGroup === "ALL" ? "bg-slate-900 text-white shadow-xs" : "bg-white text-slate-600 hover:bg-slate-200/70 border border-slate-200"
              }`}
            >
              Tất cả (19)
            </button>
            <button
              onClick={() => setSelectedGroup("AUTH")}
              className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all ${
                selectedGroup === "AUTH" ? "bg-blue-600 text-white shadow-xs" : "bg-white text-slate-600 hover:bg-slate-200/70 border border-slate-200"
              }`}
            >
              🔐 Xác thực (1)
            </button>
            <button
              onClick={() => setSelectedGroup("MASTER")}
              className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all ${
                selectedGroup === "MASTER" ? "bg-indigo-600 text-white shadow-xs" : "bg-white text-slate-600 hover:bg-slate-200/70 border border-slate-200"
              }`}
            >
              📚 Master Data (9)
            </button>
            <button
              onClick={() => setSelectedGroup("TRANSACTION")}
              className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all ${
                selectedGroup === "TRANSACTION" ? "bg-emerald-600 text-white shadow-xs" : "bg-white text-slate-600 hover:bg-slate-200/70 border border-slate-200"
              }`}
            >
              📦 Nhập - Xuất - Kiểm kê (7)
            </button>
            <button
              onClick={() => setSelectedGroup("INSPECTOR")}
              className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all ${
                selectedGroup === "INSPECTOR" ? "bg-red-600 text-white shadow-xs" : "bg-white text-slate-600 hover:bg-slate-200/70 border border-slate-200"
              }`}
            >
              🛡️ Thanh tra (2)
            </button>
          </div>

          {/* Ô Tìm kiếm API */}
          <div className="relative w-full sm:w-72">
            <Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
            <input
              type="text"
              placeholder="Tìm endpoint, tên nghiệp vụ..."
              value={searchKeyword}
              onChange={(e) => setSearchKeyword(e.target.value)}
              className="w-full pl-9 pr-3 py-1.5 bg-white border border-slate-300 rounded-lg text-xs text-slate-800 placeholder-slate-400 focus:outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500 font-mono"
            />
          </div>
        </div>

        {/* Body Chia 2 Cột: Bên trái Danh Sách, Bên phải Chi Tiết JSON */}
        <div className="flex-1 grid grid-cols-1 md:grid-cols-12 overflow-hidden divide-y md:divide-y-0 md:divide-x divide-slate-200">
          
          {/* CỘT TRÁI (5 phần): Danh Sách API */}
          <div className="md:col-span-5 overflow-y-auto p-3 space-y-2 max-h-[58vh] md:max-h-none">
            {filteredApis.length === 0 ? (
              <div className="text-center py-12 text-slate-400 text-xs">
                Không tìm thấy API nào khớp với từ khóa tìm kiếm.
              </div>
            ) : (
              filteredApis.map((api) => {
                const isSelected = selectedApi.id === api.id;
                return (
                  <button
                    key={api.id}
                    onClick={() => setSelectedApi(api)}
                    className={`w-full text-left p-3 rounded-xl border transition-all cursor-pointer flex flex-col gap-1.5 ${
                      isSelected
                        ? "bg-blue-50/80 border-blue-400 shadow-xs"
                        : "bg-white border-slate-200 hover:border-slate-300 hover:bg-slate-50"
                    }`}
                  >
                    <div className="flex items-center justify-between gap-2">
                      <span
                        className={`text-[10px] font-black font-mono px-2 py-0.5 rounded ${
                          api.method === "POST"
                            ? "bg-emerald-100 text-emerald-800 border border-emerald-300"
                            : "bg-blue-100 text-blue-800 border border-blue-300"
                        }`}
                      >
                        {api.method}
                      </span>
                      <span className="text-[11px] font-mono text-slate-500 truncate flex-1 font-semibold">
                        {api.endpoint}
                      </span>
                      {api.authRequired && (
                        <span className="text-[9px] font-mono bg-amber-50 text-amber-700 px-1.5 py-0.5 rounded border border-amber-200">
                          Bearer
                        </span>
                      )}
                    </div>
                    <div className="text-xs font-bold text-slate-800 truncate">
                      {api.name}
                    </div>
                  </button>
                );
              })
            )}
          </div>

          {/* CỘT PHẢI (7 phần): Chi Tiết & Payload API */}
          <div className="md:col-span-7 overflow-y-auto p-5 bg-slate-50/60 flex flex-col gap-4 max-h-[58vh] md:max-h-none">
            {selectedApi && (
              <>
                {/* Header Chi Tiết API */}
                <div className="bg-white rounded-xl p-4 border border-slate-200 shadow-xs space-y-2">
                  <div className="flex items-center justify-between gap-3">
                    <div className="flex items-center gap-2">
                      <span
                        className={`text-xs font-black font-mono px-2.5 py-1 rounded-md ${
                          selectedApi.method === "POST"
                            ? "bg-emerald-600 text-white"
                            : "bg-blue-600 text-white"
                        }`}
                      >
                        {selectedApi.method}
                      </span>
                      <span className="text-sm font-bold font-mono text-slate-900">
                        {selectedApi.endpoint}
                      </span>
                    </div>
                    <button
                      onClick={() => handleCopy(selectedApi.endpoint, "endpoint")}
                      className="px-2.5 py-1 text-xs font-bold bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-lg border border-slate-200 transition flex items-center gap-1 cursor-pointer"
                    >
                      {copiedText === "endpoint" ? <Check size={13} className="text-emerald-600" /> : <Copy size={13} />}
                      <span>Sao chép</span>
                    </button>
                  </div>

                  <h3 className="text-sm font-extrabold text-slate-900">{selectedApi.name}</h3>
                  <p className="text-xs text-slate-600 leading-relaxed">{selectedApi.description}</p>

                  <div className="pt-2 border-t border-slate-100 flex items-center gap-4 text-[11px] text-slate-500 font-mono">
                    <div>Xác thực: <span className="font-bold text-slate-800">{selectedApi.authRequired ? "OAuth2 (Bearer Token)" : "Không yêu cầu"}</span></div>
                    <div>Định dạng: <span className="font-bold text-slate-800">application/json</span></div>
                  </div>
                </div>

                {/* Request Sample (Nếu là POST) */}
                {selectedApi.requestSample && (
                  <div className="bg-white rounded-xl border border-slate-200 overflow-hidden shadow-xs">
                    <div className="px-3.5 py-2 bg-slate-100/90 border-b border-slate-200 flex items-center justify-between">
                      <span className="text-[11px] font-bold text-slate-700 flex items-center gap-1.5 font-mono">
                        <Send size={13} className="text-blue-600" />
                        GÓI TIN GỬI ĐI (REQUEST PAYLOAD)
                      </span>
                      <button
                        onClick={() => handleCopy(selectedApi.requestSample!, "req")}
                        className="text-[11px] font-semibold text-blue-600 hover:text-blue-800 flex items-center gap-1 cursor-pointer"
                      >
                        {copiedText === "req" ? <Check size={12} className="text-emerald-600" /> : <Copy size={12} />}
                        <span>Sao chép JSON</span>
                      </button>
                    </div>
                    <pre className="p-3.5 text-[11px] font-mono text-slate-800 bg-slate-900 text-emerald-400 overflow-x-auto max-h-48 leading-relaxed">
                      {selectedApi.requestSample}
                    </pre>
                  </div>
                )}

                {/* Response Sample */}
                <div className="bg-white rounded-xl border border-slate-200 overflow-hidden shadow-xs">
                  <div className="px-3.5 py-2 bg-slate-100/90 border-b border-slate-200 flex items-center justify-between">
                    <span className="text-[11px] font-bold text-slate-700 flex items-center gap-1.5 font-mono">
                      <Code2 size={13} className="text-emerald-600" />
                      PHẢN HỒI MẪU TỪ BỘ Y TẾ (HTTP 200 / 202)
                    </span>
                    <button
                      onClick={() => handleCopy(selectedApi.responseSample, "res")}
                      className="text-[11px] font-semibold text-blue-600 hover:text-blue-800 flex items-center gap-1 cursor-pointer"
                    >
                      {copiedText === "res" ? <Check size={12} className="text-emerald-600" /> : <Copy size={12} />}
                      <span>Sao chép JSON</span>
                    </button>
                  </div>
                  <pre className="p-3.5 text-[11px] font-mono text-slate-800 bg-slate-900 text-sky-300 overflow-x-auto max-h-56 leading-relaxed">
                    {selectedApi.responseSample}
                  </pre>
                </div>
              </>
            )}
          </div>

        </div>

        {/* Footer Ghi Chú Tuân Thủ Pháp Lý */}
        <div className="px-6 py-3 bg-slate-100 border-t border-slate-200 flex flex-col sm:flex-row items-center justify-between text-xs text-slate-500 gap-2">
          <div className="flex items-center gap-1.5 font-medium">
            <span className="w-2 h-2 rounded-full bg-emerald-500"></span>
            <span>Hệ thống WDP301 tự động điều phối các gói tin liên thông qua Kafka 202 Accepted.</span>
          </div>
          <button
            onClick={onClose}
            className="px-4 py-1.5 bg-slate-900 hover:bg-slate-800 text-white text-xs font-bold rounded-lg transition-colors cursor-pointer"
          >
            Đóng bảng tra cứu
          </button>
        </div>

      </div>
    </div>
  );
}

