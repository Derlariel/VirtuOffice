# VirtuOffice

VirtuOffice is a web-based 3D Virtual Workspace and Meeting Platform.

The product is a lightweight virtual office where users can:
- authenticate
- check in/out
- control a 3D avatar
- move between rooms
- see coworkers and statuses
- manage tasks
- submit work
- join meetings

Primary priorities:
1. Performance
2. Maintainability
3. Security
4. Realtime reliability
5. Responsive design
6. Accessibility
7. 3D visual quality

## Critical UI Architecture

The 3D Canvas is the primary workspace interface.

After login and check-in:
- the 3D workspace fills the viewport
- normal workspace functionality appears as HUD overlays, drawers, modals, and widgets
- task board/dashboard/notifications must not replace the 3D world
- login and explicit Simple Mode/settings may use plain 2D pages

Do not implement the product as a normal SaaS dashboard with a small embedded 3D widget.

## Architecture Rules

- Keep business logic separate from 3D rendering.
- React Three Fiber components must not own core business rules.
- Authentication, sessions, tasks, meetings, presence, and submissions must work independently from WebGL.
- WebSocket is for presence, status, room state, avatar synchronization, and notifications.
- WebRTC/LiveKit is for microphone, camera, and screen-sharing media.
- Never transport meeting media through the application WebSocket.

## Privacy Rules

Activity detection may use:
- pointer interaction
- keyboard activity events
- touch interaction
- window focus
- document visibility

Never collect:
- keystroke contents
- continuous mouse coordinates
- screenshots
- webcam feeds for monitoring

Inactivity is an availability signal, not proof that a person is not working.

## Realtime Rules

- Scope realtime events by room.
- Never broadcast all player movement globally.
- Do not transmit avatar movement at rendering FPS.
- Use throttled position updates.
- Interpolate remote avatars.
- A user must never appear as duplicate avatars due to multiple tabs/devices.

## Security Rules

Initial allowed email domains:
- mail.kmutt.ac.th
- kmutt.ac.th
- ad.sit.kmutt.ac.th

Rules:
- Validate domains server-side.
- Do not hardcode authorization logic inside frontend components.
- Allowed domains must be configurable from backend/database.
- Never trust role, userId, roomId, teamId, or email domain sent by the client.

## Product Quality Rules

- Thai is the primary UI language.
- English is the fallback language.
- Do not hardcode user-facing strings.
- Non-3D UI must target WCAG 2.1 AA.
- Mobile must receive a dedicated layout and quality profile.
- Preserve Core Web Vitals while adding 3D.

## Development Workflow

Never implement the whole platform in one step.

Work one phase at a time.

At the end of every phase:
1. Run/build the project.
2. Check TypeScript.
3. Check lint.
4. Check accessibility where applicable.
5. Check responsive behavior.
6. Check performance implications.
7. Summarize what was implemented.
8. Document remaining risks.
9. Do not continue to the next phase unless explicitly requested.
