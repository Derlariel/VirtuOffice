import { useRef } from "react";
import { useFrame } from "@react-three/fiber";
import { MathUtils, type Group } from "three";
import type { Point } from "./layout";

export function Avatar({ color, lowDetail }: { color: string; lowDetail: boolean }) {
  const segments = lowDetail ? 6 : 12;
  return (
    <group>
      <mesh position={[0, 0.5, 0]}>
        <cylinderGeometry args={[0.22, 0.28, 0.7, segments]} />
        <meshStandardMaterial color={color} roughness={0.85} />
      </mesh>
      <mesh position={[0, 1.05, 0]}>
        <sphereGeometry args={[0.23, segments, segments]} />
        <meshStandardMaterial color="#e9c9ad" roughness={0.9} />
      </mesh>
    </group>
  );
}

// Rendering only: targets come from outside the avatar, never from a socket or database.
export function AvatarController({ target, color, lowDetail, reducedMotion }: {
  target: Point;
  color: string;
  lowDetail: boolean;
  reducedMotion: boolean;
}) {
  const group = useRef<Group>(null);
  useFrame(({ invalidate }, delta) => {
    if (!group.current) return;
    const position = group.current.position;
    const distance = Math.hypot(target[0] - position.x, target[1] - position.z);
    if (distance < 0.001) return;
    if (reducedMotion || distance < 0.01) {
      position.set(target[0], 0, target[1]);
    } else {
      position.x = MathUtils.damp(position.x, target[0], 10, Math.min(delta, 0.05));
      position.z = MathUtils.damp(position.z, target[1], 10, Math.min(delta, 0.05));
      invalidate();
    }
  });
  return <group ref={group}><Avatar color={color} lowDetail={lowDetail} /></group>;
}

export function RemoteAvatar({ position, lowDetail, reducedMotion }: {
  position: Point;
  lowDetail: boolean;
  reducedMotion: boolean;
}) {
  return <AvatarController target={position} color="#0f766e" lowDetail={lowDetail} reducedMotion={reducedMotion} />;
}
