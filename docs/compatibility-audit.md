# Phase 0–9 compatibility audit

Audit date: 2026-09-13. This section records the implementation **before** compatibility changes. Validation and the final disposition are appended after implementation. Phase 10 is outside scope.

## 1. Current State

The existing Next.js 16 / React 19 application uses Prisma 6 with PostgreSQL, next-intl, Socket.IO on a custom persistent Node server, and lazy React Three Fiber / Drei rendering. Five SQL migrations contain the platform entities, constraints, roles, allowed domains and seven default rooms. Attendance has idempotent server mutations, recovery polling and cross-tab invalidation. Presence has per-user socket aggregation and room snapshots. Activity uses coarse interaction signals and server deadlines. Notifications have durable history and recipient-scoped delivery.

After check-in, `work-session-panel.tsx` already fills the viewport and puts room, dashboard, task placeholder and notification panels over the Canvas. There is no need to rebuild the workspace shell. `workspace-3d` receives presentation props; authentication, attendance and sockets live outside R3F. Movement is local only; remote characters are deterministic room-presence markers. This is a foundation, not implemented multiplayer movement.

The new requirements, compliance, database and realtime documents are mostly headings. Architecture contains an unfinished Mermaid block. They cannot substantiate a claim of complete compliance. Existing detailed database notes remain useful evidence. `AGENTS.md` says English-first, contradicting the explicit request and `quality-targets.md`; Thai-first takes precedence.

The requested `public/references/3d/rooms/` and `employees/` directories do not exist. Both existing images in their parent were viewed: `room_reference.jpg` (clean white/cyan office, dark furniture, green accents) and `reference-employee.png` (large rounded heads, small bodies, matte toy finish, pastel clothing). The room image's isometric framing does not override the explicit perspective-camera requirement. The employee reference is watermarked; its reuse license is not established.

## 2. Phase Compatibility

### Phase 0 — Architecture

- Status: PARTIALLY COMPLIANT
- Existing implementation: Persistent Node server, HTTP business mutations, room-scoped Socket.IO, independent R3F rendering and PostgreSQL persistence.
- Mismatch: New architecture is empty; old folder notes describe future work already implemented. Capacity and compliance decisions are unspecified. Claimed completed authentication lacks a production flow.
- Required change: Document actual boundaries, transport ownership, phase limits and unresolved deployment choices. Reconcile Thai-first context.
- Risk: Future agents could rebuild working systems or assume unimplemented authentication/scaling guarantees.

### Phase 1 — Project Structure

- Status: PARTIALLY COMPLIANT
- Existing implementation: Feature-based attendance/activity/presence/notifications/3D, server auth/database/realtime, app routes and two locale catalogs.
- Mismatch: Repository guide describes folders that are not implemented; reference directories differ from the new contract. English fallback merges namespaces shallowly.
- Required change: Correct the guide, organize reviewed references without losing originals, implement leaf-level locale fallback and localize remaining static labels.
- Risk: Conflicting ownership and missing nested translations when catalogs diverge.

### Phase 2 — Database

- Status: COMPLIANT
- Existing implementation: All requested entities, ReportsTo, role assignments, auth identities/sessions, indexed expiry columns, UUID/FK/check constraints and partial unique indexes for open attendance/active presence.
- Mismatch: No demonstrated structural mismatch with the specified entities. New database doc omits the existing design and migration history; purge SQL exists but scheduling is unverified.
- Required change: Link authoritative schema/design/retention notes; validate schema and migration status. Preserve every existing migration and record.
- Risk: Applying `migrate dev` casually to an existing database; unapproved retention assumptions and absent scheduled purge.

### Phase 3 — Authentication

- Status: NON-COMPLIANT
- Existing implementation: Hashed opaque session lookup, expiry/revocation/account checks, protected HTTP data access and development-only login.
- Mismatch: No production sign-in/verified identity provider, no active-domain enforcement in session lookup/login, roles not returned by the guard, no unauthorized route. Development login reactivates a suspended/deleted account. Socket authentication is handshake-only and Origin is unchecked.
- Required change: Enforce exact active database domains centrally; preserve account restrictions; resolve active roles server-side; add unauthorized presentation; reject cross-origin sockets and revalidate ongoing access. Production provider requires configuration/choice, not an invented identity-verification mechanism.
- Risk: Disabled-domain users retain access; cross-site socket access; revoked sessions remain connected. Production access remains incomplete until verified sign-in is connected.

### Phase 4 — Check-in / Check-out

- Status: PARTIALLY COMPLIANT
- Existing implementation: Shared durable session, idempotent check-in/out, database uniqueness, server timestamps, polling and BroadcastChannel recovery; existing HUD presentation.
- Mismatch: Presence is mounted before check-in and survives checkout. Failed actions can restore stale action-state session data over a newer poll result. Timer switches from server time to client wall-clock time.
- Required change: Couple workspace presence to an open server session; preserve current client state on failed mutations; use server-time offset for duration.
- Risk: Off-duty inactivity escalations, stale UI and incorrect elapsed duration on clock-skewed devices.

### Phase 5 — Presence

- Status: PARTIALLY COMPLIANT
- Existing implementation: Room channels, snapshots/upsert/remove, per-user socket set, one active database presence, 25s ping/20s timeout, 10s disconnect grace and 60s database heartbeat.
- Mismatch: No open-session authorization; missing acknowledgement callbacks can throw; disconnect during async initial load can leak state; server heartbeat/notification subscription lack shutdown cleanup; no ongoing session revalidation.
- Required change: Validate lifecycle at shared boundaries, guard optional callbacks, handle initial-load disconnect, release timers/subscriptions on close and revalidate sessions.
- Risk: Ghost presence, availability after checkout, denial of service and resource leaks. State is explicitly single-process; multiple servers require shared ownership, not just an adapter.

### Phase 6 — Activity / Inactivity

- Status: PARTIALLY COMPLIANT
- Existing implementation: Configurable five-minute idle/default one-minute grace, server timestamp deadlines, 30s coarse client signal throttling, user warning, supervisor relationship lookup, transactionally saved event/notifications and expiry.
- Mismatch: Runs before check-in/after checkout; unchecked browser storage can interrupt activity/reconnect setup; server accepts unlimited signal frequency. Supervisor lookup does not check active role/account.
- Required change: Restrict activity to checked-in users, validate supervisor eligibility, tolerate unavailable storage and throttle server signal processing.
- Risk: False off-duty escalations and unnecessary work. No key contents, pointer trajectories, screenshots or camera feeds are collected; preserve this.

### Phase 7 — Notifications

- Status: PARTIALLY COMPLIANT
- Existing implementation: Recipient-authorized HTTP history/read mutations, pagination, realtime user channel, localized drawer and durable events.
- Mismatch: History does not refresh on reconnect/open; unread count uses a maximum and cannot reconcile downward from another tab; expired records are still returned until purge.
- Required change: Refresh authoritative history/count on reconnect/open/focus and filter expiry in shared queries.
- Risk: Missed offline notifications, stale unread state and visibility after configured expiry. Email/push and later task/meeting emitters remain later-phase work.

### Phase 8 — Rooms

- Status: COMPLIANT
- Existing implementation: Seven seeded rooms, active/archive validation, switching every socket for one user together, old-room removal and new-room-only snapshot; leave returns to Lobby.
- Mismatch: No demonstrated conflict with Phase 8's shared-room requirements. Membership/capacity enforcement is not implemented; new docs do not define private-room policy.
- Required change: Document current all-active-rooms access explicitly; localize built-in room labels without changing database names.
- Risk: Do not claim private rooms or hard capacity enforcement. A future restricted-room feature must change server authorization before exposure.

### Phase 9 — 3D Foundation

- Status: PARTIALLY COMPLIANT
- Existing implementation: Full-screen single lazy Canvas and HUD, perspective camera, local movement, remote interpolation primitives, demand rendering, capped DPR, reduced geometry on mobile, error boundary/context-loss fallback and explicit Simple Mode.
- Mismatch: Camera is fixed and cannot orbit/follow; character head is smaller than torso; HDRI studio reflections, procedural color/normal textures, metallic furniture and N8AO conflict with cute/toy direction. Canvas disappears during socket disconnect. Fallback only replaces scenery; drawer focus is not managed and fallback preference is not durable.
- Required change: Replace rendering-specific materials/geometry/light effects, follow local avatar with perspective orbit controls, preserve scene during reconnect, persist explicit Simple Mode and provide focused HTML controls on failure; improve HUD focus/mobile layout.
- Risk: Unnecessary GPU/network load, inconsistent art, inaccessible controls. Actual CWV/FPS/WCAG conformance requires browser/device measurement.

## 3. Critical Mismatches

1. Authentication is not complete despite the Phase 9 claim. Central domain and socket access validation must precede more privileged features; production identity verification remains an explicit blocker.
2. Presence/activity lifecycle is independent of check-in, producing off-duty monitoring. Fix at both client mounting and server authorization, including checkout and stale connections.
3. Art/camera conflict is real, but the full-screen HUD architecture and business/render split already comply. Retain them.
4. Source-of-truth documents omit existing architecture and conflict on locale. Document actual state and unknowns before Phase 10 context is consumed.
5. Simple Mode exists; improve persistence, focus and reconnect behavior rather than building another business-state store.
6. No global avatar movement broadcast exists because no network movement exists. Keep movement networking deferred to its requested phase; require server-derived room/user, throttling, validation and interpolation when added.
7. No WebRTC/media implementation exists and no media goes through WebSocket. Retain this transport separation.

## 4. Migration Plan

### CRITICAL

- Central domain/account/role validation; prevent development account resurrection; socket Origin, callback, session and open-work-session checks.
- Stop presence/activity outside an open work session; clean up disconnect races and shutdown resources.
- Replace HDRI/AO/textured metallic style and fixed camera with reference-informed chibi visuals and third-person following. Preserve business logic and Canvas/HUD composition.

### REQUIRED BEFORE PHASE 10

- Reconcile context documents, current folder map and reference locations.
- Repair locale leaf fallback, static labels, drawer keyboard focus, viewport overflow, Simple Mode persistence and error handling.
- Reconcile attendance failure/time handling and notification reconnect/expiry behavior.
- Run typecheck, lint, existing/targeted checks, production build, schema/migration/route validation and available browser checks.
- Resolve production identity-provider choice/configuration; do not report complete Phase 3 or unconditional Phase 10 readiness without it.

### CAN BE DEFERRED

- Network avatar transforms, collision/animation expansion and later task/meeting/submission features.
- Distributed presence ownership/Redis adapter, load testing after concurrency targets are supplied, final asset production and bloom polish.
- Approved retention/legal basis and deployment purge scheduling remain release gates; do not invent policy approval.
- Private-room policy/capacity enforcement when specified, delivery outbox and email/push transports when required.

### NO CHANGE REQUIRED

- Existing relational schema, five migrations, uniqueness guards and durable attendance recovery.
- Full-viewport Canvas/HUD architecture, feature ownership, room-scoped snapshots and per-user aggregation.
- Thai default, WebRTC/WebSocket separation, non-invasive coarse activity signals and lack of persisted avatar trajectories.

## 5. Compatibility Fixes

Implemented only compatibility work; no Phase 10 controller/network movement or later task/meeting/submission feature was added.

- Preserved the existing full-screen HUD/Canvas shell and business services. No new global state manager or parallel service architecture.
- Added Microsoft Entra ID after the user selected that provider. Existing AuthIdentity/AuthSession tables are reused, with OIDC/PKCE/state/nonce/signature validation, immutable tenant/object identity, verified-domain admission and database MEMBER assignment. Existing accounts are never silently linked by email. Production secrets/tenant acceptance remain external configuration.
- Central session guards enforce exact active database domains, account state and active database roles. Development login cannot reactivate disabled/deleted accounts. Added localized unauthorized and signout routes.
- Presence now mounts only during a work session and the server requires an OPEN session. Packet/heartbeat checks revalidate access; checkout emits immediate disconnect in the single process. Added Origin validation, callback guards, packet/signal rate limits, initial-load disconnect handling and shutdown timer/event-listener cleanup. Activity escalation checks eligible supervisors and avoids creating off-duty events.
- Retained coarse activity signals without reading key/pointer content. Removed storage dependency from activity dispatch; tabs aggregate under server user state.
- Fixed attendance failure reconciliation and server-clock duration offset. Existing idempotency, polling, cross-tab invalidation and database uniqueness are reused.
- Notification history/count now reconciles on reconnect/open/focus/new event. Shared queries exclude expired notifications; recipient ownership remains server-enforced.
- Replaced HDRI, N8AO, procedural surface/normal maps and metallic materials with matte pastel room furniture and chibi geometry. Removed unused postprocessing dependencies. Added perspective follow/orbit camera while preserving local-only movement and render interpolation.
- Kept Canvas visible through temporary reconnect. Simple Mode persists across visits and bypasses WebGL loading; renderer error/context loss/unsupported WebGL activates HTML room controls, and explicit retry remains available.
- Added HUD skip navigation, drawer focus entry/return, correct expanded state, localized default room names, nested English fallback, localized auth/metadata, dark-button contrast and short-screen panel overflow handling.
- Filled current architecture/realtime/database/compliance context, corrected the repository map and license inventory, and reconciled AGENTS.md to Thai-first. The existing docs/prompts reorganization was preserved. Both reference images were copied into the requested subdirectories; original URLs/files remain intact.
- No new SQL migration or data reset. Two equivalent PostgreSQL expiry-default spellings were normalized in Prisma's schema; existing migration files remain unchanged.

### Files changed by this compatibility pass

Pre-existing dirty changes to AGENTS.md/README.md and untracked docs/prompts belong to the user. This list identifies this pass's edits/additions rather than claiming all repository changes.

| Area | Files |
| --- | --- |
| Context/setup | `AGENTS.md`, `README.md`, `REPOSITORY_STRUCTURE.md`, `.gitignore`, `.env.example` |
| Current docs | `docs/compatibility-audit.md`, `architecture.md`, `database.md`, `realtime.md`, `requirements.md`, `compliance.md`, `authentication.md`, `asset-licenses.md` |
| Dependencies/scripts | `package.json`, `package-lock.json` |
| Database | `prisma/schema.prisma` (equivalent defaults only) |
| Server/auth | `server.ts`, `src/server/auth/policy.ts`, `entra.ts`, `session-user.ts`, `dev-login.ts` |
| Routes/layout | `src/app/page.tsx`, `layout.tsx`, `globals.css`, `api/auth/[action]/route.ts`, `unauthorized/page.tsx` |
| Attendance | `src/features/attendance/work-session-panel.tsx`, `work-session-service.ts` |
| Presence/realtime | `src/features/presence/presence-panel.tsx`, `src/server/realtime/presence-server.ts`, `notification-bus.ts` |
| Notifications | `src/features/notifications/notification-center.tsx`, `notification-service.ts` |
| Rendering | `src/features/workspace-3d/avatar.tsx`, `room-scene.tsx`, `scene.tsx`, `workspace-preview.tsx`, `README.md` |
| Localization | `src/i18n/messages.ts`, `request.ts`, `locales/en/common.json`, `locales/th/common.json` |
| Reference copies | `public/references/3d/rooms/room_reference.jpg`, `public/references/3d/employees/reference-employee.png` |
| Checks | `tests/compatibility.test.mjs`, `tests/compatibility.integration.mjs` |

## 6. Validation and Readiness

| Check | Result / practical limit |
| --- | --- |
| TypeScript | `npm run typecheck` passed; production build also typechecks |
| Lint | `npm run lint` passed |
| Unit checks | `npm test`: 8 passed (existing five plus auth/state/identity and locale regression checks) |
| Integration | `npm run test:integration`: one end-to-end HTTP/socket/database test passed; includes missing auth, denied domain/account, pre-check-in rejection, cross-origin rejection, concurrent check-in uniqueness, two-tab presence uniqueness, room scoping, callback robustness, reconnection, checkout rejection, notification ownership/expiry and disconnect grace cleanup |
| Production build | `npm run build` passed; route output includes `/`, `/_not-found`, `/api/auth/[action]`, `/api/notifications`, `/api/work-session`, `/unauthorized` |
| Prisma schema | `npm run db:validate` passed |
| Migrations | All 5 applied; no migration files changed |
| Database drift | `prisma migrate diff --from-schema-datasource prisma/schema.prisma --to-schema-datamodel prisma/schema.prisma --exit-code`: no difference after equivalent expression normalization |
| Routes | Live local HTTP checks passed for home, unauthorized, protected APIs and invalid callback; successful Entra callback cannot be tested without tenant configuration |
| Realtime cleanup/reconnect | Multi-tab/room/reconnect/checkout/disconnect exercised over actual Socket.IO; server shutdown subscription/timer release also inspected in source |
| R3F isolation | Reviewed source imports/data flow: no auth, database, fetch or socket ownership in scene/avatar components |
| Simple Mode | Source-verified explicit cookie preference, lazy renderer boundary, context-loss/error/unsupported-WebGL fallback and independent HTML services. Actual WebGL failure interaction remains unverified |
| Accessibility/responsiveness | Static check of labels, focus handling, 44px controls, dark-button contrast, safe-area and short-screen scrolling. No connected browser was available; no claim of complete WCAG conformance or measured responsive acceptance |
| Performance | Removed external HDRI/textures/AO, retained demand loop/hidden pause/mobile LOW/DPR limits. No measured CWV, desktop FPS or mobile device profile result |

The integration test creates unique synthetic users and deletes only its own fixtures after the disconnect grace. Existing application data and all applied migrations are preserved. No retention purge was run.

### Post-fix phase disposition

| Phase | Status after code fixes | Remaining condition |
| --- | --- | --- |
| 0 Architecture | PARTIALLY COMPLIANT | Current design documented; capacity/deployment and policy decisions still TBD |
| 1 Structure | COMPLIANT | Actual folder map and Thai/English/reference structure reconciled |
| 2 Database | COMPLIANT | Schema, migrations and drift verified; retention scheduling is an operations gate |
| 3 Authentication | PARTIALLY COMPLIANT | Entra implementation/checks exist; real tenant configuration and live callback acceptance are outstanding |
| 4 Attendance | COMPLIANT | Existing durability/recovery preserved; lifecycle and time/failure fixes applied |
| 5 Presence | COMPLIANT | Verified within documented single-process deployment; no horizontal-scaling claim |
| 6 Activity | PARTIALLY COMPLIANT | Privacy/lifecycle fixes applied; retention scheduler and real-browser warning acceptance remain outstanding |
| 7 Notifications | COMPLIANT | Current history/read/reconnect/expiry contract fixed; later feature emitters remain deferred |
| 8 Rooms | COMPLIANT | Current shared-room policy/scoping verified; no private-room/capacity-enforcement claim |
| 9 3D Foundation | PARTIALLY COMPLIANT | Architecture/style/camera/fallback code aligned; interactive visual, WebGL-loss, accessibility and device performance QA unavailable |

### Unresolved issues and technical debt

- Configure Entra tenant/client/secret and HTTPS origin, register the callback and optional verified-domain claims, then exercise real permitted/denied sign-in. Existing users requiring identity attachment need an explicit verified migration; none were silently merged.
- Complete browser acceptance at small portrait/landscape/desktop sizes, keyboard-only navigation, reduced motion, deliberate WebGL context loss and persisted Simple Mode. Confirm follow camera/art quality visually and measure CWV/FPS on representative hardware.
- Capacity targets, privacy/legal-basis approval, retention schedule and reference image licensing remain unspecified. Schema defaults and reference availability are not policy/license approval.
- Presence/event bus and timers remain single-process. Before adding replicas, implement shared ownership, durable event recovery and distributed deadlines; an adapter alone is insufficient. Database outages can delay activity processing; operational recovery tests remain needed.
- RoomMembership and capacity are not access restrictions today. Define and enforce server policy before any private-room feature. No full role-management UI, asset pipeline, notification delivery outbox, production observability or data-rights workflow was added.
- Remote meshes still represent room presence, not synchronized positions. Later movement must remain room-scoped, throttled, validated and interpolated. No Phase 10 implementation was started.

### READY FOR PHASE 10

**NOT YET for an unconditional handoff.** The critical compatibility code is implemented and automated checks pass. Entra deployment configuration/live sign-in and browser-based Phase 9 acceptance remain unverified. Complete those gates before treating Phases 0–9 as fully accepted. Do not automatically continue to Phase 10.
