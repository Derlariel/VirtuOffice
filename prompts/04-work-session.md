==================================================
PHASE 4 — CHECK-IN / CHECK-OUT
==============================
 
PROMPT:
 
Implement work session management.
 
After authentication, the user can:
 
* Check In
* see check-in time
* see current work duration
* Check Out
A WorkSession should store:
 
userId
checkInAt
checkOutAt
status
duration where appropriate
 
Prevent multiple active sessions for the same user.
 
Define and implement the multi-tab/multi-device behavior specified in Core Features (item 11).
 
If the browser crashes or connection is lost, handle session recovery safely.
 
Build this phase with a plain, simple UI (no 3D yet) purely to get the logic and data flow working first. This is a temporary implementation scaffold, not the final design — per the UI/UX PARADIGM section, this UI will later be converted into a small HUD overlay once the 3D world exists (Phase 9+), not kept as a standalone page.