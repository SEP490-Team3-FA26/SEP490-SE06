// Định nghĩa kiểu dữ liệu cho phân hệ giám sát CSDL Dược Quốc Gia theo chuẩn Quyết định 232/QĐ-TTYQG

export interface NationalFacility {
  facility_code: string;
  branch_code?: string;
  name: string;
  facility_type: "KHO_TONG_GSP" | "NHA_THUOC_GPP";
  practice_license_code: string;
  address: string;
  pharmacist_in_charge: string;
  status: "ACTIVE" | "INACTIVE";
  gsp_certified?: boolean;
  gpp_certified?: boolean;
}

export interface NationalTransaction {
  transaction_id: string;
  reference_number: string;
  facility_code: string;
  facility_name?: string;
  facility_type?: "KHO_TONG_GSP" | "NHA_THUOC_GPP";
  practice_license_code?: string;
  transaction_type: "STOCK_IN" | "STOCK_OUT" | "STOCK_TAKING";
  reason: "supplier" | "transfer-out" | "transfer-in" | "sale-retail" | "inventory_audit" | "destroy" | "return";
  status: "completed" | "accepted" | "rejected" | "pending";
  is_violation: boolean;
  violation_reason?: string;
  created_at: string;
  details?: {
    note?: string;
    items_count?: number;
    supplier?: string;
    customer?: string;
    destination?: string;
    discrepancy_count?: number;
  };
  payload_json?: any;
}

export type ActiveTabType = "ledger" | "violations" | "drugs";
export type FacilityFilterType = "ALL" | "HQ" | "BRANCH";

export interface InspectorMetricsData {
  facilitiesCount: number;
  totalTransactions: number;
  hqCount: number;
  branchCount: number;
  complianceRate: string;
  violationsCount: number;
}
