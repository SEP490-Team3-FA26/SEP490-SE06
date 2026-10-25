// ============================================================================
// Tính Toán Vị Trí Camera Thuần Túy (Pure Camera Poses)
// Dự án: WDP301 - Sơ Đồ Kho 3D Central Warehouse
// ============================================================================

import { FOV, RACK_DIMENSIONS, RACK_PLACEMENTS } from './constants';
import type { View } from './store';

const rad = (d: number) => (d * Math.PI) / 180;
export type Vec3 = [number, number, number];

// ----- OVERVIEW CONFIG -----
const OV_ELEV = rad(62);
const OV_TARGET: Vec3 = [0, 0, 2.5];
const OV_W = 58;
const OV_DEPTH = 45;
const OV_MARGIN = 1.12;

// ----- RACK VIEW CONFIG -----
// Góc nhìn trực diện vuông góc (1.0 độ) vào đúng tâm dọc của 4 tầng (2.15m)
const RACK_PITCH = rad(1.0);
const RACK_FILL = 1.12;

export function getPose(view: View, aspect: number): { pos: Vec3; target: Vec3 } {
  const safeAspect = aspect > 0 ? aspect : 16 / 9;
  const tanV = Math.tan(rad(FOV) / 2);
  const tanH = tanV * safeAspect;

  if (view.level === 'overview') {
    const needW = (OV_W * OV_MARGIN) / 2 / tanH;
    const projH = OV_DEPTH * Math.sin(OV_ELEV) + 5 * Math.cos(OV_ELEV);
    const needH = (projH * OV_MARGIN) / 2 / tanV;
    const dist = Math.max(needW, needH);

    return {
      target: OV_TARGET,
      pos: [
        OV_TARGET[0],
        OV_TARGET[1] + Math.sin(OV_ELEV) * dist,
        OV_TARGET[2] + Math.cos(OV_ELEV) * dist,
      ],
    };
  }

  // Chế độ RACK: Bay trực diện vào chính tâm kệ hoặc hướng thẳng vào ô thùng mục tiêu
  const placement = RACK_PLACEMENTS[view.rack];
  const [rx, , rz] = placement ? placement.position : [0, 0, 0];
  const { width, height, depth, shelfHeights, binSpacing } = RACK_DIMENSIONS;

  let targetY = 2.25; // Mặc định tâm đối xứng dọc chuẩn xác của 4 tầng kệ (cao 4.30m)
  let targetX = rx;
  let zoomMultiplier = 1.0;

  // Nếu có chỉ định tầng cụ thể: căn chỉnh độ cao camera vào đúng tầng đó
  if (view.shelf && shelfHeights[view.shelf - 1] !== undefined) {
    targetY = shelfHeights[view.shelf - 1] + 0.45;
    zoomMultiplier = 0.90;
  }

  // Nếu có chỉ định ô thùng cụ thể: dịch chuyển tâm nhìn và zoom gần vào ô thùng
  if (view.bin && view.bin >= 1 && view.bin <= 10) {
    const binXOffset = (view.bin - 5.5) * binSpacing * 0.40;
    targetX = rx + binXOffset;
    zoomMultiplier = 0.80; // Zoom gần để nhãn thuốc hiển thị rõ nét ngay trước mắt
  }

  const byW = (width * RACK_FILL) / 2 / tanH;
  const byH = (height * 1.16) / 2 / tanV;
  const D = (Math.max(byW, byH) + depth / 2) * zoomMultiplier;

  return {
    target: [targetX, targetY, rz],
    pos: [targetX, targetY + Math.sin(RACK_PITCH) * D, rz + Math.cos(RACK_PITCH) * D],
  };
}
