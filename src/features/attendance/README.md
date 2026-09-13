# Work-session behavior

The authenticated user is resolved from the hashed `vo_session` cookie through `AuthSession`. Client requests never choose a `userId`.

## Tabs and devices

- A user has one open `WorkSession`. The partial database index is the final concurrency guard.
- Check-in is idempotent: another tab or device receives the existing open session.
- Check-out is idempotent: the first request closes the session and later requests observe no open session.
- Tabs in the same browser notify each other with `BroadcastChannel` and refresh from the server.
- Other browsers and devices refresh while visible every 15 seconds and whenever they regain focus or connectivity.
- A future Socket.IO phase can replace polling with an immediate user-channel event without changing the database rules.

## Recovery

Closing or crashing a browser does not fabricate a check-out time. The open session remains durable and is restored after authentication on the next page load. If a request commits but its response is lost, retrying is safe and periodic reconciliation corrects the local screen.

Connection loss keeps the last known state visible with an explanation. Check-out requires a confirmed server write; going offline alone never closes a work session.
