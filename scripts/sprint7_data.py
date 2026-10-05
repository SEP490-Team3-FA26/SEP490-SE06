# scripts/sprint7_data.py
# Sprint 7: POS Advanced Operations, Barcode & GSP Inventory (12 UCs)

SPRINT_7_UCS = [
    {
        "id": "UC-84",
        "sprint": 7,
        "title": "Shift Handover & Cash Balancing",
        "title_short": "Shift Handover & Cash Balancing",
        "actor": "Pharmacist",
        "ui": "Shift Handover UI",
        "gateway_name": "API Gateway",
        "broker_name": "Kafka Broker",
        "service_name": "Orders Service",
        "db_name": "MongoDB Database",
        "steps": [
            {"from": "actor", "to": "ui", "text": "Input actual cash counted & submit shift close"},
            {"from": "ui", "to": "gateway", "text": "POST /api/sales/shifts/close (ShiftCloseDto)"},
            {"from": "gateway", "to": "kafka", "text": "emit(\"sales.shift.closed\", payload)"},
            {"from": "kafka", "to": "service", "text": "Consume topic: sales.shift.closed"},
            {"from": "service", "to": "db", "text": "Reconcile expected cash vs actual cash counted & save ShiftHandover"},
            {"from": "db", "to": "service", "text": "Shift handover saved with discrepancy status", "is_return": True},
            {"from": "service", "to": "gateway", "text": "Return shift summary & balance variance", "is_return": True},
            {"from": "gateway", "to": "ui", "text": "HTTP 200 OK (Discrepancy: 0 VND, Status: BALANCED)", "is_return": True},
            {"from": "ui", "to": "actor", "text": "Print shift handover receipt & sign off register", "is_return": True}
        ],
        "classes": [
            {
                "name": "ShiftCloseDto",
                "type": "DTO",
                "col": 0, "row": 0,
                "attributes": ["shiftId: String", "branchId: String", "pharmacistId: String", "actualCashCounted: Number", "handoverNotes: String"],
                "methods": ["validateCounts(): Boolean"]
            },
            {
                "name": "ShiftController",
                "type": "Controller",
                "col": 1, "row": 0,
                "attributes": ["kafkaClient: ClientKafka", "auditSvc: AuditLogService"],
                "methods": ["closeShift(dto: ShiftCloseDto): Promise<any>", "getShiftReport(id: String): Promise<ShiftHandover>"]
            },
            {
                "name": "ShiftService",
                "type": "Service",
                "col": 2, "row": 0,
                "attributes": ["shiftModel: Model<ShiftHandover>", "drawerModel: Model<CashDrawer>"],
                "methods": ["reconcileShift(dto: any): Promise<ShiftHandover>", "calculateExpectedCash(shiftId: String): Promise<Number>"]
            },
            {
                "name": "ShiftHandover",
                "type": "Entity",
                "col": 0, "row": 1,
                "attributes": ["_id: ObjectId", "shiftId: String", "branchId: String", "openingFloat: Number", "totalSalesCash: Number", "actualCash: Number", "discrepancy: Number", "closedAt: Date"],
                "methods": ["save(): Promise<ShiftHandover>", "findByBranch(bId: String): Promise<ShiftHandover[]>"]
            },
            {
                "name": "FinanceService",
                "type": "Secondary",
                "col": 1, "row": 1,
                "attributes": ["dailyLedgerModel: Model<DailyLedger>"],
                "methods": ["postShiftReconciliation(shiftId: String, discrepancy: Number): Promise<void>"]
            }
        ],
        "class_edges": [
            {"from": "ShiftCloseDto", "to": "ShiftController", "label": "delivers totals"},
            {"from": "ShiftController", "to": "ShiftService", "label": "delegates to"},
            {"from": "ShiftService", "to": "ShiftHandover", "label": "persists handover"},
            {"from": "ShiftService", "to": "FinanceService", "label": "syncs finance ledger"}
        ]
    },
    {
        "id": "UC-85",
        "sprint": 7,
        "title": "Order & Transaction Cancellation",
        "title_short": "Order Cancellation",
        "actor": "Branch Manager",
        "ui": "Order Details UI",
        "gateway_name": "API Gateway",
        "broker_name": "Kafka Broker",
        "service_name": "Orders Service",
        "db_name": "MongoDB Database",
        "steps": [
            {"from": "actor", "to": "ui", "text": "Select wrong order & confirm cancellation with reason"},
            {"from": "ui", "to": "gateway", "text": "POST /api/orders/:id/cancel (CancelOrderDto)"},
            {"from": "gateway", "to": "kafka", "text": "emit(\"order.event.cancelled\", payload)"},
            {"from": "kafka", "to": "service", "text": "Consume topic: order.event.cancelled"},
            {"from": "service", "to": "db", "text": "Update Order status=CANCELLED & create OrderCancellation audit"},
            {"from": "db", "to": "service", "text": "Order cancelled & refund queued", "is_return": True},
            {"from": "service", "to": "gateway", "text": "Emit inventory stock restoration event", "is_return": True},
            {"from": "gateway", "to": "ui", "text": "HTTP 200 OK (Status: CANCELLED, Restocked: Yes)", "is_return": True},
            {"from": "ui", "to": "actor", "text": "Display cancellation receipt & refund authorization", "is_return": True}
        ],
        "classes": [
            {
                "name": "CancelOrderDto",
                "type": "DTO",
                "col": 0, "row": 0,
                "attributes": ["orderId: String", "cancelledBy: String", "cancelReason: String", "refundMethod: RefundOption"],
                "methods": ["validateReason(): Boolean"]
            },
            {
                "name": "OrderCancelController",
                "type": "Controller",
                "col": 1, "row": 0,
                "attributes": ["kafkaClient: ClientKafka", "inventoryClient: InventoryService"],
                "methods": ["cancelOrder(id: String, dto: CancelOrderDto): Promise<any>"]
            },
            {
                "name": "OrderCancelService",
                "type": "Service",
                "col": 2, "row": 0,
                "attributes": ["orderModel: Model<Order>", "cancelAuditModel: Model<OrderCancellation>"],
                "methods": ["executeCancellation(dto: any): Promise<Order>", "rollbackStock(items: any[]): Promise<void>"]
            },
            {
                "name": "OrderCancellation",
                "type": "Entity",
                "col": 0, "row": 1,
                "attributes": ["_id: ObjectId", "orderId: String", "cancelledBy: String", "reason: String", "refundAmount: Number", "restocked: Boolean", "cancelledAt: Date"],
                "methods": ["save(): Promise<OrderCancellation>"]
            },
            {
                "name": "InventoryService",
                "type": "Secondary",
                "col": 1, "row": 1,
                "attributes": ["batchModel: Model<MedicineBatch>"],
                "methods": ["restoreBatchQuantities(items: OrderItem[]): Promise<void>"]
            }
        ],
        "class_edges": [
            {"from": "CancelOrderDto", "to": "OrderCancelController", "label": "passes reason"},
            {"from": "OrderCancelController", "to": "OrderCancelService", "label": "invokes"},
            {"from": "OrderCancelService", "to": "OrderCancellation", "label": "persists log"},
            {"from": "OrderCancelService", "to": "InventoryService", "label": "restores stock"}
        ]
    },
    {
        "id": "UC-86",
        "sprint": 7,
        "title": "Distance-based Delivery Fee Calculation",
        "title_short": "Delivery Fee Calculation",
        "actor": "Customer",
        "ui": "Checkout Shipping UI",
        "gateway_name": "API Gateway",
        "broker_name": "Kafka Broker",
        "service_name": "Orders Service",
        "db_name": "MongoDB Database",
        "steps": [
            {"from": "actor", "to": "ui", "text": "Enter delivery address or pin GPS map location"},
            {"from": "ui", "to": "gateway", "text": "POST /api/orders/shipping-fee (CalculateShippingDto)"},
            {"from": "gateway", "to": "kafka", "text": "send(\"orders.shipping.calculate\", payload)"},
            {"from": "kafka", "to": "service", "text": "Consume topic: orders.shipping.calculate"},
            {"from": "service", "to": "db", "text": "Calculate distance from nearest Branch & query DeliveryFeePolicy"},
            {"from": "db", "to": "service", "text": "Return base fee, distance km & free-ship quota", "is_return": True},
            {"from": "service", "to": "gateway", "text": "Publish delivery fee breakdown (e.g. 25,000 VND / 4.2 km)", "is_return": True},
            {"from": "gateway", "to": "ui", "text": "HTTP 200 OK (Shipping fee: 25,000 VND, Distance: 4.2km)", "is_return": True},
            {"from": "ui", "to": "actor", "text": "Update checkout total with transparent shipping cost", "is_return": True}
        ],
        "classes": [
            {
                "name": "CalculateShippingDto",
                "type": "DTO",
                "col": 0, "row": 0,
                "attributes": ["destinationLat: Number", "destinationLng: Number", "cartTotal: Number", "preferredBranchId: String"],
                "methods": ["validateCoordinates(): Boolean"]
            },
            {
                "name": "ShippingFeeController",
                "type": "Controller",
                "col": 1, "row": 0,
                "attributes": ["kafkaClient: ClientKafka", "cacheManager: Cache"],
                "methods": ["calculateFee(dto: CalculateShippingDto): Promise<ShippingFeeResult>"]
            },
            {
                "name": "ShippingCalculationService",
                "type": "Service",
                "col": 2, "row": 0,
                "attributes": ["policyModel: Model<DeliveryFeePolicy>", "branchModel: Model<Branch>"],
                "methods": ["computeDistanceKm(lat1: Number, lng1: Number, lat2: Number, lng2: Number): Number", "applyPricingRules(dist: Number, cartVal: Number): Number"]
            },
            {
                "name": "DeliveryFeePolicy",
                "type": "Entity",
                "col": 0, "row": 1,
                "attributes": ["_id: ObjectId", "baseDistanceKm: Number", "baseFee: Number", "feePerKm: Number", "freeShipThreshold: Number", "isActive: Boolean"],
                "methods": ["getActivePolicy(): Promise<DeliveryFeePolicy>"]
            },
            {
                "name": "BranchService",
                "type": "Secondary",
                "col": 1, "row": 1,
                "attributes": ["branchModel: Model<Branch>"],
                "methods": ["findNearestBranch(lat: Number, lng: Number): Promise<Branch>"]
            }
        ],
        "class_edges": [
            {"from": "CalculateShippingDto", "to": "ShippingFeeController", "label": "sends coordinates"},
            {"from": "ShippingFeeController", "to": "ShippingCalculationService", "label": "invokes"},
            {"from": "ShippingCalculationService", "to": "DeliveryFeePolicy", "label": "reads policy"},
            {"from": "ShippingCalculationService", "to": "BranchService", "label": "locates nearest branch"}
        ]
    },
    {
        "id": "UC-87",
        "sprint": 7,
        "title": "Barcode Scanning Goods Receipt",
        "title_short": "Barcode Scanning Goods Receipt",
        "actor": "Warehouse Specialist",
        "ui": "Receiving Scanner UI",
        "gateway_name": "API Gateway",
        "broker_name": "Kafka Broker",
        "service_name": "Inventory Service",
        "db_name": "MongoDB Database",
        "steps": [
            {"from": "actor", "to": "ui", "text": "Scan incoming shipment GS1 barcode & input received box count"},
            {"from": "ui", "to": "gateway", "text": "POST /api/goods-receipts/scan-item (ScanItemDto)"},
            {"from": "gateway", "to": "kafka", "text": "emit(\"inventory.grn.scan_batch\", payload)"},
            {"from": "kafka", "to": "service", "text": "Consume topic: inventory.grn.scan_batch"},
            {"from": "service", "to": "db", "text": "Match PO item, create MedicineBatch & update GoodsReceiptItem"},
            {"from": "db", "to": "service", "text": "Batch record initialized & inspected", "is_return": True},
            {"from": "service", "to": "gateway", "text": "Return scan match status & remaining expected qty", "is_return": True},
            {"from": "gateway", "to": "ui", "text": "HTTP 200 OK (Matched: Panadol, Received: 50/50)", "is_return": True},
            {"from": "ui", "to": "actor", "text": "Show green checkmark on scanner & play success beep", "is_return": True}
        ],
        "classes": [
            {
                "name": "ScanGrnItemDto",
                "type": "DTO",
                "col": 0, "row": 0,
                "attributes": ["grnId: String", "scannedBarcode: String", "batchNo: String", "mfgDate: Date", "expDate: Date", "quantity: Number"],
                "methods": ["parseGs1Data(): Object"]
            },
            {
                "name": "GrnScanController",
                "type": "Controller",
                "col": 1, "row": 0,
                "attributes": ["kafkaClient: ClientKafka", "inventoryClient: InventoryService"],
                "methods": ["scanItem(dto: ScanGrnItemDto): Promise<any>", "getGrnProgress(grnId: String): Promise<GoodsReceiptNote>"]
            },
            {
                "name": "GrnScanService",
                "type": "Service",
                "col": 2, "row": 0,
                "attributes": ["grnModel: Model<GoodsReceiptNote>", "batchModel: Model<MedicineBatch>"],
                "methods": ["verifyScannedItem(grnId: String, barcode: String): Promise<any>", "ingestBatchStock(dto: any): Promise<MedicineBatch>"]
            },
            {
                "name": "GoodsReceiptItem",
                "type": "Entity",
                "col": 0, "row": 1,
                "attributes": ["_id: ObjectId", "grnId: String", "medicineId: String", "barcode: String", "receivedQuantity: Number", "isInspected: Boolean", "scannedAt: Date"],
                "methods": ["save(): Promise<GoodsReceiptItem>"]
            },
            {
                "name": "MedicineBatch",
                "type": "Secondary",
                "col": 1, "row": 1,
                "attributes": ["batchNo: String", "quantity: Number", "status: BatchStatus"],
                "methods": ["createInitialBatch(data: any): Promise<MedicineBatch>"]
            }
        ],
        "class_edges": [
            {"from": "ScanGrnItemDto", "to": "GrnScanController", "label": "delivers barcode"},
            {"from": "GrnScanController", "to": "GrnScanService", "label": "delegates to"},
            {"from": "GrnScanService", "to": "GoodsReceiptItem", "label": "updates receipt"},
            {"from": "GrnScanService", "to": "MedicineBatch", "label": "creates batch"}
        ]
    },
    {
        "id": "UC-88",
        "sprint": 7,
        "title": "Barcode Scanning Stock Dispatch",
        "title_short": "Barcode Stock Dispatch",
        "actor": "Warehouse Specialist",
        "ui": "Dispatch Scanner UI",
        "gateway_name": "API Gateway",
        "broker_name": "Kafka Broker",
        "service_name": "Inventory Service",
        "db_name": "MongoDB Database",
        "steps": [
            {"from": "actor", "to": "ui", "text": "Scan outgoing box barcode to fulfill StockTransfer"},
            {"from": "ui", "to": "gateway", "text": "POST /api/stock-transfers/scan-dispatch (DispatchScanDto)"},
            {"from": "gateway", "to": "kafka", "text": "emit(\"inventory.transfer.dispatch_scan\", payload)"},
            {"from": "kafka", "to": "service", "text": "Consume topic: inventory.transfer.dispatch_scan"},
            {"from": "service", "to": "db", "text": "Verify FEFO compliance & deduct dispatched quantity from MedicineBatch"},
            {"from": "db", "to": "service", "text": "FEFO matched & warehouse stock deducted OK", "is_return": True},
            {"from": "service", "to": "gateway", "text": "Return dispatch confirmation & manifest update", "is_return": True},
            {"from": "gateway", "to": "ui", "text": "HTTP 200 OK (FEFO valid, Box dispatched)", "is_return": True},
            {"from": "ui", "to": "actor", "text": "Update dispatch manifest progress (3/3 items loaded)", "is_return": True}
        ],
        "classes": [
            {
                "name": "DispatchScanDto",
                "type": "DTO",
                "col": 0, "row": 0,
                "attributes": ["transferId: String", "barcodeScanned: String", "scannedBatchNo: String", "quantityDispatched: Number"],
                "methods": ["validateDispatch(): Boolean"]
            },
            {
                "name": "StockDispatchController",
                "type": "Controller",
                "col": 1, "row": 0,
                "attributes": ["kafkaClient: ClientKafka", "cacheManager: Cache"],
                "methods": ["scanDispatchItem(dto: DispatchScanDto): Promise<any>"]
            },
            {
                "name": "StockDispatchService",
                "type": "Service",
                "col": 2, "row": 0,
                "attributes": ["transferModel: Model<StockTransfer>", "batchModel: Model<MedicineBatch>"],
                "methods": ["verifyFefoRule(medicineId: String, batchNo: String): Promise<Boolean>", "deductDispatchedBatch(dto: any): Promise<void>"]
            },
            {
                "name": "StockDispatchScan",
                "type": "Entity",
                "col": 0, "row": 1,
                "attributes": ["_id: ObjectId", "transferId: String", "medicineId: String", "batchNo: String", "dispatchedQty: Number", "dispatchedBy: String", "dispatchedAt: Date"],
                "methods": ["save(): Promise<StockDispatchScan>"]
            },
            {
                "name": "StockTransfer",
                "type": "Secondary",
                "col": 1, "row": 1,
                "attributes": ["transferCode: String", "status: TransferStatus"],
                "methods": ["updateDispatchProgress(transferId: String): Promise<void>"]
            }
        ],
        "class_edges": [
            {"from": "DispatchScanDto", "to": "StockDispatchController", "label": "passes barcode"},
            {"from": "StockDispatchController", "to": "StockDispatchService", "label": "invokes"},
            {"from": "StockDispatchService", "to": "StockDispatchScan", "label": "persists log"},
            {"from": "StockDispatchService", "to": "StockTransfer", "label": "updates status"}
        ]
    },
    {
        "id": "UC-89",
        "sprint": 7,
        "title": "Barcode Scanner Inventory Audit",
        "title_short": "Barcode Scanner Inventory Audit",
        "actor": "Inventory Auditor",
        "ui": "Stocktake Scanner UI",
        "gateway_name": "API Gateway",
        "broker_name": "Kafka Broker",
        "service_name": "Inventory Service",
        "db_name": "MongoDB Database",
        "steps": [
            {"from": "actor", "to": "ui", "text": "Scan bin location & physical drug barcode during audit"},
            {"from": "ui", "to": "gateway", "text": "POST /api/inventory-checks/scan-count (AuditScanDto)"},
            {"from": "gateway", "to": "kafka", "text": "emit(\"inventory.check.item_scanned\", payload)"},
            {"from": "kafka", "to": "service", "text": "Consume topic: inventory.check.item_scanned"},
            {"from": "service", "to": "db", "text": "Compare counted quantity vs system stock & log InventoryAuditScan"},
            {"from": "db", "to": "service", "text": "Stock count recorded & variance computed", "is_return": True},
            {"from": "service", "to": "gateway", "text": "Return audit match (Expected: 100, Counted: 98, Delta: -2)", "is_return": True},
            {"from": "gateway", "to": "ui", "text": "HTTP 200 OK (Variance: -2, Discrepancy logged)", "is_return": True},
            {"from": "ui", "to": "actor", "text": "Display discrepancy color code on scanner & advance to next bin", "is_return": True}
        ],
        "classes": [
            {
                "name": "AuditScanDto",
                "type": "DTO",
                "col": 0, "row": 0,
                "attributes": ["checkId: String", "binLocation: String", "barcodeScanned: String", "physicalCount: Number", "auditorId: String"],
                "methods": ["validateAuditInput(): Boolean"]
            },
            {
                "name": "InventoryAuditController",
                "type": "Controller",
                "col": 1, "row": 0,
                "attributes": ["kafkaClient: ClientKafka", "auditLogSvc: AuditLogService"],
                "methods": ["scanCount(dto: AuditScanDto): Promise<any>", "completeCheck(checkId: String): Promise<any>"]
            },
            {
                "name": "InventoryAuditService",
                "type": "Service",
                "col": 2, "row": 0,
                "attributes": ["checkModel: Model<InventoryCheck>", "auditScanModel: Model<InventoryAuditScan>"],
                "methods": ["recordScanItem(dto: any): Promise<InventoryAuditScan>", "calculateTotalVariance(checkId: String): Promise<Number>"]
            },
            {
                "name": "InventoryAuditScan",
                "type": "Entity",
                "col": 0, "row": 1,
                "attributes": ["_id: ObjectId", "checkId: String", "binLocation: String", "barcode: String", "systemQty: Number", "physicalQty: Number", "variance: Number", "scannedAt: Date"],
                "methods": ["save(): Promise<InventoryAuditScan>"]
            },
            {
                "name": "InventoryCheck",
                "type": "Secondary",
                "col": 1, "row": 1,
                "attributes": ["checkCode: String", "scope: CheckScope", "status: CheckStatus"],
                "methods": ["finalizeAudit(): Promise<void>"]
            }
        ],
        "class_edges": [
            {"from": "AuditScanDto", "to": "InventoryAuditController", "label": "delivers count"},
            {"from": "InventoryAuditController", "to": "InventoryAuditService", "label": "delegates to"},
            {"from": "InventoryAuditService", "to": "InventoryAuditScan", "label": "logs scan variance"},
            {"from": "InventoryAuditService", "to": "InventoryCheck", "label": "updates audit header"}
        ]
    },
    {
        "id": "UC-90",
        "sprint": 7,
        "title": "GSP Bin & Rack Warehouse Location Management",
        "title_short": "GSP Bin & Rack Location Management",
        "actor": "Warehouse Manager",
        "ui": "GSP Location UI",
        "gateway_name": "API Gateway",
        "broker_name": "Kafka Broker",
        "service_name": "Inventory Service",
        "db_name": "MongoDB Database",
        "steps": [
            {"from": "actor", "to": "ui", "text": "Assign cool storage bin location (2-8C) for insulin medicine"},
            {"from": "ui", "to": "gateway", "text": "POST /api/inventory/gsp-bins (AssignBinDto)"},
            {"from": "gateway", "to": "kafka", "text": "emit(\"inventory.bin.allocated\", payload)"},
            {"from": "kafka", "to": "service", "text": "Consume topic: inventory.bin.allocated"},
            {"from": "service", "to": "db", "text": "Save GspBinLocation & bind medicineId with GSP cold chain rules"},
            {"from": "db", "to": "service", "text": "Bin location allocated & verified GSP compliant", "is_return": True},
            {"from": "service", "to": "gateway", "text": "Publish updated warehouse bin map", "is_return": True},
            {"from": "gateway", "to": "ui", "text": "HTTP 201 Created {binCode: 'COOL-A1-04'}", "is_return": True},
            {"from": "ui", "to": "actor", "text": "Highlight newly assigned bin on warehouse 2D layout", "is_return": True}
        ],
        "classes": [
            {
                "name": "AssignBinDto",
                "type": "DTO",
                "col": 0, "row": 0,
                "attributes": ["rackCode: String", "shelfLevel: Number", "binCode: String", "medicineId: String", "gspCondition: StorageCondition"],
                "methods": ["validateStorageCondition(): Boolean"]
            },
            {
                "name": "GspBinController",
                "type": "Controller",
                "col": 1, "row": 0,
                "attributes": ["kafkaClient: ClientKafka", "cacheManager: Cache"],
                "methods": ["assignBin(dto: AssignBinDto): Promise<any>", "getBinsByCondition(condition: String): Promise<GspBinLocation[]>"]
            },
            {
                "name": "GspBinService",
                "type": "Service",
                "col": 2, "row": 0,
                "attributes": ["binModel: Model<GspBinLocation>", "medicineModel: Model<Medicine>"],
                "methods": ["allocateBin(dto: any): Promise<GspBinLocation>", "validateGspCompatibility(medId: String, binId: String): Promise<Boolean>"]
            },
            {
                "name": "GspBinLocation",
                "type": "Entity",
                "col": 0, "row": 1,
                "attributes": ["_id: ObjectId", "binCode: String", "rackCode: String", "shelfLevel: Number", "assignedMedicineId: String", "maxWeight: Number", "currentCapacity: Number"],
                "methods": ["save(): Promise<GspBinLocation>", "findByCode(code: String): Promise<GspBinLocation>"]
            },
            {
                "name": "RedisCache",
                "type": "Secondary",
                "col": 1, "row": 1,
                "attributes": ["redisClient: RedisClient"],
                "methods": ["cacheBinMap(bins: any[]): Promise<void>", "invalidateBin(binCode: String): Promise<void>"]
            }
        ],
        "class_edges": [
            {"from": "AssignBinDto", "to": "GspBinController", "label": "configures bin"},
            {"from": "GspBinController", "to": "GspBinService", "label": "invokes"},
            {"from": "GspBinService", "to": "GspBinLocation", "label": "persists allocation"},
            {"from": "GspBinService", "to": "RedisCache", "label": "updates cache"}
        ]
    },
    {
        "id": "UC-91",
        "sprint": 7,
        "title": "SKU Code Generation & GS1 Barcode Generator",
        "title_short": "SKU Code & GS1 Barcode Generator",
        "actor": "Master Data Specialist",
        "ui": "SKU Generator UI",
        "gateway_name": "API Gateway",
        "broker_name": "Kafka Broker",
        "service_name": "Inventory Service",
        "db_name": "MongoDB Database",
        "steps": [
            {"from": "actor", "to": "ui", "text": "Select category & trigger automatic GS1 EAN-13 barcode generation"},
            {"from": "ui", "to": "gateway", "text": "POST /api/medicines/generate-sku-barcode (GenerateBarcodeDto)"},
            {"from": "gateway", "to": "kafka", "text": "send(\"medicine.barcode.generate\", payload)"},
            {"from": "kafka", "to": "service", "text": "Consume topic: medicine.barcode.generate"},
            {"from": "service", "to": "db", "text": "Generate unique SKU, calculate GS1 check digit & save SkuBarcodeDefinition"},
            {"from": "db", "to": "service", "text": "SKU & Barcode persisted with unique constraint OK", "is_return": True},
            {"from": "service", "to": "gateway", "text": "Return generated SKU & SVG barcode preview", "is_return": True},
            {"from": "gateway", "to": "ui", "text": "HTTP 201 Created {sku: 'MED-AB-0094', barcode: '8936001234567'}", "is_return": True},
            {"from": "ui", "to": "actor", "text": "Render high-res vector barcode preview ready for printing", "is_return": True}
        ],
        "classes": [
            {
                "name": "GenerateBarcodeDto",
                "type": "DTO",
                "col": 0, "row": 0,
                "attributes": ["medicineId: String", "categoryCode: String", "packagingType: String", "countryPrefix: String"],
                "methods": ["validatePrefix(): Boolean"]
            },
            {
                "name": "SkuBarcodeController",
                "type": "Controller",
                "col": 1, "row": 0,
                "attributes": ["kafkaClient: ClientKafka", "svgRenderer: BarcodeSvgRenderer"],
                "methods": ["generateBarcode(dto: GenerateBarcodeDto): Promise<any>"]
            },
            {
                "name": "SkuBarcodeService",
                "type": "Service",
                "col": 2, "row": 0,
                "attributes": ["skuModel: Model<SkuBarcodeDefinition>", "medicineModel: Model<Medicine>"],
                "methods": ["generateNextSku(category: String): Promise<String>", "calculateGs1CheckDigit(digits12: String): Number"]
            },
            {
                "name": "SkuBarcodeDefinition",
                "type": "Entity",
                "col": 0, "row": 1,
                "attributes": ["_id: ObjectId", "medicineId: String", "skuCode: String", "gs1Barcode: String", "checkDigit: Number", "barcodeFormat: String", "createdAt: Date"],
                "methods": ["save(): Promise<SkuBarcodeDefinition>", "findByBarcode(code: String): Promise<SkuBarcodeDefinition>"]
            },
            {
                "name": "BarcodeSvgRenderer",
                "type": "Secondary",
                "col": 1, "row": 1,
                "attributes": ["ean13Encoder: Ean13Encoder"],
                "methods": ["renderSvgString(barcode: String): String"]
            }
        ],
        "class_edges": [
            {"from": "GenerateBarcodeDto", "to": "SkuBarcodeController", "label": "passes category"},
            {"from": "SkuBarcodeController", "to": "SkuBarcodeService", "label": "invokes generation"},
            {"from": "SkuBarcodeService", "to": "SkuBarcodeDefinition", "label": "saves barcode"},
            {"from": "SkuBarcodeService", "to": "BarcodeSvgRenderer", "label": "renders SVG"}
        ]
    },
    {
        "id": "UC-92",
        "sprint": 7,
        "title": "Multi-Unit of Measure Conversion",
        "title_short": "Unit of Measure Conversion",
        "actor": "Master Data Specialist",
        "ui": "UOM Conversion UI",
        "gateway_name": "API Gateway",
        "broker_name": "Kafka Broker",
        "service_name": "Inventory Service",
        "db_name": "MongoDB Database",
        "steps": [
            {"from": "actor", "to": "ui", "text": "Define conversion rates: 1 Box = 10 Blisters = 100 Tablets"},
            {"from": "ui", "to": "gateway", "text": "POST /api/medicines/:id/uom-conversions (UomConversionDto)"},
            {"from": "gateway", "to": "kafka", "text": "emit(\"medicine.uom.conversion_updated\", payload)"},
            {"from": "kafka", "to": "service", "text": "Consume topic: medicine.uom.conversion_updated"},
            {"from": "service", "to": "db", "text": "Save UomConversion matrix & update Medicine base packaging unit"},
            {"from": "db", "to": "service", "text": "Packaging conversion factors stored OK", "is_return": True},
            {"from": "service", "to": "gateway", "text": "Publish updated unit conversion ratios", "is_return": True},
            {"from": "gateway", "to": "ui", "text": "HTTP 200 OK (Unit conversions saved)", "is_return": True},
            {"from": "ui", "to": "actor", "text": "Display multi-UOM retail pricing table on POS terminal", "is_return": True}
        ],
        "classes": [
            {
                "name": "UomConversionDto",
                "type": "DTO",
                "col": 0, "row": 0,
                "attributes": ["medicineId: String", "baseUnit: String", "secondaryUnit: String", "secondaryRatio: Number", "tertiaryUnit: String", "tertiaryRatio: Number"],
                "methods": ["validateRatios(): Boolean"]
            },
            {
                "name": "UomController",
                "type": "Controller",
                "col": 1, "row": 0,
                "attributes": ["kafkaClient: ClientKafka", "cacheManager: Cache"],
                "methods": ["saveConversion(dto: UomConversionDto): Promise<any>", "getConversion(medicineId: String): Promise<UomConversion>"]
            },
            {
                "name": "UomService",
                "type": "Service",
                "col": 2, "row": 0,
                "attributes": ["uomModel: Model<UomConversion>", "medicineModel: Model<Medicine>"],
                "methods": ["convertQuantity(medId: String, fromUnit: String, toUnit: String, qty: Number): Number", "saveUomMatrix(dto: any): Promise<UomConversion>"]
            },
            {
                "name": "UomConversion",
                "type": "Entity",
                "col": 0, "row": 1,
                "attributes": ["_id: ObjectId", "medicineId: String", "baseUnit: String", "secondaryUnit: String", "secondaryMultiplier: Number", "tertiaryUnit: String", "tertiaryMultiplier: Number"],
                "methods": ["save(): Promise<UomConversion>", "findByMedicine(medId: String): Promise<UomConversion>"]
            },
            {
                "name": "OrdersService",
                "type": "Secondary",
                "col": 1, "row": 1,
                "attributes": ["cartService: CartService"],
                "methods": ["updatePosUnitSelectors(medId: String): Promise<void>"]
            }
        ],
        "class_edges": [
            {"from": "UomConversionDto", "to": "UomController", "label": "delivers ratios"},
            {"from": "UomController", "to": "UomService", "label": "invokes"},
            {"from": "UomService", "to": "UomConversion", "label": "persists UOM table"},
            {"from": "UomService", "to": "OrdersService", "label": "syncs POS pricing"}
        ]
    },
    {
        "id": "UC-93",
        "sprint": 7,
        "title": "Branch-specific Pricing Policy",
        "title_short": "Branch-specific Pricing Policy",
        "actor": "Pricing Manager",
        "ui": "Branch Pricing UI",
        "gateway_name": "API Gateway",
        "broker_name": "Kafka Broker",
        "service_name": "Inventory Service",
        "db_name": "MongoDB Database",
        "steps": [
            {"from": "actor", "to": "ui", "text": "Set branch-specific markup/discount policy for suburban store"},
            {"from": "ui", "to": "gateway", "text": "POST /api/pricing/branch-overrides (BranchPricingDto)"},
            {"from": "gateway", "to": "kafka", "text": "emit(\"pricing.branch.policy_updated\", payload)"},
            {"from": "kafka", "to": "service", "text": "Consume topic: pricing.branch.policy_updated"},
            {"from": "service", "to": "db", "text": "Save BranchPricingPolicy & evict branch Redis price cache"},
            {"from": "db", "to": "service", "text": "Branch pricing override stored successfully", "is_return": True},
            {"from": "service", "to": "gateway", "text": "Publish updated retail price matrix", "is_return": True},
            {"from": "gateway", "to": "ui", "text": "HTTP 200 OK (Branch pricing policy applied)", "is_return": True},
            {"from": "ui", "to": "actor", "text": "Display branch price override tag on POS catalog", "is_return": True}
        ],
        "classes": [
            {
                "name": "BranchPricingDto",
                "type": "DTO",
                "col": 0, "row": 0,
                "attributes": ["branchId: String", "medicineId: String", "branchPrice: Number", "discountCap: Number", "effectiveDate: Date"],
                "methods": ["validatePriceLimits(): Boolean"]
            },
            {
                "name": "BranchPricingController",
                "type": "Controller",
                "col": 1, "row": 0,
                "attributes": ["kafkaClient: ClientKafka", "cacheManager: Cache"],
                "methods": ["setBranchPricing(dto: BranchPricingDto): Promise<any>", "getBranchPrice(branchId: String, medId: String): Promise<Number>"]
            },
            {
                "name": "BranchPricingService",
                "type": "Service",
                "col": 2, "row": 0,
                "attributes": ["pricingModel: Model<BranchPricingPolicy>", "redisPriceSvc: RedisPriceService"],
                "methods": ["applyPricingOverride(dto: any): Promise<BranchPricingPolicy>", "resolveEffectivePrice(branchId: String, medId: String): Promise<Number>"]
            },
            {
                "name": "BranchPricingPolicy",
                "type": "Entity",
                "col": 0, "row": 1,
                "attributes": ["_id: ObjectId", "branchId: String", "medicineId: String", "overridePrice: Number", "discountLimit: Number", "isActive: Boolean", "updatedAt: Date"],
                "methods": ["save(): Promise<BranchPricingPolicy>", "findOverride(bId: String, mId: String): Promise<BranchPricingPolicy>"]
            },
            {
                "name": "RedisPriceService",
                "type": "Secondary",
                "col": 1, "row": 1,
                "attributes": ["redisClient: RedisClient"],
                "methods": ["cachePrice(bId: String, mId: String, price: Number): Promise<void>", "invalidateBranch(bId: String): Promise<void>"]
            }
        ],
        "class_edges": [
            {"from": "BranchPricingDto", "to": "BranchPricingController", "label": "delivers override"},
            {"from": "BranchPricingController", "to": "BranchPricingService", "label": "invokes"},
            {"from": "BranchPricingService", "to": "BranchPricingPolicy", "label": "persists policy"},
            {"from": "BranchPricingService", "to": "RedisPriceService", "label": "invalidates cache"}
        ]
    },
    {
        "id": "UC-94",
        "sprint": 7,
        "title": "Negative & Discrepancy Stock Alert",
        "title_short": "Negative Stock Alert",
        "actor": "Store Supervisor",
        "ui": "Discrepancy Alert UI",
        "gateway_name": "API Gateway",
        "broker_name": "Kafka Broker",
        "service_name": "Inventory Service",
        "db_name": "MongoDB Database",
        "steps": [
            {"from": "actor", "to": "ui", "text": "Inspect negative inventory alert & input investigation reason"},
            {"from": "ui", "to": "gateway", "text": "POST /api/inventory/discrepancies/resolve (ResolveDiscrepancyDto)"},
            {"from": "gateway", "to": "kafka", "text": "emit(\"inventory.alert.discrepancy_resolved\", payload)"},
            {"from": "kafka", "to": "service", "text": "Consume topic: inventory.alert.discrepancy_resolved"},
            {"from": "service", "to": "db", "text": "Log root cause in StockDiscrepancyLog & post balancing stock adjustment"},
            {"from": "db", "to": "service", "text": "Discrepancy resolved & stock balance restored to 0", "is_return": True},
            {"from": "service", "to": "gateway", "text": "Send resolution confirmation to HQ Audit", "is_return": True},
            {"from": "gateway", "to": "ui", "text": "HTTP 200 OK (Status: RESOLVED)", "is_return": True},
            {"from": "ui", "to": "actor", "text": "Clear red warning badge from branch inventory dashboard", "is_return": True}
        ],
        "classes": [
            {
                "name": "ResolveDiscrepancyDto",
                "type": "DTO",
                "col": 0, "row": 0,
                "attributes": ["discrepancyId: String", "rootCause: DiscrepancyCause", "investigatorNotes: String", "adjustStock: Boolean"],
                "methods": ["validateNotes(): Boolean"]
            },
            {
                "name": "DiscrepancyController",
                "type": "Controller",
                "col": 1, "row": 0,
                "attributes": ["kafkaClient: ClientKafka", "notificationSvc: NotificationService"],
                "methods": ["resolveAlert(dto: ResolveDiscrepancyDto): Promise<any>", "getActiveAlerts(branchId: String): Promise<StockDiscrepancyLog[]>"]
            },
            {
                "name": "DiscrepancyService",
                "type": "Service",
                "col": 2, "row": 0,
                "attributes": ["discrepancyModel: Model<StockDiscrepancyLog>", "batchModel: Model<MedicineBatch>"],
                "methods": ["recordNegativeAlert(bId: String, mId: String, qty: Number): Promise<void>", "applyBalancingAdjustment(id: String): Promise<void>"]
            },
            {
                "name": "StockDiscrepancyLog",
                "type": "Entity",
                "col": 0, "row": 1,
                "attributes": ["_id: ObjectId", "branchId: String", "medicineId: String", "negativeQty: Number", "rootCause: String", "isResolved: Boolean", "reportedAt: Date"],
                "methods": ["save(): Promise<StockDiscrepancyLog>", "findPending(bId: String): Promise<StockDiscrepancyLog[]>"]
            },
            {
                "name": "NotificationService",
                "type": "Secondary",
                "col": 1, "row": 1,
                "attributes": ["socketGateway: WebSocketGateway"],
                "methods": ["broadcastToRole(role: String, alertData: any): Promise<void>"]
            }
        ],
        "class_edges": [
            {"from": "ResolveDiscrepancyDto", "to": "DiscrepancyController", "label": "submits cause"},
            {"from": "DiscrepancyController", "to": "DiscrepancyService", "label": "invokes"},
            {"from": "DiscrepancyService", "to": "StockDiscrepancyLog", "label": "persists resolution"},
            {"from": "DiscrepancyService", "to": "NotificationService", "label": "clears alert"}
        ]
    },
    {
        "id": "UC-95",
        "sprint": 7,
        "title": "AI Cross-sell & Bundled Medicine Recommendation",
        "title_short": "AI Cross-sell Recommendation",
        "actor": "Customer",
        "ui": "Recommendation Drawer UI",
        "gateway_name": "API Gateway",
        "broker_name": "Kafka Broker",
        "service_name": "AI Service",
        "db_name": "MongoDB Database",
        "steps": [
            {"from": "actor", "to": "ui", "text": "Add antibiotic to cart (e.g. Augmentin)"},
            {"from": "ui", "to": "gateway", "text": "GET /api/orders/recommend-addons?medicineId=AUG1"},
            {"from": "gateway", "to": "kafka", "text": "send(\"ai.recommendation.cross_sell\", medicineId)"},
            {"from": "kafka", "to": "service", "text": "Consume topic: ai.recommendation.cross_sell"},
            {"from": "service", "to": "db", "text": "Query association rules & co-occurrence matrix (Probiotics, Vitamin C)"},
            {"from": "db", "to": "service", "text": "Return complementary products & bundle discount percentage", "is_return": True},
            {"from": "service", "to": "gateway", "text": "Publish bundle recommendation payload", "is_return": True},
            {"from": "gateway", "to": "ui", "text": "HTTP 200 OK (Recommended: Probiotic - 15% Combo Off)", "is_return": True},
            {"from": "ui", "to": "actor", "text": "Render 'Frequently Bought Together' bundle card with 1-click add", "is_return": True}
        ],
        "classes": [
            {
                "name": "CrossSellQueryDto",
                "type": "DTO",
                "col": 0, "row": 0,
                "attributes": ["triggerMedicineId: String", "cartMedicineIds: String[]", "branchId: String"],
                "methods": ["getBasketSize(): Number"]
            },
            {
                "name": "CrossSellController",
                "type": "Controller",
                "col": 1, "row": 0,
                "attributes": ["kafkaClient: ClientKafka", "cacheManager: Cache"],
                "methods": ["getRecommendations(dto: CrossSellQueryDto): Promise<RecommendationResult>"]
            },
            {
                "name": "CrossSellRecommendationService",
                "type": "Service",
                "col": 2, "row": 0,
                "attributes": ["ruleModel: Model<CrossSellRecommendation>", "inventoryModel: Model<Medicine>"],
                "methods": ["findComplementaryItems(medId: String): Promise<Medicine[]>", "filterInStockAddons(items: any[], branchId: String): Promise<Medicine[]>"]
            },
            {
                "name": "CrossSellRecommendation",
                "type": "Entity",
                "col": 0, "row": 1,
                "attributes": ["_id: ObjectId", "triggerMedicineId: String", "recommendedItemIds: String[]", "coOccurrenceConfidence: Number", "bundleDiscountRate: Number", "rationale: String"],
                "methods": ["save(): Promise<CrossSellRecommendation>", "findByTrigger(medId: String): Promise<CrossSellRecommendation>"]
            },
            {
                "name": "InventoryService",
                "type": "Secondary",
                "col": 1, "row": 1,
                "attributes": ["medicineBatchModel: Model<MedicineBatch>"],
                "methods": ["checkBranchBatchStock(branchId: String, medIds: String[]): Promise<Map<String, Number>>"]
            }
        ],
        "class_edges": [
            {"from": "CrossSellQueryDto", "to": "CrossSellController", "label": "passes cart state"},
            {"from": "CrossSellController", "to": "CrossSellRecommendationService", "label": "invokes"},
            {"from": "CrossSellRecommendationService", "to": "CrossSellRecommendation", "label": "reads rules"},
            {"from": "CrossSellRecommendationService", "to": "InventoryService", "label": "checks branch stock"}
        ]
    }
]
