-- Task tags and durable activity log required by the task board.
CREATE TYPE "TaskEventType" AS ENUM (
    'CREATED',
    'UPDATED',
    'STATUS_CHANGED',
    'ASSIGNED',
    'COMMENTED',
    'ATTACHMENT_ADDED',
    'SUBMISSION_ADDED',
    'DELETED'
);

CREATE TABLE "tags" (
    "id" UUID NOT NULL,
    "name" VARCHAR(80) NOT NULL,
    "createdAt" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "tags_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "task_tags" (
    "taskId" UUID NOT NULL,
    "tagId" UUID NOT NULL,
    "createdAt" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "task_tags_pkey" PRIMARY KEY ("taskId", "tagId")
);

CREATE TABLE "task_events" (
    "id" UUID NOT NULL,
    "taskId" UUID NOT NULL,
    "actorId" UUID,
    "type" "TaskEventType" NOT NULL,
    "data" JSONB,
    "createdAt" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "task_events_pkey" PRIMARY KEY ("id")
);

-- Meeting chat is application data; media remains in LiveKit/WebRTC.
CREATE TABLE "meeting_messages" (
    "id" UUID NOT NULL,
    "meetingId" UUID NOT NULL,
    "authorId" UUID NOT NULL,
    "body" TEXT NOT NULL,
    "deletedAt" TIMESTAMPTZ(3),
    "createdAt" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMPTZ(3) NOT NULL,
    CONSTRAINT "meeting_messages_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "tags_name_key" ON "tags"("name");
CREATE INDEX "task_tags_tagId_idx" ON "task_tags"("tagId");
CREATE INDEX "task_events_taskId_createdAt_idx" ON "task_events"("taskId", "createdAt");
CREATE INDEX "task_events_actorId_idx" ON "task_events"("actorId");
CREATE INDEX "meeting_messages_meetingId_createdAt_idx" ON "meeting_messages"("meetingId", "createdAt");
CREATE INDEX "meeting_messages_authorId_idx" ON "meeting_messages"("authorId");

ALTER TABLE "task_tags"
    ADD CONSTRAINT "task_tags_taskId_fkey" FOREIGN KEY ("taskId") REFERENCES "tasks"("id") ON DELETE CASCADE ON UPDATE CASCADE,
    ADD CONSTRAINT "task_tags_tagId_fkey" FOREIGN KEY ("tagId") REFERENCES "tags"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "task_events"
    ADD CONSTRAINT "task_events_taskId_fkey" FOREIGN KEY ("taskId") REFERENCES "tasks"("id") ON DELETE CASCADE ON UPDATE CASCADE,
    ADD CONSTRAINT "task_events_actorId_fkey" FOREIGN KEY ("actorId") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

ALTER TABLE "meeting_messages"
    ADD CONSTRAINT "meeting_messages_meetingId_fkey" FOREIGN KEY ("meetingId") REFERENCES "meetings"("id") ON DELETE CASCADE ON UPDATE CASCADE,
    ADD CONSTRAINT "meeting_messages_authorId_fkey" FOREIGN KEY ("authorId") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
