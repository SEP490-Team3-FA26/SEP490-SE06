import { useState, useCallback, useRef, useEffect } from 'react';
import {
  ZoneSummary,
  ShelfBinLayout,
  ZONE_METAS,
  RACK_PLACEMENTS,
  parseWarehouseTargetId,
} from './constants';
import { inventoryMapService } from '../../../../services/inventory/inventoryMap.service';

export interface SelectedEntity {
  type: 'zone' | 'rack' | 'shelf' | 'bin';
  zone: string;
  rack?: string;
  shelf?: number;
  bin?: number;
  data?: any;
}

export interface HoveredEntity {
  type: 'zone' | 'rack' | 'shelf' | 'bin';
  zone: string;
  rack?: string;
  shelf?: number;
  bin?: number;
  title: string;
  subtitle?: string;
  badge?: string;
  stock?: number;
  status?: string;
  screenX?: number;
  screenY?: number;
}

export interface CameraGoal {
  position: [number, number, number];
  target: [number, number, number];
}

// Vị trí camera Isometric mặc định (Góc nhìn toàn cảnh từ trên cao chếch Nam-Đông)
export const DEFAULT_CAMERA_POS: [number, number, number] = [38, 48, 52];
export const DEFAULT_CAMERA_TARGET: [number, number, number] = [0, 2, 0];

export function useWarehouse3DState(
  zones: ZoneSummary[],
  highlightTarget?: string,
  onShelfSelectProp?: (zone: string, rack: string, shelf: number) => void,
  onBinSelectProp?: (zone: string, rack: string, shelf: number, bin: number) => void,
  onZoneClickProp?: (zoneData: any) => void
) {
  const [selectedEntity, setSelectedEntity] = useState<SelectedEntity | null>(null);
  const [hoveredEntity, setHoveredEntity] = useState<HoveredEntity | null>(null);
  const [focusRack, setFocusRack] = useState<string | null>(null);
  const [fefoXrayMode, setFefoXrayMode] = useState<boolean>(false);

  // Bộ nhớ đệm lưu layout 40 thùng của các kệ đã tải
  const [rackLayoutCache, setRackLayoutCache] = useState<Record<string, ShelfBinLayout[]>>({});
  const [loadingRack, setLoadingRack] = useState<boolean>(false);

  // Mục tiêu camera điều khiển bay mượt (Lerp)
  const [cameraGoal, setCameraGoal] = useState<CameraGoal | null>(null);
  const isUserInteractingRef = useRef<boolean>(false);

  // Hàm tải layout 40 thùng của một kệ
  const fetchRackLayout = useCallback(async (zone: string, rack: string): Promise<ShelfBinLayout[]> => {
    const cacheKey = `${zone}-${rack}`;
    if (rackLayoutCache[cacheKey]) {
      return rackLayoutCache[cacheKey];
    }

    setLoadingRack(true);
    try {
      const data = await inventoryMapService.getShelfLayout(zone, rack);
      const list: ShelfBinLayout[] = Array.isArray(data) ? data : ((data as any)?.data || []);
      setRackLayoutCache((prev) => ({ ...prev, [cacheKey]: list }));
      return list;
    } catch (err) {
      console.error(`[useWarehouse3DState] Lỗi tải layout ${zone}-${rack}:`, err);
      // Fallback: tự động sinh layout rỗng an toàn để 3D không gãy
      const fallbackList: ShelfBinLayout[] = [4, 3, 2, 1].map((sNo) => ({
        shelfNo: sNo,
        bins: Array.from({ length: 10 }, (_, i) => ({
          binNo: i + 1,
          currentStock: 0,
          maxCapacity: 200,
          status: 'EMPTY',
        })),
      }));
      setRackLayoutCache((prev) => ({ ...prev, [cacheKey]: fallbackList }));
      return fallbackList;
    } finally {
      setLoadingRack(false);
    }
  }, [rackLayoutCache]);

  // Hành động chọn Khu (Zone)
  const selectZone = useCallback((zoneKey: string) => {
    const meta = ZONE_METAS[zoneKey];
    const zoneData = zones.find((z) => z.zone === zoneKey);
    setSelectedEntity({ type: 'zone', zone: zoneKey, data: zoneData });
    setFocusRack(null);

    if (meta) {
      const [cx, cz] = meta.center;
      setCameraGoal({
        position: [cx, 22, cz + 20],
        target: [cx, 2, cz],
      });
    }

    if (onZoneClickProp && zoneData) {
      onZoneClickProp(zoneData);
    }
  }, [zones, onZoneClickProp]);

  // Hành động chọn Kệ (Rack) -> Bật LOD 2
  const selectRack = useCallback((zone: string, rack: string) => {
    setSelectedEntity({ type: 'rack', zone, rack });
    setFocusRack(rack);
    fetchRackLayout(zone, rack);

    const placement = RACK_PLACEMENTS[rack];
    if (placement) {
      const [rx, , rz] = placement.position;
      setCameraGoal({
        position: [rx, 11, rz + 12],
        target: [rx, 2.3, rz],
      });
    }
  }, [fetchRackLayout]);

  // Hành động chọn Tầng (Shelf) -> Mở modal chi tiết tầng
  const selectShelf = useCallback((zone: string, rack: string, shelf: number) => {
    setSelectedEntity({ type: 'shelf', zone, rack, shelf });
    setFocusRack(rack);
    fetchRackLayout(zone, rack);

    const placement = RACK_PLACEMENTS[rack];
    if (placement) {
      const [rx, , rz] = placement.position;
      setCameraGoal({
        position: [rx, 9, rz + 10],
        target: [rx, shelf * 0.9, rz],
      });
    }

    if (onShelfSelectProp) {
      onShelfSelectProp(zone, rack, shelf);
    }
  }, [fetchRackLayout, onShelfSelectProp]);

  // Hành động chọn Ô Thùng (Bin) -> Mở modal chi tiết thùng
  const selectBin = useCallback((zone: string, rack: string, shelf: number, bin: number, data?: any) => {
    setSelectedEntity({ type: 'bin', zone, rack, shelf, bin, data });
    setFocusRack(rack);
    fetchRackLayout(zone, rack);

    const placement = RACK_PLACEMENTS[rack];
    if (placement) {
      const [rx, , rz] = placement.position;
      const binOffsetX = -4.05 + (bin - 0.5) * 0.90;
      setCameraGoal({
        position: [rx + binOffsetX * 0.4, 7, rz + 7],
        target: [rx + binOffsetX, shelf * 0.9, rz],
      });
    }

    if (onBinSelectProp) {
      onBinSelectProp(zone, rack, shelf, bin);
    }
  }, [fetchRackLayout, onBinSelectProp]);

  // Đưa camera về góc nhìn toàn cảnh (Home)
  const resetCamera = useCallback(() => {
    setSelectedEntity(null);
    setFocusRack(null);
    setCameraGoal({
      position: DEFAULT_CAMERA_POS,
      target: DEFAULT_CAMERA_TARGET,
    });
  }, []);

  // Xoay góc nhìn camera một góc deltaRad (phục vụ nút xoay trái / phải 45 độ)
  const rotateCamera = useCallback((deltaAngleRad: number) => {
    setCameraGoal((prev) => {
      const currentPos = prev?.position || DEFAULT_CAMERA_POS;
      const currentTarget = prev?.target || DEFAULT_CAMERA_TARGET;
      const dx = currentPos[0] - currentTarget[0];
      const dz = currentPos[2] - currentTarget[2];
      const currentRadius = Math.sqrt(dx * dx + dz * dz);
      const currentAngle = Math.atan2(dz, dx);
      const newAngle = currentAngle + deltaAngleRad;

      return {
        position: [
          currentTarget[0] + currentRadius * Math.cos(newAngle),
          currentPos[1],
          currentTarget[2] + currentRadius * Math.sin(newAngle),
        ],
        target: currentTarget,
      };
    });
  }, []);

  // Zoom camera theo hệ số
  const zoomCamera = useCallback((factor: number) => {
    setCameraGoal((prev) => {
      const currentPos = prev?.position || DEFAULT_CAMERA_POS;
      const currentTarget = prev?.target || DEFAULT_CAMERA_TARGET;
      const dx = currentPos[0] - currentTarget[0];
      const dy = currentPos[1] - currentTarget[1];
      const dz = currentPos[2] - currentTarget[2];

      const newPos: [number, number, number] = [
        currentTarget[0] + dx * factor,
        Math.max(4, Math.min(90, currentTarget[1] + dy * factor)),
        currentTarget[2] + dz * factor,
      ];

      return { position: newPos, target: currentTarget };
    });
  }, []);

  // Tự động xử lý khi prop highlightTarget thay đổi từ bên ngoài (Tìm kiếm / Lọc)
  useEffect(() => {
    if (!highlightTarget) return;
    const parsed = parseWarehouseTargetId(highlightTarget);
    if (!parsed) return;

    if (parsed.kind === 'bin' && parsed.binNo) {
      selectBin(parsed.zone, parsed.rack, parsed.shelf, parsed.binNo);
    } else {
      selectShelf(parsed.zone, parsed.rack, parsed.shelf);
    }
  }, [highlightTarget, selectBin, selectShelf]);

  return {
    selectedEntity,
    hoveredEntity,
    setHoveredEntity,
    focusRack,
    setFocusRack,
    fefoXrayMode,
    toggleFefoXray: () => setFefoXrayMode((prev) => !prev),
    rackLayoutCache,
    loadingRack,
    cameraGoal,
    setCameraGoal,
    isUserInteractingRef,
    selectZone,
    selectRack,
    selectShelf,
    selectBin,
    resetCamera,
    rotateCamera,
    zoomCamera,
    fetchRackLayout,
  };
}
