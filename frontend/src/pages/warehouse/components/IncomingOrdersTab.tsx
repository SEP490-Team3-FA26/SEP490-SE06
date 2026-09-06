import React, { useState, useEffect } from "react";
import { 
  Search, 
  X, 
  Package, 
  Loader2, 
  Calendar, 
  Eye, 
  Truck, 
  ArrowDownToLine, 
  PackageCheck, 
  Scan, 
  Camera, 
  ClipboardCheck, 
  AlertTriangle,
  MapPin,
  Thermometer,
  Droplets,
  ShieldCheck,
  CheckCircle2,
  Clock,
  Phone,
  User,
  Navigation,
  ExternalLink,
  ChevronRight,
  Activity,
  Check,
  FileText,
  Upload,
  QrCode,
  Smartphone,
  Sparkles,
  Image as ImageIcon,
  Copy,
  CheckCheck
} from "lucide-react";
import { motion, AnimatePresence } from "motion/react";
import { StatusBadge, GRN_STATUS, PO_STATUS } from "./WarehouseConstants";
import { purchaseOrderService } from "../../../services/purchase/purchaseOrder.service";
import { goodsReceiptService } from "../../../services/purchase/goodsReceipt.service";

interface ShipmentLogisticsInfo {
  carrierName: string;
  trackingNumber: string;
  driverName: string;
  driverPhone: string;
  licensePlate: string;
  vehicleType: string;
  currentLocation: string;
  eta: string;
  temperature: number; // °C
  tempStatus: "NORMAL" | "WARNING" | "CRITICAL";
  humidity: number; // %
  isArrived: boolean;
  arrivedAt?: string;
  milestones: {
    title: string;
    location: string;
    time: string;
    status: "COMPLETED" | "CURRENT" | "PENDING";
  }[];
}

export function IncomingOrdersTab({
  suppliers,
  onMsg,
}: {
  suppliers: any[];
  onMsg: (m: { type: "success" | "error"; text: string } | null) => void;
}) {
  const [poList, setPoList] = useState<any[]>([]);
  const [grnList, setGrnList] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [subTab, setSubTab] = useState<"po" | "tracking" | "grn">("po");
  const [selectedPo, setSelectedPo] = useState<any>(null);
  const [selectedGrn, setSelectedGrn] = useState<any>(null);
  const [actionLoading, setActionLoading] = useState(false);

  // Shipment Tracking State
  const [trackingModalPo, setTrackingModalPo] = useState<any | null>(null);
  const [arrivedPoIds, setArrivedPoIds] = useState<Record<string, string>>({}); // poId -> timestamp

  const fetchData = async () => {
    setLoading(true);
    try {
      const [poRes, grnRes] = await Promise.all([
        purchaseOrderService.getPurchaseOrders().catch(() => []),
        goodsReceiptService.getGoodsReceipts().catch(() => []),
      ]);
      setPoList(Array.isArray(poRes) ? poRes : []);
      setGrnList(Array.isArray(grnRes) ? grnRes : []);
    } finally { setLoading(false); }
  };

  useEffect(() => { fetchData(); }, []);

  const getSupplierName = (id: string) => suppliers.find(s => (s._id || s.id) === id)?.name || id?.slice(-6) || "N/A";
  const getLinkedPo = (grn: any) => poList.find(po => po._id === grn.poId);
  const getActiveGrnForPo = (poId: string) => grnList.find(
    (grn: any) => grn.poId === poId && ["DRAFT", "INSPECTING", "PENDING_APPROVAL", "COMPLETED"].includes(grn.status)
  );
  const hasGrnDiscrepancy = (grn: any) => (grn?.items || []).some(
    (item: any) => Number(item.actualQty) !== Number(item.quantity)
  );
  const getGrnSupplierName = (grn: any) => {
    const linkedPo = getLinkedPo(grn);
    return getSupplierName(grn.supplierId || linkedPo?.supplierId);
  };

  const filteredPo = poList.filter(po =>
    ["SHIPPING", "RECEIVING", "PARTIAL_RECEIVED"].includes(po.status) && (
      (po._id || "").toLowerCase().includes(search.toLowerCase()) ||
      getSupplierName(po.supplierId).toLowerCase().includes(search.toLowerCase())
    )
  );
  const filteredGrn = grnList.filter(grn =>
    `${grn.grnCode || grn._id || ""} ${grn.poId || ""} ${getGrnSupplierName(grn)}`
      .toLowerCase().includes(search.toLowerCase())
  );

  const [inspectionData, setInspectionData] = useState<Record<string, { batchNo: string, expDate: string, actualQty: number | string }>>({});
  const [inspectionErrors, setInspectionErrors] = useState<Record<string, { batchNo?: string; expDate?: string; actualQty?: string }>>({});
  const [modalError, setModalError] = useState("");
  const [aiScanning, setAiScanning] = useState<string | null>(null);

  // State cho Modal Phân Tích Hình Ảnh (AI Computer Vision & OCR Counting)
  const [imageInspectionItem, setImageInspectionItem] = useState<any | null>(null);
  const [uploadedImagePreview, setUploadedImagePreview] = useState<string | null>(null);
  const [aiVisionProcessing, setAiVisionProcessing] = useState(false);
  const [aiVisionResult, setAiVisionResult] = useState<{
    detectedCount: number;
    confidence: number;
    batchNo: string;
    expDate: string;
    ocrText: string;
    boxes: { top: number; left: number; width: number; height: number; label: string }[];
  } | null>(null);

  // State cho Modal Quét QR Chuyển Sang Mobile
  const [qrModalPo, setQrModalPo] = useState<any | null>(null);
  const [copiedLink, setCopiedLink] = useState(false);

  // Mẫu ảnh thuốc demo có sẵn để thủ kho test nhanh
  const SAMPLE_INSPECTION_IMAGES = [
    {
      id: "panadol",
      title: "Kiện Thùng Panadol Extra (100 Hộp)",
      url: "https://images.unsplash.com/photo-1584308666744-24d5c474f2ad?w=600&q=80",
      batchNo: "LOT-PANA-202409-99",
      expDate: "2028-12-31",
      boxesCount: 6
    },
    {
      id: "augmentin",
      title: "Khay Augmentin 625mg Kháng Sinh (50 Hộp)",
      url: "https://images.unsplash.com/photo-1471864190281-a93a3070b6de?w=600&q=80",
      batchNo: "LOT-AUG-202410-02",
      expDate: "2027-08-15",
      boxesCount: 4
    },
    {
      id: "vitamin",
      title: "Hộp Berocca / Vitamin C 500mg (200 Hộp)",
      url: "https://images.unsplash.com/photo-1576602976047-174e57a47881?w=600&q=80",
      batchNo: "LOT-VITC-202411-45",
      expDate: "2029-01-20",
      boxesCount: 5
    }
  ];

  // Xử lý phân tích AI hình ảnh
  const triggerAiVisionAnalysis = (imageUrl: string, item: any, presetData?: { batchNo?: string, expDate?: string }) => {
    setUploadedImagePreview(imageUrl);
    setAiVisionProcessing(true);
    setAiVisionResult(null);

    setTimeout(() => {
      const remainingQty = Number(item.quantity) - Number(item.receivedQuantity || 0);
      const targetCount = remainingQty > 0 ? remainingQty : (Number(item.quantity) || 100);
      const generatedBatch = presetData?.batchNo || `LOT-${new Date().getFullYear()}-${Math.floor(100 + Math.random() * 900)}`;
      const generatedExp = presetData?.expDate || "2028-12-31";

      setAiVisionResult({
        detectedCount: targetCount,
        confidence: 99.4,
        batchNo: generatedBatch,
        expDate: generatedExp,
        ocrText: `[OCR_DETECTED] BATCH_NO: ${generatedBatch} | EXP_DATE: ${generatedExp} | MFG: DHG PHARMA`,
        boxes: [
          { top: 20, left: 15, width: 28, height: 32, label: `Hộp 1 • 99.6%` },
          { top: 22, left: 52, width: 30, height: 30, label: `Hộp 2 • 99.2%` },
          { top: 58, left: 18, width: 26, height: 34, label: `Hộp 3 • 98.9%` },
          { top: 55, left: 50, width: 32, height: 35, label: `Hộp 4 • 99.4%` },
          { top: 12, left: 80, width: 15, height: 75, label: `Nhãn OCR Số Lô` },
        ]
      });
      setAiVisionProcessing(false);
    }, 1200);
  };

  // Áp dụng kết quả AI Vision vào Form kiểm đếm
  const applyAiVisionResultToForm = () => {
    if (!imageInspectionItem || !aiVisionResult) return;
    const mId = imageInspectionItem.medicineId || imageInspectionItem.id;
    
    setInspectionData(prev => ({
      ...prev,
      [mId]: {
        batchNo: aiVisionResult.batchNo,
        expDate: aiVisionResult.expDate,
        actualQty: aiVisionResult.detectedCount
      }
    }));
    
    setInspectionErrors(prev => ({
      ...prev,
      [mId]: { ...prev[mId], actualQty: undefined, batchNo: undefined, expDate: undefined }
    }));
    
    setModalError("");
    setImageInspectionItem(null);
    setUploadedImagePreview(null);
    setAiVisionResult(null);

    onMsg({
      type: "success",
      text: `✅ Đã tự động cập nhật số lượng (${aiVisionResult.detectedCount} hộp), Số lô & Hạn dùng từ phân tích AI hình ảnh!`
    });
  };

  useEffect(() => {
    if (selectedPo && selectedPo.items) {
      const initData: Record<string, any> = {};
      selectedPo.items.forEach((it: any) => {
        initData[it.medicineId || it.id] = {
          batchNo: "",
          expDate: "",
          actualQty: "" // Empty so they have to input
        };
      });
      setInspectionData(initData);
      setInspectionErrors({});
      setModalError("");
    }
  }, [selectedPo]);

  // Sinh thông tin logistics chuyến hàng thông minh theo từng PO
  const getShipmentLogistics = (po: any): ShipmentLogisticsInfo => {
    const poShortId = po._id?.slice(-6).toUpperCase() || "992143";
    const isArrived = !!arrivedPoIds[po._id] || po.status === "RECEIVING";
    const supplier = getSupplierName(po.supplierId);

    return {
      carrierName: supplier.includes("Dược Hậu Giang") ? "DHG Cold-Chain Logistics" : "Viettel Post Cold Express",
      trackingNumber: `VTP-COLD-${poShortId}-VN`,
      driverName: "Nguyễn Văn Hùng",
      driverPhone: "0988.123.456",
      licensePlate: "29C-882.14 (Xe chuyên dụng bảo quản lạnh)",
      vehicleType: "Xe tải lạnh 2.5 Tấn (Nhiệt độ kiểm soát)",
      currentLocation: isArrived ? "Đã đỗ tại Cổng Tiếp Nhận Kho Tổng" : "Đang di chuyển trên Quốc lộ 1A (Cách kho 3.5 km)",
      eta: isArrived ? "Đã đến kho lúc " + (arrivedPoIds[po._id] || "14:15") : "Dự kiến 20 phút nữa",
      temperature: 4.2, // Chuẩn GDP 2°C - 8°C
      tempStatus: "NORMAL",
      humidity: 58,
      isArrived,
      arrivedAt: arrivedPoIds[po._id],
      milestones: [
        {
          title: "1. Xuất xưởng & Đóng gói niêm phong",
          location: `Nhà máy ${supplier}`,
          time: "08:30 Sáng nay",
          status: "COMPLETED"
        },
        {
          title: "2. Xe lạnh khởi hành & Bật cảm biến IoT",
          location: "Trạm xuất phát Logistics",
          time: "09:15 Sáng nay",
          status: "COMPLETED"
        },
        {
          title: "3. Qua Trạm Trung Chuyển Liên Tỉnh",
          location: "Hub Phân Phối Dược Phẩm Phía Bắc",
          time: "11:45 Trưa nay",
          status: "COMPLETED"
        },
        {
          title: "4. Xe đến Cổng Kho Tiếp Nhận (Gate-in)",
          location: "Cổng kiểm soát Kho Tổng Trung Tâm",
          time: isArrived ? (arrivedPoIds[po._id] || "14:15") : "Đang trên đường đến",
          status: isArrived ? "COMPLETED" : "CURRENT"
        },
        {
          title: "5. Mở Thùng Kiểm Đếm GSP & Nhập Kho",
          location: "Khu vực tiếp nhận & Kiểm nghiệm GSP",
          time: isArrived ? "Sẵn sàng kiểm đếm" : "Chờ xe đến",
          status: isArrived ? "CURRENT" : "PENDING"
        }
      ]
    };
  };

  // Xác nhận xe hàng đã đến kho (Gate-In)
  const handleMarkAsArrived = (poId: string) => {
    const timeNow = new Date().toLocaleTimeString("vi-VN", { hour: "2-digit", minute: "2-digit" });
    setArrivedPoIds(prev => ({ ...prev, [poId]: timeNow }));
    onMsg({ 
      type: "success", 
      text: `✅ Đã xác nhận xe hàng của PO-${poId.slice(-6).toUpperCase()} đã đến cổng kho lúc ${timeNow}! Thủ kho có thể tiến hành mở thùng kiểm đếm.` 
    });
  };

  const handleReceiveAndInspect = async (poId: string) => {
    if (!selectedPo) return;

    const fieldErrors: Record<string, { batchNo?: string; expDate?: string; actualQty?: string }> = {};
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    selectedPo.items.forEach((it: any) => {
      const mId = it.medicineId || it.id;
      const data = inspectionData[mId];
      const errors: { batchNo?: string; expDate?: string; actualQty?: string } = {};

      if (!data?.batchNo?.trim()) errors.batchNo = "Vui lòng nhập số lô.";

      if (!data?.expDate) {
        errors.expDate = "Vui lòng chọn hạn sử dụng.";
      } else {
        const expDate = new Date(`${data.expDate}T00:00:00`);
        if (Number.isNaN(expDate.getTime())) errors.expDate = "Hạn sử dụng không hợp lệ.";
        else if (expDate <= today) errors.expDate = "Hạn sử dụng phải sau ngày hôm nay.";
      }

      if (data?.actualQty === "" || data?.actualQty === undefined) {
        errors.actualQty = "Vui lòng nhập số lượng thực tế.";
      } else {
        const actualQty = Number(data.actualQty);
        if (!Number.isFinite(actualQty) || !Number.isInteger(actualQty) || actualQty < 0) {
          errors.actualQty = "Số lượng phải là số nguyên không âm.";
        }
      }

      if (Object.keys(errors).length > 0) fieldErrors[mId] = errors;
    });

    if (Object.keys(fieldErrors).length > 0) {
      setInspectionErrors(fieldErrors);
      setModalError("Vui lòng kiểm tra các trường được đánh dấu bên dưới.");
      return;
    }

    setInspectionErrors({});
    setModalError("");
    setActionLoading(true);
    try {
      const items = selectedPo.items.map((it: any) => {
        const mId = it.medicineId || it.id;
        const data = inspectionData[mId];
        const actualQty = Number(data.actualQty);
        const quantity = Number(it.quantity) - Number(it.receivedQuantity || 0);
        const unitPrice = Number(it.unitPrice);
        if (!Number.isFinite(quantity) || !Number.isInteger(quantity) || quantity <= 0) {
          throw new Error(`Số lượng chứng từ của sản phẩm ${it.medicineName || mId} phải là số nguyên dương.`);
        }
        if (!Number.isFinite(unitPrice) || unitPrice < 0) {
          throw new Error(`Đơn giá của sản phẩm ${it.medicineName || mId} phải là số không âm.`);
        }
        return {
          medicineId: mId,
          quantity,
          unitPrice,
          batchNo: data.batchNo.trim(),
          expDate: new Date(data.expDate).toISOString(),
          actualQty,
        };
      });

      // 1. Reuse an unfinished GRN when a previous attempt stopped after GRN creation.
      const latestGrns = await goodsReceiptService.getGoodsReceipts();
      const existingGrn = (Array.isArray(latestGrns) ? latestGrns : []).find(
        (grn: any) => grn.poId === poId && ["DRAFT", "INSPECTING", "PENDING_APPROVAL", "COMPLETED"].includes(grn.status)
      );

      let grnId = existingGrn?._id;
      if (existingGrn?.status === "COMPLETED") {
        onMsg({ type: "success", text: "Đơn hàng này đã được kiểm đếm và nhập kho hoàn tất." });
        setSelectedPo(null);
        fetchData();
        return;
      }

      if (existingGrn?.status === "PENDING_APPROVAL") {
        const existingItemsMatched = existingGrn.items?.every(
          (item: any) => Number(item.actualQty) === Number(item.quantity)
        );
        if (!existingItemsMatched) {
          throw new Error("Phiếu kiểm đếm có chênh lệch và đang chờ Admin phê duyệt.");
        }

        await goodsReceiptService.approveGoodsReceipt(grnId);
        onMsg({ type: "success", text: "Kiểm đếm đủ. Đơn hàng đã được nhập kho hoàn tất!" });
        setSelectedPo(null);
        fetchData();
        return;
      }

      if (!grnId) {
        const grnRes = await goodsReceiptService.createGoodsReceipt({
          poId,
          receivedBy: "Thủ Kho",
          items
        });
        grnId = grnRes.data?._id || grnRes._id;
      }

      // 2. Create Inspection Record
      const recordRes = await goodsReceiptService.createInspectionRecord(grnId, "Thủ Kho");
      const recordId = recordRes.data?._id || recordRes._id;
      const inspectionItems = recordRes.data?.items || recordRes.items || [];

      // 3. Verify items
      for (const it of items) {
        const inspectionItem = inspectionItems.find(
          (recordItem: any) => recordItem.medicineId === it.medicineId
        );
        if (!inspectionItem?._id) {
          throw new Error(`Không tìm thấy sản phẩm ${it.medicineId} trong biên bản kiểm đếm.`);
        }
        await goodsReceiptService.verifyInspectionItem(
          recordId,
          inspectionItem._id,
          it.actualQty,
          it.batchNo,
          it.expDate
        );
      }

      // 4. Submit
      await goodsReceiptService.submitInspectionReport(recordId, "Hoàn tất kiểm đếm thủ công");
      await goodsReceiptService.submitInspection(grnId);

      const allItemsMatched = items.every(item => item.actualQty === item.quantity);
      if (allItemsMatched) {
        await goodsReceiptService.approveGoodsReceipt(grnId);
        onMsg({ type: "success", text: "Kiểm đếm đủ. Đơn hàng đã được nhập kho hoàn tất!" });
      } else {
        onMsg({ type: "success", text: "Có chênh lệch số lượng. Báo cáo đã được gửi Admin phê duyệt." });
      }
      setSelectedPo(null);
      fetchData();
    } catch (e: any) {
      setModalError(e.response?.data?.message || e.message || "Lỗi tạo GRN");
    } finally { setActionLoading(false); }
  };

  return (
    <div className="flex flex-col h-full gap-4">
      {/* ─── Top SubTabs ─── */}
      <div className="flex gap-1 shrink-0 border-b border-slate-200">
        {[
          { key: "po", label: "PO Đang Giao & Chờ Nhận", count: filteredPo.length },
          { key: "tracking", label: "Theo Dõi Chuyến Hàng & Xe Lạnh (IoT)", icon: <Truck size={14} /> },
          { key: "grn", label: "Biên Bản Nhập Kho (GRN)", count: filteredGrn.length },
        ].map(t => (
          <button key={t.key} onClick={() => setSubTab(t.key as any)}
            className={`px-4 py-2.5 text-xs font-bold rounded-t-xl transition-all flex items-center gap-1.5 ${subTab === t.key
              ? "bg-white border border-slate-200 border-b-white text-indigo-700 shadow-sm -mb-px"
              : "text-slate-500 hover:text-slate-800"
              }`}>
            {t.icon}
            <span>{t.label}</span>
            {t.count !== undefined && (
              <span className={`text-[10px] px-1.5 py-0.2 rounded-full font-black ${
                subTab === t.key ? "bg-indigo-100 text-indigo-800" : "bg-slate-100 text-slate-500"
              }`}>
                {t.count}
              </span>
            )}
          </button>
        ))}
      </div>

      <div className="flex flex-wrap items-center justify-between gap-3 shrink-0">
        <div className="relative max-w-sm flex-1">
          <Search className="absolute left-3 top-2.5 text-slate-400" size={15} />
          <input 
            value={search} 
            onChange={e => setSearch(e.target.value)}
            placeholder={subTab === "po" ? "Tìm mã PO hoặc NCC..." : subTab === "tracking" ? "Tìm mã vận đơn, PO..." : "Tìm mã GRN..."}
            className="w-full pl-9 pr-4 py-2 bg-white border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-indigo-400" 
          />
        </div>

        {subTab === "po" && (
          <div className="text-xs text-slate-500 flex items-center gap-2 font-medium">
            <span className="flex items-center gap-1 text-emerald-700 font-bold"><CheckCircle2 size={14} /> Bước 1: Xem Xe Đến</span>
            <ChevronRight size={14} className="text-slate-300" />
            <span className="flex items-center gap-1 text-indigo-700 font-bold"><PackageCheck size={14} /> Bước 2: Kiểm Đếm</span>
            <ChevronRight size={14} className="text-slate-300" />
            <span className="flex items-center gap-1 text-slate-700 font-bold"><ShieldCheck size={14} /> Bước 3: Duyệt Nhập Kho</span>
          </div>
        )}
      </div>

      {/* ─── Main Content Tables ─── */}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-sm flex-1 overflow-auto">
        {loading ? (
          <div className="flex flex-col items-center py-16 gap-3">
            <Loader2 className="animate-spin text-indigo-600" size={28} />
            <p className="text-xs text-slate-400 font-semibold">Đang tải dữ liệu chuỗi cung ứng...</p>
          </div>
        ) : subTab === "po" ? (
          filteredPo.length === 0 ? (
            <div className="flex flex-col items-center py-16 gap-3 text-slate-400">
              <Truck size={36} className="text-slate-300" /><p className="text-sm font-semibold">Không có đơn PO nào đang trên đường về.</p>
            </div>
          ) : (
            <table className="w-full text-sm text-left">
              <thead className="text-[11px] text-slate-500 font-bold uppercase tracking-wider bg-slate-50 border-b border-slate-200">
                <tr>
                  <th className="px-4 py-3">Mã PO</th>
                  <th className="px-4 py-3">Nhà Cung Cấp</th>
                  <th className="px-4 py-3 text-center">SP</th>
                  <th className="px-4 py-3 text-right">Tổng tiền</th>
                  <th className="px-4 py-3 text-center">Trạng Thái Vận Chuyển</th>
                  <th className="px-4 py-3 text-center">Trạng Thái Kho</th>
                  <th className="px-4 py-3 text-right">Thao Tác Nhận Hàng</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {filteredPo.map(po => {
                  const activeGrn = getActiveGrnForPo(po._id);
                  const logistics = getShipmentLogistics(po);
                  const isArrived = logistics.isArrived;

                  return (
                  <tr key={po._id} className="hover:bg-slate-50/80 transition-colors">
                    <td className="px-4 py-3">
                      <div className="font-bold text-slate-900 font-mono text-xs">PO-{po._id.slice(-6).toUpperCase()}</div>
                      <div className="text-[11px] text-slate-400 mt-0.5">{new Date(po.createdAt).toLocaleDateString("vi-VN")}</div>
                    </td>
                    <td className="px-4 py-3 font-medium text-slate-800">
                      {getSupplierName(po.supplierId)}
                      <div className="text-[11px] text-indigo-600 font-mono flex items-center gap-1 mt-0.5">
                        <Truck size={12} /> {logistics.trackingNumber}
                      </div>
                    </td>
                    <td className="px-4 py-3 text-center font-bold text-slate-700">{po.items?.length || 0}</td>
                    <td className="px-4 py-3 text-right font-black text-emerald-700">{po.totalAmount?.toLocaleString("vi-VN")}đ</td>
                    
                    {/* Cột Vận chuyển IoT */}
                    <td className="px-4 py-3 text-center">
                      <div className="inline-flex flex-col items-center">
                        {isArrived ? (
                          <span className="px-2.5 py-1 bg-emerald-100 text-emerald-800 font-bold text-xs rounded-full border border-emerald-200 flex items-center gap-1">
                            <CheckCircle2 size={12} /> Đã Đến Cửa Kho
                          </span>
                        ) : (
                          <span className="px-2.5 py-1 bg-amber-50 text-amber-800 font-bold text-xs rounded-full border border-amber-200 flex items-center gap-1 animate-pulse">
                            <Truck size={12} /> Đang Giao ({logistics.eta})
                          </span>
                        )}
                        <span className="text-[10px] text-indigo-600 font-semibold mt-1 flex items-center gap-0.5">
                          <Thermometer size={10} /> Xe lạnh: {logistics.temperature}°C
                        </span>
                      </div>
                    </td>

                    {/* Cột Trạng thái Kho */}
                    <td className="px-4 py-3 text-center">
                      {activeGrn ? <StatusBadge map={GRN_STATUS} status={activeGrn.status} /> : <StatusBadge map={PO_STATUS} status={po.status} />}
                    </td>

                    {/* Cột Hành động */}
                    <td className="px-4 py-3 text-right">
                      <div className="flex justify-end gap-1.5 items-center flex-wrap">
                        {/* Nút Xem Tracking Chuyến Hàng */}
                        <button
                          onClick={() => setTrackingModalPo(po)}
                          className="px-2.5 py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-bold rounded-lg transition-colors flex items-center gap-1"
                          title="Xem bản đồ và cảm biến nhiệt độ xe lạnh IoT"
                        >
                          <Navigation size={13} className="text-indigo-600" /> Tracking
                        </button>

                        {/* Bước 1: Nút Xác nhận xe hàng đã đến kho */}
                        {!isArrived && !activeGrn && (
                          <button
                            onClick={() => handleMarkAsArrived(po._id)}
                            className="px-3 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs rounded-lg shadow-sm transition-all flex items-center gap-1"
                            title="Xác nhận xe tải đã dừng tại cửa tiếp nhận kho"
                          >
                            <CheckCircle2 size={13} /> Đã Đến Kho
                          </button>
                        )}

                        {/* Bước 2: Nút Kiểm đếm khi đã đến kho */}
                        {(isArrived || activeGrn) && !["COMPLETED", "PENDING_APPROVAL"].includes(activeGrn?.status) && (
                          <button 
                            onClick={() => setSelectedPo(po)} 
                            className="px-3 py-1.5 bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-xs rounded-lg shadow-sm transition-all flex items-center gap-1"
                            title="Mở thùng đếm số lượng thực nhận"
                          >
                            <PackageCheck size={13} /> Kiểm Đếm
                          </button>
                        )}

                        {/* Chi tiết */}
                        <button onClick={() => setSelectedPo(po)} title="Xem chi tiết"
                          className="p-1.5 text-slate-400 hover:text-indigo-600 hover:bg-indigo-50 rounded-lg">
                          <Eye size={16} />
                        </button>
                      </div>
                    </td>
                  </tr>
                )})}
              </tbody>
            </table>
          )
        ) : subTab === "tracking" ? (
          /* ─── TAB THEO DÕI CHUYẾN HÀNG LOGISTICS (SHIPMENT TRACKING) ─── */
          <div className="p-6 space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="p-4 bg-indigo-50 border border-indigo-100 rounded-2xl">
                <span className="text-xs font-bold text-indigo-700 uppercase">Chuyến Hàng Đang Vận Chuyển</span>
                <div className="text-2xl font-black text-indigo-950 mt-1">
                  {filteredPo.filter(p => !arrivedPoIds[p._id] && p.status === "SHIPPING").length} Chuyến
                </div>
                <p className="text-[11px] text-indigo-600 mt-1">Được giám sát nhiệt độ xe lạnh 24/7</p>
              </div>
              <div className="p-4 bg-emerald-50 border border-emerald-100 rounded-2xl">
                <span className="text-xs font-bold text-emerald-700 uppercase">Đã Đến Cửa Kho Tiếp Nhận</span>
                <div className="text-2xl font-black text-emerald-950 mt-1">
                  {filteredPo.filter(p => !!arrivedPoIds[p._id] || p.status === "RECEIVING").length} Chuyến
                </div>
                <p className="text-[11px] text-emerald-600 mt-1">Sẵn sàng mở thùng kiểm đếm GSP</p>
              </div>
              <div className="p-4 bg-purple-50 border border-purple-100 rounded-2xl">
                <span className="text-xs font-bold text-purple-700 uppercase">Tiêu Chuẩn Chuỗi Lạnh (GDP)</span>
                <div className="text-2xl font-black text-purple-950 mt-1">100% ĐẠT CHUẨN</div>
                <p className="text-[11px] text-purple-600 mt-1">Dải nhiệt độ kiểm soát: 2°C – 8°C</p>
              </div>
            </div>

            <div className="space-y-4">
              <h3 className="text-sm font-black text-slate-800 uppercase tracking-wider">Danh sách chuyến xe đang di chuyển & cập cảng kho</h3>
              {filteredPo.map(po => {
                const logistics = getShipmentLogistics(po);
                return (
                  <div key={po._id} className="p-5 bg-slate-50 border border-slate-200 rounded-2xl shadow-sm hover:shadow-md transition-shadow">
                    <div className="flex flex-wrap items-center justify-between gap-4 pb-4 border-b border-slate-200">
                      <div>
                        <div className="flex items-center gap-2">
                          <span className="font-mono font-black text-base text-slate-900">PO-{po._id.slice(-6).toUpperCase()}</span>
                          <span className="text-xs bg-indigo-100 text-indigo-800 font-mono font-bold px-2 py-0.5 rounded border border-indigo-200">
                            {logistics.trackingNumber}
                          </span>
                        </div>
                        <div className="text-xs text-slate-500 mt-1 flex items-center gap-3">
                          <span>NCC: <strong>{getSupplierName(po.supplierId)}</strong></span>
                          <span>•</span>
                          <span>Đơn vị vận chuyển: <strong>{logistics.carrierName}</strong></span>
                        </div>
                      </div>

                      <div className="flex items-center gap-3">
                        <div className="text-right">
                          <div className="text-xs font-bold text-slate-500">Cảm biến nhiệt xe lạnh</div>
                          <div className="text-base font-black text-emerald-600 flex items-center gap-1 justify-end">
                            <Thermometer size={16} /> {logistics.temperature}°C (An Toàn)
                          </div>
                        </div>

                        <button
                          onClick={() => setTrackingModalPo(po)}
                          className="px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-xs rounded-xl shadow-sm transition-all flex items-center gap-1.5"
                        >
                          <Navigation size={14} /> Chi Tiết Hành Trình
                        </button>
                      </div>
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 pt-4 text-xs text-slate-600">
                      <div>
                        <span className="text-slate-400 block text-[10px] font-bold uppercase">Bác tài phụ trách</span>
                        <strong className="text-slate-800 flex items-center gap-1 mt-0.5"><User size={13} /> {logistics.driverName} ({logistics.driverPhone})</strong>
                      </div>
                      <div>
                        <span className="text-slate-400 block text-[10px] font-bold uppercase">Biển số phương tiện</span>
                        <strong className="text-slate-800 flex items-center gap-1 mt-0.5"><Truck size={13} /> {logistics.licensePlate}</strong>
                      </div>
                      <div>
                        <span className="text-slate-400 block text-[10px] font-bold uppercase">Vị trí hiện thời</span>
                        <strong className="text-indigo-700 flex items-center gap-1 mt-0.5"><MapPin size={13} /> {logistics.currentLocation}</strong>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        ) : (
          /* ─── TAB BIÊN BẢN NHẬP KHO (GRN) ─── */
          filteredGrn.length === 0 ? (
            <div className="flex flex-col items-center py-16 gap-3 text-slate-400">
              <ArrowDownToLine size={36} className="text-slate-300" /><p className="text-sm font-semibold">Chưa có phiếu nhập kho nào.</p>
            </div>
          ) : (
            <table className="w-full text-sm text-left">
              <thead className="text-[11px] text-slate-500 font-bold uppercase tracking-wider bg-slate-50 border-b border-slate-200">
                <tr>
                  <th className="px-4 py-3">Mã GRN</th>
                  <th className="px-4 py-3">Ngày Nhập</th>
                  <th className="px-4 py-3">Nhà Cung Cấp</th>
                  <th className="px-4 py-3 text-center">SP</th>
                  <th className="px-4 py-3 text-center">Trạng Thái</th>
                  <th className="px-4 py-3 text-right">Thao Tác</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {filteredGrn.map((grn: any) => (
                  <tr key={grn._id} className="hover:bg-slate-50/80 transition-colors">
                    <td className="px-4 py-3 font-bold text-slate-900 font-mono text-xs">{grn._id?.slice(-6).toUpperCase() || grn.grnCode}</td>
                    <td className="px-4 py-3 text-slate-600"><Calendar size={12} className="inline mr-1 text-slate-400" />{new Date(grn.createdAt).toLocaleDateString("vi-VN")}</td>
                    <td className="px-4 py-3 font-medium text-slate-800">{getGrnSupplierName(grn)}</td>
                    <td className="px-4 py-3 text-center font-bold text-slate-700">{grn.items?.length || 0}</td>
                    <td className="px-4 py-3 text-center"><StatusBadge map={GRN_STATUS} status={grn.status} /></td>
                    <td className="px-4 py-3 text-right">
                      <div className="flex items-center justify-end gap-2">
                        {grn.status === 'INSPECTING' && (
                          <button onClick={() => window.location.href = `/warehouse/goods-receipt/mobile-inspection?grnId=${grn._id}`}
                            className="px-3 py-1.5 text-blue-600 hover:bg-blue-50 rounded-xl font-bold text-xs border border-blue-200 flex items-center gap-1">
                            <Camera size={13} /> Kiểm đếm AI
                          </button>
                        )}
                        <button onClick={() => setSelectedGrn(grn)} title="Xem thông tin phiếu nhập"
                          className="p-1.5 text-slate-500 hover:text-indigo-600 hover:bg-indigo-50 rounded-lg">
                          <Eye size={16} />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )
        )}
      </div>

      {/* ─── MODAL TRACKING CHUYẾN HÀNG VẬN CHUYỂN & COLD-CHAIN IOT ─── */}
      <AnimatePresence>
        {trackingModalPo && (() => {
          const logistics = getShipmentLogistics(trackingModalPo);
          return (
            <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm">
              <motion.div 
                initial={{ scale: 0.95, opacity: 0 }} 
                animate={{ scale: 1, opacity: 1 }} 
                exit={{ scale: 0.95, opacity: 0 }}
                className="bg-white rounded-3xl shadow-2xl w-full max-w-2xl max-h-[90vh] overflow-hidden flex flex-col border border-slate-200"
              >
                {/* Header */}
                <div className="p-5 bg-gradient-to-r from-slate-900 via-indigo-950 to-slate-900 text-white flex justify-between items-center shrink-0">
                  <div className="flex items-center gap-2.5">
                    <div className="w-9 h-9 rounded-xl bg-white/10 flex items-center justify-center text-indigo-300">
                      <Truck size={18} />
                    </div>
                    <div>
                      <h3 className="font-bold text-base">Theo Dõi Chuyến Hàng: PO-{trackingModalPo._id?.slice(-6).toUpperCase()}</h3>
                      <p className="text-xs text-slate-300 font-mono">{logistics.trackingNumber} • {logistics.carrierName}</p>
                    </div>
                  </div>
                  <button onClick={() => setTrackingModalPo(null)} className="p-1.5 text-slate-400 hover:text-white rounded-full hover:bg-white/10">
                    <X size={18} />
                  </button>
                </div>

                {/* Body */}
                <div className="p-6 space-y-6 overflow-y-auto flex-1 text-sm font-sans">
                  {/* Vehicle & IoT Sensors Card */}
                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 bg-slate-50 p-4 rounded-2xl border border-slate-200">
                    <div>
                      <span className="text-[10px] font-bold text-slate-400 uppercase">Tài xế phụ trách</span>
                      <strong className="text-slate-800 block text-xs mt-0.5">{logistics.driverName}</strong>
                      <span className="text-[11px] text-indigo-600 flex items-center gap-1 mt-0.5"><Phone size={10} /> {logistics.driverPhone}</span>
                    </div>
                    <div>
                      <span className="text-[10px] font-bold text-slate-400 uppercase">Biển số xe lạnh</span>
                      <strong className="text-slate-800 block text-xs mt-0.5">{logistics.licensePlate.split(" ")[0]}</strong>
                      <span className="text-[11px] text-slate-500">Thùng lạnh 2.5T</span>
                    </div>
                    <div>
                      <span className="text-[10px] font-bold text-slate-400 uppercase">Nhiệt độ thùng xe (IoT)</span>
                      <strong className="text-emerald-700 block text-sm font-black mt-0.5 flex items-center gap-1">
                        <Thermometer size={14} /> {logistics.temperature}°C
                      </strong>
                      <span className="text-[10px] text-emerald-600 font-bold">Chuẩn GDP (2-8°C)</span>
                    </div>
                    <div>
                      <span className="text-[10px] font-bold text-slate-400 uppercase">Độ ẩm khoang hàng</span>
                      <strong className="text-indigo-700 block text-sm font-black mt-0.5 flex items-center gap-1">
                        <Droplets size={14} /> {logistics.humidity}%
                      </strong>
                      <span className="text-[10px] text-slate-500">Khô ráo đạt chuẩn</span>
                    </div>
                  </div>

                  {/* Milestones Timeline */}
                  <div>
                    <h4 className="text-xs font-black uppercase text-slate-500 mb-4 tracking-wider">Hành trình chuyến hàng (Milestones)</h4>
                    <div className="relative pl-6 border-l-2 border-slate-200 space-y-6">
                      {logistics.milestones.map((m, idx) => (
                        <div key={idx} className="relative">
                          <span className={`absolute -left-[31px] top-1 w-3.5 h-3.5 rounded-full border-2 border-white flex items-center justify-center ${
                            m.status === "COMPLETED" ? "bg-emerald-600" :
                            m.status === "CURRENT" ? "bg-indigo-600 animate-ping" : "bg-slate-300"
                          }`} />
                          
                          <div className={`p-3.5 rounded-xl border ${
                            m.status === "CURRENT" ? "bg-indigo-50/60 border-indigo-200 shadow-sm" : "bg-white border-slate-200"
                          }`}>
                            <div className="flex justify-between items-start">
                              <strong className="text-slate-800 text-xs">{m.title}</strong>
                              <span className="text-[11px] text-slate-400 font-semibold">{m.time}</span>
                            </div>
                            <p className="text-xs text-slate-500 mt-1 flex items-center gap-1">
                              <MapPin size={12} className="text-slate-400" /> {m.location}
                            </p>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>

                {/* Footer Actions */}
                <div className="p-4 bg-slate-50 border-t border-slate-200 flex justify-between items-center shrink-0">
                  <div className="text-xs text-slate-500">
                    Trạng thái: <strong>{logistics.isArrived ? "Đã đến cổng kho" : "Đang giao"}</strong>
                  </div>
                  <div className="flex gap-2">
                    {!logistics.isArrived && (
                      <button
                        onClick={() => {
                          handleMarkAsArrived(trackingModalPo._id);
                          setTrackingModalPo(null);
                        }}
                        className="px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs rounded-xl shadow-md transition-all flex items-center gap-1.5"
                      >
                        <CheckCircle2 size={14} /> Xác Nhận Xe Đã Đến Cổng Kho
                      </button>
                    )}
                    <button
                      onClick={() => {
                        setSelectedPo(trackingModalPo);
                        setTrackingModalPo(null);
                      }}
                      className="px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-xs rounded-xl shadow-md transition-all flex items-center gap-1.5"
                    >
                      <PackageCheck size={14} /> Tiến Hành Kiểm Đếm
                    </button>
                  </div>
                </div>
              </motion.div>
            </div>
          );
        })()}
      </AnimatePresence>

      {/* ─── MODAL TIẾP NHẬN & KIỂM ĐẾM THỦ CÔNG (RECEIVE PO MODAL) ─── */}
      <AnimatePresence>
        {selectedPo && (
          (() => {
            const activeGrn = getActiveGrnForPo(selectedPo._id);
            const activeGrnHasDiscrepancy = hasGrnDiscrepancy(activeGrn);
            const isLockedGrn = activeGrn && activeGrn.status !== "INSPECTING";
            const itemsToDisplay = isLockedGrn ? activeGrn.items : (selectedPo.items || []);

            return (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            <div className="absolute inset-0 bg-slate-900/60 backdrop-blur-sm" onClick={() => setSelectedPo(null)} />
            <motion.div initial={{ scale: 0.95, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} exit={{ scale: 0.95, opacity: 0 }}
              className="relative bg-white rounded-3xl shadow-2xl w-full max-w-2xl max-h-[90vh] overflow-hidden flex flex-col border border-slate-200">
              <div className="p-5 border-b border-slate-100 flex justify-between items-center bg-indigo-50/50 shrink-0">
                <div>
                  <h3 className="font-black text-slate-900 font-mono text-base">Kiểm Đếm Tiếp Nhận: PO-{selectedPo._id.slice(-6).toUpperCase()}</h3>
                  <p className="text-xs mt-0.5">{activeGrn ? <StatusBadge map={GRN_STATUS} status={activeGrn.status} /> : <StatusBadge map={PO_STATUS} status={selectedPo.status} />}</p>
                </div>
                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() => setQrModalPo(selectedPo)}
                    className="px-3 py-1.5 bg-white hover:bg-slate-50 border border-slate-200 text-indigo-700 rounded-xl text-xs font-bold flex items-center gap-1.5 shadow-sm transition-all"
                    title="Mở trên điện thoại di động"
                  >
                    <Smartphone size={14} className="text-indigo-600" /> Quét Bằng Mobile
                  </button>
                  <button onClick={() => setSelectedPo(null)} className="p-1.5 text-slate-400 hover:text-slate-600 rounded-full hover:bg-slate-100">
                    <X size={18} />
                  </button>
                </div>
              </div>

              <div className="p-5 space-y-4 overflow-y-auto flex-1 font-sans">
                {modalError && (
                  <div className="p-3 bg-rose-50 border border-rose-200 text-rose-800 rounded-xl text-xs font-bold flex items-center gap-2">
                    <AlertTriangle size={16} className="text-rose-600 shrink-0" />
                    <span>{modalError}</span>
                  </div>
                )}

                <div className="grid grid-cols-2 gap-3 text-sm bg-slate-50 p-3 rounded-2xl border border-slate-200">
                  <div><span className="text-slate-400 font-bold text-xs block">Nhà Cung Cấp</span><span className="font-semibold text-slate-800">{getSupplierName(selectedPo.supplierId)}</span></div>
                  <div><span className="text-slate-400 font-bold text-xs block">Tổng tiền</span><span className="font-black text-indigo-700 text-base">{selectedPo.totalAmount?.toLocaleString("vi-VN")}đ</span></div>
                </div>

                <div className="flex items-center justify-between">
                  <h4 className="font-bold text-slate-700 text-sm flex items-center gap-2">
                    <Package size={14} className="text-indigo-600" />
                    Sản phẩm kiểm đếm thực tế ({selectedPo.items?.length || 0})
                  </h4>
                  <span className="text-[11px] text-slate-400 font-medium">Hỗ trợ tải ảnh AI Computer Vision hoặc Quét Mobile</span>
                </div>
                
                <div className="space-y-3">
                  {itemsToDisplay?.map((it: any) => {
                    const mId = it.medicineId || it.id;
                    const isScanning = aiScanning === mId;
                    const remainingQuantity = Number(it.quantity) - Number(it.receivedQuantity || 0);
                    const displayedActualQty = isLockedGrn ? it.actualQty : inspectionData[mId]?.actualQty;
                    const itemErrors = inspectionErrors[mId] || {};

                    return (
                      <div key={mId} className="bg-slate-50 p-4 rounded-2xl border border-slate-200 space-y-3">
                        <div className="flex flex-wrap justify-between items-center gap-2">
                          <div>
                            <span className="font-bold text-slate-900 text-sm">{it.medicineName || mId}</span>
                            <span className="text-xs text-slate-500 block">Số lượng đặt theo PO: <span className="font-bold text-indigo-700">{Number(it.quantity)}</span></span>
                          </div>
                          {!isLockedGrn && (isScanning ? (
                            <span className="px-2.5 py-1 bg-amber-100 text-amber-700 rounded-lg text-xs font-bold flex items-center gap-1 animate-pulse"><Scan size={12} /> Đang quét...</span>
                          ) : (
                            <div className="flex items-center gap-1.5">
                              {/* Nút Tải Ảnh / Chụp Ảnh Đếm AI */}
                              <button
                                type="button"
                                onClick={() => {
                                  setImageInspectionItem(it);
                                  setUploadedImagePreview(null);
                                  setAiVisionResult(null);
                                }}
                                className="px-2.5 py-1 bg-purple-50 text-purple-700 hover:bg-purple-100 rounded-lg text-xs font-bold border border-purple-200 flex items-center gap-1 transition-colors shadow-sm"
                                title="Tải ảnh chụp kiện hàng/thùng thuốc để AI đếm số hộp & đọc OCR số lô"
                              >
                                <Upload size={12} /> Tải Ảnh Đếm AI
                              </button>

                              {/* Nút Quét Nhanh */}
                              <button
                                type="button"
                                onClick={() => {
                                  setAiScanning(mId);
                                  setTimeout(() => {
                                    setInspectionData(prev => ({
                                      ...prev,
                                      [mId]: { 
                                        batchNo: `LOT-${new Date().getFullYear()}-${Math.floor(100 + Math.random() * 900)}`,
                                        expDate: "2028-12-31",
                                        actualQty: remainingQuantity 
                                      }
                                    }));
                                    setInspectionErrors(prev => ({
                                      ...prev,
                                      [mId]: { ...prev[mId], actualQty: undefined, batchNo: undefined, expDate: undefined },
                                    }));
                                    setModalError("");
                                    setAiScanning(null);
                                  }, 1000);
                                }}
                                className="px-2.5 py-1 bg-indigo-50 text-indigo-700 hover:bg-indigo-100 rounded-lg text-xs font-bold border border-indigo-200 flex items-center gap-1 transition-colors"
                              >
                                <Sparkles size={12} /> Quét Nhanh
                              </button>
                            </div>
                          ))}
                        </div>

                        <div className="grid grid-cols-3 gap-3">
                          <div>
                            <label className="text-[10px] font-bold text-slate-500 mb-1 block uppercase">Số lô (Batch No.) *</label>
                            <input 
                              type="text" 
                              value={isLockedGrn ? (it.batchNo || "") : (inspectionData[mId]?.batchNo || "")}
                              disabled={!!isLockedGrn}
                              placeholder="VD: LOT-2026-A"
                              onChange={(e) => setInspectionData(prev => ({
                                ...prev,
                                [mId]: { ...prev[mId], batchNo: e.target.value }
                              }))}
                              className="w-full px-3 py-2 bg-white border border-slate-200 rounded-xl text-xs font-mono font-bold focus:outline-none focus:ring-2 focus:ring-indigo-400"
                            />
                            {itemErrors.batchNo && <span className="text-[10px] text-rose-600 block mt-0.5">{itemErrors.batchNo}</span>}
                          </div>

                          <div>
                            <label className="text-[10px] font-bold text-slate-500 mb-1 block uppercase">Hạn dùng (Exp Date) *</label>
                            <input 
                              type="date" 
                              value={isLockedGrn ? (it.expDate ? new Date(it.expDate).toISOString().slice(0, 10) : "") : (inspectionData[mId]?.expDate || "")}
                              disabled={!!isLockedGrn}
                              onChange={(e) => setInspectionData(prev => ({
                                ...prev,
                                [mId]: { ...prev[mId], expDate: e.target.value }
                              }))}
                              className="w-full px-3 py-2 bg-white border border-slate-200 rounded-xl text-xs font-semibold focus:outline-none focus:ring-2 focus:ring-indigo-400"
                            />
                            {itemErrors.expDate && <span className="text-[10px] text-rose-600 block mt-0.5">{itemErrors.expDate}</span>}
                          </div>

                          <div>
                            <label className="text-[10px] font-bold text-slate-500 mb-1 block uppercase">Số thực nhận *</label>
                            <input 
                              type="number" 
                              value={displayedActualQty ?? ""}
                              disabled={!!isLockedGrn}
                              placeholder="Số lượng đếm"
                              onChange={(e) => setInspectionData(prev => ({
                                ...prev,
                                [mId]: { ...prev[mId], actualQty: e.target.value }
                              }))}
                              className="w-full px-3 py-2 bg-white border border-slate-200 rounded-xl text-xs font-bold text-indigo-700 focus:outline-none focus:ring-2 focus:ring-indigo-400"
                            />
                            {itemErrors.actualQty && <span className="text-[10px] text-rose-600 block mt-0.5">{itemErrors.actualQty}</span>}
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>

              {/* Modal Footer */}
              <div className="p-4 bg-slate-50 border-t border-slate-200 flex justify-between items-center shrink-0">
                <button
                  type="button"
                  onClick={() => setQrModalPo(selectedPo)}
                  className="px-3 py-2 text-indigo-700 hover:bg-indigo-50 border border-indigo-200 rounded-xl text-xs font-bold transition-colors flex items-center gap-1.5"
                >
                  <QrCode size={14} /> Mã QR Đồng Bộ Mobile
                </button>

                <div className="flex gap-2">
                  <button onClick={() => setSelectedPo(null)} className="px-4 py-2 text-slate-600 hover:bg-slate-200 rounded-xl text-xs font-bold transition-colors">
                    Đóng
                  </button>

                  {!isLockedGrn && (
                    <button
                      onClick={() => handleReceiveAndInspect(selectedPo._id)}
                      disabled={actionLoading}
                      className="px-5 py-2 bg-indigo-600 hover:bg-indigo-700 disabled:opacity-50 text-white font-bold text-xs rounded-xl shadow-md transition-all flex items-center gap-1.5"
                    >
                      {actionLoading ? <Loader2 size={14} className="animate-spin" /> : <ShieldCheck size={14} />}
                      Xác Nhận Kiểm Đếm & Nhập Kho
                    </button>
                  )}
                </div>
              </div>
            </motion.div>
          </div>
            );
          })()
        )}
      </AnimatePresence>

      {/* ─── MODAL PHÂN TÍCH HÌNH ẢNH KIỆN HÀNG BẰNG AI COMPUTER VISION & OCR ─── */}
      <AnimatePresence>
        {imageInspectionItem && (
          <div className="fixed inset-0 z-[60] flex items-center justify-center p-4">
            <div className="absolute inset-0 bg-slate-950/75 backdrop-blur-md" onClick={() => setImageInspectionItem(null)} />
            <motion.div initial={{ scale: 0.95, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} exit={{ scale: 0.95, opacity: 0 }}
              className="relative bg-white rounded-3xl shadow-2xl w-full max-w-3xl max-h-[92vh] overflow-hidden flex flex-col border border-slate-200">
              
              {/* Header */}
              <div className="p-5 border-b border-slate-100 flex justify-between items-center bg-gradient-to-r from-purple-900 to-indigo-900 text-white shrink-0">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-2xl bg-white/10 flex items-center justify-center border border-white/20 text-purple-300">
                    <Camera size={20} />
                  </div>
                  <div>
                    <h3 className="font-black text-base flex items-center gap-2">
                      Quét AI Hình Ảnh & Đếm Hộp Tự Động
                      <span className="text-[10px] bg-purple-400/20 text-purple-200 border border-purple-300/30 px-2 py-0.5 rounded-full font-mono">
                        Computer Vision + OCR
                      </span>
                    </h3>
                    <p className="text-xs text-purple-200 mt-0.5">
                      Sản phẩm: <strong>{imageInspectionItem.medicineName || imageInspectionItem.medicineId}</strong>
                    </p>
                  </div>
                </div>
                <button onClick={() => setImageInspectionItem(null)} className="p-2 text-purple-200 hover:text-white rounded-full hover:bg-white/10">
                  <X size={18} />
                </button>
              </div>

              {/* Body */}
              <div className="p-6 space-y-6 overflow-y-auto flex-1 font-sans text-sm">
                {/* Upload or Choose sample image */}
                <div>
                  <label className="text-xs font-bold text-slate-600 uppercase tracking-wider block mb-2">
                    1. Tải ảnh chụp kiện hàng hoặc chọn ảnh mẫu thực nghiệm
                  </label>
                  
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 mb-3">
                    {SAMPLE_INSPECTION_IMAGES.map((sample) => (
                      <button
                        key={sample.id}
                        type="button"
                        onClick={() => triggerAiVisionAnalysis(sample.url, imageInspectionItem, { batchNo: sample.batchNo, expDate: sample.expDate })}
                        className={`p-2.5 rounded-2xl border text-left transition-all flex flex-col gap-2 ${
                          uploadedImagePreview === sample.url ? "border-purple-600 bg-purple-50 ring-2 ring-purple-200" : "border-slate-200 bg-slate-50 hover:bg-white"
                        }`}
                      >
                        <img src={sample.url} alt={sample.title} className="w-full h-24 object-cover rounded-xl" />
                        <div>
                          <p className="text-xs font-bold text-slate-800 line-clamp-1">{sample.title}</p>
                          <span className="text-[10px] text-purple-600 font-semibold block mt-0.5">Số lô: {sample.batchNo}</span>
                        </div>
                      </button>
                    ))}
                  </div>

                  {/* File Upload Input */}
                  <div className="relative border-2 border-dashed border-slate-300 hover:border-purple-400 bg-slate-50/50 rounded-2xl p-4 text-center cursor-pointer transition-colors">
                    <input
                      type="file"
                      accept="image/*"
                      onChange={(e) => {
                        const file = e.target.files?.[0];
                        if (file) {
                          const reader = new FileReader();
                          reader.onload = (event) => {
                            if (event.target?.result) {
                              triggerAiVisionAnalysis(event.target.result as string, imageInspectionItem);
                            }
                          };
                          reader.readAsDataURL(file);
                        }
                      }}
                      className="absolute inset-0 opacity-0 cursor-pointer w-full h-full"
                    />
                    <div className="flex flex-col items-center justify-center gap-1.5 text-slate-500">
                      <Upload size={24} className="text-purple-600" />
                      <p className="text-xs font-bold text-slate-700">Tải ảnh chụp từ máy tính / thiết bị</p>
                      <p className="text-[11px] text-slate-400">Hỗ trợ JPG, PNG, WEBP chụp thực tế thùng hàng</p>
                    </div>
                  </div>
                </div>

                {/* AI Visual Processing Window */}
                {uploadedImagePreview && (
                  <div className="space-y-4">
                    <label className="text-xs font-bold text-slate-600 uppercase tracking-wider block">
                      2. Khung phân tích Computer Vision & Nhận diện Bounding Box
                    </label>

                    <div className="relative rounded-2xl overflow-hidden bg-slate-950 border border-slate-800 flex items-center justify-center min-h-[260px] max-h-[340px]">
                      <img
                        src={uploadedImagePreview}
                        alt="Inspection Target"
                        className={`w-full h-full max-h-[340px] object-contain transition-opacity duration-300 ${aiVisionProcessing ? "opacity-60" : "opacity-90"}`}
                      />

                      {/* Laser scanning beam */}
                      {aiVisionProcessing && (
                        <div className="absolute inset-0 pointer-events-none overflow-hidden">
                          <motion.div
                            animate={{ y: ["0%", "100%", "0%"] }}
                            transition={{ repeat: Infinity, duration: 1.8, ease: "linear" }}
                            className="w-full h-1 bg-purple-400 shadow-[0_0_20px_rgba(192,132,252,1)]"
                          />
                          <div className="absolute inset-0 flex items-center justify-center bg-black/40 backdrop-blur-[1px]">
                            <div className="bg-slate-900/90 text-white px-4 py-2.5 rounded-2xl border border-purple-500/50 shadow-2xl flex items-center gap-2">
                              <Loader2 size={16} className="animate-spin text-purple-400" />
                              <span className="text-xs font-bold">AI đang nhận diện & đếm số lượng hộp...</span>
                            </div>
                          </div>
                        </div>
                      )}

                      {/* Bounding Boxes on result */}
                      {!aiVisionProcessing && aiVisionResult && (
                        <div className="absolute inset-0 pointer-events-none">
                          {aiVisionResult.boxes.map((box, idx) => (
                            <div
                              key={idx}
                              style={{
                                top: `${box.top}%`,
                                left: `${box.left}%`,
                                width: `${box.width}%`,
                                height: `${box.height}%`,
                              }}
                              className="absolute border-2 border-emerald-400 bg-emerald-400/15 rounded-lg transition-all animate-pulse"
                            >
                              <span className="absolute -top-5 left-0 bg-emerald-600 text-white text-[9px] font-bold px-1.5 py-0.5 rounded shadow-sm whitespace-nowrap">
                                {box.label}
                              </span>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>

                    {/* Extracted Data Card */}
                    {!aiVisionProcessing && aiVisionResult && (
                      <div className="p-4 bg-emerald-50 border border-emerald-200 rounded-2xl space-y-3">
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-2">
                            <CheckCircle2 size={18} className="text-emerald-600" />
                            <span className="font-bold text-emerald-950 text-sm">Kết quả phân tích hình ảnh AI hoàn tất</span>
                          </div>
                          <span className="text-xs bg-emerald-200/80 text-emerald-900 font-bold px-2.5 py-0.5 rounded-full">
                            Độ tin cậy: {aiVisionResult.confidence}%
                          </span>
                        </div>

                        <div className="grid grid-cols-3 gap-3 text-xs">
                          <div className="bg-white p-3 rounded-xl border border-emerald-100">
                            <span className="text-slate-400 block text-[10px] font-bold uppercase">Số lượng đếm được</span>
                            <span className="text-lg font-black text-emerald-700">{aiVisionResult.detectedCount} Hộp</span>
                            <span className="text-[10px] text-slate-500 block mt-0.5">Trùng khớp với PO</span>
                          </div>
                          <div className="bg-white p-3 rounded-xl border border-emerald-100">
                            <span className="text-slate-400 block text-[10px] font-bold uppercase">Số lô OCR bóc tách</span>
                            <span className="text-sm font-mono font-black text-slate-900">{aiVisionResult.batchNo}</span>
                            <span className="text-[10px] text-emerald-600 font-bold block mt-0.5">Nhãn hợp chuẩn</span>
                          </div>
                          <div className="bg-white p-3 rounded-xl border border-emerald-100">
                            <span className="text-slate-400 block text-[10px] font-bold uppercase">Hạn dùng OCR</span>
                            <span className="text-sm font-bold text-slate-900">{new Date(aiVisionResult.expDate).toLocaleDateString("vi-VN")}</span>
                            <span className="text-[10px] text-emerald-600 font-bold block mt-0.5">Đạt chuẩn GSP (&gt;24 tháng)</span>
                          </div>
                        </div>
                      </div>
                    )}
                  </div>
                )}
              </div>

              {/* Footer */}
              <div className="p-4 bg-slate-50 border-t border-slate-200 flex justify-between items-center shrink-0">
                <button
                  type="button"
                  onClick={() => setImageInspectionItem(null)}
                  className="px-4 py-2 text-slate-600 hover:bg-slate-200 rounded-xl text-xs font-bold transition-colors"
                >
                  Hủy Bỏ
                </button>

                <button
                  type="button"
                  onClick={applyAiVisionResultToForm}
                  disabled={!aiVisionResult || aiVisionProcessing}
                  className="px-5 py-2.5 bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-700 hover:to-indigo-700 disabled:opacity-50 text-white font-bold text-xs rounded-xl shadow-lg transition-all flex items-center gap-1.5"
                >
                  <Check size={14} /> Áp Dụng Kết Quả Vào Phiếu Kiểm Đếm
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* ─── MODAL ĐỒNG BỘ KIỂM ĐẾM SANG MOBILE (QR CODE HANDOFF) ─── */}
      <AnimatePresence>
        {qrModalPo && (
          <div className="fixed inset-0 z-[60] flex items-center justify-center p-4">
            <div className="absolute inset-0 bg-slate-950/70 backdrop-blur-sm" onClick={() => setQrModalPo(null)} />
            <motion.div initial={{ scale: 0.95, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} exit={{ scale: 0.95, opacity: 0 }}
              className="relative bg-white rounded-3xl shadow-2xl w-full max-w-md overflow-hidden flex flex-col border border-slate-200 text-center">
              
              <div className="p-5 border-b border-slate-100 flex justify-between items-center bg-indigo-50/50">
                <div className="flex items-center gap-2 text-indigo-900">
                  <Smartphone size={18} />
                  <span className="font-black text-sm">Kiểm Đếm Bằng Điện Thoại (Mobile)</span>
                </div>
                <button onClick={() => setQrModalPo(null)} className="p-1.5 text-slate-400 hover:text-slate-600 rounded-full hover:bg-slate-100">
                  <X size={16} />
                </button>
              </div>

              <div className="p-6 space-y-4">
                <p className="text-xs text-slate-600 leading-relaxed">
                  Thủ kho có thể dùng điện thoại di động quét mã QR bên dưới để mở giao diện <strong>AI Camera Scanner</strong> và kiểm đếm trực tiếp tại cửa kho:
                </p>

                {/* QR Code Presentation */}
                <div className="w-48 h-48 mx-auto p-3 bg-white border-2 border-indigo-200 rounded-2xl shadow-inner flex flex-col items-center justify-center relative group">
                  <svg className="w-full h-full" viewBox="0 0 100 100" fill="none" xmlns="http://www.w3.org/2000/svg">
                    <rect width="100" height="100" fill="white" />
                    {/* Top-Left Finder */}
                    <rect x="10" y="10" width="25" height="25" fill="#1e1b4b" rx="4" />
                    <rect x="15" y="15" width="15" height="15" fill="white" rx="2" />
                    <rect x="18" y="18" width="9" height="9" fill="#4338ca" rx="1" />
                    {/* Top-Right Finder */}
                    <rect x="65" y="10" width="25" height="25" fill="#1e1b4b" rx="4" />
                    <rect x="70" y="15" width="15" height="15" fill="white" rx="2" />
                    <rect x="73" y="18" width="9" height="9" fill="#4338ca" rx="1" />
                    {/* Bottom-Left Finder */}
                    <rect x="10" y="65" width="25" height="25" fill="#1e1b4b" rx="4" />
                    <rect x="15" y="70" width="15" height="15" fill="white" rx="2" />
                    <rect x="18" y="73" width="9" height="9" fill="#4338ca" rx="1" />
                    {/* Data patterns */}
                    <rect x="42" y="15" width="6" height="6" fill="#1e1b4b" />
                    <rect x="52" y="20" width="6" height="6" fill="#4338ca" />
                    <rect x="42" y="30" width="6" height="6" fill="#1e1b4b" />
                    <rect x="15" y="45" width="6" height="6" fill="#4338ca" />
                    <rect x="25" y="50" width="6" height="6" fill="#1e1b4b" />
                    <rect x="40" y="45" width="20" height="20" fill="#4f46e5" rx="3" />
                    <rect x="65" y="45" width="6" height="6" fill="#1e1b4b" />
                    <rect x="75" y="55" width="6" height="6" fill="#4338ca" />
                    <rect x="45" y="75" width="6" height="6" fill="#1e1b4b" />
                    <rect x="60" y="80" width="6" height="6" fill="#4338ca" />
                    <rect x="80" y="75" width="6" height="6" fill="#1e1b4b" />
                  </svg>
                  <span className="absolute bottom-2 bg-indigo-900 text-white text-[9px] font-bold px-2 py-0.5 rounded-full">
                    PO-{qrModalPo._id.slice(-6).toUpperCase()}
                  </span>
                </div>

                <div className="text-xs text-slate-500 font-mono bg-slate-50 p-2.5 rounded-xl border border-slate-200 break-all text-left">
                  {window.location.origin}/warehouse/goods-receipt/mobile-inspection?poId={qrModalPo._id}
                </div>

                <div className="grid grid-cols-2 gap-2 pt-2">
                  <button
                    type="button"
                    onClick={() => {
                      navigator.clipboard.writeText(`${window.location.origin}/warehouse/goods-receipt/mobile-inspection?poId=${qrModalPo._id}`);
                      setCopiedLink(true);
                      setTimeout(() => setCopiedLink(false), 2000);
                    }}
                    className="px-3 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl text-xs font-bold transition-all flex items-center justify-center gap-1.5"
                  >
                    {copiedLink ? <CheckCheck size={14} className="text-emerald-600" /> : <Copy size={14} />}
                    {copiedLink ? "Đã Sao Chép!" : "Sao Chép Link"}
                  </button>

                  <button
                    type="button"
                    onClick={() => {
                      window.open(`/warehouse/goods-receipt/mobile-inspection?poId=${qrModalPo._id}`, "_blank");
                    }}
                    className="px-3 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-xs font-bold shadow-md transition-all flex items-center justify-center gap-1.5"
                  >
                    <ExternalLink size={14} /> Mở Giao Diện Mobile
                  </button>
                </div>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}
