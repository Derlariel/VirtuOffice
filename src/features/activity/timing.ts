export type ActivityConfig = { idleMs: number; graceMs: number };

function duration(value: string | undefined, fallback: number, name: string) {
  const parsed = value === undefined ? fallback : Number(value);
  if (!Number.isInteger(parsed) || parsed < 1_000 || parsed > 2_147_483_647) {
    throw new Error(`${name} must be an integer between 1000 and 2147483647ms`);
  }
  return parsed;
}

export function getActivityConfig(env: NodeJS.ProcessEnv = process.env): ActivityConfig {
  return {
    idleMs: duration(env.ACTIVITY_IDLE_MS, 5 * 60_000, "ACTIVITY_IDLE_MS"),
    graceMs: duration(env.ACTIVITY_GRACE_MS, 60_000, "ACTIVITY_GRACE_MS"),
  };
}

export function activityDeadline(lastActivityAt: number, warningAt: number | null, config: ActivityConfig) {
  return (warningAt ?? lastActivityAt) + (warningAt === null ? config.idleMs : config.graceMs);
}
