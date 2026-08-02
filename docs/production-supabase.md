# Supabase Production Database Setup

Use Supabase as managed PostgreSQL only. Clerk remains the authentication provider.

## Manual Supabase Steps

1. Create a Supabase project.
2. Choose the production region closest to the API deployment region.
3. Save the database password in a password manager.
4. Open the project's database connection settings.
5. Copy a runtime connection string for the deployed API.
6. Copy a direct connection string for Alembic migrations.
7. Store both strings only in deployment environment variables.

## Environment Variables

The API supports two database URLs:

```env
DATABASE_URL=postgresql+psycopg://APP_USER:APP_PASSWORD@SUPABASE_RUNTIME_HOST:5432/postgres?sslmode=require
MIGRATIONS_DATABASE_URL=postgresql+psycopg://APP_USER:APP_PASSWORD@SUPABASE_DIRECT_HOST:5432/postgres?sslmode=require
```

Use `DATABASE_URL` for the running FastAPI app.

Use `MIGRATIONS_DATABASE_URL` for Alembic. If it is empty, Alembic falls back to `DATABASE_URL`.

## Runtime Connection Choice

For Azure Container Apps, start with Supabase's session pooler or direct connection depending on network support and your Supabase plan. If the direct host is unavailable from the runtime network, use Supabase's pooler connection string for `DATABASE_URL`.

Keep `MIGRATIONS_DATABASE_URL` pointed at the direct connection string whenever possible.

## Production API Settings

```env
ENVIRONMENT=production
STORAGE_BACKEND=postgres
AUTO_CREATE_DATABASE_SCHEMA=false
AUTH_REQUIRED=true
```

Never use `AUTO_CREATE_DATABASE_SCHEMA=true` in production.

## Migration Command

Run migrations against the production database only after secrets are configured:

```powershell
cd "D:\temp\grp proj 3\project-dashboard\apps\api"
alembic upgrade head
```

You are not running this yet.

## Safety Checklist

Before deploying:

```text
Supabase project is created
database password is stored safely
DATABASE_URL is configured in Azure Container Apps
MIGRATIONS_DATABASE_URL is configured only where migrations run
AUTO_CREATE_DATABASE_SCHEMA=false
HMAC_SECRET is a strong production secret
apps/api/.env is not committed
apps/web/.env.local is not committed
```
