import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { Notification, NotificationSchema } from './notification.schema';
import { NotificationService } from './notification.service';
import { NotificationController } from './notification.controller';
import { DeviceToken, DeviceTokenSchema } from './schemas/device-token.schema';
import { IotAlert, IotAlertSchema } from './schemas/iot-alert.schema';
import { SensorStation, SensorStationSchema } from './schemas/sensor-station.schema';
import { PushNotificationService } from './push-notification.service';

@Module({
  imports: [
    MongooseModule.forFeature([
      { name: Notification.name, schema: NotificationSchema },
      { name: DeviceToken.name, schema: DeviceTokenSchema },
      { name: IotAlert.name, schema: IotAlertSchema },
      { name: SensorStation.name, schema: SensorStationSchema },
    ]),
  ],
  controllers: [NotificationController],
  providers: [NotificationService, PushNotificationService],
  exports: [NotificationService, PushNotificationService],
})
export class NotificationModule {}

