import React, { useMemo } from 'react';
import * as THREE from 'three';
import {
  ZoneSummary,
  ZONE_METAS,
  RACK_PLACEMENTS,
  ShelfBinLayout,
} from './constants';
import { RackUnit3D } from './RackUnit3D';

interface ZoneGroup3DProps {
  zoneData: ZoneSummary;
  focusRack?: string | null;
  rackLayoutCache: Record<string, ShelfBinLayout[]>;
  highlightTargets?: Set<string>;
  highlightTarget?: string;
  selectedEntity?: any;
  fefoXrayMode?: boolean;
  onSelectZone?: (zone: string) => void;
  onSelectRack?: (zone: string, rack: string) => void;
  onSelectShelf?: (zone: string, rack: string, shelf: number) => void;
  onSelectBin?: (zone: string, rack: string, shelf: number, bin: number, data?: any) => void;
  onHover?: (hoverInfo: any) => void;
  onUnhover?: () => void;
}

// Helper tạo canvas texture bảng tên phân khu
function createZoneSignTexture(name: string, desc: string, hexColor: string): THREE.CanvasTexture {
  const canvas = document.createElement('canvas');
  canvas.width = 768;
  canvas.height = 192;
  const ctx = canvas.getContext('2d');
  if (ctx) {
    ctx.fillStyle = '#0f172a';
    ctx.roundRect(6, 6, canvas.width - 12, canvas.height - 12, 18);
    ctx.fill();

    ctx.lineWidth = 10;
    ctx.strokeStyle = hexColor;
    ctx.roundRect(6, 6, canvas.width - 12, canvas.height - 12, 18);
    ctx.stroke();

    ctx.fillStyle = '#ffffff';
    ctx.font = 'bold 50px sans-serif';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText(name.toUpperCase(), canvas.width / 2, 65);

    ctx.fillStyle = '#94a3b8';
    ctx.font = '600 28px sans-serif';
    ctx.fillText(desc, canvas.width / 2, 130);
  }

  const texture = new THREE.CanvasTexture(canvas);
  texture.minFilter = THREE.LinearFilter;
  return texture;
}

export function ZoneGroup3D({
  zoneData,
  focusRack,
  rackLayoutCache,
  highlightTargets,
  highlightTarget,
  selectedEntity,
  fefoXrayMode = false,
  onSelectZone,
  onSelectRack,
  onSelectShelf,
  onSelectBin,
  onHover,
  onUnhover,
}: ZoneGroup3DProps) {
  const meta = ZONE_METAS[zoneData.zone] || ZONE_METAS.F;
  const [centerX, centerZ] = meta.center;
  const [zoneWidth, zoneDepth] = meta.size;

  const isZoneSelected = selectedEntity?.zone === zoneData.zone;

  // Tạo texture biển phân khu
  const zoneSignTexture = useMemo(() => {
    return createZoneSignTexture(meta.name, meta.categoryDesc, meta.hex);
  }, [meta.name, meta.categoryDesc, meta.hex]);

  return (
    <group name={`Zone-${zoneData.zone}`}>
      {/* 1. THẢM NỀN PHÂN KHU (ZONE FLOOR MAT) */}
      <mesh
        rotation={[-Math.PI / 2, 0, 0]}
        position={[centerX, 0.008, centerZ]}
        receiveShadow
        onClick={(e) => {
          e.stopPropagation();
          onSelectZone?.(zoneData.zone);
        }}
        onPointerOver={(e) => {
          e.stopPropagation();
          const totalStock = zoneData.racks.reduce(
            (acc, r) => acc + r.shelves.reduce((s, sh) => s + (sh.totalStock || 0), 0),
            0
          );
          onHover?.({
            type: 'zone',
            zone: zoneData.zone,
            title: `${meta.name} — ${meta.categoryDesc}`,
            subtitle: `${zoneData.racks.length} dãy kệ · ${zoneData.racks.reduce((a, r) => a + r.shelves.length, 0)} tầng`,
            stock: totalStock,
            screenX: e.clientX,
            screenY: e.clientY,
          });
        }}
        onPointerOut={(e) => {
          e.stopPropagation();
          onUnhover?.();
        }}
      >
        <planeGeometry args={[zoneWidth, zoneDepth]} />
        <meshBasicMaterial
          color={meta.hex}
          transparent
          opacity={isZoneSelected ? 0.22 : 0.08}
        />
      </mesh>

      {/* 2. BIỂN TÊN PHÂN KHU 3D ĐỨNG ĐẦU DÃY */}
      <mesh
        position={[centerX - zoneWidth / 2 + 1.2, 2.2, centerZ - zoneDepth / 2 - 0.6]}
        rotation={[0, 0, 0]}
        castShadow
      >
        <boxGeometry args={[4.2, 1.4, 0.16]} />
        <meshBasicMaterial map={zoneSignTexture} />
      </mesh>

      {/* 3. CÁC DÃY KỆ TRONG KHU (RACK UNITS) */}
      {zoneData.racks.map((rackSummary) => {
        const placement = RACK_PLACEMENTS[rackSummary.rack];
        if (!placement) return null;

        const isCurrentRackFocused = focusRack === rackSummary.rack;
        const cacheKey = `${zoneData.zone}-${rackSummary.rack}`;
        const shelfBinLayout = rackLayoutCache[cacheKey];

        return (
          <RackUnit3D
            key={rackSummary.rack}
            rackData={rackSummary}
            zone={zoneData.zone}
            position={placement.position}
            isFocused={isCurrentRackFocused}
            shelfBinLayout={shelfBinLayout}
            highlightTargets={highlightTargets}
            highlightTarget={highlightTarget}
            selectedEntity={selectedEntity}
            fefoXrayMode={fefoXrayMode}
            onSelectRack={onSelectRack}
            onSelectShelf={onSelectShelf}
            onSelectBin={onSelectBin}
            onHover={onHover}
            onUnhover={onUnhover}
          />
        );
      })}
    </group>
  );
}
