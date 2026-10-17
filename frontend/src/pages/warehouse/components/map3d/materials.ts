// ============================================================================
// Vật Liệu & Hình Học Dùng Chung (Module-Scope Shared Geometries & Materials)
// Dự án: WDP301 - Sơ Đồ Kho 3D Central Warehouse
// ============================================================================

import * as THREE from 'three';
import { STATUS_COLORS, WarehouseStatus, RACK_DIMENSIONS } from './constants';

// ==========================================
// 1. HÌNH HỌC DÙNG CHUNG (GEOMETRIES)
// ==========================================

// Cột trụ đứng kệ (4 cột thép mỗi kệ)
export const uprightGeometry = new THREE.BoxGeometry(0.10, RACK_DIMENSIONS.height, 0.10);

// Thanh giằng đỉnh kệ mặt trước và mặt sau (dài theo trục X)
export const topBeamLongGeometry = new THREE.BoxGeometry(RACK_DIMENSIONS.width, 0.08, 0.08);

// Thanh giằng đỉnh kệ mặt bên (ngang theo trục Z)
export const topBeamSideGeometry = new THREE.BoxGeometry(0.08, 0.08, RACK_DIMENSIONS.depth);

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

// Khối hàng thùng thuốc chuẩn (chiều cao cơ sở 1.0, scale theo boxHeight)
export const binUnitGeometry = new THREE.BoxGeometry(
  RACK_DIMENSIONS.binWidth,
  1.0,
  RACK_DIMENSIONS.binDepth
);

// Viền khung mảnh cho thùng thuốc để phân tách rõ từng ô trên kệ
export const binEdgesGeometry = new THREE.EdgesGeometry(
  new THREE.BoxGeometry(
    RACK_DIMENSIONS.binWidth,
    RACK_DIMENSIONS.uniformBinHeight,
    RACK_DIMENSIONS.binDepth
  )
);

// Hitbox bao phủ chính xác không gian ô thùng
export const binHitboxGeometry = new THREE.BoxGeometry(
  RACK_DIMENSIONS.binSpacing - 0.02,
  0.85,
  RACK_DIMENSIONS.binDepth + 0.1
);

// Mặt phẳng nhãn thuốc phủ kín 100% mặt trước thùng thuốc (Mesh Native)
export const binFacePlaneGeometry = new THREE.PlaneGeometry(
  RACK_DIMENSIONS.binWidth,
  RACK_DIMENSIONS.uniformBinHeight
);

// Tấm giả bóng dưới chân kệ
export const shadowPlateGeometry = new THREE.PlaneGeometry(
  RACK_DIMENSIONS.width + 0.4,
  RACK_DIMENSIONS.depth + 0.4
);

// Cột trụ Beacon định vị mục tiêu tìm kiếm (cao 14m, phát sáng hổ phách amber/gold)
export const beaconCylinderGeometry = new THREE.CylinderGeometry(0.35, 0.65, 14.0, 16);
export const beaconHaloGeometry = new THREE.RingGeometry(0.4, 2.4, 32);

// ==========================================
// 2. VẬT LIỆU DÙNG CHUNG (MATERIALS)
// ==========================================

export const steelNormalMaterial = new THREE.MeshLambertMaterial({
  color: 0x334155, // slate-700 cứng cáp, rõ nét
});

export const steelGhostMaterial = new THREE.MeshLambertMaterial({
  color: 0xcbd5e1,
  transparent: true,
  opacity: 0.10,
  depthWrite: false,
});

export const shadowPlateMaterial = new THREE.MeshBasicMaterial({
  color: 0x94a3b8,
  transparent: true,
  opacity: 0.18,
  depthWrite: false,
});

export const floorEpoxyMaterial = new THREE.MeshLambertMaterial({
  color: 0xe2e8f0, // Sàn phẳng đồng nhất, dịu mắt
});

export const beaconColumnMaterial = new THREE.MeshBasicMaterial({
  color: 0xfbbf24, // amber-400 vàng hổ phách phát sáng rực rỡ
  transparent: true,
  opacity: 0.55,
  depthWrite: false,
});

export const beaconHaloMaterial = new THREE.MeshBasicMaterial({
  color: 0xf59e0b, // amber-500
  transparent: true,
  opacity: 0.60,
  side: THREE.DoubleSide,
  depthWrite: false,
});

export const binEdgeLineMaterial = new THREE.LineBasicMaterial({
  color: 0x1e293b,
  transparent: true,
  opacity: 0.22,
});

const statuses: WarehouseStatus[] = ['NORMAL', 'LOW_STOCK', 'NEAR_EXPIRY', 'EXPIRED', 'EMPTY'];

export const statusNormalMaterials: Record<WarehouseStatus, THREE.MeshLambertMaterial> = {} as any;
export const statusDimMaterials: Record<WarehouseStatus, THREE.MeshLambertMaterial> = {} as any;
export const statusGhostMaterials: Record<WarehouseStatus, THREE.MeshLambertMaterial> = {} as any;

statuses.forEach((status) => {
  const col = STATUS_COLORS[status].num;

  statusNormalMaterials[status] = new THREE.MeshLambertMaterial({
    color: col,
  });

  statusDimMaterials[status] = new THREE.MeshLambertMaterial({
    color: col,
    transparent: true,
    opacity: 0.28,
  });

  statusGhostMaterials[status] = new THREE.MeshLambertMaterial({
    color: col,
    transparent: true,
    opacity: 0.10,
    depthWrite: false,
  });
});
