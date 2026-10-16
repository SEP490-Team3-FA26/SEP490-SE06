import React, { useRef, useEffect } from 'react';
import * as THREE from 'three';
import { Canvas, useThree, useFrame } from '@react-three/fiber';
import { OrbitControls } from '@react-three/drei';
import type { OrbitControls as OrbitControlsImpl } from 'three-stdlib';
import {
  WarehouseMap3DProps,
  ZoneSummary,
} from './map3d/constants';
import {
  useWarehouse3DState,
  DEFAULT_CAMERA_POS,
  DEFAULT_CAMERA_TARGET,
  CameraGoal,
} from './map3d/useWarehouse3DState';
import { SceneEnvironment } from './map3d/SceneEnvironment';
import { DockStation3D } from './map3d/DockStation3D';
import { ZoneGroup3D } from './map3d/ZoneGroup3D';
import { TacticalOverlays3D } from './map3d/TacticalOverlays3D';
import { AutonomousFleet3D } from './map3d/AutonomousFleet3D';
import { WarehouseHudOverlay } from './map3d/WarehouseHudOverlay';

// Camera Rig xử lý hiệu ứng bay mượt (Fly-to Lerp) tới mục tiêu
function CameraRig({
  cameraGoal,
  controlsRef,
  isUserInteractingRef,
}: {
  cameraGoal: CameraGoal | null;
  controlsRef: React.RefObject<OrbitControlsImpl | null>;
  isUserInteractingRef: React.MutableRefObject<boolean>;
}) {
  const { camera } = useThree();

  useFrame((_, delta) => {
    if (!cameraGoal || isUserInteractingRef.current) return;

    // Di chuyển vị trí camera mượt mà
    const targetCamPos = new THREE.Vector3(...cameraGoal.position);
    camera.position.lerp(targetCamPos, Math.min(1, delta * 4.2));

    // Di chuyển tâm nhìn của OrbitControls
    if (controlsRef.current) {
      const targetLookAt = new THREE.Vector3(...cameraGoal.target);
      controlsRef.current.target.lerp(targetLookAt, Math.min(1, delta * 4.5));
      controlsRef.current.update();
    }
  });

  return null;
}

export interface ExtendedWarehouseMap3DProps extends WarehouseMap3DProps {
  onSwitchTo2D?: () => void;
}

export function WarehouseMap3D({
  zones,
  onShelfSelect,
  onBinSelect,
  onZoneClick,
  highlightTargets,
  highlightTarget,
  onSwitchTo2D,
}: ExtendedWarehouseMap3DProps) {
  const controlsRef = useRef<OrbitControlsImpl | null>(null);

  const {
    selectedEntity,
    hoveredEntity,
    setHoveredEntity,
    focusRack,
    fefoXrayMode,
    toggleFefoXray,
    rackLayoutCache,
    cameraGoal,
    isUserInteractingRef,
    selectZone,
    selectRack,
    selectShelf,
    selectBin,
    resetCamera,
    rotateCamera,
    zoomCamera,
  } = useWarehouse3DState(
    zones,
    highlightTarget,
    onShelfSelect,
    onBinSelect,
    onZoneClick
  );

  // Khi có cameraGoal mới, mở khóa trạng thái bay mượt
  useEffect(() => {
    if (cameraGoal) {
      isUserInteractingRef.current = false;
    }
  }, [cameraGoal, isUserInteractingRef]);

  return (
    <div className="relative w-full h-full min-h-[640px] overflow-hidden bg-[#EEF2F9] rounded-2xl select-none">
      {/* 1. THREE.JS REACT THREE FIBER CANVAS */}
      <Canvas
        shadows
        camera={{
          position: DEFAULT_CAMERA_POS,
          fov: 42,
          near: 0.5,
          far: 350,
        }}
        gl={{
          antialias: true,
          powerPreference: 'high-performance',
        }}
        className="w-full h-full cursor-grab active:cursor-grabbing"
      >
        {/* Điều khiển Camera bay mượt */}
        <CameraRig
          cameraGoal={cameraGoal}
          controlsRef={controlsRef}
          isUserInteractingRef={isUserInteractingRef}
        />

        {/* Orbit Controls giới hạn chống lật sàn */}
        <OrbitControls
          ref={controlsRef}
          makeDefault
          target={DEFAULT_CAMERA_TARGET}
          minDistance={6}
          maxDistance={145}
          maxPolarAngle={Math.PI / 2 - 0.05}
          enableDamping
          dampingFactor={0.06}
          onStart={() => {
            isUserInteractingRef.current = true;
          }}
        />

        {/* Ánh sáng & Sàn phòng sạch */}
        <SceneEnvironment />

        {/* Cửa Nhập & Cửa Xuất Kho */}
        <DockStation3D />

        {/* Render 7 Phân khu (6 Khu Chính A..F + Khu Dự Trữ RESERVE) */}
        {zones.map((zoneData: ZoneSummary) => (
          <ZoneGroup3D
            key={zoneData.zone}
            zoneData={zoneData}
            focusRack={focusRack}
            rackLayoutCache={rackLayoutCache}
            highlightTargets={highlightTargets}
            highlightTarget={highlightTarget}
            selectedEntity={selectedEntity}
            fefoXrayMode={fefoXrayMode}
            onSelectZone={selectZone}
            onSelectRack={selectRack}
            onSelectShelf={selectShelf}
            onSelectBin={selectBin}
            onHover={setHoveredEntity}
            onUnhover={() => setHoveredEntity(null)}
          />
        ))}

        {/* Lớp phủ Chiến thuật: Cung FEFO sang Reserve & Đường dẫn Wayfinding */}
        <TacticalOverlays3D
          selectedEntity={selectedEntity}
          highlightTarget={highlightTarget}
          rackLayoutCache={rackLayoutCache}
        />

        {/* Đội xe AGV tự hành tuần hoàn dọc hành lang */}
        <AutonomousFleet3D />
      </Canvas>

      {/* 2. HỆ THỐNG HUD KÍNH MỜ 4 GÓC (WARETRACK TACTICAL OVERLAY) */}
      <WarehouseHudOverlay
        zones={zones}
        selectedEntity={selectedEntity}
        hoveredEntity={hoveredEntity}
        fefoXrayMode={fefoXrayMode}
        highlightTarget={highlightTarget}
        onSelectZone={selectZone}
        onSelectRack={selectRack}
        onSelectShelf={selectShelf}
        onSelectBin={selectBin}
        onToggleFefoXray={toggleFefoXray}
        onResetCamera={resetCamera}
        onRotateCamera={rotateCamera}
        onZoomCamera={zoomCamera}
        onShelfSelectModal={onShelfSelect}
        onBinSelectModal={onBinSelect}
        onSwitchTo2D={onSwitchTo2D}
      />
    </div>
  );
}

export default WarehouseMap3D;
