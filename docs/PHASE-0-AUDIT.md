# FALINA — Phase 0 Workspace Audit

Date: 2026-08-09
Author: Lead architect (opencode session)
Status: Complete — audit only, no destructive changes made.

Falina lives inside the existing **patlix-workspace** Nx monorepo at
`/home/kai/development/patlix-workspace`. This document records the current
architecture, what is reusable, the proposed Falina architecture, and the
Phase 0/1 implementation plan.

---

## 1. Current workspace architecture

- **Nx 23.1.0** monorepo (`preset: ts`), **npm** package manager
  (`package-lock.json`, `packageManager` npm@11.16.0), TypeScript `~6.0.3`
  strict, Node 24.
- Nx plugins configured in `nx.json`:
  - `@nx/js/typescript` → `typecheck` / `build` (tsconfig.lib.json),
    `build-deps`, `watch-deps`
  - `@nx/vite/plugin` → `build` / `serve` / `dev` / `preview` / `serve-static`
  - `@nx/eslint/plugin` → `lint`
  - `@nx/vitest` → `test`
  - `@nx/webpack/plugin` → `build` / `serve`
  - `@nx/jest/plugin` → `test`
- **Local cache only** — no Nx Cloud for daily work (`nx start-ci-run` is only
  used in CI). Analytics disabled.
- **Module boundaries** enforced by `@nx/enforce-module-boundaries` in
  `eslint.config.mjs` using `scope:*` tags:
  - `scope:shared` may only depend on `scope:shared`
  - `scope:web` may depend on `scope:shared` + `scope:web`
  - `scope:api` may depend on `scope:shared` + `scope:api`
- Project references (`tsconfig.json` references libs/shared, apps/api, apps/web).
- Path mapping in `tsconfig.base.json`: `@patlix/shared` → `libs/shared/src/index.ts`.
- CI: `.github/workflows/ci.yml` — `nx format:check`, then
  `nx run-many -t lint test build typecheck e2e` (plus `nx fix-ci` on failure).
- Each project in `apps/*` / `libs/*` is its **own git repository**, wired in as
  a git **submodule** (see `.gitmodules`). Development happens inside each
  project repo; the workspace repo tracks submodule commits.
- Local infra: `docker-compose.yml` at root runs `patlix-postgres` (:5432) and
  `patlix-speaches` (:8969). Each project uses its own DB in the shared Postgres.

## 2. Existing applications

| Project | Path | Stack | Port | Test runner | Notes |
| --- | --- | --- | --- | --- | --- |
| `web` (patlix-web) | `apps/web` | Angular 22 standalone + Material M3 + SCSS | 4200 | Vitest | Dashboard; proxies `/api` → 3000 |
| `api` (patlix-api) | `apps/api` | NestJS 11 + TypeORM + Postgres | 3000 | Jest | JWT auth, projects CRUD, Swagger `/api/docs`, webpack build, seed |
| `arkadion-web` | `apps/arkadion-web` | Angular 22 standalone + Material M3 + SCSS (+ three.js) | 4201 | Vitest | Own repo + own `node_modules`; wrapped via `nx:run-commands` |
| `arkadion-api` | `apps/arkadion-api` | NestJS 11 + TypeORM + Postgres | 3001 | Jest | Own repo + own `node_modules`; JWT, chat WebSocket, LLM chain (Groq→OpenRouter→Ollama), STT/TTS, seed |

### Feature-app convention (the pattern Falina will follow)

AGENTS.md codifies: feature projects live in `apps/<name>-web` / `apps/<name>-api`,
are self-contained (own `package.json`, own `node_modules`, own `.env`), are
wired as git submodules, and expose `serve` / `build` / `test` targets through
`nx:run-commands` (see `apps/arkadion-*/project.json`). They are **not** bound to
the patlix `scope:*` tags. Naming rule: `patlix-<name>` for Patlix's own apps,
`<name>-web` / `<name>-api` for feature projects.

## 3. Existing libraries

- `libs/shared` (`@patlix/shared`, scope:shared) — plain, framework-agnostic
  DTOs/types only: `auth.dto.ts`, `project.dto.ts`, `user.dto.ts`, `index.ts`.
  No Angular/Nest imports. This is the template for shared contracts.

## 4. Angular version

**22.x** — root dev deps `@angular/* ~22.0.4`, arkadion-web uses `22.1.x`.
Standalone components, signals, standalone router config, `@angular/build`
(application + unit-test builders), Vitest for unit tests.

## 5. NestJS version

**11.x** (`@nestjs/* ^11.0.0/^11.0.1`), with `@nestjs/swagger ^11`,
`@nestjs/config ^4`, `@nestjs/jwt ^11`, `@nestjs/typeorm ^11`.
TypeORM: root pins `^0.3.31`; arkadion-api pins `^1.1.0` (a version drift that
should not be copied forward).

## 6. Nx version

**23.1.0** (local). Generators default `@nx/angular:application` to
`e2eTestRunner: none, linter: eslint, style: scss, unitTestRunner: vitest-angular`.

## 7. Package manager

**npm** (`npm@11.16.0`). `package-lock.json` at root; per-project locks inside
`apps/arkadion-*`. Workspace uses `npm ci` in CI.

## 8. Existing dependencies (notable)

- Frontend: `@angular/{core,common,compiler,forms,router,animations}`,
  `@angular/material`, `@angular/cdk`, rxjs, three (arkadion), socket.io-client (arkadion).
- Backend: `@nestjs/{common,core,platform-express,config,jwt,mapped-types,swagger,typeorm}`,
  `typeorm`, `pg`, `bcryptjs`, `class-validator`, `class-transformer`,
  `reflect-metadata`; arkadion adds `@nestjs/{websockets,schedule}`,
  `openai`, `multer`, `formidable`.
- Tooling: eslint 10, prettier 3, vitest 4, jest 30, webpack 5, vite 8, swc.

## 9. What can be reused

- **Workspace scaffolding & gates**: `nx.json`, `tsconfig.base.json` (strict +
  paths), `eslint.config.mjs` boundary rules, Prettier, `--parallel=1`
  discipline, CI workflow shape.
- **Feature-app pattern**: the `arkadion-*` layout (self-contained app dirs,
  `nx:run-commands` targets, own deps) — directly applicable to Falina.
- **Shared-lib pattern**: `libs/shared` is the template for a Falina contracts
  library.
- **Backend patterns from `apps/api` + `apps/arkadion-api`**: JWT auth flow
  (`auth.module`, `jwt-auth.guard`, `current-user.decorator`, bcrypt),
  TypeORM bootstrap via `@nestjs/config`, ValidationPipe setup, Swagger wiring,
  seed module, `synchronize: true` dev flow, `users`/`admin` modules.
- **Frontend patterns from `apps/web` + `apps/arkadion-web`**: standalone
  components, environment `fileReplacements`, M3 theming approach, api.service
  pattern, proxy config.
- **Infra**: shared `docker-compose.yml` Postgres pattern (add a Redis service
  alongside), per-app `.env` + `.env.example` convention.
- **AI plumbing**: arkadion's `llm.service.ts` provider-chain (Groq → OpenRouter
  → Ollama, OpenAI-compatible) is a working base for Falina's `AiProvider`.

## 10. What needs to be added

- `apps/falina-web` — Angular 22 + **Ionic** + **Capacitor** mobile app with a
  custom Falina design system (not stock Ionic look).
- `apps/falina-api` — NestJS 11 backend with modules for auth, users, coffee,
  tarot, astrology, readings, oracle, ai, storage, notifications, subscriptions,
  entitlements, health, common; Redis + BullMQ; object storage; `/api/v1`.
- `libs/falina-shared` (`@falina/shared`, scope:shared) — typed API contracts,
  domain models, enums (reading states, types), validation schemas.
- Astrology calculation engine (pure-JS, e.g. `astronomy-engine`/`astronomia`
  or SWISSEPH WASM binding) — LLM must never compute planetary math.
- AI abstraction: `AiProvider` (generateText / generateStructured / analyzeImage)
  with OpenAI, Gemini, Anthropic, Ollama and **Mock** adapters.
- Coffee symbol database, 78 Tarot cards + spreads (seed data, canonical IDs).
- Storage layer (private object storage, signed URLs, retention).
- Docker Compose: add **Redis** service; keep Postgres.
- Localization infra (i18n, ICU/`@angular/localize` or ngx-translate),
  RTL-ready.
- Documentation under `docs/falina/` (arch/DB/AI/astrology/coffee/tarot/mobile/
  monetization/dev/env).

## 11. Proposed Falina architecture

Follow the **arkadion feature-app convention**:

```
apps/falina-web/    Angular 22 + Ionic 8 + Capacitor 8  (mobile-first, custom design system)
apps/falina-api/    NestJS 11 + TypeORM + Postgres + Redis/BullMQ + AiProvider + storage
libs/falina-shared/ @falina/shared — contracts (plain types, scope:shared)
docs/falina/        product & engineering docs
```

- Frontend feature modules: home, onboarding, coffee, tarot, astrology, oracle,
  readings (history), profile, settings.
- Backend modules: auth, users, coffee, tarot, astrology, readings, oracle, ai,
  storage, notifications, subscriptions, entitlements, health, common.
- One Oracle personality across all readings; unified `Reading` records enable
  reading memory and (later) pattern detection.
- Explicit state machines for coffee/tarot/astrology flows (no boolean soup).
- Env-driven config: `AI_PROVIDER=mock` default for offline dev/test/CI.

## 12. Proposed Nx project graph

```
scope:shared        libs/falina-shared  (@falina/shared)        ← plain contracts
scope:api   (or unbound run-commands app)
                    apps/falina-api  → @falina/shared, @patlix/shared
scope:web   (or unbound run-commands app)
                    apps/falina-web  → @falina/shared           ← typed API services only
```

Decision point: follow `arkadion-*` exactly (own repo, own node_modules,
`nx:run-commands`, unbound tags) **or** bind to patlix scope tags
(`scope:web`/`scope:api`) like `web`/`api`. Recommendation: use the arkadion
pattern for app isolation; keep `libs/falina-shared` tagged `scope:shared`.

## 13. Proposed PostgreSQL schema

All tables: UUID PKs, `created_at`/`updated_at` timestamps in UTC, FK indexes,
`jsonb` where flexibility is required. Initial set (per spec §44):

- `users` (id, email, password_hash, role, …)
- `user_profiles` (display_name, birth_date, birth_time null, birth_location,
  latitude, longitude, timezone, …)
- `birth_profiles` (chart version, cached natal chart jsonb)
- `astrology_charts` (natal chart data, cached)
- `tarot_cards` (canonical 78; id, name, arcana, suit, number, keywords,
  upright/reversed meanings, symbolism, archetype, front/back image)
- `tarot_spreads` (id, code, positions, extensible)
- `tarot_readings` + `tarot_reading_cards` (server-randomized cards + orientation)
- `coffee_readings` + `coffee_images` + `coffee_symbols` + `coffee_reading_symbols`
- `astrology_readings`
- `readings` (unified: type, status, title, summary, content, metadata)
- `favorites`
- `oracle_conversations` + `oracle_messages`
- `reading_patterns` (future memory/pattern insights)
- `notifications`, `subscriptions`, `entitlements`, `ai_usage`

## 14. Proposed API structure

Global prefix `/api/v1` (Nest `setGlobalPrefix('api/v1')`; keep Swagger at
`/api/docs`). Endpoints per spec §46 — auth/register, auth/login, users/me,
coffee/readings (create → image → analyze → get), tarot/cards, tarot/spreads,
tarot/readings (server-side draw), astrology/chart, astrology/daily, astrology/weekly,
readings list/get/delete/favorite, oracle/conversations + messages.
`GET /health` and `GET /health/ready` for liveness/readiness.

## 15. Proposed mobile architecture

Angular 22 + Ionic 8 (UI primitives, modal/sheet, nav) + Capacitor 8
(Camera, Filesystem, Preferences, Haptics, Status Bar, Splash, Share, Keyboard,
Push Notifications). Simple bottom navigation: **Home / Read / History /
Profile** (Read hosts Coffee / Tarot / Astrology). Custom Falina design system
with centralized design tokens (colors, typography, spacing, radii, shadows,
motion, z-index) — deep charcoal, ivory, muted gold, restrained glow, cinematic
transitions. Lazy routes + lazy tarot assets. Capacitor projects live inside
`apps/falina-web` (checked into its own repo).

## 16. Proposed AI architecture

- `AiProvider` interface: `generateText()`, `generateStructured()`,
  `analyzeImage()`; adapters: OpenAI, Gemini, Anthropic, Ollama (local), Mock.
- **`MockAiProvider`** is the default (`AI_PROVIDER=mock`) — deterministic,
  offline, testable, cost-free.
- Prompts as versioned, separated prompt builders (`coffee-vision-v1`,
  `coffee-reading-v1`, `tarot-reading-v1`, `astrology-daily-v1`, `oracle-v1`,
  `pattern-v1`).
- Structured outputs are schema-constrained and **runtime-validated**;
  malformed AI output is rejected (never trusted blindly).
- Astrology math is done by a calc engine; the LLM only interprets structured
  chart data. Safety: readings framed as spiritual reflection/entertainment;
  safe-reflective responses for medical/legal/death/guarantee-style questions.

## 17. Proposed monetization architecture

- **Entitlement model** (`entitlements` table + config): e.g.
  `COFFEE_UNLIMITED`, `TAROT_ADVANCED`, `ASTROLOGY_ADVANCED`, `ORACLE_MEMORY`,
  `PATTERN_INSIGHTS`, `YEAR_AHEAD`, `DEEP_READING`. Frontend asks
  "does user have entitlement X?", never trusts client subscription state.
- Free tier (basic daily astrology, limited tarot/coffee, basic history,
  limited oracle), Premium tier, and one-off purchases (Deep Love Reading, etc.).
- Backend validates purchases and maintains entitlement state (source of truth).
  Mobile store billing (App Store / Google Play) replaces/abstracts Stripe for
  native subscriptions; localized pricing via store product config, never
  hardcoded.
- Ads only as rewarded, optional, never interrupting rituals; premium = ad-free.
- Paywall funnel designed around value (first free reading → theme discovery →
  deep reading offer).

## 18. Risks and architectural concerns

1. **ORM choice** — workspace convention is TypeORM (AGENTS.md, both APIs);
   spec says "Prisma preferred". Must decide before Phase 1.
2. **TypeORM version drift** in workspace (`^0.3.31` root vs `^1.1.0` arkadion).
3. **Ionic/Capacitor + Angular 22** — Ionic 8 supports Angular ≥16; Capacitor
   8.5.0 is current stable (Cap 9 in alpha). Pin compatible versions in Phase 2.
4. **Resource-constrained machine** (~3.8 GB RAM) — Redis + BullMQ + Postgres +
   two Nest apps + Angular is heavy. Mitigate with `--parallel=1`, lazy loading,
   single-app serving, and consider whether BullMQ's Redis can be swapped for a
   lighter in-process queue behind the same interface during early phases.
5. **Local-first AI** — MockAiProvider is mandatory for offline dev; vision
   (coffee) needs a vision-capable model; plan an image-optional path.
6. **Astrology engine** — must be a real calculation engine; pure-JS library or
   WASM SWISSEPH binding (native builds are painful on WSL). Validate precision
   and caching strategy (per user/day/week + chart version + timezone).
7. **iOS builds impossible on Linux/WSL** — Android builds need Android SDK;
   iOS requires macOS. Ship web-first for testing; keep Capacitor config ready.
8. **Git/submodule wiring** — each Falina app normally needs its own repo.
   Decide: wire submodules now (needs GitHub repos) or start as plain dirs.
9. **Naming** — spec suggests `falina-mobile`/`falina-api`; workspace convention
   is `<name>-web`/`<name>-api`.
10. **Localization + RTL** (Arabic) from day one; canonical symbol/card IDs stay
    language-independent; AI can generate readings directly in target language.
11. **Security/privacy** — private coffee images (signed URLs), prompt-injection
    defense, untrusted content handling, DTO validation, rate limiting, no
    secrets in git, `GET /health` without leaking internals.
12. **Scope control** — the spec is 12 phases; do NOT implement everything at
    once. Keep the workspace buildable after every phase.

## 19. Phase 0 implementation plan

0. **Audit** (this document) — done. No files modified.
1. **Decisions** — resolve the open questions (ORM, naming, submodule wiring,
   docs location) with the product owner.
2. **Scaffold Falina projects** using Nx generators:
   - `apps/falina-api` via `@nx/nest:app` (Jest) or arkadion-style manual setup.
   - `apps/falina-web` via `@nx/angular:app` (Vitest) — Ionic/Capacitor added in
     Phase 2.
   - `libs/falina-shared` via `@nx/js:lib` (`@falina/shared`, `scope:shared`).
   - Register targets so `nx show project falina-api` works and boundaries pass.
3. **Keep the workspace green** — run
   `npx nx run-many -t lint test build typecheck --parallel=1` after each step.

Then **Phase 1 — Foundation** (see docs/falina/PHASE-1-FOUNDATION.md once
decisions are locked): shared types, design tokens, env config + `.env.example`,
NestJS foundation, Postgres wiring, Docker Redis, `/health` + `/health/ready`,
`/api/v1` versioning, structured logging + request IDs, testing foundation,
Mock AI provider.

---

## Open decisions (need product-owner sign-off)

| # | Question | Option A | Option B |
| --- | --- | --- | --- |
| D1 | ORM | **TypeORM** (workspace convention, proven here) | Prisma (spec "preferred") |
| D2 | App naming | **falina-web / falina-api** (AGENTS.md convention) | falina-mobile / falina-api |
| D3 | Project wiring | **Plain dirs first**, submodules later | Create GitHub repos + wire submodules now |
| D4 | Docs location | **docs/falina/** (namespaced) | apps/falina-api/docs/ (own repo) |
