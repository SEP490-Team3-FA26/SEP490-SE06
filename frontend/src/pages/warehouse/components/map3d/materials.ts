// ============================================================================
// Vật liệu & Hình học Dùng Chung (Module-Scope Shared Geometries & Materials)
// Dự án: WDP301 - Sơ Đồ Kho 3D Central Warehouse
// Không khởi tạo mới trong vòng render (Không rò rỉ GPU memory)
// ============================================================================

import * as THREE from 'three';
import { STATUS_COLORS, WarehouseStatus, RACK_DIMENSIONS } from './constants';

// ==========================================
// 1. HÌNH HỌC DÙNG CHUNG (GEOMETRIES)
// ==========================================

// Cột trụ đứng kệ (4 cột thép mỗi kệ)
export const uprightGeometry = new THREE.BoxGeometry(0.08, RACK_DIMENSIONS.height, 0.08);

// Xà ngang chịu lực của kệ
export const shelfBeamGeometry = new THREE.BoxGeometry(RACK_DIMENSIONS.shelfWidth, 0.06, 0.06);

// Khay/dải tầng chịu tải chứa 10 ô thùng (4 tầng mỗi kệ)
export const shelfBandGeometry = new THREE.BoxGeometry(
  RACK_DIMENSIONS.shelfWidth,
  RACK_DIMENSIONS.shelfThickness,
  RACK_DIMENSIONS.shelfDepth
);

// Hitbox bấm chọn cả kệ (Overview mode)
export const rackHitboxGeometry = new THREE.BoxGeometry(
  RACK_DIMENSIONS.width + 0.2,
  RACK_DIMENSIONS.height + 0.2,
  RACK_DIMENSIONS.depth + 0.2
);

// Khối hàng thùng thuốc (Unit box, scale theo số lượng tồn kho)
export const binUnitGeometry = new THREE.BoxGeometry(
  RACK_DIMENSIONS.binWidth,
  1.0,
  RACK_DIMENSIONS.binDepth
);

// Hitbox bao phủ toàn bộ ô thùng để click mượt ở RACK view
export const binHitboxGeometry = new THREE.BoxGeometry(0.86, 0.98, 1.3);

// Tấm giả bóng dưới chân kệ (tạo chiều sâu mà không tốn shadow map)
export const shadowPlateGeometry = new THREE.PlaneGeometry(
  RACK_DIMENSIONS.width + 0.4,
  RACK_DIMENSIONS.depth + 0.4
);

// Cột trụ Beacon định vị mục tiêu tìm kiếm (tĩnh, không animation nặng)
export const beaconCylinderGeometry = new THREE.CylinderGeometry(0.3, 0.3, 9.0, 16);
export const beaconRingGeometry = new THREE.RingGeometry(0.6, 0.9, 24);

// ==========================================
// 2. VẬT LIỆU DÙNG CHUNG (MATERIALS)
// ==========================================

// Vật liệu khung thép bình thường
export const steelNormalMaterial = new THREE.MeshLambertMaterial({
  color: 0x475569, // slate-600
});

// Vật liệu khung thép mờ ma (Ghost mode khi focus kệ khác hoặc lọc)
export const steelGhostMaterial = new THREE.MeshLambertMaterial({
  color: 0x94a3b8,
  transparent: true,
  opacity: 0.12,
  depthWrite: false,
});

// Vật liệu giả bóng đổ tiếp xúc sàn
export const shadowPlateMaterial = new THREE.MeshBasicMaterial({
  color: 0x94a3b8,
  transparent: true,
  opacity: 0.22,
  depthWrite: false,
});

// Vật liệu sàn kho epoxy phòng sạch
export const floorEpoxyMaterial = new THREE.MeshLambertMaterial({
  color: 0xf1f5f9, // slate-100 sáng sạch
});

// Vật liệu cột Beacon tìm kiếm tĩnh
export const beaconColumnMaterial = new THREE.MeshBasicMaterial({
  color: 0x38bdf8, // sky-400
  transparent: true,
  opacity: 0.3,
  depthWrite: false,
});

export const beaconRingMaterial = new THREE.MeshBasicMaterial({
  color: 0x0284c7, // sky-600
  side: THREE.DoubleSide,
  transparent: true,
  opacity: 0.8,
});

// 5 trạng thái kho GSP (NORMAL, LOW_STOCK, NEAR_EXPIRY, EXPIRED, EMPTY)
// Mỗi trạng thái có 3 biến thể: normal (rõ), dim (mờ khi focus tầng khác), ghost (mờ ma)
const statuses: WarehouseStatus[] = ['NORMAL', 'LOW_STOCK', 'NEAR_EXPIRY', 'EXPIRED', 'EMPTY'];

export const statusNormalMaterials: Record<WarehouseStatus, THREE.MeshLambertMaterial> = {} as any;
export const statusDimMaterials: Record<WarehouseStatus, THREE.MeshLambertMaterial> = {} as any;
export const statusGhostMaterials: Record<WarehouseStatus, THREE.MeshLambertMaterial> = {} as any;

statuses.forEach((status) => {
  const col = STATUS_COLORS[status].num;

  // Bản hiển thị bình thường
  statusNormalMaterials[status] = new THREE.MeshLambertMaterial({
    color: col,
  });

  // Bản làm mờ 30% khi người dùng chọn xem 1 tầng cụ thể
  statusDimMaterials[status] = new THREE.MeshLambertMaterial({
    color: col,
    transparent: true,
    opacity: 0.3,
  });

  // Bản mờ ma 12% khi kệ không nằm trong bộ lọc tìm kiếm
  statusGhostMaterials[status] = new THREE.MeshLambertMaterial({
    color: col,
    transparent: true,
    opacity: 0.12,
    depthWrite: false,
  });
});
