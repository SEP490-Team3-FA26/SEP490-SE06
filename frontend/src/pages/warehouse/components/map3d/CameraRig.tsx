// ============================================================================
// Camera Rig Dieu Khien Bay Chuyen Canh Co Dinh
// Du an: WDP301 - So Do Kho 3D Central Warehouse
// ============================================================================

import { useEffect, useRef } from 'react';
import { CameraControls } from '@react-three/drei';
import { useThree } from '@react-three/fiber';
import { getPose } from './cameraPoses';
import type { View } from './store';

export function CameraRig({ view }: { view: View }) {
  const ref = useRef<CameraControls>(null);
  const size = useThree((s) => s.size);
  const aspect = size.width > 0 && size.height > 0 ? size.width / size.height : 16 / 9;
  const isFirstMount = useRef(true);

  // Key định danh góc nhìn kệ, bao gồm cả tầng và thùng nếu có mục tiêu tìm kiếm
  const rackKey = view.level === 'rack' ? `${view.rack}-${view.shelf || ''}-${view.bin || ''}` : '';

  useEffect(() => {
    const controls = ref.current;
    if (!controls) return;

    const { pos, target } = getPose(view, aspect);
    const shouldAnimate = !isFirstMount.current;

    controls.setLookAt(
      pos[0], pos[1], pos[2],
      target[0], target[1], target[2],
      shouldAnimate
    );

    isFirstMount.current = false;
  }, [view.level, rackKey, aspect]);

  return (
    <CameraControls
      ref={ref}
      makeDefault
      smoothTime={0.35}
      // Mở khóa điều khiển chuột: Trái xoay 360 độ (1), Phải di chuyển pan (2), Lăn chuột phóng to thu nhỏ (16)
      mouseButtons={{
        left: 1,   // ACTION.ROTATE - Xoay tự do 360 độ quanh kho
        middle: 8, // ACTION.DOLLY - Phóng to / thu nhỏ
        right: 2,  // ACTION.TRUCK - Di chuyển tịnh tiến camera
        wheel: 16, // ACTION.ZOOM - Con lăn chuột zoom mượt mà
      }}
      touches={{
        one: 1, // Chạm 1 ngón xoay 360 độ trên màn hình cảm ứng
        two: 8, // Chạm 2 ngón zoom vào/ra
        three: 2, // Chạm 3 ngón di chuyển
      }}
      // Giới hạn góc nhìn: Không cho camera chúi xuống dưới gầm sàn kho
      maxPolarAngle={Math.PI / 2.05}
      minPolarAngle={Math.PI / 12}
      // Giới hạn khoảng cách zoom: Từ cự ly gần 3m đến toàn cảnh 140m
      minDistance={3}
      maxDistance={140}
      azimuthRotateSpeed={0.85}
      polarRotateSpeed={0.85}
      dollySpeed={0.9}
    />
  );
}
