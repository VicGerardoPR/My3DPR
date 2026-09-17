# Owner-only administrator management

## Security contract
- All users GET/POST/PATCH/DELETE/reset requests revalidate the signed admin session, active whitelist UUID, session_version and current SUPER_ADMIN role.
- Server-side Supabase Auth `getUserById(session.userId)` must return that same UUID with confirmed email `victor.rivera@arcanointelligence.com`. Whitelist email, user metadata, request email and roles cannot prove ownership. Other SUPER_ADMIN accounts are denied.
- `/api/admin/me` returns filtered permissions; users GET returns UUID-derived `can_reset_password`. The reset endpoint independently checks a different, active, UUID-linked target and resolves the recipient from Auth.
- Invitations use `inviteUserByEmail`; reset uses `resetPasswordForEmail`. Administrators cannot supply a password through membership APIs. Only the email recipient sets their password through Auth.
- Official implicit invite/recovery links land at `/es/account/recovery`. This is deliberately separate from the existing account PKCE callback: a server-initiated email has no recipient browser PKCE verifier. The page clears URL fragments/query parameters, uses a nonpersistent isolated client, verifies the session with Auth, and never honors a `next` or redirect parameter.
- Per-owner distributed rate buckets use the existing `consume_checkout_rate_limit` RPC: list 60/hour, update 30/hour, invite 5/hour, reset 5/hour. Missing limiter/audit infrastructure fails closed before email. Audit metadata excludes tokens, passwords and provider error details.

## Before release (not executed against production)
1. Independently review the full local diff and untracked files. No deployment or commit is authorized yet.
2. Apply append-only `supabase/migrations/20260917190000_owner_admin_management.sql` to a disposable/staging Supabase database first. It preserves atomic membership/audit RPCs, adds the same confirmed-owner check at the DB boundary and invalidates HMAC admin sessions on Auth password changes. No existing accounts are updated by applying it. Verify trigger privileges on managed `auth.users` and rollback behavior if audit fails.
3. Existing migrations 0800 (rate limit), 1000 (admin control plane), and 1100 (membership) must already be installed. Do not use direct-write fallbacks.
4. Verify the owner's existing active whitelist `user_id` resolves through Auth to the confirmed owner email. Runtime does this each request; no production account or UUID was inspected/modified during implementation.
5. Set the canonical `NEXT_PUBLIC_SITE_URL` and allow its exact `/es/account/recovery` URL in Supabase Auth redirect URLs. Keep invitation and recovery email templates on the official `ConfirmationURL` flow (not an incompatible custom PKCE/token-hash redirect). Check SMTP delivery and URL allowlist in staging using disposable recipients only.
6. In staging, exercise one invite and one reset end-to-end, expired/reused link failure, old admin-cookie invalidation, other SUPER_ADMIN rejection, and rate-limit/audit failure. Local tests mock all Auth/email effects; they do not prove live SMTP or unapplied SQL behavior.

## Local gates
`npm test`, `npm run lint`, `npm run build`, `npm run typecheck`, `git diff --check`.
Production credentials, tokens and real emails must never be printed or used for fixtures.
