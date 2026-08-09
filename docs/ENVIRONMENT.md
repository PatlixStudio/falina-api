# Falina Environment

All secrets live in `apps/falina-api/.env` (git-ignored). `.env.example` is the
checked-in template — never commit real secrets.

## Variables

| Variable | Default | Purpose |
| --- | --- | --- |
| `DB_HOST` / `DB_PORT` | localhost / 5432 | PostgreSQL |
| `DB_USER` / `DB_PASSWORD` / `DB_NAME` | falina / falina / falina | Postgres credentials + database |
| `PORT` | 3002 | HTTP port |
| `APP_URL` | http://localhost:4202 | Frontend origin (CORS, links) |
| `NODE_ENV` | development | Runtime environment |
| `DB_SYNCHRONIZE` | true | Dev-only TypeORM schema sync — **false in production** |
| `REDIS_URL` | redis://localhost:6379 | Redis (BullMQ, later phase) |
| `AI_PROVIDER` | mock | AI adapter: mock \| openai \| gemini \| anthropic \| ollama |
| `AI_MODEL` / `AI_API_KEY` | — | Model id + key for real adapters |
| `OLLAMA_BASE_URL` / `OLLAMA_MODEL` | localhost:11434/v1 · qwen2.5:7b | Local-model endpoint |
| `STORAGE_*` | — | Private object storage for coffee images (later phase) |
| `JWT_SECRET` / `JWT_EXPIRES_IN` / `JWT_REFRESH_EXPIRES_IN` | — | Auth (Phase 3) |

## Environments

- `development` — `.env`, mock AI, schema sync on.
- `test` — CI runs unit tests with `AI_PROVIDER=mock`; e2e needs Postgres.
- `production` — migrations, schema sync off, real AI/storage providers.

Web app: `apps/falina-web/src/environments/*` (fileReplacements per
configuration), `apiBaseUrl` points at `/api/v1`.
