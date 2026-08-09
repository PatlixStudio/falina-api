# Falina in the Nx workspace

Falina lives inside `patlix-workspace` (Nx 23, npm, TypeScript strict).

## Conventions followed

- Feature apps keep the `<name>-web` / `<name>-api` naming (AGENTS.md).
- Each project is a git submodule with its own repo and `node_modules`.
- Nx targets are thin `nx:run-commands` wrappers over each app's own tooling.
- Resource-constrained host: run batches with `--parallel=1`.

## Nx project graph

```
libs/falina-shared   scope:shared  plain contracts (built to dist/ CJS + types)
apps/falina-api      NestJS 11 → depends on @falina/shared
apps/falina-web      Angular 22 → depends on @falina/shared
```

`falina-api` / `falina-web` are wrapped via `nx:run-commands` and are not bound
to the patlix `scope:*` tags (same as `arkadion-*`).

## Shared contracts wiring

`@falina/shared` is installed as a `file:` dependency:

```json
"@falina/shared": "file:../../libs/falina-shared"
```

It is built to `dist/` (CommonJS + `.d.ts`). The API rebuilds it automatically
via `prebuild` / `prestart` / `prestart:dev` hooks.

## Commands

```bash
npx nx serve falina-api        # :3002
npx nx serve falina-web        # :4202
npx nx build falina-api        # builds @falina/shared first
npx nx test falina-api
npx nx test falina-web
npx nx typecheck falina-api
```

Keep the workspace green:

```bash
npx nx run-many -t lint test build typecheck --parallel=1
```
