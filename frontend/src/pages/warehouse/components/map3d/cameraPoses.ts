// ============================================================================
// Tính Toán Vị Trí Camera Thuần Túy (Pure Camera Poses)
// Dự án: WDP301 - Sơ Đồ Kho 3D Central Warehouse
// Không phụ thuộc state phức tạp, tính trực tiếp từ view và tỉ lệ màn hình
// ============================================================================

import { FOV, RACK_DIMENSIONS, RACK_PLACEMENTS } from './constants';
import type { View } from './store';

const rad = (d: number) => (d * Math.PI) / 180;
export type Vec3 = [number, number, number];

// ----- OVERVIEW CONFIG -----
// Góc nâng 65° nhìn từ phía Nam (+Z) về phía Bắc (-Z)
// Đảm bảo hàng kệ trước không che khuất màu tầng của hàng kệ sau
const OV_ELEV = rad(65);
const OV_TARGET: Vec3 = [0, 0, 3]; // Tâm hình học của kho (x: -28..28, z: -19..26)
const OV_W = 58;
const OV_DEPTH = 46;
const OV_MARGIN = 1.1;

// ----- RACK VIEW CONFIG -----
// Góc nghiêng nhẹ 4° để người nhìn cảm nhận được chiều sâu khay thùng
const RACK_PITCH = rad(4);
const RACK_FILL = 1.12; // Kệ rộng 9.2m chiếm ~89% chiều ngang khung hình

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

  // Chế độ RACK: Bay trực diện vào kệ
  const placement = RACK_PLACEMENTS[view.rack];
  const [rx, , rz] = placement ? placement.position : [0, 0, 0];
  const { width, height, depth } = RACK_DIMENSIONS;

  const byW = (width * RACK_FILL) / 2 / tanH;
  const byH = (height * 1.25) / 2 / tanV; // Dành khoảng trống hiển thị nhãn nóc kệ
  const D = Math.max(byW, byH) + depth / 2;
  const targetY = 2.4; // Tâm chiều cao của kệ (kệ cao 4.8m)

  return {
    target: [rx, targetY, rz],
    pos: [rx, targetY + Math.sin(RACK_PITCH) * D, rz + Math.cos(RACK_PITCH) * D],
  };
}
