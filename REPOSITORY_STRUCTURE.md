# Repository structure

The repository starts as one Next.js application. A persistent backend entry point can be added under `src/server` when realtime work begins; splitting it into another package is unnecessary at the current scale.

```text
.
├── locales/
│   ├── th/                 # Primary Thai message catalogs
│   └── en/                 # English fallback catalogs
├── prisma/                 # Prisma schema, design notes, retention SQL, and migrations
├── public/
│   ├── images/             # Static 2D images
│   ├── models/             # Optimized, versioned 3D model files
│   └── textures/           # Compressed textures and environment maps
└── src/
    ├── app/                # Next.js routes, layouts, metadata, and route composition
    ├── components/
    │   ├── ui/             # Accessible, feature-neutral UI primitives
    │   ├── workspace/      # Workspace shell and dashboard presentation
    │   ├── meeting/        # Meeting presentation and media controls
    │   ├── taskboard/      # Kanban presentation components
    │   └── three/          # WebGL canvas and purely visual components
    │       ├── avatars/    # Avatar meshes, animation, labels, and LOD rendering
    │       ├── rooms/      # Visual room geometry and collision boundaries
    │       └── scenes/     # Scene composition, camera, lighting, and quality tiers
    ├── features/
    │   ├── auth/           # Sign-in and account workflows
    │   ├── attendance/     # Check-in, check-out, and work-session workflows
    │   ├── activity/       # Privacy-preserving activity and warning workflows
    │   ├── presence/       # User availability and connection state
    │   ├── rooms/          # Room membership and navigation workflows
    │   ├── tasks/          # Task-board use cases
    │   ├── submissions/    # File/link submission workflows
    │   └── meetings/       # Meeting creation and participation workflows
    ├── hooks/              # Reusable browser-facing React hooks
    ├── i18n/               # Locale selection and next-intl configuration
    ├── lib/                # Small, framework-neutral helpers
    ├── server/
    │   ├── auth/           # Trusted authentication and authorization boundary
    │   ├── database/       # Database client and transaction helpers
    │   ├── modules/        # Authoritative business modules used by HTTP and sockets
    │   └── realtime/       # Socket server, validation, and room fan-out
    ├── services/
    │   ├── api/            # Browser HTTP adapters
    │   ├── meeting/        # Browser LiveKit adapter
    │   └── realtime/       # Browser Socket.IO adapter
    ├── stores/             # Ephemeral client state; never the durable source of truth
    └── types/              # Shared frontend types that do not belong to one feature
```

## Boundaries

- `app` composes routes; it does not contain business rules.
- `components` render props and user interaction; feature workflows remain in `features`.
- `components/three` renders authorized state and emits movement intent. It does not authenticate users, update attendance, or own room state.
- `components/three/rooms` is visual; `features/rooms` owns room workflows and authorized membership.
- `services` isolate browser transport SDKs. Durable mutations remain authoritative on the server.
- `server/modules` holds rules shared by future REST and Socket.IO handlers.
- `server/database` is the only direct database boundary. The future Prisma schema remains in `prisma`.
- Meeting media travels through LiveKit/WebRTC. Application WebSockets never carry audio, video, or screen content.
- Locale keys live outside components. Thai is primary and English is the fallback.

Empty folders are deliberate phase boundaries. Add code only when its phase begins; do not add barrel files, generic repositories, or provider interfaces in advance.
