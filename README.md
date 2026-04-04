# SPL Website

SQL Server-backed SPL platform with:
- Node backend in the project root
- Vite frontend in [spl-frontend](C:\Users\abhis\OneDrive\Desktop\CODEX\SPL\spl-frontend)
- public website, super admin dashboard, and franchise admin dashboard

## Workspace

Project root:
- [C:\Users\abhis\OneDrive\Desktop\CODEX\SPL](C:\Users\abhis\OneDrive\Desktop\CODEX\SPL)

Frontend:
- [C:\Users\abhis\OneDrive\Desktop\CODEX\SPL\spl-frontend](C:\Users\abhis\OneDrive\Desktop\CODEX\SPL\spl-frontend)

## Environment Setup

Backend env:
1. Copy [C:\Users\abhis\OneDrive\Desktop\CODEX\SPL\.env.example](C:\Users\abhis\OneDrive\Desktop\CODEX\SPL\.env.example) to `.env`
2. Fill in:
   - `DB_USER`
   - `DB_PASSWORD`
   - `SPL_AUTH_SECRET`

Frontend env:
1. Copy [C:\Users\abhis\OneDrive\Desktop\CODEX\SPL\spl-frontend\.env.example](C:\Users\abhis\OneDrive\Desktop\CODEX\SPL\spl-frontend\.env.example) to `.env.local`
2. Default local value:
   - `VITE_API_BASE_URL=http://localhost:4000`
   - `VITE_ENABLE_HERO_VIDEO=false`

Validate backend env:

```powershell
npm run validate:env
```

Generate local production env files:

```powershell
npm run env:generate:production
```

## Run Locally

From [C:\Users\abhis\OneDrive\Desktop\CODEX\SPL](C:\Users\abhis\OneDrive\Desktop\CODEX\SPL):

```powershell
npm run dev
```

This starts:
- Backend API on `http://localhost:4000`
- Frontend on `http://localhost:5173`

You can also run them separately:

```powershell
npm run api
npm run frontend
```

## Verification Commands

```powershell
npm run validate:env
npm run db:health
npm run build:frontend
npm test
npm run qa:frontend-routes
npm run qa:deployed
npm run release:check
```

## Backend Notes

- The backend auto-creates and seeds `SPLSqlServer` if the SQL connection is valid.
- Runtime config is now validated before the server starts.
- In production, `SPL_AUTH_SECRET` should be unique and must not reuse the development default.
- In production, `CORS_ALLOWED_ORIGINS` is required.
- Basic API rate limiting can be enabled with `RATE_LIMIT_ENABLED=true`.

## Production Deployment

Production example env files:
- [C:\Users\abhis\OneDrive\Desktop\CODEX\SPL\.env.production.example](C:\Users\abhis\OneDrive\Desktop\CODEX\SPL\.env.production.example)
- [C:\Users\abhis\OneDrive\Desktop\CODEX\SPL\spl-frontend\.env.production.example](C:\Users\abhis\OneDrive\Desktop\CODEX\SPL\spl-frontend\.env.production.example)

Recommended backend env:
- `NODE_ENV=production`
- `SPL_AUTH_SECRET=<long-random-secret>`
- `CORS_ALLOWED_ORIGINS=same-origin` for a reverse-proxied same-domain deploy
- use an explicit domain list like `https://your-frontend-domain` only if frontend and API are on different origins
- `RATE_LIMIT_ENABLED=true`

Recommended frontend env:
- `VITE_API_BASE_URL=/api` for a same-origin deploy
- use `VITE_API_BASE_URL=https://your-api-domain` only for split frontend/API hosting
- `VITE_ENABLE_HERO_VIDEO=false`
- `VITE_HERO_VIDEO_URL=https://your-cdn-or-storage/hero-video.mp4` only if you want the desktop hero video enabled

Exact Windows + SQL Server deployment steps:
- [C:\Users\abhis\OneDrive\Desktop\CODEX\SPL\DEPLOYMENT.md](C:\Users\abhis\OneDrive\Desktop\CODEX\SPL\DEPLOYMENT.md)
- IIS reverse-proxy sample:
  - [C:\Users\abhis\OneDrive\Desktop\CODEX\SPL\deployment\iis\web.config](C:\Users\abhis\OneDrive\Desktop\CODEX\SPL\deployment\iis\web.config)

Production notes:
- The homepage hero video is now disabled by default unless `VITE_ENABLE_HERO_VIDEO=true` and `VITE_HERO_VIDEO_URL` are both explicitly set.
- API responses include additional security headers and origin-aware CORS behavior.
- `CORS_ALLOWED_ORIGINS=same-origin` is supported for production deployments where the frontend and API share the same public origin.
- The backend can now serve the built frontend directly from [C:\Users\abhis\OneDrive\Desktop\CODEX\SPL\spl-frontend\dist](C:\Users\abhis\OneDrive\Desktop\CODEX\SPL\spl-frontend\dist) for a one-server same-origin deployment.
- Media files served from `/media/` now return cache headers for better repeat-load performance.
- `npm run release:check` runs backend tests, a frontend production build, a standalone frontend route smoke pass, and a backend-served SPA smoke pass.
- `npm run qa:deployed` can smoke-test a real hosted deployment when you provide:
  - `DEPLOY_FRONTEND_BASE_URL`
  - optionally `DEPLOY_API_BASE_URL`
  - optionally `DEPLOY_ADMIN_EMAIL`, `DEPLOY_ADMIN_PASSWORD`, `DEPLOY_FRANCHISE_EMAIL`, and `DEPLOY_FRANCHISE_PASSWORD`

## Database

Default local database settings:
- `DB_SERVER=localhost`
- `DB_PORT=1433`
- `DB_NAME=SPLSqlServer`
- `DB_BOOTSTRAP_DATABASE=master`

Manual SQL schema file:
- [C:\Users\abhis\OneDrive\Desktop\CODEX\SPL\database\spl-schema.sql](C:\Users\abhis\OneDrive\Desktop\CODEX\SPL\database\spl-schema.sql)

## Troubleshooting

If the frontend shows a backend-reachable error:
1. Run `npm run validate:env`
2. Run `npm run db:health`
3. Run `npm run dev`
4. Refresh `http://localhost:5173`

If the backend refuses to start:
- check `.env`
- confirm SQL Server is running
- confirm `DB_USER` and `DB_PASSWORD` are valid
- confirm `SPL_AUTH_SECRET` is set correctly
