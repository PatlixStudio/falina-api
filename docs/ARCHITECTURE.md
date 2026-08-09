# Falina Architecture

Falina — **Your Personal Oracle**. Coffee. Tarot. Astrology. One persistent
intelligent Oracle connecting them all.

## Product

Falina is an international AI-powered personal oracle, not a generic chatbot:

- **Coffee** — *See the signs.* Upload a photo of a drunk coffee cup; AI vision
  finds traditional symbols; the symbol database + LLM produce a reading.
- **Tarot** — *Ask the cards.* Choose an intention, pick a spread, draw
  server-side, reveal one card at a time, receive an interpretation.
- **Astrology** — *Read your sky.* Birth data + a real calculation engine →
  natal chart, daily/weekly readings (the LLM interprets, never computes).

The core loop:

```
OPEN → TODAY'S INSIGHT → CHOOSE A READING → THE RITUAL
→ INTERPRETATION → ASK FALINA → RETURN → DISCOVER PATTERNS
```

### Differentiator: Reading Memory

Every reading is unified in one `readings` table. Over time Falina can connect
them (a coffee "road", a Tarot "Chariot", an astrology "transition period") and
surface **recurring themes** — without building an invasive psychological
profile.

## Repositories & workspace

- `apps/falina-api` — NestJS 11 backend (this repo)
- `apps/falina-web` — Angular 22 + Ionic + Capacitor mobile app
- `libs/falina-shared` — shared contracts (`@falina/shared`)

All three live in the `patlix-workspace` Nx monorepo as git submodules, each
with its own `node_modules` and Nx `nx:run-commands` targets (the arkadion
feature-app convention).

## Backend modules (planned)

`auth · users · coffee · tarot · astrology · readings · oracle · ai · storage ·
notifications · subscriptions · entitlements · health · common`

- `common` — request-id middleware, structured logging, request logging, global
  exception filter (stable `ErrorCode`s from `@falina/shared`).
- `health` — `/health` + `/health/ready`.
- `ai` — `AiProvider` abstraction; `mock` provider today; vendor adapters later.

## Frontend modules (planned)

`home · onboarding · coffee · tarot · astrology · oracle · readings · profile · settings`

Bottom navigation stays simple: **Home / Read / History / Profile**.

## API

Global prefix `/api/v1` (health routes excluded). Swagger at `/api/docs`.
See `docs/DATABASE.md` and the endpoint list in `PHASE-0-AUDIT.md`.

## Decision records (so far)

| Decision | Choice | Rationale |
| --- | --- | --- |
| ORM | TypeORM | Workspace convention (patlix-api, arkadion-api); proven here |
| App names | `falina-web` / `falina-api` | AGENTS.md feature-app naming rule |
| Repo wiring | git submodules now | Matches every existing project |
| Docs | inside `falina-api` repo | Travels with the submodule |
| AI default | `mock` | Offline/deterministic dev, tests, CI |
