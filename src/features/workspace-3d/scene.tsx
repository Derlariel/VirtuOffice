"use client";

import { Suspense, useEffect, useState } from "react";
import { Canvas, useThree } from "@react-three/fiber";
import { Environment as HdriEnvironment, OrbitControls, PerformanceMonitor } from "@react-three/drei";
import { Bloom, EffectComposer, N8AO, ToneMapping } from "@react-three/postprocessing";
import { ToneMappingMode } from "postprocessing";
import { RoomScene, type QualityTier } from "./room-scene";
import type { Point, WorkspaceView } from "./layout";

export function CameraRig() {
  return <OrbitControls makeDefault target={[0, 0, 0]} enablePan={false} enableRotate={false} enableDamping={false} minDistance={10} maxDistance={24} />;
}

export function Lighting({ quality }: { quality: QualityTier }) {
  if (quality === "LOW") {
    return <><hemisphereLight args={["#dceeff", "#6d6255", 1.5]} /><directionalLight position={[5, 10, 5]} intensity={1.4} /></>;
  }
  return (
    <>
      <Suspense fallback={null}>
        <HdriEnvironment preset="studio" environmentIntensity={quality === "HIGH" ? 0.9 : 0.72} />
      </Suspense>
      <directionalLight
        castShadow
        position={[4, 9, 5]}
        intensity={2.2}
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

function PostProcessing({ quality }: { quality: QualityTier }) {
  if (quality === "LOW") return null;
  return (
    <EffectComposer multisampling={0} resolutionScale={quality === "HIGH" ? 1 : 0.75}>
      {quality === "HIGH" ? <N8AO halfRes quality="performance" aoRadius={2.2} distanceFalloff={0.8} intensity={0.65} /> : null}
      <Bloom mipmapBlur intensity={quality === "HIGH" ? 0.28 : 0.18} luminanceThreshold={1.1} luminanceSmoothing={0.35} radius={0.45} levels={5} />
      <ToneMapping mode={ToneMappingMode.ACES_FILMIC} />
    </EffectComposer>
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
      camera={{ position: [10, 12, 14], fov: 45, near: 0.1, far: 60 }}
      gl={{ antialias: quality === "LOW", powerPreference: "high-performance" }}
      flat={quality !== "LOW"}
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
      <CameraRig />
      <Lighting quality={quality} />
      <RoomScene key={view.roomId} {...view} target={target} onMove={onMove} quality={quality} reducedMotion={reducedMotion} />
      <PostProcessing quality={quality} />
    </Canvas>
  );
}
