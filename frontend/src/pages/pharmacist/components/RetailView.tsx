import { useState, useEffect, useRef, useMemo } from "react";
import {
  ShoppingCart, Minus, Plus, SearchIcon, Sparkles, XCircle, AlertTriangle, ShieldAlert,
  Banknote, QrCode, Printer, CheckCircle2, Mic, Square, Check, Loader2, X, Filter, ScanBarcode, Tag, Zap,
  Crown, HeartPulse, Gift, ShieldCheck, FileCheck2, BadgeCheck, UserCheck
} from "lucide-react";
import { medicineService } from "../../../services/inventory/medicine.service";
import { orderService } from "../../../services/sales/order.service";
import { prescriptionService } from "../../../services/sales/prescription.service";
import { voucherService } from "../../../services/sales/voucher.service";
import { reconciliationService } from "../../../services/sales/reconciliation.service";
import { useCustomerRFM } from "../../../hooks/useCustomerRFM";
import api from "../../../services/core/api";
import { useSocket } from "../../../hooks/useSocket";
import { VietQRCode } from "../../../components/common/VietQRCode";
import AIPharmacistAuditModal, { AIPharmacistConfirmationData } from "./AIPharmacistAuditModal";

// Helper to decode JWT token to extract branchId and user info
function getBranchInfoFromToken() {
  const token = localStorage.getItem("token");
  if (!token) return { branchId: null, fullName: "Dược sĩ Trần Thị A" };
  try {
    const base64Url = token.split('.')[1];
    const base64 = base64Url.replace(/-/g, '+').replace(/_/g, '/');
    const jsonPayload = decodeURIComponent(
      window.atob(base64)
        .split('')
        .map((c) => '%' + ('00' + c.charCodeAt(0).toString(16)).slice(-2))
        .join('')
    );
    const decoded = JSON.parse(jsonPayload);
    const savedBranch = localStorage.getItem("branchId") || "";
    return {
      branchId: decoded.branchId || savedBranch || "",
      fullName: decoded.fullName || "Dược sĩ"
    };
  } catch (e) {
    console.error("Lỗi giải mã token:", e);
    return { branchId: localStorage.getItem("branchId") || "", fullName: "Dược sĩ" };
  }
}

interface RetailViewProps {
  showToast: (message: string, type?: "success" | "error" | "warning") => void;
}

export default function RetailView({ showToast }: RetailViewProps) {
  const currentBranch = getBranchInfoFromToken().branchId || "BR-001";
  const [searchQuery, setSearchQuery] = useState("");
  const [searchResults, setSearchResults] = useState<any[]>([]);
  const [cart, setCart] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [paymentMethod, setPaymentMethod] = useState("CASH");
  const [remarks, setRemarks] = useState("");

  // Barcode Scanning States (POS Fast Scan)
  const [isBarcodeLoading, setIsBarcodeLoading] = useState(false);
  const [lastScannedCode, setLastScannedCode] = useState("");
  const [isScanActive, setIsScanActive] = useState(true);
  const scanBufferRef = useRef<string>("");
  const lastKeyTimeRef = useRef<number>(0);

  // Pharmacist Filter States
  const [selectedCategory, setSelectedCategory] = useState("");
  const [selectedClassification, setSelectedClassification] = useState("");
  const [stockFilter, setStockFilter] = useState("ALL");
  const [categoriesList, setCategoriesList] = useState<string[]>([]);
  const [classificationsList, setClassificationsList] = useState<string[]>([]);
  const [isDropdownOpen, setIsDropdownOpen] = useState(false);

  useEffect(() => {
    medicineService.getFilters().then((res: any) => {
      if (res) {
        if (Array.isArray(res.categories)) setCategoriesList(res.categories);
        if (Array.isArray(res.classifications)) setClassificationsList(res.classifications);
      }
    }).catch(err => console.error("Lỗi lấy bộ lọc thuốc:", err));
  }, []);

  const [voucherCode, setVoucherCode] = useState("");
  const [appliedVoucher, setAppliedVoucher] = useState<any>(null);
  const [invoiceVoucher, setInvoiceVoucher] = useState<any>(null);
  const [voucherError, setVoucherError] = useState("");
  const [isValidatingVoucher, setIsValidatingVoucher] = useState(false);

  // Checkout Modal
  const [showInvoiceModal, setShowInvoiceModal] = useState(false);
  const [invoiceData, setInvoiceData] = useState<any>(null);
  const [error, setError] = useState("");

  const [showPayOSModal, setShowPayOSModal] = useState(false);
  const [payosCheckoutUrl, setPayosCheckoutUrl] = useState("");
  const [payosQrCode, setPayosQrCode] = useState("");
  const [payosOrderCode, setPayosOrderCode] = useState<number | null>(null);
  const [payosPolling, setPayosPolling] = useState(false);
  const [pendingSalePayload, setPendingSalePayload] = useState<any>(null);
  const payosPaidHandledRef = useRef(false);

  const normalizeInvoiceResult = (result: any) => {
    const source = result?.saleResult || result;
    if (source?.data) return source;
    const order = source?.order || result?.order || source;
    return {
      success: source?.success ?? result?.success ?? true,
      message: source?.message || result?.message || "Thanh toán thành công!",
      warnings: source?.warnings || result?.warnings || [],
      data: order || {},
    };
  };

  // Alternatives Modal
  const [showAlternativesModal, setShowAlternativesModal] = useState(false);
  const [selectedOutOfStockMed, setSelectedOutOfStockMed] = useState<any>(null);
  const [alternativesList, setAlternativesList] = useState<any[]>([]);
  const [loadingAlternatives, setLoadingAlternatives] = useState(false);

  // RFM Customer Segmentation
  const { currentCustomerSegment, lookupCustomerSegment, clearCustomerSegment } = useCustomerRFM();

  // Loyalty states
  const [customerPhone, setCustomerPhone] = useState("");
  const [patientEmail, setPatientEmail] = useState("");
  const [loyaltyInfo, setLoyaltyInfo] = useState<any>(null);
  const [usePoints, setUsePoints] = useState(false);
  const [redeemedPoints, setRedeemedPoints] = useState(0);
  const [isSearchingCustomer, setIsSearchingCustomer] = useState(false);

  // Emergency Manual Override States (POS Fallback)
  const [showEmergencyOverrideModal, setShowEmergencyOverrideModal] = useState(false);
  const [bankTransactionId, setBankTransactionId] = useState("");
  const [overrideReason, setOverrideReason] = useState("Khách đã chuyển khoản thành công, hệ thống ngân hàng đang trễ webhook");
  const [isOverriding, setIsOverriding] = useState(false);

  const handleConfirmEmergencyOverride = async () => {
    if (!payosOrderCode) return;
    try {
      setIsOverriding(true);
      const branchInfo = getBranchInfoFromToken();
      const res = await reconciliationService.manualOverridePayment({
        orderCode: payosOrderCode,
        branchId: branchInfo.branchId || "BR-001",
        actualAmount: total,
        bankTransactionId: bankTransactionId.trim() || undefined,
        overrideReason: overrideReason.trim(),
      });
      showToast("Đã xác nhận khẩn cấp có đối soát và hoàn tất đơn hàng!", "success");
      setShowEmergencyOverrideModal(false);
      setShowPayOSModal(false);
      setPayosPolling(false);
      setInvoiceData(normalizeInvoiceResult(res));
      setShowInvoiceModal(true);
      setCart([]);
    } catch (err: any) {
      console.error(err);
      showToast(err.response?.data?.message || err.message || "Lỗi khi xác nhận khẩn cấp", "error");
    } finally {
      setIsOverriding(false);
    }
  };

  const handleSearchCustomer = async () => {
    if (!customerPhone) return;
    setIsSearchingCustomer(true);
    setLoyaltyInfo(null);
    setUsePoints(false);
    setRedeemedPoints(0);
    try {
      const [loyaltyRes] = await Promise.all([
        api.get(`/api/users/loyalty/lookup?phone=${customerPhone}`),
        lookupCustomerSegment(customerPhone),
      ]);
      if (loyaltyRes.data && !loyaltyRes.data.error) {
        setLoyaltyInfo(loyaltyRes.data);
        if (loyaltyRes.data.email) {
          setPatientEmail(loyaltyRes.data.email);
        }
        showToast("Đã tìm thấy khách hàng thành viên!", "success");
      } else {
        showToast("Không tìm thấy thông tin thành viên.", "warning");
      }
    } catch (err) {
      console.error(err);
      showToast("Không tìm thấy thông tin thành viên.", "warning");
    } finally {
      setIsSearchingCustomer(false);
    }
  };

  const handleClearCustomer = () => {
    setLoyaltyInfo(null);
    setCustomerPhone("");
    setUsePoints(false);
    setRedeemedPoints(0);
    setPatientEmail("");
    clearCustomerSegment();
  };

  const finalizeSalesOrder = async (payload: any) => {
    setLoading(true);
    setError("");
    try {
      const result = await orderService.createSale(payload);

      setInvoiceData({
        ...normalizeInvoiceResult(result),
        aiPharmacistConfirmation
      });
      setShowInvoiceModal(true);
      setCart([]); // Clear cart
      setAiPharmacistConfirmation(null);

      if (appliedVoucher) {
        setInvoiceVoucher(appliedVoucher);
      } else {
        setInvoiceVoucher(null);
      }
      setAppliedVoucher(null);
      setVoucherCode("");
      setVoucherError("");
    } catch (err: any) {
      const msg = err.response?.data?.message || err.message || "Lỗi khi bán lẻ";
      setError(msg);
      showToast(msg, "error");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    let interval: any;
    if (payosPolling && payosOrderCode) {
      interval = setInterval(async () => {
        try {
          const data = await orderService.checkOrderStatus(payosOrderCode);
          if (data.status === "PAID" && !payosPaidHandledRef.current) {
            payosPaidHandledRef.current = true;
            setPayosPolling(false);
            setShowPayOSModal(false);
            setInvoiceData({
              ...normalizeInvoiceResult(data),
              aiPharmacistConfirmation
            });
            setShowInvoiceModal(true);
            setCart([]); // Clear cart
            setAiPharmacistConfirmation(null);
          }
        } catch (err) {
          console.error("Lỗi polling status thanh toán:", err);
        }
      }, 3000);
    }
    return () => clearInterval(interval);
  }, [payosPolling, payosOrderCode, pendingSalePayload]);

  const checkManualPayment = async () => {
    if (!payosOrderCode) return;
    try {
      const data = await orderService.checkOrderStatus(payosOrderCode);
      if (data.status === "PAID" && !payosPaidHandledRef.current) {
        payosPaidHandledRef.current = true;
        setPayosPolling(false);
        setShowPayOSModal(false);
        setInvoiceData({
          ...normalizeInvoiceResult(data),
          aiPharmacistConfirmation
        });
        setShowInvoiceModal(true);
        setCart([]); // Clear cart
        setAiPharmacistConfirmation(null);
      } else {
        showToast("Hệ thống chưa ghi nhận được thanh toán. Vui lòng chuyển khoản lại hoặc đợi vài giây.", "warning");
      }
    } catch (err: any) {
      console.error(err);
      showToast("Lỗi kiểm tra trạng thái thanh toán.", "error");
    }
  };

  // AI Voice Recording States for Counter Sales
  const [voiceModalOpen, setVoiceModalOpen] = useState(false);
  const [recording, setRecording] = useState(false);
  const [timer, setTimer] = useState(0);
  const [aiLoading, setAiLoading] = useState(false);
  const [voiceBlob, setVoiceBlob] = useState<Blob | null>(null);
  const [aiResult, setAiResult] = useState<any>(null);

  // Pharmacist AI Confirmation & GPP Audit States
  const [aiPharmacistConfirmation, setAiPharmacistConfirmation] = useState<AIPharmacistConfirmationData | null>(null);
  const [pharmacistAgreementCheck, setPharmacistAgreementCheck] = useState<boolean>(true);
  const [showAuditModal, setShowAuditModal] = useState<boolean>(false);

  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const audioChunksRef = useRef<Blob[]>([]);
  const intervalRef = useRef<any>(null);

  useEffect(() => {
    if (recording) {
      intervalRef.current = setInterval(() => {
        setTimer((prev) => prev + 1);
      }, 1000);
    } else {
      clearInterval(intervalRef.current);
      setTimer(0);
    }
    return () => clearInterval(intervalRef.current);
  }, [recording]);

  const startVoiceRecording = async () => {
    setAiResult(null);
    setVoiceBlob(null);
    audioChunksRef.current = [];
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const mediaRecorder = new MediaRecorder(stream, { mimeType: "audio/webm" });
      mediaRecorder.ondataavailable = (event) => {
        if (event.data.size > 0) {
          audioChunksRef.current.push(event.data);
        }
      };
      mediaRecorder.onstop = () => {
        setVoiceBlob(new Blob(audioChunksRef.current, { type: "audio/webm" }));
        stream.getTracks().forEach((track) => track.stop());
      };
      mediaRecorderRef.current = mediaRecorder;
      mediaRecorder.start();
      setRecording(true);
    } catch (err) {
      console.error(err);
      showToast("Không thể kết nối Microphone. Vui lòng cấp quyền micro!", "error");
    }
  };

  const stopVoiceRecording = () => {
    if (mediaRecorderRef.current && recording) {
      mediaRecorderRef.current.stop();
      setRecording(false);
    }
  };

  const handleSendVoiceToAI = async () => {
    if (!voiceBlob) return;
    setAiLoading(true);
    try {
      const { branchId: currentBranchId } = getBranchInfoFromToken();
      const activeBranch = currentBranchId || "BR-001";

      const formData = new FormData();
      formData.append("audio", voiceBlob, "counter_recording.webm");
      if (activeBranch) {
        formData.append("branch_id", activeBranch);
      }

      const data = await prescriptionService.recommendPrescription(formData);

      // 🛡️ ĐỐI SOÁT TỒN KHO VẬT LÝ THỰC TẾ TẠI CHI NHÁNH HIỆN TẠI (BR-001)
      if (data?.inventory_status?.available && Array.isArray(data.inventory_status.available)) {
        const validatedAvailable = await Promise.all(
          data.inventory_status.available.map(async (av: any) => {
            try {
              // Tìm kiếm thuốc tại kho chi nhánh hiện tại
              const branchRes = await medicineService.getBranchMedicines(activeBranch, {
                search: av.name,
                limit: 10,
              });
              const branchMeds: any[] = branchRes?.data || [];

              // Tìm bản ghi khớp tên (ưu tiên bản ghi có tồn kho thực tế tại chi nhánh nếu có trùng SKU)
              const exactMatch =
                branchMeds.find(
                  (m: any) =>
                    (m.name.toLowerCase() === av.name.toLowerCase() || (m.id || m._id) === av.id) &&
                    (m.stock || 0) > 0
                ) ||
                branchMeds.find(
                  (m: any) =>
                    m.name.toLowerCase() === av.name.toLowerCase() || (m.id || m._id) === av.id
                );

              const branchStock = exactMatch ? Math.max(0, exactMatch.stock || 0) : (av.branch_stock ?? 0);

              return {
                ...av,
                id: exactMatch ? (exactMatch.id || exactMatch._id) : av.id,
                _id: exactMatch ? (exactMatch._id || exactMatch.id) : av._id,
                stock: branchStock,
                branchStock: branchStock,
                unit: exactMatch?.unit || av.unit || "Hộp",
                price: exactMatch?.price || av.price,
                active_ingredient: exactMatch?.active_ingredient || av.active_ingredient,
                baseUnit: exactMatch?.baseUnit || av.baseUnit,
                unitOptions: exactMatch?.unitOptions || av.unitOptions,
                fefoBatchNo: exactMatch?.fefoBatchNo,
                fefoExpDate: exactMatch?.fefoExpDate,
                suggested_alternatives: av.suggested_alternatives || [],
              };
            } catch (err) {
              console.warn("Lỗi đối soát kho chi nhánh cho thuốc", av.name, err);
              return { ...av, stock: av.branch_stock ?? 0, branchStock: av.branch_stock ?? 0 };
            }
          })
        );
        data.inventory_status.available = validatedAvailable;
      }

      setAiResult(data);
    } catch (err: any) {
      console.error(err);
      const errMsg = err.response?.data?.message || err.message || "Lỗi phân tích cuộc thoại từ AI.";
      showToast(errMsg, "error");
    } finally {
      setAiLoading(false);
    }
  };

  const handleSwapAlternative = (drugIndex: number, alternative: any) => {
    if (!aiResult?.prescription?.recommended_drugs) return;
    const updatedDrugs = [...aiResult.prescription.recommended_drugs];
    updatedDrugs[drugIndex] = {
      ...updatedDrugs[drugIndex],
      name: alternative.name,
      active_ingredient: alternative.active_ingredient,
      dosage: alternative.dosage || "Theo hướng dẫn bao bì",
    };

    const updatedAvailable = [...(aiResult.inventory_status?.available || [])];
    const existingIdx = updatedAvailable.findIndex(
      (av: any) => av.name.toLowerCase() === alternative.name.toLowerCase() || av.id === alternative.id
    );
    const newAvEntry = {
      ...alternative,
      id: alternative.id,
      _id: alternative.id,
      stock: alternative.stock,
      branchStock: alternative.stock,
      is_in_stock: true,
      unit: alternative.unit || "Hộp",
      price: alternative.price || 50000,
    };

    if (existingIdx >= 0) {
      updatedAvailable[existingIdx] = newAvEntry;
    } else {
      updatedAvailable.push(newAvEntry);
    }

    setAiResult({
      ...aiResult,
      prescription: {
        ...aiResult.prescription,
        recommended_drugs: updatedDrugs,
      },
      inventory_status: {
        ...aiResult.inventory_status,
        available: updatedAvailable,
      },
    });
    showToast(`Đã đổi sang thuốc thay thế có sẵn: ${alternative.name}`, "success");
  };


  const handleAddAiToCart = () => {
    if (!pharmacistAgreementCheck) {
      showToast("Vui lòng tích chọn cam kết trách nhiệm chuyên môn của Dược sĩ!", "warning");
      return;
    }
    if (!aiResult?.prescription?.recommended_drugs || !aiResult?.inventory_status?.available) return;
    const available = aiResult.inventory_status.available;
    let newCart = [...cart];
    let count = 0;
    const addedDrugs: any[] = [];
    const outOfStockDrugs: string[] = [];

    aiResult.prescription.recommended_drugs.forEach((drug: any) => {
      const match = available.find((av: any) => av.name.toLowerCase() === drug.name.toLowerCase());
      if (match && (match.stock || 0) > 0) {
        const medId = match.id || match._id;
        const existing = newCart.find(it => (it.id || it._id) === medId);
        if (existing) {
          if (existing.quantity < match.stock) {
            existing.quantity += 1;
            existing.aiSuggested = true;
            count++;
            addedDrugs.push({ name: match.name, dosage: drug.dosage || existing.dosageInstructions, quantity: 1, unit: existing.unit, price: existing.price, active_ingredient: match.active_ingredient });
          }
        } else {
          const unitOptions = buildUnitOptions(match);
          const defaultUnit = unitOptions[0] || { unitName: match.unit || "Hộp", exchangeValue: 1, price: match.price || 50000 };
          const newItem = {
            ...match,
            id: medId,
            baseUnit: match.baseUnit || defaultUnit.unitName || 'Hộp',
            unitOptions,
            selectedUnit: defaultUnit.unitName,
            unit: defaultUnit.unitName,
            exchangeValue: defaultUnit.exchangeValue,
            price: defaultUnit.price,
            stock: match.stock, // Đảm bảo gán đúng tồn kho chi nhánh
            quantity: 1,
            dosePerTime: 1,
            timesPerDay: 2,
            durationDays: 7,
            dailyDose: 2,
            dosageInstructions: drug.usage || `Uống 1 ${defaultUnit.unitName}/lần, ngày 2 lần`,
            active_ingredient: drug.active_ingredient || match.active_ingredient,
            aiSuggested: true
          };
          newCart.push(newItem);
          count++;
          addedDrugs.push({ name: match.name, dosage: newItem.dosageInstructions, quantity: 1, unit: newItem.unit, price: newItem.price, active_ingredient: match.active_ingredient });
        }
      } else {
        outOfStockDrugs.push(drug.name);
      }
    });

    if (count > 0) {
      setCart(newCart);

      const { fullName: currentUserName, branchId: currentBranchId } = getBranchInfoFromToken();
      const auditCode = `GPP-AI-${Math.floor(100000 + Math.random() * 900000)}`;

      const confirmationInfo: AIPharmacistConfirmationData = {
        confirmed: true,
        pharmacistName: currentUserName || "Dược sĩ Trần Thị A",
        pharmacistLicense: "CCHN-GPP/02849-HN",
        confirmedAt: new Date().toISOString(),
        auditCode,
        totalItems: count,
        patientName: loyaltyInfo ? loyaltyInfo.fullName : "Khách lẻ vãng lai",
        diagnosis: `Tư vấn triệu chứng AI: "${aiResult.transcribed_text || "Hội thoại quầy thuốc"}"`,
        doctorName: "Dược sĩ tư vấn tại quầy",
        hospitalName: "Nhà thuốc GPP",
        warningsCount: aiResult.prescription?.warnings ? 1 : 0,
        source: "AI_VOICE_CONSULT",
        drugs: addedDrugs,
        clinicalNotes: "Dược sĩ phụ trách đã thẩm định triệu chứng, kiểm tra chỉ định & liều lượng đối soát kho quầy."
      };

      setAiPharmacistConfirmation(confirmationInfo);
      showToast(`✅ Đã thêm ${count} thuốc có sẵn tại chi nhánh! (Mã duyệt: ${auditCode})`, "success");

      if (outOfStockDrugs.length > 0) {
        showToast(`⚠️ Bỏ qua ${outOfStockDrugs.length} thuốc đã hết hàng tại quầy: ${outOfStockDrugs.join(", ")}`, "warning");
      }
      setVoiceModalOpen(false);
    } else {
      const { branchId: currentBranchId } = getBranchInfoFromToken();
      showToast(
        `Không có thuốc nào trong đề xuất AI còn hàng tại Chi nhánh ${currentBranchId || "BR-001"}. Vui lòng bấm "Tìm thuốc thay thế" hoặc tạo phiếu điều chuyển kho!`,
        "warning"
      );
    }
  };

  const handleQuickConfirmAI = () => {
    const { fullName: currentUserName } = getBranchInfoFromToken();
    const auditCode = `GPP-AI-${Math.floor(100000 + Math.random() * 900000)}`;
    const confirmationInfo: AIPharmacistConfirmationData = {
      confirmed: true,
      pharmacistName: currentUserName || "Dược sĩ Trần Thị A",
      pharmacistLicense: "CCHN-GPP/02849-HN",
      confirmedAt: new Date().toISOString(),
      auditCode,
      totalItems: cart.length,
      patientName: loyaltyInfo ? loyaltyInfo.fullName : "Khách lẻ vãng lai",
      diagnosis: "Tư vấn phác đồ tại quầy",
      doctorName: "Dược sĩ phụ trách",
      hospitalName: "Nhà thuốc GPP",
      warningsCount: 0,
      source: "AI_VOICE_CONSULT",
      drugs: cart.map((item: any) => ({
        name: item.name,
        dosage: item.dosageInstructions || "Uống theo chỉ dẫn",
        quantity: item.quantity,
        unit: item.unit,
        active_ingredient: item.active_ingredient,
        price: item.price
      })),
      clinicalNotes: "Dược sĩ trực tiếp thẩm định lâm sàng tại quầy POS."
    };
    setAiPharmacistConfirmation(confirmationInfo);
    showToast(`✅ Dược sĩ ${confirmationInfo.pharmacistName} đã xác nhận bước cuối thành công! (Mã duyệt: ${auditCode})`, "success");
  };

  // Debounce search query & filters
  useEffect(() => {
    if (!searchQuery && !selectedCategory && !selectedClassification && stockFilter === "ALL") {
      setSearchResults([]);
      setIsDropdownOpen(false);
      return;
    }
    const delay = setTimeout(() => {
      searchMedicines(searchQuery, selectedCategory, selectedClassification, stockFilter);
    }, 300);
    return () => clearTimeout(delay);
  }, [searchQuery, selectedCategory, selectedClassification, stockFilter]);

  // ==========================================
  // FAST SCAN & GLOBAL USB SCANNER LISTENER
  // ==========================================
  const handleBarcodeScanned = async (barcode: string) => {
    if (!barcode || barcode.trim().length < 3) return;
    const cleanBarcode = barcode.trim();
    setLastScannedCode(cleanBarcode);
    setIsBarcodeLoading(true);

    try {
      const { branchId } = getBranchInfoFromToken();
      const res = await medicineService.getByBarcode(cleanBarcode, branchId || '');

      if (!res || !res.found || !res.medicine) {
        showToast(`❌ Không tìm thấy thuốc khớp mã: ${cleanBarcode}`, "error");
        return;
      }

      const med = res.medicine;
      const fefoBatch = res.fefoBatch;
      const totalStock = res.totalBranchStock ?? med.stock ?? 0;

      if (totalStock <= 0) {
        showToast(`⚠️ Thuốc "${med.name}" tạm hết hàng tại chi nhánh!`, "warning");
        handleFetchAlternatives(med);
        return;
      }

      // Âm thanh Beep xác nhận quét thành công
      try {
        const audioCtx = new (window.AudioContext || (window as any).webkitAudioContext)();
        const osc = audioCtx.createOscillator();
        const gain = audioCtx.createGain();
        osc.connect(gain);
        gain.connect(audioCtx.destination);
        osc.type = 'sine';
        osc.frequency.value = 980;
        gain.gain.setValueAtTime(0.12, audioCtx.currentTime);
        osc.start();
        osc.stop(audioCtx.currentTime + 0.1);
      } catch (e) { }

      const medId = med.id || med._id;
      const existing = cart.find(it => (it.id || it._id) === medId);

      if (existing) {
        if (existing.quantity >= totalStock) {
          showToast(`⚠️ Đã đạt số lượng tồn khả dụng tối đa (${totalStock}) của chi nhánh!`, "warning");
          return;
        }
        setCart(cart.map(it => (it.id || it._id) === medId ? { ...it, quantity: it.quantity + 1 } : it));
        showToast(`⚡ Quét mã: Đã tăng số lượng "${med.name}" (+1)!`, "success");
      } else {
        const unitOptions = buildUnitOptions(med);
        const selectedUnitObj = res.matchedUnit || unitOptions[0] || { unitName: med.unit || 'Hộp', exchangeValue: 1, price: med.price || 0 };
        const baseUnit = med.baseUnit || selectedUnitObj.unitName || 'viên';

        setCart(prev => [
          ...prev,
          {
            ...med,
            id: medId,
            baseUnit,
            unitOptions,
            selectedUnit: selectedUnitObj.unitName,
            unit: selectedUnitObj.unitName,
            exchangeValue: selectedUnitObj.exchangeValue || 1,
            price: selectedUnitObj.price || med.price || 0,
            quantity: 1,
            fefoBatchNo: fefoBatch ? fefoBatch.batchNo : undefined,
            fefoExpDate: fefoBatch ? fefoBatch.expDate : undefined,
            dosePerTime: 1,
            timesPerDay: 2,
            durationDays: 7,
            dailyDose: 2,
            dosageInstructions: `Uống 1 ${selectedUnitObj.unitName}/lần, 2 lần/ngày sau ăn - Dùng 7 ngày`
          }
        ]);

        const fefoTag = fefoBatch ? ` [Lô FEFO: ${fefoBatch.batchNo}]` : '';
        showToast(`⚡ Quét thành công: Đã thêm "${med.name}"${fefoTag}!`, "success");
      }
    } catch (err: any) {
      console.error("Lỗi tra cứu Barcode:", err);
      showToast(err.response?.data?.message || err.message || "Lỗi tra cứu mã vạch", "error");
    } finally {
      setIsBarcodeLoading(false);
    }
  };

  useEffect(() => {
    const handleGlobalKeyDown = (e: KeyboardEvent) => {
      if (!isScanActive) return;

      const target = e.target as HTMLElement;
      const isInput = target && (target.tagName === 'INPUT' || target.tagName === 'TEXTAREA');

      const now = Date.now();
      const diff = now - lastKeyTimeRef.current;
      lastKeyTimeRef.current = now;

      // Máy quét USB gõ chuỗi rất nhanh (khoảng cách < 45ms giữa các ký tự)
      if (e.key === 'Enter') {
        if (scanBufferRef.current.length >= 4 && (diff < 60 || !isInput)) {
          e.preventDefault();
          const code = scanBufferRef.current;
          scanBufferRef.current = "";
          handleBarcodeScanned(code);
        } else {
          scanBufferRef.current = "";
        }
      } else if (e.key.length === 1) {
        if (diff > 80 && !isInput) {
          scanBufferRef.current = e.key;
        } else {
          scanBufferRef.current += e.key;
        }
      }

      if (e.key === "Escape") {
        setIsDropdownOpen(false);
      }
    };

    window.addEventListener("keydown", handleGlobalKeyDown);
    return () => window.removeEventListener("keydown", handleGlobalKeyDown);
  }, [cart, isScanActive]);

  const { onEvent, offEvent } = useSocket();

  useEffect(() => {
    const handleInventoryUpdate = (data: any) => {
      console.log('Inventory updated event received in RetailView:', data);
      if (searchQuery || selectedCategory || selectedClassification) {
        searchMedicines(searchQuery);
      }
    };

    onEvent('broadcast.inventory_updated', handleInventoryUpdate);

    return () => {
      offEvent('broadcast.inventory_updated', handleInventoryUpdate);
    };
  }, [onEvent, offEvent, searchQuery, selectedCategory, selectedClassification]);

  const searchMedicines = async (query: string, cat?: string, cls?: string, stockF?: string) => {
    setLoading(true);
    try {
      const { branchId } = getBranchInfoFromToken();
      const catParam = cat !== undefined ? cat : selectedCategory;
      const clsParam = cls !== undefined ? cls : selectedClassification;
      const currentStockF = stockF !== undefined ? stockF : stockFilter;
      const data = await medicineService.getBranchMedicines(branchId || '', {
        limit: 20,
        search: query ? query.trim() : undefined,
        category: catParam || undefined,
        classification: clsParam || undefined,
        branchStockOnly: currentStockF === "IN_STOCK"
      });
      let res = data.data || [];
      if (currentStockF === "IN_STOCK") {
        res = res.filter((m: any) => (m.stock || 0) > 0);
      } else if (currentStockF === "OUT_OF_STOCK") {
        res = res.filter((m: any) => (m.stock || 0) <= 0);
      }
      setSearchResults(res);
      setIsDropdownOpen(true);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const buildUnitOptions = (med: any) => {
    if (med.units && Array.isArray(med.units) && med.units.length > 0) {
      return med.units;
    }
    if (med.unitOptions && Array.isArray(med.unitOptions) && med.unitOptions.length > 0) {
      return med.unitOptions;
    }
    const basePrice = med.price || 50000;
    const nameLower = (med.name || '').toLowerCase();
    const mainUnit = med.unit || 'Hộp';

    if (mainUnit === 'Hộp' && (nameLower.includes('gói') || nameLower.includes('ống') || nameLower.includes('chai') || nameLower.includes('lọ'))) {
      const isGoi = nameLower.includes('gói');
      const isOng = nameLower.includes('ống');
      const subUnitName = isGoi ? 'Gói' : (isOng ? 'Ống' : 'Lọ/Chai');
      const matchSubCount = nameLower.match(/(\d+)\s*(gói|ống|chai|lọ)/);
      const subCount = matchSubCount ? parseInt(matchSubCount[1], 10) : 10;
      return [
        { unitName: 'Hộp', exchangeValue: subCount, price: basePrice, isBaseUnit: true },
        { unitName: subUnitName, exchangeValue: 1, price: Math.round(basePrice / subCount * 1.05) },
      ];
    }

    if (mainUnit === 'Hộp') {
      return [
        { unitName: 'Hộp', exchangeValue: 100, price: basePrice, isBaseUnit: true },
        { unitName: 'Vỉ', exchangeValue: 10, price: Math.round(basePrice / 10 * 1.05) },
        { unitName: 'Viên', exchangeValue: 1, price: Math.round(basePrice / 100 * 1.1) },
      ];
    } else if (mainUnit === 'Vỉ') {
      return [
        { unitName: 'Vỉ', exchangeValue: 10, price: basePrice, isBaseUnit: true },
        { unitName: 'Viên', exchangeValue: 1, price: Math.round(basePrice / 10 * 1.1) },
      ];
    } else if (mainUnit === 'Gói' || mainUnit === 'Chai' || mainUnit === 'Ống' || mainUnit === 'Tuýp' || mainUnit === 'Lọ') {
      return [
        { unitName: mainUnit, exchangeValue: 1, price: basePrice, isBaseUnit: true }
      ];
    }
    return [
      { unitName: mainUnit || 'Hộp', exchangeValue: 1, price: basePrice, isBaseUnit: true }
    ];
  };

  const addToCart = (med: any) => {
    const medId = med.id || med._id;
    const existing = cart.find(it => (it.id || it._id) === medId);
    if (existing) {
      setCart(cart.map(it => (it.id || it._id) === medId ? { ...it, quantity: it.quantity + 1 } : it));
      if (existing.quantity + 1 > (med.stock || 0)) {
        showToast(`Cảnh báo: Số lượng thuốc "${med.name}" vượt quá tồn kho (${med.stock || 0} ${med.unit || 'viên'})!`, "warning");
      }
    } else {
      const unitOptions = buildUnitOptions(med);
      const isViProduct = (med.name || '').toLowerCase().includes('ngậm') || (med.name || '').toLowerCase().includes('sủi');
      // Ưu tiên Vỉ cho viên ngậm/sủi, hoặc đơn vị lẻ cho thuốc kê đơn theo ngày
      const defaultUnit = (isViProduct && unitOptions.length > 2)
        ? unitOptions[1]
        : (unitOptions.length > 1 ? unitOptions[unitOptions.length - 1] : unitOptions[0]);
      const baseUnit = med.baseUnit || defaultUnit.unitName || 'viên';
      const dosePerTime = 1;
      const timesPerDay = 2;
      const durationDays = 7;
      const dailyDose = dosePerTime * timesPerDay;
      const qty = defaultUnit.exchangeValue === 1 ? (dailyDose * durationDays) : 1;
      const dosageInstructions = `Sáng 1 ${baseUnit}, Tối 1 ${baseUnit} sau ăn - Dùng trong ${durationDays} ngày`;

      setCart([
        ...cart,
        {
          ...med,
          id: medId,
          baseUnit: baseUnit,
          unitOptions,
          selectedUnit: defaultUnit.unitName,
          unit: defaultUnit.unitName,
          exchangeValue: defaultUnit.exchangeValue,
          price: defaultUnit.price,
          quantity: qty,
          dosePerTime,
          timesPerDay,
          durationDays,
          dailyDose,
          dosageInstructions,
        }
      ]);

      if ((med.stock || 0) <= 0) {
        showToast(`Thuốc "${med.name}" hiện đang hết hàng ở chi nhánh (Tồn: 0). Vui lòng tìm thuốc thay thế hoặc điều chuyển kho!`, "warning");
      }
    }
    setSearchQuery("");
    setSearchResults([]);
    setShowAlternativesModal(false);
  };

  const handleUnitChange = (medId: string, unitName: string) => {
    setCart(cart.map(it => {
      if ((it.id || it._id) !== medId) return it;
      const opt = it.unitOptions?.find((u: any) => u.unitName === unitName) || { unitName, exchangeValue: 1, price: it.price };
      let newQty = it.quantity;
      if (opt.exchangeValue === 1) {
        newQty = (it.dailyDose || 2) * (it.durationDays || 7);
      } else {
        newQty = Math.max(1, Math.ceil(((it.dailyDose || 2) * (it.durationDays || 7)) / (opt.exchangeValue || 1)));
      }
      return {
        ...it,
        selectedUnit: opt.unitName,
        unit: opt.unitName,
        exchangeValue: opt.exchangeValue,
        price: opt.price,
        quantity: newQty
      };
    }));
  };

  const handleDosageChange = (medId: string, field: string, val: any) => {
    setCart(cart.map(it => {
      if ((it.id || it._id) !== medId) return it;
      const updated = { ...it, [field]: val };
      const dPerTime = Number(field === 'dosePerTime' ? val : updated.dosePerTime) || 1;
      const tPerDay = Number(field === 'timesPerDay' ? val : updated.timesPerDay) || 2;
      const dDays = Number(field === 'durationDays' ? val : updated.durationDays) || 1;
      const dailyD = dPerTime * tPerDay;
      updated.dailyDose = dailyD;
      const bUnit = updated.baseUnit || updated.selectedUnit || 'viên';

      if (field === 'durationDays' || field === 'dosePerTime' || field === 'timesPerDay') {
        if (updated.exchangeValue === 1) {
          updated.quantity = Math.max(1, dailyD * dDays);
        } else {
          const factor = updated.exchangeValue || 100;
          updated.quantity = Math.max(1, Math.ceil((dailyD * dDays) / factor));
        }
        updated.dosageInstructions = `Uống ${dPerTime} ${bUnit}/lần, ${tPerDay} lần/ngày sau ăn - Dùng trong ${dDays} ngày`;
      }
      return updated;
    }));
  };

  const handleQuickPreset = (medId: string, days: number, presetText?: string) => {
    setCart(cart.map(it => {
      if ((it.id || it._id) !== medId) return it;
      const dPerTime = Number(it.dosePerTime) || 1;
      const tPerDay = Number(it.timesPerDay) || 2;
      const dailyD = dPerTime * tPerDay;
      const bUnit = it.baseUnit || it.selectedUnit || 'viên';
      const newQty = it.exchangeValue === 1
        ? Math.max(1, dailyD * days)
        : Math.max(1, Math.ceil((dailyD * days) / (it.exchangeValue || 100)));
      return {
        ...it,
        durationDays: days,
        quantity: newQty,
        dosageInstructions: presetText || `Uống ${dPerTime} ${bUnit}/lần, ${tPerDay} lần/ngày sau ăn - Dùng trong ${days} ngày`
      };
    }));
  };

  const handleFetchAlternatives = async (med: any) => {
    setSelectedOutOfStockMed(med);
    setShowAlternativesModal(true);
    setLoadingAlternatives(true);
    setSearchQuery("");
    setSearchResults([]);
    try {
      const { branchId } = getBranchInfoFromToken();
      const res = await medicineService.getAlternatives(med.id || med._id, branchId || "BR-001");
      setAlternativesList(Array.isArray(res) ? res : (res.data || []));
    } catch (err) {
      console.error(err);
      showToast("Lỗi khi tìm thuốc thay thế", "error");
    } finally {
      setLoadingAlternatives(false);
    }
  };

  const handleApplyVoucher = async () => {
    const code = voucherCode.trim().toUpperCase();
    setVoucherError("");

    if (!code) {
      setVoucherError("Vui lòng nhập mã giảm giá");
      return;
    }
    if (cart.length === 0 || subtotal <= 0) {
      setVoucherError("Vui lòng thêm sản phẩm trước khi áp dụng mã");
      return;
    }

    setIsValidatingVoucher(true);
    try {
      const result = await voucherService.validateVoucher(code, subtotal);
      if (result?.error) {
        setVoucherError(result.message || "Mã giảm giá không hợp lệ");
        setAppliedVoucher(null);
        return;
      }

      setAppliedVoucher(result);
      setVoucherCode("");
      const maxRedeem = Math.floor(Math.max(0, subtotal - vipDiscount - result.discount) * 0.5);
      if (redeemedPoints > maxRedeem) {
        setRedeemedPoints(maxRedeem);
      }
      showToast(`Đã áp dụng mã ${result.code}`, "success");
    } catch (err: any) {
      const msg = err.response?.data?.message || err.message || "Không thể áp dụng mã giảm giá";
      setVoucherError(msg);
      setAppliedVoucher(null);
    } finally {
      setIsValidatingVoucher(false);
    }
  };

  const handleRemoveVoucher = () => {
    setAppliedVoucher(null);
    setVoucherError("");
  };

  const handleAdjustToMaxStock = (medId: string) => {
    setCart(cart.map(it => {
      if ((it.id || it._id) !== medId) return it;
      const factor = it.exchangeValue || 1;
      const availableStock = it.stock || 0;
      if (availableStock <= 0) return it;

      const maxUnits = Math.max(1, Math.floor(availableStock / factor));
      const dailyDose = it.dailyDose || ((it.dosePerTime || 1) * (it.timesPerDay || 2));
      const newDays = Math.max(1, Math.floor((maxUnits * factor) / dailyDose));
      const bUnit = it.baseUnit || it.selectedUnit || 'viên';

      return {
        ...it,
        quantity: maxUnits,
        durationDays: newDays,
        dosageInstructions: `Uống ${it.dosePerTime || 1} ${bUnit}/lần, ${it.timesPerDay || 2} lần/ngày sau ăn - Dùng trong ${newDays} ngày`
      };
    }));
    showToast("Đã tự động điều chỉnh số lượng theo tồn kho thực tế!", "info");
  };

  const updateQty = (id: string, change: number, maxStock?: number) => {
    const item = cart.find(it => (it.id || it._id) === id);
    if (!item) return;
    const newQty = item.quantity + change;
    if (newQty <= 0) {
      setCart(cart.filter(it => (it.id || it._id) !== id));
    } else {
      const factor = item.exchangeValue || 1;
      const requiredBase = newQty * factor;
      const availableStock = item.stock || 0;
      if (requiredBase > availableStock) {
        showToast(`Đã vượt quá tồn kho khả dụng (${availableStock} ${item.baseUnit || 'đơn vị'})!`, "warning");
      }
      setCart(cart.map(it => (it.id || it._id) === id ? { ...it, quantity: newQty } : it));
    }
  };

  const handleCheckout = async () => {
    if (cart.length === 0) return;

    // 🛡️ CHECKOUT GUARD: Kiểm tra tồn kho trước khi thanh toán
    const overStockItem = cart.find(it => {
      const factor = it.exchangeValue || 1;
      const req = it.quantity * factor;
      const avail = it.stock || 0;
      return req > avail;
    });

    if (overStockItem) {
      const factor = overStockItem.exchangeValue || 1;
      const req = overStockItem.quantity * factor;
      const avail = overStockItem.stock || 0;
      const bUnit = overStockItem.baseUnit || overStockItem.unit || 'đơn vị';
      const msg = `Không thể thanh toán: Thuốc "${overStockItem.name}" vượt quá tồn kho (Cần ${req} ${bUnit}, kho chỉ còn ${avail} ${bUnit})!`;
      setError(msg);
      showToast(msg, "error");
      return;
    }

    setError("");
    try {
      const { branchId: currentBranchId, fullName: currentUserName } = getBranchInfoFromToken();

      const generatedOrderCode = Math.floor(10000000 + Math.random() * 90000000);
      const patientName = loyaltyInfo ? loyaltyInfo.fullName : "Khách lẻ vãng lai";
      const patientPhone = loyaltyInfo ? loyaltyInfo.phone : "0900000000";

      const payload = {
        type: "RETAIL",
        branchId: currentBranchId || undefined,
        items: cart.map(it => ({
          medicineId: it.id || it._id,
          name: it.name,
          quantity: it.quantity,
          price: it.price,
          unit: it.selectedUnit || it.unit || "Hộp",
          exchangeValue: it.exchangeValue || 1,
          dosePerTime: it.dosePerTime || 1,
          timesPerDay: it.timesPerDay || 2,
          dailyDose: it.dailyDose || 2,
          durationDays: it.durationDays || 1,
          dosageInstructions: it.dosageInstructions || "",
        })),
        paymentMethod,
        soldBy: currentUserName || "Dược sĩ Trần Thị A",
        orderCode: generatedOrderCode,
        patientName,
        patientPhone,
        patientEmail: patientEmail || undefined,
        redeemedPoints: usePoints ? redeemedPoints : 0,
        remarks: aiPharmacistConfirmation?.confirmed
          ? `[ĐÃ XÁC NHẬN BỞI DS ${aiPharmacistConfirmation.pharmacistName} - MÃ DUYỆT ${aiPharmacistConfirmation.auditCode}]`
          : undefined,
        aiAssisted: Boolean(aiPharmacistConfirmation?.confirmed),
        pharmacistConfirmed: Boolean(aiPharmacistConfirmation?.confirmed),
        pharmacistConfirmedBy: aiPharmacistConfirmation?.pharmacistName,
        pharmacistConfirmedAt: aiPharmacistConfirmation?.confirmedAt,
        aiAuditCode: aiPharmacistConfirmation?.auditCode,
      };

      if (paymentMethod === "QR_PAY") {
        const payosResult = await orderService.createPayOSLink({
          patientName,
          patientPhone,
          patientEmail: patientEmail || undefined,
          totalAmount: total,
          paymentMethod: "QR_PAY",
          voucherCode: appliedVoucher ? appliedVoucher.code : undefined,
          redeemedPoints: usePoints ? redeemedPoints : 0,
          items: cart.map(it => ({
            medicineId: it.id || it._id,
            name: it.name,
            quantity: it.quantity,
            price: it.price,
            unit: it.unit
          }))
        });

        payload.orderCode = payosResult.orderCode;

        payosPaidHandledRef.current = false;
        setPayosCheckoutUrl(payosResult.checkoutUrl);
        setPayosQrCode(payosResult.qrCode || "");
        setPayosOrderCode(payosResult.orderCode);
        setPendingSalePayload(payload);
        setShowPayOSModal(true);
        setPayosPolling(true);
      } else {
        await finalizeSalesOrder(payload);
      }
    } catch (err: any) {
      const msg = err.response?.data?.message || err.message || "Lỗi khi bán lẻ";
      setError(msg);
      showToast(msg, "error");
    }
  };

  // Tính toán
  const subtotal = cart.reduce((sum, it) => sum + (it.price * it.quantity), 0);
  const vipDiscount = Math.round(subtotal * 0.05); // VIP discount
  const voucherDiscount = appliedVoucher ? appliedVoucher.discount : 0;

  // 1 point = 1 VND
  const pointsDiscount = usePoints ? Math.min(redeemedPoints, Math.max(0, subtotal - vipDiscount - voucherDiscount)) : 0;

  const vat = Math.round(Math.max(0, subtotal - vipDiscount - voucherDiscount - pointsDiscount) * 0.08);
  const total = Math.max(0, subtotal - vipDiscount - voucherDiscount - pointsDiscount + vat);
  const earnedPoints = Math.round(total / 100) * (loyaltyInfo ? loyaltyInfo.multiplier || 1.0 : 1.0);

  // Cảnh báo tương tác thuốc trong giỏ hàng lẻ
  const hasCiprofloxacin = cart.some(it => it.name?.toLowerCase().includes("ciprofloxacin") || it.active_ingredient?.toLowerCase().includes("ciprofloxacin"));
  const hasWarfarin = cart.some(it => it.name?.toLowerCase().includes("warfarin") || it.active_ingredient?.toLowerCase().includes("warfarin"));
  const hasInteraction = hasCiprofloxacin && hasWarfarin;

  // 🧠 AI Gợi ý Thực Phẩm Chức Năng Bổ Trợ Bệnh Mãn Tính (Dựa trên Phác đồ GPP)
  const chronicCareSuggestions = useMemo(() => {
    const list: any[] = [];
    const fullText = cart.map(it => `${it.name} ${it.active_ingredient || ""}`).join(" ").toLowerCase();

    // 1. Huyết áp & Tim mạch
    if (fullText.includes("amlodipine") || fullText.includes("losartan") || fullText.includes("telmisartan") ||
      fullText.includes("captopril") || fullText.includes("enalapril") || fullText.includes("bisoprolol") ||
      fullText.includes("nifedipine") || fullText.includes("plavix") || fullText.includes("aspirin") || fullText.includes("huyết áp")) {
      list.push({
        id: "CARDIO",
        title: "Bệnh Mãn Tính: Tăng Huyết Áp & Tim Mạch",
        badge: "Khuyến nghị Tim mạch",
        badgeColor: "bg-rose-50 text-rose-700 border-rose-200",
        icon: "❤️",
        supplements: [
          {
            name: "Coenzyme Q10 (CoQ10) 100mg",
            desc: "Tăng cường năng lượng cơ tim, hỗ trợ hạ áp tâm thu tự nhiên và giảm mệt mỏi.",
            timing: "1 viên/ngày sau bữa ăn sáng"
          },
          {
            name: "Dầu cá Omega-3 Tim Mạch (EPA/DHA)",
            desc: "Giúp làm sạch mỡ máu, duy trì độ dẻo dai của thành mạch máu.",
            timing: "1 viên/ngày sau ăn"
          }
        ],
        caution: "CẢNH BÁO CHỐNG CHỈ ĐỊNH: Tuyệt đối không dùng chung với Nhân Sâm, Cam Thảo hoặc thuốc co mạch trị sổ mũi (nguy cơ tăng vọt huyết áp kịch phát)."
      });
    }

    // 2. Đái tháo đường (Tiểu đường)
    if (fullText.includes("metformin") || fullText.includes("gliclazide") || fullText.includes("glimepiride") ||
      fullText.includes("januvia") || fullText.includes("forxiga") || fullText.includes("jardiance") || fullText.includes("tiểu đường")) {
      list.push({
        id: "DIABETES",
        title: "Bệnh Mãn Tính: Đái Tháo Đường Type 2",
        badge: "Khuyến nghị Nội tiết",
        badgeColor: "bg-blue-50 text-blue-700 border-blue-200",
        icon: "🩸",
        supplements: [
          {
            name: "Vitamin B12 500mcg (Methylcobalamin)",
            desc: "Bổ sung dự phòng do dùng Metformin dài ngày gây cản trở hấp thu B12, phòng ngừa biến chứng tê bì châm chích đầu chi.",
            timing: "1 viên/ngày sau ăn sáng"
          },
          {
            name: "Trà Dây Thìa Canh Chuẩn Hóa",
            desc: "Hỗ trợ ổn định đường huyết, tăng tiết insulin tự nhiên.",
            timing: "Uống sau ăn 30 phút"
          }
        ],
        caution: "LƯU Ý: Tránh các loại TPCN dạng siro hoặc viên sủi có chứa đường saccharose."
      });
    }

    // 3. Kháng sinh đường uống
    if (fullText.includes("amoxicillin") || fullText.includes("augmentin") || fullText.includes("cefixime") ||
      fullText.includes("ciprofloxacin") || fullText.includes("azithromycin") || fullText.includes("klamentin")) {
      list.push({
        id: "ANTIBIOTIC",
        title: "Phác Đồ Kháng Sinh Đường Uống",
        badge: "Bảo vệ Tiêu hóa",
        badgeColor: "bg-amber-50 text-amber-700 border-amber-200",
        icon: "🛡️",
        supplements: [
          {
            name: "Men Vi Sinh Probiotics (Enterogermina / Bio-acimin)",
            desc: "Phục hồi hệ vi khuẩn có lợi đường ruột, ngăn ngừa tiêu chảy và rối loạn tiêu hóa do kháng sinh.",
            timing: "Uống cách kháng sinh ít nhất 2 giờ"
          }
        ]
      });
    }

    // 4. Xương khớp & Giảm đau kháng viêm NSAID
    if (fullText.includes("celecoxib") || fullText.includes("meloxicam") || fullText.includes("diclofenac") ||
      fullText.includes("ibuprofen") || fullText.includes("glucosamine")) {
      list.push({
        id: "JOINT",
        title: "Bệnh Lý Cơ Xương Khớp & Kháng Viêm",
        badge: "Bổ trợ Khớp & Dạ dày",
        badgeColor: "bg-emerald-50 text-emerald-700 border-emerald-200",
        icon: "🦴",
        supplements: [
          {
            name: "Canxi Nano D3 + K2 (MK7)",
            desc: "Bổ sung canxi đưa thẳng vào xương, tăng mật độ xương và phòng loãng xương.",
            timing: "1 viên/ngày vào buổi sáng"
          },
          {
            name: "Thuốc Bao Niêm Mạc Dạ Dày (Esomeprazole 20mg)",
            desc: "Bảo vệ dạ dày khỏi tác dụng phụ gây loét của thuốc kháng viêm giảm đau NSAID.",
            timing: "Uống trước ăn sáng 30 phút"
          }
        ]
      });
    }

    return list;
  }, [cart]);

  return (
    <div className="h-full flex flex-col xl:flex-row gap-6 overflow-hidden">
      {/* Cột trái: Tìm kiếm & Giỏ hàng */}
      <div className="flex-1 overflow-y-auto pr-1 flex flex-col gap-6 pb-6">

        {/* Tìm kiếm & Tư vấn bằng giọng nói AI */}
        <div className="relative shrink-0 flex flex-col gap-3">
          <div className="flex gap-3 items-center">
            <div className="relative flex-1">
              <div className="absolute inset-y-0 left-0 pl-4.5 flex items-center pointer-events-none text-slate-400">
                {isBarcodeLoading ? (
                  <Loader2 size={18} className="animate-spin text-emerald-600" />
                ) : loading ? (
                  <Loader2 size={18} className="animate-spin text-[#0057cd]" />
                ) : (
                  <SearchIcon size={18} />
                )}
              </div>
              <input
                type="text"
                placeholder="Nhập tên thuốc, hoạt chất hoặc quét mã vạch Barcode (USB Scanner)..."
                value={searchQuery}
                onFocus={() => { if (searchResults.length > 0) setIsDropdownOpen(true); }}
                onKeyDown={(e) => {
                  if (e.key === 'Enter' && searchQuery && /^\d{6,}$/.test(searchQuery.trim())) {
                    e.preventDefault();
                    handleBarcodeScanned(searchQuery.trim());
                    setSearchQuery('');
                  }
                }}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full pl-11 pr-24 py-3.5 bg-white border border-slate-200 rounded-[12px] text-slate-900 font-bold focus:outline-none focus:ring-2 focus:ring-[#0057cd] transition-all shadow-sm text-sm"
              />
              <div className="absolute inset-y-0 right-0 pr-2 flex items-center gap-1.5">
                {searchQuery && (
                  <button
                    onClick={() => { setSearchQuery(""); }}
                    className="p-1 text-slate-400 hover:text-slate-700"
                  >
                    <X size={16} />
                  </button>
                )}
                <div
                  className={`flex items-center gap-1 px-2.5 py-1 rounded-lg text-[10px] font-black uppercase tracking-wider select-none transition-all ${isBarcodeLoading
                      ? 'bg-emerald-500 text-white animate-pulse shadow-sm shadow-emerald-500/50'
                      : 'bg-emerald-50 text-emerald-700 border border-emerald-200/60'
                    }`}
                  title="Máy quét Barcode USB / Camera sẵn sàng"
                >

                </div>
              </div>
            </div>
            <button
              onClick={() => setVoiceModalOpen(true)}
              className="px-5 py-3.5 bg-gradient-to-r from-purple-600 to-[#0057cd] hover:from-purple-700 hover:to-[#00419e] text-white font-extrabold rounded-[12px] flex items-center justify-center gap-2 shadow-sm transition-all active:scale-95 cursor-pointer text-xs uppercase tracking-wider shrink-0"
            >
              <Sparkles size={15} /> Ghi âm & Tư vấn AI
            </button>
          </div>

          {/* Thanh Bộ Lọc Thuốc Nâng Cao */}
          <div className="flex flex-wrap items-center gap-2.5 bg-white p-2.5 rounded-xl border border-slate-200 shadow-sm">
            <div className="flex items-center gap-1.5 text-xs font-bold text-slate-500 mr-1">
              <Filter size={14} className="text-[#0057cd]" /> Bộ lọc:
            </div>

            {/* Select Nhóm Thuốc */}
            <select
              value={selectedCategory}
              onChange={(e) => {
                const val = e.target.value;
                setSelectedCategory(val);
                searchMedicines(searchQuery, val, selectedClassification, stockFilter);
              }}
              className="px-3 py-1.5 bg-slate-50 border border-slate-200 rounded-lg text-xs font-bold text-slate-700 outline-none focus:border-[#0057cd] cursor-pointer"
            >
              <option value="">Tất cả Nhóm thuốc</option>
              {categoriesList.length > 0 ? (
                categoriesList.map((cat) => (
                  <option key={cat} value={cat}>{cat}</option>
                ))
              ) : (
                <>
                  <option value="Kháng sinh">Thuốc kháng sinh</option>
                  <option value="Giảm đau - Hạ sốt">Giảm đau - Hạ sốt</option>
                  <option value="Tim mạch">Tim mạch</option>
                  <option value="Tiêu hóa">Tiêu hóa</option>
                  <option value="Thực phẩm chức năng">Thực phẩm chức năng</option>
                  <option value="Dược mỹ phẩm">Dược mỹ phẩm</option>
                  <option value="Vật tư y tế">Vật tư y tế</option>
                </>
              )}
            </select>

            {/* Select Phân loại thuốc */}
            <select
              value={selectedClassification}
              onChange={(e) => {
                const val = e.target.value;
                setSelectedClassification(val);
                searchMedicines(searchQuery, selectedCategory, val, stockFilter);
              }}
              className="px-3 py-1.5 bg-slate-50 border border-slate-200 rounded-lg text-xs font-bold text-slate-700 outline-none focus:border-[#0057cd] cursor-pointer"
            >
              <option value="">Tất cả Phân loại</option>
              <option value="PRESCRIPTION">Thuốc kê đơn (Rx)</option>
              <option value="NON_PRESCRIPTION">Thuốc không kê đơn (OTC)</option>
              <option value="SUPPLEMENT">Thực phẩm chức năng</option>
              <option value="MEDICAL_EQUIPMENT">Vật tư y tế</option>
            </select>

            {/* Select Tồn kho */}
            <select
              value={stockFilter}
              onChange={(e) => {
                const val = e.target.value;
                setStockFilter(val);
                searchMedicines(searchQuery, selectedCategory, selectedClassification, val);
              }}
              className="px-3 py-1.5 bg-slate-50 border border-slate-200 rounded-lg text-xs font-bold text-slate-700 outline-none focus:border-[#0057cd] cursor-pointer"
            >
              <option value="ALL">Tất cả tồn kho</option>
              <option value="IN_STOCK">Còn hàng (Tồn &gt; 0)</option>
              <option value="OUT_OF_STOCK">Hết hàng (Tồn = 0)</option>
            </select>

            {/* Nút Reset Lọc */}
            {(selectedCategory || selectedClassification || stockFilter !== "ALL" || searchQuery) && (
              <button
                onClick={() => {
                  setSelectedCategory("");
                  setSelectedClassification("");
                  setStockFilter("ALL");
                  setSearchQuery("");
                  setSearchResults([]);
                  setIsDropdownOpen(false);
                }}
                className="px-2.5 py-1.5 text-xs font-bold text-rose-600 hover:bg-rose-50 rounded-lg border border-rose-200 transition-colors flex items-center gap-1 ml-auto cursor-pointer"
              >
                <X size={12} /> Đặt lại
              </button>
            )}
          </div>

          {/* Kết quả tìm kiếm dropdown */}
          {isDropdownOpen && searchResults.length > 0 && (
            <div className="absolute left-0 right-0 top-full mt-2 bg-white rounded-xl border border-slate-200 shadow-xl max-h-80 overflow-y-auto z-40 divide-y divide-slate-100">
              <div className="p-2 bg-slate-50 text-[11px] font-bold text-slate-500 flex justify-between items-center sticky top-0 border-b border-slate-100">
                <span>Tìm thấy {searchResults.length} kết quả</span>
                <span className="text-[10px] text-slate-400">Nhấn Esc để đóng</span>
              </div>
              {searchResults.map((med) => {
                const totalStock = med.stock || 0;
                const boxCap = med.boxCapacity || (med.units && med.units[0]?.exchangeValue) || (med.unit === 'Hộp' ? 100 : 1);
                const unopenedBoxes = boxCap > 1 ? Math.max(0, Math.floor(totalStock / boxCap)) : totalStock;
                const openedUnits = med.openedBoxUnits !== undefined ? med.openedBoxUnits : (boxCap > 1 ? (totalStock % boxCap) : 0);
                const baseUnitName = med.baseUnit || (med.units && med.units.length > 1 ? med.units[med.units.length - 1].unitName : med.unit) || 'viên';

                return (
                  <button
                    key={med.id || med._id}
                    onClick={() => { addToCart(med); setIsDropdownOpen(false); }}
                    className="w-full p-3.5 text-left hover:bg-slate-50 transition-colors flex items-center justify-between group"
                  >
                    <div>
                      <div className="font-bold text-slate-900 text-[14px] group-hover:text-[#0057cd] transition-colors">{med.name}</div>
                      <div className="text-[11px] text-slate-500 mt-0.5">{med.category} | Hoạt chất: {med.active_ingredient || "N/A"}</div>
                      <div className="flex items-center gap-2 mt-1">
                        <span className="text-[10px] font-bold text-slate-600 bg-slate-100 px-2 py-0.5 rounded border border-slate-200">
                          📦 {unopenedBoxes} {med.unit || 'Hộp'} nguyên
                        </span>
                        {boxCap > 1 && (
                          <span className="text-[10px] font-bold text-blue-700 bg-blue-50 px-2 py-0.5 rounded border border-blue-200">
                            💊 Hộp lẻ: {openedUnits} {baseUnitName}
                          </span>
                        )}
                      </div>
                    </div>
                    <div className="text-right shrink-0 flex flex-col items-end">
                      <div className="font-bold text-[#0057cd]">{med.price?.toLocaleString()}₫</div>
                      <div className="text-[10px] text-slate-500 mt-0.5 font-semibold">Tổng tồn: {totalStock} {med.unit}</div>
                      {totalStock <= 0 && (
                        <span className="text-[9px] font-bold text-rose-500 mt-1 uppercase border border-rose-200 bg-rose-50 px-1.5 py-0.5 rounded">Hết hàng - Tìm thay thế</span>
                      )}
                    </div>
                  </button>
                );
              })}
            </div>
          )}
        </div>

        {error && (
          <div className="bg-red-50 border border-red-200 text-red-700 p-4 rounded-xl font-medium flex items-center gap-3">
            <XCircle className="text-red-500 shrink-0" size={20} />
            {error}
          </div>
        )}

        {/* Cảnh báo tương tác */}
        {hasInteraction && (
          <div className="bg-[#ffdad6] border border-[#93000a] rounded-[16px] p-5 shadow-sm flex items-start gap-4 animate-pulse">
            <div className="w-10 h-10 rounded-full bg-white flex items-center justify-center shrink-0 shadow-sm text-[#ba1a1a]">
              <ShieldAlert size={24} />
            </div>
            <div className="flex-1">
              <h3 className="text-[#93000a] font-bold text-[15px] mb-1 uppercase tracking-wide">
                CẢNH BÁO TƯƠNG TÁC THUỐC TRONG GIỎ HÀNG
              </h3>
              <p className="text-[#ba1a1a] text-[13px]">
                Sử dụng đồng thời <span className="font-bold">Ciprofloxacin</span> và <span className="font-bold">Warfarin</span> có thể làm tăng tác dụng chống đông của Warfarin một cách đột ngột, tăng đáng kể nguy cơ chảy máu nghiêm trọng. Vui lòng kiểm tra lại đơn!
              </p>
            </div>
          </div>
        )}

        {/* 🧠 AI CLINICAL & SUPPLEMENT ASSISTANT (GỢI Ý TPCN BỔ TRỢ THEO BỆNH MÃN TÍNH) */}
        {chronicCareSuggestions.length > 0 && (
          <div className="bg-gradient-to-br from-indigo-50/90 via-white to-blue-50/90 border-2 border-indigo-200 rounded-[20px] p-5 shadow-sm space-y-4">
            <div className="flex items-center justify-between border-b border-indigo-100 pb-3">
              <div className="flex items-center gap-2.5">
                <div className="w-8 h-8 rounded-xl bg-indigo-600 text-white flex items-center justify-center shadow">
                  <Sparkles size={18} className="animate-pulse" />
                </div>
                <div>
                  <h3 className="font-black text-slate-900 text-sm uppercase tracking-wide flex items-center gap-2">
                    AI Tư Vấn Phác Đồ & Thực Phẩm Chức Năng Bổ Trợ
                    <span className="text-[10px] font-bold bg-indigo-100 text-indigo-700 px-2 py-0.5 rounded-full">GPP Clinical Shield</span>
                  </h3>
                  <p className="text-xs text-slate-500">Phát hiện bệnh mãn tính từ phác đồ đang bán & gợi ý TPCN chuẩn y khoa</p>
                </div>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {chronicCareSuggestions.map((item, idx) => (
                <div key={idx} className="bg-white p-4 rounded-2xl border border-indigo-100 shadow-xs flex flex-col justify-between gap-3">
                  <div>
                    <div className="flex items-center justify-between gap-2">
                      <div className="font-black text-slate-900 text-xs flex items-center gap-1.5">
                        <span>{item.icon}</span>
                        <span>{item.title}</span>
                      </div>
                      <span className={`px-2 py-0.5 rounded-full text-[10px] font-black border ${item.badgeColor}`}>
                        {item.badge}
                      </span>
                    </div>

                    <div className="mt-3 space-y-2">
                      {item.supplements.map((sup: any, sIdx: number) => (
                        <div key={sIdx} className="bg-slate-50 p-2.5 rounded-xl border border-slate-100 flex flex-col gap-1">
                          <div className="font-bold text-xs text-indigo-950 flex items-center justify-between">
                            <span>✨ {sup.name}</span>
                            <span className="text-[10px] text-indigo-600 font-semibold bg-indigo-50 px-1.5 py-0.5 rounded">{sup.timing}</span>
                          </div>
                          <p className="text-[11px] text-slate-500 font-medium leading-relaxed">{sup.desc}</p>
                        </div>
                      ))}
                    </div>

                    {item.caution && (
                      <div className="mt-2.5 p-2 bg-rose-50 border border-rose-200 rounded-xl text-[10px] font-bold text-rose-800 flex items-start gap-1.5">
                        <AlertTriangle size={13} className="shrink-0 text-rose-600 mt-0.5" />
                        <span>{item.caution}</span>
                      </div>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* 🛡️ BANNER THÔNG BÁO XÁC NHẬN DƯỢC SĨ CHO ĐƠN THUỐC TƯ VẤN AI */}
        {aiPharmacistConfirmation?.confirmed && (
          <div className="bg-gradient-to-r from-emerald-500/10 via-teal-500/5 to-blue-500/10 border-2 border-emerald-400/80 rounded-2xl p-4 shadow-sm flex flex-col md:flex-row items-start md:items-center justify-between gap-4 backdrop-blur-xs animate-in fade-in slide-in-from-top-2 duration-300">
            <div className="flex items-center gap-3.5">
              <div className="relative">
                <div className="w-12 h-12 rounded-2xl bg-emerald-600 text-white flex items-center justify-center shadow-md shadow-emerald-600/30 shrink-0">
                  <ShieldCheck size={26} />
                </div>
                <span className="absolute -bottom-1 -right-1 flex h-4 w-4">
                  <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
                  <span className="relative inline-flex rounded-full h-4 w-4 bg-emerald-500 border-2 border-white"></span>
                </span>
              </div>
              <div>
                <div className="flex flex-wrap items-center gap-2">
                  <span className="px-2.5 py-0.5 rounded-full text-[10px] font-black uppercase tracking-wider bg-emerald-100 text-emerald-800 border border-emerald-300 flex items-center gap-1 shadow-2xs">
                    <CheckCircle2 size={11} className="text-emerald-700" /> ĐÃ XÁC NHẬN BƯỚC CUỐI • CHUẨN GPP
                  </span>
                  <span className="text-xs font-mono font-bold text-slate-500">
                    Mã duyệt: <strong className="text-emerald-700 font-extrabold">{aiPharmacistConfirmation.auditCode}</strong>
                  </span>
                </div>
                <h3 className="text-sm font-black text-slate-900 mt-1">
                  Dược sĩ <span className="text-emerald-700 underline decoration-emerald-400 decoration-2">{aiPharmacistConfirmation.pharmacistName}</span> đã thẩm định đơn thuốc tư vấn AI
                </h3>
                <p className="text-xs text-slate-500 mt-0.5">
                  Thời gian duyệt: <strong>{new Date(aiPharmacistConfirmation.confirmedAt).toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit', second: '2-digit' })}</strong> - {new Date(aiPharmacistConfirmation.confirmedAt).toLocaleDateString('vi-VN')} • {aiPharmacistConfirmation.totalItems} khoản mục thuốc
                </p>
              </div>
            </div>

            <div className="flex items-center gap-2 self-end md:self-center shrink-0">
              <button
                type="button"
                onClick={() => setShowAuditModal(true)}
                className="px-3.5 py-2 bg-white hover:bg-emerald-50 text-emerald-700 font-extrabold text-xs rounded-xl border border-emerald-300 shadow-2xs transition-all flex items-center gap-1.5 cursor-pointer hover:shadow"
              >
                <FileCheck2 size={15} /> Xem Biên Bản Thẩm Định AI
              </button>
              <button
                type="button"
                onClick={() => {
                  if (window.confirm("Bạn có chắc chắn muốn hủy xác nhận thẩm định của đơn thuốc AI này?")) {
                    setAiPharmacistConfirmation(null);
                    showToast("Đã hủy xác nhận thẩm định đơn thuốc AI.", "warning");
                  }
                }}
                className="px-2.5 py-2 text-slate-400 hover:text-rose-600 font-bold text-xs rounded-xl hover:bg-rose-50 transition-colors cursor-pointer"
                title="Hủy xác nhận thẩm định"
              >
                Hủy duyệt
              </button>
            </div>
          </div>
        )}

        {/* Cảnh báo nhắc nhở nếu có thuốc AI nhưng chưa xác nhận */}
        {cart.some((it: any) => it.aiSuggested) && !aiPharmacistConfirmation?.confirmed && (
          <div className="bg-amber-50 border-2 border-amber-300 rounded-2xl p-4 shadow-sm flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 animate-in fade-in duration-200">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-amber-500 text-white flex items-center justify-center shrink-0 shadow-sm">
                <AlertTriangle size={20} />
              </div>
              <div>
                <h4 className="text-xs font-black text-amber-950 uppercase tracking-wide flex items-center gap-1.5">
                  Đơn thuốc do AI tư vấn - Chờ Dược sĩ xác nhận bước cuối
                  <span className="bg-amber-200 text-amber-900 text-[10px] px-2 py-0.5 rounded-full font-bold">Quy chuẩn GPP</span>
                </h4>
                <p className="text-xs text-amber-800 mt-0.5">
                  Vui lòng đối soát lâm sàng các loại thuốc do AI gợi ý và bấm xác nhận để hoàn tất quy trình.
                </p>
              </div>
            </div>
            <button
              type="button"
              onClick={handleQuickConfirmAI}
              className="px-4 py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-black rounded-xl shadow transition-all flex items-center gap-1.5 shrink-0 cursor-pointer active:scale-95"
            >
              <ShieldCheck size={16} /> Dược Sĩ Xác Nhận Bước Cuối Ngay
            </button>
          </div>
        )}

        {/* Giỏ hàng bán lẻ POS chuyên nghiệp */}
        <div className="bg-white rounded-[16px] border border-slate-200 shadow-sm overflow-hidden flex-1 flex flex-col min-h-[480px]">
          <div className="px-6 py-4 border-b border-slate-100 flex items-center justify-between bg-slate-50 rounded-t-[16px]">
            <div className="flex items-center gap-2 font-bold text-slate-800">
              <ShoppingCart size={18} className="text-[#0057cd]" />
              Giỏ hàng bán lẻ & Phác đồ điều trị
            </div>
            <div className="flex items-center gap-2">
              <span className="inline-flex items-center gap-1.5 px-2.5 py-1 bg-emerald-50 text-emerald-700 border border-emerald-200 rounded-full text-[10px] font-black uppercase">
                <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse"></span>
                GPP Auto-Sync
              </span>
              <div className="px-3 py-1 bg-[#d8e3fb] text-[#00419e] font-bold text-[11px] rounded-full uppercase tracking-wider">
                {cart.reduce((sum, it) => sum + it.quantity, 0)} SẢN PHẨM
              </div>
            </div>
          </div>

          <div className="flex-1 overflow-y-auto divide-y divide-slate-100 p-4 space-y-4">
            {cart.length === 0 ? (
              <div className="h-full flex flex-col items-center justify-center p-8 text-center min-h-[250px]">
                <ShoppingCart size={40} className="text-slate-300 mb-3" />
                <h3 className="text-[15px] font-bold text-slate-500">Giỏ hàng trống</h3>
                <p className="text-slate-400 text-xs mt-1">Tìm kiếm thuốc ở trên để kê đơn và bán lẻ.</p>
              </div>
            ) : (
              cart.map((it) => {
                const totalStock = it.stock || 0;
                const boxCap = it.boxCapacity || (it.unitOptions?.find((u: any) => u.isBaseUnit)?.exchangeValue) || (it.unit === 'Hộp' ? 100 : 1);
                const unopenedBoxes = boxCap > 1 ? Math.max(0, Math.floor(totalStock / boxCap)) : totalStock;
                const openedUnits = it.openedBoxUnits !== undefined ? it.openedBoxUnits : (boxCap > 1 ? (totalStock % boxCap) : 0);
                const baseUnitName = it.baseUnit || (it.unitOptions && it.unitOptions.length > 1 ? it.unitOptions[it.unitOptions.length - 1].unitName : it.unit) || 'viên';

                const factor = it.exchangeValue || 1;
                const requiredBaseQty = it.quantity * factor;
                const isOverStock = requiredBaseQty > totalStock;

                return (
                  <div
                    key={it.id}
                    className={`rounded-2xl p-4 flex flex-col gap-3 transition-all hover:shadow-sm ${isOverStock
                        ? "bg-rose-50/40 border-2 border-rose-300"
                        : "bg-slate-50/60 border border-slate-200/80 hover:border-[#0057cd]/50"
                      }`}
                  >
                    {/* Cảnh báo vượt tồn kho */}
                    {isOverStock && (
                      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 bg-rose-50 border border-rose-200 rounded-xl p-3 text-rose-800 text-xs">
                        <div className="flex items-center gap-2 font-bold">
                          <AlertTriangle size={18} className="text-rose-600 shrink-0" />
                          <span>
                            Vượt quá tồn kho khả dụng! Cần <span className="text-rose-700 underline font-black">{requiredBaseQty} {baseUnitName}</span> ({it.quantity} {it.selectedUnit || it.unit}), nhưng kho chỉ còn <span className="text-rose-700 font-black">{totalStock} {baseUnitName}</span>.
                          </span>
                        </div>
                        <div className="flex items-center gap-2 shrink-0">
                          {totalStock > 0 && (
                            <button
                              type="button"
                              onClick={() => handleAdjustToMaxStock(it.id)}
                              className="px-2.5 py-1 bg-rose-600 hover:bg-rose-700 text-white rounded-lg text-[11px] font-black transition-all shadow-xs cursor-pointer"
                            >
                              Lấy tối đa ({Math.max(1, Math.floor(totalStock / factor))} {it.selectedUnit || it.unit})
                            </button>
                          )}
                          <button
                            type="button"
                            onClick={() => handleFetchAlternatives(it)}
                            className="px-2.5 py-1 bg-white hover:bg-rose-100 text-rose-700 border border-rose-300 rounded-lg text-[11px] font-bold transition-all cursor-pointer"
                          >
                            Tìm thuốc thay thế
                          </button>
                        </div>
                      </div>
                    )}

                    {/* Dòng 1: Thông tin cơ bản, Quy đổi đơn vị & Số lượng */}
                    <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-3">
                      <div className="flex-1">
                        <div className="flex items-center gap-2 flex-wrap">
                          <span className="font-black text-slate-900 text-[15px]">{it.name}</span>
                          <span className="text-[11px] text-slate-500 font-medium">({it.active_ingredient || "N/A"})</span>
                          {it.aiSuggested && (
                            <span className="inline-flex items-center gap-1 text-[10px] font-black text-emerald-800 bg-emerald-100/90 px-2 py-0.5 rounded-full border border-emerald-300 shadow-2xs">
                              <Sparkles size={10} className="text-emerald-600" /> AI Tư vấn • Đã duyệt GPP
                            </span>
                          )}
                        </div>
                        <div className="flex flex-wrap items-center gap-2 mt-1.5">
                          <span className="text-[10px] font-bold text-slate-600 bg-white px-2 py-0.5 rounded border border-slate-200">
                            📦 Kho: {unopenedBoxes} {it.unit || 'Hộp'} nguyên
                          </span>
                          {boxCap > 1 && (
                            <span className="text-[10px] font-bold text-blue-700 bg-blue-50 px-2 py-0.5 rounded border border-blue-200">
                              💊 Hộp lẻ dở: {openedUnits} {baseUnitName}
                            </span>
                          )}
                          {it.fefoBatchNo && (
                            <span className="text-[10px] font-bold text-emerald-800 bg-emerald-50 px-2 py-0.5 rounded border border-emerald-200 flex items-center gap-1">
                              <Zap size={11} className="text-emerald-600" />
                              Lô FEFO: {it.fefoBatchNo} {it.fefoExpDate ? `(HSD: ${new Date(it.fefoExpDate).toLocaleDateString('vi-VN')})` : ''}
                            </span>
                          )}
                        </div>
                      </div>

                      {/* Bộ chọn Đơn vị quy đổi */}
                      <div className="flex items-center gap-2">
                        <span className="text-xs font-bold text-slate-500">Đơn vị bán:</span>
                        <select
                          value={it.selectedUnit || it.unit || "Hộp"}
                          onChange={(e) => handleUnitChange(it.id, e.target.value)}
                          className="px-3 py-1.5 bg-white border border-slate-300 rounded-xl text-xs font-black text-slate-800 outline-none focus:ring-2 focus:ring-[#0057cd] cursor-pointer shadow-sm min-w-[85px]"
                        >
                          {(it.unitOptions && it.unitOptions.length > 0 ? it.unitOptions : buildUnitOptions(it)).map((u: any) => (
                            <option key={u.unitName} value={u.unitName}>
                              {u.unitName} ({(u.price || it.price || 0).toLocaleString()}₫)
                            </option>
                          ))}
                        </select>
                      </div>

                      {/* Tăng giảm số lượng */}
                      <div className="flex items-center gap-3">
                        <div className="flex items-center border border-slate-300 rounded-xl bg-white shadow-sm overflow-hidden">
                          <button
                            onClick={() => updateQty(it.id, -1, it.stock)}
                            className="p-2 hover:bg-slate-100 text-slate-600 transition-colors"
                          >
                            <Minus size={14} />
                          </button>
                          <span className="font-black text-[14px] text-slate-900 px-3 min-w-[32px] text-center">
                            {it.quantity}
                          </span>
                          <button
                            onClick={() => updateQty(it.id, 1, it.stock)}
                            className="p-2 hover:bg-slate-100 text-slate-600 transition-colors"
                          >
                            <Plus size={14} />
                          </button>
                        </div>
                        <div className="text-right min-w-[100px]">
                          <div className="font-black text-[#0057cd] text-[16px]">
                            {(it.price * it.quantity).toLocaleString()}₫
                          </div>
                          <span className="text-[10px] text-slate-400 font-bold">
                            {it.price.toLocaleString()}₫ / {it.selectedUnit || it.unit}
                          </span>
                        </div>
                      </div>
                    </div>

                    {/* Dòng 2: Bộ tính toán Liều dùng theo ngày (Dosage & Duration Calculator) */}
                    <div className="bg-white border border-slate-200/90 rounded-xl p-3 flex flex-col gap-2.5">
                      <div className="flex flex-wrap items-center gap-4 text-xs font-bold text-slate-700">
                        <div className="flex items-center gap-1.5">
                          <span className="text-slate-500">Liều mỗi lần:</span>
                          <input
                            type="number"
                            min="1"
                            max="10"
                            value={it.dosePerTime || 1}
                            onChange={(e) => handleDosageChange(it.id, 'dosePerTime', e.target.value)}
                            className="w-12 px-2 py-1 bg-slate-50 border border-slate-200 rounded-lg text-center font-black focus:outline-none focus:border-[#0057cd]"
                          />
                          <span className="text-[11px] text-slate-500 font-bold">{baseUnitName}</span>
                        </div>

                        <div className="flex items-center gap-1.5">
                          <span className="text-slate-500">Số lần/ngày:</span>
                          <input
                            type="number"
                            min="1"
                            max="6"
                            value={it.timesPerDay || 2}
                            onChange={(e) => handleDosageChange(it.id, 'timesPerDay', e.target.value)}
                            className="w-12 px-2 py-1 bg-slate-50 border border-slate-200 rounded-lg text-center font-black focus:outline-none focus:border-[#0057cd]"
                          />
                          <span className="text-[11px] text-slate-400">lần</span>
                        </div>

                        <div className="flex items-center gap-1.5">
                          <span className="text-[#0057cd]">Số ngày dùng:</span>
                          <input
                            type="number"
                            min="1"
                            max="90"
                            value={it.durationDays || 7}
                            onChange={(e) => handleDosageChange(it.id, 'durationDays', e.target.value)}
                            className="w-14 px-2 py-1 bg-blue-50 border border-blue-200 text-[#0057cd] rounded-lg text-center font-black focus:outline-none focus:border-[#0057cd]"
                          />
                          <span className="text-[11px] text-[#0057cd]">ngày</span>
                        </div>

                        {/* Nút chọn nhanh số ngày */}
                        <div className="flex items-center gap-1 ml-auto">
                          {[3, 5, 7, 10, 14].map((d) => (
                            <button
                              key={d}
                              type="button"
                              onClick={() => handleQuickPreset(it.id, d)}
                              className={`px-2 py-0.5 rounded-md text-[10px] font-black transition-all ${it.durationDays === d
                                  ? "bg-[#0057cd] text-white shadow-xs"
                                  : "bg-slate-100 text-slate-600 hover:bg-slate-200"
                                }`}
                            >
                              {d}N
                            </button>
                          ))}
                        </div>
                      </div>

                      {/* Ô nhập Hướng dẫn sử dụng & Tag gợi ý 1-Click */}
                      <div className="flex flex-col gap-1.5 pt-1 border-t border-slate-100">
                        <div className="flex items-center gap-2">
                          <span className="text-[11px] font-bold text-slate-500 shrink-0">Cách dùng:</span>
                          <input
                            type="text"
                            value={it.dosageInstructions || ""}
                            onChange={(e) => handleDosageChange(it.id, 'dosageInstructions', e.target.value)}
                            placeholder={`Nhập hướng dẫn liều dùng (${baseUnitName})...`}
                            className="flex-1 px-3 py-1.5 bg-slate-50 border border-slate-200 rounded-lg text-xs font-semibold focus:outline-none focus:border-[#0057cd] focus:bg-white"
                          />
                        </div>

                        {/* Tag gợi ý liều dùng nhanh 1-Click */}
                        <div className="flex flex-wrap items-center gap-1.5 pl-16">
                          {[
                            `Sáng 1 ${baseUnitName} - Tối 1 ${baseUnitName} sau ăn`,
                            `Ngày 2 lần sau ăn`,
                            `Dùng khi đau, cách 4-6h`,
                            `Trước ăn 30 phút`,
                            `Dùng với nhiều nước`,
                          ].map((tag, idx) => (
                            <button
                              key={idx}
                              type="button"
                              onClick={() => handleDosageChange(it.id, 'dosageInstructions', `${tag} - Dùng trong ${it.durationDays || 7} ngày`)}
                              className="px-2 py-0.5 bg-slate-100 hover:bg-blue-50 hover:text-blue-700 text-slate-600 text-[10px] font-semibold rounded-md transition-colors"
                            >
                              + {tag}
                            </button>
                          ))}
                        </div>
                      </div>
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </div>
      </div>

      {/* Cột phải: Thanh toán */}
      <div className="w-full xl:w-[380px] flex flex-col gap-6 shrink-0 pb-6 pl-1 overflow-y-auto custom-scrollbar">

        {/* Tóm tắt khách sỉ/ VIP */}
        <div className="bg-white border border-slate-200 rounded-[16px] p-5 shadow-sm">
          <div className="flex justify-between items-center mb-4">
            <h3 className="text-[11px] font-black text-slate-500 uppercase tracking-widest">KHÁCH HÀNG THÂN THIẾT</h3>
            {loyaltyInfo ? (
              <span className="text-[10px] font-bold text-emerald-600 bg-emerald-50 px-2 py-0.5 rounded uppercase">
                {loyaltyInfo.tier} VIP
              </span>
            ) : (
              <span className="text-[10px] font-bold text-slate-400 bg-slate-100 px-2 py-0.5 rounded uppercase">
                Khách Lẻ
              </span>
            )}
          </div>

          {!loyaltyInfo ? (
            <div className="flex flex-col gap-2.5">
              <div className="flex gap-2">
                <input
                  type="text"
                  placeholder="SĐT khách hàng..."
                  value={customerPhone}
                  onChange={(e) => setCustomerPhone(e.target.value)}
                  className="flex-1 px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-bold focus:outline-none focus:border-[#0057cd] focus:bg-white"
                />
                <button
                  type="button"
                  onClick={handleSearchCustomer}
                  disabled={isSearchingCustomer}
                  className="px-4 py-2 bg-[#0057cd] hover:bg-[#00419e] disabled:bg-slate-100 disabled:text-slate-400 text-white font-bold text-xs rounded-xl shadow-sm transition-all"
                >
                  Tìm kiếm
                </button>
              </div>
              <input
                type="email"
                placeholder="Email nhận HDĐT (tùy chọn)..."
                value={patientEmail}
                onChange={(e) => setPatientEmail(e.target.value)}
                className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-bold focus:outline-none focus:border-[#0057cd] focus:bg-white"
              />
              <div className="text-[11px] text-slate-400 font-bold text-left italic">
                * Nhập số điện thoại để tích điểm & quy đổi ưu đãi thành viên.
              </div>
            </div>
          ) : (
            <div className="flex flex-col gap-3 text-left">
              <div className="flex justify-between items-center">
                <span className="font-extrabold text-slate-800 text-[14px]">{loyaltyInfo.fullName}</span>
                <button
                  type="button"
                  onClick={handleClearCustomer}
                  className="text-xs text-rose-500 hover:text-rose-700 font-bold"
                >
                  Hủy chọn
                </button>
              </div>
              <div className="text-[12px] text-slate-500 font-bold">
                SĐT: {loyaltyInfo.phone} | Điểm khả dụng: <span className="text-[#0057cd]">{loyaltyInfo.points.toLocaleString()}đ</span>
              </div>

              {/* Adaptive RFM Badge & Gợi ý Toa Thuốc */}
              {currentCustomerSegment && (
                <div className="p-2.5 rounded-xl border border-purple-100 bg-purple-50/50 flex flex-col gap-1.5">
                  <div className="flex items-center justify-between">
                    <span className="text-[10px] font-bold text-slate-500 uppercase tracking-wider">Phân khúc RFM:</span>
                    {currentCustomerSegment.segment === 'CHAMPIONS' && (
                      <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-black bg-amber-100 text-amber-800 border border-amber-200">
                        <Crown size={11} className="text-amber-600" /> Khách Kim Cương
                      </span>
                    )}
                    {currentCustomerSegment.segment === 'LOYAL_CHRONIC' && (
                      <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-black bg-rose-100 text-rose-800 border border-rose-200">
                        <HeartPulse size={11} className="text-rose-600" /> Bệnh Mãn Tính (30N)
                      </span>
                    )}
                    {currentCustomerSegment.segment === 'POTENTIAL_LOYALIST' && (
                      <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-black bg-blue-100 text-blue-800 border border-blue-200">
                        <Sparkles size={11} className="text-blue-600" /> Tiềm Năng
                      </span>
                    )}
                    {currentCustomerSegment.segment === 'AT_RISK' && (
                      <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-black bg-orange-100 text-orange-800 border border-orange-200 animate-pulse">
                        <AlertTriangle size={11} className="text-orange-600" /> Nguy Cơ Rời Bỏ
                      </span>
                    )}
                    {currentCustomerSegment.segment === 'HIBERNATING' && (
                      <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-slate-100 text-slate-700 border border-slate-200">
                        Ngủ Đông
                      </span>
                    )}
                  </div>

                  {currentCustomerSegment.predictedRefillDate && (
                    <div className="text-[11px] text-rose-700 font-semibold flex items-center justify-between">
                      <span>Dự kiến tái mua toa thuốc:</span>
                      <span className="font-bold">
                        {new Date(currentCustomerSegment.predictedRefillDate).toLocaleDateString('vi-VN')}
                      </span>
                    </div>
                  )}

                  {currentCustomerSegment.recommendedVoucher && (
                    <div className="flex items-center justify-between pt-1 border-t border-purple-100/60">
                      <span className="text-[11px] text-purple-700 font-medium flex items-center gap-1">
                        <Gift size={12} /> Ưu đãi giữ chân:
                      </span>
                      <button
                        type="button"
                        onClick={() => {
                          setVoucherCode(currentCustomerSegment.recommendedVoucher || '');
                          showToast(`Đã tự động điền mã ưu đãi ${currentCustomerSegment.recommendedVoucher}`, 'success');
                        }}
                        className="px-2 py-0.5 bg-purple-600 hover:bg-purple-700 text-white rounded text-[10px] font-bold shadow-sm transition-colors"
                      >
                        Áp dụng {currentCustomerSegment.recommendedVoucher}
                      </button>
                    </div>
                  )}
                </div>
              )}
              <div className="flex flex-col gap-1">
                <label className="text-[10px] font-bold text-slate-500 uppercase tracking-widest">Email nhận hóa đơn</label>
                <input
                  type="email"
                  placeholder="Nhập email khách hàng..."
                  value={patientEmail}
                  onChange={(e) => setPatientEmail(e.target.value)}
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-bold focus:outline-none focus:border-[#0057cd] focus:bg-white"
                />
              </div>

              {loyaltyInfo.points > 0 && (
                <div className="pt-2.5 border-t border-slate-100 flex flex-col gap-2">
                  <label className="flex items-center gap-2 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={usePoints}
                      onChange={(e) => {
                        setUsePoints(e.target.checked);
                        if (e.target.checked) {
                          const maxRedeem = Math.floor((subtotal - vipDiscount - voucherDiscount) * 0.5);
                          setRedeemedPoints(Math.min(loyaltyInfo.points, maxRedeem));
                        } else {
                          setRedeemedPoints(0);
                        }
                      }}
                      className="rounded border-slate-350 text-[#0057cd] focus:ring-[#0057cd] w-4 h-4 cursor-pointer"
                    />
                    <span className="text-xs font-bold text-slate-700">Tiêu điểm giảm giá</span>
                  </label>

                  {usePoints && (
                    <div className="flex flex-col gap-1 pl-6">
                      <div className="flex items-center gap-2">
                        <input
                          type="number"
                          min={0}
                          max={Math.floor((subtotal - vipDiscount - voucherDiscount) * 0.5)}
                          value={redeemedPoints}
                          onChange={(e) => {
                            const maxRedeem = Math.floor((subtotal - vipDiscount - voucherDiscount) * 0.5);
                            const pts = Math.min(loyaltyInfo.points, maxRedeem, Number(e.target.value));
                            setRedeemedPoints(pts);
                          }}
                          className="w-24 px-2 py-1 bg-slate-50 border border-slate-200 rounded-lg text-xs font-bold focus:outline-none focus:border-[#0057cd] focus:bg-white"
                        />
                        <span className="text-xs font-bold text-slate-500">
                          điểm (Giảm {redeemedPoints.toLocaleString()}₫)
                        </span>
                      </div>
                      <span className="text-[10px] text-slate-400 font-bold">
                        * Tối đa 50% đơn (tối đa {Math.floor((subtotal - vipDiscount - voucherDiscount) * 0.5).toLocaleString()} điểm)
                      </span>
                    </div>
                  )}
                </div>
              )}
            </div>
          )}
        </div>

        {/* Voucher Box */}
        <div className="bg-white border border-slate-200 rounded-[16px] p-5 shadow-sm flex flex-col gap-2">
          <span className="text-[11px] font-bold text-slate-500 uppercase tracking-wider">ÁP DỤNG MÃ GIẢM GIÁ</span>
          {appliedVoucher ? (
            <div className="flex items-center justify-between bg-emerald-50 border border-emerald-150 p-2.5 rounded-xl text-xs font-semibold text-emerald-800">
              <div>
                Mã đã dùng: <span className="font-extrabold uppercase">{appliedVoucher.code}</span>
                <span className="block text-[10px] text-emerald-600 mt-0.5">Giảm -{appliedVoucher.discount.toLocaleString()}₫</span>
              </div>
              <button
                type="button"
                onClick={handleRemoveVoucher}
                className="text-emerald-500 hover:text-emerald-800 font-bold ml-2 text-md"
              >
                ×
              </button>
            </div>
          ) : (
            <div className="flex gap-2">
              <input
                type="text"
                placeholder="Nhập mã voucher..."
                value={voucherCode}
                onChange={(e) => setVoucherCode(e.target.value.toUpperCase())}
                className="flex-1 px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-bold focus:outline-none focus:border-[#0057cd] focus:bg-white transition-all uppercase"
              />
              <button
                type="button"
                onClick={handleApplyVoucher}
                disabled={isValidatingVoucher}
                className="px-4 py-2 bg-[#0057cd] hover:bg-[#00419e] disabled:bg-slate-100 disabled:text-slate-400 text-white font-bold text-xs rounded-xl shadow-sm transition-all"
              >
                {isValidatingVoucher ? "..." : "Áp dụng"}
              </button>
            </div>
          )}
          {voucherError && (
            <span className="text-[10px] font-bold text-rose-600 uppercase mt-0.5">{voucherError}</span>
          )}
        </div>

        {/* Thanh toán tóm tắt */}
        <div className="bg-white rounded-[16px] border border-slate-200 p-6 shadow-sm">
          <h3 className="text-[12px] font-black text-slate-500 uppercase tracking-widest mb-3">Tóm tắt đơn hàng</h3>
          <div className="space-y-4 text-[14px]">
            <div className="flex justify-between items-center text-slate-600">
              <span>Tạm tính / Subtotal</span>
              <span className="text-slate-900 font-bold">{subtotal.toLocaleString()}₫</span>
            </div>
            <div className="flex justify-between items-center text-[#ba1a1a]">
              <span>Ưu đãi VIP (5%)</span>
              <span className="font-bold">-{vipDiscount.toLocaleString()}₫</span>
            </div>
            {appliedVoucher && (
              <div className="flex justify-between items-center text-[#ba1a1a]">
                <span>Khuyến mãi Voucher ({appliedVoucher.code})</span>
                <span className="font-bold">-{voucherDiscount.toLocaleString()}₫</span>
              </div>
            )}
            {usePoints && redeemedPoints > 0 && (
              <div className="flex justify-between items-center text-[#ba1a1a]">
                <span>Quy đổi điểm tích lũy</span>
                <span className="font-bold">-{redeemedPoints.toLocaleString()}₫</span>
              </div>
            )}
            <div className="flex justify-between items-center text-slate-600">
              <span>Thuế VAT (8%)</span>
              <span className="text-slate-900 font-bold">{vat.toLocaleString()}₫</span>
            </div>
            <div className="flex justify-between items-center text-emerald-600 font-bold text-xs pt-1 border-t border-slate-100">
              <span>Tích lũy từ đơn này</span>
              <span>+{Math.round(total / 100 * (loyaltyInfo ? loyaltyInfo.multiplier || 1.0 : 1.0)).toLocaleString()} điểm</span>
            </div>
          </div>

          <div className="mt-6 pt-5 border-t border-slate-200 flex items-end justify-between">
            <div className="text-[13px] font-black text-slate-900 uppercase tracking-widest pb-1">TỔNG THANH TOÁN</div>
            <div className="text-[28px] font-black text-[#0057cd] leading-none tracking-tighter">{total.toLocaleString()}₫</div>
          </div>
        </div>

        {/* Phương thức thanh toán */}
        <div className="bg-white border border-slate-200 rounded-[16px] p-5 shadow-sm">
          <h3 className="text-[12px] font-black text-slate-500 uppercase tracking-widest mb-3">Hình thức thanh toán</h3>
          <div className="grid grid-cols-2 gap-2">
            <button
              onClick={() => setPaymentMethod("CASH")}
              className={`flex items-center justify-center gap-2 py-3.5 border-2 rounded-xl font-bold text-sm transition-all ${paymentMethod === "CASH"
                ? "border-[#0057cd] bg-[#f0f6ff] text-[#0057cd]"
                : "border-slate-200 text-slate-700 hover:bg-slate-50"
                }`}
            >
              <Banknote size={16} /> Tiền mặt
            </button>
            <button
              onClick={() => setPaymentMethod("QR_PAY")}
              className={`flex items-center justify-center gap-2 py-3.5 border-2 rounded-xl font-bold text-sm transition-all ${paymentMethod === "QR_PAY"
                ? "border-[#0057cd] bg-[#f0f6ff] text-[#0057cd]"
                : "border-slate-200 text-slate-700 hover:bg-slate-50"
                }`}
            >
              <QrCode size={16} /> VNPay/QR
            </button>
          </div>
        </div>

        {/* Thẻ trạng thái phê duyệt Dược sĩ cho đơn AI */}
        {aiPharmacistConfirmation?.confirmed && (
          <div className="bg-gradient-to-r from-emerald-50 to-teal-50 border border-emerald-300 rounded-2xl p-3.5 text-xs text-emerald-900 flex items-center justify-between shadow-2xs">
            <div className="flex items-center gap-2.5">
              <div className="w-7 h-7 rounded-lg bg-emerald-600 text-white flex items-center justify-center shrink-0 shadow-2xs">
                <ShieldCheck size={16} />
              </div>
              <div>
                <div className="font-extrabold text-[11px] uppercase tracking-wide text-emerald-950 flex items-center gap-1">
                  Đơn AI: Đã Thẩm Định Lâm Sàng
                </div>
                <div className="text-[10px] text-emerald-700 font-medium">
                  DS. {aiPharmacistConfirmation.pharmacistName} • {aiPharmacistConfirmation.auditCode}
                </div>
              </div>
            </div>
            <button
              type="button"
              onClick={() => setShowAuditModal(true)}
              className="px-2 py-1 bg-white hover:bg-emerald-100/60 text-emerald-800 text-[10px] font-black rounded-lg border border-emerald-300 transition-colors cursor-pointer"
            >
              Chi tiết
            </button>
          </div>
        )}

        <button
          onClick={handleCheckout}
          disabled={cart.length === 0 || loading || cart.some(it => ((it.quantity || 1) * (it.exchangeValue || 1)) > (it.stock || 0))}
          className="w-full bg-[#0057cd] hover:bg-[#00419e] disabled:bg-slate-200 disabled:text-slate-400 text-white rounded-xl py-5 shadow-sm transition-all flex items-center justify-center gap-2 font-black text-[16px] uppercase tracking-wide mt-auto cursor-pointer disabled:cursor-not-allowed"
        >
          <Printer size={20} />
          XÁC NHẬN & IN HÓA ĐƠN
        </button>
      </div>

      {/* =======================================
       * 📄 INVOICE SUCCESS MODAL (HÓA ĐƠN IN FIFO RETAIL)
       * ======================================= */}
      {showInvoiceModal && invoiceData && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-[24px] border border-slate-200 shadow-2xl w-full max-w-xl overflow-hidden flex flex-col transform transition-all duration-300">
            <div className="px-6 py-5 border-b border-slate-100 flex items-center justify-between bg-slate-50">
              <h3 className="font-black text-slate-900 text-lg flex items-center gap-2">
                <CheckCircle2 className="text-emerald-500" /> Bán lẻ thành công!
              </h3>
              <button onClick={() => setShowInvoiceModal(false)} className="text-slate-400 hover:text-slate-700">
                <XCircle size={22} />
              </button>
            </div>

            <div className="p-6 flex flex-col gap-6 overflow-y-auto max-h-[75vh] scrollbar-hide">
              {/* Warnings nếu có */}
              {invoiceData.warnings && invoiceData.warnings.length > 0 && (
                <div className="bg-amber-50 border border-amber-200 rounded-xl p-4 text-amber-800">
                  <div className="font-bold text-sm flex items-center gap-1.5 uppercase mb-1">
                    <AlertTriangle size={16} /> Cảnh báo hạn sử dụng lô xuất:
                  </div>
                  <ul className="list-disc pl-5 text-xs space-y-1">
                    {invoiceData.warnings.map((w: string, idx: number) => (
                      <li key={idx} className="font-semibold">{w}</li>
                    ))}
                  </ul>
                </div>
              )}

              {/* Badge Thẩm Định Lâm Sàng Của Dược Sĩ Cho Đơn Thuốc AI */}
              {invoiceData.aiPharmacistConfirmation?.confirmed && (
                <div className="bg-gradient-to-r from-emerald-50 via-teal-50 to-blue-50 border border-emerald-300 rounded-xl p-3.5 flex items-center justify-between text-xs shadow-2xs">
                  <div className="flex items-center gap-2.5">
                    <div className="w-8 h-8 rounded-lg bg-emerald-600 text-white flex items-center justify-center shrink-0 shadow-2xs">
                      <ShieldCheck size={18} />
                    </div>
                    <div>
                      <div className="font-extrabold text-emerald-950 uppercase text-[11px] flex items-center gap-1.5">
                        ✓ ĐÃ THẨM ĐỊNH LÂM SÀNG BƯỚC CUỐI (AI ASSISTED)
                      </div>
                      <div className="text-[10px] text-emerald-800">
                        Dược sĩ phụ trách: <strong>{invoiceData.aiPharmacistConfirmation.pharmacistName}</strong> • Mã duyệt: <span className="font-mono font-bold text-emerald-700">{invoiceData.aiPharmacistConfirmation.auditCode}</span>
                      </div>
                    </div>
                  </div>
                  <span className="text-[10px] font-black text-emerald-800 bg-emerald-100 border border-emerald-300 px-2.5 py-0.5 rounded-full shrink-0">
                    GPP Verified
                  </span>
                </div>
              )}

              {/* Mẫu hóa đơn bán thuốc */}
              <div className="border border-slate-200 rounded-2xl p-6 bg-slate-50/50 shadow-inner font-mono text-[13px] text-slate-800 flex flex-col gap-4">
                <div className="text-center border-b border-slate-200 pb-3">
                  <div className="font-bold text-[16px] text-slate-900 uppercase">HỆ THỐNG NHÀ THUỐC WDP</div>
                  <div className="text-xs text-slate-500 mt-1">Đường 3/2, Quận Hải Châu, Đà Nẵng</div>
                  <div className="text-xs text-slate-500">SĐT: 0236 123 456</div>
                </div>

                <div className="flex flex-col gap-1 border-b border-slate-200 pb-3">
                  <div className="flex justify-between">
                    <span>Mã hóa đơn:</span>
                    <span className="font-bold">{invoiceData.data?._id || invoiceData.data?.orderCode || payosOrderCode || "N/A"}</span>
                  </div>
                  <div className="flex justify-between">
                    <span>Ngày lập:</span>
                    <span>{invoiceData.data?.createdAt ? new Date(invoiceData.data.createdAt).toLocaleString() : new Date().toLocaleString()}</span>
                  </div>
                  <div className="flex justify-between">
                    <span>Kiểu bán:</span>
                    <span className="font-bold uppercase text-[#0057cd]">{invoiceData.data?.type || "RETAIL"}</span>
                  </div>
                  <div className="flex justify-between">
                    <span>Khách hàng:</span>
                    <span>{invoiceData.data?.patientName || "Khách lẻ vãng lai"}</span>
                  </div>
                </div>

                {/* Chi tiết xuất kho allocated */}
                <div>
                  <div className="font-bold border-b border-slate-200 pb-1.5 mb-2 uppercase">Chi tiết xuất kho (FIFO)</div>
                  <div className="space-y-3">
                    {(invoiceData.data?.items || []).map((it: any) => (
                      <div key={it.medicineId} className="flex flex-col">
                        <div className="flex justify-between font-bold text-slate-900">
                          <span>{it.name}</span>
                          <span>{it.quantity} {it.unit}</span>
                        </div>
                        <div className="text-[11px] text-slate-500 italic mt-0.5 pl-2">
                          Lô xuất: {it.batches?.map((b: any) => `${b.batchNo} (${b.quantity} ${it.unit})`).join(", ") || "Kho quầy"}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>

                <div className="border-t border-slate-200 pt-3 flex flex-col gap-1.5">
                  <div className="flex justify-between text-slate-600">
                    <span>Tổng tiền thanh toán:</span>
                    <span className="font-bold">{(invoiceData.data?.totalAmount || total).toLocaleString()}₫</span>
                  </div>
                  {(invoiceData.data?.redeemedPoints || 0) > 0 && (
                    <div className="flex justify-between text-[#ba1a1a]">
                      <span>Tiêu điểm tích lũy:</span>
                      <span>-{invoiceData.data.redeemedPoints.toLocaleString()}₫</span>
                    </div>
                  )}
                  {(invoiceData.data?.earnedPoints || 0) > 0 && (
                    <div className="flex justify-between text-emerald-600 font-bold">
                      <span>Tích lũy từ đơn này:</span>
                      <span>+{invoiceData.data.earnedPoints.toLocaleString()} điểm</span>
                    </div>
                  )}
                </div>

                {/* QR Code Đánh giá Dịch vụ & Nhận Điểm Thưởng */}
                <div className="mt-2 pt-3 border-t border-dashed border-slate-300 flex flex-col items-center justify-center text-center gap-2 bg-gradient-to-b from-blue-50/40 to-white p-3 rounded-xl border border-blue-100 print:border-black print:bg-white">
                  <div className="text-[12px] font-bold text-[#0057cd] print:text-black uppercase tracking-wide">
                    ⭐ ĐÁNH GIÁ DỊCH VỤ - NHẬN QUÀ NGAY ⭐
                  </div>
                  <div className="bg-white p-1 rounded-lg border border-slate-200 print:border-black shadow-sm">
                    <img 
                      src={`https://api.qrserver.com/v1/create-qr-code/?size=110x110&data=${encodeURIComponent(
                        `${window.location.origin}/feedback/${invoiceData.data?.orderCode || invoiceData.data?._id || payosOrderCode || ""}`
                      )}`}
                      alt="QR Đánh giá dịch vụ" 
                      className="w-[100px] h-[100px] object-contain"
                    />
                  </div>
                  <div className="text-[11px] text-slate-600 print:text-black font-medium leading-tight">
                    Quét mã nhận ngay <span className="font-bold text-emerald-600 print:font-bold">+1.000đ - 2.000đ</span> tích lũy<br/>
                    và Voucher giảm giá cho lần mua sau!
                  </div>
                </div>
              </div>
            </div>

            <div className="px-6 py-5 border-t border-slate-100 flex gap-3">
              <button
                onClick={() => window.print()}
                className="flex-1 py-3 bg-[#0057cd] hover:bg-[#00419e] text-white font-bold rounded-xl flex items-center justify-center gap-2 shadow"
              >
                <Printer size={18} /> In hóa đơn (F10)
              </button>
              <button
                onClick={() => setShowInvoiceModal(false)}
                className="flex-1 py-3 bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold rounded-xl"
              >
                Đóng / Close
              </button>
            </div>
          </div>
        </div>
      )}

      {/* =======================================
       * 💳 MODAL THANH TOÁN PAYOS VIETQR
       * ======================================= */}
      {showPayOSModal && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-[100] flex items-center justify-center p-4">
          <div className="bg-white rounded-[24px] border border-slate-200 shadow-2xl w-full max-w-md overflow-hidden flex flex-col transform transition-all duration-300">
            <div className="px-6 py-5 border-b border-slate-100 flex items-center justify-between bg-slate-50">
              <h3 className="font-black text-slate-900 text-md flex items-center gap-2 uppercase tracking-wide">
                <QrCode className="text-[#0057cd]" /> Khách quét mã VietQR thanh toán
              </h3>
              <button onClick={() => { setShowPayOSModal(false); setPayosPolling(false); }} className="text-slate-400 hover:text-slate-700 cursor-pointer">
                <XCircle size={22} />
              </button>
            </div>

            <div className="p-6 flex flex-col gap-5 items-center text-center">
              <div className="text-xs font-bold text-slate-500">
                Hãy hướng dẫn khách hàng quét mã VietQR dưới đây bằng ứng dụng Ngân hàng (Mobile Banking) để thanh toán số tiền <span className="text-sm font-black text-[#0057cd]">{total.toLocaleString()}₫</span>.
              </div>

              <div className="p-3 bg-slate-50 border border-slate-200 rounded-2xl shadow-inner flex items-center justify-center">
                <VietQRCode
                  value={payosQrCode || payosCheckoutUrl}
                  size={224}
                  alt="VietQR PayOS"
                />
              </div>

              <div className="text-[10px] text-slate-400 font-semibold flex items-center gap-1.5 justify-center">
                <span className="w-2 h-2 bg-emerald-500 rounded-full animate-ping"></span>
                Đang chờ khách chuyển khoản (Tự động cập nhật...)
              </div>
            </div>

            <div className="px-6 py-4 border-t border-slate-100 bg-slate-50 flex flex-col gap-2.5">
              <div className="flex gap-2.5 w-full">
                <button
                  onClick={checkManualPayment}
                  className="flex-1 py-3 bg-[#0057cd] hover:bg-[#00419e] text-white font-bold text-xs uppercase tracking-wider rounded-xl transition-all shadow"
                >
                  Kiểm tra thanh toán
                </button>
                <button
                  onClick={() => { setShowPayOSModal(false); setPayosPolling(false); }}
                  className="px-4 py-3 bg-slate-200 hover:bg-slate-300 text-slate-600 font-bold text-xs uppercase tracking-wider rounded-xl transition-all"
                >
                  Đóng
                </button>
              </div>

              {/* Nút Fallback Xác Nhận Khẩn Cấp Khi Ngân Hàng Chậm */}
              <button
                type="button"
                onClick={() => setShowEmergencyOverrideModal(true)}
                className="w-full py-2.5 bg-gradient-to-r from-amber-500 to-orange-500 hover:from-amber-600 hover:to-orange-600 text-white font-extrabold text-xs uppercase tracking-wide rounded-xl shadow-sm transition-all flex items-center justify-center gap-1.5"
              >
                <Zap size={14} className="fill-white" />
                Xác nhận khẩn cấp có đối soát (POS Fallback)
              </button>
            </div>
          </div>
        </div>
      )}

      {/* =======================================
       * ⚡ MODAL XÁC NHẬN KHẨN CẤP CÓ ĐỐI SOÁT (POS FALLBACK)
       * ======================================= */}
      {showEmergencyOverrideModal && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-[110] flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl border border-amber-200 shadow-2xl w-full max-w-md overflow-hidden flex flex-col animate-in fade-in zoom-in-95 duration-200">
            <div className="px-6 py-4 border-b border-amber-100 flex items-center justify-between bg-amber-50">
              <h3 className="font-bold text-amber-900 text-sm flex items-center gap-2">
                <Zap className="text-amber-600 fill-amber-500" size={18} />
                Xác Nhận Khẩn Cấp & Xuất Thuốc Ngay
              </h3>
              <button
                onClick={() => setShowEmergencyOverrideModal(false)}
                className="text-amber-400 hover:text-amber-700 font-bold"
              >
                ✕
              </button>
            </div>

            <div className="p-6 flex flex-col gap-4 text-xs">
              <div className="bg-amber-50/70 border border-amber-200 rounded-xl p-3 text-amber-900 leading-relaxed">
                <p className="font-bold mb-1">⚠️ Cơ chế đối soát ngoại lệ (Audit Trail):</p>
                Dược sĩ chỉ sử dụng tính năng này khi khách hàng đã hiển thị màn hình trừ tiền thành công trên ứng dụng ngân hàng, nhưng hệ thống Webhook ngân hàng chưa ghi nhận kịp. Hệ thống sẽ tự động ghi nhận biên bản đối soát cho Kế toán kiểm tra cuối ngày.
              </div>

              <div className="space-y-1">
                <label className="font-bold text-slate-700">Mã đơn hàng POS:</label>
                <input
                  type="text"
                  disabled
                  value={`#${payosOrderCode}`}
                  className="w-full px-3 py-2 bg-slate-100 border border-slate-200 rounded-xl font-mono font-bold text-slate-800"
                />
              </div>

              <div className="space-y-1">
                <label className="font-bold text-slate-700">Số tiền xác nhận:</label>
                <input
                  type="text"
                  disabled
                  value={`${total.toLocaleString('vi-VN')} đ`}
                  className="w-full px-3 py-2 bg-slate-100 border border-slate-200 rounded-xl font-bold text-emerald-600"
                />
              </div>

              <div className="space-y-1">
                <label className="font-bold text-slate-700">
                  Mã giao dịch ngân hàng / Ref ID (từ màn hình app khách):
                </label>
                <input
                  type="text"
                  placeholder="VD: FT2427..., 123456789..."
                  value={bankTransactionId}
                  onChange={(e) => setBankTransactionId(e.target.value)}
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl font-mono focus:outline-none focus:ring-2 focus:ring-amber-500"
                />
              </div>

              <div className="space-y-1">
                <label className="font-bold text-slate-700">Lý do xác nhận khẩn cấp:</label>
                <textarea
                  rows={2}
                  value={overrideReason}
                  onChange={(e) => setOverrideReason(e.target.value)}
                  className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-amber-500"
                />
              </div>
            </div>

            <div className="px-6 py-4 border-t border-slate-100 bg-slate-50 flex gap-3">
              <button
                type="button"
                onClick={() => setShowEmergencyOverrideModal(false)}
                className="flex-1 py-2.5 bg-slate-200 hover:bg-slate-300 text-slate-700 font-bold text-xs rounded-xl transition-all"
              >
                Hủy bỏ
              </button>
              <button
                type="button"
                disabled={isOverriding}
                onClick={handleConfirmEmergencyOverride}
                className="flex-1 py-2.5 bg-amber-600 hover:bg-amber-700 text-white font-bold text-xs rounded-xl shadow-sm transition-all disabled:opacity-50 flex items-center justify-center gap-1.5"
              >
                {isOverriding && <Loader2 size={14} className="animate-spin" />}
                Xác Nhận & Xuất Thuốc
              </button>
            </div>
          </div>
        </div>
      )}

      {/* =======================================
       * 🎙️ MODAL GHI ÂM CUỘC THOẠI & ĐỀ XUẤT AI
       * ======================================= */}
      {voiceModalOpen && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-[24px] border border-slate-200 shadow-2xl w-[80vw] max-w-5xl overflow-hidden flex flex-col transform transition-all duration-300 max-h-[90vh]">
            <div className="px-6 py-4.5 border-b border-slate-100 flex items-center justify-between bg-gradient-to-r from-purple-50/70 via-white to-blue-50/70">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-purple-600 text-white flex items-center justify-center shadow-xs shrink-0">
                  <Sparkles size={20} className="animate-pulse" />
                </div>
                <div>
                  <h3 className="font-black text-slate-900 text-base uppercase tracking-wide flex items-center gap-2">
                    Trợ Lý Tư Vấn Triệu Chứng AI
                    <span className="text-[10px] font-black bg-purple-100 text-purple-700 border border-purple-200 px-2 py-0.5 rounded-full">
                      Voice & Symptom AI v2.0
                    </span>
                  </h3>
                  <p className="text-xs text-slate-500 mt-0.5">Bóc tách hội thoại triệu chứng khách hàng & gợi ý phác đồ điều trị chuẩn y tế GPP</p>
                </div>
              </div>
              <button
                onClick={() => { setVoiceModalOpen(false); setAiResult(null); setVoiceBlob(null); }}
                className="text-slate-400 hover:text-slate-700 p-1 rounded-lg hover:bg-slate-100 transition-colors cursor-pointer"
              >
                <XCircle size={24} />
              </button>
            </div>

            <div className="p-6 grid grid-cols-1 md:grid-cols-12 gap-6 overflow-y-auto max-h-[calc(90vh-80px)]">
              {/* Cột trái: Ghi âm (md:col-span-5) */}
              <div className="md:col-span-5 flex flex-col items-center justify-center border border-slate-200/80 p-6 rounded-2xl bg-gradient-to-b from-slate-50/90 to-white text-center gap-5 shadow-xs h-fit">
                <div className="relative w-28 h-28 flex items-center justify-center">
                  {recording && (
                    <>
                      <div className="absolute inset-0 bg-purple-100 rounded-full animate-ping opacity-45"></div>
                      <div className="absolute inset-3 bg-purple-100 rounded-full animate-pulse opacity-75"></div>
                    </>
                  )}
                  <button
                    onClick={recording ? stopVoiceRecording : startVoiceRecording}
                    className={`relative z-10 w-20 h-20 rounded-full flex items-center justify-center shadow-xl transition-all active:scale-95 cursor-pointer ${recording ? "bg-rose-500 text-white shadow-rose-200" : "bg-purple-600 text-white hover:bg-purple-700 shadow-purple-200"
                      }`}
                  >
                    {recording ? <Square size={24} className="fill-white" /> : <Mic size={28} />}
                  </button>
                </div>
                <div>
                  <div className="text-2xl font-black font-mono text-slate-800">
                    {String(Math.floor(timer / 60)).padStart(2, "0")}:{String(timer % 60).padStart(2, "0")}
                  </div>
                  <span className="text-[10px] font-black uppercase tracking-wider text-slate-400 mt-1 block">
                    {recording ? "Đang thu âm cuộc hội thoại..." : voiceBlob ? "Đã lưu bản ghi âm sẵn sàng" : "Nhấp nút tròn để ghi âm triệu chứng"}
                  </span>
                </div>

                {voiceBlob && !recording && (
                  <button
                    onClick={handleSendVoiceToAI}
                    disabled={aiLoading}
                    className="w-full py-3 bg-[#0057cd] hover:bg-[#00419e] text-white font-extrabold text-xs uppercase tracking-wider rounded-xl transition-all shadow-md cursor-pointer disabled:opacity-50 flex items-center justify-center gap-2"
                  >
                    <Sparkles size={16} />
                    {aiLoading ? "Đang phân tích..." : "Gửi AI Phân Tích & Bóc Tách"}
                  </button>
                )}

                <div className="text-[11px] text-slate-500 bg-slate-100/90 p-3.5 rounded-xl border border-slate-200/80 text-left w-full space-y-1.5">
                  <div className="font-bold text-slate-700 flex items-center gap-1.5">💡 Hướng dẫn tư vấn lâm sàng:</div>
                  <div>• Lắng nghe các triệu chứng, thời gian mắc và tiền sử dị ứng thuốc của khách hàng.</div>
                  <div>• Hệ thống tự động chuyển đổi giọng nói thành văn bản, đối soát tồn kho và rà soát tương tác thuốc.</div>
                </div>
              </div>

              {/* Cột phải: Đề xuất (md:col-span-7) */}
              <div className="md:col-span-7 flex flex-col gap-4">
                {aiLoading && (
                  <div className="flex flex-col items-center justify-center py-20 gap-3 border border-dashed border-purple-200 rounded-2xl bg-purple-50/20">
                    <div className="w-10 h-10 border-3 border-purple-600 border-t-transparent rounded-full animate-spin"></div>
                    <span className="text-xs font-black text-purple-700 uppercase tracking-widest">AI đang bóc tách triệu chứng & đối soát kho...</span>
                  </div>
                )}

                {!aiLoading && !aiResult && (
                  <div className="border border-dashed border-slate-200 rounded-2xl p-10 text-center flex flex-col items-center justify-center min-h-[350px]">
                    <div className="w-14 h-14 rounded-2xl bg-purple-50 text-purple-500 flex items-center justify-center mb-3">
                      <Sparkles size={32} className="animate-bounce" />
                    </div>
                    <span className="text-sm font-bold text-slate-800">Chờ kết quả AI tư vấn</span>
                    <p className="text-xs text-slate-400 mt-1 max-w-[280px] leading-relaxed">
                      Hãy ghi âm giọng nói của khách hàng ở cột bên trái, sau đó nhấn "Gửi AI Phân Tích" để nhận phác đồ gợi ý.
                    </p>
                  </div>
                )}

                {aiResult && (
                  <div className="flex flex-col gap-4">
                    <div className="bg-slate-50 border border-slate-200/80 p-3.5 rounded-xl text-xs leading-relaxed">
                      <span className="font-bold text-slate-500 uppercase text-[10px] tracking-wider block mb-0.5">Khách hàng phản ánh:</span>
                      <p className="font-extrabold text-slate-800">"{aiResult.transcribed_text}"</p>
                    </div>

                    <div className="flex flex-col gap-2">
                      <span className="text-[10px] font-black text-slate-500 uppercase tracking-wider">Đơn thuốc AI gợi ý phác đồ:</span>
                      {aiResult.prescription?.recommended_drugs?.length > 0 ? (
                        <div className="space-y-2 max-h-56 overflow-y-auto pr-1">
                          {aiResult.prescription.recommended_drugs.map((drug: any, idx: number) => {
                            const match = aiResult.inventory_status?.available?.find(
                              (av: any) => av.name.toLowerCase() === drug.name.toLowerCase()
                            );
                            const altList: any[] = match?.suggested_alternatives || 
                              aiResult.inventory_status?.out_of_stock_details?.find((d: any) => d.name.toLowerCase() === drug.name.toLowerCase())?.suggested_alternatives || [];

                            return (
                              <div key={idx} className="border border-slate-200/80 rounded-xl p-3 bg-white hover:border-purple-300 transition-all flex flex-col gap-2 text-xs shadow-2xs">
                                <div className="flex items-center justify-between gap-3">
                                  <div>
                                    <div className="font-black text-slate-900 text-[13px]">{drug.name}</div>
                                    <div className="text-[11px] text-slate-500 mt-0.5">Liều dùng: {drug.dosage}</div>
                                  </div>
                                  {match && match.stock > 0 ? (
                                    <span className="text-[10px] text-emerald-700 bg-emerald-100 border border-emerald-200 px-2.5 py-1 rounded-full font-bold uppercase shrink-0 flex items-center gap-1 shadow-2xs">
                                      <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse"></span>
                                      Còn tại CN: {match.stock} {match.unit || "Hộp"}
                                    </span>
                                  ) : (
                                    <div className="flex flex-col items-end gap-1 shrink-0">
                                      <span className="text-[10px] text-rose-700 bg-rose-50 border border-rose-200 px-2 py-0.5 rounded font-bold uppercase">
                                        Hết hàng tại CN (Tồn: 0)
                                      </span>
                                      <button
                                        type="button"
                                        onClick={() => {
                                          setSearchQuery(drug.name);
                                          searchMedicines(drug.name);
                                          setVoiceModalOpen(false);
                                        }}
                                        className="text-[10px] font-bold text-blue-600 hover:text-blue-800 underline cursor-pointer"
                                      >
                                        Tìm thuốc thay thế
                                      </button>
                                    </div>
                                  )}
                                </div>

                                {/* Khối gợi ý thuốc thay thế có sẵn tại chi nhánh nếu thuốc này hết hàng */}
                                {(!match || match.stock <= 0) && altList.length > 0 && (
                                  <div className="mt-1 pt-2 border-t border-rose-100 flex flex-col gap-1.5 bg-gradient-to-r from-amber-50/60 to-emerald-50/40 p-2.5 rounded-lg border border-amber-200/60">
                                    <span className="text-[10px] font-black text-amber-900 uppercase tracking-wide flex items-center gap-1">
                                      <span>⚡</span> Gợi ý thay thế CÒN HÀNG tại chi nhánh ({currentBranch}):
                                    </span>
                                    <div className="flex flex-wrap gap-1.5">
                                      {altList.map((alt: any, aIdx: number) => (
                                        <button
                                          key={aIdx}
                                          type="button"
                                          onClick={() => handleSwapAlternative(idx, alt)}
                                          className="px-2.5 py-1 bg-white hover:bg-emerald-50 text-slate-800 hover:text-emerald-900 border border-amber-300 hover:border-emerald-500 rounded-lg text-[11px] font-semibold flex items-center gap-1.5 transition-all cursor-pointer shadow-2xs group"
                                          title="Nhấp để tự động đổi sang thuốc này"
                                        >
                                          <span className="text-emerald-600 font-extrabold group-hover:scale-125 transition-transform">✓</span>
                                          <span className="font-bold">{alt.name}</span>
                                          <span className="text-[10px] text-emerald-800 bg-emerald-100/90 px-1.5 py-0.5 rounded font-bold">
                                            Tồn: {alt.stock} {alt.unit || "Hộp"}
                                          </span>
                                          <span className="text-[10px] text-slate-400 font-medium">({alt.reason})</span>
                                        </button>
                                      ))}
                                    </div>
                                  </div>
                                )}
                              </div>
                            );
                          })}
                        </div>
                      ) : (
                        <div className="text-xs text-slate-400 italic p-3 bg-slate-50 rounded-xl">Không có thuốc phù hợp với triệu chứng này.</div>
                      )}
                    </div>

                    {aiResult.prescription?.warnings && (
                      <div className="bg-amber-50 border border-amber-200 text-amber-900 rounded-xl p-3.5 text-xs leading-relaxed font-semibold flex items-start gap-2 shadow-2xs">
                        <AlertTriangle size={16} className="text-amber-600 shrink-0 mt-0.5" />
                        <div>
                          <strong className="text-amber-950 uppercase text-[10px] tracking-wider block">Cảnh báo dược lâm sàng:</strong>
                          {aiResult.prescription.warnings}
                        </div>
                      </div>
                    )}

                    {/* Khối Thẩm Định Bước Cuối Của Dược Sĩ Cho Đơn AI Tư Vấn */}
                    <div className="bg-gradient-to-r from-emerald-50 via-teal-50 to-blue-50 border-2 border-emerald-300 rounded-2xl p-4 shadow-sm flex flex-col gap-3">
                      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-1.5 border-b border-emerald-200/80 pb-2.5">
                        <div className="flex items-center gap-2.5">
                          <div className="w-8 h-8 rounded-xl bg-emerald-600 text-white flex items-center justify-center shadow-xs shrink-0">
                            <ShieldCheck size={18} />
                          </div>
                          <div>
                            <h4 className="text-xs font-black text-emerald-950 uppercase tracking-wider flex items-center gap-1.5">
                              Thẩm Định Lâm Sàng Của Dược Sĩ
                              <span className="bg-emerald-200 text-emerald-900 text-[9px] px-1.5 py-0.5 rounded-full font-black border border-emerald-300">
                                Bắt buộc GPP
                              </span>
                            </h4>
                            <p className="text-[11px] text-emerald-800">
                              Dược sĩ: <strong>{getBranchInfoFromToken().fullName || "Dược sĩ Trần Thị A"}</strong> • CCHN: <strong>CCHN-GPP/02849-HN</strong>
                            </p>
                          </div>
                        </div>
                      </div>

                      {/* Checklist nhanh */}
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-[11px]">
                        <div className="flex items-center gap-1.5 text-emerald-900 bg-white/80 p-2 rounded-xl border border-emerald-100 font-medium">
                          <CheckCircle2 size={14} className="text-emerald-600 shrink-0" /> Khớp triệu chứng & liều dùng
                        </div>
                        <div className="flex items-center gap-1.5 text-emerald-900 bg-white/80 p-2 rounded-xl border border-emerald-100 font-medium">
                          <CheckCircle2 size={14} className="text-emerald-600 shrink-0" /> Kiểm tra tồn kho & xuất FEFO
                        </div>
                      </div>

                      {/* Checkbox cam kết trách nhiệm */}
                      <label className="flex items-start gap-2.5 cursor-pointer select-none bg-white p-3 rounded-xl border border-emerald-300 hover:bg-emerald-50/50 transition-colors shadow-2xs">
                        <input
                          type="checkbox"
                          checked={pharmacistAgreementCheck}
                          onChange={(e) => setPharmacistAgreementCheck(e.target.checked)}
                          className="mt-0.5 w-4 h-4 rounded text-emerald-600 focus:ring-emerald-500 border-slate-300 cursor-pointer"
                        />
                        <span className="text-xs text-slate-700 leading-snug">
                          Tôi xác nhận đã kiểm tra triệu chứng khách hàng, đối soát đề xuất AI và <strong>chịu hoàn toàn trách nhiệm chuyên môn</strong> xuất bán đơn này.
                        </span>
                      </label>
                    </div>

                    <button
                      onClick={handleAddAiToCart}
                      className="w-full py-3.5 bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-700 hover:to-teal-700 text-white font-black text-xs uppercase tracking-wider rounded-xl transition-all shadow-md hover:shadow-emerald-600/30 flex items-center justify-center gap-2 cursor-pointer active:scale-[0.99]"
                    >
                      <ShieldCheck size={18} /> Dược Sĩ Phê Duyệt & Thêm Vào Đơn Hàng
                    </button>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      )}
      {/* =======================================
       * 📄 ALTERNATIVES MODAL
       * ======================================= */}
      {showAlternativesModal && selectedOutOfStockMed && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-2xl overflow-hidden flex flex-col max-h-[85vh] animate-in fade-in zoom-in-95 duration-200">
            <div className="px-6 py-4 border-b border-slate-100 flex justify-between items-center bg-rose-50">
              <h3 className="font-bold text-rose-900 flex items-center gap-2">
                <AlertTriangle size={18} className="text-rose-500" />
                Hết hàng: {selectedOutOfStockMed.name}
              </h3>
              <button onClick={() => setShowAlternativesModal(false)} className="text-rose-400 hover:text-rose-700 font-extrabold">✕</button>
            </div>

            <div className="p-6 overflow-y-auto custom-scrollbar flex-1">
              <p className="text-sm text-slate-600 mb-4">
                Thuốc <span className="font-bold text-slate-800">{selectedOutOfStockMed.name}</span> hiện tại đã hết hàng tại chi nhánh.
                Dưới đây là các loại thuốc thay thế phù hợp (cùng hoạt chất hoặc cùng danh mục) có sẵn tồn kho:
              </p>

              {loadingAlternatives ? (
                <div className="flex flex-col items-center justify-center py-8">
                  <div className="w-8 h-8 border-4 border-slate-200 border-t-[#0057cd] rounded-full animate-spin mb-3"></div>
                  <p className="text-slate-500 text-sm font-semibold">Đang tìm kiếm thuốc thay thế...</p>
                </div>
              ) : alternativesList.length > 0 ? (
                <div className="space-y-3">
                  {alternativesList.map(alt => (
                    <div key={alt.id} className="border border-slate-200 rounded-xl p-4 flex items-center justify-between hover:border-[#0057cd] hover:shadow-md transition-all group bg-white">
                      <div>
                        <div className="font-bold text-slate-900 text-[15px]">{alt.name}</div>
                        <div className="text-xs text-slate-500 mt-1 flex flex-wrap gap-2">
                          <span className="bg-slate-100 px-2 py-0.5 rounded font-medium text-slate-600">Hoạt chất: {alt.active_ingredient || "N/A"}</span>
                          <span className="bg-slate-100 px-2 py-0.5 rounded font-medium text-slate-600">Dạng: {alt.dosage_form || "N/A"}</span>
                          {alt.matchLevel === 1 && <span className="bg-emerald-100 text-emerald-700 px-2 py-0.5 rounded font-bold border border-emerald-200">Khớp hoạt chất</span>}
                          {alt.matchLevel === 2 && <span className="bg-blue-100 text-blue-700 px-2 py-0.5 rounded font-bold border border-blue-200">Cùng danh mục</span>}
                        </div>
                      </div>
                      <div className="text-right shrink-0 flex flex-col items-end ml-4">
                        <div className="font-black text-[#0057cd] text-lg">{alt.price.toLocaleString()}₫</div>
                        <div className="text-[11px] font-bold text-slate-500 mt-0.5 mb-2">Tồn kho: {alt.stock} {alt.unit}</div>
                        <button
                          onClick={() => addToCart(alt)}
                          className="px-4 py-1.5 bg-[#0057cd] hover:bg-[#00419e] text-white text-xs font-bold rounded-lg transition-colors flex items-center gap-1.5 shadow-sm"
                        >
                          <Plus size={14} /> Thêm vào giỏ
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="bg-slate-50 border border-slate-200 rounded-xl p-8 text-center flex flex-col items-center">
                  <SearchIcon size={32} className="text-slate-300 mb-3" />
                  <h4 className="font-bold text-slate-700 text-sm">Không tìm thấy thuốc thay thế</h4>
                  <p className="text-xs text-slate-500 mt-1">Hiện không có thuốc nào cùng hoạt chất hoặc cùng danh mục còn hàng tại chi nhánh này.</p>
                </div>
              )}
            </div>
          </div>
        </div>
      )}
      {/* =======================================
       * 📜 BIÊN BẢN THẨM ĐỊNH LÂM SÀNG DƯỢC SĨ (AI AUDIT MODAL)
       * ======================================= */}
      <AIPharmacistAuditModal
        isOpen={showAuditModal}
        onClose={() => setShowAuditModal(false)}
        data={aiPharmacistConfirmation}
      />
    </div>
  );
}
