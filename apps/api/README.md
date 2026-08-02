# Multi-Step Research Agent Backend

Python/FastAPI backend scaffold for the project described in `D:\temp\grp proj 3\README.md` and the Mermaid architecture file currently present as `D:\temp\grp proj 3\archi.md`.

The backend is intentionally production-shaped but local-friendly:

- FastAPI API surface under `/v1`
- Clerk JWT auth support, with local mock auth when `AUTH_REQUIRED=false`
- Research job creation, planning, mock execution, event stream, cancellation, reports, and audit trail
- Payment PIN hashing with Argon2id
- x402-ready payment approval, tool-call, payment-term, and receipt models
- Schedules, product research, price watches, checkout-intent review gates
- Workflow template endpoint for dashboard/canvas integration
- PostgreSQL-backed persistence for jobs, plans, events, reports, approvals, receipts, schedules, and Payment PIN hashes

## Manual Install

From this folder:

```powershell
cd "D:\temp\grp proj 3\project-dashboard\apps\api"
python -m venv .venv
.\.venv\Scripts\activate
pip install -r requirements.txt
Copy-Item ".env.example" ".env"
uvicorn app.main:app --reload --port 8000
```

PostgreSQL must be running before the API starts. The default local database URL is:

```env
DATABASE_URL=postgresql+psycopg://postgres:postgres@localhost:5432/research_agent
STORAGE_BACKEND=postgres
AUTO_CREATE_DATABASE_SCHEMA=true
```

Create the database once, using your own Postgres shell/tool:

```sql
CREATE DATABASE research_agent;
```

For production, run migrations instead of automatic schema creation:

```env
AUTO_CREATE_DATABASE_SCHEMA=false
```

Then apply migrations from this folder:

```powershell
alembic upgrade head
```

Open:

```text
http://localhost:8000/docs
http://localhost:8000/v1/health
```

## Clerk Setup

For local mock auth, leave:

```env
AUTH_REQUIRED=false
```

To require Clerk JWTs:

```env
AUTH_REQUIRED=true
CLERK_ISSUER=https://your-clerk-instance.clerk.accounts.dev
CLERK_JWKS_URL=https://your-clerk-instance.clerk.accounts.dev/.well-known/jwks.json
CLERK_AUDIENCE=
```

Then send frontend requests with:

```http
Authorization: Bearer <clerk-session-token>
```

## Important Next Backend Steps

1. Normalize the persisted-record MVP into dedicated tables for jobs, steps, reports, citations, evidence, provider calls, approvals, and receipts.
2. Move `OrchestratorService.run_mock_research` into a durable worker queue.
3. Replace `ToolGatewayService.mock_payment_terms` with real x402 provider calls.
4. Add object storage for encrypted artifacts and signed URLs.
5. Add OpenTelemetry/Sentry with prompt, payment, and PII redaction.
6. Keep checkout disabled until approved retailer integrations and legal/security review exist.

## Main API Surface

- `POST /v1/jobs`
- `GET /v1/jobs`
- `GET /v1/jobs/{job_id}`
- `GET /v1/jobs/{job_id}/events`
- `POST /v1/jobs/{job_id}/run`
- `POST /v1/jobs/{job_id}/cancel`
- `GET /v1/jobs/{job_id}/audit`
- `POST /v1/payment-pin`
- `POST /v1/payment-pin/verify`
- `POST /v1/approvals`
- `POST /v1/approvals/{approval_id}/confirm`
- `POST /v1/tool-calls`
- `POST /v1/tool-calls/{call_id}/pay`
- `GET /v1/reports/{report_id}`
- `POST /v1/schedules`
- `GET /v1/schedules`
- `PATCH /v1/schedules/{schedule_id}`
- `POST /v1/schedules/{schedule_id}/pause`
- `POST /v1/products/search`
- `POST /v1/products/price-watches`
- `POST /v1/products/checkout-intents`
- `POST /v1/products/checkout-reviews/{review_id}/confirm`
- `GET /v1/workflows`
