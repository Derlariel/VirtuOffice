-- Run from the retention worker at least daily.
BEGIN;

DELETE FROM "activity_events"
WHERE "expiresAt" <= CURRENT_TIMESTAMP;

DELETE FROM "work_sessions"
WHERE "status" = 'CLOSED'
  AND "retentionExpiresAt" IS NOT NULL
  AND "retentionExpiresAt" <= CURRENT_TIMESTAMP;

DELETE FROM "presences"
WHERE "endedAt" IS NOT NULL
  AND "expiresAt" <= CURRENT_TIMESTAMP;

DELETE FROM "auth_sessions"
WHERE "expiresAt" <= CURRENT_TIMESTAMP
   OR "revokedAt" IS NOT NULL;

DELETE FROM "notifications"
WHERE "expiresAt" IS NOT NULL
  AND "expiresAt" <= CURRENT_TIMESTAMP;

COMMIT;
