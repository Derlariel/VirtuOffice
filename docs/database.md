# Database Design

The implemented design is in [Prisma schema](../prisma/schema.prisma), [entity/index design](../prisma/DESIGN.md) and [deletion policy](../prisma/README.md). These are existing Phase 2 deliverables; this document is their current context entry point.

## Entities

User, Role, UserRole, Permission, RolePermission, ReportsTo, AllowedEmailDomain, AuthIdentity, AuthSession, WorkSession, ActivityEvent, Presence, Room, RoomMembership, Task, Tag, TaskTag, TaskEvent, TaskComment, TaskAttachment, Submission, SubmissionFile, Meeting, MeetingParticipant, MeetingMessage, Notification.

## Relations

ReportsTo models dated member/supervisor scope. AuthIdentity maps an opaque provider subject to a user. RoomMembership is available for future restricted-room policy; current rooms are shared. Required business/audit references restrict deletion; dependent join/child rows cascade only at final purge.

## Indexes

User/session lookup, room presence, notification recipient/read/time and expiry indexes exist. Partial SQL unique indexes enforce one OPEN work session and one active presence per user; these must be preserved even though Prisma 6 does not express them.

## Enums

RoleCode supports ADMIN/SUPERVISOR/MEMBER. WorkStatus supports AVAILABLE, WORKING, IN_MEETING, FOCUS, BREAK, AWAY, INACTIVE, OFFLINE. Full enum definitions remain in the schema.

## Constraints

Existing SQL checks cover normalized emails/domains, valid time ranges, nonnegative durations, positive capacities/file sizes, checksums, submission shape and reporting self-reference. No avatar transforms or raw activity payloads are stored.

## Retention

Existing technical defaults: 90-day activity/presence history; 365-day attendance after checkout. [Retention SQL](../prisma/retention.sql) excludes active presence and open attendance. Scheduling and policy approval remain deployment gates; do not infer legal approval from a schema default.

## Migration Strategy

Keep all five applied migrations: initial, collaboration_records, presence_status, notification_types, default_rooms. Do not reset or rewrite existing data. Compatibility work normalizes two `dbgenerated` expressions to PostgreSQL's equivalent introspected spelling; this changes no database behavior and needs no SQL migration. Use `prisma migrate status`, `prisma validate`, and schema diff to verify before future additive migrations.
