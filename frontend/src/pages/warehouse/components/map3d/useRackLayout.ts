// ============================================================================
// Hook Tai Layout Ke 40 Thung Hang (useRackLayout)
// Du an: WDP301 - So Do Kho 3D Central Warehouse
// ============================================================================

import { useState, useEffect, useCallback, useRef } from 'react';
import { inventoryMapService } from '../../../../services/inventory/inventoryMap.service';
import { ShelfBinLayout, RACK_ORDER, RACK_TO_ZONE } from './constants';

const rackLayoutCache = new Map<string, ShelfBinLayout[]>();
const inflightRequests = new Map<string, Promise<ShelfBinLayout[]>>();

export type RackLayoutStatus = 'idle' | 'loading' | 'error' | 'ready';

// Hàm tải trước ngầm sơ đồ kệ vào cache khi hover chuột ở màn hình tổng quan
export function prefetchRackLayout(zone: string, rack: string) {
  const cacheKey = `${zone}-${rack}`;
  if (rackLayoutCache.has(cacheKey) || inflightRequests.has(cacheKey)) return;

  const promise = (async () => {
    try {
      const res = await inventoryMapService.getShelfLayout(zone, rack);
      const rawData = Array.isArray(res) ? res : (res as any)?.data || [];

      const cleanLayout: ShelfBinLayout[] = (rawData as any[]).map((sh) => ({
        shelfNo: Number(sh.shelfNo ?? sh.shelf),
        bins: Array.isArray(sh.bins)
          ? [...sh.bins].sort((a, b) => Number(a.binNo) - Number(b.binNo))
          : [],
      }));

      rackLayoutCache.set(cacheKey, cleanLayout);
      return cleanLayout;
    } catch {
      return [];
    } finally {
      inflightRequests.delete(cacheKey);
    }
  })();

  inflightRequests.set(cacheKey, promise);
}

export function useRackLayout(
  zone: string | null,
  rack: string | null,
  refreshKey: number = 0
) {
  const [layout, setLayout] = useState<ShelfBinLayout[] | undefined>(undefined);
  const [status, setStatus] = useState<RackLayoutStatus>('idle');
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const prevRefreshKey = useRef(refreshKey);

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

        const cleanLayout: ShelfBinLayout[] = (rawData as any[]).map((sh) => ({
          shelfNo: Number(sh.shelfNo ?? sh.shelf),
          bins: Array.isArray(sh.bins)
            ? [...sh.bins].sort((a, b) => Number(a.binNo) - Number(b.binNo))
            : [],
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

  const prefetchNeighbors = useCallback((currentRack: string) => {
    const idx = RACK_ORDER.indexOf(currentRack);
    if (idx === -1) return;

    const prevRack = RACK_ORDER[(idx - 1 + RACK_ORDER.length) % RACK_ORDER.length];
    const nextRack = RACK_ORDER[(idx + 1) % RACK_ORDER.length];

    const runPrefetch = () => {
      [prevRack, nextRack].forEach((neighbor) => {
        const neighborZone = RACK_TO_ZONE[neighbor];
        if (neighborZone && !rackLayoutCache.has(`${neighborZone}-${neighbor}`)) {
          fetchLayout(neighborZone, neighbor).catch(() => {});
        }
      });
    };

    if (typeof window !== 'undefined' && 'requestIdleCallback' in window) {
      (window as any).requestIdleCallback(runPrefetch, { timeout: 2000 });
    } else {
      setTimeout(runPrefetch, 600);
    }
  }, [fetchLayout]);

  useEffect(() => {
    if (!zone || !rack) {
      setLayout(undefined);
      setStatus('idle');
      setErrorMessage(null);
      return;
    }

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
          setLayout(undefined);
          setStatus('error');
          setErrorMessage(err?.response?.data?.message || err?.message || 'Khong the tai du lieu thung hang');
        }
      });

    return () => {
      isCancelled = true;
    };
  }, [zone, rack, refreshKey, fetchLayout, prefetchNeighbors]);

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
        setErrorMessage(err?.response?.data?.message || err?.message || 'Khong the tai du lieu thung hang');
      });
  }, [zone, rack, fetchLayout, prefetchNeighbors]);

  return { layout, status, errorMessage, retry };
}
