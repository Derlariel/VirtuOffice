==================================================
PHASE 9 — 3D FOUNDATION
=======================
 
PROMPT:
 
Now implement the 3D workspace foundation using:
 
Three.js
React Three Fiber
Drei
 
Important — read both the UI/UX PARADIGM and ART DIRECTION — STYLIZED CUTE / CHIBI 3D STYLE sections before starting this phase:
 
* The 3D Canvas becomes the full-viewport primary interface from this phase onward. This is a layout/UX change, not just adding a component.
* Replace the plain check-in/status page built in Phase 4/5 with a full-screen Canvas, and re-implement that same check-in/status functionality as small HUD overlay panels on top of it.
* In code, 3D rendering must still remain isolated from business logic (state/data live outside the 3D component tree), but visually the 3D world must now be what the user sees by default, not a widget on a page.
* Camera stays a free, third-person perspective camera following the avatar — do not implement an orthographic/isometric camera.
* Before writing any scene/avatar code, view every image in `public/references/3d/rooms/` and `public/references/3d/employees/` and match the color palette, chibi character proportions, and material finish shown there.
* The scene must be built to the stylized cute/chibi quality bar defined in ART DIRECTION from the start (bright flat/toon materials, soft lighting, chibi avatar proportions) — do not build with default grey primitives and default lighting as a "placeholder for later."
* Do NOT pursue photorealism (no HDRI reflections, no dense PBR textures, no heavy post-processing) — this style is intentionally flat, bright, and simple, which also keeps performance light.
Create:
 
Scene
CameraRig
Lighting (bright soft studio-style lighting, subtle shadows — see ART DIRECTION)
Environment
RoomScene (flat/toon materials, chibi-proportioned low-poly furniture — not realistic office proportions, not flat-colored placeholder boxes either)
Avatar (chibi proportions per reference — big head, simplified body)
AvatarController
RemoteAvatar
PostProcessing (minimal — subtle bloom on emissive elements only, standard tone mapping; see ART DIRECTION)
HUD (overlay layer: status bar, session timer, panel launcher icons)
 
Use one primary Canvas, full-viewport, wherever practical.
 
The HTML interface must continue working even if WebGL fails (fall back to the "Simple Mode" 2D dashboard defined in the UI/UX PARADIGM section, not an error page).
 
Avoid:
 
* massive textures
* unnecessary realtime shadows
* excessive post-processing
* multiple expensive canvases
Add a lightweight fallback.