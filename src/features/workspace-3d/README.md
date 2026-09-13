# 3D workspace foundation

`WorkspacePreview` lazily loads one fixed, full-viewport `Scene` Canvas after
check-in. The presence UI supplies a room and participant IDs; all critical
controls and network ownership stay outside this feature. The Canvas keeps the
same viewport bounds while HUD drawers open and survives room switches.

- `Scene`, `CameraRig`, `Lighting`: renderer, constrained zoom, simple lights.
- `RoomScene`, `Environment`: room floor, walls, room colors and small decorations.
- `Avatar`, `AvatarController`, `RemoteAvatar`: primitive characters and target interpolation.

Click/tap or focus the view and use arrows to move locally. Remote avatars are
deterministic presence placeholders, not synchronized physical positions. Up to
60 peers are drawn; the HTML list always includes everyone. No movement packets
are sent. Future movement networking belongs in the realtime feature, with
validated room-scoped, throttled updates supplied to these rendering components.

Rendering is on demand, paused offscreen/hidden, with DPR capped at 1.5 (1 on
small/touch devices or after performance decline). Mobile also reduces geometry
and omits decoration. No textures, shadows, downloaded models, fonts, HDR maps,
or post-processing are used. Reduced-motion preference skips interpolation.

The HTML fallback covers unsupported WebGL, runtime errors, context loss, and
the user-controlled Simple Mode. Room controls and notifications remain outside
its error boundary. Browser QA should cover keyboard/touch at
375px and desktop, room changes, reduced motion, and WEBGL_lose_context while
confirming HTML controls remain functional. Unit checks run via `npm test`.
