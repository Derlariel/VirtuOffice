"use client";

import { useEffect, useRef, useState, type ComponentRef } from "react";
import { Canvas, useFrame, useThree } from "@react-three/fiber";
import { OrbitControls, PerformanceMonitor } from "@react-three/drei";
import { MathUtils } from "three";
import { RoomScene, type QualityTier } from "./room-scene";
import type { Point, WorkspaceView } from "./layout";

export function CameraRig({ target, reducedMotion }: { target: Point; reducedMotion: boolean }) {
  const controls = useRef<ComponentRef<typeof OrbitControls>>(null);
  useFrame(({ camera, invalidate }, delta) => {
    if (!controls.current) return;
    const focus = controls.current.target;
    const x = reducedMotion ? target[0] : MathUtils.damp(focus.x, target[0], 10, Math.min(delta, 0.05));
    const z = reducedMotion ? target[1] : MathUtils.damp(focus.z, target[1], 10, Math.min(delta, 0.05));
    if (Math.abs(x - focus.x) + Math.abs(z - focus.z) < 0.0001) return;
    camera.position.x += x - focus.x;
    camera.position.z += z - focus.z;
    focus.set(x, 0.9, z);
    controls.current.update();
    invalidate();
  });
  return <OrbitControls ref={controls} makeDefault target={[0, 0.9, 4]} enablePan={false} enableDamping={false} minDistance={3} maxDistance={16} minPolarAngle={0.35} maxPolarAngle={Math.PI / 2.1} />;
}

export function Lighting({ quality }: { quality: QualityTier }) {
  if (quality === "LOW") {
    return <><hemisphereLight args={["#dceeff", "#6d6255", 1.5]} /><directionalLight position={[5, 10, 5]} intensity={1.4} /></>;
  }
  return (
    <>
      <hemisphereLight args={["#fff7ed", "#a8c5d0", 2]} />
      <directionalLight
        castShadow
        position={[4, 9, 5]}
        intensity={1.6}
        shadow-mapSize={[quality === "HIGH" ? 1024 : 512, quality === "HIGH" ? 1024 : 512]}
        shadow-camera-left={-7}
        shadow-camera-right={7}
        shadow-camera-top={7}
        shadow-camera-bottom={-7}
        shadow-bias={-0.0002}
        shadow-normalBias={0.035}
      />
    </>
  );
}

function ContextGuard({ onFailure }: { onFailure: () => void }) {
  const canvas = useThree((state) => state.gl.domElement);
  useEffect(() => {
    const handleLoss = (event: Event) => {
      event.preventDefault();
      onFailure();
    };
    canvas.addEventListener("webglcontextlost", handleLoss);
    return () => canvas.removeEventListener("webglcontextlost", handleLoss);
  }, [canvas, onFailure]);
  return null;
}

export default function Scene({ view, target, onMove, fallback, onFailure }: {
  view: WorkspaceView;
  target: Point;
  onMove: (point: Point) => void;
  fallback: React.ReactNode;
  onFailure: () => void;
}) {
  const [quality, setQuality] = useState<QualityTier>(() => matchMedia("(pointer: coarse), (max-width: 640px)").matches ? "LOW" : "HIGH");
  const [reducedMotion, setReducedMotion] = useState(() => matchMedia("(prefers-reduced-motion: reduce)").matches);
  const [visible, setVisible] = useState(true);
  useEffect(() => {
    const motion = matchMedia("(prefers-reduced-motion: reduce)");
    const smallScreen = matchMedia("(pointer: coarse), (max-width: 640px)");
    const updateQuality = () => { if (smallScreen.matches) setQuality("LOW"); };
    const updateMotion = () => setReducedMotion(motion.matches);
    const updateVisibility = () => setVisible(document.visibilityState === "visible");
    motion.addEventListener("change", updateMotion);
    smallScreen.addEventListener("change", updateQuality);
    document.addEventListener("visibilitychange", updateVisibility);
    return () => {
      motion.removeEventListener("change", updateMotion);
      smallScreen.removeEventListener("change", updateQuality);
      document.removeEventListener("visibilitychange", updateVisibility);
    };
  }, []);
  return (
    <Canvas
      className="!absolute inset-0 h-full w-full"
      frameloop={visible ? "demand" : "never"}
      dpr={quality === "HIGH" ? [1, 1.5] : 1}
      camera={{ position: [0, 5, 12], fov: 50, near: 0.1, far: 60 }}
      gl={{ antialias: quality === "LOW", powerPreference: "high-performance" }}
      shadows={quality === "LOW" ? false : "soft"}
      fallback={fallback}
    >
      <color attach="background" args={["#e2e8f0"]} />
      <ContextGuard onFailure={onFailure} />
      <PerformanceMonitor
        flipflops={1}
        onDecline={() => setQuality((current) => current === "HIGH" ? "MEDIUM" : "LOW")}
        onFallback={() => setQuality("LOW")}
      />
      <CameraRig target={target} reducedMotion={reducedMotion} />
      <Lighting quality={quality} />
      <RoomScene key={view.roomId} {...view} target={target} onMove={onMove} quality={quality} reducedMotion={reducedMotion} />
    </Canvas>
  );
}
