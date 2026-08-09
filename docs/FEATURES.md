# Falina — Phase Plans (feature docs)

Concise plans for the upcoming feature phases. These live here so the next
phase can start without re-deriving the design.

## COFFEE (Phase 5)

- **Flow**: drink → turn cup over → photograph → choose intention → vision →
  symbol extraction → symbol database lookup → interpretation → reading → save
  → ask Falina.
- **Intentions**: LOVE · CAREER · MONEY · GENERAL · PERSONAL (question optional).
- **Camera**: Capacitor Camera (camera + library + retake), image validation,
  compression, metadata strip, progress, error/retry.
- **Pipeline**: validate MIME/size → resize/compress → strip metadata → private
  storage → temporary processing ref → vision analysis → symbol extraction →
  interpretation → reading → cleanup (retention policy).
- **Vision output**: structured observations + pattern density
  (`CoffeeVisionResult` in `@falina/shared`); observation ≠ interpretation.
- **Symbol DB**: 28 canonical symbols in `@falina/shared/constants/coffee-symbols`;
  full meanings (traditional/love/career/money/general/positive/caution/keywords)
  seeded in `coffee_symbols`.
- **State machine**: IDLE → UPLOADING → PROCESSING → ANALYZING → GENERATING →
  COMPLETED / FAILED.
- **Storage**: private object storage + signed URLs; never public raw URLs.

## TAROT (Phase 4)

- **Flow**: intention → spread → shuffle → select → reveal → interpret → ask
  Falina.
- **Intentions**: LOVE · CAREER · MONEY · PERSONAL_GROWTH · DECISION · GENERAL ·
  CUSTOM.
- **Spreads**: one-card · three past/present/future · three
  situation/challenge/guidance · five-card (extensible).
- **Cards**: 78 canonical IDs in `@falina/shared/constants/tarot`; full
  meanings (upright/reversed/love/career/money/spiritual/symbolism/archetype)
  seeded in `tarot_cards`. The LLM interprets canonical meanings, never
  invents them.
- **Randomization**: server-side only — `POST /api/v1/tarot/readings` draws
  cards + orientation, stores them, returns the reading id. Client never picks
  cards.
- **UX**: one-card-at-a-time reveal, shuffle/move/flip/glow, subtle haptics,
  reduced-motion aware.
- **State machine**: IDLE → CHOOSING_INTENTION → SHUFFLING → SELECTING →
  REVEALING → INTERPRETING → COMPLETED / FAILED.

## ASTROLOGY (Phase 6)

- **Engine**: real calculation library (pure-JS or WASM SWISSEPH binding).
  Computes positions, ascendant, houses, aspects, transits, moon phase.
  LLM only interprets.
- **Natal chart**: Sun–Pluto + ascendant (only if birth time known — never
  fabricate), cached by chart version; recalculated when birth data changes.
- **Daily**: current positions → timezone → transits → moon phase → LLM →
  sections (Energy, Love, Career, Money, Emotional, Opportunity, Watch,
  Reflection).
- **Weekly**: theme + love/career/money/growth + important days + caution +
  closing.
- **Cache**: `daily:{userId}:{localDate}`, `weekly:{userId}:{week}`, keyed also
  by chart version + timezone.
- **State machine**: PROFILE_REQUIRED → CALCULATING → READY → GENERATING →
  COMPLETED / ERROR.

## MOBILE (Phase 2)

- Angular 22 + Ionic 8 + Capacitor 8 (Camera, Filesystem, Preferences, Haptics,
  Status Bar, Splash, Share, Keyboard, Push).
- Custom Falina design system (`falina-web/src/theme/`) — never the stock Ionic
  look. Deep charcoal + ivory + muted gold, restrained gradients, subtle glow,
  cinematic but calm motion.
- Navigation: Home / Read (Coffee · Tarot · Astrology) / History / Profile.
- Lazy routes and lazy tarot assets; Capacitor projects checked into the repo.

## MONETIZATION (Phase 9)

- **Entitlement model** (backend = source of truth): COFFEE_UNLIMITED,
  TAROT_ADVANCED, ASTROLOGY_ADVANCED, ORACLE_MEMORY, PATTERN_INSIGHTS,
  YEAR_AHEAD, DEEP_READING, AD_FREE. Frontend asks "has entitlement X?".
- Free tier limits in `@falina/shared/constants/entitlements`.
- Native store billing (App Store / Google Play) validates on backend; one-off
  purchases and bundles supported; localized pricing via store config only.
- Paywalls around real value; rewarded ads only; premium ad-free.
