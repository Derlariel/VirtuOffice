import { useEffect, useMemo } from "react";
import { CanvasTexture, RepeatWrapping, SRGBColorSpace } from "three";
import { AvatarController, RemoteAvatar } from "./avatar";
import { clampPosition, participantPosition, type Point, type WorkspaceView } from "./layout";

export type QualityTier = "HIGH" | "MEDIUM" | "LOW";

const ROOM_COLORS: Record<string, string> = {
  lobby: "#b9cee5", development: "#b8cec5", design: "#d8bfd2",
  "meeting-a": "#bdc8e6", "meeting-b": "#bdc8e6", focus: "#c9ccd1", "break-room": "#dfd0a6",
};

function makeTexture(surface: "floor" | "wall" | "wood", normal: boolean) {
  const canvas = document.createElement("canvas");
  canvas.width = canvas.height = 256;
  const context = canvas.getContext("2d");
  if (!context) throw new Error("Canvas textures are unavailable");

  context.fillStyle = normal
    ? "rgb(128 128 255)"
    : surface === "floor" ? "#9a8064" : surface === "wood" ? "#76553d" : "#d7d4ce";
  context.fillRect(0, 0, 256, 256);

  if (surface === "floor" || surface === "wood") {
    const height = surface === "floor" ? 32 : 24;
    for (let y = 0; y < 256; y += height) {
      context.fillStyle = normal ? "rgb(128 134 253)" : y % (height * 2) ? "#8c7057" : "#a3896c";
      context.fillRect(0, y, 256, 2);
      for (let x = (y / height) % 2 ? 0 : 64; x < 256; x += 128) context.fillRect(x, y, 2, height);
    }
  } else {
    let seed = 19;
    for (let index = 0; index < 900; index += 1) {
      seed = (seed * 48271) % 2147483647;
      const x = seed % 256;
      seed = (seed * 48271) % 2147483647;
      const y = seed % 256;
      const shade = 120 + (seed % 17);
      context.fillStyle = normal ? `rgb(${shade} ${shade} 252)` : `rgb(${205 + seed % 18} ${202 + seed % 18} ${196 + seed % 18})`;
      context.fillRect(x, y, 1, 1);
    }
  }

  const texture = new CanvasTexture(canvas);
  texture.wrapS = texture.wrapT = RepeatWrapping;
  texture.repeat.set(surface === "floor" ? 4 : 2, surface === "wall" ? 1 : 4);
  texture.anisotropy = 4;
  if (!normal) texture.colorSpace = SRGBColorSpace;
  return texture;
}

function useSurfaceTextures(surface: "floor" | "wall" | "wood") {
  const textures = useMemo(() => ({ map: makeTexture(surface, false), normalMap: makeTexture(surface, true) }), [surface]);
  useEffect(() => () => {
    textures.map.dispose();
    textures.normalMap.dispose();
  }, [textures]);
  return textures;
}

function Desk({ x, quality, textures }: { x: number; quality: QualityTier; textures: ReturnType<typeof useSurfaceTextures> }) {
  const shadows = quality !== "LOW";
  return (
    <group position={[x, 0, -2.8]}>
      <mesh position={[0, 0.8, 0]} castShadow={shadows} receiveShadow={shadows}>
        <boxGeometry args={[2.2, 0.14, 1]} />
        <meshStandardMaterial {...textures} color="#8c684c" roughness={0.58} metalness={0.04} normalScale={[0.18, 0.18]} />
      </mesh>
      {[-0.85, 0.85].map((leg) => (
        <mesh key={leg} position={[leg, 0.38, 0]} castShadow={shadows}>
          <boxGeometry args={[0.1, 0.75, 0.75]} />
          <meshStandardMaterial color="#38414c" roughness={0.34} metalness={0.7} />
        </mesh>
      ))}
      <mesh position={[0, 1.32, -0.25]} castShadow={shadows}>
        <boxGeometry args={[1.05, 0.68, 0.08]} />
        <meshStandardMaterial color="#07111d" emissive="#38bdf8" emissiveIntensity={quality === "HIGH" ? 3 : 1.8} roughness={0.2} metalness={0.35} toneMapped={false} />
      </mesh>
      <mesh position={[0, 0.98, -0.25]} castShadow={shadows}>
        <boxGeometry args={[0.08, 0.3, 0.08]} />
        <meshStandardMaterial color="#303846" roughness={0.34} metalness={0.7} />
      </mesh>
    </group>
  );
}

export function Environment({ roomSlug, quality }: { roomSlug: string; quality: QualityTier }) {
  const wall = useSurfaceTextures("wall");
  const wood = useSurfaceTextures("wood");
  const shadows = quality !== "LOW";
  return (
    <group>
      <mesh position={[0, 1.5, -6]} receiveShadow={shadows}>
        <boxGeometry args={[12, 3, 0.15]} />
        <meshStandardMaterial {...wall} color={ROOM_COLORS[roomSlug] ?? "#d6d9dd"} roughness={0.9} metalness={0} normalScale={[0.12, 0.12]} />
      </mesh>
      <mesh position={[-6, 1.5, 0]} receiveShadow={shadows}>
        <boxGeometry args={[0.15, 3, 12]} />
        <meshStandardMaterial {...wall} color="#d3d7dc" roughness={0.92} metalness={0} normalScale={[0.12, 0.12]} />
      </mesh>
      {[-2.5, 2.5].map((x) => <Desk key={x} x={x} quality={quality} textures={wood} />)}
      {quality === "HIGH" ? [-5, 5].map((x) => (
        <group key={x} position={[x, 0, -5.4]}>
          <mesh position={[0, 0.24, 0]} castShadow><cylinderGeometry args={[0.28, 0.22, 0.48, 10]} /><meshStandardMaterial color="#70513d" roughness={0.78} /></mesh>
          <mesh position={[0, 0.78, 0]} castShadow><dodecahedronGeometry args={[0.48, 0]} /><meshStandardMaterial color="#44705a" roughness={0.82} /></mesh>
        </group>
      )) : null}
    </group>
  );
}

export function RoomScene({ roomSlug, participantIds, userId, quality, reducedMotion, target, onMove }: WorkspaceView & {
  quality: QualityTier;
  reducedMotion: boolean;
  target: Point;
  onMove: (point: Point) => void;
}) {
  const floor = useSurfaceTextures("floor");
  const lowDetail = quality === "LOW";
  // ponytail: cap visible placeholders at 60; use instancing for larger populated rooms.
  const peers = participantIds.filter((id) => id !== userId).sort().slice(0, 60);
  return (
    <group>
      <Environment roomSlug={roomSlug} quality={quality} />
      <mesh receiveShadow={!lowDetail} rotation={[-Math.PI / 2, 0, 0]} onPointerDown={(event) => {
        if (event.button !== 0) return;
        event.stopPropagation();
        onMove(clampPosition([event.point.x, event.point.z]));
      }}>
        <planeGeometry args={[12, 12]} />
        <meshStandardMaterial {...floor} color="#aa9277" roughness={0.84} metalness={0.02} normalScale={[0.22, 0.22]} />
      </mesh>
      <AvatarController target={target} color="#4f46e5" lowDetail={lowDetail} reducedMotion={reducedMotion} />
      {peers.map((id, index) => <RemoteAvatar key={id} position={participantPosition(index)} lowDetail={lowDetail} reducedMotion={reducedMotion} />)}
    </group>
  );
}
