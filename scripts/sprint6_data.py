# scripts/sprint6_data.py
# Sprint 6: Marketing Campaigns, AI Consultation & Warehouse IoT (10 UCs)

SPRINT_6_UCS = [
    {
        "id": "UC-74",
        "sprint": 6,
        "title": "Time-limited Flash Sale Management",
        "title_short": "Flash Sale Management",
        "actor": "Marketing Specialist",
        "ui": "Flash Sale Campaign UI",
        "gateway_name": "API Gateway",
        "broker_name": "Kafka Broker",
        "service_name": "Orders Service",
        "db_name": "MongoDB Database",
        "steps": [
            {"from": "actor", "to": "ui", "text": "Configure flash sale time slots & discounted items"},
            {"from": "ui", "to": "gateway", "text": "POST /api/sales/flash-sales (CreateFlashSaleDto)"},
            {"from": "gateway", "to": "kafka", "text": "emit(\"flashsale.event.create\", payload)"},
            {"from": "kafka", "to": "service", "text": "Consume topic: flashsale.event.create"},
            {"from": "service", "to": "db", "text": "Save FlashSaleCampaign & populate Redis inventory slots"},
            {"from": "db", "to": "service", "text": "Flash sale campaign scheduled OK", "is_return": True},
            {"from": "service", "to": "gateway", "text": "Return campaignId & scheduled status", "is_return": True},
            {"from": "gateway", "to": "ui", "text": "HTTP 202 Accepted {campaignId}", "is_return": True},
            {"from": "ui", "to": "actor", "text": "Display scheduled flash sale banner on marketing dashboard", "is_return": True}
        ],
        "classes": [
            {
                "name": "CreateFlashSaleDto",
                "type": "DTO",
                "col": 0, "row": 0,
                "attributes": ["campaignName: String", "startTime: Date", "endTime: Date", "items: FlashItemDto[]"],
                "methods": ["validateTimeSlot(): Boolean"]
            },
            {
                "name": "FlashSaleController",
                "type": "Controller",
                "col": 1, "row": 0,
                "attributes": ["kafkaClient: ClientKafka", "cacheManager: Cache"],
                "methods": ["createCampaign(dto: CreateFlashSaleDto): Promise<any>", "getActiveFlashSales(): Promise<FlashSaleCampaign[]>"]
            },
            {
                "name": "FlashSaleService",
                "type": "Service",
                "col": 2, "row": 0,
                "attributes": ["campaignModel: Model<FlashSaleCampaign>", "redisStockSvc: RedisStockService"],
                "methods": ["scheduleCampaign(dto: any): Promise<FlashSaleCampaign>", "decrementFlashStock(id: String, qty: Number): Promise<Boolean>"]
            },
            {
                "name": "FlashSaleCampaign",
                "type": "Entity",
                "col": 0, "row": 1,
                "attributes": ["_id: ObjectId", "campaignName: String", "startTime: Date", "endTime: Date", "items: Object[]", "isActive: Boolean"],
                "methods": ["save(): Promise<FlashSaleCampaign>", "findActive(): Promise<FlashSaleCampaign[]>"]
            },
            {
                "name": "RedisStockService",
                "type": "Secondary",
                "col": 1, "row": 1,
                "attributes": ["redisClient: RedisClient"],
                "methods": ["initializeStockKeys(items: any[]): Promise<void>", "atomicDecrement(key: String, qty: Number): Promise<Number>"]
            }
        ],
        "class_edges": [
            {"from": "CreateFlashSaleDto", "to": "FlashSaleController", "label": "passes schedule"},
            {"from": "FlashSaleController", "to": "FlashSaleService", "label": "delegates to"},
            {"from": "FlashSaleService", "to": "FlashSaleCampaign", "label": "persists campaign"},
            {"from": "FlashSaleService", "to": "RedisStockService", "label": "allocates atomic cache"}
        ]
    },
    {
        "id": "UC-75",
        "sprint": 6,
        "title": "Advanced Promotional Voucher & Combo",
        "title_short": "Promotional Voucher & Combo",
        "actor": "Marketing Specialist",
        "ui": "Voucher Builder UI",
        "gateway_name": "API Gateway",
        "broker_name": "Kafka Broker",
        "service_name": "Orders Service",
        "db_name": "MongoDB Database",
        "steps": [
            {"from": "actor", "to": "ui", "text": "Set Buy-X-Get-Y / Combo bundle promotion rules"},
            {"from": "ui", "to": "gateway", "text": "POST /api/vouchers/advanced-rules (VoucherRuleDto)"},
            {"from": "gateway", "to": "kafka", "text": "emit(\"voucher.event.rule_update\", payload)"},
            {"from": "kafka", "to": "service", "text": "Consume topic: voucher.event.rule_update"},
            {"from": "service", "to": "db", "text": "Save VoucherRule & condition matrix"},
            {"from": "db", "to": "service", "text": "Voucher rule configured successfully", "is_return": True},
            {"from": "service", "to": "gateway", "text": "Publish rule confirmation payload", "is_return": True},
            {"from": "gateway", "to": "ui", "text": "HTTP 202 Accepted {voucherCode}", "is_return": True},
            {"from": "ui", "to": "actor", "text": "Display active voucher status & redemption conditions", "is_return": True}
        ],
        "classes": [
            {
                "name": "VoucherRuleDto",
                "type": "DTO",
                "col": 0, "row": 0,
                "attributes": ["code: String", "ruleType: PromoType", "conditionMedicines: String[]", "rewardMedicine: String", "minOrderValue: Number"],
                "methods": ["validateComboConditions(): Boolean"]
            },
            {
                "name": "VoucherController",
                "type": "Controller",
                "col": 1, "row": 0,
                "attributes": ["kafkaClient: ClientKafka", "cacheManager: Cache"],
                "methods": ["createAdvancedRule(dto: VoucherRuleDto): Promise<any>", "validateVoucher(code: String): Promise<VoucherRule>"]
            },
            {
                "name": "VoucherRuleService",
                "type": "Service",
                "col": 2, "row": 0,
                "attributes": ["voucherModel: Model<VoucherRule>", "cartCalculationSvc: CartService"],
                "methods": ["applyComboRule(cart: Cart, rule: VoucherRule): Cart", "checkEligibility(userId: String, code: String): Promise<Boolean>"]
            },
            {
                "name": "VoucherRule",
                "type": "Entity",
                "col": 0, "row": 1,
                "attributes": ["_id: ObjectId", "code: String", "ruleType: String", "minSpend: Number", "usageLimit: Number", "usedCount: Number", "validUntil: Date"],
                "methods": ["save(): Promise<VoucherRule>", "findByCode(code: String): Promise<VoucherRule>"]
            },
            {
                "name": "RedisCache",
                "type": "Secondary",
                "col": 1, "row": 1,
                "attributes": ["redisClient: RedisClient"],
                "methods": ["getVoucherCache(code: String): Promise<any>", "evictVoucher(code: String): Promise<void>"]
            }
        ],
        "class_edges": [
            {"from": "VoucherRuleDto", "to": "VoucherController", "label": "submits rule"},
            {"from": "VoucherController", "to": "VoucherRuleService", "label": "delegates to"},
            {"from": "VoucherRuleService", "to": "VoucherRule", "label": "persists rule"},
            {"from": "VoucherRuleService", "to": "RedisCache", "label": "caches rule"}
        ]
    },
    {
        "id": "UC-76",
        "sprint": 6,
        "title": "Automated Marketing Email Campaigns",
        "title_short": "Marketing Email Campaigns",
        "actor": "Marketing Specialist",
        "ui": "Email Campaign UI",
        "gateway_name": "API Gateway",
        "broker_name": "Kafka Broker",
        "service_name": "User Service",
        "db_name": "MongoDB Database",
        "steps": [
            {"from": "actor", "to": "ui", "text": "Select target segment & dispatch seasonal health newsletter"},
            {"from": "ui", "to": "gateway", "text": "POST /api/marketing/email-campaigns (EmailCampaignDto)"},
            {"from": "gateway", "to": "kafka", "text": "emit(\"marketing.email.broadcast\", payload)"},
            {"from": "kafka", "to": "service", "text": "Consume topic: marketing.email.broadcast"},
            {"from": "service", "to": "db", "text": "Save EmailCampaign record & query recipient list"},
            {"from": "db", "to": "service", "text": "Segment recipients loaded OK", "is_return": True},
            {"from": "service", "to": "gateway", "text": "Trigger batch SQS email dispatch queue", "is_return": True},
            {"from": "gateway", "to": "ui", "text": "HTTP 202 Accepted {campaignId, recipients: 1420}", "is_return": True},
            {"from": "ui", "to": "actor", "text": "Display broadcast progress bar & scheduled send time", "is_return": True}
        ],
        "classes": [
            {
                "name": "EmailCampaignDto",
                "type": "DTO",
                "col": 0, "row": 0,
                "attributes": ["campaignTitle: String", "targetSegment: String", "subject: String", "templateHtml: String", "scheduledDate: Date"],
                "methods": ["validateTemplate(): Boolean"]
            },
            {
                "name": "MarketingEmailController",
                "type": "Controller",
                "col": 1, "row": 0,
                "attributes": ["kafkaClient: ClientKafka", "sqsQueueClient: SqsClient"],
                "methods": ["broadcastCampaign(dto: EmailCampaignDto): Promise<any>", "getCampaignStats(id: String): Promise<EmailCampaign>"]
            },
            {
                "name": "MarketingEmailService",
                "type": "Service",
                "col": 2, "row": 0,
                "attributes": ["campaignModel: Model<EmailCampaign>", "userModel: Model<User>"],
                "methods": ["dispatchBatchEmails(campaignId: String): Promise<void>", "trackOpenRate(campaignId: String): Promise<void>"]
            },
            {
                "name": "EmailCampaign",
                "type": "Entity",
                "col": 0, "row": 1,
                "attributes": ["_id: ObjectId", "campaignTitle: String", "targetSegment: String", "sentCount: Number", "openRate: Number", "status: CampaignStatus", "dispatchedAt: Date"],
                "methods": ["save(): Promise<EmailCampaign>", "findById(id: String): Promise<EmailCampaign>"]
            },
            {
                "name": "SqsEmailWorker",
                "type": "Secondary",
                "col": 1, "row": 1,
                "attributes": ["sqsClient: SQSClient", "queueUrl: String"],
                "methods": ["pushBatchMessage(messages: any[]): Promise<void>"]
            }
        ],
        "class_edges": [
            {"from": "EmailCampaignDto", "to": "MarketingEmailController", "label": "passes content"},
            {"from": "MarketingEmailController", "to": "MarketingEmailService", "label": "invokes"},
            {"from": "MarketingEmailService", "to": "EmailCampaign", "label": "persists record"},
            {"from": "MarketingEmailService", "to": "SqsEmailWorker", "label": "enqueues emails"}
        ]
    },
    {
        "id": "UC-77",
        "sprint": 6,
        "title": "Customer Product Review & Rating",
        "title_short": "Product Review & Rating",
        "actor": "Customer",
        "ui": "Review & Rating UI",
        "gateway_name": "API Gateway",
        "broker_name": "Kafka Broker",
        "service_name": "Inventory Service",
        "db_name": "MongoDB Database",
        "steps": [
            {"from": "actor", "to": "ui", "text": "Submit 5-star review & comment for purchased medicine"},
            {"from": "ui", "to": "gateway", "text": "POST /api/medicines/:id/reviews (CreateReviewDto)"},
            {"from": "gateway", "to": "kafka", "text": "emit(\"review.event.submitted\", payload)"},
            {"from": "kafka", "to": "service", "text": "Consume topic: review.event.submitted"},
            {"from": "service", "to": "db", "text": "Save MedicineReview & recompute averageRating on Medicine"},
            {"from": "db", "to": "service", "text": "Review stored & medicine rating updated OK", "is_return": True},
            {"from": "service", "to": "gateway", "text": "Return reviewId & new average rating", "is_return": True},
            {"from": "gateway", "to": "ui", "text": "HTTP 201 Created {reviewId, avgRating: 4.8}", "is_return": True},
            {"from": "ui", "to": "actor", "text": "Display review posted badge & thank-you loyalty points", "is_return": True}
        ],
        "classes": [
            {
                "name": "CreateReviewDto",
                "type": "DTO",
                "col": 0, "row": 0,
                "attributes": ["medicineId: String", "customerId: String", "orderId: String", "rating: Number", "comment: String"],
                "methods": ["validateRating(): Boolean"]
            },
            {
                "name": "ReviewController",
                "type": "Controller",
                "col": 1, "row": 0,
                "attributes": ["kafkaClient: ClientKafka", "cacheManager: Cache"],
                "methods": ["submitReview(dto: CreateReviewDto): Promise<any>", "getReviewsByMedicine(id: String): Promise<MedicineReview[]>"]
            },
            {
                "name": "ReviewService",
                "type": "Service",
                "col": 2, "row": 0,
                "attributes": ["reviewModel: Model<MedicineReview>"],
                "methods": ["createReview(dto: any): Promise<MedicineReview>", "recalculateAvgRating(medicineId: String): Promise<Number>"]
            },
            {
                "name": "MedicineReview",
                "type": "Entity",
                "col": 0, "row": 1,
                "attributes": ["_id: ObjectId", "medicineId: String", "customerId: String", "rating: Number", "comment: String", "isVerifiedPurchase: Boolean", "createdAt: Date"],
                "methods": ["save(): Promise<MedicineReview>", "findByMedicine(medId: String): Promise<MedicineReview[]>"]
            },
            {
                "name": "UserService",
                "type": "Secondary",
                "col": 1, "row": 1,
                "attributes": ["userModel: Model<User>"],
                "methods": ["rewardLoyaltyPoints(userId: String, points: Number): Promise<void>"]
            }
        ],
        "class_edges": [
            {"from": "CreateReviewDto", "to": "ReviewController", "label": "passes feedback"},
            {"from": "ReviewController", "to": "ReviewService", "label": "delegates to"},
            {"from": "ReviewService", "to": "MedicineReview", "label": "persists review"},
            {"from": "ReviewService", "to": "UserService", "label": "rewards points"}
        ]
    },
    {
        "id": "UC-78",
        "sprint": 6,
        "title": "Import Medicine Auxiliary Label & Barcode Printing",
        "title_short": "Auxiliary Label & Barcode Printing",
        "actor": "Warehouse Specialist",
        "ui": "Label Printing UI",
        "gateway_name": "API Gateway",
        "broker_name": "Kafka Broker",
        "service_name": "Inventory Service",
        "db_name": "MongoDB Database",
        "steps": [
            {"from": "actor", "to": "ui", "text": "Select imported batch & trigger auxiliary label print"},
            {"from": "ui", "to": "gateway", "text": "POST /api/medicines/auxiliary-label (PrintLabelDto)"},
            {"from": "gateway", "to": "kafka", "text": "send(\"medicine.label.generate_pdf\", payload)"},
            {"from": "kafka", "to": "service", "text": "Consume topic: medicine.label.generate_pdf"},
            {"from": "service", "to": "db", "text": "Fetch drug registration, importer details & GS1 barcode"},
            {"from": "db", "to": "service", "text": "Return regulatory metadata & batch expiration", "is_return": True},
            {"from": "service", "to": "gateway", "text": "Generate PDF label stream with Code128 / GS1", "is_return": True},
            {"from": "gateway", "to": "ui", "text": "HTTP 200 OK (PDF Binary Stream)", "is_return": True},
            {"from": "ui", "to": "actor", "text": "Send print job directly to thermal label printer", "is_return": True}
        ],
        "classes": [
            {
                "name": "PrintLabelDto",
                "type": "DTO",
                "col": 0, "row": 0,
                "attributes": ["batchId: String", "medicineId: String", "labelQuantity: Number", "paperSize: LabelFormat"],
                "methods": ["validateFormat(): Boolean"]
            },
            {
                "name": "LabelPrintController",
                "type": "Controller",
                "col": 1, "row": 0,
                "attributes": ["kafkaClient: ClientKafka", "pdfGenerator: PdfService"],
                "methods": ["printAuxiliaryLabels(dto: PrintLabelDto): Promise<Stream>", "getLabelPreview(batchId: String): Promise<any>"]
            },
            {
                "name": "LabelService",
                "type": "Service",
                "col": 2, "row": 0,
                "attributes": ["batchModel: Model<MedicineBatch>", "medicineModel: Model<Medicine>"],
                "methods": ["generateLabelData(batchId: String): Promise<any>", "renderBarcodeSvg(code: String): String"]
            },
            {
                "name": "AuxiliaryLabelConfig",
                "type": "Entity",
                "col": 0, "row": 1,
                "attributes": ["_id: ObjectId", "medicineId: String", "importerName: String", "visaNumber: String", "originCountry: String", "usageInstructions: String", "warning: String"],
                "methods": ["save(): Promise<AuxiliaryLabelConfig>", "findByMedicine(medId: String): Promise<AuxiliaryLabelConfig>"]
            },
            {
                "name": "PrintServer",
                "type": "Secondary",
                "col": 1, "row": 1,
                "attributes": ["thermalPrinterDriver: ZebraPrinterClient"],
                "methods": ["sendZplCommand(zplData: String): Promise<void>"]
            }
        ],
        "class_edges": [
            {"from": "PrintLabelDto", "to": "LabelPrintController", "label": "requests print"},
            {"from": "LabelPrintController", "to": "LabelService", "label": "invokes"},
            {"from": "LabelService", "to": "AuxiliaryLabelConfig", "label": "reads config"},
            {"from": "LabelService", "to": "PrintServer", "label": "dispatches print job"}
        ]
    },
    {
        "id": "UC-79",
        "sprint": 6,
        "title": "Multi-Supplier Bulk RFQ Quotation",
        "title_short": "Bulk RFQ Quotation",
        "actor": "Procurement Specialist",
        "ui": "Bulk RFQ UI",
        "gateway_name": "API Gateway",
        "broker_name": "Kafka Broker",
        "service_name": "Supplier Service",
        "db_name": "MongoDB Database",
        "steps": [
            {"from": "actor", "to": "ui", "text": "Select medicine shortage list & broadcast RFQ to suppliers"},
            {"from": "ui", "to": "gateway", "text": "POST /api/procurement/rfq-batches (CreateRfqDto)"},
            {"from": "gateway", "to": "kafka", "text": "emit(\"procurement.rfq.broadcast\", payload)"},
            {"from": "kafka", "to": "service", "text": "Consume topic: procurement.rfq.broadcast"},
            {"from": "service", "to": "db", "text": "Create RequestForQuotation documents for selected GDP suppliers"},
            {"from": "db", "to": "service", "text": "RFQ records created & emails dispatched", "is_return": True},
            {"from": "service", "to": "gateway", "text": "Return rfqBatchCode & supplier count", "is_return": True},
            {"from": "gateway", "to": "ui", "text": "HTTP 202 Accepted {rfqBatchCode, totalSuppliers: 6}", "is_return": True},
            {"from": "ui", "to": "actor", "text": "Display broadcast status & supplier quotation countdown", "is_return": True}
        ],
        "classes": [
            {
                "name": "CreateRfqDto",
                "type": "DTO",
                "col": 0, "row": 0,
                "attributes": ["items: RfqItemDto[]", "supplierIds: String[]", "submissionDeadline: Date", "terms: String"],
                "methods": ["validateItems(): Boolean"]
            },
            {
                "name": "RfqController",
                "type": "Controller",
                "col": 1, "row": 0,
                "attributes": ["kafkaClient: ClientKafka", "supplierPortalSvc: SupplierPortalService"],
                "methods": ["broadcastRfq(dto: CreateRfqDto): Promise<any>", "getRfqBatch(batchCode: String): Promise<RequestForQuotation[]>"]
            },
            {
                "name": "RfqService",
                "type": "Service",
                "col": 2, "row": 0,
                "attributes": ["rfqModel: Model<RequestForQuotation>", "supplierModel: Model<Supplier>"],
                "methods": ["dispatchRfqToSuppliers(dto: any): Promise<void>\", \"recordSupplierQuote(rfqId: String, quote: any): Promise<void>"]
            },
            {
                "name": "RequestForQuotation",
                "type": "Entity",
                "col": 0, "row": 1,
                "attributes": ["_id: ObjectId", "rfqCode: String", "supplierId: String", "items: Object[]", "deadline: Date", "status: RfqStatus", "submittedQuote: Object"],
                "methods": ["save(): Promise<RequestForQuotation>", "findBySupplier(supId: String): Promise<RequestForQuotation[]>"]
            },
            {
                "name": "InventoryService",
                "type": "Secondary",
                "col": 1, "row": 1,
                "attributes": ["stockRequisitionModel: Model<PurchaseRequisition>"],
                "methods": ["markPrsAsRfqInitiated(prIds: String[]): Promise<void>"]
            }
        ],
        "class_edges": [
            {"from": "CreateRfqDto", "to": "RfqController", "label": "passes requirements"},
            {"from": "RfqController", "to": "RfqService", "label": "invokes"},
            {"from": "RfqService", "to": "RequestForQuotation", "label": "persists RFQs"},
            {"from": "RfqService", "to": "InventoryService", "label": "links PRs"}
        ]
    },
    {
        "id": "UC-80",
        "sprint": 6,
        "title": "AI Symptom Consultation Chatbot",
        "title_short": "AI Symptom Consultation Chatbot",
        "actor": "Customer",
        "ui": "AI Chat UI",
        "gateway_name": "API Gateway",
        "broker_name": "Kafka Broker",
        "service_name": "AI Service",
        "db_name": "MongoDB Database",
        "steps": [
            {"from": "actor", "to": "ui", "text": "Describe symptoms: 'Sot cao, dau hong 2 ngay'"},
            {"from": "ui", "to": "gateway", "text": "POST /api/prescriptions/symptom-consult (SymptomQueryDto)"},
            {"from": "gateway", "to": "kafka", "text": "send(\"ai.chat.symptom_inquiry\", queryPayload)"},
            {"from": "kafka", "to": "service", "text": "Consume topic: ai.chat.symptom_inquiry"},
            {"from": "service", "to": "db", "text": "Query clinical vector database & OTC medicine indications"},
            {"from": "db", "to": "service", "text": "Return matched OTC drugs & medical precautions", "is_return": True},
            {"from": "service", "to": "gateway", "text": "Generate structured AI advice with Gemini 2.5 Flash", "is_return": True},
            {"from": "gateway", "to": "ui", "text": "HTTP 200 OK (AI advice & recommended OTC drugs)", "is_return": True},
            {"from": "ui", "to": "actor", "text": "Render symptom triage response & 'Add OTC to Cart' button", "is_return": True}
        ],
        "classes": [
            {
                "name": "SymptomQueryDto",
                "type": "DTO",
                "col": 0, "row": 0,
                "attributes": ["customerId: String", "symptomText: String", "durationDays: Number", "existingConditions: String[]"],
                "methods": ["sanitizePrompt(): String"]
            },
            {
                "name": "AiConsultController",
                "type": "Controller",
                "col": 1, "row": 0,
                "attributes": ["kafkaClient: ClientKafka", "aiRateLimiter: RateLimiter"],
                "methods": ["consultSymptoms(dto: SymptomQueryDto): Promise<any>", "getSessionHistory(sessionId: String): Promise<AiSession>"]
            },
            {
                "name": "AiConsultService",
                "type": "Service",
                "col": 2, "row": 0,
                "attributes": ["sessionModel: Model<AiConsultationSession>", "geminiClient: GeminiClient"],
                "methods": ["analyzeSymptoms(prompt: String): Promise<AiAdvice>", "filterSafeOtcMedicines(symptoms: String[]): Promise<Medicine[]>"]
            },
            {
                "name": "AiConsultationSession",
                "type": "Entity",
                "col": 0, "row": 1,
                "attributes": ["_id: ObjectId", "customerId: String", "conversationHistory: Object[]", "recommendedMedicines: String[]", "disclaimerAccepted: Boolean", "createdAt: Date"],
                "methods": ["save(): Promise<AiConsultationSession>", "findByCustomer(cId: String): Promise<AiConsultationSession[]>"]
            },
            {
                "name": "InventoryService",
                "type": "Secondary",
                "col": 1, "row": 1,
                "attributes": ["medicineModel: Model<Medicine>"],
                "methods": ["verifyOtcAvailability(medicineIds: String[]): Promise<Medicine[]>"]
            }
        ],
        "class_edges": [
            {"from": "SymptomQueryDto", "to": "AiConsultController", "label": "sends symptoms"},
            {"from": "AiConsultController", "to": "AiConsultService", "label": "delegates to"},
            {"from": "AiConsultService", "to": "AiConsultationSession", "label": "persists session"},
            {"from": "AiConsultService", "to": "InventoryService", "label": "checks stock"}
        ]
    },
    {
        "id": "UC-81",
        "sprint": 6,
        "title": "AI Voice Medicine Search",
        "title_short": "AI Voice Medicine Search",
        "actor": "Customer",
        "ui": "Voice Search UI",
        "gateway_name": "API Gateway",
        "broker_name": "Kafka Broker",
        "service_name": "AI Service",
        "db_name": "MongoDB Database",
        "steps": [
            {"from": "actor", "to": "ui", "text": "Tap mic & speak: 'Tim thuoc Panadol Extra do'"},
            {"from": "ui", "to": "gateway", "text": "POST /api/medicines/voice-search (AudioBuffer)"},
            {"from": "gateway", "to": "kafka", "text": "send(\"ai.voice.stt_search\", audioPayload)"},
            {"from": "kafka", "to": "service", "text": "Consume topic: ai.voice.stt_search"},
            {"from": "service", "to": "db", "text": "Transcribe voice with Whisper STT & fuzzy-search Medicine catalog"},
            {"from": "db", "to": "service", "text": "Return matched medicine records & pricing", "is_return": True},
            {"from": "service", "to": "gateway", "text": "Publish transcription & search hits", "is_return": True},
            {"from": "gateway", "to": "ui", "text": "HTTP 200 OK (Text: 'Panadol Extra', Items: [...])", "is_return": True},
            {"from": "ui", "to": "actor", "text": "Display recognized query text & matched drug cards", "is_return": True}
        ],
        "classes": [
            {
                "name": "VoiceSearchDto",
                "type": "DTO",
                "col": 0, "row": 0,
                "attributes": ["audioBase64: String", "audioFormat: String", "languageCode: String", "branchId: String"],
                "methods": ["validateAudio(): Boolean"]
            },
            {
                "name": "VoiceSearchController",
                "type": "Controller",
                "col": 1, "row": 0,
                "attributes": ["kafkaClient: ClientKafka", "cacheManager: Cache"],
                "methods": ["searchByVoice(dto: VoiceSearchDto): Promise<any>"]
            },
            {
                "name": "VoiceSearchService",
                "type": "Service",
                "col": 2, "row": 0,
                "attributes": ["whisperClient: WhisperApiClient", "medicineModel: Model<Medicine>"],
                "methods": ["transcribeSpeech(audio: Buffer): Promise<String>", "fuzzyMatchCatalog(query: String): Promise<Medicine[]>"]
            },
            {
                "name": "VoiceSearchLog",
                "type": "Entity",
                "col": 0, "row": 1,
                "attributes": ["_id: ObjectId", "customerId: String", "transcribedText: String", "matchedMedicines: String[]", "confidenceScore: Number", "searchedAt: Date"],
                "methods": ["save(): Promise<VoiceSearchLog>"]
            },
            {
                "name": "InventoryService",
                "type": "Secondary",
                "col": 1, "row": 1,
                "attributes": ["medicineModel: Model<Medicine>"],
                "methods": ["searchFullText(query: String): Promise<Medicine[]>"]
            }
        ],
        "class_edges": [
            {"from": "VoiceSearchDto", "to": "VoiceSearchController", "label": "delivers audio"},
            {"from": "VoiceSearchController", "to": "VoiceSearchService", "label": "invokes STT"},
            {"from": "VoiceSearchService", "to": "VoiceSearchLog", "label": "logs search"},
            {"from": "VoiceSearchService", "to": "InventoryService", "label": "queries catalog"}
        ]
    },
    {
        "id": "UC-82",
        "sprint": 6,
        "title": "IoT Central Warehouse Telemetry & Alerts",
        "title_short": "IoT Warehouse Telemetry",
        "actor": "IoT Sensor Device",
        "ui": "Warehouse IoT Gateway",
        "gateway_name": "API Gateway",
        "broker_name": "Kafka Broker",
        "service_name": "Inventory Service",
        "db_name": "MongoDB Database",
        "steps": [
            {"from": "actor", "to": "ui", "text": "Publish MQTT telemetry (Temp: 28.5C, Humidity: 72%)"},
            {"from": "ui", "to": "gateway", "text": "POST /api/sensors/telemetry (TelemetryDto)"},
            {"from": "gateway", "to": "kafka", "text": "emit(\"sensor.telemetry.ingest\", payload)"},
            {"from": "kafka", "to": "service", "text": "Consume topic: sensor.telemetry.ingest"},
            {"from": "service", "to": "db", "text": "Save SensorTelemetry & verify GSP threshold breach"},
            {"from": "db", "to": "service", "text": "Telemetry recorded OK", "is_return": True},
            {"from": "service", "to": "gateway", "text": "Emit WebSocket alarm 'sensor:alert' (Temp breached)", "is_return": True},
            {"from": "gateway", "to": "ui", "text": "HTTP 202 Accepted {status: ALERT_TRIGGERED}", "is_return": True},
            {"from": "ui", "to": "actor", "text": "Trigger warehouse audible buzzer & dashboard flash alert", "is_return": True}
        ],
        "classes": [
            {
                "name": "SensorTelemetryDto",
                "type": "DTO",
                "col": 0, "row": 0,
                "attributes": ["deviceId: String", "zoneId: String", "temperature: Number", "humidity: Number", "batteryLevel: Number"],
                "methods": ["isBreached(maxTemp: Number, maxHum: Number): Boolean"]
            },
            {
                "name": "SensorController",
                "type": "Controller",
                "col": 1, "row": 0,
                "attributes": ["kafkaClient: ClientKafka", "socketGateway: TelemetrySocketGateway"],
                "methods": ["ingestTelemetry(dto: SensorTelemetryDto): Promise<any>", "getZoneTelemetry(zone: String): Promise<SensorTelemetry[]>"]
            },
            {
                "name": "SensorService",
                "type": "Service",
                "col": 2, "row": 0,
                "attributes": ["telemetryModel: Model<SensorTelemetry>", "alertModel: Model<SensorAlert>"],
                "methods": ["recordTelemetry(dto: any): Promise<void>", "dispatchGspAlarm(breachInfo: any): Promise<void>"]
            },
            {
                "name": "SensorTelemetry",
                "type": "Entity",
                "col": 0, "row": 1,
                "attributes": ["_id: ObjectId", "deviceId: String", "zoneId: String", "temperature: Number", "humidity: Number", "isAlert: Boolean", "recordedAt: Date"],
                "methods": ["save(): Promise<SensorTelemetry>", "findLatest(zoneId: String): Promise<SensorTelemetry>"]
            },
            {
                "name": "SocketGateway",
                "type": "Secondary",
                "col": 1, "row": 1,
                "attributes": ["server: SocketIOServer"],
                "methods": ["broadcastToRoom(room: String, event: String, data: any): void"]
            }
        ],
        "class_edges": [
            {"from": "SensorTelemetryDto", "to": "SensorController", "label": "ingests reading"},
            {"from": "SensorController", "to": "SensorService", "label": "invokes"},
            {"from": "SensorService", "to": "SensorTelemetry", "label": "persists log"},
            {"from": "SensorService", "to": "SocketGateway", "label": "pushes realtime alert"}
        ]
    },
    {
        "id": "UC-83",
        "sprint": 6,
        "title": "Marketing Campaign ROI Analytics",
        "title_short": "Marketing Campaign ROI",
        "actor": "Marketing Director",
        "ui": "Campaign ROI UI",
        "gateway_name": "API Gateway",
        "broker_name": "Kafka Broker",
        "service_name": "Reports Service",
        "db_name": "MongoDB Database",
        "steps": [
            {"from": "actor", "to": "ui", "text": "Select campaign & view ROI financial analytics"},
            {"from": "ui", "to": "gateway", "text": "GET /api/reports/marketing-roi?campaignId=C1"},
            {"from": "gateway", "to": "kafka", "text": "send(\"marketing.roi.aggregate\", campaignId)"},
            {"from": "kafka", "to": "service", "text": "Consume topic: marketing.roi.aggregate"},
            {"from": "service", "to": "db", "text": "Join Voucher redemption, Order revenues & Ad budget spent"},
            {"from": "db", "to": "service", "text": "Return aggregated revenue, CAC & ROI percentage", "is_return": True},
            {"from": "service", "to": "gateway", "text": "Publish MarketingRoiReport summary", "is_return": True},
            {"from": "gateway", "to": "ui", "text": "HTTP 200 OK (ROI: 340%, CAC: 42,000 VND)", "is_return": True},
            {"from": "ui", "to": "actor", "text": "Render campaign ROI performance gauge & revenue attribution chart", "is_return": True}
        ],
        "classes": [
            {
                "name": "MarketingRoiDto",
                "type": "DTO",
                "col": 0, "row": 0,
                "attributes": ["campaignId: String", "adSpend: Number", "revenueGenerated: Number", "roiPercentage: Number", "customerAcquisitionCost: Number"],
                "methods": ["calculateRoi(): Number"]
            },
            {
                "name": "MarketingRoiController",
                "type": "Controller",
                "col": 1, "row": 0,
                "attributes": ["kafkaClient: ClientKafka", "cacheManager: Cache"],
                "methods": ["getCampaignRoi(id: String): Promise<MarketingRoiDto>", "getAllCampaignRois(): Promise<MarketingRoiDto[]>"]
            },
            {
                "name": "MarketingRoiService",
                "type": "Service",
                "col": 2, "row": 0,
                "attributes": ["roiModel: Model<MarketingRoiReport>", "orderModel: Model<Order>"],
                "methods": ["computeCampaignMetrics(campaignId: String): Promise<MarketingRoiReport>", "attributeOrdersToCampaign(code: String): Promise<Number>"]
            },
            {
                "name": "MarketingRoiReport",
                "type": "Entity",
                "col": 0, "row": 1,
                "attributes": ["_id: ObjectId", "campaignId: String", "totalCost: Number", "attributedSales: Number", "roi: Number", "cac: Number", "generatedAt: Date"],
                "methods": ["save(): Promise<MarketingRoiReport>", "findById(id: String): Promise<MarketingRoiReport>"]
            },
            {
                "name": "OrdersService",
                "type": "Secondary",
                "col": 1, "row": 1,
                "attributes": ["orderModel: Model<Order>"],
                "methods": ["getOrdersByVoucher(voucherCode: String): Promise<Order[]>"]
            }
        ],
        "class_edges": [
            {"from": "MarketingRoiDto", "to": "MarketingRoiController", "label": "formats metrics"},
            {"from": "MarketingRoiController", "to": "MarketingRoiService", "label": "invokes"},
            {"from": "MarketingRoiService", "to": "MarketingRoiReport", "label": "persists report"},
            {"from": "MarketingRoiService", "to": "OrdersService", "label": "queries order attribution"}
        ]
    }
]
