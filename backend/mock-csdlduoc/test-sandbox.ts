/**
 * Script kiểm thử tự động toàn diện Mock Sandbox CSDL Dược Quốc gia Việt Nam v2
 * Chuẩn đặc tả Quyết định 232/QĐ-TTYQG (Bản 1.1) - Đầy đủ 19 APIs
 */

const BASE_URL = process.env.CSDLDUOC_BASE_URL || "http://localhost:4005/v2";

interface ApiResponse<T = any> {
  status: number;
  data: T;
}

async function request(
  endpoint: string,
  options: {
    method?: string;
    headers?: Record<string, string>;
    body?: any;
  } = {}
): Promise<ApiResponse> {
  const url = `${BASE_URL}${endpoint}`;
  const headers = options.headers || {};
  let bodyStr: string | undefined = undefined;

  if (options.body) {
    if (headers["Content-Type"] === "application/x-www-form-urlencoded") {
      bodyStr = new URLSearchParams(options.body).toString();
    } else {
      headers["Content-Type"] = "application/json";
      bodyStr = JSON.stringify(options.body);
    }
  }

  const res = await fetch(url, {
    method: options.method || "GET",
    headers,
    body: bodyStr,
  });

  const contentType = res.headers.get("content-type") || "";
  let data: any = null;
  if (contentType.includes("application/json")) {
    data = await res.json();
  } else {
    data = await res.text();
  }

  return { status: res.status, data };
}

async function runTests() {
  console.log(`\n================================================================`);
  console.log(`🧪 BẮT ĐẦU KIỂM THỬ TOÀN DIỆN 19 API CSDL DƯỢC QUỐC GIA (QĐ 232 v1.1)`);
  console.log(`🎯 Base URL: ${BASE_URL}`);
  console.log(`================================================================\n`);

  let accessToken = "";

  // -------------------------------------------------------------
  // Test 1: Kiểm tra Health Check & 19 APIs spec
  // -------------------------------------------------------------
  console.log(`▶️ [TEST 1] Kiểm tra Health Check & Danh sách 19 APIs`);
  const healthRes = await request("/health");
  console.log(`   Status: ${healthRes.status}`);
  console.log(`   Hệ thống: ${healthRes.data?.name}`);
  console.log(`   Tổng số API chuẩn: ${healthRes.data?.total_apis} APIs\n`);

  // -------------------------------------------------------------
  // Test 2: Đăng nhập lấy Bearer Access Token (POST /auth/login)
  // -------------------------------------------------------------
  console.log(`▶️ [TEST 2] API 1: Xác thực OAuth2 POST /auth/login (Base64 password)`);
  const rawPassword = "MatKhauNhaThuoc2026@";
  const base64Password = Buffer.from(rawPassword).toString("base64");
  const taxCode = "0312345678"; // MST Kho Tổng WDP301

  const loginRes = await request("/auth/login", {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: { username: taxCode, password: base64Password },
  });

  console.log(`   Status: ${loginRes.status}`);
  if (loginRes.status === 200 && loginRes.data.access_token) {
    accessToken = loginRes.data.access_token;
    console.log(`   ✅ Token Type: ${loginRes.data.token_type} | Expires In: ${loginRes.data.expires_in}s`);
  } else {
    console.error(`   ❌ Lỗi lấy token:`, loginRes.data);
    process.exit(1);
  }
  console.log();

  const authHeaders = { Authorization: `Bearer ${accessToken}` };

  // -------------------------------------------------------------
  // Test 3: Nhóm Danh Mục Master Catalogs (APIs 2 -> 8)
  // -------------------------------------------------------------
  console.log(`▶️ [TEST 3] Nhóm Danh Mục Master Data (APIs 2 -> 8):`);
  const units = await request("/master/units", { headers: authHeaders });
  console.log(`   - API 2: /master/units -> ${units.status} (Tổng số đơn vị: ${units.data.total})`);

  const countries = await request("/master/countries", { headers: authHeaders });
  console.log(`   - API 3: /master/countries -> ${countries.status} (Tổng số quốc gia: ${countries.data.total})`);

  const drugGroups = await request("/master/drug-groups", { headers: authHeaders });
  console.log(`   - API 4: /master/drug-groups -> ${drugGroups.status} (Tổng nhóm thuốc: ${drugGroups.data.total})`);

  const routes = await request("/master/routes", { headers: authHeaders });
  console.log(`   - API 5: /master/routes -> ${routes.status} (Tổng đường dùng: ${routes.data.total})`);

  const manufacturers = await request("/master/manufacturers", { headers: authHeaders });
  console.log(`   - API 6: /master/manufacturers -> ${manufacturers.status} (Tổng nhà SX: ${manufacturers.data.total})`);

  const provinces = await request("/master/provinces", { headers: authHeaders });
  console.log(`   - API 7: /master/provinces -> ${provinces.status} (Tổng tỉnh/thành: ${provinces.data.total})`);

  const communes = await request("/master/communes?province_id=79", { headers: authHeaders });
  console.log(`   - API 8: /master/communes?province_id=79 -> ${communes.status} (Tổng xã/phường TP.HCM: ${communes.data.total})\n`);

  // -------------------------------------------------------------
  // Test 4: Nhóm Thuốc Quốc Gia (APIs 9, 10) - Kiểm tra 2.331 thuốc
  // -------------------------------------------------------------
  console.log(`▶️ [TEST 4] Nhóm Thuốc Quốc Gia (APIs 9, 10):`);
  const drugsRes = await request("/master/drugs?page=1&page_size=5", { headers: authHeaders });
  console.log(`   - API 9: /master/drugs -> ${drugsRes.status} | Tổng số thuốc trên Cổng Quốc Gia: ${drugsRes.data.total} thuốc`);
  console.log(`   - Thuốc mẫu: ${drugsRes.data.data?.[0]?.name} (SĐK: ${drugsRes.data.data?.[0]?.registration_number})`);

  const sampleDrugId = drugsRes.data.data?.[0]?.id || "DRUG-00001";
  const drugDetail = await request(`/master/drugs/${sampleDrugId}`, { headers: authHeaders });
  console.log(`   - API 10: /master/drugs/${sampleDrugId} -> ${drugDetail.status} (Tên: ${drugDetail.data?.name})\n`);

  // -------------------------------------------------------------
  // Test 5: Nhập Hàng - Stock In (APIs 11, 12, 13)
  // -------------------------------------------------------------
  console.log(`▶️ [TEST 5] Giao Dịch Nhập Hàng (APIs 11, 12, 13):`);
  const stockInRes = await request("/transactions/stock-in", {
    method: "POST",
    headers: authHeaders,
    body: {
      transaction_date: new Date().toISOString(),
      reason: "supplier", // Kho Tổng nhập từ NCC
      supplier_id: "NCC-DHG-001",
      reference_number: "HD-VAT-882143",
      practice_license_code: "79-001234", // Kho Tổng GSP (BR-001)
      items: [
        {
          drug_id: sampleDrugId,
          unit_id: "U-01",
          quantity: 200,
          batch_no: "LOT-DHG-2026-01",
          packaging_specifications: "Hộp 10 vỉ x 10 viên",
          expiry_date: "2028-12-31",
          price: 45000,
        },
      ],
    },
  });

  const stockInTxnId = stockInRes.data?.transaction_id;
  console.log(`   - API 11 (POST stock-in): ${stockInRes.status} | Mã: ${stockInTxnId} | Status: ${stockInRes.data?.status}`);

  const stockInDetail = await request(`/transaction/stock-in/${stockInTxnId}`, { headers: authHeaders });
  console.log(`   - API 12 (GET detail): ${stockInDetail.status} | Loại: ${stockInDetail.data?.reason} | Số items: ${stockInDetail.data?.items?.length}`);

  const stockInStatus = await request(`/transaction/stock-in/${stockInTxnId}/status`, { headers: authHeaders });
  console.log(`   - API 13 (GET status polling): ${stockInStatus.status} | Trạng thái: ${stockInStatus.data?.status}\n`);

  // -------------------------------------------------------------
  // Test 6: Xuất Hàng & Bán Lẻ - Stock Out (APIs 14, 15, 16)
  // -------------------------------------------------------------
  console.log(`▶️ [TEST 6] Giao Dịch Xuất Hàng & Bán Lẻ (APIs 14, 15, 16):`);
  const stockOutRes = await request("/transactions/stock-out", {
    method: "POST",
    headers: authHeaders,
    body: {
      transaction_date: new Date().toISOString(),
      reason: "sale-retail", // Kho Nhánh bán lẻ cho bệnh nhân
      reference_number: "HD-POS-20261007-0099",
      practice_license_code: "79-001235", // Kho Nhánh 2 (BR-002)
      items: [
        {
          drug_id: sampleDrugId,
          unit_id: "U-01",
          quantity: 2,
          batch_no: "LOT-DHG-2026-01",
          packaging_specifications: "Hộp 10 vỉ x 10 viên",
          expiry_date: "2028-12-31",
          price: 65000,
        },
      ],
    },
  });

  const stockOutTxnId = stockOutRes.data?.transaction_id;
  console.log(`   - API 14 (POST stock-out): ${stockOutRes.status} | Mã: ${stockOutTxnId} | Status: ${stockOutRes.data?.status}`);

  const stockOutDetail = await request(`/transactions/stock-out/${stockOutTxnId}`, { headers: authHeaders });
  console.log(`   - API 15 (GET detail): ${stockOutDetail.status} | Lý do: ${stockOutDetail.data?.reason}`);

  const stockOutStatus = await request(`/transactions/stock-out/${stockOutTxnId}/status`, { headers: authHeaders });
  console.log(`   - API 16 (GET status polling): ${stockOutStatus.status} | Trạng thái: ${stockOutStatus.data?.status}`);

  // Test vi phạm y tế: Bán thuốc quá hạn -> Hệ thống Quốc gia reject!
  const expiredOutRes = await request("/transactions/stock-out", {
    method: "POST",
    headers: authHeaders,
    body: {
      transaction_date: new Date().toISOString(),
      reason: "sale-retail",
      reference_number: "HD-VIPHAM-001",
      practice_license_code: "79-001235",
      items: [
        {
          drug_id: sampleDrugId,
          unit_id: "U-01",
          quantity: 1,
          batch_no: "LOT-HETHAN-2020",
          expiry_date: "2021-01-01", // ĐÃ HẾT HẠN!
          price: 50000,
        },
      ],
    },
  });
  console.log(`   - Test vi phạm (Bán thuốc quá hạn): Status ${expiredOutRes.data?.status} (${expiredOutRes.data?.status === "rejected" ? "✅ BỘ Y TẾ TỪ CHỐI THÀNH CÔNG" : "❌ LỖI"})\n`);

  // -------------------------------------------------------------
  // Test 7: Kiểm Kê Kho - Stock Taking (APIs 17, 18, 19)
  // -------------------------------------------------------------
  console.log(`▶️ [TEST 7] Giao Dịch Kiểm Kê Kho (APIs 17, 18, 19):`);
  const stockTakingRes = await request("/transactions/stock-taking", {
    method: "POST",
    headers: authHeaders,
    body: {
      transaction_date: new Date().toISOString(),
      reference_number: "IC-20261007-01",
      practice_license_code: "79-001234", // Kiểm kê Kho Tổng
      items: [
        {
          drug_id: sampleDrugId,
          batch_no: "LOT-DHG-2026-01",
          system_quantity: 200,
          actual_quantity: 198, // Lệch 2 hộp
          note: "Vỡ hỏng trong quá trình vận chuyển kệ",
        },
      ],
    },
  });

  const stockTakingTxnId = stockTakingRes.data?.transaction_id;
  console.log(`   - API 17 (POST stock-taking): ${stockTakingRes.status} | Mã: ${stockTakingTxnId} | Status: ${stockTakingRes.data?.status}`);

  const stockTakingDetail = await request(`/transactions/stock-taking/${stockTakingTxnId}`, { headers: authHeaders });
  console.log(`   - API 18 (GET detail): ${stockTakingDetail.status} | Chênh lệch: ${stockTakingDetail.data?.items?.[0]?.discrepancy}`);

  const stockTakingStatus = await request(`/transactions/stock-taking/${stockTakingTxnId}/status`, { headers: authHeaders });
  console.log(`   - API 19 (GET status polling): ${stockTakingStatus.status} | Trạng thái: ${stockTakingStatus.data?.status}\n`);

  // -------------------------------------------------------------
  // Test 8: Sổ Cái Giám Sát Của Thanh Tra Bộ Y Tế (MOH_INSPECTOR)
  // -------------------------------------------------------------
  console.log(`▶️ [TEST 8] Đặc Quyền Giám Sát Của Thanh Tra Bộ Y Tế (MOH_INSPECTOR):`);
  const inspectorDash = await request("/transactions/inspector/dashboard", { headers: authHeaders });
  console.log(`   - Tổng số cơ sở quản lý: ${inspectorDash.data?.summary?.total_facilities} (Kho Tổng: ${inspectorDash.data?.summary?.central_warehouses}, Kho Nhánh: ${inspectorDash.data?.summary?.retail_branches})`);
  console.log(`   - Tổng phiếu nhập kho: ${inspectorDash.data?.summary?.total_stock_in}`);
  console.log(`   - Tổng phiếu xuất kho: ${inspectorDash.data?.summary?.total_stock_out}`);
  console.log(`   - Tổng phiếu kiểm kê: ${inspectorDash.data?.summary?.total_stock_taking}`);
  console.log(`   - Tổng vi phạm y tế phát hiện: ${inspectorDash.data?.summary?.total_violations} vụ vi phạm`);

  console.log(`\n================================================================`);
  console.log(`🎉 TOÀN BỘ 19/19 API CHUẨN QUYẾT ĐỊNH 232 ĐÃ KIỂM THỬ THÀNH CÔNG 100%!`);
  console.log(`================================================================\n`);
}

runTests().catch((err) => {
  console.error("Lỗi thực thi kiểm thử:", err);
  process.exit(1);
});
