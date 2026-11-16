# Security

VeriFrame processes user-submitted media and produces security-relevant signals. This document
describes the threat model, implemented controls and the operator's responsibilities. It is a
technical guide, not a compliance certification.

## Threat model (summary)

**Assets:** uploaded videos, analysis results and reports, account credentials, session/API-key
secrets, audit logs, model/configuration secrets, and operator infrastructure.

**Adversaries:** unauthenticated internet users, abusive authenticated users, malicious uploads
(crafted containers, path tricks, oversized inputs), stolen credentials or API keys, and
compromised or misconfigured dependencies/services.

**Out of scope:** a fully compromised host or container runtime, supply-chain compromise of base
images, physical access, and guarantees that a detector can identify every manipulated video.

## Implemented controls

### Authentication and sessions

- Passwords are hashed with **Argon2id**. Minimum complexity is enforced at the API boundary.
- Access tokens are short-lived JWTs in HTTP-only cookies; refresh tokens are hashed in the
  database, rotated on use and revoked on reuse detection.
- Email verification and password reset use hashed, expiring, single-use tokens. Development-only
  token exposure is disabled in the default Compose configuration
  (`COMPOSE_EXPOSE_DEV_TOKENS=false`).
- Sessions can be listed and revoked per device from settings.

### Authorization

- Role-based access control: `USER`, `ADMIN`, `SUPER_ADMIN`.
- Every video/analysis/report read and mutation is ownership-scoped; admins are explicitly
  privileged and actions are written to the audit log.
- Admin routes are protected in both the web middleware and the API guards.
- The public API requires an API key, is limited to PRO/ENTERPRISE plans and is rate-limited
  separately.

### Upload and processing isolation

- Uploads are validated by size, extension/signature checks and probed with `ffprobe` before
  analysis is enqueued. Filenames are sanitized before storage.
- Media is stored in a private S3 bucket with owner-scoped keys. Browsers receive short-lived
  presigned GET URLs only.
- The analysis worker and ML service are internal services, not exposed by the reverse proxy. The
  ML service requires an `x-internal-token` on analysis requests.
- The API and worker run as an unprivileged container user. Inference runs in a separate process/
  container from the API and does not execute user-controlled code.

### API hardening

- Global and per-route rate limits (login/register, uploads, contact, public API).
- Helmet security headers, strict CORS to configured origins, and request IDs in error responses.
- Swagger is disabled in the default Compose deployment (`COMPOSE_SWAGGER_ENABLED=false`).
- Centralized exception handling avoids leaking stack traces; production configuration validation
  rejects placeholder or weak secrets.

### Data lifecycle

- Plan-aware retention is enforced by scheduled maintenance (media, thumbnails, sessions, tokens,
  stale jobs). Operators can lower `RETENTION_DAYS` but not exceed plan defaults through config
  alone.
- Deleting a video removes the stored object, thumbnails and analysis records.

## Operator responsibilities

1. **Secrets.** Generate unique values with `scripts/setup.sh`. Never deploy with `change-me` or
   example secrets. Rotate secrets and invalidate sessions if compromise is suspected.
2. **TLS.** Terminate HTTPS at Caddy with a real DNS name (`SITE_ADDRESS=detect.example.com`),
   set `PUBLIC_WEB_URL`/`WEB_ORIGIN` to the HTTPS origin and enable `COOKIE_SECURE=true`.
3. **Network exposure.** Keep PostgreSQL, Redis, the ML service and MinIO off the public internet.
   The default Compose binds MinIO and monitoring ports to `127.0.0.1`.
4. **Object storage.** `S3_PUBLIC_ENDPOINT` must be browser-reachable but should still point to a
   controlled endpoint; do not make the bucket public. Signed URLs are bearer credentials for the
   duration of their TTL.
5. **SMTP and verification.** Configure SMTP in production. Do not enable `EXPOSE_DEV_TOKENS` or
   Swagger on a public deployment.
6. **Backups and access control.** Run the `backup` profile or equivalent off-host backups, protect
   them as sensitive data, and test restores. Restrict admin accounts and review audit logs.
7. **Dependencies and images.** Pin and regularly update base images and packages, scan images, and
   monitor upstream advisories (including the Hugging Face model and ML dependencies).
8. **Model governance.** A detector can be wrong in both directions. Treat output as advisory,
   document the active model/version, evaluate on your own data and do not use scores as sole proof.

## Reporting vulnerabilities

If you discover a security issue, **do not open a public issue**. Report it privately to the
deployment operator. If you are operating from this repository template, establish a private
security contact (for example `security@your-domain`) and a disclosure policy before accepting
untrusted users or media.

Include: affected component, reproduction steps or proof of concept, impact assessment, and any
suggested mitigation. Rotate exposed credentials immediately.

## Known limitations

- No MFA/WebAuthn in this build; operators requiring stronger assurance should front the app with
  an identity-aware proxy or add MFA.
- No per-tenant encryption keys; encryption at rest depends on the underlying disk/object-store and
  database configuration.
- No WAF/content-scanning beyond format and size checks. Media parsing libraries (ffmpeg, OpenCV,
  Pillow) have historically had vulnerabilities — keep them patched.
- Audit logs record application events but are not a tamper-evident append-only ledger unless the
  operator protects the database accordingly.
- The mock backend is intentionally deterministic and must never be presented as detection. The UI
  and API label it, but operators are responsible for configuration.
