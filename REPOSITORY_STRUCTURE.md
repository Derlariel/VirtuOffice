# Repository structure

The existing Phase 0–9 app is one Next.js project with a persistent Node entry point. This map describes implemented folders, not scaffolding to recreate.

| Path | Responsibility |
| --- | --- |
| `server.ts` | Hosts Next.js and Socket.IO; use this for development and production |
| `src/app` | Route composition, attendance/notification APIs, Entra sign-in/callback/signout and unauthorized page |
| `src/server/auth` | Entra identity verification, session/domain/account/role guards |
| `src/server/database` | Shared Prisma client |
| `src/server/realtime` | Room-scoped sockets, per-user lifecycle and process-local event delivery |
| `src/features/attendance` | Durable check-in/out, recovery, full-viewport HUD shell |
| `src/features/presence` | Room access service, client socket, activity signals and HTML room/status controls |
| `src/features/activity` | Configurable timestamp deadlines |
| `src/features/notifications` | Durable history/read state and HTML notification drawer |
| `src/features/workspace-3d` | Lazy single Canvas, camera, toy room/chibi meshes, local movement and fallback |
| `src/i18n`, `locales/th`, `locales/en` | Thai-first messages with English fallback |
| `prisma` | Schema, five applied migrations, detailed design and retention SQL |
| `public/references/3d/rooms`, `employees` | Reviewed design references; original parent paths retained |
| `tests` | Compatibility policy checks and opt-in local HTTP/socket/database integration check |
| `docs` | Current requirements, architecture, audit, setup and quality constraints |
| `prompts` | Phase instructions; completed prompts are audit criteria, not restart instructions |

Business rules must work without WebGL. R3F receives authorized presentation props and emits local movement intent. Task, submission, meetings, transport/store abstractions and production assets get folders only when their phase actually needs them. See [architecture](docs/architecture.md).
