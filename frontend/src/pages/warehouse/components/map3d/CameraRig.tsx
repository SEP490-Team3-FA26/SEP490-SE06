// ============================================================================
// Camera Rig Điều Khiển Bay Chuyển Cảnh Cố Định
// Dự án: WDP301 - Sơ Đồ Kho 3D Central Warehouse
// Khóa hoàn toàn chuột, lăn và cảm ứng; camera chỉ bay theo state `view`
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

  // Chỉ kích hoạt hiệu ứng camera khi đổi cấp độ nhìn (Overview/Rack) hoặc đổi kệ
  // Thay đổi tầng (shelf) hoặc thùng (bin) không làm camera bay lại
  const rackKey = view.level === 'rack' ? view.rack : '';

  useEffect(() => {
    const controls = ref.current;
    if (!controls) return;

    const { pos, target } = getPose(view, aspect);
    const shouldAnimate = !isFirstMount.current;

    // Di chuyển camera tới vị trí và điểm ngắm mục tiêu
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
      smoothTime={0.22} // Tăng tốc độ bay chuyển cảnh mượt và dứt khoát hơn (~0.35s)
      // Khóa 100% chuột, con lăn và cảm ứng trên Canvas
      mouseButtons={{ left: 0, middle: 0, right: 0, wheel: 0 }}
      touches={{ one: 0, two: 0, three: 0 }}
    />
  );
}
