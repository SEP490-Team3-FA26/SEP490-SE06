import React from 'react';
import { QRCodeSVG } from 'qrcode.react';

interface VietQRCodeProps {
  value: string;
  size?: number;
  className?: string;
  alt?: string;
}

export const VietQRCode: React.FC<VietQRCodeProps> = ({
  value,
  size = 224,
  className = '',
  alt = 'VietQR Code',
}) => {
  if (!value) {
    return (
      <div
        style={{ width: size, height: size }}
        className={`bg-slate-100 flex items-center justify-center text-slate-400 text-xs font-semibold rounded-xl border border-slate-200 animate-pulse ${className}`}
      >
        Đang tạo mã QR...
      </div>
    );
  }

  // If value is a direct image URL (e.g. data:image or ends with an image extension)
  const isDirectImageUrl =
    value.startsWith('data:image/') ||
    /^https?:\/\/.*\.(png|jpg|jpeg|gif|webp|svg)(\?.*)?$/i.test(value);

  if (isDirectImageUrl) {
    return (
      <img
        src={value}
        alt={alt}
        style={{ width: size, height: size }}
        className={`object-contain rounded-lg ${className}`}
      />
    );
  }

  // Render pure vector SVG offline without any external network dependency
  return (
    <div
      style={{ width: size, height: size }}
      className={`bg-white p-2 rounded-xl flex items-center justify-center shadow-xs ${className}`}
    >
      <QRCodeSVG
        value={value}
        size={size - 16}
        level="M"
        includeMargin={false}
        className="w-full h-full"
      />
    </div>
  );
};

export default VietQRCode;
