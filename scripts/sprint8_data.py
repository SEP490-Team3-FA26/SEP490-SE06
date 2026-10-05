# scripts/sprint8_data.py
# Sprint 8: Omnichannel, Advanced AI Diagnostics & Enterprise Governance (19 UCs)

SPRINT_8_UCS = [
    {
        "id": "UC-96",
        "sprint": 8,
        "title": "Customer Wishlist & Stock Back In Notification",
        "title_short": "Customer Wishlist & Back In Stock",
        "actor": "Customer",
        "ui": "Wishlist UI",
        "gateway_name": "API Gateway",
        "broker_name": "Kafka Broker",
        "service_name": "User Service",
        "db_name": "MongoDB Database",
        "steps": [
            {"from": "actor", "to": "ui", "text": "Save out-of-stock medicine to wishlist with alert toggle"},
            {"from": "ui", "to": "gateway", "text": "POST /api/users/wishlist (AddToWishlistDto)"},
            {"from": "gateway", "to": "kafka", "text": "emit(\"customer.wishlist.item_added\", payload)"},
            {"from": "kafka", "to": "service", "text": "Consume topic: customer.wishlist.item_added"},
            {"from": "service", "to": "db", "text": "Save CustomerWishlist document with notifyOnRestock=true"},
            {"from": "db", "to": "service", "text": "Wishlist entry saved OK", "is_return": True},
            {"from": "service", "to": "gateway", "text": "Return wishlistId & notification preference", "is_return": True},
            {"from": "gateway", "to": "ui", "text": "HTTP 201 Created (Added to Wishlist)", "is_return": True},
            {"from": "ui", "to": "actor", "text": "Show heart icon activated & 'We will notify you' toast", "is_return": True}
        ],
        "classes": [
            {
                "name": "AddToWishlistDto",
                "type": "DTO",
                "col": 0, "row": 0,
                "attributes": ["customerId: String", "medicineId: String", "notifyWhenAvailable: Boolean"],
                "methods": ["validateMedicine(): Boolean"]
            },
            {
                "name": "WishlistController",
                "type": "Controller",
                "col": 1, "row": 0,
                "attributes": ["kafkaClient: ClientKafka", "cacheManager: Cache"],
                "methods": ["addToWishlist(dto: AddToWishlistDto): Promise<any>", "getWishlist(customerId: String): Promise<CustomerWishlist[]>"]
            },
            {
                "name": "WishlistService",
                "type": "Service",
                "col": 2, "row": 0,
                "attributes": ["wishlistModel: Model<CustomerWishlist>", "notificationSvc: NotificationService"],
                "methods": ["addItem(dto: any): Promise<CustomerWishlist>", "triggerRestockNotifications(medId: String): Promise<void>"]
            },
            {
                "name": "CustomerWishlist",
                "type": "Entity",
                "col": 0, "row": 1,
                "attributes": ["_id: ObjectId", "customerId: String", "medicineId: String", "notifyWhenAvailable: Boolean", "notifiedAt: Date", "createdAt: Date"],
                "methods": ["save(): Promise<CustomerWishlist>", "findPendingAlerts(medId: String): Promise<CustomerWishlist[]>"]
            },
            {
                "name": "NotificationService",
                "type": "Secondary",
                "col": 1, "row": 1,
                "attributes": ["pushClient: FirebaseMessagingClient"],
                "methods": ["sendPushNotification(userId: String, title: String, body: String): Promise<void>"]
            }
        ],
        "class_edges": [
            {"from": "AddToWishlistDto", "to": "WishlistController", "label": "delivers item"},
            {"from": "WishlistController", "to": "WishlistService", "label": "invokes"},
            {"from": "WishlistService", "to": "CustomerWishlist", "label": "persists wishlist"},
            {"from": "WishlistService", "to": "NotificationService", "label": "triggers push alert"}
        ]
    },
    {
        "id": "UC-97",
        "sprint": 8,
        "title": "Rare Medicine Pre-Order Booking",
        "title_short": "Rare Medicine Pre-Order",
        "actor": "Customer",
        "ui": "Pre-Order Booking UI",
        "gateway_name": "API Gateway",
        "broker_name": "Kafka Broker",
        "service_name": "Orders Service",
        "db_name": "MongoDB Database",
        "steps": [
            {"from": "actor", "to": "ui", "text": "Book rare imported drug with 20% deposit payment"},
            {"from": "ui", "to": "gateway", "text": "POST /api/orders/pre-orders (CreatePreOrderDto)"},
            {"from": "gateway", "to": "kafka", "text": "emit(\"orders.preorder.created\", payload)"},
            {"from": "kafka", "to": "service", "text": "Consume topic: orders.preorder.created"},
            {"from": "service", "to": "db", "text": "Create PreOrderBooking & trigger auto-PR to Supplier Service"},
            {"from": "db", "to": "service", "text": "Pre-order reserved & deposit logged OK", "is_return": True},
            {"from": "service", "to": "gateway", "text": "Return bookingCode & expected ETA (7 days)", "is_return": True},
            {"from": "gateway", "to": "ui", "text": "HTTP 201 Created {bookingCode: 'PRE-8841', eta: '2026-10-08'}", "is_return": True},
            {"from": "ui", "to": "actor", "text": "Display booking voucher & shipment tracking timeline", "is_return": True}
        ],
        "classes": [
            {
                "name": "CreatePreOrderDto",
                "type": "DTO",
                "col": 0, "row": 0,
                "attributes": ["customerId: String", "medicineId: String", "requestedQuantity: Number", "depositPaid: Number", "prescriptionDocUrl: String"],
                "methods": ["validateDeposit(): Boolean"]
            },
            {
                "name": "PreOrderController",
                "type": "Controller",
                "col": 1, "row": 0,
                "attributes": ["kafkaClient: ClientKafka", "paymentGateway: PayOsClient"],
                "methods": ["createPreOrder(dto: CreatePreOrderDto): Promise<any>", "getPreOrderStatus(code: String): Promise<PreOrderBooking>"]
            },
            {
                "name": "PreOrderService",
                "type": "Service",
                "col": 2, "row": 0,
                "attributes": ["preOrderModel: Model<PreOrderBooking>", "prServiceClient: ClientKafka"],
                "methods": ["bookPreOrder(dto: any): Promise<PreOrderBooking>", "routeToSupplierRequisition(booking: any): Promise<void>"]
            },
            {
                "name": "PreOrderBooking",
                "type": "Entity",
                "col": 0, "row": 1,
                "attributes": ["_id: ObjectId", "bookingCode: String", "customerId: String", "medicineId: String", "quantity: Number", "depositAmount: Number", "status: PreOrderStatus", "etaDate: Date"],
                "methods": ["save(): Promise<PreOrderBooking>", "findByCode(code: String): Promise<PreOrderBooking>"]
            },
            {
                "name": "SupplierService",
                "type": "Secondary",
                "col": 1, "row": 1,
                "attributes": ["prModel: Model<PurchaseRequisition>"],
                "methods": ["autoGenerateSpecialRequisition(item: any): Promise<void>"]
            }
        ],
        "class_edges": [
            {"from": "CreatePreOrderDto", "to": "PreOrderController", "label": "submits pre-order"},
            {"from": "PreOrderController", "to": "PreOrderService", "label": "invokes"},
            {"from": "PreOrderService", "to": "PreOrderBooking", "label": "persists booking"},
            {"from": "PreOrderService", "to": "SupplierService", "label": "triggers procurement PR"}
        ]
    },
    {
        "id": "UC-98",
        "sprint": 8,
        "title": "Post-Purchase CSAT Feedback Survey",
        "title_short": "CSAT Feedback Survey",
        "actor": "Customer",
        "ui": "Post-Purchase CSAT UI",
        "gateway_name": "API Gateway",
        "broker_name": "Kafka Broker",
        "service_name": "User Service",
        "db_name": "MongoDB Database",
        "steps": [
            {"from": "actor", "to": "ui", "text": "Rate store service & pharmacist consultation (1-5 stars, NPS: 9)"},
            {"from": "ui", "to": "gateway", "text": "POST /api/feedbacks/csat-survey (SubmitCsatDto)"},
            {"from": "gateway", "to": "kafka", "text": "emit(\"feedback.csat.submitted\", payload)"},
            {"from": "kafka", "to": "service", "text": "Consume topic: feedback.csat.submitted"},
            {"from": "service", "to": "db", "text": "Save CsatSurveyResponse & aggregate branch NPS rating"},
            {"from": "db", "to": "service", "text": "Survey recorded & points rewarded OK", "is_return": True},
            {"from": "service", "to": "gateway", "text": "Return loyalty point reward bonus (+20 pts)", "is_return": True},
            {"from": "gateway", "to": "ui", "text": "HTTP 201 Created (Bonus 20 Points Awarded)", "is_return": True},
            {"from": "ui", "to": "actor", "text": "Display thank-you splash & updated loyalty balance", "is_return": True}
        ],
        "classes": [
            {
                "name": "SubmitCsatDto",
                "type": "DTO",
                "col": 0, "row": 0,
                "attributes": ["orderId: String", "customerId: String", "pharmacistRating: Number", "deliveryRating: Number", "npsScore: Number", "comments: String"],
                "methods": ["validateScores(): Boolean"]
            },
            {
                "name": "CsatController",
                "type": "Controller",
                "col": 1, "row": 0,
                "attributes": ["kafkaClient: ClientKafka", "cacheManager: Cache"],
                "methods": ["submitSurvey(dto: SubmitCsatDto): Promise<any>", "getBranchCsatSummary(branchId: String): Promise<any>"]
            },
            {
                "name": "CsatService",
                "type": "Service",
                "col": 2, "row": 0,
                "attributes": ["csatModel: Model<CsatSurveyResponse>", "userModel: Model<User>"],
                "methods": ["processSurvey(dto: any): Promise<CsatSurveyResponse>", "recomputeBranchNps(branchId: String): Promise<Number>"]
            },
            {
                "name": "CsatSurveyResponse",
                "type": "Entity",
                "col": 0, "row": 1,
                "attributes": ["_id: ObjectId", "orderId: String", "customerId: String", "pharmacistRating: Number", "npsScore: Number", "comment: String", "submittedAt: Date"],
                "methods": ["save(): Promise<CsatSurveyResponse>"]
            },
            {
                "name": "ReportsService",
                "type": "Secondary",
                "col": 1, "row": 1,
                "attributes": ["csatReportModel: Model<CsatReport>"],
                "methods": ["updateMonthlyCsatMetrics(branchId: String, nps: Number): Promise<void>"]
            }
        ],
        "class_edges": [
            {"from": "SubmitCsatDto", "to": "CsatController", "label": "delivers ratings"},
            {"from": "CsatController", "to": "CsatService", "label": "invokes"},
            {"from": "CsatService", "to": "CsatSurveyResponse", "label": "persists survey"},
            {"from": "CsatService", "to": "ReportsService", "label": "syncs monthly metrics"}
        ]
    },
    {
        "id": "UC-99",
        "sprint": 8,
        "title": "Health Quiz Gamification & Point Rewards",
        "title_short": "Health Gamification & Rewards",
        "actor": "Customer",
        "ui": "Daily Health Quiz UI",
        "gateway_name": "API Gateway",
        "broker_name": "Kafka Broker",
        "service_name": "User Service",
        "db_name": "MongoDB Database",
        "steps": [
            {"from": "actor", "to": "ui", "text": "Answer daily health quiz question (e.g. 'Cach dung khang sinh')"},
            {"from": "ui", "to": "gateway", "text": "POST /api/gamification/daily-quiz/answer (AnswerQuizDto)"},
            {"from": "gateway", "to": "kafka", "text": "emit(\"gamification.points.awarded\", payload)"},
            {"from": "kafka", "to": "service", "text": "Consume topic: gamification.points.awarded"},
            {"from": "service", "to": "db", "text": "Validate correct answer, log HealthGamification & credit User points"},
            {"from": "db", "to": "service", "text": "Answer correct & +50 points credited", "is_return": True},
            {"from": "service", "to": "gateway", "text": "Return quiz reward result & medical tip explanation", "is_return": True},
            {"from": "gateway", "to": "ui", "text": "HTTP 200 OK (Correct! +50 Points earned)", "is_return": True},
            {"from": "ui", "to": "actor", "text": "Play celebration animation & display health tip summary", "is_return": True}
        ],
        "classes": [
            {
                "name": "AnswerQuizDto",
                "type": "DTO",
                "col": 0, "row": 0,
                "attributes": ["quizId: String", "userId: String", "selectedOptionIndex: Number", "date: String"],
                "methods": ["validateAnswer(): Boolean"]
            },
            {
                "name": "GamificationController",
                "type": "Controller",
                "col": 1, "row": 0,
                "attributes": ["kafkaClient: ClientKafka", "cacheManager: Cache"],
                "methods": ["submitAnswer(dto: AnswerQuizDto): Promise<any>", "getTodaysQuiz(): Promise<HealthQuiz>"]
            },
            {
                "name": "GamificationService",
                "type": "Service",
                "col": 2, "row": 0,
                "attributes": ["quizModel: Model<HealthGamification>", "userModel: Model<User>"],
                "methods": ["evaluateAnswer(quizId: String, answer: Number): Boolean", "creditQuizPoints(userId: String, pts: Number): Promise<void>"]
            },
            {
                "name": "HealthGamification",
                "type": "Entity",
                "col": 0, "row": 1,
                "attributes": ["_id: ObjectId", "questionText: String", "options: String[]", "correctAnswerIndex: Number", "pointsReward: Number", "explanation: String", "activeDate: String"],
                "methods": ["save(): Promise<HealthGamification>", "findTodayQuiz(date: String): Promise<HealthGamification>"]
            },
            {
                "name": "MongoDB Database",
                "type": "Secondary",
                "col": 1, "row": 1,
                "attributes": ["connection: MongooseConnection"],
                "methods": ["atomicIncrementUserPoints(userId: String, delta: Number): Promise<void>"]
            }
        ],
        "class_edges": [
            {"from": "AnswerQuizDto", "to": "GamificationController", "label": "submits answer"},
            {"from": "GamificationController", "to": "GamificationService", "label": "invokes"},
            {"from": "GamificationService", "to": "HealthGamification", "label": "verifies question"},
            {"from": "GamificationService", "to": "MongoDB Database", "label": "increments points"}
        ]
    },
    {
        "id": "UC-100",
        "sprint": 8,
        "title": "Delivery Proof & Shipper QR Scanner",
        "title_short": "Delivery Proof & Shipper QR",
        "actor": "Shipper",
        "ui": "Shipper Delivery App UI",
        "gateway_name": "API Gateway",
        "broker_name": "Kafka Broker",
        "service_name": "Orders Service",
        "db_name": "MongoDB Database",
        "steps": [
            {"from": "actor", "to": "ui", "text": "Scan customer delivery QR & capture recipient handover photo"},
            {"from": "ui", "to": "gateway", "text": "POST /api/orders/delivery-proof (UploadPodDto)"},
            {"from": "gateway", "to": "kafka", "text": "emit(\"order.delivery.completed\", payload)"},
            {"from": "kafka", "to": "service", "text": "Consume topic: order.delivery.completed"},
            {"from": "service", "to": "db", "text": "Save DeliveryProofOfDelivery & update Order status=DELIVERED"},
            {"from": "db", "to": "service", "text": "Proof of delivery saved & order completed OK", "is_return": True},
            {"from": "service", "to": "gateway", "text": "Trigger customer delivery push notification", "is_return": True},
            {"from": "gateway", "to": "ui", "text": "HTTP 200 OK (Status: DELIVERED, POD Verified)", "is_return": True},
            {"from": "ui", "to": "actor", "text": "Mark delivery order completed & credit shipper fee", "is_return": True}
        ],
        "classes": [
            {
                "name": "UploadPodDto",
                "type": "DTO",
                "col": 0, "row": 0,
                "attributes": ["orderId: String", "shipperId: String", "qrCodeScanned: String", "photoDeliveryUrl: String", "latitude: Number", "longitude: Number"],
                "methods": ["validateLocation(): Boolean"]
            },
            {
                "name": "DeliveryProofController",
                "type": "Controller",
                "col": 1, "row": 0,
                "attributes": ["kafkaClient: ClientKafka", "s3Uploader: S3UploadService"],
                "methods": ["submitDeliveryProof(dto: UploadPodDto): Promise<any>"]
            },
            {
                "name": "DeliveryProofService",
                "type": "Service",
                "col": 2, "row": 0,
                "attributes": ["podModel: Model<DeliveryProofOfDelivery>", "orderModel: Model<Order>"],
                "methods": ["finalizeDelivery(dto: any): Promise<Order>", "verifyCustomerQr(orderId: String, qr: String): Boolean"]
            },
            {
                "name": "DeliveryProofOfDelivery",
                "type": "Entity",
                "col": 0, "row": 1,
                "attributes": ["_id: ObjectId", "orderId: String", "shipperId: String", "photoUrl: String", "signatureUrl: String", "geoCoords: Object", "deliveredAt: Date"],
                "methods": ["save(): Promise<DeliveryProofOfDelivery>"]
            },
            {
                "name": "NotificationService",
                "type": "Secondary",
                "col": 1, "row": 1,
                "attributes": ["fcmClient: FcmClient"],
                "methods": ["notifyCustomerDelivered(customerId: String, orderId: String): Promise<void>"]
            }
        ],
        "class_edges": [
            {"from": "UploadPodDto", "to": "DeliveryProofController", "label": "delivers proof"},
            {"from": "DeliveryProofController", "to": "DeliveryProofService", "label": "invokes"},
            {"from": "DeliveryProofService", "to": "DeliveryProofOfDelivery", "label": "persists POD"},
            {"from": "DeliveryProofService", "to": "NotificationService", "label": "pushes customer alert"}
        ]
    },
    {
        "id": "UC-101",
        "sprint": 8,
        "title": "Social Pixel & Omnichannel Attribution Tracking",
        "title_short": "Social Pixel & Attribution Tracking",
        "actor": "Marketing Specialist",
        "ui": "Marketing Pixel UI",
        "gateway_name": "API Gateway",
        "broker_name": "Kafka Broker",
        "service_name": "User Service",
        "db_name": "MongoDB Database",
        "steps": [
            {"from": "actor", "to": "ui", "text": "Configure Meta Facebook Pixel & TikTok conversion tracking"},
            {"from": "ui", "to": "gateway", "text": "POST /api/marketing/pixels (PixelConfigDto)"},
            {"from": "gateway", "to": "kafka", "text": "emit(\"marketing.pixel.event_fired\", payload)"},
            {"from": "kafka", "to": "service", "text": "Consume topic: marketing.pixel.event_fired"},
            {"from": "service", "to": "db", "text": "Save PixelTrackingConfig & sync server-side CAPI event"},
            {"from": "db", "to": "service", "text": "Pixel configuration updated & active", "is_return": True},
            {"from": "service", "to": "gateway", "text": "Return server-side conversion token", "is_return": True},
            {"from": "gateway", "to": "ui", "text": "HTTP 200 OK (Facebook CAPI Connected)", "is_return": True},
            {"from": "ui", "to": "actor", "text": "Display green active indicator on ad tracking dashboard", "is_return": True}
        ],
        "classes": [
            {
                "name": "PixelConfigDto",
                "type": "DTO",
                "col": 0, "row": 0,
                "attributes": ["pixelType: AdPlatform", "pixelId: String", "apiAccessToken: String", "testEventCode: String"],
                "methods": ["validateToken(): Boolean"]
            },
            {
                "name": "PixelTrackingController",
                "type": "Controller",
                "col": 1, "row": 0,
                "attributes": ["kafkaClient: ClientKafka", "metaCapiClient: MetaConversionClient"],
                "methods": ["savePixelConfig(dto: PixelConfigDto): Promise<any>", "sendServerEvent(event: any): Promise<void>"]
            },
            {
                "name": "PixelTrackingService",
                "type": "Service",
                "col": 2, "row": 0,
                "attributes": ["pixelModel: Model<PixelTrackingConfig>"],
                "methods": ["trackPurchaseEvent(order: Order): Promise<void>", "dispatchConversionApi(payload: any): Promise<void>"]
            },
            {
                "name": "PixelTrackingConfig",
                "type": "Entity",
                "col": 0, "row": 1,
                "attributes": ["_id: ObjectId", "pixelType: String", "pixelId: String", "token: String", "isActive: Boolean", "updatedAt: Date"],
                "methods": ["save(): Promise<PixelTrackingConfig>", "findActiveByType(type: String): Promise<PixelTrackingConfig>"]
            },
            {
                "name": "MongoDB Database",
                "type": "Secondary",
                "col": 1, "row": 1,
                "attributes": ["connection: MongooseConnection"],
                "methods": ["logAttributionEvent(data: any): Promise<void>"]
            }
        ],
        "class_edges": [
            {"from": "PixelConfigDto", "to": "PixelTrackingController", "label": "delivers config"},
            {"from": "PixelTrackingController", "to": "PixelTrackingService", "label": "invokes"},
            {"from": "PixelTrackingService", "to": "PixelTrackingConfig", "label": "persists tokens"},
            {"from": "PixelTrackingService", "to": "MongoDB Database", "label": "logs events"}
        ]
    },
    {
        "id": "UC-102",
        "sprint": 8,
        "title": "Narcotic & Restricted Medicine Compliance Log",
        "title_short": "Restricted Medicine Compliance Log",
        "actor": "Pharmacist",
        "ui": "Controlled Drug Register UI",
        "gateway_name": "API Gateway",
        "broker_name": "Kafka Broker",
        "service_name": "Inventory Service",
        "db_name": "MongoDB Database",
        "steps": [
            {"from": "actor", "to": "ui", "text": "Input patient CCCD & prescriber doctor license for Morphine"},
            {"from": "ui", "to": "gateway", "text": "POST /api/inventory/controlled-drugs (ControlledDrugDto)"},
            {"from": "gateway", "to": "kafka", "text": "emit(\"inventory.controlled_drug.dispensed\", payload)"},
            {"from": "kafka", "to": "service", "text": "Consume topic: inventory.controlled_drug.dispensed"},
            {"from": "service", "to": "db", "text": "Save ControlledDrugLog & enforce Ministry of Health quota check"},
            {"from": "db", "to": "service", "text": "Regulatory compliance record locked with SHA-256", "is_return": True},
            {"from": "service", "to": "gateway", "text": "Publish MOH compliance certificate reference", "is_return": True},
            {"from": "gateway", "to": "ui", "text": "HTTP 201 Created (MOH Registry Logged: REG-9902)", "is_return": True},
            {"from": "ui", "to": "actor", "text": "Print statutory narcotic dispensing ledger certificate", "is_return": True}
        ],
        "classes": [
            {
                "name": "ControlledDrugDto",
                "type": "DTO",
                "col": 0, "row": 0,
                "attributes": ["patientCccd: String", "doctorLicenseNo: String", "hospitalName: String", "medicineId: String", "quantity: Number", "prescriptionDocUrl: String"],
                "methods": ["validateCccd(): Boolean"]
            },
            {
                "name": "ControlledDrugController",
                "type": "Controller",
                "col": 1, "row": 0,
                "attributes": ["kafkaClient: ClientKafka", "auditSvc: AuditLogService"],
                "methods": ["logDispensing(dto: ControlledDrugDto): Promise<any>", "getRegulatoryLedger(period: String): Promise<ControlledDrugLog[]>"]
            },
            {
                "name": "ControlledDrugService",
                "type": "Service",
                "col": 2, "row": 0,
                "attributes": ["controlledDrugModel: Model<ControlledDrugLog>", "quotaModel: Model<MedicineQuota>"],
                "methods": ["validateBranchMonthlyQuota(branchId: String, medId: String, qty: Number): Promise<Boolean>", "recordComplianceLedger(dto: any): Promise<ControlledDrugLog>"]
            },
            {
                "name": "ControlledDrugLog",
                "type": "Entity",
                "col": 0, "row": 1,
                "attributes": ["_id: ObjectId", "patientCccd: String", "doctorLicense: String", "medicineId: String", "dispensedQty: Number", "dispensedBy: String", "digitalSignature: String", "dispensedAt: Date"],
                "methods": ["save(): Promise<ControlledDrugLog>", "exportMohReport(month: String): Promise<any>"]
            },
            {
                "name": "AuditLog",
                "type": "Secondary",
                "col": 1, "row": 1,
                "attributes": ["action: String", "performedBy: String", "details: Object"],
                "methods": ["logSecurityEvent(action: String, payload: any): Promise<void>"]
            }
        ],
        "class_edges": [
            {"from": "ControlledDrugDto", "to": "ControlledDrugController", "label": "delivers compliance DTO"},
            {"from": "ControlledDrugController", "to": "ControlledDrugService", "label": "invokes"},
            {"from": "ControlledDrugService", "to": "ControlledDrugLog", "label": "locks ledger"},
            {"from": "ControlledDrugService", "to": "AuditLog", "label": "creates security audit"}
        ]
    },
    {
        "id": "UC-103",
        "sprint": 8,
        "title": "Supplier GDP Master Contract & Terms",
        "title_short": "Supplier GDP Master Contract",
        "actor": "Procurement Director",
        "ui": "Supplier Contracts UI",
        "gateway_name": "API Gateway",
        "broker_name": "Kafka Broker",
        "service_name": "Supplier Service",
        "db_name": "MongoDB Database",
        "steps": [
            {"from": "actor", "to": "ui", "text": "Create master supply contract with credit term: 45 days, 500M VND limit"},
            {"from": "ui", "to": "gateway", "text": "POST /api/suppliers/:id/contracts (CreateContractDto)"},
            {"from": "gateway", "to": "kafka", "text": "emit(\"supplier.contract.signed\", payload)"},
            {"from": "kafka", "to": "service", "text": "Consume topic: supplier.contract.signed"},
            {"from": "service", "to": "db", "text": "Save SupplierContract & update Supplier creditRating"},
            {"from": "db", "to": "service", "text": "Contract stored with GDP compliance verified", "is_return": True},
            {"from": "service", "to": "gateway", "text": "Return contractCode & effective period", "is_return": True},
            {"from": "gateway", "to": "ui", "text": "HTTP 201 Created {contractCode: 'CTR-GDP-2026-04'}", "is_return": True},
            {"from": "ui", "to": "actor", "text": "Display active contract summary & PDF document viewer", "is_return": True}
        ],
        "classes": [
            {
                "name": "CreateContractDto",
                "type": "DTO",
                "col": 0, "row": 0,
                "attributes": ["supplierId: String", "contractNumber: String", "startDate: Date", "endDate: Date", "creditLimit: Number", "paymentTermDays: Number"],
                "methods": ["validateContractDates(): Boolean"]
            },
            {
                "name": "SupplierContractController",
                "type": "Controller",
                "col": 1, "row": 0,
                "attributes": ["kafkaClient: ClientKafka", "s3ContractStorage: S3Client"],
                "methods": ["createContract(dto: CreateContractDto): Promise<any>", "getContractBySupplier(supId: String): Promise<SupplierContract>"]
            },
            {
                "name": "SupplierContractService",
                "type": "Service",
                "col": 2, "row": 0,
                "attributes": ["contractModel: Model<SupplierContract>", "supplierModel: Model<Supplier>"],
                "methods": ["registerContract(dto: any): Promise<SupplierContract>", "checkContractExpiry(): Promise<void>"]
            },
            {
                "name": "SupplierContract",
                "type": "Entity",
                "col": 0, "row": 1,
                "attributes": ["_id: ObjectId", "contractNumber: String", "supplierId: String", "creditLimit: Number", "paymentTermDays: Number", "pdfUrl: String", "status: ContractStatus", "signedAt: Date"],
                "methods": ["save(): Promise<SupplierContract>", "findActiveBySupplier(sId: String): Promise<SupplierContract>"]
            },
            {
                "name": "MongoDB Database",
                "type": "Secondary",
                "col": 1, "row": 1,
                "attributes": ["connection: MongooseConnection"],
                "methods": ["updateSupplierCreditTerms(sId: String, limit: Number): Promise<void>"]
            }
        ],
        "class_edges": [
            {"from": "CreateContractDto", "to": "SupplierContractController", "label": "passes terms"},
            {"from": "SupplierContractController", "to": "SupplierContractService", "label": "invokes"},
            {"from": "SupplierContractService", "to": "SupplierContract", "label": "persists contract"},
            {"from": "SupplierContractService", "to": "MongoDB Database", "label": "updates credit terms"}
        ]
    },
    {
        "id": "UC-104",
        "sprint": 8,
        "title": "Supplier Payment Voucher Settlement",
        "title_short": "Supplier Payment Voucher",
        "actor": "Chief Accountant",
        "ui": "Payment Voucher UI",
        "gateway_name": "API Gateway",
        "broker_name": "Kafka Broker",
        "service_name": "Finance Service",
        "db_name": "MongoDB Database",
        "steps": [
            {"from": "actor", "to": "ui", "text": "Approve bank transfer voucher for PO invoice settlement"},
            {"from": "ui", "to": "gateway", "text": "POST /api/finance/supplier-payments (PaymentVoucherDto)"},
            {"from": "gateway", "to": "kafka", "text": "emit(\"finance.supplier_payment.settled\", payload)"},
            {"from": "kafka", "to": "service", "text": "Consume topic: finance.supplier_payment.settled"},
            {"from": "service", "to": "db", "text": "Save SupplierPaymentVoucher & update PurchaseOrder paymentStatus=PAID"},
            {"from": "db", "to": "service", "text": "Voucher settled & PO account payable reconciled", "is_return": True},
            {"from": "service", "to": "gateway", "text": "Return voucherCode & remaining credit balance", "is_return": True},
            {"from": "gateway", "to": "ui", "text": "HTTP 200 OK (Settled: 45,000,000 VND)", "is_return": True},
            {"from": "ui", "to": "actor", "text": "Print bank payment remittance order & update payable aging", "is_return": True}
        ],
        "classes": [
            {
                "name": "PaymentVoucherDto",
                "type": "DTO",
                "col": 0, "row": 0,
                "attributes": ["poId: String", "supplierId: String", "settlementAmount: Number", "bankReferenceNo: String", "paymentDate: Date"],
                "methods": ["validateAmount(): Boolean"]
            },
            {
                "name": "PaymentVoucherController",
                "type": "Controller",
                "col": 1, "row": 0,
                "attributes": ["kafkaClient: ClientKafka", "bankIntegrationSvc: BankApiClient"],
                "methods": ["settlePayment(dto: PaymentVoucherDto): Promise<any>", "getVouchersByPo(poId: String): Promise<SupplierPaymentVoucher[]>"]
            },
            {
                "name": "PaymentVoucherService",
                "type": "Service",
                "col": 2, "row": 0,
                "attributes": ["voucherModel: Model<SupplierPaymentVoucher>", "poModel: Model<PurchaseOrder>"],
                "methods": ["createSettlementVoucher(dto: any): Promise<SupplierPaymentVoucher>", "updatePoPaymentStatus(poId: String): Promise<void>"]
            },
            {
                "name": "SupplierPaymentVoucher",
                "type": "Entity",
                "col": 0, "row": 1,
                "attributes": ["_id: ObjectId", "voucherCode: String", "poId: String", "supplierId: String", "amount: Number", "bankRef: String", "approvedBy: String", "settledAt: Date"],
                "methods": ["save(): Promise<SupplierPaymentVoucher>", "findByPo(poId: String): Promise<SupplierPaymentVoucher[]>"]
            },
            {
                "name": "SupplierService",
                "type": "Secondary",
                "col": 1, "row": 1,
                "attributes": ["supplierModel: Model<Supplier>"],
                "methods": ["adjustPayableBalance(supplierId: String, delta: Number): Promise<void>"]
            }
        ],
        "class_edges": [
            {"from": "PaymentVoucherDto", "to": "PaymentVoucherController", "label": "delivers voucher"},
            {"from": "PaymentVoucherController", "to": "PaymentVoucherService", "label": "invokes"},
            {"from": "PaymentVoucherService", "to": "SupplierPaymentVoucher", "label": "persists voucher"},
            {"from": "PaymentVoucherService", "to": "SupplierService", "label": "updates payable balance"}
        ]
    },
    {
        "id": "UC-105",
        "sprint": 8,
        "title": "AI Supply Chain Disruption & Delay Risk Forecast",
        "title_short": "Supply Chain Risk Forecast",
        "actor": "Supply Chain Director",
        "ui": "Supply Chain Risk Dashboard UI",
        "gateway_name": "API Gateway",
        "broker_name": "Kafka Broker",
        "service_name": "AI Service",
        "db_name": "MongoDB Database",
        "steps": [
            {"from": "actor", "to": "ui", "text": "View geopolitical & supplier lead time disruption risk report"},
            {"from": "ui", "to": "gateway", "text": "GET /api/reports/supply-chain-risk?category=Antibiotics"},
            {"from": "gateway", "to": "kafka", "text": "send(\"ai.supply_chain.risk_predicted\", category)"},
            {"from": "kafka", "to": "service", "text": "Consume topic: ai.supply_chain.risk_predicted"},
            {"from": "service", "to": "db", "text": "Execute risk prediction model & fetch SupplyChainRiskAssessment"},
            {"from": "db", "to": "service", "text": "Return delay risk probability & backup GDP suppliers", "is_return": True},
            {"from": "service", "to": "gateway", "text": "Publish risk matrix with mitigation recommendations", "is_return": True},
            {"from": "gateway", "to": "ui", "text": "HTTP 200 OK (Risk Level: HIGH - Expected delay: +14 days)", "is_return": True},
            {"from": "ui", "to": "actor", "text": "Render supply chain risk heat map & 'Route to Backup Supplier' button", "is_return": True}
        ],
        "classes": [
            {
                "name": "SupplyRiskQueryDto",
                "type": "DTO",
                "col": 0, "row": 0,
                "attributes": ["category: String", "originCountry: String", "horizonMonths: Number"],
                "methods": ["validateCategory(): Boolean"]
            },
            {
                "name": "SupplyChainRiskController",
                "type": "Controller",
                "col": 1, "row": 0,
                "attributes": ["kafkaClient: ClientKafka", "cacheManager: Cache"],
                "methods": ["getRiskAssessment(dto: SupplyRiskQueryDto): Promise<any>"]
            },
            {
                "name": "SupplyChainRiskService",
                "type": "Service",
                "col": 2, "row": 0,
                "attributes": ["riskModel: Model<SupplyChainRiskAssessment>", "supplierModel: Model<Supplier>"],
                "methods": ["runRiskPredictionEngine(): Promise<void>", "recommendAlternativeSuppliers(medId: String): Promise<Supplier[]>"]
            },
            {
                "name": "SupplyChainRiskAssessment",
                "type": "Entity",
                "col": 0, "row": 1,
                "attributes": ["_id: ObjectId", "category: String", "leadTimeDelayDays: Number", "riskScore: Number", "riskLevel: RiskLevel", "recommendedSuppliers: String[]", "evaluatedAt: Date"],
                "methods": ["save(): Promise<SupplyChainRiskAssessment>", "findByCategory(cat: String): Promise<SupplyChainRiskAssessment>"]
            },
            {
                "name": "SupplierService",
                "type": "Secondary",
                "col": 1, "row": 1,
                "attributes": ["supplierModel: Model<Supplier>"],
                "methods": ["getQualifiedGdpSuppliers(category: String): Promise<Supplier[]>"]
            }
        ],
        "class_edges": [
            {"from": "SupplyRiskQueryDto", "to": "SupplyChainRiskController", "label": "passes query"},
            {"from": "SupplyChainRiskController", "to": "SupplyChainRiskService", "label": "invokes"},
            {"from": "SupplyChainRiskService", "to": "SupplyChainRiskAssessment", "label": "persists assessment"},
            {"from": "SupplyChainRiskService", "to": "SupplierService", "label": "queries backup suppliers"}
        ]
    },
    {
        "id": "UC-106",
        "sprint": 8,
        "title": "Digital Health Passport & Electronic Health Record",
        "title_short": "Digital Health Passport EHR",
        "actor": "Customer",
        "ui": "Digital Health Passport UI",
        "gateway_name": "API Gateway",
        "broker_name": "Kafka Broker",
        "service_name": "User Service",
        "db_name": "MongoDB Database",
        "steps": [
            {"from": "actor", "to": "ui", "text": "Display digital QR medical passport with allergies & chronic diseases"},
            {"from": "ui", "to": "gateway", "text": "GET /api/users/health-passport (AuthorizedJwt)"},
            {"from": "gateway", "to": "kafka", "text": "send(\"user.health_passport.get\", userId)"},
            {"from": "kafka", "to": "service", "text": "Consume topic: user.health_passport.get"},
            {"from": "service", "to": "db", "text": "Query DigitalHealthPassport & vaccination records"},
            {"from": "db", "to": "service", "text": "Return encrypted EHR medical profile", "is_return": True},
            {"from": "service", "to": "gateway", "text": "Publish signed Health Passport payload", "is_return": True},
            {"from": "gateway", "to": "ui", "text": "HTTP 200 OK (BloodType: O+, Allergies: Penicillin, QR Key)", "is_return": True},
            {"from": "ui", "to": "actor", "text": "Render dynamic offline-capable Health QR code & medical badges", "is_return": True}
        ],
        "classes": [
            {
                "name": "HealthPassportDto",
                "type": "DTO",
                "col": 0, "row": 0,
                "attributes": ["customerId: String", "bloodType: String", "chronicDiseases: String[]", "drugAllergies: String[]", "emergencyContactPhone: String"],
                "methods": ["getMaskedData(): Object"]
            },
            {
                "name": "HealthPassportController",
                "type": "Controller",
                "col": 1, "row": 0,
                "attributes": ["kafkaClient: ClientKafka", "cryptoService: CryptoService"],
                "methods": ["getHealthPassport(userId: String): Promise<HealthPassportDto>", "updatePassport(dto: HealthPassportDto): Promise<any>"]
            },
            {
                "name": "HealthPassportService",
                "type": "Service",
                "col": 2, "row": 0,
                "attributes": ["passportModel: Model<DigitalHealthPassport>", "prescriptionModel: Model<Prescription>"],
                "methods": ["generateSignedQr(passportId: String): String", "syncPrescriptionHistory(customerId: String): Promise<void>"]
            },
            {
                "name": "DigitalHealthPassport",
                "type": "Entity",
                "col": 0, "row": 1,
                "attributes": ["_id: ObjectId", "customerId: String", "bloodType: String", "chronicDiseases: String[]", "allergies: String[]", "qrPayload: String", "updatedAt: Date"],
                "methods": ["save(): Promise<DigitalHealthPassport>", "findByCustomer(cId: String): Promise<DigitalHealthPassport>"]
            },
            {
                "name": "MongoDB Database",
                "type": "Secondary",
                "col": 1, "row": 1,
                "attributes": ["connection: MongooseConnection"],
                "methods": ["storeEncryptedEhr(data: any): Promise<void>"]
            }
        ],
        "class_edges": [
            {"from": "HealthPassportDto", "to": "HealthPassportController", "label": "delivers EHR"},
            {"from": "HealthPassportController", "to": "HealthPassportService", "label": "invokes"},
            {"from": "HealthPassportService", "to": "DigitalHealthPassport", "label": "persists profile"},
            {"from": "HealthPassportService", "to": "MongoDB Database", "label": "encrypts sensitive records"}
        ]
    },
    {
        "id": "UC-107",
        "sprint": 8,
        "title": "AI Allergy & Contraindication Cross-check",
        "title_short": "Allergy & Contraindication Check",
        "actor": "Pharmacist",
        "ui": "Contraindication Modal UI",
        "gateway_name": "API Gateway",
        "broker_name": "Kafka Broker",
        "service_name": "AI Service",
        "db_name": "MongoDB Database",
        "steps": [
            {"from": "actor", "to": "ui", "text": "Add drug to POS cart for patient with Penicillin allergy history"},
            {"from": "ui", "to": "gateway", "text": "POST /api/prescriptions/allergy-check (AllergyCheckDto)"},
            {"from": "gateway", "to": "kafka", "text": "send(\"ai.contraindication.alert\", payload)"},
            {"from": "kafka", "to": "service", "text": "Consume topic: ai.contraindication.alert"},
            {"from": "service", "to": "db", "text": "Cross-check drug active ingredients with patient allergy registry"},
            {"from": "db", "to": "service", "text": "Severe allergic cross-reactivity detected (Amoxicillin)", "is_return": True},
            {"from": "service", "to": "gateway", "text": "Publish high-severity allergy warning with safe substitute", "is_return": True},
            {"from": "gateway", "to": "ui", "text": "HTTP 200 OK (CRITICAL: Severe Anaphylaxis Risk - Replace with Azithromycin)", "is_return": True},
            {"from": "ui", "to": "actor", "text": "Display full-screen red warning modal & require pharmacist override pin", "is_return": True}
        ],
        "classes": [
            {
                "name": "AllergyCheckDto",
                "type": "DTO",
                "col": 0, "row": 0,
                "attributes": ["patientId: String", "prescribedMedicineIds: String[]", "dosage: String"],
                "methods": ["hasPrescriptions(): Boolean"]
            },
            {
                "name": "AllergyCheckController",
                "type": "Controller",
                "col": 1, "row": 0,
                "attributes": ["kafkaClient: ClientKafka", "cacheManager: Cache"],
                "methods": ["verifyContraindications(dto: AllergyCheckDto): Promise<ContraindicationAlert>"]
            },
            {
                "name": "ContraindicationService",
                "type": "Service",
                "col": 2, "row": 0,
                "attributes": ["drugKnowledgeModel: Model<DrugInteractionKnowledge>", "passportModel: Model<DigitalHealthPassport>"],
                "methods": ["detectCrossReactivity(allergies: String[], drugs: String[]): Promise<Alert[]>", "suggestSafeAlternatives(ingredient: String): Promise<Medicine[]>"]
            },
            {
                "name": "ContraindicationAlert",
                "type": "Entity",
                "col": 0, "row": 1,
                "attributes": ["_id: ObjectId", "patientId: String", "medicineId: String", "conflictType: String", "severity: SeverityLevel", "warningMessage: String", "flaggedAt: Date"],
                "methods": ["save(): Promise<ContraindicationAlert>"]
            },
            {
                "name": "OrdersService",
                "type": "Secondary",
                "col": 1, "row": 1,
                "attributes": ["cartModel: Model<Cart>"],
                "methods": ["blockCartCheckoutUntilOverride(cartId: String): Promise<void>"]
            }
        ],
        "class_edges": [
            {"from": "AllergyCheckDto", "to": "AllergyCheckController", "label": "passes cart drugs"},
            {"from": "AllergyCheckController", "to": "ContraindicationService", "label": "invokes check"},
            {"from": "ContraindicationService", "to": "ContraindicationAlert", "label": "persists alert"},
            {"from": "ContraindicationService", "to": "OrdersService", "label": "locks cart checkout"}
        ]
    },
    {
        "id": "UC-108",
        "sprint": 8,
        "title": "Prescription Adherence Tracking & Physician Report",
        "title_short": "Prescription Adherence Tracking",
        "actor": "Customer",
        "ui": "Medication Reminder UI",
        "gateway_name": "API Gateway",
        "broker_name": "Kafka Broker",
        "service_name": "Orders Service",
        "db_name": "MongoDB Database",
        "steps": [
            {"from": "actor", "to": "ui", "text": "Mark daily noon dose as 'Taken' & view 14-day compliance score"},
            {"from": "ui", "to": "gateway", "text": "POST /api/prescriptions/adherence-report/dose-taken (DoseLogDto)"},
            {"from": "gateway", "to": "kafka", "text": "emit(\"prescription.adherence.recorded\", payload)"},
            {"from": "kafka", "to": "service", "text": "Consume topic: prescription.adherence.recorded"},
            {"from": "service", "to": "db", "text": "Log dose timestamp in MedicationAdherence & recalculate adherenceRate (94%)"},
            {"from": "db", "to": "service", "text": "Adherence logged & score updated OK", "is_return": True},
            {"from": "service", "to": "gateway", "text": "Generate physician treatment summary PDF link", "is_return": True},
            {"from": "gateway", "to": "ui", "text": "HTTP 200 OK (Adherence: 94% - EXCELLENT)", "is_return": True},
            {"from": "ui", "to": "actor", "text": "Show progress streak (14 days) & 'Share with Doctor' button", "is_return": True}
        ],
        "classes": [
            {
                "name": "DoseLogDto",
                "type": "DTO",
                "col": 0, "row": 0,
                "attributes": ["prescriptionId: String", "scheduledDoseTime: Date", "actualTakenTime: Date", "isTaken: Boolean"],
                "methods": ["isLate(): Boolean"]
            },
            {
                "name": "AdherenceController",
                "type": "Controller",
                "col": 1, "row": 0,
                "attributes": ["kafkaClient: ClientKafka", "emailService: SqsEmailService"],
                "methods": ["logDose(dto: DoseLogDto): Promise<any>", "exportPhysicianReport(prescriptionId: String): Promise<Stream>"]
            },
            {
                "name": "AdherenceService",
                "type": "Service",
                "col": 2, "row": 0,
                "attributes": ["adherenceModel: Model<MedicationAdherence>", "prescriptionModel: Model<Prescription>"],
                "methods": ["recordTakenDose(dto: any): Promise<MedicationAdherence>", "calculateAdherenceScore(prescriptionId: String): Number"]
            },
            {
                "name": "MedicationAdherence",
                "type": "Entity",
                "col": 0, "row": 1,
                "attributes": ["_id: ObjectId", "prescriptionId: String", "customerId: String", "totalDoses: Number", "takenDoses: Number", "adherenceRate: Number", "lastTakenAt: Date"],
                "methods": ["save(): Promise<MedicationAdherence>", "findByPrescription(pId: String): Promise<MedicationAdherence>"]
            },
            {
                "name": "UserService",
                "type": "Secondary",
                "col": 1, "row": 1,
                "attributes": ["userModel: Model<User>"],
                "methods": ["rewardStreakPoints(userId: String, streakDays: Number): Promise<void>"]
            }
        ],
        "class_edges": [
            {"from": "DoseLogDto", "to": "AdherenceController", "label": "delivers dose log"},
            {"from": "AdherenceController", "to": "AdherenceService", "label": "invokes"},
            {"from": "AdherenceService", "to": "MedicationAdherence", "label": "persists adherence"},
            {"from": "AdherenceService", "to": "UserService", "label": "rewards streak points"}
        ]
    },
    {
        "id": "UC-109",
        "sprint": 8,
        "title": "Multilingual AI Voice Commerce & Ordering",
        "title_short": "Multilingual AI Voice Commerce",
        "actor": "Customer",
        "ui": "Voice Commerce Assistant UI",
        "gateway_name": "API Gateway",
        "broker_name": "Kafka Broker",
        "service_name": "AI Service",
        "db_name": "MongoDB Database",
        "steps": [
            {"from": "actor", "to": "ui", "text": "Speak in English: 'Order two boxes of Strepsils Honey Lemon'"},
            {"from": "ui", "to": "gateway", "text": "POST /api/orders/voice-commerce (VoiceOrderDto)"},
            {"from": "gateway", "to": "kafka", "text": "send(\"ai.voice.order_transcribed\", audioPayload)"},
            {"from": "kafka", "to": "service", "text": "Consume topic: ai.voice.order_transcribed"},
            {"from": "service", "to": "db", "text": "Parse intent with NLP, resolve SKU & create VoiceCommerceOrder"},
            {"from": "db", "to": "service", "text": "Intent parsed (Item: Strepsils, Qty: 2) & cart updated", "is_return": True},
            {"from": "service", "to": "gateway", "text": "Publish voice order confirmation & VietQR checkout link", "is_return": True},
            {"from": "gateway", "to": "ui", "text": "HTTP 200 OK (2x Strepsils added to cart, Total: 76,000 VND)", "is_return": True},
            {"from": "ui", "to": "actor", "text": "Play voice confirmation response & pop up 1-tap PayOS QR", "is_return": True}
        ],
        "classes": [
            {
                "name": "VoiceOrderDto",
                "type": "DTO",
                "col": 0, "row": 0,
                "attributes": ["customerId: String", "audioBase64: String", "detectedLocale: String", "branchId: String"],
                "methods": ["validateAudioStream(): Boolean"]
            },
            {
                "name": "VoiceCommerceController",
                "type": "Controller",
                "col": 1, "row": 0,
                "attributes": ["kafkaClient: ClientKafka", "aiFastApiClient: HttpService"],
                "methods": ["processVoiceOrder(dto: VoiceOrderDto): Promise<any>"]
            },
            {
                "name": "VoiceCommerceService",
                "type": "Service",
                "col": 2, "row": 0,
                "attributes": ["voiceOrderModel: Model<VoiceCommerceOrder>", "catalogService: InventoryService"],
                "methods": ["parseSpokenEntities(transcript: String, locale: String): Promise<OrderItem[]>", "autoPopulateCart(userId: String, items: any[]): Promise<Cart>"]
            },
            {
                "name": "VoiceCommerceOrder",
                "type": "Entity",
                "col": 0, "row": 1,
                "attributes": ["_id: ObjectId", "customerId: String", "transcript: String", "detectedLanguage: String", "orderedItems: Object[]", "confidence: Number", "createdAt: Date"],
                "methods": ["save(): Promise<VoiceCommerceOrder>"]
            },
            {
                "name": "OrdersService",
                "type": "Secondary",
                "col": 1, "row": 1,
                "attributes": ["cartModel: Model<Cart>"],
                "methods": ["syncVoiceItemsToCart(userId: String, items: any[]): Promise<void>"]
            }
        ],
        "class_edges": [
            {"from": "VoiceOrderDto", "to": "VoiceCommerceController", "label": "submits voice audio"},
            {"from": "VoiceCommerceController", "to": "VoiceCommerceService", "label": "invokes NLP"},
            {"from": "VoiceCommerceService", "to": "VoiceCommerceOrder", "label": "persists voice order"},
            {"from": "VoiceCommerceService", "to": "OrdersService", "label": "adds to shopping cart"}
        ]
    },
    {
        "id": "UC-110",
        "sprint": 8,
        "title": "AI Best Procurement Price & Supplier Routing",
        "title_short": "AI Best Procurement Price Routing",
        "actor": "Procurement Specialist",
        "ui": "Supplier Routing UI",
        "gateway_name": "API Gateway",
        "broker_name": "Kafka Broker",
        "service_name": "AI Service",
        "db_name": "MongoDB Database",
        "steps": [
            {"from": "actor", "to": "ui", "text": "Request AI supplier routing for replenishment of 200 boxes Paracetamol"},
            {"from": "ui", "to": "gateway", "text": "POST /api/procurement/ai-best-route (RouteQueryDto)"},
            {"from": "gateway", "to": "kafka", "text": "send(\"ai.procurement.best_price_routed\", payload)"},
            {"from": "kafka", "to": "service", "text": "Consume topic: ai.procurement.best_price_routed"},
            {"from": "service", "to": "db", "text": "Analyze price history, GDP rating & delivery lead times across all suppliers"},
            {"from": "db", "to": "service", "text": "Optimal supplier ranked: Sanofi Vietnam (Lowest cost, 99% on-time)", "is_return": True},
            {"from": "service", "to": "gateway", "text": "Publish supplier ranking matrix & auto-draft PO", "is_return": True},
            {"from": "gateway", "to": "ui", "text": "HTTP 200 OK (Recommended: Sanofi @ 32,000 VND - Save 8%)", "is_return": True},
            {"from": "ui", "to": "actor", "text": "Render supplier comparison table & 'One-Click Create PO' button", "is_return": True}
        ],
        "classes": [
            {
                "name": "RouteQueryDto",
                "type": "DTO",
                "col": 0, "row": 0,
                "attributes": ["medicineId: String", "requiredQuantity: Number", "maxLeadTimeDays: Number", "preferredPaymentTerm: Number"],
                "methods": ["validateQuantity(): Boolean"]
            },
            {
                "name": "SupplierRoutingController",
                "type": "Controller",
                "col": 1, "row": 0,
                "attributes": ["kafkaClient: ClientKafka", "cacheManager: Cache"],
                "methods": ["getBestSupplierRoute(dto: RouteQueryDto): Promise<SupplierPriceRanking>"]
            },
            {
                "name": "SupplierRoutingService",
                "type": "Service",
                "col": 2, "row": 0,
                "attributes": ["rankingModel: Model<SupplierPriceRanking>", "supplierModel: Model<Supplier>"],
                "methods": ["rankSuppliersByTco(medId: String, qty: Number): Promise<RankedSupplier[]>", "autoDraftPurchaseOrder(supplierId: String, items: any[]): Promise<PurchaseOrder>"]
            },
            {
                "name": "SupplierPriceRanking",
                "type": "Entity",
                "col": 0, "row": 1,
                "attributes": ["_id: ObjectId", "medicineId: String", "recommendedSupplierId: String", "quotedUnitPrice: Number", "leadTimeDays: Number", "reliabilityScore: Number", "routedAt: Date"],
                "methods": ["save(): Promise<SupplierPriceRanking>"]
            },
            {
                "name": "SupplierService",
                "type": "Secondary",
                "col": 1, "row": 1,
                "attributes": ["poModel: Model<PurchaseOrder>"],
                "methods": ["createDraftPo(poData: any): Promise<PurchaseOrder>"]
            }
        ],
        "class_edges": [
            {"from": "RouteQueryDto", "to": "SupplierRoutingController", "label": "submits criteria"},
            {"from": "SupplierRoutingController", "to": "SupplierRoutingService", "label": "invokes"},
            {"from": "SupplierRoutingService", "to": "SupplierPriceRanking", "label": "persists ranking"},
            {"from": "SupplierRoutingService", "to": "SupplierService", "label": "creates draft PO"}
        ]
    },
    {
        "id": "UC-111",
        "sprint": 8,
        "title": "Pharmacist Sales KPI & Target Tracking",
        "title_short": "Pharmacist Sales KPI Tracking",
        "actor": "Branch Manager",
        "ui": "Staff KPI Dashboard UI",
        "gateway_name": "API Gateway",
        "broker_name": "Kafka Broker",
        "service_name": "Reports Service",
        "db_name": "MongoDB Database",
        "steps": [
            {"from": "actor", "to": "ui", "text": "View monthly sales target vs actual performance for pharmacist team"},
            {"from": "ui", "to": "gateway", "text": "GET /api/reports/pharmacist-kpi?branchId=B1&month=2026-10"},
            {"from": "gateway", "to": "kafka", "text": "send(\"reports.kpi.recalculated\", queryParams)"},
            {"from": "kafka", "to": "service", "text": "Consume topic: reports.kpi.recalculated"},
            {"from": "service", "to": "db", "text": "Aggregate individual sales order totals & prescription verification counts"},
            {"from": "db", "to": "service", "text": "Return KPI completion percentage & commission bonus", "is_return": True},
            {"from": "service", "to": "gateway", "text": "Publish pharmacist leaderboard summary", "is_return": True},
            {"from": "gateway", "to": "ui", "text": "HTTP 200 OK (Target: 120M, Achieved: 135M - 112%)", "is_return": True},
            {"from": "ui", "to": "actor", "text": "Render branch sales leaderboard & individual achievement badges", "is_return": True}
        ],
        "classes": [
            {
                "name": "PharmacistKpiDto",
                "type": "DTO",
                "col": 0, "row": 0,
                "attributes": ["pharmacistId: String", "month: String", "targetSales: Number", "actualSales: Number", "targetPrescriptions: Number", "actualPrescriptions: Number"],
                "methods": ["getAchievementRate(): Number"]
            },
            {
                "name": "PharmacistKpiController",
                "type": "Controller",
                "col": 1, "row": 0,
                "attributes": ["kafkaClient: ClientKafka", "cacheManager: Cache"],
                "methods": ["getKpiLeaderboard(branchId: String, month: String): Promise<PharmacistKpiDto[]>"]
            },
            {
                "name": "PharmacistKpiService",
                "type": "Service",
                "col": 2, "row": 0,
                "attributes": ["kpiModel: Model<PharmacistKpiRecord>", "orderModel: Model<SalesOrder>"],
                "methods": ["aggregateMonthlyKpi(branchId: String, month: String): Promise<PharmacistKpiRecord[]>", "computeCommissionBonus(achievedRate: Number): Number"]
            },
            {
                "name": "PharmacistKpiRecord",
                "type": "Entity",
                "col": 0, "row": 1,
                "attributes": ["_id: ObjectId", "pharmacistId: String", "branchId: String", "month: String", "actualRevenue: Number", "verifiedPrescriptionsCount: Number", "kpiScore: Number", "bonus: Number"],
                "methods": ["save(): Promise<PharmacistKpiRecord>", "findByMonth(month: String): Promise<PharmacistKpiRecord[]>"]
            },
            {
                "name": "UserService",
                "type": "Secondary",
                "col": 1, "row": 1,
                "attributes": ["userModel: Model<User>"],
                "methods": ["getPharmacistDetails(ids: String[]): Promise<User[]>"]
            }
        ],
        "class_edges": [
            {"from": "PharmacistKpiDto", "to": "PharmacistKpiController", "label": "delivers report"},
            {"from": "PharmacistKpiController", "to": "PharmacistKpiService", "label": "invokes"},
            {"from": "PharmacistKpiService", "to": "PharmacistKpiRecord", "label": "persists KPI"},
            {"from": "PharmacistKpiService", "to": "UserService", "label": "enriches staff details"}
        ]
    },
    {
        "id": "UC-112",
        "sprint": 8,
        "title": "Disaster Recovery Backup & Manual Restore Log",
        "title_short": "Disaster Recovery Backup & Restore",
        "actor": "DevOps Engineer",
        "ui": "Backup Governance UI",
        "gateway_name": "API Gateway",
        "broker_name": "Kafka Broker",
        "service_name": "User Service",
        "db_name": "MongoDB Database",
        "steps": [
            {"from": "actor", "to": "ui", "text": "Trigger manual full database backup before major software deployment"},
            {"from": "ui", "to": "gateway", "text": "POST /api/admin/backups/trigger (TriggerBackupDto)"},
            {"from": "gateway", "to": "kafka", "text": "emit(\"system.backup.initiated\", payload)"},
            {"from": "kafka", "to": "service", "text": "Consume topic: system.backup.initiated"},
            {"from": "service", "to": "db", "text": "Execute mongodump, gzip archive, compute SHA-256 & push to AWS S3 Glacier"},
            {"from": "db", "to": "service", "text": "Dump created (1.2 GB), checksum verified OK", "is_return": True},
            {"from": "service", "to": "gateway", "text": "Return backupId, S3 key & checksum", "is_return": True},
            {"from": "gateway", "to": "ui", "text": "HTTP 202 Accepted {backupId: 'BKP-20261001', size: '1.2 GB'}", "is_return": True},
            {"from": "ui", "to": "actor", "text": "Show backup completion toast with downloadable recovery audit log", "is_return": True}
        ],
        "classes": [
            {
                "name": "TriggerBackupDto",
                "type": "DTO",
                "col": 0, "row": 0,
                "attributes": ["backupType: BackupType", "targetStorage: String", "operatorNote: String"],
                "methods": ["validateStorage(): Boolean"]
            },
            {
                "name": "BackupController",
                "type": "Controller",
                "col": 1, "row": 0,
                "attributes": ["kafkaClient: ClientKafka", "auditSvc: AuditLogService"],
                "methods": ["triggerManualBackup(dto: TriggerBackupDto): Promise<any>", "listBackups(): Promise<BackupRestoreAudit[]>"]
            },
            {
                "name": "BackupService",
                "type": "Service",
                "col": 2, "row": 0,
                "attributes": ["backupModel: Model<BackupRestoreAudit>", "s3BackupClient: S3Client"],
                "methods": ["executeMongoDump(): Promise<String>", "uploadToGlacier(filePath: String): Promise<String>"]
            },
            {
                "name": "BackupRestoreAudit",
                "type": "Entity",
                "col": 0, "row": 1,
                "attributes": ["_id: ObjectId", "backupId: String", "fileSizeBytes: Number", "s3Path: String", "sha256Checksum: String", "performedBy: String", "status: BackupStatus", "createdAt: Date"],
                "methods": ["save(): Promise<BackupRestoreAudit>", "findLatest(): Promise<BackupRestoreAudit>"]
            },
            {
                "name": "AuditLog",
                "type": "Secondary",
                "col": 1, "row": 1,
                "attributes": ["action: String", "timestamp: Date"],
                "methods": ["recordDisasterRecoveryAction(data: any): Promise<void>"]
            }
        ],
        "class_edges": [
            {"from": "TriggerBackupDto", "to": "BackupController", "label": "initiates backup"},
            {"from": "BackupController", "to": "BackupService", "label": "invokes"},
            {"from": "BackupService", "to": "BackupRestoreAudit", "label": "persists backup log"},
            {"from": "BackupService", "to": "AuditLog", "label": "creates compliance entry"}
        ]
    },
    {
        "id": "UC-113",
        "sprint": 8,
        "title": "Biometric Mobile Authentication FaceID/Fingerprint",
        "title_short": "Biometric Mobile Authentication",
        "actor": "Customer",
        "ui": "Mobile Biometric Login UI",
        "gateway_name": "API Gateway",
        "broker_name": "Kafka Broker",
        "service_name": "Auth Service",
        "db_name": "MongoDB Database",
        "steps": [
            {"from": "actor", "to": "ui", "text": "Authenticate with FaceID / TouchID biometric prompt"},
            {"from": "ui", "to": "gateway", "text": "POST /api/auth/biometric-verify (BiometricSignatureDto)"},
            {"from": "gateway", "to": "kafka", "text": "send(\"auth.event.biometric_authenticated\", payload)"},
            {"from": "kafka", "to": "service", "text": "Consume topic: auth.event.biometric_authenticated"},
            {"from": "service", "to": "db", "text": "Verify cryptographic signature against BiometricCredential public key"},
            {"from": "db", "to": "service", "text": "Key verified & user account ACTIVE", "is_return": True},
            {"from": "service", "to": "gateway", "text": "Generate JWT AccessToken & RefreshToken pair", "is_return": True},
            {"from": "gateway", "to": "ui", "text": "HTTP 200 OK (AccessToken, UserProfile)", "is_return": True},
            {"from": "ui", "to": "actor", "text": "Instant unlock to mobile home screen without entering password", "is_return": True}
        ],
        "classes": [
            {
                "name": "BiometricSignatureDto",
                "type": "DTO",
                "col": 0, "row": 0,
                "attributes": ["deviceId: String", "biometricSignature: String", "clientChallenge: String", "biometricType: BioType"],
                "methods": ["validateSignatureFormat(): Boolean"]
            },
            {
                "name": "BiometricAuthController",
                "type": "Controller",
                "col": 1, "row": 0,
                "attributes": ["kafkaClient: ClientKafka", "jwtService: JwtService"],
                "methods": ["verifyBiometric(dto: BiometricSignatureDto): Promise<AuthTokens>", "registerBiometricKey(dto: RegisterBioDto): Promise<any>"]
            },
            {
                "name": "BiometricAuthService",
                "type": "Service",
                "col": 2, "row": 0,
                "attributes": ["credentialModel: Model<BiometricCredential>", "cryptoService: AsymmetricCryptoService"],
                "methods": ["verifyClientSignature(publicKey: String, sig: String, challenge: String): Boolean", "issueSessionTokens(userId: String): Promise<AuthTokens>"]
            },
            {
                "name": "BiometricCredential",
                "type": "Entity",
                "col": 0, "row": 1,
                "attributes": ["_id: ObjectId", "userId: String", "deviceId: String", "publicKeyPem: String", "biometricType: String", "lastAuthenticatedAt: Date", "createdAt: Date"],
                "methods": ["save(): Promise<BiometricCredential>", "findByDevice(dId: String): Promise<BiometricCredential>"]
            },
            {
                "name": "UserService",
                "type": "Secondary",
                "col": 1, "row": 1,
                "attributes": ["userModel: Model<User>"],
                "methods": ["getUserProfile(userId: String): Promise<User>"]
            }
        ],
        "class_edges": [
            {"from": "BiometricSignatureDto", "to": "BiometricAuthController", "label": "delivers signature"},
            {"from": "BiometricAuthController", "to": "BiometricAuthService", "label": "invokes verification"},
            {"from": "BiometricAuthService", "to": "BiometricCredential", "label": "queries public key"},
            {"from": "BiometricAuthService", "to": "UserService", "label": "loads user profile"}
        ]
    },
    {
        "id": "UC-114",
        "sprint": 8,
        "title": "IoT Device Management & Sensor Calibration",
        "title_short": "IoT Device & Sensor Calibration",
        "actor": "IoT Technician",
        "ui": "IoT Fleet Calibration UI",
        "gateway_name": "API Gateway",
        "broker_name": "Kafka Broker",
        "service_name": "Inventory Service",
        "db_name": "MongoDB Database",
        "steps": [
            {"from": "actor", "to": "ui", "text": "Set calibration temperature offset (+0.3C) & schedule next due date"},
            {"from": "ui", "to": "gateway", "text": "POST /api/sensors/calibration (CalibrateSensorDto)"},
            {"from": "gateway", "to": "kafka", "text": "emit(\"sensor.calibration.applied\", payload)"},
            {"from": "kafka", "to": "service", "text": "Consume topic: sensor.calibration.applied"},
            {"from": "service", "to": "db", "text": "Update SensorDeviceRegistry calibration offsets & GSP certificate"},
            {"from": "db", "to": "service", "text": "Calibration parameters stored & verified compliant", "is_return": True},
            {"from": "service", "to": "gateway", "text": "Push MQTT calibration update to physical IoT gateway", "is_return": True},
            {"from": "gateway", "to": "ui", "text": "HTTP 200 OK (Calibrated: Offset +0.3C, Next Due: 2027-04-01)", "is_return": True},
            {"from": "ui", "to": "actor", "text": "Display green calibrated badge on sensor device registry", "is_return": True}
        ],
        "classes": [
            {
                "name": "CalibrateSensorDto",
                "type": "DTO",
                "col": 0, "row": 0,
                "attributes": ["deviceId: String", "tempOffset: Number", "humidityOffset: Number", "technicianName: String", "nextDueMonths: Number"],
                "methods": ["validateOffsets(): Boolean"]
            },
            {
                "name": "SensorCalibrationController",
                "type": "Controller",
                "col": 1, "row": 0,
                "attributes": ["kafkaClient: ClientKafka", "mqttClient: MqttGatewayClient"],
                "methods": ["applyCalibration(dto: CalibrateSensorDto): Promise<any>", "getCalibrationCert(deviceId: String): Promise<any>"]
            },
            {
                "name": "SensorCalibrationService",
                "type": "Service",
                "col": 2, "row": 0,
                "attributes": ["registryModel: Model<SensorDeviceRegistry>", "mqttPublisher: MqttClient"],
                "methods": ["recordCalibration(dto: any): Promise<SensorDeviceRegistry>", "pushMqttConfig(deviceId: String, offsets: any): Promise<void>"]
            },
            {
                "name": "SensorDeviceRegistry",
                "type": "Entity",
                "col": 0, "row": 1,
                "attributes": ["_id: ObjectId", "deviceId: String", "model: String", "zoneId: String", "tempOffset: Number", "humidityOffset: Number", "calibratedAt: Date", "nextDueAt: Date"],
                "methods": ["save(): Promise<SensorDeviceRegistry>", "findByDeviceId(id: String): Promise<SensorDeviceRegistry>"]
            },
            {
                "name": "MongoDB Database",
                "type": "Secondary",
                "col": 1, "row": 1,
                "attributes": ["connection: MongooseConnection"],
                "methods": ["archiveCalibrationHistory(record: any): Promise<void>"]
            }
        ],
        "class_edges": [
            {"from": "CalibrateSensorDto", "to": "SensorCalibrationController", "label": "submits offsets"},
            {"from": "SensorCalibrationController", "to": "SensorCalibrationService", "label": "invokes"},
            {"from": "SensorCalibrationService", "to": "SensorDeviceRegistry", "label": "persists offsets"},
            {"from": "SensorCalibrationService", "to": "MongoDB Database", "label": "archives audit trail"}
        ]
    }
]
