==================================================
PHASE 20 — SECURITY REVIEW
==========================
 
PROMPT:
 
Act as an application security engineer.
 
Audit:
 
authentication
authorization
domain restrictions
file uploads
object storage
WebSocket authentication
WebRTC permissions
room permissions
task permissions
supervisor permissions (scoped correctly to the reporting structure)
CSRF
XSS
SQL injection
rate limiting
session handling
secret management
 
Verify authorization on the server.
 
Do not trust userId, role, roomId, teamId, or email domain supplied by the client.
 
Return issues grouped by:
 
CRITICAL
HIGH
MEDIUM
LOW
 
Then fix critical and high severity issues.