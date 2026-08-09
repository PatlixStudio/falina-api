# Falina Database

PostgreSQL via TypeORM (workspace convention). Dev schema auto-syncs
(`DB_SYNCHRONIZE=true`) — **never** in production; add migrations before release.

Conventions: UUID primary keys, `created_at` / `updated_at` timestamps in UTC,
foreign keys with indexes, `jsonb` for flexible structured data.

## Planned tables (full schema in later phases)

- `users` · `user_profiles` (display name, birth data, timezone) · `birth_profiles`
- `astrology_charts` (cached natal chart, chart version)
- `tarot_cards` (canonical 78) · `tarot_spreads` · `tarot_readings` · `tarot_reading_cards`
- `coffee_readings` · `coffee_images` · `coffee_symbols` · `coffee_reading_symbols`
- `astrology_readings`
- `readings` (unified: type, status, title, summary, content, metadata) — the
  backbone of **reading memory**
- `favorites`
- `oracle_conversations` · `oracle_messages`
- `reading_patterns` (recurring-theme insights)
- `notifications` · `subscriptions` · `entitlements` · `ai_usage`

## Local setup

```bash
docker compose up -d          # patlix-postgres (:5432), patlix-redis (:6379)
docker exec patlix-postgres psql -U arkadion -d postgres -c "CREATE ROLE falina LOGIN PASSWORD 'falina';"
docker exec patlix-postgres psql -U arkadion -d postgres -c "CREATE DATABASE falina OWNER falina;"
```

Connection settings: `apps/falina-api/.env` (template `.env.example`).

## Caching keys (astrology)

Readings are cached per user/timezone/period and invalidated when the chart
version changes:

```
daily:{userId}:{localDate}
weekly:{userId}:{week}
```
