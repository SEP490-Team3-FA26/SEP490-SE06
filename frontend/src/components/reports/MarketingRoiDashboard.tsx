import React, { useState, useEffect, useMemo } from 'react';
import {
  TrendingUp,
  DollarSign,
  PieChart,
  Plus,
  RefreshCw,
  AlertTriangle,
  Users,
  Target,
  Share2,
  Calendar,
  Layers,
  ArrowUpRight,
  ShieldAlert,
  CheckCircle2,
  X,
  Loader2,
  BarChart3,
  HelpCircle,
  Megaphone
} from 'lucide-react';
import {
  campaignService,
  MarketingCampaignData,
  CampaignAnalyticsItem,
  MarketingRoiOverviewResponse,
  CreateCampaignPayload
} from '../../services/sales/campaign.service';
import { voucherService } from '../../services/sales/voucher.service';

export function MarketingRoiDashboard() {
  const [loading, setLoading] = useState<boolean>(true);
  const [overviewData, setOverviewData] = useState<MarketingRoiOverviewResponse | null>(null);
  const [vouchersList, setVouchersList] = useState<any[]>([]);

  // Modals
  const [showCreateModal, setShowCreateModal] = useState<boolean>(false);
  const [showAddCostModal, setShowAddCostModal] = useState<boolean>(false);
  const [selectedCampaignId, setSelectedCampaignId] = useState<string>('');
  const [isSubmitting, setIsSubmitting] = useState<boolean>(false);

  // Form Create Campaign
  const [formName, setFormName] = useState<string>('');
  const [formChannel, setFormChannel] = useState<string>('FACEBOOK_ADS');
  const [formBudget, setFormBudget] = useState<number>(5000000);
  const [formInitialCost, setFormInitialCost] = useState<number>(2000000);
  const [formStartDate, setFormStartDate] = useState<string>(new Date().toISOString().split('T')[0]);
  const [formEndDate, setFormEndDate] = useState<string>(
    new Date(Date.now() + 30 * 86400000).toISOString().split('T')[0]
  );
  const [formSelectedVouchers, setFormSelectedVouchers] = useState<string[]>([]);
  const [formNotes, setFormNotes] = useState<string>('');

  // Form Add Cost
  const [costType, setCostType] = useState<'ADS' | 'PRINTING' | 'GIFTS' | 'VOUCHER_DISCOUNT' | 'AGENCY_FEE' | 'OTHER'>('ADS');
  const [costAmount, setCostAmount] = useState<number>(1000000);
  const [costNote, setCostNote] = useState<string>('');

  const loadData = async () => {
    try {
      setLoading(true);
      const [resOverview, resVouchers] = await Promise.all([
        campaignService.getRoiOverview().catch(() => null),
        voucherService.getVouchers().catch(() => []),
      ]);
      setOverviewData(resOverview);
      setVouchersList(Array.isArray(resVouchers) ? resVouchers : (resVouchers as any)?.data || []);
    } catch (err) {
      console.error('Lỗi tải dữ liệu Marketing ROI:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  const summary = overviewData?.summary || {
    totalCampaigns: 0,
    activeCampaigns: 0,
    totalSpend: 0,
    totalRevenue: 0,
    totalGrossProfit: 0,
    totalNetProfit: 0,
    averageRoi: 0,
    averageRoas: 0,
    totalOrders: 0,
  };

  const campaigns = overviewData?.campaigns || [];

  // Average Cannibalization Ratio across campaigns
  const avgCannibalization = useMemo(() => {
    if (!campaigns || campaigns.length === 0) return 0;
    const sum = campaigns.reduce((acc, c) => acc + (c.cannibalizationRatio || 0), 0);
    return Number((sum / campaigns.length).toFixed(1));
  }, [campaigns]);

  // Handle Create Campaign Submit
  const handleCreateSubmit = async () => {
    if (!formName.trim()) return alert('Vui lòng nhập tên chiến dịch');
    if (formSelectedVouchers.length === 0) return alert('Vui lòng chọn ít nhất 1 mã Voucher để hệ thống truy vết đơn hàng');

    const payload: CreateCampaignPayload = {
      name: formName,
      channel: formChannel,
      budget: Number(formBudget),
      initialCost: Number(formInitialCost),
      startDate: formStartDate,
      endDate: formEndDate,
      voucherCodes: formSelectedVouchers,
      notes: formNotes,
    };

    try {
      setIsSubmitting(true);
      await campaignService.createCampaign(payload);
      alert('✅ Đã tạo chiến dịch tiếp thị thành công!');
      setShowCreateModal(false);
      loadData();
    } catch (err: any) {
      alert(`❌ Lỗi tạo chiến dịch: ${err?.response?.data?.message || err.message}`);
    } finally {
      setIsSubmitting(false);
    }
  };

  // Handle Add Cost Submit
  const handleAddCostSubmit = async () => {
    if (!selectedCampaignId) return alert('Vui lòng chọn chiến dịch');
    if (costAmount <= 0) return alert('Vui lòng nhập số tiền chi phí hợp lệ');

    try {
      setIsSubmitting(true);
      await campaignService.addCampaignCost(selectedCampaignId, {
        type: costType,
        amount: Number(costAmount),
        note: costNote,
        date: new Date().toISOString(),
      });
      alert('✅ Đã ghi nhận chi phí phát sinh thành công!');
      setShowAddCostModal(false);
      loadData();
    } catch (err: any) {
      alert(`❌ Lỗi ghi nhận chi phí: ${err?.response?.data?.message || err.message}`);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="space-y-6 animate-in fade-in duration-200">
      {/* Header Bar */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 bg-white p-6 rounded-2xl border border-slate-200 shadow-sm">
        <div className="space-y-1">
          <div className="flex items-center gap-2.5">
            <div className="p-2.5 bg-rose-50 text-rose-600 rounded-xl">
              <Megaphone size={24} />
            </div>
            <div>
              <h2 className="text-xl font-black text-slate-900 tracking-tight flex items-center gap-2">
                Phân Tích Hiệu Quả Marketing & ROI
                <span className="text-[10px] bg-rose-100 text-rose-800 font-mono px-2 py-0.5 rounded-full font-bold">
                  Pharma Attribution v2.0
                </span>
              </h2>
              <p className="text-xs text-slate-500 font-medium">
                Đo lường tỷ suất sinh lời trên chi phí tiếp thị (ROI / ROAS), tính theo Lợi nhuận gộp thực chất và cảnh báo rủi ro ăn lấn doanh thu (Cannibalization).
              </p>
            </div>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={loadData}
            className="p-2.5 bg-slate-100 hover:bg-slate-200 text-slate-600 rounded-xl transition-colors"
            title="Làm mới dữ liệu"
          >
            <RefreshCw size={16} className={loading ? 'animate-spin' : ''} />
          </button>
          <button
            onClick={() => {
              if (campaigns.length > 0) setSelectedCampaignId(campaigns[0]._id);
              setShowAddCostModal(true);
            }}
            className="px-4 py-2.5 bg-slate-100 hover:bg-slate-200 text-slate-800 rounded-xl text-xs font-bold transition-all"
          >
            + Hạch toán chi phí
          </button>
          <button
            onClick={() => setShowCreateModal(true)}
            className="flex items-center gap-1.5 px-5 py-2.5 bg-gradient-to-r from-rose-600 to-pink-600 hover:from-rose-700 hover:to-pink-700 text-white rounded-xl text-xs font-bold shadow-md shadow-rose-500/20 transition-all active:scale-95"
          >
            <Plus size={16} />
            Tạo Chiến Dịch Mới
          </button>
        </div>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Card 1: Tổng chi phí */}
        <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm flex items-center justify-between">
          <div className="space-y-1">
            <span className="text-xs font-bold text-slate-400 uppercase tracking-wider">Tổng chi phí Marketing</span>
            <p className="text-2xl font-black text-slate-900 tracking-tight">
              {Number(summary.totalSpend).toLocaleString('vi-VN')} đ
            </p>
            <p className="text-[11px] text-slate-500 font-medium">
              Từ {summary.totalCampaigns} chiến dịch ({summary.activeCampaigns} đang chạy)
            </p>
          </div>
          <div className="p-3.5 bg-rose-50 text-rose-600 rounded-xl shrink-0">
            <DollarSign size={22} />
          </div>
        </div>

        {/* Card 2: Doanh thu truy vết */}
        <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm flex items-center justify-between">
          <div className="space-y-1">
            <span className="text-xs font-bold text-slate-400 uppercase tracking-wider">Doanh thu gán (Attributed)</span>
            <p className="text-2xl font-black text-blue-600 tracking-tight">
              {Number(summary.totalRevenue).toLocaleString('vi-VN')} đ
            </p>
            <p className="text-[11px] text-blue-600 font-semibold">
              ROAS: {summary.averageRoas}x (Doanh thu / Chi phí)
            </p>
          </div>
          <div className="p-3.5 bg-blue-50 text-blue-600 rounded-xl shrink-0">
            <TrendingUp size={22} />
          </div>
        </div>

        {/* Card 3: Lợi nhuận & ROI thực chất */}
        <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm flex items-center justify-between">
          <div className="space-y-1">
            <span className="text-xs font-bold text-slate-400 uppercase tracking-wider">ROI Lợi nhuận gộp</span>
            <p className={`text-2xl font-black tracking-tight ${summary.averageRoi >= 0 ? 'text-emerald-600' : 'text-red-600'}`}>
              {summary.averageRoi > 0 ? `+${summary.averageRoi}%` : `${summary.averageRoi}%`}
            </p>
            <p className="text-[11px] text-slate-500 font-medium">
              Lãi ròng: {Number(summary.totalNetProfit).toLocaleString('vi-VN')} đ
            </p>
          </div>
          <div className="p-3.5 bg-emerald-50 text-emerald-600 rounded-xl shrink-0">
            <Target size={22} />
          </div>
        </div>

        {/* Card 4: Tỷ lệ Cannibalization (Giải quyết Rủi ro từ Bước 3) */}
        <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm flex items-center justify-between">
          <div className="space-y-1">
            <span className="text-xs font-bold text-amber-500 uppercase tracking-wider flex items-center gap-1">
              Ăn lấn doanh thu
              <span title="Tỷ lệ đơn hàng từ khách hàng cũ quen thuộc đã mua không cần quảng cáo">
                <HelpCircle size={12} className="text-slate-400" />
              </span>
            </span>
            <p className="text-2xl font-black text-amber-600 tracking-tight">
              {avgCannibalization}%
            </p>
            <p className="text-[11px] text-amber-700 font-semibold">
              {avgCannibalization > 60 ? '⚠️ Cảnh báo: Tỷ lệ khách quen cao' : '✅ Tỷ lệ khách mới tốt'}
            </p>
          </div>
          <div className="p-3.5 bg-amber-50 text-amber-600 rounded-xl shrink-0">
            <ShieldAlert size={22} />
          </div>
        </div>
      </div>

      {/* Deep-Dive Risk Mitigation Box: Anti-Cannibalization Insight */}
      <div className="bg-gradient-to-r from-amber-50/80 via-white to-blue-50/50 p-4 rounded-2xl border border-amber-200 text-xs text-slate-700 space-y-1.5 shadow-sm">
        <div className="flex items-center gap-2 text-amber-800 font-bold">
          <AlertTriangle size={16} className="text-amber-600" />
          <span>Báo cáo chống ngộ nhận ROI (Pharma Cannibalization & True Margin Audit):</span>
        </div>
        <p className="text-[11px] text-slate-600 leading-relaxed">
          Hệ thống PharmaChain tự động tính ROI dựa trên <b>Lợi nhuận gộp thực tế (Gross Margin sau khi trừ 65% COGS)</b> chứ không dựa trên tổng Doanh thu ảo. 
          Các đơn hàng áp dụng voucher được bóc tách rạch ròi giữa <b>Khách hàng mới phát sinh (New Acquisition)</b> và <b>Khách quen vãng lai tại quầy (Cannibalized)</b> để đảm bảo ban lãnh đạo không bị "ảo tưởng thành tích" khi tự tay giảm giá cho khách hàng hiện hữu.
        </p>
      </div>

      {/* Table: Danh sách chiến dịch & Phân tích chi tiết */}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
        <div className="px-6 py-4 border-b border-slate-100 flex items-center justify-between">
          <h3 className="font-bold text-sm text-slate-800 flex items-center gap-2">
            <BarChart3 size={16} className="text-rose-600" />
            Bảng Ma Trận Hiệu Quả Từng Chiến Dịch Marketing ({campaigns.length})
          </h3>
        </div>

        {loading ? (
          <div className="p-12 text-center text-slate-400 flex flex-col items-center gap-2">
            <Loader2 className="animate-spin text-rose-600" size={28} />
            <span className="text-xs">Đang tổng hợp dữ liệu doanh số và ROI chiến dịch...</span>
          </div>
        ) : campaigns.length === 0 ? (
          <div className="p-12 text-center text-slate-400">
            <Megaphone size={40} className="mx-auto text-slate-300 mb-2" />
            <p className="text-sm font-bold text-slate-600">Chưa có Chiến dịch Marketing nào</p>
            <p className="text-xs text-slate-400 mt-1">Bấm "+ Tạo Chiến Dịch Mới" để bắt đầu thiết lập theo dõi.</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse text-xs">
              <thead>
                <tr className="bg-slate-50/80 border-b border-slate-200 text-[11px] font-bold text-slate-500 uppercase tracking-wider">
                  <th className="py-3.5 px-4">Mã & Tên chiến dịch</th>
                  <th className="py-3.5 px-4">Kênh tiếp thị</th>
                  <th className="py-3.5 px-4">Chi phí thực tế</th>
                  <th className="py-3.5 px-4">Doanh thu gán</th>
                  <th className="py-3.5 px-4">Lợi nhuận gộp</th>
                  <th className="py-3.5 px-4">ROI Lợi nhuận</th>
                  <th className="py-3.5 px-4">ROAS</th>
                  <th className="py-3.5 px-4">Tỷ lệ khách mới</th>
                  <th className="py-3.5 px-4">Trạng thái</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {campaigns.map((c) => (
                  <tr key={c._id} className="hover:bg-slate-50/80 transition-colors">
                    <td className="py-3.5 px-4">
                      <span className="font-mono font-bold text-rose-600 block">{c.code}</span>
                      <span className="font-bold text-slate-900">{c.name}</span>
                      <div className="text-[10px] text-slate-400 mt-0.5">
                        Voucher: {c.voucherCodes?.join(', ') || 'N/A'}
                      </div>
                    </td>
                    <td className="py-3.5 px-4">
                      <span className="inline-block px-2 py-0.5 rounded text-[10px] font-bold bg-slate-100 text-slate-700">
                        {c.channel}
                      </span>
                    </td>
                    <td className="py-3.5 px-4 font-bold text-slate-800">
                      {Number(c.totalCost).toLocaleString('vi-VN')} đ
                      <span className="block text-[10px] text-slate-400 font-normal">
                        Ngân sách: {Number(c.budget).toLocaleString('vi-VN')} đ
                      </span>
                    </td>
                    <td className="py-3.5 px-4 font-bold text-blue-700">
                      {Number(c.totalRevenue).toLocaleString('vi-VN')} đ
                      <span className="block text-[10px] text-slate-400 font-normal">
                        {c.totalOrders} đơn hàng
                      </span>
                    </td>
                    <td className="py-3.5 px-4 font-bold text-slate-800">
                      {Number(c.grossProfit).toLocaleString('vi-VN')} đ
                    </td>
                    <td className="py-3.5 px-4">
                      <span className={`inline-flex items-center gap-0.5 px-2 py-0.5 rounded-full font-bold text-xs ${
                        c.roi >= 0 ? 'bg-emerald-100 text-emerald-800' : 'bg-red-100 text-red-800'
                      }`}>
                        {c.roi >= 0 ? `+${c.roi}%` : `${c.roi}%`}
                      </span>
                    </td>
                    <td className="py-3.5 px-4 font-black text-indigo-700">
                      {c.roas}x
                    </td>
                    <td className="py-3.5 px-4">
                      <div className="space-y-0.5">
                        <span className="text-slate-800 font-bold">
                          {c.totalOrders > 0 ? Number(((c.newCustomerOrders / c.totalOrders) * 100).toFixed(0)) : 0}% Mới
                        </span>
                        <div className="w-20 bg-slate-200 h-1.5 rounded-full overflow-hidden">
                          <div
                            className="bg-emerald-500 h-full rounded-full"
                            style={{
                              width: `${c.totalOrders > 0 ? (c.newCustomerOrders / c.totalOrders) * 100 : 0}%`,
                            }}
                          />
                        </div>
                        <span className="text-[10px] text-slate-400 block">
                          Ăn lấn: {c.cannibalizationRatio}%
                        </span>
                      </div>
                    </td>
                    <td className="py-3.5 px-4">
                      {c.status === 'ACTIVE' ? (
                        <span className="bg-emerald-100 text-emerald-800 font-bold px-2 py-0.5 rounded-full text-[10px]">
                          Đang chạy
                        </span>
                      ) : (
                        <span className="bg-slate-100 text-slate-600 font-bold px-2 py-0.5 rounded-full text-[10px]">
                          {c.status}
                        </span>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* MODAL 1: TẠO CHIẾN DỊCH MARKETING MỚI */}
      {showCreateModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm animate-in fade-in duration-200">
          <div className="bg-white rounded-2xl shadow-2xl border border-slate-100 w-full max-w-2xl overflow-hidden flex flex-col max-h-[92vh]">
            <div className="px-6 py-4 border-b border-slate-100 flex items-center justify-between bg-slate-900 text-white">
              <h3 className="font-bold text-sm flex items-center gap-2">
                <Megaphone size={18} className="text-rose-400" />
                Thiết Lập Chiến Dịch Tiếp Thị (Marketing Campaign)
              </h3>
              <button onClick={() => setShowCreateModal(false)} className="text-slate-400 hover:text-white">
                <X size={18} />
              </button>
            </div>

            <div className="p-6 space-y-4 overflow-y-auto flex-1 text-xs">
              <div>
                <label className="block font-bold text-slate-700 mb-1">Tên chiến dịch</label>
                <input
                  type="text"
                  placeholder="VD: Chiến dịch Tuần Lễ Sức Khỏe Mùa Thu 2026..."
                  value={formName}
                  onChange={(e) => setFormName(e.target.value)}
                  className="w-full bg-slate-50 border border-slate-200 rounded-lg px-3 py-2 font-semibold outline-none focus:bg-white focus:ring-2 focus:ring-rose-500"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-bold text-slate-700 mb-1">Kênh tiếp thị</label>
                  <select
                    value={formChannel}
                    onChange={(e) => setFormChannel(e.target.value)}
                    className="w-full bg-slate-50 border border-slate-200 rounded-lg px-3 py-2 font-semibold outline-none"
                  >
                    <option value="FACEBOOK_ADS">Facebook Ads</option>
                    <option value="GOOGLE_ADS">Google Search & Display Ads</option>
                    <option value="TIKTOK_ADS">TikTok Ads</option>
                    <option value="ZALO_OA">Zalo Official Account / ZNS</option>
                    <option value="OFFLINE_POSM">Banner / Tờ rơi tại nhà thuốc (POSM)</option>
                    <option value="COMMUNITY_HEALTH_EVENT">Sự kiện tư vấn sức khỏe cộng đồng</option>
                  </select>
                </div>
                <div>
                  <label className="block font-bold text-slate-700 mb-1">Ngân sách dự kiến (VNĐ)</label>
                  <input
                    type="number"
                    value={formBudget}
                    onChange={(e) => setFormBudget(Number(e.target.value))}
                    className="w-full bg-slate-50 border border-slate-200 rounded-lg px-3 py-2 font-bold text-slate-800 outline-none"
                  />
                </div>
              </div>

              <div className="grid grid-cols-3 gap-3">
                <div>
                  <label className="block font-bold text-slate-700 mb-1">Chi phí ban đầu (VNĐ)</label>
                  <input
                    type="number"
                    value={formInitialCost}
                    onChange={(e) => setFormInitialCost(Number(e.target.value))}
                    className="w-full bg-slate-50 border border-slate-200 rounded-lg px-3 py-2 font-bold text-rose-600 outline-none"
                  />
                </div>
                <div>
                  <label className="block font-bold text-slate-700 mb-1">Ngày bắt đầu</label>
                  <input
                    type="date"
                    value={formStartDate}
                    onChange={(e) => setFormStartDate(e.target.value)}
                    className="w-full bg-slate-50 border border-slate-200 rounded-lg px-3 py-2 font-semibold outline-none"
                  />
                </div>
                <div>
                  <label className="block font-bold text-slate-700 mb-1">Ngày kết thúc</label>
                  <input
                    type="date"
                    value={formEndDate}
                    onChange={(e) => setFormEndDate(e.target.value)}
                    className="w-full bg-slate-50 border border-slate-200 rounded-lg px-3 py-2 font-semibold outline-none"
                  />
                </div>
              </div>

              {/* Gắn Voucher để tự động truy vết doanh số */}
              <div className="bg-slate-50 p-4 rounded-xl border border-slate-200 space-y-2">
                <div className="flex justify-between items-center">
                  <span className="font-bold text-slate-800">
                    Gắn Voucher theo dõi chuyển đổi (Attribution Tracking):
                  </span>
                  <span className="text-[10px] text-slate-500">Chọn voucher cấp riêng cho chiến dịch này</span>
                </div>

                <div className="grid grid-cols-2 gap-2 max-h-36 overflow-y-auto">
                  {vouchersList.map((v) => {
                    const vCode = v.code || v.voucherCode || '';
                    const isChecked = formSelectedVouchers.includes(vCode);
                    return (
                      <label key={vCode} className="flex items-center gap-2 bg-white p-2 rounded-lg border border-slate-200 cursor-pointer hover:bg-rose-50/40">
                        <input
                          type="checkbox"
                          checked={isChecked}
                          onChange={(e) => {
                            if (e.target.checked) setFormSelectedVouchers((prev) => [...prev, vCode]);
                            else setFormSelectedVouchers((prev) => prev.filter((c) => c !== vCode));
                          }}
                          className="rounded text-rose-600"
                        />
                        <div>
                          <span className="font-mono font-bold text-slate-800 block">{vCode}</span>
                          <span className="text-[10px] text-slate-500">Giảm {v.discountValue ? `${v.discountValue}%` : 'tiền'}</span>
                        </div>
                      </label>
                    );
                  })}
                </div>
              </div>
            </div>

            <div className="px-6 py-3.5 bg-slate-50 border-t border-slate-100 flex items-center justify-end gap-2">
              <button
                type="button"
                onClick={() => setShowCreateModal(false)}
                className="px-4 py-2 text-xs font-semibold text-slate-600 hover:bg-slate-200 rounded-lg"
              >
                Hủy
              </button>
              <button
                type="button"
                onClick={handleCreateSubmit}
                disabled={isSubmitting}
                className="px-5 py-2.5 bg-rose-600 hover:bg-rose-700 text-white rounded-lg text-xs font-bold shadow-md shadow-rose-500/20"
              >
                {isSubmitting ? 'Đang tạo...' : 'Kích Hoạt Chiến Dịch'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* MODAL 2: HẠCH TOÁN CHI PHÍ PHÁT SINH */}
      {showAddCostModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm animate-in fade-in duration-200">
          <div className="bg-white rounded-2xl shadow-2xl border border-slate-100 w-full max-w-md overflow-hidden flex flex-col">
            <div className="px-6 py-4 border-b border-slate-100 flex items-center justify-between bg-slate-900 text-white">
              <h3 className="font-bold text-sm">Hạch Toán Chi Phí Marketing</h3>
              <button onClick={() => setShowAddCostModal(false)} className="text-slate-400 hover:text-white">
                <X size={18} />
              </button>
            </div>

            <div className="p-6 space-y-4 text-xs">
              <div>
                <label className="block font-bold text-slate-700 mb-1">Chiến dịch tiếp thị</label>
                <select
                  value={selectedCampaignId}
                  onChange={(e) => setSelectedCampaignId(e.target.value)}
                  className="w-full bg-slate-50 border border-slate-300 rounded-lg p-2 font-bold"
                >
                  {campaigns.map((c) => (
                    <option key={c._id} value={c._id}>
                      {c.code} - {c.name}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block font-bold text-slate-700 mb-1">Loại chi phí</label>
                <select
                  value={costType}
                  onChange={(e: any) => setCostType(e.target.value)}
                  className="w-full bg-slate-50 border border-slate-300 rounded-lg p-2 font-semibold"
                >
                  <option value="ADS">Tiền quảng cáo (Ads Budget - FB/Google/TikTok)</option>
                  <option value="PRINTING">In ấn tài liệu / Standee / Banner POSM</option>
                  <option value="GIFTS">Quà tặng kèm khách hàng / Dược phẩm sampling</option>
                  <option value="AGENCY_FEE">Phí dịch vụ đối tác / Agency</option>
                  <option value="OTHER">Chi phí khác</option>
                </select>
              </div>

              <div>
                <label className="block font-bold text-slate-700 mb-1">Số tiền chi tiêu (VNĐ)</label>
                <input
                  type="number"
                  value={costAmount}
                  onChange={(e) => setCostAmount(Number(e.target.value))}
                  className="w-full bg-slate-50 border border-slate-300 rounded-lg p-2 font-bold text-rose-600 text-sm"
                />
              </div>

              <div>
                <label className="block font-bold text-slate-700 mb-1">Ghi chú chi phí</label>
                <input
                  type="text"
                  placeholder="VD: Chạy ads bài viết tuần 2, hóa đơn in 500 tờ rơi..."
                  value={costNote}
                  onChange={(e) => setCostNote(e.target.value)}
                  className="w-full bg-slate-50 border border-slate-300 rounded-lg p-2"
                />
              </div>
            </div>

            <div className="px-6 py-3 bg-slate-50 border-t border-slate-100 flex items-center justify-end gap-2">
              <button
                type="button"
                onClick={() => setShowAddCostModal(false)}
                className="px-4 py-2 text-xs font-semibold text-slate-600 hover:bg-slate-200 rounded-lg"
              >
                Hủy
              </button>
              <button
                type="button"
                onClick={handleAddCostSubmit}
                disabled={isSubmitting}
                className="px-5 py-2 bg-rose-600 hover:bg-rose-700 text-white rounded-lg text-xs font-bold"
              >
                {isSubmitting ? 'Đang lưu...' : 'Lưu Chi Phí'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
