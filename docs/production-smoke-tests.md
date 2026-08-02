# Production Smoke Tests

Use the smoke test after deploying the API, database, Clerk, Vercel frontend, and optional worker.

## Local Docker Smoke Test

Start local Compose:

```powershell
docker compose up --build
```

Run:

```powershell
cd "D:\temp\grp proj 3\project-dashboard"
python scripts\smoke_test.py --api-url http://localhost:8000
```

Local mode may use mock auth depending on `AUTH_REQUIRED`.

## Production API Smoke Test

Get a Clerk session token from a signed-in browser session or a trusted test flow. Do not paste this token into files or commit it.

Run:

```powershell
python scripts\smoke_test.py --api-url https://your-azure-container-app-url --token "YOUR_CLERK_SESSION_TOKEN"
```

If you only want health and auth checks:

```powershell
python scripts\smoke_test.py --api-url https://your-azure-container-app-url --token "YOUR_CLERK_SESSION_TOKEN" --skip-flow
```

## Expected Checks

The script checks:

```text
GET /v1/health
GET /v1/auth/me
POST /v1/jobs
POST /v1/jobs/{job_id}/run
GET /v1/jobs/{job_id}
GET /v1/reports/{report_id}, when a report exists
```

When `JOB_QUEUE_BACKEND=upstash`, a report may not exist immediately unless the worker has processed the job. In that case the script warns instead of failing.

## Manual Frontend Smoke Test

After backend smoke tests pass:

```text
open the Vercel URL
sign in with Clerk
create a research run
confirm the dashboard does not expose user IDs, org IDs, or job IDs
confirm the generated report appears after the run completes
```

## Failure Hints

```text
401 on /v1/auth/me:
  Clerk token missing/expired or backend Clerk issuer does not match token issuer.

Failed to fetch from frontend:
  CORS FRONTEND_ORIGIN does not match Vercel domain or NEXT_PUBLIC_API_URL is wrong.

No report yet:
  Worker is not running, Upstash env vars are wrong, or queued job is still pending.

500 response:
  Copy the X-Request-ID from the response and search backend logs for that request_id.
```
