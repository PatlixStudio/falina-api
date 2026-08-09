import { Injectable } from '@nestjs/common';
import {
  AiProvider,
  AnalyzeImageParams,
  GenerateStructuredParams,
  GenerateTextParams,
  JsonSchema,
} from '../ai-provider.interface';

/**
 * Deterministic offline AI provider used for development, tests and CI
 * (`AI_PROVIDER=mock`). Never makes network calls; returns stable, valid-shaped
 * output so UI and pipelines are fully testable without a model backend.
 */
@Injectable()
export class MockAiProvider implements AiProvider {
  readonly name = 'mock';

  generateText(params: GenerateTextParams): Promise<string> {
    const seed = params.prompt.trim() || 'the signs are quiet';
    const snippet = seed.length > 160 ? `${seed.slice(0, 160)}…` : seed;
    return Promise.resolve(`The pattern forms slowly. ${snippet}`);
  }

  generateStructured<T = unknown>(params: GenerateStructuredParams): Promise<T> {
    return Promise.resolve(buildMockFromSchema(params.schema, params.prompt) as T);
  }

  analyzeImage(_params: AnalyzeImageParams): Promise<unknown> {
    return Promise.resolve({
      observations: [
        {
          symbol: 'road',
          confidence: 0.62,
          location: 'middle',
          description: 'A straight dark trail running across the grounds.',
        },
        {
          symbol: 'bird',
          confidence: 0.51,
          location: 'upper-left',
          description: 'A small curved form resembling a bird in flight.',
        },
      ],
      patternDensity: { upper: 'light', middle: 'medium', bottom: 'dense' },
    });
  }
}

/** Builds a deterministic sample object that matches the given schema shape. */
function buildMockFromSchema(schema: JsonSchema, prompt: string): unknown {
  const seed = String(prompt).trim() || 'sign';
  switch (schema.type) {
    case 'string': {
      if (Array.isArray(schema.enum) && schema.enum.length > 0) {
        return String(schema.enum[0]);
      }
      return seed.length > 24 ? seed.slice(0, 24) : seed;
    }
    case 'integer':
      return 1;
    case 'number':
      return 0.5;
    case 'boolean':
      return true;
    case 'array':
      return [];
    case 'object': {
      const obj: Record<string, unknown> = {};
      for (const [key, child] of Object.entries(schema.properties ?? {})) {
        obj[key] = buildMockFromSchema(child, prompt);
      }
      return obj;
    }
    default:
      return {};
  }
}
