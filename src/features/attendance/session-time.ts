export function elapsedSeconds(
  checkInAt: string,
  checkOutAt: string | null,
  nowMs: number,
) {
  const endMs = checkOutAt ? Date.parse(checkOutAt) : nowMs;
  return Math.max(0, Math.floor((endMs - Date.parse(checkInAt)) / 1000));
}

export function formatDuration(totalSeconds: number) {
  const hours = Math.floor(totalSeconds / 3600);
  const minutes = Math.floor((totalSeconds % 3600) / 60);
  const seconds = totalSeconds % 60;

  return [hours, minutes, seconds]
    .map((part) => String(part).padStart(2, "0"))
    .join(":");
}
