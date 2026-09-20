import React, { useEffect, useRef, useState } from "react";
import * as THREE from "three";
import { OrbitControls } from "three/examples/jsm/controls/OrbitControls.js";

interface WarehouseMap3DProps {
  zones: any[];
  onShelfSelect: (zone: string, rack: string, shelf: number) => void;
  highlightTarget?: string;
}

const STATUS_COLOR: Record<string, number> = {
  NORMAL: 0x22c55e,
  LOW_STOCK: 0xeab308,
  NEAR_EXPIRY: 0xf97316,
  EXPIRED: 0xef4444,
  EMPTY: 0x475569,
  OUT_OF_STOCK: 0x334155,
};

const ZONE_FLOOR_COLOR: Record<string, number> = {
  A: 0x0284c7,
  B: 0xf59e0b,
  C: 0xef4444,
  D: 0x10b981,
  E: 0x8b5cf6,
  F: 0x64748b,
};

const ZONE_BOX_COLORS: Record<string, number[]> = {
  A: [0xdbeafe, 0xbae6fd, 0xe0f2fe, 0x93c5fd],
  B: [0xfef3c7, 0xfde68a, 0xfef08a, 0xfcd34d],
  C: [0xfecdd3, 0xfda4af, 0xfbb6ce, 0xf9a8d4],
  D: [0xa7f3d0, 0x6ee7b7, 0xd1fae5, 0x86efac],
  E: [0xddd6fe, 0xc4b5fd, 0xe9d5ff, 0xd8b4fe],
  F: [0xe2e8f0, 0xcbd5e1, 0xf1f5f9, 0xdde1e7],
};

export function WarehouseMap3D({ zones, onShelfSelect, highlightTarget }: WarehouseMap3DProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const onShelfSelectRef = useRef(onShelfSelect);
  const highlightTargetRef = useRef(highlightTarget);
  const [tooltip, setTooltip] = useState<{ x: number; y: number; label: string } | null>(null);

  // Keep ref fresh so click handler always has latest callback
  useEffect(() => {
    onShelfSelectRef.current = onShelfSelect;
  }, [onShelfSelect]);

  useEffect(() => {
    highlightTargetRef.current = highlightTarget;
  }, [highlightTarget]);

  useEffect(() => {
    const container = containerRef.current;
    if (!container || zones.length === 0) return;

    // ── Scene ───────────────────────────────────────────────────────────────
    const scene = new THREE.Scene();
    scene.background = new THREE.Color(0x070b14);
    scene.fog = new THREE.FogExp2(0x070b14, 0.008);

    // ── Camera ──────────────────────────────────────────────────────────────
    const camera = new THREE.PerspectiveCamera(
      45,
      container.clientWidth / container.clientHeight,
      0.5,
      600
    );
    camera.position.set(36, 32, 38);

    // ── Renderer ────────────────────────────────────────────────────────────
    const renderer = new THREE.WebGLRenderer({ antialias: true });
    renderer.setSize(container.clientWidth, container.clientHeight);
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    renderer.shadowMap.enabled = true;
    renderer.shadowMap.type = THREE.PCFSoftShadowMap;
    container.appendChild(renderer.domElement);

    // ── Controls ─────────────────────────────────────────────────────────────
    const controls = new OrbitControls(camera, renderer.domElement);
    controls.enableDamping = true;
    controls.dampingFactor = 0.05;
    controls.maxPolarAngle = Math.PI / 2 - 0.04;
    controls.minDistance = 6;
    controls.maxDistance = 120;
    controls.target.set(0, 2.5, 0);

    // ── Lights ───────────────────────────────────────────────────────────────
    scene.add(new THREE.AmbientLight(0xdbeafe, 0.7));

    const mainLight = new THREE.DirectionalLight(0xffffff, 0.9);
    mainLight.position.set(30, 45, 25);
    mainLight.castShadow = true;
    mainLight.shadow.mapSize.set(2048, 2048);
    const d = 40;
    mainLight.shadow.camera.left = -d;
    mainLight.shadow.camera.right = d;
    mainLight.shadow.camera.top = d;
    mainLight.shadow.camera.bottom = -d;
    mainLight.shadow.camera.near = 0.5;
    mainLight.shadow.camera.far = 160;
    scene.add(mainLight);

    const fillLight = new THREE.DirectionalLight(0x1e40af, 0.3);
    fillLight.position.set(-10, 5, -15);
    scene.add(fillLight);

    const pl1 = new THREE.PointLight(0x38bdf8, 1.5, 30);
    pl1.position.set(12, 5, 5);
    scene.add(pl1);

    const pl2 = new THREE.PointLight(0x10b981, 1.0, 25);
    pl2.position.set(-18, 4, -8);
    scene.add(pl2);

    const pl3 = new THREE.PointLight(0x8b5cf6, 1.2, 20);
    pl3.position.set(10, 4, -10);
    scene.add(pl3);

    // ── Build Warehouse ───────────────────────────────────────────────────────
    const interactiveMeshes: THREE.Mesh[] = [];
    const numZones = zones.length;
    const wWidth = Math.max(48, numZones * 9 + 10);
    const wDepth = 34;
    const hw = wWidth / 2;
    const hd = wDepth / 2;

    // Floor
    const floorMat = new THREE.MeshStandardMaterial({ color: 0x172033, roughness: 0.28, metalness: 0.12 });
    const floor = new THREE.Mesh(new THREE.PlaneGeometry(wWidth, wDepth), floorMat);
    floor.rotation.x = -Math.PI / 2;
    floor.receiveShadow = true;
    scene.add(floor);

    // Grid
    const grid = new THREE.GridHelper(Math.max(wWidth, wDepth), Math.max(wWidth, wDepth), 0x0284c7, 0x1e3a5f);
    grid.position.y = 0.02;
    scene.add(grid);

    // Walls
    const wallMat = new THREE.MeshStandardMaterial({ color: 0x1e2d42, roughness: 0.85 });
    const wallH = 7;
    [
      { g: [wWidth, wallH, 0.4] as [number, number, number], p: [0, wallH / 2, -hd] as [number, number, number] },
      { g: [0.4, wallH, wDepth] as [number, number, number], p: [-hw, wallH / 2, 0] as [number, number, number] },
      { g: [0.4, wallH, wDepth] as [number, number, number], p: [hw, wallH / 2, 0] as [number, number, number] },
    ].forEach(({ g, p }) => {
      const m = new THREE.Mesh(new THREE.BoxGeometry(...g), wallMat);
      m.position.set(...p);
      m.receiveShadow = true;
      scene.add(m);
    });

    // Safety stripe border
    const lineMat = new THREE.LineBasicMaterial({ color: 0xfacc15 });
    const borderPts = [
      new THREE.Vector3(-hw + 0.5, 0.05, -hd + 0.5),
      new THREE.Vector3(hw - 0.5, 0.05, -hd + 0.5),
      new THREE.Vector3(hw - 0.5, 0.05, hd - 0.5),
      new THREE.Vector3(-hw + 0.5, 0.05, hd - 0.5),
      new THREE.Vector3(-hw + 0.5, 0.05, -hd + 0.5),
    ];
    scene.add(new THREE.Line(new THREE.BufferGeometry().setFromPoints(borderPts), lineMat));

    // Inbound dock
    const inboundDockMat = new THREE.MeshStandardMaterial({ color: 0x064e3b, roughness: 0.7 });
    const inboundDock = new THREE.Mesh(new THREE.BoxGeometry(8, 0.2, 6), inboundDockMat);
    inboundDock.position.set(-hw + 5, 0.1, -hd + 3);
    scene.add(inboundDock);
    const inboundMarker = new THREE.Mesh(
      new THREE.PlaneGeometry(8, 6),
      new THREE.MeshBasicMaterial({ color: 0x10b981, transparent: true, opacity: 0.3 })
    );
    inboundMarker.rotation.x = -Math.PI / 2;
    inboundMarker.position.set(-hw + 5, 0.05, -hd + 3);
    scene.add(inboundMarker);
    const frameMat0 = new THREE.MeshStandardMaterial({ color: 0x10b981, metalness: 0.6 });
    [-2, 0, 2].forEach(ox => {
      const frame = new THREE.Mesh(new THREE.BoxGeometry(1.2, 3.5, 0.2), frameMat0);
      frame.position.set(-hw + 5 + ox, 1.75, -hd);
      scene.add(frame);
    });

    // Outbound dock
    const outboundMarker = new THREE.Mesh(
      new THREE.PlaneGeometry(8, 6),
      new THREE.MeshBasicMaterial({ color: 0x0284c7, transparent: true, opacity: 0.3 })
    );
    outboundMarker.rotation.x = -Math.PI / 2;
    outboundMarker.position.set(hw - 5, 0.05, hd - 3);
    scene.add(outboundMarker);

    // Office area
    const officeWallMat = new THREE.MeshStandardMaterial({ color: 0x334155, roughness: 0.5 });
    const glassMat = new THREE.MeshPhysicalMaterial({ color: 0x7dd3fc, transparent: true, opacity: 0.3, roughness: 0.1 });
    const ox = hw - 7, oz = -hd + 5;

    const backWall = new THREE.Mesh(new THREE.BoxGeometry(8, 4, 0.2), officeWallMat);
    backWall.position.set(ox, 2, oz - 4);
    scene.add(backWall);

    const sideWall = new THREE.Mesh(new THREE.BoxGeometry(0.2, 4, 8), officeWallMat);
    sideWall.position.set(ox - 4, 2, oz);
    scene.add(sideWall);

    const glassWall = new THREE.Mesh(new THREE.BoxGeometry(8, 4, 0.15), glassMat);
    glassWall.position.set(ox, 2, oz + 4);
    scene.add(glassWall);
    const desk = new THREE.Mesh(new THREE.BoxGeometry(3, 0.1, 1.5), new THREE.MeshStandardMaterial({ color: 0x475569 }));
    desk.position.set(ox - 1, 0.85, oz);
    scene.add(desk);
    const monitor = new THREE.Mesh(new THREE.BoxGeometry(1, 0.7, 0.08), new THREE.MeshBasicMaterial({ color: 0x0ea5e9 }));
    monitor.position.set(ox - 1, 1.25, oz - 0.5);
    scene.add(monitor);

    // ── Zone Racks ────────────────────────────────────────────────────────────
    const rackFrameMat = new THREE.MeshStandardMaterial({ color: 0x0284c7, metalness: 0.7, roughness: 0.3 });
    const beamMat = new THREE.MeshStandardMaterial({ color: 0xf97316, metalness: 0.5, roughness: 0.4 });
    const palletMat = new THREE.MeshStandardMaterial({ color: 0x1e3a8a, roughness: 0.6 });
    const zoneStartX = -(numZones * 9) / 2 + 4;

    zones.forEach((zoneData: any, zoneIdx: number) => {
      const zoneKey = zoneData.zone as string;
      const floorColor = ZONE_FLOOR_COLOR[zoneKey] ?? 0x334155;
      const boxColors = ZONE_BOX_COLORS[zoneKey] ?? [0xe2e8f0];
      const zoneX = zoneStartX + zoneIdx * 9;
      const numRacks = zoneData.racks.length;

      // Zone floor highlight
      const zf = new THREE.Mesh(
        new THREE.PlaneGeometry(8, numRacks * 2.5 + 2),
        new THREE.MeshBasicMaterial({ color: floorColor, transparent: true, opacity: 0.15 })
      );
      zf.rotation.x = -Math.PI / 2;
      zf.position.set(zoneX, 0.04, (numRacks * 2.5) / 2 - 8);
      scene.add(zf);

      // Zone sign on back wall
      const sign = new THREE.Mesh(
        new THREE.BoxGeometry(3.5, 0.6, 0.1),
        new THREE.MeshStandardMaterial({ color: floorColor, metalness: 0.2 })
      );
      sign.position.set(zoneX, 6.5, -hd + 0.3);
      scene.add(sign);

      zoneData.racks.forEach((rackData: any, rackIdx: number) => {
        const rackZ = rackIdx * 2.5 - 10;

        // Rack uprights
        const postGeo = new THREE.BoxGeometry(0.1, 7.5, 0.1);
        [
          [zoneX - 1.8, rackZ - 0.65],
          [zoneX + 1.8, rackZ - 0.65],
          [zoneX - 1.8, rackZ + 0.65],
          [zoneX + 1.8, rackZ + 0.65],
        ].forEach(([px, pz]) => {
          const post = new THREE.Mesh(postGeo, rackFrameMat);
          post.position.set(px, 3.75, pz);
          post.castShadow = true;
          scene.add(post);
        });

        rackData.shelves.forEach((shelfData: any, shelfIdx: number) => {
          const levelY = 1.3 + shelfIdx * 1.7;
          const statusColor = STATUS_COLOR[shelfData.status] ?? STATUS_COLOR.EMPTY;

          // Beam
          const beam = new THREE.Mesh(new THREE.BoxGeometry(3.7, 0.08, 1.35), beamMat);
          beam.position.set(zoneX, levelY, rackZ);
          scene.add(beam);

          // Pallet
          const pallet = new THREE.Mesh(new THREE.BoxGeometry(3.4, 0.12, 1.2), palletMat);
          pallet.position.set(zoneX, levelY + 0.1, rackZ);
          pallet.castShadow = true;
          scene.add(pallet);

          // Drug boxes
          for (let bx = -1; bx <= 1; bx++) {
            for (let bz = -1; bz <= 1; bz += 2) {
              const boxH = 0.5 + Math.random() * 0.35;
              const boxColor = boxColors[Math.floor(Math.random() * boxColors.length)];
              const box = new THREE.Mesh(
                new THREE.BoxGeometry(0.8, boxH, 0.5),
                new THREE.MeshStandardMaterial({ color: boxColor, roughness: 0.55 })
              );
              box.position.set(zoneX + bx * 1.1, levelY + 0.18 + boxH / 2, rackZ + bz * 0.3);
              box.castShadow = true;
              scene.add(box);
            }
          }

          // Status glow strip
          if (shelfData.status !== "EMPTY" && shelfData.status !== "OUT_OF_STOCK") {
            const glow = new THREE.Mesh(
              new THREE.BoxGeometry(3.7, 0.06, 0.06),
              new THREE.MeshBasicMaterial({ color: statusColor, transparent: true, opacity: 0.9 })
            );
            glow.position.set(zoneX, levelY + 0.04, rackZ - 0.7);
            scene.add(glow);
          }

          // Clickable hitbox per shelf
          const hitMat = new THREE.MeshBasicMaterial({ transparent: true, opacity: 0, depthWrite: false });
          const hitBox = new THREE.Mesh(new THREE.BoxGeometry(3.8, 1.5, 1.5), hitMat);
          hitBox.position.set(zoneX, levelY + 0.6, rackZ);
          hitBox.userData = {
            type: "shelf",
            zone: zoneKey,
            rack: rackData.rack,
            shelf: shelfData.shelf,
            label: `Khu ${zoneKey} · Kệ ${rackData.rack} · Tầng ${shelfData.shelf} · ${shelfData.totalStock} đơn vị`,
          };
          interactiveMeshes.push(hitBox);
          scene.add(hitBox);
        });
      });
    });

    // ── Raycaster ────────────────────────────────────────────────────────────
    const raycaster = new THREE.Raycaster();
    const mouse = new THREE.Vector2();

    // ── Click Handler ─────────────────────────────────────────────────────────
    let isPointerMoved = false;
    let pointerDownPos = { x: 0, y: 0 };

    function onPointerDown(e: PointerEvent) {
      isPointerMoved = false;
      pointerDownPos = { x: e.clientX, y: e.clientY };
    }

    function onPointerUp(e: PointerEvent) {
      // Only fire click if pointer hasn't moved much (not a drag/orbit)
      const dx = Math.abs(e.clientX - pointerDownPos.x);
      const dy = Math.abs(e.clientY - pointerDownPos.y);
      if (dx > 5 || dy > 5) return;

      const rect = renderer.domElement.getBoundingClientRect();
      mouse.x = ((e.clientX - rect.left) / rect.width) * 2 - 1;
      mouse.y = -((e.clientY - rect.top) / rect.height) * 2 + 1;
      raycaster.setFromCamera(mouse, camera);
      const hits = raycaster.intersectObjects(interactiveMeshes, false);
      if (hits.length > 0) {
        const data = hits[0].object.userData;
        if (data.type === "shelf") {
          onShelfSelectRef.current(data.zone, data.rack, data.shelf);
        }
      }
    }

    // ── Mouse Move (tooltip) ──────────────────────────────────────────────────
    function onMouseMove(e: MouseEvent) {
      const rect = renderer.domElement.getBoundingClientRect();
      mouse.x = ((e.clientX - rect.left) / rect.width) * 2 - 1;
      mouse.y = -((e.clientY - rect.top) / rect.height) * 2 + 1;
      raycaster.setFromCamera(mouse, camera);
      const hits = raycaster.intersectObjects(interactiveMeshes, false);
      if (hits.length > 0 && hits[0].object.userData.label) {
        renderer.domElement.style.cursor = "pointer";
        setTooltip({ x: e.clientX, y: e.clientY, label: hits[0].object.userData.label });
      } else {
        renderer.domElement.style.cursor = "grab";
        setTooltip(null);
      }
    }

    // ── Resize ────────────────────────────────────────────────────────────────
    function onResize() {
      if (!containerRef.current) return;
      const w = containerRef.current.clientWidth;
      const h = containerRef.current.clientHeight;
      if (w === 0 || h === 0) return;
      camera.aspect = w / h;
      camera.updateProjectionMatrix();
      renderer.setSize(w, h);
    }

    const resizeObserver = new ResizeObserver(onResize);
    resizeObserver.observe(container);

    renderer.domElement.addEventListener("pointerdown", onPointerDown);
    renderer.domElement.addEventListener("pointerup", onPointerUp);
    renderer.domElement.addEventListener("mousemove", onMouseMove);
    renderer.domElement.style.cursor = "grab";

    // ── Animate ───────────────────────────────────────────────────────────────
    let animId: number;
    function animate() {
      animId = requestAnimationFrame(animate);
      controls.update();

      const time = Date.now();
      interactiveMeshes.forEach(mesh => {
        const data = mesh.userData;
        if (data && data.type === "shelf") {
          const targetId = `${data.zone}-${data.rack}-${data.shelf}`;
          const mat = mesh.material as THREE.MeshBasicMaterial;
          if (targetId === highlightTargetRef.current) {
            mat.color.setHex(0x38bdf8); // sky-400
            mat.opacity = 0.2 + Math.abs(Math.sin(time / 150)) * 0.4;
          } else {
            mat.opacity = 0;
          }
        }
      });

      renderer.render(scene, camera);
    }
    animate();

    // ── Cleanup ───────────────────────────────────────────────────────────────
    return () => {
      cancelAnimationFrame(animId);
      resizeObserver.disconnect();
      renderer.domElement.removeEventListener("pointerdown", onPointerDown);
      renderer.domElement.removeEventListener("pointerup", onPointerUp);
      renderer.domElement.removeEventListener("mousemove", onMouseMove);
      controls.dispose();
      renderer.dispose();
      if (container.contains(renderer.domElement)) {
        container.removeChild(renderer.domElement);
      }
    };
  }, [zones]); // eslint-disable-line react-hooks/exhaustive-deps

  return (
    <div className="relative w-full h-full">
      <div ref={containerRef} className="w-full h-full" />

      {/* Tooltip */}
      {tooltip && (
        <div
          className="fixed z-50 pointer-events-none px-3 py-1.5 bg-slate-900/95 border border-sky-500/40 text-sky-200 text-xs font-semibold rounded-lg shadow-xl backdrop-blur"
          style={{ left: tooltip.x + 14, top: tooltip.y - 36 }}
        >
          📦 {tooltip.label}
        </div>
      )}

      {/* Legend */}
      <div className="absolute bottom-4 right-4 bg-slate-900/80 border border-slate-700/60 rounded-xl px-3 py-2 text-[11px] text-slate-300 space-y-1 backdrop-blur pointer-events-none">
        <div className="font-semibold text-slate-400 mb-1.5 text-[10px] uppercase tracking-wider">Trạng thái kệ</div>
        {[
          { color: "#22c55e", label: "Bình thường" },
          { color: "#eab308", label: "Sắp hết hàng" },
          { color: "#f97316", label: "Cận date (<90 ngày)" },
          { color: "#ef4444", label: "Hết hạn" },
          { color: "#475569", label: "Trống" },
        ].map(item => (
          <div key={item.label} className="flex items-center gap-2">
            <div className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: item.color }} />
            {item.label}
          </div>
        ))}
      </div>

      {/* Controls hint */}
      <div className="absolute bottom-4 left-4 pointer-events-none">
        <div className="bg-slate-900/80 backdrop-blur border border-slate-800/80 px-3 py-2 rounded-lg text-xs text-slate-300 flex items-center gap-2">
          <b className="text-sky-400">Chuột trái:</b> Xoay &nbsp;|&nbsp;
          <b className="text-sky-400">Phải:</b> Trượt &nbsp;|&nbsp;
          <b className="text-sky-400">Cuộn:</b> Zoom &nbsp;|&nbsp;
          <b className="text-sky-400">Click kệ:</b> Xem chi tiết
        </div>
      </div>
    </div>
  );
}
