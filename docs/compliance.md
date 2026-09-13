# Privacy & PDPA

## Data Minimization

Store availability transitions and the minimum attendance/reporting data. The existing schema's retention defaults are technical defaults, not a statement that legal review has approved them.

## Activity Monitoring

Use only pointer-down, keyboard activity without content, touch, focus and visibility signals. Five-minute idle/default one-minute grace are server-configurable. Warn and permit confirmation before marking INACTIVE; supervise only an open work session. Inactivity is an availability signal, not evidence of poor performance.

## Data Retention

Current defaults: activity/presence history 90 days, attendance 365 days after checkout. `prisma/retention.sql` supplies purge SQL; daily scheduling and approved exceptions remain deployment responsibilities. Never run a purge merely to test compatibility.

## Supervisor Access

Escalations use active ReportsTo relationships and active SUPERVISOR role/account checks. Future reports must enforce the same scope server-side.

## User Data Access

Export, correction, deletion and legal-hold workflows are not implemented. Define the organizational procedure before a real-user rollout.

## Legal Basis

Not supplied. Organization/privacy owner must establish notices, legal basis, retention approval and access policy. This repository does not certify PDPA compliance.

## Prohibited Monitoring

Never collect key contents, continuous mouse coordinates, screenshots or webcam feeds for monitoring. Meeting media is consented meeting functionality in a later phase, not an activity signal.
