// ============================================================================
// Bộ Điều Khiển Sơ Đồ Kho 3D Trung Tâm (WarehouseMap3D Container)
// Dự án: WDP301 - Sơ Đồ Kho 3D Central Warehouse
// Kiến trúc camera cố định 2 cấp: OVERVIEW và RACK
// Đảm bảo không giật, không tự mở modal, không rò rỉ GPU memory
// ============================================================================

import React, { useReducer, useState, useEffect, useMemo, useCallback } from 'react';
import { Canvas } from '@react-three/fiber';
import {
  FOV,
  RACK_ORDER,
  RACK_TO_ZONE,
  WarehouseMap3DProps,
  parseWarehouseTargetId,
} from './map3d/constants';
import { viewReducer } from './map3d/store';
import { CameraRig } from './map3d/CameraRig';
import { Floor } from './map3d/Floor';
import { RackModel } from './map3d/RackModel';
import { RackBins } from './map3d/RackBins';
import { Hud } from './map3d/Hud';
import { useRackLayout } from './map3d/useRackLayout';

// ============================================================================
// ErrorBoundary chuyên dụng cho môi trường WebGL / 3D
// ============================================================================
interface ErrorBoundaryState {
  hasError: boolean;
  error?: Error;
}

class ThreeErrorBoundary extends React.Component<
  { children: React.ReactNode; onSwitchTo2D?: () => void },
  ErrorBoundaryState
> {
  constructor(props: any) {
    super(props);
    this.state = { hasError: false };
  }

  static getDerivedStateFromError(error: Error): ErrorBoundaryState {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, errorInfo: any) {
    console.error('Lỗi khởi tạo đồ họa 3D Three.js:', error, errorInfo);
  }

  render() {
    if (this.state.hasError) {
      return (
        <div className="w-full h-full flex flex-col items-center justify-center bg-slate-50 p-6 text-center">
          <div className="w-16 h-16 rounded-2xl bg-amber-100 text-amber-600 flex items-center justify-center text-2xl mb-4 font-bold">
            3D
          </div>
          <h3 className="text-base font-bold text-slate-800 mb-1">
            Không thể khởi tạo môi trường đồ họa 3D
          </h3>
          <p className="text-xs text-slate-500 max-w-md mb-4">
            Trình duyệt của bạn có thể đã tắt tăng tốc phần cứng hoặc thiết bị không hỗ trợ WebGL. Bạn có thể chuyển sang chế độ 2D để tiếp tục thao tác đầy đủ chức năng.
          </p>
          {this.props.onSwitchTo2D && (
            <button
              type="button"
              onClick={this.props.onSwitchTo2D}
              className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold rounded-xl transition shadow-sm cursor-pointer"
            >
              Chuyển sang Mặt bằng 2D
            </button>
          )}
        </div>
      );
    }
    return this.props.children;
  }
}

// Kiểm tra nhanh hỗ trợ WebGL trên trình duyệt
function isWebGLAvailable(): boolean {
  try {
    const canvas = document.createElement('canvas');
    return !!(
      window.WebGLRenderingContext &&
      (canvas.getContext('webgl2') || canvas.getContext('webgl') || canvas.getContext('experimental-webgl'))
    );
  } catch {
    return false;
  }
}

// ============================================================================
// Main WarehouseMap3D Component
// ============================================================================
export function WarehouseMap3D({
  zones,
  highlightTarget,
  highlightTargets,
  refreshKey = 0,
  keyboardEnabled = true,
  isModalOpen = false,
  onOpenShelfDetail,
  onOpenBinDetail,
  onOpenReserve,
  onSwitchTo2D,
}: WarehouseMap3DProps) {
  // 1. Kiểm tra WebGL trước khi render Canvas
  const hasWebGL = useMemo(() => isWebGLAvailable(), []);

  // 2. Reducer quản lý trạng thái góc nhìn (View)
  const [view, dispatch] = useReducer(viewReducer, { level: 'overview' });

  // 3. State cục bộ phục vụ tương tác UI nhẹ
  const [hoverRack, setHoverRack] = useState<string | null>(null);
  const [warnOnly, setWarnOnly] = useState<boolean>(false);
  const [canvasKey, setCanvasKey] = useState<number>(0);

  // 4. Xác định khu vực và kệ đang chọn
  const activeRack = view.level === 'rack' ? view.rack : null;
  const activeZone = activeRack ? RACK_TO_ZONE[activeRack] : null;

  // 5. Nạp layout 40 thùng của kệ đang chọn
  const { layout, status, errorMessage, retry } = useRackLayout(
    activeZone,
    activeRack,
    refreshKey
  );

  // 6. Xử lý khi có mục tiêu tìm kiếm (highlightTarget): Tự động bay tới đích
  useEffect(() => {
    if (!highlightTarget) return;
    const p = parseWarehouseTargetId(highlightTarget);
    if (p) {
      dispatch({ type: 'GOTO', rack: p.rack, shelf: p.shelf, bin: p.binNo });
    }
  }, [highlightTarget]);

  // 7. Tạo bản đồ tra cứu nhanh shelves của từng kệ từ props zones
  const rackShelvesMap = useMemo(() => {
    const map = new Map<string, any[]>();
    zones.forEach((z) => {
      z.racks?.forEach((r: any) => {
        map.set(r.rack, r.shelves || []);
      });
    });
    return map;
  }, [zones]);

  const parsedTarget = useMemo(
    () => parseWarehouseTargetId(highlightTarget),
    [highlightTarget]
  );

  // Fallback nếu không hỗ trợ WebGL
  if (!hasWebGL) {
    return (
      <div className="w-full h-full flex flex-col items-center justify-center bg-slate-50 p-6 text-center">
        <h3 className="text-base font-bold text-slate-800 mb-2">Trình duyệt không hỗ trợ WebGL</h3>
        <p className="text-xs text-slate-500 mb-4 max-w-sm">
          Để xem mô hình 3D, vui lòng bật tăng tốc phần cứng (Hardware Acceleration) trong cài đặt trình duyệt.
        </p>
        {onSwitchTo2D && (
          <button
            type="button"
            onClick={onSwitchTo2D}
            className="px-4 py-2 bg-blue-600 text-white text-xs font-bold rounded-xl"
          >
            Chuyển sang Mặt bằng 2D
          </button>
        )}
      </div>
    );
  }

  return (
    <ThreeErrorBoundary onSwitchTo2D={onSwitchTo2D}>
      <div className="w-full h-full relative overflow-hidden bg-[#EEF2F9]">
        {/* ===================================================== */}
        {/* 1. THREE.JS CANVAS RENDERER */}
        {/* ===================================================== */}
        <Canvas
          key={canvasKey}
          flat // Tắt tone mapping để màu sắc hiển thị đồng bộ 100% với bảng màu UI
          dpr={[1, 1.75]} // Cân bằng độ sắc nét và tiêu thụ RAM/GPU
          camera={{ fov: FOV, near: 0.5, far: 300 }}
          gl={{
            antialias: true,
            powerPreference: 'high-performance',
          }}
          onPointerMissed={() => {
            // Nhấp chuột vào khoảng không: không làm gì, tránh kích hoạt nhầm
          }}
          onCreated={({ gl }) => {
            // Lắng nghe sự kiện mất kết nối WebGL để tự khôi phục
            const handleContextLost = (e: Event) => {
              e.preventDefault();
              console.warn('Cảnh báo: WebGL Context Lost! Đang tự khôi phục Canvas...');
              setTimeout(() => setCanvasKey((k) => k + 1), 1000);
            };
            gl.domElement.addEventListener('webglcontextlost', handleContextLost, false);
          }}
        >
          {/* Màu nền phòng kho sạch */}
          <color attach="background" args={['#EEF2F9']} />

          {/* Chiếu sáng cố định nhẹ, không sinh bóng đổ tính toán tốn kém */}
          <ambientLight intensity={1.1} />
          <directionalLight position={[20, 50, 30]} intensity={1.0} />

          {/* Camera Rig cố định: khóa chuột/lăn/vuốt, chỉ bay theo state `view` */}
          <CameraRig view={view} />

          {/* Mặt sàn kho phẳng, thảm khu và vạch cửa kho */}
          <Floor level={view.level} />

          {/* 28 Dãy Kệ tiêu chuẩn */}
          {RACK_ORDER.map((rackCode) => {
            const zoneCode = RACK_TO_ZONE[rackCode] || 'A';
            const shelves = rackShelvesMap.get(rackCode) || [];

            return (
              <RackModel
                key={rackCode}
                rack={rackCode}
                zone={zoneCode}
                shelves={shelves}
                view={view}
                isHovered={hoverRack === rackCode}
                onHover={setHoverRack}
                onSelect={(selectedRack) => dispatch({ type: 'OPEN_RACK', rack: selectedRack })}
                matchSet={highlightTargets}
                warnOnly={warnOnly}
                isSearchTarget={parsedTarget?.rack === rackCode}
              />
            );
          })}

          {/* 40 Thùng hàng của kệ đang chọn (Chỉ render ở RACK view) */}
          {view.level === 'rack' && (
            <RackBins
              rack={view.rack}
              layout={layout}
              status={status}
              errorMessage={errorMessage}
              retry={retry}
              shelfFocus={view.shelf}
              selectedBin={view.bin}
              highlightTarget={highlightTarget}
              warnOnly={warnOnly}
              isModalOpen={isModalOpen}
              onSelectBin={(shelfNo, binNo) => dispatch({ type: 'SELECT_BIN', shelf: shelfNo, bin: binNo })}
            />
          )}
        </Canvas>

        {/* ===================================================== */}
        {/* 2. HUD LỚP PHỦ GIAO DIỆN TỐI GIẢN */}
        {/* ===================================================== */}
        <Hud
          view={view}
          dispatch={dispatch}
          zones={zones}
          layout={layout}
          keyboardEnabled={keyboardEnabled}
          warnOnly={warnOnly}
          setWarnOnly={setWarnOnly}
          onOpenShelfDetail={onOpenShelfDetail}
          onOpenBinDetail={onOpenBinDetail}
          onOpenReserve={onOpenReserve}
          onSwitchTo2D={onSwitchTo2D}
        />
      </div>
    </ThreeErrorBoundary>
  );
}

export default WarehouseMap3D;
