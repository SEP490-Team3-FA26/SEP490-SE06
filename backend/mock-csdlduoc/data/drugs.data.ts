// Danh mục Thuốc Quốc gia chuẩn Quyết định 232/QĐ-TTYQG (Bản đặc tả 1.1)
// Bỏ trường ingredients, bổ sung old_registration_number, manufacturer.address, last_update_time

export interface DrugPackaging {
  unit_id: string;
  unit_name: string;
  gtin: string; // Mã vạch thương phẩm toàn cầu GS1
}

export interface DrugRoute {
  id: string;
  name: string;
}

export interface DrugManufacturer {
  id: string;
  name: string;
  country: string;
  address: string;
}

export interface DrugItem {
  id: string; // Tối đa 20 ký tự
  name: string;
  drug_group_id: string;
  registration_number: string;
  old_registration_number?: string;
  active_pharmaceutical_ingredient: string;
  strength: string;
  routes: DrugRoute[];
  prescription_status: 0 | 1; // 0 = không kê đơn (OTC), 1 = kê đơn (ETC)
  special_control_type: 0 | 1 | 2 | 3 | 4 | 5 | 6; // 0=None, 1=Gây nghiện, 2=Hướng thần, 3=Tiền chất, 4=Thuốc độc, 5=Cấm bộ ngành, 6=Phóng xạ
  packagings: DrugPackaging[];
  last_update_time: string; // YYYY-MM-DD
  manufacturer: DrugManufacturer;
  approval_date: string; // YYYY-MM-DD
  expiry_date: string; // YYYY-MM-DD
}

export const MOCK_DRUGS: DrugItem[] = [
  {
    id: "DRUG-0001",
    name: "Panadol Extra với Actizorb",
    drug_group_id: "GRP-01",
    registration_number: "VN-22012-19",
    old_registration_number: "VN-15421-12",
    active_pharmaceutical_ingredient: "Paracetamol 500mg, Caffeine 65mg",
    strength: "500mg/65mg",
    routes: [{ id: "R-01", name: "Đường uống" }],
    prescription_status: 0, // OTC
    special_control_type: 0,
    packagings: [
      { unit_id: "U-01", unit_name: "Hộp", gtin: "8935001800012" },
      { unit_id: "U-02", unit_name: "Vỉ", gtin: "8935001800029" },
      { unit_id: "U-03", unit_name: "Viên", gtin: "8935001800036" },
    ],
    last_update_time: "2026-07-20",
    manufacturer: {
      id: "M-GSK",
      name: "GlaxoSmithKline Consumer Healthcare Pte Ltd",
      country: "Vương Quốc Anh",
      address: "980 Great West Road, Brentford, Middlesex, TW8 9GS, United Kingdom",
    },
    approval_date: "2019-06-15",
    expiry_date: "2029-06-15",
  },
  {
    id: "DRUG-0002",
    name: "Hapacol 650",
    drug_group_id: "GRP-01",
    registration_number: "VD-25410-16",
    old_registration_number: "VD-18340-10",
    active_pharmaceutical_ingredient: "Paracetamol",
    strength: "650mg",
    routes: [{ id: "R-01", name: "Đường uống" }],
    prescription_status: 0, // OTC
    special_control_type: 0,
    packagings: [
      { unit_id: "U-01", unit_name: "Hộp", gtin: "8935001800050" },
      { unit_id: "U-02", unit_name: "Vỉ", gtin: "8935001800067" },
    ],
    last_update_time: "2026-07-22",
    manufacturer: {
      id: "M-DHG",
      name: "Công ty Cổ phần Dược Hậu Giang",
      country: "Việt Nam",
      address: "288 Nguyễn Văn Cừ, P. An Hòa, Q. Ninh Kiều, Cần Thơ",
    },
    approval_date: "2016-08-10",
    expiry_date: "2028-08-10",
  },
  {
    id: "DRUG-0003",
    name: "Augmentin 1g",
    drug_group_id: "GRP-02",
    registration_number: "VN-21980-19",
    old_registration_number: "VN-14200-11",
    active_pharmaceutical_ingredient: "Amoxicillin 875mg, Acid clavulanic 125mg",
    strength: "1000mg",
    routes: [{ id: "R-01", name: "Đường uống" }],
    prescription_status: 1, // ETC (Kê đơn)
    special_control_type: 0,
    packagings: [
      { unit_id: "U-01", unit_name: "Hộp", gtin: "8935001800104" },
      { unit_id: "U-02", unit_name: "Vỉ", gtin: "8935001800111" },
    ],
    last_update_time: "2026-08-01",
    manufacturer: {
      id: "M-GSK",
      name: "GlaxoSmithKline Consumer Healthcare Pte Ltd",
      country: "Vương Quốc Anh",
      address: "980 Great West Road, Brentford, Middlesex, TW8 9GS, United Kingdom",
    },
    approval_date: "2019-04-12",
    expiry_date: "2029-04-12",
  },
  {
    id: "DRUG-0004",
    name: "Klamentin 875/125",
    drug_group_id: "GRP-02",
    registration_number: "VD-24890-16",
    old_registration_number: "VD-17300-10",
    active_pharmaceutical_ingredient: "Amoxicillin trihydrat, Kali clavulanat",
    strength: "875mg/125mg",
    routes: [{ id: "R-01", name: "Đường uống" }],
    prescription_status: 1, // ETC
    special_control_type: 0,
    packagings: [
      { unit_id: "U-01", unit_name: "Hộp", gtin: "8935001800159" },
      { unit_id: "U-02", unit_name: "Vỉ", gtin: "8935001800166" },
    ],
    last_update_time: "2026-07-18",
    manufacturer: {
      id: "M-DHG",
      name: "Công ty Cổ phần Dược Hậu Giang",
      country: "Việt Nam",
      address: "288 Nguyễn Văn Cừ, P. An Hòa, Q. Ninh Kiều, Cần Thơ",
    },
    approval_date: "2016-05-20",
    expiry_date: "2028-05-20",
  },
  {
    id: "DRUG-0005",
    name: "Cefixim 200mg Imexpharm",
    drug_group_id: "GRP-02",
    registration_number: "VD-28912-18",
    old_registration_number: "VD-20150-13",
    active_pharmaceutical_ingredient: "Cefixime trihydrate",
    strength: "200mg",
    routes: [{ id: "R-01", name: "Đường uống" }],
    prescription_status: 1, // ETC
    special_control_type: 0,
    packagings: [
      { unit_id: "U-01", unit_name: "Hộp", gtin: "8935001800203" },
      { unit_id: "U-02", unit_name: "Vỉ", gtin: "8935001800210" },
    ],
    last_update_time: "2026-08-15",
    manufacturer: {
      id: "M-IMEX",
      name: "Công ty Cổ phần Dược phẩm Imexpharm",
      country: "Việt Nam",
      address: "Số 4, Đường 30/4, P. 1, TP. Cao Lãnh, Đồng Tháp",
    },
    approval_date: "2018-09-01",
    expiry_date: "2028-09-01",
  },
  {
    id: "DRUG-0006",
    name: "Gaviscon Dual Action",
    drug_group_id: "GRP-03",
    registration_number: "VN-21045-18",
    old_registration_number: "VN-13890-10",
    active_pharmaceutical_ingredient: "Sodium alginate, Sodium bicarbonate, Calcium carbonate",
    strength: "500mg + 213mg + 325mg / 10ml",
    routes: [{ id: "R-01", name: "Đường uống" }],
    prescription_status: 0, // OTC
    special_control_type: 0,
    packagings: [
      { unit_id: "U-01", unit_name: "Hộp", gtin: "8935001800258" },
      { unit_id: "U-04", unit_name: "Gói", gtin: "8935001800265" },
    ],
    last_update_time: "2026-07-28",
    manufacturer: {
      id: "M-GSK",
      name: "Reckitt Benckiser Healthcare UK Ltd",
      country: "Vương Quốc Anh",
      address: "Dansom Lane, Hull, HU8 7DS, United Kingdom",
    },
    approval_date: "2018-03-15",
    expiry_date: "2028-03-15",
  },
  {
    id: "DRUG-0007",
    name: "Nexium Mups 40mg",
    drug_group_id: "GRP-03",
    registration_number: "VN-22340-20",
    old_registration_number: "VN-15600-12",
    active_pharmaceutical_ingredient: "Esomeprazole magnesium trihydrate",
    strength: "40mg",
    routes: [{ id: "R-01", name: "Đường uống" }],
    prescription_status: 1, // ETC
    special_control_type: 0,
    packagings: [
      { unit_id: "U-01", unit_name: "Hộp", gtin: "8935001800302" },
      { unit_id: "U-02", unit_name: "Vỉ", gtin: "8935001800319" },
    ],
    last_update_time: "2026-08-05",
    manufacturer: {
      id: "M-AZ",
      name: "AstraZeneca Pharmaceuticals LP",
      country: "Vương Quốc Anh",
      address: "1 Francis Crick Avenue, Cambridge Biomedical Campus, Cambridge, UK",
    },
    approval_date: "2020-01-10",
    expiry_date: "2030-01-10",
  },
  {
    id: "DRUG-0008",
    name: "Smecta 3g",
    drug_group_id: "GRP-03",
    registration_number: "VN-21800-19",
    old_registration_number: "VN-14500-11",
    active_pharmaceutical_ingredient: "Diosmectite",
    strength: "3g",
    routes: [{ id: "R-01", name: "Đường uống" }],
    prescription_status: 0, // OTC
    special_control_type: 0,
    packagings: [
      { unit_id: "U-01", unit_name: "Hộp", gtin: "8935001800357" },
      { unit_id: "U-04", unit_name: "Gói", gtin: "8935001800364" },
    ],
    last_update_time: "2026-07-15",
    manufacturer: {
      id: "M-SANOFI",
      name: "Ipsen Pharma",
      country: "Pháp",
      address: "65 Quai Georges Gorse, 92100 Boulogne-Billancourt, France",
    },
    approval_date: "2019-02-18",
    expiry_date: "2029-02-18",
  },
  {
    id: "DRUG-0009",
    name: "Amlor 5mg",
    drug_group_id: "GRP-04",
    registration_number: "VN-22100-19",
    old_registration_number: "VN-15100-12",
    active_pharmaceutical_ingredient: "Amlodipine besylate",
    strength: "5mg",
    routes: [{ id: "R-01", name: "Đường uống" }],
    prescription_status: 1, // ETC
    special_control_type: 0,
    packagings: [
      { unit_id: "U-01", unit_name: "Hộp", gtin: "8935001800401" },
      { unit_id: "U-02", unit_name: "Vỉ", gtin: "8935001800418" },
    ],
    last_update_time: "2026-08-10",
    manufacturer: {
      id: "M-PFIZER",
      name: "Pfizer Inc.",
      country: "Hoa Kỳ",
      address: "66 Hudson Boulevard East, New York, NY 10001, USA",
    },
    approval_date: "2019-07-25",
    expiry_date: "2029-07-25",
  },
  {
    id: "DRUG-0010",
    name: "Lipitor 20mg",
    drug_group_id: "GRP-04",
    registration_number: "VN-22450-20",
    old_registration_number: "VN-15800-12",
    active_pharmaceutical_ingredient: "Atorvastatin calcium trihydrate",
    strength: "20mg",
    routes: [{ id: "R-01", name: "Đường uống" }],
    prescription_status: 1, // ETC
    special_control_type: 0,
    packagings: [
      { unit_id: "U-01", unit_name: "Hộp", gtin: "8935001800456" },
      { unit_id: "U-02", unit_name: "Vỉ", gtin: "8935001800463" },
    ],
    last_update_time: "2026-08-12",
    manufacturer: {
      id: "M-PFIZER",
      name: "Pfizer Inc.",
      country: "Hoa Kỳ",
      address: "66 Hudson Boulevard East, New York, NY 10001, USA",
    },
    approval_date: "2020-03-14",
    expiry_date: "2030-03-14",
  },
  {
    id: "DRUG-0011",
    name: "Glucophage 850mg",
    drug_group_id: "GRP-05",
    registration_number: "VN-21950-19",
    old_registration_number: "VN-14300-11",
    active_pharmaceutical_ingredient: "Metformin hydrochloride",
    strength: "850mg",
    routes: [{ id: "R-01", name: "Đường uống" }],
    prescription_status: 1, // ETC
    special_control_type: 0,
    packagings: [
      { unit_id: "U-01", unit_name: "Hộp", gtin: "8935001800500" },
      { unit_id: "U-02", unit_name: "Vỉ", gtin: "8935001800517" },
    ],
    last_update_time: "2026-07-29",
    manufacturer: {
      id: "M-SANOFI",
      name: "Merck Sante S.A.S",
      country: "Pháp",
      address: "37 Rue Saint Romain, 69008 Lyon, France",
    },
    approval_date: "2019-05-18",
    expiry_date: "2029-05-18",
  },
  {
    id: "DRUG-0012",
    name: "Telfast BD 60mg",
    drug_group_id: "GRP-07",
    registration_number: "VN-22230-19",
    old_registration_number: "VN-15300-12",
    active_pharmaceutical_ingredient: "Fexofenadine hydrochloride",
    strength: "60mg",
    routes: [{ id: "R-01", name: "Đường uống" }],
    prescription_status: 0, // OTC
    special_control_type: 0,
    packagings: [
      { unit_id: "U-01", unit_name: "Hộp", gtin: "8935001800555" },
      { unit_id: "U-02", unit_name: "Vỉ", gtin: "8935001800562" },
    ],
    last_update_time: "2026-08-03",
    manufacturer: {
      id: "M-SANOFI",
      name: "Công ty Cổ phần Sanofi Việt Nam",
      country: "Việt Nam",
      address: "Lô I-8-2, Đường D8, Khu Công nghệ Cao, P. Long Thạnh Mỹ, TP. Thủ Đức, TP.HCM",
    },
    approval_date: "2019-08-11",
    expiry_date: "2029-08-11",
  },
  {
    id: "DRUG-0013",
    name: "Berocca Performance",
    drug_group_id: "GRP-09",
    registration_number: "VN-21780-19",
    old_registration_number: "VN-14100-11",
    active_pharmaceutical_ingredient: "Vitamin B complex, Vitamin C, Canxi, Magie, Kẽm",
    strength: "Viên sủi",
    routes: [{ id: "R-01", name: "Đường uống" }],
    prescription_status: 0, // OTC
    special_control_type: 0,
    packagings: [
      { unit_id: "U-01", unit_name: "Hộp", gtin: "8935001800609" },
      { unit_id: "U-07", unit_name: "Ống", gtin: "8935001800616" },
    ],
    last_update_time: "2026-07-25",
    manufacturer: {
      id: "M-BAYER",
      name: "Bayer AG",
      country: "Đức",
      address: "Kaiser-Wilhelm-Allee 1, 51373 Leverkusen, Germany",
    },
    approval_date: "2019-03-22",
    expiry_date: "2029-03-22",
  },
  {
    id: "DRUG-0014",
    name: "Cao dán Salonpas Diclofenac Patch",
    drug_group_id: "GRP-01",
    registration_number: "VN-22500-20",
    old_registration_number: "VN-16000-13",
    active_pharmaceutical_ingredient: "Diclofenac sodium",
    strength: "15mg / miếng",
    routes: [{ id: "R-04", name: "Bôi/Dán ngoài da" }],
    prescription_status: 0, // OTC
    special_control_type: 0,
    packagings: [
      { unit_id: "U-01", unit_name: "Hộp", gtin: "8935001800654" },
      { unit_id: "U-04", unit_name: "Gói", gtin: "8935001800661" },
      { unit_id: "U-09", unit_name: "Miếng", gtin: "8935001800678" },
    ],
    last_update_time: "2026-08-18",
    manufacturer: {
      id: "M-HISAMITSU",
      name: "Hisamitsu Pharmaceutical Co., Inc.",
      country: "Nhật Bản",
      address: "408 Tashirodaikan-machi, Tosu, Saga 841-0017, Japan",
    },
    approval_date: "2020-04-19",
    expiry_date: "2030-04-19",
  },
  // --- THUỐC KIỂM SOÁT ĐẶC BIỆT ---
  {
    id: "DRUG-0015",
    name: "Morphine hydrochlorid 10mg/ml",
    drug_group_id: "GRP-10",
    registration_number: "VD-23450-15",
    old_registration_number: "VD-16500-10",
    active_pharmaceutical_ingredient: "Morphine hydrochloride",
    strength: "10mg/ml",
    routes: [{ id: "R-02", name: "Tiêm tĩnh mạch" }, { id: "R-03", name: "Tiêm bắp" }],
    prescription_status: 1, // ETC
    special_control_type: 1, // 1 = GÂY NGHIỆN
    packagings: [
      { unit_id: "U-01", unit_name: "Hộp", gtin: "8935001800708" },
      { unit_id: "U-07", unit_name: "Ống", gtin: "8935001800715" },
    ],
    last_update_time: "2026-07-10",
    manufacturer: {
      id: "M-DANAPHA",
      name: "Công ty Cổ phần Dược Danapha",
      country: "Việt Nam",
      address: "253 Dũng Sĩ Thanh Khê, P. Thanh Khê Tây, Q. Thanh Khê, Đà Nẵng",
    },
    approval_date: "2015-09-12",
    expiry_date: "2027-09-12",
  },
  {
    id: "DRUG-0016",
    name: "Diazepam 5mg Danapha",
    drug_group_id: "GRP-10",
    registration_number: "VD-21400-14",
    old_registration_number: "VD-15200-09",
    active_pharmaceutical_ingredient: "Diazepam",
    strength: "5mg",
    routes: [{ id: "R-01", name: "Đường uống" }],
    prescription_status: 1, // ETC
    special_control_type: 2, // 2 = HƯỚNG THẦN
    packagings: [
      { unit_id: "U-01", unit_name: "Hộp", gtin: "8935001800753" },
      { unit_id: "U-02", unit_name: "Vỉ", gtin: "8935001800760" },
    ],
    last_update_time: "2026-07-14",
    manufacturer: {
      id: "M-DANAPHA",
      name: "Công ty Cổ phần Dược Danapha",
      country: "Việt Nam",
      address: "253 Dũng Sĩ Thanh Khê, P. Thanh Khê Tây, Q. Thanh Khê, Đà Nẵng",
    },
    approval_date: "2014-11-20",
    expiry_date: "2026-11-20",
  },
  {
    id: "DRUG-0017",
    name: "Decolgen Forte",
    drug_group_id: "GRP-06",
    registration_number: "VD-24560-16",
    old_registration_number: "VD-17800-11",
    active_pharmaceutical_ingredient: "Paracetamol 500mg, Phenylephrine HCl 10mg, Chlorpheniramine maleate 2mg",
    strength: "500mg + 10mg + 2mg",
    routes: [{ id: "R-01", name: "Đường uống" }],
    prescription_status: 0, // OTC
    special_control_type: 3, // 3 = TIỀN CHẤT (chứa Phenylephrine)
    packagings: [
      { unit_id: "U-01", unit_name: "Hộp", gtin: "8935001800807" },
      { unit_id: "U-02", unit_name: "Vỉ", gtin: "8935001800814" },
    ],
    last_update_time: "2026-08-08",
    manufacturer: {
      id: "M-BOSTON",
      name: "Công ty Cổ phần Dược phẩm Boston Việt Nam",
      country: "Việt Nam",
      address: "Số 43, Đường số 8, KCN VSIP 1, Thuận An, Bình Dương",
    },
    approval_date: "2016-12-05",
    expiry_date: "2028-12-05",
  },
  {
    id: "DRUG-0018",
    name: "Methotrexate 2.5mg Pfizer",
    drug_group_id: "GRP-10",
    registration_number: "VN-22890-21",
    old_registration_number: "VN-16500-14",
    active_pharmaceutical_ingredient: "Methotrexate",
    strength: "2.5mg",
    routes: [{ id: "R-01", name: "Đường uống" }],
    prescription_status: 1, // ETC
    special_control_type: 4, // 4 = THUỐC ĐỘC
    packagings: [
      { unit_id: "U-01", unit_name: "Hộp", gtin: "8935001800852" },
      { unit_id: "U-06", unit_name: "Lọ", gtin: "8935001800869" },
    ],
    last_update_time: "2026-07-05",
    manufacturer: {
      id: "M-PFIZER",
      name: "Pfizer Inc.",
      country: "Hoa Kỳ",
      address: "66 Hudson Boulevard East, New York, NY 10001, USA",
    },
    approval_date: "2021-06-25",
    expiry_date: "2031-06-25",
  },
];
