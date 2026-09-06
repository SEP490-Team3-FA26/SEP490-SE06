import React, { useRef, useState } from "react";
import { Canvas } from "@react-three/fiber";
import { OrbitControls, Text, Html } from "@react-three/drei";
import * as THREE from "three";

interface WarehouseMap3DProps {
  zones: any[];
  onShelfSelect: (zone: string, rack: string, shelf: number) => void;
}

export function WarehouseMap3D({ zones, onShelfSelect }: WarehouseMap3DProps) {
  return (
    <div className="w-full h-full bg-[#1a1a2e] rounded-2xl overflow-hidden relative">
      {/* 3D Canvas */}
      <Canvas camera={{ position: [20, 15, 20], fov: 45 }}>
        <color attach="background" args={["#1a1a2e"]} />
        <ambientLight intensity={0.4} />
        <directionalLight position={[10, 20, 10]} intensity={0.8} castShadow />
        
        {/* Floor */}
        <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, -0.5, 0]} receiveShadow>
          <planeGeometry args={[100, 100]} />
          <meshStandardMaterial color="#2d2d44" />
        </mesh>

        <OrbitControls 
          makeDefault 
          maxPolarAngle={Math.PI / 2 - 0.05} // Prevent going below floor
          minDistance={5}
          maxDistance={50}
        />

        <WarehouseLayout zones={zones} onShelfSelect={onShelfSelect} />
      </Canvas>

      {/* Helper Text */}
      <div className="absolute bottom-6 left-1/2 -translate-x-1/2 px-4 py-2 bg-black/50 backdrop-blur-md rounded-full text-white/80 text-sm flex items-center gap-2 font-medium">
        <span>🖱️ Kéo thả để xoay</span>
        <span className="opacity-50">•</span>
        <span>📜 Cuộn để Zoom</span>
        <span className="opacity-50">•</span>
        <span>👆 Click tầng kệ để xem</span>
      </div>
    </div>
  );
}

function WarehouseLayout({ zones, onShelfSelect }: any) {
  // Constants for spacing
  const ZONE_SPACING_X = 8;
  const RACK_SPACING_Z = 3;
  const SHELF_HEIGHT = 1.2;
  const SHELF_DEPTH = 1.5;
  const SHELF_WIDTH = 4;

  const statusColorMap: Record<string, string> = {
    NORMAL: "#22c55e", // green-500
    LOW_STOCK: "#eab308", // yellow-500
    NEAR_EXPIRY: "#ef4444", // red-500
    EMPTY: "#64748b", // slate-500
  };

  return (
    <group position={[-15, 0, -10]}>
      {zones.map((zone: any, zIndex: number) => {
        const zoneX = zIndex * ZONE_SPACING_X;

        return (
          <group key={`zone-${zone.zone}`} position={[zoneX, 0, 0]}>
            {/* Zone Label Floating */}
            <Html position={[0, 7, 0]} center zIndexRange={[100, 0]}>
              <div className="px-3 py-1 bg-white/10 backdrop-blur-md border border-white/20 rounded-lg text-white font-bold whitespace-nowrap text-sm shadow-xl">
                Khu {zone.zone}
              </div>
            </Html>

            {zone.racks.map((rack: any, rIndex: number) => {
              const rackZ = rIndex * RACK_SPACING_Z;

              return (
                <group key={`rack-${rack.rack}`} position={[0, 0, rackZ]}>
                  {/* Rack Framework (Optional visual) */}
                  <mesh position={[-(SHELF_WIDTH/2 + 0.1), 2.5, 0]}>
                    <boxGeometry args={[0.1, 5, SHELF_DEPTH]} />
                    <meshStandardMaterial color="#475569" />
                  </mesh>
                  <mesh position={[SHELF_WIDTH/2 + 0.1, 2.5, 0]}>
                    <boxGeometry args={[0.1, 5, SHELF_DEPTH]} />
                    <meshStandardMaterial color="#475569" />
                  </mesh>

                  {/* Rack Label */}
                  <Text
                    position={[-2.5, 0, 0]}
                    rotation={[0, -Math.PI / 2, 0]}
                    fontSize={0.4}
                    color="#cbd5e1"
                    anchorX="center"
                    anchorY="middle"
                  >
                    Kệ {rack.rack}
                  </Text>

                  {rack.shelves.map((shelf: any, sIndex: number) => {
                    const shelfY = (shelf.shelf - 1) * SHELF_HEIGHT + (SHELF_HEIGHT / 2);
                    
                    return (
                      <ShelfMesh
                        key={`shelf-${shelf.shelf}`}
                        position={[0, shelfY, 0]}
                        width={SHELF_WIDTH}
                        height={0.2}
                        depth={SHELF_DEPTH}
                        color={statusColorMap[shelf.status] || statusColorMap.EMPTY}
                        data={{ zone: zone.zone, rack: rack.rack, shelf: shelf.shelf }}
                        onSelect={onShelfSelect}
                        stock={shelf.totalStock}
                      />
                    );
                  })}
                </group>
              );
            })}
          </group>
        );
      })}
    </group>
  );
}

function ShelfMesh({ position, width, height, depth, color, onSelect, data, stock }: any) {
  const [hovered, setHover] = useState(false);

  return (
    <group position={position}>
      <mesh
        onPointerOver={(e) => { e.stopPropagation(); setHover(true); }}
        onPointerOut={(e) => { setHover(false); }}
        onClick={(e) => { e.stopPropagation(); onSelect(data.zone, data.rack, data.shelf); }}
      >
        <boxGeometry args={[width, height, depth]} />
        <meshStandardMaterial 
          color={color} 
          emissive={hovered ? color : "#000000"} 
          emissiveIntensity={hovered ? 0.5 : 0}
          transparent
          opacity={0.9}
        />
      </mesh>
      
      {/* Box visual representation inside shelf */}
      {stock > 0 && (
        <mesh position={[0, height/2 + 0.2, 0]}>
           <boxGeometry args={[width - 0.4, 0.4, depth - 0.4]} />
           <meshStandardMaterial color="#e2e8f0" roughness={0.8} />
        </mesh>
      )}

      {hovered && (
        <Html position={[0, 0.5, 0]} center style={{ pointerEvents: 'none' }}>
          <div className="bg-black/80 text-white text-xs px-2 py-1 rounded whitespace-nowrap shadow-lg">
            Tầng {data.shelf} <br/>
            Tồn kho: {stock}
          </div>
        </Html>
      )}
    </group>
  );
}
