import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document, Types } from 'mongoose';

@Schema()
export class GoodsReceiptNoteItem {
  @Prop({ type: String, required: true })
  medicineId: string;

  @Prop({ type: String })
  batchNo?: string;

  @Prop({ type: Date })
  expDate?: Date;

  @Prop({ type: Number, required: true, min: 1 })
  quantity: number;

  @Prop({ type: Number })
  actualQty?: number;

  @Prop({ type: String, default: 'PENDING', enum: ['PENDING', 'VERIFIED'] })
  status: string;

  @Prop({ type: Number, required: true, min: 0 })
  unitPrice: number;

  /**
   * Vị trí thùng được thủ kho chọn khi nghiệm thu (4 cấp: Khu → Kệ → Tầng → Thùng).
   * Sau khi GRN được duyệt, giá trị này được copy sang MedicineBatch.location.
   * Nếu null: Batch sẽ dùng location mặc định (A/A1/1/1 MAIN).
   */
  @Prop({
    type: {
      zone:     { type: String },
      rack:     { type: String },
      shelf:    { type: Number },
      bin:      { type: Number },
      slotType: { type: String, default: 'MAIN', enum: ['MAIN', 'RESERVE'] },
    },
    default: null,
  })
  shelvedLocation?: {
    zone: string;
    rack: string;
    shelf: number;
    bin: number;
    slotType: 'MAIN' | 'RESERVE';
  } | null;
}
export const GoodsReceiptNoteItemSchema = SchemaFactory.createForClass(GoodsReceiptNoteItem);

@Schema({ timestamps: true, collection: 'goodsreceiptnotes' })
export class GoodsReceiptNote extends Document {
  @Prop({ type: String, required: true })
  poId: string; // Ref to PurchaseOrder

  @Prop({ type: [GoodsReceiptNoteItemSchema], required: true })
  items: GoodsReceiptNoteItem[];

  @Prop({ type: Number, required: true, min: 0 })
  totalAmount: number;

  @Prop({ type: String, default: 'DRAFT', enum: ['DRAFT', 'INSPECTING', 'PENDING_APPROVAL', 'COMPLETED', 'CANCELLED'] })
  status: string;

  @Prop({ type: String })
  vatInvoiceNumber?: string;

  @Prop({ type: String })
  supplierName?: string;

  @Prop({ type: String })
  nationalFacilityCode?: string;

  @Prop({ type: String })
  nationalSyncCode?: string;

  @Prop({ type: String, default: 'SYNCED', enum: ['PENDING', 'SYNCED', 'FAILED'] })
  nationalSyncStatus?: string;

  @Prop({ type: Date })
  nationalSyncedAt?: Date;

  @Prop({ type: String })
  nationalSyncMessage?: string;

  @Prop({ type: String }) // Optional user ID of the receiver
  receivedBy: string;

  @Prop({ type: String })
  discrepancyReason?: string;

  createdAt: Date;
  updatedAt: Date;
}

export const GoodsReceiptNoteSchema = SchemaFactory.createForClass(GoodsReceiptNote);
