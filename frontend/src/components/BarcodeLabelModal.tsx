import React, { useState, useMemo } from 'react';
import { X, Printer, Download, Sparkles, Copy, Check, Tag, ShieldCheck, RefreshCw } from 'lucide-react';
import { generateEAN13SVG, calculateEAN13Checksum } from '../utils/barcodeGenerator';
import { medicineService } from '../services/inventory/medicine.service';

interface BarcodeLabelModalProps {
  isOpen: boolean;
  onClose: () => void;
  medicine: any;
  onMedicineUpdated?: (updated: any) => void;
}

export const BarcodeLabelModal: React.FC<BarcodeLabelModalProps> = ({
  isOpen,
  onClose,
  medicine,
  onMedicineUpdated
}) => {
  const [labelFormat, setLabelFormat] = useState<'thermal_50x30' | 'thermal_40x30' | 'sheet_a4'>('thermal_50x30');
  const [printQuantity, setPrintQuantity] = useState<number>(1);
  const [copied, setCopied] = useState(false);
  const [isGenerating, setIsGenerating] = useState(false);
  const [selectedUnit, setSelectedUnit] = useState<string>(medicine?.unit || 'Hộp');

  const barcodeValue = useMemo(() => {
    if (medicine?.barcode && medicine.barcode.trim() !== '') {
      return medicine.barcode;
    }
    // Fallback: SKU or generate preview
    if (medicine?.sku && /^\d{12,13}$/.test(medicine.sku)) {
      return medicine.sku;
    }
    return '8930000000000';
  }, [medicine]);

  const currentPrice = useMemo(() => {
    if (medicine?.units && Array.isArray(medicine.units)) {
      const u = medicine.units.find((item: any) => item.unitName === selectedUnit);
      if (u && u.price) return u.price;
    }
    return medicine?.price || 0;
  }, [medicine, selectedUnit]);

  const svgBarcode = useMemo(() => {
    return generateEAN13SVG(barcodeValue, {
      width: 220,
      height: 65,
      fontSize: 12,
      showText: true,
      barColor: '#111827'
    });
  }, [barcodeValue]);

  if (!isOpen || !medicine) return null;

  const handleCopy = () => {
    navigator.clipboard.writeText(barcodeValue);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleRegenerateBarcode = async () => {
    try {
      setIsGenerating(true);
      const res = await medicineService.generateBarcode(medicine._id || medicine.id);
      if (res && res.success) {
        if (onMedicineUpdated) {
          onMedicineUpdated(res.medicine);
        }
      }
    } catch (err) {
      console.error('Lỗi khi sinh mã vạch:', err);
    } finally {
      setIsGenerating(false);
    }
  };

  const handlePrint = () => {
    const printWindow = window.open('', '_blank', 'width=600,height=600');
    if (!printWindow) return;

    const items = Array.from({ length: printQuantity });
    const labelHtml = items
      .map(
        () => `
        <div class="label-item">
          <div class="header">
            <span class="brand">PharmaChain GSP</span>
            <span class="unit-tag">${selectedUnit}</span>
          </div>
          <div class="med-name">${medicine.name || 'Dược phẩm'}</div>
          <div class="sku-row">
            <span>SKU: ${medicine.sku || 'N/A'}</span>
            <span class="price">${Number(currentPrice).toLocaleString('vi-VN')} đ</span>
          </div>
          <div class="barcode-container">
            ${svgBarcode}
          </div>
          <div class="footer">
            <span>HSD: ${medicine.expiry_date || 'Xem trên bao bì'}</span>
            <span>Hàng chính hãng</span>
          </div>
        </div>
      `
      )
      .join('');

    printWindow.document.write(`
      <!DOCTYPE html>
      <html>
        <head>
          <title>In Tem Mã Vạch - ${medicine.name}</title>
          <style>
            @page {
              size: ${labelFormat === 'sheet_a4' ? 'A4' : '50mm 30mm'};
              margin: 2mm;
            }
            body {
              font-family: Arial, -apple-system, BlinkMacSystemFont, sans-serif;
              margin: 0;
              padding: 0;
              background: #fff;
              color: #000;
            }
            .print-wrapper {
              display: flex;
              flex-wrap: wrap;
              gap: 2mm;
            }
            .label-item {
              width: 48mm;
              height: 28mm;
              box-sizing: border-box;
              border: 1px dashed #ccc;
              padding: 1.5mm 2mm;
              display: flex;
              flex-direction: column;
              justify-content: space-between;
              page-break-inside: avoid;
            }
            .header {
              display: flex;
              justify-content: space-between;
              align-items: center;
              font-size: 7pt;
              font-weight: bold;
              border-bottom: 0.5px solid #000;
              padding-bottom: 1px;
            }
            .unit-tag {
              background: #000;
              color: #fff;
              padding: 0.5px 3px;
              border-radius: 2px;
              font-size: 6pt;
            }
            .med-name {
              font-size: 7.5pt;
              font-weight: bold;
              line-height: 1.1;
              max-height: 16px;
              overflow: hidden;
              text-overflow: ellipsis;
              display: -webkit-box;
              -webkit-line-clamp: 2;
              -webkit-box-orient: vertical;
              margin: 1px 0;
            }
            .sku-row {
              display: flex;
              justify-content: space-between;
              font-size: 6.5pt;
              font-weight: bold;
            }
            .price {
              font-size: 7.5pt;
              color: #000;
            }
            .barcode-container {
              display: flex;
              justify-content: center;
              align-items: center;
              margin: 1px 0;
            }
            .barcode-container svg {
              width: 44mm;
              height: 12mm;
            }
            .footer {
              display: flex;
              justify-content: space-between;
              font-size: 5.5pt;
              color: #333;
            }
          </style>
        </head>
        <body>
          <div class="print-wrapper">
            ${labelHtml}
          </div>
          <script>
            window.onload = function() {
              window.print();
              setTimeout(function() { window.close(); }, 500);
            };
          </script>
        </body>
      </html>
    `);
    printWindow.document.close();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm animate-in fade-in duration-200">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-xl overflow-hidden border border-slate-100 flex flex-col max-h-[90vh]">
        {/* Header */}
        <div className="px-6 py-4 bg-gradient-to-r from-emerald-600 to-teal-700 text-white flex items-center justify-between">
          <div className="flex items-center space-x-3">
            <div className="w-10 h-10 rounded-xl bg-white/10 flex items-center justify-center backdrop-blur-md">
              <Tag className="w-5 h-5 text-emerald-100" />
            </div>
            <div>
              <h3 className="text-lg font-bold text-white">In Tem Nhãn Mã Vạch Dược Phẩm</h3>
              <p className="text-xs text-emerald-100">Chuẩn GS1 EAN-13 & In nhiệt 50x30mm</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg text-white/80 hover:text-white hover:bg-white/10 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content Body */}
        <div className="p-6 overflow-y-auto space-y-6 flex-1">
          {/* Real-time Thermal Label Preview */}
          <div>
            <label className="block text-xs font-semibold text-slate-600 uppercase tracking-wider mb-2">
              Xem Trước Bản In Tem Nhiệt (50x30mm)
            </label>
            <div className="bg-slate-100 p-6 rounded-xl flex items-center justify-center border border-slate-200 shadow-inner">
              <div className="w-[300px] h-[180px] bg-white rounded-lg p-3 shadow-md border border-slate-300 flex flex-col justify-between select-none">
                <div className="flex justify-between items-center border-b border-slate-800 pb-1">
                  <span className="text-[10px] font-black text-slate-800 tracking-wider">PHARMACHAIN GSP</span>
                  <span className="text-[9px] font-bold bg-slate-900 text-white px-1.5 py-0.5 rounded">
                    {selectedUnit}
                  </span>
                </div>

                <div className="my-1">
                  <div className="text-xs font-bold text-slate-900 line-clamp-2 leading-tight">
                    {medicine.name}
                  </div>
                  <div className="flex justify-between items-center mt-0.5 text-[10px] text-slate-600 font-medium">
                    <span>SKU: {medicine.sku || 'N/A'}</span>
                    <span className="text-xs font-bold text-emerald-700">
                      {Number(currentPrice).toLocaleString('vi-VN')} đ
                    </span>
                  </div>
                </div>

                {/* SVG Render */}
                <div
                  className="flex justify-center items-center my-0.5"
                  dangerouslySetInnerHTML={{ __html: svgBarcode }}
                />

                <div className="flex justify-between items-center text-[8px] text-slate-500 border-t border-slate-200 pt-0.5">
                  <span>HSD: {medicine.expiry_date || '2027-12-31'}</span>
                  <span className="flex items-center gap-0.5 text-emerald-600 font-semibold">
                    <ShieldCheck size={10} /> Đạt chuẩn GSP
                  </span>
                </div>
              </div>
            </div>
          </div>

          {/* Barcode details & Actions */}
          <div className="grid grid-cols-2 gap-4 bg-slate-50 p-4 rounded-xl border border-slate-200">
            <div>
              <span className="text-xs text-slate-500 block">Mã Barcode EAN-13:</span>
              <div className="flex items-center space-x-2 mt-1">
                <span className="font-mono font-bold text-sm text-slate-800">{barcodeValue}</span>
                <button
                  onClick={handleCopy}
                  className="p-1 text-slate-400 hover:text-emerald-600 rounded transition-colors"
                  title="Sao chép mã"
                >
                  {copied ? <Check size={14} className="text-emerald-600" /> : <Copy size={14} />}
                </button>
              </div>
            </div>

            <div>
              <span className="text-xs text-slate-500 block">Quy cách in tem:</span>
              <select
                value={selectedUnit}
                onChange={(e) => setSelectedUnit(e.target.value)}
                className="mt-1 w-full text-xs font-semibold bg-white border border-slate-300 rounded-lg px-2.5 py-1.5 text-slate-700 focus:ring-2 focus:ring-emerald-500 outline-none"
              >
                <option value={medicine?.unit || 'Hộp'}>{medicine?.unit || 'Hộp'} (Gốc)</option>
                {Array.isArray(medicine?.units) &&
                  medicine.units.map((u: any, idx: number) => (
                    <option key={idx} value={u.unitName}>
                      {u.unitName} ({Number(u.price || 0).toLocaleString('vi-VN')} đ)
                    </option>
                  ))}
              </select>
            </div>
          </div>

          {/* Print settings */}
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1.5">Khổ giấy in</label>
              <select
                value={labelFormat}
                onChange={(e: any) => setLabelFormat(e.target.value)}
                className="w-full text-xs bg-white border border-slate-300 rounded-lg px-3 py-2 text-slate-700 focus:ring-2 focus:ring-emerald-500 outline-none"
              >
                <option value="thermal_50x30">Tem nhiệt 50mm x 30mm (Chuẩn)</option>
                <option value="thermal_40x30">Tem nhiệt 40mm x 30mm</option>
                <option value="sheet_a4">Tờ Decal A4 (Nhiều tem)</option>
              </select>
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1.5">Số lượng tem cần in</label>
              <input
                type="number"
                min={1}
                max={100}
                value={printQuantity}
                onChange={(e) => setPrintQuantity(Math.max(1, parseInt(e.target.value) || 1))}
                className="w-full text-xs bg-white border border-slate-300 rounded-lg px-3 py-2 text-slate-700 focus:ring-2 focus:ring-emerald-500 outline-none font-bold"
              />
            </div>
          </div>
        </div>

        {/* Modal Footer */}
        <div className="px-6 py-4 bg-slate-50 border-t border-slate-100 flex items-center justify-between">
          <button
            type="button"
            onClick={handleRegenerateBarcode}
            disabled={isGenerating}
            className="flex items-center space-x-1.5 text-xs text-slate-600 hover:text-emerald-700 font-medium px-3 py-2 rounded-lg hover:bg-slate-200/60 transition-colors"
          >
            <RefreshCw size={14} className={isGenerating ? 'animate-spin' : ''} />
            <span>Sinh lại mã EAN-13</span>
          </button>

          <div className="flex items-center space-x-3">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 text-xs font-semibold text-slate-600 hover:text-slate-800 hover:bg-slate-200/50 rounded-xl transition-colors"
            >
              Đóng
            </button>
            <button
              type="button"
              onClick={handlePrint}
              className="flex items-center space-x-2 px-5 py-2.5 bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-700 hover:to-teal-700 text-white rounded-xl text-xs font-bold shadow-lg shadow-emerald-500/25 transition-all transform active:scale-95"
            >
              <Printer size={16} />
              <span>In {printQuantity} Tem Nhãn</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
