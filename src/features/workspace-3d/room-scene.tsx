import { RoundedBox } from "@react-three/drei";
import { AvatarController, RemoteAvatar } from "./avatar";
import { clampPosition, participantPosition, type Point, type WorkspaceView } from "./layout";

export type QualityTier = "HIGH" | "MEDIUM" | "LOW";
const ROOM_COLORS: Record<string, string> = {
  lobby: "#a9dce5", development: "#b8dfcb", design: "#edc5dd",
  "meeting-a": "#c8d2ef", "meeting-b": "#c8d2ef", focus: "#d2c7e8", "break-room": "#f0dda3",
};

function Desk({ x, quality }: { x: number; quality: QualityTier }) {
  const shadows = quality !== "LOW";
  return (
    <group position={[x, 0, -2.8]}>
      <RoundedBox args={[2, 0.22, 1]} radius={0.1} smoothness={2} position={[0, 0.78, 0]} castShadow={shadows} receiveShadow={shadows}>
        <meshStandardMaterial color="#fff0d6" roughness={0.95} />
      </RoundedBox>
      {[-0.75, 0.75].map((leg) => (
        <mesh key={leg} position={[leg, 0.35, 0]} castShadow={shadows}>
          <cylinderGeometry args={[0.1, 0.13, 0.7, 6]} /><meshStandardMaterial color="#698c94" roughness={1} />
        </mesh>
      ))}
      <RoundedBox args={[0.9, 0.6, 0.12]} radius={0.05} smoothness={2} position={[0, 1.2, -0.2]} castShadow={shadows}>
        <meshStandardMaterial color="#344c61" roughness={1} />
      </RoundedBox>
      <mesh position={[0, 1.21, -0.13]}>
        <planeGeometry args={[0.75, 0.44]} /><meshStandardMaterial color="#8cdae8" emissive="#8cdae8" emissiveIntensity={0.2} roughness={1} />
      </mesh>
      <mesh position={[0, 0.94, -0.2]}>
        <cylinderGeometry args={[0.07, 0.12, 0.3, 6]} /><meshStandardMaterial color="#344c61" roughness={1} />
      </mesh>
      <RoundedBox args={[0.7, 0.2, 0.65]} radius={0.09} smoothness={2} position={[0, 0.43, 1]} castShadow={shadows}>
        <meshStandardMaterial color="#b5a5dc" roughness={1} />
      </RoundedBox>
      <RoundedBox args={[0.7, 0.6, 0.18]} radius={0.08} smoothness={2} position={[0, 0.7, 1.3]} castShadow={shadows}>
        <meshStandardMaterial color="#b5a5dc" roughness={1} />
      </RoundedBox>
    </group>
  );
}

export function Environment({ roomSlug, quality }: { roomSlug: string; quality: QualityTier }) {
  const shadows = quality !== "LOW";
  return (
    <group>
      <mesh position={[0, 1.5, -6]} receiveShadow={shadows}>
        <boxGeometry args={[12, 3, 0.15]} /><meshStandardMaterial color={ROOM_COLORS[roomSlug] ?? "#c9e4e5"} roughness={1} />
      </mesh>
      <mesh position={[-6, 1.5, 0]} receiveShadow={shadows}>
        <boxGeometry args={[0.15, 3, 12]} /><meshStandardMaterial color="#f5f1e8" roughness={1} />
      </mesh>
      {[-2.5, 2.5].map((x) => <Desk key={x} x={x} quality={quality} />)}
      {quality === "LOW" ? null : [-5, 5].map((x) => (
        <group key={x} position={[x, 0, -5.4]}>
          <mesh position={[0, 0.24, 0]} castShadow><cylinderGeometry args={[0.3, 0.22, 0.48, 8]} /><meshStandardMaterial color="#f3c3a3" roughness={1} /></mesh>
          <mesh position={[0, 0.8, 0]} castShadow><dodecahedronGeometry args={[0.5, 0]} /><meshStandardMaterial color="#85b87e" roughness={1} /></mesh>
        </group>
      ))}
    </group>
  );
}

export function RoomScene({ roomSlug, participantIds, userId, quality, reducedMotion, target, onMove }: WorkspaceView & {
  quality: QualityTier; reducedMotion: boolean; target: Point; onMove: (point: Point) => void;
}) {
  const lowDetail = quality === "LOW";
  // ponytail: cap presence markers at 60; instance meshes if larger rooms are required.
  const peers = [...new Set(participantIds)].filter((id) => id !== userId).sort().slice(0, 60);
  return (
    <group>
      <Environment roomSlug={roomSlug} quality={quality} />
      <mesh receiveShadow={!lowDetail} rotation={[-Math.PI / 2, 0, 0]} onClick={(event) => {
        if (event.button !== 0 || event.delta > 5) return;
        event.stopPropagation();
        onMove(clampPosition([event.point.x, event.point.z]));
      }}>
        <planeGeometry args={[12, 12]} /><meshStandardMaterial color="#e7e5cf" roughness={1} />
      </mesh>
      <AvatarController target={target} color="#9283d1" lowDetail={lowDetail} reducedMotion={reducedMotion} />
      {peers.map((id, index) => <RemoteAvatar key={id} position={participantPosition(index)} lowDetail={lowDetail} reducedMotion={reducedMotion} />)}
    </group>
  );
}
