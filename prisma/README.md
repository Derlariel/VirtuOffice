# Database policy

PostgreSQL is the durable source of truth. Avatar transforms, socket heartbeats, and raw keyboard, pointer, or touch data are never persisted.

## Deletion

| Data | Strategy |
| --- | --- |
| Users | Soft-delete and disable first. Anonymize after approved data-rights review; foreign keys prevent accidental loss of business records. |
| Roles and permissions | Restrict role deletion while assigned. Explicit join rows make grants auditable. |
| Reporting relationships | Close with `validUntil`; retain the dated relationship for authorization audits. |
| Rooms, tasks, comments, submissions, meetings | Soft-delete/archive first. Hard-delete only after policy expiry and object-storage cleanup. |
| Authentication sessions | Revoke, then hard-delete after expiry. |
| File rows | Mark deleted, delete the object, then purge metadata. Parent cascades are only for the final purge. |
| Activity events | Hard-delete when `expiresAt` is reached. Default retention: 90 days. |
| Presence history | Close the active interval, then hard-delete when `expiresAt` is reached. Default retention: 90 days. |

The retention worker must run at least daily and delete expired `activity_events`, closed `presences`, expired/revoked `auth_sessions`, expired notifications, and file metadata whose object deletion has succeeded. Active presence rows are excluded even if malformed data lets their expiry pass. Retention exceptions require a legal-hold record in the application phase; do not silently extend `expiresAt`.

## Database-only constraints

The initial migration adds partial unique indexes for one open work session and one active presence per user. It also prevents duplicate active reporting relationships and adds checks for self-reporting, valid time ranges, positive room capacity, nonnegative durations/file sizes, submission shape, and meeting/participant timestamps.
