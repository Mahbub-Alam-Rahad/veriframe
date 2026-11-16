# API reference

All endpoints are served under the `/api/v1` prefix. Browser-authenticated routes use HTTP-only
session cookies. Public integration routes use an `x-api-key` header and are available on
PRO/ENTERPRISE plans.

> This is a concise operator/developer reference. When `SWAGGER_ENABLED=true`, the interactive
> specification is available at `/api/docs` on the API service (disabled by default in Compose).

## Authentication

### Browser session (cookies)

| Method | Path | Auth | Description |
| --- | --- | --- | --- |
| POST | `/auth/register` | public | Create an account |
| POST | `/auth/login` | public | Sign in, sets access/refresh cookies |
| POST | `/auth/refresh` | refresh cookie | Rotate the session and issue a new access token |
| POST | `/auth/logout` | cookie | Revoke the current session |
| POST | `/auth/verify-email` | public | Verify an email token |
| POST | `/auth/resend-verification` | cookie | Resend verification email |
| POST | `/auth/forgot-password` | public | Request a password reset |
| POST | `/auth/reset-password` | public | Reset with a one-time token |
| GET | `/auth/session` | cookie | Return the current session/user |

Passwords require at least 10 characters including upper/lowercase letters and a number.

### API keys (public API)

Create keys in the dashboard (`/dashboard/api-keys`) or via `POST /api/v1/api-keys` (cookie auth,
plan permitting). Send the key on every public request:

```http
x-api-key: vf_live_<redacted>
```

Keys are shown once at creation time; only a prefix and hash are stored.

## User and account

| Method | Path | Description |
| --- | --- | --- |
| GET | `/me` | Current user, plan, limits and usage |
| PATCH | `/me` | Update profile fields |
| GET | `/me/stats` | Personal usage/analysis statistics |
| GET | `/me/sessions` | Active sessions |
| DELETE | `/me/sessions/:id` | Revoke a session |
| POST | `/me/password` | Change password |
| DELETE | `/me` | Delete the account |

## Videos and analyses (browser)

| Method | Path | Description |
| --- | --- | --- |
| POST | `/videos` | Upload a video (multipart, field `file`, rate-limited) |
| GET | `/videos` | List the current user's videos |
| GET | `/videos/:id` | Video, signed media URLs and analysis |
| POST | `/videos/:id/retry` | Retry a failed analysis |
| DELETE | `/videos/:id` | Delete a video, media and analysis |
| GET | `/analyses` | List analyses for the current user |
| GET | `/analyses/:id` | Analysis with signed thumbnail URLs |
| GET | `/analyses/:id/report` | Download a PDF report |

### Upload example

```bash
curl -X POST "$BASE/api/v1/videos" \
  -H "Cookie: vf_access=<token>" \
  -F "file=@sample.mp4"
```

Response (shape simplified):

```json
{
  "id": "vid_...",
  "originalName": "sample.mp4",
  "status": "QUEUED",
  "sizeBytes": 1048576,
  "durationSeconds": 12.4,
  "expiresAt": "2026-12-16T00:00:00.000Z",
  "analysis": null
}
```

Poll `GET /videos/:id` until `status` is `DONE` or `FAILED`.

### Analysis result (key fields)

```json
{
  "analysis": {
    "fakeScore": 37,
    "fakeProbability": 0.37,
    "verdict": "UNCERTAIN",
    "confidence": 0.62,
    "temporalScore": 0.11,
    "framesAnalyzed": 12,
    "facesDetected": 10,
    "frameScores": [{ "index": 0, "timestampSeconds": 0.5, "score": 0.31, "faceDetected": true }],
    "flaggedFrames": [{ "index": 7, "score": 0.82, "key": "thumbnails/...", "rank": 1 }],
    "details": {
      "backend": "hf",
      "modelId": "dima806/deepfake_vs_real_image_detection",
      "mock": false,
      "processingMs": 8420,
      "warnings": [],
      "disclaimer": "Deepfake detection is probabilistic..."
    },
    "thumbnailUrls": ["https://...signed..."]
  }
}
```

`signed` URLs are short-lived. Clients should request a fresh detail payload when a URL expires.

## Public API

| Method | Path | Description |
| --- | --- | --- |
| POST | `/public/v1/videos` | Upload and enqueue analysis |
| GET | `/public/v1/videos/:id` | Fetch status/result for your upload |
| DELETE | `/public/v1/videos/:id` | Delete your upload |

```bash
curl -X POST "$BASE/api/v1/public/v1/videos" \
  -H "x-api-key: $API_KEY" \
  -F "file=@sample.mp4"
```

The response and polling model match the browser video endpoints, scoped to the key owner.

## API keys, reports and contact

| Method | Path | Description |
| --- | --- | --- |
| GET | `/api-keys` | List your API keys |
| POST | `/api-keys` | Create a key (plaintext returned once) |
| DELETE | `/api-keys/:id` | Revoke a key |
| POST | `/contact` | Submit a contact/support message (public, rate-limited) |

## Health

| Method | Path | Description |
| --- | --- | --- |
| GET | `/health` | Liveness/readiness and dependency checks (public) |

`GET /api/v1/health` returns overall status plus database, Redis, storage and ML checks. The ML
service exposes `GET /health` on the internal network.

## Admin (ADMIN / SUPER_ADMIN)

| Method | Path | Description |
| --- | --- | --- |
| GET | `/admin/stats` | Platform metrics |
| GET/PATCH | `/admin/users`, `/admin/users/:id` | Manage users, roles and plans |
| GET | `/admin/videos` | Browse videos/analyses |
| POST/DELETE | `/admin/videos/:id/retry`, `/admin/videos/:id` | Operate on analyses |
| GET | `/admin/analyses/:id/report` | Download any report |
| GET/PATCH | `/admin/messages` | Contact inbox |
| GET/POST | `/admin/models` | Register model versions |
| POST/DELETE | `/admin/models/:id/activate`, `/admin/models/:id` | Activate or remove models |
| GET | `/admin/audit` | Audit log |
| GET | `/admin/system` | Runtime/system status |

All admin mutations are recorded in the audit log.

## Errors and rate limits

Errors use a consistent JSON shape:

```json
{
  "statusCode": 400,
  "error": "Bad Request",
  "message": "Attach a video file in the 'file' field",
  "requestId": "req_...",
  "timestamp": "2026-11-16T12:00:00.000Z",
  "path": "/api/v1/videos"
}
```

`message` may be a string or an array of validation messages.

| Scope | Limit |
| --- | --- |
| Global | 120 requests / minute |
| Register | 5 / minute |
| Login | 8 / minute |
| Upload (browser/public) | 10 / minute |
| Contact | 3 / minute |
| Public API | 60 / minute |

429 responses indicate a rate-limit breach; clients should back off and retry later.

## Conventions

- JSON fields are **camelCase**. Times are ISO 8601 UTC strings. Byte sizes are integers.
- Videos expire according to plan/env retention; expired media and thumbnails are removed by the
  maintenance job and signed URLs will no longer resolve.
- Verdicts are `LIKELY_REAL`, `UNCERTAIN`, or `LIKELY_FAKE` — always probabilistic, never proof.
- When `details.mock` is `true`, scores are generated by the mock backend and must not be treated
  as detection results.
