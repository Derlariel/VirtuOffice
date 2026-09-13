# Product Requirements

## Product Overview

Maintain the implemented Phase 0–9 virtual office. After authentication/check-in, a full-viewport 3D world is the default; attendance, status, rooms and notifications remain usable HTML overlays. Explicit Simple Mode/WebGL failure uses HTML controls. Task, submission and meeting workflows remain later phases; their database records do not mean those features are implemented.

## Users and Roles

### ADMIN
### SUPERVISOR
### MEMBER

## Core Features

### Authentication
### Work Check-in / Check-out
### Work Status
### Activity Detection
### Rooms
### 3D Avatars
### Task Board
### Work Submission
### Meetings
### Notifications
### Multi-tab / Multi-device

## Reporting Structure

## Scale Assumptions

## Technical Constraints

Thai primary, English fallback; WCAG 2.1 AA target for HTML; third-person perspective, cute/chibi matte 3D. Keep business rules outside R3F. WebSocket carries room presence/status/notifications and future throttled movement; LiveKit/WebRTC carries future media. Read [architecture](architecture.md), [art direction](art-direction.md) and [compatibility audit](compatibility-audit.md) before extending the project.

## Scale Assumptions

- Registered users: TBD
- Concurrent users: TBD
- Peak users per room: TBD
- Concurrent meetings: TBD
- Max participants per meeting: TBD
- File size/volume: TBD
- Deployment region: TBD
