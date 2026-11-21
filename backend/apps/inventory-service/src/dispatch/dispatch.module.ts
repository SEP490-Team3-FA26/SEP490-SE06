import { Module } from '@nestjs/common';
import { ClientsModule, Transport } from '@nestjs/microservices';
import { MongooseModule } from '@nestjs/mongoose';
import { DispatchController } from './dispatch.controller';
import { DispatchService } from './dispatch.service';
import { DispatchCronService } from './dispatch-cron.service';
import { DispatchOrder, DispatchOrderSchema } from './schemas/dispatch-order.schema';
import { Tote, ToteSchema } from './schemas/tote.schema';
import { ProcessedRequest, ProcessedRequestSchema } from './schemas/processed-request.schema';
import { MedicineModule } from '../medicine/medicine.module';
import { NationalPharmaModule } from '../national-pharma/national-pharma.module';
import { InventoryTransaction, InventoryTransactionSchema } from '../purchase/schemas/inventory-transaction.schema';
import { PurchaseRequisition, PurchaseRequisitionSchema } from '../purchase/schemas/purchase-requisition.schema';
import { StockTransfer, StockTransferSchema } from '../purchase/schemas/stock-transfer.schema';

@Module({
  imports: [
    MongooseModule.forFeature([
      { name: DispatchOrder.name, schema: DispatchOrderSchema },
      { name: Tote.name, schema: ToteSchema },
      { name: ProcessedRequest.name, schema: ProcessedRequestSchema },
      { name: InventoryTransaction.name, schema: InventoryTransactionSchema },
      { name: PurchaseRequisition.name, schema: PurchaseRequisitionSchema },
      { name: StockTransfer.name, schema: StockTransferSchema },
    ]),
    MedicineModule,
    NationalPharmaModule,
    ClientsModule.register([
      {
        name: 'KAFKA_CLIENT',
        transport: Transport.KAFKA,
        options: {
          client: {
            clientId: 'inventory-dispatch-client',
            brokers: (process.env.KAFKA_BROKERS || 'localhost:9092').split(','),
            connectionTimeout: 10000,
            retry: { initialRetryTime: 1000, retries: 10 },
            logLevel: 0,
          },
          consumer: {
            groupId: 'inventory-dispatch-client-group',
          },
          producer: { allowAutoTopicCreation: true, maxMessageBytes: 10485760 },
        },
      },
    ]),
  ],
  controllers: [DispatchController],
  providers: [DispatchService, DispatchCronService],
  exports: [DispatchService, MongooseModule],
})
export class DispatchModule {}
