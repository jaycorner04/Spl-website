# SPL Deployment

This project now supports a simple same-origin production deployment for your current stack:

- Windows host
- Node backend
- Vite frontend build
- SQL Server

Recommended production shape:
- build the frontend once
- run the Node server in production mode
- let the backend serve both the SPA and the `/api` routes from the same origin

## 1. Prepare the server

Install:
- Node.js 20+
- SQL Server access for the configured database user

Copy the project to the server:
- [C:\Users\abhis\OneDrive\Desktop\CODEX\SPL](C:\Users\abhis\OneDrive\Desktop\CODEX\SPL)

## 2. Install dependencies

From [C:\Users\abhis\OneDrive\Desktop\CODEX\SPL](C:\Users\abhis\OneDrive\Desktop\CODEX\SPL):

```powershell
npm install
```

## 3. Generate production env files

```powershell
npm run env:generate:production
```

This creates:
- [C:\Users\abhis\OneDrive\Desktop\CODEX\SPL\.env.production.local](C:\Users\abhis\OneDrive\Desktop\CODEX\SPL\.env.production.local)
- [C:\Users\abhis\OneDrive\Desktop\CODEX\SPL\spl-frontend\.env.production.local](C:\Users\abhis\OneDrive\Desktop\CODEX\SPL\spl-frontend\.env.production.local)

## 4. Fill the production env values

Backend file:
- [C:\Users\abhis\OneDrive\Desktop\CODEX\SPL\.env.production.local](C:\Users\abhis\OneDrive\Desktop\CODEX\SPL\.env.production.local)

Keep or update:
- `NODE_ENV=production`
- `PORT=4000`
- `HOST=0.0.0.0`
- `DB_SERVER=<your-sql-server>`
- `DB_PORT=1433`
- `DB_NAME=SPLSqlServer`
- `DB_USER=<your-sql-user>`
- `DB_PASSWORD=<your-sql-password>`
- `SPL_AUTH_SECRET=<long-random-secret>`
- `CORS_ALLOWED_ORIGINS=same-origin`
- `RATE_LIMIT_ENABLED=true`

Frontend file:
- [C:\Users\abhis\OneDrive\Desktop\CODEX\SPL\spl-frontend\.env.production.local](C:\Users\abhis\OneDrive\Desktop\CODEX\SPL\spl-frontend\.env.production.local)

Keep:
- `VITE_API_BASE_URL=/api`
- `VITE_ENABLE_HERO_VIDEO=false`

Only set `VITE_HERO_VIDEO_URL` if you want the desktop hero video enabled from a hosted CDN/storage URL.

## 5. Build the frontend

```powershell
npm run build:frontend
```

The production build goes to:
- [C:\Users\abhis\OneDrive\Desktop\CODEX\SPL\spl-frontend\dist](C:\Users\abhis\OneDrive\Desktop\CODEX\SPL\spl-frontend\dist)

The backend now serves this folder directly in production-style deployments.

## 6. Validate before start

```powershell
$env:NODE_ENV="production"
npm run validate:env
npm run db:health
```

## 7. Start the production server

```powershell
$env:NODE_ENV="production"
npm start
```

App behavior after start:
- website is available from the backend host root
- API is available under `/api`
- media is available under `/media`

Example:
- `http://your-server:4000/`
- `http://your-server:4000/api/health`

## 8. Optional reverse proxy

If you want a domain and HTTPS, place a reverse proxy in front of Node and forward traffic to:
- `http://127.0.0.1:4000`

Keep the same-origin setup:
- public site and API stay on one domain
- backend env stays `CORS_ALLOWED_ORIGINS=same-origin`
- frontend env stays `VITE_API_BASE_URL=/api`

### IIS setup for your current environment

For Windows + SQL Server, IIS is a good production target.

Install these IIS features/modules:
- URL Rewrite
- Application Request Routing (ARR)

In IIS:
1. Create a site for your public domain
2. Point the IIS site root to any folder you want for the site shell
3. Enable ARR proxy in IIS server settings
4. Use the sample config at:
   - [C:\Users\abhis\OneDrive\Desktop\CODEX\SPL\deployment\iis\web.config](C:\Users\abhis\OneDrive\Desktop\CODEX\SPL\deployment\iis\web.config)
5. Place that `web.config` in the IIS site root
6. Keep the Node app running on `127.0.0.1:4000`

Result:
- IIS handles the public domain and HTTPS
- IIS forwards requests to Node
- Node serves both the SPA and `/api`
- your app stays same-origin in production

Recommended IIS flow:
- IIS public URL: `https://your-domain`
- Node backend: `http://127.0.0.1:4000`
- backend env: `CORS_ALLOWED_ORIGINS=same-origin`
- frontend env: `VITE_API_BASE_URL=/api`

## 9. Release verification

Local release verification:

```powershell
npm run release:check
```

This now verifies:
- backend tests
- frontend production build
- standalone SPA route smoke
- backend-served SPA smoke

## 10. Hosted deployment smoke

After your real domain is live:

```powershell
$env:DEPLOY_FRONTEND_BASE_URL="https://your-domain"
$env:DEPLOY_API_BASE_URL="https://your-domain/api"
npm run qa:deployed
```

If your site is same-origin and `/api` is on the same domain, you can omit `DEPLOY_API_BASE_URL`.

Optional auth overrides for live smoke:
- `DEPLOY_ADMIN_EMAIL`
- `DEPLOY_ADMIN_PASSWORD`
- `DEPLOY_FRANCHISE_EMAIL`
- `DEPLOY_FRANCHISE_PASSWORD`

## 11. Recommended Windows operations

For a real server, keep the Node process running using a service manager or server process tool on Windows.

Minimum production checklist:
- project files copied
- `npm install` complete
- production env files filled
- `npm run build:frontend` complete
- `NODE_ENV=production`
- `npm start` running
- reverse proxy or firewall port configured if using public access
- `npm run qa:deployed` passes after domain setup
