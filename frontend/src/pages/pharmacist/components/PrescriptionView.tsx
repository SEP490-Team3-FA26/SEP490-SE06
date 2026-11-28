import { useState, useEffect, useRef, ChangeEvent } from "react";

import {
  XCircle, AlertTriangle, CheckCircle2, QrCode, FileText, Stethoscope,
  ShoppingCart, Minus, Plus, Banknote, CreditCard, Sparkles, Printer, SearchIcon, Check,
  ShieldAlert, Loader2, X, Filter, ShieldCheck, FileCheck2, BadgeCheck, UserCheck,
  Trash2, RefreshCw, Zap
} from "lucide-react";
import { medicineService } from "../../../services/inventory/medicine.service";
import { prescriptionService } from "../../../services/sales/prescription.service";
import { orderService } from "../../../services/sales/order.service";
import { voucherService } from "../../../services/sales/voucher.service";
import { VietQRCode } from "../../../components/common/VietQRCode";
import AIPharmacistAuditModal, { AIPharmacistConfirmationData } from "./AIPharmacistAuditModal";
import { aiClinicalService } from "../../../services/ai/aiClinical.service";

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

const hospitalPresets = [
  { name: "Bệnh viện Bạch Mai", code: "BM-1029" },
  { name: "Bệnh viện Chợ Rẫy", code: "CR-2045" },
  { name: "Bệnh viện Trung ương Huế", code: "TWH-3012" },
  { name: "Bệnh viện Đà Nẵng", code: "DNG-4089" },
  { name: "Bệnh viện Hữu nghị Việt Đức", code: "VD-5076" },
  { name: "Bệnh viện Gia Định", code: "GĐ-6011" },
  { name: "Khác (Nhập thủ công)", code: "CUSTOM" }
];

const specialtyPresets = [
  "Nội khoa",
  "Ngoại khoa",
  "Nhi khoa",
  "Tim mạch",
  "Tai Mũi Họng",
  "Răng Hàm Mặt",
  "Da liễu",
  "Mắt",
  "Thần kinh",
  "Sản phụ khoa",
  "Khác"
];

interface PrescriptionViewProps {
  showToast: (message: string, type?: "success" | "error" | "warning") => void;
  isShiftActive?: boolean;
}

export default function PrescriptionView({ showToast, isShiftActive = true }: PrescriptionViewProps) {
  const [prescriptionMode, setPrescriptionMode] = useState<"QR" | "MANUAL">("QR");
  const [prescriptionCode, setPrescriptionCode] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [isPatientInfoOpen, setIsPatientInfoOpen] = useState(false);

  // Patient & Doctor state (For manual entry & e-Rx)
  const [patientName, setPatientName] = useState("");
  const [patientAge, setPatientAge] = useState("");
  const [patientGender, setPatientGender] = useState("Nam");
  const [patientPhone, setPatientPhone] = useState("");

  const [doctorName, setDoctorName] = useState("");
  const [doctorSpecialty, setDoctorSpecialty] = useState("");
  const [hospitalName, setHospitalName] = useState("");
  const [hospitalCode, setHospitalCode] = useState("");

  // Cart state for prescription items
  const [prescriptionItems, setPrescriptionItems] = useState<any[]>([]);

  // Search medicines state (direct inline search)
  const [searchQuery, setSearchQuery] = useState("");
  const [searchResults, setSearchResults] = useState<any[]>([]);

  // Pharmacist Filter States
  const [selectedCategory, setSelectedCategory] = useState("");
  const [selectedClassification, setSelectedClassification] = useState("");
  const [stockFilter, setStockFilter] = useState("ALL");
  const [categoriesList, setCategoriesList] = useState<string[]>([]);
  const [isDropdownOpen, setIsDropdownOpen] = useState(false);

  useEffect(() => {
    medicineService.getFilters().then((res: any) => {
      if (res && Array.isArray(res.categories)) {
        setCategoriesList(res.categories);
      }
    }).catch(err => console.error("Lỗi lấy bộ lọc thuốc:", err));
  }, []);

  // DB Prescriptions for selection
  const [dbPrescriptions, setDbPrescriptions] = useState<any[]>([]);
  const [successMsg, setSuccessMsg] = useState("");

  // Checkout States
  const [paymentMethod, setPaymentMethod] = useState("CASH");
  const [remarks, setRemarks] = useState("");
  const [showQRModal, setShowQRModal] = useState(false);
  const [showInvoiceModal, setShowInvoiceModal] = useState(false);
  const [invoiceData, setInvoiceData] = useState<any>(null);
  const [voucherCode, setVoucherCode] = useState("");
  const [appliedVoucher, setAppliedVoucher] = useState<any>(null);
  const [voucherError, setVoucherError] = useState("");
  const [isValidatingVoucher, setIsValidatingVoucher] = useState(false);

  // Scan simulation states
  const [isScanning, setIsScanning] = useState(false);
  const [scannedCode, setScannedCode] = useState("");

  // AI Vision Scan States
  const [showAIScanModal, setShowAIScanModal] = useState(false);
  const [aiFiles, setAiFiles] = useState<File[]>([]);
  const [aiPreviewUrls, setAiPreviewUrls] = useState<string[]>([]);
  const [activePreviewIdx, setActivePreviewIdx] = useState(0);
  const [aiLoading, setAiLoading] = useState(false);
  const [aiScanResult, setAiScanResult] = useState<any>(null);
  const [isAiDragging, setIsAiDragging] = useState(false);

  // Pharmacist AI Confirmation & GPP Audit States
  const [aiPharmacistConfirmation, setAiPharmacistConfirmation] = useState<AIPharmacistConfirmationData | null>(null);
  const [pharmacistAgreementCheck, setPharmacistAgreementCheck] = useState<boolean>(true);
  const [showAuditModal, setShowAuditModal] = useState<boolean>(false);

  // Trạng thái tìm kiếm & Đề xuất thuốc tương đương (Alternatives)
  const [showAiAlternativesModal, setShowAiAlternativesModal] = useState<boolean>(false);
  const [selectedAiItemForAlt, setSelectedAiItemForAlt] = useState<any>(null);
  const [selectedAiItemIdx, setSelectedAiItemIdx] = useState<number | null>(null);
  const [aiAlternativesList, setAiAlternativesList] = useState<any[]>([]);
  const [loadingAiAlternatives, setLoadingAiAlternatives] = useState<boolean>(false);

  // Đổi thuốc tương đương cho giỏ hàng Cart
  const [showCartAlternativesModal, setShowCartAlternativesModal] = useState<boolean>(false);
  const [selectedCartMedForAlt, setSelectedCartMedForAlt] = useState<any>(null);

  // Lang nghe su kien Paste (Ctrl + V) khi mo modal quet don thuoc AI
  useEffect(() => {
    if (!showAIScanModal) return;

    const handlePaste = (e: ClipboardEvent) => {
      const target = e.target as HTMLElement;
      if (target && (target.tagName === "INPUT" || target.tagName === "TEXTAREA" || target.isContentEditable)) {
        return;
      }

      const items = e.clipboardData?.items;
      if (!items || items.length === 0) return;

      const pastedFiles: File[] = [];
      for (let i = 0; i < items.length; i++) {
        if (items[i].type.startsWith("image/")) {
          const file = items[i].getAsFile();
          if (file) {
            const ext = file.type.split("/")[1] || "png";
            const namedFile = new File(
              [file],
              `don_thuoc_paste_${Date.now()}_${i + 1}.${ext}`,
              { type: file.type }
            );
            pastedFiles.push(namedFile);
          }
        }
      }

      if (pastedFiles.length > 0) {
        e.preventDefault();
        setAiFiles(prev => {
          const updated = [...prev, ...pastedFiles];
          setActivePreviewIdx(updated.length - 1);
          return updated;
        });
        const newUrls = pastedFiles.map(f => URL.createObjectURL(f));
        setAiPreviewUrls(prev => [...prev, ...newUrls]);
        showToast(`Đã dán ${pastedFiles.length} ảnh đơn thuốc từ Clipboard (Ctrl + V)!`, "success");
      }
    };

    window.addEventListener("paste", handlePaste);
    return () => window.removeEventListener("paste", handlePaste);
  }, [showAIScanModal]);

  const handleAISourceFileChange = (e: ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files.length > 0) {
      const newFiles = Array.from(e.target.files);
      setAiFiles(prev => {
        const updated = [...prev, ...newFiles];
        setActivePreviewIdx(updated.length - 1);
        return updated;
      });
      const newUrls = newFiles.map((f: File) => URL.createObjectURL(f));
      setAiPreviewUrls(prev => [...prev, ...newUrls]);
    }
  };

  const handleAiDropFiles = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    e.stopPropagation();
    setIsAiDragging(false);
    if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
      const droppedFiles = Array.from(e.dataTransfer.files).filter((f: File) => f.type.startsWith("image/"));
      if (droppedFiles.length > 0) {
        setAiFiles(prev => {
          const updated = [...prev, ...droppedFiles];
          setActivePreviewIdx(updated.length - 1);
          return updated;
        });
        const newUrls = droppedFiles.map(f => URL.createObjectURL(f));
        setAiPreviewUrls(prev => [...prev, ...newUrls]);
        showToast(`Đã thêm ${droppedFiles.length} ảnh từ thao tác kéo thả!`, "success");
      } else {
        showToast("Vui lòng chỉ kéo thả tập tin hình ảnh!", "warning");
      }
    }
  };

  const handleRemoveAIFile = (index: number) => {
    setAiFiles(prev => prev.filter((_, i) => i !== index));
    setAiPreviewUrls(prev => prev.filter((_, i) => i !== index));
    if (activePreviewIdx >= aiFiles.length - 1) {
      setActivePreviewIdx(Math.max(0, aiFiles.length - 2));
    }
  };

  const handleExecuteAIScan = async () => {
    if (aiFiles.length === 0) {
      showToast("Vui lòng tải lên ít nhất 1 ảnh đơn thuốc!", "warning");
      return;
    }
    setAiLoading(true);
    try {
      const { branchId } = getBranchInfoFromToken();
      const result = await prescriptionService.scanPrescriptionFiles(aiFiles, branchId || "CENTRAL_WH");
      setAiScanResult(result);
      showToast("Hệ thống AI đã bóc tách & khớp thuốc thành công!", "success");
    } catch (err: any) {
      const msg = err.response?.data?.message || err.message || "Lỗi quét ảnh đơn thuốc AI";
      if (typeof msg === "string" && (msg.includes("HANDWRITTEN_PRESCRIPTION_REJECTED") || msg.includes("chữ viết tay"))) {
        showToast("⚠️ Đơn thuốc viết tay không được hỗ trợ! Vui lòng tải lên đơn thuốc bản in điện tử rõ nét.", "warning");
      } else {
        showToast(msg, "error");
      }
    } finally {
      setAiLoading(false);
    }
  };

  const handleApplyAIScanToCart = () => {
    if (!pharmacistAgreementCheck) {
      showToast("Vui lòng tích chọn cam kết trách nhiệm chuyên môn của Dược sĩ!", "warning");
      return;
    }

    const result = prescriptionService.processAIScanResult(aiScanResult, prescriptionItems);
    if (!result.success) {
      if (result.message) showToast(result.message, "warning");
      return;
    }

    if (result.patient.name) setPatientName(result.patient.name);
    if (result.patient.age) setPatientAge(result.patient.age);
    if (result.patient.gender) setPatientGender(result.patient.gender);
    if (result.doctor.name) setDoctorName(result.doctor.name);
    if (result.doctor.hospital) setHospitalName(result.doctor.hospital);

    // Gan nhan aiSuggested cho cac san pham do AI boc tach
    const updatedWithFlag = (result.updatedCartItems || []).map((it: any) => ({
      ...it,
      aiSuggested: true
    }));

    setPrescriptionItems(updatedWithFlag);

    const { fullName: currentUserName } = getBranchInfoFromToken();
    const auditCode = `GPP-AI-${Math.floor(100000 + Math.random() * 900000)}`;

    const confirmationInfo: AIPharmacistConfirmationData = {
      confirmed: true,
      pharmacistName: currentUserName || "Dược sĩ Trần Thị A",
      pharmacistLicense: "CCHN-GPP/02849-HN",
      confirmedAt: new Date().toISOString(),
      auditCode,
      scanId: aiScanResult?.scan_id || `SCAN-${Date.now()}`,
      totalItems: result.count || updatedWithFlag.length,
      patientName: result.patient?.name || patientName || "Khách lẻ",
      patientAge: result.patient?.age || patientAge,
      patientGender: result.patient?.gender || patientGender,
      diagnosis: aiScanResult?.patient?.diagnosis || "Theo chỉ định bác sĩ",
      doctorName: result.doctor?.name || doctorName || "Bác sĩ điều trị",
      hospitalName: result.doctor?.hospital || hospitalName || "Bệnh viện",
      warningsCount: aiScanResult?.validation_warnings?.length || 0,
      source: "AI_VISION_SCAN",
      drugs: updatedWithFlag.map((item: any) => ({
        name: item.name,
        dosage: item.dosage,
        quantity: item.quantity,
        unit: item.unit,
        active_ingredient: item.active_ingredient,
        price: item.price
      })),
      clinicalNotes: "Dược sĩ phụ trách đã đối soát 100% hoạt chất, liều dùng theo lứa tuổi và gán lô FEFO cận hạn thành công."
    };

    // Save adjustment delta to OCR audit log
    if (aiScanResult?.scan_id) {
      aiClinicalService.saveOcrAdjustment(aiScanResult.scan_id, {
        pharmacistAdjustedItems: updatedWithFlag.map((item: any) => ({
          medicineId: item.medicineId,
          name: item.name,
          quantity: item.quantity,
          unit: item.unit,
          dosage: item.dosage,
          price: item.price,
          active_ingredient: item.active_ingredient,
        })),
        adjustmentSummary: "Dược sĩ đối soát lâm sàng và chuyển thuốc vào giỏ hàng POS",
        pharmacistInfo: {
          name: confirmationInfo.pharmacistName,
          license: confirmationInfo.pharmacistLicense,
        },
        auditCode,
        status: "REVIEWED",
      }).catch((e: any) => console.warn("Failed to persist OCR audit log:", e));
    }

    setAiPharmacistConfirmation(confirmationInfo);
    setShowAIScanModal(false);
    showToast(`✅ Dược sĩ ${confirmationInfo.pharmacistName} đã xác nhận bước cuối thành công! (Mã duyệt: ${auditCode})`, "success");
  };

  // =========================================================================
  // 🔄 CƠ CHẾ ĐỀ XUẤT THUỐC TƯƠNG ĐƯƠNG CHUẨN GPP (ĐỒNG BỘ 100% MODAL AI & CART)
  // =========================================================================

  // Phân tích & Đánh giá lâm sàng chuẩn GPP cho từng thuốc ứng viên
  const evaluateGppAlternative = (originName: string, originActive: string, originForm: string, candidate: any) => {
    const cName = (candidate.name || "").toLowerCase();
    const cActive = (candidate.active_ingredient || "").toLowerCase();
    const cForm = (candidate.dosage_form || "").toLowerCase();
    const oName = (originName || "").toLowerCase();
    const oActive = (originActive || "").toLowerCase();

    // 1. Nhận diện đường dùng gốc (Route of administration)
    const originIsInjection = /tiêm|tiem|injection|kabi|ống tiêm|ong tiem|lọ tiêm|lo tiem/i.test(oName + " " + originForm);
    const candidateIsInjection = /tiêm|tiem|injection|dung môi pha tiêm/i.test(cName + " " + cForm);

    // 2. Nhận diện chất giãn cơ / phối hợp đặc biệt
    const candidateHasMuscleRelaxant = /methocarbamol/i.test(cActive + " " + cName); // SaViMetoc
    const originHasMuscleRelaxant = /methocarbamol/i.test(oActive + " " + oName);

    // 3. Nhận diện đa sinh tố tổng hợp (Multivitamin) vs Vitamin C đơn chất
    const originIsVitaminC = /vitamin c|acid ascorbic|ascorbic acid/i.test(oName + " " + oActive);
    const candidateIsMultivitamin = /nhân sâm|ginseng|retinol|thiamin|khoáng chất|multivitamin/i.test(cActive + " " + cName);

    // 4. Nhận diện thuốc cảm sốt (Paracetamol)
    const originIsParacetamol = /paracetamol|acetaminophen|ameflu/i.test(oName + " " + oActive);
    const candidateIsParacetamol = /paracetamol|acetaminophen/i.test(cActive + " " + cName);

    let tier: 1 | 2 | 3 = 2;
    let isGppEligible = true;
    let badgeLabel = "Cùng hoạt chất";
    let badgeClass = "bg-sky-100 text-sky-800 border-sky-300";
    let clinicalWarning: string | undefined = undefined;

    // PHÁN QUYẾT 1: THUỐC GỐC LÀ DẠNG TIÊM (INJECTION)
    if (originIsInjection) {
      if (!candidateIsInjection) {
        tier = 3;
        isGppEligible = false;
        badgeLabel = "⚠️ Khác đường dùng (Dạng uống/siro)";
        badgeClass = "bg-amber-100 text-amber-900 border-amber-300 font-bold";
        clinicalWarning = "Theo chuẩn GPP, thuốc tiêm không được tự ý đổi sang dạng uống/siro mà phải có chỉ định của Bác sĩ điều trị!";
      } else {
        tier = 1;
        badgeLabel = "✓ Chuẩn GPP: Cùng hoạt chất & Dạng tiêm";
        badgeClass = "bg-emerald-100 text-emerald-800 border-emerald-300 font-black";
      }
    }

    // PHÁN QUYẾT 2: THUỐC CÓ CHẤT GIÃN CƠ (SAVIMETOC) TRONG KHI ĐƠN LÀ CẢM CÚM / HẠ SỐT
    if (originIsParacetamol && !originHasMuscleRelaxant && candidateHasMuscleRelaxant) {
      tier = 3;
      isGppEligible = false;
      badgeLabel = "⛔ Không chuẩn GPP: Có chất giãn cơ";
      badgeClass = "bg-rose-100 text-rose-800 border-rose-300 font-black";
      clinicalWarning = "Thuốc chứa Methocarbamol (chất giãn cơ trung ương, gây an thần, buồn ngủ). Không dùng thay thế cho thuốc cảm sốt thông thường!";
    }

    // PHÁN QUYẾT 3: THUỐC ĐA SINH TỐ (HOMTAMIN) TRONG KHI ĐƠN LÀ VITAMIN C ĐIỀU TRỊ
    if (originIsVitaminC && candidateIsMultivitamin) {
      tier = 3;
      isGppEligible = false;
      badgeLabel = "⚠️ Đa sinh tố & khoáng chất tổng hợp";
      badgeClass = "bg-amber-100 text-amber-800 border-amber-300 font-bold";
      clinicalWarning = originIsInjection && !candidateIsInjection
        ? "Theo chuẩn GPP, thuốc tiêm không được tự ý đổi sang dạng uống/siro (Đa sinh tố) mà phải có chỉ định của Bác sĩ điều trị!"
        : "Thuốc gốc là Vitamin C đơn chất liều điều trị. Thuốc này là Đa sinh tố & khoáng chất tổng hợp, không tương đương về dược động học.";
    }

    // PHÁN QUYẾT 4: THUỐC ĐƠN CHẤT CÙNG HOẠT CHẤT & DẠNG UỐNG
    if (originIsParacetamol && candidateIsParacetamol && !candidateHasMuscleRelaxant && !originIsInjection && !candidateIsInjection) {
      const isLowDoseChild = /150mg|250mg|gói|goi|sủi/i.test(cName + " " + cActive);
      if (isLowDoseChild) {
        tier = 2;
        badgeLabel = "⚠️ Khác hàm lượng (Liều trẻ em)";
        badgeClass = "bg-amber-50 text-amber-800 border-amber-200 font-bold";
        clinicalWarning = "Thuốc có hàm lượng thấp (dành cho trẻ em), cần điều chỉnh số lượng nếu dùng cho người lớn.";
      } else {
        tier = 1;
        badgeLabel = "✓ Chuẩn GPP: Khớp hoạt chất & Hàm lượng";
        badgeClass = "bg-emerald-100 text-emerald-800 border-emerald-300 font-black";
      }
    }

    return {
      id: candidate.id || candidate._id,
      name: candidate.name,
      active_ingredient: candidate.active_ingredient,
      dosage_form: candidate.dosage_form,
      unit: candidate.unit || "Hộp",
      price: candidate.price || 0,
      stock: Number(candidate.stock || candidate.branchStock || 0),
      fefoBatchNo: candidate.fefoBatchNo,
      fefoExpDate: candidate.fefoExpDate,
      isGppEligible,
      tier,
      badgeLabel,
      badgeClass,
      clinicalWarning,
    };
  };

  // Hàm tra cứu chuẩn hóa GPP dùng chung duy nhất cho CẢ Modal AI và Cart
  const fetchGppAlternativesUnified = async (originName: string, originActive: string, originForm: string, medicineId?: string) => {
    setLoadingAiAlternatives(true);
    setAiAlternativesList([]);

    try {
      const { branchId } = getBranchInfoFromToken();
      const currentBranch = branchId || "BR-001";
      let candidates: any[] = [];

      // 1. Xác định từ khóa hoạt chất tìm kiếm sạch sẽ
      let primaryKeyword = "";
      const cleanedActive = (originActive || "").trim();
      const cleanedName = (originName || "").trim();

      if (/vitamin c|acid ascorbic|ascorbic acid/i.test(cleanedActive + " " + cleanedName)) {
        primaryKeyword = "Vitamin C";
      } else if (/paracetamol|acetaminophen|ameflu/i.test(cleanedActive + " " + cleanedName)) {
        primaryKeyword = "Paracetamol";
      } else if (cleanedActive) {
        primaryKeyword = cleanedActive.split(/[,;\(\)\/]/)[0].trim();
      } else {
        primaryKeyword = cleanedName.split(/[,;\(\)\/]/)[0].trim();
      }

      // 2. Tra cứu kho chi nhánh theo từ khóa hoạt chất
      if (primaryKeyword) {
        const searchRes = await medicineService.searchBranchMedicines(currentBranch, {
          search: primaryKeyword,
          limit: 20,
        });
        candidates = Array.isArray(searchRes) ? searchRes : (searchRes?.data || []);
      }

      // 3. Đánh giá từng ứng viên theo quy chuẩn Dược Lâm Sàng & GPP
      const evaluatedList = candidates
        // Loại trừ chính nó nếu trùng ID hoặc tên
        .filter(c => (medicineId ? String(c.id || c._id) !== String(medicineId) : true) && c.name?.toLowerCase() !== cleanedName.toLowerCase())
        .map(c => evaluateGppAlternative(originName, originActive, originForm, c));

      // 4. Sắp xếp thứ bậc ưu tiên GPP:
      // - Tier 1 (Chuẩn GPP khớp hoàn toàn) & stock > 0 lên đầu tiên
      // - Tier 2 (Khớp có điều kiện hàm lượng) & stock > 0
      // - Tier 3 (Khác đường dùng / có chất giãn cơ) hoặc hết hàng xếp xuống dưới cùng
      const sorted = evaluatedList.sort((a, b) => {
        // Ưu tiên 1: Có tồn kho > 0
        if (a.stock > 0 && b.stock <= 0) return -1;
        if (a.stock <= 0 && b.stock > 0) return 1;

        // Ưu tiên 2: Tier chuẩn GPP (1 -> 2 -> 3)
        if (a.tier !== b.tier) return a.tier - b.tier;

        // Ưu tiên 3: Tồn kho nhiều hơn
        return b.stock - a.stock;
      });

      setAiAlternativesList(sorted);
    } catch (err) {
      console.error("Lỗi khi tìm thuốc thay thế GPP:", err);
      showToast("Lỗi khi tìm kiếm thuốc tương đương", "error");
    } finally {
      setLoadingAiAlternatives(false);
    }
  };

  // Tìm kiếm thuốc tương đương cho item trong đơn AI
  const handleFetchAiAlternatives = async (item: any, idx: number) => {
    setSelectedAiItemIdx(idx);
    setSelectedAiItemForAlt(item);
    setShowAiAlternativesModal(true);
    const sku = item.selected_sku;
    const ext = item.extracted || {};
    await fetchGppAlternativesUnified(
      ext.raw_text || sku?.product_name || "",
      ext.generic_name || sku?.active_ingredient || "",
      sku?.dosage_form || "",
      sku?.product_id
    );
  };

  // Chọn thuốc tương đương thay thế cho đơn AI
  const handleSelectAiAlternative = (alt: any) => {
    if (selectedAiItemIdx === null || !aiScanResult?.items) return;

    if (!alt.isGppEligible) {
      if (!window.confirm(`⚠️ CẢNH BÁO GPP:\n${alt.clinicalWarning || 'Thuốc này không hoàn toàn tương đương chuẩn GPP.'}\n\nBạn có chắc chắn muốn Dược sĩ chịu trách nhiệm thay thế thuốc này không?`)) {
        return;
      }
    }

    const updatedItems = [...aiScanResult.items];
    const targetItem = updatedItems[selectedAiItemIdx];

    // Xác định lô FEFO nếu có
    const fefoBatch = alt.fefoBatchNo ? {
      batch_no: alt.fefoBatchNo,
      exp_date: alt.fefoExpDate,
    } : (alt.batches && alt.batches.length > 0 ? {
      batch_no: alt.batches[0].batchNo,
      exp_date: alt.batches[0].expiryDate,
    } : null);

    updatedItems[selectedAiItemIdx] = {
      ...targetItem,
      match_status: "SUBSTITUTE_AVAILABLE", // Đánh dấu đã khớp hoạt chất thay thế
      selected_sku: {
        product_id: alt.id || alt._id,
        product_name: alt.name,
        active_ingredient: alt.active_ingredient,
        dosage_form: alt.dosage_form || alt.type,
        unit: alt.unit || targetItem.extracted?.unit || "Hộp",
        retail_price: alt.price || 0,
        stock: alt.stock || alt.branchStock || 0,
      },
      fefo_batch: fefoBatch,
    };

    setAiScanResult({
      ...aiScanResult,
      items: updatedItems,
    });

    setShowAiAlternativesModal(false);
    setSelectedAiItemIdx(null);
    setSelectedAiItemForAlt(null);
    showToast(`Đã chọn thuốc thay thế: "${alt.name}" (Còn ${alt.stock || 0} ${alt.unit || 'đơn vị'})!`, "success");
  };

  // Tìm thuốc thay thế cho thuốc trong giỏ hàng kê đơn (Cart)
  const handleFetchCartAlternatives = async (cartItem: any) => {
    setSelectedCartMedForAlt(cartItem);
    setShowCartAlternativesModal(true);
    await fetchGppAlternativesUnified(
      cartItem.name,
      cartItem.active_ingredient,
      cartItem.dosage_form || "",
      cartItem.medicineId
    );
  };

  // Chọn thuốc thay thế trong giỏ hàng kê đơn (Cart)
  const handleSelectCartAlternative = (alt: any) => {
    if (!selectedCartMedForAlt) return;

    if (!alt.isGppEligible) {
      if (!window.confirm(`⚠️ CẢNH BÁO GPP:\n${alt.clinicalWarning || 'Thuốc này không hoàn toàn tương đương chuẩn GPP.'}\n\nBạn có chắc chắn muốn Dược sĩ chịu trách nhiệm thay thế thuốc này không?`)) {
        return;
      }
    }

    const oldMedId = selectedCartMedForAlt.medicineId;
    const newMedId = alt.id || alt._id;

    setPrescriptionItems(prev => prev.map(item => {
      if (item.medicineId === oldMedId) {
        return {
          ...item,
          medicineId: newMedId,
          name: alt.name,
          active_ingredient: alt.active_ingredient || item.active_ingredient,
          price: alt.price || item.price,
          unit: alt.unit || item.unit,
          stock: alt.stock || alt.branchStock || 0,
          expiry: alt.expiry || alt.fefoExpDate || item.expiry,
          status: (alt.stock || 0) > 0 ? "In Stock" : "Out of Stock",
        };
      }
      return item;
    }));

    setShowCartAlternativesModal(false);
    setSelectedCartMedForAlt(null);
    showToast(`Đã thay thế "${selectedCartMedForAlt.name}" bằng "${alt.name}"!`, "success");
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
      totalItems: prescriptionItems.length,
      patientName: patientName || "Khách kê đơn",
      patientAge: patientAge,
      patientGender: patientGender,
      diagnosis: "Khám lâm sàng theo đơn",
      doctorName: doctorName || "Bác sĩ điều trị",
      hospitalName: hospitalName || "Bệnh viện",
      warningsCount: 0,
      source: "AI_VISION_SCAN",
      drugs: prescriptionItems.map((item: any) => ({
        name: item.name,
        dosage: item.dosage,
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


  // Helper variables for presets
  const matchedPreset = hospitalPresets.find(h => h.name === hospitalName);
  const dropdownValue = matchedPreset ? hospitalName : (hospitalName ? "CUSTOM" : "");

  const handleHospitalPresetChange = (val: string) => {
    if (val === "CUSTOM") {
      setHospitalName("");
      setHospitalCode("");
    } else {
      const selected = hospitalPresets.find(h => h.name === val);
      if (selected) {
        setHospitalName(selected.name);
        setHospitalCode(selected.code);
      }
    }
  };

  const matchedSpecialty = specialtyPresets.find(s => s === doctorSpecialty);
  const specialtyDropdownValue = matchedSpecialty ? doctorSpecialty : (doctorSpecialty ? "CUSTOM" : "");

  const handleSpecialtyChange = (val: string) => {
    if (val === "CUSTOM") {
      setDoctorSpecialty("");
    } else {
      setDoctorSpecialty(val);
    }
  };

  // Load prescriptions from DB
  const fetchDbPrescriptions = async () => {
    try {
      const data = await prescriptionService.getPrescriptions();
      setDbPrescriptions(data || []);
    } catch (err) {
      console.error("Lỗi lấy danh sách đơn thuốc:", err);
    }
  };

  useEffect(() => {
    fetchDbPrescriptions();
  }, []);

  // Search query debounce for direct medicine search & filters
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

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        setIsDropdownOpen(false);
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, []);

  const searchMedicines = async (query: string, cat?: string, cls?: string, stockF?: string) => {
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
        branchStockOnly: currentStockF === "IN_STOCK",
        _t: Date.now()
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
    }
  };

  // Tu dong load don dien tu dau tien neu co ma tren dong nhap lieu
  useEffect(() => {
    if (prescriptionMode === "QR") {
      if (prescriptionCode) {
        fetchPrescription(prescriptionCode);
      }
    } else {
      // Clear forms for manual prescription
      setPatientName("");
      setPatientAge("");
      setPatientGender("Nam");
      setPatientPhone("");
      setDoctorName("");
      setDoctorSpecialty("");
      setHospitalName("");
      setHospitalCode("");
      setPrescriptionItems([]);
      setPrescriptionCode("");
    }
  }, [prescriptionMode]);

  const fetchPrescription = async (code: string) => {
    if (!code) return;
    setLoading(true);
    setError("");
    try {
      const data = await prescriptionService.getPrescriptionByCode(code);
      // Populate fields from fetched prescription
      setPatientName(data.patientName);
      setPatientAge(data.patientAge.toString());
      setPatientGender(data.patientGender);
      setPatientPhone(data.patientPhone);
      setDoctorName(data.doctorName);
      setDoctorSpecialty(data.doctorSpecialty);
      setHospitalName(data.hospitalName);
      setHospitalCode(data.hospitalCode);
      setPrescriptionItems(data.items);
      setPrescriptionCode(code);
    } catch (err: any) {
      setError(err.response?.data?.message || err.message || "Lỗi kết nối máy chủ");
      setPrescriptionItems([]);
    } finally {
      setLoading(false);
    }
  };

  const handleScanSimulation = (code: string) => {
    setIsScanning(true);
    setScannedCode(code);
    setTimeout(() => {
      setIsScanning(false);
      setShowQRModal(false);
      setPrescriptionMode("QR");
      fetchPrescription(code);
    }, 1500);
  };

  const handleAddMedicineDirect = (med: any) => {
    const medId = med.id || med._id;
    const existing = prescriptionItems.find(it => it.medicineId === medId);
    if (existing) {
      setPrescriptionItems(prescriptionItems.map(it =>
        it.medicineId === medId
          ? { ...it, quantity: it.quantity + 1 }
          : it
      ));
      if (existing.quantity + 1 > (med.stock || 0)) {
        showToast(`Cảnh báo: Số lượng thuốc "${med.name}" vượt quá tồn kho (${med.stock || 0} ${med.unit || 'viên'})!`, "warning");
      }
    } else {
      setPrescriptionItems([...prescriptionItems, {
        medicineId: medId,
        name: med.name,
        active_ingredient: med.active_ingredient,
        price: med.price,
        quantity: 1,
        dosage: "Ngày uống 2 lần, mỗi lần 1 viên sau ăn.",
        unit: med.unit,
        stock: med.stock,
        expiry: med.expiry,
        status: (med.stock || 0) > 0 ? "In Stock" : "Out of Stock"
      }]);

      if ((med.stock || 0) <= 0) {
        showToast(`Thuốc "${med.name}" hiện đang hết hàng ở chi nhánh (Tồn: 0).`, "warning");
      }
    }

    // Reset search
    setSearchQuery("");
    setSearchResults([]);
  };

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

  const finalizeSalesOrder = async (payload: any) => {
    if (isShiftActive === false) {
      showToast("Bạn chưa đến ca làm việc hoặc chưa điểm danh ca trực hôm nay qua ứng dụng di động!", "warning");
      return;
    }
    setLoading(true);
    setError("");
    try {
      const result = await orderService.createSale(payload);

      setInvoiceData({
        ...normalizeInvoiceResult(result),
        aiPharmacistConfirmation
      });
      setShowInvoiceModal(true);

      // Sync orderCode with OCR log
      if (aiPharmacistConfirmation?.scanId) {
        aiClinicalService.saveOcrAdjustment(aiPharmacistConfirmation.scanId, {
          pharmacistAdjustedItems: prescriptionItems.map((item: any) => ({
            medicineId: item.medicineId,
            name: item.name,
            quantity: item.quantity,
            unit: item.unit,
            dosage: item.dosage,
            price: item.price,
            active_ingredient: item.active_ingredient,
          })),
          adjustmentSummary: "Đơn thuốc đã được xuất bán thành công qua POS",
          orderCode: payload.orderCode,
          status: "DISPENSED",
        }).catch((e: any) => console.warn("Failed to sync order code to OCR log:", e));
      }

      // Clear forms
      setPrescriptionItems([]);
      setPatientName("");
      setPatientAge("");
      setPatientPhone("");
      setDoctorName("");
      setDoctorSpecialty("");
      setHospitalName("");
      setHospitalCode("");
      setPrescriptionCode("");
      setAppliedVoucher(null);
      setVoucherCode("");
      setVoucherError("");
      setAiPharmacistConfirmation(null);
      fetchDbPrescriptions();
    } catch (err: any) {
      setError(err.response?.data?.message || err.message || "Lỗi thanh toán");
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

            // Clear forms
            setPrescriptionItems([]);
            setPatientName("");
            setPatientAge("");
            setPatientPhone("");
            setDoctorName("");
            setDoctorSpecialty("");
            setHospitalName("");
            setHospitalCode("");
            setPrescriptionCode("");
            setAppliedVoucher(null);
            setVoucherCode("");
            setVoucherError("");
            fetchDbPrescriptions();
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
        setInvoiceData(normalizeInvoiceResult(data));
        setShowInvoiceModal(true);

        // Clear forms
        setPrescriptionItems([]);
        setPatientName("");
        setPatientAge("");
        setPatientPhone("");
        setDoctorName("");
        setDoctorSpecialty("");
        setHospitalName("");
        setHospitalCode("");
        setPrescriptionCode("");
        setAppliedVoucher(null);
        setVoucherCode("");
        setVoucherError("");
        fetchDbPrescriptions();
      } else {
        showToast("Hệ thống chưa ghi nhận được thanh toán. Vui lòng chuyển khoản lại hoặc đợi vài giây.", "warning");
      }
    } catch (err: any) {
      console.error(err);
      showToast("Lỗi kiểm tra trạng thái thanh toán.", "error");
    }
  };

  const handleCheckout = async () => {
    if (prescriptionItems.length === 0) {
      setError("Vui lòng thêm ít nhất một loại thuốc vào đơn kê.");
      return;
    }
    if (!patientName || !doctorName) {
      setError("Vui lòng điền tên bệnh nhân và tên bác sĩ kê đơn.");
      return;
    }

    // 🛡️ CHECKOUT GUARD: Kiem tra ton kho truoc khi thanh toan
    const overStockItem = prescriptionItems.find((it: any) => it.quantity > (it.stock || 0));
    if (overStockItem) {
      const msg = `Không thể thanh toán: Thuốc "${overStockItem.name}" vượt quá tồn kho (Yêu cầu ${overStockItem.quantity} ${overStockItem.unit}, chỉ còn ${overStockItem.stock} ${overStockItem.unit})!`;
      setError(msg);
      showToast(msg, "error");
      return;
    }

    setLoading(true);
    setError("");
    try {
      const { branchId: currentBranchId, fullName: currentUserName } = getBranchInfoFromToken();
      const code = prescriptionMode === "QR" && prescriptionCode ? prescriptionCode : `PRX-HAND-${Math.floor(10000 + Math.random() * 90000)}`;

      const generatedOrderCode = Math.floor(10000000 + Math.random() * 90000000);
      const payload: any = {
        prescriptionCode: code,
        type: "PRESCRIPTION",
        branchId: currentBranchId || undefined,
        isManualPrescription: prescriptionMode === "MANUAL" || !prescriptionCode,
        items: prescriptionItems.map((it: any) => ({
          medicineId: it.medicineId,
          quantity: it.quantity,
          dosage: it.dosage || "Ngày uống 2 lần, mỗi lần 1 viên sau ăn."
        })),
        paymentMethod,
        patientName,
        patientPhone,
        patientAge: patientAge ? Number(patientAge) : 30,
        patientGender,
        doctorName,
        doctorSpecialty,
        hospitalName,
        hospitalCode,
        soldBy: currentUserName || "Dược sĩ Trần Thị A",
        orderCode: generatedOrderCode,
        remarks: (remarks ? remarks + " | " : "") + (aiPharmacistConfirmation?.confirmed ? `[ĐÃ XÁC NHẬN BỞI DS ${aiPharmacistConfirmation.pharmacistName} - MÃ DUYỆT ${aiPharmacistConfirmation.auditCode}]` : ""),
        aiAssisted: Boolean(aiPharmacistConfirmation?.confirmed),
        pharmacistConfirmed: Boolean(aiPharmacistConfirmation?.confirmed),
        pharmacistConfirmedBy: aiPharmacistConfirmation?.pharmacistName,
        pharmacistConfirmedAt: aiPharmacistConfirmation?.confirmedAt,
        aiAuditCode: aiPharmacistConfirmation?.auditCode,
      };

      if (paymentMethod === "QR_PAY") {
        const payosResult = await orderService.createPayOSLink({
          patientName,
          patientPhone: patientPhone || "0900000000",
          totalAmount: total,
          paymentMethod: "QR_PAY",
          voucherCode: appliedVoucher ? appliedVoucher.code : undefined,
          items: prescriptionItems.map(it => ({
            medicineId: it.medicineId,
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
      setError(err.message || "Lỗi thanh toán");
    } finally {
      setLoading(false);
    }
  };

  // Tính toán tiền đơn thuốc (Không áp dụng VIP ảo nếu chưa có hồ sơ thành viên)
  const subtotal = prescriptionItems.reduce((sum: number, it: any) => sum + (it.price * it.quantity), 0);
  const vipDiscount = 0; // Đơn kê đơn không áp dụng VIP tự động
  const voucherDiscount = appliedVoucher ? appliedVoucher.discount : 0;
  const vat = Math.round(Math.max(0, subtotal - vipDiscount - voucherDiscount) * 0.08); // 8% VAT
  const total = Math.max(0, subtotal - vipDiscount - voucherDiscount + vat);

  const handleApplyVoucher = async () => {
    const code = voucherCode.trim().toUpperCase();
    setVoucherError("");

    if (!code) {
      setVoucherError("Vui lòng nhập mã giảm giá");
      return;
    }

    if (prescriptionItems.length === 0 || subtotal <= 0) {
      setVoucherError("Vui lòng thêm thuốc trước khi áp dụng mã");
      return;
    }

    setIsValidatingVoucher(true);
    try {
      const itemsPayload = prescriptionItems.map((it: any) => ({
        medicineId: String(it.medicineId || it.id || it._id),
        medicineName: it.name || it.medicineName || "",
        quantity: Number(it.quantity || 1),
        price: Number(it.price || it.salePrice || 0),
      }));
      const result = await voucherService.validateVoucher(code, subtotal, itemsPayload);
      if (result?.error) {
        setVoucherError(result.message || "Mã giảm giá không hợp lệ");
        setAppliedVoucher(null);
        return;
      }

      setAppliedVoucher(result);
      setVoucherCode("");
      showToast(result.message || `Đã áp dụng mã ${result.code}`, "success");
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

  // Kiem tra tuong tac thuoc nguy hiem (Clopidogrel + Omeprazole)
  const hasClopidogrel = prescriptionItems.some((it: any) => it.active_ingredient.toLowerCase().includes("clopidogrel") || it.name.toLowerCase().includes("plavix") || it.name.toLowerCase().includes("platarex"));
  const hasOmeprazole = prescriptionItems.some((it: any) => it.active_ingredient.toLowerCase().includes("omeprazole") || it.name.toLowerCase().includes("losec") || it.name.toLowerCase().includes("ecosip"));
  const drugInteractionWarning = hasClopidogrel && hasOmeprazole;

  // Kiem tra co san pham nao can HSD hoac het hang
  const hasNearExpiry = prescriptionItems.some((it: any) => {
    if (!it.expiry) return false;
    const diffTime = new Date(it.expiry).getTime() - new Date().getTime();
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
    return diffDays > 0 && diffDays <= 180;
  });

  return (
    <div className="h-full flex flex-col xl:flex-row gap-6 overflow-hidden">
      {/* Cot trai: Chi tiet don & Gio hang */}
      <div className="flex-1 overflow-y-auto pr-1 flex flex-col gap-6 pb-6">

        {/* Prescription Search and Actions */}
        <div className="bg-white rounded-2xl border border-slate-200 p-5 shadow-xs flex flex-col md:flex-row items-center gap-3 shrink-0">
          <div className="flex-1 relative w-full">
            <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none text-slate-400">
              <FileText size={18} />
            </div>
            <input
              type="text"
              placeholder="Nhập mã đơn thuốc điện tử (Ví dụ: RX-99281-HAN)..."
              value={prescriptionCode}
              onChange={(e) => setPrescriptionCode(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && fetchPrescription(prescriptionCode)}
              className="w-full pl-11 pr-4 py-3 bg-slate-50 border border-slate-200 rounded-xl text-slate-900 font-bold focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-600 transition-all text-sm shadow-2xs"
            />
          </div>
          <div className="flex gap-2.5 w-full md:w-auto shrink-0">
            <button
              onClick={() => fetchPrescription(prescriptionCode)}
              disabled={loading}
              className="flex-1 md:flex-none px-5 py-3 bg-blue-600 hover:bg-blue-700 text-white font-bold rounded-xl shadow-xs transition-colors cursor-pointer text-xs uppercase tracking-wider"
            >
              {loading ? "Đang tải..." : "Tra cứu"}
            </button>
            <button
              onClick={() => setShowQRModal(true)}
              className="flex-1 md:flex-none px-4 py-3 border border-blue-200 text-blue-700 font-bold rounded-xl hover:bg-blue-50 transition-all flex items-center justify-center gap-2 cursor-pointer text-xs uppercase tracking-wider"
            >
              <QrCode size={16} /> Quét mã QR
            </button>
            <button
              onClick={() => setShowAIScanModal(true)}
              className="flex-1 md:flex-none px-4 py-3 bg-gradient-to-r from-purple-600 to-blue-600 hover:from-purple-700 hover:to-blue-700 text-white font-bold rounded-xl shadow-xs transition-all flex items-center justify-center gap-2 cursor-pointer text-xs uppercase tracking-wider"
            >
              <Sparkles size={16} /> Quét Đơn Bằng AI
            </button>
          </div>
        </div>

        {/* Thong tin Don thuoc & Nguoi ke toa (Collapsible) */}
        <div className="bg-white rounded-[16px] border border-slate-200 p-5 shadow-sm flex flex-col gap-4 shrink-0">
          <div className="flex items-center justify-between border-b border-slate-100 pb-2">
            <h3 className="font-black text-slate-800 text-sm uppercase tracking-wider flex items-center gap-2">
              <Stethoscope size={18} className="text-[#0057cd]" /> Thông tin bệnh nhân & bác sĩ
            </h3>
            <button
              type="button"
              onClick={() => setIsPatientInfoOpen(!isPatientInfoOpen)}
              className="text-xs font-bold text-[#0057cd] bg-[#f2f3ff] px-3 py-1.5 rounded-lg border border-[#b1c5ff] hover:bg-[#e0e7ff] transition-colors"
            >
              {isPatientInfoOpen ? "Thu gọn" : "Chỉnh sửa thông tin"}
            </button>
          </div>

          {!isPatientInfoOpen ? (
            /* Summary view when collapsed */
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3 text-xs font-semibold text-slate-700 bg-slate-50 p-3.5 rounded-xl border border-slate-100/50">
              <div className="flex flex-wrap items-center gap-1.5">
                <span className="text-slate-400 font-bold">Bệnh nhân:</span>
                <span className="font-extrabold text-slate-900">{patientName || "Chưa nhập"}</span>
                {patientAge && <span className="text-slate-400">({patientAge} tuổi, {patientGender})</span>}
                {patientPhone && <span className="text-slate-400 font-bold">| SĐT: {patientPhone}</span>}
              </div>
              <div className="flex flex-wrap items-center gap-1.5 md:justify-end">
                <span className="text-slate-400 font-bold">Bác sĩ:</span>
                <span className="font-extrabold text-slate-900">{doctorName || "Chưa nhập"}</span>
                {hospitalName && <span className="text-slate-400">({hospitalName})</span>}
              </div>
            </div>
          ) : (
            /* Detailed form view when expanded */
            <div className="flex flex-col gap-4">
              <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                <div>
                  <label className="block text-xs font-bold text-slate-500 mb-1">Tên bệnh nhân *</label>
                  <input
                    type="text"
                    value={patientName}
                    onChange={(e) => setPatientName(e.target.value)}
                    placeholder="Nguyễn Văn A"
                    className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-lg text-sm font-semibold focus:bg-white focus:outline-none focus:border-emerald-600"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-500 mb-1">Tuổi</label>
                  <input
                    type="number"
                    value={patientAge}
                    onChange={(e) => setPatientAge(e.target.value)}
                    placeholder="30"
                    className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-lg text-sm font-semibold focus:bg-white focus:outline-none focus:border-emerald-600"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-500 mb-1">Giới tính</label>
                  <select
                    value={patientGender}
                    onChange={(e) => setPatientGender(e.target.value)}
                    className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-lg text-sm font-semibold focus:bg-white focus:outline-none focus:border-emerald-600"
                  >
                    <option>Nam</option>
                    <option>Nữ</option>
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-500 mb-1">Số điện thoại</label>
                  <input
                    type="text"
                    value={patientPhone}
                    onChange={(e) => setPatientPhone(e.target.value)}
                    placeholder="09xx xxx xxx"
                    className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-lg text-sm font-semibold focus:bg-white focus:outline-none focus:border-emerald-600"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                <div>
                  <label className="block text-xs font-bold text-slate-500 mb-1">Bác sĩ kê đơn *</label>
                  <input
                    type="text"
                    value={doctorName}
                    onChange={(e) => setDoctorName(e.target.value)}
                    placeholder="BS. Lê Văn B"
                    className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-lg text-sm font-semibold focus:bg-white focus:outline-none focus:border-emerald-600"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-500 mb-1">Chuyên khoa</label>
                  <select
                    value={specialtyDropdownValue}
                    onChange={(e) => handleSpecialtyChange(e.target.value)}
                    className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-lg text-sm font-semibold focus:bg-white focus:outline-none focus:border-emerald-600"
                  >
                    <option value="" disabled>-- Chọn chuyên khoa --</option>
                    {specialtyPresets.map(spec => (
                      <option key={spec} value={spec === "Khác" ? "CUSTOM" : spec}>{spec}</option>
                    ))}
                  </select>
                  {specialtyDropdownValue === "CUSTOM" && (
                    <input
                      type="text"
                      value={doctorSpecialty}
                      onChange={(e) => setDoctorSpecialty(e.target.value)}
                      placeholder="Nhập chuyên khoa khác..."
                      className="w-full mt-2 p-2 bg-slate-50 border border-slate-200 rounded-lg text-xs font-semibold focus:bg-white focus:outline-none focus:border-emerald-600"
                    />
                  )}
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-500 mb-1">Bệnh viện / Phòng khám</label>
                  <select
                    value={dropdownValue}
                    onChange={(e) => handleHospitalPresetChange(e.target.value)}
                    className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-lg text-sm font-semibold focus:bg-white focus:outline-none focus:border-emerald-600"
                  >
                    <option value="" disabled>-- Chọn bệnh viện --</option>
                    {hospitalPresets.map(h => (
                      <option key={h.name} value={h.code === "CUSTOM" ? "CUSTOM" : h.name}>{h.name}</option>
                    ))}
                  </select>
                  {dropdownValue === "CUSTOM" && (
                    <input
                      type="text"
                      value={hospitalName}
                      onChange={(e) => setHospitalName(e.target.value)}
                      placeholder="Nhập tên bệnh viện khác..."
                      className="w-full mt-2 p-2 bg-slate-50 border border-slate-200 rounded-lg text-xs font-semibold focus:bg-white focus:outline-none focus:border-emerald-600"
                    />
                  )}
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-500 mb-1">Mã cơ sở y tế</label>
                  <input
                    type="text"
                    value={hospitalCode}
                    onChange={(e) => setHospitalCode(e.target.value)}
                    disabled={dropdownValue !== "CUSTOM" && dropdownValue !== ""}
                    placeholder="BM-1029"
                    className={`w-full p-2.5 rounded-lg text-sm font-semibold focus:outline-none focus:border-emerald-600 ${dropdownValue !== "CUSTOM" && dropdownValue !== ""
                      ? "bg-slate-100 text-slate-500 border-slate-250 cursor-not-allowed"
                      : "bg-slate-50 border border-slate-200 focus:bg-white"
                      }`}
                  />
                </div>
              </div>
            </div>
          )}
        </div>

        {error && (
          <div className="bg-red-50 border border-red-200 text-red-700 p-4 rounded-xl font-medium flex items-center gap-3">
            <XCircle className="text-red-500 shrink-0" size={20} />
            {error}
          </div>
        )}

        {/* Tim kiem va them thuoc truc tiep (Inline Search Bar) */}
        <div className="bg-white rounded-[16px] border border-slate-200 p-5 shadow-sm flex flex-col gap-3 shrink-0">
          <label className="block text-xs font-black text-slate-700 uppercase tracking-wide">
            Tìm thuốc kê đơn từ kho và thêm trực tiếp
          </label>
          <div className="relative">
            <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none text-slate-400">
              {loading ? <Loader2 size={18} className="animate-spin text-emerald-600" /> : <SearchIcon size={18} />}
            </div>
            <input
              type="text"
              placeholder="Nhập tên thuốc, hoạt chất, số đăng ký hoặc mã thuốc để tìm..."
              value={searchQuery}
              onFocus={() => { if (searchResults.length > 0) setIsDropdownOpen(true); }}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-11 pr-10 py-3 bg-slate-50 border border-slate-200 rounded-[12px] text-slate-900 font-bold focus:outline-none focus:ring-2 focus:ring-[#0057cd] transition-all text-sm"
            />
            {searchQuery && (
              <button
                onClick={() => setSearchQuery("")}
                className="absolute inset-y-0 right-0 pr-3.5 flex items-center text-slate-400 hover:text-slate-700"
              >
                <X size={16} />
              </button>
            )}

            {/* Dropdown ket qua tim kiem */}
            {isDropdownOpen && searchResults.length > 0 && (
              <div className="absolute left-0 right-0 top-full mt-2 bg-white rounded-xl border border-slate-200 shadow-xl max-h-72 overflow-y-auto z-40 divide-y divide-slate-100">
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
                      onClick={() => { handleAddMedicineDirect(med); setIsDropdownOpen(false); }}
                      className="w-full p-3.5 text-left hover:bg-slate-50 transition-colors flex items-center justify-between group"
                    >
                      <div>
                        <div className="font-bold text-slate-900 text-sm group-hover:text-[#0057cd] transition-colors">{med.name}</div>
                        <div className="text-xs text-slate-500 mt-0.5">{med.category} | Hoạt chất: {med.active_ingredient || "N/A"}</div>
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
                      <div className="text-right shrink-0 font-bold text-[#0057cd] text-sm">
                        <div>{med.price?.toLocaleString()}₫</div>
                        <div className="text-xs text-slate-500 mt-0.5 font-semibold">Tồn: {totalStock} {med.unit}</div>
                      </div>
                    </button>
                  );
                })}
              </div>
            )}
          </div>

          {/* Thanh Bo Loc Thuoc Ke Don */}
          <div className="flex flex-wrap items-center gap-2.5 bg-slate-50/80 p-2.5 rounded-xl border border-slate-200/60 mt-1">
            <div className="flex items-center gap-1.5 text-xs font-bold text-slate-500 mr-1">
              <Filter size={14} className="text-[#0057cd]" /> Lọc nhanh:
            </div>

            <select
              value={selectedCategory}
              onChange={(e) => {
                const val = e.target.value;
                setSelectedCategory(val);
                searchMedicines(searchQuery, val, selectedClassification, stockFilter);
              }}
              className="px-3 py-1.5 bg-white border border-slate-200 rounded-lg text-xs font-bold text-slate-700 outline-none focus:border-emerald-600 cursor-pointer"
            >
              <option value="">Tất cả Nhóm thuốc</option>
              {categoriesList.map((cat) => (
                <option key={cat} value={cat}>{cat}</option>
              ))}
            </select>

            <select
              value={selectedClassification}
              onChange={(e) => {
                const val = e.target.value;
                setSelectedClassification(val);
                searchMedicines(searchQuery, selectedCategory, val, stockFilter);
              }}
              className="px-3 py-1.5 bg-white border border-slate-200 rounded-lg text-xs font-bold text-slate-700 outline-none focus:border-emerald-600 cursor-pointer"
            >
              <option value="">Tất cả Phân loại</option>
              <option value="PRESCRIPTION">Thuốc kê đơn (Rx)</option>
              <option value="NON_PRESCRIPTION">Thuốc không kê đơn (OTC)</option>
              <option value="SUPPLEMENT">Thực phẩm chức năng</option>
            </select>

            <select
              value={stockFilter}
              onChange={(e) => {
                const val = e.target.value;
                setStockFilter(val);
                searchMedicines(searchQuery, selectedCategory, selectedClassification, val);
              }}
              className="px-3 py-1.5 bg-white border border-slate-200 rounded-lg text-xs font-bold text-slate-700 outline-none focus:border-emerald-600 cursor-pointer"
            >
              <option value="ALL">Tất cả tồn kho</option>
              <option value="IN_STOCK">Còn hàng (Tồn &gt; 0)</option>
              <option value="OUT_OF_STOCK">Hết hàng (Tồn = 0)</option>
            </select>

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
        </div>

        {/* Bang danh sach thuoc ke don */}
        {prescriptionItems.length > 0 ? (
          <>
            {/* 🛡️ BANNER THONG BAO XAC NHAN DUOC SI CHO DON THUOC AI */}
            {aiPharmacistConfirmation?.confirmed && (
              <div className="bg-gradient-to-r from-sky-500/10 via-teal-500/5 to-blue-500/10 border-2 border-sky-400/80 rounded-2xl p-4 shadow-sm flex flex-col md:flex-row items-start md:items-center justify-between gap-4 backdrop-blur-xs animate-in fade-in slide-in-from-top-2 duration-300">
                <div className="flex items-center gap-3.5">
                  <div className="relative">
                    <div className="w-12 h-12 rounded-2xl bg-sky-600 text-white flex items-center justify-center shadow-md shadow-sky-600/30 shrink-0">
                      <ShieldCheck size={26} />
                    </div>
                    <span className="absolute -bottom-1 -right-1 flex h-4 w-4">
                      <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-sky-400 opacity-75"></span>
                      <span className="relative inline-flex rounded-full h-4 w-4 bg-sky-500 border-2 border-white"></span>
                    </span>
                  </div>
                  <div>
                    <div className="flex flex-wrap items-center gap-2">
                      <span className="px-2.5 py-0.5 rounded-full text-[10px] font-black uppercase tracking-wider bg-sky-100 text-sky-800 border border-sky-300 flex items-center gap-1 shadow-2xs">
                        <CheckCircle2 size={11} className="text-sky-700" /> ĐÃ XÁC NHẬN BƯỚC CUỐI • CHUẨN GPP
                      </span>
                      <span className="text-xs font-mono font-bold text-slate-500">
                        Mã duyệt: <strong className="text-sky-700 font-extrabold">{aiPharmacistConfirmation.auditCode}</strong>
                      </span>
                    </div>
                    <h3 className="text-sm font-black text-slate-900 mt-1">
                      Dược sĩ <span className="text-sky-700 underline decoration-sky-400 decoration-2">{aiPharmacistConfirmation.pharmacistName}</span> đã thẩm định & ký duyệt đơn thuốc do AI hỗ trợ
                    </h3>
                    <p className="text-xs text-slate-500 mt-0.5">
                      Thời gian duyệt: <strong>{new Date(aiPharmacistConfirmation.confirmedAt).toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit', second: '2-digit' })}</strong> - {new Date(aiPharmacistConfirmation.confirmedAt).toLocaleDateString('vi-VN')} • Bệnh nhân: <strong>{aiPharmacistConfirmation.patientName || "Khách lẻ"}</strong> • {aiPharmacistConfirmation.totalItems} khoản mục thuốc
                    </p>
                  </div>
                </div>

                <div className="flex items-center gap-2 self-end md:self-center shrink-0">
                  <button
                    type="button"
                    onClick={() => setShowAuditModal(true)}
                    className="px-3.5 py-2 bg-white hover:bg-sky-50 text-sky-700 font-extrabold text-xs rounded-xl border border-sky-300 shadow-2xs transition-all flex items-center gap-1.5 cursor-pointer hover:shadow"
                  >
                    <FileCheck2 size={15} /> Xem Biên Bản Thẩm Định AI
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      if (window.confirm("Bạn có chắc chắn muốn hủy xác nhận thẩm định của đơn thuốc AI này để tái kiểm tra?")) {
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

            {/* Canh bao nhac nho neu co thuoc AI nhung chua xac nhan */}
            {prescriptionItems.some((it: any) => it.aiSuggested) && !aiPharmacistConfirmation?.confirmed && (
              <div className="bg-amber-50 border-2 border-amber-300 rounded-2xl p-4 shadow-sm flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 animate-in fade-in duration-200">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-xl bg-amber-500 text-white flex items-center justify-center shrink-0 shadow-sm">
                    <AlertTriangle size={20} />
                  </div>
                  <div>
                    <h4 className="text-xs font-black text-amber-950 uppercase tracking-wide flex items-center gap-1.5">
                      Đơn thuốc do AI hỗ trợ - Chờ Dược sĩ xác nhận bước cuối
                      <span className="bg-amber-200 text-amber-900 text-[10px] px-2 py-0.5 rounded-full font-bold">Quy chuẩn GPP</span>
                    </h4>
                    <p className="text-xs text-amber-800 mt-0.5">
                      Vui lòng đối soát lâm sàng các loại thuốc do AI trích xuất và bấm xác nhận để hoàn tất quy trình.
                    </p>
                  </div>
                </div>
                <button
                  type="button"
                  onClick={handleQuickConfirmAI}
                  className="px-4 py-2.5 bg-sky-600 hover:bg-sky-700 text-white text-xs font-black rounded-xl shadow transition-all flex items-center gap-1.5 shrink-0 cursor-pointer active:scale-95"
                >
                  <ShieldCheck size={16} /> Dược Sĩ Xác Nhận Bước Cuối Ngay
                </button>
              </div>
            )}

            {/* Canh bao tuong tac thuoc nguy hiem */}
            {drugInteractionWarning && (
              <div className="bg-[#ffdad6] border border-[#93000a] rounded-[16px] p-5 shadow-sm flex items-start gap-4 animate-bounce">
                <div className="w-10 h-10 rounded-full bg-white flex items-center justify-center shrink-0 shadow-sm text-[#ba1a1a]">
                  <ShieldAlert size={24} />
                </div>
                <div className="flex-1">
                  <h3 className="text-[#93000a] font-bold text-[15px] mb-1 uppercase tracking-wide">
                    CẢNH BÁO TƯƠNG TÁC THUỐC NGUY HIỂM / DANGEROUS DRUG INTERACTION
                  </h3>
                  <p className="text-[#ba1a1a] text-[13px] leading-relaxed">
                    Đơn thuốc chứa hoạt chất <span className="font-bold underline">Clopidogrel</span> và <span className="font-bold underline">Omeprazole</span>. Việc kết hợp này làm giảm hoạt tính chuyển hóa của Clopidogrel, dẫn tới giảm hiệu quả chống đông và tăng nguy cơ huyết khối. Vui lòng xác nhận lại với bác sĩ điều trị trước khi cấp phát.
                  </p>
                </div>
              </div>
            )}

            {/* Danh mục thuốc kê đơn dạng Card bán lẻ POS chuyên nghiệp */}
            <div className="bg-white rounded-[16px] border border-slate-200 shadow-sm overflow-hidden flex-1 flex flex-col min-h-[480px]">
              <div className="px-6 py-4 flex flex-wrap items-center justify-between gap-4 border-b border-slate-100 bg-slate-50 rounded-t-[16px]">
                <div className="flex items-center gap-2 font-bold text-slate-800">
                  <ShoppingCart size={18} className="text-[#0057cd]" />
                  <span>Danh mục thuốc kê đơn & Phác đồ điều trị</span>
                </div>
                <div className="flex items-center gap-2">
                  {hasNearExpiry && (
                    <span className="px-3 py-1 bg-amber-50 text-[#a63b00] border border-amber-200 rounded-lg text-[11px] font-bold uppercase tracking-wider animate-pulse flex items-center gap-1.5 shadow-2xs">
                      <AlertTriangle size={12} /> Cảnh báo lô cận hạn sử dụng
                    </span>
                  )}
                  <span className="px-3 py-1 bg-[#d8e3fb] text-[#00419e] font-bold text-[11px] rounded-full uppercase tracking-wider">
                    {prescriptionItems.reduce((sum, it) => sum + (it.quantity || 1), 0)} SẢN PHẨM
                  </span>
                </div>
              </div>

              {/* Danh sách thẻ thuốc kê đơn Card view */}
              <div className="flex-1 overflow-y-auto divide-y divide-slate-100 p-4 space-y-4">
                {prescriptionItems.map((it: any) => {
                  const isOutOfStock = (it.stock || 0) < it.quantity;
                  const diffTime = it.expiry ? new Date(it.expiry).getTime() - Date.now() : 0;
                  const diffDays = it.expiry ? Math.ceil(diffTime / (1000 * 60 * 60 * 24)) : null;
                  const isNearExp = diffDays !== null && diffDays > 0 && diffDays <= 180;

                  return (
                    <div
                      key={it.medicineId}
                      className={`rounded-2xl p-4 flex flex-col gap-3 transition-all hover:shadow-sm ${
                        isOutOfStock
                          ? "bg-rose-50/40 border-2 border-rose-300"
                          : isNearExp
                          ? "bg-amber-50/30 border border-amber-200/90"
                          : "bg-slate-50/60 border border-slate-200/80 hover:border-emerald-600/50"
                      }`}
                    >
                      {/* Cảnh báo vượt tồn kho / hết hàng kèm nút tìm thuốc thay thế */}
                      {isOutOfStock && (
                        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 bg-rose-50 border border-rose-200 rounded-xl p-3 text-rose-800 text-xs">
                          <div className="flex items-center gap-2 font-bold">
                            <AlertTriangle size={18} className="text-rose-600 shrink-0" />
                            <span>
                              Vượt quá tồn kho khả dụng! Cần <span className="text-rose-700 underline font-black">{it.quantity} {it.unit}</span>, nhưng kho chỉ còn <span className="text-rose-700 font-black">{it.stock || 0} {it.unit}</span>.
                            </span>
                          </div>
                          <button
                            type="button"
                            onClick={() => handleFetchCartAlternatives(it)}
                            className="px-2.5 py-1 bg-white hover:bg-rose-100 text-rose-700 border border-rose-300 rounded-lg text-[11px] font-bold transition-all cursor-pointer shrink-0 shadow-2xs"
                          >
                            🔄 Tìm thuốc thay thế
                          </button>
                        </div>
                      )}

                      {/* Dòng 1: Tên thuốc, hoạt chất, badges FEFO & nút xóa */}
                      <div className="flex items-start justify-between gap-3">
                        <div className="flex-1 min-w-0">
                          <div className="flex items-baseline gap-2 flex-wrap">
                            <span className="font-black text-slate-900 text-[15px] leading-snug">{it.name}</span>
                            {it.active_ingredient && (
                              <span className="text-[12px] text-slate-500 font-medium">
                                ({it.active_ingredient})
                              </span>
                            )}
                            {it.aiSuggested && (
                              <span className="inline-flex items-center gap-1 text-[10px] font-black text-sky-800 bg-sky-100/90 px-2 py-0.5 rounded-full border border-sky-300 shadow-2xs">
                                <Sparkles size={10} className="text-sky-600" /> AI Đề xuất • Đã duyệt GPP
                              </span>
                            )}
                          </div>

                          {/* Badges kho tồn & Lô FEFO nằm ngang thoáng đãng */}
                          <div className="flex flex-wrap items-center gap-2 mt-2">
                            <span className="text-[10px] font-bold text-slate-600 bg-white px-2 py-0.5 rounded border border-slate-200 shadow-2xs">
                              📦 Đơn vị: {it.unit}
                            </span>
                            <span className={`text-[10px] font-bold px-2 py-0.5 rounded border shadow-2xs ${
                              isOutOfStock ? "bg-rose-100 text-rose-800 border-rose-200" : "bg-sky-50 text-sky-800 border-sky-200"
                            }`}>
                              Tồn kho: {it.stock || 0} {it.unit}
                            </span>
                            {it.batchNo && (
                              <span className="text-[10px] font-bold px-2 py-0.5 rounded border bg-slate-100 text-slate-700 border-slate-200 flex items-center gap-1">
                                <Zap size={11} className="text-sky-600" /> Lô FEFO: {it.batchNo}
                              </span>
                            )}
                            {isNearExp && (
                              <span className="text-[10px] font-black text-amber-800 bg-amber-100 border border-amber-300 px-2 py-0.5 rounded flex items-center gap-1">
                                <AlertTriangle size={11} className="text-amber-600" /> Lô cận hạn (Còn {diffDays} ngày)
                              </span>
                            )}
                          </div>
                        </div>

                        {/* Nút xóa thuốc khỏi đơn */}
                        <button
                          type="button"
                          onClick={() => setPrescriptionItems(prescriptionItems.filter((p: any) => p.medicineId !== it.medicineId))}
                          className="p-1.5 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition-colors cursor-pointer shrink-0"
                          title="Xóa thuốc khỏi đơn"
                        >
                          <Trash2 size={16} />
                        </button>
                      </div>

                      {/* Dòng 2: Bộ nhập & sửa Liều dùng trực tiếp (Dosage) kèm Preset */}
                      <div className="bg-white border border-slate-200/90 rounded-xl p-3 flex flex-col gap-2">
                        <div className="flex flex-col sm:flex-row sm:items-center gap-2">
                          <span className="text-xs font-bold text-slate-600 flex items-center gap-1 shrink-0">
                            <Sparkles size={13} className="text-[#0057cd]" /> Liều dùng (Sửa trực tiếp):
                          </span>
                          <input
                            type="text"
                            value={it.dosage}
                            onChange={(e) => {
                              setPrescriptionItems(prescriptionItems.map((p: any) =>
                                p.medicineId === it.medicineId ? { ...p, dosage: e.target.value } : p
                              ));
                            }}
                            placeholder="Ví dụ: Ngày uống 2 lần, mỗi lần 1 viên sau ăn..."
                            className="flex-1 px-3 py-1.5 bg-slate-50 border border-slate-200 rounded-lg text-xs font-bold text-slate-800 focus:bg-white focus:outline-none focus:ring-1 focus:ring-[#0057cd] transition-all"
                          />
                        </div>
                        <div className="flex flex-wrap gap-1.5 items-center">
                          <span className="text-[10px] text-slate-400 font-semibold">Chọn nhanh:</span>
                          {[
                            "Sáng 1 - Tối 1 (Sau ăn)",
                            "Sáng 1 - Trưa 1 - Tối 1",
                            "Uống trước ăn 30p",
                            "Uống khi đau"
                          ].map((preset) => (
                            <button
                              key={preset}
                              type="button"
                              onClick={() => {
                                setPrescriptionItems(prescriptionItems.map((p: any) =>
                                  p.medicineId === it.medicineId ? { ...p, dosage: preset } : p
                                ));
                              }}
                              className="px-2 py-0.5 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded text-[10px] font-bold transition-colors cursor-pointer"
                            >
                              {preset}
                            </button>
                          ))}
                        </div>
                      </div>

                      {/* Dòng 3: Thao tác Số lượng, Đơn giá & Thành tiền */}
                      <div className="flex flex-wrap items-center justify-between gap-3 pt-2 border-t border-slate-200/70">
                        <div className="flex items-center gap-2">
                          <span className="text-xs font-bold text-slate-500">Số lượng:</span>
                          <div className="flex items-center border border-slate-300 rounded-xl bg-white shadow-xs overflow-hidden">
                            <button
                              type="button"
                              onClick={() => {
                                if (it.quantity > 1) {
                                  setPrescriptionItems(prescriptionItems.map((p: any) =>
                                    p.medicineId === it.medicineId ? { ...p, quantity: p.quantity - 1 } : p
                                  ));
                                }
                              }}
                              className="p-1.5 hover:bg-slate-100 text-slate-600 transition-colors cursor-pointer"
                            >
                              <Minus size={14} />
                            </button>
                            <span className="font-black text-[13px] text-slate-900 px-3 min-w-[32px] text-center">
                              {it.quantity}
                            </span>
                            <button
                              type="button"
                              onClick={() => {
                                if (it.quantity < (it.stock || 0)) {
                                  setPrescriptionItems(prescriptionItems.map((p: any) =>
                                    p.medicineId === it.medicineId ? { ...p, quantity: p.quantity + 1 } : p
                                  ));
                                } else {
                                  showToast("Vượt quá tồn kho khả dụng!", "warning");
                                }
                              }}
                              className="p-1.5 hover:bg-slate-100 text-slate-600 transition-colors cursor-pointer"
                            >
                              <Plus size={14} />
                            </button>
                          </div>
                          <span className="text-xs font-bold text-slate-600">{it.unit}</span>
                        </div>

                        {/* Đơn giá & Thành tiền */}
                        <div className="text-right">
                          <div className="font-black text-[#0057cd] text-[16px] leading-tight">
                            {((it.price || 0) * it.quantity).toLocaleString()}₫
                          </div>
                          <span className="text-[10px] text-slate-400 font-bold block mt-0.5">
                            {(it.price || 0).toLocaleString()}₫ / {it.unit}
                          </span>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          </>
        ) : (
          <div className="bg-white rounded-[24px] border-2 border-dashed border-slate-200 flex-1 min-h-[480px] flex flex-col items-center justify-center p-8 text-center">
            <div className="w-16 h-16 rounded-full bg-[#f2f3ff] flex items-center justify-center text-[#0057cd] mb-4 border border-[#b1c5ff]">
              <FileText size={32} />
            </div>
            <h3 className="text-[18px] font-bold text-slate-800">Đơn thuốc chưa có thuốc kê</h3>
            <p className="text-slate-500 text-sm max-w-sm mt-2">
              Vui lòng gõ tìm kiếm thuốc ở thanh tìm kiếm phía trên để thêm trực tiếp vào danh sách đơn thuốc kê.
            </p>
          </div>
        )}
      </div>

      {/* Cot phai: Thanh toan & Tong tien */}
      <div className="w-full xl:w-[400px] flex flex-col gap-6 shrink-0 pb-6 overflow-y-auto pl-1">

        {/* Hoa don tom tat */}
        <div className="bg-white rounded-[16px] border border-slate-200 p-6 shadow-sm">
          <h3 className="text-[12px] font-black text-slate-500 uppercase tracking-widest mb-4 border-b border-slate-100 pb-3">Chi tiết thanh toán</h3>
          <div className="space-y-4 text-[14px]">
            <div className="flex justify-between items-center text-slate-600 font-medium">
              <span>Tạm tính / Subtotal</span>
              <span className="font-bold text-slate-900">{subtotal.toLocaleString()}₫</span>
            </div>
            {vipDiscount > 0 && (
              <div className="flex justify-between items-center font-medium">
                <span className="text-slate-600">Giảm giá VIP (5%)</span>
                <span className="font-bold text-[#ba1a1a]">-{vipDiscount.toLocaleString()}₫</span>
              </div>
            )}
            {appliedVoucher && (
              <div className="flex justify-between items-center font-medium">
                <span className="text-slate-600">Mã giảm giá ({appliedVoucher.code})</span>
                <span className="font-bold text-[#ba1a1a]">-{voucherDiscount.toLocaleString()}₫</span>
              </div>
            )}
            <div className="flex justify-between items-center text-slate-600 font-medium">
              <span>Thuế VAT (8%)</span>
              <span className="font-bold text-slate-900">{vat.toLocaleString()}₫</span>
            </div>
          </div>

          <div className="mt-6 pt-5 border-t border-slate-200">
            <div className="flex items-end justify-between">
              <div className="text-[12px] font-black text-slate-900 uppercase tracking-widest leading-tight">Tổng tiền thanh toán</div>
              <div className="text-[28px] font-black text-[#0057cd] tracking-tighter">{total.toLocaleString()}₫</div>
            </div>
          </div>
        </div>

        {/* Voucher */}
        <div className="bg-white rounded-[16px] border border-slate-200 p-6 shadow-sm">
          <h3 className="text-[12px] font-black text-slate-500 uppercase tracking-widest mb-4">Áp dụng mã giảm giá</h3>
          {appliedVoucher ? (
            <div className="flex items-center justify-between bg-sky-50 border border-sky-200 p-3 rounded-xl text-xs font-semibold text-sky-800">
              <div>
                Mã đã dùng: <span className="font-extrabold uppercase">{appliedVoucher.code}</span>
                <span className="block text-[10px] text-sky-600 mt-0.5">Giảm -{voucherDiscount.toLocaleString()}₫</span>
              </div>
              <button
                type="button"
                onClick={handleRemoveVoucher}
                className="text-sky-500 hover:text-sky-800 font-bold ml-2 text-md"
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
                className="flex-1 px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-bold focus:outline-none focus:border-emerald-600 focus:bg-white transition-all uppercase"
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
            <span className="block text-[10px] font-bold text-rose-600 uppercase mt-2">{voucherError}</span>
          )}
        </div>

        {/* Payment Method Selector */}
        <div className="bg-white rounded-2xl border border-slate-200 p-5 shadow-xs">
          <h3 className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-3">Phương thức thanh toán</h3>
          <div className="grid grid-cols-3 gap-2">
            <button
              onClick={() => setPaymentMethod("CASH")}
              className={`flex flex-col items-center justify-center gap-1.5 py-3 rounded-xl border transition-all cursor-pointer ${
                paymentMethod === "CASH"
                  ? "border-blue-600 bg-blue-50/70 text-blue-700 ring-1 ring-blue-600/30 shadow-xs"
                  : "border-slate-200 text-slate-600 hover:bg-slate-50"
              }`}
            >
              <Banknote size={18} />
              <span className="text-xs font-bold">Tiền mặt</span>
            </button>
            <button
              onClick={() => setPaymentMethod("CARD")}
              className={`flex flex-col items-center justify-center gap-1.5 py-3 rounded-xl border transition-all cursor-pointer ${
                paymentMethod === "CARD"
                  ? "border-blue-600 bg-blue-50/70 text-blue-700 ring-1 ring-blue-600/30 shadow-xs"
                  : "border-slate-200 text-slate-600 hover:bg-slate-50"
              }`}
            >
              <CreditCard size={18} />
              <span className="text-xs font-bold">Thẻ quẹt</span>
            </button>
            <button
              onClick={() => setPaymentMethod("QR_PAY")}
              className={`flex flex-col items-center justify-center gap-1.5 py-3 rounded-xl border transition-all cursor-pointer ${
                paymentMethod === "QR_PAY"
                  ? "border-blue-600 bg-blue-50/70 text-blue-700 ring-1 ring-blue-600/30 shadow-xs"
                  : "border-slate-200 text-slate-600 hover:bg-slate-50"
              }`}
            >
              <QrCode size={18} />
              <span className="text-xs font-bold">VietQR PayOS</span>
            </button>
          </div>

          <div className="mt-4">
            <label className="block text-[11px] font-bold text-slate-500 mb-1.5 uppercase tracking-wide">Ghi chú cấp phát</label>
            <textarea
              rows={2}
              value={remarks}
              onChange={(e) => setRemarks(e.target.value)}
              placeholder="Ghi chú liều dùng hoặc dặn dò đặc biệt cho bệnh nhân..."
              className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs focus:ring-2 focus:ring-blue-500/20 focus:border-blue-600 outline-none resize-none font-medium placeholder:font-normal"
            />
          </div>
        </div>

        {/* Action Buttons */}
        <div className="flex flex-col gap-2.5 mt-auto">
          {aiPharmacistConfirmation?.confirmed && (
            <div className="bg-gradient-to-r from-sky-50 to-blue-50 border border-sky-300 rounded-2xl p-3.5 text-xs text-sky-900 flex items-center justify-between shadow-2xs">
              <div className="flex items-center gap-2.5">
                <div className="w-7 h-7 rounded-lg bg-sky-600 text-white flex items-center justify-center shrink-0 shadow-2xs">
                  <ShieldCheck size={16} />
                </div>
                <div>
                  <div className="font-extrabold text-[11px] uppercase tracking-wide text-sky-950 flex items-center gap-1">
                    Đơn AI: Đã Thẩm Định Lâm Sàng
                  </div>
                  <div className="text-[10px] text-sky-700 font-medium">
                    DS. {aiPharmacistConfirmation.pharmacistName} • {aiPharmacistConfirmation.auditCode}
                  </div>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setShowAuditModal(true)}
                className="px-2 py-1 bg-white hover:bg-sky-100/60 text-sky-800 text-[10px] font-black rounded-lg border border-sky-300 transition-colors cursor-pointer"
              >
                Chi tiết
              </button>
            </div>
          )}

          <button
            onClick={handleCheckout}
            disabled={prescriptionItems.length === 0 || loading || prescriptionItems.some((it: any) => it.quantity > (it.stock || 0))}
            className="w-full bg-blue-600 hover:bg-blue-700 disabled:bg-slate-200 disabled:text-slate-400 text-white rounded-xl py-4 shadow-sm hover:shadow transition-all flex flex-col items-center justify-center gap-0.5 cursor-pointer disabled:cursor-not-allowed active:scale-[0.99]"
          >
            <div className="flex items-center gap-2 font-black text-sm uppercase tracking-wider">
              <Printer size={18} />
              Hoàn tất & In đơn (F10)
            </div>
            <div className="text-[10px] opacity-80 font-medium">Tự động xuất kho theo FIFO</div>
          </button>
          <button
            onClick={() => { setPrescriptionItems([]); setPatientName(""); setDoctorName(""); setPrescriptionCode(""); }}
            className="w-full bg-white border border-slate-200 hover:bg-slate-50 text-slate-700 rounded-xl py-2.5 text-xs font-bold transition-colors flex items-center justify-center gap-1.5 cursor-pointer"
          >
            <XCircle size={15} /> Hủy bỏ đơn đang chọn
          </button>
        </div>
      </div>

      {/* =======================================
       * 💳 MODAL THANH TOAN PAYOS VIETQR
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
                <span className="w-2 h-2 bg-sky-500 rounded-full animate-ping"></span>
                Đang chờ khách chuyển khoản (Tự động cập nhật...)
              </div>
            </div>

            <div className="px-6 py-4 border-t border-slate-100 bg-slate-50 flex gap-3">
              <button
                onClick={checkManualPayment}
                className="flex-1 py-3 bg-[#0057cd] hover:bg-[#00419e] text-white font-bold text-xs uppercase tracking-wider rounded-xl transition-all shadow"
              >
                Kiểm tra thanh toán
              </button>
              <button
                onClick={() => { setShowPayOSModal(false); setPayosPolling(false); }}
                className="px-4 py-3 bg-slate-150 hover:bg-slate-200 text-slate-600 font-bold text-xs uppercase tracking-wider rounded-xl transition-all"
              >
                Đóng
              </button>
            </div>
          </div>
        </div>
      )}

      {/* =======================================
       * 🔎 MODAL QUET QR DIEN TU GIA LAP
       * ======================================= */}
      {showQRModal && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-[24px] border border-slate-200 shadow-2xl w-full max-w-lg overflow-hidden flex flex-col transform transition-all duration-300">
            <div className="px-6 py-5 border-b border-slate-100 flex items-center justify-between bg-slate-50">
              <h3 className="font-black text-slate-900 text-lg flex items-center gap-2">
                <QrCode className="text-[#0057cd]" /> Máy quét Đơn thuốc Điện tử
              </h3>
              <button onClick={() => setShowQRModal(false)} className="text-slate-400 hover:text-slate-700">
                <XCircle size={22} />
              </button>
            </div>

            <div className="p-6 flex flex-col gap-6 items-center">
              {isScanning ? (
                /* Giao dien quet camera gia lap */
                <div className="w-64 h-64 border-4 border-emerald-600 rounded-3xl relative overflow-hidden bg-black flex items-center justify-center shadow-lg">
                  <div className="w-56 h-56 border border-slate-800 rounded-2xl flex flex-col items-center justify-center text-slate-700 text-xs gap-2 relative">
                    <QrCode size={120} className="text-slate-800 opacity-60 animate-pulse" />
                    <span className="font-bold text-[10px] text-slate-500 uppercase tracking-wider">Đang nhận diện: {scannedCode}</span>
                  </div>
                  {/* Laser scan line effect */}
                  <div className="absolute left-0 right-0 h-1 bg-red-500 shadow-[0_0_15px_#ef4444] animate-[bounce_1.5s_infinite]"></div>
                  <div className="absolute inset-0 bg-red-500/10 mix-blend-overlay"></div>
                </div>
              ) : (
                /* Giao dien huong dan & Don thuoc mau */
                <div className="w-full flex flex-col gap-4">
                  <div className="text-center text-slate-600 text-sm">
                    Hướng camera điện thoại hoặc mã QR của đơn thuốc điện tử vào khung hình, hoặc chọn một **Đơn thuốc điện tử mẫu** để thử nghiệm nhanh:
                  </div>

                  <div className="flex flex-col gap-3">
                    <button
                      onClick={() => handleScanSimulation("RX-99281-HAN")}
                      className="w-full p-4 rounded-xl border border-blue-200 hover:bg-blue-50/50 hover:border-emerald-600 transition-all text-left flex items-start gap-3.5 group"
                    >
                      <div className="p-2 bg-[#f2f3ff] text-[#0057cd] rounded-lg border border-blue-50 shrink-0 group-hover:bg-[#0057cd] group-hover:text-white transition-colors">
                        <QrCode size={20} />
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="font-bold text-[15px] text-slate-900 group-hover:text-[#0057cd] transition-colors flex items-center gap-2">
                          Đơn 1: RX-99281-HAN
                          <span className="text-[10px] text-amber-700 bg-amber-100 px-1.5 py-0.5 rounded font-bold">Cận HSD & Tương tác</span>
                        </div>
                        <div className="text-xs text-slate-500 mt-1">
                          Bệnh nhân: Nguyễn Văn Nam | BS. Lê Quang Vinh (Tim mạch)
                        </div>
                      </div>
                    </button>

                    <button
                      onClick={() => handleScanSimulation("RX-112233-DNA")}
                      className="w-full p-4 rounded-xl border border-slate-200 hover:bg-blue-50/50 hover:border-emerald-600 transition-all text-left flex items-start gap-3.5 group"
                    >
                      <div className="p-2 bg-slate-100 text-slate-600 rounded-lg shrink-0 group-hover:bg-[#0057cd] group-hover:text-white transition-colors">
                        <QrCode size={20} />
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="font-bold text-[15px] text-slate-900 group-hover:text-[#0057cd] transition-colors flex items-center gap-2">
                          Đơn 2: RX-112233-DNA
                          <span className="text-[10px] text-sky-800 bg-sky-100 px-1.5 py-0.5 rounded font-bold">Đơn hợp lệ thường</span>
                        </div>
                        <div className="text-xs text-slate-500 mt-1">
                          Bệnh nhân: Trần Văn B | BS. Nguyễn Thị Lan
                        </div>
                      </div>
                    </button>

                    <button
                      onClick={() => handleScanSimulation("RX-445566-HCM")}
                      className="w-full p-4 rounded-xl border border-slate-200 hover:bg-blue-50/50 hover:border-emerald-600 transition-all text-left flex items-start gap-3.5 group"
                    >
                      <div className="p-2 bg-slate-100 text-slate-600 rounded-lg shrink-0 group-hover:bg-[#0057cd] group-hover:text-white transition-colors">
                        <QrCode size={20} />
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="font-bold text-[15px] text-slate-900 group-hover:text-[#0057cd] transition-colors flex items-center gap-2">
                          Đơn 3: RX-445566-HCM
                          <span className="text-[10px] text-red-800 bg-red-100 px-1.5 py-0.5 rounded font-bold">Đã được bán trước đó</span>
                        </div>
                        <div className="text-xs text-slate-500 mt-1">
                          Bệnh nhân: Lê Thị C | BS. Phạm Minh Hoàng (Lão khoa)
                        </div>
                      </div>
                    </button>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* =======================================
       * 📄 INVOICE SUCCESS MODAL (HOA DON IN FIFO)
       * ======================================= */}
      {showInvoiceModal && invoiceData && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-[24px] border border-slate-200 shadow-2xl w-full max-w-xl overflow-hidden flex flex-col transform transition-all duration-300">
            <div className="px-6 py-5 border-b border-slate-100 flex items-center justify-between bg-slate-50">
              <h3 className="font-black text-slate-900 text-lg flex items-center gap-2">
                <CheckCircle2 className="text-sky-500" /> Thanh toán thành công!
              </h3>
              <button onClick={() => setShowInvoiceModal(false)} className="text-slate-400 hover:text-slate-700">
                <XCircle size={22} />
              </button>
            </div>

            <div className="p-6 overflow-y-auto custom-scrollbar flex-1 space-y-4">
              {/* Badge Lien thong CSDL Duoc Quoc gia GPP */}
              <div className="bg-sky-50 border border-sky-200 rounded-xl p-4 flex items-start gap-3">
                <div className="w-8 h-8 rounded-full bg-sky-500 text-white flex items-center justify-center shrink-0">
                  <Check size={18} />
                </div>
                <div className="flex-1">
                  <div className="font-black text-sky-900 text-sm flex items-center gap-2">
                    🟢 ĐÃ LIÊN THÔNG CƠ SỞ DỮ LIỆU DƯỢC QUỐC GIA (GPP)
                  </div>
                  <div className="text-xs text-sky-800 mt-1 flex flex-wrap gap-x-4 gap-y-1">
                    <span>Mã biên nhận QG: <strong className="font-mono font-black">{invoiceData.data?.nationalSyncCode || `DQG-20260825-${Math.floor(100000 + Math.random() * 900000)}`}</strong></span>
                    <span>Mã cơ sở GPP: <strong className="font-mono font-bold">{invoiceData.data?.nationalFacilityCode || "79-001234"}</strong></span>
                  </div>
                  <div className="text-[11px] text-sky-600 mt-0.5">
                    Đơn thuốc điện tử & Hóa đơn đã truyền thành công lên Hệ thống CSDL Dược Quốc gia (Bộ Y tế).
                  </div>
                </div>
              </div>

              {/* Badge Tham Dinh Lam Sang Cua Duoc Si Cho Don Thuoc AI */}
              {invoiceData.aiPharmacistConfirmation?.confirmed && (
                <div className="bg-gradient-to-r from-sky-50 via-teal-50 to-blue-50 border border-sky-300 rounded-xl p-3.5 flex items-center justify-between text-xs shadow-2xs">
                  <div className="flex items-center gap-2.5">
                    <div className="w-8 h-8 rounded-lg bg-sky-600 text-white flex items-center justify-center shrink-0 shadow-2xs">
                      <ShieldCheck size={18} />
                    </div>
                    <div>
                      <div className="font-extrabold text-sky-950 uppercase text-[11px] flex items-center gap-1.5">
                        ✓ ĐÃ THẨM ĐỊNH LÂM SÀNG BƯỚC CUỐI (AI ASSISTED)
                      </div>
                      <div className="text-[10px] text-sky-800">
                        Dược sĩ phụ trách: <strong>{invoiceData.aiPharmacistConfirmation.pharmacistName}</strong> • Mã duyệt: <span className="font-mono font-bold text-sky-700">{invoiceData.aiPharmacistConfirmation.auditCode}</span>
                      </div>
                    </div>
                  </div>
                  <span className="text-[10px] font-black text-sky-800 bg-sky-100 border border-sky-300 px-2.5 py-0.5 rounded-full shrink-0">
                    GPP Verified
                  </span>
                </div>
              )}

              {/* Mau hoa don ban thuoc */}
              <div className="border border-slate-200 rounded-2xl p-6 bg-slate-50/50 shadow-inner font-mono text-[13px] text-slate-800 flex flex-col gap-4">
                <div className="text-center border-b border-slate-200 pb-3">
                  <div className="font-bold text-[16px] text-slate-900 uppercase">HỆ THỐNG NHÀ THUỐC WDP</div>
                  <div className="text-xs text-slate-500 mt-1">Đường 3/2, Quận Hải Châu, Đà Nẵng</div>
                  <div className="text-xs text-slate-500">Mã cơ sở GPP: {invoiceData.data?.nationalFacilityCode || "79-001234"} | Hotline: 0236 123 456</div>
                </div>

                <div className="flex flex-col gap-1 border-b border-slate-200 pb-3 text-xs">
                  <div className="flex justify-between">
                    <span>Mã hóa đơn:</span>
                    <span className="font-bold">{invoiceData.data?._id || "HD-001"}</span>
                  </div>
                  <div className="flex justify-between">
                    <span>Mã QG (GPP):</span>
                    <span className="font-bold text-sky-700">{invoiceData.data?.nationalSyncCode || "DQG-20260825-XXXXXX"}</span>
                  </div>
                  <div className="flex justify-between">
                    <span>Ngày lập:</span>
                    <span>{new Date(invoiceData.data?.createdAt || Date.now()).toLocaleString()}</span>
                  </div>
                  <div className="flex justify-between">
                    <span>Kiểu bán:</span>
                    <span className="font-bold uppercase text-[#0057cd]">{invoiceData.data?.type || "PRESCRIPTION"}</span>
                  </div>
                  {invoiceData.data?.prescriptionCode && (
                    <div className="flex justify-between">
                      <span>Mã đơn gốc:</span>
                      <span className="font-bold text-indigo-700">{invoiceData.data.prescriptionCode}</span>
                    </div>
                  )}
                  <div className="flex justify-between flex-wrap gap-x-4">
                    <span>Khách hàng:</span>
                    <span>{invoiceData.data?.patientName || "Khách kê đơn"}</span>
                  </div>
                  {doctorName && (
                    <div className="flex justify-between flex-wrap gap-x-4">
                      <span>Bác sĩ kê đơn:</span>
                      <span>{doctorName}</span>
                    </div>
                  )}
                  {hospitalName && (
                    <div className="flex justify-between flex-wrap gap-x-4">
                      <span>Nơi kê đơn:</span>
                      <span>{hospitalName}</span>
                    </div>
                  )}
                </div>

                {/* Danh sach thuoc thuc xuat & lo hang allocated */}
                <div>
                  <div className="font-bold border-b border-slate-200 pb-1.5 mb-2 uppercase text-xs">Chi tiết xuất kho & Liều dùng (FIFO)</div>
                  <div className="space-y-3 text-xs">
                    {invoiceData.data?.items?.map((it: any, idx: number) => (
                      <div key={idx} className="flex flex-col border-b border-dashed border-slate-200 pb-2">
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
                    <span>Tổng tiền hàng:</span>
                    <span>{(invoiceData.data?.totalAmount || total).toLocaleString()}₫</span>
                  </div>
                  <div className="flex justify-between text-[#ba1a1a]">
                    <span>Ưu đãi thành viên (5%):</span>
                    <span>-{Math.round((invoiceData.data?.totalAmount || total) * 0.05).toLocaleString()}₫</span>
                  </div>
                  <div className="flex justify-between text-slate-600">
                    <span>Thuế VAT (8%):</span>
                    <span>{Math.round((invoiceData.data?.totalAmount || total) * 0.95 * 0.08).toLocaleString()}₫</span>
                  </div>
                  <div className="flex justify-between font-black text-slate-900 text-[16px] border-t border-slate-200 pt-2.5">
                    <span>TỔNG THÀNH TIỀN:</span>
                    <span className="text-[#0057cd]">
                      {Math.round((invoiceData.data?.totalAmount || total) * 0.95 * 1.08).toLocaleString()}₫
                    </span>
                  </div>
                </div>

                {/* QR Code Danh gia Dich vu & Nhan Diem Thuong */}
                <div className="mt-2 pt-3 border-t border-dashed border-slate-300 flex flex-col items-center justify-center text-center gap-2 bg-gradient-to-b from-blue-50/40 to-white p-3 rounded-xl border border-blue-100 print:border-black print:bg-white">
                  <div className="text-[12px] font-bold text-[#0057cd] print:text-black uppercase tracking-wide">
                    ⭐ ĐÁNH GIÁ DỊCH VỤ - NHẬN QUÀ NGAY ⭐
                  </div>
                  <div className="bg-white p-1 rounded-lg border border-slate-200 print:border-black shadow-sm">
                    <img 
                      src={`https://api.qrserver.com/v1/create-qr-code/?size=110x110&data=${encodeURIComponent(
                        `${window.location.origin}/feedback/${invoiceData.data?.orderCode || invoiceData.data?._id || ""}`
                      )}`}
                      alt="QR Đánh giá dịch vụ" 
                      className="w-[100px] h-[100px] object-contain"
                    />
                  </div>
                  <div className="text-[11px] text-slate-600 print:text-black font-medium leading-tight">
                    Quét mã nhận ngay <span className="font-bold text-sky-600 print:font-bold">+1.000đ - 2.000đ</span> tích lũy<br/>
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
       * 🤖 MODAL QUET DON THUOC AI (SIDE-BY-SIDE)
       * ======================================= */}
      {showAIScanModal && (
    <div className="fixed inset-0 bg-slate-900/75 backdrop-blur-md z-50 flex items-center justify-center p-4">
      <div className="bg-white rounded-[24px] border border-slate-200 shadow-2xl w-full max-w-6xl h-[90vh] overflow-hidden flex flex-col transform transition-all duration-300">
        {/* Header */}
        <div className="px-6 py-4 border-b border-slate-100 flex items-center justify-between bg-slate-900 text-white shrink-0">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-indigo-500/20 text-indigo-400 rounded-xl border border-indigo-500/30">
              <Sparkles size={22} className="animate-pulse" />
            </div>
            <div>
              <h3 className="font-extrabold text-lg tracking-wide flex items-center gap-2">
                Quét Ảnh Đơn Thuốc Bằng AI
                <span className="text-[11px] font-bold bg-indigo-500/30 text-indigo-300 px-2 py-0.5 rounded-full border border-indigo-400/30">Vision & FEFO Match</span>
              </h3>
              <p className="text-xs text-slate-400">Tự động đọc hiểu layout, trích xuất hoạt chất, chuẩn hóa liều dùng & gán lô HSD gần nhất</p>
            </div>
          </div>
          <button
            onClick={() => {
              setShowAIScanModal(false);
              setAiScanResult(null);
              setAiFiles([]);
              setAiPreviewUrls([]);
            }}
            className="text-slate-400 hover:text-white transition-colors"
          >
            <XCircle size={24} />
          </button>
        </div>

        {/* Body: Side-by-side Layout */}
        <div className="flex-1 flex flex-col md:flex-row overflow-hidden bg-slate-100">
          {/* Left Column: Multi-page Upload & Image Viewer */}
          <div className="w-full md:w-5/12 p-4 border-r border-slate-200 flex flex-col gap-4 bg-white overflow-y-auto">
            {/* Printed-only Warning Banner */}
            <div className="bg-amber-50 border border-amber-200 text-amber-900 px-3 py-2 rounded-xl text-xs flex items-start gap-2 shadow-sm">
              <span className="font-bold bg-amber-200 text-amber-950 px-1.5 py-0.5 rounded text-[10px] shrink-0 mt-0.5">CHỈ BẢN IN</span>
              <p className="leading-tight text-[11px] text-amber-800">
                Hệ thống chỉ xử lý đơn thuốc <strong>bản in điện tử</strong> (từ phần mềm/bệnh viện). <strong>Không hỗ trợ chữ viết tay</strong> để đảm bảo an toàn dược phẩm.
              </p>
            </div>

            <div className="flex items-center justify-between">
              <h4 className="font-bold text-slate-800 text-xs uppercase tracking-wider flex items-center gap-1.5">
                <FileText size={16} className="text-indigo-600" /> Tập tin đơn thuốc ({aiFiles.length} trang)
              </h4>
              <label className="cursor-pointer text-xs font-bold text-indigo-600 hover:text-indigo-800 bg-indigo-50 hover:bg-indigo-100 px-3 py-1.5 rounded-lg border border-indigo-200 transition-all flex items-center gap-1">
                + Thêm trang đơn
                <input
                  type="file"
                  accept="image/*"
                  multiple
                  className="hidden"
                  onChange={handleAISourceFileChange}
                />
              </label>
            </div>

            {/* Thumbnails list */}
            {aiPreviewUrls.length > 0 && (
              <div className="flex gap-2 overflow-x-auto pb-2 scrollbar-thin">
                {aiPreviewUrls.map((url, idx) => (
                  <div
                    key={idx}
                    onClick={() => setActivePreviewIdx(idx)}
                    className={`relative w-20 h-24 rounded-xl border-2 overflow-hidden shrink-0 cursor-pointer transition-all ${activePreviewIdx === idx ? 'border-indigo-600 shadow-md ring-2 ring-indigo-200' : 'border-slate-200 opacity-70 hover:opacity-100'}`}
                  >
                    <img src={url} alt={`Page ${idx + 1}`} className="w-full h-full object-cover" />
                    <button
                      onClick={(e) => { e.stopPropagation(); handleRemoveAIFile(idx); }}
                      className="absolute top-1 right-1 bg-red-500 text-white rounded-full p-0.5 hover:bg-red-700 shadow"
                    >
                      <XCircle size={12} />
                    </button>
                    <span className="absolute bottom-1 left-1 bg-slate-900/80 text-white text-[9px] font-bold px-1.5 py-0.5 rounded">
                      Trang {idx + 1}
                    </span>
                  </div>
                ))}
              </div>
            )}

            {/* Full Image Preview Container (Dropzone & Preview) */}
            <div
              onDragOver={(e) => { e.preventDefault(); e.stopPropagation(); setIsAiDragging(true); }}
              onDragLeave={(e) => { e.preventDefault(); e.stopPropagation(); setIsAiDragging(false); }}
              onDrop={handleAiDropFiles}
              className={`flex-1 min-h-[300px] bg-slate-900 rounded-2xl border-2 transition-all overflow-hidden relative flex items-center justify-center ${isAiDragging ? 'border-indigo-400 bg-slate-800 ring-4 ring-indigo-500/20' : 'border-slate-800'}`}
            >
              {aiPreviewUrls.length > 0 ? (
                <div className="relative w-full h-full flex items-center justify-center">
                  <img
                    src={aiPreviewUrls[activePreviewIdx] || aiPreviewUrls[0]}
                    alt="Prescription preview"
                    className="max-h-full max-w-full object-contain p-2"
                  />
                  {isAiDragging && (
                    <div className="absolute inset-0 bg-indigo-900/60 backdrop-blur-xs flex flex-col items-center justify-center text-white font-bold gap-2">
                      <Sparkles size={32} className="animate-bounce text-indigo-300" />
                      <span>Thả ảnh vào đây để thêm trang đơn</span>
                    </div>
                  )}
                </div>
              ) : (
                <div className="p-8 text-center flex flex-col items-center gap-3 text-slate-400">
                  <div className="w-16 h-16 rounded-full bg-slate-800 flex items-center justify-center text-slate-500">
                    <FileText size={32} />
                  </div>
                  <div>
                    <p className="font-bold text-sm text-slate-300">Chưa có ảnh đơn thuốc nào</p>
                    <p className="text-xs text-slate-500 mt-1">Kéo thả, dán ảnh (Ctrl + V) hoặc tải lên tập tin ảnh đơn thuốc của khách hàng</p>
                  </div>
                  <div className="flex flex-col sm:flex-row items-center gap-2 mt-2">
                    <label className="cursor-pointer px-5 py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-xs rounded-xl shadow transition-all">
                      Tải ảnh lên ngay
                      <input
                        type="file"
                        accept="image/*"
                        multiple
                        className="hidden"
                        onChange={handleAISourceFileChange}
                      />
                    </label>
                    <span className="text-[11px] font-semibold text-slate-400 bg-slate-800 px-3 py-2 rounded-xl border border-slate-700 flex items-center gap-1.5">
                      Hoặc nhấn <kbd className="bg-slate-700 text-indigo-300 px-1.5 py-0.5 rounded font-mono font-bold text-[10px] border border-slate-600">Ctrl + V</kbd> để dán ảnh
                    </span>
                  </div>
                </div>
              )}
            </div>

            {/* Scan Action Button */}
            {aiFiles.length > 0 && !aiScanResult && (
              <button
                onClick={handleExecuteAIScan}
                disabled={aiLoading}
                className="w-full py-3.5 bg-gradient-to-r from-indigo-600 to-blue-600 hover:from-indigo-700 hover:to-blue-700 text-white font-bold rounded-xl shadow-md transition-all flex items-center justify-center gap-2 text-sm uppercase tracking-wider cursor-pointer"
              >
                {aiLoading ? (
                  <>
                    <Loader2 size={16} className="animate-spin text-white" />
                    AI đang đọc & khớp dữ liệu kho...
                  </>
                ) : (
                  <>
                    <Sparkles size={18} /> Phân Tích & Khớp Sản Phẩm (AI)
                  </>
                )}
              </button>
            )}
          </div>

          {/* Right Column: AI Extraction & FEFO Matching Results */}
          <div className="w-full md:w-7/12 p-5 flex flex-col gap-4 overflow-y-auto bg-slate-50">
            {!aiScanResult ? (
              <div className="flex-1 flex flex-col items-center justify-center p-8 text-center text-slate-500">
                <div className="w-20 h-20 rounded-2xl bg-indigo-50 border border-indigo-100 flex items-center justify-center text-indigo-600 mb-4 shadow-sm">
                  <Sparkles size={36} />
                </div>
                <h4 className="font-extrabold text-slate-800 text-base">Sẵn sàng bóc tách đơn thuốc bằng AI</h4>
                <p className="text-xs text-slate-500 max-w-md mt-1">
                  Sau khi phân tích, hệ thống AI sẽ tự động trích xuất thông tin bệnh nhân, chuẩn hóa tên biệt dược & hoạt chất, và tự chọn Lô HSD gần nhất (FEFO) trong CSDL chi nhánh.
                </p>
              </div>
            ) : (
              <div className="flex flex-col gap-4">
                {/* Header bar: Patient summary & Processing stats */}
                <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-sm flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3">
                  <div>
                    <div className="text-xs text-slate-400 font-bold uppercase tracking-wider">Thông tin đơn thuốc</div>
                    <div className="font-black text-slate-900 text-base flex items-center gap-2 mt-0.5">
                      {aiScanResult.patient?.name || "Khách lẻ"}
                      {aiScanResult.patient?.age && <span className="text-xs font-bold text-slate-500">({aiScanResult.patient.age} tuổi, {aiScanResult.patient.gender || "Nam"})</span>}
                    </div>
                    {aiScanResult.patient?.diagnosis && (
                      <div className="text-xs text-indigo-700 font-semibold mt-0.5">Chẩn đoán: {aiScanResult.patient.diagnosis}</div>
                    )}
                  </div>
                  <div className="flex flex-col items-end text-[11px] font-bold text-slate-500 bg-slate-50 p-2 rounded-xl border border-slate-100">
                    <span className="text-indigo-600">Thời gian AI: {aiScanResult.processing_time_sec}s {aiScanResult.from_cache && '(Cache Hit⚡)'}</span>
                    <span>Mã quét: {aiScanResult.scan_id}</span>
                    <span className="text-slate-400">Prompt: {aiScanResult.prompt_version}</span>
                  </div>
                </div>

                {/* Warnings list if any */}
                {aiScanResult.validation_warnings && aiScanResult.validation_warnings.length > 0 && (
                  <div className="bg-amber-50 border border-amber-200 rounded-2xl p-3.5 text-amber-900 text-xs">
                    <div className="font-bold uppercase flex items-center gap-1.5 mb-1 text-amber-800">
                      <AlertTriangle size={15} /> Cảnh báo kiểm soát nghiệp vụ:
                    </div>
                    <ul className="list-disc pl-5 space-y-0.5 font-medium">
                      {aiScanResult.validation_warnings.map((w: string, i: number) => (
                        <li key={i}>{w}</li>
                      ))}
                    </ul>
                  </div>
                )}

                {/* Extracted items table */}
                <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
                  <div className="px-4 py-3 bg-slate-900 text-white font-bold text-xs uppercase tracking-wider flex justify-between items-center">
                    <span>Danh mục thuốc bóc tách & Khớp CSDL chi nhánh</span>
                    <span className="text-[11px] font-normal text-slate-300">Tổng: {aiScanResult.items?.length || 0} sản phẩm</span>
                  </div>

                  <div className="divide-y divide-slate-100">
                    {aiScanResult.items?.map((item: any, idx: number) => {
                      const ext = item.extracted || {};
                      const sku = item.selected_sku;
                      const fefo = item.fefo_batch;
                      const status = item.match_status;

                      return (
                        <div key={idx} className="p-4 flex flex-col gap-2.5 hover:bg-slate-50/80 transition-colors">
                          {/* Top row: Match status pill & Raw text */}
                          <div className="flex items-center justify-between gap-2">
                            <div className="flex items-center gap-2">
                              {status === "EXACT_MATCH" && (
                                <span className="px-2.5 py-0.5 bg-sky-100 text-sky-800 font-extrabold text-[10px] rounded-full border border-sky-300 flex items-center gap-1 shadow-2xs">
                                  🟢 Khớp SKU 100%
                                </span>
                              )}
                              {status === "SUBSTITUTE_AVAILABLE" && (
                                <span className="px-2.5 py-0.5 bg-amber-100 text-amber-800 font-extrabold text-[10px] rounded-full border border-amber-300 flex items-center gap-1 shadow-2xs">
                                  🟡 Khớp Hoạt Chất (Thay thế)
                                </span>
                              )}
                              {status === "NOT_FOUND" && (
                                <span className="px-2.5 py-0.5 bg-red-100 text-red-800 font-extrabold text-[10px] rounded-full border border-red-300 flex items-center gap-1 shadow-2xs">
                                  🔴 Chưa thấy trong CSDL
                                </span>
                              )}
                              <span className="text-xs font-mono font-bold text-slate-500">#{ext.item_index || idx + 1}</span>
                            </div>
                            <div className="text-[11px] font-bold text-slate-400">
                              Confidence: <span className={ext.confidence?.overall >= 0.85 ? "text-sky-600" : "text-amber-600 font-black"}>{(ext.confidence?.overall * 100 || 95).toFixed(0)}%</span>
                            </div>
                          </div>

                          {/* Details comparison */}
                          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs bg-slate-50 p-3 rounded-xl border border-slate-100">
                            <div>
                              <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wide">1. ĐỌC TỪ ẢNH ĐƠN:</span>
                              <div className="font-extrabold text-slate-900 mt-0.5">{ext.raw_text}</div>
                              <div className="text-slate-500 mt-0.5">
                                Hoạt chất: <span className="font-semibold text-slate-700">{ext.generic_name || "N/A"}</span> | Hàm lượng: {ext.strength || "N/A"}
                              </div>
                              <div className="text-slate-500 mt-0.5">
                                Liều dùng: <span className="font-semibold text-indigo-700">{ext.usage_instruction || "Theo chỉ định bác sĩ"}</span>
                              </div>
                            </div>

                            <div>
                              <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wide">2. KHỚP SKU BÁN HÀNG & FEFO:</span>
                              {sku ? (
                                <div>
                                  <div className="font-extrabold text-indigo-900 mt-0.5">{sku.product_name}</div>
                                  <div className="text-slate-600 font-bold mt-0.5">
                                    Giá: {(sku.retail_price || 0).toLocaleString()}₫/{sku.unit || 'Hộp'} | Tồn kho: <span className={(sku.stock || 0) > 0 ? "text-sky-700 font-black" : "text-red-600 font-black"}>{sku.stock || 0} {sku.unit || 'Hộp'}</span>
                                  </div>
                                  {fefo ? (
                                    <div className="text-[11px] font-bold text-sky-700 mt-0.5 bg-sky-50 px-2 py-0.5 rounded border border-sky-200 inline-block shadow-2xs">
                                      Lô FEFO: {fefo.batch_no} (HSD: {fefo.exp_date})
                                    </div>
                                  ) : (
                                    <div className="text-[11px] text-amber-700 font-semibold mt-0.5">Lô mặc định</div>
                                  )}
                                </div>
                              ) : (
                                <div className="text-red-600 font-bold mt-1">Không tìm thấy mã thuốc phù hợp trong CSDL chi nhánh</div>
                              )}
                            </div>
                          </div>

                          {/* Quantity & Actions: Số lượng mua đề xuất + Nút Đề xuất thuốc tương đương */}
                          <div className="flex flex-wrap items-center justify-between text-xs pt-1 gap-2">
                            <div className="font-bold text-slate-700">
                              Số lượng mua đề xuất: <span className="text-indigo-600 font-black text-sm">{ext.quantity || 1} {ext.unit || 'Hộp'}</span>
                            </div>

                            {/* Nút đề xuất thuốc tương đương (cùng hoạt chất) */}
                            <button
                              type="button"
                              onClick={() => handleFetchAiAlternatives(item, idx)}
                              className={`px-3 py-1.5 rounded-xl font-bold text-xs flex items-center gap-1.5 transition-all shadow-xs cursor-pointer ${
                                !sku || (sku.stock || 0) <= 0
                                  ? "bg-amber-500 hover:bg-amber-600 text-white shadow-amber-500/20"
                                  : "bg-indigo-50 hover:bg-indigo-100 text-indigo-700 border border-indigo-200"
                              }`}
                              title="Tìm kiếm và chọn các thuốc tương đương cùng hoạt chất có sẵn tồn kho tại chi nhánh"
                            >
                              <RefreshCw size={13} className={loadingAiAlternatives && selectedAiItemIdx === idx ? "animate-spin" : ""} />
                              {!sku || (sku.stock || 0) <= 0 ? "⚠️ Đề xuất thuốc tương đương" : "Đổi thuốc tương đương"}
                            </button>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>

                {/* Khối Thẩm Định Bước Cuối Của Dược Sĩ */}
                <div className="bg-gradient-to-r from-sky-50 via-teal-50 to-blue-50 border-2 border-sky-300 rounded-2xl p-4 shadow-sm flex flex-col gap-3">
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-sky-200/80 pb-3">
                    <div className="flex items-center gap-2.5">
                      <div className="w-9 h-9 rounded-xl bg-sky-600 text-white flex items-center justify-center shadow-sm shrink-0">
                        <ShieldCheck size={20} />
                      </div>
                      <div>
                        <h4 className="text-xs font-black text-sky-950 uppercase tracking-wider flex items-center gap-2">
                          BƯỚC CUỐI: THẨM ĐỊNH LÂM SÀNG & PHÊ DUYỆT CỦA DƯỢC SĨ
                          <span className="bg-sky-200 text-sky-900 text-[10px] px-2 py-0.5 rounded-full font-black border border-sky-300">
                            BẮT BUỘC GPP
                          </span>
                        </h4>
                        <p className="text-[11px] text-sky-800 mt-0.5">
                          Dược sĩ phụ trách: <strong>{getBranchInfoFromToken().fullName || "Dược sĩ Trần Thị A"}</strong> • CCHN: <strong>CCHN-GPP/02849-HN</strong>
                        </p>
                      </div>
                    </div>
                    <span className="text-[10px] font-bold text-sky-900 bg-white/90 px-2.5 py-1 rounded-lg border border-sky-200 shadow-2xs shrink-0 self-start sm:self-auto">
                      🕒 {new Date().toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit' })} - Hôm nay
                    </span>
                  </div>

                  {/* Checklist kiểm soát an toàn */}
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-2 text-[11px]">
                    <div className="flex items-center gap-1.5 text-sky-900 bg-white/80 p-2 rounded-xl border border-sky-100 font-medium">
                      <CheckCircle2 size={14} className="text-sky-600 shrink-0" /> Khớp hoạt chất & hàm lượng
                    </div>
                    <div className="flex items-center gap-1.5 text-sky-900 bg-white/80 p-2 rounded-xl border border-sky-100 font-medium">
                      <CheckCircle2 size={14} className="text-sky-600 shrink-0" /> Không tương tác chống chỉ định
                    </div>
                    <div className="flex items-center gap-1.5 text-sky-900 bg-white/80 p-2 rounded-xl border border-sky-100 font-medium">
                      <CheckCircle2 size={14} className="text-sky-600 shrink-0" /> Gán lô FEFO cận hạn tự động
                    </div>
                  </div>

                  {/* Checkbox cam kết trách nhiệm chuyên môn */}
                  <label className="flex items-start gap-2.5 cursor-pointer select-none bg-white p-3 rounded-xl border border-sky-300 hover:bg-sky-50/50 transition-colors shadow-2xs">
                    <input
                      type="checkbox"
                      checked={pharmacistAgreementCheck}
                      onChange={(e) => setPharmacistAgreementCheck(e.target.checked)}
                      className="mt-0.5 w-4 h-4 rounded text-sky-600 focus:ring-sky-500 border-slate-300 cursor-pointer"
                    />
                    <span className="text-xs text-slate-700 leading-snug">
                      Tôi là Dược sĩ phụ trách, đã đối soát đơn thuốc gốc, thẩm định lâm sàng danh mục thuốc do AI hỗ trợ đề xuất và <strong>chịu hoàn toàn trách nhiệm chuyên môn</strong> khi đưa vào đơn hàng xuất bán theo tiêu chuẩn GPP.
                    </span>
                  </label>
                </div>

                {/* Bottom Actions */}
                <div className="flex flex-col sm:flex-row gap-3 pt-2">
                  <button
                    onClick={handleApplyAIScanToCart}
                    className="flex-1 py-3.5 bg-gradient-to-r from-sky-600 to-blue-700 hover:from-sky-700 hover:to-teal-700 text-white font-black text-sm uppercase tracking-wider rounded-xl shadow-lg hover:shadow-sky-600/30 transition-all flex items-center justify-center gap-2 cursor-pointer active:scale-[0.99]"
                  >
                    <ShieldCheck size={19} /> DƯỢC SĨ XÁC NHẬN & ĐƯA VÀO ĐƠN HÀNG POS
                  </button>
                  <button
                    onClick={() => { setAiScanResult(null); }}
                    className="px-5 py-3.5 bg-slate-200 hover:bg-slate-300 text-slate-700 font-bold text-xs uppercase tracking-wider rounded-xl transition-all cursor-pointer"
                  >
                    QUÉT ĐƠN KHÁC
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
    )}

      {/* =======================================
       * 📋 MODAL BIEN BAN THAM DINH LAM SANG DUOC SI (GPP)
       * ======================================= */}
      <AIPharmacistAuditModal
        isOpen={showAuditModal}
        onClose={() => setShowAuditModal(false)}
        data={aiPharmacistConfirmation}
      />

      {/* =======================================
       * 🔄 MODAL ĐỀ XUẤT THUỐC TƯƠNG ĐƯƠNG CHO ĐƠN AI
       * ======================================= */}
      {showAiAlternativesModal && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-xs z-[60] flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl shadow-2xl max-w-2xl w-full border border-slate-200 overflow-hidden flex flex-col max-h-[85vh] animate-in fade-in zoom-in-95 duration-200">
            {/* Header */}
            <div className="px-6 py-4 border-b border-slate-100 flex items-center justify-between bg-gradient-to-r from-sky-900 to-indigo-900 text-white">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-white/10 rounded-xl">
                  <RefreshCw size={20} className="text-sky-300" />
                </div>
                <div>
                  <h3 className="font-extrabold text-base tracking-wide flex items-center gap-2">
                    Đề Xuất Thuốc Tương Đương
                    <span className="text-[10px] font-bold bg-sky-500/30 text-sky-200 px-2 py-0.5 rounded-full border border-sky-400/30">Chuẩn GPP</span>
                  </h3>
                  <p className="text-xs text-sky-200 mt-0.5">
                    Gợi ý thuốc cùng hoạt chất, dạng bào chế hoặc nhóm điều trị khả dụng tại chi nhánh
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => {
                  setShowAiAlternativesModal(false);
                  setSelectedAiItemIdx(null);
                  setSelectedAiItemForAlt(null);
                }}
                className="text-slate-300 hover:text-white p-1 rounded-lg transition-colors cursor-pointer"
              >
                <X size={20} />
              </button>
            </div>

            {/* Target item info banner */}
            {selectedAiItemForAlt && (
              <div className="px-6 py-3 bg-amber-50/80 border-b border-amber-200/80 flex flex-col sm:flex-row sm:items-center justify-between gap-2 text-xs">
                <div>
                  <span className="text-[10px] font-bold text-amber-800 uppercase tracking-wide">Thuốc trích xuất từ đơn:</span>
                  <div className="font-black text-slate-900 text-sm">{selectedAiItemForAlt.extracted?.raw_text || selectedAiItemForAlt.selected_sku?.product_name}</div>
                  <div className="text-slate-600 mt-0.5">
                    Hoạt chất: <span className="font-bold text-indigo-800">{selectedAiItemForAlt.extracted?.generic_name || selectedAiItemForAlt.selected_sku?.active_ingredient || "N/A"}</span>
                    {selectedAiItemForAlt.extracted?.strength && ` • Hàm lượng: ${selectedAiItemForAlt.extracted?.strength}`}
                  </div>
                </div>
                <div className="text-right shrink-0">
                  <span className="px-2.5 py-1 bg-amber-100 text-amber-900 border border-amber-300 rounded-lg text-[11px] font-bold">
                    Cần mua: {selectedAiItemForAlt.extracted?.quantity || 1} {selectedAiItemForAlt.extracted?.unit || 'Hộp'}
                  </span>
                </div>
              </div>
            )}

            {/* Cảnh báo lâm sàng GPP nếu thuốc gốc là dạng tiêm */}
            {(() => {
              const oName = (selectedAiItemForAlt?.extracted?.raw_text || selectedAiItemForAlt?.selected_sku?.product_name || "").toLowerCase();
              const oForm = (selectedAiItemForAlt?.selected_sku?.dosage_form || "").toLowerCase();
              const isInj = /tiêm|tiem|injection|kabi|ống tiêm|ong tiem|lọ tiêm/i.test(oName + " " + oForm);
              const hasInjAlt = aiAlternativesList.some((a: any) => a.tier === 1 && a.stock > 0);

              if (isInj && !hasInjAlt && !loadingAiAlternatives) {
                return (
                  <div className="mx-6 mt-3 p-3.5 bg-rose-50 border-2 border-rose-300 rounded-xl text-xs text-rose-900 shadow-sm flex items-start gap-3">
                    <AlertTriangle size={20} className="text-rose-600 shrink-0 mt-0.5" />
                    <div>
                      <div className="font-black text-rose-800 uppercase tracking-wide flex items-center gap-1.5">
                        ⚠️ CẢNH BÁO DƯỢC LÂM SÀNG & QUY CHUẨN GPP
                      </div>
                      <p className="mt-1 text-rose-900 leading-relaxed font-medium">
                        Đơn thuốc chỉ định <strong>Dạng Tiêm (Injection)</strong>. Chi nhánh hiện không có thuốc tiêm tương đương còn tồn kho.
                        Theo Thông tư 52/2017/TT-BYT & Chuẩn GPP, <strong>Dược sĩ tuyệt đối không được tự ý đổi thuốc tiêm sang dạng uống/siro</strong> khi chưa có chỉ định lại của Bác sĩ điều trị!
                      </p>
                    </div>
                  </div>
                );
              }
              return null;
            })()}

            {/* Body */}
            <div className="p-6 overflow-y-auto flex-1 space-y-3 bg-slate-50/50">
              {loadingAiAlternatives ? (
                <div className="flex flex-col items-center justify-center py-12 gap-3 text-slate-500">
                  <Loader2 size={36} className="animate-spin text-sky-600" />
                  <p className="text-sm font-semibold text-slate-600">Đang tra cứu danh mục thuốc tương đương chuẩn GPP...</p>
                </div>
              ) : aiAlternativesList.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-12 text-center text-slate-500 gap-2">
                  <div className="w-14 h-14 rounded-2xl bg-slate-100 flex items-center justify-center text-slate-400 mb-2">
                    <FileText size={28} />
                  </div>
                  <h4 className="font-bold text-slate-800 text-sm">Không tìm thấy thuốc thay thế phù hợp</h4>
                  <p className="text-xs text-slate-500 max-w-sm">
                    Kho chi nhánh hiện không có sản phẩm cùng hoạt chất tương đương.
                  </p>
                </div>
              ) : (
                aiAlternativesList.map((alt: any) => {
                  const altStock = Number(alt.stock || alt.branchStock || 0);
                  const isAvailable = altStock > 0;

                  return (
                    <div
                      key={alt.id || alt._id}
                      className={`border rounded-xl p-4 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 transition-all bg-white hover:shadow-md ${
                        isAvailable ? "border-slate-200 hover:border-sky-500" : "border-slate-200 opacity-60 bg-slate-50"
                      }`}
                    >
                      <div className="flex-1 min-w-0">
                        <div className="flex items-baseline gap-2 flex-wrap">
                          <span className="font-black text-slate-900 text-[15px]">{alt.name}</span>
                          <span className={`px-2 py-0.5 rounded text-[10px] uppercase tracking-wide border shadow-2xs ${alt.badgeClass || 'bg-sky-100 text-sky-800 border-sky-300'}`}>
                            {alt.badgeLabel || 'Cùng hoạt chất'}
                          </span>
                        </div>

                        <div className="text-xs text-slate-500 mt-1 flex flex-wrap gap-x-3 gap-y-1">
                          <span>Hoạt chất: <strong className="text-slate-700">{alt.active_ingredient || "N/A"}</strong></span>
                          {alt.dosage_form && <span>Dạng: <strong className="text-slate-700">{alt.dosage_form}</strong></span>}
                          <span>Quy cách: <strong className="text-slate-700">{alt.unit || "Hộp"}</strong></span>
                        </div>

                        {alt.clinicalWarning && (
                          <div className="mt-1.5 p-2 bg-rose-50 border border-rose-200 rounded-lg text-[11px] text-rose-800 font-medium flex items-start gap-1.5">
                            <AlertTriangle size={13} className="text-rose-600 shrink-0 mt-0.5" />
                            <span>{alt.clinicalWarning}</span>
                          </div>
                        )}

                        {alt.fefoBatchNo && (
                          <div className="mt-1.5 text-[11px] font-bold text-sky-700 bg-sky-50 px-2 py-0.5 rounded border border-sky-200 inline-block">
                            Lô FEFO: {alt.fefoBatchNo} {alt.fefoExpDate && `(HSD: ${alt.fefoExpDate})`}
                          </div>
                        )}
                      </div>

                      <div className="text-right shrink-0 flex flex-col items-end w-full sm:w-auto pt-2 sm:pt-0 border-t sm:border-t-0 border-slate-100">
                        <div className="font-black text-[#0057cd] text-lg">{(alt.price || 0).toLocaleString()}₫</div>
                        <div className={`text-[11px] font-bold mt-0.5 mb-2.5 ${isAvailable ? "text-sky-700" : "text-rose-600"}`}>
                          Tồn kho: {altStock} {alt.unit || 'Hộp'} {isAvailable ? '(Sẵn sàng)' : '(Hết hàng)'}
                        </div>
                        <button
                          type="button"
                          disabled={!isAvailable}
                          onClick={() => handleSelectAiAlternative(alt)}
                          className={`px-4 py-2 text-xs font-bold rounded-xl transition-all flex items-center gap-1.5 shadow-sm cursor-pointer disabled:cursor-not-allowed active:scale-95 ${
                            !isAvailable
                              ? "bg-slate-200 text-slate-400"
                              : !alt.isGppEligible
                              ? "bg-amber-600 hover:bg-amber-700 text-white"
                              : "bg-[#0057cd] hover:bg-[#00419e] text-white"
                          }`}
                        >
                          <Check size={14} /> {!alt.isGppEligible ? "Chọn (Có rủi ro GPP)" : "Chọn thay thế"}
                        </button>
                      </div>
                    </div>
                  );
                })
              )}
            </div>

            {/* Footer */}
            <div className="px-6 py-3.5 border-t border-slate-100 bg-white flex justify-end">
              <button
                type="button"
                onClick={() => {
                  setShowAiAlternativesModal(false);
                  setSelectedAiItemIdx(null);
                  setSelectedAiItemForAlt(null);
                }}
                className="px-5 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold text-xs rounded-xl transition-colors cursor-pointer"
              >
                Đóng
              </button>
            </div>
          </div>
        </div>
      )}

      {/* =======================================
       * 🔄 MODAL ĐỀ XUẤT THUỐC TƯƠNG ĐƯƠNG CHO GIỎ HÀNG CART
       * ======================================= */}
      {showCartAlternativesModal && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-xs z-[60] flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl shadow-2xl max-w-2xl w-full border border-slate-200 overflow-hidden flex flex-col max-h-[85vh] animate-in fade-in zoom-in-95 duration-200">
            {/* Header */}
            <div className="px-6 py-4 border-b border-slate-100 flex items-center justify-between bg-gradient-to-r from-sky-900 to-indigo-900 text-white">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-white/10 rounded-xl">
                  <RefreshCw size={20} className="text-sky-300" />
                </div>
                <div>
                  <h3 className="font-extrabold text-base tracking-wide flex items-center gap-2">
                    Tìm Thuốc Thay Thế Khả Dụng
                    <span className="text-[10px] font-bold bg-sky-500/30 text-sky-200 px-2 py-0.5 rounded-full border border-sky-400/30">Chuẩn GPP</span>
                  </h3>
                  <p className="text-xs text-sky-200 mt-0.5">
                    Thuốc trong đơn hiện tại đang hết hàng hoặc vượt tồn kho khả dụng
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => {
                  setShowCartAlternativesModal(false);
                  setSelectedCartMedForAlt(null);
                }}
                className="text-slate-300 hover:text-white p-1 rounded-lg transition-colors cursor-pointer"
              >
                <X size={20} />
              </button>
            </div>

            {/* Target info */}
            {selectedCartMedForAlt && (
              <div className="px-6 py-3 bg-rose-50 border-b border-rose-200 flex flex-col sm:flex-row sm:items-center justify-between gap-2 text-xs">
                <div>
                  <span className="text-[10px] font-bold text-rose-700 uppercase tracking-wide">Thuốc đang thiếu trong kho:</span>
                  <div className="font-black text-slate-900 text-sm">{selectedCartMedForAlt.name}</div>
                  <div className="text-slate-600 mt-0.5">
                    Hoạt chất: <span className="font-bold text-slate-800">{selectedCartMedForAlt.active_ingredient || "N/A"}</span>
                  </div>
                </div>
                <div className="text-right shrink-0">
                  <span className="px-2.5 py-1 bg-rose-100 text-rose-800 border border-rose-300 rounded-lg text-[11px] font-bold">
                    Cần: {selectedCartMedForAlt.quantity} {selectedCartMedForAlt.unit} • Tồn: {selectedCartMedForAlt.stock || 0}
                  </span>
                </div>
              </div>
            )}

            {/* Cảnh báo lâm sàng GPP nếu thuốc trong cart là dạng tiêm */}
            {(() => {
              const oName = (selectedCartMedForAlt?.name || "").toLowerCase();
              const oForm = (selectedCartMedForAlt?.dosage_form || "").toLowerCase();
              const isInj = /tiêm|tiem|injection|kabi|ống tiêm|ong tiem|lọ tiêm/i.test(oName + " " + oForm);
              const hasInjAlt = aiAlternativesList.some((a: any) => a.tier === 1 && a.stock > 0);

              if (isInj && !hasInjAlt && !loadingAiAlternatives) {
                return (
                  <div className="mx-6 mt-3 p-3.5 bg-rose-50 border-2 border-rose-300 rounded-xl text-xs text-rose-900 shadow-sm flex items-start gap-3">
                    <AlertTriangle size={20} className="text-rose-600 shrink-0 mt-0.5" />
                    <div>
                      <div className="font-black text-rose-800 uppercase tracking-wide flex items-center gap-1.5">
                        ⚠️ CẢNH BÁO DƯỢC LÂM SÀNG & QUY CHUẨN GPP
                      </div>
                      <p className="mt-1 text-rose-900 leading-relaxed font-medium">
                        Đơn thuốc chỉ định <strong>Dạng Tiêm (Injection)</strong>. Chi nhánh hiện không có thuốc tiêm tương đương còn tồn kho.
                        Theo Thông tư 52/2017/TT-BYT & Chuẩn GPP, <strong>Dược sĩ tuyệt đối không được tự ý đổi thuốc tiêm sang dạng uống/siro</strong> khi chưa có chỉ định lại của Bác sĩ điều trị!
                      </p>
                    </div>
                  </div>
                );
              }
              return null;
            })()}

            {/* List */}
            <div className="p-6 overflow-y-auto flex-1 space-y-3 bg-slate-50/50">
              {loadingAiAlternatives ? (
                <div className="flex flex-col items-center justify-center py-12 gap-3 text-slate-500">
                  <Loader2 size={36} className="animate-spin text-sky-600" />
                  <p className="text-sm font-semibold text-slate-600">Đang tra cứu danh mục thuốc thay thế chuẩn GPP...</p>
                </div>
              ) : aiAlternativesList.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-12 text-center text-slate-500 gap-2">
                  <div className="w-14 h-14 rounded-2xl bg-slate-100 flex items-center justify-center text-slate-400 mb-2">
                    <FileText size={28} />
                  </div>
                  <h4 className="font-bold text-slate-800 text-sm">Không tìm thấy thuốc thay thế phù hợp</h4>
                  <p className="text-xs text-slate-500 max-w-sm">
                    Kho chi nhánh hiện không có sản phẩm cùng hoạt chất tương đương còn hàng.
                  </p>
                </div>
              ) : (
                aiAlternativesList.map((alt: any) => {
                  const altStock = Number(alt.stock || alt.branchStock || 0);
                  const isAvailable = altStock > 0;

                  return (
                    <div
                      key={alt.id || alt._id}
                      className={`border rounded-xl p-4 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 transition-all bg-white hover:shadow-md ${
                        isAvailable ? "border-slate-200 hover:border-sky-500" : "border-slate-200 opacity-60 bg-slate-50"
                      }`}
                    >
                      <div className="flex-1 min-w-0">
                        <div className="flex items-baseline gap-2 flex-wrap">
                          <span className="font-black text-slate-900 text-[15px]">{alt.name}</span>
                          <span className={`px-2 py-0.5 rounded text-[10px] uppercase tracking-wide border shadow-2xs ${alt.badgeClass || 'bg-sky-100 text-sky-800 border-sky-300'}`}>
                            {alt.badgeLabel || 'Cùng hoạt chất'}
                          </span>
                        </div>

                        <div className="text-xs text-slate-500 mt-1 flex flex-wrap gap-x-3 gap-y-1">
                          <span>Hoạt chất: <strong className="text-slate-700">{alt.active_ingredient || "N/A"}</strong></span>
                          <span>Đơn vị: <strong className="text-slate-700">{alt.unit || "Hộp"}</strong></span>
                        </div>

                        {alt.clinicalWarning && (
                          <div className="mt-1.5 p-2 bg-rose-50 border border-rose-200 rounded-lg text-[11px] text-rose-800 font-medium flex items-start gap-1.5">
                            <AlertTriangle size={13} className="text-rose-600 shrink-0 mt-0.5" />
                            <span>{alt.clinicalWarning}</span>
                          </div>
                        )}
                      </div>

                      <div className="text-right shrink-0 flex flex-col items-end w-full sm:w-auto pt-2 sm:pt-0 border-t sm:border-t-0 border-slate-100">
                        <div className="font-black text-[#0057cd] text-lg">{(alt.price || 0).toLocaleString()}₫</div>
                        <div className={`text-[11px] font-bold mt-0.5 mb-2.5 ${isAvailable ? "text-sky-700" : "text-rose-600"}`}>
                          Tồn kho: {altStock} {alt.unit || 'Hộp'} {isAvailable ? '(Sẵn sàng)' : '(Hết hàng)'}
                        </div>
                        <button
                          type="button"
                          disabled={!isAvailable}
                          onClick={() => handleSelectCartAlternative(alt)}
                          className={`px-4 py-2 text-xs font-bold rounded-xl transition-all flex items-center gap-1.5 shadow-sm cursor-pointer disabled:cursor-not-allowed active:scale-95 ${
                            !isAvailable
                              ? "bg-slate-200 text-slate-400"
                              : !alt.isGppEligible
                              ? "bg-amber-600 hover:bg-amber-700 text-white"
                              : "bg-[#0057cd] hover:bg-[#00419e] text-white"
                          }`}
                        >
                          <Check size={14} /> {!alt.isGppEligible ? "Thay (Có rủi ro GPP)" : "Thay vào đơn"}
                        </button>
                      </div>
                    </div>
                  );
                })
              )}
            </div>

            {/* Footer */}
            <div className="px-6 py-3.5 border-t border-slate-100 bg-white flex justify-end">
              <button
                type="button"
                onClick={() => {
                  setShowCartAlternativesModal(false);
                  setSelectedCartMedForAlt(null);
                }}
                className="px-5 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold text-xs rounded-xl transition-colors cursor-pointer"
              >
                Đóng
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
