import React, { useState, useEffect } from 'react';
import {
  Award,
  Plus,
  CheckCircle2,
  Clock,
  XCircle,
  AlertTriangle,
  FileText,
  Upload,
  Eye,
  Trash2,
  Edit3,
  ExternalLink,
  ShieldCheck,
  Building2,
  Calendar,
  DollarSign,
  Loader2,
  X,
  AlertCircle
} from 'lucide-react';
import {
  certificateService,
  StaffCertificate,
  CertificateType,
  CertificatePurpose,
} from '../../services/hr/certificate.service';

const CERT_TYPE_LABELS: Record<CertificateType, { label: string; badge: string; color: string }> = {
  PHARMACIST_UNIVERSITY: {
    label: 'Dược sĩ Đại học',
    badge: 'bg-blue-100 text-blue-800 border-blue-200',
    color: 'text-blue-600',
  },
  PHARMACIST_COLLEGE: {
    label: 'Dược sĩ Cao đẳng',
    badge: 'bg-teal-100 text-teal-800 border-teal-200',
    color: 'text-teal-600',
  },
  PHARMACIST_INTERMEDIATE: {
    label: 'Dược sĩ Trung cấp',
    badge: 'bg-slate-100 text-slate-800 border-slate-200',
    color: 'text-slate-600',
  },
  PRACTICE_CERTIFICATE: {
    label: 'Chứng chỉ hành nghề Dược (CCHN)',
    badge: 'bg-purple-100 text-purple-800 border-purple-200',
    color: 'text-purple-600',
  },
  CONTINUING_EDUCATION: {
    label: 'Chứng chỉ đào tạo liên tục (CPE)',
    badge: 'bg-amber-100 text-amber-800 border-amber-200',
    color: 'text-amber-600',
  },
};

interface Props {
  userRole?: string;
}

export function StaffCertificateSection({ userRole }: Props) {
  const [certificates, setCertificates] = useState<StaffCertificate[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  // Modal nộp/sửa hồ sơ
  const [isFormModalOpen, setIsFormModalOpen] = useState(false);
  const [editingCert, setEditingCert] = useState<StaffCertificate | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);

  // Form states
  const [formData, setFormData] = useState({
    certificateType: 'PHARMACIST_UNIVERSITY' as CertificateType,
    certificateNumber: '',
    issuedBy: '',
    issueDate: '',
    expiryDate: '',
    hasNoExpiry: true,
    purpose: 'ALLOWANCE_ONLY' as CertificatePurpose,
    frontImageUrl: '',
    backImageUrl: '',
  });

  // State upload ảnh
  const [isUploadingFront, setIsUploadingFront] = useState(false);
  const [isUploadingBack, setIsUploadingBack] = useState(false);

  // Modal phóng to xem ảnh
  const [previewImageModal, setPreviewImageModal] = useState<{
    isOpen: boolean;
    title: string;
    frontUrl: string;
    backUrl?: string;
  }>({
    isOpen: false,
    title: '',
    frontUrl: '',
  });

  const fetchCertificates = async () => {
    try {
      setLoading(true);
      const data = await certificateService.getMyCertificates();
      setCertificates(data || []);
      setError(null);
    } catch (err: any) {
      console.error('Failed to load certificates:', err);
      setError(err.response?.data?.message || 'Không thể tải danh sách bằng cấp');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchCertificates();
  }, []);

  // Tính toán tổng phụ cấp đang được nhận
  const totalAllowance = certificates
    .filter(c => c.status === 'DA_DUYET')
    .reduce((sum, c) => sum + (c.monthlyAllowance || 0), 0);

  // Kiểm tra có văn bằng nào sắp hết hạn trong 60 ngày không
  const expiringCerts = certificates.filter(c => {
    if (!c.expiryDate || c.status !== 'DA_DUYET') return false;
    const exp = new Date(c.expiryDate).getTime();
    const now = new Date().getTime();
    const diffDays = Math.ceil((exp - now) / (1000 * 3600 * 24));
    return diffDays <= 60;
  });

  const handleOpenAddModal = () => {
    setEditingCert(null);
    setFormData({
      certificateType: 'PHARMACIST_UNIVERSITY',
      certificateNumber: '',
      issuedBy: '',
      issueDate: '',
      expiryDate: '',
      hasNoExpiry: true,
      purpose: 'ALLOWANCE_ONLY',
      frontImageUrl: '',
      backImageUrl: '',
    });
    setFormError(null);
    setIsFormModalOpen(true);
  };

  const handleOpenEditModal = (cert: StaffCertificate) => {
    setEditingCert(cert);
    setFormData({
      certificateType: cert.certificateType,
      certificateNumber: cert.certificateNumber,
      issuedBy: cert.issuedBy,
      issueDate: cert.issueDate,
      expiryDate: cert.expiryDate || '',
      hasNoExpiry: !cert.expiryDate,
      purpose: cert.purpose,
      frontImageUrl: cert.frontImageUrl,
      backImageUrl: cert.backImageUrl || '',
    });
    setFormError(null);
    setIsFormModalOpen(true);
  };

  // Upload file lên backend
  const handleFileUpload = async (file: File, isFront: boolean) => {
    try {
      if (isFront) setIsUploadingFront(true);
      else setIsUploadingBack(true);

      const res = await certificateService.uploadImage(file);
      if (isFront) {
        setFormData(prev => ({ ...prev, frontImageUrl: res.url }));
      } else {
        setFormData(prev => ({ ...prev, backImageUrl: res.url }));
      }
    } catch (err: any) {
      console.error('Upload failed:', err);
      setFormError(err.response?.data?.message || 'Tải ảnh lên thất bại');
    } finally {
      if (isFront) setIsUploadingFront(false);
      else setIsUploadingBack(false);
    }
  };

  const handleSubmitForm = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.certificateNumber.trim()) {
      setFormError('Vui lòng nhập số hiệu văn bằng/chứng chỉ');
      return;
    }
    if (!formData.issuedBy.trim()) {
      setFormError('Vui lòng nhập đơn vị cấp');
      return;
    }
    if (!formData.issueDate) {
      setFormError('Vui lòng chọn ngày cấp');
      return;
    }
    if (!formData.frontImageUrl) {
      setFormError('Vui lòng tải lên ảnh mặt trước của văn bằng/chứng chỉ');
      return;
    }

    try {
      setIsSubmitting(true);
      setFormError(null);

      const payload = {
        certificateType: formData.certificateType,
        certificateNumber: formData.certificateNumber.trim(),
        issuedBy: formData.issuedBy.trim(),
        issueDate: formData.issueDate,
        expiryDate: formData.hasNoExpiry ? undefined : formData.expiryDate || undefined,
        purpose: formData.purpose,
        frontImageUrl: formData.frontImageUrl,
        backImageUrl: formData.backImageUrl || undefined,
      };

      if (editingCert) {
        await certificateService.updateCertificate(editingCert._id, payload);
        setSuccess('Đã cập nhật và nộp lại hồ sơ thành công! Quản lý sẽ thẩm định.');
      } else {
        await certificateService.submitCertificate(payload);
        setSuccess('Nộp hồ sơ thành công! Đang chờ Quản lý chi nhánh phê duyệt.');
      }

      setIsFormModalOpen(false);
      fetchCertificates();
      setTimeout(() => setSuccess(null), 4000);
    } catch (err: any) {
      console.error('Submit failed:', err);
      setFormError(err.response?.data?.message || err.message || 'Thao tác thất bại');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDeleteCert = async (certId: string) => {
    if (!window.confirm('Bạn có chắc chắn muốn xóa hồ sơ văn bằng này không?')) return;
    try {
      await certificateService.deleteCertificate(certId);
      setSuccess('Đã xóa hồ sơ thành công');
      fetchCertificates();
      setTimeout(() => setSuccess(null), 3000);
    } catch (err: any) {
      alert(err.response?.data?.message || 'Xóa hồ sơ thất bại');
    }
  };

  return (
    <div className="bg-white rounded-2xl shadow-sm border border-slate-100 p-6 space-y-6">
      {/* ── Tiêu đề & Nút thêm mới ── */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-100 pb-4">
        <div>
          <div className="flex items-center gap-2">
            <div className="p-2 bg-indigo-50 text-indigo-600 rounded-xl">
              <Award size={20} />
            </div>
            <div>
              <h2 className="text-base font-bold text-slate-800">
                Hồ sơ Văn bằng & Chứng chỉ hành nghề (CCHN)
              </h2>
              <p className="text-xs text-slate-500 mt-0.5">
                {userRole === 'branch'
                  ? 'Khai báo hồ sơ chuyên môn & CCHN của Quản lý phục vụ đăng ký phụ trách chuyên môn GPP hoặc phụ cấp chức danh'
                  : 'Khai báo trình độ Dược sĩ để hưởng phụ cấp chuyên môn hoặc đăng ký đứng tên PTCM chi nhánh'}
              </p>
            </div>
          </div>
        </div>

        <button
          onClick={handleOpenAddModal}
          className="flex items-center justify-center gap-1.5 px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-sm font-semibold transition-all shadow-md shadow-indigo-500/20 shrink-0"
        >
          <Plus size={16} /> Nộp bằng cấp mới
        </button>
      </div>

      {/* ── Banners thông báo ── */}
      {success && (
        <div className="bg-emerald-50 border border-emerald-200 text-emerald-700 px-4 py-3 rounded-xl flex items-center gap-2 text-sm font-medium">
          <CheckCircle2 size={18} className="text-emerald-500 shrink-0" />
          {success}
        </div>
      )}

      {error && (
        <div className="bg-rose-50 border border-rose-200 text-rose-600 px-4 py-3 rounded-xl flex items-center gap-2 text-sm font-medium">
          <AlertCircle size={18} className="shrink-0" />
          {error}
        </div>
      )}

      {/* ── Cảnh báo hạn sử dụng ── */}
      {expiringCerts.length > 0 && (
        <div className="bg-amber-50 border border-amber-200 text-amber-800 p-4 rounded-xl flex items-start gap-3">
          <AlertTriangle className="text-amber-500 shrink-0 mt-0.5" size={18} />
          <div className="text-xs">
            <p className="font-bold">Cảnh báo thời hạn hiệu lực bằng cấp / CPE:</p>
            <p className="mt-0.5">
              Bạn có {expiringCerts.length} chứng chỉ sắp hết hạn hoặc đã hết hạn hiệu lực theo quy định Sở Y tế. Vui lòng hoàn thành đào tạo CPE hoặc gia hạn sớm để không gián đoạn phụ cấp.
            </p>
          </div>
        </div>
      )}

      {/* ── Thống kê phụ cấp cá nhân ── */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
        <div className="p-4 rounded-xl bg-slate-50 border border-slate-100 flex items-center gap-3">
          <div className="p-2.5 bg-indigo-100 text-indigo-600 rounded-lg shrink-0">
            <DollarSign size={20} />
          </div>
          <div>
            <p className="text-xs font-semibold text-slate-500">Phụ cấp bằng cấp hàng tháng</p>
            <p className="text-lg font-black text-slate-900 mt-0.5">
              +{totalAllowance.toLocaleString('vi-VN')} đ
            </p>
          </div>
        </div>

        <div className="p-4 rounded-xl bg-slate-50 border border-slate-100 flex items-center gap-3">
          <div className="p-2.5 bg-emerald-100 text-emerald-600 rounded-lg shrink-0">
            <ShieldCheck size={20} />
          </div>
          <div>
            <p className="text-xs font-semibold text-slate-500">Hồ sơ đã phê duyệt</p>
            <p className="text-lg font-black text-slate-900 mt-0.5">
              {certificates.filter(c => c.status === 'DA_DUYET').length} / {certificates.length} hồ sơ
            </p>
          </div>
        </div>

        <div className="p-4 rounded-xl bg-slate-50 border border-slate-100 flex items-center gap-3">
          <div className="p-2.5 bg-purple-100 text-purple-600 rounded-lg shrink-0">
            <Building2 size={20} />
          </div>
          <div>
            <p className="text-xs font-semibold text-slate-500">Vai trò pháp lý GPP</p>
            <p className="text-sm font-bold text-slate-800 mt-0.5">
              {certificates.some(c => c.isBranchPIC && c.status === 'DA_DUYET') ? (
                <span className="text-emerald-600 inline-flex items-center gap-1">
                  <CheckCircle2 size={14} /> PTCM Chi nhánh
                </span>
              ) : userRole === 'branch' ? (
                <span className="text-slate-700 font-semibold">Quản lý cơ sở</span>
              ) : (
                <span className="text-slate-500">Dược sĩ chuyên môn</span>
              )}
            </p>
          </div>
        </div>
      </div>

      {/* ── Danh sách văn bằng ── */}
      {loading ? (
        <div className="flex justify-center items-center py-10">
          <Loader2 className="w-8 h-8 text-indigo-500 animate-spin" />
        </div>
      ) : certificates.length === 0 ? (
        <div className="text-center py-10 border-2 border-dashed border-slate-200 rounded-2xl bg-slate-50/50">
          <FileText className="w-12 h-12 text-slate-300 mx-auto mb-2" />
          <p className="text-sm font-bold text-slate-600">Chưa có hồ sơ bằng cấp nào được khai báo</p>
          <p className="text-xs text-slate-400 mt-1 max-w-sm mx-auto">
            {userRole === 'branch'
              ? 'Nhấn nút "Nộp bằng cấp mới" ở trên để cập nhật hồ sơ chuyên môn của Quản lý chi nhánh vào cơ sở dữ liệu hệ thống.'
              : 'Nhấn nút "Nộp bằng cấp mới" ở trên để gửi hồ sơ cho Quản lý chi nhánh xét duyệt phụ cấp.'}
          </p>
        </div>
      ) : (
        <div className="space-y-4">
          {certificates.map(cert => {
            const typeConfig = CERT_TYPE_LABELS[cert.certificateType] || CERT_TYPE_LABELS.PHARMACIST_UNIVERSITY;

            return (
              <div
                key={cert._id}
                className="p-5 rounded-2xl border border-slate-200 bg-white hover:border-indigo-200 transition-all shadow-sm space-y-4"
              >
                {/* Header item */}
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                  <div className="flex items-center gap-2.5 flex-wrap">
                    <span className={`px-2.5 py-1 rounded-full text-xs font-bold border ${typeConfig.badge}`}>
                      {typeConfig.label}
                    </span>
                    <span className="text-xs font-mono font-bold text-slate-700 bg-slate-100 px-2 py-0.5 rounded">
                      Số: {cert.certificateNumber}
                    </span>
                    {cert.isBranchPIC && cert.status === 'DA_DUYET' && (
                      <span className="bg-amber-100 text-amber-800 border border-amber-200 px-2 py-0.5 rounded-full text-xs font-bold flex items-center gap-1">
                        <Award size={12} /> PTCM Chi nhánh
                      </span>
                    )}
                  </div>

                  {/* Status badge */}
                  <div>
                    {cert.status === 'CHO_DUYET' && (
                      <span className="inline-flex items-center gap-1 px-3 py-1 bg-amber-50 text-amber-700 border border-amber-200 rounded-full text-xs font-bold">
                        <Clock size={13} className="animate-pulse" /> Chờ thẩm định
                      </span>
                    )}
                    {cert.status === 'DA_DUYET' && (
                      <span className="inline-flex items-center gap-1 px-3 py-1 bg-emerald-50 text-emerald-700 border border-emerald-200 rounded-full text-xs font-bold">
                        <CheckCircle2 size={13} /> Đã phê duyệt (+{(cert.monthlyAllowance || 0).toLocaleString('vi-VN')} đ/tháng)
                      </span>
                    )}
                    {cert.status === 'TU_CHOI' && (
                      <span className="inline-flex items-center gap-1 px-3 py-1 bg-rose-50 text-rose-700 border border-rose-200 rounded-full text-xs font-bold">
                        <XCircle size={13} /> Bị từ chối
                      </span>
                    )}
                  </div>
                </div>

                {/* Body metadata */}
                <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-3 text-xs bg-slate-50/70 p-3 rounded-xl border border-slate-100">
                  <div>
                    <span className="text-slate-400 block font-semibold">Đơn vị cấp:</span>
                    <span className="text-slate-800 font-bold mt-0.5 block truncate">{cert.issuedBy}</span>
                  </div>
                  <div>
                    <span className="text-slate-400 block font-semibold">Ngày cấp:</span>
                    <span className="text-slate-800 font-bold mt-0.5 block">{cert.issueDate}</span>
                  </div>
                  <div>
                    <span className="text-slate-400 block font-semibold">Thời hạn:</span>
                    <span className="text-slate-800 font-bold mt-0.5 block">
                      {cert.expiryDate ? cert.expiryDate : 'Vô thời hạn'}
                    </span>
                  </div>
                  <div>
                    <span className="text-slate-400 block font-semibold">Mục đích:</span>
                    <span className="text-slate-800 font-bold mt-0.5 block">
                      {cert.purpose === 'BRANCH_PIC_RESPONSIBLE'
                        ? 'Đăng ký đứng tên PTCM'
                        : 'Hưởng phụ cấp chuyên môn'}
                    </span>
                  </div>
                </div>

                {/* Hộp hiển thị lý do nếu bị từ chối */}
                {cert.status === 'TU_CHOI' && cert.rejectionReason && (
                  <div className="bg-rose-50 border border-rose-200 text-rose-700 p-3 rounded-xl text-xs flex items-start gap-2">
                    <AlertCircle size={16} className="text-rose-500 shrink-0 mt-0.5" />
                    <div>
                      <p className="font-bold">Lý do từ chối của Quản lý chi nhánh:</p>
                      <p className="mt-0.5">{cert.rejectionReason}</p>
                    </div>
                  </div>
                )}

                {/* Thông tin thẩm định nếu đã duyệt */}
                {cert.status === 'DA_DUYET' && cert.verifiedByName && (
                  <div className="text-xs text-slate-500 flex items-center gap-1.5">
                    <ShieldCheck size={14} className="text-emerald-500" />
                    Đã thẩm định bởi: <strong className="text-slate-700">{cert.verifiedByName}</strong>
                    {cert.verifiedAt && (
                      <span>vào {new Date(cert.verifiedAt).toLocaleDateString('vi-VN')}</span>
                    )}
                  </div>
                )}

                {/* Actions & Ảnh đính kèm */}
                <div className="flex items-center justify-between pt-2 border-t border-slate-100 flex-wrap gap-2">
                  <div className="flex items-center gap-2">
                    <button
                      type="button"
                      onClick={() =>
                        setPreviewImageModal({
                          isOpen: true,
                          title: `${typeConfig.label} - Số: ${cert.certificateNumber}`,
                          frontUrl: cert.frontImageUrl,
                          backUrl: cert.backImageUrl,
                        })
                      }
                      className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-lg text-xs font-semibold transition-colors"
                    >
                      <Eye size={14} /> Xem ảnh bằng cấp
                    </button>
                  </div>

                  <div className="flex items-center gap-2">
                    {cert.status === 'TU_CHOI' && (
                      <button
                        type="button"
                        onClick={() => handleOpenEditModal(cert)}
                        className="inline-flex items-center gap-1 px-3 py-1.5 bg-indigo-50 hover:bg-indigo-100 text-indigo-700 rounded-lg text-xs font-semibold transition-colors"
                      >
                        <Edit3 size={13} /> Sửa & Nộp lại
                      </button>
                    )}

                    {cert.status !== 'DA_DUYET' && (
                      <button
                        type="button"
                        onClick={() => handleDeleteCert(cert._id)}
                        className="inline-flex items-center gap-1 px-3 py-1.5 text-rose-600 hover:bg-rose-50 rounded-lg text-xs font-semibold transition-colors"
                      >
                        <Trash2 size={13} /> Xóa
                      </button>
                    )}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* ── Modal Nộp / Sửa văn bằng ── */}
      {isFormModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div
            className="absolute inset-0 bg-slate-900/50 backdrop-blur-sm"
            onClick={() => !isSubmitting && setIsFormModalOpen(false)}
          />

          <div className="relative bg-white rounded-2xl shadow-2xl w-full max-w-xl max-h-[90vh] overflow-y-auto border border-slate-100 p-6 space-y-5">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <h3 className="text-base font-bold text-slate-800 flex items-center gap-2">
                <Award size={18} className="text-indigo-600" />
                {editingCert ? 'Chỉnh sửa & Nộp lại hồ sơ' : 'Khai báo Văn bằng & CCHN mới'}
              </h3>
              <button
                type="button"
                onClick={() => !isSubmitting && setIsFormModalOpen(false)}
                className="p-1 text-slate-400 hover:text-slate-600 rounded-lg"
              >
                <X size={20} />
              </button>
            </div>

            {formError && (
              <div className="bg-rose-50 border border-rose-200 text-rose-600 p-3 rounded-xl text-xs flex items-center gap-2">
                <AlertCircle size={15} className="shrink-0" />
                {formError}
              </div>
            )}

            <form onSubmit={handleSubmitForm} className="space-y-4">
              {/* Loại bằng */}
              <div>
                <label className="block text-xs font-bold text-slate-600 uppercase mb-1">
                  Loại văn bằng / Chứng chỉ *
                </label>
                <select
                  value={formData.certificateType}
                  onChange={e => setFormData(f => ({ ...f, certificateType: e.target.value as CertificateType }))}
                  className="w-full px-3 py-2 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 bg-slate-50"
                >
                  <option value="PHARMACIST_UNIVERSITY">Bằng Dược sĩ Đại học</option>
                  <option value="PHARMACIST_COLLEGE">Bằng Dược sĩ Cao đẳng</option>
                  <option value="PHARMACIST_INTERMEDIATE">Bằng Trung cấp Dược</option>
                  <option value="PRACTICE_CERTIFICATE">Chứng chỉ hành nghề Dược (CCHN)</option>
                  <option value="CONTINUING_EDUCATION">Chứng chỉ đào tạo y khoa liên tục (CPE)</option>
                </select>
              </div>

              {/* Số hiệu + Đơn vị cấp */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold text-slate-600 uppercase mb-1">
                    Số hiệu bằng / Mã CCHN *
                  </label>
                  <input
                    type="text"
                    required
                    placeholder="VD: 012345/SYT-CCHND"
                    value={formData.certificateNumber}
                    onChange={e => setFormData(f => ({ ...f, certificateNumber: e.target.value }))}
                    className="w-full px-3 py-2 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 bg-slate-50"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-600 uppercase mb-1">
                    Đơn vị cấp *
                  </label>
                  <input
                    type="text"
                    required
                    placeholder="VD: Sở Y tế Hà Nội / ĐH Dược"
                    value={formData.issuedBy}
                    onChange={e => setFormData(f => ({ ...f, issuedBy: e.target.value }))}
                    className="w-full px-3 py-2 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 bg-slate-50"
                  />
                </div>
              </div>

              {/* Ngày cấp + Ngày hết hạn */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold text-slate-600 uppercase mb-1">
                    Ngày cấp *
                  </label>
                  <input
                    type="date"
                    required
                    value={formData.issueDate}
                    onChange={e => setFormData(f => ({ ...f, issueDate: e.target.value }))}
                    className="w-full px-3 py-2 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 bg-slate-50"
                  />
                </div>

                <div>
                  <div className="flex items-center justify-between mb-1">
                    <label className="text-xs font-bold text-slate-600 uppercase">
                      Ngày hết hạn
                    </label>
                    <label className="text-xs text-indigo-600 flex items-center gap-1 cursor-pointer">
                      <input
                        type="checkbox"
                        checked={formData.hasNoExpiry}
                        onChange={e => setFormData(f => ({ ...f, hasNoExpiry: e.target.checked }))}
                        className="rounded text-indigo-600 focus:ring-0"
                      />
                      Vô thời hạn
                    </label>
                  </div>
                  <input
                    type="date"
                    disabled={formData.hasNoExpiry}
                    value={formData.expiryDate}
                    onChange={e => setFormData(f => ({ ...f, expiryDate: e.target.value }))}
                    className="w-full px-3 py-2 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 bg-slate-50 disabled:opacity-50"
                  />
                </div>
              </div>

              {/* Mục đích */}
              <div>
                <label className="block text-xs font-bold text-slate-600 uppercase mb-1.5">
                  Mục đích đăng ký *
                </label>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                  <label
                    className={`flex items-start gap-2.5 p-3 rounded-xl border cursor-pointer text-xs transition-colors ${
                      formData.purpose === 'ALLOWANCE_ONLY'
                        ? 'border-indigo-500 bg-indigo-50/50 text-indigo-900 font-semibold'
                        : 'border-slate-200 bg-white text-slate-700'
                    }`}
                  >
                    <input
                      type="radio"
                      name="purpose"
                      value="ALLOWANCE_ONLY"
                      checked={formData.purpose === 'ALLOWANCE_ONLY'}
                      onChange={() => setFormData(f => ({ ...f, purpose: 'ALLOWANCE_ONLY' }))}
                      className="mt-0.5 text-indigo-600 focus:ring-0"
                    />
                    <div>
                      <p className="font-bold">Hưởng phụ cấp chuyên môn</p>
                      <p className="text-slate-500 text-[11px] mt-0.5">Áp dụng cho Dược sĩ tư vấn bán hàng</p>
                    </div>
                  </label>

                  <label
                    className={`flex items-start gap-2.5 p-3 rounded-xl border cursor-pointer text-xs transition-colors ${
                      formData.purpose === 'BRANCH_PIC_RESPONSIBLE'
                        ? 'border-indigo-500 bg-indigo-50/50 text-indigo-900 font-semibold'
                        : 'border-slate-200 bg-white text-slate-700'
                    }`}
                  >
                    <input
                      type="radio"
                      name="purpose"
                      value="BRANCH_PIC_RESPONSIBLE"
                      checked={formData.purpose === 'BRANCH_PIC_RESPONSIBLE'}
                      onChange={() => setFormData(f => ({ ...f, purpose: 'BRANCH_PIC_RESPONSIBLE' }))}
                      className="mt-0.5 text-indigo-600 focus:ring-0"
                    />
                    <div>
                      <p className="font-bold">Đăng ký đứng tên PTCM Chi nhánh</p>
                      <p className="text-slate-500 text-[11px] mt-0.5">Yêu cầu CCHN Dược, phụ cấp trách nhiệm cao</p>
                    </div>
                  </label>
                </div>
              </div>

              {/* Upload ảnh 2 mặt */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-2">
                {/* Mặt trước */}
                <div className="border border-slate-200 rounded-xl p-3 bg-slate-50/50">
                  <span className="block text-xs font-bold text-slate-700 mb-1">
                    Ảnh mặt trước *
                  </span>
                  {formData.frontImageUrl ? (
                    <div className="relative group">
                      <img
                        src={formData.frontImageUrl}
                        alt="Front"
                        className="w-full h-32 object-cover rounded-lg border border-slate-200"
                      />
                      <button
                        type="button"
                        onClick={() => setFormData(f => ({ ...f, frontImageUrl: '' }))}
                        className="absolute top-1 right-1 p-1 bg-rose-600 text-white rounded-full shadow hover:bg-rose-700"
                      >
                        <X size={14} />
                      </button>
                    </div>
                  ) : (
                    <label className="flex flex-col items-center justify-center h-32 border-2 border-dashed border-slate-300 rounded-lg cursor-pointer hover:border-indigo-400 bg-white transition-colors">
                      {isUploadingFront ? (
                        <Loader2 className="w-6 h-6 text-indigo-500 animate-spin" />
                      ) : (
                        <>
                          <Upload className="w-6 h-6 text-slate-400 mb-1" />
                          <span className="text-xs text-slate-500 font-medium">Tải lên mặt trước</span>
                          <span className="text-[10px] text-slate-400">JPG, PNG, WebP (Tối đa 5MB)</span>
                        </>
                      )}
                      <input
                        type="file"
                        accept="image/*,application/pdf"
                        className="hidden"
                        onChange={e => e.target.files?.[0] && handleFileUpload(e.target.files[0], true)}
                      />
                    </label>
                  )}
                </div>

                {/* Mặt sau */}
                <div className="border border-slate-200 rounded-xl p-3 bg-slate-50/50">
                  <span className="block text-xs font-bold text-slate-700 mb-1">
                    Ảnh mặt sau (tùy chọn)
                  </span>
                  {formData.backImageUrl ? (
                    <div className="relative group">
                      <img
                        src={formData.backImageUrl}
                        alt="Back"
                        className="w-full h-32 object-cover rounded-lg border border-slate-200"
                      />
                      <button
                        type="button"
                        onClick={() => setFormData(f => ({ ...f, backImageUrl: '' }))}
                        className="absolute top-1 right-1 p-1 bg-rose-600 text-white rounded-full shadow hover:bg-rose-700"
                      >
                        <X size={14} />
                      </button>
                    </div>
                  ) : (
                    <label className="flex flex-col items-center justify-center h-32 border-2 border-dashed border-slate-300 rounded-lg cursor-pointer hover:border-indigo-400 bg-white transition-colors">
                      {isUploadingBack ? (
                        <Loader2 className="w-6 h-6 text-indigo-500 animate-spin" />
                      ) : (
                        <>
                          <Upload className="w-6 h-6 text-slate-400 mb-1" />
                          <span className="text-xs text-slate-500 font-medium">Tải lên mặt sau</span>
                          <span className="text-[10px] text-slate-400">JPG, PNG, WebP</span>
                        </>
                      )}
                      <input
                        type="file"
                        accept="image/*,application/pdf"
                        className="hidden"
                        onChange={e => e.target.files?.[0] && handleFileUpload(e.target.files[0], false)}
                      />
                    </label>
                  )}
                </div>
              </div>

              {/* Action buttons */}
              <div className="flex justify-end gap-2 pt-3 border-t border-slate-100">
                <button
                  type="button"
                  disabled={isSubmitting}
                  onClick={() => setIsFormModalOpen(false)}
                  className="px-4 py-2 border border-slate-200 rounded-xl text-xs font-bold text-slate-600 hover:bg-slate-50"
                >
                  Hủy
                </button>
                <button
                  type="submit"
                  disabled={isSubmitting || isUploadingFront || isUploadingBack}
                  className="px-5 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-xs font-bold shadow-md shadow-indigo-500/20 disabled:opacity-50 flex items-center gap-1.5"
                >
                  {isSubmitting && <Loader2 size={14} className="animate-spin" />}
                  {editingCert ? 'Cập nhật & Gửi thẩm định' : 'Nộp hồ sơ ngay'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ── Modal Xem ảnh phóng to ── */}
      {previewImageModal.isOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div
            className="absolute inset-0 bg-slate-900/60 backdrop-blur-sm"
            onClick={() => setPreviewImageModal(prev => ({ ...prev, isOpen: false }))}
          />
          <div className="relative bg-white rounded-2xl shadow-2xl max-w-2xl w-full max-h-[90vh] overflow-hidden flex flex-col">
            <div className="flex items-center justify-between p-4 border-b border-slate-100">
              <h4 className="text-sm font-bold text-slate-800">{previewImageModal.title}</h4>
              <button
                type="button"
                onClick={() => setPreviewImageModal(prev => ({ ...prev, isOpen: false }))}
                className="p-1 text-slate-400 hover:text-slate-600 rounded-lg"
              >
                <X size={20} />
              </button>
            </div>
            <div className="p-4 overflow-y-auto space-y-4 text-center">
              <div>
                <p className="text-xs font-bold text-slate-500 mb-2">Mặt trước</p>
                <img
                  src={previewImageModal.frontUrl}
                  alt="Front Preview"
                  className="max-h-80 mx-auto rounded-lg border border-slate-200 object-contain shadow-sm"
                />
              </div>
              {previewImageModal.backUrl && (
                <div className="border-t border-slate-100 pt-3">
                  <p className="text-xs font-bold text-slate-500 mb-2">Mặt sau</p>
                  <img
                    src={previewImageModal.backUrl}
                    alt="Back Preview"
                    className="max-h-80 mx-auto rounded-lg border border-slate-200 object-contain shadow-sm"
                  />
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
