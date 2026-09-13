==================================================
PHASE 2 — DATABASE DESIGN
=========================
 
PROMPT:
 
Design the PostgreSQL database schema.
 
Required entities should include at minimum:
 
User
Role
Team (or ReportsTo relation, to model the supervisor relationship)
AllowedEmailDomain
WorkSession
ActivityEvent
Presence
Room
RoomMembership
Task
TaskComment
TaskAttachment
Submission
SubmissionFile
Meeting
MeetingParticipant
Notification
 
Define:
 
* primary keys
* foreign keys
* indexes
* relationships (including the supervisor/reporting relationship)
* enum values
* timestamps
* deletion strategy
* retention/expiry strategy for ActivityEvent and Presence history (per Compliance section)
Support future role-based permissions.
 
Roles should support at least:
 
ADMIN
SUPERVISOR
MEMBER
 
Generate the ORM schema and migrations.
 
Do not build the UI yet.