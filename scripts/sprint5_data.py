# scripts/sprint5_data.py
# Sprint 5: Customer Care, Loyalty & Operational Governance (10 UCs)

SPRINT_5_UCS = [
    {
        "id": "UC-61",
        "sprint": 5,
        "title": "Customer Complaint Handling",
        "title_short": "Customer Complaint Handling",
        "actor": "Customer",
        "ui": "Complaint UI",
        "gateway_name": "API Gateway",
        "broker_name": "Kafka Broker",
        "service_name": "User Service",
        "db_name": "MongoDB Database",
        "steps": [
            {"from": "actor", "to": "ui", "text": "Submit complaint ticket with photo & invoice"},
            {"from": "ui", "to": "gateway", "text": "POST /api/feedbacks (CreateFeedbackDto)"},
            {"from": "gateway", "to": "kafka", "text": "emit(\"feedback.event.submit\", payload)"},
            {"from": "kafka", "to": "service", "text": "Consume topic: feedback.event.submit"},
            {"from": "service", "to": "db", "text": "Save ComplaintTicket document"},
            {"from": "db", "to": "service", "text": "Complaint saved OK", "is_return": True},
            {"from": "service", "to": "gateway", "text": "Return ticket tracking code", "is_return": True},
            {"from": "gateway", "to": "ui", "text": "HTTP 202 Accepted {ticketId}", "is_return": True},
            {"from": "ui", "to": "actor", "text": "Display complaint confirmation & SLA notification", "is_return": True}
        ],
        "classes": [
            {
                "name": "CreateFeedbackDto",
                "type": "DTO",
                "col": 0, "row": 0,
                "attributes": ["orderId: String", "customerId: String", "issueType: FeedbackCategory", "description: String", "attachments: String[]"],
                "methods": ["validate(): Boolean"]
            },
            {
                "name": "FeedbackController",
                "type": "Controller",
                "col": 1, "row": 0,
                "attributes": ["kafkaClient: ClientKafka", "cacheManager: Cache"],
                "methods": ["submitFeedback(dto: CreateFeedbackDto): Promise<any>", "getTicketById(id: String): Promise<ComplaintTicket>"]
            },
            {
                "name": "FeedbackService",
                "type": "Service",
                "col": 2, "row": 0,
                "attributes": ["complaintModel: Model<ComplaintTicket>", "notificationSvc: NotificationService"],
                "methods": ["handleCreateTicket(dto: any): Promise<ComplaintTicket>", "updateStatus(id: String, status: String): Promise<void>"]
            },
            {
                "name": "ComplaintTicket",
                "type": "Entity",
                "col": 0, "row": 1,
                "attributes": ["_id: ObjectId", "ticketCode: String", "orderId: String", "customerId: String", "status: TicketStatus", "resolutionNotes: String", "createdAt: Date"],
                "methods": ["save(): Promise<ComplaintTicket>", "findById(id: String): Promise<ComplaintTicket>"]
            },
            {
                "name": "NotificationService",
                "type": "Secondary",
                "col": 1, "row": 1,
                "attributes": ["socketGateway: WebSocketGateway"],
                "methods": ["emitTicketStatus(userId: String, ticketCode: String): Promise<void>"]
            }
        ],
        "class_edges": [
            {"from": "CreateFeedbackDto", "to": "FeedbackController", "label": "submits DTO"},
            {"from": "FeedbackController", "to": "FeedbackService", "label": "delegates to"},
            {"from": "FeedbackService", "to": "ComplaintTicket", "label": "persists"},
            {"from": "FeedbackService", "to": "NotificationService", "label": "triggers alert"}
        ]
    },
    {
        "id": "UC-62",
        "sprint": 5,
        "title": "Loyalty Tier & Member Benefits",
        "title_short": "Loyalty Tier & Member Benefits",
        "actor": "Customer",
        "ui": "Loyalty Tier UI",
        "gateway_name": "API Gateway",
        "broker_name": "Kafka Broker",
        "service_name": "User Service",
        "db_name": "MongoDB Database",
        "steps": [
            {"from": "actor", "to": "ui", "text": "View loyalty tier progress and rewards"},
            {"from": "ui", "to": "gateway", "text": "GET /api/users/loyalty-tier"},
            {"from": "gateway", "to": "kafka", "text": "send(\"user.loyalty.tier_info\", userId)"},
            {"from": "kafka", "to": "service", "text": "Consume topic: user.loyalty.tier_info"},
            {"from": "service", "to": "db", "text": "Query User tier & point history"},
            {"from": "db", "to": "service", "text": "Return tier metadata & point balance", "is_return": True},
            {"from": "service", "to": "gateway", "text": "Publish tier summary payload", "is_return": True},
            {"from": "gateway", "to": "ui", "text": "HTTP 200 OK (Tier benefits data)", "is_return": True},
            {"from": "ui", "to": "actor", "text": "Render loyalty progress bar & VIP perks", "is_return": True}
        ],
        "classes": [
            {
                "name": "LoyaltyTierDto",
                "type": "DTO",
                "col": 0, "row": 0,
                "attributes": ["userId: String", "currentTier: TierLevel", "points: Number", "nextTierThreshold: Number"],
                "methods": ["calculateProgress(): Number"]
            },
            {
                "name": "LoyaltyController",
                "type": "Controller",
                "col": 1, "row": 0,
                "attributes": ["kafkaClient: ClientKafka", "cacheManager: Cache"],
                "methods": ["getLoyaltyTier(userId: String): Promise<LoyaltyTierDto>", "claimBenefit(dto: ClaimBenefitDto): Promise<any>"]
            },
            {
                "name": "LoyaltyService",
                "type": "Service",
                "col": 2, "row": 0,
                "attributes": ["tierModel: Model<LoyaltyTier>", "userModel: Model<User>"],
                "methods": ["calculateTier(points: Number): TierLevel", "upgradeTierIfEligible(userId: String): Promise<void>"]
            },
            {
                "name": "LoyaltyTier",
                "type": "Entity",
                "col": 0, "row": 1,
                "attributes": ["_id: ObjectId", "tierName: String", "minPoints: Number", "discountRate: Number", "freeShipVouchers: Number", "pointMultiplier: Number"],
                "methods": ["findApplicableTier(pts: Number): Promise<LoyaltyTier>"]
            },
            {
                "name": "RedisCache",
                "type": "Secondary",
                "col": 1, "row": 1,
                "attributes": ["redisClient: RedisClient"],
                "methods": ["getTierCache(userId: String): Promise<any>", "setTierCache(userId: String, data: any): Promise<void>"]
            }
        ],
        "class_edges": [
            {"from": "LoyaltyTierDto", "to": "LoyaltyController", "label": "receives DTO"},
            {"from": "LoyaltyController", "to": "LoyaltyService", "label": "delegates to"},
            {"from": "LoyaltyService", "to": "LoyaltyTier", "label": "queries tier rules"},
            {"from": "LoyaltyService", "to": "RedisCache", "label": "checks cache"}
        ]
    },
    {
        "id": "UC-63",
        "sprint": 5,
        "title": "Payment Webhook Reconciliation",
        "title_short": "Payment Webhook Reconciliation",
        "actor": "Payment Gateway",
        "ui": "PayOS Webhook Service",
        "gateway_name": "API Gateway",
        "broker_name": "Kafka Broker",
        "service_name": "Orders Service",
        "db_name": "MongoDB Database",
        "steps": [
            {"from": "actor", "to": "ui", "text": "Post VietQR payment webhook callback"},
            {"from": "ui", "to": "gateway", "text": "POST /api/orders/payos-webhook (WebhookPayload)"},
            {"from": "gateway", "to": "kafka", "text": "emit(\"order.event.payment_confirmed\", payload)"},
            {"from": "kafka", "to": "service", "text": "Consume topic: order.event.payment_confirmed"},
            {"from": "service", "to": "db", "text": "Update Order paymentStatus=PAID & PaymentReconciliation"},
            {"from": "db", "to": "service", "text": "Transaction state updated OK", "is_return": True},
            {"from": "service", "to": "gateway", "text": "Acknowledge payment event", "is_return": True},
            {"from": "gateway", "to": "ui", "text": "HTTP 200 OK {code: 00, message: Success}", "is_return": True},
            {"from": "ui", "to": "actor", "text": "Return webhook handshake 200 OK", "is_return": True}
        ],
        "classes": [
            {
                "name": "PayosWebhookDto",
                "type": "DTO",
                "col": 0, "row": 0,
                "attributes": ["orderCode: Number", "amount: Number", "reference: String", "transactionDateTime: String", "signature: String"],
                "methods": ["verifySignature(checksumKey: String): Boolean"]
            },
            {
                "name": "WebhookController",
                "type": "Controller",
                "col": 1, "row": 0,
                "attributes": ["kafkaClient: ClientKafka", "configService: ConfigService"],
                "methods": ["handlePayosWebhook(dto: PayosWebhookDto): Promise<any>"]
            },
            {
                "name": "ReconciliationService",
                "type": "Service",
                "col": 2, "row": 0,
                "attributes": ["reconciliationModel: Model<PaymentReconciliation>", "orderModel: Model<Order>"],
                "methods": ["reconcileTransaction(dto: PayosWebhookDto): Promise<void>", "flagDiscrepancy(orderCode: Number): Promise<void>"]
            },
            {
                "name": "PaymentReconciliation",
                "type": "Entity",
                "col": 0, "row": 1,
                "attributes": ["_id: ObjectId", "orderCode: Number", "gatewayTransId: String", "amount: Number", "isMatched: Boolean", "reconciledAt: Date"],
                "methods": ["save(): Promise<PaymentReconciliation>"]
            },
            {
                "name": "FinanceService",
                "type": "Secondary",
                "col": 1, "row": 1,
                "attributes": ["ledgerModel: Model<LedgerEntry>"],
                "methods": ["recordBankReceipt(amount: Number, ref: String): Promise<void>"]
            }
        ],
        "class_edges": [
            {"from": "PayosWebhookDto", "to": "WebhookController", "label": "delivers payload"},
            {"from": "WebhookController", "to": "ReconciliationService", "label": "invokes"},
            {"from": "ReconciliationService", "to": "PaymentReconciliation", "label": "persists log"},
            {"from": "ReconciliationService", "to": "FinanceService", "label": "syncs ledger"}
        ]
    },
    {
        "id": "UC-65",
        "sprint": 5,
        "title": "Central Warehouse 2D Layout & Shelf Mapping",
        "title_short": "Warehouse 2D Layout Mapping",
        "actor": "Warehouse Manager",
        "ui": "Warehouse 2D UI",
        "gateway_name": "API Gateway",
        "broker_name": "Kafka Broker",
        "service_name": "Inventory Service",
        "db_name": "MongoDB Database",
        "steps": [
            {"from": "actor", "to": "ui", "text": "Select zone & view shelf storage layout"},
            {"from": "ui", "to": "gateway", "text": "GET /api/inventory/warehouse-layout?zone=A"},
            {"from": "gateway", "to": "kafka", "text": "send(\"inventory.layout.query_zone\", zoneId)"},
            {"from": "kafka", "to": "service", "text": "Consume topic: inventory.layout.query_zone"},
            {"from": "service", "to": "db", "text": "Query WarehouseRack & Bin occupancy"},
            {"from": "db", "to": "service", "text": "Return shelf coordinates & batch inventory", "is_return": True},
            {"from": "service", "to": "gateway", "text": "Publish 2D layout matrix", "is_return": True},
            {"from": "gateway", "to": "ui", "text": "HTTP 200 OK (Rack & Bin matrix data)", "is_return": True},
            {"from": "ui", "to": "actor", "text": "Render 2D interactive grid with occupancy colors", "is_return": True}
        ],
        "classes": [
            {
                "name": "WarehouseLayoutDto",
                "type": "DTO",
                "col": 0, "row": 0,
                "attributes": ["zoneId: String", "aisleCount: Number", "racks: RackDetailsDto[]"],
                "methods": ["calculateOccupancy(): Number"]
            },
            {
                "name": "WarehouseLayoutController",
                "type": "Controller",
                "col": 1, "row": 0,
                "attributes": ["kafkaClient: ClientKafka", "cacheManager: Cache"],
                "methods": ["getZoneLayout(zoneId: String): Promise<WarehouseLayoutDto>", "updateBinLocation(dto: BinUpdateDto): Promise<any>"]
            },
            {
                "name": "WarehouseLayoutService",
                "type": "Service",
                "col": 2, "row": 0,
                "attributes": ["rackModel: Model<WarehouseRack>", "binModel: Model<GspBinLocation>"],
                "methods": ["fetchLayoutByZone(zone: String): Promise<any>", "allocateOptimalBin(medicineId: String): Promise<String>"]
            },
            {
                "name": "WarehouseRack",
                "type": "Entity",
                "col": 0, "row": 1,
                "attributes": ["_id: ObjectId", "zone: String", "aisle: String", "rackCode: String", "shelfLevels: Number", "temperatureZone: String", "totalBins: Number"],
                "methods": ["save(): Promise<WarehouseRack>", "findByZone(zone: String): Promise<WarehouseRack[]>"]
            },
            {
                "name": "RedisCache",
                "type": "Secondary",
                "col": 1, "row": 1,
                "attributes": ["redisClient: RedisClient"],
                "methods": ["getLayoutCache(zone: String): Promise<any>", "invalidateZone(zone: String): Promise<void>"]
            }
        ],
        "class_edges": [
            {"from": "WarehouseLayoutDto", "to": "WarehouseLayoutController", "label": "formats data"},
            {"from": "WarehouseLayoutController", "to": "WarehouseLayoutService", "label": "delegates to"},
            {"from": "WarehouseLayoutService", "to": "WarehouseRack", "label": "queries layout"},
            {"from": "WarehouseLayoutService", "to": "RedisCache", "label": "caches layout"}
        ]
    },
    {
        "id": "UC-66",
        "sprint": 5,
        "title": "RFM Customer Segmentation & Churn Analytics",
        "title_short": "RFM Customer Segmentation",
        "actor": "Marketing Director",
        "ui": "RFM Analytics UI",
        "gateway_name": "API Gateway",
        "broker_name": "Kafka Broker",
        "service_name": "AI Service",
        "db_name": "MongoDB Database",
        "steps": [
            {"from": "actor", "to": "ui", "text": "Trigger RFM customer segmentation analytics"},
            {"from": "ui", "to": "gateway", "text": "POST /api/reports/rfm-segmentation/recalculate"},
            {"from": "gateway", "to": "kafka", "text": "emit(\"ai.rfm.recalculate\", params)"},
            {"from": "kafka", "to": "service", "text": "Consume topic: ai.rfm.recalculate"},
            {"from": "service", "to": "db", "text": "Compute R-F-M scores from Order history & save CustomerSegment"},
            {"from": "db", "to": "service", "text": "Customer segment classifications updated", "is_return": True},
            {"from": "service", "to": "gateway", "text": "Return RFM distribution breakdown", "is_return": True},
            {"from": "gateway", "to": "ui", "text": "HTTP 200 OK (Champions, Loyal, At Risk)", "is_return": True},
            {"from": "ui", "to": "actor", "text": "Render RFM scatter plot & segment statistics", "is_return": True}
        ],
        "classes": [
            {
                "name": "RfmSegmentDto",
                "type": "DTO",
                "col": 0, "row": 0,
                "attributes": ["customerId: String", "recencyDays: Number", "frequencyOrders: Number", "monetaryValue: Number", "segmentLabel: String"],
                "methods": ["getScoreSummary(): String"]
            },
            {
                "name": "RfmController",
                "type": "Controller",
                "col": 1, "row": 0,
                "attributes": ["kafkaClient: ClientKafka", "aiFastApiClient: HttpService"],
                "methods": ["getSegmentDistribution(): Promise<any>", "recalculateRfm(): Promise<any>"]
            },
            {
                "name": "RfmAnalyticsService",
                "type": "Service",
                "col": 2, "row": 0,
                "attributes": ["segmentModel: Model<CustomerSegment>", "orderHistoryModel: Model<Order>"],
                "methods": ["executeKMeansClustering(): Promise<void>", "assignSegmentLabels(): Promise<void>"]
            },
            {
                "name": "CustomerSegment",
                "type": "Entity",
                "col": 0, "row": 1,
                "attributes": ["_id: ObjectId", "customerId: String", "rScore: Number", "fScore: Number", "mScore: Number", "segment: RfmCluster", "analyzedAt: Date"],
                "methods": ["save(): Promise<CustomerSegment>", "findBySegment(cluster: String): Promise<CustomerSegment[]>"]
            },
            {
                "name": "UserService",
                "type": "Secondary",
                "col": 1, "row": 1,
                "attributes": ["userModel: Model<User>"],
                "methods": ["tagCustomerWithSegment(userId: String, tag: String): Promise<void>"]
            }
        ],
        "class_edges": [
            {"from": "RfmSegmentDto", "to": "RfmController", "label": "presents DTO"},
            {"from": "RfmController", "to": "RfmAnalyticsService", "label": "invokes"},
            {"from": "RfmAnalyticsService", "to": "CustomerSegment", "label": "persists cluster"},
            {"from": "RfmAnalyticsService", "to": "UserService", "label": "updates user tag"}
        ]
    },
    {
        "id": "UC-67",
        "sprint": 5,
        "title": "Branch Cash Drawer Management",
        "title_short": "Branch Cash Drawer Management",
        "actor": "Pharmacist",
        "ui": "Cash Drawer UI",
        "gateway_name": "API Gateway",
        "broker_name": "Kafka Broker",
        "service_name": "Orders Service",
        "db_name": "MongoDB Database",
        "steps": [
            {"from": "actor", "to": "ui", "text": "Open morning cash drawer & input float amount"},
            {"from": "ui", "to": "gateway", "text": "POST /api/finance/cash-drawer/open (DrawerDto)"},
            {"from": "gateway", "to": "kafka", "text": "emit(\"finance.cashdrawer.open\", payload)"},
            {"from": "kafka", "to": "service", "text": "Consume topic: finance.cashdrawer.open"},
            {"from": "service", "to": "db", "text": "Create CashDrawer active shift record"},
            {"from": "db", "to": "service", "text": "Drawer session initiated OK", "is_return": True},
            {"from": "service", "to": "gateway", "text": "Return drawerSessionId & opening balance", "is_return": True},
            {"from": "gateway", "to": "ui", "text": "HTTP 201 Created (Drawer status: ACTIVE)", "is_return": True},
            {"from": "ui", "to": "actor", "text": "Display cash drawer active status on POS terminal", "is_return": True}
        ],
        "classes": [
            {
                "name": "OpenDrawerDto",
                "type": "DTO",
                "col": 0, "row": 0,
                "attributes": ["branchId: String", "pharmacistId: String", "openingFloat: Number", "note: String"],
                "methods": ["validateFloat(): Boolean"]
            },
            {
                "name": "CashDrawerController",
                "type": "Controller",
                "col": 1, "row": 0,
                "attributes": ["kafkaClient: ClientKafka", "auditLogSvc: AuditLogService"],
                "methods": ["openDrawer(dto: OpenDrawerDto): Promise<any>", "getCurrentDrawer(branchId: String): Promise<CashDrawer>"]
            },
            {
                "name": "CashDrawerService",
                "type": "Service",
                "col": 2, "row": 0,
                "attributes": ["drawerModel: Model<CashDrawer>", "salesOrderModel: Model<SalesOrder>"],
                "methods": ["openSession(dto: any): Promise<CashDrawer>", "recordCashTransaction(drawerId: String, delta: Number): Promise<void>"]
            },
            {
                "name": "CashDrawer",
                "type": "Entity",
                "col": 0, "row": 1,
                "attributes": ["_id: ObjectId", "branchId: String", "openedBy: String", "openingFloat: Number", "currentCash: Number", "status: DrawerStatus", "openedAt: Date"],
                "methods": ["save(): Promise<CashDrawer>", "findActiveByBranch(branchId: String): Promise<CashDrawer>"]
            },
            {
                "name": "AuditLog",
                "type": "Secondary",
                "col": 1, "row": 1,
                "attributes": ["action: String", "performedBy: String", "timestamp: Date"],
                "methods": ["logDrawerAction(action: String, details: any): Promise<void>"]
            }
        ],
        "class_edges": [
            {"from": "OpenDrawerDto", "to": "CashDrawerController", "label": "passes payload"},
            {"from": "CashDrawerController", "to": "CashDrawerService", "label": "invokes"},
            {"from": "CashDrawerService", "to": "CashDrawer", "label": "creates record"},
            {"from": "CashDrawerService", "to": "AuditLog", "label": "logs shift event"}
        ]
    },
    {
        "id": "UC-68",
        "sprint": 5,
        "title": "Pharmacist OCR Prescription Verification",
        "title_short": "Pharmacist OCR Verification",
        "actor": "Pharmacist",
        "ui": "OCR Verification UI",
        "gateway_name": "API Gateway",
        "broker_name": "Kafka Broker",
        "service_name": "Orders Service",
        "db_name": "MongoDB Database",
        "steps": [
            {"from": "actor", "to": "ui", "text": "Verify detected drugs & adjust quantities"},
            {"from": "ui", "to": "gateway", "text": "POST /api/prescriptions/ocr-verify (VerifyPrescriptionDto)"},
            {"from": "gateway", "to": "kafka", "text": "emit(\"prescription.event.verified\", payload)"},
            {"from": "kafka", "to": "service", "text": "Consume topic: prescription.event.verified"},
            {"from": "service", "to": "db", "text": "Save PrescriptionVerification & update Prescription status=VERIFIED"},
            {"from": "db", "to": "service", "text": "Prescription record verified OK", "is_return": True},
            {"from": "service", "to": "gateway", "text": "Return verified medicine item list", "is_return": True},
            {"from": "gateway", "to": "ui", "text": "HTTP 200 OK (Verified Cart Items)", "is_return": True},
            {"from": "ui", "to": "actor", "text": "Load verified prescription items into POS cart", "is_return": True}
        ],
        "classes": [
            {
                "name": "VerifyPrescriptionDto",
                "type": "DTO",
                "col": 0, "row": 0,
                "attributes": ["prescriptionId: String", "pharmacistId: String", "approvedDrugs: PrescriptionDrugItem[]", "notes: String"],
                "methods": ["validateDosages(): Boolean"]
            },
            {
                "name": "PrescriptionController",
                "type": "Controller",
                "col": 1, "row": 0,
                "attributes": ["kafkaClient: ClientKafka", "aiService: AiService"],
                "methods": ["verifyPrescription(dto: VerifyPrescriptionDto): Promise<any>", "getPrescription(id: String): Promise<Prescription>"]
            },
            {
                "name": "PrescriptionService",
                "type": "Service",
                "col": 2, "row": 0,
                "attributes": ["prescriptionModel: Model<Prescription>", "verificationModel: Model<PrescriptionVerification>"],
                "methods": ["confirmOcrResults(dto: any): Promise<Prescription>", "mapToCartItems(drugs: any[]): Promise<CartItem[]>"]
            },
            {
                "name": "PrescriptionVerification",
                "type": "Entity",
                "col": 0, "row": 1,
                "attributes": ["_id: ObjectId", "prescriptionId: String", "verifiedBy: String", "corrections: Object[]", "status: VerificationStatus", "verifiedAt: Date"],
                "methods": ["save(): Promise<PrescriptionVerification>"]
            },
            {
                "name": "AiService",
                "type": "Secondary",
                "col": 1, "row": 1,
                "attributes": ["geminiClient: GeminiApiClient"],
                "methods": ["recheckLowConfidenceItems(imgUrl: String): Promise<any>"]
            }
        ],
        "class_edges": [
            {"from": "VerifyPrescriptionDto", "to": "PrescriptionController", "label": "delivers adjustments"},
            {"from": "PrescriptionController", "to": "PrescriptionService", "label": "delegates to"},
            {"from": "PrescriptionService", "to": "PrescriptionVerification", "label": "persists verification"},
            {"from": "PrescriptionService", "to": "AiService", "label": "confirms with AI"}
        ]
    },
    {
        "id": "UC-69",
        "sprint": 5,
        "title": "Prescription OCR Audit History",
        "title_short": "Prescription OCR Audit History",
        "actor": "Branch Manager",
        "ui": "OCR Audit History UI",
        "gateway_name": "API Gateway",
        "broker_name": "Kafka Broker",
        "service_name": "Orders Service",
        "db_name": "MongoDB Database",
        "steps": [
            {"from": "actor", "to": "ui", "text": "Filter and inspect historical OCR scanned prescriptions"},
            {"from": "ui", "to": "gateway", "text": "GET /api/prescriptions/ocr-history?branchId=B1&date=today"},
            {"from": "gateway", "to": "kafka", "text": "send(\"prescription.ocr.query_history\", filterPayload)"},
            {"from": "kafka", "to": "service", "text": "Consume topic: prescription.ocr.query_history"},
            {"from": "service", "to": "db", "text": "Query PrescriptionOcrLog with pharmacist review logs"},
            {"from": "db", "to": "service", "text": "Return OCR scan records & confidence scores", "is_return": True},
            {"from": "service", "to": "gateway", "text": "Publish audit log response payload", "is_return": True},
            {"from": "gateway", "to": "ui", "text": "HTTP 200 OK (Paginated OCR Log data)", "is_return": True},
            {"from": "ui", "to": "actor", "text": "Display scan thumbnails, confidence ratings & reviewer info", "is_return": True}
        ],
        "classes": [
            {
                "name": "OcrHistoryQueryDto",
                "type": "DTO",
                "col": 0, "row": 0,
                "attributes": ["branchId: String", "startDate: Date", "endDate: Date", "minConfidence: Number", "page: Number"],
                "methods": ["validateDateRange(): Boolean"]
            },
            {
                "name": "OcrHistoryController",
                "type": "Controller",
                "col": 1, "row": 0,
                "attributes": ["kafkaClient: ClientKafka", "cacheManager: Cache"],
                "methods": ["queryOcrHistory(dto: OcrHistoryQueryDto): Promise<any>"]
            },
            {
                "name": "OcrHistoryService",
                "type": "Service",
                "col": 2, "row": 0,
                "attributes": ["ocrLogModel: Model<PrescriptionOcrLog>", "prescriptionModel: Model<Prescription>"],
                "methods": ["getLogsByBranch(filter: any): Promise<PrescriptionOcrLog[]>", "getAccuracyMetrics(): Promise<any>"]
            },
            {
                "name": "PrescriptionOcrLog",
                "type": "Entity",
                "col": 0, "row": 1,
                "attributes": ["_id: ObjectId", "scanId: String", "imageUrl: String", "rawJson: String", "confidenceScore: Number", "reviewedBy: String", "createdAt: Date"],
                "methods": ["find(filter: any): Promise<PrescriptionOcrLog[]>"]
            },
            {
                "name": "MongoDB Database",
                "type": "Secondary",
                "col": 1, "row": 1,
                "attributes": ["connection: MongooseConnection"],
                "methods": ["aggregateOcrMetrics(branchId: String): Promise<any>"]
            }
        ],
        "class_edges": [
            {"from": "OcrHistoryQueryDto", "to": "OcrHistoryController", "label": "passes query"},
            {"from": "OcrHistoryController", "to": "OcrHistoryService", "label": "invokes"},
            {"from": "OcrHistoryService", "to": "PrescriptionOcrLog", "label": "fetches records"},
            {"from": "OcrHistoryService", "to": "MongoDB Database", "label": "runs aggregation"}
        ]
    },
    {
        "id": "UC-70",
        "sprint": 5,
        "title": "Pharmacist Consultation Voice Recording History",
        "title_short": "Voice Recording History",
        "actor": "QA Specialist",
        "ui": "Voice Audit UI",
        "gateway_name": "API Gateway",
        "broker_name": "Kafka Broker",
        "service_name": "AI Service",
        "db_name": "MongoDB Database",
        "steps": [
            {"from": "actor", "to": "ui", "text": "Select pharmacist consultation & play audio recording"},
            {"from": "ui", "to": "gateway", "text": "GET /api/prescriptions/consult-audio/:id"},
            {"from": "gateway", "to": "kafka", "text": "send(\"ai.audio.consult_query\", consultId)"},
            {"from": "kafka", "to": "service", "text": "Consume topic: ai.audio.consult_query"},
            {"from": "service", "to": "db", "text": "Fetch ConsultationAudioRecord & transcript"},
            {"from": "db", "to": "service", "text": "Return signed audio URL & STT transcription", "is_return": True},
            {"from": "service", "to": "gateway", "text": "Publish audio consultation details", "is_return": True},
            {"from": "gateway", "to": "ui", "text": "HTTP 200 OK (Audio stream & transcript)", "is_return": True},
            {"from": "ui", "to": "actor", "text": "Play consultation recording with synchronized transcript", "is_return": True}
        ],
        "classes": [
            {
                "name": "ConsultAudioDto",
                "type": "DTO",
                "col": 0, "row": 0,
                "attributes": ["consultationId: String", "pharmacistId: String", "audioDuration: Number", "transcription: String"],
                "methods": ["getSummary(): String"]
            },
            {
                "name": "ConsultAudioController",
                "type": "Controller",
                "col": 1, "row": 0,
                "attributes": ["kafkaClient: ClientKafka", "s3StorageSvc: S3StorageService"],
                "methods": ["getConsultationAudio(id: String): Promise<ConsultAudioDto>", "uploadAudio(file: Express.Multer.File): Promise<any>"]
            },
            {
                "name": "ConsultAudioService",
                "type": "Service",
                "col": 2, "row": 0,
                "attributes": ["audioRecordModel: Model<ConsultationAudioRecord>", "speechToTextSvc: SttService"],
                "methods": ["processAudio(fileUrl: String): Promise<void>", "getSignedPlaybackUrl(audioId: String): Promise<String>"]
            },
            {
                "name": "ConsultationAudioRecord",
                "type": "Entity",
                "col": 0, "row": 1,
                "attributes": ["_id: ObjectId", "consultationId: String", "pharmacistId: String", "audioUrl: String", "transcript: String", "durationSeconds: Number", "createdAt: Date"],
                "methods": ["save(): Promise<ConsultationAudioRecord>", "findById(id: String): Promise<ConsultationAudioRecord>"]
            },
            {
                "name": "S3StorageService",
                "type": "Secondary",
                "col": 1, "row": 1,
                "attributes": ["s3Client: S3Client", "bucketName: String"],
                "methods": ["getPresignedUrl(key: String): Promise<String>"]
            }
        ],
        "class_edges": [
            {"from": "ConsultAudioDto", "to": "ConsultAudioController", "label": "transfers metadata"},
            {"from": "ConsultAudioController", "to": "ConsultAudioService", "label": "invokes"},
            {"from": "ConsultAudioService", "to": "ConsultationAudioRecord", "label": "persists record"},
            {"from": "ConsultAudioService", "to": "S3StorageService", "label": "generates presigned URL"}
        ]
    },
    {
        "id": "UC-72",
        "sprint": 5,
        "title": "Branch & Chain Cash Flow Analysis",
        "title_short": "Branch & Chain Cash Flow",
        "actor": "HQ Finance Director",
        "ui": "Cash Flow Dashboard UI",
        "gateway_name": "API Gateway",
        "broker_name": "Kafka Broker",
        "service_name": "Finance Service",
        "db_name": "MongoDB Database",
        "steps": [
            {"from": "actor", "to": "ui", "text": "Select period & view consolidated cash flow"},
            {"from": "ui", "to": "gateway", "text": "GET /api/finance/cashflow-summary?period=2026-Q1"},
            {"from": "gateway", "to": "kafka", "text": "send(\"finance.cashflow.aggregate\", queryParams)"},
            {"from": "kafka", "to": "service", "text": "Consume topic: finance.cashflow.aggregate"},
            {"from": "service", "to": "db", "text": "Aggregate sales revenues, PO payments & overheads across all branches"},
            {"from": "db", "to": "service", "text": "Return financial totals & branch breakdown", "is_return": True},
            {"from": "service", "to": "gateway", "text": "Publish consolidated cash flow report", "is_return": True},
            {"from": "gateway", "to": "ui", "text": "HTTP 200 OK (Revenue, Expenses, Net Flow)", "is_return": True},
            {"from": "ui", "to": "actor", "text": "Render cash flow waterfall chart & branch comparison table", "is_return": True}
        ],
        "classes": [
            {
                "name": "CashFlowSummaryDto",
                "type": "DTO",
                "col": 0, "row": 0,
                "attributes": ["period: String", "totalInflow: Number", "totalOutflow: Number", "netCashFlow: Number", "branchBreakdown: BranchFlowDto[]"],
                "methods": ["getProfitMargin(): Number"]
            },
            {
                "name": "CashFlowController",
                "type": "Controller",
                "col": 1, "row": 0,
                "attributes": ["kafkaClient: ClientKafka", "cacheManager: Cache"],
                "methods": ["getCashFlowSummary(period: String): Promise<CashFlowSummaryDto>", "exportCashFlowCsv(period: String): Promise<Stream>"]
            },
            {
                "name": "CashFlowService",
                "type": "Service",
                "col": 2, "row": 0,
                "attributes": ["reportModel: Model<CashFlowReport>", "ledgerModel: Model<LedgerEntry>"],
                "methods": ["calculateConsolidatedCashFlow(period: String): Promise<CashFlowReport>", "syncBranchTransactions(): Promise<void>"]
            },
            {
                "name": "CashFlowReport",
                "type": "Entity",
                "col": 0, "row": 1,
                "attributes": ["_id: ObjectId", "reportPeriod: String", "branchId: String", "retailRevenue: Number", "supplierExpenses: Number", "netCashFlow: Number", "generatedAt: Date"],
                "methods": ["save(): Promise<CashFlowReport>", "findByPeriod(period: String): Promise<CashFlowReport[]>"]
            },
            {
                "name": "RedisCache",
                "type": "Secondary",
                "col": 1, "row": 1,
                "attributes": ["redisClient: RedisClient"],
                "methods": ["getReportCache(period: String): Promise<any>", "setReportCache(period: String, data: any): Promise<void>"]
            }
        ],
        "class_edges": [
            {"from": "CashFlowSummaryDto", "to": "CashFlowController", "label": "delivers report"},
            {"from": "CashFlowController", "to": "CashFlowService", "label": "invokes calculation"},
            {"from": "CashFlowService", "to": "CashFlowReport", "label": "stores aggregation"},
            {"from": "CashFlowService", "to": "RedisCache", "label": "caches summary"}
        ]
    }
]
