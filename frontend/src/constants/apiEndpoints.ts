/**
 * Bảng hằng số API Endpoints tập trung cho toàn bộ Frontend Web & Mobile
 * Tuân thủ chuẩn Domain-Driven Bounded Context & Playbook v2.0
 */

export const API_ENDPOINTS = {
  // 🔐 Auth & Identity
  AUTH: {
    LOGIN: '/api/auth/login',
    REGISTER: '/api/auth/register',
    LOGOUT: '/api/auth/logout',
    PROFILE: '/api/auth/profile',
    CHANGE_PASSWORD: '/api/auth/change-password',
    FORGOT_PASSWORD: '/api/auth/forgot-password',
    RESET_PASSWORD: '/api/auth/reset-password',
    VERIFY_EMAIL: '/api/auth/verify-email',
    RESEND_VERIFICATION: '/api/auth/resend-verification',
  },

  // 👥 Users & Loyalty & RFM
  USERS: {
    PROFILE: '/api/users/profile',
    LOYALTY: '/api/users/loyalty',
    LOYALTY_LOOKUP: (phone: string) => `/api/users/loyalty/lookup?phone=${encodeURIComponent(phone)}`,
    CLINICAL_HISTORY: (phone: string) => `/api/users/clinical-history?phone=${encodeURIComponent(phone)}`,
    CART: '/api/users/cart',
    CART_ITEM: (id: string) => `/api/users/cart/${encodeURIComponent(id)}`,
    CART_CLEAR: '/api/users/cart/clear',
    AUDIT_LOGS: '/api/users/audit-logs',
    CLINICAL_SAFETY: (phone: string) => `/api/users/clinical-safety/${encodeURIComponent(phone)}`,
    RFM_OVERVIEW: '/api/users/rfm/overview',
    RFM_CUSTOMER: (phone: string) => `/api/users/rfm/customer/${encodeURIComponent(phone)}`,
    RFM_AT_RISK: '/api/users/rfm/at-risk',
    RFM_RECALCULATE: '/api/users/rfm/recalculate',
  },

  // 👔 HR & Employees
  EMPLOYEES: {
    LIST: '/api/admin/employees',
    CREATE: '/api/admin/employees',
    DETAIL: (id: string) => `/api/admin/employees/${encodeURIComponent(id)}`,
    BAN: (id: string) => `/api/admin/employees/${encodeURIComponent(id)}/ban`,
    APPROVE: (id: string) => `/api/admin/employees/${encodeURIComponent(id)}/approve`,
  },

  // 🏢 Branch & Facility
  BRANCHES: {
    LIST: '/api/branches',
    CREATE: '/api/branches',
    DETAIL: (id: string) => `/api/branches/${encodeURIComponent(id)}`,
    UPDATE: (id: string) => `/api/branches/${encodeURIComponent(id)}`,
    DELETE: (id: string) => `/api/branches/${encodeURIComponent(id)}`,
  },

  // 💊 Medicines & Inventory
  MEDICINES: {
    LIST: '/api/medicines',
    CREATE: '/api/medicines',
    DETAIL: (id: string) => `/api/medicines/${encodeURIComponent(id)}`,
    UPDATE: (id: string) => `/api/medicines/${encodeURIComponent(id)}`,
    DELETE: (id: string) => `/api/medicines/${encodeURIComponent(id)}`,
    DROPDOWN: '/api/medicines/dropdown',
    STATS: '/api/medicines/stats',
    FILTERS: '/api/medicines/filters',
    BARCODE: (barcode: string) => `/api/medicines/barcode/${encodeURIComponent(barcode)}`,
    ALTERNATIVES: (id: string) => `/api/medicines/${encodeURIComponent(id)}/alternatives`,
    GENERATE_BARCODE: (id: string) => `/api/medicines/${encodeURIComponent(id)}/generate-barcode`,
    LOW_STOCK_REPORT: '/api/medicines/low-stock-report',
    EXPIRATION_ALERTS: '/api/medicines/expiration-report',
    EXPIRATION_REPORT: '/api/medicines/expiration-report',
    EXPIRATION_ACTION: '/api/medicines/expiration-action',
    SAFE_STOCK_CHAIN: '/api/medicines/safe-stock-chain',
    ANOMALY_DETECTION: '/api/medicines/anomaly-detection',
    SAFE_INVENTORY: (branchId: string) => `/api/medicines/safe-inventory/${encodeURIComponent(branchId)}`,
    BRANCH_MEDICINES: (branchId: string) => `/api/medicines/branch/${encodeURIComponent(branchId)}`,
    
    // Sơ đồ kho GSP
    WAREHOUSE_MAP: '/api/medicines/warehouse-map',
    SHELF_DETAIL: '/api/medicines/shelf-detail',
    WAREHOUSE_SEARCH: '/api/medicines/warehouse-search',
    ASSIGN_LOCATION: '/api/medicines/assign-location',
    RESERVE_STOCK: '/api/medicines/reserve-stock',
    SYNC_STOCK: '/api/medicines/sync-stock',
    BATCH_STATUS: (batchNumber: string) => `/api/medicines/batches/${encodeURIComponent(batchNumber)}/status`,
    BIN_CAPACITY: (binLocation: string) => `/api/medicines/bin/${encodeURIComponent(binLocation)}/capacity`,
  },

  // 🔄 Stock Transfers & Transactions
  STOCK_TRANSFERS: {
    LIST: '/api/stock-transfers',
    CREATE: '/api/stock-transfers',
    DIRECT: '/api/stock-transfers/direct',
    RECOMMEND: '/api/stock-transfers/recommend',
    DETAIL: (id: string) => `/api/stock-transfers/${encodeURIComponent(id)}`,
    APPROVE: (id: string) => `/api/stock-transfers/${encodeURIComponent(id)}/approve`,
    RECEIVE: (id: string) => `/api/stock-transfers/${encodeURIComponent(id)}/receive`,
    CANCEL: (id: string) => `/api/stock-transfers/${encodeURIComponent(id)}/cancel`,
  },

  INVENTORY_CHECKS: {
    LIST: '/api/inventory-checks',
    CREATE: '/api/inventory-checks',
    DETAIL: (id: string) => `/api/inventory-checks/${encodeURIComponent(id)}`,
    COMPLETE: (id: string) => `/api/inventory-checks/${encodeURIComponent(id)}/complete`,
  },

  INVENTORY_TRANSACTIONS: {
    LIST: '/api/inventory-transactions',
    TRACE_BATCH: (batchNo: string) => `/api/inventory-transactions/trace/${encodeURIComponent(batchNo)}`,
  },

  // 📡 IoT Sensors
  SENSORS: {
    LATEST: '/api/sensor/latest',
    HISTORY: '/api/sensor/history',
    STATIONS: '/api/sensor/stations',
    TELEMETRY: '/api/sensors/telemetry',
  },

  // 📦 Procurement & Suppliers
  SUPPLIERS: {
    LIST: '/api/suppliers',
    CREATE: '/api/suppliers',
    DETAIL: (id: string) => `/api/suppliers/${encodeURIComponent(id)}`,
    UPDATE: (id: string) => `/api/suppliers/${encodeURIComponent(id)}`,
    DELETE: (id: string) => `/api/suppliers/${encodeURIComponent(id)}`,
    CREDIT: (id: string) => `/api/suppliers/${encodeURIComponent(id)}/credit`,
    AGING: (id: string) => `/api/suppliers/${encodeURIComponent(id)}/aging`,
    CREDIT_LIMIT: (id: string) => `/api/suppliers/${encodeURIComponent(id)}/credit-limit`,
    PAYMENT: (id: string) => `/api/suppliers/${encodeURIComponent(id)}/payment`,
  },

  SUPPLIER_CREDIT: {
    SUMMARY: '/api/supplier-credit/summary',
    OVERDUE: '/api/supplier-credit/overdue',
  },

  PURCHASE_REQUISITIONS: {
    LIST: '/api/purchase-requisitions',
    CREATE: '/api/purchase-requisitions',
    DETAIL: (id: string) => `/api/purchase-requisitions/${encodeURIComponent(id)}`,
    UPDATE: (id: string) => `/api/purchase-requisitions/${encodeURIComponent(id)}`,
    APPROVE: (id: string) => `/api/purchase-requisitions/${encodeURIComponent(id)}/approve`,
    REJECT: (id: string) => `/api/purchase-requisitions/${encodeURIComponent(id)}/reject`,
    PROCESS_URGENT: '/api/purchase-requisitions/process-urgent',
  },

  PURCHASE_ORDERS: {
    LIST: '/api/purchase-orders',
    CREATE: '/api/purchase-orders',
    AUTO_ROUTE: '/api/purchase-orders/auto-route',
    DETAIL: (id: string) => `/api/purchase-orders/${encodeURIComponent(id)}`,
    APPROVE_PAY: '/api/purchase-orders/approve-pay',
    REJECT_DELIVERY: '/api/purchase-orders/reject-delivery',
  },

  GOODS_RECEIPTS: {
    LIST: '/api/goods-receipts',
    CREATE: '/api/goods-receipts',
    DETAIL: (id: string) => `/api/goods-receipts/${encodeURIComponent(id)}`,
    APPROVE: (id: string) => `/api/goods-receipts/${encodeURIComponent(id)}/approve`,
    INSPECTION: (grnId: string, itemId: string) => `/api/goods-receipts/${encodeURIComponent(grnId)}/items/${encodeURIComponent(itemId)}/inspection`,
  },

  PRICING: {
    BY_BRANCH: (branchId: string) => `/api/pricing/${encodeURIComponent(branchId)}`,
    UPDATE_PRICE: (branchId: string, medicineId: string) => `/api/pricing/${encodeURIComponent(branchId)}/${encodeURIComponent(medicineId)}`,
    SYNC_ALL: '/api/pricing/sync-all',
    COPY: '/api/pricing/copy',
  },

  RFQ: {
    LIST: '/api/rfq',
    DETAIL: (id: string) => `/api/rfq/${encodeURIComponent(id)}`,
    CREATE: '/api/rfq',
    AWARD: (id: string) => `/api/rfq/${encodeURIComponent(id)}/award`,
    CLOSE: (id: string) => `/api/rfq/${encodeURIComponent(id)}/close`,
    PORTAL_GET_BY_TOKEN: (token: string) => `/api/rfq/portal/${encodeURIComponent(token)}`,
    PORTAL_SUBMIT_QUOTE: (token: string) => `/api/rfq/portal/${encodeURIComponent(token)}/quote`,
  },

  // 🛒 Orders & Sales & Reconciliation
  ORDERS: {
    LIST: '/api/orders',
    CREATE: '/api/orders',
    DETAIL: (id: string) => `/api/orders/${encodeURIComponent(id)}`,
    CHECK: (orderCode: string | number) => `/api/orders/check/${encodeURIComponent(orderCode)}`,
    MY_ORDERS: '/api/orders/my-orders',
    PAYOS_LINK: '/api/orders/payos-link',
    RECONCILIATION_SUMMARY: '/api/orders/reconciliation/summary',
    RECONCILIATION_DISCREPANCIES: '/api/orders/reconciliation/discrepancies',
    RECONCILIATION_OVERRIDE: '/api/orders/reconciliation/override',
    RECONCILIATION_BATCH_MATCH: '/api/orders/reconciliation/batch-match',
    RECONCILIATION_AUTO_RESOLVE: '/api/orders/reconciliation/auto-resolve',
    RECONCILIATION_RESOLVE: (id: string) => `/api/orders/reconciliation/${encodeURIComponent(id)}/resolve`,
  },

  SALES: {
    POS_CHECKOUT: '/api/sales',
    RETURN: '/api/sales/return',
    EXCHANGE: '/api/sales/exchange',
    DETAIL: (id: string) => `/api/sales/${encodeURIComponent(id)}`,
  },

  VOUCHERS: {
    LIST: '/api/vouchers',
    CREATE: '/api/vouchers',
    DETAIL: (id: string) => `/api/vouchers/${encodeURIComponent(id)}`,
    UPDATE: (id: string) => `/api/vouchers/${encodeURIComponent(id)}`,
    DELETE: (id: string) => `/api/vouchers/${encodeURIComponent(id)}`,
    VALIDATE: '/api/vouchers/validate',
  },

  // 🩺 Prescriptions & AI Consultation
  PRESCRIPTIONS: {
    LIST: '/api/prescriptions',
    CREATE: '/api/prescriptions',
    DETAIL: (id: string) => `/api/prescriptions/${encodeURIComponent(id)}`,
    SYMPTOM_CONSULT: '/api/prescriptions/symptom-consult',
    SCAN_OCR: '/api/ai/scan-prescription',
    VOICE_CONSULT: '/api/ai/voice-consult',
    CHAT: '/api/prescriptions/chat',
    CHAT_SESSIONS: '/api/prescriptions/chat/sessions',
    CHAT_SESSION_DETAIL: (id: string) => `/api/prescriptions/chat/sessions/${encodeURIComponent(id)}`,
    CHAT_SESSION_DELETE: (id: string) => `/api/prescriptions/chat/sessions/${encodeURIComponent(id)}`,
  },

  // 🤖 AI & Clinical
  AI: {
    FORECAST_TRAIN: '/api/ai/forecast/train',
    CLINICAL_RECOMMEND: '/api/ai/clinical/recommend',
    CLINICAL_INTERACTION: '/api/ai/clinical/interaction',
    CLINICAL_DOSAGE: '/api/ai/clinical/dosage',
    SCAN_PRESCRIPTION: '/api/ai/scan-prescription',
    VOICE_CONSULT: '/api/ai/voice-consult',
    OCR_HISTORY: '/api/ai/ocr-history',
    OCR_HISTORY_DETAIL: (scanId: string) => `/api/ai/ocr-history/${encodeURIComponent(scanId)}`,
    OCR_HISTORY_ADJUST: (scanId: string) => `/api/ai/ocr-history/${encodeURIComponent(scanId)}/adjust`,
    CONSULTATIONS: '/api/ai/consultations',
    CONSULT_AUDIO: (id: string) => `/api/ai/consult-audio/${encodeURIComponent(id)}`,
    CONSULTATION_CONFIRM: (id: string) => `/api/ai/consultations/${encodeURIComponent(id)}/confirm`,
  },

  RECOMMENDATIONS: {
    FOR_CUSTOMER: (phone: string) => `/api/recommendations/for-customer/${encodeURIComponent(phone)}`,
    FOR_YOU: '/api/recommendations/for-you',
    RECENT: '/api/recommendations/recent',
    RECENT_SEARCHES: '/api/recommendations/recent-searches',
    SEARCH: '/api/recommendations/search',
    SEARCH_LOG: '/api/recommendations/search-log',
  },

  // 📈 Reports & Analytics & Finance
  REPORTS: {
    SUMMARY: '/api/reports/dashboard/summary',
    SEASONAL_ANALYSIS: '/api/reports/seasonal-analysis',
    AI_FORECAST: '/api/reports/ai-forecast',
    PROFIT: '/api/reports/profit',
    REVENUE_ANALYTICS: '/api/reports/revenue/analytics',
    INVENTORY_PERFORMANCE: '/api/reports/inventory-performance',
    HISTORY: '/api/reports/history',
  },

  FINANCE: {
    BASE: '/api/finance',
    SUMMARY: '/api/finance/daily-summary',
    CASH_FLOW: '/api/finance/cash-flow',
    PAYMENT_VOUCHER: '/api/finance/payment-voucher',
  },

  // 🔔 Notifications
  NOTIFICATIONS: {
    ME: '/api/notifications/me',
    UNREAD_COUNT: '/api/notifications/unread-count',
    MARK_READ: (id: string) => `/api/notifications/${encodeURIComponent(id)}/read`,
    MARK_ALL_READ: '/api/notifications/mark-all-read',
    CREATE: '/api/notifications/new',
  },

  // 💬 Feedbacks & Customer Care
  FEEDBACKS: {
    LIST: '/api/feedbacks',
    CREATE: '/api/feedbacks',
    DETAIL: (id: string) => `/api/feedbacks/${encodeURIComponent(id)}`,
    BY_BRANCH: (branchId: string) => `/api/feedbacks/branch/${encodeURIComponent(branchId)}`,
    BY_CUSTOMER: (phone: string) => `/api/feedbacks/customer/${encodeURIComponent(phone)}`,
    LOOKUP: (orderCode: string) => `/api/feedbacks/lookup/${encodeURIComponent(orderCode)}`,
    CHAIN_ANALYTICS: '/api/feedbacks/analytics/chain',
    RESOLVE: (id: string) => `/api/feedbacks/${encodeURIComponent(id)}/resolve`,
  },

  // 📅 HR Shift & Scheduling
  HR: {
    SCHEDULES: '/api/hr/schedules',
    MY_SCHEDULES: '/api/hr/schedules/my',
    WEEK_SCHEDULES: '/api/hr/schedules/week',
    PUBLISH_SCHEDULE: '/api/hr/schedules/publish',
    SHIFTS: '/api/hr/shifts',
    SHIFT_DETAIL: (id: string) => `/api/hr/shifts/${encodeURIComponent(id)}`,
    SWAPS: '/api/hr/swaps',
    MY_SWAPS: '/api/hr/swaps/mine',
    SWAP_RESPOND: (id: string) => `/api/hr/swaps/${encodeURIComponent(id)}/respond`,
    COLLEAGUES: '/api/hr/colleagues',
    NOTIFICATIONS: '/api/hr/notifications',
    UNREAD_NOTIFICATIONS: '/api/hr/notifications/unread',
    MARK_NOTIFICATION_READ: (id: string) => `/api/hr/notifications/${encodeURIComponent(id)}/mark-read`,
  },

  // 📢 Marketing & Campaigns
  MARKETING: {
    CAMPAIGNS: '/api/marketing/campaigns',
    CAMPAIGN_DETAIL: (id: string) => `/api/marketing/campaigns/${encodeURIComponent(id)}`,
    CAMPAIGN_COSTS: (id: string) => `/api/marketing/campaigns/${encodeURIComponent(id)}/costs`,
    ANALYTICS_OVERVIEW: '/api/marketing/campaigns/analytics/overview',
  },

  // 🔍 Audit Logs
  AUDIT: {
    LOGS: '/api/users/audit-logs',
  },

  // ⚡ Realtime Events
  EVENTS: {
    SSE: '/api/events/sse',
  },
} as const;
