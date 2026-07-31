# Multi-Step Research Agent Dashboard

Standalone frontend clone of the original dashboard shell. It keeps the dark dashboard layout, sidebar, top bar, card styling, accent colors, and responsive behavior, but removes GitHub auth and backend calls.

## Run Locally

```powershell
cd "D:\temp\grp proj 3\project-dashboard\apps\web"
npm install
npm run dev
```

Open `http://localhost:3000`.

Backend integration can be added later by replacing the mock data in `src/components/dashboard-overview.tsx` and wiring the API from `apps/api`.

## Included Dashboard Routes

Every sidebar item and topbar dashboard link opens a standalone page:

`/signin`, `/`, `/projects`, `/bounties`, `/issue-bounties`, `/leaderboard`, `/campaigns`, `/pull-requests`, `/api-keys`, `/ai-tools`, `/playground`, `/workflows`, `/marketplace`, `/rewards`, `/usage`, `/credits`, `/referral`, `/offers`, `/sponsors`, `/notifications`, `/runs`, `/planner`, `/apis`, `/payments`, `/facts`, `/enrichment`, `/reports`, and `/docs`.
