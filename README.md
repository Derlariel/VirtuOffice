# VirtuOffice

VirtuOffice is a full-viewport 3D virtual office with HTML HUD controls and a non-WebGL Simple Mode. Existing work is implemented through the Phase 9 foundation; do not restart completed phases. See the [compatibility audit](docs/compatibility-audit.md) for verified scope and outstanding acceptance checks.

## Features

Attendance/recovery, room-scoped presence, privacy-preserving inactivity warnings, notification history and a stylized chibi 3D foundation. Microsoft Entra sign-in is implemented but requires tenant configuration. Avatar movement remains local; tasks, meetings and submissions are later-phase workflows.

## Tech Stack

Next.js / React, PostgreSQL / Prisma, Socket.IO, next-intl, Three.js / React Three Fiber / Drei, openid-client.

## Getting Started

### Requirements

Node.js 22+, PostgreSQL, a single persistent Node process. No browser media server is needed for Phase 9.

### Environment

Copy `.env.example` to `.env` and configure `DATABASE_URL`. See [Entra setup](docs/authentication.md) for `APP_URL` and Entra credentials. Never commit `.env`. Thai is the default; the `locale` cookie accepts `th` or `en`.

### Install

npm install

### Database

npx prisma migrate status
npx prisma migrate deploy
npm run db:generate

For an existing installation, inspect migration status first. Do not reset the database or rewrite applied migrations. `migrate dev` is for authoring future additive migrations in development, not routine startup.

### Development

npm run dev

For production run `npm run build`, then `npm start` with `NODE_ENV=production`. The custom server is required for Socket.IO. Set `APP_URL` to the browser's exact origin and HTTPS in production. Do not run multiple server processes against the same presence state.

Checks: `npm run typecheck`, `npm run lint`, `npm test`, `npm run db:validate`. With the local server running, `npm run test:integration` creates uniquely named synthetic users and removes only those fixtures after the disconnect grace period.

## Project Structure

See [current repository map](REPOSITORY_STRUCTURE.md).

## Documentation

- [Requirements](docs/requirements.md)
- [Architecture](docs/architecture.md)
- [UI/UX](docs/ui-ux.md)
- [Art direction](docs/art-direction.md)
- [Privacy](docs/compliance.md)
- [Database](docs/database.md)
- [Realtime](docs/realtime.md)
- [Entra setup](docs/authentication.md)
- [Compatibility audit and readiness](docs/compatibility-audit.md)
