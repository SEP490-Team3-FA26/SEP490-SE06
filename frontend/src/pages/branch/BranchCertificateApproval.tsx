import React, { useState, useEffect } from 'react';
import {
  Award,
  Search,
  CheckCircle2,
  XCircle,
  Clock,
  AlertTriangle,
  Eye,
  Check,
  X,
  Building2,
  DollarSign,
  ShieldCheck,
  Users,
  Filter,
  FileText,
  ExternalLink,
  ChevronRight,
  Loader2,
  AlertCircle,
  HelpCircle,
  ShieldAlert
} from 'lucide-react';
import {
  certificateService,
  StaffCertificate,
  CertificateType,
  BranchCertificateSummary,
} from '../../services/hr/certificate.service';

const CERT_TYPE_LABELS: Record<CertificateType, { label: string; badge: string; defaultAllowance: number }> = {
  PHARMACIST_UNIVERSITY: {
    label: 'Dược sĩ Đại học',
    badge: 'bg-blue-100 text-blue-800 border-blue-200',
    defaultAllowance: 1500000,
  },
  PHARMACIST_COLLEGE: {
    label: 'Dược sĩ Cao đẳng',
    badge: 'bg-teal-100 text-teal-800 border-teal-200',
    defaultAllowance: 800000,
  },
  PHARMACIST_INTERMEDIATE: {
    label: 'Dược sĩ Trung cấp',
    badge: 'bg-slate-100 text-slate-800 border-slate-200',
    defaultAllowance: 500000,
  },
  PRACTICE_CERTIFICATE: {
    label: 'Chứng chỉ hành nghề Dược (CCHN)',
    badge: 'bg-purple-100 text-purple-800 border-purple-200',
    defaultAllowance: 3500000,
  },
  CONTINUING_EDUCATION: {
    label: 'Chứng chỉ đào tạo liên tục (CPE)',
    badge: 'bg-amber-100 text-amber-800 border-amber-200',
    defaultAllowance: 300000,
  },
};

export function BranchCertificateApproval() {
  const [certificates, setCertificates] = useState<StaffCertificate[]>([]);
  const [summary, setSummary] = useState<BranchCertificateSummary | null>(null);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState<'all' | 'CHO_DUYET' | 'DA_DUYET' | 'TU_CHOI'>('all');
  const [typeFilter, setTypeFilter] = useState<string>('all');
  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  // Modal phê duyệt
  const [approvingCert, setApprovingCert] = useState<StaffCertificate | null>(null);
  const [approvalAllowance, setApprovalAllowance] = useState<number>(1500000);
  const [isPICAssignment, setIsPICAssignment] = useState<boolean>(false);
  const [isSubmittingApproval, setIsSubmittingApproval] = useState(false);

  // Modal từ chối
  const [rejectingCert, setRejectingCert] = useState<StaffCertificate | null>(null);
  const [rejectionReason, setRejectionReason] = useState<string>('');
  const [isSubmittingReject, setIsSubmittingReject] = useState(false);

  // Modal xem ảnh
  const [previewModal, setPreviewModal] = useState<{
    isOpen: boolean;
    title: string;
    frontUrl: string;
    backUrl?: string;
    certNumber: string;
    issuedBy: string;
    issueDate: string;
    expiryDate?: string;
  }>({
    isOpen: false,
    title: '',
    frontUrl: '',
    certNumber: '',
    issuedBy: '',
    issueDate: '',
  });

  const fetchData = async () => {
    try {
      setLoading(true);
      const [listRes, summaryRes] = await Promise.all([
        certificateService.listBranchCertificates(),
        certificateService.getBranchSummary(),
      ]);
      setCertificates(listRes || []);
      setSummary(summaryRes || null);
      setErrorMessage(null);
    } catch (err: any) {
      console.error('Failed to load certificates:', err);
      setErrorMessage(err.response?.data?.message || 'Không thể tải danh sách hồ sơ bằng cấp');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  // Mở modal duyệt
  const handleOpenApproveModal = (cert: StaffCertificate) => {
    const defaultAllowance = CERT_TYPE_LABELS[cert.certificateType]?.defaultAllowance || 1000000;
    // Nếu đăng ký PTCM thì gợi ý mức cao hơn
    const initialAllowance =
      cert.purpose === 'BRANCH_PIC_RESPONSIBLE'
        ? 4500000
        : cert.monthlyAllowance > 0
        ? cert.monthlyAllowance
        : defaultAllowance;

    setApprovingCert(cert);
    setApprovalAllowance(initialAllowance);
    setIsPICAssignment(cert.purpose === 'BRANCH_PIC_RESPONSIBLE');
  };

  // Xác nhận duyệt
  const handleConfirmApprove = async () => {
    if (!approvingCert) return;
    try {
      setIsSubmittingApproval(true);
      await certificateService.approveCertificate(approvingCert._id, {
        monthlyAllowance: Number(approvalAllowance) || 0,
        isBranchPIC: isPICAssignment,
      });
      setSuccessMessage(`Đã phê duyệt thành công hồ sơ của ${approvingCert.userFullName}`);
      setApprovingCert(null);
      fetchData();
      setTimeout(() => setSuccessMessage(null), 4000);
    } catch (err: any) {
      alert(err.response?.data?.message || 'Phê duyệt thất bại');
    } finally {
      setIsSubmittingApproval(false);
    }
  };

  // Mở modal từ chối
  const handleOpenRejectModal = (cert: StaffCertificate) => {
    setRejectingCert(cert);
    setRejectionReason('');
  };

  // Xác nhận từ chối
  const handleConfirmReject = async () => {
    if (!rejectingCert) return;
    if (!rejectionReason.trim()) {
      alert('Vui lòng chọn hoặc nhập lý do từ chối hồ sơ');
      return;
    }
    try {
      setIsSubmittingReject(true);
      await certificateService.rejectCertificate(rejectingCert._id, {
        rejectionReason: rejectionReason.trim(),
      });
      setSuccessMessage(`Đã từ chối hồ sơ của ${rejectingCert.userFullName}`);
      setRejectingCert(null);
      fetchData();
      setTimeout(() => setSuccessMessage(null), 4000);
    } catch (err: any) {
      alert(err.response?.data?.message || 'Thao tác từ chối thất bại');
    } finally {
      setIsSubmittingReject(false);
    }
  };

  // Lọc danh sách
  const filteredCerts = certificates.filter(cert => {
    const matchesSearch =
      cert.userFullName.toLowerCase().includes(searchTerm.toLowerCase()) ||
      cert.userEmail.toLowerCase().includes(searchTerm.toLowerCase()) ||
      cert.certificateNumber.toLowerCase().includes(searchTerm.toLowerCase()) ||
      cert.issuedBy.toLowerCase().includes(searchTerm.toLowerCase());

    const matchesStatus = statusFilter === 'all' || cert.status === statusFilter;
    const matchesType = typeFilter === 'all' || cert.certificateType === typeFilter;

    return matchesSearch && matchesStatus && matchesType;
  });

  return (
    <div className="p-6 max-w-7xl mx-auto space-y-6">
      {/* ── Tiêu đề trang ── */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-black text-slate-900 tracking-tight flex items-center gap-2.5">
            <div className="p-2.5 bg-indigo-600 text-white rounded-2xl shadow-md shadow-indigo-500/20">
              <Award size={24} />
            </div>
            Thẩm Định Bằng Cấp & CCHN Cơ Sở
          </h1>
          <p className="text-slate-500 text-sm mt-1">
            Quy trình phê duyệt văn bằng Dược sĩ, cấp định mức phụ cấp hàng tháng và chỉ định người chịu trách nhiệm chuyên môn (PTCM)
          </p>
        </div>
      </div>

      {/* ── Banners thông báo ── */}
      {successMessage && (
        <div className="bg-emerald-50 border border-emerald-200 text-emerald-700 px-4 py-3 rounded-xl flex items-center gap-2 text-sm font-medium">
          <CheckCircle2 size={18} className="text-emerald-500 shrink-0" />
          {successMessage}
        </div>
      )}

      {errorMessage && (
        <div className="bg-rose-50 border border-rose-200 text-rose-600 px-4 py-3 rounded-xl flex items-center gap-2 text-sm font-medium">
          <AlertCircle size={18} className="shrink-0" />
          {errorMessage}
        </div>
      )}

      {/* ── 4 Thẻ KPI thống kê chuyên môn ── */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Chờ duyệt */}
        <div className="bg-white p-5 rounded-2xl border border-slate-100 shadow-sm flex items-center justify-between">
          <div>
            <p className="text-xs font-bold text-slate-400 uppercase tracking-wider">Hồ sơ chờ thẩm định</p>
            <p className="text-2xl font-black text-amber-600 mt-1">
              {summary?.pendingCount ?? certificates.filter(c => c.status === 'CHO_DUYET').length}
            </p>
            <p className="text-xs text-slate-500 mt-0.5">Cần duyệt cho nhân viên</p>
          </div>
          <div className="p-3 bg-amber-50 text-amber-600 rounded-2xl">
            <Clock size={24} />
          </div>
        </div>

        {/* Đã phê duyệt */}
        <div className="bg-white p-5 rounded-2xl border border-slate-100 shadow-sm flex items-center justify-between">
          <div>
            <p className="text-xs font-bold text-slate-400 uppercase tracking-wider">Hồ sơ đã duyệt hợp lệ</p>
            <p className="text-2xl font-black text-emerald-600 mt-1">
              {summary?.approvedCount ?? certificates.filter(c => c.status === 'DA_DUYET').length}
            </p>
            <p className="text-xs text-slate-500 mt-0.5">Đã gán phụ cấp</p>
          </div>
          <div className="p-3 bg-emerald-50 text-emerald-600 rounded-2xl">
            <ShieldCheck size={24} />
          </div>
        </div>

        {/* Dược sĩ CCHN */}
        <div className="bg-white p-5 rounded-2xl border border-slate-100 shadow-sm flex items-center justify-between">
          <div>
            <p className="text-xs font-bold text-slate-400 uppercase tracking-wider">Dược sĩ có CCHN</p>
            <p className="text-2xl font-black text-purple-600 mt-1">
              {summary?.cchnCount ?? 0}
            </p>
            <p className="text-xs text-slate-500 mt-0.5">Đủ chuẩn pháp lý GPP</p>
          </div>
          <div className="p-3 bg-purple-50 text-purple-600 rounded-2xl">
            <Award size={24} />
          </div>
        </div>

        {/* Quỹ phụ cấp */}
        <div className="bg-white p-5 rounded-2xl border border-slate-100 shadow-sm flex items-center justify-between">
          <div>
            <p className="text-xs font-bold text-slate-400 uppercase tracking-wider">Quỹ phụ cấp tháng này</p>
            <p className="text-xl font-black text-slate-900 mt-1">
              {(summary?.totalMonthlyAllowance ?? 0).toLocaleString('vi-VN')} đ
            </p>
            <p className="text-xs text-slate-500 mt-0.5">Chi trả định kỳ nhân sự</p>
          </div>
          <div className="p-3 bg-indigo-50 text-indigo-600 rounded-2xl">
            <DollarSign size={24} />
          </div>
        </div>
      </div>

      {/* ── Banner người chịu trách nhiệm chuyên môn (PTCM) ── */}
      {summary?.responsiblePharmacist && (
        <div className="bg-gradient-to-r from-emerald-50 to-teal-50 border border-emerald-200 rounded-2xl p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            <div className="p-3 bg-emerald-500 text-white rounded-xl shadow-md shadow-emerald-500/20">
              <ShieldCheck size={22} />
            </div>
            <div>
              <p className="text-xs font-bold text-emerald-800 uppercase tracking-wider">
                Dược sĩ Phụ trách Chuyên môn (PTCM) chính thức của cơ sở:
              </p>
              <p className="text-base font-black text-slate-900 mt-0.5">
                {summary.responsiblePharmacist.fullName}{' '}
                <span className="text-xs font-bold text-emerald-700 bg-emerald-100 px-2 py-0.5 rounded-full ml-1">
                  {summary.responsiblePharmacist.highestDegree || 'Dược sĩ Đại học'}
                </span>
              </p>
              <p className="text-xs text-slate-600 mt-0.5">
                Email: {summary.responsiblePharmacist.email} | SĐT: {summary.responsiblePharmacist.phone || 'Chưa cập nhật'}
              </p>
            </div>
          </div>
          <span className="px-3 py-1 bg-white text-emerald-700 border border-emerald-200 rounded-xl text-xs font-bold shadow-sm self-start sm:self-auto">
            Bảo lãnh pháp lý GPP
          </span>
        </div>
      )}

      {/* ── Bảng dữ liệu và Bộ lọc ── */}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
        {/* Bộ lọc thanh công cụ */}
        <div className="p-4 border-b border-slate-100 flex flex-col md:flex-row gap-3 items-stretch md:items-center justify-between bg-slate-50/50">
          {/* Ô tìm kiếm */}
          <div className="relative flex-1 max-w-md">
            <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" size={17} />
            <input
              type="text"
              placeholder="Tìm theo tên dược sĩ, email, số bằng cấp, nơi cấp..."
              value={searchTerm}
              onChange={e => setSearchTerm(e.target.value)}
              className="w-full pl-10 pr-4 py-2 bg-white border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
            />
          </div>

          {/* Bộ lọc trạng thái & loại bằng */}
          <div className="flex items-center gap-2 flex-wrap">
            <select
              value={statusFilter}
              onChange={e => setStatusFilter(e.target.value as any)}
              className="px-3 py-2 bg-white border border-slate-200 rounded-xl text-xs font-bold text-slate-700 focus:outline-none focus:ring-2 focus:ring-indigo-500"
            >
              <option value="all">Tất cả trạng thái</option>
              <option value="CHO_DUYET">Chờ thẩm định</option>
              <option value="DA_DUYET">Đã phê duyệt</option>
              <option value="TU_CHOI">Bị từ chối</option>
            </select>

            <select
              value={typeFilter}
              onChange={e => setTypeFilter(e.target.value)}
              className="px-3 py-2 bg-white border border-slate-200 rounded-xl text-xs font-bold text-slate-700 focus:outline-none focus:ring-2 focus:ring-indigo-500"
            >
              <option value="all">Tất cả loại văn bằng</option>
              <option value="PHARMACIST_UNIVERSITY">Dược sĩ Đại học</option>
              <option value="PHARMACIST_COLLEGE">Dược sĩ Cao đẳng</option>
              <option value="PHARMACIST_INTERMEDIATE">Dược sĩ Trung cấp</option>
              <option value="PRACTICE_CERTIFICATE">Chứng chỉ hành nghề (CCHN)</option>
              <option value="CONTINUING_EDUCATION">Đào tạo liên tục (CPE)</option>
            </select>
          </div>
        </div>

        {/* Danh sách table */}
        {loading ? (
          <div className="flex justify-center items-center py-16">
            <Loader2 className="w-8 h-8 text-indigo-500 animate-spin" />
          </div>
        ) : filteredCerts.length === 0 ? (
          <div className="text-center py-16">
            <FileText className="w-12 h-12 text-slate-300 mx-auto mb-2" />
            <p className="text-sm font-bold text-slate-600">Không tìm thấy hồ sơ văn bằng nào phù hợp</p>
            <p className="text-xs text-slate-400 mt-1">Hãy thử thay đổi từ khóa tìm kiếm hoặc bộ lọc.</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm">
              <thead className="bg-slate-50 text-slate-500 uppercase text-[11px] font-bold border-b border-slate-200">
                <tr>
                  <th className="px-4 py-3.5">Nhân viên</th>
                  <th className="px-4 py-3.5">Loại văn bằng</th>
                  <th className="px-4 py-3.5">Số hiệu & Đơn vị cấp</th>
                  <th className="px-4 py-3.5">Ngày cấp / Hạn</th>
                  <th className="px-4 py-3.5">Mục đích</th>
                  <th className="px-4 py-3.5">Ảnh bằng</th>
                  <th className="px-4 py-3.5">Phụ cấp/tháng</th>
                  <th className="px-4 py-3.5">Trạng thái</th>
                  <th className="px-4 py-3.5 text-right">Thao tác</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {filteredCerts.map(cert => {
                  const typeConfig = CERT_TYPE_LABELS[cert.certificateType] || CERT_TYPE_LABELS.PHARMACIST_UNIVERSITY;

                  return (
                    <tr key={cert._id} className="hover:bg-slate-50/70 transition-colors">
                      {/* Nhân viên */}
                      <td className="px-4 py-3.5">
                        <div className="font-bold text-slate-900">{cert.userFullName}</div>
                        <div className="text-xs text-slate-500">{cert.userEmail}</div>
                      </td>

                      {/* Loại văn bằng */}
                      <td className="px-4 py-3.5">
                        <span className={`inline-block px-2.5 py-1 rounded-full text-xs font-bold border ${typeConfig.badge}`}>
                          {typeConfig.label}
                        </span>
                        {cert.isBranchPIC && cert.status === 'DA_DUYET' && (
                          <span className="block mt-1 text-[11px] font-bold text-amber-700">
                            ★ PTCM Chi nhánh
                          </span>
                        )}
                      </td>

                      {/* Số hiệu & Nơi cấp */}
                      <td className="px-4 py-3.5">
                        <div className="font-mono font-bold text-slate-800 text-xs">
                          {cert.certificateNumber}
                        </div>
                        <div className="text-xs text-slate-500 truncate max-w-[160px]" title={cert.issuedBy}>
                          {cert.issuedBy}
                        </div>
                      </td>

                      {/* Ngày cấp / Hạn */}
                      <td className="px-4 py-3.5 text-xs text-slate-700">
                        <div>Cấp: {cert.issueDate}</div>
                        <div className="text-slate-500 mt-0.5">
                          {cert.expiryDate ? `Hạn: ${cert.expiryDate}` : 'Vĩnh viễn'}
                        </div>
                      </td>

                      {/* Mục đích */}
                      <td className="px-4 py-3.5 text-xs">
                        {cert.purpose === 'BRANCH_PIC_RESPONSIBLE' ? (
                          <span className="font-bold text-purple-700">Đăng ký PTCM</span>
                        ) : (
                          <span className="text-slate-600">Phụ cấp thường</span>
                        )}
                      </td>

                      {/* Thumbnail ảnh */}
                      <td className="px-4 py-3.5">
                        <button
                          type="button"
                          onClick={() =>
                            setPreviewModal({
                              isOpen: true,
                              title: `${cert.userFullName} - ${typeConfig.label}`,
                              frontUrl: cert.frontImageUrl,
                              backUrl: cert.backImageUrl,
                              certNumber: cert.certificateNumber,
                              issuedBy: cert.issuedBy,
                              issueDate: cert.issueDate,
                              expiryDate: cert.expiryDate,
                            })
                          }
                          className="group relative block w-12 h-10 rounded-lg overflow-hidden border border-slate-200 hover:border-indigo-400"
                        >
                          <img
                            src={cert.frontImageUrl}
                            alt="Front thumb"
                            className="w-full h-full object-cover group-hover:scale-110 transition-transform"
                          />
                          <div className="absolute inset-0 bg-slate-900/30 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity text-white">
                            <Eye size={14} />
                          </div>
                        </button>
                      </td>

                      {/* Mức phụ cấp */}
                      <td className="px-4 py-3.5 font-bold text-slate-900">
                        {cert.status === 'DA_DUYET' ? (
                          <span className="text-emerald-600">
                            +{(cert.monthlyAllowance || 0).toLocaleString('vi-VN')} đ
                          </span>
                        ) : (
                          <span className="text-slate-400 text-xs">-</span>
                        )}
                      </td>

                      {/* Trạng thái */}
                      <td className="px-4 py-3.5">
                        {cert.status === 'CHO_DUYET' && (
                          <span className="inline-flex items-center gap-1 px-2.5 py-1 bg-amber-50 text-amber-700 border border-amber-200 rounded-full text-xs font-bold">
                            <Clock size={12} className="animate-pulse" /> Chờ duyệt
                          </span>
                        )}
                        {cert.status === 'DA_DUYET' && (
                          <span className="inline-flex items-center gap-1 px-2.5 py-1 bg-emerald-50 text-emerald-700 border border-emerald-200 rounded-full text-xs font-bold">
                            <CheckCircle2 size={12} /> Đã duyệt
                          </span>
                        )}
                        {cert.status === 'TU_CHOI' && (
                          <span
                            title={cert.rejectionReason}
                            className="inline-flex items-center gap-1 px-2.5 py-1 bg-rose-50 text-rose-700 border border-rose-200 rounded-full text-xs font-bold cursor-help"
                          >
                            <XCircle size={12} /> Từ chối
                          </span>
                        )}
                      </td>

                      {/* Thao tác */}
                      <td className="px-4 py-3.5 text-right">
                        <div className="flex items-center justify-end gap-1.5">
                          {cert.status === 'CHO_DUYET' ? (
                            <>
                              <button
                                type="button"
                                onClick={() => handleOpenApproveModal(cert)}
                                className="inline-flex items-center gap-1 px-3 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg text-xs font-bold shadow-sm transition-colors"
                              >
                                <Check size={13} /> Duyệt
                              </button>
                              <button
                                type="button"
                                onClick={() => handleOpenRejectModal(cert)}
                                className="inline-flex items-center gap-1 px-3 py-1.5 bg-rose-50 hover:bg-rose-100 text-rose-700 rounded-lg text-xs font-bold transition-colors"
                              >
                                <X size={13} /> Từ chối
                              </button>
                            </>
                          ) : (
                            <button
                              type="button"
                              onClick={() => handleOpenApproveModal(cert)}
                              className="inline-flex items-center gap-1 px-2.5 py-1 text-slate-500 hover:text-indigo-600 hover:bg-slate-100 rounded-lg text-xs font-semibold transition-colors"
                            >
                              Điều chỉnh phụ cấp
                            </button>
                          )}
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* ── Modal Phê duyệt & Gán Phụ cấp ── */}
      {approvingCert && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-slate-900/50 backdrop-blur-sm" onClick={() => !isSubmittingApproval && setApprovingCert(null)} />
          <div className="relative bg-white rounded-2xl shadow-2xl max-w-md w-full border border-slate-100 p-6 space-y-5">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <h3 className="text-base font-bold text-slate-800 flex items-center gap-2">
                <CheckCircle2 size={18} className="text-emerald-600" />
                Phê Duyệt Hồ Sơ Văn Bằng
              </h3>
              <button
                type="button"
                onClick={() => !isSubmittingApproval && setApprovingCert(null)}
                className="p-1 text-slate-400 hover:text-slate-600 rounded-lg"
              >
                <X size={20} />
              </button>
            </div>

            <div className="bg-slate-50 p-3.5 rounded-xl border border-slate-100 text-xs space-y-1.5">
              <p>
                <strong className="text-slate-700">Dược sĩ:</strong> {approvingCert.userFullName} ({approvingCert.userEmail})
              </p>
              <p>
                <strong className="text-slate-700">Văn bằng:</strong> {CERT_TYPE_LABELS[approvingCert.certificateType]?.label}
              </p>
              <p>
                <strong className="text-slate-700">Số hiệu:</strong> {approvingCert.certificateNumber} - Cấp bởi: {approvingCert.issuedBy}
              </p>
            </div>

            {/* Mức phụ cấp */}
            <div>
              <label className="block text-xs font-bold text-slate-700 uppercase mb-1">
                Mức phụ cấp hàng tháng áp dụng (VNĐ) *
              </label>
              <input
                type="number"
                min={0}
                step={50000}
                value={approvalAllowance}
                onChange={e => setApprovalAllowance(Number(e.target.value))}
                className="w-full px-3.5 py-2.5 border border-slate-200 rounded-xl text-sm font-bold text-slate-900 focus:outline-none focus:ring-2 focus:ring-emerald-500 bg-white"
              />

              {/* Các nút điền nhanh gợi ý */}
              <div className="flex items-center gap-1.5 mt-2 flex-wrap">
                <span className="text-[11px] text-slate-400">Gợi ý:</span>
                {[500000, 800000, 1500000, 3000000, 4500000].map(val => (
                  <button
                    key={val}
                    type="button"
                    onClick={() => setApprovalAllowance(val)}
                    className="px-2 py-0.5 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded text-[11px] font-semibold"
                  >
                    {(val / 1000).toLocaleString()}k
                  </button>
                ))}
              </div>
            </div>

            {/* Checkbox PTCM */}
            <label className="flex items-start gap-2.5 p-3 rounded-xl border border-amber-200 bg-amber-50/50 cursor-pointer">
              <input
                type="checkbox"
                checked={isPICAssignment}
                onChange={e => setIsPICAssignment(e.target.checked)}
                className="mt-0.5 text-amber-600 focus:ring-0 rounded"
              />
              <div className="text-xs">
                <p className="font-bold text-amber-900">
                  Chỉ định làm Dược sĩ Phụ trách Chuyên môn (PTCM) Chi nhánh
                </p>
                <p className="text-amber-700 text-[11px] mt-0.5">
                  Người này sẽ đại diện pháp lý về chuyên môn GPP cho nhà thuốc của bạn
                </p>
              </div>
            </label>

            {/* Buttons */}
            <div className="flex justify-end gap-2 pt-2 border-t border-slate-100">
              <button
                type="button"
                disabled={isSubmittingApproval}
                onClick={() => setApprovingCert(null)}
                className="px-4 py-2 border border-slate-200 rounded-xl text-xs font-bold text-slate-600 hover:bg-slate-50"
              >
                Hủy
              </button>
              <button
                type="button"
                disabled={isSubmittingApproval}
                onClick={handleConfirmApprove}
                className="px-5 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-bold shadow-md shadow-emerald-500/20 disabled:opacity-50 flex items-center gap-1.5"
              >
                {isSubmittingApproval && <Loader2 size={14} className="animate-spin" />}
                Xác nhận phê duyệt
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ── Modal Từ chối ── */}
      {rejectingCert && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-slate-900/50 backdrop-blur-sm" onClick={() => !isSubmittingReject && setRejectingCert(null)} />
          <div className="relative bg-white rounded-2xl shadow-2xl max-w-md w-full border border-slate-100 p-6 space-y-4">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <h3 className="text-base font-bold text-slate-800 flex items-center gap-2">
                <XCircle size={18} className="text-rose-600" />
                Từ Chối Hồ Sơ Văn Bằng
              </h3>
              <button
                type="button"
                onClick={() => !isSubmittingReject && setRejectingCert(null)}
                className="p-1 text-slate-400 hover:text-slate-600 rounded-lg"
              >
                <X size={20} />
              </button>
            </div>

            <p className="text-xs text-slate-600">
              Vui lòng nêu rõ lý do để nhân viên <strong>{rejectingCert.userFullName}</strong> biết và bổ sung / tải lại hồ sơ hợp lệ:
            </p>

            {/* Các lý do mẫu */}
            <div className="space-y-1.5">
              {[
                'Ảnh chụp văn bằng bị mờ, không rõ số hiệu hoặc con dấu',
                'Số hiệu CCHN không tồn tại trên Cổng tra cứu Sở Y tế',
                'Văn bằng/chứng chỉ đã hết hạn hiệu lực theo quy định',
                'Thông tin họ tên/ngày sinh không khớp với CCCD của nhân sự',
              ].map(reason => (
                <button
                  key={reason}
                  type="button"
                  onClick={() => setRejectionReason(reason)}
                  className="w-full text-left p-2 rounded-lg border border-slate-200 hover:border-rose-300 hover:bg-rose-50/50 text-xs text-slate-700 transition-colors"
                >
                  • {reason}
                </button>
              ))}
            </div>

            <textarea
              rows={3}
              required
              placeholder="Hoặc nhập lý do từ chối chi tiết tại đây..."
              value={rejectionReason}
              onChange={e => setRejectionReason(e.target.value)}
              className="w-full p-3 border border-slate-200 rounded-xl text-xs focus:outline-none focus:ring-2 focus:ring-rose-500 bg-slate-50"
            />

            <div className="flex justify-end gap-2 pt-2 border-t border-slate-100">
              <button
                type="button"
                disabled={isSubmittingReject}
                onClick={() => setRejectingCert(null)}
                className="px-4 py-2 border border-slate-200 rounded-xl text-xs font-bold text-slate-600 hover:bg-slate-50"
              >
                Hủy
              </button>
              <button
                type="button"
                disabled={isSubmittingReject || !rejectionReason.trim()}
                onClick={handleConfirmReject}
                className="px-5 py-2 bg-rose-600 hover:bg-rose-700 text-white rounded-xl text-xs font-bold shadow-md shadow-rose-500/20 disabled:opacity-50 flex items-center gap-1.5"
              >
                {isSubmittingReject && <Loader2 size={14} className="animate-spin" />}
                Xác nhận từ chối
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ── Modal Xem ảnh phóng to đối chiếu ── */}
      {previewModal.isOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-slate-900/60 backdrop-blur-sm" onClick={() => setPreviewModal(prev => ({ ...prev, isOpen: false }))} />
          <div className="relative bg-white rounded-2xl shadow-2xl max-w-3xl w-full max-h-[90vh] overflow-hidden flex flex-col">
            <div className="flex items-center justify-between p-4 border-b border-slate-100 bg-slate-50/50">
              <div>
                <h4 className="text-sm font-bold text-slate-800">{previewModal.title}</h4>
                <p className="text-xs text-slate-500 mt-0.5">
                  Số hiệu: <span className="font-mono font-bold text-indigo-600">{previewModal.certNumber}</span> | Cấp bởi: {previewModal.issuedBy} ({previewModal.issueDate})
                </p>
              </div>
              <button
                type="button"
                onClick={() => setPreviewModal(prev => ({ ...prev, isOpen: false }))}
                className="p-1 text-slate-400 hover:text-slate-600 rounded-lg"
              >
                <X size={20} />
              </button>
            </div>

            <div className="p-4 overflow-y-auto space-y-4 text-center">
              <div>
                <p className="text-xs font-bold text-slate-500 mb-2">Mặt trước của văn bằng</p>
                <img
                  src={previewModal.frontUrl}
                  alt="Front Preview"
                  className="max-h-96 mx-auto rounded-xl border border-slate-200 object-contain shadow-md"
                />
              </div>

              {previewModal.backUrl && (
                <div className="border-t border-slate-100 pt-3">
                  <p className="text-xs font-bold text-slate-500 mb-2">Mặt sau của văn bằng</p>
                  <img
                    src={previewModal.backUrl}
                    alt="Back Preview"
                    className="max-h-96 mx-auto rounded-xl border border-slate-200 object-contain shadow-md"
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
