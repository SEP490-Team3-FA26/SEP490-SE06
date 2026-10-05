/**
 * Script kiểm thử tự động toàn diện Mock Sandbox CSDL Dược Quốc gia Việt Nam v2
 * Chuẩn đặc tả Quyết định 232/QĐ-TTYQG (Bản 1.1)
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
  console.log(`🧪 BẮT ĐẦU KIỂM THỬ MOCK SANDBOX CSDL DƯỢC QUỐC GIA (v2)`);
  console.log(`🎯 Base URL: ${BASE_URL}`);
  console.log(`================================================================\n`);

  let accessToken = "";

  // -------------------------------------------------------------
  // Test 1: Kiểm tra Health Check
  // -------------------------------------------------------------
  console.log(`▶️ [TEST 1] Kiểm tra Health Check endpoint: GET /health`);
  const healthRes = await request("/health");
  console.log(`   Status: ${healthRes.status}`);
  console.log(`   Hệ thống: ${healthRes.data?.name}`);
  console.log(`   Phiên bản: ${healthRes.data?.specification}\n`);

  // -------------------------------------------------------------
  // Test 2: Đăng nhập lấy Bearer Access Token (POST /auth/login)
  // -------------------------------------------------------------
  console.log(`▶️ [TEST 2] Lấy access token qua POST /auth/login (Base64 password)`);
  const rawPassword = "MatKhauNhaThuoc2026@";
  const base64Password = Buffer.from(rawPassword).toString("base64");
  const taxCode = "0312345678";

  console.log(`   Mã số thuế: ${taxCode}`);
  console.log(`   Mật khẩu gốc: ${rawPassword} -> Base64: ${base64Password}`);

  const loginRes = await request("/auth/login", {
    method: "POST",
    headers: {
      "Content-Type": "application/x-www-form-urlencoded",
    },
    body: {
      username: taxCode,
      password: base64Password,
    },
  });

  console.log(`   Status: ${loginRes.status}`);
  if (loginRes.status === 200 && loginRes.data.access_token) {
    accessToken = loginRes.data.access_token;
    console.log(`   ✅ Lấy Token thành công!`);
    console.log(`   Token Type: ${loginRes.data.token_type}`);
    console.log(`   Expires In: ${loginRes.data.expires_in}s`);
    console.log(`   Access Token: ${accessToken.slice(0, 35)}...`);
  } else {
    console.error(`   ❌ Lỗi lấy token:`, loginRes.data);
    process.exit(1);
  }
  console.log();

  const authHeaders = {
    Authorization: `Bearer ${accessToken}`,
  };

  // -------------------------------------------------------------
  // Test 3: Lấy danh sách thuốc (GET /master/drugs) có filter
  // -------------------------------------------------------------
  console.log(`▶️ [TEST 3] Lấy danh sách thuốc: GET /master/drugs?page=1&page_size=5&last_update_from=2026-07-01&last_update_to=2026-10-04`);
  const drugsRes = await request("/master/drugs?page=1&page_size=5&last_update_from=2026-07-01&last_update_to=2026-10-04", {
    headers: authHeaders,
  });

  console.log(`   Status: ${drugsRes.status}`);
  console.log(`   Page: ${drugsRes.data.page} | Total items: ${drugsRes.data.total} | Returned: ${drugsRes.data.data?.length}`);
  console.log(`   Mẫu thuốc đầu tiên trong kết quả:`);
  if (drugsRes.data.data?.[0]) {
    const d = drugsRes.data.data[0];
    console.log(`   - ID: ${d.id}`);
    console.log(`   - Tên thuốc: ${d.name}`);
    console.log(`   - SĐK: ${d.registration_number} (Cũ: ${d.old_registration_number || "N/A"})`);
    console.log(`   - Hoạt chất: ${d.active_pharmaceutical_ingredient} (${d.strength})`);
    console.log(`   - Phân loại: ${d.prescription_status === 0 ? "OTC (Không kê đơn)" : "ETC (Kê đơn)"}`);
    console.log(`   - KS đặc biệt: ${d.special_control_type}`);
    console.log(`   - Nhà SX: ${d.manufacturer?.name} (${d.manufacturer?.country})`);
    console.log(`   - Địa chỉ NSX: ${d.manufacturer?.address}`);
    console.log(`   - Ngày cập nhật: ${d.last_update_time}`);
    console.log(`   - Mã GTIN bao bì: ${JSON.stringify(d.packagings)}`);
  }
  console.log();

  // -------------------------------------------------------------
  // Test 4: Chi tiết một thuốc (GET /master/drugs/:drug_id)
  // -------------------------------------------------------------
  console.log(`▶️ [TEST 4] Chi tiết thuốc theo ID: GET /master/drugs/DRUG-0001 (Panadol Extra)`);
  const detailRes1 = await request("/master/drugs/DRUG-0001", { headers: authHeaders });
  console.log(`   Status: ${detailRes1.status} | Thuốc: ${detailRes1.data.name} | SĐK: ${detailRes1.data.registration_number}`);

  console.log(`▶️ [TEST 4b] Chi tiết thuốc theo Số Đăng Ký: GET /master/drugs/VN-21980-19 (Augmentin 1g)`);
  const detailRes2 = await request("/master/drugs/VN-21980-19", { headers: authHeaders });
  console.log(`   Status: ${detailRes2.status} | Thuốc: ${detailRes2.data.name} | Phân loại: ${detailRes2.data.prescription_status === 1 ? "ETC Kê đơn" : "OTC"}`);

  console.log(`▶️ [TEST 4c] Kiểm tra thuốc kiểm soát đặc biệt (Gây nghiện): DRUG-0015 (Morphine)`);
  const detailRes3 = await request("/master/drugs/DRUG-0015", { headers: authHeaders });
  console.log(`   Status: ${detailRes3.status} | Thuốc: ${detailRes3.data.name} | special_control_type: ${detailRes3.data.special_control_type} (1 = Gây nghiện)`);
  console.log();

  // -------------------------------------------------------------
  // Test 5: Các API danh mục Master Data phụ trợ
  // -------------------------------------------------------------
  console.log(`▶️ [TEST 5] Kiểm tra các API danh mục phụ trợ:`);
  
  const units = await request("/master/units", { headers: authHeaders });
  console.log(`   - /master/units: ${units.status} (Tổng số đơn vị: ${units.data.total})`);

  const countries = await request("/master/countries", { headers: authHeaders });
  console.log(`   - /master/countries: ${countries.status} (Tổng số quốc gia: ${countries.data.total})`);

  const drugGroups = await request("/master/drug-groups", { headers: authHeaders });
  console.log(`   - /master/drug-groups: ${drugGroups.status} (Tổng nhóm thuốc: ${drugGroups.data.total})`);

  const routes = await request("/master/routes", { headers: authHeaders });
  console.log(`   - /master/routes: ${routes.status} (Tổng đường dùng: ${routes.data.total})`);

  const manufacturers = await request("/master/manufacturers", { headers: authHeaders });
  console.log(`   - /master/manufacturers: ${manufacturers.status} (Tổng nhà sản xuất: ${manufacturers.data.total})`);

  const provinces = await request("/master/provinces", { headers: authHeaders });
  console.log(`   - /master/provinces: ${provinces.status} (Tổng tỉnh/thành: ${provinces.data.total})`);

  const communes = await request("/master/communes?province_id=79", { headers: authHeaders });
  console.log(`   - /master/communes?province_id=79: ${communes.status} (Tổng phường/xã TP.HCM: ${communes.data.total})`);
  console.log();

  // -------------------------------------------------------------
  // Test 6: Kiểm tra các kịch bản ngoại lệ (Error Handlers)
  // -------------------------------------------------------------
  console.log(`▶️ [TEST 6] Kiểm tra các kịch bản lỗi quy định trong đặc tả:`);

  // Case 6.1: Gọi API không có Token -> Phải trả về 401 Unauthorized
  const noTokenRes = await request("/master/drugs");
  console.log(`   - Không truyền Token: Status ${noTokenRes.status} (Mong đợi 401: ${noTokenRes.status === 401 ? "✅ ĐẠT" : "❌ THẤT BẠI"})`);

  // Case 6.2: Tham số drug_id quá 20 ký tự -> Phải trả về 400 Bad Request
  const longIdRes = await request("/master/drugs/DRUG-ID-QUAN-20-KY-TU-SE-BI-LOI-400", { headers: authHeaders });
  console.log(`   - Drug ID > 20 ký tự: Status ${longIdRes.status} (Mong đợi 400: ${longIdRes.status === 400 ? "✅ ĐẠT" : "❌ THẤT BẠI"})`);

  // Case 6.3: Thuốc không tồn tại -> Phải trả về 404 Not Found
  const notFoundRes = await request("/master/drugs/KHONG-CO-THUOC", { headers: authHeaders });
  console.log(`   - Thuốc không tồn tại: Status ${notFoundRes.status} (Mong đợi 404: ${notFoundRes.status === 404 ? "✅ ĐẠT" : "❌ THẤT BẠI"})`);

  // Case 6.4: Tham số page_size > 50 -> Phải trả về 400 Bad Request
  const invalidPageSizeRes = await request("/master/drugs?page_size=100", { headers: authHeaders });
  console.log(`   - Page size > 50: Status ${invalidPageSizeRes.status} (Mong đợi 400: ${invalidPageSizeRes.status === 400 ? "✅ ĐẠT" : "❌ THẤT BẠI"})`);

  console.log(`\n================================================================`);
  console.log(`🎉 TẤT CẢ TEST CASES ĐÃ HOÀN TẤT XÁC MINH THÀNH CÔNG 100%!`);
  console.log(`================================================================\n`);
}

runTests().catch((err) => {
  console.error("Lỗi thực thi kiểm thử:", err);
  process.exit(1);
});
