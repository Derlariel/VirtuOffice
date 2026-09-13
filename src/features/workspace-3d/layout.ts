export type Point = [number, number];
export const ROOM_BOUND = 5;

export function clampPosition([x, z]: Point): Point {
  return [Math.max(-ROOM_BOUND, Math.min(ROOM_BOUND, x)), Math.max(-ROOM_BOUND, Math.min(ROOM_BOUND, z))];
}

export function participantPosition(index: number): Point {
  return [(index % 10) - 4.5, Math.floor(index / 10) * 1.2 - 3];
}

export type WorkspaceView = {
  roomId: string;
  roomSlug: string;
  participantIds: string[];
  userId: string;
};
