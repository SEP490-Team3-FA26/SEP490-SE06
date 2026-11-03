import { Injectable, Logger } from '@nestjs/common';
import { SQSClient, SendMessageCommand } from '@aws-sdk/client-sqs';
import * as nodemailer from 'nodemailer';
import { Resend } from 'resend';

/**
 * Một "email job" đẩy vào queue hoặc gửi trực tiếp.
 */
export interface EmailJob {
  to: string | string[];
  subject: string;
  html?: string;
  text?: string;
  from?: string;
  replyTo?: string;
}

/**
 * Service gửi Email đa tầng:
 * 1. Resend API (ưu tiên cao nhất nếu có RESEND_API_KEY).
 * 2. AWS SQS (nếu có SQS_EMAIL_QUEUE_URL).
 * 3. Gmail SMTP (fallback).
 */
@Injectable()
export class SqsEmailService {
  private readonly logger = new Logger(SqsEmailService.name);

  private readonly resend = process.env.RESEND_API_KEY
    ? new Resend(process.env.RESEND_API_KEY)
    : null;
  private readonly resendFrom = process.env.RESEND_FROM_EMAIL || 'no-reply@abcpharmacy.store';

  private readonly sqs = new SQSClient({
    region: process.env.AWS_REGION || 'ap-southeast-1',
  });
  private readonly queueUrl = process.env.SQS_EMAIL_QUEUE_URL;
  private readonly defaultFrom = process.env.SES_FROM_EMAIL;

  private readonly transporter = process.env.SMTP_USER && process.env.SMTP_PASS
    ? nodemailer.createTransport({
        host: 'smtp.gmail.com',
        port: 587,
        secure: false,
        auth: {
          user: process.env.SMTP_USER,
          pass: process.env.SMTP_PASS,
        },
      })
    : null;

  /** Có cấu hình Resend, SQS hoặc SMTP hay chưa. */
  get isEnabled(): boolean {
    return !!this.resend || !!this.queueUrl || !!this.transporter;
  }

  async sendEmail(job: EmailJob): Promise<void> {
    // 1. Ưu tiên Resend (Gửi trực tiếp đến đúng danh sách người nhận)
    if (this.resend) {
      try {
        const { data, error } = await this.resend.emails.send({
          from: this.resendFrom,
          to: job.to,
          subject: job.subject,
          html: job.html || job.text,
          text: job.text,
        });

        if (error) {
          throw new Error(error.message);
        }

        const recipients = Array.isArray(job.to) ? job.to.join(', ') : job.to;
        this.logger.log(`Da gui email thanh cong toi ${recipients} qua Resend (ID: ${data?.id})`);
        return;
      } catch (err: any) {
        this.logger.error(`Loi gui Resend toi ${JSON.stringify(job.to)}: ${err.message}`);
      }
    }

    // 2. Fallback sang AWS SQS
    if (this.queueUrl) {
      const body: EmailJob = { from: this.defaultFrom, ...job };

      await this.sqs.send(
        new SendMessageCommand({
          QueueUrl: this.queueUrl,
          MessageBody: JSON.stringify(body),
        }),
      );
      this.logger.log(
        `Đã enqueue email tới ${Array.isArray(job.to) ? job.to.join(', ') : job.to} qua SQS`,
      );
      return;
    }

    // 3. Fallback sang Gmail SMTP
    if (this.transporter) {
      const mailOptions = {
        from: process.env.SMTP_USER,
        to: Array.isArray(job.to) ? job.to.join(', ') : job.to,
        subject: job.subject,
        html: job.html,
        text: job.text,
      };

      await this.transporter.sendMail(mailOptions);
      this.logger.log(
        `Đã gửi email trực tiếp tới ${mailOptions.to} qua Gmail SMTP (Fallback)`,
      );
      return;
    }

    this.logger.warn(
      `Chưa cấu hình dịch vụ gửi email nào khả dụng — bỏ qua gửi mail tới ${JSON.stringify(job.to)}`,
    );
  }
}

