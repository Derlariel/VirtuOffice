import { useRef } from "react";
import { useFrame } from "@react-three/fiber";
import { MathUtils, type Group } from "three";
import type { Point } from "./layout";

export function Avatar({ color, lowDetail }: { color: string; lowDetail: boolean }) {
  const segments = lowDetail ? 6 : 12;
  return (
    <group>
      <mesh position={[0, 0.5, 0]} scale={[1, 1.15, 0.75]}>
        <sphereGeometry args={[0.3, segments, segments]} />
        <meshStandardMaterial color={color} roughness={0.85} />
      </mesh>
      <mesh position={[0, 1.13, 0]}>
        <sphereGeometry args={[0.43, segments, segments]} />
        <meshStandardMaterial color="#e9c9ad" roughness={0.9} />
      </mesh>
      <mesh position={[0, 1.31, -0.04]} scale={[1, 0.7, 1]}>
        <sphereGeometry args={[0.44, segments, segments]} />
        <meshStandardMaterial color="#63483f" roughness={1} />
      </mesh>
      {[-1, 1].map((side) => (
        <group key={side}>
          <mesh position={[side * 0.14, 1.14, 0.4]}>
            <sphereGeometry args={[0.045, 6, 6]} /><meshStandardMaterial color="#292524" roughness={1} />
          </mesh>
          <mesh position={[side * 0.39, 1.1, 0]}>
            <sphereGeometry args={[0.1, 6, 6]} /><meshStandardMaterial color="#e9c9ad" roughness={1} />
          </mesh>
          <mesh position={[side * 0.3, 0.5, 0]} scale={[0.75, 1.4, 0.75]}>
            <sphereGeometry args={[0.13, 6, 6]} /><meshStandardMaterial color={color} roughness={1} />
          </mesh>
          <mesh position={[side * 0.14, 0.14, 0.05]} scale={[1, 0.85, 1.3]}>
            <sphereGeometry args={[0.15, 6, 6]} /><meshStandardMaterial color="#334155" roughness={1} />
          </mesh>
        </group>
      ))}
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
