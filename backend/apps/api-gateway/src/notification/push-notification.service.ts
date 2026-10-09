import { Injectable, Logger, OnModuleInit } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import * as path from 'path';
import * as fs from 'fs';
import { initializeApp, cert, getApps, App } from 'firebase-admin/app';
import { getMessaging, Messaging } from 'firebase-admin/messaging';
import { DeviceToken, DeviceTokenDocument } from './schemas/device-token.schema';
import { IotAlert, IotAlertDocument } from './schemas/iot-alert.schema';

export interface PushPayload {
  title: string;
  body: string;
  channelId?: string;
  sound?: string;
  data?: Record<string, string>;
  severity?: 'WARNING' | 'CRITICAL' | 'EMERGENCY';
}

@Injectable()
export class PushNotificationService implements OnModuleInit {
  private readonly logger = new Logger(PushNotificationService.name);
  private firebaseApp: App | null = null;
  private messaging: Messaging | null = null;

  constructor(
    @InjectModel(DeviceToken.name)
    private readonly deviceTokenModel: Model<DeviceTokenDocument>,
    @InjectModel(IotAlert.name)
    private readonly iotAlertModel: Model<IotAlertDocument>,
  ) {}

  onModuleInit() {
    this.initFirebase();
  }

  // Khoi tao Firebase Admin SDK bang service-account-key.json
  private initFirebase() {
    try {
      if (getApps().length > 0) {
        this.firebaseApp = getApps()[0];
        this.messaging = getMessaging(this.firebaseApp);
        this.logger.log('Firebase Admin SDK da duoc khoi tao truoc do');
        return;
      }

      // Tim kiem file service-account-key.json o cac thu muc tiem nang
      const candidatePaths = [
        path.resolve(process.cwd(), 'service-account-key.json'),
        path.resolve(process.cwd(), 'backend', 'service-account-key.json'),
        path.resolve(__dirname, '../../../../service-account-key.json'),
        path.resolve(__dirname, '../../../../../service-account-key.json'),
      ];

      let keyPath: string | null = null;
      for (const p of candidatePaths) {
        if (fs.existsSync(p)) {
          keyPath = p;
          break;
        }
      }

      if (!keyPath) {
        this.logger.warn('Khong tim thay file service-account-key.json, tinh nang FCM tam thoi chua kich hoat');
        return;
      }

      const serviceAccount = JSON.parse(fs.readFileSync(keyPath, 'utf8'));
      this.firebaseApp = initializeApp({
        credential: cert(serviceAccount),
      });
      this.messaging = getMessaging(this.firebaseApp);
      this.logger.log(`Firebase Admin khoi tao thanh cong voi du an: ${serviceAccount.project_id}`);
    } catch (err: any) {
      this.logger.error(`Loi khoi tao Firebase Admin: ${err?.message || err}`);
    }
  }

  // Dang ky hoac cap nhat device token tu mobile
  async registerToken(data: {
    userId: string;
    role: string;
    branchId?: string;
    pushToken: string;
    platform?: string;
    deviceModel?: string;
  }): Promise<DeviceToken> {
    const { userId, role, branchId, pushToken, platform, deviceModel } = data;
    if (!pushToken) {
      throw new Error('Push token khong duoc de trong');
    }

    const tokenType = pushToken.startsWith('ExponentPushToken') ? 'EXPO' : 'FCM';

    const updated = await this.deviceTokenModel.findOneAndUpdate(
      { pushToken },
      {
        $set: {
          userId,
          role,
          branchId: branchId || null,
          tokenType,
          platform: platform || 'android',
          deviceModel: deviceModel || 'Unknown',
          isActive: true,
          lastActiveAt: new Date(),
        },
      },
      { upsert: true, new: true },
    );

    this.logger.log(`Da dang ky thiet bi: role=${role}, type=${tokenType}, token=${pushToken.substring(0, 20)}...`);
    return updated;
  }

  // Huy kich hoat token khi logout
  async unregisterToken(pushToken: string): Promise<boolean> {
    if (!pushToken) return false;
    await this.deviceTokenModel.updateOne({ pushToken }, { $set: { isActive: false } });
    this.logger.log(`Da huy kich hoat token: ${pushToken.substring(0, 20)}...`);
    return true;
  }

  // Gui push den tat ca cac thiet bi cua mot Role cu the (vi du: 'warehouse')
  async sendToRole(role: string, payload: PushPayload): Promise<{ sent: number; failed: number }> {
    const devices = await this.deviceTokenModel.find({ role, isActive: true }).lean();
    if (!devices || devices.length === 0) {
      this.logger.warn(`Khong tim thay thiet bi nao dang hoat dong cho role: ${role}`);
      return { sent: 0, failed: 0 };
    }

    return this.dispatchPush(devices, payload);
  }

  // Dieu phoi gui qua ca Firebase (FCM) va Expo dua tren loai token
  private async dispatchPush(
    devices: any[],
    payload: PushPayload,
  ): Promise<{ sent: number; failed: number }> {
    const fcmTokens: string[] = [];
    const expoTokens: string[] = [];

    for (const d of devices) {
      if (d.tokenType === 'EXPO' || d.pushToken.startsWith('ExponentPushToken')) {
        expoTokens.push(d.pushToken);
      } else {
        fcmTokens.push(d.pushToken);
      }
    }

    let sent = 0;
    let failed = 0;

    // 1. Gui qua Firebase Admin cho Android FCM
    if (fcmTokens.length > 0 && this.messaging) {
      try {
        const channelId = payload.channelId || 'iot_temperature_critical';
        const sound = payload.sound || 'siren_alarm';

        const res = await this.messaging.sendEachForMulticast({
          tokens: fcmTokens,
          notification: {
            title: payload.title,
            body: payload.body,
          },
          android: {
            priority: 'high',
            notification: {
              channelId,
              sound,
              defaultVibrateTimings: true,
            },
          },
          apns: {
            payload: {
              aps: {
                sound: 'default',
                badge: 1,
              },
            },
          },
          data: payload.data || {},
        });

        sent += res.successCount;
        failed += res.failureCount;

        // Tu dong don dep cac token khong con hop le
        const invalidTokens: string[] = [];
        res.responses.forEach((resp, idx) => {
          if (!resp.success) {
            const errorCode = resp.error?.code;
            if (
              errorCode === 'messaging/registration-token-not-registered' ||
              errorCode === 'messaging/invalid-registration-token'
            ) {
              invalidTokens.push(fcmTokens[idx]);
            }
          }
        });

        if (invalidTokens.length > 0) {
          await this.deviceTokenModel.updateMany(
            { pushToken: { $in: invalidTokens } },
            { $set: { isActive: false } },
          );
          this.logger.log(`Da vo hieu hoa ${invalidTokens.length} token FCM het han`);
        }
      } catch (err: any) {
        this.logger.error(`Loi khi gui FCM Multicast: ${err?.message || err}`);
        failed += fcmTokens.length;
      }
    }

    // 2. Gui qua Expo Push API cho may iOS demo
    if (expoTokens.length > 0) {
      try {
        const messages = expoTokens.map((token) => ({
          to: token,
          sound: 'default',
          title: payload.title,
          body: payload.body,
          data: payload.data || {},
          priority: 'high',
          channelId: payload.channelId || 'iot_temperature_critical',
        }));

        const expoRes = await fetch('https://exp.host/--/api/v2/push/send', {
          method: 'POST',
          headers: {
            'Accept': 'application/json',
            'Accept-encoding': 'gzip, deflate',
            'Content-Type': 'application/json',
          },
          body: JSON.stringify(messages),
        });

        if (expoRes.ok) {
          sent += expoTokens.length;
        } else {
          failed += expoTokens.length;
        }
      } catch (err: any) {
        this.logger.error(`Loi khi gui Expo Push API: ${err?.message || err}`);
        failed += expoTokens.length;
      }
    }

    this.logger.log(`Ket qua phat push: thanh cong ${sent}, that bai ${failed}`);
    return { sent, failed };
  }

  // Luu ban ghi vao collection iot_alerts
  async recordIotAlert(data: {
    deviceId: string;
    stationName: string;
    targetId: string;
    currentValue: number;
    thresholdValue: number;
    severity?: 'WARNING' | 'CRITICAL' | 'EMERGENCY';
  }) {
    try {
      const code = `ALT-${Date.now()}-${Math.floor(Math.random() * 1000)}`;
      return await this.iotAlertModel.create({
        alertCode: code,
        deviceId: data.deviceId,
        stationName: data.stationName,
        targetId: data.targetId,
        currentValue: data.currentValue,
        thresholdValue: data.thresholdValue,
        severity: data.severity || 'CRITICAL',
        status: 'TRIGGERED',
        triggeredAt: new Date(),
      });
    } catch (e: any) {
      this.logger.warn(`Loi luu iot_alert: ${e?.message}`);
      return null;
    }
  }
}
