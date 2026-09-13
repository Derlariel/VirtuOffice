# 3D workspace foundation

`WorkspacePreview` lazily loads one full-viewport Canvas after check-in and a room snapshot. The existing HUD keeps attendance, room, status and notifications outside the scene. The scene survives transient socket disconnects; room updates do not create multiple canvases.

- `Scene` / `CameraRig`: third-person perspective follow camera with orbit and zoom, bounded polar angles.
- `Lighting`: bright hemisphere/directional studio-style lights, subtle 512/1024 shadows off on low quality.
- `RoomScene` / `Environment`: pastel matte surfaces, rounded toy furniture and simple plants. No HDRI, normal maps or postprocessing.
- `Avatar` / `AvatarController` / `RemoteAvatar`: oversized heads, simplified rounded bodies, local target interpolation.

Both supplied images were reviewed before style changes. The office reference informs cyan/white/green palette and clean furniture; the employee reference informs chibi proportions and matte finish. The office image's isometric projection does not override perspective camera requirements. References are not runtime assets or verified licenses.

Click/tap the floor or use arrows while the view has focus. Drag or pinch controls the camera. Movement is local only; remote avatars are deterministic presence markers, capped at 60 while the HTML list includes everyone. Future network transforms must come from an external, validated, room-scoped, throttled transport; do not put sockets in R3F.

Rendering is on demand, paused when hidden, DPR capped at 1.5 (1 on mobile/low). Touch/small screens start LOW and performance decline reduces quality. Reduced motion skips interpolation. Geometry is procedural and has no external asset downloads.

Explicit Simple Mode persists in a preference cookie and bypasses scene loading on return visits. Unsupported WebGL, context loss or rendering failure activates HTML controls. A user can retry 3D explicitly. Browser QA must still cover actual 375px/landscape layouts, camera following, reduced motion and context loss. Unit tests do not certify visual quality or FPS.
