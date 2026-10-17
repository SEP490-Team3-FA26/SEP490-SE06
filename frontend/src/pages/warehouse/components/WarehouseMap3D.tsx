// ============================================================================
// Bộ Điều Khiển Sơ Đồ Kho 3D Trung Tâm (WarehouseMap3D Container)
// Dự án: WDP301 - Sơ Đồ Kho 3D Central Warehouse
// ============================================================================

import React, { useReducer, useState, useEffect, useMemo } from 'react';
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
import { useRackLayout, prefetchRackLayout } from './map3d/useRackLayout';

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
            Trình duyệt của bạn có thể đã tắt tăng tốc phần cứng hoặc thiết bị không hỗ trợ WebGL.
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
  const hasWebGL = useMemo(() => isWebGLAvailable(), []);
  const [view, dispatch] = useReducer(viewReducer, { level: 'overview' });

  const [hoverRack, setHoverRack] = useState<string | null>(null);
  const [warnOnly, setWarnOnly] = useState<boolean>(false);
  const [canvasKey, setCanvasKey] = useState<number>(0);

  const activeRack = view.level === 'rack' ? view.rack : null;
  const activeZone = activeRack ? RACK_TO_ZONE[activeRack] : null;

  // Tự động mở đúng dãy kệ và bay camera vào ô thùng chứa thuốc khi người dùng tìm kiếm
  useEffect(() => {
    if (!highlightTarget) return;

    const parsed = parseWarehouseTargetId(highlightTarget);
    if (parsed?.rack) {
      dispatch({
        type: 'GOTO',
        rack: parsed.rack,
        shelf: parsed.shelf ?? null,
        bin: parsed.binNo ?? null,
      });
    }
  }, [highlightTarget]);

  const { layout, status, errorMessage, retry } = useRackLayout(
    activeZone,
    activeRack,
    refreshKey
  );

  // Phân tích toàn bộ mục tiêu tìm kiếm / bộ lọc thành danh sách các kệ và khu khớp
  const { matchingRacks, matchingZones } = useMemo(() => {
    const racks = new Set<string>();
    const zonesSet = new Set<string>();

    const addTarget = (raw: string) => {
      if (!raw) return;
      const p = parseWarehouseTargetId(raw);
      if (p?.rack) {
        racks.add(p.rack);
        if (p.zone) zonesSet.add(p.zone);
        const z = RACK_TO_ZONE[p.rack];
        if (z) zonesSet.add(z);
      } else if (raw.includes('-')) {
        const parts = raw.split('-');
        if (parts.length >= 2) {
          const possibleRack = parts[1];
          if (RACK_PLACEMENTS[possibleRack]) {
            racks.add(possibleRack);
            const z = RACK_TO_ZONE[possibleRack];
            if (z) zonesSet.add(z);
          }
        }
      } else if (RACK_PLACEMENTS[raw]) {
        racks.add(raw);
        const z = RACK_TO_ZONE[raw];
        if (z) zonesSet.add(z);
      }
    };

    if (highlightTarget) {
      addTarget(highlightTarget);
    }

    if (highlightTargets && highlightTargets.size > 0) {
      highlightTargets.forEach(addTarget);
    }

    return { matchingRacks: racks, matchingZones: zonesSet };
  }, [highlightTarget, highlightTargets]);

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

  if (!hasWebGL) {
    return (
      <div className="w-full h-full flex flex-col items-center justify-center bg-slate-50 p-6 text-center">
        <h3 className="text-base font-bold text-slate-800 mb-2">Trình duyệt không hỗ trợ WebGL</h3>
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
        <Canvas
          key={canvasKey}
          flat
          dpr={[1, 1.75]}
          camera={{ fov: FOV, near: 0.5, far: 300 }}
          gl={{
            antialias: true,
            powerPreference: 'high-performance',
          }}
          onPointerMissed={() => {}}
          onCreated={({ gl }) => {
            const handleContextLost = (e: Event) => {
              e.preventDefault();
              setTimeout(() => setCanvasKey((k) => k + 1), 1000);
            };
            gl.domElement.addEventListener('webglcontextlost', handleContextLost, false);
          }}
        >
          {/* Màu nền phòng sạch sáng dịu */}
          <color attach="background" args={['#EEF2F9']} />
          <fog attach="fog" args={['#EEF2F9', 65, 220]} />

          {/* Cụm ánh sáng 3 điểm chuẩn phòng sạch Dược phẩm GSP */}
          <ambientLight color="#ffffff" intensity={1.20} />
          <hemisphereLight args={['#ffffff', '#cbd5e1', 0.85]} />
          <directionalLight position={[25, 55, 35]} intensity={1.15} />
          <directionalLight position={[-35, 30, -35]} intensity={0.45} color="#dbeafe" />

          <CameraRig view={view} />
          <Floor level={view.level} highlightZones={matchingZones} />

          {RACK_ORDER.map((rackCode) => {
            const zoneCode = RACK_TO_ZONE[rackCode] || 'A';
            const shelves = rackShelvesMap.get(rackCode) || [];
            const isMatchedRack = matchingRacks.has(rackCode) || parsedTarget?.rack === rackCode;

            return (
              <RackModel
                key={rackCode}
                rack={rackCode}
                zone={zoneCode}
                shelves={shelves}
                view={view}
                isHovered={hoverRack === rackCode}
                onHover={(rc) => {
                  setHoverRack(rc);
                  if (rc && view.level === 'overview') {
                    prefetchRackLayout(zoneCode, rc);
                  }
                }}
                onSelect={(selectedRack) => dispatch({ type: 'OPEN_RACK', rack: selectedRack })}
                matchSet={matchingRacks}
                warnOnly={warnOnly}
                isSearchTarget={isMatchedRack}
              />
            );
          })}

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
