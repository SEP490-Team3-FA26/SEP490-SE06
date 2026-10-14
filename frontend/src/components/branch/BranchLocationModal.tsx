import React, { useState, useEffect } from "react";
import { MapPin, Navigation, X, CheckCircle2, AlertTriangle, ShieldCheck, Compass, Save } from "lucide-react";
import { branchService } from "../../services/admin/branch.service";

interface BranchLocationModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess?: () => void;
}

export function BranchLocationModal({ isOpen, onClose, onSuccess }: BranchLocationModalProps) {
  const [branchInfo, setBranchInfo] = useState<any>(null);
  const [latitudeStr, setLatitudeStr] = useState<string>("");
  const [longitudeStr, setLongitudeStr] = useState<string>("");
  const [radiusMeters, setRadiusMeters] = useState<number>(200);
  const [address, setAddress] = useState<string>("");
  const [loading, setLoading] = useState<boolean>(false);
  const [locating, setLocating] = useState<boolean>(false);
  const [saving, setSaving] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);

  useEffect(() => {
    if (!isOpen) return;
    setError(null);
    setSuccessMsg(null);
    setLoading(true);

    branchService
      .getMyBranch()
      .then((data: any) => {
        setBranchInfo(data);
        if (data.latitude !== undefined && data.latitude !== null) {
          setLatitudeStr(data.latitude.toString());
        }
        if (data.longitude !== undefined && data.longitude !== null) {
          setLongitudeStr(data.longitude.toString());
        }
        if (data.checkInRadiusMeters) {
          setRadiusMeters(data.checkInRadiusMeters);
        }
        if (data.address) {
          setAddress(data.address);
        }
      })
      .catch((err: any) => {
        setError(err.response?.data?.message || "Không thể tải thông tin chi nhánh hiện tại");
      })
      .finally(() => {
        setLoading(false);
      });
  }, [isOpen]);

  const handleGetBrowserLocation = () => {
    if (!navigator.geolocation) {
      setError("Trình duyệt không hỗ trợ Geolocation API định vị GPS");
      return;
    }

    setLocating(true);
    setError(null);

    navigator.geolocation.getCurrentPosition(
      (pos) => {
        const lat = pos.coords.latitude.toFixed(6);
        const lng = pos.coords.longitude.toFixed(6);
        setLatitudeStr(lat);
        setLongitudeStr(lng);
        setLocating(false);
        setSuccessMsg(`Đã lấy vị trí GPS hiện tại từ trình duyệt (Độ chính xác: ~${Math.round(pos.coords.accuracy)}m)`);
      },
      (err) => {
        setLocating(false);
        setError(`Lỗi định vị: ${err.message}. Vui lòng cấp quyền truy cập vị trí cho trình duyệt.`);
      },
      { enableHighAccuracy: true, timeout: 10000, maximumAge: 0 }
    );
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    const lat = parseFloat(latitudeStr);
    const lng = parseFloat(longitudeStr);

    if (isNaN(lat) || lat < -90 || lat > 90) {
      setError("Vĩ độ không hợp lệ (Phải từ -90 đến 90)");
      return;
    }
    if (isNaN(lng) || lng < -180 || lng > 180) {
      setError("Kinh độ không hợp lệ (Phải từ -180 đến 180)");
      return;
    }
    if (isNaN(radiusMeters) || radiusMeters < 20 || radiusMeters > 5000) {
      setError("Bán kính cho phép điểm danh phải từ 20 mét đến 5000 mét");
      return;
    }

    try {
      setSaving(true);
      setError(null);
      await branchService.updateMyBranchLocation({
        latitude: lat,
        longitude: lng,
        checkInRadiusMeters: radiusMeters,
        address: address.trim() || undefined,
      });

      setSuccessMsg("Cập nhật tọa độ GPS và bán kính Geofencing chi nhánh thành công!");
      onSuccess?.();
      setTimeout(() => {
        onClose();
      }, 1200);
    } catch (err: any) {
      setError(err.response?.data?.message || "Lỗi khi lưu tọa độ chi nhánh");
    } finally {
      setSaving(false);
    }
  };

  if (!isOpen) return null;

  const radiusPresets = [50, 100, 200, 300, 500];

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 backdrop-blur-sm p-4">
      <div className="bg-white rounded-2xl shadow-2xl border border-slate-100 w-full max-w-xl overflow-hidden animate-in fade-in zoom-in-95 duration-150">
        {/* Header */}
        <div className="px-6 py-5 border-b border-slate-100 flex items-center justify-between bg-gradient-to-r from-emerald-50 via-teal-50 to-white">
          <div className="flex items-center space-x-3">
            <div className="w-10 h-10 rounded-xl bg-emerald-600 flex items-center justify-center text-white shadow-md shadow-emerald-200">
              <MapPin className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-lg font-bold text-slate-800">Cài Đặt Vị Trí GPS Chi Nhánh</h2>
              <p className="text-xs text-slate-500 font-medium">
                {branchInfo?.name || "Chi nhánh cơ sở"} ({branchInfo?.branchCode || "BR-001"})
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="text-slate-400 hover:text-slate-600 hover:bg-slate-100 p-2 rounded-lg transition"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Body */}
        <div className="p-6">
          {error && (
            <div className="mb-4 p-3.5 bg-rose-50 border border-rose-200 rounded-xl flex items-start space-x-3 text-rose-700 text-sm">
              <AlertTriangle className="w-5 h-5 text-rose-500 shrink-0 mt-0.5" />
              <span>{error}</span>
            </div>
          )}

          {successMsg && (
            <div className="mb-4 p-3.5 bg-emerald-50 border border-emerald-200 rounded-xl flex items-start space-x-3 text-emerald-700 text-sm">
              <CheckCircle2 className="w-5 h-5 text-emerald-600 shrink-0 mt-0.5" />
              <span>{successMsg}</span>
            </div>
          )}

          {/* Principle Info Card */}
          <div className="mb-5 p-3.5 bg-sky-50 border border-sky-100 rounded-xl flex items-start space-x-3 text-sky-800 text-xs leading-relaxed">
            <ShieldCheck className="w-5 h-5 text-sky-600 shrink-0 mt-0.5" />
            <div>
              <strong className="font-semibold block mb-0.5">Tự chủ cơ sở & Điểm danh Geofencing</strong>
              Quản lý chi nhánh có toàn quyền thiết lập tọa độ mốc của cơ sở. Tọa độ này được dùng làm tâm đối soát khoảng cách khi Dược sĩ thực hiện chấm công trên Mobile App.
            </div>
          </div>

          {loading ? (
            <div className="py-12 flex flex-col items-center justify-center text-slate-400">
              <div className="w-8 h-8 border-3 border-emerald-500 border-t-transparent rounded-full animate-spin mb-3" />
              <p className="text-sm">Đang tải thông tin chi nhánh...</p>
            </div>
          ) : (
            <form onSubmit={handleSave} className="space-y-4">
              {/* Quick Geolocation Button */}
              <button
                type="button"
                onClick={handleGetBrowserLocation}
                disabled={locating}
                className="w-full py-2.5 px-4 bg-emerald-600 hover:bg-emerald-700 disabled:opacity-60 text-white font-medium text-sm rounded-xl flex items-center justify-center space-x-2 transition shadow-sm"
              >
                {locating ? (
                  <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                ) : (
                  <Navigation className="w-4 h-4" />
                )}
                <span>{locating ? "Đang xác định tọa độ thiết bị..." : "Lấy Tọa Độ GPS Hiện Tại Của Trình Duyệt"}</span>
              </button>

              {/* Coordinates Inputs */}
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-semibold text-slate-600 uppercase mb-1.5">
                    Vĩ Độ (Latitude)
                  </label>
                  <input
                    type="text"
                    required
                    value={latitudeStr}
                    onChange={(e) => setLatitudeStr(e.target.value)}
                    placeholder="10.776900"
                    className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-slate-800 font-mono text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:bg-white transition"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-600 uppercase mb-1.5">
                    Kinh Độ (Longitude)
                  </label>
                  <input
                    type="text"
                    required
                    value={longitudeStr}
                    onChange={(e) => setLongitudeStr(e.target.value)}
                    placeholder="106.700900"
                    className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-slate-800 font-mono text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:bg-white transition"
                  />
                </div>
              </div>

              {/* Geofence Radius Selection */}
              <div>
                <div className="flex items-center justify-between mb-1.5">
                  <label className="text-xs font-semibold text-slate-600 uppercase">
                    Bán Kính Geofencing Điểm Danh
                  </label>
                  <span className="text-xs font-bold text-emerald-600 bg-emerald-50 px-2.5 py-0.5 rounded-full border border-emerald-100">
                    {radiusMeters} mét
                  </span>
                </div>

                <div className="grid grid-cols-5 gap-2">
                  {radiusPresets.map((r) => {
                    const isSelected = radiusMeters === r;
                    return (
                      <button
                        type="button"
                        key={r}
                        onClick={() => setRadiusMeters(r)}
                        className={`py-2 text-xs font-semibold rounded-lg border transition ${
                          isSelected
                            ? "bg-emerald-600 text-white border-emerald-600 shadow-sm"
                            : "bg-slate-50 hover:bg-slate-100 text-slate-700 border-slate-200"
                        }`}
                      >
                        {r}m
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Address */}
              <div>
                <label className="block text-xs font-semibold text-slate-600 uppercase mb-1.5">
                  Địa Chỉ Cơ Sở
                </label>
                <input
                  type="text"
                  value={address}
                  onChange={(e) => setAddress(e.target.value)}
                  placeholder="Ví dụ: 123 Nguyễn Huệ, Phường Bến Nghé, Quận 1"
                  className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-slate-800 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:bg-white transition"
                />
              </div>

              {/* Action Buttons */}
              <div className="pt-3 border-t border-slate-100 flex items-center justify-end space-x-3">
                <button
                  type="button"
                  onClick={onClose}
                  className="px-4 py-2.5 text-sm font-medium text-slate-600 hover:bg-slate-100 rounded-xl transition"
                >
                  Đóng
                </button>
                <button
                  type="submit"
                  disabled={saving}
                  className="px-5 py-2.5 bg-emerald-600 hover:bg-emerald-700 disabled:opacity-60 text-white text-sm font-semibold rounded-xl flex items-center space-x-2 transition shadow-md shadow-emerald-200"
                >
                  {saving ? (
                    <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                  ) : (
                    <Save className="w-4 h-4" />
                  )}
                  <span>{saving ? "Đang lưu..." : "Lưu Vị Trí Chi Nhánh"}</span>
                </button>
              </div>
            </form>
          )}
        </div>
      </div>
    </div>
  );
}
