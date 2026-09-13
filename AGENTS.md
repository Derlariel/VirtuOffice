# PROJECT CONTEXT
 
We are building a web-based 3D Virtual Workspace and Meeting Platform.
 
The platform should feel like a lightweight virtual office where users can log in, check in to work, control a 3D character, walk between virtual rooms, see other participants, join meetings, update work status, manage tasks, submit work, and check out when finished.
 
The application must prioritize performance, particularly on mobile devices and lower-powered computers.
 
Do not sacrifice usability or Core Web Vitals simply to add 3D effects.
 
Architecturally (in code), the 3D rendering layer must be decoupled from business logic — state, data, and business rules must not live inside 3D components. This is a code-organization requirement, NOT a visual/layout requirement. See "UI/UX PARADIGM" below for how this should actually look and feel to the user.
 
Primary priorities:
 
1. Performance
2. Maintainability
3. Security
4. Realtime reliability
5. Responsive design
6. Accessibility
7. 3D visual quality
---
 
# UI/UX PARADIGM — FULL 3D WORLD WITH HUD OVERLAY
 
This is the single most important layout decision in the whole project. State it explicitly to avoid the common failure mode where an implementation treats the 3D scene as a small embedded widget inside an otherwise normal 2D dashboard page.
 
**The 3D canvas is the primary interface, not a feature embedded in a page.**
 
Reference model: this should feel like a lightweight browser game (e.g. Gather.town, Spatial, Gathertown-style offices) — NOT a SaaS dashboard with a 3D thumbnail box.
 
Requirements:
 
* After login and check-in, the 3D scene occupies the **entire viewport** (`100vw x 100vh`), full-bleed, no page scroll, at all times the user is "in the workspace."
* All other functionality — work status, session timer, notifications, task board, meeting controls, room switcher, participant list — is presented as **floating HUD panels, corner widgets, modals, or slide-in drawers layered on top of the always-visible 3D canvas** (like a game UI), not as separate pages the user navigates to instead of the 3D view.
* Opening the task board, notification center, or dashboard should overlay a panel/drawer on top of the 3D world (the world keeps rendering behind it, or pauses lightly) — it should NOT navigate away to a different route that hides the 3D canvas.
* Check-in/check-out, status changes, and the session timer should be small persistent HUD elements (e.g. top bar or corner card), not full-page forms.
* The only screens allowed to be plain 2D (no 3D canvas) are: the login screen itself, and an explicit "settings" or "accessibility mode" screen the user can opt into (see fallback below).
* Provide a "Simple Mode" / accessibility toggle that disables the 3D canvas entirely and falls back to a plain 2D dashboard (reusing the same underlying data/state) for users on very low-end devices, for users who prefer it, or when WebGL is unavailable — but this is an explicit opt-in fallback, not the default experience.
* Camera should default to a third-person view following the user's avatar; UI panels should not be full-screen takeovers that hide the 3D world behind them unless the user explicitly maximizes them (e.g. a meeting screen-share view).
This paradigm applies from Phase 9 onward, and Phase 4/5's "simple UI before 3D" instruction refers only to the *order of implementation* (build check-in/status logic first, wire it into the HUD later) — it does NOT mean the final product should look like a plain dashboard with 3D bolted on as a small box.
 
---
 
# ART DIRECTION — REALISTIC 3D QUALITY
 
Camera and movement stay exactly as defined in the UI/UX PARADIGM section: free perspective camera, third-person, following the avatar. Do NOT switch to an orthographic/isometric camera. The change requested here is visual quality only — the scene must look realistic and polished, not a placeholder grey-box scene like early prototypes.
 
**Reference sites/tools for quality bar (study these before building Phase 9, do not copy assets/code):**
* threejs.org/examples — official lighting, shadow, and post-processing reference implementations
* docs.pmndrs.dev/react-three-fiber → Showcase — real production apps built with the same stack we're using (R3F + Drei)
* bruno-simon.com — benchmark for what polished Three.js web scenes can look like
* Awwwards.com (filter: WebGL/3D) — award-winning 3D web scenes for mood/lighting reference
* Three.js Journey (threejs-journey.com) — reference course; if the implementer is unfamiliar with realistic lighting/post-processing setup in Three.js, this is the canonical resource to study the *techniques* from (do not copy proprietary course assets)
**Lighting:**
* Use image-based lighting via an HDRI environment map (`@react-three/drei`'s `<Environment>`) instead of bare point/directional lights, for realistic ambient light and reflections.
* Use soft shadows (e.g. `<SoftShadows>` from Drei, or PCF soft shadow maps) rather than hard-edged default shadows.
* Add subtle ambient occlusion (via post-processing, see below) so objects feel grounded rather than floating.
**Materials:**
* Use PBR (`MeshStandardMaterial` / `MeshPhysicalMaterial`) with proper roughness/metalness maps rather than flat, single-color `MeshBasicMaterial`.
* Add texture detail (albedo, normal maps at minimum) to floors, walls, and furniture rather than plain flat-colored primitives.
* Where budget allows, use `MeshPhysicalMaterial` for glass/screens (clearcoat, transmission) — e.g. monitor screens, windows — but gate this behind the HIGH quality tier defined in Phase 18.
**Post-processing (via `@react-three/postprocessing`):**
* Bloom (subtle, for emissive surfaces like screens/lights)
* Tone mapping (ACES Filmic recommended) so colors and highlights look natural rather than blown out
* Ambient occlusion (SSAO/N8AO)
* Subtle color grading / vignette to establish mood, consistent with the brand feel of the platform
**Asset sourcing (free, license-safe):**
* Kenney.nl and Quaternius.com for stylized-but-clean low-poly office/furniture assets if building custom scenes from scratch is too costly
* Sketchfab.com, filtered to CC0/royalty-free, for higher-detail props where needed
* Mixamo.com for character walk/idle animations, rigged to the avatar
**Visual reference assets (already provided — use these):**
 
Reference images/models for the target look are stored in `public/references/3d/`:
* `public/references/3d/rooms/` — reference images for room mood, layout, lighting, and furniture style. Match the lighting tone, material feel, and general composition shown here for each corresponding room (Lobby, Development, Design, Meeting A/B, Focus, Break Room) — do not copy geometry pixel-for-pixel, use them as the visual target.
* `public/references/3d/employees/` — reference images/models for the avatar/character look (proportions, clothing style, level of realism vs. stylization). Match this style consistently across all avatars rather than each one looking different.
Before implementing Phase 9, view every file in both subfolders and confirm understanding of the target style (lighting mood, color palette, material realism level, character proportions) before writing scene/avatar code — do not guess the style from the folder name alone.
 
**Important — build/deployment note:** these reference files live under `public/` for convenience during development, but they are not meant to ship to end users. Before Phase 24 (Production), either move them out of `public/` into a `docs/design-references/` folder, or add a build step / hosting rule to exclude `public/references/` from the production deployment, so real users never download these reference images.
 
**Balancing realism with performance (ties into Phase 18):**
* All of the above must respect the adaptive quality tiers (HIGH/MEDIUM/LOW) defined in Phase 18 — e.g. HDRI + soft shadows + full post-processing on HIGH/desktop, baked lighting + no post-processing on LOW/mobile.
* Prefer baked lighting (baked textures/lightmaps) for static geometry (floors, walls) over realtime dynamic lights wherever the scene doesn't require it — this gets a large share of the "realistic" look for a fraction of the runtime cost.
* Do not let realistic materials/post-processing come at the cost of the Core Web Vitals or FPS targets defined in the Quality Targets section — if a trade-off is required, default to the LOW-tier scaling down, not to dropping the frame rate.
This applies to Phase 9 (3D Foundation) onward, and should specifically be revisited/tuned in Phase 18 (3D Performance Optimization) once real device profiling data is available.
 
---
 
# SCALE & CAPACITY ASSUMPTIONS
 
Define these explicitly before architecture decisions are made, since they affect whether Socket.IO needs a Redis adapter/sticky sessions, how rooms are sharded, and how aggressively 3D/network payloads must be optimized.
 
* Expected total registered users: **[FILL IN — e.g. 500]**
* Expected concurrent users platform-wide (peak): **[FILL IN — e.g. 150]**
* Expected concurrent users per room (peak): **[FILL IN — e.g. 30]**
* Expected concurrent active meetings: **[FILL IN — e.g. 10]**
* Expected max participants per meeting: **[FILL IN — e.g. 20]**
* Expected file submission volume/size (avg and max file size): **[FILL IN]**
* Target deployment: single-region or multi-region: **[FILL IN]**
If exact numbers are unknown, use conservative estimates and flag them as assumptions to revisit after Phase 0.
 
---
 
# ORGANIZATION / REPORTING STRUCTURE
 
The system must support a reporting relationship between users so that inactivity escalation (Phase 6) and supervisor visibility (Phase 16) have a real target to notify.
 
Requirements:
 
* Each MEMBER should be assignable to one or more SUPERVISOR(s), or to a Team that has a supervisor.
* A SUPERVISOR should only see presence, status, and escalation data for users they supervise (not the entire organization), unless they also hold ADMIN role.
* Reporting structure should be modifiable by ADMIN without code changes.
* Reflect this relationship in the Phase 2 database schema (e.g. a `Team` entity with a `supervisorId`, or a `ReportsTo` relation on `User`).
---
 
# COMPLIANCE (PDPA)
 
Because this platform monitors employee activity, presence, and work sessions, it must be designed with Thailand's Personal Data Protection Act (PDPA) in mind from the start, not retrofitted later.
 
Requirements:
 
* Define and document a retention period for `ActivityEvent`, `Presence` history, and session logs (e.g. auto-purge or anonymize after N days).
* Provide a clear, user-facing notice of what is monitored, what is not, why, and for how long (ties into Phase 21).
* Support data subject rights where applicable: a user should be able to view their own stored activity/session history.
* Avoid collecting any data beyond what is functionally necessary for check-in/out, status, and inactivity detection (data minimization).
* Document the legal basis for monitoring (e.g. legitimate interest / employment contract) in the privacy review deliverable.
---
 
# QUALITY TARGETS
 
Make these explicit acceptance criteria rather than aspirational goals:
 
**Core Web Vitals (production, mid-range mobile device, throttled network):**
* LCP: under 2.5s
* INP: under 200ms
* CLS: under 0.1
**Accessibility:**
* Conform to WCAG 2.1 Level AA across all non-3D UI (dashboard, task board, meeting controls, forms, notifications).
* The 3D canvas itself is exempt from strict WCAG conformance, but all controls/information layered over it (status, names, meeting join) must remain accessible via keyboard and screen reader.
**Internationalization:**
* Primary UI language: Thai, with English as a secondary/fallback language.
* Use an i18n framework from the start (e.g. next-intl or i18next) rather than hardcoding strings, since login is restricted to Thai university domains and most end users will expect Thai-first UI.
---
 
# CORE FEATURES
 
The system requires:
 
1. Work Check-in
* User logs into the system.
* Authentication acts as the entry point to the workplace.
* Record check-in timestamp.
* Display current working session.
2. Activity Detection
* Detect local device interaction/activity.
* If no relevant user activity is detected for 5 minutes, display a warning asking the user whether they are still working.
* Provide a reasonable grace period before escalation.
* If the user still does not respond, update their status to inactive and notify their supervisor.
Important:
Do NOT use webcam monitoring or invasive surveillance by default.
 
Use privacy-preserving browser/device activity signals such as:
 
* keyboard interaction
* pointer interaction
* touch interaction
* window focus
* page visibility
The system should treat inactivity as an availability signal, NOT as proof that someone is or is not working.
 
Activity monitoring must be transparent and configurable.
 
3. Work Submission
   Allow users to submit:
* source code
* documents
* PDFs
* images
* archives
* links
* project files
Include:
 
* upload progress
* file validation
* file size limits
* version/history metadata
* task association
4. Work Status
Statuses should include:
 
* Available
* Working
* In Meeting
* Focus Mode
* Away
* Inactive
* Break
* Offline
Status should appear:
 
* above/beside the 3D character
* in room member lists
* in workspace dashboard
* in supervisor view
5. Meetings
Users should be able to:
 
* create meetings
* join meetings
* leave meetings
* mute/unmute microphone
* enable/disable camera
* share screen
* view participants
* text chat
Architecture should support WebRTC.
 
Evaluate whether to use:
 
* LiveKit
* WebRTC directly
* another appropriate realtime meeting infrastructure
Prefer a production-ready solution over implementing the entire WebRTC signaling infrastructure from scratch.
 
6. Rooms
The virtual workspace contains multiple rooms.
 
Examples:
 
* Lobby
* Development Room
* Design Room
* Meeting Room A
* Meeting Room B
* Focus Room
* Break Room
Users should be able to move between rooms.
 
Only users in the same room should receive the realtime position updates that they actually need.
 
7. Task Board
Provide a Kanban-style task board.
 
Default columns:
 
* Backlog
* To Do
* In Progress
* Review
* Done
Tasks include:
 
* title
* description
* assignee
* reporter
* priority
* tags
* due date
* attachments
* comments
* activity log
* status
* createdAt
* updatedAt
Support:
 
* drag and drop
* create
* edit
* delete
* assign user
* filtering
* search
* task detail view
8. 3D Character
Each online user has a virtual character/avatar.
 
Users can:
 
* control movement
* walk around rooms
* see other users
* see names
* see work statuses
Desktop controls:
 
WASD / Arrow Keys
 
Mobile controls:
 
virtual joystick or touch controls
 
Do NOT continuously transmit movement at rendering framerate.
 
Use throttled network updates and interpolation on remote clients.
 
9. Login Domain Restriction
Initially allow accounts only from:
 
@mail.kmutt.ac.th
 
@kmutt.ac.th
 
@ad.sit.kmutt.ac.th
 
The domain allowlist MUST NOT be hardcoded into frontend components.
 
Store allowed domains in server-side configuration or database so administrators can modify them later.
 
Validate the email domain on the backend.
 
Frontend checks alone are not sufficient security.
 
10. Work Check-out
Users can end their work session.
 
Record:
 
* check-in time
* check-out time
* total session duration
* break/inactive periods where appropriate
When checking out:
 
* mark user offline
* stop activity monitoring
* close realtime connections when possible
* update character presence
* save session state
11. Multi-Device / Multi-Tab Behavior
Define and enforce consistent behavior when a user is logged in from more than one tab or device simultaneously:
 
* Decide whether a second tab/device joins the existing session (single presence, mirrored state) or is blocked in favor of the first (with a clear message).
* Avatar/presence must never appear duplicated in a room due to multiple tabs.
* Status updates and check-out from any one tab/device must correctly propagate to all others.
---
 
# RECOMMENDED TECH STACK
 
Evaluate this stack and improve it if necessary:
 
Frontend:
 
* Next.js
* React
* TypeScript
* Tailwind CSS
3D:
 
* Three.js
* React Three Fiber
* Drei
Animation:
 
* Motion
* GSAP only where complex timeline/scroll animation is justified
Backend:
 
* Next.js API / separate Node.js backend depending on scalability requirements
* TypeScript
Database:
 
* PostgreSQL
ORM:
 
* Prisma or Drizzle
Authentication:
 
* Auth.js or appropriate OAuth/OpenID provider
Realtime:
 
* WebSocket / Socket.IO
Meeting:
 
* LiveKit / WebRTC
Object Storage:
 
* S3-compatible storage
State:
 
* Zustand
Data fetching:
 
* TanStack Query where useful
i18n:
 
* next-intl or i18next
Deployment:
 
* Containerized environment
* Docker
---
 
# DEVELOPMENT RULE
 
Never implement the entire platform in one step.
 
Complete each phase separately.
 
At the end of every phase:
 
1. Run/build the project.
2. Check TypeScript errors.
3. Check lint errors.
4. Check accessibility where applicable (WCAG 2.1 AA).
5. Check responsive behavior.
6. Check performance implications (against the Quality Targets above).
7. Explain what was implemented.
8. Explain remaining risks.
9. Do not automatically continue to the next phase unless explicitly requested.
