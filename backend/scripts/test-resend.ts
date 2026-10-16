import * as dotenv from 'dotenv';
import * as path from 'path';
dotenv.config({ path: path.resolve(__dirname, '../.env') });
import { Resend } from 'resend';

async function main() {
  const apiKey = process.env.RESEND_API_KEY;
  if (!apiKey) {
    console.error('Khong tim thay RESEND_API_KEY trong file .env');
    process.exit(1);
  }

  const resend = new Resend(apiKey);
  const targetEmail = process.argv[2] || 'phuche2004p@gmail.com';
  const fromEmail = process.env.RESEND_FROM_EMAIL || 'no-reply@abcpharmacy.store';

  console.log(`Dang gui email test toi ${targetEmail} tu ${fromEmail}...`);
  const result = await resend.emails.send({
    from: fromEmail,
    to: targetEmail,
    subject: 'ABC Pharmacy - Kiem tra he thong Email Resend',
    html: `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; border: 1px solid #e2e8f0; border-radius: 12px;">
        <h2 style="color: #0057cd;">ABC Pharmacy System</h2>
        <p>Email gui thu nghiem thanh cong tu backend ABC Pharmacy su dung Resend API!</p>
        <hr style="border: 0; border-top: 1px solid #e2e8f0; margin: 20px 0;"/>
        <p style="font-size: 12px; color: #64748b;">Thoi gian gui: ${new Date().toLocaleString('vi-VN')}</p>
      </div>
    `,
  });

  console.log('Ket qua Resend:', result);
}

main().catch(console.error);
