==================================================
PHASE 14 — MEETING SYSTEM
=========================
 
PROMPT:
 
Implement meeting functionality.
 
Prefer LiveKit or another production-ready WebRTC solution rather than building all media infrastructure from scratch.
 
Support:
 
* create meeting
* join
* leave
* microphone
* camera
* screen share
* participant list
* meeting chat
* connection quality indication
Design for the expected concurrent meeting/participant counts defined in Scale & Capacity Assumptions.
 
When joining a meeting:
 
update user status to IN_MEETING.
 
When leaving:
 
restore the appropriate previous status.
 
Keep media streams separate from normal WebSocket presence traffic.