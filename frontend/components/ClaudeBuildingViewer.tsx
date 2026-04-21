'use client';

/**
 * 1:1 port of the Three.js scene from docs/design/slides/03-inspection.jsx — stacked
 * wireframe floors with one highlighted level + orange cage (longitudinal rebars) +
 * amber stirrup rings. No lighting, line-only materials. Matches the Claude Design preview
 * pixel-for-pixel; uses three directly (not react-three-fiber) so the materials + layers
 * render identically.
 */

import { memo, useEffect, useRef } from 'react';
import * as THREE from 'three';

export function stageToFloorIndex(
  stage: 'foundation' | 'ground_floor' | 'mid_floor' | 'roof' | 'other' | undefined,
): number {
  switch (stage) {
    case 'foundation':
      return 0;
    case 'ground_floor':
      return 2;
    case 'mid_floor':
      return 3;
    case 'roof':
      return 5;
    default:
      return 2;
  }
}

type Props = {
  highlightFloorIndex?: number;
  cagePosition?: [number, number, number];
};

function ClaudeBuildingViewerInner({
  highlightFloorIndex = 2,
  cagePosition = [1.8, 0, 1.2],
}: Props) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const rotRef = useRef(0.7);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const parent = canvas.parentElement;
    if (!parent) return;

    const scene = new THREE.Scene();
    scene.background = null;

    const rect = parent.getBoundingClientRect();
    const camera = new THREE.PerspectiveCamera(38, rect.width / rect.height, 0.1, 1000);
    camera.position.set(14, 10, 14);
    camera.lookAt(0, 3.5, 0);

    const renderer = new THREE.WebGLRenderer({ canvas, alpha: true, antialias: true });
    renderer.setPixelRatio(window.devicePixelRatio);
    renderer.setSize(rect.width, rect.height, false);

    // Building — stacked floors as wireframe
    const building = new THREE.Group();
    const floors = 6;
    for (let i = 0; i < floors; i++) {
      const geo = new THREE.BoxGeometry(6, 1, 4);
      const edges = new THREE.EdgesGeometry(geo);
      const mat = new THREE.LineBasicMaterial({
        color: i === highlightFloorIndex ? 0xff6a1f : 0x5a7088,
        opacity: i === highlightFloorIndex ? 1 : 0.45,
        transparent: true,
      });
      const floor = new THREE.LineSegments(edges, mat);
      floor.position.y = i * 1.2 + 0.5;
      building.add(floor);
    }

    // Highlighted column (C3) — rebar cage wireframe
    const cage = new THREE.Group();
    const cageMat = new THREE.LineBasicMaterial({ color: 0xff6a1f });
    const H = 7.2;
    const xs = [-0.4, 0.4];
    const zs = [-0.3, 0.3];
    for (const x of xs) for (const z of zs) {
      const g = new THREE.BufferGeometry().setFromPoints([
        new THREE.Vector3(x, 0, z),
        new THREE.Vector3(x, H, z),
      ]);
      cage.add(new THREE.Line(g, cageMat));
    }
    for (const x of [-0.4, 0.4]) {
      const g = new THREE.BufferGeometry().setFromPoints([
        new THREE.Vector3(x, 0, 0),
        new THREE.Vector3(x, H, 0),
      ]);
      cage.add(new THREE.Line(g, cageMat));
    }
    for (const z of [-0.3, 0.3]) {
      const g = new THREE.BufferGeometry().setFromPoints([
        new THREE.Vector3(0, 0, z),
        new THREE.Vector3(0, H, z),
      ]);
      cage.add(new THREE.Line(g, cageMat));
    }

    // Stirrups — horizontal rings every 0.25
    const stirrupMat = new THREE.LineBasicMaterial({
      color: 0xf5b041,
      opacity: 0.85,
      transparent: true,
    });
    for (let y = 0; y <= H; y += 0.25) {
      const g = new THREE.BufferGeometry().setFromPoints([
        new THREE.Vector3(-0.4, y, -0.3),
        new THREE.Vector3(0.4, y, -0.3),
        new THREE.Vector3(0.4, y, 0.3),
        new THREE.Vector3(-0.4, y, 0.3),
        new THREE.Vector3(-0.4, y, -0.3),
      ]);
      cage.add(new THREE.Line(g, stirrupMat));
    }
    cage.position.set(cagePosition[0], cagePosition[1], cagePosition[2]);
    building.add(cage);

    // Ground plate
    const gEdges = new THREE.EdgesGeometry(new THREE.PlaneGeometry(14, 14, 14, 14));
    const gMat = new THREE.LineBasicMaterial({
      color: 0x334255,
      opacity: 0.5,
      transparent: true,
    });
    const ground = new THREE.LineSegments(gEdges, gMat);
    ground.rotation.x = -Math.PI / 2;
    ground.position.y = -0.01;
    scene.add(ground);

    scene.add(building);

    let raf: number;
    const tick = () => {
      rotRef.current += 0.0025;
      building.rotation.y = rotRef.current;
      renderer.render(scene, camera);
      raf = requestAnimationFrame(tick);
    };
    tick();

    const onResize = () => {
      const r = parent.getBoundingClientRect();
      camera.aspect = r.width / r.height;
      camera.updateProjectionMatrix();
      renderer.setSize(r.width, r.height, false);
    };
    window.addEventListener('resize', onResize);

    return () => {
      cancelAnimationFrame(raf);
      window.removeEventListener('resize', onResize);
      renderer.dispose();
    };
  }, [highlightFloorIndex, cagePosition]);

  return (
    <canvas
      ref={canvasRef}
      style={{ position: 'absolute', inset: 0, width: '100%', height: '100%' }}
    />
  );
}

export const ClaudeBuildingViewer = memo(
  ClaudeBuildingViewerInner,
  (prev, next) =>
    prev.highlightFloorIndex === next.highlightFloorIndex &&
    prev.cagePosition?.[0] === next.cagePosition?.[0] &&
    prev.cagePosition?.[1] === next.cagePosition?.[1] &&
    prev.cagePosition?.[2] === next.cagePosition?.[2],
);
