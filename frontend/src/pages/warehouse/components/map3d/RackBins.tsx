// ============================================================================
// Mô Hình 40 Thùng Hàng Của Dãy Kệ Đang Xem (RackBins - 4 Tầng x 10 Thùng)
// Dự án: WDP301 - Sơ Đồ Kho 3D Central Warehouse
// Giải pháp: Native Three.js Mesh + Dynamic Canvas Texture (Khít 100% mọi zoom)
// ============================================================================

import React, { useMemo, useEffect } from 'react';
import * as THREE from 'three';
import { Html } from '@react-three/drei';
import {
  RACK_DIMENSIONS,
  RACK_PLACEMENTS,
  STATUS_COLORS,
  ShelfBinLayout,
  BinItem,
  WarehouseStatus,
  parseWarehouseTargetId,
} from './constants';
import type { RackLayoutStatus } from './useRackLayout';
import {
  binUnitGeometry,
  binEdgesGeometry,
  binHitboxGeometry,
  binFacePlaneGeometry,
  binEdgeLineMaterial,
  statusNormalMaterials,
} from './materials';

// ============================================================================
// HÀM HELPER: Ngắt dòng thông minh trên Canvas 2D (Tối ưu tên thuốc to)
// ============================================================================
function wrapText(
  ctx: CanvasRenderingContext2D,
  text: string,
  maxWidth: number,
  maxLines: number = 4
): string[] {
  const words = text.split(' ');
  const lines: string[] = [];
  let currentLine = '';

  for (let i = 0; i < words.length; i++) {
    const word = words[i];
    const testLine = currentLine ? `${currentLine} ${word}` : word;
    const testWidth = ctx.measureText(testLine).width;

    if (testWidth > maxWidth && currentLine) {
      lines.push(currentLine);
      currentLine = word;
      if (lines.length === maxLines - 1) {
        const remaining = words.slice(i).join(' ');
        let lastLine = remaining;
        while (ctx.measureText(`${lastLine}...`).width > maxWidth && lastLine.length > 0) {
          lastLine = lastLine.slice(0, -1).trimEnd();
        }
        lines.push(lastLine ? `${lastLine}...` : '...');
        return lines;
      }
    } else {
      currentLine = testLine;
    }
  }

  if (currentLine && lines.length < maxLines) {
    lines.push(currentLine);
  }

  return lines;
}

// ============================================================================
// HÀM HELPER: Vẽ nhãn thuốc y tế siêu to rõ, tối ưu hiệu năng GPU và bộ nhớ
// ============================================================================
function createBinTexture(
  binItem: BinItem,
  binNo: number,
  shelfNo: number,
  binStatus: WarehouseStatus,
  capacity: number,
  fillPercent: number,
  isSelected: boolean,
  isHighlighted: boolean
): THREE.CanvasTexture {
  // Kích thước 384x366 tối ưu tỷ lệ 0.82:0.78, giảm 44% dung lượng pixel so với 512x488
  const canvas = document.createElement('canvas');
  canvas.width = 384;
  canvas.height = 366;
  const ctx = canvas.getContext('2d');

  if (!ctx) {
    return new THREE.CanvasTexture(canvas);
  }

  const isEmpty = binStatus === 'EMPTY' || (binItem.currentStock || 0) === 0;
  const statusHex = STATUS_COLORS[binStatus]?.hex || '#cbd5e1';
  const hasHsd = (binStatus === 'NEAR_EXPIRY' || binStatus === 'EXPIRED') && !!binItem.nearestExpDate;

  // 1. Nền bo góc của nhãn thuốc
  const padding = 4;
  const w = 384 - padding * 2;
  const h = 366 - padding * 2;
  const r = 14;

  ctx.beginPath();
  ctx.roundRect(padding, padding, w, h, r);

  if (isSelected) {
    ctx.fillStyle = '#1d4ed8'; // blue-700
    ctx.fill();
    ctx.strokeStyle = '#ffffff';
    ctx.lineWidth = 6;
    ctx.stroke();
  } else if (isHighlighted) {
    ctx.fillStyle = '#fef08a'; // yellow-200
    ctx.fill();
    ctx.strokeStyle = '#d97706'; // amber-600
    ctx.lineWidth = 6;
    ctx.stroke();
  } else if (isEmpty) {
    ctx.fillStyle = '#f8fafc'; // slate-50
    ctx.fill();
    ctx.strokeStyle = '#cbd5e1'; // slate-300
    ctx.lineWidth = 3;
    ctx.stroke();
  } else {
    ctx.fillStyle = '#ffffff';
    ctx.fill();
    ctx.strokeStyle = '#cbd5e1';
    ctx.lineWidth = 3;
    ctx.stroke();
  }

  // 2. Header tinh gọn: Mã ô (B1..B10) + FEFO Badge bên trái | Tồn kho + Chấm trạng thái bên phải
  const textColor = isSelected
    ? '#ffffff'
    : isHighlighted
    ? '#0f172a'
    : isEmpty
    ? '#94a3b8'
    : '#0f172a';

  // Mã ô B1..B10
  ctx.fillStyle = textColor;
  ctx.font = '900 38px monospace, sans-serif';
  const codeText = `B${binNo}`;
  ctx.fillText(codeText, 20, 48);
  const codeWidth = ctx.measureText(codeText).width;

  // Badge FEFO nhỏ gọn
  if (binItem.hasReserveBatch) {
    const badgeX = 20 + codeWidth + 10;
    const badgeY = 22;
    const badgeW = 56;
    const badgeH = 26;
    ctx.beginPath();
    ctx.roundRect(badgeX, badgeY, badgeW, badgeH, 5);
    ctx.fillStyle = isSelected ? '#3b82f6' : '#fef3c7';
    ctx.fill();

    ctx.fillStyle = isSelected ? '#ffffff' : '#92400e';
    ctx.font = 'bold 15px sans-serif';
    ctx.fillText('FEFO', badgeX + 8, badgeY + 18);
  }

  // Góc phải Header: Chấm trạng thái tròn + Tồn kho
  const dotX = 384 - 20 - 11;
  const dotY = 38;
  ctx.beginPath();
  ctx.arc(dotX, dotY, 11, 0, Math.PI * 2);
  ctx.fillStyle = statusHex;
  ctx.fill();
  ctx.strokeStyle = isSelected ? '#ffffff' : 'rgba(0,0,0,0.2)';
  ctx.lineWidth = 2;
  ctx.stroke();

  // Số lượng tồn kho bên cạnh chấm tròn
  const stockStr = `${binItem.currentStock || 0}/${capacity}`;
  ctx.font = 'bold 22px monospace, sans-serif';
  ctx.fillStyle = isSelected ? 'rgba(255,255,255,0.85)' : '#475569';
  const stockW = ctx.measureText(stockStr).width;
  ctx.fillText(stockStr, dotX - 16 - stockW, 45);

  // Đường kẻ phân cách Header mỏng
  ctx.beginPath();
  ctx.moveTo(16, 62);
  ctx.lineTo(384 - 16, 62);
  ctx.strokeStyle = isSelected ? 'rgba(255,255,255,0.25)' : '#e2e8f0';
  ctx.lineWidth = 1.5;
  ctx.stroke();

  // 3. VÙNG TÊN THUỐC SIÊU TO: Chiếm trọn 75% diện tích mặt hộp
  const maxWidth = 384 - 40;
  const maxLines = hasHsd ? 4 : 5;
  const fontSize = hasHsd ? 34 : 36;
  const lineHeight = hasHsd ? 42 : 46;

  ctx.font = isEmpty
    ? `italic ${fontSize}px sans-serif`
    : `900 ${fontSize}px -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif`;
  ctx.fillStyle = textColor;

  const medName = binItem.medicineName || (isEmpty ? 'Ô Trống' : 'Chưa đặt tên');
  const lines = wrapText(ctx, medName, maxWidth, maxLines);

  // Căn giữa dọc để tên thuốc hiển thị cân đối và nổi bật nhất
  const topBound = 64;
  const bottomBound = hasHsd ? 312 : 350;
  const availableHeight = bottomBound - topBound;
  const totalTextHeight = lines.length * lineHeight;
  const startY = topBound + Math.max(8, (availableHeight - totalTextHeight) / 2) + fontSize * 0.82;

  lines.forEach((line, idx) => {
    ctx.fillText(line, 20, startY + idx * lineHeight);
  });

  // 4. Đáy hộp: Cảnh báo HSD nếu cận hạn/hết hạn, hoặc vạch màu trạng thái tinh tế
  if (hasHsd) {
    const hsdY = 318;
    const hsdH = 36;
    ctx.beginPath();
    ctx.roundRect(16, hsdY, 384 - 32, hsdH, 6);
    ctx.fillStyle = isSelected ? '#ef4444' : '#fee2e2';
    ctx.fill();
    ctx.strokeStyle = isSelected ? '#b91c1c' : '#fca5a5';
    ctx.lineWidth = 1.5;
    ctx.stroke();

    ctx.fillStyle = isSelected ? '#ffffff' : '#b91c1c';
    ctx.font = 'bold 20px sans-serif';
    const hsdText = `HSD: ${binItem.nearestExpDate!.slice(0, 7)}`;
    const hsdW = ctx.measureText(hsdText).width;
    ctx.fillText(hsdText, 192 - hsdW / 2, hsdY + 25);
  } else {
    // Vạch mảnh tinh tế chỉ thị màu trạng thái ở đáy
    ctx.beginPath();
    ctx.roundRect(16, 356, 384 - 32, 5, 2);
    ctx.fillStyle = isSelected ? '#ffffff' : statusHex;
    ctx.fill();
  }

  // Tạo CanvasTexture tối ưu: Tắt generateMipmaps để nạp VRAM tức thì, không frame drop
  const texture = new THREE.CanvasTexture(canvas);
  texture.colorSpace = THREE.SRGBColorSpace;
  texture.minFilter = THREE.LinearFilter;
  texture.magFilter = THREE.LinearFilter;
  texture.generateMipmaps = false;
  texture.needsUpdate = true;

  return texture;
}

// ============================================================================
// COMPONENT CON: Ô Thùng Thuốc 3D Đơn Vị (BinUnit)
// ============================================================================
interface BinUnitProps {
  binItem: BinItem;
  binNo: number;
  shelfNo: number;
  isSelected: boolean;
  isHighlighted: boolean;
  boxHeight: number;
  binDepth: number;
  onSelect: () => void;
}

const BinUnit: React.FC<BinUnitProps> = React.memo(({
  binItem,
  binNo,
  shelfNo,
  isSelected,
  isHighlighted,
  boxHeight,
  binDepth,
  onSelect,
}) => {
  const binStatus = binItem.status || 'EMPTY';
  const capacity = binItem.maxCapacity || 200;
  const fillPercent = Math.min(100, Math.round(((binItem.currentStock || 0) / capacity) * 100));

  // Luôn dùng vật liệu chuẩn sáng rõ, không làm mờ các thùng khác khi click chọn thuốc
  const mat = statusNormalMaterials[binStatus] || statusNormalMaterials.EMPTY;

  // Tạo Canvas Texture sắc nét cho mặt trước
  const texture = useMemo(() => {
    return createBinTexture(
      binItem,
      binNo,
      shelfNo,
      binStatus,
      capacity,
      fillPercent,
      isSelected,
      isHighlighted
    );
  }, [
    binItem.medicineName,
    binItem.currentStock,
    binItem.hasReserveBatch,
    binItem.nearestExpDate,
    binStatus,
    capacity,
    fillPercent,
    isSelected,
    isHighlighted,
    shelfNo,
    binNo,
  ]);

  // Giải phóng texture khi unmount hoặc texture thay đổi để chống leak RAM/VRAM
  useEffect(() => {
    return () => {
      texture.dispose();
    };
  }, [texture]);

  // Vị trí mặt trước: z = binDepth / 2 + 0.002 để nằm sát khít mặt hộp, tránh z-fighting
  const faceZ = binDepth / 2 + 0.002;

  return (
    <>
      {/* 1. Khối hộp 3D của thùng thuốc */}
      <mesh
        position={[0, boxHeight / 2, 0]}
        scale={[1, boxHeight, 1]}
        geometry={binUnitGeometry}
        material={mat}
        raycast={() => null}
      />

      {/* 2. Đường viền mảnh định hình khối hộp */}
      <lineSegments
        position={[0, boxHeight / 2, 0]}
        geometry={binEdgesGeometry}
        material={binEdgeLineMaterial}
        raycast={() => null}
      />

      {/* 3. Mặt trước: Three.js Mesh với CanvasTexture dán khít 100% - luôn sáng rõ 100% */}
      <mesh
        position={[0, boxHeight / 2, faceZ]}
        geometry={binFacePlaneGeometry}
        raycast={() => null}
      >
        <meshBasicMaterial
          map={texture}
        />
      </mesh>

      {/* 4. Hitbox bắt click chuẩn xác tại đúng vị trí ô thùng */}
      <mesh
        position={[0, boxHeight / 2, 0]}
        geometry={binHitboxGeometry}
        visible={false}
        onPointerOver={(e) => {
          e.stopPropagation();
          document.body.style.cursor = 'pointer';
        }}
        onPointerOut={() => {
          document.body.style.cursor = 'auto';
        }}
        onClick={(e) => {
          e.stopPropagation();
          onSelect();
        }}
      />

      {/* 5. Cột sáng định vị và vòng hào quang phát sáng chỉ đích danh Ô Thùng được tìm kiếm */}
      {isHighlighted && (
        <group position={[0, boxHeight, 0]}>
          {/* Vòng hào quang phát quang vàng hổ phách trên nóc thùng */}
          <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, 0.02, 0]}>
            <ringGeometry args={[0.15, 0.45, 32]} />
            <meshBasicMaterial color="#f59e0b" side={THREE.DoubleSide} transparent opacity={0.85} depthWrite={false} />
          </mesh>
          {/* Cột sáng mini định vị vươn cao */}
          <mesh position={[0, 0.45, 0]}>
            <cylinderGeometry args={[0.04, 0.16, 0.9, 16]} />
            <meshBasicMaterial color="#fbbf24" transparent opacity={0.75} depthWrite={false} />
          </mesh>
          {/* Badge nhấp nháy chỉ đúng vị trí thùng */}
          <Html position={[0, 1.15, 0]} center zIndexRange={[100, 0]} style={{ pointerEvents: 'none' }}>
            <div className="bg-amber-500 text-slate-900 font-extrabold text-[11px] px-3 py-1 rounded-full shadow-2xl border-2 border-white animate-bounce whitespace-nowrap flex items-center gap-1.5">
              <span>📍 Thùng B{binNo} — Tầng {shelfNo}</span>
            </div>
          </Html>
        </group>
      )}
    </>
  );
});

// ============================================================================
// COMPONENT CHÍNH: RackBins (4 Tầng x 10 Thùng)
// ============================================================================
interface RackBinsProps {
  rack: string;
  layout?: ShelfBinLayout[];
  status: RackLayoutStatus;
  errorMessage?: string | null;
  retry?: () => void;
  shelfFocus: number | null;
  selectedBin: number | null;
  highlightTarget?: string;
  warnOnly?: boolean;
  isModalOpen?: boolean;
  onSelectBin: (shelf: number, bin: number) => void;
}

export const RackBins: React.FC<RackBinsProps> = React.memo(({
  rack,
  layout,
  status,
  errorMessage,
  retry,
  shelfFocus,
  selectedBin,
  highlightTarget,
  warnOnly = false,
  onSelectBin,
}) => {
  const placement = RACK_PLACEMENTS[rack];
  if (!placement) return null;

  const parsedHighlight = parseWarehouseTargetId(highlightTarget);
  const isTargetThisRack = parsedHighlight?.rack === rack;

  const {
    shelfHeights,
    shelfThickness,
    binSpacing,
    binDepth,
    uniformBinHeight,
  } = RACK_DIMENSIONS;

  return (
    <group
      position={placement.position}
      rotation={[0, placement.rotationY, 0]}
    >
      {/* 1. Trạng thái Đang tải Layout */}
      {status === 'loading' && (
        <Html position={[0, 2.2, 0]} center zIndexRange={[10, 0]} style={{ pointerEvents: 'none' }}>
          <div className="bg-slate-900/90 text-white px-4 py-2 rounded-xl text-xs font-semibold backdrop-blur-md shadow-xl flex items-center gap-2 border border-slate-700">
            <span className="w-2.5 h-2.5 border-2 border-sky-400 border-t-transparent rounded-full animate-spin" />
            Đang tải sơ đồ 40 thùng kệ {rack}...
          </div>
        </Html>
      )}

      {/* 2. Trạng thái Lỗi tải */}
      {status === 'error' && (
        <Html position={[0, 2.2, 0]} center zIndexRange={[10, 0]}>
          <div className="bg-red-50 text-red-900 p-4 rounded-2xl text-xs font-semibold shadow-xl border border-red-200 flex flex-col items-center gap-2 max-w-xs text-center">
            <div className="text-red-600 font-bold">Không thể tải dữ liệu kệ {rack}</div>
            <div className="text-[11px] text-red-500 font-normal">{errorMessage || 'Lỗi kết nối máy chủ'}</div>
            {retry && (
              <button
                type="button"
                onClick={retry}
                className="mt-1 px-3 py-1 bg-red-600 text-white rounded-lg text-xs font-bold hover:bg-red-700 cursor-pointer shadow-xs transition"
              >
                Thử lại ngay
              </button>
            )}
          </div>
        </Html>
      )}

      {/* 3. Trạng thái Đã sẵn sàng (Ready): Vẽ chính xác 4 Tầng x 10 Thùng */}
      {status === 'ready' && layout && (
        <group>
          {layout.map((sh) => {
            const shelfNo = sh.shelfNo;
            const shelfY = shelfHeights[shelfNo - 1];
            if (shelfY === undefined) return null;

            // Đáy thùng nằm sát khít mặt trên của thanh kệ (shelfY + shelfThickness / 2)
            const yBase = shelfY + shelfThickness / 2;

            return (
              <group key={shelfNo}>
                {sh.bins.map((binItem: BinItem) => {
                  const binNo = binItem.binNo;
                  // Công thức đối xứng tâm kệ X = 0: binNo từ 1..10 -> hệ số từ -4.5 đến +4.5
                  const xPos = (binNo - 5.5) * binSpacing;

                  const isSelected = shelfFocus === shelfNo && selectedBin === binNo;
                  const isHighlighted =
                    isTargetThisRack &&
                    parsedHighlight?.shelf === shelfNo &&
                    parsedHighlight?.binNo === binNo;

                  const binStatus = binItem.status || 'EMPTY';

                  if (warnOnly && (binStatus === 'NORMAL' || binStatus === 'EMPTY') && !isHighlighted && !isSelected) {
                    return null;
                  }

                  return (
                    <group key={binNo} position={[xPos, yBase, 0]}>
                      <BinUnit
                        binItem={binItem}
                        binNo={binNo}
                        shelfNo={shelfNo}
                        isSelected={isSelected}
                        isHighlighted={isHighlighted}
                        boxHeight={uniformBinHeight}
                        binDepth={binDepth}
                        onSelect={() => onSelectBin(shelfNo, binNo)}
                      />
                    </group>
                  );
                })}
              </group>
            );
          })}
        </group>
      )}
    </group>
  );
});
