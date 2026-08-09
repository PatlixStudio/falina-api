# falina-api

Falina — **Your Personal Oracle**. Coffee. Tarot. Astrology. One persistent
intelligent Oracle connecting them all.

NestJS 11 API for the Falina app. Consumes shared contracts from
[`@falina/shared`](../../libs/falina-shared).

## Stack

- NestJS 11 · TypeScript strict · TypeORM + PostgreSQL · Swagger
- `@falina/shared` (file dependency → `libs/falina-shared`)
- AI through a provider abstraction (`AI_PROVIDER=mock` by default)

## Quick start

Requires the shared Postgres (see workspace root `docker-compose.yml`). Create
the Falina role/database once:

```bash
docker exec patlix-postgres psql -U arkadion -d postgres -c "CREATE ROLE falina LOGIN PASSWORD 'falina';"
docker exec patlix-postgres psql -U arkadion -d postgres -c "CREATE DATABASE falina OWNER falina;"
```

```bash
npm install                       # installs deps + links @falina/shared
cp .env.example .env              # adjust if needed
npx nx serve falina-api           # http://localhost:3002/api/v1
```

- Health: `GET /health`, `GET /health/ready`
- Swagger: http://localhost:3002/api/docs

> Schema auto-syncs (`DB_SYNCHRONIZE=true`) — dev only. Never enable in production.

## Scripts

| Command | Purpose |
| --- | --- |
| `npm run start:dev` | watch mode (re)builds `@falina/shared` first |
| `npm run build` | production build to `dist/` |
| `npm test` | unit tests (Jest) |
| `npm run test:e2e` | e2e smoke tests (needs Postgres) |
| `npm run lint` | ESLint |

## Modules

- `common` — request-id middleware, structured logging, request logging, global exception filter
- `health` — `/health` + `/health/ready`
- `ai` — `AiProvider` abstraction with the deterministic `mock` provider

Feature modules (auth, users, coffee, tarot, astrology, readings, oracle,
notifications, subscriptions, entitlements) arrive in later phases — see `docs/`.

## Docs

See `docs/` in this repo for architecture, database, AI and product plans.
