import React, { useMemo } from 'react';
import * as THREE from 'three';
import {
  RackSummary,
  RACK_DIMENSIONS,
  STATUS_COLORS,
  ZONE_METAS,
  ShelfBinLayout,
} from './constants';
import { BinCell3D } from './BinCell3D';

interface RackUnit3DProps {
  rackData: RackSummary;
  zone: string;
  position: [number, number, number];
  isFocused?: boolean;
  shelfBinLayout?: ShelfBinLayout[];
  highlightTargets?: Set<string>;
  highlightTarget?: string;
  selectedEntity?: any;
  fefoXrayMode?: boolean;
  onSelectRack?: (zone: string, rack: string) => void;
  onSelectShelf?: (zone: string, rack: string, shelf: number) => void;
  onSelectBin?: (zone: string, rack: string, shelf: number, bin: number, data?: any) => void;
  onHover?: (hoverInfo: any) => void;
  onUnhover?: () => void;
}

// Helper tạo canvas texture biển tên kệ trên nóc (ví dụ: A1, RES2)
function createRackBadgeTexture(rackName: string, zoneColor: string): THREE.CanvasTexture {
  const canvas = document.createElement('canvas');
  canvas.width = 512;
  canvas.height = 256;
  const ctx = canvas.getContext('2d');
  if (ctx) {
    ctx.fillStyle = '#0f172a';
    ctx.roundRect(8, 8, canvas.width - 16, canvas.height - 16, 24);
    ctx.fill();

    ctx.lineWidth = 14;
    ctx.strokeStyle = zoneColor;
    ctx.roundRect(8, 8, canvas.width - 16, canvas.height - 16, 24);
    ctx.stroke();

    ctx.fillStyle = '#ffffff';
    ctx.font = 'bold 110px monospace';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText(rackName, canvas.width / 2, canvas.height / 2);
  }

  const texture = new THREE.CanvasTexture(canvas);
  texture.minFilter = THREE.LinearFilter;
  return texture;
}

export function RackUnit3D({
  rackData,
  zone,
  position,
  isFocused = false,
  shelfBinLayout,
  highlightTargets,
  highlightTarget,
  selectedEntity,
  fefoXrayMode = false,
  onSelectRack,
  onSelectShelf,
  onSelectBin,
  onHover,
  onUnhover,
}: RackUnit3DProps) {
  const { width, depth, height, shelfHeights } = RACK_DIMENSIONS;
  const zoneMeta = ZONE_METAS[zone] || ZONE_METAS.F;

  // Tạo texture biển tên kệ
  const badgeTexture = useMemo(() => {
    return createRackBadgeTexture(rackData.rack, zoneMeta.hex);
  }, [rackData.rack, zoneMeta.hex]);

  // Kiểm tra xem kệ này có đang được chọn hoặc có mục tiêu highlight không
  const isRackSelected = selectedEntity?.rack === rackData.rack;
  const hasHighlight = useMemo(() => {
    if (!highlightTarget && (!highlightTargets || highlightTargets.size === 0)) return false;
    if (highlightTarget && highlightTarget.includes(`-${rackData.rack}-`)) return true;
    if (highlightTargets) {
      for (const t of highlightTargets) {
        if (t.includes(`-${rackData.rack}-`)) return true;
      }
    }
    return false;
  }, [highlightTarget, highlightTargets, rackData.rack]);

  // Khung trụ thép đứng ở 4 góc
  const uprightPositions: [number, number, number][] = [
    [-width / 2 + 0.08, height / 2, -depth / 2 + 0.08],
    [width / 2 - 0.08, height / 2, -depth / 2 + 0.08],
    [-width / 2 + 0.08, height / 2, depth / 2 - 0.08],
    [width / 2 - 0.08, height / 2, depth / 2 - 0.08],
  ];

  return (
    <group position={position} name={`Rack-${rackData.rack}`}>
      {/* 1. KHUNG THÉP ĐỨNG (UPRIGHT COLUMNS) */}
      {uprightPositions.map((pos, idx) => (
        <mesh key={idx} position={pos} castShadow>
          <boxGeometry args={[0.16, height, 0.16]} />
          <meshStandardMaterial color="#1e293b" metalness={0.8} roughness={0.25} />
        </mesh>
      ))}

      {/* 2. THANH GIẰNG NGANG TRÊN NÓC */}
      <mesh position={[0, height - 0.08, 0]}>
        <boxGeometry args={[width, 0.12, depth]} />
        <meshStandardMaterial color="#334155" metalness={0.6} roughness={0.4} />
      </mesh>

      {/* 3. BIỂN TÊN KỆ PHÁT SÁNG TRÊN NÓC (A1, B2, RES1...) */}
      <mesh position={[0, height + 0.55, 0]} castShadow>
        <boxGeometry args={[1.8, 0.9, 0.14]} />
        <meshBasicMaterial map={badgeTexture} />
      </mesh>

      {/* 4. VÒNG SÁNG DƯỚI CHÂN KỆ KHI ĐƯỢC CHỌN HOẶC FOCUS */}
      {(isRackSelected || isFocused || hasHighlight) && (
        <mesh position={[0, 0.02, 0]} rotation={[-Math.PI / 2, 0, 0]}>
          <planeGeometry args={[width + 0.8, depth + 0.8]} />
          <meshBasicMaterial
            color={hasHighlight ? '#38bdf8' : zoneMeta.hex}
            transparent
            opacity={0.25}
          />
        </mesh>
      )}

      {/* 5. CÁC TẦNG KỆ (4 TẦNG: T1 -> T4) */}
      {shelfHeights.map((shelfY, idx) => {
        const shelfNo = idx + 1; // 1..4
        const shelfData = rackData.shelves.find((s) => s.shelf === shelfNo);
        const statusKey = shelfData?.status || 'EMPTY';
        const statusCfg = STATUS_COLORS[statusKey];

        // Highlight & Selection của tầng
        const shelfId = `${zone}-${rackData.rack}-${shelfNo}`;
        const isShelfHighlighted =
          highlightTarget === shelfId || (highlightTargets?.has(shelfId) ?? false);
        const isShelfSelected =
          selectedEntity?.rack === rackData.rack && selectedEntity?.shelf === shelfNo;

        // Kiểm tra chế độ X-Ray FEFO
        const isFefoDimmed =
          fefoXrayMode && (statusKey === 'NORMAL' || statusKey === 'EMPTY');

        // Layout 10 thùng của tầng này (nếu đã tải)
        const currentShelfLayout = shelfBinLayout?.find((l) => l.shelfNo === shelfNo);

        return (
          <group key={shelfNo} position={[0, shelfY, 0]}>
            {/* Thanh dầm đỡ tầng (Shelf Deck Beam) */}
            <mesh position={[0, 0.06, 0]} receiveShadow>
              <boxGeometry args={[width - 0.2, 0.12, depth - 0.1]} />
              <meshStandardMaterial
                color={isShelfSelected ? '#38bdf8' : '#334155'}
                metalness={0.5}
                roughness={0.4}
              />
            </mesh>

            {/* Dải đèn LED báo trạng thái ở mép trước tầng */}
            <mesh position={[0, 0.06, depth / 2 - 0.04]}>
              <boxGeometry args={[width - 0.4, 0.08, 0.05]} />
              <meshBasicMaterial
                color={statusCfg.hex}
                transparent={isFefoDimmed}
                opacity={isFefoDimmed ? 0.2 : 0.95}
              />
            </mesh>

            {/* Dải đèn LED báo trạng thái ở mép sau tầng */}
            <mesh position={[0, 0.06, -depth / 2 + 0.04]}>
              <boxGeometry args={[width - 0.4, 0.08, 0.05]} />
              <meshBasicMaterial
                color={statusCfg.hex}
                transparent={isFefoDimmed}
                opacity={isFefoDimmed ? 0.2 : 0.95}
              />
            </mesh>

            {/* ========================================================== */}
            {/* A. LOD CẤP 2 (FOCUS MODE): RENDER 10 Ô THÙNG B1..B10       */}
            {/* ========================================================== */}
            {isFocused && currentShelfLayout ? (
              currentShelfLayout.bins.map((bin) => {
                const binOffsetX = -4.05 + (bin.binNo - 0.5) * 0.90;
                const binId = `bin-${zone}-${rackData.rack}-${shelfNo}-${bin.binNo}`;
                const isBinHighlighted =
                  highlightTarget === binId || (highlightTargets?.has(binId) ?? false);
                const isBinSelected =
                  selectedEntity?.rack === rackData.rack &&
                  selectedEntity?.shelf === shelfNo &&
                  selectedEntity?.bin === bin.binNo;

                return (
                  <BinCell3D
                    key={bin.binNo}
                    bin={bin}
                    zone={zone}
                    rack={rackData.rack}
                    shelf={shelfNo}
                    position={[binOffsetX, 0.12, 0]}
                    isHighlighted={isBinHighlighted}
                    isSelected={isBinSelected}
                    isFefoDimmed={
                      fefoXrayMode && (bin.status === 'NORMAL' || bin.status === 'EMPTY')
                    }
                    onSelect={() => onSelectBin?.(zone, rackData.rack, shelfNo, bin.binNo, bin)}
                    onHover={onHover}
                    onUnhover={onUnhover}
                  />
                );
              })
            ) : (
              /* ======================================================== */
              /* B. LOD CẤP 1 (MACRO OVERVIEW): CÁC KIỆN HÀNG ĐẠI DIỆN     */
              /* ======================================================== */
              <group position={[0, 0.12, 0]}>
                {statusKey !== 'EMPTY' && (
                  <>
                    {[-3, -1, 1, 3].map((bx, bIdx) => (
                      <mesh key={bIdx} position={[bx, 0.24, 0]} castShadow>
                        <boxGeometry args={[1.5, 0.48, 1.1]} />
                        <meshStandardMaterial
                          color={statusCfg.hex}
                          roughness={0.4}
                          transparent={isFefoDimmed}
                          opacity={isFefoDimmed ? 0.2 : 0.85}
                        />
                      </mesh>
                    ))}
                  </>
                )}

                {/* Hitbox bắt click tầng khi đang ở chế độ xem tổng quan */}
                <mesh
                  position={[0, 0.45, 0]}
                  onClick={(e) => {
                    e.stopPropagation();
                    onSelectShelf?.(zone, rackData.rack, shelfNo);
                  }}
                  onPointerOver={(e) => {
                    e.stopPropagation();
                    onHover?.({
                      type: 'shelf',
                      zone,
                      rack: rackData.rack,
                      shelf: shelfNo,
                      title: `Kệ ${rackData.rack} · Tầng ${shelfNo}`,
                      subtitle: `Khu ${zone} (${zoneMeta.name}) · ${shelfData?.categories?.join(', ') || zoneMeta.categoryDesc}`,
                      stock: shelfData?.totalStock || 0,
                      status: statusKey,
                      badge: `${shelfData?.batchCount || 0} lô hàng`,
                      screenX: e.clientX,
                      screenY: e.clientY,
                    });
                  }}
                  onPointerOut={(e) => {
                    e.stopPropagation();
                    onUnhover?.();
                  }}
                >
                  <boxGeometry args={[width, 0.9, depth]} />
                  <meshBasicMaterial transparent opacity={0} depthWrite={false} />
                </mesh>
              </group>
            )}

            {/* Khung sáng nhấp nháy bao quanh tầng khi được chọn */}
            {isShelfSelected && (
              <mesh position={[0, 0.45, 0]}>
                <boxGeometry args={[width + 0.1, 0.95, depth + 0.1]} />
                <meshBasicMaterial color="#0284c7" wireframe transparent opacity={0.6} />
              </mesh>
            )}
          </group>
        );
      })}

      {/* Hitbox lớn bắt sự kiện click cả Kệ để mở LOD 2 */}
      <mesh
        position={[0, height / 2, 0]}
        onClick={(e) => {
          e.stopPropagation();
          onSelectRack?.(zone, rackData.rack);
        }}
        onPointerOver={(e) => {
          e.stopPropagation();
          const totalRackStock = rackData.shelves.reduce((s, sh) => s + (sh.totalStock || 0), 0);
          onHover?.({
            type: 'rack',
            zone,
            rack: rackData.rack,
            title: `Dãy Kệ ${rackData.rack}`,
            subtitle: `${zoneMeta.name} — ${zoneMeta.categoryDesc}`,
            stock: totalRackStock,
            badge: `${rackData.shelves.length} tầng lưu trữ (40 thùng)`,
            screenX: e.clientX,
            screenY: e.clientY,
          });
        }}
        onPointerOut={(e) => {
          e.stopPropagation();
          onUnhover?.();
        }}
      >
        <boxGeometry args={[width + 0.3, height + 0.4, depth + 0.3]} />
        <meshBasicMaterial transparent opacity={0} depthWrite={false} />
      </mesh>
    </group>
  );
}
