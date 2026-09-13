==================================================
PHASE 18 — 3D PERFORMANCE OPTIMIZATION
======================================
 
PROMPT:
 
Act as a WebGL performance engineer.
 
Audit the entire 3D implementation.
 
Inspect:
 
draw calls
triangle count
texture memory
shader cost
lighting
shadows
post-processing
React re-renders
network updates
DPR
 
Implement adaptive quality.
 
Suggested levels:
 
HIGH
MEDIUM
LOW
 
Potential techniques:
 
dynamic DPR
LOD
Meshopt
Draco
KTX2
compressed textures
instancing
frustum culling
lazy model loading
reduced particle counts
disabled shadows on mobile
 
Validate against the per-room concurrency assumptions (e.g. 30 avatars rendered simultaneously on a mid-range mobile device).
 
Do not reduce usability.