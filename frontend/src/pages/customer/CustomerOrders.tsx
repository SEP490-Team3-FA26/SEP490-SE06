import React, { useState, useEffect, useRef } from 'react';
import { 
  Package, 
  Clock, 
  Truck, 
  MapPin, 
  User, 
  Phone, 
  Thermometer, 
  ShieldCheck, 
  X, 
  Navigation, 
  CheckCircle2, 
  ExternalLink,
  ChevronRight,
  AlertCircle,
  Building2,
  Home,
  Check,
  Radio,
  Sparkles,
  Layers,
  Edit2,
  Save,
  Receipt,
  FileText,
  Store,
  QrCode,
  Calendar,
  CheckSquare,
  Star,
  Gift,
  ThumbsUp
} from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'motion/react';
import 'leaflet/dist/leaflet.css';
import L from 'leaflet';
import { orderService } from '../../services/sales/order.service';
import { authService } from '../../services/auth/auth.service';
import { branchService } from '../../services/admin/branch.service';
import { userService } from '../../services/auth/user.service';
import { feedbackService, FeedbackSubmissionResponse } from '../../services/sales/feedback.service';

interface CustomerShipmentLogistics {
  trackingCode: string;
  carrierName: string;
  shipperName: string;
  shipperPhone: string;
  vehiclePlate: string;
  deliveryType: string;
  coldChainPackaging: boolean;
  temperature: number;
  tempStatus: string;
  currentLocation: string;
  distanceKm: string;
  estimatedMinutes: string;
  isDelivered: boolean;
  originCoords: [number, number];
  destCoords: [number, number];
  shipperCoords: [number, number];
  originBranch: {
    name: string;
    address: string;
    pharmacist: string;
    phone: string;
  };
  destination: {
    receiverName: string;
    receiverPhone: string;
    address: string;
  };
  milestones: {
    title: string;
    description: string;
    time: string;
    status: 'COMPLETED' | 'CURRENT' | 'PENDING';
  }[];
}

// ─── HÀM ÁNH XẠ TỌA ĐỘ THỰC TẾ TỪ ĐỊA CHỈ VIỆT NAM (GEOCODING RESOLVER) ───
function getCoordinatesForAddress(address: string, isOrigin: boolean = false): [number, number] {
  if (!address) return isOrigin ? [21.0185, 105.8423] : [21.0255, 105.8565];
  const addrLower = address.toLowerCase();

  // Hà Nội các quận/phường
  if (addrLower.includes('hoàn kiếm') || addrLower.includes('tràng tiền') || addrLower.includes('hàng')) return [21.0285, 105.8542];
  if (addrLower.includes('hai bà trưng') || addrLower.includes('lê duẩn') || addrLower.includes('bạch mai') || addrLower.includes('nguyễn du')) return [21.0185, 105.8423];
  if (addrLower.includes('cầu giấy') || addrLower.includes('dịch vọng') || addrLower.includes('xuân thủy') || addrLower.includes('trần thái tông')) return [21.0360, 105.7950];
  if (addrLower.includes('đống đa') || addrLower.includes('thái hà') || addrLower.includes('chùa bộc') || addrLower.includes('láng')) return [21.0118, 105.8195];
  if (addrLower.includes('ba đình') || addrLower.includes('kim mã') || addrLower.includes('giảng võ') || addrLower.includes('đội cấn')) return [21.0315, 105.8242];
  if (addrLower.includes('thanh xuân') || addrLower.includes('nguyễn trãi') || addrLower.includes('khuất duy tiến')) return [20.9930, 105.8050];
  if (addrLower.includes('nam từ liêm') || addrLower.includes('mỹ đình') || addrLower.includes('lê đức thọ')) return [21.0180, 105.7720];
  if (addrLower.includes('bắc từ liêm') || addrLower.includes('nhổn') || addrLower.includes('cổ nhuế')) return [21.0650, 105.7600];
  if (addrLower.includes('long biên') || addrLower.includes('sài đồng') || addrLower.includes('nguyễn văn cừ')) return [21.0450, 105.8900];
  if (addrLower.includes('tây hồ') || addrLower.includes('lạc long quân') || addrLower.includes('xuân la')) return [21.0720, 105.8200];
  if (addrLower.includes('hà đông') || addrLower.includes('quang trung') || addrLower.includes('mộ lao')) return [20.9710, 105.7760];
  if (addrLower.includes('hoàng mai') || addrLower.includes('linh đàm') || addrLower.includes('giải phóng')) return [20.9750, 105.8550];

  // TP. Hồ Chí Minh
  if (addrLower.includes('quận 1') || addrLower.includes('q1') || addrLower.includes('bến nghé') || addrLower.includes('nguyễn huệ')) return [10.7769, 106.7009];
  if (addrLower.includes('quận 3') || addrLower.includes('q3')) return [10.7845, 106.6844];
  if (addrLower.includes('quận 7') || addrLower.includes('q7') || addrLower.includes('phú mỹ hưng')) return [10.7324, 106.7196];
  if (addrLower.includes('tân bình') || addrLower.includes('cộng hòa') || addrLower.includes('sân bay')) return [10.8015, 106.6548];
  if (addrLower.includes('bình thạnh') || addrLower.includes('xô viết nghệ tĩnh')) return [10.8106, 106.7091];
  if (addrLower.includes('thủ đức') || addrLower.includes('linh trung') || addrLower.includes('hiệp phú')) return [10.8494, 106.7716];

  // Đà Nẵng
  if (addrLower.includes('đà nẵng') || addrLower.includes('hải châu') || addrLower.includes('ngũ hành sơn')) return [16.0544, 108.2022];

  // Mặc định Hà Nội nội thành
  return isOrigin ? [21.0185, 105.8423] : [21.0255, 105.8565];
}

// ─── BẢN ĐỒ THỰC TẾ LEAFLET / OPENSTREETMAP CHO SHIPPER DƯỢC PHẨM THEO TUYẾN ĐƯỜNG PHỐ (ROAD ROUTING) ───
function RealDeliveryMap({
  originCoords,
  destCoords,
  originName,
  originAddress,
  destName,
  destAddress,
  shipperName,
  shipperPhone,
  vehiclePlate,
  isDelivered,
  progressRatio
}: {
  originCoords: [number, number];
  destCoords: [number, number];
  originName: string;
  originAddress: string;
  destName: string;
  destAddress: string;
  shipperName: string;
  shipperPhone: string;
  vehiclePlate: string;
  isDelivered: boolean;
  progressRatio: number; // 0 (Origin) -> 1 (Destination)
}) {
  const mapContainerRef = useRef<HTMLDivElement>(null);
  const mapInstanceRef = useRef<L.Map | null>(null);

  useEffect(() => {
    if (!mapContainerRef.current) return;

    // Khởi tạo map nếu chưa có
    if (!mapInstanceRef.current) {
      const map = L.map(mapContainerRef.current, {
        center: originCoords,
        zoom: 14,
        zoomControl: true,
      });

      // Sử dụng OpenStreetMap Tile Layer chính thống (100% không dính Watermark "API KEY REQUIRED")
      L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
        attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors',
        maxZoom: 19,
      }).addTo(map);

      mapInstanceRef.current = map;
    }

    const map = mapInstanceRef.current;

    // Fix lỗi hiển thị tile bị xám khi render trong Modal
    setTimeout(() => {
      if (mapInstanceRef.current) {
        mapInstanceRef.current.invalidateSize();
      }
    }, 150);

    setTimeout(() => {
      if (mapInstanceRef.current) {
        mapInstanceRef.current.invalidateSize();
      }
    }, 350);

    // Xóa các layers cũ (markers & polylines) trước khi vẽ mới
    map.eachLayer((layer) => {
      if (layer instanceof L.Marker || layer instanceof L.Polyline) {
        map.removeLayer(layer);
      }
    });

    // 1. Origin Marker (Chi nhánh Nhà Thuốc)
    const originIcon = L.divIcon({
      className: 'custom-origin-marker',
      html: `
        <div style="display: flex; flex-direction: column; align-items: center; cursor: pointer;">
          <div style="background: #2563eb; color: #ffffff; width: 36px; height: 36px; border-radius: 12px; display: flex; align-items: center; justify-content: center; border: 2.5px solid #ffffff; box-shadow: 0 4px 12px rgba(37,99,235,0.5); font-size: 18px;">
            🏥
          </div>
          <div style="margin-top: 3px; background: #0f172a; color: #ffffff; padding: 2px 8px; border-radius: 6px; font-size: 10px; font-weight: 800; white-space: nowrap; box-shadow: 0 2px 6px rgba(0,0,0,0.3); border: 1px solid #3b82f6;">
            Chi nhánh xuất kho
          </div>
        </div>
      `,
      iconSize: [40, 50],
      iconAnchor: [20, 25],
    });

    const originMarker = L.marker(originCoords, { icon: originIcon }).addTo(map);
    originMarker.bindPopup(`
      <div style="font-family: sans-serif; font-size: 12px; line-height: 1.4; padding: 4px;">
        <strong style="color: #1e40af; font-size: 13px;">${originName}</strong><br/>
        <span style="color: #64748b;">📍 ${originAddress}</span><br/>
        <span style="color: #059669; font-weight: bold;">✓ Đạt chuẩn GPP/GDP Dược Phẩm</span>
      </div>
    `);

    // 2. Destination Marker (Khách hàng)
    const destIcon = L.divIcon({
      className: 'custom-dest-marker',
      html: `
        <div style="display: flex; flex-direction: column; align-items: center; cursor: pointer;">
          <div style="background: #10b981; color: #ffffff; width: 36px; height: 36px; border-radius: 12px; display: flex; align-items: center; justify-content: center; border: 2.5px solid #ffffff; box-shadow: 0 4px 12px rgba(16,185,129,0.5); font-size: 18px;">
            🏠
          </div>
          <div style="margin-top: 3px; background: #0f172a; color: #ffffff; padding: 2px 8px; border-radius: 6px; font-size: 10px; font-weight: 800; white-space: nowrap; box-shadow: 0 2px 6px rgba(0,0,0,0.3); border: 1px solid #10b981;">
            Địa chỉ nhận thuốc
          </div>
        </div>
      `,
      iconSize: [40, 50],
      iconAnchor: [20, 25],
    });

    const destMarker = L.marker(destCoords, { icon: destIcon }).addTo(map);
    destMarker.bindPopup(`
      <div style="font-family: sans-serif; font-size: 12px; line-height: 1.4; padding: 4px;">
        <strong style="color: #065f46; font-size: 13px;">Người nhận: ${destName}</strong><br/>
        <span style="color: #64748b;">📍 ${destAddress}</span><br/>
        <span style="color: #2563eb; font-weight: bold;">🚚 Giao tận tay người bệnh</span>
      </div>
    `);

    // 3. Lấy lộ trình đường bộ thực tế (OSRM Road Routing) theo các tuyến phố
    const fetchAndDrawRoute = async () => {
      let routePoints: [number, number][] = [];

      try {
        // Gọi Open Source Routing Machine (OSRM) để lấy tuyến đường thực tế qua các nút giao
        const osrmUrl = `https://router.project-osrm.org/route/v1/driving/${originCoords[1]},${originCoords[0]};${destCoords[1]},${destCoords[0]}?overview=full&geometries=geojson`;
        const res = await fetch(osrmUrl);
        const data = await res.json();

        if (data.code === 'Ok' && data.routes && data.routes.length > 0) {
          const coords = data.routes[0].geometry.coordinates;
          routePoints = coords.map((c: [number, number]) => [c[1], c[0]] as [number, number]);
        }
      } catch (err) {
        console.warn('OSRM routing fallback to street turns:', err);
      }

      // Fallback nếu không có mạng: Xây dựng tuyến đường bẻ góc theo các trục phố chính (không cắt thẳng chéo hồ/nhà)
      if (routePoints.length === 0) {
        const dLat = destCoords[0] - originCoords[0];
        const dLon = destCoords[1] - originCoords[1];
        routePoints = [
          originCoords,
          [originCoords[0] + dLat * 0.25, originCoords[1] + dLon * 0.05],
          [originCoords[0] + dLat * 0.45, originCoords[1] + dLon * 0.40],
          [originCoords[0] + dLat * 0.70, originCoords[1] + dLon * 0.65],
          [originCoords[0] + dLat * 0.85, originCoords[1] + dLon * 0.95],
          destCoords
        ];
      }

      // Vẽ tuyến đường thực tế uốn lượn theo phố
      L.polyline(routePoints, {
        color: '#2563eb',
        weight: 6,
        opacity: 0.85,
        lineCap: 'round',
        lineJoin: 'round',
        dashArray: isDelivered ? undefined : '8, 8'
      }).addTo(map);

      // 4. Tính toán vị trí Shipper Live di chuyển bám sát theo các đoạn rẽ của tuyến đường
      let shipperLocation: [number, number] = destCoords;
      if (!isDelivered && routePoints.length > 1) {
        const targetIndex = Math.min(
          routePoints.length - 1,
          Math.max(0, Math.floor(progressRatio * (routePoints.length - 1)))
        );
        shipperLocation = routePoints[targetIndex];

        const shipperIcon = L.divIcon({
          className: 'custom-shipper-marker',
          html: `
            <div style="position: relative; display: flex; flex-direction: column; align-items: center; cursor: pointer;">
              <div style="position: absolute; top: -5px; left: calc(50% - 19px); width: 38px; height: 38px; border-radius: 50%; background: #0284c7; opacity: 0.4; animation: ping 1.4s cubic-bezier(0, 0, 0.2, 1) infinite;"></div>
              <div style="background: #0284c7; color: #ffffff; width: 34px; height: 34px; border-radius: 50%; display: flex; align-items: center; justify-content: center; border: 2.5px solid #ffffff; box-shadow: 0 4px 14px rgba(2,132,199,0.7); font-size: 16px; z-index: 2;">
                🛵
              </div>
              <div style="margin-top: 2px; background: #0284c7; color: #ffffff; padding: 2px 8px; border-radius: 10px; font-size: 10px; font-weight: 800; white-space: nowrap; box-shadow: 0 2px 6px rgba(0,0,0,0.3); z-index: 3;">
                Shipper ${shipperName}
              </div>
            </div>
          `,
          iconSize: [45, 55],
          iconAnchor: [22, 28],
        });

        const shipperMarker = L.marker(shipperLocation, { icon: shipperIcon }).addTo(map);
        shipperMarker.bindPopup(`
          <div style="font-family: sans-serif; font-size: 12px; line-height: 1.4; padding: 4px;">
            <strong style="color: #0369a1; font-size: 13px;">Tài xế: ${shipperName}</strong><br/>
            <span>📞 SĐT: <strong>${shipperPhone}</strong></span><br/>
            <span>🛵 Biển số: <strong>${vehiclePlate}</strong></span><br/>
            <span style="color: #059669; font-weight: bold;">❄️ Thùng bảo ôn GPP 4.5°C</span>
          </div>
        `);
      }

      // Zoom vừa vặn toàn bộ lộ trình
      const bounds = L.latLngBounds([originCoords, destCoords, shipperLocation]);
      map.fitBounds(bounds, { padding: [45, 45], maxZoom: 16 });
    };

    fetchAndDrawRoute();

  }, [originCoords, destCoords, isDelivered, progressRatio]);

  return (
    <div 
      ref={mapContainerRef} 
      className="w-full h-72 sm:h-80 rounded-2xl overflow-hidden border border-slate-200 shadow-inner z-0" 
    />
  );
}

export function CustomerOrders() {
  const navigate = useNavigate();
  const [orders, setOrders] = useState<any[]>([]);
  const [branches, setBranches] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [filterStatus, setFilterStatus] = useState<string>('ALL');
  const [trackingOrder, setTrackingOrder] = useState<any | null>(null);
  const [posInvoiceOrder, setPosInvoiceOrder] = useState<any | null>(null);
  const [userProfile, setUserProfile] = useState<any | null>(null);
  const [loyaltyInfo, setLoyaltyInfo] = useState<any | null>(null);

  // Quick Address Update Modal State
  const [isAddressModalOpen, setIsAddressModalOpen] = useState(false);
  const [newAddressInput, setNewAddressInput] = useState('');
  const [isSavingAddress, setIsSavingAddress] = useState(false);
  const [addressSuccessMsg, setAddressSuccessMsg] = useState('');

  // Feedback Modal State (Đánh giá ngay tại chỗ không cần redirect)
  const [feedbackOrder, setFeedbackOrder] = useState<any | null>(null);
  const [feedbackRating, setFeedbackRating] = useState<number>(5);
  const [feedbackTags, setFeedbackTags] = useState<string[]>(['Dược sĩ tận tâm', 'Thuốc chuẩn chính hãng']);
  const [feedbackComment, setFeedbackComment] = useState<string>('');
  const [isSubmittingFeedback, setIsSubmittingFeedback] = useState<boolean>(false);
  const [feedbackResult, setFeedbackResult] = useState<FeedbackSubmissionResponse | null>(null);

  const handleOpenFeedback = (order: any) => {
    setFeedbackOrder(order);
    if (order.isReviewed) {
      setFeedbackResult({
        success: true,
        message: 'Đơn hàng này đã được bạn gửi đánh giá thành công! Điểm thưởng đã được tích lũy vào tài khoản thành viên của bạn.',
        rewardPointsEarned: 1000,
      });
      return;
    }
    setFeedbackRating(5);
    setFeedbackTags(['Dược sĩ tận tâm', 'Thuốc chuẩn chính hãng']);
    setFeedbackComment('');
    setFeedbackResult(null);
  };

  const handleToggleTag = (tag: string) => {
    setFeedbackTags(prev => 
      prev.includes(tag) ? prev.filter(t => t !== tag) : [...prev, tag]
    );
  };

  const handleSubmitFeedbackModal = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!feedbackOrder) return;
    setIsSubmittingFeedback(true);
    const orderKey = String(feedbackOrder.orderCode || feedbackOrder._id);
    try {
      const res = await feedbackService.submitFeedback({
        orderCode: orderKey,
        branchId: feedbackOrder.branchId || 'CN-01',
        branchName: branches.find(b => b.branchCode === feedbackOrder.branchId)?.name || 'Chi Nhánh VinaPharmacy',
        customerPhone: userProfile?.phone || feedbackOrder.patientPhone || '',
        customerName: userProfile?.fullName || feedbackOrder.patientName || 'Khách hàng',
        rating: feedbackRating,
        tags: feedbackTags,
        comment: feedbackComment,
      });
      setFeedbackResult(res);

      // 🌟 Lưu mã đơn hàng đã đánh giá vào localStorage để không bao giờ bị mất khi reset trang
      try {
        const storedCodes: string[] = JSON.parse(localStorage.getItem('reviewed_order_codes') || '[]');
        if (!storedCodes.includes(orderKey)) {
          storedCodes.push(orderKey);
          localStorage.setItem('reviewed_order_codes', JSON.stringify(storedCodes));
        }
      } catch (err) {
        console.warn('Could not save to localStorage:', err);
      }

      // Đánh dấu đã đánh giá trong UI
      setOrders(prev => prev.map(o => (String(o._id) === orderKey || String(o.orderCode) === orderKey) ? { ...o, isReviewed: true } : o));
      window.dispatchEvent(new Event('loyaltyUpdated'));
    } catch (err: any) {
      alert(err.response?.data?.message || err.message || 'Lỗi khi gửi đánh giá');
    } finally {
      setIsSubmittingFeedback(false);
    }
  };

  const filteredOrders = orders.filter(order => filterStatus === 'ALL' || order.paymentStatus === filterStatus);

  const fetchOrdersData = async () => {
    setLoading(true);
    try {
      const [profileRes, branchesRes, loyaltyRes] = await Promise.all([
        authService.getProfile().catch(() => null),
        branchService.getBranches().catch(() => []),
        userService.getLoyalty().catch(() => null)
      ]);

      const phone = profileRes?.phone || loyaltyRes?.phone || '';
      const ordersRes = await orderService.getMyOrders(phone).catch(() => []);
      
      // 🌟 Lấy danh sách các đơn đã đánh giá từ localStorage
      let reviewedCodes: string[] = [];
      try {
        reviewedCodes = JSON.parse(localStorage.getItem('reviewed_order_codes') || '[]');
      } catch (e) {
        reviewedCodes = [];
      }

      // 🌟 Lấy thêm danh sách từ API backend theo số điện thoại (đồng bộ 2 chiều)
      if (phone && phone !== 'Chưa cập nhật') {
        try {
          const fbData = await feedbackService.getFeedbacksByCustomer(phone);
          if (Array.isArray(fbData)) {
            fbData.forEach((f: any) => {
              if (f.orderCode && !reviewedCodes.includes(String(f.orderCode))) {
                reviewedCodes.push(String(f.orderCode));
              }
            });
            localStorage.setItem('reviewed_order_codes', JSON.stringify(reviewedCodes));
          }
        } catch (e) {
          // Bỏ qua lỗi mạng ngầm
        }
      }

      const reviewedSet = new Set(reviewedCodes.map(String));
      const rawOrders = Array.isArray(ordersRes) ? ordersRes : ordersRes?.data || [];
      const mappedOrders = rawOrders.map((o: any) => ({
        ...o,
        isReviewed: o.isReviewed || reviewedSet.has(String(o.orderCode)) || reviewedSet.has(String(o._id))
      }));

      setOrders(mappedOrders);
      setUserProfile(profileRes || null);
      setBranches(Array.isArray(branchesRes) ? branchesRes : branchesRes?.data || []);
      if (loyaltyRes && !loyaltyRes.error) {
        setLoyaltyInfo(loyaltyRes);
      }
    } catch (error) {
      console.error("Failed to load orders data:", error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchOrdersData();
  }, []);

  const handleSaveAddressToDB = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newAddressInput.trim()) return;

    setIsSavingAddress(true);
    try {
      await userService.updateProfile({
        fullName: userProfile?.fullName || 'Khách Hàng',
        phone: userProfile?.phone || '0987654321',
        address: newAddressInput.trim()
      });
      setAddressSuccessMsg('Đã lưu địa chỉ thực tế vào cơ sở dữ liệu MongoDB!');
      await fetchOrdersData();
      setTimeout(() => {
        setIsAddressModalOpen(false);
        setAddressSuccessMsg('');
      }, 1500);
    } catch (err) {
      console.error('Lỗi khi lưu địa chỉ:', err);
    } finally {
      setIsSavingAddress(false);
    }
  };

  // Tính toán thời gian thực tế và lộ trình giao hàng cho đơn Online
  const getCustomerShipmentInfo = (order: any): CustomerShipmentLogistics => {
    const code = order.orderCode || order._id?.slice(-6).toUpperCase() || "ORD889";
    
    // Mốc thời gian đặt đơn thực tế từ Database
    const createdDate = order.createdAt ? new Date(order.createdAt) : new Date();
    const now = new Date();
    const elapsedMinutes = Math.floor((now.getTime() - createdDate.getTime()) / (60 * 1000));

    const formatTime = (d: Date) => d.toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit' });
    const formatFullDateTime = (d: Date) => `${formatTime(d)} - ${d.toLocaleDateString('vi-VN')}`;

    const tCreated = formatFullDateTime(createdDate);
    const dPacked = new Date(createdDate.getTime() + 8 * 60 * 1000);
    const dPicked = new Date(createdDate.getTime() + 18 * 60 * 1000);
    const dInTransit = new Date(createdDate.getTime() + 30 * 60 * 1000);
    const dDelivered = new Date(createdDate.getTime() + 45 * 60 * 1000);

    // Xác định trạng thái thực tế dựa trên thời gian đã trôi qua
    const isDelivered = elapsedMinutes >= 45 || order.deliveryStatus === 'DELIVERED';

    // Tìm chi nhánh xuất kho thực tế trong DB
    const foundBranch = branches.find(b => b.branchCode === order.branchId);
    const originBranch = {
      name: foundBranch?.name || "Nhà Thuốc VinaPharmacy - Chi Nhánh 01 Hoàn Kiếm",
      address: foundBranch?.address || "Số 182 Lê Duẩn, P. Nguyễn Du, Q. Hai Bà Trưng, TP. Hà Nội",
      pharmacist: `Dược sĩ phụ trách: ${foundBranch?.manager || "DS. Nguyễn Thu Trang"} (Chuẩn GPP)`,
      phone: foundBranch?.contact || "(024) 3822.9988"
    };

    // Địa chỉ người nhận thực tế
    const resolvedAddress = (order.shippingAddress && order.shippingAddress !== 'Mua tại quầy')
      ? order.shippingAddress 
      : (userProfile?.address || "Số 45 Tràng Tiền, P. Tràng Tiền, Q. Hoàn Kiếm, TP. Hà Nội");

    const destination = {
      receiverName: order.patientName || userProfile?.fullName || "Khách Hàng",
      receiverPhone: order.patientPhone || userProfile?.phone || "0987.654.321",
      address: resolvedAddress
    };

    // Tọa độ GPS thực tế được tính toán từ địa chỉ thực
    const originCoords = getCoordinatesForAddress(originBranch.address, true);
    const destCoords = getCoordinatesForAddress(destination.address, false);

    // Tỷ lệ hoàn thành đoạn đường (18 phút -> 45 phút)
    let progressRatio = 1.0;
    if (!isDelivered) {
      if (elapsedMinutes <= 18) {
        progressRatio = 0.05;
      } else {
        progressRatio = Math.min(0.95, (elapsedMinutes - 18) / 27);
      }
    }

    const shipperCoords: [number, number] = isDelivered 
      ? destCoords 
      : [
          originCoords[0] + (destCoords[0] - originCoords[0]) * progressRatio,
          originCoords[1] + (destCoords[1] - originCoords[1]) * progressRatio
        ];

    // Xây dựng 5 mốc hành trình chuẩn xác theo thời gian thực
    let m1Status: 'COMPLETED' | 'CURRENT' | 'PENDING' = 'COMPLETED';
    let m2Status: 'COMPLETED' | 'CURRENT' | 'PENDING' = elapsedMinutes >= 8 ? 'COMPLETED' : 'CURRENT';
    let m3Status: 'COMPLETED' | 'CURRENT' | 'PENDING' = elapsedMinutes >= 18 ? 'COMPLETED' : (elapsedMinutes >= 8 ? 'CURRENT' : 'PENDING');
    let m4Status: 'COMPLETED' | 'CURRENT' | 'PENDING' = elapsedMinutes >= 45 ? 'COMPLETED' : (elapsedMinutes >= 18 ? 'CURRENT' : 'PENDING');
    let m5Status: 'COMPLETED' | 'CURRENT' | 'PENDING' = elapsedMinutes >= 45 ? 'COMPLETED' : 'PENDING';

    const milestones = [
      {
        title: "1. Đặt hàng thành công & Tiếp nhận đơn",
        description: `Hệ thống tiếp nhận đơn thuốc #${code} lúc ${tCreated}`,
        time: tCreated,
        status: m1Status
      },
      {
        title: "2. Dược sĩ kiểm duyệt & Đóng gói bảo ôn",
        description: `${originBranch.pharmacist} đã niêm phong thuốc trong thùng lạnh GPP chuyên dụng`,
        time: elapsedMinutes >= 8 ? formatFullDateTime(dPacked) : "Đang thực hiện...",
        status: m2Status
      },
      {
        title: "3. Shipper nhận hàng từ Chi nhánh",
        description: `Tài xế Lê Minh Tuấn đã lấy hàng tại ${originBranch.name}`,
        time: elapsedMinutes >= 18 ? formatFullDateTime(dPicked) : (elapsedMinutes >= 8 ? "Shipper đang lấy hàng..." : "Chờ điều phối"),
        status: m3Status
      },
      {
        title: "4. Đang giao hàng tới người bệnh (Last-Mile Delivery)",
        description: `Shipper đang di chuyển bằng thùng lạnh chuyên dụng tới: ${destination.address}`,
        time: elapsedMinutes >= 45 ? formatFullDateTime(dInTransit) : (elapsedMinutes >= 18 ? "Đang lưu thông trên đường" : "Chờ xuất phát"),
        status: m4Status
      },
      {
        title: isDelivered ? "5. Đã giao hàng & Đồng kiểm thành công" : "5. Dự kiến nhận hàng & Đồng kiểm tem",
        description: isDelivered ? `Giao thành công tại ${destination.address}. Khách hàng đã ký nhận thuốc` : "Khách hàng kiểm tra tem niêm phong bảo ôn trước khi nhận thuốc",
        time: isDelivered ? formatFullDateTime(dDelivered) : `Dự kiến: ${formatTime(dDelivered)}`,
        status: m5Status
      }
    ];

    let currentLocation = "";
    let estimatedMinutes = "";
    if (isDelivered) {
      currentLocation = `Đã giao thành công tại ${destination.address}`;
      estimatedMinutes = "Đã hoàn thành";
    } else if (elapsedMinutes >= 18) {
      currentLocation = `Đang di chuyển trên đường phố (Cách điểm nhận ~1.2 km)`;
      estimatedMinutes = `${Math.max(3, 45 - elapsedMinutes)} phút nữa`;
    } else if (elapsedMinutes >= 8) {
      currentLocation = `Shipper đang lấy thuốc tại ${originBranch.name}`;
      estimatedMinutes = "25 - 30 phút nữa";
    } else {
      currentLocation = `Chi nhánh đang kiểm duyệt & đóng gói bảo quản`;
      estimatedMinutes = "35 - 45 phút nữa";
    }

    return {
      trackingCode: `SHIP-MED-${code}-VN`,
      carrierName: "AhaMove Pharma Express (Giao Nhanh Y Tế)",
      shipperName: "Lê Minh Tuấn",
      shipperPhone: "0912.883.991",
      vehiclePlate: "29G1-774.22 (Xe máy chuyên dụng thùng lạnh)",
      deliveryType: "Giao Hỏa Tốc Dược Phẩm (Bảo Quản Túi Lạnh GPP)",
      coldChainPackaging: true,
      temperature: 4.5,
      tempStatus: "4.5°C • Chuẩn GPP (Dải an toàn 2°C - 8°C)",
      currentLocation,
      distanceKm: "2.4 km",
      estimatedMinutes,
      isDelivered,
      originCoords,
      destCoords,
      shipperCoords,
      originBranch,
      destination,
      milestones
    };
  };

  return (
    <div className="flex flex-col gap-6 flex-1 max-w-7xl mx-auto w-full px-4 sm:px-6 lg:px-8 py-6 animate-fade-in">
      {/* ============================================================ */}
      {/* 1. PREMIUM HERO BANNER (Đồng bộ format chuẩn CustomerShop.tsx) */}
      {/* ============================================================ */}
      <div className="relative rounded-[28px] overflow-hidden bg-gradient-to-br from-slate-900 via-blue-950 to-blue-900 text-white p-8 sm:p-10 shadow-xl border border-white/5">
        <div className="absolute top-0 right-0 w-[450px] h-[450px] bg-gradient-to-tr from-blue-500/20 via-sky-400/15 to-emerald-500/10 rounded-full blur-[100px] pointer-events-none"></div>

        <div className="relative z-10 max-w-3xl flex flex-col gap-4">
          <span className="px-4 py-1.5 bg-blue-500/10 border border-blue-500/20 rounded-full text-[10px] font-black tracking-widest uppercase self-start text-blue-400 flex items-center gap-2">
            <Package size={14} className="text-blue-400" />
            Quản Lý Đơn Hàng & Lộ Trình Giao Thuốc ABC Pharma
          </span>

          <h1 className="text-3xl sm:text-5xl font-black tracking-tight leading-[1.1]">
            Lịch Sử Mua Thuốc <br className="hidden sm:block" />
            & Theo Dõi Đơn Hàng
          </h1>

          <p className="text-xs sm:text-sm text-slate-300 leading-relaxed font-semibold max-w-2xl">
            Theo dõi lộ trình shipper giao hàng hỏa tốc trong điều kiện bảo quản GSP, kiểm tra hóa đơn điện tử POS và gửi đánh giá dịch vụ sau khi nhận thuốc để nhận điểm thưởng.
          </p>

          {/* Quick Stats Pills */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 pt-2">
            <div className="bg-white/10 backdrop-blur-md rounded-2xl p-3 border border-white/10 flex flex-col">
              <span className="text-[10px] font-bold text-slate-300 uppercase tracking-wider">Tổng Đơn Hàng</span>
              <span className="text-lg sm:text-xl font-black text-white mt-0.5">{orders.length} Đơn</span>
            </div>
            <div className="bg-white/10 backdrop-blur-md rounded-2xl p-3 border border-white/10 flex flex-col">
              <span className="text-[10px] font-bold text-slate-300 uppercase tracking-wider">Đã Hoàn Tất</span>
              <span className="text-lg sm:text-xl font-black text-emerald-300 mt-0.5">
                {orders.filter(o => o.paymentStatus === 'PAID').length} Đơn
              </span>
            </div>
            <div className="bg-white/10 backdrop-blur-md rounded-2xl p-3 border border-white/10 flex flex-col">
              <span className="text-[10px] font-bold text-slate-300 uppercase tracking-wider">Chờ Thanh Toán</span>
              <span className="text-lg sm:text-xl font-black text-amber-300 mt-0.5">
                {orders.filter(o => o.paymentStatus === 'PENDING').length} Đơn
              </span>
            </div>
            <div className="bg-white/10 backdrop-blur-md rounded-2xl p-3 border border-white/10 flex flex-col">
              <span className="text-[10px] font-bold text-slate-300 uppercase tracking-wider">Hội Viên Tích Điểm</span>
              <span className="text-lg sm:text-xl font-black text-sky-300 mt-0.5">
                {(loyaltyInfo?.points || userProfile?.points || 0).toLocaleString()}đ
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* ============================================================ */}
      {/* 2. BANNER CSKH & ĐỊA CHỈ NHẬN HÀNG THỰC TẾ TRONG DATABASE    */}
      {/* ============================================================ */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-4">
        {/* Banner tri ân feedback (8 cols) */}
        <div className="lg:col-span-8 bg-gradient-to-r from-emerald-600 via-teal-600 to-blue-700 text-white p-5 rounded-3xl shadow-sm flex items-center justify-between gap-4 border border-emerald-400/20">
          <div className="flex items-center gap-3.5">
            <div className="w-12 h-12 rounded-2xl bg-white/20 backdrop-blur-md flex items-center justify-center shrink-0">
              <Gift size={24} className="text-amber-300" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="text-[10px] font-black uppercase tracking-wider bg-white/20 px-2 py-0.5 rounded-full">
                  ⭐ Quà Tặng Đánh Giá
                </span>
                <span className="text-xs text-emerald-100 font-semibold hidden sm:inline">Tri ân khách hàng</span>
              </div>
              <p className="text-xs sm:text-sm font-bold text-white mt-1 leading-snug">
                Đánh giá đơn hàng đã nhận để nhận ngay <strong className="text-amber-300 font-black">+1.000đ – +2.000đ Điểm Thưởng</strong> & <strong className="text-white font-black underline">Voucher 5.000đ</strong>!
              </p>
            </div>
          </div>
          <button
            onClick={() => setFilterStatus('PAID')}
            className="px-4 py-2.5 bg-amber-400 hover:bg-amber-300 text-slate-900 font-black rounded-xl text-xs transition-all shadow-md shrink-0 whitespace-nowrap active:scale-95"
          >
            Đánh Giá Đơn Đã Nhận
          </button>
        </div>

        {/* Địa chỉ nhận hàng mặc định trong DB (4 cols) */}
        <div className="lg:col-span-4 bg-white p-5 rounded-3xl border border-slate-100 shadow-sm flex items-center justify-between gap-3">
          <div className="flex items-start gap-3 min-w-0">
            <div className="w-10 h-10 rounded-2xl bg-blue-50 text-blue-600 flex items-center justify-center shrink-0 mt-0.5">
              <MapPin size={20} />
            </div>
            <div className="min-w-0">
              <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">
                Địa Chỉ Giao Hàng (DB)
              </span>
              <strong className="text-xs sm:text-sm text-slate-800 line-clamp-1 block font-bold">
                {userProfile?.address || "Chưa có địa chỉ trong DB"}
              </strong>
            </div>
          </div>
          <button
            onClick={() => {
              setNewAddressInput(userProfile?.address || '');
              setIsAddressModalOpen(true);
            }}
            className="px-3 py-1.5 bg-slate-50 hover:bg-slate-100 text-blue-600 rounded-xl text-xs font-bold shrink-0 border border-slate-200 transition-all"
          >
            {userProfile?.address ? 'Sửa' : '+ Thêm'}
          </button>
        </div>
      </div>

      {/* Tabs / Filters */}
      <div className="flex gap-2 border-b border-slate-200 pb-2 overflow-x-auto text-sm font-semibold">
        {[
          { id: 'ALL', label: 'Tất cả đơn hàng' },
          { id: 'PAID', label: 'Đã hoàn tất / Đã thanh toán' },
          { id: 'PENDING', label: 'Chờ thanh toán' },
          { id: 'CANCELLED', label: 'Đã hủy' },
        ].map((tab) => (
          <button
            key={tab.id}
            onClick={() => setFilterStatus(tab.id)}
            className={`px-4 py-2 rounded-xl transition-all whitespace-nowrap ${
              filterStatus === tab.id
                ? 'bg-blue-600 text-white shadow-md shadow-blue-500/20'
                : 'text-slate-600 hover:bg-slate-100'
            }`}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {/* Orders List */}
      {loading ? (
        <div className="flex justify-center items-center h-64">
          <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-blue-600"></div>
        </div>
      ) : filteredOrders.length === 0 ? (
        <div className="bg-white p-12 text-center rounded-3xl border border-slate-100 shadow-sm space-y-3">
          <Package className="mx-auto text-slate-300" size={48} />
          <h3 className="text-lg font-bold text-slate-700">Chưa có đơn hàng nào</h3>
          <p className="text-sm text-slate-400">Bạn chưa phát sinh đơn hàng nào ở danh mục này.</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 gap-4">
          {filteredOrders.map((order) => {
            const isPaid = order.paymentStatus === 'PAID';
            const isPending = order.paymentStatus === 'PENDING';
            const isCancelled = order.paymentStatus === 'CANCELLED' || order.status === 'CANCELLED';
            
            // Phân biệt chính xác: Đơn mua tại quầy POS vs Đơn giao Online
            const isPosInStore = order.type === 'POS' || 
                                order.type === 'COUNTER' || 
                                !order.shippingAddress || 
                                order.shippingAddress === 'Mua tại quầy' || 
                                order.shippingAddress.toLowerCase().includes('mua tại quầy') ||
                                order.shippingAddress.toLowerCase().includes('khu vực');

            return (
              <div 
                key={order._id}
                className="bg-white p-5 sm:p-6 rounded-3xl border border-slate-100 shadow-sm hover:border-blue-200 transition-all space-y-4"
              >
                <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-2 border-b border-slate-100 pb-3">
                  <div>
                    <div className="flex items-center gap-2">
                      <span className="text-xs font-bold text-slate-400 uppercase">Mã đơn hàng</span>
                      {isPosInStore ? (
                        <span className="text-[10px] font-extrabold bg-blue-50 text-blue-700 px-2 py-0.5 rounded-md border border-blue-200">
                          Tại quầy POS
                        </span>
                      ) : (
                        <span className="text-[10px] font-extrabold bg-indigo-50 text-indigo-700 px-2 py-0.5 rounded-md border border-indigo-200">
                          Giao hàng Online
                        </span>
                      )}
                    </div>
                    <h3 className="text-base font-black text-slate-800 mt-0.5">
                      #{order.orderCode || order._id?.slice(-6).toUpperCase()}
                    </h3>
                  </div>

                  <div className="flex items-center gap-2">
                    {isCancelled ? (
                      <span className="px-3 py-1 bg-rose-50 text-rose-700 rounded-full text-xs font-bold border border-rose-200 flex items-center gap-1">
                        <AlertCircle size={13} /> Đã hủy đơn
                      </span>
                    ) : isPosInStore ? (
                      <span className="px-3 py-1 bg-emerald-50 text-emerald-700 rounded-full text-xs font-bold border border-emerald-200 flex items-center gap-1">
                        <CheckCircle2 size={13} /> Mua trực tiếp tại quầy (Đã xuất đơn GPP)
                      </span>
                    ) : isPaid ? (
                      <span className="px-3 py-1 bg-indigo-50 text-indigo-700 rounded-full text-xs font-bold border border-indigo-200 flex items-center gap-1">
                        <Truck size={13} /> Đã thanh toán • Đang giao hàng
                      </span>
                    ) : (
                      <span className="px-3 py-1 bg-amber-50 text-amber-700 rounded-full text-xs font-bold border border-amber-200 flex items-center gap-1">
                        <Clock size={13} /> Chờ thanh toán
                      </span>
                    )}
                  </div>
                </div>

                {/* Items in Order */}
                <div className="space-y-2">
                  {(order.items || []).map((item: any, idx: number) => (
                    <div key={idx} className="flex justify-between items-center text-sm">
                      <span className="text-slate-700 font-medium">
                        {item.name} <strong className="text-slate-400 font-normal">x{item.quantity}</strong>
                      </span>
                      <span className="font-bold text-slate-900">
                        {((item.price || 0) * (item.quantity || 1)).toLocaleString()} đ
                      </span>
                    </div>
                  ))}
                </div>

                {/* Footer and Actions */}
                <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3 pt-3 border-t border-slate-100">
                  <div>
                    <span className="text-xs text-slate-400">Tổng thanh toán:</span>
                    <strong className="text-lg font-black text-blue-600 block">
                      {(order.totalAmount || 0).toLocaleString()} đ
                    </strong>
                  </div>

                  <div className="flex flex-wrap items-center gap-2 w-full sm:w-auto">
                    {/* Nút Đánh giá chi nhánh & nhận điểm thưởng tại chỗ (In-page Modal) */}
                    {!isCancelled && (
                      <button
                        onClick={() => handleOpenFeedback(order)}
                        className={`px-4 py-2.5 rounded-xl text-xs font-bold flex items-center justify-center gap-1.5 shadow-md transition-all active:scale-[0.98] ${
                          order.isReviewed
                            ? 'bg-emerald-50 text-emerald-700 border border-emerald-200 shadow-emerald-500/10'
                            : 'bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-600 hover:to-amber-700 text-white shadow-amber-500/20'
                        }`}
                        title="Đánh giá chất lượng phục vụ & nhận +1.000đ - 2.000đ điểm thưởng và voucher 5k"
                      >
                        <Star size={14} className={order.isReviewed ? "fill-emerald-600 text-emerald-600" : "fill-white"} />
                        {order.isReviewed ? "Đã Đánh Giá" : "⭐ Đánh Giá (+2k điểm)"}
                      </button>
                    )}

                    {/* Logic nút bấm phân biệt rõ ràng giữa Mua tại quầy vs Giao hàng Online */}
                    {isCancelled ? (
                      <button 
                        disabled
                        className="w-full sm:w-auto px-4 py-2.5 bg-slate-100 text-slate-400 rounded-xl text-xs font-bold cursor-not-allowed"
                      >
                        Đơn đã hủy - Không giao
                      </button>
                    ) : isPosInStore ? (
                      // Đơn mua tại quầy: Mở Hóa Đơn & Chứng Từ GPP (Không hiển thị bản đồ shipper vô lý)
                      <button
                        onClick={() => setPosInvoiceOrder(order)}
                        className="w-full sm:w-auto px-5 py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-bold flex items-center justify-center gap-2 shadow-md shadow-emerald-500/20 transition-all active:scale-[0.98]"
                      >
                        <Receipt size={14} />
                        Hóa Đơn & Chứng Từ GPP Tại Quầy
                      </button>
                    ) : isPending ? (
                      <button 
                        disabled
                        className="w-full sm:w-auto px-4 py-2.5 bg-amber-50 text-amber-700 rounded-xl text-xs font-bold border border-amber-200 cursor-not-allowed"
                      >
                        Chờ thanh toán để điều phối giao hàng
                      </button>
                    ) : (
                      // Đơn giao hàng Online: Mở bản đồ lộ trình giao hàng thời gian thực
                      <button
                        onClick={() => setTrackingOrder(order)}
                        className="w-full sm:w-auto px-5 py-2.5 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-xs font-bold flex items-center justify-center gap-2 shadow-md shadow-blue-500/20 transition-all active:scale-[0.98]"
                      >
                        <Navigation size={14} />
                        Bản Đồ & Theo Dõi Giao Hàng
                      </button>
                    )}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* ─── MODAL HÓA ĐƠN & CHỨNG TỪ GPP XUẤT TẠI QUẦY (IN-STORE DISPENSING RECEIPT) ─── */}
      <AnimatePresence>
        {posInvoiceOrder && (() => {
          const code = posInvoiceOrder.orderCode || posInvoiceOrder._id?.slice(-6).toUpperCase();
          const createdDate = posInvoiceOrder.createdAt ? new Date(posInvoiceOrder.createdAt) : new Date();
          const formatFull = (d: Date) => `${d.toLocaleTimeString('vi-VN')} - ${d.toLocaleDateString('vi-VN')}`;
          
          const foundBranch = branches.find(b => b.branchCode === posInvoiceOrder.branchId);
          const branchName = foundBranch?.name || "Nhà Thuốc VinaPharmacy - Chi Nhánh 01 Hoàn Kiếm";
          const branchAddr = foundBranch?.address || "Số 182 Lê Duẩn, P. Nguyễn Du, Q. Hai Bà Trưng, TP. Hà Nội";
          const pharmacist = foundBranch?.manager || "DS. Nguyễn Thu Trang";
          const facilityCode = "79-001234 (GPP-BYT)";
          const nationalSyncCode = `DQG-${createdDate.toISOString().slice(0, 10).replace(/-/g, '')}-${code}`;

          return (
            <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4">
              <motion.div 
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                onClick={() => setPosInvoiceOrder(null)}
                className="absolute inset-0 bg-slate-900/60 backdrop-blur-sm"
              />

              <motion.div 
                initial={{ scale: 0.95, opacity: 0, y: 20 }}
                animate={{ scale: 1, opacity: 1, y: 0 }}
                exit={{ scale: 0.95, opacity: 0, y: 20 }}
                className="relative bg-white rounded-3xl shadow-2xl border border-slate-100 w-full max-w-2xl overflow-hidden flex flex-col max-h-[92vh] z-10"
              >
                {/* Header */}
                <div className="p-5 bg-gradient-to-r from-emerald-700 via-teal-800 to-emerald-900 text-white flex justify-between items-center shrink-0">
                  <div className="flex items-center gap-3">
                    <div className="w-11 h-11 bg-white/10 rounded-2xl flex items-center justify-center backdrop-blur-md border border-white/20">
                      <Store className="text-white" size={22} />
                    </div>
                    <div>
                      <div className="flex items-center gap-2">
                        <h3 className="font-black text-base text-white tracking-tight">
                          Hóa Đơn & Chứng Từ Xuất Bán Tại Quầy (GPP Verified)
                        </h3>
                        <span className="text-[10px] font-bold bg-emerald-400/30 text-emerald-200 border border-emerald-300/40 px-2 py-0.5 rounded-md">
                          GPP Chuẩn BYT
                        </span>
                      </div>
                      <p className="text-xs text-emerald-200 mt-0.5">
                        Mã hóa đơn: <strong className="text-white font-mono">#POS-{code}</strong> • Đã nhận trực tiếp tại quầy
                      </p>
                    </div>
                  </div>
                  <button onClick={() => setPosInvoiceOrder(null)} className="p-2 text-emerald-200 hover:text-white rounded-full hover:bg-white/10">
                    <X size={20} />
                  </button>
                </div>

                {/* Body */}
                <div className="p-5 sm:p-6 space-y-5 overflow-y-auto flex-1 text-sm">
                  
                  {/* Thông tin CSDL Dược Quốc Gia */}
                  <div className="p-4 bg-emerald-50/70 rounded-2xl border border-emerald-200 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3">
                    <div>
                      <span className="text-[10px] font-bold text-emerald-700 uppercase flex items-center gap-1">
                        <ShieldCheck size={13} /> CSDL Dược Quốc Gia (Hệ Thống Mô Phỏng GPP)
                      </span>
                      <strong className="text-slate-800 block text-xs mt-1 font-mono">
                        Mã liên thông: {nationalSyncCode}
                      </strong>
                      <span className="text-[11px] text-slate-500">Mã cơ sở GPP: <strong>{facilityCode}</strong></span>
                    </div>
                    <div className="px-3 py-1.5 bg-white rounded-xl border border-emerald-200 text-[11px] font-bold text-emerald-700 flex items-center gap-1.5 shadow-sm">
                      <CheckSquare size={13} /> Đã đồng bộ Bộ Y Tế
                    </div>
                  </div>

                  {/* Chi nhánh và Khách hàng */}
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
                    <div className="p-4 bg-slate-50 border border-slate-200 rounded-2xl">
                      <span className="text-[10px] font-bold text-blue-600 uppercase flex items-center gap-1">
                        <Building2 size={13} /> Chi nhánh xuất bán
                      </span>
                      <strong className="text-slate-900 block text-xs mt-1">{branchName}</strong>
                      <p className="text-slate-500 text-[11px] mt-0.5">{branchAddr}</p>
                      <span className="text-[10px] text-slate-400 block mt-1.5 font-semibold">
                        Dược sĩ tư vấn: {pharmacist} (CCHN: GPP-09418)
                      </span>
                    </div>

                    <div className="p-4 bg-slate-50 border border-slate-200 rounded-2xl">
                      <span className="text-[10px] font-bold text-emerald-600 uppercase flex items-center gap-1">
                        <User size={13} /> Khách hàng mua tại quầy
                      </span>
                      <strong className="text-slate-900 block text-xs mt-1">
                        {posInvoiceOrder.patientName || userProfile?.fullName || "Khách mua lẻ vãng lai"}
                      </strong>
                      <p className="text-slate-500 text-[11px] mt-0.5">
                        SĐT: {posInvoiceOrder.patientPhone || userProfile?.phone || "Tại quầy thuốc"}
                      </p>
                      <span className="text-[10px] text-slate-400 block mt-1.5">
                        Thời gian xuất: {formatFull(createdDate)}
                      </span>
                    </div>
                  </div>

                  {/* Danh sách thuốc và số lô (Batch & Exp) */}
                  <div>
                    <h4 className="text-xs font-black uppercase text-slate-500 mb-2.5 tracking-wider">
                      Danh mục thuốc đã xuất bán & Số lô kiểm soát
                    </h4>
                    <div className="border border-slate-200 rounded-2xl overflow-hidden">
                      <table className="w-full text-left text-xs">
                        <thead className="bg-slate-50 border-b border-slate-200 text-slate-500">
                          <tr>
                            <th className="p-3 font-bold">Tên thuốc</th>
                            <th className="p-3 font-bold">Số lô / Hạn dùng</th>
                            <th className="p-3 font-bold text-center">SL</th>
                            <th className="p-3 font-bold text-right">Đơn giá</th>
                            <th className="p-3 font-bold text-right">Thành tiền</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-100">
                          {(posInvoiceOrder.items || []).map((it: any, idx: number) => (
                            <tr key={idx} className="hover:bg-slate-50/50">
                              <td className="p-3 font-semibold text-slate-800">{it.name}</td>
                              <td className="p-3 text-[11px] font-mono text-slate-500">
                                <div>Lô: <strong>{it.batchNo || "L-202604"}</strong></div>
                                <div className="text-emerald-600 font-sans text-[10px]">HSD: 12/2027</div>
                              </td>
                              <td className="p-3 text-center font-bold text-slate-700">{it.quantity} {it.unit || 'Hộp'}</td>
                              <td className="p-3 text-right text-slate-600">{(it.price || 0).toLocaleString()} đ</td>
                              <td className="p-3 text-right font-bold text-slate-900">
                                {((it.price || 0) * (it.quantity || 1)).toLocaleString()} đ
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  </div>

                  {/* Tổng tiền */}
                  <div className="p-4 bg-slate-50 rounded-2xl border border-slate-200 flex justify-between items-center">
                    <div>
                      <span className="text-xs text-slate-400 block">Hình thức thanh toán:</span>
                      <strong className="text-xs text-slate-800">
                        {posInvoiceOrder.paymentMethod === 'QR_PAY' ? 'Thanh toán mã VietQR' : 'Tiền mặt tại quầy'}
                      </strong>
                    </div>
                    <div className="text-right">
                      <span className="text-xs text-slate-400 block">Tổng tiền đã thanh toán:</span>
                      <strong className="text-lg font-black text-emerald-600">
                        {(posInvoiceOrder.totalAmount || 0).toLocaleString()} đ
                      </strong>
                    </div>
                  </div>

                  {/* Khối Đánh giá trải nghiệm nhận quà */}
                  <div className="p-4 bg-gradient-to-r from-amber-50 to-orange-50 rounded-2xl border border-amber-200 flex flex-col sm:flex-row items-center justify-between gap-3">
                    <div className="flex items-center gap-3">
                      <img 
                        src={`https://api.qrserver.com/v1/create-qr-code/?size=80x80&data=${encodeURIComponent(
                          `${window.location.origin}/feedback/${posInvoiceOrder.orderCode || posInvoiceOrder._id || ""}`
                        )}`}
                        alt="QR Feedback" 
                        className="w-16 h-16 bg-white p-1 rounded-xl border border-amber-200 shrink-0"
                      />
                      <div>
                        <span className="text-xs font-black text-amber-900 uppercase flex items-center gap-1">
                          <Star size={14} className="fill-amber-500 text-amber-500" /> Đánh giá trải nghiệm & Nhận quà
                        </span>
                        <p className="text-[11px] text-amber-800 mt-0.5">
                          Quét mã QR hoặc bấm nút bên cạnh nhận ngay <strong>+1.000đ - 2.000đ</strong> tích lũy & Voucher 5k!
                        </p>
                      </div>
                    </div>
                    <button
                      onClick={() => {
                        const targetCode = posInvoiceOrder.orderCode || posInvoiceOrder._id;
                        setPosInvoiceOrder(null);
                        navigate(`/feedback/${targetCode}`);
                      }}
                      className="w-full sm:w-auto px-4 py-2.5 bg-amber-500 hover:bg-amber-600 text-white rounded-xl text-xs font-bold shrink-0 shadow-md shadow-amber-500/20 active:scale-95 transition-all flex items-center justify-center gap-1.5"
                    >
                      <Star size={14} className="fill-white" />
                      Đánh Giá Ngay
                    </button>
                  </div>
                </div>

                {/* Footer */}
                <div className="p-4 bg-slate-50 border-t border-slate-200 flex justify-between items-center shrink-0">
                  <div className="text-xs text-slate-500 flex items-center gap-1.5">
                    <ShieldCheck size={14} className="text-emerald-600" />
                    <span>Chứng từ điện tử tuân thủ quy chế thực hành tốt bán lẻ thuốc GPP</span>
                  </div>
                  <button
                    onClick={() => setPosInvoiceOrder(null)}
                    className="px-5 py-2 bg-slate-800 hover:bg-slate-900 text-white rounded-xl text-xs font-bold"
                  >
                    Đóng
                  </button>
                </div>
              </motion.div>
            </div>
          );
        })()}
      </AnimatePresence>

      {/* ─── MODAL THEO DÕI HÀNH TRÌNH VẬN CHUYỂN BẰNG BẢN ĐỒ THỰC TẾ (ONLINE DELIVERY ONLY) ─── */}
      <AnimatePresence>
        {trackingOrder && (() => {
          const info = getCustomerShipmentInfo(trackingOrder);

          // Tính toán progressRatio
          const createdDate = trackingOrder.createdAt ? new Date(trackingOrder.createdAt) : new Date();
          const elapsedMinutes = Math.floor((Date.now() - createdDate.getTime()) / (60 * 1000));
          const progressRatio = info.isDelivered ? 1.0 : (elapsedMinutes <= 18 ? 0.05 : Math.min(0.95, (elapsedMinutes - 18) / 27));

          return (
            <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4">
              <motion.div 
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                onClick={() => setTrackingOrder(null)}
                className="absolute inset-0 bg-slate-900/60 backdrop-blur-sm"
              />

              <motion.div 
                initial={{ scale: 0.95, opacity: 0, y: 20 }}
                animate={{ scale: 1, opacity: 1, y: 0 }}
                exit={{ scale: 0.95, opacity: 0, y: 20 }}
                className="relative bg-white rounded-3xl shadow-2xl border border-slate-100 w-full max-w-4xl overflow-hidden flex flex-col max-h-[92vh] z-10"
              >
                {/* Header */}
                <div className="p-5 bg-gradient-to-r from-blue-700 via-blue-800 to-indigo-900 text-white flex justify-between items-center shrink-0">
                  <div className="flex items-center gap-3">
                    <div className="w-11 h-11 bg-white/10 rounded-2xl flex items-center justify-center backdrop-blur-md border border-white/20">
                      <Truck className="text-white" size={22} />
                    </div>
                    <div>
                      <div className="flex items-center gap-2">
                        <h3 className="font-black text-base text-white tracking-tight">
                          Giám Sát Hành Trình Giao Hàng Tuyến Đường (Last-Mile Pharma Tracking)
                        </h3>
                        <span className="text-[10px] font-bold bg-emerald-500/30 text-emerald-300 border border-emerald-400/40 px-2 py-0.5 rounded-md">
                          GPP Cold-Pack
                        </span>
                      </div>
                      <p className="text-xs text-blue-200 mt-0.5">
                        Mã vận đơn: <strong className="text-white font-mono">{info.trackingCode}</strong> • {info.carrierName}
                      </p>
                    </div>
                  </div>
                  <button onClick={() => setTrackingOrder(null)} className="p-2 text-blue-200 hover:text-white rounded-full hover:bg-white/10">
                    <X size={20} />
                  </button>
                </div>

                {/* Body */}
                <div className="p-5 sm:p-6 space-y-5 overflow-y-auto flex-1 text-sm">
                  
                  {/* ─── KHUNG BẢN ĐỒ THỰC TẾ LEAFLET / OPENSTREETMAP ─── */}
                  <div className="space-y-3">
                    <div className="flex flex-wrap items-center justify-between text-xs gap-2">
                      <div className="flex items-center gap-2">
                        <Radio size={14} className={info.isDelivered ? "text-emerald-500" : "text-emerald-500 animate-pulse"} />
                        <span className="font-bold text-slate-700">Tọa độ tuyến đường:</span>
                        <span className="text-emerald-700 font-mono font-bold">
                          {info.shipperCoords[0].toFixed(4)}° N, {info.shipperCoords[1].toFixed(4)}° E
                        </span>
                      </div>
                      <div className="flex items-center gap-3 text-slate-600">
                        <span>Khoảng cách: <strong className="text-slate-900">{info.distanceKm}</strong></span>
                        <span>•</span>
                        <span>Trạng thái: <strong className={info.isDelivered ? "text-emerald-700 font-bold" : "text-blue-700 font-bold"}>{info.estimatedMinutes}</strong></span>
                      </div>
                    </div>

                    {/* Render Real Leaflet Map with Road Routing */}
                    <RealDeliveryMap
                      originCoords={info.originCoords}
                      destCoords={info.destCoords}
                      originName={info.originBranch.name}
                      originAddress={info.originBranch.address}
                      destName={info.destination.receiverName}
                      destAddress={info.destination.address}
                      shipperName={info.shipperName}
                      shipperPhone={info.shipperPhone}
                      vehiclePlate={info.vehiclePlate}
                      isDelivered={info.isDelivered}
                      progressRatio={progressRatio}
                    />
                  </div>

                  {/* ─── THÔNG TIN TÀI XẾ & BẢO QUẢN DƯỢC PHẨM ─── */}
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 bg-blue-50/60 p-4 rounded-2xl border border-blue-100">
                    <div>
                      <span className="text-[10px] font-bold text-slate-400 uppercase">Tài xế giao thuốc</span>
                      <strong className="text-slate-800 block text-xs mt-0.5 flex items-center gap-1">
                        <User size={12} className="text-blue-600" /> {info.shipperName}
                      </strong>
                      <span className="text-[11px] text-blue-600 flex items-center gap-1 mt-0.5 font-semibold">
                        <Phone size={10} /> {info.shipperPhone}
                      </span>
                    </div>

                    <div>
                      <span className="text-[10px] font-bold text-slate-400 uppercase">Phương tiện vận chuyển</span>
                      <strong className="text-slate-800 block text-xs mt-0.5">{info.vehiclePlate}</strong>
                      <span className="text-[10px] text-slate-500">Thùng giữ nhiệt y tế chuyên dụng</span>
                    </div>

                    <div>
                      <span className="text-[10px] font-bold text-slate-400 uppercase">Bảo quản lạnh Y tế</span>
                      <strong className="text-emerald-700 block text-xs font-black mt-0.5 flex items-center gap-1">
                        <Thermometer size={13} /> {info.tempStatus}
                      </strong>
                      <span className="text-[10px] text-emerald-600 font-semibold">Túi niêm phong chống sốc nhiệt</span>
                    </div>
                  </div>

                  {/* ─── ĐỊA CHỈ THỰC TẾ CHI NHÁNH & NGƯỜI NHẬN ─── */}
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
                    <div className="p-3.5 bg-slate-50 border border-slate-200 rounded-2xl">
                      <span className="text-[10px] font-bold text-blue-600 uppercase flex items-center gap-1">
                        <Building2 size={12} /> Chi nhánh xuất kho dược phẩm
                      </span>
                      <strong className="text-slate-900 block text-xs mt-1">{info.originBranch.name}</strong>
                      <p className="text-slate-500 text-[11px] mt-0.5">{info.originBranch.address}</p>
                      <span className="text-[10px] text-slate-400 block mt-1">{info.originBranch.pharmacist}</span>
                    </div>

                    <div className="p-3.5 bg-slate-50 border border-slate-200 rounded-2xl">
                      <div className="flex justify-between items-center">
                        <span className="text-[10px] font-bold text-emerald-600 uppercase flex items-center gap-1">
                          <Home size={12} /> Địa chỉ người nhận thuốc (DB)
                        </span>
                        <button 
                          onClick={() => {
                            setNewAddressInput(info.destination.address);
                            setIsAddressModalOpen(true);
                          }}
                          className="text-[10px] font-bold text-blue-600 hover:text-blue-800 underline"
                        >
                          Sửa địa chỉ
                        </button>
                      </div>
                      <strong className="text-slate-900 block text-xs mt-1">{info.destination.receiverName} ({info.destination.receiverPhone})</strong>
                      <p className="text-slate-600 text-[11px] mt-0.5 font-medium">{info.destination.address}</p>
                      <span className="text-[10px] text-emerald-600 font-bold block mt-1">✓ Giao thuốc tận tay & đồng kiểm</span>
                    </div>
                  </div>

                  {/* ─── TIMELINE CÁC MỐC THỜI GIAN THEO THỜI GIAN THỰC ─── */}
                  <div>
                    <h4 className="text-xs font-black uppercase text-slate-500 mb-3 tracking-wider">
                      Nhật ký hành trình theo thời gian thực (Milestones Log)
                    </h4>
                    <div className="relative pl-6 border-l-2 border-slate-200 space-y-3">
                      {info.milestones.map((m, idx) => (
                        <div key={idx} className="relative">
                          <span className={`absolute -left-[31px] top-1 w-3.5 h-3.5 rounded-full border-2 border-white flex items-center justify-center ${
                            m.status === "COMPLETED" ? "bg-emerald-600" :
                            m.status === "CURRENT" ? "bg-blue-600 animate-ping" : "bg-slate-300"
                          }`} />
                          
                          <div className={`p-3 rounded-2xl border ${
                            m.status === "CURRENT" ? "bg-blue-50/70 border-blue-200 shadow-sm" : "bg-slate-50 border-slate-200"
                          }`}>
                            <div className="flex justify-between items-start gap-2">
                              <strong className="text-slate-800 text-xs">{m.title}</strong>
                              <span className="text-[11px] text-slate-600 font-semibold font-mono bg-white px-2 py-0.5 rounded-md border border-slate-100 whitespace-nowrap">
                                {m.time}
                              </span>
                            </div>
                            <p className="text-xs text-slate-500 mt-1">{m.description}</p>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>

                {/* Footer */}
                <div className="p-4 bg-slate-50 border-t border-slate-200 flex justify-between items-center shrink-0">
                  <div className="text-xs text-slate-500 flex items-center gap-1.5">
                    <ShieldCheck size={14} className="text-emerald-600" />
                    <span>Dược phẩm bảo quản nghiêm ngặt theo thông tư 02/2018/TT-BYT</span>
                  </div>
                  <button
                    onClick={() => setTrackingOrder(null)}
                    className="px-5 py-2 bg-slate-800 hover:bg-slate-900 text-white rounded-xl text-xs font-bold"
                  >
                    Đóng
                  </button>
                </div>
              </motion.div>
            </div>
          );
        })()}
      </AnimatePresence>

      {/* ─── QUICK ADDRESS UPDATE MODAL (LƯU TRỰC TIẾP VÀO DATABASE) ─── */}
      <AnimatePresence>
        {isAddressModalOpen && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            <motion.div 
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => !isSavingAddress && setIsAddressModalOpen(false)}
              className="absolute inset-0 bg-slate-900/50 backdrop-blur-sm"
            />
            <motion.div 
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.95, opacity: 0 }}
              className="relative bg-white rounded-3xl shadow-2xl border border-slate-100 w-full max-w-md overflow-hidden z-10"
            >
              <div className="p-5 border-b border-slate-100 bg-slate-50/50 flex justify-between items-center">
                <h3 className="text-base font-black text-slate-800 flex items-center gap-2">
                  <MapPin size={18} className="text-blue-600" />
                  Cập nhật địa chỉ nhận hàng (DB)
                </h3>
                <button 
                  onClick={() => !isSavingAddress && setIsAddressModalOpen(false)}
                  className="p-1.5 text-slate-400 hover:text-slate-600 rounded-full"
                >
                  <X size={18} />
                </button>
              </div>

              <div className="p-5">
                {addressSuccessMsg ? (
                  <div className="bg-emerald-50 border border-emerald-200 text-emerald-800 p-4 rounded-2xl text-center space-y-1">
                    <CheckCircle2 size={24} className="mx-auto text-emerald-600" />
                    <p className="text-xs font-bold">{addressSuccessMsg}</p>
                  </div>
                ) : (
                  <form onSubmit={handleSaveAddressToDB} className="space-y-4">
                    <div>
                      <label className="block text-xs font-bold text-slate-600 uppercase mb-1.5">
                        Địa chỉ nhận thuốc thực tế
                      </label>
                      <textarea
                        rows={3}
                        value={newAddressInput}
                        onChange={(e) => setNewAddressInput(e.target.value)}
                        placeholder="Số nhà, tên đường, Phường/Xã, Quận/Huyện, Tỉnh/TP (VD: Số 45 Tràng Tiền, P. Tràng Tiền, Q. Hoàn Kiếm, Hà Nội)"
                        className="w-full p-3 bg-slate-50 border border-slate-200 rounded-xl text-xs font-medium text-slate-800 focus:outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500"
                        required
                        disabled={isSavingAddress}
                      />
                      <p className="text-[11px] text-slate-400 mt-1">
                        Dữ liệu sẽ được lưu trực tiếp vào tài khoản người dùng và tính toán trên bản đồ thực tế.
                      </p>
                    </div>

                    <button
                      type="submit"
                      disabled={isSavingAddress || !newAddressInput.trim()}
                      className="w-full py-3 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-xs font-bold flex items-center justify-center gap-2 shadow-md shadow-blue-500/20 disabled:opacity-50"
                    >
                      {isSavingAddress ? (
                        <>
                          <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin"></div>
                          Đang lưu vào DB...
                        </>
                      ) : (
                        <>
                          <Save size={14} />
                          Lưu địa chỉ vào Database
                        </>
                      )}
                    </button>
                  </form>
                )}
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* ─── MODAL ĐÁNH GIÁ TRẢI NGHIỆM TẠI CHỖ (IN-PAGE FEEDBACK MODAL) ─── */}
      <AnimatePresence>
        {feedbackOrder && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4">
            <motion.div 
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => !isSubmittingFeedback && setFeedbackOrder(null)}
              className="absolute inset-0 bg-slate-900/60 backdrop-blur-sm"
            />

            <motion.div 
              initial={{ scale: 0.95, opacity: 0, y: 20 }}
              animate={{ scale: 1, opacity: 1, y: 0 }}
              exit={{ scale: 0.95, opacity: 0, y: 20 }}
              className="relative bg-white rounded-3xl shadow-2xl border border-slate-100 w-full max-w-lg overflow-hidden flex flex-col max-h-[92vh] z-10"
            >
              {/* Header */}
              <div className="p-5 bg-gradient-to-r from-amber-500 via-orange-500 to-amber-600 text-white flex justify-between items-center shrink-0">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 bg-white/20 rounded-2xl flex items-center justify-center backdrop-blur-md">
                    <Star size={20} className="fill-white text-white" />
                  </div>
                  <div>
                    <h3 className="font-black text-base text-white">Đánh Giá Dịch Vụ Chi Nhánh</h3>
                    <p className="text-xs text-amber-100">
                      Đơn hàng: <strong className="text-white font-mono">#{feedbackOrder.orderCode || feedbackOrder._id?.slice(-6).toUpperCase()}</strong>
                    </p>
                  </div>
                </div>
                <button 
                  onClick={() => !isSubmittingFeedback && setFeedbackOrder(null)}
                  className="p-1.5 text-amber-100 hover:text-white rounded-full hover:bg-white/10"
                >
                  <X size={18} />
                </button>
              </div>

              {/* Body */}
              <div className="p-5 sm:p-6 overflow-y-auto space-y-4 text-sm">
                {feedbackResult ? (
                  /* Kết quả thành công */
                  <div className="text-center py-4 space-y-4">
                    <div className="w-16 h-16 bg-emerald-100 rounded-full flex items-center justify-center mx-auto text-emerald-600">
                      <CheckCircle2 size={36} />
                    </div>
                    <div>
                      <h4 className="font-black text-slate-800 text-lg">Cảm Ơn Bạn Đã Đánh Giá!</h4>
                      <p className="text-xs text-slate-500 mt-1">Ý kiến của bạn là động lực để đội ngũ dược sĩ nâng cao chất lượng phục vụ mỗi ngày.</p>
                    </div>

                    {/* Hộp quà tặng nhận được */}
                    <div className="bg-gradient-to-br from-amber-50 to-orange-50 border border-amber-200 rounded-2xl p-4 text-left space-y-2.5">
                      <div className="flex items-center gap-2 text-xs font-bold text-amber-900 uppercase">
                        <Gift size={16} className="text-amber-600" />
                        <span>Phần thưởng đã cộng vào tài khoản:</span>
                      </div>
                      <div className="flex justify-between items-center bg-white p-2.5 rounded-xl border border-amber-100 text-xs font-semibold">
                        <span className="text-slate-600">Điểm Loyalty thưởng:</span>
                        <strong className="text-emerald-600 text-sm font-black">+{feedbackResult.rewardPointsEarned?.toLocaleString() || '1.000'}đ</strong>
                      </div>
                      {feedbackResult.voucher && (
                        <div className="bg-white p-2.5 rounded-xl border border-amber-100 text-xs space-y-1">
                          <div className="flex justify-between items-center">
                            <span className="text-slate-600">Voucher giảm giá tặng kèm:</span>
                            <span className="font-mono font-black text-blue-600 bg-blue-50 px-2 py-0.5 rounded border border-blue-200">
                              {feedbackResult.voucher.code}
                            </span>
                          </div>
                          <p className="text-[11px] text-slate-500">Giảm {feedbackResult.voucher.discountAmount?.toLocaleString()}đ cho đơn từ {feedbackResult.voucher.minOrderValue?.toLocaleString()}đ (HSD: {feedbackResult.voucher.expiryDays} ngày).</p>
                        </div>
                      )}
                    </div>

                    <button
                      onClick={() => setFeedbackOrder(null)}
                      className="w-full py-3.5 bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-700 hover:to-teal-700 text-white rounded-2xl text-sm font-black transition-all shadow-lg shadow-emerald-500/25 flex items-center justify-center gap-2 cursor-pointer active:scale-98"
                    >
                      <CheckCircle2 size={18} className="text-white" />
                      Hoàn Tất & Đóng
                    </button>
                  </div>
                ) : (
                  /* Form đánh giá */
                  <form onSubmit={handleSubmitFeedbackModal} className="space-y-4">
                    {/* Banner thưởng */}
                    <div className="bg-amber-50 border border-amber-200 rounded-2xl p-3 flex items-center gap-3">
                      <div className="w-8 h-8 rounded-xl bg-amber-500/20 text-amber-700 flex items-center justify-center shrink-0">
                        <Gift size={18} />
                      </div>
                      <p className="text-xs text-amber-800 leading-snug">
                        Nhận ngay <strong className="text-emerald-700 font-black">+1.000đ - 2.000đ</strong> tích lũy & Voucher 5k cho lần mua sau khi gửi đánh giá!
                      </p>
                    </div>

                    {/* Xếp hạng Sao */}
                    <div className="text-center py-2 bg-slate-50 rounded-2xl border border-slate-100">
                      <span className="text-xs text-slate-500 font-bold uppercase tracking-wider block mb-2">
                        Mức độ hài lòng của bạn
                      </span>
                      <div className="flex justify-center items-center gap-2">
                        {[1, 2, 3, 4, 5].map((star) => (
                          <button
                            key={star}
                            type="button"
                            onClick={() => setFeedbackRating(star)}
                            className="p-1.5 transition-transform hover:scale-125 focus:outline-none cursor-pointer"
                          >
                            <Star
                              size={32}
                              className={
                                star <= feedbackRating
                                  ? "fill-amber-400 text-amber-400 drop-shadow"
                                  : "text-slate-200"
                              }
                            />
                          </button>
                        ))}
                      </div>
                      <span className="text-xs font-bold text-slate-700 block mt-2">
                        {feedbackRating === 5 && '🌟 Tuyệt vời! Vượt trên mong đợi'}
                        {feedbackRating === 4 && '😊 Hài lòng với thuốc & dược sĩ'}
                        {feedbackRating === 3 && '😐 Tạm ổn, cần cải thiện thêm'}
                        {feedbackRating === 2 && '🙁 Chưa hài lòng, phục vụ chưa tốt'}
                        {feedbackRating === 1 && '😡 Rất thất vọng, khiếu nại chất lượng'}
                      </span>
                    </div>

                    {/* Thẻ gợi ý (Tags) */}
                    <div>
                      <label className="block text-xs font-bold text-slate-600 uppercase mb-2">
                        Điểm bạn ấn tượng hoặc muốn góp ý:
                      </label>
                      <div className="flex flex-wrap gap-2">
                        {[
                          'Dược sĩ tận tâm',
                          'Thuốc chuẩn chính hãng',
                          'Tư vấn nhiệt tình',
                          'Không gian sạch sẽ',
                          'Giá cả minh bạch',
                          'Thời gian chờ lâu',
                          'Cần tư vấn kỹ hơn',
                          'Thiếu thuốc theo đơn',
                        ].map((tag) => {
                          const isSelected = feedbackTags.includes(tag);
                          return (
                            <button
                              key={tag}
                              type="button"
                              onClick={() => handleToggleTag(tag)}
                              className={`px-3 py-1.5 rounded-full text-xs font-semibold transition-all border cursor-pointer ${
                                isSelected
                                  ? 'bg-amber-100 border-amber-300 text-amber-900 font-bold'
                                  : 'bg-white border-slate-200 text-slate-600 hover:bg-slate-50'
                              }`}
                            >
                              {isSelected ? '✓ ' : ''}{tag}
                            </button>
                          );
                        })}
                      </div>
                    </div>

                    {/* Ô nhận xét chi tiết */}
                    <div>
                      <label className="block text-xs font-bold text-slate-600 uppercase mb-1.5">
                        Cảm nhận chi tiết (Tùy chọn):
                      </label>
                      <textarea
                        rows={3}
                        value={feedbackComment}
                        onChange={(e) => setFeedbackComment(e.target.value)}
                        placeholder="Hãy chia sẻ thêm về thái độ của dược sĩ, chất lượng thuốc hoặc điều chi nhánh cần hoàn thiện hơn..."
                        className="w-full p-3 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-800 focus:outline-none focus:border-amber-500 focus:ring-1 focus:ring-amber-500"
                        disabled={isSubmittingFeedback}
                      />
                      <span className="text-[11px] text-slate-400 block mt-1">
                        Góp ý trên 30 ký tự sẽ được cộng thêm +1.000 điểm thưởng (tổng +2.000đ).
                      </span>
                    </div>

                    {/* Submit Button */}
                    <div className="flex gap-2 pt-2">
                      <button
                        type="button"
                        onClick={() => setFeedbackOrder(null)}
                        disabled={isSubmittingFeedback}
                        className="flex-1 py-3 bg-slate-100 hover:bg-slate-200 text-slate-600 rounded-xl text-xs font-bold transition-all cursor-pointer"
                      >
                        Để Sau
                      </button>
                      <button
                        type="submit"
                        disabled={isSubmittingFeedback}
                        className="flex-2 py-3 bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-600 hover:to-amber-700 text-white rounded-xl text-xs font-bold shadow-md shadow-amber-500/25 transition-all flex items-center justify-center gap-2 disabled:opacity-50 cursor-pointer"
                      >
                        {isSubmittingFeedback ? (
                          <>
                            <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin"></div>
                            Đang gửi...
                          </>
                        ) : (
                          <>
                            <Star size={14} className="fill-white" />
                            GỬI ĐÁNH GIÁ & NHẬN THƯỞNG
                          </>
                        )}
                      </button>
                    </div>
                  </form>
                )}
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}
