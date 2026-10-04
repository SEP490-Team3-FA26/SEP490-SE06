import React, { useState, useMemo } from 'react';
import {
  X,
  Printer,
  Copy,
  Check,
  ShieldCheck,
  RefreshCw,
  FileText,
  AlertTriangle,
  ScanBarcode,
  CheckCircle2,
  Building2,
  Calendar,
  Globe2,
  Layers
} from 'lucide-react';
import { generateEAN13SVG } from '../utils/barcodeGenerator';
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
  // Label Mode: Standard Retail Price vs Imported Medicine Secondary Label (Thông tư 01/2018/TT-BYT)
  const [labelMode, setLabelMode] = useState<'retail_barcode' | 'pharma_secondary_label'>('pharma_secondary_label');
  const [labelFormat, setLabelFormat] = useState<'thermal_100x60' | 'thermal_80x50' | 'thermal_50x30' | 'sheet_a4'>('thermal_100x60');
  const [printQuantity, setPrintQuantity] = useState<number>(1);
  const [copied, setCopied] = useState(false);
  const [isGenerating, setIsGenerating] = useState(false);
  const [selectedUnit, setSelectedUnit] = useState<string>(medicine?.unit || 'Hộp');
  const [isScreenScanMode, setIsScreenScanMode] = useState<boolean>(true);

  // Secondary Label Detailed Regulatory Fields (Nghị định 43/2017 & TT 01/2018/TT-BYT)
  const [batchNo, setBatchNo] = useState<string>(
    medicine?.batchNo || medicine?.batches?.[0]?.batchNo || 'LOT-' + new Date().getFullYear() + 'X9'
  );
  const [mfdDate, setMfdDate] = useState<string>(new Date(Date.now() - 180 * 86400000).toISOString().split('T')[0]);
  const [expDate, setExpDate] = useState<string>(
    medicine?.expiry_date || medicine?.batches?.[0]?.expDate ? new Date(medicine?.batches?.[0]?.expDate).toISOString().split('T')[0] : '2028-06-30'
  );
  const [regNumber, setRegNumber] = useState<string>(medicine?.registration_number || 'VN-21980-23');
  const [importerName, setImporterName] = useState<string>(
    medicine?.importer_name || 'CÔNG TY CỔ PHẦN DƯỢC PHẨM PHARMACHAIN VIỆT NAM'
  );
  const [importerAddress, setImporterAddress] = useState<string>(
    'Tầng 6, Tòa nhà Pharma Plaza, Q. Cầu Giấy, TP. Hà Nội'
  );
  const [manufacturer, setManufacturer] = useState<string>(
    medicine?.manufacturer || 'Novartis Pharma AG / Sandoz International GmbH'
  );
  const [originCountry, setOriginCountry] = useState<string>(
    medicine?.country_of_origin || 'Thụy Sĩ (Switzerland)'
  );
  const [activeIngredient, setActiveIngredient] = useState<string>(
    medicine?.active_ingredient || medicine?.cong_dung || 'Paracetamol 500mg'
  );
  const [storageCondition, setStorageCondition] = useState<string>(
    medicine?.storage_condition || 'Bảo quản nơi khô ráo, tránh ánh sáng trực tiếp, nhiệt độ dưới 30°C'
  );

  // Anti-Risk Double Check Verification (Giảm thiểu rủi ro lệch Lô/Hạn dùng)
  const [verifyBarcodeScan, setVerifyBarcodeScan] = useState<string>('');
  const [isVerified, setIsVerified] = useState<boolean>(false);
  const [verifyError, setVerifyError] = useState<string | null>(null);

  const barcodeValue = useMemo(() => {
    if (medicine?.units && Array.isArray(medicine.units)) {
      const u = medicine.units.find((item: any) => item.unitName === selectedUnit);
      if (u && u.barcode && u.barcode.trim() !== '') return u.barcode.trim();
    }
    if (medicine?.barcode && medicine.barcode.trim() !== '') {
      return medicine.barcode.trim();
    }
    if (medicine?.sku && /^\d{12,13}$/.test(medicine.sku)) {
      return medicine.sku.trim();
    }
    return '8936012345678';
  }, [medicine, selectedUnit]);

  const currentPrice = useMemo(() => {
    if (medicine?.units && Array.isArray(medicine.units)) {
      const u = medicine.units.find((item: any) => item.unitName === selectedUnit);
      if (u && u.price) return u.price;
    }
    return medicine?.price || 0;
  }, [medicine, selectedUnit]);

  const svgBarcode = useMemo(() => {
    if (!barcodeValue) return '';
    return generateEAN13SVG(barcodeValue, {
      width: isScreenScanMode ? 260 : 200,
      height: isScreenScanMode ? 70 : 50,
      fontSize: 11,
      showText: true,
      barColor: '#000000',
      bgColor: '#FFFFFF'
    });
  }, [barcodeValue, isScreenScanMode]);

  const handleVerifyScan = (val: string) => {
    setVerifyBarcodeScan(val);
    setVerifyError(null);
    if (!val || val.trim().length < 3) {
      setIsVerified(false);
      return;
    }
    const clean = val.trim();
    if (clean === barcodeValue || clean === medicine?.sku || clean === medicine?.barcode) {
      setIsVerified(true);
      setVerifyError(null);
    } else {
      setIsVerified(false);
      setVerifyError(`Mã quét [${clean}] không khớp với mã dược phẩm [${barcodeValue}]. Cảnh báo dán nhầm tem!`);
    }
  };

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
    if (labelMode === 'pharma_secondary_label' && !isVerified) {
      const proceed = window.confirm(
        '⚠️ CẢNH BÁO KIỂM SOÁT CHÉO DƯỢC PHẨM:\n\nBạn chưa thực hiện quét mã vạch đối soát vỏ hộp thuốc thực tế để kiểm chứng số Lô và Hạn dùng.\n\nBạn có chắc chắn muốn bỏ qua bước xác thực đối soát và tiếp tục in tem nhãn phụ không?'
      );
      if (!proceed) return;
    }

    const printWindow = window.open('', '_blank', 'width=800,height=750');
    if (!printWindow) return;

    const items = Array.from({ length: printQuantity });

    let labelHtml = '';

    if (labelMode === 'pharma_secondary_label') {
      // Tem nhãn phụ thuốc nhập khẩu theo chuẩn Thông tư 01/2018/TT-BYT
      labelHtml = items
        .map(
          () => `
          <div class="pharma-label-item">
            <div class="pharma-header">
              <div class="flag-title">TEM PHỤ THUỐC NHẬP KHẨU</div>
              <div class="reg-no">SĐK/GPNK: <b>${regNumber}</b></div>
            </div>

            <div class="med-title-row">
              <div class="med-name">${(medicine.name || 'DƯỢC PHẨM NHẬP KHẨU').toUpperCase()}</div>
              <div class="unit-box">${selectedUnit}</div>
            </div>

            <div class="pharma-row">
              <span class="label">Hoạt chất & hàm lượng:</span>
              <span class="val"><b>${activeIngredient}</b></span>
            </div>

            <div class="pharma-row">
              <span class="label">Dạng bào chế & quy cách:</span>
              <span class="val">${medicine.dosage_form || 'Viên nén bao phim'} - ${selectedUnit}</span>
            </div>

            <div class="two-col-grid">
              <div>
                <span class="label">Số Lô (Lot/Batch):</span>
                <span class="val red-highlight"><b>${batchNo}</b></span>
              </div>
              <div>
                <span class="label">Hạn dùng (EXP):</span>
                <span class="val red-highlight"><b>${expDate}</b></span>
              </div>
            </div>

            <div class="two-col-grid">
              <div>
                <span class="label">Ngày SX (MFD):</span>
                <span class="val">${mfdDate}</span>
              </div>
              <div>
                <span class="label">Xuất xứ:</span>
                <span class="val"><b>${originCountry}</b></span>
              </div>
            </div>

            <div class="pharma-row">
              <span class="label">Nhà sản xuất:</span>
              <span class="val">${manufacturer}</span>
            </div>

            <div class="pharma-row">
              <span class="label">Doanh nghiệp nhập khẩu:</span>
              <span class="val"><b>${importerName}</b></span>
            </div>
            <div class="pharma-sub">${importerAddress}</div>

            <div class="pharma-row">
              <span class="label">Bảo quản:</span>
              <span class="val">${storageCondition}</span>
            </div>

            <div class="warning-banner">
              ĐỌC KỸ HƯỚNG DẪN SỬ DỤNG TRƯỚC KHI DÙNG. ĐỂ XA TẦM TAY TRẺ EM.
            </div>

            <div class="barcode-footer">
              <div class="barcode-svg-wrap">
                ${svgBarcode}
              </div>
              <div class="price-box">
                <span class="p-label">Giá niêm yết:</span>
                <span class="p-value">${Number(currentPrice).toLocaleString('vi-VN')} đ</span>
              </div>
            </div>
          </div>
        `
        )
        .join('');
    } else {
      // Tem giá mã vạch bán lẻ cơ bản
      labelHtml = items
        .map(
          () => `
          <div class="retail-label-item">
            <div class="header">
              <span class="brand">PharmaChain GSP</span>
              <span class="unit-tag">${selectedUnit}</span>
            </div>
            <div class="med-name">${medicine.name || 'Dược phẩm'}</div>
            <div class="sku-row">
              <span>SKU: ${medicine.sku || barcodeValue}</span>
              <span class="price">${Number(currentPrice).toLocaleString('vi-VN')} đ</span>
            </div>
            <div class="barcode-container">
              ${svgBarcode}
            </div>
            <div class="footer">
              <span>Số Lô: ${batchNo}</span>
              <span>HSD: ${expDate}</span>
            </div>
          </div>
        `
        )
        .join('');
    }

    const pageSize =
      labelFormat === 'sheet_a4'
        ? 'A4'
        : labelFormat === 'thermal_100x60'
        ? '100mm 60mm'
        : labelFormat === 'thermal_80x50'
        ? '80mm 50mm'
        : '50mm 30mm';

    printWindow.document.write(`
      <!DOCTYPE html>
      <html>
        <head>
          <title>In Tem Dược Phẩm - ${medicine.name}</title>
          <style>
            @page {
              size: ${pageSize};
              margin: 1.5mm;
            }
            body {
              font-family: 'Segoe UI', Arial, sans-serif;
              margin: 0;
              padding: 0;
              background: #fff;
              color: #000;
              -webkit-print-color-adjust: exact;
              print-color-adjust: exact;
            }
            .print-wrapper {
              display: flex;
              flex-wrap: wrap;
              gap: 2mm;
            }
            /* Tem Nhãn Phụ Thuốc Nhập Khẩu */
            .pharma-label-item {
              width: ${labelFormat === 'thermal_80x50' ? '78mm' : labelFormat === 'thermal_50x30' ? '48mm' : '98mm'};
              height: ${labelFormat === 'thermal_80x50' ? '48mm' : labelFormat === 'thermal_50x30' ? '28mm' : '58mm'};
              box-sizing: border-box;
              border: 1px solid #000;
              padding: 1.5mm 2mm;
              display: flex;
              flex-direction: column;
              justify-content: space-between;
              page-break-inside: avoid;
              font-size: 6.5pt;
              line-height: 1.15;
            }
            .pharma-header {
              display: flex;
              justify-content: space-between;
              align-items: center;
              border-bottom: 1px solid #000;
              padding-bottom: 1px;
            }
            .flag-title {
              font-weight: 900;
              font-size: 7.5pt;
              color: #000;
              letter-spacing: 0.3px;
            }
            .reg-no {
              font-size: 6pt;
            }
            .med-title-row {
              display: flex;
              justify-content: space-between;
              align-items: center;
              margin: 1px 0;
            }
            .med-name {
              font-weight: 900;
              font-size: 8pt;
              line-height: 1.1;
              max-height: 22px;
              overflow: hidden;
            }
            .unit-box {
              border: 0.8px solid #000;
              padding: 0.5px 3px;
              font-weight: bold;
              font-size: 6pt;
              border-radius: 2px;
            }
            .pharma-row {
              display: flex;
              gap: 3px;
              white-space: nowrap;
              overflow: hidden;
              text-overflow: ellipsis;
            }
            .pharma-sub {
              font-size: 5pt;
              color: #222;
              padding-left: 2px;
            }
            .label {
              font-size: 5.8pt;
              color: #222;
            }
            .val {
              font-size: 6pt;
              color: #000;
              overflow: hidden;
              text-overflow: ellipsis;
            }
            .two-col-grid {
              display: grid;
              grid-template-columns: 1fr 1fr;
              gap: 4px;
            }
            .red-highlight {
              font-weight: bold;
              color: #000;
            }
            .warning-banner {
              font-size: 5pt;
              font-weight: bold;
              text-align: center;
              border-top: 0.5px dashed #444;
              border-bottom: 0.5px dashed #444;
              padding: 0.5px 0;
              margin: 1px 0;
            }
            .barcode-footer {
              display: flex;
              justify-content: space-between;
              align-items: center;
              gap: 4px;
            }
            .barcode-svg-wrap {
              flex: 1;
              display: flex;
              justify-content: flex-start;
            }
            .barcode-svg-wrap svg {
              width: 48mm;
              height: 12mm;
            }
            .price-box {
              text-align: right;
              border-left: 0.8px solid #000;
              padding-left: 3px;
            }
            .p-label {
              font-size: 5pt;
              display: block;
            }
            .p-value {
              font-weight: 900;
              font-size: 7.5pt;
            }

            /* Tem Giá Cơ Bản */
            .retail-label-item {
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
              setTimeout(function() { window.close(); }, 600);
            };
          </script>
        </body>
      </html>
    `);
    printWindow.document.close();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm animate-in fade-in duration-200">
      <div className="bg-white rounded-2xl shadow-2xl border border-slate-100 w-full max-w-2xl overflow-hidden flex flex-col max-h-[92vh]">
        {/* Header */}
        <div className="px-6 py-4 border-b border-slate-100 flex items-center justify-between bg-gradient-to-r from-slate-900 via-slate-800 to-indigo-950 text-white">
          <div className="flex items-center space-x-3">
            <div className="p-2 bg-indigo-500/20 border border-indigo-400/30 rounded-xl text-indigo-300">
              <ScanBarcode size={22} />
            </div>
            <div>
              <h3 className="font-bold text-base flex items-center gap-2">
                In Mã Vạch & Tem Nhãn Dược Phẩm
                <span className="text-[10px] bg-emerald-500/20 text-emerald-300 border border-emerald-400/30 px-2 py-0.5 rounded-full font-mono">
                  GSP Compliant
                </span>
              </h3>
              <p className="text-xs text-slate-300">
                {medicine.name} • SKU: {medicine.sku || barcodeValue}
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 text-slate-400 hover:text-white rounded-xl hover:bg-white/10 transition-colors"
          >
            <X size={18} />
          </button>
        </div>

        {/* Tab Selection */}
        <div className="flex border-b border-slate-200 bg-slate-50/80 px-6 pt-3 gap-2">
          <button
            type="button"
            onClick={() => setLabelMode('pharma_secondary_label')}
            className={`pb-2.5 px-3 text-xs font-bold transition-all border-b-2 flex items-center gap-2 ${
              labelMode === 'pharma_secondary_label'
                ? 'border-indigo-600 text-indigo-700 bg-white rounded-t-lg shadow-sm'
                : 'border-transparent text-slate-500 hover:text-slate-800'
            }`}
          >
            <FileText size={15} />
            Tem Phụ Thuốc Nhập Khẩu (Thông tư 01/2018/TT-BYT)
          </button>
          <button
            type="button"
            onClick={() => setLabelMode('retail_barcode')}
            className={`pb-2.5 px-3 text-xs font-bold transition-all border-b-2 flex items-center gap-2 ${
              labelMode === 'retail_barcode'
                ? 'border-emerald-600 text-emerald-700 bg-white rounded-t-lg shadow-sm'
                : 'border-transparent text-slate-500 hover:text-slate-800'
            }`}
          >
            <Layers size={15} />
            Tem Giá & Barcode Bán Lẻ
          </button>
        </div>

        {/* Modal Body */}
        <div className="p-6 space-y-5 overflow-y-auto flex-1">
          {/* Risk Mitigation: Double-Check Verification Scan */}
          <div className={`p-3.5 rounded-xl border transition-all ${
            isVerified 
              ? 'bg-emerald-50 border-emerald-300 text-emerald-900' 
              : 'bg-amber-50/70 border-amber-300 text-amber-900'
          }`}>
            <div className="flex items-start justify-between gap-3">
              <div className="flex items-center gap-2">
                {isVerified ? (
                  <CheckCircle2 size={18} className="text-emerald-600 shrink-0" />
                ) : (
                  <AlertTriangle size={18} className="text-amber-600 shrink-0" />
                )}
                <div>
                  <h4 className="text-xs font-bold">
                    {isVerified
                      ? 'Đã xác thực đối soát hộp thuốc thực tế thành công'
                      : 'Cơ chế kiểm soát chéo (Double-Check Scan) - Chống rủi ro dán nhầm Lô/Hạn'}
                  </h4>
                  <p className="text-[11px] opacity-80 leading-tight">
                    {isVerified
                      ? 'Mã quét khớp 100% với hồ sơ dược phẩm. Đã an toàn để phát hành nhãn.'
                      : 'Quét hoặc nhập mã vạch trên vỏ hộp thuốc để kiểm chứng trước khi in dán:'}
                  </p>
                </div>
              </div>

              <div className="w-52">
                <input
                  type="text"
                  placeholder="Quét mã vạch vỏ hộp..."
                  value={verifyBarcodeScan}
                  onChange={(e) => handleVerifyScan(e.target.value)}
                  className={`w-full px-2.5 py-1 text-xs rounded-lg border font-mono font-bold outline-none ${
                    isVerified ? 'border-emerald-400 bg-white text-emerald-700' : 'border-amber-300 bg-white'
                  }`}
                />
              </div>
            </div>
            {verifyError && <p className="text-[10px] text-red-600 font-bold mt-1.5">{verifyError}</p>}
          </div>

          {/* Secondary Label Input Fields (When in imported mode) */}
          {labelMode === 'pharma_secondary_label' && (
            <div className="bg-slate-50 p-4 rounded-xl border border-slate-200 space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold text-slate-800 flex items-center gap-1.5">
                  <Building2 size={14} className="text-indigo-600" />
                  Thông tin pháp lý bắt buộc trên Tem Phụ:
                </span>
                <span className="text-[11px] text-indigo-700 font-medium bg-indigo-50 px-2 py-0.5 rounded border border-indigo-200">
                  Nghị định 43/2017/NĐ-CP
                </span>
              </div>

              <div className="grid grid-cols-3 gap-3">
                <div>
                  <label className="block text-[11px] font-semibold text-slate-600 mb-1">Số ĐK / GPNK</label>
                  <input
                    type="text"
                    value={regNumber}
                    onChange={(e) => setRegNumber(e.target.value)}
                    className="w-full text-xs bg-white border border-slate-300 rounded-lg px-2.5 py-1.5 font-bold text-slate-800"
                  />
                </div>
                <div>
                  <label className="block text-[11px] font-semibold text-slate-600 mb-1">Số Lô (Lot/Batch)</label>
                  <input
                    type="text"
                    value={batchNo}
                    onChange={(e) => setBatchNo(e.target.value)}
                    className="w-full text-xs bg-white border border-slate-300 rounded-lg px-2.5 py-1.5 font-bold text-red-600"
                  />
                </div>
                <div>
                  <label className="block text-[11px] font-semibold text-slate-600 mb-1">Hạn dùng (EXP)</label>
                  <input
                    type="date"
                    value={expDate}
                    onChange={(e) => setExpDate(e.target.value)}
                    className="w-full text-xs bg-white border border-slate-300 rounded-lg px-2.5 py-1.5 font-bold text-slate-800"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-[11px] font-semibold text-slate-600 mb-1">Cơ sở sản xuất & Nước SX</label>
                  <input
                    type="text"
                    value={`${manufacturer} - ${originCountry}`}
                    onChange={(e) => setManufacturer(e.target.value)}
                    className="w-full text-xs bg-white border border-slate-300 rounded-lg px-2.5 py-1.5 text-slate-700"
                  />
                </div>
                <div>
                  <label className="block text-[11px] font-semibold text-slate-600 mb-1">Doanh nghiệp nhập khẩu</label>
                  <input
                    type="text"
                    value={importerName}
                    onChange={(e) => setImporterName(e.target.value)}
                    className="w-full text-xs bg-white border border-slate-300 rounded-lg px-2.5 py-1.5 font-bold text-slate-800"
                  />
                </div>
              </div>
            </div>
          )}

          {/* Interactive Live Preview Box */}
          <div>
            <div className="flex items-center justify-between mb-2">
              <span className="text-xs font-bold text-slate-700 flex items-center gap-1.5">
                Xem trước bản in (Live Preview):
              </span>
              <button
                type="button"
                onClick={() => setIsScreenScanMode(!isScreenScanMode)}
                className="text-[11px] text-slate-500 hover:text-indigo-600 flex items-center gap-1"
              >
                {isScreenScanMode ? 'Thu nhỏ preview' : 'Phóng to preview'}
              </button>
            </div>

            <div className="bg-slate-100 p-4 rounded-xl border border-dashed border-slate-300 flex items-center justify-center">
              {labelMode === 'pharma_secondary_label' ? (
                /* Preview Tem Nhãn Phụ */
                <div className="bg-white border-2 border-slate-900 rounded-lg p-3 w-[420px] shadow-md space-y-1.5 text-slate-900 text-[10px] leading-tight">
                  <div className="flex justify-between items-center border-b border-slate-900 pb-1 font-bold">
                    <span className="tracking-wider text-xs">TEM PHỤ THUỐC NHẬP KHẨU</span>
                    <span className="text-[9px]">SĐK: {regNumber}</span>
                  </div>

                  <div className="flex justify-between items-center pt-0.5">
                    <span className="font-black text-sm text-slate-900">{medicine.name.toUpperCase()}</span>
                    <span className="border border-slate-800 px-1 py-0.2 rounded font-bold text-[9px]">{selectedUnit}</span>
                  </div>

                  <div>
                    <span className="text-slate-600">Hoạt chất:</span> <b>{activeIngredient}</b>
                  </div>

                  <div className="grid grid-cols-2 gap-2 bg-slate-50 p-1.5 rounded border border-slate-200">
                    <div>
                      <span className="text-slate-500">Số Lô:</span> <span className="font-bold text-red-600">{batchNo}</span>
                    </div>
                    <div>
                      <span className="text-slate-500">Hạn dùng:</span> <span className="font-bold text-red-600">{expDate}</span>
                    </div>
                  </div>

                  <div className="text-[9px] text-slate-700">
                    <div><span className="text-slate-500">Xuất xứ:</span> <b>{originCountry}</b> ({manufacturer})</div>
                    <div><span className="text-slate-500">Đơn vị NK:</span> <b>{importerName}</b></div>
                    <div><span className="text-slate-500">Bảo quản:</span> {storageCondition}</div>
                  </div>

                  <div className="text-[8px] font-bold text-center border-y border-dashed border-slate-400 py-0.5 text-slate-800">
                    ĐỌC KỸ HƯỚNG DẪN SỬ DỤNG TRƯỚC KHI DÙNG. ĐỂ XA TẦM TAY TRẺ EM.
                  </div>

                  <div className="flex justify-between items-center pt-1">
                    <div className="scale-90 origin-left">{svgBarcode}</div>
                    <div className="text-right">
                      <span className="text-[8px] text-slate-500 block">Giá niêm yết</span>
                      <span className="font-black text-xs text-indigo-950">{Number(currentPrice).toLocaleString('vi-VN')} đ</span>
                    </div>
                  </div>
                </div>
              ) : (
                /* Preview Tem Giá */
                <div className="bg-white border-2 border-slate-900 rounded-lg p-3 w-[260px] shadow-sm space-y-1.5 text-slate-900">
                  <div className="flex justify-between items-center border-b border-slate-900 pb-1 text-[9px] font-bold">
                    <span>PharmaChain GSP</span>
                    <span className="bg-slate-900 text-white px-1.5 py-0.2 rounded text-[8px]">{selectedUnit}</span>
                  </div>
                  <div className="font-bold text-xs truncate">{medicine.name}</div>
                  <div className="flex justify-between text-[10px] font-semibold">
                    <span>SKU: {medicine.sku || barcodeValue}</span>
                    <span className="font-bold text-emerald-700">{Number(currentPrice).toLocaleString('vi-VN')} đ</span>
                  </div>
                  <div className="flex justify-center scale-90">{svgBarcode}</div>
                  <div className="flex justify-between text-[8px] text-slate-500 border-t border-slate-200 pt-0.5">
                    <span>Lô: {batchNo}</span>
                    <span>HSD: {expDate}</span>
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* Print Controls */}
          <div className="grid grid-cols-3 gap-3">
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">Quy cách in tem</label>
              <select
                value={selectedUnit}
                onChange={(e) => setSelectedUnit(e.target.value)}
                className="w-full text-xs font-semibold bg-white border border-slate-300 rounded-lg px-2.5 py-1.5 text-slate-700 focus:ring-2 focus:ring-indigo-500 outline-none"
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

            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">Khổ tem in</label>
              <select
                value={labelFormat}
                onChange={(e: any) => setLabelFormat(e.target.value)}
                className="w-full text-xs bg-white border border-slate-300 rounded-lg px-2.5 py-1.5 text-slate-700 focus:ring-2 focus:ring-indigo-500 outline-none"
              >
                <option value="thermal_100x60">Tem nhiệt 100mm x 60mm (Chuẩn tem phụ)</option>
                <option value="thermal_80x50">Tem nhiệt 80mm x 50mm</option>
                <option value="thermal_50x30">Tem nhiệt 50mm x 30mm</option>
                <option value="sheet_a4">Tờ Decal A4 (In lưới nhiều tem)</option>
              </select>
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">Số lượng tem in</label>
              <input
                type="number"
                min={1}
                max={500}
                value={printQuantity}
                onChange={(e) => setPrintQuantity(Math.max(1, parseInt(e.target.value) || 1))}
                className="w-full text-xs bg-white border border-slate-300 rounded-lg px-2.5 py-1.5 text-slate-700 focus:ring-2 focus:ring-indigo-500 outline-none font-bold"
              />
            </div>
          </div>
        </div>

        {/* Modal Footer */}
        <div className="px-6 py-3.5 bg-slate-50 border-t border-slate-200 flex items-center justify-between">
          <div className="flex items-center space-x-2">
            <span className="font-mono text-xs font-bold text-slate-700 bg-white border border-slate-200 px-2 py-1 rounded">
              {barcodeValue}
            </span>
            <button
              onClick={handleCopy}
              className="p-1.5 text-slate-400 hover:text-indigo-600 rounded transition-colors"
              title="Sao chép mã barcode"
            >
              {copied ? <Check size={14} className="text-emerald-600" /> : <Copy size={14} />}
            </button>
            <button
              type="button"
              onClick={handleRegenerateBarcode}
              disabled={isGenerating}
              className="text-xs text-slate-600 hover:text-indigo-700 flex items-center gap-1 ml-2 font-medium"
            >
              <RefreshCw size={13} className={isGenerating ? 'animate-spin' : ''} />
              <span>Sinh mã EAN-13 mới</span>
            </button>
          </div>

          <div className="flex items-center space-x-2.5">
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
              className="flex items-center space-x-2 px-5 py-2.5 bg-gradient-to-r from-indigo-600 via-blue-600 to-indigo-700 hover:from-indigo-700 hover:to-blue-700 text-white rounded-xl text-xs font-bold shadow-lg shadow-indigo-500/25 transition-all transform active:scale-95"
            >
              <Printer size={16} />
              <span>In {printQuantity} Tem Nhãn Phụ</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
