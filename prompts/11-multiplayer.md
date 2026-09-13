==================================================
PHASE 11 — MULTIPLAYER 3D PRESENCE
==================================
 
PROMPT:
 
Connect the 3D avatars with realtime room presence.
 
Display:
 
avatar
display name
current status
 
Only synchronize players within the same room.
 
Design a compact movement payload such as:
 
userId
roomId
position
rotation
animationState
timestamp
 
Optimize network traffic given the per-room concurrency assumptions defined earlier.
 
Use interpolation rather than transmitting 60 updates per second.
 
Handle:
 
joining
leaving
disconnects
reconnects
room switching