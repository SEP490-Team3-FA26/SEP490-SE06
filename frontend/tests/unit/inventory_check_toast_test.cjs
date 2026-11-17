/**
 * Test Suite: Kiểm thử xác thực Form Kiểm kê kho & Hệ thống Toast y tế (GSP/GDP)
 * Phân chia đầy đủ 3 nhóm chuẩn: [Normal Values], [Boundary Values], [Abnormal Values]
 */

const assert = require("assert");

console.log("======================================================================");
console.log("🧪 BẮT ĐẦU CHẠY KIỂM THỬ XÁC THỰC KIỂM KÊ KHO & TOAST NOTIFICATION");
console.log("======================================================================");

// Giả lập logic kiểm định của InventoryCheck.tsx
function validateAddItem({ selectedMedId, selectedBatchId, actualStockInput, itemsList, systemStock, reasonInput }) {
  if (!selectedMedId || !selectedBatchId || actualStockInput === undefined || actualStockInput === null || String(actualStockInput).trim() === "") {
    return { valid: false, toast: { type: "warning", message: "Vui lòng điền đầy đủ thông tin thuốc, số lô và số lượng kiểm thực tế!" } };
  }

  const actual = Number(actualStockInput);
  const validActual = Number.isSafeInteger(actual) && actual >= 0;
  if (!validActual) {
    return { valid: false, toast: { type: "warning", message: "Số lượng kiểm thực tế phải là số nguyên không âm!" } };
  }

  if (itemsList.some(item => item.batchId === selectedBatchId)) {
    return { valid: false, toast: { type: "warning", message: "Lô thuốc này đã có trong danh sách kiểm kê!" } };
  }

  const difference = actual - systemStock;
  const reason = (reasonInput || "").trim();
  if (difference !== 0 && !reason) {
    return { valid: false, toast: { type: "warning", message: "Vui lòng ghi lý do khi số lượng thực tế lệch tồn sổ." } };
  }

  return {
    valid: true,
    item: {
      batchId: selectedBatchId,
      medicineId: selectedMedId,
      actualStock: actual,
      difference,
      reason,
    },
    toast: { type: "info", message: "Đã thêm thuốc vào danh sách kiểm kê" }
  };
}

function validateSubmitCheck({ itemsList }) {
  if (!itemsList || itemsList.length === 0) {
    return { valid: false, toast: { type: "warning", message: "Vui lòng thêm ít nhất 1 mặt hàng cần kiểm kê!" } };
  }
  return { valid: true, toast: { type: "success", message: "Lưu biên bản nháp thành công!" } };
}

// -------------------------------------------------------------
// 1. [Normal Values]
// -------------------------------------------------------------
console.log("\n--- 1. [Normal Values] Luồng nghiệp vụ chuẩn ---");

{
  const res = validateAddItem({
    selectedMedId: "med-01",
    selectedBatchId: "batch-01",
    actualStockInput: "50",
    itemsList: [],
    systemStock: 50,
    reasonInput: ""
  });
  assert.strictEqual(res.valid, true);
  assert.strictEqual(res.item.actualStock, 50);
  assert.strictEqual(res.item.difference, 0);
  assert.strictEqual(res.toast.type, "info");
  console.log("✔ [Normal] Thêm mặt hàng kiểm kê khớp tồn sổ thành công, kích hoạt Toast info.");
}

{
  const res = validateAddItem({
    selectedMedId: "med-02",
    selectedBatchId: "batch-02",
    actualStockInput: "45",
    itemsList: [],
    systemStock: 50,
    reasonInput: "Hao hụt rách vỉ trong quá trình bảo quản"
  });
  assert.strictEqual(res.valid, true);
  assert.strictEqual(res.item.difference, -5);
  assert.strictEqual(res.item.reason, "Hao hụt rách vỉ trong quá trình bảo quản");
  console.log("✔ [Normal] Thêm mặt hàng có lệch tồn kèm lý do thành công.");
}

{
  const res = validateSubmitCheck({
    itemsList: [{ batchId: "b-1", actualStock: 50 }]
  });
  assert.strictEqual(res.valid, true);
  assert.strictEqual(res.toast.type, "success");
  assert.strictEqual(res.toast.message, "Lưu biên bản nháp thành công!");
  console.log("✔ [Normal] Lưu biên bản nháp thành công, hiển thị Toast success.");
}

// -------------------------------------------------------------
// 2. [Boundary Values]
// -------------------------------------------------------------
console.log("\n--- 2. [Boundary Values] Giá trị biên kiểm kê ---");

{
  // Kiểm kê thực tế = 0 (hết sạch tồn kho)
  const res = validateAddItem({
    selectedMedId: "med-01",
    selectedBatchId: "batch-01",
    actualStockInput: "0",
    itemsList: [],
    systemStock: 10,
    reasonInput: "Đã xuất hết nhưng chưa trừ sổ"
  });
  assert.strictEqual(res.valid, true);
  assert.strictEqual(res.item.actualStock, 0);
  assert.strictEqual(res.item.difference, -10);
  console.log("✔ [Boundary] Số lượng thực tế bằng 0 (hết tồn) được chấp nhận hợp lệ.");
}

{
  // Số lượng thực tế rất lớn (1.000.000)
  const res = validateAddItem({
    selectedMedId: "med-01",
    selectedBatchId: "batch-01",
    actualStockInput: "1000000",
    itemsList: [],
    systemStock: 1000000,
    reasonInput: ""
  });
  assert.strictEqual(res.valid, true);
  assert.strictEqual(res.item.actualStock, 1000000);
  console.log("✔ [Boundary] Số lượng nguyên lớn an toàn trong ngưỡng Number.isSafeInteger.");
}

// -------------------------------------------------------------
// 3. [Abnormal Values]
// -------------------------------------------------------------
console.log("\n--- 3. [Abnormal Values] Dữ liệu dị thường & Chặn lỗi ---");

{
  // Thiếu thông tin thuốc hoặc số lượng
  const res = validateAddItem({
    selectedMedId: "",
    selectedBatchId: "",
    actualStockInput: "",
    itemsList: [],
    systemStock: 0,
    reasonInput: ""
  });
  assert.strictEqual(res.valid, false);
  assert.strictEqual(res.toast.type, "warning");
  assert.strictEqual(res.toast.message, "Vui lòng điền đầy đủ thông tin thuốc, số lô và số lượng kiểm thực tế!");
  console.log("✔ [Abnormal] Chặn khi thiếu thuốc/lô/số lượng, bật Toast cảnh báo màu vàng.");
}

{
  // Số lượng âm
  const res = validateAddItem({
    selectedMedId: "med-01",
    selectedBatchId: "batch-01",
    actualStockInput: "-5",
    itemsList: [],
    systemStock: 10,
    reasonInput: ""
  });
  assert.strictEqual(res.valid, false);
  assert.strictEqual(res.toast.type, "warning");
  assert.strictEqual(res.toast.message, "Số lượng kiểm thực tế phải là số nguyên không âm!");
  console.log("✔ [Abnormal] Chặn số lượng âm (< 0), bật Toast cảnh báo.");
}

{
  // Số lượng là số thực (thập phân)
  const res = validateAddItem({
    selectedMedId: "med-01",
    selectedBatchId: "batch-01",
    actualStockInput: "12.5",
    itemsList: [],
    systemStock: 10,
    reasonInput: ""
  });
  assert.strictEqual(res.valid, false);
  assert.strictEqual(res.toast.type, "warning");
  console.log("✔ [Abnormal] Chặn số lượng thập phân không nguyên vẹn.");
}

{
  // Trùng lô thuốc trong cùng 1 biên bản
  const res = validateAddItem({
    selectedMedId: "med-01",
    selectedBatchId: "batch-01",
    actualStockInput: "10",
    itemsList: [{ batchId: "batch-01" }],
    systemStock: 10,
    reasonInput: ""
  });
  assert.strictEqual(res.valid, false);
  assert.strictEqual(res.toast.type, "warning");
  assert.strictEqual(res.toast.message, "Lô thuốc này đã có trong danh sách kiểm kê!");
  console.log("✔ [Abnormal] Chặn trùng lặp lô thuốc trong biên bản.");
}

{
  // Lệch tồn nhưng không ghi lý do
  const res = validateAddItem({
    selectedMedId: "med-01",
    selectedBatchId: "batch-01",
    actualStockInput: "15",
    itemsList: [],
    systemStock: 10,
    reasonInput: "   " // rỗng
  });
  assert.strictEqual(res.valid, false);
  assert.strictEqual(res.toast.type, "warning");
  assert.strictEqual(res.toast.message, "Vui lòng ghi lý do khi số lượng thực tế lệch tồn sổ.");
  console.log("✔ [Abnormal] Bắt buộc ghi lý do khi có chênh lệch tồn sổ.");
}

{
  // Lưu biên bản khi danh sách trống
  const res = validateSubmitCheck({ itemsList: [] });
  assert.strictEqual(res.valid, false);
  assert.strictEqual(res.toast.type, "warning");
  assert.strictEqual(res.toast.message, "Vui lòng thêm ít nhất 1 mặt hàng cần kiểm kê!");
  console.log("✔ [Abnormal] Chặn lưu biên bản rỗng mặt hàng.");
}

console.log("\n======================================================================");
console.log("🎉 TẤT CẢ CÁC BÀI TEST KIỂM KÊ KHO & TOAST NOTIFICATION ĐỀU ĐẠT 100%!");
console.log("======================================================================");
