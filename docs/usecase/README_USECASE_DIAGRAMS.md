# PHARMACHAIN - TÀI LIỆU SƠ ĐỒ USE CASE CHI TIẾT (UML USE CASE DIAGRAMS)

Tài liệu này tổng hợp và mô tả toàn diện hệ thống **122 Use Cases** của **Hệ thống Quản lý Chuỗi Nhà thuốc PharmaChain** (chuẩn hóa toàn bộ tên Use Case và Module sang **Tiếng Anh** chuyên nghiệp).

Cấu trúc thư mục Use Case được tổ chức chuẩn mực thành **2 nhóm sơ đồ**:
1. 📁 **`docs/usecase/by_actor/`**: Sơ đồ Use Case theo từng **Tác nhân (Actor)** trong hệ thống.
2. 📁 **`docs/usecase/by_module/`**: Sơ đồ Use Case theo từng **Phân hệ / Phân vùng chức năng (Module / Subsystem)**.

---

## 1. CẤU TRÚC THƯ MỤC DỰ ÁN (PROJECT DIRECTORY)

```
docs/usecase/
├── by_actor/                               # Sơ đồ Use Case theo Actor (Tiếng Anh)
│   ├── uc_actor_pharmacist.drawio / .png / .svg
│   ├── uc_actor_warehouse.drawio / .png / .svg
│   ├── uc_actor_customer.drawio / .png / .svg
│   ├── uc_actor_branch_manager.drawio / .png / .svg
│   ├── uc_actor_head_manager.drawio / .png / .svg
│   ├── uc_actor_admin.drawio / .png / .svg
│   └── uc_all_actors.drawio / .png / .svg  # File tổng hợp đa trang (6 Tabs)
├── by_module/                              # Sơ đồ Use Case theo Phân hệ Module (Tiếng Anh)
│   ├── uc_module_sales.drawio / .png / .svg
│   ├── uc_module_smart_warehouse.drawio / .png / .svg
│   ├── uc_module_branch_network.drawio / .png / .svg
│   ├── uc_module_ai_features.drawio / .png / .svg
│   ├── uc_module_master_data.drawio / .png / .svg
│   ├── uc_module_reports.drawio / .png / .svg
│   ├── uc_module_system_admin.drawio / .png / .svg
│   ├── uc_module_customer_care.drawio / .png / .svg
│   ├── uc_module_finance_accounting.drawio / .png / .svg
│   ├── uc_module_internal_delivery.drawio / .png / .svg
│   ├── uc_module_marketing_promo.drawio / .png / .svg
│   ├── uc_module_customer_experience.drawio / .png / .svg
│   ├── uc_module_procurement.drawio / .png / .svg
│   ├── uc_module_extended_utilities.drawio / .png / .svg
│   ├── uc_module_personalized_health.drawio / .png / .svg
│   └── uc_all_modules.drawio / .png / .svg # File tổng hợp đa trang (15 Tabs)
├── uc_full.xlsx                            # File Excel gốc định nghĩa dữ liệu Use Case
└── README_USECASE_DIAGRAMS.md              # Báo cáo tổng hợp này
```

---

## 2. NHÓM 1: SƠ ĐỒ USE CASE THEO TÁC NHÂN (BY ACTOR)

Mỗi sơ đồ thể hiện ranh giới hệ thống, nhóm các Use Case theo Module màu sắc trực quan, định tuyến hành lang không cắt chéo chữ và có bảng Legend phân bổ module chi tiết:

| STT | Actor (Tác nhân) | Số lượng UC | File Draw.io nguồn | Ảnh PNG (2400px) | Ảnh SVG Vector |
| :---: | :--- | :---: | :--- | :--- | :--- |
| 1 | **Pharmacist (Dược sĩ)** | **34 UCs** | [uc_actor_pharmacist.drawio](file:///d:/Đồ%20án%20tốt%20nghiệp/wdp301-rbl-project-wdp_se18d08_group-7/docs/usecase/by_actor/uc_actor_pharmacist.drawio) | [PNG](file:///d:/Đồ%20án%20tốt%20nghiệp/wdp301-rbl-project-wdp_se18d08_group-7/docs/usecase/by_actor/uc_actor_pharmacist.png) | [SVG](file:///d:/Đồ%20án%20tốt%20nghiệp/wdp301-rbl-project-wdp_se18d08_group-7/docs/usecase/by_actor/uc_actor_pharmacist.svg) |
| 2 | **Warehouse Staff (Thủ kho)** | **27 UCs** | [uc_actor_warehouse.drawio](file:///d:/Đồ%20án%20tốt%20nghiệp/wdp301-rbl-project-wdp_se18d08_group-7/docs/usecase/by_actor/uc_actor_warehouse.drawio) | [PNG](file:///d:/Đồ%20án%20tốt%20nghiệp/wdp301-rbl-project-wdp_se18d08_group-7/docs/usecase/by_actor/uc_actor_warehouse.png) | [SVG](file:///d:/Đồ%20án%20tốt%20nghiệp/wdp301-rbl-project-wdp_se18d08_group-7/docs/usecase/by_actor/uc_actor_warehouse.svg) |
| 3 | **Customer (Khách hàng)** | **28 UCs** | [uc_actor_customer.drawio](file:///d:/Đồ%20án%20tốt%20nghiệp/wdp301-rbl-project-wdp_se18d08_group-7/docs/usecase/by_actor/uc_actor_customer.drawio) | [PNG](file:///d:/Đồ%20án%20tốt%20nghiệp/wdp301-rbl-project-wdp_se18d08_group-7/docs/usecase/by_actor/uc_actor_customer.png) | [SVG](file:///d:/Đồ%20án%20tốt%20nghiệp/wdp301-rbl-project-wdp_se18d08_group-7/docs/usecase/by_actor/uc_actor_customer.svg) |
| 4 | **Branch Manager (Quản lý Chi nhánh)** | **72 UCs** | [uc_actor_branch_manager.drawio](file:///d:/Đồ%20án%20tốt%20nghiệp/wdp301-rbl-project-wdp_se18d08_group-7/docs/usecase/by_actor/uc_actor_branch_manager.drawio) | [PNG](file:///d:/Đồ%20án%20tốt%20nghiệp/wdp301-rbl-project-wdp_se18d08_group-7/docs/usecase/by_actor/uc_actor_branch_manager.png) | [SVG](file:///d:/Đồ%20án%20tốt%20nghiệp/wdp301-rbl-project-wdp_se18d08_group-7/docs/usecase/by_actor/uc_actor_branch_manager.svg) |
| 5 | **Head Manager (Quản lý Chuỗi/Tổng)** | **66 UCs** | [uc_actor_head_manager.drawio](file:///d:/Đồ%20án%20tốt%20nghiệp/wdp301-rbl-project-wdp_se18d08_group-7/docs/usecase/by_actor/uc_actor_head_manager.drawio) | [PNG](file:///d:/Đồ%20án%20tốt%20nghiệp/wdp301-rbl-project-wdp_se18d08_group-7/docs/usecase/by_actor/uc_actor_head_manager.png) | [SVG](file:///d:/Đồ%20án%20tốt%20nghiệp/wdp301-rbl-project-wdp_se18d08_group-7/docs/usecase/by_actor/uc_actor_head_manager.svg) |
| 6 | **System Admin (Quản trị hệ thống)** | **73 UCs** | [uc_actor_admin.drawio](file:///d:/Đồ%20án%20tốt%20nghiệp/wdp301-rbl-project-wdp_se18d08_group-7/docs/usecase/by_actor/uc_actor_admin.drawio) | [PNG](file:///d:/Đồ%20án%20tốt%20nghiệp/wdp301-rbl-project-wdp_se18d08_group-7/docs/usecase/by_actor/uc_actor_admin.png) | [SVG](file:///d:/Đồ%20án%20tốt%20nghiệp/wdp301-rbl-project-wdp_se18d08_group-7/docs/usecase/by_actor/uc_actor_admin.svg) |
| 🌟 | **ALL ACTORS WORKBOOK** | **122 UCs** | [uc_all_actors.drawio](file:///d:/Đồ%20án%20tốt%20nghiệp/wdp301-rbl-project-wdp_se18d08_group-7/docs/usecase/by_actor/uc_all_actors.drawio) (6 Tabs) | [PNG](file:///d:/Đồ%20án%20tốt%20nghiệp/wdp301-rbl-project-wdp_se18d08_group-7/docs/usecase/by_actor/uc_all_actors.png) | [SVG](file:///d:/Đồ%20án%20tốt%20nghiệp/wdp301-rbl-project-wdp_se18d08_group-7/docs/usecase/by_actor/uc_all_actors.svg) |

---

## 3. NHÓM 2: SƠ ĐỒ USE CASE THEO PHÂN HỆ MODULE (BY MODULE)

Mỗi sơ đồ đặt phân hệ làm ranh giới hệ thống ở trung tâm (Subsystem Boundary), các Actor tham gia được bố trí cân xứng 2 bên (Operational Actors ở bên trái, Management Actors ở bên phải), đường liên kết trực giao vuông góc hoàn toàn không cắt chéo:

| STT | Phân hệ (Module Name) | Số lượng UC | Các Actor liên quan | File Draw.io nguồn | Ảnh PNG | Ảnh SVG |
| :---: | :--- | :---: | :--- | :--- | :--- | :--- |
| 1 | **Sales & Retail Management** | **17 UCs** | Pharmacist, Customer, Branch Manager, Head Manager | [uc_module_sales.drawio](file:///d:/Đồ%20án%20tốt%20nghiệp/wdp301-rbl-project-wdp_se18d08_group-7/docs/usecase/by_module/uc_module_sales.drawio) | [PNG](file:///d:/Đồ%20án%20tốt%20nghiệp/wdp301-rbl-project-wdp_se18d08_group-7/docs/usecase/by_module/uc_module_sales.png) | [SVG](file:///d:/Đồ%20án%20tốt%20nghiệp/wdp301-rbl-project-wdp_se18d08_group-7/docs/usecase/by_module/uc_module_sales.svg) |
| 2 | **Smart Warehouse & Inventory** | **19 UCs** | Warehouse Staff, Pharmacist, Branch Manager, Head Manager, Admin | [uc_module_smart_warehouse.drawio](file:///d:/Đồ%20án%20tốt%20nghiệp/wdp301-rbl-project-wdp_se18d08_group-7/docs/usecase/by_module/uc_module_smart_warehouse.drawio) | [PNG](file:///d:/Đồ%20án%20tốt%20nghiệp/wdp301-rbl-project-wdp_se18d08_group-7/docs/usecase/by_module/uc_module_smart_warehouse.png) | [SVG](file:///d:/Đồ%20án%20tốt%20nghiệp/wdp301-rbl-project-wdp_se18d08_group-7/docs/usecase/by_module/uc_module_smart_warehouse.svg) |
| 3 | **Branch Network Management** | **10 UCs** | Pharmacist, Warehouse Staff, Branch Manager, Head Manager, Admin | [uc_module_branch_network.drawio](file:///d:/Đồ%20án%20tốt%20nghiệp/wdp301-rbl-project-wdp_se18d08_group-7/docs/usecase/by_module/uc_module_branch_network.drawio) | [PNG](file:///d:/Đồ%20án%20tốt%20nghiệp/wdp301-rbl-project-wdp_se18d08_group-7/docs/usecase/by_module/uc_module_branch_network.png) | [SVG](file:///d:/Đồ%20án%20tốt%20nghiệp/wdp301-rbl-project-wdp_se18d08_group-7/docs/usecase/by_module/uc_module_branch_network.svg) |
| 4 | **AI Intelligence & Prediction** | **11 UCs** | Pharmacist, Warehouse Staff, Branch Manager, Head Manager, Admin | [uc_module_ai_features.drawio](file:///d:/Đồ%20án%20tốt%20nghiệp/wdp301-rbl-project-wdp_se18d08_group-7/docs/usecase/by_module/uc_module_ai_features.drawio) | [PNG](file:///d:/Đồ%20án%20tốt%20nghiệp/wdp301-rbl-project-wdp_se18d08_group-7/docs/usecase/by_module/uc_module_ai_features.png) | [SVG](file:///d:/Đồ%20án%20tốt%20nghiệp/wdp301-rbl-project-wdp_se18d08_group-7/docs/usecase/by_module/uc_module_ai_features.svg) |
| 5 | **Master Data & Medicine Catalog** | **10 UCs** | Pharmacist, Warehouse Staff, Customer, Branch Manager, Head Manager, Admin | [uc_module_master_data.drawio](file:///d:/Đồ%20án%20tốt%20nghiệp/wdp301-rbl-project-wdp_se18d08_group-7/docs/usecase/by_module/uc_module_master_data.drawio) | [PNG](file:///d:/Đồ%20án%20tốt%20nghiệp/wdp301-rbl-project-wdp_se18d08_group-7/docs/usecase/by_module/uc_module_master_data.png) | [SVG](file:///d:/Đồ%20án%20tốt%20nghiệp/wdp301-rbl-project-wdp_se18d08_group-7/docs/usecase/by_module/uc_module_master_data.svg) |
| 6 | **Reports & Analytics** | **9 UCs** | Warehouse Staff, Branch Manager, Head Manager, Admin | [uc_module_reports.drawio](file:///d:/Đồ%20án%20tốt%20nghiệp/wdp301-rbl-project-wdp_se18d08_group-7/docs/usecase/by_module/uc_module_reports.drawio) | [PNG](file:///d:/Đồ%20án%20tốt%20nghiệp/wdp301-rbl-project-wdp_se18d08_group-7/docs/usecase/by_module/uc_module_reports.png) | [SVG](file:///d:/Đồ%20án%20tốt%20nghiệp/wdp301-rbl-project-wdp_se18d08_group-7/docs/usecase/by_module/uc_module_reports.svg) |
| 7 | **System Administration & Security** | **4 UCs** | System Admin | [uc_module_system_admin.drawio](file:///d:/Đồ%20án%20tốt%20nghiệp/wdp301-rbl-project-wdp_se18d08_group-7/docs/usecase/by_module/uc_module_system_admin.drawio) | [PNG](file:///d:/Đồ%20án%20tốt%20nghiệp/wdp301-rbl-project-wdp_se18d08_group-7/docs/usecase/by_module/uc_module_system_admin.png) | [SVG](file:///d:/Đồ%20án%20tốt%20nghiệp/wdp301-rbl-project-wdp_se18d08_group-7/docs/usecase/by_module/uc_module_system_admin.svg) |
| 8 | **Customer Care & CRM** | **6 UCs** | Pharmacist, Customer, Branch Manager, Head Manager, Admin | [uc_module_customer_care.drawio](file:///d:/Đồ%20án%20tốt%20nghiệp/wdp301-rbl-project-wdp_se18d08_group-7/docs/usecase/by_module/uc_module_customer_care.drawio) | [PNG](file:///d:/Đồ%20án%20tốt%20nghiệp/wdp301-rbl-project-wdp_se18d08_group-7/docs/usecase/by_module/uc_module_customer_care.png) | [SVG](file:///d:/Đồ%20án%20tốt%20nghiệp/wdp301-rbl-project-wdp_se18d08_group-7/docs/usecase/by_module/uc_module_customer_care.svg) |
| 9 | **Accounting & Financial Management** | **7 UCs** | Pharmacist, Branch Manager, Head Manager, Admin | [uc_module_finance_accounting.drawio](file:///d:/Đồ%20án%20tốt%20nghiệp/wdp301-rbl-project-wdp_se18d08_group-7/docs/usecase/by_module/uc_module_finance_accounting.drawio) | [PNG](file:///d:/Đồ%20án%20tốt%20nghiệp/wdp301-rbl-project-wdp_se18d08_group-7/docs/usecase/by_module/uc_module_finance_accounting.png) | [SVG](file:///d:/Đồ%20án%20tốt%20nghiệp/wdp301-rbl-project-wdp_se18d08_group-7/docs/usecase/by_module/uc_module_finance_accounting.svg) |
| 10 | **Internal Delivery & Dispatch** | **5 UCs** | Pharmacist, Customer, Branch Manager, Head Manager, Admin | [uc_module_internal_delivery.drawio](file:///d:/Đồ%20án%20tốt%20nghiệp/wdp301-rbl-project-wdp_se18d08_group-7/docs/usecase/by_module/uc_module_internal_delivery.drawio) | [PNG](file:///d:/Đồ%20án%20tốt%20nghiệp/wdp301-rbl-project-wdp_se18d08_group-7/docs/usecase/by_module/uc_module_internal_delivery.png) | [SVG](file:///d:/Đồ%20án%20tốt%20nghiệp/wdp301-rbl-project-wdp_se18d08_group-7/docs/usecase/by_module/uc_module_internal_delivery.svg) |
| 11 | **Marketing & Promotions** | **6 UCs** | Customer, Branch Manager, Head Manager, Admin | [uc_module_marketing_promo.drawio](file:///d:/Đồ%20án%20tốt%20nghiệp/wdp301-rbl-project-wdp_se18d08_group-7/docs/usecase/by_module/uc_module_marketing_promo.drawio) | [PNG](file:///d:/Đồ%20án%20tốt%20nghiệp/wdp301-rbl-project-wdp_se18d08_group-7/docs/usecase/by_module/uc_module_marketing_promo.png) | [SVG](file:///d:/Đồ%20án%20tốt%20nghiệp/wdp301-rbl-project-wdp_se18d08_group-7/docs/usecase/by_module/uc_module_marketing_promo.svg) |
| 12 | **Customer Mobile App Experience** | **9 UCs** | Pharmacist, Customer, Admin | [uc_module_customer_experience.drawio](file:///d:/Đồ%20án%20tốt%20nghiệp/wdp301-rbl-project-wdp_se18d08_group-7/docs/usecase/by_module/uc_module_customer_experience.drawio) | [PNG](file:///d:/Đồ%20án%20tốt%20nghiệp/wdp301-rbl-project-wdp_se18d08_group-7/docs/usecase/by_module/uc_module_customer_experience.png) | [SVG](file:///d:/Đồ%20án%20tốt%20nghiệp/wdp301-rbl-project-wdp_se18d08_group-7/docs/usecase/by_module/uc_module_customer_experience.svg) |
| 13 | **Procurement & Supplier Relations** | **3 UCs** | Branch Manager, Head Manager, Admin | [uc_module_procurement.drawio](file:///d:/Đồ%20án%20tốt%20nghiệp/wdp301-rbl-project-wdp_se18d08_group-7/docs/usecase/by_module/uc_module_procurement.drawio) | [PNG](file:///d:/Đồ%20án%20tốt%20nghiệp/wdp301-rbl-project-wdp_se18d08_group-7/docs/usecase/by_module/uc_module_procurement.png) | [SVG](file:///d:/Đồ%20án%20tốt%20nghiệp/wdp301-rbl-project-wdp_se18d08_group-7/docs/usecase/by_module/uc_module_procurement.svg) |
| 14 | **System Utilities & Localization** | **2 UCs** | Pharmacist, Warehouse Staff, Customer, Branch Manager, Admin | [uc_module_extended_utilities.drawio](file:///d:/Đồ%20án%20tốt%20nghiệp/wdp301-rbl-project-wdp_se18d08_group-7/docs/usecase/by_module/uc_module_extended_utilities.drawio) | [PNG](file:///d:/Đồ%20án%20tốt%20nghiệp/wdp301-rbl-project-wdp_se18d08_group-7/docs/usecase/by_module/uc_module_extended_utilities.png) | [SVG](file:///d:/Đồ%20án%20tốt%20nghiệp/wdp301-rbl-project-wdp_se18d08_group-7/docs/usecase/by_module/uc_module_extended_utilities.svg) |
| 15 | **Personalized Healthcare Services** | **3 UCs** | Pharmacist, Customer, Admin | [uc_module_personalized_health.drawio](file:///d:/Đồ%20án%20tốt%20nghiệp/wdp301-rbl-project-wdp_se18d08_group-7/docs/usecase/by_module/uc_module_personalized_health.drawio) | [PNG](file:///d:/Đồ%20án%20tốt%20nghiệp/wdp301-rbl-project-wdp_se18d08_group-7/docs/usecase/by_module/uc_module_personalized_health.png) | [SVG](file:///d:/Đồ%20án%20tốt%20nghiệp/wdp301-rbl-project-wdp_se18d08_group-7/docs/usecase/by_module/uc_module_personalized_health.svg) |
| 🌟 | **ALL MODULES WORKBOOK** | **122 UCs** | [uc_all_modules.drawio](file:///d:/Đồ%20án%20tốt%20nghiệp/wdp301-rbl-project-wdp_se18d08_group-7/docs/usecase/by_module/uc_all_modules.drawio) (15 Tabs) | [PNG](file:///d:/Đồ%20án%20tốt%20nghiệp/wdp301-rbl-project-wdp_se18d08_group-7/docs/usecase/by_module/uc_all_modules.png) | [SVG](file:///d:/Đồ%20án%20tốt%20nghiệp/wdp301-rbl-project-wdp_se18d08_group-7/docs/usecase/by_module/uc_all_modules.svg) |

---

## 4. HƯỚNG DẪN MỞ & TÙY BIẾN SƠ ĐỒ

1. **Mở bằng Draw.io Desktop:** Nhấp đúp vào bất kỳ file `.drawio` nào trong thư mục `docs/usecase/by_actor/` hoặc `docs/usecase/by_module/`.
2. **Mở bằng Draw.io Web:** Truy cập [diagrams.net](https://app.diagrams.net), chọn **Open Existing Diagram** và tải file `.drawio` lên.
3. **Chèn vào Báo cáo Đồ án tốt nghiệp / Khóa luận:**
   - Dùng trực tiếp các file `.png` (đã được kết xuất với độ phân giải siêu nét `width=2400px`) hoặc file `.svg` vector vô hạn không bị vỡ hình.
