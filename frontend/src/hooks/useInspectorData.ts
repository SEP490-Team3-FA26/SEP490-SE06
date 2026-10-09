// Custom Hook quản lý dữ liệu và logic nghiệp vụ giám sát CSDL Dược Quốc Gia
import { useState, useEffect, useMemo, useCallback } from "react";
import { medicineService } from "../services/inventory/medicine.service";
import { goodsReceiptService } from "../services/purchase/goodsReceipt.service";
import { stockTransferService } from "../services/inventory/stockTransfer.service";
import { inventoryCheckService } from "../services/inventory/inventoryCheck.service";
import { orderService } from "../services/sales/order.service";
import { branchService } from "../services/admin/branch.service";
import { NationalFacility, NationalTransaction, ActiveTabType, FacilityFilterType } from "../components/inspector/types";

export function useInspectorData() {
  const [activeTab, setActiveTab] = useState<ActiveTabType>("ledger");
  const [loading, setLoading] = useState(false);
  const [transactions, setTransactions] = useState<NationalTransaction[]>([]);
  const [facilities, setFacilities] = useState<NationalFacility[]>([]);
  const [selectedFacility, setSelectedFacility] = useState<string>("");
  const [selectedTxnType, setSelectedTxnType] = useState<string>("");
  const [facilityFilterType, setFacilityFilterType] = useState<FacilityFilterType>("ALL");
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedTxn, setSelectedTxn] = useState<NationalTransaction | null>(null);
  const [showJsonModal, setShowJsonModal] = useState(false);
  const [copiedId, setCopiedId] = useState<string | null>(null);

  // Danh mục thuốc quốc gia
  const [drugs, setDrugs] = useState<any[]>([]);
  const [drugSearch, setDrugSearch] = useState("");
  const [drugsLoading, setDrugsLoading] = useState(false);

  // Sao chép mã giao dịch hoặc payload vào clipboard
  const handleCopyId = useCallback((id: string) => {
    navigator.clipboard.writeText(id);
    setCopiedId(id);
    setTimeout(() => setCopiedId(null), 1800);
  }, []);

  // Tải dữ liệu giao dịch toàn chuỗi từ các microservice
  const fetchInspectorData = useCallback(async () => {
    setLoading(true);
    try {
      const [branchesRes, grnRes, transfersRes, checksRes, ordersRes] = await Promise.allSettled([
        branchService.getBranches(),
        goodsReceiptService.getGoodsReceipts(),
        stockTransferService.getStockTransfers(),
        inventoryCheckService.getChecks(),
        orderService.getOrders({ limit: 50 }),
      ]);

      const extractList = (res: PromiseSettledResult<any>) => {
        if (res.status !== "fulfilled" || !res.value) return [];
        const val = res.value;
        if (Array.isArray(val)) return val;
        if (Array.isArray(val?.data)) return val.data;
        if (Array.isArray(val?.items)) return val.items;
        return [];
      };

      const branchesList = extractList(branchesRes);
      const grnList = extractList(grnRes);
      const transfersList = extractList(transfersRes);
      const checksList = extractList(checksRes);
      const ordersList = extractList(ordersRes);

      // Danh sách cơ sở mặc định chuẩn y tế
      const defaultFacilities: NationalFacility[] = [
        {
          facility_code: "FAC-HQ-01",
          branch_code: "BR-001",
          name: "Kho Tổng & TT Điều Phối GSP WDP301",
          facility_type: "KHO_TONG_GSP",
          practice_license_code: "79-001234",
          address: "Phường Bến Nghé, Quận 1, TP. Hồ Chí Minh",
          pharmacist_in_charge: "DS. Nguyễn Thành Đạt (Phụ trách Kho Tổng)",
          status: "ACTIVE",
          gsp_certified: true,
          gpp_certified: true,
        },
        {
          facility_code: "FAC-BR-01",
          branch_code: "BR-002",
          name: "Nhà thuốc WDP - Chi nhánh 1 (Quận 1)",
          facility_type: "NHA_THUOC_GPP",
          practice_license_code: "79-001235",
          address: "45 Lê Duẩn, Quận 1, TP. Hồ Chí Minh",
          pharmacist_in_charge: "DS. Trần Thị Bích",
          status: "ACTIVE",
          gsp_certified: false,
          gpp_certified: true,
        },
        {
          facility_code: "FAC-BR-02",
          branch_code: "BR-003",
          name: "Nhà thuốc WDP - Chi nhánh 2 (Thủ Đức)",
          facility_type: "NHA_THUOC_GPP",
          practice_license_code: "79-001236",
          address: "88 Xô Viết Nghệ Tĩnh, Bình Thạnh, TP. Hồ Chí Minh",
          pharmacist_in_charge: "DS. Lê Văn Cường",
          status: "ACTIVE",
          gsp_certified: false,
          gpp_certified: true,
        },
        {
          facility_code: "FAC-BR-03",
          branch_code: "BR-004",
          name: "Nhà thuốc WDP - Chi nhánh 3 (Quận 7)",
          facility_type: "NHA_THUOC_GPP",
          practice_license_code: "79-001237",
          address: "210 Nguyễn Thị Thập, Quận 7, TP. Hồ Chí Minh",
          pharmacist_in_charge: "DS. Phạm Thu Duyên",
          status: "ACTIVE",
          gsp_certified: false,
          gpp_certified: true,
        },
        {
          facility_code: "FAC-BR-04",
          branch_code: "BR-005",
          name: "Nhà thuốc WDP - Chi nhánh 4 (Cầu Giấy - Hà Nội)",
          facility_type: "NHA_THUOC_GPP",
          practice_license_code: "79-001238",
          address: "15 Dịch Vọng Hậu, Cầu Giấy, TP. Hà Nội",
          pharmacist_in_charge: "DS. Hoàng Ngọc Em",
          status: "ACTIVE",
          gsp_certified: false,
          gpp_certified: true,
        },
      ];

      const mappedFacilities: NationalFacility[] = branchesList.length > 0 
        ? [
            defaultFacilities[0],
            ...branchesList.map((b: any, idx: number) => ({
              facility_code: b.code || `FAC-BR-0${idx + 1}`,
              branch_code: b.branch_code || `BR-00${idx + 2}`,
              name: b.name || `Nhà thuốc WDP - Chi nhánh ${idx + 1}`,
              facility_type: "NHA_THUOC_GPP" as const,
              practice_license_code: b.licenseNumber || `79-00123${5 + idx}`,
              address: b.address || "TP. Hồ Chí Minh",
              pharmacist_in_charge: b.managerName || "Dược sĩ phụ trách",
              status: "ACTIVE" as const,
              gsp_certified: false,
              gpp_certified: true,
            })),
          ]
        : defaultFacilities;

      // Tổng hợp dữ liệu sổ cái giao dịch CSDL Dược Quốc Gia
      const txns: NationalTransaction[] = [];

      // Dữ liệu mẫu chuẩn hóa cho Kho Tổng và các chi nhánh
      txns.push(
        {
          transaction_id: "TXN-IN-20261008-674755",
          reference_number: "HD-VAT-882143",
          facility_code: "FAC-HQ-01",
          facility_name: "Kho Tổng & TT Điều Phối GSP WDP301",
          facility_type: "KHO_TONG_GSP",
          practice_license_code: "79-001234",
          transaction_type: "STOCK_IN",
          reason: "supplier",
          status: "completed",
          is_violation: false,
          created_at: new Date(Date.now() - 3600000 * 2).toISOString(),
          details: {
            items_count: 5,
            supplier: "Công ty CP Dược Hậu Giang (DHG Pharma) / GDP",
            note: "Nhập 500 hộp Klamentin 1g & Hapacol 650 theo PO-202610-01",
          },
        },
        {
          transaction_id: "TXN-IN-20261008-674756",
          reference_number: "HD-VAT-882144",
          facility_code: "FAC-HQ-01",
          facility_name: "Kho Tổng & TT Điều Phối GSP WDP301",
          facility_type: "KHO_TONG_GSP",
          practice_license_code: "79-001234",
          transaction_type: "STOCK_IN",
          reason: "supplier",
          status: "completed",
          is_violation: false,
          created_at: new Date(Date.now() - 3600000 * 4).toISOString(),
          details: {
            items_count: 8,
            supplier: "Sanofi-Aventis Việt Nam / GDP",
            note: "Nhập vắc xin & thuốc đặc trị theo chuẩn bảo quản chuỗi lạnh (2-8°C)",
          },
        },
        {
          transaction_id: "TXN-OUT-20261008-310891",
          reference_number: "TRF-HQ-BR01-0891",
          facility_code: "FAC-HQ-01",
          facility_name: "Kho Tổng & TT Điều Phối GSP WDP301",
          facility_type: "KHO_TONG_GSP",
          practice_license_code: "79-001234",
          transaction_type: "STOCK_OUT",
          reason: "transfer-out",
          status: "completed",
          is_violation: false,
          created_at: new Date(Date.now() - 3600000 * 3).toISOString(),
          details: {
            destination: "Nhà thuốc WDP - Chi nhánh 1 (Quận 1)",
            items_count: 12,
            note: "Điều chuyển bổ sung danh mục thuốc thiết yếu cho Chi nhánh 1",
          },
        },
        {
          transaction_id: "TXN-ST-20261008-880001",
          reference_number: "AUDIT-GSP-202610",
          facility_code: "FAC-HQ-01",
          facility_name: "Kho Tổng & TT Điều Phối GSP WDP301",
          facility_type: "KHO_TONG_GSP",
          practice_license_code: "79-001234",
          transaction_type: "STOCK_TAKING",
          reason: "inventory_audit",
          status: "completed",
          is_violation: false,
          created_at: new Date(Date.now() - 3600000 * 20).toISOString(),
          details: {
            items_count: 2307,
            discrepancy_count: 0,
            note: "Kiểm kê định kỳ Kho Tổng GSP: Chuỗi lạnh (2-8°C) và Kho mát đạt chuẩn 100%",
          },
        },
        {
          transaction_id: "TXN-IN-20261008-720001",
          reference_number: "TRF-HQ-BR01-0891",
          facility_code: "FAC-BR-01",
          facility_name: "Nhà thuốc WDP - Chi nhánh 1 (Quận 1)",
          facility_type: "NHA_THUOC_GPP",
          practice_license_code: "79-001235",
          transaction_type: "STOCK_IN",
          reason: "transfer-in",
          status: "completed",
          is_violation: false,
          created_at: new Date(Date.now() - 3600000 * 2.5).toISOString(),
          details: {
            supplier: "Kho Tổng & TT Điều Phối GSP",
            items_count: 12,
            note: "Nhập nhận thành công lô điều phối từ Kho Tổng GSP",
          },
        },
        {
          transaction_id: "TXN-OUT-20261008-990101",
          reference_number: "ORD-POS-88101",
          facility_code: "FAC-BR-01",
          facility_name: "Nhà thuốc WDP - Chi nhánh 1 (Quận 1)",
          facility_type: "NHA_THUOC_GPP",
          practice_license_code: "79-001235",
          transaction_type: "STOCK_OUT",
          reason: "sale-retail",
          status: "completed",
          is_violation: false,
          created_at: new Date(Date.now() - 1800000).toISOString(),
          details: {
            customer: "Bệnh nhân: Trần Văn T. (Toa BV Chợ Rẫy)",
            items_count: 3,
            note: "Bán đơn thuốc điện tử: Augmentin 1g, Paracetamol 500mg",
          },
        },
        {
          transaction_id: "TXN-OUT-20261008-990102",
          reference_number: "ORD-POS-88102",
          facility_code: "FAC-BR-01",
          facility_name: "Nhà thuốc WDP - Chi nhánh 1 (Quận 1)",
          facility_type: "NHA_THUOC_GPP",
          practice_license_code: "79-001235",
          transaction_type: "STOCK_OUT",
          reason: "sale-retail",
          status: "completed",
          is_violation: false,
          created_at: new Date(Date.now() - 3600000).toISOString(),
          details: {
            customer: "Khách lẻ vãng lai",
            items_count: 2,
            note: "Bán thuốc OTC: Salonpas Patch & Berocca effervescent",
          },
        },
        {
          transaction_id: "TXN-IN-20261008-720002",
          reference_number: "TRF-HQ-BR02-0892",
          facility_code: "FAC-BR-02",
          facility_name: "Nhà thuốc WDP - Chi nhánh 2 (Thủ Đức)",
          facility_type: "NHA_THUOC_GPP",
          practice_license_code: "79-001236",
          transaction_type: "STOCK_IN",
          reason: "transfer-in",
          status: "completed",
          is_violation: false,
          created_at: new Date(Date.now() - 3600000 * 5.5).toISOString(),
          details: {
            supplier: "Kho Tổng & TT Điều Phối GSP",
            items_count: 10,
            note: "Nhập nhận hàng chuyển từ Kho Tổng",
          },
        },
        {
          transaction_id: "TXN-OUT-20261008-990201",
          reference_number: "ORD-POS-88201",
          facility_code: "FAC-BR-02",
          facility_name: "Nhà thuốc WDP - Chi nhánh 2 (Thủ Đức)",
          facility_type: "NHA_THUOC_GPP",
          practice_license_code: "79-001236",
          transaction_type: "STOCK_OUT",
          reason: "sale-retail",
          status: "completed",
          is_violation: false,
          created_at: new Date(Date.now() - 2400000).toISOString(),
          details: {
            customer: "Bệnh nhân: Lê Hoàng M. (Toa BV Nhi Đồng 2)",
            items_count: 2,
            note: "Kê đơn siro ho Prospan & Hapacol 250",
          },
        },
        {
          transaction_id: "TXN-ST-20261008-880002",
          reference_number: "CHK-BR02-202610",
          facility_code: "FAC-BR-02",
          facility_name: "Nhà thuốc WDP - Chi nhánh 2 (Thủ Đức)",
          facility_type: "NHA_THUOC_GPP",
          practice_license_code: "79-001236",
          transaction_type: "STOCK_TAKING",
          reason: "inventory_audit",
          status: "completed",
          is_violation: false,
          created_at: new Date(Date.now() - 3600000 * 18).toISOString(),
          details: {
            items_count: 420,
            discrepancy_count: 0,
            note: "Kiểm kê định kỳ tháng 10 chuẩn GPP tại Chi nhánh 2",
          },
        },
        {
          transaction_id: "TXN-IN-20261008-720003",
          reference_number: "TRF-HQ-BR03-0893",
          facility_code: "FAC-BR-03",
          facility_name: "Nhà thuốc WDP - Chi nhánh 3 (Quận 7)",
          facility_type: "NHA_THUOC_GPP",
          practice_license_code: "79-001237",
          transaction_type: "STOCK_IN",
          reason: "transfer-in",
          status: "completed",
          is_violation: false,
          created_at: new Date(Date.now() - 3600000 * 7.5).toISOString(),
          details: {
            supplier: "Kho Tổng & TT Điều Phối GSP",
            items_count: 8,
            note: "Nhập nhận lô thuốc tim mạch chuyển từ Kho Tổng",
          },
        },
        {
          transaction_id: "TXN-OUT-20261008-990301",
          reference_number: "ORD-POS-88301",
          facility_code: "FAC-BR-03",
          facility_name: "Nhà thuốc WDP - Chi nhánh 3 (Quận 7)",
          facility_type: "NHA_THUOC_GPP",
          practice_license_code: "79-001237",
          transaction_type: "STOCK_OUT",
          reason: "sale-retail",
          status: "completed",
          is_violation: false,
          created_at: new Date(Date.now() - 4200000).toISOString(),
          details: {
            customer: "Bệnh nhân: Nguyễn Văn K. (Toa BV Tim Tâm Đức)",
            items_count: 4,
            note: "Kê đơn thuốc huyết áp Concor 5mg & Lipitor 20mg",
          },
        },
        {
          transaction_id: "TXN-IN-20261008-720004",
          reference_number: "TRF-HQ-BR04-0894",
          facility_code: "FAC-BR-04",
          facility_name: "Nhà thuốc WDP - Chi nhánh 4 (Cầu Giấy - Hà Nội)",
          facility_type: "NHA_THUOC_GPP",
          practice_license_code: "79-001238",
          transaction_type: "STOCK_IN",
          reason: "transfer-in",
          status: "completed",
          is_violation: false,
          created_at: new Date(Date.now() - 3600000 * 10).toISOString(),
          details: {
            supplier: "Kho Tổng & TT Điều Phối GSP",
            items_count: 15,
            note: "Nhập nhận lô hàng điều chuyển liên tỉnh từ Kho Tổng TP.HCM",
          },
        },
        {
          transaction_id: "TXN-OUT-20261008-990401",
          reference_number: "ORD-POS-88401",
          facility_code: "FAC-BR-04",
          facility_name: "Nhà thuốc WDP - Chi nhánh 4 (Cầu Giấy - Hà Nội)",
          facility_type: "NHA_THUOC_GPP",
          practice_license_code: "79-001238",
          transaction_type: "STOCK_OUT",
          reason: "sale-retail",
          status: "completed",
          is_violation: false,
          created_at: new Date(Date.now() - 1200000).toISOString(),
          details: {
            customer: "Bệnh nhân: Phạm Hoài A. (Toa BV Bạch Mai)",
            items_count: 3,
            note: "Đơn thuốc kháng sinh Zithromax & Medrol 16mg",
          },
        }
      );

      // Bổ sung các bản ghi thực tế từ API nếu có
      grnList.forEach((grn: any, idx: number) => {
        txns.unshift({
          transaction_id: grn.nationalSyncCode || `TXN-IN-20261008-${10000 + idx}`,
          reference_number: grn.poNumber || grn._id || `GRN-${idx + 1}`,
          facility_code: grn.branchId === "CENTRAL_WH" ? "FAC-HQ-01" : (grn.branchId || "FAC-HQ-01"),
          facility_name: grn.branchId === "CENTRAL_WH" ? "Kho Tổng & TT Điều Phối GSP WDP301" : "Nhà thuốc WDP",
          facility_type: (grn.branchId === "CENTRAL_WH" || !grn.branchId) ? "KHO_TONG_GSP" : "NHA_THUOC_GPP",
          practice_license_code: "79-001234",
          transaction_type: "STOCK_IN",
          reason: "supplier",
          status: "completed",
          is_violation: false,
          created_at: grn.createdAt || new Date().toISOString(),
          details: {
            items_count: grn.items?.length || 1,
            supplier: grn.supplierName || "Nhà cung cấp Dược GDP",
            note: "Phiếu nhập kho thực tế từ hệ thống ERP WDP301",
          },
        });
      });

      transfersList.forEach((trf: any, idx: number) => {
        txns.unshift({
          transaction_id: trf.nationalSyncCode || `TXN-TRF-20261008-${30000 + idx}`,
          reference_number: trf.transferCode || trf._id || `TRF-${idx + 1}`,
          facility_code: "FAC-HQ-01",
          facility_name: "Kho Tổng & TT Điều Phối GSP WDP301",
          facility_type: "KHO_TONG_GSP",
          practice_license_code: "79-001234",
          transaction_type: "STOCK_OUT",
          reason: "transfer-out",
          status: "completed",
          is_violation: false,
          created_at: trf.createdAt || new Date().toISOString(),
          details: {
            destination: trf.toBranchName || "Chi nhánh nhận",
            items_count: trf.items?.length || 1,
            note: `Lệnh xuất chuyển kho liên cơ sở (${trf.transferCode})`,
          },
        });
      });

      ordersList.forEach((ord: any, idx: number) => {
        txns.unshift({
          transaction_id: ord.nationalSyncCode || `TXN-OUT-20261008-${20000 + idx}`,
          reference_number: ord.orderCode || ord._id || `ORD-${idx + 1}`,
          facility_code: ord.branchId || "FAC-BR-01",
          facility_name: "Nhà thuốc WDP - Bán lẻ",
          facility_type: "NHA_THUOC_GPP",
          practice_license_code: "79-001235",
          transaction_type: "STOCK_OUT",
          reason: "sale-retail",
          status: "completed",
          is_violation: false,
          created_at: ord.createdAt || new Date().toISOString(),
          details: {
            customer: ord.patientName || ord.customerName || "Khách mua lẻ",
            items_count: ord.items?.length || 1,
            note: "Hóa đơn bán lẻ liên thông CSDL Dược Quốc gia",
          },
        });
      });

      checksList.forEach((chk: any, idx: number) => {
        txns.unshift({
          transaction_id: chk.nationalSyncCode || `TXN-ST-20261008-${40000 + idx}`,
          reference_number: chk.checkCode || chk._id || `CHK-${idx + 1}`,
          facility_code: chk.branchId === "CENTRAL_WH" ? "FAC-HQ-01" : (chk.branchId || "FAC-BR-02"),
          facility_name: chk.branchId === "CENTRAL_WH" ? "Kho Tổng & TT Điều Phối GSP WDP301" : "Nhà thuốc WDP",
          facility_type: chk.branchId === "CENTRAL_WH" ? "KHO_TONG_GSP" : "NHA_THUOC_GPP",
          practice_license_code: chk.branchId === "CENTRAL_WH" ? "79-001234" : "79-001236",
          transaction_type: "STOCK_TAKING",
          reason: "inventory_audit",
          status: "completed",
          is_violation: false,
          created_at: chk.createdAt || new Date().toISOString(),
          details: {
            discrepancy_count: chk.items?.filter((it: any) => it.difference !== 0)?.length || 0,
            note: "Biên bản kiểm kê kho liên thông CSDL Dược",
          },
        });
      });

      setFacilities(mappedFacilities);
      setTransactions(txns);
    } catch (err) {
      console.warn("Lỗi tải dữ liệu giám sát CSDL Dược:", err);
    } finally {
      setLoading(false);
    }
  }, []);

  // Tải danh mục thuốc quốc gia
  const fetchDrugsCatalog = useCallback(async () => {
    setDrugsLoading(true);
    try {
      const res: any = await medicineService.getMedicines({
        page: 1,
        limit: 50,
        search: drugSearch || undefined,
      });
      const items = res?.data || (Array.isArray(res) ? res : []);
      setDrugs(items);
    } catch (err) {
      console.warn("Lỗi tải danh mục thuốc nội bộ:", err);
    } finally {
      setDrugsLoading(false);
    }
  }, [drugSearch]);

  useEffect(() => {
    fetchInspectorData();
  }, [fetchInspectorData]);

  useEffect(() => {
    if (activeTab === "drugs") {
      fetchDrugsCatalog();
    }
  }, [activeTab, fetchDrugsCatalog]);

  // Bộ lọc dữ liệu giao dịch đa chiều
  const filteredTxns = useMemo(() => {
    return transactions.filter((t) => {
      const q = searchQuery.toLowerCase().trim();
      const matchQuery = 
        !q ||
        (t.transaction_id || "").toLowerCase().includes(q) ||
        (t.reference_number || "").toLowerCase().includes(q) ||
        (t.facility_code || "").toLowerCase().includes(q) ||
        (t.facility_name || "").toLowerCase().includes(q) ||
        (t.details?.note || "").toLowerCase().includes(q) ||
        (t.details?.supplier || "").toLowerCase().includes(q) ||
        (t.details?.customer || "").toLowerCase().includes(q);

      const matchFacility = selectedFacility 
        ? (t.facility_code === selectedFacility || t.practice_license_code === selectedFacility)
        : true;

      const matchFacilityType = 
        facilityFilterType === "ALL" 
          ? true 
          : facilityFilterType === "HQ" 
            ? (t.facility_type === "KHO_TONG_GSP" || t.facility_code === "FAC-HQ-01")
            : (t.facility_type === "NHA_THUOC_GPP" || t.facility_code !== "FAC-HQ-01");

      const matchType = selectedTxnType ? t.transaction_type === selectedTxnType : true;

      return matchQuery && matchFacility && matchFacilityType && matchType;
    });
  }, [transactions, searchQuery, selectedFacility, facilityFilterType, selectedTxnType]);

  const violations = useMemo(() => {
    return transactions.filter((t) => t.is_violation || t.status === "rejected");
  }, [transactions]);

  const hqTransactionsCount = useMemo(() => {
    return transactions.filter((t) => t.facility_code === "FAC-HQ-01" || t.facility_type === "KHO_TONG_GSP").length;
  }, [transactions]);

  const branchTransactionsCount = useMemo(() => {
    return transactions.length - hqTransactionsCount;
  }, [transactions, hqTransactionsCount]);

  const complianceRate = useMemo(() => {
    if (transactions.length === 0) return "100";
    return (((transactions.length - violations.length) / transactions.length) * 100).toFixed(1);
  }, [transactions, violations]);

  return {
    activeTab,
    setActiveTab,
    loading,
    transactions,
    facilities,
    selectedFacility,
    setSelectedFacility,
    selectedTxnType,
    setSelectedTxnType,
    facilityFilterType,
    setFacilityFilterType,
    searchQuery,
    setSearchQuery,
    selectedTxn,
    setSelectedTxn,
    showJsonModal,
    setShowJsonModal,
    copiedId,
    handleCopyId,
    drugs,
    drugSearch,
    setDrugSearch,
    drugsLoading,
    fetchInspectorData,
    fetchDrugsCatalog,
    filteredTxns,
    violations,
    hqTransactionsCount,
    branchTransactionsCount,
    complianceRate,
  };
}
