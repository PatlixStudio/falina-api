# Falina AI

## Abstraction

All AI calls go through `AiProvider` (`src/ai/ai-provider.interface.ts`):

- `generateText()` — free-form text
- `generateStructured()` — schema-constrained output, validated at runtime
- `analyzeImage()` — vision (coffee grounds)

Adapters are selected via `AI_PROVIDER`:

| Provider | Status |
| --- | --- |
| `mock` | ✅ default — deterministic, offline, testable |
| `openai` / `gemini` / `anthropic` / `ollama` | later phases |

Feature controllers/services depend on `AI_PROVIDER_TOKEN`, never on a vendor.

## Mock provider

`AI_PROVIDER=mock` returns stable, correctly-shaped output with no network
calls — UI development, unit tests, e2e and CI all work offline.

## Structured output

- Prompts are versioned, separated builders: `coffee-vision-v1`,
  `coffee-reading-v1`, `tarot-reading-v1`, `astrology-daily-v1`, `oracle-v1`,
  `pattern-v1`.
- Every AI response is runtime-validated. Malformed output is rejected, never
  trusted blindly.
- **Observation ≠ interpretation** (coffee): the vision model emits structured
  observations; interpretation is a separate, intention-aware step.

## Safety

- Prompt injection defense: user questions/images/previous AI output are
  untrusted content; they cannot override system instructions.
- Divination is spiritual reflection/entertainment. No certainty about death,
  medical outcomes, pregnancy, financial/legal guarantees, self-harm or crime;
  such questions get safe reflective guidance.
- The Oracle personality is calm, warm, mysterious, concise — never childish,
  never melodramatic.

## Astrology rule

The calculation engine computes all planetary positions/houses/aspects/transits.
The LLM only interprets structured chart data. An LLM must never calculate
astronomy.
