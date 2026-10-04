import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { MedicineController } from './medicine.controller';
import { MedicineService } from './medicine.service';
import { RecommendationService } from './recommendation.service';
import { Medicine, MedicineSchema } from './schemas/medicine.schema';
import { MedicineBatch, MedicineBatchSchema } from './schemas/medicine-batch.schema';
import { MedicineLocation, MedicineLocationSchema } from './schemas/medicine-location.schema';
import { BranchInventory, BranchInventorySchema } from './schemas/branch-inventory.schema';
import { BranchStockBalance, BranchStockBalanceSchema } from './schemas/branch-stock-balance.schema';
import { InventoryCheck, InventoryCheckSchema } from './schemas/inventory-check.schema';
import { InventoryTransaction, InventoryTransactionSchema } from '../purchase/schemas/inventory-transaction.schema';
import { SearchHistory, SearchHistorySchema } from './schemas/search-history.schema';

@Module({
  imports: [
    MongooseModule.forFeature([
      { name: Medicine.name, schema: MedicineSchema },
      { name: MedicineBatch.name, schema: MedicineBatchSchema },
      { name: MedicineLocation.name, schema: MedicineLocationSchema },
      { name: BranchInventory.name, schema: BranchInventorySchema },
      { name: BranchStockBalance.name, schema: BranchStockBalanceSchema },
      { name: InventoryCheck.name, schema: InventoryCheckSchema },
      { name: InventoryTransaction.name, schema: InventoryTransactionSchema },
      { name: SearchHistory.name, schema: SearchHistorySchema },
    ]),
  ],
  controllers: [MedicineController],
  providers: [MedicineService, RecommendationService],
  exports: [MongooseModule, RecommendationService], // Export MongooseModule & RecommendationService so other modules can use them
})
export class MedicineModule {}

