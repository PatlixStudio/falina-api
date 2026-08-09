# Falina Development

## Setup

```bash
# Workspace (once)
cd /home/kai/development/patlix-workspace
git submodule update --init --recursive
npm install

# Falina deps
npm install --prefix apps/falina-api
npm install --prefix apps/falina-web

# Infra (Postgres + Redis)
docker compose up -d

# DB role (once)
docker exec patlix-postgres psql -U arkadion -d postgres -c "CREATE ROLE falina LOGIN PASSWORD 'falina';"
docker exec patlix-postgres psql -U arkadion -d postgres -c "CREATE DATABASE falina OWNER falina;"
```

## Run

```bash
npx nx serve falina-api        # http://localhost:3002/api/v1, Swagger /api/docs
npx nx serve falina-web        # http://localhost:4202
```

## Quality gates

```bash
npx nx run-many -t lint test build typecheck --parallel=1   # whole workspace
```

On this low-RAM machine always use `--parallel=1`; `falina-web:test` bundles
the whole app — run it alone.

## Definition of done

TypeScript compiles · Nx build passes · lint passes · tests pass · DTO
validation · authorization · loading/error/retry states · persistence · AI
failures handled · no secrets committed · no console errors.

## Git

Each Falina project is its own repo (submodule). Commit inside the project
directory first; the workspace repo tracks submodule commits.

## Phases

See `PHASE-0-AUDIT.md` for the phase plan (0 audit → 1 foundation → 2 mobile
shell → 3 auth/onboarding → 4 tarot → 5 coffee → 6 astrology → 7 oracle →
8 memory → 9 monetization → 10 notifications → 11 polish → 12 release).
