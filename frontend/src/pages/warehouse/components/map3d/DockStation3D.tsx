import React, { useMemo } from 'react';
import * as THREE from 'three';
import { DOCKS_CONFIG } from './constants';

// Helper tạo canvas texture tiếng Việt sắc nét cho biển báo 3D
function createSignTexture(title: string, subtitle: string, bgColor: string, borderColor: string): THREE.CanvasTexture {
  const canvas = document.createElement('canvas');
  canvas.width = 1024;
  canvas.height = 256;
  const ctx = canvas.getContext('2d');
  if (ctx) {
    // Nền
    ctx.fillStyle = bgColor;
    ctx.roundRect(8, 8, canvas.width - 16, canvas.height - 16, 24);
    ctx.fill();

    // Viền
    ctx.lineWidth = 12;
    ctx.strokeStyle = borderColor;
    ctx.roundRect(8, 8, canvas.width - 16, canvas.height - 16, 24);
    ctx.stroke();

    // Tiêu đề chính
    ctx.fillStyle = '#ffffff';
    ctx.font = 'bold 56px sans-serif';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText(title, canvas.width / 2, 95);

    // Dòng phụ
    ctx.fillStyle = '#d1fae5';
    ctx.font = '600 32px sans-serif';
    ctx.fillText(subtitle, canvas.width / 2, 175);
  }

  const texture = new THREE.CanvasTexture(canvas);
  texture.minFilter = THREE.LinearFilter;
  return texture;
}

export function DockStation3D() {
  const { inbound, outbound } = DOCKS_CONFIG;

  // Tạo texture biển báo cho Cửa Nhập Hàng
  const inboundSignTex = useMemo(() => {
    return createSignTexture('CỬA NHẬP HÀNG (INBOUND)', 'Khu Tiếp Nhận & Kiểm Đếm GSP', '#065f46', '#34d399');
  }, []);

  // Tạo texture biển báo cho Cửa Xuất Hàng
  const outboundSignTex = useMemo(() => {
    return createSignTexture('CỬA XUẤT HÀNG (OUTBOUND)', 'Khu Soạn Đơn & Đóng Gói FEFO/FIFO', '#075985', '#38bdf8');
  }, []);

  return (
    <group name="DockStations">
      {/* ============================================================== */}
      {/* 1. CỬA NHẬP HÀNG (INBOUND DOCKS - TÂY BẮC)                      */}
      {/* ============================================================== */}
      <group position={inbound.position}>
        {/* Sàn tiếp nhận hàng nâng cao nhẹ */}
        <mesh position={[0, 0.08, 0]} receiveShadow>
          <boxGeometry args={[32, 0.16, 6]} />
          <meshStandardMaterial color="#ecfdf5" roughness={0.3} metalness={0.05} />
        </mesh>

        {/* Viền LED xanh ngọc phát sáng dọc sàn */}
        <mesh position={[0, 0.17, 3]}>
          <boxGeometry args={[32, 0.06, 0.12]} />
          <meshBasicMaterial color="#10b981" />
        </mesh>

        {/* 3 Khoang đỗ xe tải kiểm đếm (Bay IN-1, IN-2, IN-3) */}
        {[-10, 0, 10].map((bx, idx) => (
          <group key={idx} position={[bx, 0.165, -0.5]}>
            {/* Khung ô đỗ nét đứt */}
            <mesh rotation={[-Math.PI / 2, 0, 0]}>
              <planeGeometry args={[7, 4.5]} />
              <meshBasicMaterial color="#059669" transparent opacity={0.18} />
            </mesh>
            {/* Cột cổng vòm tiếp nhận */}
            <mesh position={[-3.6, 1.8, 0]} castShadow>
              <boxGeometry args={[0.3, 3.6, 0.3]} />
              <meshStandardMaterial color="#065f46" metalness={0.6} />
            </mesh>
            <mesh position={[3.6, 1.8, 0]} castShadow>
              <boxGeometry args={[0.3, 3.6, 0.3]} />
              <meshStandardMaterial color="#065f46" metalness={0.6} />
            </mesh>
            <mesh position={[0, 3.6, 0]} castShadow>
              <boxGeometry args={[7.5, 0.3, 0.3]} />
              <meshStandardMaterial color="#10b981" metalness={0.7} />
            </mesh>
          </group>
        ))}

        {/* Biển báo 3D Cửa Nhập Hàng */}
        <mesh position={[0, 4.5, -2.8]} castShadow>
          <boxGeometry args={[14, 2.2, 0.25]} />
          <meshBasicMaterial map={inboundSignTex} />
        </mesh>
      </group>

      {/* ============================================================== */}
      {/* 2. CỬA XUẤT HÀNG (OUTBOUND DOCKS - ĐÔNG NAM)                    */}
      {/* ============================================================== */}
      <group position={outbound.position}>
        {/* Sàn soạn đơn xuất hàng */}
        <mesh position={[0, 0.08, 0]} receiveShadow>
          <boxGeometry args={[32, 0.16, 6]} />
          <meshStandardMaterial color="#f0f9ff" roughness={0.3} metalness={0.05} />
        </mesh>

        {/* Viền LED xanh da trời phát sáng dọc sàn */}
        <mesh position={[0, 0.17, -3]}>
          <boxGeometry args={[32, 0.06, 0.12]} />
          <meshBasicMaterial color="#0284c7" />
        </mesh>

        {/* 3 Khoang xuất hàng (Bay OUT-1, OUT-2, OUT-3) */}
        {[-10, 0, 10].map((bx, idx) => (
          <group key={idx} position={[bx, 0.165, 0.5]}>
            <mesh rotation={[-Math.PI / 2, 0, 0]}>
              <planeGeometry args={[7, 4.5]} />
              <meshBasicMaterial color="#0284c7" transparent opacity={0.18} />
            </mesh>
            {/* Cột cổng xuất hàng */}
            <mesh position={[-3.6, 1.8, 0]} castShadow>
              <boxGeometry args={[0.3, 3.6, 0.3]} />
              <meshStandardMaterial color="#075985" metalness={0.6} />
            </mesh>
            <mesh position={[3.6, 1.8, 0]} castShadow>
              <boxGeometry args={[0.3, 3.6, 0.3]} />
              <meshStandardMaterial color="#075985" metalness={0.6} />
            </mesh>
            <mesh position={[0, 3.6, 0]} castShadow>
              <boxGeometry args={[7.5, 0.3, 0.3]} />
              <meshStandardMaterial color="#0284c7" metalness={0.7} />
            </mesh>
          </group>
        ))}

        {/* Biển báo 3D Cửa Xuất Hàng */}
        <mesh position={[0, 4.5, 2.8]} castShadow>
          <boxGeometry args={[14, 2.2, 0.25]} />
          <meshBasicMaterial map={outboundSignTex} />
        </mesh>
      </group>
    </group>
  );
}
