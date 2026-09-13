# Microsoft Entra ID setup

The compatibility pass adds the selected production provider using the existing `AuthIdentity` and `AuthSession` tables. No database reset or migration is needed.

1. Register a **single-tenant Web application** in the organization's Entra tenant. Use its tenant UUID, client ID and client-secret value as `ENTRA_TENANT_ID`, `ENTRA_CLIENT_ID`, `ENTRA_CLIENT_SECRET` on the server.
2. Set `APP_URL` to the canonical HTTPS origin. Register exactly `<APP_URL>/api/auth/callback` as the Web redirect URI. Local development permits `http://localhost:3000`; production requires HTTPS.
3. Request the `email` and `xms_edov` optional **ID token** claims in the app registration. The application requests openid/profile/email and requires `xms_edov: true` plus an exact active domain from AllowedEmailDomain. It fails closed when these claims are absent. Verify the tenant emits them for the intended institutional accounts before rollout.
4. The stable identity is `entra` + `<tenant UUID>:<object UUID>`. A matching email alone never links an existing account. If migrating an existing user, an administrator must verify and attach the intended AuthIdentity to that user; do not delete their records or silently merge users.
5. New users receive MEMBER only. Existing database roles are retained and filtered by assignment expiry. Entra/client role claims never grant application roles.
6. Run the real callback flow with an allowed account, a denied domain, a disabled account, cancellation, expired/replayed state and signout. Credentials are not present in the checked-in example, so this live acceptance check remains outstanding.

OIDC code exchange uses PKCE, nonce and signed ten-minute state cookies. `openid-client` verifies issuer/audience/expiry and ID-token signature using discovery/JWKS. Tokens are not logged or retained. Successful sign-in creates an eight-hour opaque HttpOnly/SameSite session with a hash stored in PostgreSQL; production cookies are Secure. POST signout revokes the current app session, not the work session or organization-wide Microsoft SSO.

The app requires a verified-domain claim as an admission check; it binds ownership and roles to immutable identity/database records. Microsoft documents that email/UPN are mutable and must not identify resource ownership: [optional claims reference](https://learn.microsoft.com/en-us/entra/identity-platform/optional-claims-reference). Protocol handling follows the maintained [openid-client documentation](https://github.com/panva/openid-client).
