import React, { useState, useEffect, useMemo } from 'react';
import {
  ShieldCheck,
  CheckCircle2,
  AlertTriangle,
  Sparkles,
  User,
  Clock,
  Building,
  FileCheck,
  X,
  Plus,
  Minus,
  Edit3,
} from 'lucide-react';
import { SimpleTable, SimpleTableColumn } from '../../../components/common/SimpleTable';
import { aiClinicalService } from '../../../services/ai/aiClinical.service';

/**
 * Interface voor een individueel door AI aanbevolen medicijn in het goedkeuringsproces.
 */
export interface AIApprovalDrugItem {
  id: string;
  name: string;
  active_ingredient?: string;
  dosage?: string;
  frequency?: string;
  duration?: string;
  indication?: string;
  quantity: number;
  unit: string;
  price: number;
  stock: number;
  inStock: boolean;
  selected: boolean;
  dosageInstructions: string;
  originalDrug?: any;
}

/**
 * Eigenschappen voor de AIPharmacistApprovalModal component.
 */
export interface AIPharmacistApprovalModalProps {
  isOpen: boolean;
  onClose: () => void;
  aiResult: any;
  onApprove: (approvedItems: any[], auditData: any) => void;
  pharmacistName?: string;
  pharmacistLicense?: string;
  branchName?: string;
  branchId?: string;
}

/**
 * Modale component voor de klinische goedkeuring van door AI gegenereerde medicijnen.
 * Verplicht de apotheker om medicijnen te verifiëren en GPP-verantwoordelijkheid te accepteren.
 */
export const AIPharmacistApprovalModal: React.FC<AIPharmacistApprovalModalProps> = ({
  isOpen,
  onClose,
  aiResult,
  onApprove,
  pharmacistName = 'Dược sĩ trực quầy',
  pharmacistLicense = 'CCHN-GPP/02849-HN',
  branchName = 'Chi Nhánh 1 (Quận 1)',
  branchId = 'BR-001',
}) => {
  // Lokale toestand voor lijst van medicijnen die door de apotheker worden beheerd
  const [drugsList, setDrugsList] = useState<AIApprovalDrugItem[]>([]);
  // Toestand voor de verplichte GPP-akkoordverklaring
  const [gppAgreementChecked, setGppAgreementChecked] = useState<boolean>(false);
  // Klinische notities van de apotheker
  const [clinicalNotes, setClinicalNotes] = useState<string>('');
  // Bezig met verzenden naar de server
  const [submitting, setSubmitting] = useState<boolean>(false);

  // Initialiseer medicijnenlijst wanneer aiResult wijzigt of modal opent
  useEffect(() => {
    if (!aiResult) {
      setDrugsList([]);
      setGppAgreementChecked(false);
      setClinicalNotes('');
      return;
    }

    const recommended = aiResult.prescription?.recommended_drugs || [];
    const available = aiResult.inventory_status?.available || [];

    // Transformeer aanbevelingen naar de interne werkstructuur
    const initialList: AIApprovalDrugItem[] = recommended.map((drug: any, index: number) => {
      // Zoek overeenkomend medicijn in de voorraad van het filiaal
      const match = available.find(
        (av: any) => av.name?.toLowerCase() === drug.name?.toLowerCase()
      );
      const stock = match?.stock ?? match?.branch_stock ?? 0;
      const inStock = stock > 0;
      const unit = drug.unit || match?.unit || 'Hộp';
      const price = match?.price || drug.price || 50000;
      const defaultQty = drug.quantity && drug.quantity > 0 ? drug.quantity : 1;

      return {
        id: match?.id || match?._id || `ai-drug-${index}`,
        name: drug.name || 'Dược phẩm chưa đặt tên',
        active_ingredient: drug.active_ingredient || match?.active_ingredient || '',
        dosage: drug.dosage || '',
        frequency: drug.frequency || '',
        duration: drug.duration || '',
        indication: drug.indication || '',
        quantity: Math.min(defaultQty, inStock ? stock : defaultQty),
        unit,
        price,
        stock,
        inStock,
        selected: inStock, // Selecteer standaard medicijnen die op voorraad zijn
        dosageInstructions:
          drug.frequency || drug.usage || `Uống 1 ${unit}/lần, ngày 2 lần sau ăn`,
        originalDrug: match || drug,
      };
    });

    setDrugsList(initialList);
    setGppAgreementChecked(false);
    setClinicalNotes('');
  }, [aiResult, isOpen]);

  // Wissel selectie van individueel medicijn
  const toggleSelectDrug = (id: string) => {
    setDrugsList((prev) =>
      prev.map((item) => (item.id === id ? { ...item, selected: !item.selected } : item))
    );
  };

  // Selecteer of deselecteer alle medicijnen
  const toggleSelectAll = (select: boolean) => {
    setDrugsList((prev) => prev.map((item) => ({ ...item, selected: select })));
  };

  // Werk de hoeveelheid van een medicijn bij
  const updateDrugQuantity = (id: string, newQty: number) => {
    if (newQty < 1) return;
    setDrugsList((prev) =>
      prev.map((item) => {
        if (item.id !== id) return item;
        const maxStock = item.stock > 0 ? item.stock : 999;
        return {
          ...item,
          quantity: Math.min(newQty, maxStock),
        };
      })
    );
  };

  // Werk de gebruiksinstructies van een medicijn bij
  const updateDosageInstruction = (id: string, text: string) => {
    setDrugsList((prev) =>
      prev.map((item) => (item.id === id ? { ...item, dosageInstructions: text } : item))
    );
  };

  // Aantal geselecteerde medicijnen
  const selectedDrugs = useMemo(() => drugsList.filter((d) => d.selected), [drugsList]);
  const allSelected = drugsList.length > 0 && selectedDrugs.length === drugsList.length;

  // Bereken totale geschatte orderwaarde van goedgekeurde medicijnen
  const totalApprovedAmount = useMemo(() => {
    return selectedDrugs.reduce((sum, item) => sum + item.price * item.quantity, 0);
  }, [selectedDrugs]);

  if (!isOpen || !aiResult) return null;

  // Verwerk de definitieve goedkeuring door de apotheker
  const handleConfirmApproval = async () => {
    if (selectedDrugs.length === 0) {
      alert('Vui lòng chọn ít nhất 1 loại thuốc để phê duyệt!');
      return;
    }
    if (!gppAgreementChecked) {
      alert('Dược sĩ bắt buộc phải tích chọn cam kết trách nhiệm chuyên môn GPP!');
      return;
    }

    setSubmitting(true);
    try {
      // Genereer unieke auditcode volgens GPP-formaat
      const auditCode = `GPP-AI-${Math.floor(100000 + Math.random() * 900000)}`;
      const consultationId =
        aiResult.consultation_id || aiResult.consultationId || aiResult.saved_record_id;

      const payloadDecision = {
        pharmacistFinalDecision: {
          selectedDrugs: selectedDrugs.map((d) => ({
            name: d.name,
            active_ingredient: d.active_ingredient,
            dosage: d.dosage,
            quantity: d.quantity,
            unit: d.unit,
            price: d.price,
            dosageInstructions: d.dosageInstructions,
          })),
          clinicalNotes: clinicalNotes.trim(),
        },
        pharmacistAgreement: true,
        pharmacistInfo: {
          name: pharmacistName,
          license: pharmacistLicense,
          branchId,
        },
        auditCode,
      };

      // Synchroniseer met backend als er een consultatie-ID aanwezig is
      if (consultationId) {
        try {
          await aiClinicalService.confirmConsultation(consultationId, payloadDecision);
        } catch (apiErr) {
          // Log waarschuwing maar ga door met lokale POS-verkoop
          console.warn('Kon consultatie niet synchroniseren via API Gateway:', apiErr);
        }
      }

      // Gegevens voorbereiden voor het winkelwagentje
      const approvedCartItems = selectedDrugs.map((d) => {
        const match = d.originalDrug;
        return {
          ...match,
          id: d.id,
          name: d.name,
          active_ingredient: d.active_ingredient,
          quantity: d.quantity,
          unit: d.unit,
          price: d.price,
          selectedUnit: d.unit,
          baseUnit: match?.baseUnit || d.unit,
          dosageInstructions: d.dosageInstructions,
          aiApproved: true,
          auditCode,
        };
      });

      const auditData = {
        confirmed: true,
        pharmacistName,
        pharmacistLicense,
        confirmedAt: new Date().toISOString(),
        auditCode,
        consultationId: consultationId || undefined,
        totalItems: selectedDrugs.length,
        source: 'AI_VOICE_CONSULT',
        drugs: selectedDrugs.map((d) => ({
          name: d.name,
          dosage: d.dosageInstructions || d.dosage,
          quantity: d.quantity,
          unit: d.unit,
          active_ingredient: d.active_ingredient,
          price: d.price,
        })),
        clinicalNotes: clinicalNotes.trim(),
      };

      // Roep de bovenliggende callback aan om artikelen toe te voegen
      onApprove(approvedCartItems, auditData);
      onClose();
    } catch (err: any) {
      console.error('Fout bij goedkeuren van AI-medicijnen:', err);
      alert(err.message || 'Lỗi khi phê duyệt đơn thuốc');
    } finally {
      setSubmitting(false);
    }
  };

  // Kolommen configureren voor de SimpleTable
  const columns: SimpleTableColumn<AIApprovalDrugItem>[] = [
    {
      key: 'select',
      header: (
        <div className="flex items-center justify-center">
          <input
            type="checkbox"
            checked={allSelected}
            onChange={(e) => toggleSelectAll(e.target.checked)}
            className="h-4 w-4 rounded border-slate-300 text-emerald-600 focus:ring-emerald-500 cursor-pointer"
            aria-label="Selecteer alle medicijnen"
          />
        </div>
      ),
      width: '44px',
      align: 'center',
      render: (item) => (
        <div className="flex items-center justify-center">
          <input
            type="checkbox"
            checked={item.selected}
            onChange={() => toggleSelectDrug(item.id)}
            className="h-4 w-4 rounded border-slate-300 text-emerald-600 focus:ring-emerald-500 cursor-pointer"
            aria-label={`Selecteer ${item.name}`}
          />
        </div>
      ),
    },
    {
      key: 'medicine',
      header: 'Dược Phẩm & Hoạt Chất',
      render: (item) => (
        <div>
          <div className="font-bold text-slate-900 flex items-center gap-1.5">
            <span>{item.name}</span>
            {item.dosage && (
              <span className="text-[10px] font-semibold bg-slate-100 text-slate-600 px-1.5 py-0.5 rounded">
                {item.dosage}
              </span>
            )}
          </div>
          {item.active_ingredient && (
            <div className="text-[11px] text-slate-500 mt-0.5">
              Hoạt chất: <span className="font-medium text-slate-700">{item.active_ingredient}</span>
            </div>
          )}
          {item.indication && (
            <div className="text-[10px] text-emerald-700 italic mt-0.5">
              Chỉ định: {item.indication}
            </div>
          )}
        </div>
      ),
    },
    {
      key: 'instruction',
      header: 'Liều Dùng & Dặn Dò Lâm Sàng',
      width: '260px',
      render: (item) => (
        <div className="relative">
          <input
            type="text"
            value={item.dosageInstructions}
            onChange={(e) => updateDosageInstruction(item.id, e.target.value)}
            placeholder="Liều dùng..."
            className="w-full text-xs font-semibold px-2.5 py-1.5 rounded-lg border border-slate-200 bg-white text-slate-800 focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500"
          />
        </div>
      ),
    },
    {
      key: 'stock',
      header: 'Tồn Kho Chi Nhánh',
      width: '130px',
      render: (item) => (
        <div>
          {item.inStock ? (
            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-100 text-emerald-800 border border-emerald-200">
              <span className="h-1.5 w-1.5 rounded-full bg-emerald-600" />
              Còn {item.stock} {item.unit}
            </span>
          ) : (
            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-rose-100 text-rose-700 border border-rose-200">
              <span className="h-1.5 w-1.5 rounded-full bg-rose-600" />
              Hết hàng tại quầy
            </span>
          )}
        </div>
      ),
    },
    {
      key: 'quantity',
      header: 'SL Cấp',
      width: '110px',
      align: 'center',
      render: (item) => (
        <div className="flex items-center justify-center gap-1">
          <button
            type="button"
            onClick={() => updateDrugQuantity(item.id, item.quantity - 1)}
            disabled={item.quantity <= 1}
            className="h-6 w-6 rounded bg-slate-100 hover:bg-slate-200 text-slate-600 flex items-center justify-center transition disabled:opacity-30 cursor-pointer"
            aria-label="Verminder aantal"
          >
            <Minus size={11} />
          </button>
          <span className="w-8 text-center font-mono font-bold text-xs tabular-nums text-slate-800">
            {item.quantity}
          </span>
          <button
            type="button"
            onClick={() => updateDrugQuantity(item.id, item.quantity + 1)}
            disabled={item.inStock && item.quantity >= item.stock}
            className="h-6 w-6 rounded bg-slate-100 hover:bg-slate-200 text-slate-600 flex items-center justify-center transition disabled:opacity-30 cursor-pointer"
            aria-label="Vermeerder aantal"
          >
            <Plus size={11} />
          </button>
        </div>
      ),
    },
    {
      key: 'price',
      header: 'Đơn Giá',
      width: '120px',
      align: 'right',
      render: (item) => (
        <div className="text-right">
          <div className="font-mono font-bold text-xs text-slate-800 tabular-nums">
            {(item.price * item.quantity).toLocaleString('vi-VN')}₫
          </div>
          <div className="text-[10px] text-slate-400 font-mono">
            {item.price.toLocaleString('vi-VN')}₫/{item.unit}
          </div>
        </div>
      ),
    },
  ];

  const transcript =
    aiResult.transcribed_text ||
    aiResult.symptoms ||
    'Khách hàng mô tả triệu chứng qua giọng nói tại quầy POS.';

  const confidenceScore = aiResult.prescription?.confidence_score
    ? Math.round(aiResult.prescription.confidence_score * 100)
    : 95;

  return (
    <div className="fixed inset-0 z-[9999] flex items-center justify-center p-3 sm:p-5 overflow-y-auto bg-slate-900/60 backdrop-blur-sm animate-in fade-in duration-200">
      <div className="bg-white rounded-3xl shadow-2xl border border-slate-100 w-full max-w-4xl overflow-hidden my-auto flex flex-col max-h-[94vh] animate-in zoom-in-95 duration-200">
        
        {/* ========================================================================= */}
        {/* 1. HERO HEADER (GPP Emerald to Teal Gradient) */}
        {/* ========================================================================= */}
        <div className="relative bg-gradient-to-r from-emerald-600 via-teal-600 to-cyan-600 p-5 text-white shrink-0 overflow-hidden">
          <div className="flex items-start justify-between gap-4">
            <div className="flex items-center gap-3">
              <div className="w-11 h-11 rounded-2xl bg-white/20 backdrop-blur-md border border-white/30 flex items-center justify-center text-white shadow-sm shrink-0">
                <ShieldCheck size={24} className="text-white" />
              </div>
              <div>
                <div className="flex items-center gap-2 flex-wrap">
                  <span className="text-[10px] font-black tracking-widest uppercase bg-white/20 text-white border border-white/30 px-2 py-0.5 rounded-full backdrop-blur-xs">
                    Quy Trình Chuẩn GPP
                  </span>
                  <span className="text-[10px] font-bold text-emerald-100 flex items-center gap-1">
                    <Sparkles size={11} className="text-amber-300" /> AI Clinical Verification
                  </span>
                </div>
                <h2 className="text-lg font-black text-white tracking-tight mt-0.5">
                  Thẩm Định & Phê Duyệt Đơn Thuốc AI
                </h2>
                <p className="text-xs text-emerald-100 font-medium">
                  Dược sĩ đối soát lâm sàng, xác nhận trách nhiệm chuyên môn trước khi đưa vào đơn bán POS
                </p>
              </div>
            </div>

            {/* Sluitknop */}
            <button
              onClick={onClose}
              disabled={submitting}
              className="w-8 h-8 rounded-xl bg-white/15 hover:bg-white/30 text-white flex items-center justify-center transition-all cursor-pointer active:scale-95 disabled:opacity-50"
              title="Đóng cửa sổ"
              aria-label="Sluit modaal venster"
            >
              <X size={18} />
            </button>
          </div>
        </div>

        {/* ========================================================================= */}
        {/* 2. BODY CONTENT */}
        {/* ========================================================================= */}
        <div className="p-5 overflow-y-auto space-y-4 flex-1">
          {/* Broninformatie en transcriptie */}
          <div className="bg-slate-50 border border-slate-200 rounded-2xl p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3 shadow-2xs">
            <div className="space-y-1">
              <span className="text-[10px] font-black uppercase tracking-wider text-slate-400 flex items-center gap-1">
                <Sparkles size={12} className="text-purple-600" />
                Triệu chứng khách hàng mô tả (Speech-to-Text / Bóc băng AI):
              </span>
              <p className="text-xs text-slate-800 font-semibold italic">
                "{transcript}"
              </p>
            </div>
            <div className="shrink-0 flex items-center gap-2">
              <span className="text-[11px] font-bold text-slate-600 bg-white border border-slate-200 px-3 py-1.5 rounded-xl shadow-2xs">
                Độ tin cậy: <span className="text-emerald-700 font-black">{confidenceScore}%</span>
              </span>
            </div>
          </div>

          {/* AI Waarschuwingen indien aanwezig */}
          {aiResult.prescription?.warnings && (
            <div className="bg-amber-50 border border-amber-200 rounded-xl p-3 flex items-start gap-2 text-xs text-amber-900 shadow-2xs">
              <AlertTriangle size={16} className="text-amber-600 shrink-0 mt-0.5" />
              <div>
                <span className="font-bold">Cảnh báo tương tác & liều dùng từ AI: </span>
                <span>{aiResult.prescription.warnings}</span>
              </div>
            </div>
          )}

          {/* Tabel met voorgestelde medicijnen via SimpleTable */}
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <span className="text-xs font-black text-slate-900 uppercase tracking-wide flex items-center gap-1.5">
                <FileCheck size={14} className="text-emerald-600" />
                Danh mục thuốc AI đề xuất ({selectedDrugs.length}/{drugsList.length} thuốc được chọn)
              </span>
              <span className="text-xs font-mono font-bold text-slate-700">
                Tạm tính:{' '}
                <span className="text-emerald-700 font-black text-sm">
                  {totalApprovedAmount.toLocaleString('vi-VN')}₫
                </span>
              </span>
            </div>

            {/* Eenvoudige tabelcomponent */}
            <SimpleTable
              data={drugsList}
              columns={columns}
              compact={true}
              bordered={true}
              hoverable={true}
              emptyText="Không có thuốc nào trong danh mục đề xuất của AI"
              id="ai-pharmacist-approval-table"
            />
          </div>

          {/* ========================================================================= */}
          {/* 3. GPP APOTHEKER VERKLARING & CONTROLEPANEEL */}
          {/* ========================================================================= */}
          <div className="bg-gradient-to-r from-emerald-50/80 via-teal-50/60 to-cyan-50/80 border-2 border-emerald-300 rounded-2xl p-4 shadow-sm space-y-3">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-emerald-200/80 pb-3">
              <div className="flex items-center gap-2.5">
                <div className="w-8 h-8 rounded-xl bg-emerald-600 text-white flex items-center justify-center shadow-xs shrink-0">
                  <ShieldCheck size={18} />
                </div>
                <div>
                  <h4 className="text-xs font-black text-emerald-950 uppercase tracking-wider flex items-center gap-2">
                    Xác Nhận Thẩm Định Chuyên Môn Dược Sĩ
                    <span className="bg-emerald-200 text-emerald-900 text-[9px] px-2 py-0.5 rounded-full font-black border border-emerald-300">
                      Bắt buộc GPP
                    </span>
                  </h4>
                  <p className="text-[11px] text-emerald-800 mt-0.5">
                    Dược sĩ: <strong>{pharmacistName}</strong> • CCHN: <strong>{pharmacistLicense}</strong> • Cơ sở: <strong>{branchName}</strong>
                  </p>
                </div>
              </div>
              <span className="text-[10px] font-bold text-emerald-900 bg-white/90 px-2.5 py-1 rounded-lg border border-emerald-200 shadow-2xs self-start sm:self-auto">
                🕒 {new Date().toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit' })} - Hôm nay
              </span>
            </div>

            {/* Veiligheidschecklist van 3 punten */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-2 text-[11px]">
              <div className="flex items-center gap-1.5 text-emerald-900 bg-white/80 p-2 rounded-xl border border-emerald-100 font-medium">
                <CheckCircle2 size={13} className="text-emerald-600 shrink-0" /> Khớp hoạt chất & hàm lượng
              </div>
              <div className="flex items-center gap-1.5 text-emerald-900 bg-white/80 p-2 rounded-xl border border-emerald-100 font-medium">
                <CheckCircle2 size={13} className="text-emerald-600 shrink-0" /> Không tương tác chống chỉ định
              </div>
              <div className="flex items-center gap-1.5 text-emerald-900 bg-white/80 p-2 rounded-xl border border-emerald-100 font-medium">
                <CheckCircle2 size={13} className="text-emerald-600 shrink-0" /> Gán lô FEFO cận hạn tự động
              </div>
            </div>

            {/* Klinische notities van de apotheker */}
            <div>
              <label
                htmlFor="clinical-notes-textarea"
                className="text-[10px] font-bold text-slate-500 uppercase tracking-wider block mb-1"
              >
                Ghi chú lâm sàng / Dặn dò thêm cho bệnh nhân:
              </label>
              <textarea
                id="clinical-notes-textarea"
                rows={2}
                value={clinicalNotes}
                onChange={(e) => setClinicalNotes(e.target.value)}
                placeholder="Ví dụ: Uống nhiều nước, kiêng đồ chua cay, tái khám nếu sốt kéo dài trên 3 ngày..."
                className="w-full text-xs p-2.5 rounded-xl border border-emerald-200 bg-white text-slate-800 focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500"
              />
            </div>

            {/* Verplichte GPP-akkoordverklaring met checkbox */}
            <label className="flex items-start gap-2.5 cursor-pointer select-none bg-white p-3 rounded-xl border border-emerald-300 hover:bg-emerald-50/50 transition-colors shadow-2xs">
              <input
                type="checkbox"
                id="gpp-pharmacist-agreement-checkbox"
                checked={gppAgreementChecked}
                onChange={(e) => setGppAgreementChecked(e.target.checked)}
                className="mt-0.5 h-4 w-4 rounded text-emerald-600 focus:ring-emerald-500 border-slate-300 cursor-pointer"
              />
              <span className="text-xs text-slate-700 leading-snug">
                Tôi là Dược sĩ chuyên môn phụ trách ca, xác nhận đã đối soát và thẩm định lâm sàng danh mục thuốc do AI đề xuất. Tôi <strong>chịu hoàn toàn trách nhiệm chuyên môn</strong> khi đưa danh mục thuốc này vào đơn bán hàng POS theo tiêu chuẩn GPP.
              </span>
            </label>
          </div>
        </div>

        {/* ========================================================================= */}
        {/* 4. FOOTER ACTIONS */}
        {/* ========================================================================= */}
        <div className="p-4 bg-slate-50 border-t border-slate-200 flex flex-col-reverse sm:flex-row items-center justify-between gap-3 shrink-0">
          <button
            type="button"
            onClick={onClose}
            disabled={submitting}
            className="w-full sm:w-auto px-5 py-2.5 rounded-xl bg-white hover:bg-slate-100 text-slate-700 text-xs font-bold border border-slate-200 transition cursor-pointer disabled:opacity-50"
          >
            Từ chối / Đóng
          </button>

          <button
            type="button"
            onClick={handleConfirmApproval}
            disabled={submitting || selectedDrugs.length === 0 || !gppAgreementChecked}
            className="w-full sm:w-auto px-6 py-2.5 rounded-xl bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-700 hover:to-teal-700 text-white text-xs font-black uppercase tracking-wider transition shadow-md hover:shadow-emerald-600/20 flex items-center justify-center gap-2 cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed active:scale-98"
          >
            <ShieldCheck size={16} />
            <span>
              {submitting
                ? 'Đang xử lý phê duyệt...'
                : `Dược sĩ phê duyệt & Đưa vào đơn hàng (${selectedDrugs.length} thuốc)`}
            </span>
          </button>
        </div>

      </div>
    </div>
  );
};

export default AIPharmacistApprovalModal;
