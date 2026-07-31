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
- In-memory storage for now, with model boundaries designed for PostgreSQL later

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

1. Replace `app/storage/memory.py` with PostgreSQL repositories and migrations.
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
