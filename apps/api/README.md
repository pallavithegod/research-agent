# Multi-Step Research Agent Backend

Python/FastAPI backend for the multi-step research dashboard.

The backend is intentionally production-shaped but local-friendly:

- FastAPI API surface under `/v1`
- Clerk JWT auth support, with a local development identity when `AUTH_REQUIRED=false`
- LangGraph intake, execution, evidence-quality, and user-feedback workflows
- Optional DeepSeek report writing and feedback-driven revisions
- Quick, Deep, and Compare research modes with persisted source policies
- Evidence-quality scoring, suggested follow-ups, and immutable report history
- Research job creation, planning, deterministic fallback execution, event stream, cancellation, reports, and audit trail
- Payment PIN hashing with Argon2id
- x402 v1/v2 negotiation, scoped approval, wallet-signature settlement, and receipt persistence
- Schedules, product research, price watches, checkout-intent review gates
- Workflow template endpoint for dashboard/canvas integration
- MongoDB Atlas or PostgreSQL persistence for jobs, plans, events, reports, approvals, receipts, schedules, and Payment PIN hashes

## Manual Install

From this folder:

```powershell
cd "D:\multi-step-research\research-agent\apps\api"
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

MongoDB Atlas alternative:

```env
STORAGE_BACKEND=mongodb
MONGODB_URI=mongodb://USER:URL_ENCODED_PASSWORD@HOSTS/?ssl=true&replicaSet=REPLICA_SET&authSource=admin
MONGODB_DATABASE=research_agent
MONGODB_APP_NAME=ResearchAgent
```

Atlas must allow the API and worker outbound IPs in **Network Access**. Keep the URI only in `apps/api/.env` locally or the deployment secret manager in production.

Create the database once, using your own Postgres shell/tool:

```sql
CREATE DATABASE research_agent;
```

For PostgreSQL production, run migrations instead of automatic schema creation:

```env
AUTO_CREATE_DATABASE_SCHEMA=false
MIGRATIONS_DATABASE_URL=postgresql+psycopg://...
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

For local development without sign-in, leave:

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

## DeepSeek Setup

DeepSeek is required for live answer generation. The API returns a clear `503` instead of inventing an answer when the key is missing. Evidence is collected through multi-provider search and direct parsing of several result websites. Bing RSS and DuckDuckGo work without credentials; add Brave or Tavily for higher reliability.

```env
DEEPSEEK_API_KEY=your-secret-key
DEEPSEEK_BASE_URL=https://api.deepseek.com
DEEPSEEK_MODEL=deepseek-chat
DEEPSEEK_TIMEOUT_SECONDS=45
DEEPSEEK_MAX_RETRIES=2
BRAVE_SEARCH_API_KEY=
TAVILY_API_KEY=
```

The key belongs only in `apps/api/.env` for local work or your deployment secret manager. DeepSeek output cannot authorize payments or bypass the evidence quality gate. Failed or ungrounded revisions never overwrite the prior report.

Run the backend test suite with:

```powershell
python -m pytest -q
```

## Important Next Backend Steps

1. Normalize the persisted-record MVP into dedicated tables for jobs, steps, reports, citations, evidence, provider calls, approvals, and receipts.
2. Move multi-site retrieval into a durable worker queue.
3. Configure and allow-list a real x402 provider, then connect the frontend wallet signer.
4. Add object storage for encrypted artifacts and signed URLs.
5. Add OpenTelemetry/Sentry with prompt, payment, and PII redaction.
6. Keep checkout disabled until approved retailer integrations and legal/security review exist.

## x402 Setup

The API never accepts a wallet private key. A provider first returns `402` terms, the user confirms a scoped approval with their Payment PIN, and the frontend wallet supplies a `Payment-Signature` for the retry. Enable only exact provider hosts:

```env
X402_ENABLED=true
X402_PROVIDER_ALLOWLIST=paid-provider.example
SUPPORTED_PAYMENT_ASSETS=USDC
SUPPORTED_PAYMENT_NETWORKS=base-sepolia,base
```

Keep `X402_ENABLED=false` until a real provider endpoint and wallet signer are configured.

## Main API Surface

- `POST /v1/jobs`
- `GET /v1/jobs`
- `GET /v1/jobs/{job_id}`
- `GET /v1/jobs/{job_id}/events`
- `POST /v1/jobs/{job_id}/run`
- `POST /v1/jobs/{job_id}/clarifications`
- `POST /v1/jobs/{job_id}/decisions`
- `POST /v1/jobs/{job_id}/feedback`
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
