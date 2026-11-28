import React from "react";
import { QRCodeSVG } from "qrcode.react";

export interface QrPreviewData {
  code: string;
  title: string;
  subtitle: string;
}

interface QrZoomModalProps {
  preview: QrPreviewData | null;
  onClose: () => void;
}

/**
 * Modal hiển thị phóng to mã QR Khay kệ hoặc QR Giỏ Tote cho nhân viên quét Mobile
 */
export const QrZoomModal: React.FC<QrZoomModalProps> = ({ preview, onClose }) => {
  if (!preview) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div
        className="absolute inset-0 bg-slate-900/60 backdrop-blur-xs"
        onClick={onClose}
      />
      <div className="relative bg-white rounded-2xl p-6 shadow-2xl max-w-sm w-full text-center space-y-4 border border-slate-200">
        <h4 className="font-bold text-slate-800 text-sm">{preview.title}</h4>
        <div className="p-4 bg-slate-50 rounded-xl inline-block border border-slate-200 shadow-inner">
          <QRCodeSVG value={preview.code} size={200} level="M" />
        </div>
        <div className="font-mono font-black text-sm text-sky-700 tracking-wider">
          {preview.code}
        </div>
        <p className="text-xs text-slate-500">{preview.subtitle}</p>
        <button
          type="button"
          onClick={onClose}
          className="w-full py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl font-bold text-xs cursor-pointer"
        >
          Đóng mã QR
        </button>
      </div>
    </div>
  );
};

