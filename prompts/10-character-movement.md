==================================================
PHASE 10 — 3D CHARACTER MOVEMENT
================================
 
PROMPT:
 
Implement character movement.
 
Desktop:
 
WASD
Arrow keys
 
Mobile:
 
Virtual joystick / touch control
 
Requirements:
 
* smooth movement
* collision boundaries
* camera follow
* basic idle/walk animation
* room boundaries
Separate:
 
local simulation
rendering
network synchronization
 
Do not send network updates every frame.
 
Use throttled position updates.
 
Remote players should use interpolation so movement looks smooth.