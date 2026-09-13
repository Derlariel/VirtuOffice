import { prisma } from "@/server/database/client";

export function getAccessibleRooms() {
  return prisma.room.findMany({
    where: { isActive: true, archivedAt: null },
    orderBy: [{ kind: "asc" }, { name: "asc" }],
    select: { id: true, slug: true, name: true },
  });
}

export async function canEnterRoom(roomId: string) {
  return (await prisma.room.count({
    where: { id: roomId, isActive: true, archivedAt: null },
  })) > 0;
}

export async function getLobbyRoomId() {
  return (await prisma.room.findFirst({
    where: { slug: "lobby", isActive: true, archivedAt: null },
    select: { id: true },
  }))?.id ?? null;
}
