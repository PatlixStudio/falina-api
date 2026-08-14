import { HttpException, HttpStatus, Injectable } from '@nestjs/common';
import { Inject } from '@nestjs/common';
import {
  COFFEE_SYMBOLS,
  type CoffeeObservation,
  type CoffeeSymbolDrawn,
  type CoffeeVisionResult,
  type PatternDensity,
} from '@falina/shared';
import { AI_PROVIDER_TOKEN, type AiProvider } from '../ai/ai-provider.interface';

const MAX_SYMBOLS = 3;
const MAX_OBSERVATIONS = 6;

const COFFEE_VISION_PROMPT = `You are examining a photo of a Turkish coffee cup after it has been drunk.
Describe ONLY what is objectively visible in the coffee grounds: the shapes/symbols you can see, where in the cup each appears (upper-left, center, lower-right, rim, bottom, etc.), and how confident you are (0 to 1).
Do NOT interpret meaning or predict the future — just observe and name the shapes using one of these labels if possible: bird, heart, ring, road, tree, mountain, fish, snake, flower, star, eye, face, house, key, ship, circle, cross, crown, arrow, butterfly, dog, cat, horse, sun, moon, cloud, letter, number.
Also rate the density of grounds in three zones (upper, middle, bottom), each one of "light", "medium" or "dense".
Respond with a single JSON object, nothing before or after:
{
  "observations": [
    { "symbol": "bird", "confidence": 0.8, "location": "center", "description": "A small curved form near the center." }
  ],
  "patternDensity": { "upper": "light", "middle": "medium", "bottom": "dense" }
}`;

export interface CoffeeAnalyzeResult {
  vision: CoffeeVisionResult;
  symbols: CoffeeSymbolDrawn[];
}

@Injectable()
export class CoffeeAnalyzeService {
  constructor(@Inject(AI_PROVIDER_TOKEN) private readonly ai: AiProvider) {}

  async analyze(imageDataUrl: string): Promise<CoffeeAnalyzeResult> {
    const { mime, buffer } = decodeDataUrl(imageDataUrl);

    let result: unknown;
    try {
      result = await this.ai.analyzeImage({
        image: { data: buffer, mime },
        prompt: COFFEE_VISION_PROMPT,
      });
    } catch {
      throw new HttpException(
        'Vision analysis is unavailable right now. Try tapping the symbols you see in the grounds instead.',
        HttpStatus.SERVICE_UNAVAILABLE,
      );
    }

    const vision = normalizeVision(result);
    const symbols = matchSymbols(vision.observations);
    return { vision, symbols };
  }
}

/** Decodes a `data:<mime>;base64,<payload>` URL into bytes + mime. */
function decodeDataUrl(dataUrl: string): { mime: string; buffer: Buffer } {
  const match = /^data:([a-z0-9.+-]+);base64,(.*)$/is.exec(dataUrl);
  if (!match) {
    throw new HttpException('Image must be a base64 data URL.', HttpStatus.BAD_REQUEST);
  }
  const mime = match[1].toLowerCase();
  if (!['image/jpeg', 'image/png', 'image/webp'].includes(mime)) {
    throw new HttpException('Only JPEG, PNG or WebP images are supported.', HttpStatus.BAD_REQUEST);
  }
  return { mime, buffer: Buffer.from(match[2], 'base64') };
}

/** Coerces whatever the vision model returned into a sane `CoffeeVisionResult`. */
function normalizeVision(result: unknown): CoffeeVisionResult {
  const obj = (result ?? {}) as Record<string, unknown>;
  const rawObservations = Array.isArray(obj.observations) ? obj.observations : [];
  const observations: CoffeeObservation[] = rawObservations
    .slice(0, MAX_OBSERVATIONS)
    .map((o) => {
      const obs = (o ?? {}) as Record<string, unknown>;
      return {
        symbol: asString(obs.symbol, 'symbol').slice(0, 40),
        confidence: clampConfidence(Number(obs.confidence)),
        location: asString(obs.location).slice(0, 60),
        description: asString(obs.description).slice(0, 300),
      };
    })
    .filter((o) => o.symbol.trim().length > 0);

  const density = (obj.patternDensity ?? {}) as Record<string, unknown>;
  const zone = (v: unknown): PatternDensity['upper'] => {
    const s = asString(v, 'medium').toLowerCase();
    return s === 'light' || s === 'dense' ? s : 'medium';
  };

  return {
    observations,
    patternDensity: {
      upper: zone(density.upper),
      middle: zone(density.middle),
      bottom: zone(density.bottom),
    },
  };
}

function clampConfidence(value: number): number {
  if (!Number.isFinite(value)) {
    return 0;
  }
  return Math.min(1, Math.max(0, value));
}

/** Maps vision symbols onto canonical codes (best-effort, deduped, capped). */
function matchSymbols(observations: CoffeeObservation[]): CoffeeSymbolDrawn[] {
  const seen = new Set<string>();
  const symbols: CoffeeSymbolDrawn[] = [];

  for (const obs of observations) {
    if (symbols.length >= MAX_SYMBOLS) {
      break;
    }
    const label = normalize(obs.symbol);
    const def = COFFEE_SYMBOLS.find(
      (s) => normalize(s.code) === label || s.keywords.some((k) => normalize(k) === label),
    );
    if (def && !seen.has(def.code)) {
      seen.add(def.code);
      symbols.push({ code: def.code, keywords: [...def.keywords] });
    }
  }

  if (symbols.length === 0) {
    symbols.push({ code: 'circle', keywords: [...findKeywords('circle')] });
  }
  return symbols;
}

function findKeywords(code: string): string[] {
  return COFFEE_SYMBOLS.find((s) => s.code === code)?.keywords ?? [];
}

function asString(value: unknown, fallback = ''): string {
  return typeof value === 'string' ? value : fallback;
}

function normalize(value: string): string {
  return value
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '')
    .trim();
}
