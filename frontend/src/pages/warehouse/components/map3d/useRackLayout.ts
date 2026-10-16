// ============================================================================
// Hook Tải Layout Kệ 40 Thùng Hàng (useRackLayout)
// Dự án: WDP301 - Sơ Đồ Kho 3D Central Warehouse
// Cache Map & In-flight Deduplication nằm ngoài React state
// Tuyệt đối không sinh dữ liệu giả khi API lỗi
// ============================================================================

import { useState, useEffect, useCallback, useRef } from 'react';
import { inventoryMapService } from '../../../../services/inventory/inventoryMap.service';
import { ShelfBinLayout, RACK_ORDER, RACK_TO_ZONE } from './constants';

// Cache và In-flight request lưu ở module-scope để giữ danh tính ổn định
const rackLayoutCache = new Map<string, ShelfBinLayout[]>();
const inflightRequests = new Map<string, Promise<ShelfBinLayout[]>>();

export type RackLayoutStatus = 'idle' | 'loading' | 'error' | 'ready';

export function useRackLayout(
  zone: string | null,
  rack: string | null,
  refreshKey: number = 0
) {
  const [layout, setLayout] = useState<ShelfBinLayout[] | undefined>(undefined);
  const [status, setStatus] = useState<RackLayoutStatus>('idle');
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  // Lưu trữ refreshKey trước đó để xóa cache khi người dùng vừa cập nhật dữ liệu qua modal
  const prevRefreshKey = useRef(refreshKey);

  // Hàm tải dữ liệu của 1 kệ cụ thể
  const fetchLayout = useCallback(async (z: string, r: string, forceRefresh: boolean = false): Promise<ShelfBinLayout[]> => {
    const cacheKey = `${z}-${r}`;

    if (!forceRefresh && rackLayoutCache.has(cacheKey)) {
      return rackLayoutCache.get(cacheKey)!;
    }

    if (inflightRequests.has(cacheKey)) {
      return inflightRequests.get(cacheKey)!;
    }

    const promise = (async () => {
      try {
        const res = await inventoryMapService.getShelfLayout(z, r);
        const rawData = Array.isArray(res) ? res : (res as any)?.data || [];

        // Chuẩn hóa cấu trúc ShelfBinLayout
        const cleanLayout: ShelfBinLayout[] = (rawData as any[]).map((sh) => ({
          shelfNo: sh.shelfNo ?? sh.shelf,
          bins: Array.isArray(sh.bins) ? sh.bins : [],
        }));

        rackLayoutCache.set(cacheKey, cleanLayout);
        return cleanLayout;
      } finally {
        inflightRequests.delete(cacheKey);
      }
    })();

    inflightRequests.set(cacheKey, promise);
    return promise;
  }, []);

  // Prefetch các kệ liền kề (trước và sau) trong RACK_ORDER khi nhàn rỗi (idle)
  const prefetchNeighbors = useCallback((currentRack: string) => {
    const idx = RACK_ORDER.indexOf(currentRack);
    if (idx === -1) return;

    const prevRack = RACK_ORDER[(idx - 1 + RACK_ORDER.length) % RACK_ORDER.length];
    const nextRack = RACK_ORDER[(idx + 1) % RACK_ORDER.length];

    const runPrefetch = () => {
      [prevRack, nextRack].forEach((neighbor) => {
        const neighborZone = RACK_TO_ZONE[neighbor];
        if (neighborZone && !rackLayoutCache.has(`${neighborZone}-${neighbor}`)) {
          fetchLayout(neighborZone, neighbor).catch(() => {
            // Lỗi khi prefetch ngầm được bỏ qua an toàn
          });
        }
      });
    };

    if (typeof window !== 'undefined' && 'requestIdleCallback' in window) {
      (window as any).requestIdleCallback(runPrefetch, { timeout: 2000 });
    } else {
      setTimeout(runPrefetch, 600);
    }
  }, [fetchLayout]);

  // Xử lý nạp dữ liệu khi zone/rack/refreshKey thay đổi
  useEffect(() => {
    if (!zone || !rack) {
      setLayout(undefined);
      setStatus('idle');
      setErrorMessage(null);
      return;
    }

    // Khi refreshKey tăng: xóa toàn bộ cache cũ để nạp mới dữ liệu thực tế
    if (refreshKey !== prevRefreshKey.current) {
      rackLayoutCache.clear();
      prevRefreshKey.current = refreshKey;
    }

    const cacheKey = `${zone}-${rack}`;
    if (rackLayoutCache.has(cacheKey)) {
      setLayout(rackLayoutCache.get(cacheKey));
      setStatus('ready');
      setErrorMessage(null);
      prefetchNeighbors(rack);
      return;
    }

    let isCancelled = false;
    setStatus('loading');
    setErrorMessage(null);

    fetchLayout(zone, rack)
      .then((data) => {
        if (!isCancelled) {
          setLayout(data);
          setStatus('ready');
          prefetchNeighbors(rack);
        }
      })
      .catch((err) => {
        if (!isCancelled) {
          console.error(`Lỗi tải sơ đồ thùng kệ ${rack}:`, err);
          setLayout(undefined);
          setStatus('error');
          setErrorMessage(err?.response?.data?.message || err?.message || 'Không thể tải dữ liệu thùng hàng');
        }
      });

    return () => {
      isCancelled = true;
    };
  }, [zone, rack, refreshKey, fetchLayout, prefetchNeighbors]);

  // Nút Thử lại khi gặp lỗi
  const retry = useCallback(() => {
    if (!zone || !rack) return;
    setStatus('loading');
    setErrorMessage(null);

    fetchLayout(zone, rack, true)
      .then((data) => {
        setLayout(data);
        setStatus('ready');
        prefetchNeighbors(rack);
      })
      .catch((err) => {
        setLayout(undefined);
        setStatus('error');
        setErrorMessage(err?.response?.data?.message || err?.message || 'Không thể tải dữ liệu thùng hàng');
      });
  }, [zone, rack, fetchLayout, prefetchNeighbors]);

  return { layout, status, errorMessage, retry };
}
