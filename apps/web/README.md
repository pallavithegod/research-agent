# Multi-Step Research Agent Dashboard

Next.js dashboard for the Multi-Step Research Agent. It keeps the dark dashboard layout, sidebar, top bar, card styling, accent colors, and responsive behavior, with Clerk sign-in/sign-up routes prepared for the Python API.

## Run Locally

```powershell
cd "D:\temp\grp proj 3\project-dashboard\apps\web"
npm install
Copy-Item ".env.example" ".env.local"
npm run dev
```

Open `http://localhost:3000`.

Set `NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY`, `CLERK_SECRET_KEY`, and `NEXT_PUBLIC_API_URL` in `.env.local` before running Clerk auth.

The dashboard currently calls `GET /v1/auth/me` through `src/lib/api-client.ts` using the Clerk session token. Most dashboard data is still local mock data and can be replaced with API calls from `apps/api` next.

## Included Dashboard Routes

Every sidebar item and topbar dashboard link opens a standalone page:

`/signin`, `/`, `/billing`, `/tables`, `/profile`, `/projects`, `/bounties`, `/issue-bounties`, `/leaderboard`, `/campaigns`, `/pull-requests`, `/api-keys`, `/ai-tools`, `/playground`, `/workflows`, `/marketplace`, `/rewards`, `/usage`, `/credits`, `/referral`, `/offers`, `/sponsors`, `/notifications`, `/runs`, `/planner`, `/apis`, `/payments`, `/facts`, `/enrichment`, `/reports`, and `/docs`.
