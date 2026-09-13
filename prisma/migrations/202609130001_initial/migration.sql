-- CreateSchema
CREATE SCHEMA IF NOT EXISTS "public";

-- CreateEnum
CREATE TYPE "RoleCode" AS ENUM ('ADMIN', 'SUPERVISOR', 'MEMBER');

-- CreateEnum
CREATE TYPE "AccountStatus" AS ENUM ('ACTIVE', 'SUSPENDED', 'DISABLED');

-- CreateEnum
CREATE TYPE "WorkSessionStatus" AS ENUM ('OPEN', 'CLOSED');

-- CreateEnum
CREATE TYPE "WorkStatus" AS ENUM ('AVAILABLE', 'WORKING', 'IN_MEETING', 'FOCUS_MODE', 'AWAY', 'INACTIVE', 'BREAK', 'OFFLINE');

-- CreateEnum
CREATE TYPE "PresenceConnection" AS ENUM ('ONLINE', 'OFFLINE');

-- CreateEnum
CREATE TYPE "ActivityEventType" AS ENUM ('IDLE_WARNING', 'IDLE_ACKNOWLEDGED', 'MARKED_INACTIVE', 'ACTIVITY_RESUMED', 'ESCALATED');

-- CreateEnum
CREATE TYPE "RoomKind" AS ENUM ('LOBBY', 'WORK', 'MEETING', 'FOCUS', 'BREAK');

-- CreateEnum
CREATE TYPE "TaskStatus" AS ENUM ('BACKLOG', 'TODO', 'IN_PROGRESS', 'REVIEW', 'DONE');

-- CreateEnum
CREATE TYPE "TaskPriority" AS ENUM ('LOW', 'MEDIUM', 'HIGH', 'URGENT');

-- CreateEnum
CREATE TYPE "FileScanStatus" AS ENUM ('PENDING', 'CLEAN', 'REJECTED', 'ERROR');

-- CreateEnum
CREATE TYPE "SubmissionType" AS ENUM ('FILE', 'LINK', 'MIXED');

-- CreateEnum
CREATE TYPE "MeetingStatus" AS ENUM ('SCHEDULED', 'ACTIVE', 'ENDED', 'CANCELLED');

-- CreateEnum
CREATE TYPE "MeetingParticipantRole" AS ENUM ('HOST', 'PARTICIPANT');

-- CreateEnum
CREATE TYPE "MeetingParticipantStatus" AS ENUM ('INVITED', 'JOINED', 'LEFT', 'REMOVED');

-- CreateEnum
CREATE TYPE "NotificationType" AS ENUM ('INACTIVITY_ESCALATION', 'TASK_ASSIGNED', 'TASK_UPDATED', 'SUBMISSION_UPDATED', 'MEETING_INVITATION', 'SYSTEM');

-- CreateTable
CREATE TABLE "users" (
    "id" UUID NOT NULL,
    "email" VARCHAR(320) NOT NULL,
    "displayName" VARCHAR(120) NOT NULL,
    "accountStatus" "AccountStatus" NOT NULL DEFAULT 'ACTIVE',
    "locale" VARCHAR(10) NOT NULL DEFAULT 'th',
    "deletedAt" TIMESTAMPTZ(3),
    "createdAt" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMPTZ(3) NOT NULL,

    CONSTRAINT "users_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "roles" (
    "id" UUID NOT NULL,
    "code" "RoleCode" NOT NULL,
    "name" VARCHAR(80) NOT NULL,
    "description" VARCHAR(255),
    "isSystem" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMPTZ(3) NOT NULL,

    CONSTRAINT "roles_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "permissions" (
    "id" UUID NOT NULL,
    "key" VARCHAR(120) NOT NULL,
    "description" VARCHAR(255),
    "createdAt" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "permissions_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "user_roles" (
    "userId" UUID NOT NULL,
    "roleId" UUID NOT NULL,
    "assignedById" UUID,
    "assignedAt" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "expiresAt" TIMESTAMPTZ(3),

    CONSTRAINT "user_roles_pkey" PRIMARY KEY ("userId","roleId")
);

-- CreateTable
CREATE TABLE "role_permissions" (
    "roleId" UUID NOT NULL,
    "permissionId" UUID NOT NULL,
    "grantedAt" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "role_permissions_pkey" PRIMARY KEY ("roleId","permissionId")
);

-- CreateTable
CREATE TABLE "reports_to" (
    "id" UUID NOT NULL,
    "memberId" UUID NOT NULL,
    "supervisorId" UUID NOT NULL,
    "assignedById" UUID,
    "validFrom" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "validUntil" TIMESTAMPTZ(3),
    "createdAt" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMPTZ(3) NOT NULL,

    CONSTRAINT "reports_to_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "allowed_email_domains" (
    "id" UUID NOT NULL,
    "domain" VARCHAR(253) NOT NULL,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdById" UUID,
    "createdAt" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMPTZ(3) NOT NULL,

    CONSTRAINT "allowed_email_domains_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "auth_identities" (
    "id" UUID NOT NULL,
    "userId" UUID NOT NULL,
    "provider" VARCHAR(80) NOT NULL,
    "providerSubject" VARCHAR(255) NOT NULL,
    "lastLoginAt" TIMESTAMPTZ(3),
    "createdAt" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "auth_identities_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "auth_sessions" (
    "id" UUID NOT NULL,
    "userId" UUID NOT NULL,
    "sessionTokenHash" CHAR(64) NOT NULL,
    "expiresAt" TIMESTAMPTZ(3) NOT NULL,
    "revokedAt" TIMESTAMPTZ(3),
    "createdAt" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMPTZ(3) NOT NULL,

    CONSTRAINT "auth_sessions_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "work_sessions" (
    "id" UUID NOT NULL,
    "userId" UUID NOT NULL,
    "status" "WorkSessionStatus" NOT NULL DEFAULT 'OPEN',
    "checkInAt" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "checkOutAt" TIMESTAMPTZ(3),
    "checkOutReason" VARCHAR(120),
    "durationSeconds" INTEGER,
    "breakSeconds" INTEGER NOT NULL DEFAULT 0,
    "inactiveSeconds" INTEGER NOT NULL DEFAULT 0,
    "retentionExpiresAt" TIMESTAMPTZ(3),
    "createdAt" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMPTZ(3) NOT NULL,

    CONSTRAINT "work_sessions_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "activity_events" (
    "id" UUID NOT NULL,
    "userId" UUID NOT NULL,
    "workSessionId" UUID,
    "type" "ActivityEventType" NOT NULL,
    "occurredAt" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "supervisorNotifiedAt" TIMESTAMPTZ(3),
    "expiresAt" TIMESTAMPTZ(3) NOT NULL DEFAULT (CURRENT_TIMESTAMP + INTERVAL '90 days'),
    "createdAt" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "activity_events_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "presences" (
    "id" UUID NOT NULL,
    "userId" UUID NOT NULL,
    "roomId" UUID,
    "workStatus" "WorkStatus" NOT NULL DEFAULT 'OFFLINE',
    "connection" "PresenceConnection" NOT NULL DEFAULT 'OFFLINE',
    "startedAt" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "endedAt" TIMESTAMPTZ(3),
    "lastSeenAt" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "expiresAt" TIMESTAMPTZ(3) NOT NULL DEFAULT (CURRENT_TIMESTAMP + INTERVAL '90 days'),
    "updatedAt" TIMESTAMPTZ(3) NOT NULL,

    CONSTRAINT "presences_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "rooms" (
    "id" UUID NOT NULL,
    "slug" VARCHAR(80) NOT NULL,
    "name" VARCHAR(120) NOT NULL,
    "kind" "RoomKind" NOT NULL,
    "capacity" INTEGER NOT NULL DEFAULT 30,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "archivedAt" TIMESTAMPTZ(3),
    "createdAt" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMPTZ(3) NOT NULL,

    CONSTRAINT "rooms_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "room_memberships" (
    "id" UUID NOT NULL,
    "userId" UUID NOT NULL,
    "roomId" UUID NOT NULL,
    "grantedById" UUID,
    "expiresAt" TIMESTAMPTZ(3),
    "revokedAt" TIMESTAMPTZ(3),
    "createdAt" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "room_memberships_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "tasks" (
    "id" UUID NOT NULL,
    "roomId" UUID,
    "assigneeId" UUID,
    "reporterId" UUID NOT NULL,
    "title" VARCHAR(200) NOT NULL,
    "description" TEXT,
    "status" "TaskStatus" NOT NULL DEFAULT 'BACKLOG',
    "priority" "TaskPriority" NOT NULL DEFAULT 'MEDIUM',
    "dueDate" DATE,
    "version" INTEGER NOT NULL DEFAULT 1,
    "deletedAt" TIMESTAMPTZ(3),
    "createdAt" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMPTZ(3) NOT NULL,

    CONSTRAINT "tasks_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "task_comments" (
    "id" UUID NOT NULL,
    "taskId" UUID NOT NULL,
    "authorId" UUID NOT NULL,
    "body" TEXT NOT NULL,
    "deletedAt" TIMESTAMPTZ(3),
    "createdAt" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMPTZ(3) NOT NULL,

    CONSTRAINT "task_comments_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "task_attachments" (
    "id" UUID NOT NULL,
    "taskId" UUID NOT NULL,
    "uploadedById" UUID NOT NULL,
    "objectKey" VARCHAR(1024) NOT NULL,
    "originalName" VARCHAR(255) NOT NULL,
    "mimeType" VARCHAR(255) NOT NULL,
    "byteSize" BIGINT NOT NULL,
    "checksumSha256" CHAR(64) NOT NULL,
    "scanStatus" "FileScanStatus" NOT NULL DEFAULT 'PENDING',
    "deletedAt" TIMESTAMPTZ(3),
    "expiresAt" TIMESTAMPTZ(3),
    "createdAt" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "task_attachments_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "submissions" (
    "id" UUID NOT NULL,
    "taskId" UUID NOT NULL,
    "submittedById" UUID NOT NULL,
    "version" INTEGER NOT NULL,
    "type" "SubmissionType" NOT NULL,
    "linkUrl" VARCHAR(2048),
    "note" TEXT,
    "deletedAt" TIMESTAMPTZ(3),
    "createdAt" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMPTZ(3) NOT NULL,

    CONSTRAINT "submissions_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "submission_files" (
    "id" UUID NOT NULL,
    "submissionId" UUID NOT NULL,
    "objectKey" VARCHAR(1024) NOT NULL,
    "originalName" VARCHAR(255) NOT NULL,
    "mimeType" VARCHAR(255) NOT NULL,
    "byteSize" BIGINT NOT NULL,
    "checksumSha256" CHAR(64) NOT NULL,
    "scanStatus" "FileScanStatus" NOT NULL DEFAULT 'PENDING',
    "deletedAt" TIMESTAMPTZ(3),
    "expiresAt" TIMESTAMPTZ(3),
    "createdAt" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "submission_files_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "meetings" (
    "id" UUID NOT NULL,
    "roomId" UUID,
    "createdById" UUID NOT NULL,
    "title" VARCHAR(200) NOT NULL,
    "livekitRoomKey" VARCHAR(120) NOT NULL,
    "status" "MeetingStatus" NOT NULL DEFAULT 'SCHEDULED',
    "scheduledStart" TIMESTAMPTZ(3),
    "startedAt" TIMESTAMPTZ(3),
    "endedAt" TIMESTAMPTZ(3),
    "deletedAt" TIMESTAMPTZ(3),
    "createdAt" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMPTZ(3) NOT NULL,

    CONSTRAINT "meetings_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "meeting_participants" (
    "id" UUID NOT NULL,
    "meetingId" UUID NOT NULL,
    "userId" UUID NOT NULL,
    "role" "MeetingParticipantRole" NOT NULL DEFAULT 'PARTICIPANT',
    "status" "MeetingParticipantStatus" NOT NULL DEFAULT 'INVITED',
    "joinedAt" TIMESTAMPTZ(3),
    "leftAt" TIMESTAMPTZ(3),
    "lastSeenAt" TIMESTAMPTZ(3),
    "createdAt" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMPTZ(3) NOT NULL,

    CONSTRAINT "meeting_participants_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "notifications" (
    "id" UUID NOT NULL,
    "recipientId" UUID NOT NULL,
    "actorId" UUID,
    "activityEventId" UUID,
    "type" "NotificationType" NOT NULL,
    "messageKey" VARCHAR(160) NOT NULL,
    "data" JSONB,
    "readAt" TIMESTAMPTZ(3),
    "expiresAt" TIMESTAMPTZ(3),
    "createdAt" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "notifications_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "users_email_key" ON "users"("email");

-- CreateIndex
CREATE INDEX "users_deletedAt_idx" ON "users"("deletedAt");

-- CreateIndex
CREATE UNIQUE INDEX "roles_code_key" ON "roles"("code");

-- CreateIndex
CREATE UNIQUE INDEX "permissions_key_key" ON "permissions"("key");

-- CreateIndex
CREATE INDEX "user_roles_roleId_expiresAt_idx" ON "user_roles"("roleId", "expiresAt");

-- CreateIndex
CREATE INDEX "reports_to_memberId_validUntil_idx" ON "reports_to"("memberId", "validUntil");

-- CreateIndex
CREATE INDEX "reports_to_supervisorId_validUntil_idx" ON "reports_to"("supervisorId", "validUntil");

-- CreateIndex
CREATE UNIQUE INDEX "reports_to_memberId_supervisorId_validFrom_key" ON "reports_to"("memberId", "supervisorId", "validFrom");

-- CreateIndex
CREATE UNIQUE INDEX "allowed_email_domains_domain_key" ON "allowed_email_domains"("domain");

-- CreateIndex
CREATE INDEX "allowed_email_domains_isActive_idx" ON "allowed_email_domains"("isActive");

-- CreateIndex
CREATE INDEX "auth_identities_userId_idx" ON "auth_identities"("userId");

-- CreateIndex
CREATE UNIQUE INDEX "auth_identities_provider_providerSubject_key" ON "auth_identities"("provider", "providerSubject");

-- CreateIndex
CREATE UNIQUE INDEX "auth_sessions_sessionTokenHash_key" ON "auth_sessions"("sessionTokenHash");

-- CreateIndex
CREATE INDEX "auth_sessions_userId_revokedAt_idx" ON "auth_sessions"("userId", "revokedAt");

-- CreateIndex
CREATE INDEX "auth_sessions_expiresAt_idx" ON "auth_sessions"("expiresAt");

-- CreateIndex
CREATE INDEX "work_sessions_userId_checkInAt_idx" ON "work_sessions"("userId", "checkInAt" DESC);

-- CreateIndex
CREATE INDEX "work_sessions_retentionExpiresAt_idx" ON "work_sessions"("retentionExpiresAt");

-- CreateIndex
CREATE INDEX "activity_events_userId_occurredAt_idx" ON "activity_events"("userId", "occurredAt" DESC);

-- CreateIndex
CREATE INDEX "activity_events_workSessionId_occurredAt_idx" ON "activity_events"("workSessionId", "occurredAt");

-- CreateIndex
CREATE INDEX "activity_events_expiresAt_idx" ON "activity_events"("expiresAt");

-- CreateIndex
CREATE INDEX "presences_userId_startedAt_idx" ON "presences"("userId", "startedAt" DESC);

-- CreateIndex
CREATE INDEX "presences_roomId_endedAt_idx" ON "presences"("roomId", "endedAt");

-- CreateIndex
CREATE INDEX "presences_expiresAt_idx" ON "presences"("expiresAt");

-- CreateIndex
CREATE UNIQUE INDEX "rooms_slug_key" ON "rooms"("slug");

-- CreateIndex
CREATE INDEX "rooms_isActive_kind_idx" ON "rooms"("isActive", "kind");

-- CreateIndex
CREATE INDEX "room_memberships_roomId_revokedAt_idx" ON "room_memberships"("roomId", "revokedAt");

-- CreateIndex
CREATE INDEX "room_memberships_expiresAt_idx" ON "room_memberships"("expiresAt");

-- CreateIndex
CREATE UNIQUE INDEX "room_memberships_userId_roomId_key" ON "room_memberships"("userId", "roomId");

-- CreateIndex
CREATE INDEX "tasks_status_deletedAt_idx" ON "tasks"("status", "deletedAt");

-- CreateIndex
CREATE INDEX "tasks_assigneeId_status_deletedAt_idx" ON "tasks"("assigneeId", "status", "deletedAt");

-- CreateIndex
CREATE INDEX "tasks_reporterId_createdAt_idx" ON "tasks"("reporterId", "createdAt" DESC);

-- CreateIndex
CREATE INDEX "tasks_dueDate_idx" ON "tasks"("dueDate");

-- CreateIndex
CREATE INDEX "task_comments_taskId_createdAt_idx" ON "task_comments"("taskId", "createdAt");

-- CreateIndex
CREATE INDEX "task_comments_authorId_idx" ON "task_comments"("authorId");

-- CreateIndex
CREATE UNIQUE INDEX "task_attachments_objectKey_key" ON "task_attachments"("objectKey");

-- CreateIndex
CREATE INDEX "task_attachments_taskId_deletedAt_idx" ON "task_attachments"("taskId", "deletedAt");

-- CreateIndex
CREATE INDEX "task_attachments_scanStatus_idx" ON "task_attachments"("scanStatus");

-- CreateIndex
CREATE INDEX "task_attachments_expiresAt_idx" ON "task_attachments"("expiresAt");

-- CreateIndex
CREATE INDEX "submissions_submittedById_createdAt_idx" ON "submissions"("submittedById", "createdAt" DESC);

-- CreateIndex
CREATE UNIQUE INDEX "submissions_taskId_version_key" ON "submissions"("taskId", "version");

-- CreateIndex
CREATE UNIQUE INDEX "submission_files_objectKey_key" ON "submission_files"("objectKey");

-- CreateIndex
CREATE INDEX "submission_files_submissionId_deletedAt_idx" ON "submission_files"("submissionId", "deletedAt");

-- CreateIndex
CREATE INDEX "submission_files_scanStatus_idx" ON "submission_files"("scanStatus");

-- CreateIndex
CREATE INDEX "submission_files_expiresAt_idx" ON "submission_files"("expiresAt");

-- CreateIndex
CREATE UNIQUE INDEX "meetings_livekitRoomKey_key" ON "meetings"("livekitRoomKey");

-- CreateIndex
CREATE INDEX "meetings_status_scheduledStart_idx" ON "meetings"("status", "scheduledStart");

-- CreateIndex
CREATE INDEX "meetings_createdById_createdAt_idx" ON "meetings"("createdById", "createdAt" DESC);

-- CreateIndex
CREATE INDEX "meeting_participants_userId_status_idx" ON "meeting_participants"("userId", "status");

-- CreateIndex
CREATE UNIQUE INDEX "meeting_participants_meetingId_userId_key" ON "meeting_participants"("meetingId", "userId");

-- CreateIndex
CREATE INDEX "notifications_recipientId_readAt_createdAt_idx" ON "notifications"("recipientId", "readAt", "createdAt" DESC);

-- CreateIndex
CREATE INDEX "notifications_activityEventId_idx" ON "notifications"("activityEventId");

-- CreateIndex
CREATE INDEX "notifications_expiresAt_idx" ON "notifications"("expiresAt");

-- AddForeignKey
ALTER TABLE "user_roles" ADD CONSTRAINT "user_roles_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "user_roles" ADD CONSTRAINT "user_roles_roleId_fkey" FOREIGN KEY ("roleId") REFERENCES "roles"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "user_roles" ADD CONSTRAINT "user_roles_assignedById_fkey" FOREIGN KEY ("assignedById") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "role_permissions" ADD CONSTRAINT "role_permissions_roleId_fkey" FOREIGN KEY ("roleId") REFERENCES "roles"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "role_permissions" ADD CONSTRAINT "role_permissions_permissionId_fkey" FOREIGN KEY ("permissionId") REFERENCES "permissions"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "reports_to" ADD CONSTRAINT "reports_to_memberId_fkey" FOREIGN KEY ("memberId") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "reports_to" ADD CONSTRAINT "reports_to_supervisorId_fkey" FOREIGN KEY ("supervisorId") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "reports_to" ADD CONSTRAINT "reports_to_assignedById_fkey" FOREIGN KEY ("assignedById") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "allowed_email_domains" ADD CONSTRAINT "allowed_email_domains_createdById_fkey" FOREIGN KEY ("createdById") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "auth_identities" ADD CONSTRAINT "auth_identities_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "auth_sessions" ADD CONSTRAINT "auth_sessions_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "work_sessions" ADD CONSTRAINT "work_sessions_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "activity_events" ADD CONSTRAINT "activity_events_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "activity_events" ADD CONSTRAINT "activity_events_workSessionId_fkey" FOREIGN KEY ("workSessionId") REFERENCES "work_sessions"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "presences" ADD CONSTRAINT "presences_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "presences" ADD CONSTRAINT "presences_roomId_fkey" FOREIGN KEY ("roomId") REFERENCES "rooms"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "room_memberships" ADD CONSTRAINT "room_memberships_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "room_memberships" ADD CONSTRAINT "room_memberships_roomId_fkey" FOREIGN KEY ("roomId") REFERENCES "rooms"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "room_memberships" ADD CONSTRAINT "room_memberships_grantedById_fkey" FOREIGN KEY ("grantedById") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "tasks" ADD CONSTRAINT "tasks_roomId_fkey" FOREIGN KEY ("roomId") REFERENCES "rooms"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "tasks" ADD CONSTRAINT "tasks_assigneeId_fkey" FOREIGN KEY ("assigneeId") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "tasks" ADD CONSTRAINT "tasks_reporterId_fkey" FOREIGN KEY ("reporterId") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "task_comments" ADD CONSTRAINT "task_comments_taskId_fkey" FOREIGN KEY ("taskId") REFERENCES "tasks"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "task_comments" ADD CONSTRAINT "task_comments_authorId_fkey" FOREIGN KEY ("authorId") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "task_attachments" ADD CONSTRAINT "task_attachments_taskId_fkey" FOREIGN KEY ("taskId") REFERENCES "tasks"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "task_attachments" ADD CONSTRAINT "task_attachments_uploadedById_fkey" FOREIGN KEY ("uploadedById") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "submissions" ADD CONSTRAINT "submissions_taskId_fkey" FOREIGN KEY ("taskId") REFERENCES "tasks"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "submissions" ADD CONSTRAINT "submissions_submittedById_fkey" FOREIGN KEY ("submittedById") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "submission_files" ADD CONSTRAINT "submission_files_submissionId_fkey" FOREIGN KEY ("submissionId") REFERENCES "submissions"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "meetings" ADD CONSTRAINT "meetings_roomId_fkey" FOREIGN KEY ("roomId") REFERENCES "rooms"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "meetings" ADD CONSTRAINT "meetings_createdById_fkey" FOREIGN KEY ("createdById") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "meeting_participants" ADD CONSTRAINT "meeting_participants_meetingId_fkey" FOREIGN KEY ("meetingId") REFERENCES "meetings"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "meeting_participants" ADD CONSTRAINT "meeting_participants_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "notifications" ADD CONSTRAINT "notifications_recipientId_fkey" FOREIGN KEY ("recipientId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "notifications" ADD CONSTRAINT "notifications_actorId_fkey" FOREIGN KEY ("actorId") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "notifications" ADD CONSTRAINT "notifications_activityEventId_fkey" FOREIGN KEY ("activityEventId") REFERENCES "activity_events"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- Business invariants that Prisma 6 cannot express in the schema.
ALTER TABLE "users"
    ADD CONSTRAINT "users_email_normalized_check" CHECK ("email" = lower("email"));

ALTER TABLE "user_roles"
    ADD CONSTRAINT "user_roles_valid_range_check" CHECK ("expiresAt" IS NULL OR "expiresAt" > "assignedAt");

ALTER TABLE "reports_to"
    ADD CONSTRAINT "reports_to_not_self_check" CHECK ("memberId" <> "supervisorId"),
    ADD CONSTRAINT "reports_to_valid_range_check" CHECK ("validUntil" IS NULL OR "validUntil" > "validFrom");

CREATE UNIQUE INDEX "reports_to_active_member_supervisor_key"
    ON "reports_to"("memberId", "supervisorId")
    WHERE "validUntil" IS NULL;

ALTER TABLE "allowed_email_domains"
    ADD CONSTRAINT "allowed_email_domains_normalized_check"
    CHECK ("domain" = lower("domain") AND "domain" !~ '^@' AND "domain" LIKE '%.%');

ALTER TABLE "auth_sessions"
    ADD CONSTRAINT "auth_sessions_valid_range_check" CHECK ("expiresAt" > "createdAt");

ALTER TABLE "work_sessions"
    ADD CONSTRAINT "work_sessions_status_check" CHECK (
        ("status" = 'OPEN' AND "checkOutAt" IS NULL AND "durationSeconds" IS NULL)
        OR ("status" = 'CLOSED' AND "checkOutAt" IS NOT NULL AND "durationSeconds" IS NOT NULL)
    ),
    ADD CONSTRAINT "work_sessions_time_range_check" CHECK ("checkOutAt" IS NULL OR "checkOutAt" >= "checkInAt"),
    ADD CONSTRAINT "work_sessions_duration_check" CHECK (
        ("durationSeconds" IS NULL OR "durationSeconds" >= 0)
        AND "breakSeconds" >= 0
        AND "inactiveSeconds" >= 0
    );

CREATE UNIQUE INDEX "work_sessions_one_open_per_user_key"
    ON "work_sessions"("userId")
    WHERE "status" = 'OPEN';

ALTER TABLE "activity_events"
    ADD CONSTRAINT "activity_events_retention_check" CHECK ("expiresAt" > "occurredAt");

ALTER TABLE "presences"
    ADD CONSTRAINT "presences_time_range_check" CHECK (
        ("endedAt" IS NULL OR "endedAt" >= "startedAt")
        AND "lastSeenAt" >= "startedAt"
        AND "expiresAt" > "startedAt"
    );

CREATE UNIQUE INDEX "presences_one_active_per_user_key"
    ON "presences"("userId")
    WHERE "endedAt" IS NULL;

ALTER TABLE "rooms"
    ADD CONSTRAINT "rooms_capacity_check" CHECK ("capacity" > 0),
    ADD CONSTRAINT "rooms_slug_normalized_check" CHECK ("slug" = lower("slug"));

ALTER TABLE "room_memberships"
    ADD CONSTRAINT "room_memberships_valid_range_check" CHECK (
        ("expiresAt" IS NULL OR "expiresAt" > "createdAt")
        AND ("revokedAt" IS NULL OR "revokedAt" >= "createdAt")
    );

ALTER TABLE "tasks"
    ADD CONSTRAINT "tasks_version_check" CHECK ("version" > 0);

ALTER TABLE "task_attachments"
    ADD CONSTRAINT "task_attachments_size_check" CHECK ("byteSize" > 0),
    ADD CONSTRAINT "task_attachments_checksum_check" CHECK ("checksumSha256" ~ '^[0-9a-f]{64}$'),
    ADD CONSTRAINT "task_attachments_expiry_check" CHECK ("expiresAt" IS NULL OR "expiresAt" > "createdAt");

ALTER TABLE "submissions"
    ADD CONSTRAINT "submissions_version_check" CHECK ("version" > 0),
    ADD CONSTRAINT "submissions_content_check" CHECK (
        ("type" = 'FILE' AND "linkUrl" IS NULL)
        OR ("type" IN ('LINK', 'MIXED') AND "linkUrl" IS NOT NULL)
    );

ALTER TABLE "submission_files"
    ADD CONSTRAINT "submission_files_size_check" CHECK ("byteSize" > 0),
    ADD CONSTRAINT "submission_files_checksum_check" CHECK ("checksumSha256" ~ '^[0-9a-f]{64}$'),
    ADD CONSTRAINT "submission_files_expiry_check" CHECK ("expiresAt" IS NULL OR "expiresAt" > "createdAt");

ALTER TABLE "meetings"
    ADD CONSTRAINT "meetings_time_range_check" CHECK ("endedAt" IS NULL OR ("startedAt" IS NOT NULL AND "endedAt" >= "startedAt"));

ALTER TABLE "meeting_participants"
    ADD CONSTRAINT "meeting_participants_time_range_check" CHECK (
        "leftAt" IS NULL OR ("joinedAt" IS NOT NULL AND "leftAt" >= "joinedAt")
    );

ALTER TABLE "notifications"
    ADD CONSTRAINT "notifications_expiry_check" CHECK ("expiresAt" IS NULL OR "expiresAt" > "createdAt");

-- Stable IDs make the system roles and initial domain allowlist safe to seed repeatedly.
INSERT INTO "roles" ("id", "code", "name", "description", "isSystem", "createdAt", "updatedAt") VALUES
    ('00000000-0000-4000-8000-000000000001', 'ADMIN', 'Administrator', 'Full platform administration', true, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
    ('00000000-0000-4000-8000-000000000002', 'SUPERVISOR', 'Supervisor', 'Visibility for assigned members', true, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
    ('00000000-0000-4000-8000-000000000003', 'MEMBER', 'Member', 'Standard workspace access', true, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)
ON CONFLICT ("code") DO NOTHING;

INSERT INTO "allowed_email_domains" ("id", "domain", "isActive", "createdAt", "updatedAt") VALUES
    ('00000000-0000-4000-8000-000000000011', 'mail.kmutt.ac.th', true, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
    ('00000000-0000-4000-8000-000000000012', 'kmutt.ac.th', true, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
    ('00000000-0000-4000-8000-000000000013', 'ad.sit.kmutt.ac.th', true, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)
ON CONFLICT ("domain") DO NOTHING;
