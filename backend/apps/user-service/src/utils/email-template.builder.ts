// ===================================================================
// Công cụ xây dựng HTML Email chuẩn tương thích Gmail & Outlook
// Bắt buộc dùng Table Layout + Inline CSS (Gmail loại bỏ Flexbox/Grid)
// Layout mới: Thiết kế tối giản, hiện đại, chuẩn nhận diện ABC Pharmacy
// ===================================================================

export interface EmailTemplateParams {
  customerName?: string;
  headline?: string;
  subject?: string;
  preheader?: string;
  logoUrl?: string;
  bannerUrl?: string;
  greetingText?: string;
  mainContentHtml?: string;
  voucherCode?: string;
  discountSummary?: string;
  promotionEndDate?: Date | string;
  featuredProducts?: {
    name: string;
    imageUrl: string;
    originalPrice: number;
    salePrice: number;
    productUrl?: string;
  }[];
  ctaButtonText?: string;
  ctaButtonUrl?: string;
  termsAndConditions?: string;
  storeAddress?: string;
  hotline?: string;
  unsubscribeUrl: string;
}

/**
 * Xây dựng HTML email khuyến mãi chuẩn hóa cho ABC Pharmacy
 * Tuân thủ 100% bố cục thiết kế:
 *  1. Header logo ABC Pharmacy góc trái
 *  2. Lời chào: Xin chào [TÊN KHÁCH HÀNG],
 *  3. Tiêu đề lớn (Headline nổi bật màu xanh)
 *  4. Lời dẫn dắt / Cảm ơn
 *  5. Khung Voucher nét đứt (Dashed Box) kèm ngày hết hạn đỏ
 *  6. Nút Call-To-Action (MUA NGAY TẠI ABC PHARMACY)
 *  7. Ảnh Banner 1200x400 (tỉ lệ 3:1) đặt sau nút CTA
 *  8. Khối Điều kiện áp dụng
 *  9. Chân trang (Địa chỉ, Hotline, Hủy đăng ký)
 */
export function buildPromotionEmailHtml(params: EmailTemplateParams): string {
  const {
    customerName = '[TÊN KHÁCH HÀNG]',
    headline,
    subject = 'Giảm 20% toàn chuỗi',
    preheader = '',
    bannerUrl,
    greetingText = 'Cảm ơn bạn đã đồng hành cùng ABC Pharmacy. Món quà nhỏ dành riêng cho bạn.',
    mainContentHtml = '',
    voucherCode = 'HEALTH20',
    discountSummary = 'Giảm tối đa 100.000đ cho đơn từ 300.000đ',
    promotionEndDate,
    featuredProducts = [],
    ctaButtonText = 'MUA NGAY TẠI ABC PHARMACY',
    ctaButtonUrl = 'https://abcpharmacy.store/',
    termsAndConditions = '• Áp dụng cho sản phẩm không kê đơn tại toàn bộ chi nhánh.\n• Mỗi khách dùng 1 lần, không cộng gộp với ưu đãi khác.',
    storeAddress = '[ĐỊA CHỈ]',
    hotline = '[HOTLINE]',
    unsubscribeUrl,
  } = params;

  // Lấy tiêu đề hiển thị chính (loại bỏ tiền tố [TEST] nếu có)
  const displayHeadline = headline || subject.replace(/^\[TEST\]\s*/i, '') || 'Giảm 20% toàn chuỗi';

  // Định dạng ngày kết thúc theo dd/mm/yyyy
  let formattedEndDate = 'dd/mm/yyyy';
  if (promotionEndDate) {
    try {
      const d = new Date(promotionEndDate);
      if (!isNaN(d.getTime())) {
        const day = String(d.getDate()).padStart(2, '0');
        const month = String(d.getMonth() + 1).padStart(2, '0');
        const year = d.getFullYear();
        formattedEndDate = `${day}/${month}/${year}`;
      }
    } catch {
      formattedEndDate = 'dd/mm/yyyy';
    }
  }

  // Tách các dòng điều kiện áp dụng
  const termsList = termsAndConditions
    ? termsAndConditions
        .split('\n')
        .map((line) => line.trim())
        .filter((line) => line.length > 0)
    : [
        '• Áp dụng cho sản phẩm không kê đơn tại toàn bộ chi nhánh.',
        '• Mỗi khách dùng 1 lần, không cộng gộp với ưu đãi khác.',
      ];

  // Xây dựng HTML khối sản phẩm nổi bật (nếu có bổ sung thêm)
  const productsHtml =
    featuredProducts.length > 0
      ? `
      <tr>
        <td style="padding: 16px 28px 20px 28px;">
          <h3 style="color: #0f172a; font-size: 15px; margin: 0 0 12px 0; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif;">
            💊 Sản phẩm ưu đãi nổi bật:
          </h3>
          <table width="100%" cellpadding="0" cellspacing="0" role="presentation">
            ${featuredProducts
              .map(
                (prod) => `
              <tr>
                <td style="padding: 10px; border: 1px solid #e2e8f0; border-radius: 8px; margin-bottom: 8px;">
                  <table width="100%" cellpadding="0" cellspacing="0">
                    <tr>
                      <td width="64" valign="top">
                        <img src="${prod.imageUrl}" alt="${prod.name}" width="54" height="54"
                          style="border-radius: 6px; object-fit: cover; display: block;" />
                      </td>
                      <td valign="middle" style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; padding-left: 12px;">
                        <div style="font-weight: bold; color: #1e293b; font-size: 13px;">${prod.name}</div>
                        <div style="margin-top: 4px;">
                          <span style="color: #0070ba; font-weight: bold; font-size: 13px;">
                            ${Number(prod.salePrice).toLocaleString('vi-VN')}đ
                          </span>
                          <span style="color: #94a3b8; text-decoration: line-through; font-size: 11px; margin-left: 6px;">
                            ${Number(prod.originalPrice).toLocaleString('vi-VN')}đ
                          </span>
                        </div>
                      </td>
                    </tr>
                  </table>
                </td>
              </tr>
              <tr><td height="8"></td></tr>
            `,
              )
              .join('')}
          </table>
        </td>
      </tr>
    `
      : '';

  return `
<!DOCTYPE html>
<html lang="vi">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>${displayHeadline}</title>
</head>
<body style="margin: 0; padding: 0; background-color: #f1f5f9; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif;">

  <!-- Preheader ẩn hiển thị ngoài Gmail -->
  <div style="display: none; max-height: 0; overflow: hidden; opacity: 0;">
    ${preheader || greetingText}
  </div>

  <table width="100%" cellpadding="0" cellspacing="0" role="presentation" style="background-color: #f1f5f9; padding: 32px 12px;">
    <tr>
      <td align="center">
        <!-- Khung Card Email Chính -->
        <table width="560" cellpadding="0" cellspacing="0" role="presentation"
          style="max-width: 560px; width: 100%; background-color: #ffffff; border-radius: 14px; overflow: hidden; box-shadow: 0 4px 20px rgba(0,0,0,0.06); border: 1px solid #e2e8f0;">

          <!-- 1. HEADER & LOGO ABC PHARMACY -->
          <tr>
            <td style="padding: 24px 28px 16px 28px;">
              <table cellpadding="0" cellspacing="0" border="0">
                <tr>
                  <td style="width: 28px; height: 28px; background-color: #0070ba; border-radius: 6px; text-align: center; vertical-align: middle;">
                    <span style="color: #ffffff; font-size: 20px; font-weight: 800; line-height: 28px; display: inline-block;">+</span>
                  </td>
                  <td style="padding-left: 10px; font-size: 18px; font-weight: 800; color: #0f172a; letter-spacing: -0.2px;">
                    ABC Pharmacy
                  </td>
                </tr>
              </table>
            </td>
          </tr>

          <!-- 2. LỜI CHÀO, TIÊU ĐỀ NỔI BẬT & NỘI DUNG -->
          <tr>
            <td style="padding: 0 28px 20px 28px;">
              <!-- Lời chào -->
              <div style="font-size: 14px; color: #334155; margin-bottom: 8px;">
                Xin chào <strong>${customerName}</strong>,
              </div>

              <!-- Tiêu đề lớn màu xanh -->
              <h1 style="margin: 0 0 8px 0; font-size: 26px; font-weight: 800; color: #0070ba; line-height: 1.25;">
                ${displayHeadline}
              </h1>

              <!-- Lời cảm ơn / dẫn dắt -->
              <div style="font-size: 14px; color: #475569; line-height: 1.5; margin-bottom: 20px;">
                ${greetingText}
              </div>

              <!-- Nội dung chi tiết bổ sung (nếu có) -->
              ${
                mainContentHtml && mainContentHtml.trim() && mainContentHtml !== '<p>Nội dung bản xem trước</p>'
                  ? `<div style="font-size: 13px; color: #334155; line-height: 1.6; margin-bottom: 20px;">${mainContentHtml}</div>`
                  : ''
              }

              <!-- 3. KHUNG VOUCHER NÉT ĐỨT (DASHED BOX) -->
              ${
                voucherCode
                  ? `
              <table width="100%" cellpadding="0" cellspacing="0" role="presentation"
                style="border: 1.5px dashed #0070ba; border-radius: 8px; background-color: #ffffff; text-align: center; margin-bottom: 24px;">
                <tr>
                  <td style="padding: 18px 16px;">
                    <div style="font-size: 11px; font-weight: 700; color: #0070ba; text-transform: uppercase; letter-spacing: 1px; margin-bottom: 6px;">
                      MÃ ƯU ĐÃI CỦA BẠN
                    </div>
                    <div style="font-size: 32px; font-weight: 900; color: #0070ba; letter-spacing: 3px; line-height: 1.1; margin-bottom: 6px;">
                      ${voucherCode}
                    </div>
                    ${discountSummary ? `<div style="font-size: 13px; color: #334155; margin-bottom: 4px;">${discountSummary}</div>` : ''}
                    <div style="font-size: 13px; font-weight: 700; color: #b91c1c; margin-top: 4px;">
                      Dùng đến [${formattedEndDate}]
                    </div>
                  </td>
                </tr>
              </table>
              `
                  : ''
              }

              <!-- 4. NÚT CALL TO ACTION (MUA NGAY TẠI ABC PHARMACY) -->
              <table width="100%" cellpadding="0" cellspacing="0" role="presentation" style="margin-bottom: 24px;">
                <tr>
                  <td align="center">
                    <a href="${ctaButtonUrl}" target="_blank"
                      style="background-color: #0070ba; color: #ffffff; text-decoration: none; padding: 12px 30px; border-radius: 6px; font-weight: 800; font-size: 14px; display: inline-block; letter-spacing: 0.5px; text-transform: uppercase;">
                      ${ctaButtonText}
                    </a>
                  </td>
                </tr>
              </table>

              <!-- 5. ẢNH BANNER 1200x400 (TỈ LỆ 3:1 ĐẶT SAU NÚT CTA) -->
              ${
                bannerUrl && !bannerUrl.includes('placeholder.com')
                  ? `
              <table width="100%" cellpadding="0" cellspacing="0" role="presentation" style="margin-bottom: 24px;">
                <tr>
                  <td>
                    <img src="${bannerUrl}" alt="Banner khuyến mãi" width="100%"
                      style="width: 100%; aspect-ratio: 3/1; object-fit: cover; border-radius: 6px; display: block; border: 0;" />
                  </td>
                </tr>
              </table>
              `
                  : `
              <table width="100%" cellpadding="0" cellspacing="0" role="presentation"
                style="margin-bottom: 24px; background-color: #e0f2fe; border-radius: 6px; text-align: center;">
                <tr>
                  <td style="padding: 42px 16px; color: #0369a1; font-size: 13px; font-weight: 500;">
                    [ẢNH BANNER 1200×400 - ảnh lối sống, tỉ lệ 3:1, không dùng ảnh vỉ thuốc]
                  </td>
                </tr>
              </table>
              `
              }

              <!-- 6. ĐIỀU KIỆN ÁP DỤNG -->
              <div style="margin-bottom: 24px;">
                <div style="font-size: 13px; font-weight: 700; color: #0f172a; margin-bottom: 6px;">
                  Điều kiện áp dụng
                </div>
                <div style="color: #475569; font-size: 12px; line-height: 1.6;">
                  ${termsList
                    .map((item) => `<div>${item.startsWith('•') ? item : `• ${item}`}</div>`)
                    .join('')}
                </div>
              </div>

              <!-- 7. CHÂN TRANG & LINK HỦY ĐĂNG KÝ -->
              <div style="border-top: 1px solid #f1f5f9; padding-top: 20px; text-align: center; font-size: 11px; color: #64748b; line-height: 1.6;">
                <div style="font-weight: 600; color: #475569;">ABC Pharmacy - ${storeAddress}</div>
                <div>Hotline dược sĩ tư vấn: ${hotline}</div>
                <div style="margin-top: 4px;">Bạn nhận email này vì đã đăng ký thành viên tại ABC Pharmacy.</div>
                <div style="margin-top: 2px;">
                  <a href="${unsubscribeUrl}" style="color: #64748b; text-decoration: underline;">Hủy đăng ký nhận email</a>
                </div>
              </div>

            </td>
          </tr>

          <!-- SẢN PHẨM NỔI BẬT NẾU CÓ -->
          ${productsHtml}

        </table>
      </td>
    </tr>
  </table>

</body>
</html>
  `.trim();
}

