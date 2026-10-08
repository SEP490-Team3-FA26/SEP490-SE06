import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document } from 'mongoose';

export type SearchHistoryDocument = SearchHistory & Document;

@Schema({ collection: 'search_histories', timestamps: true })
export class SearchHistory {
  @Prop({ index: true })
  phone?: string;

  @Prop({ index: true })
  userId?: string;

  @Prop({ index: true })
  deviceId?: string;

  @Prop({ required: true, trim: true, lowercase: true, index: true })
  keyword: string;

  @Prop()
  category?: string;

  @Prop({ default: 0 })
  resultsCount: number;

  @Prop({ default: Date.now, expires: 14 * 24 * 60 * 60 }) // TTL 14 ngày tự hủy theo chuẩn GDPR/PDPD
  createdAt: Date;
}

export const SearchHistorySchema = SchemaFactory.createForClass(SearchHistory);
SearchHistorySchema.index({ phone: 1, createdAt: -1 });
SearchHistorySchema.index({ userId: 1, createdAt: -1 });
SearchHistorySchema.index({ deviceId: 1, createdAt: -1 });
SearchHistorySchema.index({ keyword: 1 });
